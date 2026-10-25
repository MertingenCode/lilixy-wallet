import {
  arbitrum,
  avalanche,
  base,
  bsc,
  mainnet,
  optimism,
  polygon,
  sonic,
  zksync,
  type Chain,
} from "viem/chains";
import { defineChain } from "viem";

import type { CustomNetwork } from "@/lib/config/types";

export interface SupportedNetwork {
  chain: Chain;
  coingeckoId?: string;
  color: string;
  testnet?: boolean;
}

const robinhood = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.mainnet.chain.robinhood.com/"] },
  },
  blockExplorers: {
    default: {
      name: "Robinhood Chain Explorer",
      url: "https://robin.etherscan.io/",
    },
  },
});

const CUSTOM_ENV_RPCS: Record<number, string | undefined> = {
  1: process.env.NEXT_PUBLIC_RPC_ETHEREUM,
  56: process.env.NEXT_PUBLIC_RPC_BSC,
  137: process.env.NEXT_PUBLIC_RPC_POLYGON,
  42161: process.env.NEXT_PUBLIC_RPC_ARBITRUM,
  10: process.env.NEXT_PUBLIC_RPC_OPTIMISM,
  8453: process.env.NEXT_PUBLIC_RPC_BASE,
  43114: process.env.NEXT_PUBLIC_RPC_AVALANCHE,
};

/**
 * CORS-friendly public fallbacks. viem chain defaults sometimes point to a
 * single endpoint without browser CORS support, so Lilixy ships multiple
 * ranked endpoints and lets viem fall through on failure.
 */
const PUBLIC_RPCS: Record<number, string[]> = {
  1: [
    "https://ethereum-rpc.publicnode.com",
    "https://cloudflare-eth.com",
    "https://eth.llamarpc.com",
  ],
  56: [
    "https://bsc-rpc.publicnode.com",
    "https://binance.llamarpc.com",
    "https://bsc-dataseed.binance.org",
  ],
  137: [
    "https://polygon-bor-rpc.publicnode.com",
    "https://polygon-rpc.com",
  ],
  42161: [
    "https://arbitrum-one-rpc.publicnode.com",
    "https://arb1.arbitrum.io/rpc",
  ],
  10: [
    "https://optimism-rpc.publicnode.com",
    "https://mainnet.optimism.io",
  ],
  8453: [
    "https://base-rpc.publicnode.com",
    "https://mainnet.base.org",
  ],
  43114: [
    "https://avalanche-c-chain-rpc.publicnode.com",
    "https://api.avax.network/ext/bc/C/rpc",
  ],
  146: ["https://rpc.soniclabs.com", "https://sonic.drpc.org"],
  324: ["https://mainnet.era.zksync.io", "https://zksync.drpc.org"],
  4663: ["https://rpc.mainnet.chain.robinhood.com/"],
};

export const BUILT_IN_NETWORKS: SupportedNetwork[] = [
  { chain: mainnet, coingeckoId: "ethereum", color: "#627eea" },
  { chain: bsc, coingeckoId: "binancecoin", color: "#f3ba2f" },
  {
    chain: polygon,
    coingeckoId: "polygon-ecosystem-token",
    color: "#8247e5",
  },
  { chain: arbitrum, coingeckoId: "ethereum", color: "#28a0f0" },
  { chain: optimism, coingeckoId: "ethereum", color: "#ff0420" },
  { chain: base, coingeckoId: "ethereum", color: "#0052ff" },
  { chain: avalanche, coingeckoId: "avalanche-2", color: "#e84142" },
  { chain: sonic, coingeckoId: "sonic-3", color: "#0054fa" },
  { chain: zksync, coingeckoId: "ethereum", color: "#8c8dfc" },
  { chain: robinhood, coingeckoId: "ethereum", color: "#00c805" },
];

export const BUILT_IN_CHAINS = BUILT_IN_NETWORKS.map((item) => item.chain);

export function getBuiltInNetwork(chainId: number) {
  return BUILT_IN_NETWORKS.find((item) => item.chain.id === chainId);
}

export function getChainRpcUrls(chain: Chain): string[] {
  const envRpc = CUSTOM_ENV_RPCS[chain.id];
  const publicRpcs = PUBLIC_RPCS[chain.id] ?? [];
  const defaults = chain.rpcUrls.default.http ?? [];
  return Array.from(
    new Set(
      [envRpc, ...publicRpcs, ...defaults].filter(
        (url): url is string => Boolean(url),
      ),
    ),
  );
}

export function customNetworkToChain(network: CustomNetwork): Chain {
  return defineChain({
    id: network.chainId,
    name: network.name,
    nativeCurrency: {
      name: network.symbol,
      symbol: network.symbol,
      decimals: 18,
    },
    rpcUrls: {
      default: { http: [network.rpcUrl] },
    },
    blockExplorers: network.explorerUrl
      ? {
          default: {
            name: `${network.name} explorer`,
            url: network.explorerUrl,
          },
        }
      : undefined,
    testnet: network.testnet,
  });
}

export function getExplorerTxUrl(
  chain: Chain | undefined,
  hash: string,
): string | undefined {
  const base = chain?.blockExplorers?.default?.url;
  if (!base) return undefined;
  return `${base.replace(/\/$/u, "")}/tx/${hash}`;
}

export function getExplorerAddressUrl(
  chain: Chain | undefined,
  address: string,
): string | undefined {
  const base = chain?.blockExplorers?.default?.url;
  if (!base) return undefined;
  return `${base.replace(/\/$/u, "")}/address/${address}`;
}

export function getNetworkLabel(chainId: number): string {
  return (
    getBuiltInNetwork(chainId)?.chain.name ??
    `Chain ${chainId}`
  );
}

export function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const localHttp =
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
    return (
      (url.protocol === "https:" || localHttp) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}
