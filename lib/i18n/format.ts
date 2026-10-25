import { formatUnits } from "viem";

import {
  LOCALE_META,
  type AppLocale,
} from "@/lib/i18n/locales";
import type { FiatCurrency } from "@/lib/config/types";

export function intlLocale(locale: AppLocale): string {
  return LOCALE_META[locale].intlLocale;
}

export function formatCurrency(
  value: number | null | undefined,
  currency: FiatCurrency,
  locale: AppLocale,
  options?: Intl.NumberFormatOptions,
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "N/A";
  }
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency,
    maximumFractionDigits: Math.abs(value) < 1 ? 4 : 2,
    minimumFractionDigits: Math.abs(value) < 1 ? 2 : 2,
    ...options,
  }).format(value);
}

export function formatCompactCurrency(
  value: number | null | undefined,
  currency: FiatCurrency,
  locale: AppLocale,
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "N/A";
  }
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency,
    notation: Math.abs(value) >= 100_000 ? "compact" : "standard",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(
  value: number | null | undefined,
  locale: AppLocale,
  options?: Intl.NumberFormatOptions,
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "N/A";
  }
  return new Intl.NumberFormat(intlLocale(locale), options).format(value);
}

export function formatPercent(
  value: number | null | undefined,
  locale: AppLocale,
  withSign = true,
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "N/A";
  }
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "percent",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    signDisplay: withSign ? "exceptZero" : "auto",
  }).format(value / 100);
}

export function formatTokenAmount(
  value: bigint,
  decimals: number,
  locale: AppLocale,
  maximumFractionDigits = 6,
): string {
  let formatted: string;
  try {
    formatted = formatUnits(value, decimals);
  } catch {
    return "N/A";
  }
  const numeric = Number(formatted);
  if (Number.isFinite(numeric)) {
    if (numeric > 0 && numeric < 0.000001) return "< 0.000001";
    return new Intl.NumberFormat(intlLocale(locale), {
      maximumFractionDigits,
    }).format(numeric);
  }
  return formatted;
}

export function formatTokenPrice(
  value: number | null | undefined,
  currency: FiatCurrency,
  locale: AppLocale,
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "N/A";
  }
  const digits = value > 0 && value < 0.01 ? 6 : value < 1 ? 4 : 2;
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency,
    maximumFractionDigits: digits,
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatDate(
  timestamp: number | Date,
  locale: AppLocale,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "N/A";
  const hasExplicitParts =
    options &&
    [
      "weekday",
      "era",
      "year",
      "month",
      "day",
      "hour",
      "minute",
      "second",
      "timeZoneName",
    ].some((key) => key in options);
  return new Intl.DateTimeFormat(intlLocale(locale), {
    ...(hasExplicitParts ? {} : { dateStyle: "medium", timeStyle: "short" }),
    ...options,
  }).format(date);
}

export function formatShortDate(
  timestamp: number | Date,
  locale: AppLocale,
): string {
  return formatDate(timestamp, locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelativeTime(
  timestamp: number,
  locale: AppLocale,
  now = Date.now(),
): string {
  const seconds = Math.round((timestamp - now) / 1000);
  const formatter = new Intl.RelativeTimeFormat(intlLocale(locale), {
    numeric: "auto",
  });
  const ranges: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
    ["second", 1],
  ];
  for (const [unit, size] of ranges) {
    if (Math.abs(seconds) >= size || unit === "second") {
      return formatter.format(Math.round(seconds / size), unit);
    }
  }
  return formatter.format(seconds, "second");
}

export function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatFeePercent(fee: number, locale: AppLocale): string {
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "percent",
    maximumFractionDigits: 3,
  }).format(fee);
}
