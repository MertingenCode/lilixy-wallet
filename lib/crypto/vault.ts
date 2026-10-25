import { validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";

import {
  base64ToBytes,
  bytesToBase64,
  bytesToUtf8,
  randomBytes,
  utf8ToBytes,
} from "./encoding";
import { assertWebCrypto, deriveAesKey } from "./kdf";
import {
  IV_BYTES,
  MIN_PBKDF2_ITERATIONS,
  PBKDF2_ITERATIONS,
  SALT_BYTES,
  VAULT_AAD,
  VAULT_VERSION,
  VaultError,
  type VaultRecord,
} from "./types";

const aad = utf8ToBytes(VAULT_AAD);

function validateRecord(record: VaultRecord) {
  if (
    !record ||
    record.version !== VAULT_VERSION ||
    record.kdf?.name !== "PBKDF2" ||
    record.kdf?.hash !== "SHA-256" ||
    record.cipher?.name !== "AES-GCM" ||
    typeof record.kdf.salt !== "string" ||
    typeof record.cipher.iv !== "string" ||
    typeof record.cipher.ciphertext !== "string"
  ) {
    throw new VaultError("INVALID_VAULT");
  }

  if (
    !Number.isSafeInteger(record.kdf.iterations) ||
    record.kdf.iterations < MIN_PBKDF2_ITERATIONS
  ) {
    throw new VaultError("WEAK_KDF");
  }

  let salt: Uint8Array;
  let iv: Uint8Array;
  let ciphertext: Uint8Array;
  try {
    salt = base64ToBytes(record.kdf.salt);
    iv = base64ToBytes(record.cipher.iv);
    ciphertext = base64ToBytes(record.cipher.ciphertext);
  } catch {
    throw new VaultError("INVALID_VAULT");
  }

  if (salt.length !== SALT_BYTES || iv.length !== IV_BYTES) {
    throw new VaultError("INVALID_VAULT");
  }

  // AES-GCM always adds a 16 byte authentication tag.
  if (ciphertext.length < 17) {
    throw new VaultError("INVALID_VAULT");
  }

  return { salt, iv, ciphertext };
}

export async function encryptMnemonic(
  mnemonic: string,
  password: string,
  iterations = PBKDF2_ITERATIONS,
): Promise<VaultRecord> {
  if (!validateMnemonic(mnemonic, wordlist)) {
    throw new VaultError("INVALID_MNEMONIC");
  }
  if (!password) {
    throw new VaultError("INVALID_PASSWORD");
  }

  const subtle = assertWebCrypto();
  const salt = randomBytes(SALT_BYTES);
  const iv = randomBytes(IV_BYTES);
  const key = await deriveAesKey(password, salt, iterations);
  const ciphertext = await subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv as BufferSource,
      additionalData: aad as BufferSource,
      tagLength: 128,
    },
    key,
    utf8ToBytes(mnemonic) as BufferSource,
  );

  return {
    version: VAULT_VERSION,
    createdAt: new Date().toISOString(),
    kdf: {
      name: "PBKDF2",
      hash: "SHA-256",
      iterations,
      salt: bytesToBase64(salt),
    },
    cipher: {
      name: "AES-GCM",
      iv: bytesToBase64(iv),
      ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    },
  };
}

/**
 * There is deliberately no password verifier/hash. A failed AES-GCM tag check
 * is the only signal that the password is wrong (or the vault was tampered with).
 */
export async function decryptVault(
  record: VaultRecord,
  password: string,
): Promise<string> {
  if (!password) {
    throw new VaultError("INVALID_PASSWORD");
  }

  const { salt, iv, ciphertext } = validateRecord(record);
  const subtle = assertWebCrypto();
  const key = await deriveAesKey(password, salt, record.kdf.iterations);

  let plaintext: Uint8Array;
  try {
    const decrypted = await subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv as BufferSource,
        additionalData: aad as BufferSource,
        tagLength: 128,
      },
      key,
      ciphertext as BufferSource,
    );
    plaintext = new Uint8Array(decrypted);
  } catch {
    throw new VaultError("DECRYPT_FAILED");
  }

  let mnemonic: string;
  try {
    mnemonic = bytesToUtf8(plaintext).trim();
  } catch {
    throw new VaultError("INVALID_MNEMONIC");
  } finally {
    plaintext.fill(0);
  }

  if (!validateMnemonic(mnemonic, wordlist)) {
    throw new VaultError("INVALID_MNEMONIC");
  }

  return mnemonic;
}

export function serializeVault(record: VaultRecord): string {
  // Used only for storage; callers must never include the decrypted mnemonic.
  return JSON.stringify(record);
}
