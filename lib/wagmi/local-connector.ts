import { createConnector } from "wagmi";
import {
  hexToBytes,
  isAddress,
  isHex,
  toHex,
  type Address,
  type Chain,
  type Hex,
  type TypedData,
  type WalletClient,
} from "viem";
import type { HDAccount } from "viem/accounts";

import type { CustomNetwork } from "@/lib/config/types";
import {
  appendRuntimeChain,
  getRuntimeChains,
} from "@/lib/wagmi/chain-registry";
import { customNetworkToChain } from "@/lib/wagmi/networks";
import { useSettingsStore } from "@/store/settings";
import { ProviderRpcError, RPC_ERRORS, mapProviderError } from "@/lib/wagmi/errors";
import {
  getPublicClientForChain,
  getWalletClientForAccount,
} from "@/lib/wagmi/rpc";
import { readRpcChainId } from "@/lib/wagmi/validation";
import { getSessionAccount } from "@/lib/wallet/session-memory";
import { emitTransactionSent } from "@/lib/wallet/tx-channel";
import { sleep } from "@/lib/utils";

type ProviderEvent =
  | "accountsChanged"
  | "chainChanged"
  | "connect"
  | "disconnect"
  | "message";

type ProviderListener = (...args: unknown[]) => void;

export interface LilixyProvider {
  request(args: { method: string; params?: unknown[] | object }): Promise<unknown>;
  on(event: ProviderEvent, listener: ProviderListener): LilixyProvider;
  removeListener(event: ProviderEvent, listener: ProviderListener): LilixyProvider;
  emit(event: ProviderEvent, ...args: unknown[]): void;
}

interface SendTransactionParams {
  from?: Address;
  to?: Address;
  value?: string;
  data?: string;
  gas?: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  nonce?: string;
  chainId?: string;
}

function toBigInt(value?: string): bigint | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  try {
    return BigInt(value);
  } catch {
    throw new ProviderRpcError(RPC_ERRORS.invalidParams, "Invalid numeric value");
  }
}

function toNumber(value?: string): number | undefined {
  const parsed = toBigInt(value);
  return parsed === undefined ? undefined : Number(parsed);
}

function parseChainId(value: unknown): number {
  if (typeof value === "number" && Number.isSafeInteger(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = Number(BigInt(value));
      if (Number.isSafeInteger(parsed) && parsed > 0) return parsed;
    } catch {
      // fall through
    }
  }
  throw new ProviderRpcError(RPC_ERRORS.invalidParams, "Invalid chain ID");
}

