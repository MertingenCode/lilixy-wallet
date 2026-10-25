import { erc20Abi, type Address, type Chain } from "viem";

import { getPublicClientForChain } from "@/lib/wagmi/rpc";
import type { TokenDefinition } from "@/lib/wallet/assets";

export interface ChainBalanceResult {
  chainId: number;
  native: bigint | null;
  tokens: Record<string, bigint>;
  partialError: boolean;
}

export async function fetchChainBalances(
  chain: Chain,
  address: Address,
  tokens: TokenDefinition[],
): Promise<ChainBalanceResult> {
  const client = getPublicClientForChain(chain);
  let partialError = false;

  const nativeResult = await client
    .getBalance({ address })
    .catch(() => {
      partialError = true;
      return null;
    });

  const balances: Record<string, bigint> = {};
  if (tokens.length === 0) {
    return { chainId: chain.id, native: nativeResult, tokens: balances, partialError };
  }

  try {
    const results = await client.multicall({
      allowFailure: true,
      contracts: tokens.map((token) => ({
        address: token.address,
        abi: erc20Abi,
        functionName: "balanceOf" as const,
        args: [address] as const,
      })),
    });
    results.forEach((result, index) => {
      const token = tokens[index];
      if (!token) return;
      if (result.status === "success" && typeof result.result === "bigint") {
        balances[token.address.toLowerCase()] = result.result;
      } else {
        partialError = true;
      }
    });
  } catch {
    partialError = true;
    const results = await Promise.allSettled(
      tokens.map((token) =>
        client.readContract({
          address: token.address,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [address],
        }),
      ),
    );
    results.forEach((result, index) => {
      const token = tokens[index];
      if (!token) return;
      if (result.status === "fulfilled" && typeof result.value === "bigint") {
        balances[token.address.toLowerCase()] = result.value;
      }
    });
  }

  return {
    chainId: chain.id,
    native: nativeResult,
    tokens: balances,
    partialError,
  };
}
