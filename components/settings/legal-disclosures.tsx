"use client";

import { ChevronDownIcon } from "lucide-react";

import { useT } from "@/hooks/use-locale";
import { cn } from "@/lib/utils";

export function LegalDisclosures({
  compact = false,
}: {
  compact?: boolean;
}) {
  const { t } = useT();
  const items = [
    { title: t("legal.privacyTitle"), body: t("legal.privacy") },
    { title: t("legal.disclaimerTitle"), body: t("legal.disclaimer") },
    { title: t("legal.faq1Title"), body: t("legal.faq1") },
    { title: t("legal.faq2Title"), body: t("legal.faq2") },
  ];

  return (
    <div className={compact ? "text-xs" : undefined}>
      {items.map((item, index) => (
        <details
          key={item.title}
          className={cn(
            "group",
            index < items.length - 1 && "border-b border-rule",
          )}
        >
          <summary
            className={cn(
              "flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium",
              compact ? "py-3" : "p-4",
            )}
          >
            {item.title}
            <ChevronDownIcon className="text-muted-foreground size-4 shrink-0 transition-transform duration-[var(--dur-short)] group-open:rotate-180" />
          </summary>
          <p
            className={cn(
              "text-muted-foreground text-xs leading-5",
              compact ? "pb-3" : "px-4 pb-4",
            )}
          >
            {item.body}
          </p>
        </details>
      ))}
    </div>
  );
}
