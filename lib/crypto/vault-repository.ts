import type { VaultRecord } from "@/lib/crypto/types";
import { getDb } from "@/lib/db/indexeddb";
import { VAULT_KEY } from "@/lib/db/schema";

/**
 * The only persisted wallet secret is the encrypted vault record. No mnemonic,
 * password, password hash, private key, or derived seed is stored here.
 */
export async function saveVault(
  record: VaultRecord,
  key: string = VAULT_KEY,
): Promise<void> {
  const db = await getDb();
  await db.put("vault", record, key);
}

export async function loadVault(
  key: string = VAULT_KEY,
): Promise<VaultRecord | undefined> {
  const db = await getDb();
  return db.get("vault", key);
}

export async function hasVault(key: string = VAULT_KEY): Promise<boolean> {
  const db = await getDb();
  const record = await db.get("vault", key);
  return Boolean(record);
}

export async function deleteVault(key: string = VAULT_KEY): Promise<void> {
  const db = await getDb();
  await db.delete("vault", key);
}

export async function listVaultKeys(): Promise<string[]> {
  const db = await getDb();
  return (await db.getAllKeys("vault")) as string[];
}
