import type { Address } from "viem";

import type { CustomToken } from "@/lib/config/types";
import { BUILT_IN_NETWORKS } from "@/lib/wagmi/networks";

export interface TokenDefinition {
  chainId: number;
  address: Address;
  name: string;
  symbol: string;
  decimals: number;
  coingeckoId?: string;
}

export interface Asset {
  key: string;
  chainId: number;
  kind: "native" | "erc20";
  address?: Address;
  name: string;
  symbol: string;
  decimals: number;
  coingeckoId?: string;
  logoURI?: string;
  balance: bigint;
  isCustom: boolean;
  isPopular: boolean;
  price?: number;
  change24h?: number;
  fiatValue?: number;
  balanceUnavailable?: boolean;
}

export const NATIVE_COINGECKO_IDS: Record<number, string> = {
  1: "ethereum",
  56: "binancecoin",
  137: "polygon-ecosystem-token",
  42161: "ethereum",
  10: "ethereum",
  8453: "ethereum",
  43114: "avalanche-2",
  146: "sonic-3",
  324: "ethereum",
  4663: "ethereum",
};

export const POPULAR_TOKENS: Record<number, TokenDefinition[]> = {
  1: [
    {
      chainId: 1,
      address: "0xA0b86991c6218b36c1d19d4a2e9Eb0cE3606eB48",
      name: "USD Coin",
      symbol: "USDC",
      decimals: 6,
      coingeckoId: "usd-coin",
    },
    {
      chainId: 1,
      address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      name: "Tether USD",
      symbol: "USDT",
      decimals: 6,
      coingeckoId: "tether",
    },
    {
      chainId: 1,
      address: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
      name: "Dai Stablecoin",
      symbol: "DAI",
      decimals: 18,
      coingeckoId: "dai",
    },
    {
      chainId: 1,
      address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      name: "Wrapped Ether",
      symbol: "WETH",
      decimals: 18,
      coingeckoId: "weth",
    },
    {
      chainId: 1,
      address: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
      name: "Chainlink",
      symbol: "LINK",
      decimals: 18,
      coingeckoId: "chainlink",
    },
    {
      chainId: 1,
      address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
      name: "Uniswap",
      symbol: "UNI",
      decimals: 18,
      coingeckoId: "uniswap",
    },
  ],
  56: [
    {
      chainId: 56,
      address: "0x55d398326f99059fF775485246999027B3197955",
      name: "Tether USD",
      symbol: "USDT",
      decimals: 18,
      coingeckoId: "tether",
    },
    {
      chainId: 56,
      address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
      name: "USD Coin",
      symbol: "USDC",
      decimals: 18,
      coingeckoId: "usd-coin",
    },
    {
      chainId: 56,
      address: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82",
      name: "PancakeSwap",
      symbol: "CAKE",
      decimals: 18,
      coingeckoId: "pancakeswap-token",
    },
  ],
  137: [
    {
      chainId: 137,
      address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
      name: "USD Coin",
      symbol: "USDC",
      decimals: 6,
      coingeckoId: "usd-coin",
    },
    {
      chainId: 137,
      address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
      name: "Tether USD",
      symbol: "USDT",
      decimals: 6,
      coingeckoId: "tether",
    },
    {
      chainId: 137,
      address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
      name: "Wrapped Ether",
      symbol: "WETH",
      decimals: 18,
      coingeckoId: "weth",
    },
  ],
  42161: [
    {
      chainId: 42161,
      address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      name: "USD Coin",
      symbol: "USDC",
      decimals: 6,
      coingeckoId: "usd-coin",
    },
    {
      chainId: 42161,
      address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
      name: "Tether USD",
      symbol: "USDT",
      decimals: 6,
      coingeckoId: "tether",
    },
    {
      chainId: 42161,
      address: "0x912CE59144191C1204E64559FE8253a0e49E6548",
      name: "Arbitrum",
      symbol: "ARB",
      decimals: 18,
      coingeckoId: "arbitrum",
    },
    {
      chainId: 42161,
      address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
      name: "Wrapped Ether",
      symbol: "WETH",
      decimals: 18,
      coingeckoId: "weth",
    },
  ],
  10: [
    {
      chainId: 10,
      address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
      name: "USD Coin",
      symbol: "USDC",
      decimals: 6,
      coingeckoId: "usd-coin",
    },
    {
      chainId: 10,
      address: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
      name: "Tether USD",
      symbol: "USDT",
      decimals: 6,
      coingeckoId: "tether",
    },
    {
      chainId: 10,
      address: "0x4200000000000000000000000000000000000042",
      name: "Optimism",
      symbol: "OP",
      decimals: 18,
      coingeckoId: "optimism",
    },
    {
      chainId: 10,
      address: "0x4200000000000000000000000000000000000006",
      name: "Wrapped Ether",
      symbol: "WETH",
      decimals: 18,
      coingeckoId: "weth",
    },
  ],
  8453: [
    {
      chainId: 8453,
      address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      name: "USD Coin",
      symbol: "USDC",
      decimals: 6,
      coingeckoId: "usd-coin",
    },
    {
      chainId: 8453,
      address: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
      name: "Dai Stablecoin",
      symbol: "DAI",
      decimals: 18,
      coingeckoId: "dai",
    },
    {
      chainId: 8453,
      address: "0x4200000000000000000000000000000000000006",
      name: "Wrapped Ether",
      symbol: "WETH",
      decimals: 18,
      coingeckoId: "weth",
    },
  ],
  43114: [
    {
      chainId: 43114,
      address: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
      name: "USD Coin",
      symbol: "USDC",
      decimals: 6,
      coingeckoId: "usd-coin",
    },
    {
      chainId: 43114,
      address: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7",
      name: "Tether USD",
      symbol: "USDT",
      decimals: 6,
      coingeckoId: "tether",
    },
    {
      chainId: 43114,
      address: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
      name: "Wrapped AVAX",
      symbol: "WAVAX",
      decimals: 18,
      coingeckoId: "wrapped-avax",
    },
  ],
};

export function getPopularTokens(chainId: number): TokenDefinition[] {
  return POPULAR_TOKENS[chainId] ?? [];
}

export function customTokenToDefinition(token: CustomToken): TokenDefinition {
  return {
    chainId: token.chainId,
    address: token.address,
    name: token.label?.trim() || token.name,
    symbol: token.symbol,
    decimals: token.decimals,
    coingeckoId: undefined,
  };
}

export function getTrackedTokens(
  chainId: number,
  customTokens: CustomToken[],
): TokenDefinition[] {
  const popular = getPopularTokens(chainId);
  const custom = customTokens
    .filter((token) => token.chainId === chainId)
    .map(customTokenToDefinition);
  const seen = new Set<string>();
  return [...custom, ...popular].filter((token) => {
    const key = token.address.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function getCoinGeckoIds(): string[] {
  const ids = new Set<string>(Object.values(NATIVE_COINGECKO_IDS));
  for (const token of Object.values(POPULAR_TOKENS).flat()) {
    if (token.coingeckoId) ids.add(token.coingeckoId);
  }
  for (const network of BUILT_IN_NETWORKS) {
    if (network.coingeckoId) ids.add(network.coingeckoId);
  }
  // Custom tokens do not have a trusted CoinGecko mapping. No guessing.
  return [...ids].filter(Boolean).sort();
}

export function tokenKey(chainId: number, address?: string): string {
  return `${chainId}:${address?.toLowerCase() ?? "native"}`;
}

export function isSafeImageUrl(value?: string): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
