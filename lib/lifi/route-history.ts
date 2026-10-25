import type { Process, Route } from "@lifi/sdk";

import {
  getTransaction,
  upsertTransaction,
} from "@/lib/db/transactions-repo";
import type { StoredTransaction } from "@/lib/db/schema";
import { getRuntimeChains } from "@/lib/wagmi/chain-registry";
import { getExplorerTxUrl } from "@/lib/wagmi/networks";
import { getSessionAddress } from "@/lib/wallet/session-memory";

export const HISTORY_UPDATED_EVENT = "lilixy:history-updated";

type RoutePhase = "started" | "updated" | "completed" | "failed";

interface ExecutionLike {
  process?: Process[];
  startedAt?: number;
}

function processesFor(route: Route): Process[] {
  const steps = route.steps as unknown as Array<{
    execution?: ExecutionLike;
  }>;
  return steps.flatMap((step) => step.execution?.process ?? []);
}

function sourceHash(route: Route): string | undefined {
  const processes = processesFor(route);
  return (
    processes.find(
      (process) =>
        process.txHash &&
        (process.type === "SWAP" || process.type === "CROSS_CHAIN"),
    )?.txHash ??
    processes.find((process) => process.txHash)?.txHash
  );
}

function destinationHash(route: Route): string | undefined {
  return processesFor(route).find(
    (process) =>
      process.chainId === route.toChainId &&
      process.txHash &&
      process.type === "RECEIVING_CHAIN",
  )?.txHash;
}

function routeTimestamp(route: Route): number {
  const steps = route.steps as unknown as Array<{ execution?: ExecutionLike }>;
  const startedAt = steps.find((step) => step.execution?.startedAt)?.execution
    ?.startedAt;
  return startedAt ?? Date.now();
}

function notifyHistory() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(HISTORY_UPDATED_EVENT));
}

/**
 * Records one row per LI.FI route. Individual approve/send transactions are
 * captured separately by the EIP-1193 connector; the route row links them via
 * the same hash when available.
 */
export async function recordWidgetRoute(
  route: Route,
  phase: RoutePhase,
  process?: Process,
): Promise<void> {
  const id = `route_${route.id}`;
  const existing = await getTransaction(id);
  const hash = process?.txHash ?? sourceHash(route) ?? existing?.hash ?? "";
  const chain = getRuntimeChains().find((item) => item.id === route.fromChainId);
  const type = route.fromChainId === route.toChainId ? "swap" : "bridge";
  const from = route.fromAddress ?? getSessionAddress() ?? "";
  const destinationTxHash = destinationHash(route);

  let status: StoredTransaction["status"] = existing?.status ?? "pending";
  let error = existing?.error;
  if (phase === "completed") {
    status = "success";
    error = undefined;
  } else if (phase === "failed") {
    status = "failed";
    error = process?.error?.message ?? existing?.error;
  } else if (process?.status === "FAILED") {
    status = "failed";
    error = process.error?.message;
  } else if (!existing) {
    status = "pending";
  }

  const transaction: StoredTransaction = {
    id,
    hash,
    chainId: route.fromChainId,
    type,
    status,
    timestamp: existing?.timestamp ?? routeTimestamp(route),
    from,
    to: route.toAddress ?? "",
    tokenSymbol: route.fromToken.symbol,
    tokenAddress: route.fromToken.address,
    tokenDecimals: route.fromToken.decimals,
    toTokenSymbol: route.toToken.symbol,
    toTokenAddress: route.toToken.address,
    toTokenDecimals: route.toToken.decimals,
    toAmount: route.toAmount,
    amount: route.fromAmount,
    data: existing?.data,
    explorerUrl: hash ? getExplorerTxUrl(chain, hash) : undefined,
    sourceChainId: route.fromChainId,
    destinationChainId: route.toChainId,
    destinationTxHash,
    routeId: route.id,
    error,
    source: "local",
  };

  await upsertTransaction(transaction);
  notifyHistory();
}
