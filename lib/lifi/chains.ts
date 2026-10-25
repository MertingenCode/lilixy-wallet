import { defineChain, type Chain } from "viem";

export interface LifiChain {
  id: number;
  key: string;
  name: string;
  chainType: string;
  coin?: string;
  nativeCurrency?: {
    name: string;
    symbol: string;
    decimals: number;
  };
  nativeToken?: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  metamask?: {
    chainName?: string;
    rpcUrls?: string[];
    blockExplorerUrls?: string[];
  };
  blockExplorers?: Array<{ name: string; url: string }>;
  logoURI?: string;
}

export function getLifiRpcUrls(raw: LifiChain): string[] {
  return Array.from(
    new Set([...(raw.rpcUrls ?? []), ...(raw.metamask?.rpcUrls ?? [])]),
  ).filter(Boolean);
}

export function lifiChainToViemChain(raw: LifiChain): Chain {
  const rpcUrls = getLifiRpcUrls(raw);
  const native =
    raw.nativeCurrency ?? raw.nativeToken ?? {
      name: raw.name,
      symbol: raw.coin ?? "ETH",
      decimals: 18,
    };
  return defineChain({
    id: raw.id,
    name: raw.name,
    nativeCurrency: {
      name: native.name ?? raw.name,
      symbol: native.symbol ?? "ETH",
      decimals: native.decimals ?? 18,
    },
    rpcUrls: {
      default: {
        http: rpcUrls.length > 0 ? rpcUrls : ["https://ethereum-rpc.publicnode.com"],
      },
    },
    blockExplorers: raw.blockExplorers?.[0]
      ? {
          default: {
            name: raw.blockExplorers[0].name,
            url: raw.blockExplorers[0].url,
          },
        }
      : undefined,
  });
}
