"use client";

import { useQueries } from "@tanstack/react-query";

import type { TokenMarket } from "@/lib/api/types";
import type { CustomToken } from "@/lib/config/types";

async function fetchTokenMarket(
  chainId: number,
  address: string,
): Promise<TokenMarket | null> {
  const query = new URLSearchParams({
    chainId: String(chainId),
    address,
  });
  const response = await fetch(`/api/token-market?${query.toString()}`, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) throw new Error("TOKEN_MARKET_FETCH_FAILED");
  const json = (await response.json()) as { market?: TokenMarket | null };
  return json.market ?? null;
}

/**
 * Custom-token market data. Only the contract address and chain ID are sent;
 * the wallet address is deliberately never part of this request.
 */
export function useTokenMarkets(tokens: CustomToken[]) {
  return useQueries({
    queries: tokens.map((token) => ({
      queryKey: ["token-market", token.chainId, token.address.toLowerCase()],
      queryFn: () => fetchTokenMarket(token.chainId, token.address),
      staleTime: 5 * 60_000,
      gcTime: 30 * 60_000,
      refetchInterval: 5 * 60_000,
      retry: 2,
      retryDelay: (attempt: number) => Math.min(1_000 * 2 ** attempt, 8_000),
    })),
  });
}

export function tokenMarketKey(chainId: number, address: string): string {
  return `${chainId}:${address.toLowerCase()}`;
}
