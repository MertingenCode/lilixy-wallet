import { describe, expect, it } from "vitest";

import {
  applyGasSafetyBuffer,
  canPayNativeGas,
  maxAmount,
  nativeSpendable,
  percentAmount,
  percentOf,
} from "@/lib/wallet/send-math";

const ETHER = 10n ** 18n;

describe("send amount math", () => {
  it("reserves 1.2x gas for native max", () => {
    const fee = ETHER / 1_000n; // 0.001 ETH
    const result = nativeSpendable(ETHER, fee);
    expect(result.reserve).toBe((fee * 120n) / 100n);
    expect(result.spendable).toBe(ETHER - result.reserve);
    expect(result.insufficientGas).toBe(false);
    expect(maxAmount(ETHER, fee, true)).toBe(result.spendable);
  });

  it("calculates native percentages from the spendable balance", () => {
    const fee = ETHER / 1_000n;
    const spendable = nativeSpendable(ETHER, fee).spendable;
    expect(percentAmount(ETHER, fee, 25, true)).toBe(
      (spendable * 25n) / 100n,
    );
    expect(percentAmount(ETHER, fee, 50, true)).toBe(
      (spendable * 50n) / 100n,
    );
    expect(percentAmount(ETHER, fee, 75, true)).toBe(
      (spendable * 75n) / 100n,
    );
  });

  it("returns zero and flags insufficient gas when balance cannot cover it", () => {
    const balance = ETHER / 2_000n; // 0.0005 ETH
    const fee = ETHER / 1_000n; // 0.001 ETH
    const result = nativeSpendable(balance, fee);
    expect(result.spendable).toBe(0n);
    expect(result.insufficientGas).toBe(true);
    expect(percentAmount(balance, fee, 50, true)).toBe(0n);
  });

  it("does not deduct gas from ERC-20 percentages", () => {
    const tokenBalance = 1_000_000n; // 1 USDC (6 decimals)
    const fee = ETHER / 1_000n;
    expect(percentAmount(tokenBalance, fee, 25, false)).toBe(250_000n);
    expect(percentAmount(tokenBalance, fee, 50, false)).toBe(500_000n);
    expect(maxAmount(tokenBalance, fee, false)).toBe(tokenBalance);
  });

  it("checks native gas for ERC-20 transfers", () => {
    expect(canPayNativeGas(ETHER, ETHER / 1_000n)).toBe(true);
    expect(canPayNativeGas(0n, ETHER / 1_000n)).toBe(false);
  });

  it("keeps bigint precision for small decimals", () => {
    expect(percentOf(1n, 25)).toBe(0n);
    expect(percentOf(10n, 25)).toBe(2n);
    expect(applyGasSafetyBuffer(5n)).toBe(6n);
  });
});
