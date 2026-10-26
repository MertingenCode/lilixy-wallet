"use client";

import { useEffect, useState, type FormEvent } from "react";
import { LoaderCircleIcon, ShieldCheckIcon } from "lucide-react";
import { toast } from "sonner";

import { MnemonicGrid } from "@/components/onboarding/mnemonic-grid";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/hooks/use-locale";
import { evaluatePassword } from "@/lib/security/password-strength";
import { createWallet } from "@/lib/wallet/controller";
import { isWalletError } from "@/lib/wallet/errors";
import {
  generateWalletMnemonic,
  isValidMnemonic,
  normalizeMnemonic,
  splitMnemonic,
} from "@/lib/wallet/mnemonic";
import { nextWalletName } from "@/lib/wallet/wallets";

export function AddWalletDialog({
  open,
  onOpenChange,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded?: () => void;
}) {
  const { t } = useT();
  const [mode, setMode] = useState<"create" | "import">("create");
  const [mnemonic, setMnemonic] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setMode("create");
    setMnemonic(generateWalletMnemonic());
    setName(nextWalletName());
    setPassword("");
    setConfirmPassword("");
    setSaved(false);
    setError(null);
  }, [open]);

  function changeMode(next: "create" | "import") {
    setMode(next);
    setError(null);
    setSaved(false);
    setMnemonic(next === "create" ? generateWalletMnemonic() : "");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setError(null);

    const normalized = normalizeMnemonic(mnemonic);
    if (!isValidMnemonic(normalized)) {
      setError(t("onboarding.invalidMnemonic"));
      return;
    }
    if (mode === "create" && !saved) {
      setError(t("onboarding.writtenDown"));
      return;
    }
    if (!evaluatePassword(password).valid) {
      setError(t("onboarding.passwordWeak"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("onboarding.passwordMismatch"));
      return;
    }

    setSaving(true);
    try {
      await createWallet({ mnemonic: normalized, password, name });
      toast.success(t("wallets.added"));
      onAdded?.();
      onOpenChange(false);
    } catch (caught) {
      if (isWalletError(caught) && caught.code === "INVALID_MNEMONIC") {
        setError(t("onboarding.invalidMnemonic"));
      } else if (isWalletError(caught) && caught.code === "WEAK_PASSWORD") {
        setError(t("onboarding.passwordWeak"));
      } else {
        setError(t("errors.generic"));
      }
    } finally {
      setSaving(false);
    }
  }

  const words = splitMnemonic(mnemonic);

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="max-h-[92dvh] max-w-[560px] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[1.5rem]">
            {t("wallets.add")}
          </DialogTitle>
          <DialogDescription>{t("wallets.addDescription")}</DialogDescription>
        </DialogHeader>

        <div className="flex gap-1 rounded-full border border-rule bg-paper-2 p-1">
          {(["create", "import"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => changeMode(value)}
              className={
                mode === value
                  ? "flex-1 rounded-full bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
                  : "text-muted-foreground flex-1 rounded-full px-3 py-2 text-xs font-medium"
              }
              aria-pressed={mode === value}
            >
              {value === "create"
                ? t("onboarding.createWallet")
                : t("onboarding.importWallet")}
            </button>
          ))}
        </div>

        <form onSubmit={(event) => void submit(event)} className="space-y-4">
          {mode === "create" ? (
            <>
              <div>
                <p className="text-sm font-medium">{t("onboarding.createTitle")}</p>
                <p className="text-muted-foreground mt-1 text-xs leading-5">
                  {t("onboarding.createStepDescription")}
                </p>
              </div>
              <MnemonicGrid words={words} />
              <div className="text-muted-foreground border-accent-2 flex items-start gap-2 border-s-2 ps-3 text-xs leading-5">
                <ShieldCheckIcon className="mt-0.5 size-4 shrink-0 text-accent-2" />
                <p>{t("onboarding.mnemonicWarning")}</p>
              </div>
              <label className="flex items-start gap-2 text-xs leading-5">
                <input
                  type="checkbox"
                  checked={saved}
                  onChange={(event) => setSaved(event.target.checked)}
                  className="mt-0.5 size-4 accent-primary"
                />
                {t("onboarding.writtenDown")}
              </label>
            </>
          ) : (
            <>
              <div>
                <Label htmlFor="add-wallet-mnemonic">
                  {t("onboarding.importTitle")}
                </Label>
                <p className="text-muted-foreground mt-1 text-xs leading-5">
                  {t("onboarding.importStepDescription")}
                </p>
              </div>
              <Textarea
                id="add-wallet-mnemonic"
                value={mnemonic}
                onChange={(event) => {
                  setMnemonic(event.target.value);
                  setError(null);
                }}
                placeholder={t("onboarding.importPlaceholder")}
                spellCheck={false}
                autoCapitalize="none"
                autoComplete="off"
                className="min-h-28 font-mono text-sm"
              />
              <p className="text-muted-foreground text-xs">
                {t("onboarding.wordCount", {
                  count: words.length,
                })}
              </p>
            </>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="add-wallet-name">{t("wallets.name")}</Label>
            <Input
              id="add-wallet-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("wallets.namePlaceholder")}
              maxLength={32}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="add-wallet-password">
                {t("onboarding.password")}
              </Label>
              <Input
                id="add-wallet-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={t("onboarding.passwordPlaceholder")}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-wallet-confirm">
                {t("onboarding.passwordConfirm")}
              </Label>
              <Input
                id="add-wallet-confirm"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder={t("onboarding.confirmPlaceholder")}
                autoComplete="new-password"
              />
            </div>
          </div>

          {error ? (
            <p role="alert" className="text-destructive text-xs leading-5">
              {error}
            </p>
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
            <Button type="submit" disabled={saving}>
              {saving ? <LoaderCircleIcon className="animate-spin" /> : null}
              {mode === "create"
                ? t("onboarding.createWalletButton")
                : t("onboarding.importWalletButton")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
