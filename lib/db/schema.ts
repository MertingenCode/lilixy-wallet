import type { DBSchema } from "idb";

import type { VaultRecord } from "@/lib/crypto/types";

export type TransactionType =
  | "send"
  | "receive"
  | "swap"
  | "bridge"
  | "approve"
  | "contract"
  | "cancel";

export type TransactionStatus =
  | "pending"
  | "success"
  | "failed"
  | "replaced";

export interface StoredTransaction {
  /** Stable id derived from the transaction hash so duplicate emitters upsert. */
  id: string;
  hash: string;
  chainId: number;
  type: TransactionType;
  status: TransactionStatus;
  timestamp: number;
  from: string;
  to: string;
  tokenSymbol: string;
  tokenAddress?: string;
  tokenDecimals?: number;
  toTokenSymbol?: string;
  toTokenAddress?: string;
  toTokenDecimals?: number;
  toAmount?: string;
  contractAddress?: string;
  amount?: string;
  value?: string;
  nonce?: number;
  gas?: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  data?: string;
  explorerUrl?: string;
  sourceChainId?: number;
  destinationChainId?: number;
  destinationTxHash?: string;
  routeId?: string;
  error?: string;
  replacedBy?: string;
  source?: "local" | "explorer";
}

export interface LilixyDB extends DBSchema {
  vault: {
    key: string;
    value: VaultRecord;
  };
  transactions: {
    key: string;
    value: StoredTransaction;
    indexes: {
      "by-timestamp": number;
      "by-status": TransactionStatus;
      "by-chain": number;
      "by-hash": string;
    };
  };
}

export const DB_NAME = "lilixy-wallet";
export const DB_VERSION = 1;
export const VAULT_KEY = "primary";
