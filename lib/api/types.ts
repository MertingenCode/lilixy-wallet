import type { FiatCurrency } from "@/lib/config/types";

export interface CoinPrice {
  id: string;
  usd?: number;
  eur?: number;
  try?: number;
  gbp?: number;
  change24h?: number;
  image?: string;
  symbol?: string;
  name?: string;
}

export type PriceMap = Record<string, CoinPrice>;

export interface AssetPlatform {
  id: string;
  chainId: number;
  name: string;
  nativeCoinId: string;
  image?: string;
}

export interface ContractMarketPrice {
  id?: string;
  usd?: number;
  eur?: number;
  try?: number;
  gbp?: number;
}

export interface TokenMarket {
  price?: ContractMarketPrice;
  change24h?: number;
  logoURI?: string;
  name?: string;
  symbol?: string;
  source?: "coingecko" | "dexscreener";
}

export function priceInCurrency(
  price: Pick<CoinPrice, "usd" | "eur" | "try" | "gbp"> | undefined,
  currency: FiatCurrency,
): number | undefined {
  if (!price) return undefined;
  const value =
    currency === "USD"
      ? price.usd
      : currency === "EUR"
        ? price.eur
        : currency === "TRY"
          ? price.try
          : price.gbp;
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export interface LifiStatusResponse {
  status: "DONE" | "FAILED" | "PENDING" | "NOT_FOUND" | "INVALID";
  substatus?: string;
  substatusMessage?: string;
  sending?: {
    txHash?: string;
    chainId?: number;
    amount?: string;
    token?: { symbol?: string; decimals?: number; address?: string };
  };
  receiving?: {
    txHash?: string;
    chainId?: number;
    amount?: string;
    token?: { symbol?: string; decimals?: number; address?: string };
  };
  tool?: string;
  fromChainId?: number;
  toChainId?: number;
}
