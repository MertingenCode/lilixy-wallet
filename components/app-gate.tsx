"use client";

import { useEffect, type ReactNode } from "react";
import { RefreshCwIcon, ShieldAlertIcon } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { LockScreen } from "@/components/lock/lock-screen";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/hooks/use-locale";
import { bootstrapWallet, forgetBootstrap } from "@/lib/wallet/controller";
import { useSessionStore } from "@/store/session";

function BootScreen() {
  const { t } = useT();
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-5">
        <Logo size="lg" />
        <div className="w-40 space-y-2">
          <Skeleton className="h-1.5 w-full rounded-full" />
          <Skeleton className="mx-auto h-1.5 w-2/3 rounded-full" />
        </div>
        <span className="sr-only">{t("common.loading")}</span>
      </div>
    </main>
  );
}

function BootErrorScreen() {
  const { t } = useT();
  const setBoot = useSessionStore((state) => state.setBoot);

  function retry() {
    forgetBootstrap();
    setBoot();
    void bootstrapWallet();
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-5">
      <div className="glass-panel w-full max-w-md p-8 text-center">
        <ShieldAlertIcon className="text-destructive mx-auto size-6" strokeWidth={1.7} />
        <h1 className="mt-4 text-[1.5rem]">{t("errorPage.title")}</h1>
        <p className="text-muted-foreground mt-2 text-sm leading-5">
          {t("errors.indexedDb")}
        </p>
        <Button className="mt-5 w-full" onClick={retry}>
          <RefreshCwIcon />
          {t("common.retry")}
        </Button>
      </div>
    </main>
  );
}

export function AppGate({ children }: { children: ReactNode }) {
  const status = useSessionStore((state) => state.status);

  useEffect(() => {
    if (useSessionStore.getState().status === "boot") {
      void bootstrapWallet();
    }
  }, []);

  if (status === "boot") return <BootScreen />;
  if (status === "no-vault") return <OnboardingWizard />;
  if (status === "locked") return <LockScreen />;
  if (status === "error") return <BootErrorScreen />;
  return <>{children}</>;
}
