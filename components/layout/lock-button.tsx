"use client";

import { LockKeyholeIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useT } from "@/hooks/use-locale";
import { lockWallet } from "@/lib/wallet/controller";

export function LockButton({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const { t } = useT();
  function lock() {
    lockWallet();
    toast.success(t("toast.locked"));
  }
  return (
    <Button
      type="button"
      variant={compact ? "ghost" : "outline"}
      size={compact ? "icon" : "default"}
      onClick={lock}
      aria-label={t("nav.lock")}
      title={t("nav.lock")}
      className={className}
    >
      <LockKeyholeIcon className="size-[1.125rem]" />
      {!compact ? <span>{t("nav.lock")}</span> : null}
    </Button>
  );
}
