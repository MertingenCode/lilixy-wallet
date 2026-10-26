import { NextResponse, type NextRequest } from "next/server";

export interface ApiRateLimitPolicy {
  name: string;
  limit: number;
  windowMs: number;
}

interface LimitResult {
  count: number;
  resetAt: number;
}

interface MemoryBucket {
  count: number;
  resetAt: number;
}

const memoryBuckets = new Map<string, MemoryBucket>();
let lastPrune = 0;

function pruneMemory(now: number) {
  if (now - lastPrune < 60_000 && memoryBuckets.size < 5_000) return;
  lastPrune = now;
  for (const [key, bucket] of memoryBuckets) {
    if (bucket.resetAt <= now) memoryBuckets.delete(key);
  }
  // Hard cap prevents a spoofed-IP flood from growing the process forever.
  if (memoryBuckets.size > 10_000) {
    const overflow = memoryBuckets.size - 10_000;
    let removed = 0;
    for (const key of memoryBuckets.keys()) {
      memoryBuckets.delete(key);
      removed += 1;
      if (removed >= overflow) break;
    }
  }
}

function memoryLimit(
  key: string,
  policy: ApiRateLimitPolicy,
  cost: number,
  now: number,
): LimitResult {
  pruneMemory(now);
  const windowStart = Math.floor(now / policy.windowMs) * policy.windowMs;
  const bucketKey = `${policy.name}:${key}:${windowStart}`;
  const existing = memoryBuckets.get(bucketKey);
  const bucket =
    existing && existing.resetAt > now
      ? existing
      : { count: 0, resetAt: windowStart + policy.windowMs };
  bucket.count += cost;
  memoryBuckets.set(bucketKey, bucket);
  return { count: bucket.count, resetAt: bucket.resetAt };
}

function redisConfig(): { url: string; token: string } | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL?.trim() ||
    process.env.KV_REST_API_URL?.trim();
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ||
    process.env.KV_REST_API_TOKEN?.trim();
  if (!url || !token) return null;
  return { url: url.replace(/\/+$/u, ""), token };
}

async function redisLimit(
  key: string,
  policy: ApiRateLimitPolicy,
  cost: number,
  now: number,
): Promise<LimitResult | null> {
  const config = redisConfig();
  if (!config) return null;
  const windowStart = Math.floor(now / policy.windowMs) * policy.windowMs;
  const redisKey = `lilixy:rate:${policy.name}:${key}:${windowStart}`;

  try {
    const response = await fetch(`${config.url}/pipeline`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify([
        ["INCRBY", redisKey, String(cost)],
        ["PEXPIRE", redisKey, String(policy.windowMs), "NX"],
        ["PTTL", redisKey],
      ]),
      cache: "no-store",
      signal: AbortSignal.timeout(800),
    });
    if (!response.ok) return null;
    const results = (await response.json()) as Array<{
      result?: unknown;
      error?: string;
    }>;
    const count = Number(results[0]?.result);
    if (!Number.isFinite(count)) return null;
    const pttl = Number(results[2]?.result);
    return {
      count,
      resetAt:
        Number.isFinite(pttl) && pttl > 0
          ? now + pttl
          : windowStart + policy.windowMs,
    };
  } catch {
    return null;
  }
}

async function clientKey(request: NextRequest): Promise<string> {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    request.headers.get("x-real-ip")?.trim() ||
    forwarded?.split(",")[0]?.trim() ||
    "unknown";
  try {
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(ip),
    );
    return Array.from(new Uint8Array(digest))
      .slice(0, 12)
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return "unknown";
  }
}

export const API_RATE_LIMITS = {
  rpc: { name: "rpc", limit: 240, windowMs: 60_000 },
  prices: { name: "prices", limit: 60, windowMs: 60_000 },
  assetPlatforms: { name: "asset-platforms", limit: 30, windowMs: 60_000 },
  tokenSearch: { name: "token-search", limit: 20, windowMs: 60_000 },
  tokenMarket: { name: "token-market", limit: 60, windowMs: 60_000 },
  lifiChains: { name: "lifi-chains", limit: 60, windowMs: 60_000 },
  lifiStatus: { name: "lifi-status", limit: 60, windowMs: 60_000 },
} as const satisfies Record<string, ApiRateLimitPolicy>;

/**
 * Per-IP fixed-window limiting. Redis (Upstash or Vercel KV REST) is used when
 * configured so limits are shared across serverless instances. Without Redis,
 * the in-memory fallback still protects a single warm instance.
 */
export async function enforceApiRateLimit(
  request: NextRequest,
  policy: ApiRateLimitPolicy,
  cost = 1,
): Promise<NextResponse | null> {
  const now = Date.now();
  const key = await clientKey(request);
  const result =
    (await redisLimit(key, policy, cost, now)) ??
    memoryLimit(key, policy, cost, now);

  const remaining = Math.max(0, policy.limit - result.count);
  const resetSeconds = Math.max(
    1,
    Math.ceil((result.resetAt - now) / 1000),
  );

  if (result.count <= policy.limit) return null;

  return NextResponse.json(
    { error: "RATE_LIMITED", retryAfter: resetSeconds },
    {
      status: 429,
      headers: {
        "cache-control": "no-store",
        "retry-after": String(resetSeconds),
        "x-ratelimit-limit": String(policy.limit),
        "x-ratelimit-remaining": String(remaining),
        "x-ratelimit-reset": String(resetSeconds),
      },
    },
  );
}

export function rateLimitHeaders(
  policy: ApiRateLimitPolicy,
  remaining: number,
  resetSeconds: number,
): Record<string, string> {
  return {
    "x-ratelimit-limit": String(policy.limit),
    "x-ratelimit-remaining": String(Math.max(0, remaining)),
    "x-ratelimit-reset": String(Math.max(1, resetSeconds)),
  };
}
