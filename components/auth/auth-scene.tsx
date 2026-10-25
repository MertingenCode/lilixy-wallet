"use client";

import type { ReactNode } from "react";

import { Logo } from "@/components/brand/logo";
import { useT } from "@/hooks/use-locale";

export function AuthScene({
  title,
  description,
  children,
  panelClassName,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  panelClassName?: string;
  footer?: ReactNode;
}) {
  const { t } = useT();

  return (
    <main className="auth-scene">
      <div className="auth-orb auth-orb-a" aria-hidden="true" />
      <div className="auth-orb auth-orb-b" aria-hidden="true" />
      <div className="auth-plane auth-plane-a" aria-hidden="true" />
      <div className="auth-plane auth-plane-b" aria-hidden="true" />
      <div className="auth-plane auth-plane-c" aria-hidden="true" />

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-[1440px] flex-col px-5 py-6 sm:px-10 sm:py-8 lg:px-14">
        <header className="flex items-center justify-between gap-4">
          <Logo size="lg" />
          <span className="text-muted-foreground hidden font-display text-[0.6875rem] tracking-[-0.01em] sm:block">
            {t("brand.selfCustody")}
          </span>
        </header>

        <div
          className={
            footer
              ? "grid min-h-[calc(100dvh-10rem)] items-center gap-10 py-10 lg:min-h-[calc(100dvh-12rem)] lg:grid-cols-[minmax(0,0.92fr)_minmax(400px,0.58fr)] lg:gap-20 lg:py-14"
              : "grid flex-1 items-center gap-10 py-10 lg:grid-cols-[minmax(0,0.92fr)_minmax(400px,0.58fr)] lg:gap-20 lg:py-14"
          }
        >
          <section className="auth-copy max-w-[620px] lg:pb-10">
            <h1 className="max-w-[11ch] text-[clamp(2.6rem,5.6vw,4.8rem)] leading-[0.98]">
              {title}
            </h1>
            <p className="auth-lede mt-6 max-w-[42ch] text-[0.9375rem] leading-7 sm:text-base">
              {description}
            </p>
          </section>

          <section
            className={
              panelClassName
                ? `auth-panel w-full ${panelClassName}`
                : "auth-panel w-full"
            }
          >
            {children}
          </section>
        </div>

        <footer className="text-[0.6875rem] text-muted-foreground">
          {footer ? (
            <div className="mb-5 pb-5">
              {footer}
            </div>
          ) : null}
          <div className="flex flex-col gap-1 border-t border-rule pt-4 sm:flex-row sm:items-center sm:justify-between">
            <span>{t("footer.rights")}</span>
            <span>{t("footer.madeWith")}</span>
          </div>
        </footer>
      </div>
    </main>
  );
}
