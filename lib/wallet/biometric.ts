import {
  base64ToBytes,
  bytesToBase64,
  bytesToUtf8,
  randomBytes,
  utf8ToBytes,
} from "@/lib/crypto/encoding";
import { assertWebCrypto } from "@/lib/crypto/kdf";
import { isValidMnemonic } from "@/lib/wallet/mnemonic";

const STORAGE_KEY = "lilixy.biometric.v1";
const AAD = utf8ToBytes("lilixy-biometric:v1");
const IV_BYTES = 12;

export type BiometricErrorCode =
  | "UNSUPPORTED"
  | "CANCELLED"
  | "PRF_UNAVAILABLE"
  | "DECRYPT_FAILED"
  | "STORAGE";

export class BiometricError extends Error {
  readonly code: BiometricErrorCode;

  constructor(code: BiometricErrorCode, message?: string) {
    super(message ?? code);
    this.name = "BiometricError";
    this.code = code;
  }
}

interface BiometricRecord {
  version: 1;
  walletId: string;
  credentialId: string;
  salt: string;
  iv: string;
  ciphertext: string;
  createdAt: number;
}

interface PrfExtensionOutput {
  enabled?: boolean;
  results?: { first?: ArrayBuffer };
}

type PrfCapableCredential = PublicKeyCredential & {
  getClientExtensionResults(): AuthenticationExtensionsClientOutputs & {
    prf?: PrfExtensionOutput;
  };
};

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readRecords(): Record<string, BiometricRecord> {
  const store = storage();
  if (!store) return {};
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, BiometricRecord>)
      : {};
  } catch {
    return {};
  }
}

function writeRecords(records: Record<string, BiometricRecord>): void {
  const store = storage();
  if (!store) throw new BiometricError("STORAGE");
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    throw new BiometricError("STORAGE");
  }
}

function firstPrfOutput(
  credential: PrfCapableCredential,
): ArrayBuffer | undefined {
  const output = credential.getClientExtensionResults().prf?.results?.first;
  return output instanceof ArrayBuffer ? output : undefined;
}

async function assertPrf(
  credentialId: string,
  salt: Uint8Array,
): Promise<ArrayBuffer> {
  const credential = (await navigator.credentials.get({
    publicKey: {
      challenge: randomBytes(32) as BufferSource,
      timeout: 60_000,
      allowCredentials: [
        {
          id: base64ToBytes(credentialId) as BufferSource,
          type: "public-key",
          transports: ["internal"],
        },
      ],
      userVerification: "required",
      extensions: {
        prf: { eval: { first: salt as BufferSource } },
      } as AuthenticationExtensionsClientInputs,
    },
  })) as PrfCapableCredential | null;
  if (!credential) throw new BiometricError("CANCELLED");
  const output = firstPrfOutput(credential);
  if (!output) throw new BiometricError("PRF_UNAVAILABLE");
  return output;
}

async function deriveKey(output: ArrayBuffer): Promise<CryptoKey> {
  return assertWebCrypto().importKey(
    "raw",
    output,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function isBiometricAvailable(): Promise<boolean> {
  if (typeof window === "undefined" || !window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export function hasBiometricEnrollment(walletId: string): boolean {
  return Boolean(readRecords()[walletId]);
}

export function removeBiometric(walletId: string): void {
  const records = readRecords();
  if (!records[walletId]) return;
  delete records[walletId];
  writeRecords(records);
}

export function clearBiometricRecords(): void {
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export async function enrollBiometric(
  walletId: string,
  mnemonic: string,
): Promise<void> {
  if (!(await isBiometricAvailable())) {
    throw new BiometricError("UNSUPPORTED");
  }
  if (!isValidMnemonic(mnemonic)) {
    throw new BiometricError("PRF_UNAVAILABLE");
  }

  const salt = randomBytes(32);
  const challenge = randomBytes(32);
  let credential: PrfCapableCredential | null;
  try {
    credential = (await navigator.credentials.create({
      publicKey: {
        challenge: challenge as BufferSource,
        rp: { name: "Lilixy Wallet" },
        user: {
          id: randomBytes(16) as BufferSource,
          name: `lilixy:${walletId}`,
          displayName: "Lilixy Wallet",
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" },
          { alg: -257, type: "public-key" },
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          residentKey: "preferred",
        },
        timeout: 60_000,
        attestation: "none",
        extensions: {
          prf: { eval: { first: salt as BufferSource } },
        } as AuthenticationExtensionsClientInputs,
      },
    })) as PrfCapableCredential | null;
  } catch {
    throw new BiometricError("CANCELLED");
  }
  if (!credential) throw new BiometricError("CANCELLED");

  const credentialId = bytesToBase64(new Uint8Array(credential.rawId));
  const prfOutput = firstPrfOutput(credential) ??
    (await assertPrf(credentialId, salt));
  const key = await deriveKey(prfOutput);
  const iv = randomBytes(IV_BYTES);
  const ciphertext = await assertWebCrypto().encrypt(
    {
      name: "AES-GCM",
      iv: iv as BufferSource,
      additionalData: AAD as BufferSource,
      tagLength: 128,
    },
    key,
    utf8ToBytes(mnemonic) as BufferSource,
  );

  const records = readRecords();
  records[walletId] = {
    version: 1,
    walletId,
    credentialId,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    createdAt: Date.now(),
  };
  writeRecords(records);
}

export async function unlockWithBiometric(
  walletId: string,
): Promise<string> {
  const record = readRecords()[walletId];
  if (!record) throw new BiometricError("UNSUPPORTED");
  if (!(await isBiometricAvailable())) {
    throw new BiometricError("UNSUPPORTED");
  }

  let prfOutput: ArrayBuffer;
  try {
    prfOutput = await assertPrf(record.credentialId, base64ToBytes(record.salt));
  } catch (error) {
    if (error instanceof BiometricError) throw error;
    throw new BiometricError("CANCELLED");
  }

  try {
    const key = await deriveKey(prfOutput);
    const plaintext = await assertWebCrypto().decrypt(
      {
        name: "AES-GCM",
        iv: base64ToBytes(record.iv) as BufferSource,
        additionalData: AAD as BufferSource,
        tagLength: 128,
      },
      key,
      base64ToBytes(record.ciphertext) as BufferSource,
    );
    const mnemonic = bytesToUtf8(new Uint8Array(plaintext)).trim();
    if (!isValidMnemonic(mnemonic)) {
      throw new BiometricError("DECRYPT_FAILED");
    }
    return mnemonic;
  } catch (error) {
    if (error instanceof BiometricError) throw error;
    throw new BiometricError("DECRYPT_FAILED");
  }
}
