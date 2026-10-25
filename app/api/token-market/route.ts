import { NextResponse, type NextRequest } from "next/server";
import { getAddress } from "viem";

import {
  COINGECKO_PLATFORMS,
  DEXSCREENER_CHAINS,
  trustWalletLogoUrl,
} from "@/lib/api/coingecko-platforms";
import type { ContractMarketPrice, TokenMarket } from "@/lib/api/types";

export const runtime = "nodejs";

const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/u;
const CHAIN_PATTERN = /^\d{1,10}$/u;

interface CoinGeckoContract {
  id?: string;
  symbol?: string;
  name?: string;
  image?: { small?: string; large?: string; thumb?: string };
  market_data?: {
    current_price?: Record<string, number>;
    price_change_percentage_24h?: number;
  };
}

interface DexPair {
  chainId?: string;
  priceUsd?: string;
  priceChange?: { h24?: number };
  baseToken?: { address?: string; name?: string; symbol?: string };
  info?: { imageUrl?: string };
}

function coingeckoHeaders() {
  const key = process.env.COINGECKO_API_KEY;
  const plan = process.env.COINGECKO_API_PLAN === "pro" ? "pro" : "demo";
  const headers: Record<string, string> = { accept: "application/json" };
  if (key) {
    headers[plan === "pro" ? "x-cg-pro-api-key" : "x-cg-demo-api-key"] = key;
  }
  return headers;
}

function coingeckoBase() {
  return process.env.COINGECKO_API_PLAN === "pro"
    ? "https://pro-api.coingecko.com/api/v3"
    : "https://api.coingecko.com/api/v3";
}

async function fetchJson<T>(url: string, headers?: Record<string, string>) {
  const response = await fetch(url, {
    headers: headers ?? { accept: "application/json" },
    signal: AbortSignal.timeout(8_000),
    next: { revalidate: 300 },
  });
  if (!response.ok) {
    if (response.status === 429 || response.status >= 500) {
      throw new Error(`UPSTREAM_${response.status}`);
    }
    return null;
  }
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export async function GET(request: NextRequest) {
  const chainRaw = request.nextUrl.searchParams.get("chainId") ?? "";
  const address = request.nextUrl.searchParams.get("address")?.toLowerCase() ?? "";
  if (!CHAIN_PATTERN.test(chainRaw) || !ADDRESS_PATTERN.test(address)) {
    return NextResponse.json(
      { market: null, error: "INVALID_PARAMS" },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }

  const chainId = Number(chainRaw);
  if (!Number.isSafeInteger(chainId) || chainId <= 0) {
    return NextResponse.json(
      { market: null, error: "INVALID_CHAIN" },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }

  const platform = COINGECKO_PLATFORMS[chainId];
  const headers = coingeckoHeaders();
  let market: TokenMarket | null = null;
  let upstreamFailed = false;

  if (platform) {
    const url = `${coingeckoBase()}/coins/${encodeURIComponent(platform)}/contract/${encodeURIComponent(address)}`;
    const data = await fetchJson<CoinGeckoContract>(url, headers).catch(() => {
      upstreamFailed = true;
      return null;
    });
    if (data) {
      const prices = data.market_data?.current_price ?? {};
      const price: ContractMarketPrice = { id: data.id };
      if (finite(prices.usd)) price.usd = prices.usd;
      if (finite(prices.eur)) price.eur = prices.eur;
      if (finite(prices.try)) price.try = prices.try;
      if (finite(prices.gbp)) price.gbp = prices.gbp;
      const hasPrice =
        price.usd !== undefined ||
        price.eur !== undefined ||
        price.try !== undefined ||
        price.gbp !== undefined;
      market = {
        price: hasPrice ? price : undefined,
        change24h: finite(data.market_data?.price_change_percentage_24h)
          ? data.market_data?.price_change_percentage_24h
          : undefined,
        logoURI: data.image?.large ?? data.image?.small ?? data.image?.thumb,
        name: data.name,
        symbol: data.symbol?.toUpperCase(),
        source: "coingecko",
      };
    }
  }

  // DexScreener covers long-tail tokens and chains without a CoinGecko
  // platform slug. It returns USD only; never fabricate other fiat values.
  if (!market?.price || !market.logoURI) {
    const pairs = await fetchJson<{ pairs?: DexPair[] }>(
      `https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(address)}`,
    ).catch(() => {
      upstreamFailed = true;
      return null;
    });
    if (pairs?.pairs?.length) {
      const expectedChain = DEXSCREENER_CHAINS[chainId];
      const pair =
        pairs.pairs.find((item) => item.chainId === expectedChain) ??
        pairs.pairs[0];
      const usd = pair?.priceUsd ? Number(pair.priceUsd) : undefined;
      const dexPrice: ContractMarketPrice | undefined = finite(usd)
        ? { usd }
        : undefined;
      market = {
        price: market?.price ?? dexPrice,
        change24h:
          market?.change24h ??
          (finite(pair?.priceChange?.h24) ? pair?.priceChange?.h24 : undefined),
        logoURI: market?.logoURI ?? pair?.info?.imageUrl,
        name: market?.name ?? pair?.baseToken?.name,
        symbol: market?.symbol ?? pair?.baseToken?.symbol?.toUpperCase(),
        source: market?.source ?? "dexscreener",
      };
    }
  }

  const logoURI =
    market?.logoURI ??
    trustWalletLogoUrl(chainId, getAddress(address)) ??
    undefined;

  const result: TokenMarket | null = market
    ? { ...market, logoURI }
    : logoURI
      ? { logoURI, source: "dexscreener" }
      : null;

  if (!result && upstreamFailed) {
    return NextResponse.json(
      { market: null, error: "MARKET_UPSTREAM_UNAVAILABLE" },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }

  return NextResponse.json(
    { market: result },
    {
      headers: {
        "cache-control": "public, s-maxage=300, stale-while-revalidate=900",
      },
    },
  );
}
