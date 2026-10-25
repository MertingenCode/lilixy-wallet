import { NextResponse } from "next/server";

import type { AssetPlatform } from "@/lib/api/types";

export const runtime = "nodejs";

interface PlatformRow {
  id?: string;
  name?: string;
  chain_identifier?: number | null;
  native_coin_id?: string | null;
  image?: { large?: string | null; small?: string | null } | null;
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

export async function GET() {
  const { base, headers } = apiConfig();
  try {
    const response = await fetch(`${base}/asset_platforms`, {
      headers,
      next: { revalidate: 86_400 },
    });
    if (!response.ok) {
      return NextResponse.json(
        { platforms: [] },
        { status: 502, headers: { "cache-control": "no-store" } },
      );
    }

    const rows = (await response.json()) as unknown;
    const platforms: AssetPlatform[] = Array.isArray(rows)
      ? (rows as PlatformRow[])
          .filter(
            (row): row is PlatformRow & {
              chain_identifier: number;
              native_coin_id: string;
            } =>
              typeof row.chain_identifier === "number" &&
              row.chain_identifier > 0 &&
              typeof row.native_coin_id === "string" &&
              row.native_coin_id.length > 0,
          )
          .map((row) => ({
            id: row.id ?? String(row.chain_identifier),
            chainId: row.chain_identifier,
            name: row.name ?? row.id ?? String(row.chain_identifier),
            nativeCoinId: row.native_coin_id,
            image: row.image?.large ?? row.image?.small ?? undefined,
          }))
      : [];

    return NextResponse.json(
      { platforms },
      {
        headers: {
          "cache-control": "public, s-maxage=86400, stale-while-revalidate=604800",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { platforms: [] },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }
}
