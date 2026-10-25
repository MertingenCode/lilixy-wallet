import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function SettingsSection({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "grid gap-5 border-t border-rule py-8 first:border-t-0 first:pt-0 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12",
        className,
      )}
    >
      <header className="min-w-0">
        <div className="flex items-center gap-2">
          <Icon className="text-muted-foreground size-4" strokeWidth={1.7} />
          <h2 className="text-[1.25rem] leading-tight">{title}</h2>
        </div>
        {description ? (
          <p className="text-muted-foreground mt-2 max-w-[30ch] text-xs leading-5">
            {description}
          </p>
        ) : null}
      </header>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export function SettingsRow({
  label,
  description,
  children,
  className,
}: {
  label: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-rule py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-8",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-[0.8125rem] font-medium">{label}</p>
        {description ? (
          <p className="text-muted-foreground mt-1 max-w-[46ch] text-xs leading-5">
            {description}
          </p>
        ) : null}
      </div>
      <div className="shrink-0 sm:self-center">{children}</div>
    </div>
  );
}
