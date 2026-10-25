"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { listTransactions } from "@/lib/db/transactions-repo";
import { HISTORY_UPDATED_EVENT } from "@/lib/lifi/route-history";

export function useHistory() {
  const queryClient = useQueryClient();

  const local = useQuery({
    queryKey: ["history", "local"],
    queryFn: listTransactions,
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
