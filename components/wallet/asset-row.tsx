"use client";

import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
} from "lucide-react";

import { NetworkLogo } from "@/components/wallet/network-logo";
import { PriceChange } from "@/components/wallet/price-change";
import { TokenLogo } from "@/components/wallet/token-logo";
import { useT } from "@/hooks/use-locale";
import { formatCurrency, formatTokenAmount } from "@/lib/i18n/format";
import type { Asset } from "@/lib/wallet/assets";
import type { FiatCurrency } from "@/lib/config/types";

export function AssetRow({
  asset,
  onOpenDetail,
  onSend,
  onReceive,
  currency,
  locale,
  chainName,
}: {
  asset: Asset;
  onOpenDetail: (asset: Asset) => void;
  onSend: (asset: Asset) => void;
  onReceive: (asset: Asset) => void;
  currency: FiatCurrency;
  locale: ReturnType<typeof useT>["locale"];
  chainName: string;
}) {
  const { t } = useT();
  const unavailable = asset.balanceUnavailable;
  return (
    <div className="group flex items-center gap-1 rounded-[16px] border border-rule bg-card px-3 py-2 transition-colors duration-[var(--dur-short)] hover:border-primary/25 hover:bg-paper-3/35 dark:border-white/10 dark:bg-card/55 dark:hover:bg-card/80">
      <button
        type="button"
        onClick={() => onOpenDetail(asset)}
        className="focus-visible:outline-ring flex min-w-0 flex-1 items-center gap-2.5 px-1 py-4 text-start focus-visible:outline-2 focus-visible:outline-offset-[-2px] sm:gap-3.5"
        aria-label={`${asset.symbol}, ${t("tokenDetail.title")}`}
      >
        <div className="relative shrink-0">
          <TokenLogo src={asset.logoURI} symbol={asset.symbol} size={40} />
          <span className="ring-background absolute -end-1 -bottom-1 rounded-full ring-2">
            <NetworkLogo chainId={asset.chainId} size={15} label={chainName} />
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.9375rem] font-medium">{asset.symbol}</p>
          <p className="text-muted-foreground mt-1 flex min-w-0 items-center gap-2 text-[0.75rem]">
            <span className="truncate">{asset.name}</span>
            <span className="text-rule hidden sm:inline" aria-hidden="true">
              /
            </span>
            <span className="hidden truncate sm:inline">{chainName}</span>
          </p>
        </div>

        <div className="shrink-0 text-end">
          <p className="tabular text-[0.9375rem] font-medium">
            {unavailable ? (
              "N/A"
            ) : (
              <>
                {formatTokenAmount(asset.balance, asset.decimals, locale, 5)}
                <span className="text-muted-foreground ms-1 text-[0.75rem] font-normal">
                  {asset.symbol}
                </span>
              </>
            )}
          </p>
          <div className="mt-0.5 flex items-center justify-end gap-2">
            <span className="text-muted-foreground tabular text-[0.75rem]">
              {asset.fiatValue !== undefined
                ? formatCurrency(asset.fiatValue, currency, locale)
                : "N/A"}
            </span>
            <PriceChange value={asset.change24h} />
          </div>
        </div>
      </button>

      <div className="flex shrink-0 flex-col items-center gap-0.5 transition-opacity duration-[var(--dur-short)] sm:flex-row sm:pointer-events-none sm:opacity-0 sm:group-hover:pointer-events-auto sm:group-hover:opacity-100 sm:group-focus-within:pointer-events-auto sm:group-focus-within:opacity-100">
        <button
          type="button"
          onClick={() => onSend(asset)}
          aria-label={`${t("wallet.send")} ${asset.symbol}`}
          title={`${t("wallet.send")} ${asset.symbol}`}
          className="text-muted-foreground hover:bg-paper-3 hover:text-foreground flex size-10 items-center justify-center rounded-full transition-colors duration-[var(--dur-short)]"
        >
          <ArrowUpRightIcon className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => onReceive(asset)}
          aria-label={`${t("wallet.receive")} ${asset.symbol}`}
          title={`${t("wallet.receive")} ${asset.symbol}`}
          className="text-muted-foreground hover:bg-paper-3 hover:text-foreground flex size-10 items-center justify-center rounded-full transition-colors duration-[var(--dur-short)]"
        >
          <ArrowDownLeftIcon className="size-4" />
        </button>
      </div>
    </div>
  );
}
