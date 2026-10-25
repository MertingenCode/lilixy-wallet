/**
 * Pure bigint helpers for the send flow. Keep all amount arithmetic here so
 * tests can cover the edge cases without a browser or an RPC connection.
 */

export const NATIVE_GAS_SAFETY_BPS = 12_000n;
export const BPS_DENOMINATOR = 10_000n;

export type SendPercent = 25 | 50 | 75;

export interface NativeSpendable {
  /** Balance left for the transfer after the 1.2x gas reserve. */
  spendable: bigint;
  /** Gas fee multiplied by the safety buffer. */
  reserve: bigint;
  insufficientGas: boolean;
}

export function applyGasSafetyBuffer(feeWei: bigint): bigint {
  return (feeWei * NATIVE_GAS_SAFETY_BPS) / BPS_DENOMINATOR;
}

export function nativeSpendable(
  balance: bigint,
  feeWei: bigint,
  bufferBps = NATIVE_GAS_SAFETY_BPS,
): NativeSpendable {
  if (balance < 0n || feeWei < 0n) {
    throw new RangeError("Amounts cannot be negative");
  }
  const reserve = (feeWei * bufferBps) / BPS_DENOMINATOR;
  if (balance <= reserve) {
    return {
      spendable: 0n,
      reserve,
      insufficientGas: true,
    };
  }
  return {
    spendable: balance - reserve,
    reserve,
    insufficientGas: false,
  };
}

export function percentOf(value: bigint, percent: SendPercent): bigint {
  if (value <= 0n) return 0n;
  return (value * BigInt(percent)) / 100n;
}

/**
 * Native percentages are calculated on the spendable balance after gas.
 * ERC-20 percentages are calculated on the token balance; gas is paid in the
 * native asset, so it is checked separately.
 */
export function percentAmount(
  balance: bigint,
  feeWei: bigint,
  percent: SendPercent,
  native: boolean,
): bigint {
  if (native) {
    return percentOf(nativeSpendable(balance, feeWei).spendable, percent);
  }
  return percentOf(balance, percent);
}

export function maxAmount(
  balance: bigint,
  feeWei: bigint,
  native: boolean,
): bigint {
  return native ? nativeSpendable(balance, feeWei).spendable : balance;
}

export function canPayNativeGas(
  nativeBalance: bigint,
  feeWei: bigint,
  bufferBps = NATIVE_GAS_SAFETY_BPS,
): boolean {
  return nativeBalance >= (feeWei * bufferBps) / BPS_DENOMINATOR;
}

/**
 * Compare a parsed amount against the balance. For native transfers the gas
 * reserve is also part of the spendable balance; ERC-20 only checks the token
 * amount here and checks native gas separately.
 */
export function exceedsSpendable(
  amount: bigint,
  balance: bigint,
  feeWei: bigint,
  native: boolean,
): boolean {
  if (native) {
    return amount > nativeSpendable(balance, feeWei).spendable;
  }
  return amount > balance;
}
