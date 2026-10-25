import type { VaultRecord } from "@/lib/crypto/types";
import { getDb } from "@/lib/db/indexeddb";
import { VAULT_KEY } from "@/lib/db/schema";

/**
 * The only persisted wallet secret is the encrypted vault record. No mnemonic,
 * password, password hash, private key, or derived seed is stored here.
 */
export async function saveVault(record: VaultRecord): Promise<void> {
  const db = await getDb();
  await db.put("vault", record, VAULT_KEY);
}

export async function loadVault(): Promise<VaultRecord | undefined> {
  const db = await getDb();
  return db.get("vault", VAULT_KEY);
}

export async function hasVault(): Promise<boolean> {
  const db = await getDb();
  const record = await db.get("vault", VAULT_KEY);
  return Boolean(record);
}

export async function deleteVault(): Promise<void> {
  const db = await getDb();
  await db.delete("vault", VAULT_KEY);
}
