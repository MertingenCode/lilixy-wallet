import { create } from "zustand";
import type { Address } from "viem";

export type SessionStatus =
  | "boot"
  | "no-vault"
  | "locked"
  | "unlocked"
  | "error";

interface SessionState {
  status: SessionStatus;
  address: Address | null;
  bootError: string | null;
  setBoot: () => void;
  setNoVault: () => void;
  setLocked: () => void;
  setUnlocked: (address: Address) => void;
  setError: (message: string) => void;
}

/**
 * Non-persisted session UI state. Sensitive material lives in the module-private
 * memory vault instead; nothing in this store is written to disk.
 */
export const useSessionStore = create<SessionState>((set) => ({
  status: "boot",
  address: null,
  bootError: null,
  setBoot: () => set({ status: "boot", address: null, bootError: null }),
  setNoVault: () =>
    set({ status: "no-vault", address: null, bootError: null }),
  setLocked: () => set({ status: "locked", address: null, bootError: null }),
  setUnlocked: (address) =>
    set({ status: "unlocked", address, bootError: null }),
  setError: (message) =>
    set({ status: "error", address: null, bootError: message }),
}));
