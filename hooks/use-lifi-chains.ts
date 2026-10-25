"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import type { Chain } from "viem";

import {
  lifiChainToViemChain,
  type LifiChain,
} from "@/lib/lifi/chains";
import { BUILT_IN_CHAINS, customNetworkToChain } from "@/lib/wagmi/networks";
import { markProxyChain } from "@/lib/wagmi/proxy-chains";
import { useSettingsStore } from "@/store/settings";

async function fetchLifiChains(): Promise<LifiChain[]> {
  const response = await fetch("/api/lifi/chains", {
    headers: { accept: "application/json" },
  });
  if (!response.ok) throw new Error("LIFI_CHAINS_FAILED");
  const data = (await response.json()) as { chains?: LifiChain[] };
  if (!Array.isArray(data.chains)) return [];
  return data.chains.filter(
    (chain) =>
      typeof chain.id === "number" &&
      chain.chainType === "EVM" &&
      typeof chain.name === "string",
  );
}

export function useLifiChains() {
  return useQuery({
    queryKey: ["lifi", "chains"],
    queryFn: fetchLifiChains,
    staleTime: 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
    retry: 1,
  });
}

export function useAllWagmiChains(): Chain[] {
  const customNetworks = useSettingsStore((state) => state.customNetworks);
  const lifi = useLifiChains();

  const chains = useMemo(() => {
    const byId = new Map<number, Chain>();
    for (const chain of BUILT_IN_CHAINS) byId.set(chain.id, chain);
    for (const network of customNetworks) {
      byId.set(network.chainId, customNetworkToChain(network));
    }
    for (const raw of lifi.data ?? []) {
      if (!byId.has(raw.id)) {
        try {
          byId.set(raw.id, lifiChainToViemChain(raw));
        } catch {
          // Ignore malformed chain metadata from the third-party API.
        }
      }
    }
    return [...byId.values()];
  }, [customNetworks, lifi.data]);

  useEffect(() => {
    const customIds = new Set(customNetworks.map((item) => item.chainId));
    for (const chain of chains) {
      // User-provided RPCs must be used as provided; only built-in/LI.FI chains
      // are safe to route through the server-side RPC proxy.
      if (!customIds.has(chain.id)) markProxyChain(chain.id);
    }
  }, [chains, customNetworks]);

  return chains;
}