function addressesEqual(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

interface ConnectorChainConfig {
  chains: readonly [Chain, ...Chain[]];
}

function findChain(
  config: ConnectorChainConfig,
  chainId: number,
): Chain | undefined {
  const runtime = getRuntimeChains();
  return (
    runtime.find((chain) => chain.id === chainId) ??
    config.chains.find((chain) => chain.id === chainId)
  );
}

function activeChain(config: ConnectorChainConfig): Chain {
  const chainId = useSettingsStore.getState().activeChainId;
  return findChain(config, chainId) ?? getRuntimeChains()[0] ?? config.chains[0];
}

function requireAccount(): HDAccount {
  const account = getSessionAccount();
  if (!account) {
    throw new ProviderRpcError(
      RPC_ERRORS.unauthorized,
      "Lilixy Wallet is locked",
    );
  }
  return account;
}

function assertSender(from: string | undefined, account: HDAccount) {
  if (from && !addressesEqual(from, account.address)) {
    throw new ProviderRpcError(
      RPC_ERRORS.unauthorized,
      "The requested sender is not the active Lilixy account",
    );
  }
}

function createProvider(
  config: ConnectorChainConfig,
  bridge: (event: ProviderEvent, ...args: unknown[]) => void,
  switchToChain: (chainId: number) => Chain,
): LilixyProvider {
  const listeners = new Map<ProviderEvent, Set<ProviderListener>>();

  const provider: LilixyProvider = {
    async request({ method, params }) {
      try {
        switch (method) {
          case "eth_accounts":
          case "eth_requestAccounts": {
            const account = getSessionAccount();
            if (method === "eth_requestAccounts" && !account) {
              throw new ProviderRpcError(
                RPC_ERRORS.unauthorized,
                "Lilixy Wallet is locked",
              );
            }
            return account ? [account.address] : [];
          }
          case "eth_coinbase": {
            const account = requireAccount();
            return account.address;
          }
          case "eth_chainId": {
            return toHex(activeChain(config).id);
          }
          case "net_version": {
            return String(activeChain(config).id);
          }
          case "eth_sendTransaction": {
            const account = requireAccount();
            const chain = activeChain(config);
            const input = (Array.isArray(params) ? params[0] : undefined) as
              | SendTransactionParams
              | undefined;
            if (!input || typeof input !== "object") {
              throw new ProviderRpcError(
                RPC_ERRORS.invalidParams,
                "Missing transaction parameters",
              );
            }
            assertSender(input.from, account);
            const client = getWalletClientForAccount(account, chain);
            const value = toBigInt(input.value);
            const gas = toBigInt(input.gas);
            const gasPrice = toBigInt(input.gasPrice);
            const maxFeePerGas = toBigInt(input.maxFeePerGas);
            const maxPriorityFeePerGas = toBigInt(input.maxPriorityFeePerGas);
            const nonce = toNumber(input.nonce);

            const hash = await (client as WalletClient).sendTransaction({
              account,
              chain,
              to: input.to,
              data: input.data as Hex | undefined,
              value,
              gas,
              gasPrice,
              maxFeePerGas,
              maxPriorityFeePerGas,
              nonce,
            } as never);

            emitTransactionSent({
              hash,
              chainId: chain.id,
              from: account.address,
              to: input.to,
              value: value?.toString(),
              data: input.data,
              nonce,
              gas: gas?.toString(),
              gasPrice: gasPrice?.toString(),
              maxFeePerGas: maxFeePerGas?.toString(),
              maxPriorityFeePerGas: maxPriorityFeePerGas?.toString(),
              timestamp: Date.now(),
            });
            return hash;
          }
          case "personal_sign": {
            const account = requireAccount();
            if (!Array.isArray(params) || params.length < 1) {
              throw new ProviderRpcError(
                RPC_ERRORS.invalidParams,
                "Missing sign parameters",
              );
            }
            const data = params[0];
            const possibleAddress =
              typeof params[1] === "string" ? params[1] : undefined;
            if (possibleAddress && isAddress(possibleAddress)) {
              assertSender(possibleAddress, account);
            }
            if (typeof data !== "string") {
              throw new ProviderRpcError(
                RPC_ERRORS.invalidParams,
                "Invalid message",
              );
            }
            const raw = isHex(data)
              ? hexToBytes(data)
              : new TextEncoder().encode(data);
            return account.signMessage({ message: { raw } });
          }
          case "eth_signTypedData":
          case "eth_signTypedData_v3":
          case "eth_signTypedData_v4": {
            const account = requireAccount();
            if (!Array.isArray(params) || params.length < 2) {
              throw new ProviderRpcError(
                RPC_ERRORS.invalidParams,
                "Missing typed data",
              );
            }
            const possibleAddress = params[0];
            if (
              typeof possibleAddress === "string" &&
              isAddress(possibleAddress)
            ) {
              assertSender(possibleAddress, account);
            }
            const rawData = params[1];
            const parsed =
              typeof rawData === "string" ? JSON.parse(rawData) : rawData;
            if (!parsed || typeof parsed !== "object") {
              throw new ProviderRpcError(
                RPC_ERRORS.invalidParams,
                "Invalid typed data",
              );
            }
            const typed = parsed as {
              domain?: Record<string, unknown>;
              types?: Record<string, unknown>;
              primaryType?: string;
              message?: Record<string, unknown>;
            };
            if (
              !typed.domain ||
              !typed.types ||
              !typed.message ||
              !typed.primaryType
            ) {
              throw new ProviderRpcError(
                RPC_ERRORS.invalidParams,
                "Incomplete typed data",
              );
            }
            const { EIP712Domain: _ignoredDomain, ...types } = typed.types;
            void _ignoredDomain;
            return account.signTypedData({
              domain: typed.domain,
              types: types as TypedData,
              primaryType: typed.primaryType,
              message: typed.message,
            } as never);
          }
          case "eth_sign": {
            const account = requireAccount();
            if (!Array.isArray(params) || params.length < 2) {
              throw new ProviderRpcError(
                RPC_ERRORS.invalidParams,
                "Missing sign parameters",
              );
            }
            const possibleAddress = params[0];
            if (
              typeof possibleAddress === "string" &&
              isAddress(possibleAddress)
            ) {
              assertSender(possibleAddress, account);
            }
            const hash = params[1];
            if (typeof hash !== "string" || !isHex(hash)) {
              throw new ProviderRpcError(
                RPC_ERRORS.invalidParams,
                "Invalid hash",
              );
            }
            return account.sign({ hash: hash as Hex });
          }
          case "wallet_switchEthereumChain": {
            const input = (Array.isArray(params) ? params[0] : undefined) as
              | { chainId?: string }
              | undefined;
            const chainId = parseChainId(input?.chainId);
            switchToChain(chainId);
            return null;
          }
          case "wallet_addEthereumChain": {
            const input = (Array.isArray(params) ? params[0] : undefined) as
              | {
                  chainId?: string;
                  chainName?: string;
                  rpcUrls?: string[];
                  nativeCurrency?: {
                    name?: string;
                    symbol?: string;
                    decimals?: number;
                  };
                  blockExplorerUrls?: string[];
                }
              | undefined;
            const chainId = parseChainId(input?.chainId);
            if (findChain(config, chainId)) {
              switchToChain(chainId);
              return null;
            }
            const rpcUrl = input?.rpcUrls?.[0];
            if (!rpcUrl || !input?.chainName || !input.nativeCurrency?.symbol) {
              throw new ProviderRpcError(
                RPC_ERRORS.invalidParams,
                "Incomplete chain parameters",
              );
            }
            const actual = await readRpcChainId(rpcUrl);
            if (actual !== chainId) {
              throw new ProviderRpcError(
                RPC_ERRORS.invalidParams,
                "RPC chain ID mismatch",
              );
            }
            const custom: CustomNetwork = {
              chainId,
              name: input.chainName.slice(0, 60),
              rpcUrl,
              symbol: input.nativeCurrency.symbol.slice(0, 12).toUpperCase(),
              explorerUrl: input.blockExplorerUrls?.[0],
              testnet: false,
              addedAt: Date.now(),
            };
            const chain = customNetworkToChain(custom);
            useSettingsStore.getState().addCustomNetwork(custom);
            appendRuntimeChain(chain);

            // The React chain synchronizer will rebuild the wagmi connector
            // list shortly; switching now keeps the provider responsive.
            switchToChain(chainId);
            await sleep(0);
            return null;
          }
          case "wallet_getPermissions":
          case "wallet_requestPermissions": {
            const account = getSessionAccount();
            if (!account) {
              throw new ProviderRpcError(
                RPC_ERRORS.unauthorized,
                "Lilixy Wallet is locked",
              );
            }
            return [{ parentCapability: "eth_accounts" }];
          }
          case "wallet_getCapabilities":
            return {};
          default: {
            const chain = activeChain(config);
            const client = getPublicClientForChain(chain);
            return client.request({
              method,
              params,
            } as never);
          }
        }
      } catch (error) {
        throw mapProviderError(error);
      }
    },
    on(event, listener) {
      const set = listeners.get(event) ?? new Set<ProviderListener>();
      set.add(listener);
      listeners.set(event, set);
      return provider;
    },
    removeListener(event, listener) {
      listeners.get(event)?.delete(listener);
      return provider;
    },
    emit(event, ...args) {
      for (const listener of listeners.get(event) ?? []) {
        try {
          listener(...args);
        } catch {
          // A listener must never break a wallet operation.
        }
      }
      bridge(event, ...args);
    },
  };

  return provider;
}

const icon =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#2563eb"/><path d="M20 16h9v25h16v9H20z" fill="white"/><circle cx="44" cy="20" r="6" fill="#93c5fd"/></svg>',
  );

