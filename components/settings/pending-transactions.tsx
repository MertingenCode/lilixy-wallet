"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BanIcon,
  CheckIcon,
  Clock3Icon,
  GaugeIcon,
  LoaderCircleIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { TransactionIcon } from "@/components/history/transaction-icon";
import { NetworkLogo } from "@/components/wallet/network-logo";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";
import { useT } from "@/hooks/use-locale";
import {
  clearPendingTransactions,
  listPendingTransactions,
} from "@/lib/db/transactions-repo";
import type { StoredTransaction } from "@/lib/db/schema";
import { formatTokenAmount } from "@/lib/i18n/format";
import {
  ReplacementError,
  submitReplacement,
  type ReplacementMode,
} from "@/lib/wallet/replacement";
import { shortenAddress } from "@/lib/utils";
import { useSessionStore } from "@/store/session";

export function PendingTransactions() {
  const { t, locale } = useT();
  const queryClient = useQueryClient();
  const address = useSessionStore((state) => state.address);
  const pendingQuery = useQuery({
    queryKey: ["pending-transactions", address],
    queryFn: async () => {
      const transactions = await listPendingTransactions();
      if (!address) return [];
      const wallet = address.toLowerCase();
      return transactions.filter(
        (transaction) => transaction.from.toLowerCase() === wallet,
      );
    },
    enabled: Boolean(address),
    refetchInterval: 10_000,
  });
  const [replacement, setReplacement] = useState<{
    transaction: StoredTransaction;
    mode: ReplacementMode;
  } | null>(null);
  const [clearOpen, setClearOpen] = useState(false);
  const [working, setWorking] = useState(false);

  const pending = pendingQuery.data ?? [];

  async function submit() {
    if (!replacement) return;
    setWorking(true);
    try {
      await submitReplacement(replacement.transaction, replacement.mode);
      toast.success(t("pending.replacementSent"));
      setReplacement(null);
      await pendingQuery.refetch();
      await queryClient.invalidateQueries({ queryKey: ["history"] });
    } catch (error) {
      const message =
        error instanceof ReplacementError
          ? error.code === "MISSING_NONCE"
            ? t("pending.cannotReplace")
            : t("pending.replacementFailed")
          : t("pending.replacementFailed");
      toast.error(message);
    } finally {
      setWorking(false);
    }
  }

  async function clearAll() {
    setWorking(true);
    try {
      const count = await clearPendingTransactions(address ?? undefined);
      toast.success(t("pending.cleared", { count }));
      setClearOpen(false);
      await pendingQuery.refetch();
      await queryClient.invalidateQueries({ queryKey: ["history"] });
    } finally {
      setWorking(false);
    }
  }

  const isPendingTransaction = (tx: StoredTransaction) => tx.status === "pending";

  return (
    <div>
      {pending.length > 0 ? (
        <div className="flex justify-end border-b border-rule py-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setClearOpen(true)}
            disabled={working}
          >
            <Trash2Icon />
            {t("pending.clear")}
          </Button>
        </div>
      ) : null}

      {pending.length === 0 ? (
        <EmptyState
          icon={Clock3Icon}
          title={t("pending.empty")}
          description={t("pending.emptyDescription")}
          className="py-8"
        />
      ) : (
        <div>
          {pending.filter(isPendingTransaction).map((tx) => {
            const canReplace =
              tx.nonce !== undefined && Boolean(tx.contractAddress || tx.to);
            const amount =
              tx.amount && tx.tokenDecimals
                ? `${formatTokenAmount(
                    BigInt(tx.amount),
                    tx.tokenDecimals,
                    locale,
                    5,
                  )} ${tx.tokenSymbol}`
                : tx.tokenSymbol;
            return (
              <div key={tx.id} className="flex flex-col gap-3 border-b border-rule py-4 last:border-0 sm:flex-row sm:items-center">
                <TransactionIcon type={tx.type} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{amount}</p>
                    <span className="text-muted-foreground flex items-center gap-1 text-xs">
                      <NetworkLogo chainId={tx.chainId} size={14} label={t("common.network")} />
                      {tx.chainId}
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-0.5 flex gap-2 font-mono text-[0.6875rem]">
                    <span>{shortenAddress(tx.hash, 6)}</span>
                    <span>{t("pending.nonce")}: {tx.nonce ?? "N/A"}</span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!canReplace || working}
                    title={!canReplace ? t("pending.cannotReplace") : undefined}
                    onClick={() => setReplacement({ transaction: tx, mode: "cancel" })}
                  >
                    <BanIcon />
                    {t("pending.cancel")}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!canReplace || working}
                    title={!canReplace ? t("pending.cannotReplace") : undefined}
                    onClick={() => setReplacement({ transaction: tx, mode: "speedup" })}
                  >
                    <GaugeIcon />
                    {t("pending.speedUp")}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AlertDialog
        open={Boolean(replacement)}
        onOpenChange={(open) => !open && !working && setReplacement(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {replacement?.mode === "cancel"
                ? t("pending.confirmCancelTitle")
                : t("pending.confirmSpeedTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("pending.confirmReplacementDescription", {
                nonce: replacement?.transaction.nonce ?? "N/A",
              })}
              <span className="mt-2 block">
                {replacement?.mode === "cancel"
                  ? t("pending.cancelDescription")
                  : t("pending.speedUpDescription")}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={working}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void submit();
              }}
              disabled={working}
            >
              {working ? (
                <LoaderCircleIcon className="animate-spin" />
              ) : replacement?.mode === "cancel" ? (
                <BanIcon />
              ) : (
                <CheckIcon />
              )}
              {working ? t("common.loading") : t("common.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("pending.clearTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("pending.clearDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={working}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void clearAll();
              }}
              disabled={working}
            >
              {working ? (
                <LoaderCircleIcon className="animate-spin" />
              ) : (
                <Trash2Icon />
              )}
              {t("pending.clearAll")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
