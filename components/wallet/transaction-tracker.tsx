"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import {
  findTransactionByHash,
  listPendingTransactions,
  updateTransaction,
  upsertTransaction,
} from "@/lib/db/transactions-repo";
import { getRuntimeChains } from "@/lib/wagmi/chain-registry";
import { getPublicClientForChain } from "@/lib/wagmi/rpc";
import { transactionFromSentDetail } from "@/lib/wallet/transaction-parser";
import { subscribeToTransactions } from "@/lib/wallet/tx-channel";

const POLL_MS = 15_000;

export function TransactionTracker() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = subscribeToTransactions((detail) => {
      void (async () => {
        const existing = await findTransactionByHash(detail.hash);
        if (existing) return;
        const transaction = await transactionFromSentDetail(detail);
        await upsertTransaction(transaction);
        await queryClient.invalidateQueries({ queryKey: ["history"] });
      })();
    });
    return unsubscribe;
  }, [queryClient]);

  useEffect(() => {
    let cancelled = false;

    async function checkPending() {
      const pending = await listPendingTransactions();
      if (pending.length === 0 || cancelled) return;
      for (const transaction of pending) {
        if (cancelled) break;
        const chain = getRuntimeChains().find(
          (item) => item.id === transaction.chainId,
        );
        if (!chain) continue;
        try {
          const receipt = await getPublicClientForChain(
            chain,
          ).getTransactionReceipt({
            hash: transaction.hash as `0x${string}`,
          });
          await updateTransaction(transaction.id, {
            status: receipt.status === "success" ? "success" : "failed",
          });
        } catch {
          // Not mined yet, or a transient RPC failure. Keep it pending.
        }
      }
      if (!cancelled) {
        await queryClient.invalidateQueries({ queryKey: ["history"] });
      }
    }

    void checkPending();
    const interval = window.setInterval(() => void checkPending(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [queryClient]);

  return null;
}
