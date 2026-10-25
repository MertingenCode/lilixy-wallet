const STORAGE_KEY = "lilixy.unlock-attempts.v1";

export interface UnlockAttemptState {
  failures: number;
  blockedUntil: number;
  updatedAt: number;
}

const DEFAULT_STATE: UnlockAttemptState = {
  failures: 0,
  blockedUntil: 0,
  updatedAt: 0,
};

/**
 * Progressive delays are a UX/rate-limiting control, not cryptographic
 * protection. An attacker who copies the encrypted vault can always perform an
 * offline brute-force attempt; the KDF cost is the real defense. The README
 * documents this limitation.
 */
export function getUnlockDelayMs(failures: number): number {
  if (failures < 3) return 0;
  const delays = [0, 0, 0, 2_000, 5_000, 15_000, 30_000, 60_000, 120_000, 300_000];
  const index = Math.min(failures, delays.length - 1);
  return delays[index] ?? 300_000;
}

function safeStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function getUnlockAttemptState(): UnlockAttemptState {
  const storage = safeStorage();
  if (!storage) return DEFAULT_STATE;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<UnlockAttemptState>;
    return {
      failures:
        typeof parsed.failures === "number" && parsed.failures >= 0
          ? Math.floor(parsed.failures)
          : 0,
      blockedUntil:
        typeof parsed.blockedUntil === "number" ? parsed.blockedUntil : 0,
      updatedAt:
        typeof parsed.updatedAt === "number" ? parsed.updatedAt : 0,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function writeState(state: UnlockAttemptState) {
  const storage = safeStorage();
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage can be unavailable in private mode; never make unlock fail here.
  }
}

export function getUnlockRetryAfterMs(now = Date.now()): number {
  return Math.max(0, getUnlockAttemptState().blockedUntil - now);
}

export function registerFailedUnlock(now = Date.now()): UnlockAttemptState {
  const current = getUnlockAttemptState();
  const failures = current.failures + 1;
  const delay = getUnlockDelayMs(failures);
  const next: UnlockAttemptState = {
    failures,
    blockedUntil: delay > 0 ? now + delay : 0,
    updatedAt: now,
  };
  writeState(next);
  return next;
}

export function clearUnlockFailures(): void {
  writeState(DEFAULT_STATE);
}

export function resetUnlockRateLimitForTests(): void {
  const storage = safeStorage();
  try {
    storage?.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
