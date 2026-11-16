"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import {
  ArrowLeftRightIcon,
  HistoryIcon,
  SettingsIcon,
  WalletCardsIcon,
} from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { LockButton } from "@/components/layout/lock-button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { TransactionTracker } from "@/components/wallet/transaction-tracker";
import { useT } from "@/hooks/use-locale";
import { useAutoLock } from "@/hooks/use-auto-lock";
import {
  enrollBiometric,
  hasBiometricEnrollment,
  isBiometricAvailable,
} from "@/lib/wallet/biometric";
import { getSessionMemory } from "@/lib/wallet/session-memory";
import { getActiveWalletId } from "@/lib/wallet/wallets";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/store/settings";
import { useSessionStore } from "@/store/session";

const NAV = [
  { href: "/wallet", key: "nav.wallet", icon: WalletCardsIcon },
  { href: "/swap", key: "nav.swap", icon: ArrowLeftRightIcon },
  { href: "/history", key: "nav.history", icon: HistoryIcon },
  { href: "/settings", key: "nav.settings", icon: SettingsIcon },
] as const;

function NavLinks({ mobile = false }: { mobile?: boolean }) {
  const { t } = useT();
  const pathname = usePathname();

  return (
    <>
      {NAV.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        if (mobile) {
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={t(item.key)}
              aria-current={active ? "page" : undefined}
              title={t(item.key)}
              className={cn(
                "group flex min-h-[58px] flex-1 flex-col items-center justify-center gap-1 rounded-full px-0.5 py-1 text-[0.625rem] font-medium transition-colors duration-[var(--dur-short)]",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "flex size-9 items-center justify-center rounded-full transition-colors duration-[var(--dur-short)]",
                  active
                    ? "bg-primary/10 text-primary"
                    : "group-hover:bg-card/65 group-hover:text-foreground",
                )}
              >
                <Icon className="size-[1.3125rem]" strokeWidth={1.7} />
              </span>
              <span className="max-w-full truncate leading-none">
                {t(item.key)}
              </span>
            </Link>
          );
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex min-h-[52px] items-center gap-3 rounded-[16px] px-4 text-[0.875rem] font-medium transition-colors duration-[var(--dur-short)]",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-card/65 hover:text-foreground",
            )}
          >
            <Icon className="size-5" strokeWidth={1.7} />
            {t(item.key)}
          </Link>
        );
      })}
    </>
  );
}

function BiometricAutoEnroll() {
  const enabled = useSettingsStore((state) => state.biometricEnabled);
  const address = useSessionStore((state) => state.address);
  const working = useRef(false);

  useEffect(() => {
    if (!enabled || !address) return;
    const walletId = getActiveWalletId() ?? "primary";
    if (hasBiometricEnrollment(walletId)) return;

    let cancelled = false;
    async function enroll() {
      if (cancelled || working.current || hasBiometricEnrollment(walletId)) {
        return;
      }
      working.current = true;
      try {
        if (await isBiometricAvailable()) {
          const session = getSessionMemory();
          if (session) await enrollBiometric(walletId, session.mnemonic);
        }
      } catch {
        // Cancelled/unsupported enrollment must not block the wallet.
      } finally {
        working.current = false;
      }
    }

    void enroll();
    const onGesture = () => void enroll();
    window.addEventListener("pointerdown", onGesture, { once: true });
    window.addEventListener("keydown", onGesture, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
    };
  }, [address, enabled]);

  return null;
}

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useT();
  const autoLock = useSettingsStore((state) => state.autoLock);
  useAutoLock();

  return (
    <div className="min-h-dvh bg-background">
      <TransactionTracker />
      <BiometricAutoEnroll />
      <a
        href="#main-content"
        className="focus:bg-primary focus:text-primary-foreground sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[60] focus:rounded-full focus:px-4 focus:py-2 focus:text-sm"
      >
        {t("a11y.skipToContent")}
      </a>

      <aside className="sidebar-glass fixed inset-y-3 start-3 z-30 hidden w-[252px] flex-col xl:flex">
        <div className="flex h-[84px] items-center px-6">
          <Logo size="lg" />
        </div>
        <nav
          aria-label={t("a11y.mainNavigation")}
          className="flex flex-1 flex-col gap-2 px-3 pt-3"
        >
          <NavLinks />
          <div className="mt-auto border-t border-rule px-1 py-5">
            <p className="text-muted-foreground mb-3 text-[0.6875rem]">
              {autoLock === "tab-close"
                ? t("settings.autoLockTab")
                : t("settings.minutes", { count: autoLock })}
            </p>
            <LockButton className="w-full justify-start" />
          </div>
        </nav>
      </aside>

      <header className="glass-nav fixed inset-x-0 top-0 z-30 flex h-[60px] items-center justify-between border-b px-4 xl:hidden">
        <Logo size="md" />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <LockButton compact />
        </div>
      </header>

      <div className="xl:ps-[276px]">
        <main
          id="main-content"
          className="min-h-dvh pb-32 pt-[5.25rem] xl:pb-12 xl:pt-10"
        >
          <div className="page-container">{children}</div>
        </main>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-3 xl:hidden">
        <nav
          aria-label={t("a11y.mainNavigation")}
          className="floating-nav pointer-events-auto flex min-h-[72px] w-full max-w-[26rem] items-center rounded-full px-2 py-1.5"
        >
          <NavLinks mobile />
        </nav>
      </div>
    </div>
  );
}
