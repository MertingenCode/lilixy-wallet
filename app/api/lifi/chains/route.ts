import { NextResponse } from "next/server";

import { getLifiRpcUrls, type LifiChain } from "@/lib/lifi/chains";

export const runtime = "nodejs";

export async function GET() {
  try {
    const headers: Record<string, string> = { accept: "application/json" };
    if (process.env.LIFI_API_KEY) {
      headers["x-lifi-api-key"] = process.env.LIFI_API_KEY;
    }
    const response = await fetch("https://li.quest/v1/chains", {
      headers,
      next: { revalidate: 3600 },
    });
    if (!response.ok) throw new Error("LIFI_UPSTREAM");
    const json = (await response.json()) as { chains?: LifiChain[] };
    const chains = (json.chains ?? [])
      .filter(
        (chain) =>
          chain.chainType === "EVM" &&
          typeof chain.id === "number" &&
          typeof chain.name === "string",
      )
      .map((chain) => {
        const native =
          chain.nativeCurrency ?? chain.nativeToken ?? {
            name: chain.name,
            symbol: chain.coin ?? "ETH",
            decimals: 18,
          };
        return {
          id: chain.id,
          key: chain.key,
          name: chain.name,
          chainType: chain.chainType,
          nativeCurrency: native,
          rpcUrls: getLifiRpcUrls(chain),
          blockExplorers: chain.blockExplorers ??
            (chain.metamask?.blockExplorerUrls?.length
              ? [
                  {
                    name: `${chain.name} explorer`,
                    url: chain.metamask.blockExplorerUrls[0],
                  },
                ]
              : undefined),
          logoURI: chain.logoURI,
        };
      });

    return NextResponse.json(
      { chains },
      {
        headers: {
          "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { chains: [], error: "LIFI_CHAINS_UNAVAILABLE" },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }
}
