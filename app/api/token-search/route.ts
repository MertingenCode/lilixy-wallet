import { NextResponse, type NextRequest } from "next/server";

import type { TokenSearchResult } from "@/lib/api/types";
import {
  API_RATE_LIMITS,
  enforceApiRateLimit,
} from "@/lib/security/api-rate-limit";

export const runtime = "nodejs";

interface PlatformRow {
  id?: string;
  chain_identifier?: number | null;
}

interface CoinRow {
  id?: string;
  name?: string;
  symbol?: string;
  platforms?: Record<string, string | undefined>;
}

function apiConfig() {
  const key = process.env.COINGECKO_API_KEY;
  const plan = process.env.COINGECKO_API_PLAN === "pro" ? "pro" : "demo";
  const base =
    plan === "pro"
      ? "https://pro-api.coingecko.com/api/v3"
      : "https://api.coingecko.com/api/v3";
  const headers: Record<string, string> = { accept: "application/json" };
  if (key) {
    headers[plan === "pro" ? "x-cg-pro-api-key" : "x-cg-demo-api-key"] = key;
  }
  return { base, headers };
}

export async function GET(request: NextRequest) {
  const limited = await enforceApiRateLimit(
    request,
    API_RATE_LIMITS.tokenSearch,
  );
  if (limited) return limited;

  const rawChainId = request.nextUrl.searchParams.get("chainId") ?? "";
  const rawQuery = request.nextUrl.searchParams.get("q") ?? "";
  const chainId = Number(rawChainId);
  const query = rawQuery.trim().toLowerCase();

  if (!Number.isSafeInteger(chainId) || chainId <= 0 || query.length < 2) {
    return NextResponse.json(
      { results: [] },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }

  const { base, headers } = apiConfig();
  try {
    const [platformResponse, coinsResponse] = await Promise.all([
      fetch(`${base}/asset_platforms`, {
        headers,
        next: { revalidate: 86_400 },
      }),
      fetch(`${base}/coins/list?include_platform=true`, {
        headers,
        next: { revalidate: 86_400 },
      }),
    ]);
    if (!platformResponse.ok || !coinsResponse.ok) {
      return NextResponse.json(
        { results: [] },
        { status: 502, headers: { "cache-control": "no-store" } },
      );
    }

    const platforms = (await platformResponse.json()) as PlatformRow[];
    const platform = platforms.find(
      (item) => item.chain_identifier === chainId && item.id,
    );
    if (!platform?.id) {
      return NextResponse.json(
        { results: [] },
        { headers: { "cache-control": "public, s-maxage=3600" } },
      );
    }

    const coins = (await coinsResponse.json()) as CoinRow[];
    const matches: TokenSearchResult[] = [];
    const seen = new Set<string>();

    for (const coin of coins) {
      if (!coin.id || !coin.name || !coin.symbol) continue;
      const address = coin.platforms?.[platform.id];
      if (!address || !/^0x[a-fA-F0-9]{40}$/u.test(address)) continue;
      const name = coin.name.toLowerCase();
      const symbol = coin.symbol.toLowerCase();
      if (!name.includes(query) && !symbol.includes(query)) continue;
      const key = address.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      matches.push({
        id: coin.id,
        name: coin.name,
        symbol: coin.symbol,
        address,
      });
    }

    matches.sort((a, b) => {
      const aSymbol = a.symbol.toLowerCase();
      const bSymbol = b.symbol.toLowerCase();
      const aScore =
        aSymbol === query ? 0 : aSymbol.startsWith(query) ? 1 : a.name.toLowerCase().startsWith(query) ? 2 : 3;
      const bScore =
        bSymbol === query ? 0 : bSymbol.startsWith(query) ? 1 : b.name.toLowerCase().startsWith(query) ? 2 : 3;
      return aScore - bScore || a.name.localeCompare(b.name);
    });

    return NextResponse.json(
      { results: matches.slice(0, 10) },
      {
        headers: {
          "cache-control": "public, s-maxage=600, stale-while-revalidate=3600",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { results: [] },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }
}
