"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useQueryClient } from "@tanstack/react-query";
import {
  Clock3Icon,
  EyeIcon,
  FileTextIcon,
  HistoryIcon,
  InfoIcon,
  KeyRoundIcon,
  LanguagesIcon,
  LockKeyholeIcon,
  MessageCircleIcon,
  MonitorIcon,
  MoonIcon,
  PaletteIcon,
  RotateCcwIcon,
  ShieldCheckIcon,
  SunIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { Logo } from "@/components/brand/logo";
import { PageHeader } from "@/components/common/page-header";
import { AddressBookSection } from "@/components/settings/address-book-section";
import { ChangePasswordDialog } from "@/components/settings/change-password-dialog";
import { ContactLinks } from "@/components/settings/contact-links";
import { LegalDisclosures } from "@/components/settings/legal-disclosures";
import { PendingTransactions } from "@/components/settings/pending-transactions";
import { RecoveryPhraseDialog } from "@/components/settings/recovery-phrase-dialog";
import { ResetWalletDialog } from "@/components/settings/reset-wallet-dialog";
import {
  SettingsRow,
  SettingsSection,
} from "@/components/settings/settings-section";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT } from "@/hooks/use-locale";
import {
  AUTO_LOCK_OPTIONS,
  FIAT_CURRENCIES,
  type AutoLockOption,
  type FiatCurrency,
} from "@/lib/config/types";
import { APP_VERSION } from "@/lib/config/app";
import {
  LOCALE_META,
  SUPPORTED_LOCALES,
  resolveLocale,
  type LocalePreference,
} from "@/lib/i18n/locales";
import { formatCurrency } from "@/lib/i18n/format";
import { clearAllTransactions } from "@/lib/db/transactions-repo";
import { lockWallet } from "@/lib/wallet/controller";
import { useSettingsStore } from "@/store/settings";
import { useSessionStore } from "@/store/session";
import { cn, shortenAddress } from "@/lib/utils";

