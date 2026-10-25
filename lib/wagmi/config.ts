import { createClient, type Chain } from "viem";
import { createConfig } from "wagmi";

import {
  setRuntimeChains,
  setWagmiConfig,
} from "@/lib/wagmi/chain-registry";
import { createLilixyConnector } from "@/lib/wagmi/local-connector";
import { BUILT_IN_CHAINS } from "@/lib/wagmi/networks";
import { createFallbackTransport } from "@/lib/wagmi/rpc";

export const localConnector = createLilixyConnector();

const initialChains = BUILT_IN_CHAINS as [Chain, ...Chain[]];

/**
 * Storage is intentionally null: the wallet must never reconnect across a page
 * load without the password. `reconnectOnMount` is also disabled in the
 * provider. The connector is the only wallet connector in the app.
 */
export const wagmiConfig = createConfig({
  chains: initialChains,
  connectors: [localConnector],
  multiInjectedProviderDiscovery: false,
  storage: null,
  ssr: false,
  client({ chain }) {
    return createClient({
      chain,
      transport: createFallbackTransport(chain),
    });
  },
});

setRuntimeChains(initialChains);
setWagmiConfig(wagmiConfig);
