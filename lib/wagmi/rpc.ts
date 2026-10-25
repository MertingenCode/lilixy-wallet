import {
  createPublicClient,
  createWalletClient,
  fallback,
  http,
  type Chain,
  type PublicClient,
  type Transport,
  type WalletClient,
} from "viem";
import type { HDAccount } from "viem/accounts";

import { getChainRpcUrls } from "@/lib/wagmi/networks";
import { isProxyChain } from "@/lib/wagmi/proxy-chains";

const transportCache = new Map<string, Transport>();
const publicClientCache = new Map<string, PublicClient>();
const walletClientCache = new Map<string, WalletClient>();

export function createFallbackTransport(chain: Chain): Transport {
  const urls = getChainRpcUrls(chain);
  const safeUrls =
    urls.length > 0 ? urls : ["https://ethereum-rpc.publicnode.com"];

  // A same-origin RPC proxy removes third-party CORS differences and keeps the
  // browser's CSP connect-src surface small. Private keys never touch it: only
  // already-signed transactions and read calls are forwarded.
  if (typeof window !== "undefined" && isProxyChain(chain.id)) {
    const proxyKey = `proxy:${chain.id}`;
    const cachedProxy = transportCache.get(proxyKey);
    if (cachedProxy) return cachedProxy;
    const proxyTransport = http(`/api/rpc/${chain.id}`, {
      timeout: 20_000,
      retryCount: 1,
    });
    transportCache.set(proxyKey, proxyTransport);
    return proxyTransport;
  }

  const key = `${chain.id}:${safeUrls.join("|")}`;
  const cached = transportCache.get(key);
  if (cached) return cached;

  const transport = fallback(
    safeUrls.map((url) =>
      http(url, {
        timeout: 12_000,
        retryCount: 0,
      }),
    ),
    {
      rank: true,
      retryCount: 1,
    },
  );
  transportCache.set(key, transport);
  return transport;
}

export function getPublicClientForChain(chain: Chain): PublicClient {
  const urls = getChainRpcUrls(chain);
  const key = `${chain.id}:${urls.join("|")}`;
  const cached = publicClientCache.get(key);
  if (cached) return cached;
  const client = createPublicClient({
    chain,
    transport: createFallbackTransport(chain),
  }) as PublicClient;
  publicClientCache.set(key, client);
  return client;
}

export function getWalletClientForAccount(
  account: HDAccount,
  chain: Chain,
): WalletClient {
  const urls = getChainRpcUrls(chain);
  const key = `${account.address}:${chain.id}:${urls.join("|")}`;
  const cached = walletClientCache.get(key);
  if (cached) return cached;
  const client = createWalletClient({
    account,
    chain,
    transport: createFallbackTransport(chain),
  }) as WalletClient;
  walletClientCache.set(key, client);
  return client;
}

export function clearRpcCache(): void {
  transportCache.clear();
  publicClientCache.clear();
  walletClientCache.clear();
}
