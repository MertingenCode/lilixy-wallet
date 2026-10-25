"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import type { AssetPlatform } from "@/lib/api/types";

interface AssetPlatformsResponse {
  platforms?: AssetPlatform[];
}

export function useAssetPlatforms(enabled: boolean) {
  const query = useQuery({
    queryKey: ["asset-platforms"],
    queryFn: async (): Promise<AssetPlatform[]> => {
      const response = await fetch("/api/asset-platforms", {
        headers: { accept: "application/json" },
      });
      if (!response.ok) throw new Error("ASSET_PLATFORMS_UNAVAILABLE");
      const json = (await response.json()) as AssetPlatformsResponse;
      return json.platforms ?? [];
    },
    enabled,
    staleTime: 24 * 60 * 60_000,
    gcTime: 7 * 24 * 60 * 60_000,
    retry: 1,
  });

  const byChainId = useMemo(() => {
    const map = new Map<number, AssetPlatform>();
    for (const platform of query.data ?? []) {
      map.set(platform.chainId, platform);
    }
    return map;
  }, [query.data]);

  return { byChainId, isLoading: query.isLoading };
}
