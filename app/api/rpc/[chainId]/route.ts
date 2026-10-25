import { NextResponse, type NextRequest } from "next/server";

import {
  getChainRpcUrls,
  isSafeHttpUrl,
} from "@/lib/wagmi/networks";
import { getLifiRpcUrls, type LifiChain } from "@/lib/lifi/chains";
import { BUILT_IN_NETWORKS } from "@/lib/wagmi/networks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function lifiRpcUrls(chainId: number): Promise<string[]> {
  try {
    const headers: Record<string, string> = { accept: "application/json" };
    if (process.env.LIFI_API_KEY) {
      headers["x-lifi-api-key"] = process.env.LIFI_API_KEY;
    }
    const response = await fetch("https://li.quest/v1/chains", {
      headers,
      next: { revalidate: 3600 },
    });
    if (!response.ok) return [];
    const data = (await response.json()) as { chains?: LifiChain[] };
    const chain = data.chains?.find((item) => item.id === chainId);
    return chain
      ? getLifiRpcUrls(chain).filter((url) => isSafeHttpUrl(url))
      : [];
  } catch {
    return [];
  }
}

async function targetUrls(chainId: number): Promise<string[]> {
  const builtIn = BUILT_IN_NETWORKS.find(
    (item) => item.chain.id === chainId,
  );
  if (builtIn) return getChainRpcUrls(builtIn.chain);
  return lifiRpcUrls(chainId);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ chainId: string }> },
) {
  const { chainId: rawChainId } = await context.params;
  const chainId = Number(rawChainId);
  if (!Number.isSafeInteger(chainId) || chainId <= 0) {
    return NextResponse.json(
      { error: "INVALID_CHAIN" },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }

  let payload: string;
  try {
    payload = await request.text();
    const parsed = JSON.parse(payload) as unknown;
    const isSingle =
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      typeof (parsed as { method?: unknown }).method === "string";
    const isBatch =
      Array.isArray(parsed) &&
      parsed.every(
        (item) =>
          item &&
          typeof item === "object" &&
          typeof (item as { method?: unknown }).method === "string",
      );
    if (!isSingle && !isBatch) throw new Error("INVALID");
  } catch {
    return NextResponse.json(
      { error: "INVALID_JSON_RPC" },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }

  const urls = await targetUrls(chainId);
  if (urls.length === 0) {
    return NextResponse.json(
      { error: "UNSUPPORTED_CHAIN" },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
        },
        body: payload,
        cache: "no-store",
        signal: AbortSignal.timeout(12_000),
      });
      if (!response.ok) continue;
      const text = await response.text();
      try {
        JSON.parse(text);
      } catch {
        continue;
      }
      return new NextResponse(text, {
        status: 200,
        headers: {
          "content-type": "application/json",
          "cache-control": "no-store",
        },
      });
    } catch {
      // Try the next ranked RPC endpoint.
    }
  }

  return NextResponse.json(
    { error: "RPC_UNAVAILABLE" },
    { status: 502, headers: { "cache-control": "no-store" } },
  );
}
