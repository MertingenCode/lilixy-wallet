export const VAULT_VERSION = 1 as const;
export const PBKDF2_ITERATIONS = 600_000;
export const MIN_PBKDF2_ITERATIONS = 600_000;
export const SALT_BYTES = 16;
export const IV_BYTES = 12;
export const AES_KEY_BITS = 256;
export const VAULT_AAD = "lilixy-vault:v1";

export interface VaultKdfParams {
  name: "PBKDF2";
  hash: "SHA-256";
  iterations: number;
  salt: string;
}

export interface VaultCipherParams {
  name: "AES-GCM";
  iv: string;
  ciphertext: string;
}

export interface VaultRecord {
  version: typeof VAULT_VERSION;
  createdAt: string;
  kdf: VaultKdfParams;
  cipher: VaultCipherParams;
}

export type VaultErrorCode =
  | "INVALID_VAULT"
  | "WEAK_KDF"
  | "DECRYPT_FAILED"
  | "INVALID_MNEMONIC"
  | "CRYPTO_UNAVAILABLE"
  | "INVALID_PASSWORD";

export class VaultError extends Error {
  readonly code: VaultErrorCode;

  constructor(code: VaultErrorCode, message?: string) {
    super(message ?? code);
    this.name = "VaultError";
    this.code = code;
  }
}
