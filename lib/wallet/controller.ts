import { VaultError } from "@/lib/crypto/types";
import { decryptVault, encryptMnemonic } from "@/lib/crypto/vault";
import {
  deleteVault,
  hasVault,
  loadVault,
  saveVault,
} from "@/lib/crypto/vault-repository";
import { deleteDatabase } from "@/lib/db/indexeddb";
import { VAULT_KEY } from "@/lib/db/schema";
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
  setSessionMemory,
} from "@/lib/wallet/session-memory";
import {
  clearPersistedSession,
  persistSession,
  restoreSession,
} from "@/lib/wallet/session-persistence";
import {
  clearWalletProfiles,
  createWalletId,
  getActiveWalletId,
  getWallets,
  nextWalletName,
  setActiveWalletId,
  upsertWallet,
  type WalletProfile,
} from "@/lib/wallet/wallets";

let bootstrapPromise: Promise<void> | null = null;

function activeVaultKey(): string {
  return getActiveWalletId() ?? VAULT_KEY;
}

async function runBootstrap(): Promise<void> {
  const restored = await restoreSession();
  if (restored) {
    const autoLock = useSettingsStore.getState().autoLock;
    const timeoutMs = autoLock === "tab-close" ? null : Number(autoLock) * 60_000;
    if (timeoutMs && Date.now() - restored.lastActivity >= timeoutMs) {
      clearPersistedSession();
    } else if (isValidMnemonic(restored.mnemonic)) {
      const account = deriveAccount(restored.mnemonic);
      setSessionMemory(restored.mnemonic, account);
      setActiveWalletId(restored.walletId);
      const existing = getWallets().find(
        (wallet) => wallet.id === restored.walletId,
      );
      upsertWallet({
        id: restored.walletId,
        name: existing?.name ?? nextWalletName(),
        address: account.address,
        createdAt: existing?.createdAt ?? Date.now(),
      });
      useSessionStore.getState().setUnlocked(account.address);
      return;
    }
  }

  try {
    const wallets = getWallets();
    if (wallets.length > 0) {
      const active = getActiveWalletId();
      const resolved = await Promise.all(
        wallets.map(async (wallet) => ({
          wallet,
          exists: await hasVault(wallet.id),
        })),
      );
      const selected =
        resolved.find((item) => item.wallet.id === active && item.exists) ??
        resolved.find((item) => item.exists);
      if (selected) {
        setActiveWalletId(selected.wallet.id);
        useSessionStore.getState().setLocked();
      } else {
        useSessionStore.getState().setNoVault();
      }
      return;
    }

    if (await hasVault(VAULT_KEY)) {
      useSessionStore.getState().setLocked();
    } else {
      useSessionStore.getState().setNoVault();
    }
  } catch {
    useSessionStore.getState().setError("INDEXEDDB_UNAVAILABLE");
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

async function readVaultOrThrow(key = activeVaultKey()): Promise<VaultRecord> {
  let vault: VaultRecord | undefined;
  try {
    vault = await loadVault(key);
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

export interface CreateWalletInput extends OnboardingInput {
  name?: string;
}

/**
 * Creates a wallet, makes it active and unlocks it in this tab. Used by both
 * first-run onboarding and the add-wallet flow.
 */
export async function createWallet(
  input: CreateWalletInput,
): Promise<string> {
  const mnemonic = normalizeMnemonic(input.mnemonic);
  if (!isValidMnemonic(mnemonic)) {
    throw new WalletError("INVALID_MNEMONIC");
  }
  if (!evaluatePassword(input.password).valid) {
    throw new WalletError("WEAK_PASSWORD");
  }

  const account = deriveAccount(mnemonic);
  const id = createWalletId();
  const profile: WalletProfile = {
    id,
    name: input.name?.trim().slice(0, 32) || nextWalletName(),
    address: account.address,
    createdAt: Date.now(),
  };

  try {
    const vault = await encryptMnemonic(mnemonic, input.password);
    await saveVault(vault, id);
  } catch (error) {
    if (error instanceof WalletError) throw error;
    if (error instanceof VaultError) throw mapVaultError(error);
    throw new WalletError("INDEXEDDB_UNAVAILABLE");
  }

  upsertWallet(profile);
  setActiveWalletId(id);
  setSessionMemory(mnemonic, account);
  clearUnlockFailures();
  await persistSession(mnemonic, id);
  forgetBootstrap();
  useSessionStore.getState().setUnlocked(account.address);
  return account.address;
}

export async function completeOnboarding(
  input: OnboardingInput,
): Promise<void> {
  await createWallet(input);
}

export async function unlockWallet(
  password: string,
  walletId?: string,
): Promise<string> {
  const retryAfterMs = getUnlockRetryAfterMs();
  if (retryAfterMs > 0) {
    throw new WalletError("RATE_LIMITED", retryAfterMs);
  }

  const key = walletId ?? activeVaultKey();
  const vault = await readVaultOrThrow(key);
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
  const existing = getWallets().find((wallet) => wallet.id === key);
  upsertWallet({
    id: key,
    name: existing?.name ?? nextWalletName(),
    address: account.address,
    createdAt: existing?.createdAt ?? Date.now(),
  });
  setActiveWalletId(key);
  setSessionMemory(mnemonic, account);
  clearUnlockFailures();
  await persistSession(mnemonic, key);
  useSessionStore.getState().setUnlocked(account.address);
  return account.address;
}

export async function switchWallet(
  walletId: string,
  password: string,
): Promise<string> {
  return unlockWallet(password, walletId);
}

export function lockWallet(): void {
  clearSessionMemory();
  clearPersistedSession();
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

  const key = activeVaultKey();
  const vault = await readVaultOrThrow(key);
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
    await saveVault(reencrypted, key);
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
  clearWalletProfiles();
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
