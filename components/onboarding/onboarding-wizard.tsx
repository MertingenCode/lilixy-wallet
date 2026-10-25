"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  ClipboardIcon,
  CopyCheckIcon,
  DownloadIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  TriangleAlertIcon,
  WalletCardsIcon,
} from "lucide-react";
import { toast } from "sonner";

import { AuthScene } from "@/components/auth/auth-scene";
import { PasswordInput } from "@/components/common/password-input";
import { ContactLinks } from "@/components/settings/contact-links";
import { LegalDisclosures } from "@/components/settings/legal-disclosures";
import { MnemonicGrid } from "@/components/onboarding/mnemonic-grid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/hooks/use-locale";
import { evaluatePassword } from "@/lib/security/password-strength";
import { cn } from "@/lib/utils";
import { completeOnboarding } from "@/lib/wallet/controller";
import { isWalletError } from "@/lib/wallet/errors";
import {
  createWordChallenge,
  generateWalletMnemonic,
  isKnownWord,
  isValidMnemonic,
  normalizeMnemonic,
  splitMnemonic,
  verifyWordChallenge,
  type WordChallenge,
} from "@/lib/wallet/mnemonic";

type Step = "welcome" | "create" | "verify" | "import" | "password";
type Mode = "create" | "import";

const STEP_ORDER: Step[] = ["create", "verify", "password"];

function StepProgress({ step, mode }: { step: Step; mode: Mode }) {
  const steps = mode === "import" ? ["import", "password"] : STEP_ORDER;
  const current = steps.indexOf(step);
  return (
    <div className="flex items-center gap-1.5" aria-hidden="true">
      {steps.map((item, index) => (
        <span
          key={item}
          className={cn(
            "h-0.5 w-6 rounded-full transition-colors duration-[var(--dur-short)]",
            index <= current ? "bg-primary" : "bg-rule",
          )}
        />
      ))}
    </div>
  );
}

function StrengthMeter({ password }: { password: string }) {
  const { t } = useT();
  const evaluation = useMemo(() => evaluatePassword(password), [password]);
  const colors = [
    "bg-destructive",
    "bg-destructive",
    "bg-primary",
    "bg-success",
    "bg-success",
  ];
  const labels = [
    t("password.score0"),
    t("password.score1"),
    t("password.score2"),
    t("password.score3"),
    t("password.score4"),
  ];
  return (
    <div className="space-y-2" aria-live="polite">
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              password.length === 0
                ? "bg-muted"
                : index < Math.max(1, evaluation.score)
                  ? colors[evaluation.score]
                  : "bg-muted",
            )}
          />
        ))}
      </div>
      {password ? (
        <p className="text-muted-foreground text-xs">
          {t("password.strength")}:{" "}
          <span
            className={cn(
              "font-semibold",
              evaluation.score >= 3
                ? "text-success"
                : evaluation.score === 2
                  ? "text-primary"
                  : "text-destructive",
            )}
          >
            {labels[evaluation.score]}
          </span>
        </p>
      ) : null}
    </div>
  );
}

function PasswordRequirements({ password }: { password: string }) {
  const { t } = useT();
  const evaluation = evaluatePassword(password);
  const checks = [
    {
      label: t("password.reqLength"),
      ok: evaluation.length >= 10,
    },
    {
      label: t("password.reqVariety"),
      ok: evaluation.characterClasses >= 3,
    },
    {
      label: t("password.reqCommon"),
      ok: !evaluation.issues.includes("COMMON_PASSWORD"),
    },
    {
      label: t("password.reqSequence"),
      ok: !evaluation.issues.includes("SEQUENTIAL"),
    },
    {
      label: t("password.reqRepeat"),
      ok: !evaluation.issues.includes("REPEATED"),
    },
  ];
  return (
    <ul className="space-y-1.5">
      {checks.map((check) => (
        <li
          key={check.label}
          className={cn(
            "flex items-center gap-2 text-xs",
            check.ok ? "text-success" : "text-muted-foreground",
          )}
        >
          <span
            className={cn(
              "flex size-4 items-center justify-center rounded-full border",
              check.ok
                ? "border-success/30 bg-success/10"
                : "border-border",
            )}
          >
            {check.ok ? <CheckIcon className="size-2.5" /> : null}
          </span>
          {check.label}
        </li>
      ))}
    </ul>
  );
}

