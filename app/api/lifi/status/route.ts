import { NextResponse, type NextRequest } from "next/server";

import type { LifiStatusResponse } from "@/lib/api/types";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const txHash = request.nextUrl.searchParams.get("txHash") ?? "";
  const fromChain = Number(request.nextUrl.searchParams.get("fromChain"));
  const toChain = Number(request.nextUrl.searchParams.get("toChain"));

  if (
    !/^0x[a-fA-F0-9]{64}$/u.test(txHash) ||
    !Number.isSafeInteger(fromChain) ||
    !Number.isSafeInteger(toChain)
  ) {
    return NextResponse.json(
      { error: "INVALID_PARAMS" },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }

  try {
    const url = new URL("https://li.quest/v1/status");
    url.searchParams.set("txHash", txHash);
    url.searchParams.set("fromChain", String(fromChain));
    url.searchParams.set("toChain", String(toChain));
    const headers: Record<string, string> = { accept: "application/json" };
    if (process.env.LIFI_API_KEY) {
      headers["x-lifi-api-key"] = process.env.LIFI_API_KEY;
    }
    const response = await fetch(url, {
      headers,
      cache: "no-store",
    });
    if (!response.ok) throw new Error("LIFI_STATUS_UPSTREAM");
    const json = (await response.json()) as LifiStatusResponse;
    return NextResponse.json(json, {
      headers: { "cache-control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "LIFI_STATUS_UNAVAILABLE" },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }
}
