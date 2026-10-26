import { openDB, type IDBPDatabase } from "idb";

import {
  DB_NAME,
  DB_VERSION,
  type LilixyDB,
} from "@/lib/db/schema";

let dbPromise: Promise<IDBPDatabase<LilixyDB>> | null = null;

export function getDb(): Promise<IDBPDatabase<LilixyDB>> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("INDEXEDDB_UNAVAILABLE"));
  }

  if (!dbPromise) {
    dbPromise = openDB<LilixyDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("vault")) {
          db.createObjectStore("vault");
        }
        if (!db.objectStoreNames.contains("session")) {
          db.createObjectStore("session");
        }
        if (!db.objectStoreNames.contains("transactions")) {
          const store = db.createObjectStore("transactions", {
            keyPath: "id",
          });
          store.createIndex("by-timestamp", "timestamp");
          store.createIndex("by-status", "status");
          store.createIndex("by-chain", "chainId");
          store.createIndex("by-hash", "hash");
        }
      },
    });
  }

  return dbPromise;
}

export async function deleteDatabase(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise;
    db.close();
    dbPromise = null;
  }
  if (typeof indexedDB === "undefined") return;
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}