export function OnboardingWizard() {
  const { t } = useT();
  const [step, setStep] = useState<Step>("welcome");
  const [mode, setMode] = useState<Mode>("create");
  const [mnemonic, setMnemonic] = useState("");
  const [challenge, setChallenge] = useState<WordChallenge[]>([]);
  const [answers, setAnswers] = useState<string[]>(["", "", ""]);
  const [importText, setImportText] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [writtenDown, setWrittenDown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const words = useMemo(() => splitMnemonic(mnemonic), [mnemonic]);
  const evaluation = evaluatePassword(password);
  const canSubmitPassword =
    evaluation.valid && password === confirmPassword && password.length > 0;

  function startCreate() {
    setMode("create");
    setMnemonic(generateWalletMnemonic());
    setError(null);
    setWrittenDown(false);
    setStep("create");
  }

  function startImport() {
    setMode("import");
    setImportText("");
    setError(null);
    setStep("import");
  }

  function goWelcome() {
    setMnemonic("");
    setChallenge([]);
    setAnswers(["", "", ""]);
    setImportText("");
    setPassword("");
    setConfirmPassword("");
    setError(null);
    setStep("welcome");
  }

  function goToVerify() {
    if (!isValidMnemonic(mnemonic)) return;
    setChallenge(createWordChallenge(mnemonic, 3));
    setAnswers(["", "", ""]);
    setError(null);
    setStep("verify");
  }

  function verifyChallenge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!verifyWordChallenge(mnemonic, challenge, answers)) {
      setError(t("onboarding.verificationFailed"));
      return;
    }
    setError(null);
    setStep("password");
  }

  function submitImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = normalizeMnemonic(importText);
    const entered = splitMnemonic(normalized);
    if (entered.length !== 12 || entered.some((word) => !isKnownWord(word))) {
      setError(t("onboarding.invalidMnemonic"));
      return;
    }
    if (!isValidMnemonic(normalized)) {
      setError(t("onboarding.checksumError"));
      return;
    }
    setMnemonic(normalized);
    setError(null);
    setStep("password");
  }

  async function finishOnboarding(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmitPassword || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await completeOnboarding({ mnemonic, password });
      setMnemonic("");
      setPassword("");
      setConfirmPassword("");
    } catch (caught) {
      if (isWalletError(caught)) {
        if (caught.code === "WEAK_PASSWORD") {
          setError(t("onboarding.passwordWeak"));
        } else if (caught.code === "INVALID_MNEMONIC") {
          setError(t("onboarding.invalidMnemonic"));
        } else if (caught.code === "INDEXEDDB_UNAVAILABLE") {
          setError(t("errors.indexedDb"));
        } else {
          setError(t("errors.generic"));
        }
      } else {
        setError(t("errors.generic"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function copyPhrase() {
    try {
      await navigator.clipboard.writeText(mnemonic);
      setCopied(true);
      toast.warning(t("toast.phraseCopied"));
      window.setTimeout(() => setCopied(false), 2_000);
    } catch {
      toast.error(t("toast.copyFailed"));
    }
  }

  function back() {
    setError(null);
    if (step === "create" || step === "import") {
      goWelcome();
    } else if (step === "verify") {
      setStep("create");
    } else if (step === "password") {
      setStep(mode === "create" ? "verify" : "import");
      setPassword("");
      setConfirmPassword("");
    }
  }

  const welcomeFooter =
    step === "welcome" ? (
      <div className="flex flex-col gap-10 pt-40">
        <div>
          <p className="text-base font-medium">{t("legal.title")}</p>
          <LegalDisclosures compact />
        </div>
        <div>
          <p className="text-base font-medium">{t("settings.contact")}</p>
          <ContactLinks compact className="mt-4" />
        </div>
      </div>
    ) : undefined;

  return (
    <AuthScene
      title={t("onboarding.welcomeTitle")}
      description={t("onboarding.welcomeDescription")}
      panelClassName="max-w-[560px] lg:justify-self-end"
      footer={welcomeFooter}
    >
      <div className="p-6 sm:p-8">
        {step === "welcome" ? (
          <div>
            <div className="divide-y divide-rule border-y border-rule">
              <a
                href="#create-wallet"
                onClick={(event) => {
                  event.preventDefault();
                  startCreate();
                }}
                className="group flex w-full items-center gap-5 py-7 text-start transition-colors duration-[var(--dur-short)] hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
              >
                <WalletCardsIcon className="text-muted-foreground group-hover:text-primary size-6 shrink-0 transition-colors duration-[var(--dur-short)]" />
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-medium">
                    {t("onboarding.createWallet")}
                  </span>
                  <span className="text-muted-foreground mt-1 block text-sm leading-6">
                    {t("onboarding.createDescription")}
                  </span>
                </span>
                <ArrowRightIcon className="text-muted-foreground size-5 shrink-0 rtl:rotate-180" />
              </a>
              <a
                href="#import-wallet"
                onClick={(event) => {
                  event.preventDefault();
                  startImport();
                }}
                className="group flex w-full items-center gap-4 py-5 text-start transition-colors duration-[var(--dur-short)] hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
              >
                <DownloadIcon className="text-muted-foreground group-hover:text-primary size-6 shrink-0 transition-colors duration-[var(--dur-short)]" />
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-medium">
                    {t("onboarding.importWallet")}
                  </span>
                  <span className="text-muted-foreground mt-1 block text-sm leading-6">
                    {t("onboarding.importDescription")}
                  </span>
                </span>
                <ArrowRightIcon className="text-muted-foreground size-5 shrink-0 rtl:rotate-180" />
              </a>
            </div>

            <div className="text-muted-foreground mt-5 flex items-start gap-2 text-xs leading-5">
              <ShieldCheckIcon className="mt-0.5 size-4 shrink-0" />
              <p>{t("onboarding.securityNote")}</p>
            </div>

          </div>
        ) : null}

        {step === "create" ? (
          <div>
            <div>
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-[1.5rem] leading-tight">
                  {t("onboarding.createTitle")}
                </h2>
                <StepProgress step={step} mode={mode} />
              </div>
              <p className="text-muted-foreground mt-2 text-sm leading-6">
                {t("onboarding.createStepDescription")}
              </p>
            </div>
            <div className="mt-6 space-y-4">
                <div className="text-muted-foreground border-accent-2 flex items-start gap-2.5 border-s-2 ps-3 text-xs leading-5">
                  <TriangleAlertIcon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                  <div>
                    <p className="font-medium">
                      {t("onboarding.mnemonicWarning")}
                    </p>
                    <p className="text-muted-foreground mt-1">
                      {t("onboarding.mnemonicScreenshot")}
                    </p>
                  </div>
                </div>

                <MnemonicGrid words={words} />

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => void copyPhrase()}
                  >
                    {copied ? <CopyCheckIcon /> : <ClipboardIcon />}
                    {t("onboarding.copyPhrase")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={startCreate}
                    aria-label={t("common.refresh")}
                  >
                    <RefreshCwIcon />
                    {t("common.refresh")}
                  </Button>
                </div>

                <label className="flex cursor-pointer items-start gap-3 rounded-[10px] border border-rule p-3 text-sm">
                  <input
                    type="checkbox"
                    checked={writtenDown}
                    onChange={(event) => setWrittenDown(event.target.checked)}
                    className="accent-primary mt-0.5 size-4"
                  />
                  <span>{t("onboarding.writtenDown")}</span>
                </label>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={back}
                    className="flex-1"
                  >
                    <ArrowLeftIcon />
                    {t("common.back")}
                  </Button>
                  <Button
                    type="button"
                    className="flex-[2]"
                    disabled={!writtenDown}
                    onClick={goToVerify}
                  >
                    {t("common.continue")}
                    <ArrowRightIcon />
                  </Button>
                </div>
            </div>
          </div>
          ) : null}

          {step === "verify" ? (
            <div>
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-[1.5rem] leading-tight">
                  {t("onboarding.verifyTitle")}
                </h2>
                <StepProgress step={step} mode={mode} />
              </div>
              <p className="text-muted-foreground mt-2 text-sm leading-6">
                {t("onboarding.verifyDescription")}
              </p>
              <div className="mt-6">
                <form
                  onSubmit={verifyChallenge}
                  className="space-y-4"
                >
                  <div className="space-y-3">
                    {challenge.map((entry, index) => (
                      <div key={entry.index} className="space-y-1.5">
                        <Label htmlFor={`challenge-${index}`}>
                          {t("onboarding.wordNumber", {
                            number: entry.index + 1,
                          })}
                        </Label>
                        <Input
                          id={`challenge-${index}`}
                          value={answers[index] ?? ""}
                          onChange={(event) => {
                            const next = [...answers];
                            next[index] = event.target.value
                              .trim()
                              .toLowerCase();
                            setAnswers(next);
                            if (error) setError(null);
                          }}
                          placeholder={t("onboarding.wordPlaceholder")}
                          autoComplete="off"
                          autoCapitalize="none"
                          spellCheck={false}
                          className="font-mono"
                          aria-invalid={Boolean(error)}
                          autoFocus={index === 0}
                        />
                      </div>
                    ))}
                  </div>

                  {error ? (
                    <div
                      role="alert"
                      className="text-destructive border-s-2 border-destructive ps-3 text-xs leading-5"
                    >
                      {error}
                    </div>
                  ) : null}

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={back}
                      className="flex-1"
                    >
                      <ArrowLeftIcon />
                      {t("common.back")}
                    </Button>
                    <Button
                      type="submit"
                      className="flex-[2]"
                      disabled={answers.some((answer) => !answer.trim())}
                    >
                      {t("onboarding.verify")}
                      <ArrowRightIcon />
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          ) : null}

          {step === "import" ? (
            <div>
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-[1.5rem] leading-tight">
                  {t("onboarding.importTitle")}
                </h2>
                <StepProgress step={step} mode={mode} />
              </div>
              <p className="text-muted-foreground mt-2 text-sm leading-6">
                {t("onboarding.importStepDescription")}
              </p>
              <div className="mt-6">
                <form onSubmit={submitImport} className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="import-phrase">
                        {t("onboarding.importTitle")}
                      </Label>
                      <span className="text-muted-foreground text-xs tabular-nums">
                        {t("onboarding.wordCount", {
                          count: splitMnemonic(importText).length,
                        })}
                      </span>
                    </div>
                    <Textarea
                      id="import-phrase"
                      value={importText}
                      onChange={(event) => {
                        setImportText(event.target.value);
                        if (error) setError(null);
                      }}
                      placeholder={t("onboarding.importPlaceholder")}
                      autoComplete="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      className="min-h-36 font-mono text-base leading-relaxed"
                      aria-invalid={Boolean(error)}
                      autoFocus
                    />
                    <p className="text-muted-foreground text-xs">
                      {t("onboarding.pasteHint")}
                    </p>
                  </div>

                  {error ? (
                    <div
                      role="alert"
                      className="text-destructive border-s-2 border-destructive ps-3 text-xs leading-5"
                    >
                      {error}
                    </div>
                  ) : null}

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={back}
                      className="flex-1"
                    >
                      <ArrowLeftIcon />
                      {t("common.back")}
                    </Button>
                    <Button
                      type="submit"
                      className="flex-[2]"
                      disabled={splitMnemonic(importText).length !== 12}
                    >
                      {t("common.continue")}
                      <ArrowRightIcon />
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          ) : null}

          {step === "password" ? (
            <div>
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-[1.5rem] leading-tight">
                  {t("onboarding.passwordTitle")}
                </h2>
                <StepProgress step={step} mode={mode} />
              </div>
              <p className="text-muted-foreground mt-2 text-sm leading-6">
                {t("onboarding.passwordDescription")}
              </p>
              <div className="mt-6">
                <form
                  onSubmit={(event) => void finishOnboarding(event)}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="new-password">
                      {t("onboarding.password")}
                    </Label>
                    <PasswordInput
                      id="new-password"
                      value={password}
                      onChange={(value) => {
                        setPassword(value);
                        if (error) setError(null);
                      }}
                      placeholder={t("onboarding.passwordPlaceholder")}
                      autoComplete="new-password"
                      autoFocus
                      disabled={submitting}
                    />
                  </div>

                  <StrengthMeter password={password} />
                  <PasswordRequirements password={password} />

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">
                      {t("onboarding.passwordConfirm")}
                    </Label>
                    <PasswordInput
                      id="confirm-password"
                      value={confirmPassword}
                      onChange={(value) => {
                        setConfirmPassword(value);
                        if (error) setError(null);
                      }}
                      placeholder={t("onboarding.confirmPlaceholder")}
                      autoComplete="new-password"
                      disabled={submitting}
                      aria-invalid={
                        Boolean(confirmPassword) &&
                        password !== confirmPassword
                      }
                    />
                    {confirmPassword ? (
                      <p
                        className={cn(
                          "text-xs",
                          password === confirmPassword
                            ? "text-success"
                            : "text-destructive",
                        )}
                      >
                        {password === confirmPassword
                          ? t("password.match")
                          : t("password.mismatch")}
                      </p>
                    ) : null}
                  </div>

                  {error ? (
                    <div
                      role="alert"
                      className="text-destructive border-s-2 border-destructive ps-3 text-xs leading-5"
                    >
                      {error}
                    </div>
                  ) : null}

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={back}
                      className="flex-1"
                      disabled={submitting}
                    >
                      <ArrowLeftIcon />
                      {t("common.back")}
                    </Button>
                    <Button
                      type="submit"
                      className="flex-[2]"
                      disabled={!canSubmitPassword || submitting}
                    >
                      {submitting ? (
                        <>
                          <RefreshCwIcon className="animate-spin" />
                          {t("onboarding.saving")}
                        </>
                      ) : (
                        <>
                          <ShieldCheckIcon />
                          {mode === "create"
                            ? t("onboarding.createWalletButton")
                            : t("onboarding.importWalletButton")}
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          ) : null}
      </div>
    </AuthScene>
  );
}
