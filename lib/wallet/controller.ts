import { VaultError } from "@/lib/crypto/types";
import { decryptVault, encryptMnemonic } from "@/lib/crypto/vault";
import {
  deleteVault,
  hasVault,
  loadVault,
  saveVault,
} from "@/lib/crypto/vault-repository";
import { deleteDatabase } from "@/lib/db/indexeddb";
import { evaluatePassword } from "@/lib/security/password-strength";
import {
  clearUnlockFailures,
  getUnlockRetryAfterMs,
  registerFailedUnlock,
} from "@/lib/security/rate-limit";
import type { VaultRecord } from "@/lib/crypto/types";
import { useSettingsStore } from "@/store/settings";
import { useSessionStore } from "@/store/session";
import { WalletError } from "@/lib/wallet/errors";
import {
  deriveAccount,
  isValidMnemonic,
  normalizeMnemonic,
} from "@/lib/wallet/mnemonic";
import {
  clearSessionMemory,
  getSessionAccount,
  getSessionAddress,
  setSessionMemory,
} from "@/lib/wallet/session-memory";

let bootstrapPromise: Promise<void> | null = null;

async function runBootstrap(): Promise<void> {
  const sessionAddress = getSessionAddress();
  if (sessionAddress && getSessionAccount()) {
    useSessionStore.getState().setUnlocked(sessionAddress);
    return;
  }

  try {
    const exists = await hasVault();
    if (exists) {
      useSessionStore.getState().setLocked();
    } else {
      useSessionStore.getState().setNoVault();
    }
  } catch {
    useSessionStore
      .getState()
      .setError("INDEXEDDB_UNAVAILABLE");
  }
}

export function bootstrapWallet(): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = runBootstrap();
  }
  return bootstrapPromise;
}

export function forgetBootstrap(): void {
  bootstrapPromise = null;
}

function mapVaultError(error: unknown): WalletError {
  if (error instanceof VaultError) {
    if (error.code === "DECRYPT_FAILED") {
      return new WalletError("WRONG_PASSWORD");
    }
    if (
      error.code === "INVALID_VAULT" ||
      error.code === "WEAK_KDF" ||
      error.code === "INVALID_MNEMONIC"
    ) {
      return new WalletError("VAULT_CORRUPTED");
    }
    if (error.code === "INVALID_PASSWORD") {
      return new WalletError("WRONG_PASSWORD");
    }
  }
  return new WalletError("UNKNOWN");
}

async function readVaultOrThrow(): Promise<VaultRecord> {
  let vault: VaultRecord | undefined;
  try {
    vault = await loadVault();
  } catch {
    throw new WalletError("INDEXEDDB_UNAVAILABLE");
  }
  if (!vault) throw new WalletError("NO_VAULT");
  return vault;
}

export interface OnboardingInput {
  mnemonic: string;
  password: string;
}

/**
 * Persists only the AES-GCM vault, then deliberately leaves the wallet locked.
 * The mnemonic is not kept in memory after setup.
 */
export async function completeOnboarding(
  input: OnboardingInput,
): Promise<void> {
  const mnemonic = normalizeMnemonic(input.mnemonic);
  if (!isValidMnemonic(mnemonic)) {
    throw new WalletError("INVALID_MNEMONIC");
  }
  if (!evaluatePassword(input.password).valid) {
    throw new WalletError("WEAK_PASSWORD");
  }

  try {
    const vault = await encryptMnemonic(mnemonic, input.password);
    await saveVault(vault);
  } catch (error) {
    if (error instanceof WalletError) throw error;
    if (error instanceof VaultError) throw mapVaultError(error);
    throw new WalletError("INDEXEDDB_UNAVAILABLE");
  }

  clearSessionMemory();
  clearUnlockFailures();
  forgetBootstrap();
  useSessionStore.getState().setLocked();
}