function ThemeChoice() {
  const { t } = useT();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const value = mounted ? (theme ?? "system") : "system";

  const options = [
    { value: "system", label: t("settings.themeSystem"), icon: MonitorIcon },
    { value: "light", label: t("settings.themeLight"), icon: SunIcon },
    { value: "dark", label: t("settings.themeDark"), icon: MoonIcon },
  ];

  return (
    <div className="flex flex-wrap gap-1">
      {options.map((option) => {
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setTheme(option.value)}
            className={cn(
              "flex h-9 items-center justify-center gap-1.5 rounded-full border px-3 text-[0.6875rem] font-medium transition-colors duration-[var(--dur-short)]",
              value === option.value
                ? "border-rule bg-paper-3 text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
            aria-pressed={value === option.value}
          >
            <Icon className="size-3.5" />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function FontSizeChoice() {
  const { t } = useT();
  const fontScale = useSettingsStore((state) => state.fontScale);
  const setFontScale = useSettingsStore((state) => state.setFontScale);
  const options = [
    {
      value: "small",
      label: t("settings.fontSizeSmall"),
      sample: "text-[0.75rem]",
    },
    {
      value: "default",
      label: t("settings.fontSizeDefault"),
      sample: "text-[0.875rem]",
    },
    {
      value: "large",
      label: t("settings.fontSizeLarge"),
      sample: "text-[1rem]",
    },
  ] as const;

  return (
    <div
      className="flex flex-wrap gap-1"
      role="group"
      aria-label={t("settings.fontSize")}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => setFontScale(option.value)}
          aria-pressed={fontScale === option.value}
          className={cn(
            "flex h-9 items-center justify-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors duration-[var(--dur-short)]",
            fontScale === option.value
              ? "border-rule bg-paper-3 text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          <span className={cn("font-display leading-none", option.sample)}>
            A
          </span>
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function SettingsPage() {
  const { t } = useT();
  const queryClient = useQueryClient();
  const settings = useSettingsStore();
  const address = useSessionStore((state) => state.address);
  const [changeOpen, setChangeOpen] = useState(false);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [clearHistoryOpen, setClearHistoryOpen] = useState(false);

  const resolvedLocale = resolveLocale(settings.locale);

  function lockNow() {
    lockWallet();
    toast.success(t("toast.locked"));
  }

  async function clearHistory() {
    await clearAllTransactions();
    await queryClient.invalidateQueries({ queryKey: ["history"] });
    await queryClient.invalidateQueries({
      queryKey: ["pending-transactions"],
    });
    setClearHistoryOpen(false);
    toast.success(t("settings.localHistoryCleared"));
  }

  return (
    <div className="animate-enter mx-auto w-full max-w-[840px]">
      <PageHeader
        title={t("settings.title")}
        description={t("settings.description")}
      />

      {address ? (
        <div className="glass-panel mb-8 flex items-center gap-3 p-5">
          <div className="min-w-0 flex-1">
            <p className="text-muted-foreground text-xs">
              {t("settings.walletAddress")}
            </p>
            <code className="mt-1 block break-all font-mono text-xs leading-5">
              {address}
            </code>
          </div>
          <span className="text-muted-foreground hidden text-xs sm:block">
            {shortenAddress(address, 5)}
          </span>
        </div>
      ) : null}

      <div className="mt-2">
        <SettingsSection
          icon={PaletteIcon}
          title={t("settings.general")}
          description={t("settings.appearanceDescription")}
        >
          <SettingsRow label={t("settings.theme")}>
            <ThemeChoice />
          </SettingsRow>
          <SettingsRow
            label={t("settings.fontSize")}
            description={t("settings.fontSizeDescription")}
          >
            <FontSizeChoice />
          </SettingsRow>
          <SettingsRow label={t("settings.language")}>
            <Select
              value={settings.locale}
              onValueChange={(value) =>
                settings.setLocale(value as LocalePreference)
              }
            >
              <SelectTrigger className="w-[10.5rem]">
                <SelectValue>
                  {settings.locale === "auto"
                    ? t("settings.languageAuto")
                    : LOCALE_META[resolvedLocale].nativeName}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-80">
                <SelectItem value="auto">{t("settings.languageAuto")}</SelectItem>
                {SUPPORTED_LOCALES.map((code) => (
                  <SelectItem key={code} value={code}>
                    {LOCALE_META[code].nativeName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingsRow>
          <SettingsRow
            label={t("settings.currency")}
            description={t("settings.fiatNote")}
          >
            <Select
              value={settings.currency}
              onValueChange={(value) =>
                settings.setCurrency(value as FiatCurrency)
              }
            >
              <SelectTrigger className="w-[9rem]">
                <SelectValue>{settings.currency}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {FIAT_CURRENCIES.map((currency) => (
                  <SelectItem key={currency} value={currency}>
                    {currency} ({formatCurrency(1234.5, currency, resolvedLocale)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingsRow>
        </SettingsSection>

        <AddressBookSection />

        <SettingsSection
          icon={ShieldCheckIcon}
          title={t("settings.security")}
          description={t("lock.securityNote")}
        >
          <SettingsRow
            label={t("settings.autoLock")}
            description={t("settings.autoLockDescription")}
          >
            <Select
              value={String(settings.autoLock)}
              onValueChange={(value) =>
                settings.setAutoLock(
                  (value === "tab-close"
                    ? "tab-close"
                    : Number(value)) as AutoLockOption,
                )
              }
            >
              <SelectTrigger className="w-[10.5rem]">
                <SelectValue>
                  {settings.autoLock === "tab-close"
                    ? t("settings.autoLockTab")
                    : t("settings.minutes", { count: settings.autoLock })}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {AUTO_LOCK_OPTIONS.map((option) => (
                  <SelectItem key={String(option)} value={String(option)}>
                    {option === "tab-close"
                      ? t("settings.autoLockTab")
                      : t("settings.minutes", { count: option })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingsRow>
          <SettingsRow
            label={t("settings.changePassword")}
            description={t("settings.changePasswordDescription")}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={() => setChangeOpen(true)}
            >
              <KeyRoundIcon />
              {t("common.edit")}
            </Button>
          </SettingsRow>
          <SettingsRow
            label={t("settings.showRecovery")}
            description={t("settings.showRecoveryDescription")}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRecoveryOpen(true)}
            >
              <EyeIcon />
              {t("common.show")}
            </Button>
          </SettingsRow>
          <SettingsRow
            label={t("settings.lockNow")}
            description={t("settings.lockNowDescription")}
          >
            <Button variant="secondary" size="sm" onClick={lockNow}>
              <LockKeyholeIcon />
              {t("nav.lock")}
            </Button>
          </SettingsRow>
        </SettingsSection>

        <SettingsSection
          icon={HistoryIcon}
          title={t("settings.localHistory")}
          description={t("settings.localHistoryDescription")}
        >
          <SettingsRow
            label={t("settings.clearLocalHistory")}
            description={t("settings.clearLocalHistoryDescription")}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={() => setClearHistoryOpen(true)}
            >
              <Trash2Icon />
              {t("common.delete")}
            </Button>
          </SettingsRow>
        </SettingsSection>

        <SettingsSection
          icon={Clock3Icon}
          title={t("settings.pending")}
          description={t("settings.pendingDescription")}
        >
          <PendingTransactions />
        </SettingsSection>

        <SettingsSection
          icon={MessageCircleIcon}
          title={t("settings.contact")}
          description={t("settings.contactDescription")}
        >
          <ContactLinks />
        </SettingsSection>

        <SettingsSection
          icon={FileTextIcon}
          title={t("legal.title")}
          description={t("legal.description")}
        >
          <LegalDisclosures />
        </SettingsSection>

        <SettingsSection
          icon={InfoIcon}
          title={t("settings.about")}
          description={t("settings.aboutDescription")}
        >
          <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Logo />
              <p className="text-muted-foreground text-xs">v{APP_VERSION}</p>
            </div>
            <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
              <span className="flex items-center gap-1.5">
                <ShieldCheckIcon className="size-4" />
                {t("settings.privacy")}
              </span>
              <span className="flex items-center gap-1.5">
                <LanguagesIcon className="size-4" />
                {t("settings.languagesCount", {
                  count: SUPPORTED_LOCALES.length,
                })}
              </span>
            </div>
          </div>
          <div className="border-t px-4 pb-4 pt-3">
            <p className="text-muted-foreground text-[0.6875rem] leading-5">
              {t("settings.dataSources")}{" "}
              <a
                href="https://www.coingecko.com"
                target="_blank"
                rel="noreferrer noopener"
                className="underline underline-offset-2 hover:text-foreground"
              >
                CoinGecko
              </a>
            </p>
          </div>
          <div className="border-t p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-destructive text-sm font-medium">
                  {t("settings.dangerZone")}
                </p>
                <p className="text-muted-foreground mt-0.5 max-w-lg text-xs leading-5">
                  {t("settings.resetDescription")}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setResetOpen(true)}
                className="text-destructive shrink-0"
              >
                <RotateCcwIcon />
                {t("settings.resetWallet")}
              </Button>
            </div>
          </div>
        </SettingsSection>
      </div>

      <footer className="text-muted-foreground flex flex-col items-center gap-1 py-5 text-[0.6875rem]">
        <p>{t("footer.rights")}</p>
        <p>{t("settings.builtBy")}</p>
      </footer>

      <ChangePasswordDialog open={changeOpen} onOpenChange={setChangeOpen} />
      <RecoveryPhraseDialog open={recoveryOpen} onOpenChange={setRecoveryOpen} />
      <ResetWalletDialog open={resetOpen} onOpenChange={setResetOpen} />

      <AlertDialog
        open={clearHistoryOpen}
        onOpenChange={setClearHistoryOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("settings.clearLocalHistoryTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("settings.clearLocalHistoryConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void clearHistory()}>
              {t("settings.clearLocalHistory")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
