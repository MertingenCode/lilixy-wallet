"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import type { LifiStatusResponse } from "@/lib/api/types";
import type { StoredTransaction } from "@/lib/db/schema";
import { updateTransaction } from "@/lib/db/transactions-repo";

const POLL_MS = 20_000;

export function BridgeStatusWatcher({
  transactions,
}: {
  transactions: StoredTransaction[];
}) {
  const queryClient = useQueryClient();
  const pending = transactions.filter(
    (tx) =>
      tx.type === "bridge" &&
      tx.status === "pending" &&
      /^0x[a-fA-F0-9]{64}$/u.test(tx.hash) &&
      tx.destinationChainId !== undefined,
  );
  const key = pending
    .map((tx) => `${tx.id}:${tx.hash}:${tx.destinationChainId}`)
    .join("|");

  useEffect(() => {
    if (!key) return;
    let cancelled = false;

    async function poll() {
      for (const tx of pending) {
        if (cancelled) return;
        try {
          const params = new URLSearchParams({
            txHash: tx.hash,
            fromChain: String(tx.chainId),
            toChain: String(tx.destinationChainId),
          });
          const response = await fetch(`/api/lifi/status?${params.toString()}`, {
            headers: { accept: "application/json" },
          });
          if (!response.ok) continue;
          const status = (await response.json()) as LifiStatusResponse;
          if (status.status === "DONE") {
            await updateTransaction(tx.id, {
              status: "success",
              destinationTxHash:
                status.receiving?.txHash ?? tx.destinationTxHash,
            });
          } else if (status.status === "FAILED") {
            await updateTransaction(tx.id, {
              status: "failed",
              error: status.substatusMessage,
            });
          } else if (status.receiving?.txHash) {
            await updateTransaction(tx.id, {
              destinationTxHash: status.receiving.txHash,
            });
          }
        } catch {
          // Status API is best-effort; the local pending row remains intact.
        }
      }
      if (!cancelled) {
        await queryClient.invalidateQueries({ queryKey: ["history"] });
      }
    }

    void poll();
    const interval = window.setInterval(() => void poll(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
    // `key` captures the exact pending set; pending is derived from it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, queryClient]);

  return null;
}
