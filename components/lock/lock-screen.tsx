"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { LockKeyholeIcon, ShieldCheckIcon, TimerIcon } from "lucide-react";

import { AuthScene } from "@/components/auth/auth-scene";
import { PasswordInput } from "@/components/common/password-input";
import { ResetWalletDialog } from "@/components/settings/reset-wallet-dialog";
import { Button } from "@/components/ui/button";
import { useT } from "@/hooks/use-locale";
import { getUnlockRetryAfterMs } from "@/lib/security/rate-limit";
import { isWalletError } from "@/lib/wallet/errors";
import { unlockWallet } from "@/lib/wallet/controller";
import { formatCountdown } from "@/lib/i18n/format";

export function LockScreen() {
  const { t } = useT();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [retryAfterMs, setRetryAfterMs] = useState(() =>
    getUnlockRetryAfterMs(),
  );
  const [resetOpen, setResetOpen] = useState(false);

  useEffect(() => {
    if (retryAfterMs <= 0) return;
    const timer = window.setInterval(() => {
      const remaining = getUnlockRetryAfterMs();
      setRetryAfterMs(remaining);
      if (remaining <= 0) {
        setError(null);
        window.clearInterval(timer);
      }
    }, 500);
    return () => window.clearInterval(timer);
  }, [retryAfterMs]);

  const countdown = useMemo(
    () => formatCountdown(retryAfterMs),
    [retryAfterMs],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (unlocking || retryAfterMs > 0) return;
    setError(null);
    setUnlocking(true);
    try {
      await unlockWallet(password);
      setPassword("");
    } catch (caught) {
      if (isWalletError(caught)) {
        if (caught.code === "RATE_LIMITED" || caught.retryAfterMs) {
          const remaining =
            caught.retryAfterMs ?? getUnlockRetryAfterMs();
          setRetryAfterMs(remaining);
          setError(t("lock.lockedOut"));
        } else if (caught.code === "WRONG_PASSWORD") {
          setError(t("lock.wrongPassword"));
        } else if (caught.code === "VAULT_CORRUPTED") {
          setError(t("errors.vaultCorrupted"));
        } else if (caught.code === "INDEXEDDB_UNAVAILABLE") {
          setError(t("errors.indexedDb"));
        } else {
          setError(t("errors.generic"));
        }
      } else {
        setError(t("errors.generic"));
      }
      setPassword("");
    } finally {
      setUnlocking(false);
    }
  }

  return (
    <>
      <AuthScene
        title={t("brand.tagline")}
        description={t("brand.description")}
      >
        <div className="p-6 sm:p-8">
          <header>
            <h2 className="text-[1.875rem] leading-[1.05]">{t("lock.title")}</h2>
            <p className="text-muted-foreground mt-2 text-sm leading-6">
              {t("lock.subtitle")}
            </p>
          </header>

          <form
            onSubmit={(event) => void handleSubmit(event)}
            className="mt-7 space-y-4"
          >
            <div className="space-y-2">
              <label
                htmlFor="unlock-password"
                className="text-[0.8125rem] font-medium"
              >
                {t("lock.passwordPlaceholder")}
              </label>
              <PasswordInput
                id="unlock-password"
                value={password}
                onChange={(value) => {
                  setPassword(value);
                  if (error) setError(null);
                }}
                placeholder={t("lock.passwordPlaceholder")}
                autoComplete="current-password"
                autoFocus
                disabled={unlocking || retryAfterMs > 0}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "unlock-error" : undefined}
              />
            </div>

            {error ? (
              <p
                id="unlock-error"
                role="alert"
                className="text-destructive border-s-2 border-destructive ps-3 text-xs leading-5"
              >
                {error}
              </p>
            ) : null}

            {retryAfterMs > 0 ? (
              <div className="text-muted-foreground flex items-center gap-2 text-xs">
                <TimerIcon className="size-4 shrink-0" />
                {t("lock.retryIn", { time: countdown })}
              </div>
            ) : null}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={unlocking || !password || retryAfterMs > 0}
            >
              <LockKeyholeIcon />
              {unlocking ? t("lock.unlocking") : t("lock.unlock")}
            </Button>
          </form>

          <div className="text-muted-foreground mt-5 flex items-start gap-2 text-[0.6875rem] leading-5">
            <ShieldCheckIcon className="mt-0.5 size-4 shrink-0" />
            <p>{t("lock.securityNote")}</p>
          </div>

          <div className="mt-6 border-t border-rule pt-4">
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 transition-colors duration-[var(--dur-short)] hover:underline"
              onClick={() => setResetOpen(true)}
            >
              {t("lock.forgotPassword")}
            </button>
          </div>
        </div>
      </AuthScene>

      <ResetWalletDialog open={resetOpen} onOpenChange={setResetOpen} />
    </>
  );
}
