import type { Address, Hash, Hex } from "viem";

import type { StoredTransaction } from "@/lib/db/schema";
import { updateTransaction, upsertTransaction } from "@/lib/db/transactions-repo";
import { getRuntimeChains } from "@/lib/wagmi/chain-registry";
import { getExplorerTxUrl } from "@/lib/wagmi/networks";
import { getPublicClientForChain, getWalletClientForAccount } from "@/lib/wagmi/rpc";
import { getSessionAccount } from "@/lib/wallet/session-memory";

export type ReplacementMode = "cancel" | "speedup";

export class ReplacementError extends Error {
  readonly code: "MISSING_NONCE" | "UNSUPPORTED" | "FAILED";

  constructor(code: ReplacementError["code"]) {
    super(code);
    this.name = "ReplacementError";
    this.code = code;
  }
}

function multiplyFee(value: bigint | undefined, fallback: bigint): bigint {
  if (value === undefined) return fallback;
  const raised = (value * 125n) / 100n;
  return raised > fallback ? raised : fallback;
}

/**
 * Replacement transactions deliberately use the original nonce. A cancel sends
 * zero native value to self; a speed-up re-sends the same call with at least a
 * 25% higher fee. Both require the original nonce, so imported/explorer-only
 * entries cannot be replaced.
 */
export async function submitReplacement(
  transaction: StoredTransaction,
  mode: ReplacementMode,
): Promise<Hash> {
  const account = getSessionAccount();
  if (!account) throw new ReplacementError("UNSUPPORTED");
  if (
    transaction.nonce === undefined ||
    transaction.nonce === null ||
    !Number.isSafeInteger(transaction.nonce)
  ) {
    throw new ReplacementError("MISSING_NONCE");
  }

  const chain = getRuntimeChains().find(
    (item) => item.id === transaction.chainId,
  );
  if (!chain) throw new ReplacementError("UNSUPPORTED");

  const publicClient = getPublicClientForChain(chain);
  const wallet = getWalletClientForAccount(account, chain);
  const fees = await publicClient.estimateFeesPerGas().catch(() => null);

  const maxFeePerGas = multiplyFee(
    transaction.maxFeePerGas ? BigInt(transaction.maxFeePerGas) : undefined,
    fees?.maxFeePerGas ?? 20_000_000_000n,
  );
  const maxPriorityFeePerGas = multiplyFee(
    transaction.maxPriorityFeePerGas
      ? BigInt(transaction.maxPriorityFeePerGas)
      : undefined,
    fees?.maxPriorityFeePerGas ?? 1_500_000_000n,
  );

  const originalTo =
    transaction.contractAddress ?? (transaction.to as Address | undefined);
  if (mode === "speedup" && !originalTo) {
    throw new ReplacementError("UNSUPPORTED");
  }

  const to =
    mode === "cancel" ? account.address : (originalTo as Address);
  const data =
    mode === "cancel" ? ("0x" as Hex) : ((transaction.data ?? "0x") as Hex);
  const value =
    mode === "cancel" ? 0n : BigInt(transaction.value ?? "0");
  const gas =
    mode === "cancel"
      ? 21_000n
      : transaction.gas
        ? (BigInt(transaction.gas) * 110n) / 100n
        : undefined;

  const hash = await wallet.sendTransaction({
    account,
    chain,
    to,
    data,
    value,
    gas,
    nonce: transaction.nonce,
    maxFeePerGas,
    maxPriorityFeePerGas,
  } as never);

  const now = Date.now();
  const explorerUrl = getExplorerTxUrl(chain, hash);
  const cancel = mode === "cancel";
  const replacement: StoredTransaction = {
    ...transaction,
    id: `tx_${hash.toLowerCase()}`,
    hash,
    type: cancel ? "cancel" : transaction.type,
    status: "pending",
    timestamp: now,
    to: cancel ? account.address : transaction.to,
    tokenSymbol: cancel
      ? chain.nativeCurrency.symbol
      : transaction.tokenSymbol,
    tokenAddress: cancel ? undefined : transaction.tokenAddress,
    tokenDecimals: cancel ? chain.nativeCurrency.decimals : transaction.tokenDecimals,
    contractAddress: cancel ? undefined : transaction.contractAddress,
    amount: cancel ? "0" : transaction.amount,
    value: value.toString(),
    gas: gas?.toString(),
    maxFeePerGas: maxFeePerGas.toString(),
    maxPriorityFeePerGas: maxPriorityFeePerGas.toString(),
    explorerUrl,
    replacedBy: undefined,
    error: undefined,
    data,
  };

  await updateTransaction(transaction.id, {
    status: "replaced",
    replacedBy: hash,
  });
  await upsertTransaction(replacement);
  return hash;
}
