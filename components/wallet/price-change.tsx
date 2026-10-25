"use client";

import { ArrowDownRightIcon, ArrowUpRightIcon } from "lucide-react";

import { useT } from "@/hooks/use-locale";
import { formatPercent } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";

export function PriceChange({
  value,
  className,
}: {
  value?: number;
  className?: string;
}) {
  const { locale, t } = useT();
  if (value === undefined || !Number.isFinite(value)) {
    return (
      <span
        className={cn("text-muted-foreground text-[0.75rem]", className)}
        aria-label={t("wallet.priceUnavailable")}
      >
        N/A
      </span>
    );
  }
  const positive = value > 0;
  const negative = value < 0;
  const Icon = positive ? ArrowUpRightIcon : negative ? ArrowDownRightIcon : null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[0.8125rem] font-semibold tabular-nums",
        positive && "text-success",
        negative && "text-destructive",
        !positive && !negative && "text-muted-foreground",
        className,
      )}
      title={t("common.change24h")}
    >
      {Icon ? <Icon className="size-4" aria-hidden="true" /> : null}
      {formatPercent(Math.abs(value), locale, false)}
    </span>
  );
}
