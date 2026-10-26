"use client";

import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  WagmiProvider,
} from "wagmi";
import { useSyncWagmiConfig } from "@lifi/wallet-management";

import { useAllWagmiChains } from "@/hooks/use-lifi-chains";
import { setRuntimeChains } from "@/lib/wagmi/chain-registry";
import { localConnector, wagmiConfig } from "@/lib/wagmi/config";
import { useSessionStore } from "@/store/session";
import { useSettingsStore } from "@/store/settings";

const LOCAL_CONNECTORS = [localConnector];

function ChainSynchronizer() {
  const chains = useAllWagmiChains();

  useEffect(() => {
    setRuntimeChains(chains);
  }, [chains]);

  // Keeps the widget's chain list aligned with wagmi. No injected connector is
  // passed, so the only available wallet is Lilixy's local account.
  useSyncWagmiConfig(wagmiConfig, LOCAL_CONNECTORS, chains);

  return null;
}

function LocalConnectorSync() {
  const status = useSessionStore((state) => state.status);
  const activeChainId = useSettingsStore((state) => state.activeChainId);
  const { address: connectedAddress, isConnected } = useAccount();
  const sessionAddress = useSessionStore((state) => state.address);
  const { connectAsync, connectors, status: connectStatus } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const lastAttempt = useRef(0);

  useEffect(() => {
    if (status !== "unlocked" || isConnected || connectStatus === "pending") {
      return;
    }
    const connector = connectors.find((item) => item.id === "lilixy-local");
    if (!connector) return;
    const now = Date.now();
    if (now - lastAttempt.current < 1_500) return;
    lastAttempt.current = now;
    void connectAsync({
      connector,
      chainId: activeChainId,
    } as never).catch(() => {
      // A subsequent render/sync will retry. The UI never offers an external
      // wallet connect flow; the local connector is the only recovery path.
    });
  }, [
    activeChainId,
    connectAsync,
    connectStatus,
    connectors,
    isConnected,
    status,
  ]);

  useEffect(() => {
    if (
      status === "unlocked" &&
      isConnected &&
      sessionAddress &&
      connectedAddress &&
      sessionAddress.toLowerCase() !== connectedAddress.toLowerCase()
    ) {
      lastAttempt.current = 0;
      void disconnectAsync().catch(() => undefined);
    }
  }, [connectedAddress, disconnectAsync, isConnected, sessionAddress, status]);

  useEffect(() => {
    if (status !== "unlocked" && isConnected) {
      void disconnectAsync().catch(() => undefined);
    }
  }, [disconnectAsync, isConnected, status]);

  return null;
}

function SessionQueryCleanup() {
  const status = useSessionStore((state) => state.status);
  const queryClient = useQueryClient();
  const previous = useRef(status);

  useEffect(() => {
    if (
      previous.current === "unlocked" &&
      status !== "unlocked"
    ) {
      void queryClient.cancelQueries();
      // History contains the wallet address and transaction activity. Clearing
      // the whole cache on lock is intentional; prices will refetch on unlock.
      queryClient.clear();
    }
    previous.current = status;
  }, [queryClient, status]);

  return null;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 10 * 60_000,
            retry: 2,
            refetchOnWindowFocus: true,
          },
        },
      }),
  );

  return (
    <WagmiProvider config={wagmiConfig} reconnectOnMount={false}>
      <QueryClientProvider client={queryClient}>
        <ChainSynchronizer />
        <LocalConnectorSync />
        <SessionQueryCleanup />
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
