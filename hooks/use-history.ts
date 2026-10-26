"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { listTransactions } from "@/lib/db/transactions-repo";
import { useSessionStore } from "@/store/session";
import { HISTORY_UPDATED_EVENT } from "@/lib/lifi/route-history";

export function useHistory() {
  const queryClient = useQueryClient();
  const address = useSessionStore((state) => state.address);

  const local = useQuery({
    queryKey: ["history", "local", address],
    queryFn: async () => {
      if (!address) return [];
      const transactions = await listTransactions();
      const wallet = address.toLowerCase();
      return transactions.filter(
        (transaction) => transaction.from.toLowerCase() === wallet,
      );
    },
    enabled: Boolean(address),
    staleTime: 10_000,
    refetchInterval: 30_000,
  });

  useEffect(() => {
    const handler = () => {
      void queryClient.invalidateQueries({ queryKey: ["history"] });
    };
    window.addEventListener(HISTORY_UPDATED_EVENT, handler);
    return () => window.removeEventListener(HISTORY_UPDATED_EVENT, handler);
  }, [queryClient]);

  return {
    items: local.data ?? [],
    isLoading: local.isLoading,
    isFetching: local.isFetching,
    isError: local.isError,
    refetch: () => {
      void local.refetch();
    },
  };
}
