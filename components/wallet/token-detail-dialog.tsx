"use client";

import {
  ArrowDownToLineIcon,
  ArrowUpFromLineIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";

import { CopyButton } from "@/components/common/copy-button";
import { NetworkLogo } from "@/components/wallet/network-logo";
import { PriceChange } from "@/components/wallet/price-change";
import { TokenLogo } from "@/components/wallet/token-logo";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useT } from "@/hooks/use-locale";
import type { FiatCurrency } from "@/lib/config/types";
import {
  formatCurrency,
  formatTokenAmount,
  formatTokenPrice,
} from "@/lib/i18n/format";
import type { Asset } from "@/lib/wallet/assets";
import { shortenAddress } from "@/lib/utils";

export function TokenDetailDialog({
  asset,
  open,
  onOpenChange,
  currency,
  locale,
  chainName,
  onSend,
  onReceive,
  onEdit,
  onDelete,
}: {
  asset: Asset | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency: FiatCurrency;
  locale: ReturnType<typeof useT>["locale"];
  chainName: string;
  onSend: (asset: Asset) => void;
  onReceive: (asset: Asset) => void;
  onEdit?: (asset: Asset) => void;
  onDelete?: (asset: Asset) => void;
}) {
  const { t } = useT();
  if (!asset) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="text-[1.5rem]">{t("tokenDetail.title")}</DialogTitle>
          <DialogDescription className="text-[0.75rem] leading-5">{t("tokenDetail.description")}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3">
          <TokenLogo src={asset.logoURI} symbol={asset.symbol} size={44} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.9375rem] font-medium">
              {asset.name}{" "}
              <span className="text-muted-foreground font-normal">
                ({asset.symbol})
              </span>
            </p>
            <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-[0.6875rem]">
              <NetworkLogo chainId={asset.chainId} size={14} label={chainName} />
              {chainName}
            </p>
          </div>
          {onEdit || onDelete ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t("common.actions")}
                  title={t("common.actions")}
                >
                  <MoreHorizontalIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit ? (
                  <DropdownMenuItem onSelect={() => onEdit(asset)}>
                    <PencilIcon />
                    {t("common.edit")}
                  </DropdownMenuItem>
                ) : null}
                {onDelete ? (
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => onDelete(asset)}
                  >
                    <Trash2Icon />
                    {t("common.delete")}
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>

        <div className="border-y border-rule py-5">
          <p className="text-muted-foreground text-xs">
            {t("tokenDetail.balance")}
          </p>
          <p className="display-figure mt-1 text-[2.25rem]">
            {formatTokenAmount(asset.balance, asset.decimals, locale, 8)}{" "}
            {asset.symbol}
          </p>
          <div className="text-muted-foreground mt-1 flex items-center gap-2 text-xs">
            <span className="tabular">
              {formatCurrency(asset.fiatValue, currency, locale)}
            </span>
            <PriceChange value={asset.change24h} />
          </div>
        </div>

        <dl className="space-y-3 border-b border-rule pb-4 text-[0.75rem]">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">
              {t("tokenDetail.price")}
            </dt>
            <dd className="tabular font-medium">
              {formatTokenPrice(asset.price, currency, locale)}
            </dd>
          </div>
          {asset.address ? (
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">
                {t("tokens.contractAddress")}
              </dt>
              <dd className="flex min-w-0 items-center gap-1">
                <code className="truncate font-mono text-xs">
                  {shortenAddress(asset.address, 6)}
                </code>
                <CopyButton
                  value={asset.address}
                  label={t("tokens.contractAddress")}
                  size="iconSm"
                  iconClassName="size-4"
                />
              </dd>
            </div>
          ) : null}
        </dl>

        <div className="flex gap-2">
          <Button className="flex-1" onClick={() => onSend(asset)}>
            <ArrowUpFromLineIcon />
            {t("wallet.send")}
          </Button>
          <Button
            className="flex-1"
            variant="outline"
            onClick={() => onReceive(asset)}
          >
            <ArrowDownToLineIcon />
            {t("wallet.receive")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