/**
 * A local EIP-1193 connector backed by the in-memory mnemonic-derived account.
 * Signatures are produced locally; only signed/raw RPC traffic leaves the
 * device. No injected wallet is ever discovered or offered to the user.
 */
export function createLilixyConnector() {
  return createConnector((config) => {
    const { emitter } = config;
    const providerRef: { current: LilixyProvider | null } = { current: null };

    const switchToChain = (chainId: number): Chain => {
      const chain = findChain(config, chainId);
      if (!chain) {
        throw new ProviderRpcError(
          RPC_ERRORS.unrecognizedChain,
          "Unrecognized chain ID",
        );
      }
      useSettingsStore.getState().setActiveChainId(chain.id);
      providerRef.current?.emit("chainChanged", toHex(chain.id));
      return chain;
    };

    const provider = createProvider(
      config,
      (event, ...args) => {
        if (event === "accountsChanged") {
          const accounts = (args[0] ?? []) as readonly Address[];
          emitter.emit("change", { accounts });
        } else if (event === "chainChanged") {
          const chainId = Number(BigInt(String(args[0])));
          emitter.emit("change", { chainId });
        } else if (event === "disconnect") {
          emitter.emit("disconnect");
        }
      },
      switchToChain,
    );
    providerRef.current = provider;

    return {
      id: "lilixy-local",
      name: "Lilixy Wallet",
      rdns: "io.lilixy.wallet",
      type: "lilixy",
      icon,
      async connect(parameters) {
        const account = requireAccount();
        const chainId = parameters?.chainId
          ? parseChainId(parameters.chainId)
          : activeChain(config).id;
        const chain = findChain(config, chainId) ?? activeChain(config);
        useSettingsStore.getState().setActiveChainId(chain.id);
        return {
          accounts: [account.address] as const,
          chainId: chain.id,
        } as never;
      },
      async disconnect() {
        provider.emit("accountsChanged", []);
        provider.emit(
          "disconnect",
          new ProviderRpcError(RPC_ERRORS.disconnected, "Disconnected"),
        );
      },
      async getAccounts() {
        const account = getSessionAccount();
        return account ? [account.address] : [];
      },
      async getChainId() {
        return activeChain(config).id;
      },
      async isAuthorized() {
        return Boolean(getSessionAccount());
      },
      async switchChain({ chainId }) {
        return switchToChain(chainId);
      },
      onAccountsChanged(accounts) {
        if (accounts.length === 0) {
          provider.emit("accountsChanged", []);
        }
      },
      onChainChanged(chainId) {
        const numeric = Number(BigInt(chainId));
        if (Number.isSafeInteger(numeric)) {
          useSettingsStore.getState().setActiveChainId(numeric);
        }
      },
      onDisconnect() {
        provider.emit("disconnect", undefined);
      },
      async getProvider() {
        return provider;
      },
    };
  });
}
