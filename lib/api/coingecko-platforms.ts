/**
 * CoinGecko uses platform slugs, not EVM chain IDs, for contract lookups.
 * Keep this table server-side (or import it in a server route only).
 */
export const COINGECKO_PLATFORMS: Record<number, string> = {
  1: "ethereum",
  10: "optimistic-ethereum",
  56: "binance-smart-chain",
  100: "xdai",
  137: "polygon-pos",
  250: "fantom",
  324: "zksync",
  1101: "polygon-zkevm",
  1284: "moonbeam",
  5000: "mantle",
  8453: "base",
  42161: "arbitrum-one",
  42220: "celo",
  43114: "avalanche",
  59144: "linea",
  34443: "mode",
  534352: "scroll",
  7777777: "zora",
  81457: "blast",
};

export const DEXSCREENER_CHAINS: Record<number, string> = {
  1: "ethereum",
  10: "optimism",
  56: "bsc",
  100: "gnosischain",
  137: "polygon",
  250: "fantom",
  324: "zksync",
  1101: "polygonzkevm",
  8453: "base",
  42161: "arbitrum",
  42220: "celo",
  43114: "avalanche",
  59144: "linea",
  534352: "scroll",
  81457: "blast",
};

/** Trust Wallet assets repository slugs for known EVM chains. */
export const TRUSTWALLET_CHAINS: Record<number, string> = {
  1: "ethereum",
  10: "optimism",
  56: "smartchain",
  100: "xdai",
  137: "polygon",
  250: "fantom",
  324: "zksync",
  1101: "polygonzkevm",
  8453: "base",
  42161: "arbitrum",
  42220: "celo",
  43114: "avalanchec",
  59144: "linea",
  534352: "scroll",
  81457: "blast",
};

export function trustWalletLogoUrl(
  chainId: number,
  address: string,
): string | undefined {
  const chain = TRUSTWALLET_CHAINS[chainId];
  if (!chain) return undefined;
  return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${chain}/assets/${address}/logo.png`;
}
