"use client";

import { useMemo, useState } from "react";
import { ExternalLinkIcon, HistoryIcon, RefreshCwIcon } from "lucide-react";

import { CopyButton } from "@/components/common/copy-button";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { BridgeStatusWatcher } from "@/components/history/bridge-status-watcher";
import { StatusBadge } from "@/components/history/status-badge";
import { TransactionIcon } from "@/components/history/transaction-icon";
import { NetworkLogo } from "@/components/wallet/network-logo";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/hooks/use-locale";
import { useHistory } from "@/hooks/use-history";
import {
  formatRelativeTime,
  formatShortDate,
  formatTokenAmount,
} from "@/lib/i18n/format";
import type {
  StoredTransaction,
  TransactionStatus,
  TransactionType,
} from "@/lib/db/schema";
import { BUILT_IN_NETWORKS, getExplorerTxUrl } from "@/lib/wagmi/networks";
import { getRuntimeChains } from "@/lib/wagmi/chain-registry";
import { useSettingsStore } from "@/store/settings";
import { cn, shortenAddress } from "@/lib/utils";

const TYPE_FILTERS: Array<TransactionType | "all"> = [
  "all",
  "send",
  "receive",
  "swap",
  "bridge",
  "approve",
  "contract",
  "cancel",
];

function typeLabel(
  type: TransactionType,
  t: ReturnType<typeof useT>["t"],
): string {
  if (type === "cancel") return t("history.cancel");
  return t(`history.${type}`);
}

function transactionAmount(
  tx: StoredTransaction,
  locale: ReturnType<typeof useT>["locale"],
): { amount: string; toAmount?: string } {
  if (!tx.amount || !tx.tokenDecimals) return { amount: "" };
  try {
    const formatted = formatTokenAmount(
      BigInt(tx.amount),
      tx.tokenDecimals,
      locale,
      6,
    );
    if (tx.type === "swap" || tx.type === "bridge") {
      if (tx.toAmount && tx.toTokenDecimals) {
        return {
          amount: `${formatted} ${tx.tokenSymbol}`,
          toAmount: `${formatTokenAmount(
            BigInt(tx.toAmount),
            tx.toTokenDecimals,
            locale,
            6,
          )} ${tx.toTokenSymbol ?? ""}`,
        };
      }
      return { amount: `${formatted} ${tx.tokenSymbol}` };
    }
    const prefix = tx.type === "receive" ? "+" : tx.type === "send" ? "−" : "";
    return { amount: `${prefix}${formatted} ${tx.tokenSymbol}` };
  } catch {
    return { amount: tx.tokenSymbol };
  }
}

