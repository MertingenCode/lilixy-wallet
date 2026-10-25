"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useT } from "@/hooks/use-locale";
import { cn } from "@/lib/utils";

export function CopyButton({
  value,
  label,
  successMessage,
  className,
  variant = "ghost",
  size = "iconSm",
  iconClassName,
}: {
  value: string;
  label: string;
  successMessage?: string;
  className?: string;
  variant?: "ghost" | "outline" | "secondary";
  size?: "iconSm" | "icon" | "sm";
  iconClassName?: string;
}) {
  const { t } = useT();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(successMessage ?? t("toast.copied"));
      window.setTimeout(() => setCopied(false), 1_800);
    } catch {
      toast.error(t("toast.copyFailed"));
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      aria-label={label}
      title={label}
      onClick={() => void copy()}
      className={cn(className)}
    >
      {copied ? (
        <CheckIcon className={cn("text-success", iconClassName)} />
      ) : (
        <CopyIcon className={iconClassName} />
      )}
    </Button>
  );
}
