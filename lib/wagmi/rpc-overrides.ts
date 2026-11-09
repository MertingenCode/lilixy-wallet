const SETTINGS_KEY = "lilixy.settings.v1";

function safeRpcUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

/**
 * Built-in RPC overrides are a browser preference. The RPC proxy stays on the
 * bundled endpoints; when an override exists the browser talks to that endpoint
 * directly (with the bundled endpoints as fallback).
 */
export function getBuiltInRpcOverride(chainId: number): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as {
      state?: { builtInRpcOverrides?: Record<string, unknown> };
    };
    return safeRpcUrl(parsed.state?.builtInRpcOverrides?.[String(chainId)]);
  } catch {
    return undefined;
  }
}