function TransactionRow({
  tx,
  networkName,
}: {
  tx: StoredTransaction;
  networkName: string;
}) {
  const { t, locale } = useT();
  const chain = getRuntimeChains().find((item) => item.id === tx.chainId);
  const explorer =
    tx.explorerUrl ??
    (tx.hash ? getExplorerTxUrl(chain, tx.hash) : undefined);
  const amount = transactionAmount(tx, locale);

  return (
    <div className="flex items-start gap-3 border-b border-rule px-5 py-4 last:border-0">
      <TransactionIcon type={tx.type} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[0.8125rem] font-medium">{typeLabel(tx.type, t)}</p>
          <StatusBadge status={tx.status} />
        </div>
        <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.6875rem]">
          <span className="flex items-center gap-1.5">
            <NetworkLogo chainId={tx.chainId} size={13} label={networkName} />
            {networkName}
          </span>
          <span className="text-rule" aria-hidden="true">
            /
          </span>
          <time
            dateTime={new Date(tx.timestamp).toISOString()}
            title={formatShortDate(tx.timestamp, locale)}
          >
            {formatRelativeTime(tx.timestamp, locale)}
          </time>
        </div>
        {tx.hash ? (
          <div className="mt-1.5 flex items-center gap-1.5">
            <code className="text-muted-foreground max-w-[11rem] truncate font-mono text-[0.6875rem]">
              {shortenAddress(tx.hash, 6)}
            </code>
            <CopyButton
              value={tx.hash}
              label={`${t("common.copy")} ${t("common.hash")}`}
              size="iconSm"
              iconClassName="size-3.5"
            />
            {explorer ? (
              <a
                href={explorer}
                target="_blank"
                rel="noreferrer noopener"
                aria-label={t("common.openExplorer")}
                className="text-muted-foreground hover:text-primary transition-colors duration-[var(--dur-short)]"
              >
                <ExternalLinkIcon className="size-3.5" />
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="max-w-[42%] shrink-0 text-end">
        <p
          className={cn(
            "tabular text-[0.8125rem] font-medium",
            tx.type === "receive" && "text-primary",
          )}
        >
          {amount.amount || "N/A"}
        </p>
        {amount.toAmount ? (
          <p className="text-muted-foreground tabular mt-0.5 text-[0.6875rem]">
            {amount.toAmount}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div>
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="flex items-center gap-3 border-b border-rule px-5 py-5">
          <Skeleton className="size-8 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}

export function HistoryPage() {
  const { t } = useT();
  const customNetworks = useSettingsStore((state) => state.customNetworks);
  const [filterChain, setFilterChain] = useState<string>("all");
  const [filterType, setFilterType] = useState<TransactionType | "all">("all");
  const [filterStatus, setFilterStatus] = useState<TransactionStatus | "all">(
    "all",
  );
  const history = useHistory();

  const networks = useMemo(() => {
    const map = new Map<number, string>();
    for (const item of BUILT_IN_NETWORKS) {
      map.set(item.chain.id, item.chain.name);
    }
    for (const custom of customNetworks) {
      if (!map.has(custom.chainId)) map.set(custom.chainId, custom.name);
    }
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [customNetworks]);

  const filtered = useMemo(
    () =>
      history.items.filter((tx) => {
        if (filterChain !== "all" && tx.chainId !== Number(filterChain)) {
          return false;
        }
        if (filterType !== "all" && tx.type !== filterType) return false;
        if (filterStatus !== "all" && tx.status !== filterStatus) return false;
        return true;
      }),
    [filterChain, filterStatus, filterType, history.items],
  );

  const chainName = (id: number) =>
    networks.find((network) => network.id === id)?.name ?? `Chain ${id}`;

  return (
    <div className="mx-auto w-full max-w-[980px]">
      <BridgeStatusWatcher transactions={history.items} />
      <PageHeader
        title={t("history.title")}
        description={t("history.description")}
        actions={
          <Button
            variant="outline"
            size="icon"
            aria-label={t("common.refresh")}
            onClick={() => history.refetch()}
            disabled={history.isFetching}
          >
            <RefreshCwIcon
              className={cn("size-4", history.isFetching && "animate-spin")}
            />
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-1 border-y border-rule py-2">
        <Select value={filterChain} onValueChange={setFilterChain}>
          <SelectTrigger className="h-9 w-auto min-w-[8rem] border-transparent bg-transparent text-xs">
            <SelectValue>
              {filterChain === "all"
                ? t("history.allNetworks")
                : chainName(Number(filterChain))}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("history.allNetworks")}</SelectItem>
            {networks.map((network) => (
              <SelectItem key={network.id} value={String(network.id)}>
                <span className="flex items-center gap-2">
                  <NetworkLogo
                    chainId={network.id}
                    size={18}
                    label={network.name}
                  />
                  {network.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filterType}
          onValueChange={(value) =>
            setFilterType(value as TransactionType | "all")
          }
        >
          <SelectTrigger className="h-9 w-auto min-w-[7.5rem] border-transparent bg-transparent text-xs">
            <SelectValue>
              {filterType === "all"
                ? t("history.allTypes")
                : typeLabel(filterType, t)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {TYPE_FILTERS.map((type) => (
              <SelectItem key={type} value={type}>
                {type === "all" ? t("history.allTypes") : typeLabel(type, t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filterStatus}
          onValueChange={(value) =>
            setFilterStatus(value as TransactionStatus | "all")
          }
        >
          <SelectTrigger className="h-9 w-auto min-w-[7.5rem] border-transparent bg-transparent text-xs">
            <SelectValue>
              {filterStatus === "all"
                ? t("history.allStatuses")
                : t(`common.${filterStatus}`)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("history.allStatuses")}</SelectItem>
            <SelectItem value="pending">{t("common.pending")}</SelectItem>
            <SelectItem value="success">{t("common.success")}</SelectItem>
            <SelectItem value="failed">{t("common.failed")}</SelectItem>
            <SelectItem value="replaced">{t("common.replaced")}</SelectItem>
          </SelectContent>
        </Select>

        {filterChain !== "all" ||
        filterType !== "all" ||
        filterStatus !== "all" ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilterChain("all");
              setFilterType("all");
              setFilterStatus("all");
            }}
          >
            {t("history.clearFilters")}
          </Button>
        ) : null}
      </div>

      <section className="glass-panel mt-6 overflow-hidden">
        {history.isLoading ? (
          <HistorySkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={HistoryIcon}
            title={t("history.empty")}
            description={t("history.emptyDescription")}
          />
        ) : (
          <div>
            {filtered.map((tx) => (
              <TransactionRow
                key={tx.id}
                tx={tx}
                networkName={chainName(tx.chainId)}
              />
            ))}
          </div>
        )}

        {history.isError ? (
          <div className="border-t border-rule p-4 text-center">
            <p className="text-destructive text-xs">{t("errors.generic")}</p>
            <Button variant="ghost" size="sm" onClick={() => history.refetch()}>
              {t("common.retry")}
            </Button>
          </div>
        ) : null}
      </section>

      <p className="text-muted-foreground mt-5 text-[0.6875rem] leading-5">
        {t("history.localOnlyNotice")}
      </p>
    </div>
  );
}
