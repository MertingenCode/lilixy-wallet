import { normalizePassword, utf8ToBytes } from "./encoding";
import {
  AES_KEY_BITS,
  MIN_PBKDF2_ITERATIONS,
  PBKDF2_ITERATIONS,
  VaultError,
} from "./types";

export function assertWebCrypto(): SubtleCrypto {
  if (!globalThis.crypto?.subtle) {
    throw new VaultError(
      "CRYPTO_UNAVAILABLE",
      "Web Crypto API is not available in this browser.",
    );
  }
  return globalThis.crypto.subtle;
}

/**
 * PBKDF2-SHA-256 is used instead of Argon2id to avoid shipping/evaluating WASM.
 * The iteration count exceeds OWASP's current PBKDF2-SHA256 recommendation and
 * is stored in the vault record so future migrations can raise it safely.
 */
export async function deriveAesKey(
  password: string,
  salt: Uint8Array,
  iterations = PBKDF2_ITERATIONS,
): Promise<CryptoKey> {
  if (!password) {
    throw new VaultError("INVALID_PASSWORD");
  }
  if (!Number.isSafeInteger(iterations) || iterations < MIN_PBKDF2_ITERATIONS) {
    throw new VaultError("WEAK_KDF");
  }
  const subtle = assertWebCrypto();
  const passwordBytes = utf8ToBytes(normalizePassword(password));
  const baseKey = await subtle.importKey(
    "raw",
    passwordBytes as BufferSource,
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );

  // The derived key is non-extractable: JS can use it but cannot read its bytes.
  return subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: AES_KEY_BITS },
    false,
    ["encrypt", "decrypt"],
  );
}
