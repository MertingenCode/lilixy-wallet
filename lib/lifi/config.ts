export const LIFI_INTEGRATOR = "lilixy";

/**
 * LI.FI requires the integrator name to be registered in the Partner Portal
 * before fees are collected. Keep the fee in one place so the widget, README
 * and fee disclosure always agree.
 */
const DEFAULT_LIFI_FEE = 0.0025;

export function parseLifiFee(raw: string | undefined): number {
  const normalized = raw?.trim();
  const value = Number(normalized ? normalized : DEFAULT_LIFI_FEE);
  if (!Number.isFinite(value) || value < 0) return DEFAULT_LIFI_FEE;
  // Never allow an accidental 50% fee from a malformed env value.
  return Math.min(value, 0.05);
}

export const LIFI_FEE = parseLifiFee(process.env.NEXT_PUBLIC_LIFI_FEE);
export const LIFI_API_KEY =
  process.env.NEXT_PUBLIC_LIFI_API_KEY?.trim() || undefined;
