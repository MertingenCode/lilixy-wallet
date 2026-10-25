"use client";

import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";
import { formatUnits, type Address, type Chain } from "viem";

import {
  priceInCurrency,
  type PriceMap,
  type TokenMarket,
} from "@/lib/api/types";
import { useAssetPlatforms } from "@/hooks/use-asset-platforms";
import { usePrices } from "@/hooks/use-prices";
import { tokenMarketKey, useTokenMarkets } from "@/hooks/use-token-market";
import type { CustomNetwork, CustomToken, FiatCurrency } from "@/lib/config/types";
import {
  getCoinGeckoIds,
  NATIVE_COINGECKO_IDS,
  getTrackedTokens,
  tokenKey,
  type Asset,
  type TokenDefinition,
} from "@/lib/wallet/assets";
import { fetchChainBalances } from "@/lib/wallet/balances";
import {
  BUILT_IN_NETWORKS,
  customNetworkToChain,
} from "@/lib/wagmi/networks";
import { useSettingsStore } from "@/store/settings";
import { useSessionStore } from "@/store/session";

function uniqueChains(customNetworks: CustomNetwork[]): Chain[] {
  const map = new Map<number, Chain>();
  for (const network of BUILT_IN_NETWORKS) {
    map.set(network.chain.id, network.chain);
  }
  for (const custom of customNetworks) {
    if (!map.has(custom.chainId)) {
      map.set(custom.chainId, customNetworkToChain(custom));
    }
  }
  return [...map.values()];
}

function priceForToken(
  token: TokenDefinition,
  prices: PriceMap | undefined,
  currency: FiatCurrency,
): number | undefined {
  if (!token.coingeckoId || !prices) return undefined;
  return priceInCurrency(prices[token.coingeckoId], currency);
}

export interface WalletAssetsResult {
  assets: Asset[];
  totalFiat: number | null;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  refetch: () => void;
  prices: PriceMap | undefined;
  chains: Chain[];
  chainErrors: number[];
}

