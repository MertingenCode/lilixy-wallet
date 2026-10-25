import type { Chain } from "viem";
import type { Config } from "wagmi";

/**
 * Connector setup captures a chain snapshot. The app synchronizes LI.FI chains
 * at runtime, so a tiny registry keeps the provider's chain lookup live without
 * coupling the connector to React.
 */
let runtimeChains: Chain[] = [];
let wagmiConfig: Config | null = null;

export function setRuntimeChains(chains: Chain[]): void {
  runtimeChains = chains;
}

export function getRuntimeChains(): Chain[] {
  return runtimeChains;
}

export function appendRuntimeChain(chain: Chain): void {
  if (!runtimeChains.some((item) => item.id === chain.id)) {
    runtimeChains = [...runtimeChains, chain];
  }
}

export function setWagmiConfig(config: Config): void {
  wagmiConfig = config;
}

export function getWagmiConfig(): Config | null {
  return wagmiConfig;
}
