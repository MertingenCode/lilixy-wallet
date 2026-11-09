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

  for (const token of tokens) {
    try {
      const balance = await client.readContract({
        address: token.address,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address],
      });
      if (typeof balance === "bigint") {
        balances[token.address.toLowerCase()] = balance;
      }
    } catch {
      // A single bad/rate-limited token must not hide the others.
      partialError = true;
    }
  }

  return {
    chainId: chain.id,
    native: nativeResult,
    tokens: balances,
    partialError,
  };
}