export function useWalletAssets(): WalletAssetsResult {
  const address = useSessionStore((state) => state.address);
  const customNetworks = useSettingsStore((state) => state.customNetworks);
  const customTokens = useSettingsStore((state) => state.customTokens);
  const currency = useSettingsStore((state) => state.currency);

  const chains = useMemo(() => uniqueChains(customNetworks), [customNetworks]);
  const assetPlatforms = useAssetPlatforms(customNetworks.length > 0);
  const priceIds = useMemo(() => {
    const ids = new Set<string>(getCoinGeckoIds());
    for (const network of customNetworks) {
      const nativeId = assetPlatforms.byChainId.get(network.chainId)?.nativeCoinId;
      if (nativeId) ids.add(nativeId);
    }
    return [...ids].sort();
  }, [assetPlatforms.byChainId, customNetworks]);
  const priceQuery = usePrices(priceIds);
  const marketQueries = useTokenMarkets(customTokens);

  const customMarkets = useMemo(() => {
    const map = new Map<string, TokenMarket>();
    customTokens.forEach((token, index) => {
      const market = marketQueries[index]?.data;
      if (market) {
        map.set(tokenMarketKey(token.chainId, token.address), market);
      }
    });
    return map;
  }, [customTokens, marketQueries]);

  const balanceQueries = useQueries({
    queries: chains.map((chain) => {
      const tokens = getTrackedTokens(chain.id, customTokens);
      return {
        queryKey: [
          "balances",
          address,
          chain.id,
          tokens.map((token) => token.address).sort(),
        ],
        queryFn: () =>
          fetchChainBalances(chain, address as Address, tokens),
        enabled: Boolean(address),
        staleTime: 30_000,
        refetchInterval: 60_000,
        retry: 1,
      };
    }),
  });

  const assets = useMemo(() => {
    if (!address) return [];
    const result: Asset[] = [];
    chains.forEach((chain, chainIndex) => {
      const query = balanceQueries[chainIndex];
      const data = query?.data;
      const builtIn = BUILT_IN_NETWORKS.find(
        (item) => item.chain.id === chain.id,
      );
      const nativePriceId =
        NATIVE_COINGECKO_IDS[chain.id] ??
        assetPlatforms.byChainId.get(chain.id)?.nativeCoinId;
      const nativePrice = nativePriceId
        ? priceInCurrency(priceQuery.data?.[nativePriceId], currency)
        : undefined;
      const nativePriceEntry = nativePriceId
        ? priceQuery.data?.[nativePriceId]
        : undefined;
      const nativeBalance = data?.native ?? 0n;
      const nativeDecimals = chain.nativeCurrency.decimals;
      result.push({
        key: tokenKey(chain.id),
        chainId: chain.id,
        kind: "native",
        name: nativePriceEntry?.name ?? chain.nativeCurrency.name,
        symbol: nativePriceEntry?.symbol?.toUpperCase() ?? chain.nativeCurrency.symbol,
        decimals: nativeDecimals,
        coingeckoId: nativePriceId,
        logoURI: nativePriceEntry?.image,
        balance: nativeBalance,
        isCustom: !builtIn,
        isPopular: Boolean(builtIn),
        price: nativePrice,
        change24h: nativePriceEntry?.change24h,
        fiatValue:
          nativePrice !== undefined
            ? Number(formatUnits(nativeBalance, nativeDecimals)) *
              nativePrice
            : undefined,
        balanceUnavailable: data?.native === null,
      });

      const tokens = getTrackedTokens(chain.id, customTokens);
      const customIds = new Set(
        customTokens
          .filter((token) => token.chainId === chain.id)
          .map((token) => token.address.toLowerCase()),
      );
      for (const token of tokens) {
        const tokenBalance =
          data?.tokens[token.address.toLowerCase()] ?? 0n;
        const lowerAddress = token.address.toLowerCase();
        const customToken = customIds.has(lowerAddress)
          ? customTokens.find(
              (item) =>
                item.chainId === chain.id &&
                item.address.toLowerCase() === lowerAddress,
            )
          : undefined;
        const market = customToken
          ? customMarkets.get(tokenMarketKey(chain.id, token.address))
          : undefined;
        const priceEntry = token.coingeckoId
          ? priceQuery.data?.[token.coingeckoId]
          : undefined;
        const marketPrice = market?.price
          ? priceInCurrency(market.price, currency)
          : undefined;
        const price =
          priceForToken(token, priceQuery.data, currency) ?? marketPrice;
        result.push({
          key: tokenKey(chain.id, token.address),
          chainId: chain.id,
          kind: "erc20",
          address: token.address,
          name: customToken?.label?.trim() || token.name,
          symbol: token.symbol,
          decimals: token.decimals,
          coingeckoId: token.coingeckoId,
          logoURI:
            market?.logoURI ??
            priceEntry?.image ??
            customToken?.logoURI,
          balance: tokenBalance,
          isCustom: Boolean(customToken),
          isPopular: !customToken,
          price,
          change24h:
            market?.price !== undefined
              ? market.change24h
              : priceEntry?.change24h,
          fiatValue:
            price !== undefined
              ? Number(formatUnits(tokenBalance, token.decimals)) * price
              : undefined,
          balanceUnavailable: !data && query?.isError,
        });
      }
    });
    return result;
  }, [
    address,
    assetPlatforms.byChainId,
    balanceQueries,
    chains,
    currency,
    customMarkets,
    customTokens,
    priceQuery.data,
  ]);

  const totalFiat = useMemo(() => {
    if (priceQuery.isError && !priceQuery.data) return null;
    let total = 0;
    let anyPriced = false;
    for (const asset of assets) {
      if (asset.fiatValue !== undefined) {
        total += asset.fiatValue;
        anyPriced = true;
      }
    }
    return anyPriced ? total : 0;
  }, [assets, priceQuery.data, priceQuery.isError]);

  const isLoading =
    Boolean(address) &&
    (balanceQueries.some((query) => query.isLoading) || priceQuery.isLoading);
  const isFetching =
    balanceQueries.some((query) => query.isFetching) ||
    priceQuery.isFetching ||
    marketQueries.some((query) => query.isFetching);
  const chainErrors = balanceQueries
    .map((query, index) =>
      query.isError ? (chains[index]?.id ?? 0) : 0,
    )
    .filter(Boolean);

  return {
    assets,
    totalFiat,
    isLoading,
    isFetching,
    isError:
      balanceQueries.every((query) => query.isError) &&
      balanceQueries.length > 0,
    refetch: () => {
      void priceQuery.refetch();
      for (const query of balanceQueries) void query.refetch();
      for (const query of marketQueries) void query.refetch();
    },
    prices: priceQuery.data,
    chains,
    chainErrors,
  };
}

export function getAssetFiatValue(
  asset: Asset,
  currency: FiatCurrency,
  prices: PriceMap | undefined,
): number | undefined {
  if (!prices || !asset.coingeckoId) return asset.fiatValue;
  const price = priceInCurrency(prices[asset.coingeckoId], currency);
  if (price === undefined) return undefined;
  return Number(formatUnits(asset.balance, asset.decimals)) * price;
}

export type { CustomToken };