export async function unlockWallet(password: string): Promise<string> {
  const retryAfterMs = getUnlockRetryAfterMs();
  if (retryAfterMs > 0) {
    throw new WalletError("RATE_LIMITED", retryAfterMs);
  }

  const vault = await readVaultOrThrow();
  let mnemonic: string;
  try {
    mnemonic = await decryptVault(vault, password);
  } catch (error) {
    const mapped = mapVaultError(error);
    if (mapped.code === "WRONG_PASSWORD") {
      const state = registerFailedUnlock();
      const wait = Math.max(0, state.blockedUntil - Date.now());
      throw new WalletError("WRONG_PASSWORD", wait);
    }
    throw mapped;
  }

  if (!isValidMnemonic(mnemonic)) {
    throw new WalletError("VAULT_CORRUPTED");
  }

  const account = deriveAccount(mnemonic);
  setSessionMemory(mnemonic, account);
  clearUnlockFailures();
  useSessionStore.getState().setUnlocked(account.address);
  return account.address;
}

export function lockWallet(): void {
  clearSessionMemory();
  useSessionStore.getState().setLocked();
}

export function isWalletUnlocked(): boolean {
  return Boolean(getSessionAccount());
}

export async function verifyPassword(password: string): Promise<void> {
  const retryAfterMs = getUnlockRetryAfterMs();
  if (retryAfterMs > 0) {
    throw new WalletError("RATE_LIMITED", retryAfterMs);
  }

  const vault = await readVaultOrThrow();
  try {
    await decryptVault(vault, password);
  } catch (error) {
    const mapped = mapVaultError(error);
    if (mapped.code === "WRONG_PASSWORD") {
      const state = registerFailedUnlock();
      const wait = Math.max(0, state.blockedUntil - Date.now());
      throw new WalletError("WRONG_PASSWORD", wait);
    }
    throw mapped;
  }
  clearUnlockFailures();
}

export async function changeWalletPassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  if (!evaluatePassword(newPassword).valid) {
    throw new WalletError("WEAK_PASSWORD");
  }

  const retryAfterMs = getUnlockRetryAfterMs();
  if (retryAfterMs > 0) {
    throw new WalletError("RATE_LIMITED", retryAfterMs);
  }

  const vault = await readVaultOrThrow();
  let mnemonic: string;
  try {
    mnemonic = await decryptVault(vault, currentPassword);
  } catch (error) {
    const mapped = mapVaultError(error);
    if (mapped.code === "WRONG_PASSWORD") {
      const state = registerFailedUnlock();
      const wait = Math.max(0, state.blockedUntil - Date.now());
      throw new WalletError("WRONG_PASSWORD", wait);
    }
    throw mapped;
  }

  try {
    const reencrypted = await encryptMnemonic(mnemonic, newPassword);
    await saveVault(reencrypted);
  } catch {
    throw new WalletError("VAULT_CORRUPTED");
  }
  clearUnlockFailures();
}

export async function revealRecoveryPhrase(
  password: string,
): Promise<string> {
  const retryAfterMs = getUnlockRetryAfterMs();
  if (retryAfterMs > 0) {
    throw new WalletError("RATE_LIMITED", retryAfterMs);
  }

  const vault = await readVaultOrThrow();
  try {
    const mnemonic = await decryptVault(vault, password);
    clearUnlockFailures();
    return mnemonic;
  } catch (error) {
    const mapped = mapVaultError(error);
    if (mapped.code === "WRONG_PASSWORD") {
      const state = registerFailedUnlock();
      const wait = Math.max(0, state.blockedUntil - Date.now());
      throw new WalletError("WRONG_PASSWORD", wait);
    }
    throw mapped;
  }
}

export async function resetWallet(): Promise<void> {
  lockWallet();
  clearUnlockFailures();
  useSettingsStore.getState().resetSettings();
  try {
    await deleteDatabase();
  } catch {
    try {
      await deleteVault();
    } catch {
      // A reset must not leave the in-memory wallet unlocked even if IDB fails.
    }
  }
  forgetBootstrap();
  useSessionStore.getState().setNoVault();
}
