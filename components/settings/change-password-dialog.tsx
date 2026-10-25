"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { KeyRoundIcon, LoaderCircleIcon } from "lucide-react";
import { toast } from "sonner";

import { PasswordInput } from "@/components/common/password-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useT } from "@/hooks/use-locale";
import { evaluatePassword } from "@/lib/security/password-strength";
import { changeWalletPassword } from "@/lib/wallet/controller";
import { isWalletError } from "@/lib/wallet/errors";
import { cn } from "@/lib/utils";

export function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useT();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const evaluation = useMemo(() => evaluatePassword(next), [next]);
  const canSubmit =
    Boolean(current) && evaluation.valid && next === confirm && !saving;

  useEffect(() => {
    if (!open) {
      setCurrent("");
      setNext("");
      setConfirm("");
      setError(null);
      setSaving(false);
    }
  }, [open]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      await changeWalletPassword(current, next);
      toast.success(t("changePassword.success"));
      onOpenChange(false);
    } catch (caught) {
      if (isWalletError(caught)) {
        if (caught.code === "WRONG_PASSWORD") {
          setError(t("changePassword.wrongCurrent"));
        } else if (caught.code === "WEAK_PASSWORD") {
          setError(t("errors.weakPassword"));
        } else if (caught.code === "RATE_LIMITED") {
          setError(t("errors.rateLimit", { time: "N/A" }));
        } else if (caught.code === "VAULT_CORRUPTED") {
          setError(t("errors.vaultCorrupted"));
        } else {
          setError(t("errors.generic"));
        }
      } else {
        setError(t("errors.generic"));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !saving && onOpenChange(value)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="bg-primary/10 text-primary mb-2 flex size-11 items-center justify-center rounded-2xl">
            <KeyRoundIcon className="size-5" />
          </div>
          <DialogTitle>{t("changePassword.title")}</DialogTitle>
          <DialogDescription>
            {t("changePassword.description")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">
              {t("changePassword.current")}
            </Label>
            <PasswordInput
              id="current-password"
              value={current}
              onChange={setCurrent}
              autoComplete="current-password"
              autoFocus
              disabled={saving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-wallet-password">
              {t("changePassword.new")}
            </Label>
            <PasswordInput
              id="new-wallet-password"
              value={next}
              onChange={setNext}
              autoComplete="new-password"
              disabled={saving}
            />
            {next ? (
              <p
                className={cn(
                  "text-xs",
                  evaluation.valid ? "text-success" : "text-muted-foreground",
                )}
              >
                {t("password.strength")}:{" "}
                {t(`password.score${evaluation.score}`)}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-wallet-password">
              {t("changePassword.confirm")}
            </Label>
            <PasswordInput
              id="confirm-wallet-password"
              value={confirm}
              onChange={setConfirm}
              autoComplete="new-password"
              disabled={saving}
              aria-invalid={Boolean(confirm) && next !== confirm}
            />
            {confirm && next !== confirm ? (
              <p className="text-destructive text-xs">
                {t("password.mismatch")}
              </p>
            ) : null}
          </div>

          {error ? (
            <div
              role="alert"
              className="bg-destructive/8 text-destructive rounded-xl px-3 py-2.5 text-sm"
            >
              {error}
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {saving ? (
                <>
                  <LoaderCircleIcon className="animate-spin" />
                  {t("changePassword.updating")}
                </>
              ) : (
                t("changePassword.submit")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
