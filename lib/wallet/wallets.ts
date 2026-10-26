import type { Address } from "viem";

export interface WalletProfile {
  id: string;
  name: string;
  address: Address;
  createdAt: number;
}

const WALLETS_KEY = "lilixy.wallets.v1";
const ACTIVE_KEY = "lilixy.wallets.active.v1";

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function getWallets(): WalletProfile[] {
  const store = storage();
  if (!store) return [];
  try {
    const raw = store.getItem(WALLETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is WalletProfile =>
        Boolean(item) &&
        typeof item === "object" &&
        typeof (item as WalletProfile).id === "string" &&
        typeof (item as WalletProfile).name === "string" &&
        typeof (item as WalletProfile).address === "string" &&
        typeof (item as WalletProfile).createdAt === "number",
    );
  } catch {
    return [];
  }
}

function writeWallets(wallets: WalletProfile[]): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(WALLETS_KEY, JSON.stringify(wallets));
  } catch {
    // Non-fatal: the encrypted vault remains the source of truth.
  }
}

export function getActiveWalletId(): string | null {
  const store = storage();
  if (store) {
    try {
      const id = store.getItem(ACTIVE_KEY);
      if (id) return id;
    } catch {
      // fall through
    }
  }
  return getWallets()[0]?.id ?? null;
}

export function setActiveWalletId(id: string): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(ACTIVE_KEY, id);
  } catch {
    // ignore
  }
}

export function getWallet(id: string): WalletProfile | undefined {
  return getWallets().find((wallet) => wallet.id === id);
}

export function upsertWallet(profile: WalletProfile): void {
  const wallets = getWallets();
  const index = wallets.findIndex((wallet) => wallet.id === profile.id);
  if (index >= 0) {
    const next = [...wallets];
    next[index] = { ...wallets[index], ...profile };
    writeWallets(next);
    return;
  }
  writeWallets([...wallets, profile]);
}

export function removeWalletProfile(id: string): void {
  const next = getWallets().filter((wallet) => wallet.id !== id);
  writeWallets(next);
  if (getActiveWalletId() === id) {
    const fallback = next[0]?.id;
    if (fallback) setActiveWalletId(fallback);
    else {
      const store = storage();
      try {
        store?.removeItem(ACTIVE_KEY);
      } catch {
        // ignore
      }
    }
  }
}

export function clearWalletProfiles(): void {
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(WALLETS_KEY);
    store.removeItem(ACTIVE_KEY);
  } catch {
    // ignore
  }
}

export function nextWalletName(): string {
  return `Wallet ${getWallets().length + 1}`;
}

export function createWalletId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `wallet-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
