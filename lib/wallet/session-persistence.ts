import {
  base64ToBytes,
  bytesToBase64,
  bytesToUtf8,
  randomBytes,
  utf8ToBytes,
} from "@/lib/crypto/encoding";
import { assertWebCrypto } from "@/lib/crypto/kdf";
import { getDb } from "@/lib/db/indexeddb";

const SESSION_KEY = "lilixy.session.v1";
const KEY_ID = "session-key";
const SESSION_AAD = utf8ToBytes("lilixy-session:v1");
const IV_BYTES = 12;

interface SessionRecord {
  version: 1;
  walletId: string;
  iv: string;
  ciphertext: string;
  lastActivity: number;
}

function sessionStorageSafe(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

async function getOrCreateKey(): Promise<CryptoKey> {
  const db = await getDb();
  const existing = await db.get("session", KEY_ID);
  if (existing?.key) return existing.key;

  const subtle = assertWebCrypto();
  const key = await subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
  await db.put("session", { key }, KEY_ID);
  return key;
}

export async function persistSession(
  mnemonic: string,
  walletId: string,
  lastActivity = Date.now(),
): Promise<void> {
  try {
    const store = sessionStorageSafe();
    if (!store) return;
    const subtle = assertWebCrypto();
    const key = await getOrCreateKey();
    const iv = randomBytes(IV_BYTES);
    const ciphertext = await subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv as BufferSource,
        additionalData: SESSION_AAD as BufferSource,
        tagLength: 128,
      },
      key,
      utf8ToBytes(mnemonic) as BufferSource,
    );
    const record: SessionRecord = {
      version: 1,
      walletId,
      iv: bytesToBase64(iv),
      ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
      lastActivity,
    };
    store.setItem(SESSION_KEY, JSON.stringify(record));
  } catch {
    // Session persistence is a convenience layer; never block unlocking.
  }
}

export async function restoreSession(): Promise<{
  mnemonic: string;
  walletId: string;
  lastActivity: number;
} | null> {
  try {
    const store = sessionStorageSafe();
    if (!store) return null;
    const raw = store.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SessionRecord>;
    if (
      parsed.version !== 1 ||
      typeof parsed.walletId !== "string" ||
      typeof parsed.iv !== "string" ||
      typeof parsed.ciphertext !== "string" ||
      typeof parsed.lastActivity !== "number"
    ) {
      return null;
    }

    const db = await getDb();
    const stored = await db.get("session", KEY_ID);
    if (!stored?.key) return null;
    const subtle = assertWebCrypto();
    const decrypted = await subtle.decrypt(
      {
        name: "AES-GCM",
        iv: base64ToBytes(parsed.iv) as BufferSource,
        additionalData: SESSION_AAD as BufferSource,
        tagLength: 128,
      },
      stored.key,
      base64ToBytes(parsed.ciphertext) as BufferSource,
    );
    return {
      mnemonic: bytesToUtf8(new Uint8Array(decrypted)).trim(),
      walletId: parsed.walletId,
      lastActivity: parsed.lastActivity,
    };
  } catch {
    return null;
  }
}

export function getPersistedActivity(): number | null {
  const store = sessionStorageSafe();
  if (!store) return null;
  try {
    const raw = store.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SessionRecord>;
    return typeof parsed.lastActivity === "number"
      ? parsed.lastActivity
      : null;
  } catch {
    return null;
  }
}

export function touchPersistedActivity(now = Date.now()): void {
  const store = sessionStorageSafe();
  if (!store) return;
  try {
    const raw = store.getItem(SESSION_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Partial<SessionRecord>;
    if (parsed.version !== 1) return;
    parsed.lastActivity = now;
    store.setItem(SESSION_KEY, JSON.stringify(parsed));
  } catch {
    // ignore
  }
}

export function clearPersistedSession(): void {
  try {
    sessionStorageSafe()?.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}
