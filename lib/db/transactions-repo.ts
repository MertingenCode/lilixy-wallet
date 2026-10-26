import { getDb } from "@/lib/db/indexeddb";
import type {
  StoredTransaction,
  TransactionStatus,
} from "@/lib/db/schema";

const STORE = "transactions" as const;

export async function upsertTransaction(
  transaction: StoredTransaction,
): Promise<void> {
  const db = await getDb();
  await db.put(STORE, transaction);
}

export async function getTransaction(
  id: string,
): Promise<StoredTransaction | undefined> {
  const db = await getDb();
  return db.get(STORE, id);
}

export async function findTransactionByHash(
  hash: string,
): Promise<StoredTransaction | undefined> {
  const db = await getDb();
  return db.getFromIndex(STORE, "by-hash", hash);
}

export async function listTransactions(): Promise<StoredTransaction[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex(STORE, "by-timestamp");
  return all.reverse();
}

export async function listTransactionsByStatus(
  status: TransactionStatus,
): Promise<StoredTransaction[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex(STORE, "by-status", status);
  return all.sort((a, b) => b.timestamp - a.timestamp);
}

export async function listPendingTransactions(): Promise<StoredTransaction[]> {
  return listTransactionsByStatus("pending");
}

export async function updateTransaction(
  id: string,
  patch: Partial<StoredTransaction>,
): Promise<StoredTransaction | undefined> {
  const db = await getDb();
  const tx = await db.get(STORE, id);
  if (!tx) return undefined;
  const next = { ...tx, ...patch, id: tx.id };
  await db.put(STORE, next);
  return next;
}

export async function deleteTransaction(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE, id);
}

export async function clearPendingTransactions(
  owner?: string,
): Promise<number> {
  const pending = (await listPendingTransactions()).filter(
    (item) =>
      !owner || item.from.toLowerCase() === owner.toLowerCase(),
  );
  const db = await getDb();
  const tx = db.transaction(STORE, "readwrite");
  await Promise.all([
    ...pending.map((item) => tx.store.delete(item.id)),
    tx.done,
  ]);
  return pending.length;
}

export async function deleteTransactionsByChain(
  chainId: number,
): Promise<number> {
  const db = await getDb();
  const keys = await db.getAllKeysFromIndex(STORE, "by-chain", chainId);
  const tx = db.transaction(STORE, "readwrite");
  await Promise.all([
    ...keys.map((key) => tx.store.delete(key)),
    tx.done,
  ]);
  return keys.length;
}

export async function clearAllTransactions(): Promise<void> {
  const db = await getDb();
  await db.clear(STORE);
}
