"use client";

import { useT } from "@/hooks/use-locale";
import { cn } from "@/lib/utils";

export function MnemonicGrid({
  words,
  className,
}: {
  words: string[];
  className?: string;
}) {
  const { t } = useT();
  return (
    <div
      className={cn("grid grid-cols-2 gap-x-6 sm:grid-cols-3", className)}
      role="list"
      aria-label={t("onboarding.mnemonicGridLabel")}
    >
      {words.map((word, index) => (
        <div
          key={`${index}-${word}`}
          role="listitem"
          className="flex items-baseline gap-2.5 border-b border-rule py-2.5"
        >
          <span className="text-muted-foreground w-4 text-end text-[0.6875rem] font-medium tabular-nums">
            {index + 1}
          </span>
          <span className="font-mono text-[0.8125rem] font-medium tracking-tight">
            {word}
          </span>
        </div>
      ))}
    </div>
  );
}
