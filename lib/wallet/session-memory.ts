import type { Address } from "viem";
import type { HDAccount } from "viem/accounts";

interface SessionSnapshot {
  mnemonic: string;
  account: HDAccount;
  address: Address;
}

/**
 * Intentionally module-private, not in Zustand, not persisted. Keeping the
 * mnemonic outside React state reduces accidental rendering/devtools exposure.
 * JavaScript strings cannot be reliably zeroed; lock clears the reference and
 * the README documents that residual-memory limitation.
 */
let session: SessionSnapshot | null = null;

export function setSessionMemory(
  mnemonic: string,
  account: HDAccount,
): SessionSnapshot {
  const snapshot: SessionSnapshot = {
    mnemonic,
    account,
    address: account.address,
  };
  session = snapshot;
  return snapshot;
}

export function getSessionMemory(): SessionSnapshot | null {
  return session;
}

export function getSessionAccount(): HDAccount | null {
  return session?.account ?? null;
}

export function getSessionAddress(): Address | null {
  return session?.address ?? null;
}

export function isSessionUnlocked(): boolean {
  return session !== null;
}

export function clearSessionMemory(): void {
  session = null;
}
