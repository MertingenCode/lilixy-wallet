"use client";

import {
  CheckIcon,
  Clock3Icon,
  RefreshCwIcon,
  XIcon,
} from "lucide-react";

import { useT } from "@/hooks/use-locale";
import type { TransactionStatus } from "@/lib/db/schema";

export function StatusBadge({ status }: { status: TransactionStatus }) {
  const { t } = useT();
  if (status === "success") {
    return (
      <span className="text-success inline-flex items-center gap-1 text-[0.6875rem] font-medium">
        <CheckIcon className="size-3.5" aria-hidden="true" />
        {t("common.success")}
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="text-destructive inline-flex items-center gap-1 text-[0.6875rem] font-medium">
        <XIcon className="size-3.5" aria-hidden="true" />
        {t("common.failed")}
      </span>
    );
  }
  if (status === "replaced") {
    return (
      <span className="text-muted-foreground inline-flex items-center gap-1 text-[0.6875rem] font-medium">
        <RefreshCwIcon className="size-3.5" aria-hidden="true" />
        {t("common.replaced")}
      </span>
    );
  }
  return (
    <span className="text-destructive inline-flex items-center gap-1 text-[0.6875rem] font-medium">
      <Clock3Icon className="size-3.5" aria-hidden="true" />
      {t("common.pending")}
    </span>
  );
}
