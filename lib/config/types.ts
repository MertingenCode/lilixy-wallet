import type { Address } from "viem";

export type FiatCurrency = "USD" | "EUR" | "TRY" | "GBP";

export type AutoLockOption = 1 | 5 | 15 | 30 | "tab-close";

export interface CustomNetwork {
  chainId: number;
  name: string;
  rpcUrl: string;
  symbol: string;
  explorerUrl?: string;
  testnet: boolean;
  addedAt: number;
}

export interface AddressBookEntry {
  id: string;
  name: string;
  address: Address;
  createdAt: number;
}

export interface CustomToken {
  id: string;
  chainId: number;
  address: Address;
  name: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
  label?: string;
  addedAt: number;
}

export const FIAT_CURRENCIES: FiatCurrency[] = ["USD", "EUR", "TRY", "GBP"];

export const AUTO_LOCK_OPTIONS: AutoLockOption[] = [
  1,
  5,
  15,
  30,
  "tab-close",
];

export const DEFAULT_AUTO_LOCK: AutoLockOption = 15;
