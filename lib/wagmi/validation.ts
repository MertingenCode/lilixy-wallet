import { createPublicClient, http, type Chain } from "viem";

import { isSafeHttpUrl } from "@/lib/wagmi/networks";

export interface RpcValidationResult {
  ok: boolean;
  chainId?: number;
  error?: "INVALID_URL" | "RPC_ERROR" | "CHAIN_ID_MISMATCH";
}

export async function validateRpc(
  rpcUrl: string,
  expectedChainId: number,
): Promise<RpcValidationResult> {
  if (!isSafeHttpUrl(rpcUrl)) {
    return { ok: false, error: "INVALID_URL" };
  }

  try {
    const client = createPublicClient({
      transport: http(rpcUrl, { timeout: 10_000, retryCount: 0 }),
    });
    const actual = await client.getChainId();
    if (actual !== expectedChainId) {
      return {
        ok: false,
        chainId: actual,
        error: "CHAIN_ID_MISMATCH",
      };
    }
    return { ok: true, chainId: actual };
  } catch {
    return { ok: false, error: "RPC_ERROR" };
  }
}

export async function readRpcChainId(rpcUrl: string): Promise<number> {
  if (!isSafeHttpUrl(rpcUrl)) throw new Error("INVALID_URL");
  const client = createPublicClient({
    transport: http(rpcUrl, { timeout: 10_000, retryCount: 0 }),
  });
  return client.getChainId();
}

export async function validateChainRpc(chain: Chain): Promise<boolean> {
  const url = chain.rpcUrls.default.http[0];
  if (!url) return false;
  try {
    const actual = await readRpcChainId(url);
    return actual === chain.id;
  } catch {
    return false;
  }
}
