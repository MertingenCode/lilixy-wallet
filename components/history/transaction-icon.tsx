import {
  ArrowDownLeftIcon,
  ArrowLeftRightIcon,
  ArrowUpRightIcon,
  FileCode2Icon,
  ShieldCheckIcon,
  WaypointsIcon,
  XCircleIcon,
} from "lucide-react";

import type { TransactionType } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

const ICONS = {
  send: ArrowUpRightIcon,
  receive: ArrowDownLeftIcon,
  swap: ArrowLeftRightIcon,
  bridge: WaypointsIcon,
  approve: ShieldCheckIcon,
  contract: FileCode2Icon,
  cancel: XCircleIcon,
} as const;

export function TransactionIcon({
  type,
  className,
}: {
  type: TransactionType;
  className?: string;
}) {
  const Icon = ICONS[type] ?? FileCode2Icon;
  return (
    <div
      className={cn(
        "bg-paper-3 text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-full",
        className,
      )}
    >
      <Icon className="size-4" strokeWidth={1.7} />
    </div>
  );
}
