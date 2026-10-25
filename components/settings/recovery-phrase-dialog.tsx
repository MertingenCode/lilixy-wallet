"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ClipboardIcon,
  EyeIcon,
  LoaderCircleIcon,
  ShieldAlertIcon,
  TimerIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { PasswordInput } from "@/components/common/password-input";
import { MnemonicGrid } from "@/components/onboarding/mnemonic-grid";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useT } from "@/hooks/use-locale";
import { formatCountdown } from "@/lib/i18n/format";
import { splitMnemonic } from "@/lib/wallet/mnemonic";
import { revealRecoveryPhrase } from "@/lib/wallet/controller";
import { isWalletError } from "@/lib/wallet/errors";

const VISIBLE_MS = 60_000;

export function RecoveryPhraseDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useT();
  const [password, setPassword] = useState("");
  const [phrase, setPhrase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState(VISIBLE_MS);

  const words = useMemo(() => splitMnemonic(phrase), [phrase]);

  useEffect(() => {
    if (!open) {
      setPassword("");
      setPhrase("");
      setError(null);
      setLoading(false);
      setRemaining(VISIBLE_MS);
    }
  }, [open]);

  useEffect(() => {
    if (!phrase) return;
    const deadline = Date.now() + VISIBLE_MS;
    setRemaining(VISIBLE_MS);
    const interval = window.setInterval(() => {
      const next = Math.max(0, deadline - Date.now());
      setRemaining(next);
      if (next <= 0) {
        window.clearInterval(interval);
        setPhrase("");
        setPassword("");
        onOpenChange(false);
      }
    }, 500);
    return () => window.clearInterval(interval);
  }, [onOpenChange, phrase]);

  async function reveal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!password || loading) return;
    setLoading(true);
    setError(null);
    try {
      const recovered = await revealRecoveryPhrase(password);
      setPhrase(recovered);
      setPassword("");
    } catch (caught) {
      if (isWalletError(caught)) {
        if (caught.code === "WRONG_PASSWORD") {
          setError(t("recovery.wrongPassword"));
        } else if (caught.code === "RATE_LIMITED") {
          setError(t("errors.rateLimit", { time: "N/A" }));
        } else {
          setError(t("errors.generic"));
        }
      } else {
        setError(t("errors.generic"));
      }
    } finally {
      setLoading(false);
    }
  }

  async function copyPhrase() {
    if (!phrase) return;
    try {
      await navigator.clipboard.writeText(phrase);
      toast.warning(t("recovery.copied"));
    } catch {
      toast.error(t("toast.copyFailed"));
    }
  }

  async function clearClipboard() {
    try {
      await navigator.clipboard.writeText("");
      toast.success(t("recovery.clipboardCleared"));
    } catch {
      toast.error(t("toast.copyFailed"));
    }
  }

  function hideNow() {
    setPhrase("");
    setPassword("");
    setRemaining(0);
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          setPhrase("");
          setPassword("");
        }
        onOpenChange(value);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="bg-muted text-muted-foreground mb-1 flex size-9 items-center justify-center rounded-[10px]">
            <ShieldAlertIcon className="size-4" />
          </div>
          <DialogTitle>{t("recovery.title")}</DialogTitle>
          <DialogDescription>
            {phrase ? t("recovery.screenshotWarning") : t("recovery.description")}
          </DialogDescription>
        </DialogHeader>

        {!phrase ? (
          <form onSubmit={(event) => void reveal(event)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recovery-password">
                {t("recovery.passwordPrompt")}
              </Label>
              <PasswordInput
                id="recovery-password"
                value={password}
                onChange={setPassword}
                autoComplete="current-password"
                autoFocus
                disabled={loading}
              />
            </div>
            {error ? (
              <div
                role="alert"
                className="bg-destructive/8 text-destructive rounded-xl px-3 py-2.5 text-sm"
              >
                {error}
              </div>
            ) : null}
            <Button
              type="submit"
              className="w-full"
              disabled={!password || loading}
            >
              {loading ? (
                <LoaderCircleIcon className="animate-spin" />
              ) : (
                <EyeIcon />
              )}
              {loading ? t("recovery.showing") : t("recovery.show")}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="border-destructive/25 bg-destructive/6 text-destructive flex items-start gap-2.5 rounded-xl border p-3 text-xs leading-relaxed">
              <ShieldAlertIcon className="mt-0.5 size-4 shrink-0" />
              <p>{t("recovery.screenshotWarning")}</p>
            </div>
            <MnemonicGrid words={words} />
            <div className="text-muted-foreground flex items-center justify-between rounded-xl border px-3 py-2 text-xs">
              <span className="flex items-center gap-1.5">
                <TimerIcon className="size-4" />
                {t("recovery.autoHide", {
                  seconds: Math.max(0, Math.ceil(remaining / 1000)),
                })}
              </span>
              <span className="font-mono font-semibold tabular-nums">
                {formatCountdown(remaining)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => void copyPhrase()}>
                <ClipboardIcon />
                {t("recovery.copy")}
              </Button>
              <Button variant="outline" onClick={() => void clearClipboard()}>
                <Trash2Icon />
                {t("recovery.clearClipboard")}
              </Button>
            </div>
            <Button variant="secondary" className="w-full" onClick={hideNow}>
              {t("recovery.hideNow")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
