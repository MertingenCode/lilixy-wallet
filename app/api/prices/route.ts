import { NextResponse, type NextRequest } from "next/server";

import type { CoinPrice, PriceMap } from "@/lib/api/types";

export const runtime = "nodejs";

const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,80}$/u;

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

interface MarketRow {
  id: string;
  symbol?: string;
  name?: string;
  image?: string;
  current_price?: number;
  price_change_percentage_24h?: number;
}

interface SimpleRow {
  usd?: number;
  eur?: number;
  try?: number;
  gbp?: number;
  usd_24h_change?: number;
}

export async function GET(request: NextRequest) {
  const rawIds = request.nextUrl.searchParams.get("ids") ?? "";
  const ids = Array.from(
    new Set(
      rawIds
        .split(",")
        .map((id) => id.trim())
        .filter((id) => ID_PATTERN.test(id)),
    ),
  ).slice(0, 80);

  if (ids.length === 0) {
    return NextResponse.json(
      { error: "MISSING_IDS", prices: {} },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }

  const { base, headers } = apiConfig();
  const idList = ids.join(",");
  const marketUrl = `${base}/coins/markets?vs_currency=usd&ids=${encodeURIComponent(idList)}&order=market_cap_desc&per_page=${ids.length}&page=1&sparkline=false&price_change_percentage=24h`;
  const simpleUrl = `${base}/simple/price?ids=${encodeURIComponent(idList)}&vs_currencies=usd,eur,try,gbp&include_24hr_change=true`;

  const [marketResult, simpleResult] = await Promise.allSettled([
    fetch(marketUrl, { headers, next: { revalidate: 60 } }),
    fetch(simpleUrl, { headers, next: { revalidate: 60 } }),
  ]);

  let markets: MarketRow[] = [];
  let simple: Record<string, SimpleRow> = {};

  if (marketResult.status === "fulfilled" && marketResult.value.ok) {
    try {
      const json = (await marketResult.value.json()) as unknown;
      if (Array.isArray(json)) markets = json as MarketRow[];
    } catch {
      markets = [];
    }
  }

  if (simpleResult.status === "fulfilled" && simpleResult.value.ok) {
    try {
      const json = (await simpleResult.value.json()) as unknown;
      if (json && typeof json === "object") {
        simple = json as Record<string, SimpleRow>;
      }
    } catch {
      simple = {};
    }
  }

  if (markets.length === 0 && Object.keys(simple).length === 0) {
    return NextResponse.json(
      { error: "PRICE_UPSTREAM_UNAVAILABLE", prices: {} },
      {
        status: 502,
        headers: { "cache-control": "no-store" },
      },
    );
  }

  const prices: PriceMap = {};
  for (const id of ids) {
    const market = markets.find((item) => item.id === id);
    const currency = simple[id];
    const entry: CoinPrice = { id };
    if (market) {
      entry.image = market.image;
      entry.symbol = market.symbol;
      entry.name = market.name;
      if (typeof market.current_price === "number") {
        entry.usd = market.current_price;
      }
      if (typeof market.price_change_percentage_24h === "number") {
        entry.change24h = market.price_change_percentage_24h;
      }
    }
    if (currency) {
      if (typeof currency.usd === "number") entry.usd = currency.usd;
      if (typeof currency.eur === "number") entry.eur = currency.eur;
      if (typeof currency.try === "number") entry.try = currency.try;
      if (typeof currency.gbp === "number") entry.gbp = currency.gbp;
      if (typeof currency.usd_24h_change === "number") {
        entry.change24h = currency.usd_24h_change;
      }
    }
    prices[id] = entry;
  }

  return NextResponse.json(
    { prices },
    {
      headers: {
        "cache-control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}
