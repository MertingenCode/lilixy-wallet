import {
  decodeFunctionData,
  erc20Abi,
  formatUnits,
  isAddress,
  type Address,
} from "viem";

import type {
  StoredTransaction,
  TransactionType,
} from "@/lib/db/schema";
import { getRuntimeChains } from "@/lib/wagmi/chain-registry";
import { getExplorerTxUrl } from "@/lib/wagmi/networks";
import {
  getPopularTokens,
  type TokenDefinition,
} from "@/lib/wallet/assets";
import type { TxSentDetail } from "@/lib/wallet/tx-channel";
import { useSettingsStore } from "@/store/settings";

function findToken(
  chainId: number,
  address?: string,
): TokenDefinition | undefined {
  if (!address) return undefined;
  const lower = address.toLowerCase();
  const custom = useSettingsStore
    .getState()
    .customTokens.filter((token) => token.chainId === chainId)
    .map((token) => ({
      chainId: token.chainId,
      address: token.address,
      name: token.label || token.name,
      symbol: token.symbol,
      decimals: token.decimals,
    }));
  return [...custom, ...getPopularTokens(chainId)].find(
    (token) => token.address.toLowerCase() === lower,
  );
}

function tryDecode(data?: string) {
  if (!data || data === "0x") return undefined;
  try {
    return decodeFunctionData({ abi: erc20Abi, data: data as `0x${string}` });
  } catch {
    return undefined;
  }
}

export async function transactionFromSentDetail(
  detail: TxSentDetail,
): Promise<StoredTransaction> {
  const chain = getRuntimeChains().find((item) => item.id === detail.chainId);
  let type: TransactionType = "contract";
  let to = detail.to ?? "";
  let tokenSymbol = chain?.nativeCurrency.symbol ?? "ETH";
  let tokenAddress: string | undefined;
  let tokenDecimals = chain?.nativeCurrency.decimals ?? 18;
  let amount = detail.value;
  let contractAddress: string | undefined;

  const decoded = tryDecode(detail.data);
  if (decoded?.functionName === "transfer") {
    const [recipient, value] = decoded.args as unknown as [
      Address,
      bigint,
    ];
    const token = findToken(detail.chainId, detail.to);
    type = "send";
    contractAddress = detail.to;
    to = recipient;
    tokenSymbol = token?.symbol ?? "Token";
    tokenAddress = detail.to;
    tokenDecimals = token?.decimals ?? 18;
    amount = value.toString();
  } else if (decoded?.functionName === "approve") {
    const token = findToken(detail.chainId, detail.to);
    type = "approve";
    contractAddress = detail.to;
    tokenSymbol = token?.symbol ?? "Token";
    tokenAddress = detail.to;
    tokenDecimals = token?.decimals ?? 18;
    amount = String((decoded.args as unknown as [Address, bigint])[1]);
  } else if (detail.value && BigInt(detail.value) > 0n) {
    type = "send";
    tokenSymbol = chain?.nativeCurrency.symbol ?? tokenSymbol;
    amount = detail.value;
  }

  const explorerUrl = getExplorerTxUrl(chain, detail.hash);

  return {
    id: `tx_${detail.hash.toLowerCase()}`,
    hash: detail.hash,
    chainId: detail.chainId,
    type,
    status: "pending",
    timestamp: detail.timestamp,
    from: detail.from,
    to: isAddress(to) ? to : detail.to ?? "",
    tokenSymbol,
    tokenAddress,
    tokenDecimals,
    contractAddress,
    amount,
    value: detail.value,
    nonce: detail.nonce,
    gas: detail.gas,
    gasPrice: detail.gasPrice,
    maxFeePerGas: detail.maxFeePerGas,
    maxPriorityFeePerGas: detail.maxPriorityFeePerGas,
    data: detail.data,
    explorerUrl,
    source: "local",
  };
}

export function formatStoredAmount(transaction: StoredTransaction): string {
  if (!transaction.amount) return "—";
  try {
    return formatUnits(
      BigInt(transaction.amount),
      transaction.tokenDecimals ?? 18,
    );
  } catch {
    return "—";
  }
}
