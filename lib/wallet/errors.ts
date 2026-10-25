export type WalletErrorCode =
  | "NO_VAULT"
  | "WRONG_PASSWORD"
  | "WEAK_PASSWORD"
  | "INVALID_MNEMONIC"
  | "RATE_LIMITED"
  | "VAULT_CORRUPTED"
  | "INDEXEDDB_UNAVAILABLE"
  | "UNKNOWN";

export class WalletError extends Error {
  readonly code: WalletErrorCode;
  readonly retryAfterMs?: number;

  constructor(code: WalletErrorCode, retryAfterMs?: number) {
    super(code);
    this.name = "WalletError";
    this.code = code;
    this.retryAfterMs = retryAfterMs;
  }
}

export function isWalletError(error: unknown): error is WalletError {
  return error instanceof WalletError;
}
