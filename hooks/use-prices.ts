"use client";

import { useQuery } from "@tanstack/react-query";

import type { PriceMap } from "@/lib/api/types";

async function fetchPrices(ids: string[]): Promise<PriceMap> {
  const query = new URLSearchParams({ ids: ids.join(",") });
  const response = await fetch(`/api/prices?${query.toString()}`, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) throw new Error("PRICE_FETCH_FAILED");
  const json = (await response.json()) as { prices?: PriceMap };
  return json.prices ?? {};
}

export function usePrices(ids: string[]) {
  return useQuery({
    queryKey: ["prices", ids],
    queryFn: () => fetchPrices(ids),
    enabled: ids.length > 0,
    staleTime: 60_000,
    gcTime: 15 * 60_000,
    refetchInterval: 120_000,
    retry: 2,
  });
}
