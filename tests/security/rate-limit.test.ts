// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";

import {
  clearUnlockFailures,
  getUnlockDelayMs,
  getUnlockRetryAfterMs,
  registerFailedUnlock,
  resetUnlockRateLimitForTests,
} from "@/lib/security/rate-limit";

describe("unlock rate limiting", () => {
  beforeEach(() => {
    resetUnlockRateLimitForTests();
    clearUnlockFailures();
  });

  it("does not delay the first attempts", () => {
    const now = 1_000_000;
    registerFailedUnlock(now);
    registerFailedUnlock(now);
    expect(getUnlockRetryAfterMs(now)).toBe(0);
  });

  it("increases the delay progressively after repeated failures", () => {
    const now = 1_000_000;
    registerFailedUnlock(now);
    registerFailedUnlock(now);
    registerFailedUnlock(now);
    expect(getUnlockRetryAfterMs(now)).toBe(2_000);
    registerFailedUnlock(now);
    expect(getUnlockRetryAfterMs(now)).toBe(5_000);
    registerFailedUnlock(now);
    expect(getUnlockRetryAfterMs(now)).toBe(15_000);
  });

  it("caps the exponential delay", () => {
    expect(getUnlockDelayMs(50)).toBe(300_000);
  });

  it("resets after a successful unlock", () => {
    registerFailedUnlock();
    registerFailedUnlock();
    registerFailedUnlock();
    clearUnlockFailures();
    expect(getUnlockRetryAfterMs()).toBe(0);
  });
});
