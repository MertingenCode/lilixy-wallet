"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { SettingsRow } from "@/components/settings/settings-section";
import { Switch } from "@/components/ui/switch";
import { useT } from "@/hooks/use-locale";
import {
  enrollBiometric,
  hasBiometricEnrollment,
  isBiometricAvailable,
  removeBiometric,
} from "@/lib/wallet/biometric";
import { getSessionMemory } from "@/lib/wallet/session-memory";
import { getActiveWalletId } from "@/lib/wallet/wallets";
import { useSettingsStore } from "@/store/settings";

export function BiometricSetting({ address }: { address: string | null }) {
  const { t } = useT();
  const walletId = getActiveWalletId() ?? "primary";
  const enabled = useSettingsStore((state) => state.biometricEnabled);
  const setBiometricEnabled = useSettingsStore(
    (state) => state.setBiometricEnabled,
  );
  const [available, setAvailable] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setEnrolled(hasBiometricEnrollment(walletId));
    void isBiometricAvailable().then((supported) => {
      if (!cancelled) setAvailable(supported);
    });
    return () => {
      cancelled = true;
    };
  }, [address, walletId]);

  async function toggle(checked: boolean) {
    if (working) return;
    setError(null);
    if (!checked) {
      setBiometricEnabled(false);
      removeBiometric(walletId);
      setEnrolled(false);
      toast.success(t("settings.biometricDisabled"));
      return;
    }

    setBiometricEnabled(true);

    const session = getSessionMemory();
    if (!session) {
      setError(t("settings.biometricNoSession"));
      return;
    }

    setWorking(true);
    try {
      await enrollBiometric(walletId, session.mnemonic);
      setEnrolled(true);
      toast.success(t("settings.biometricEnabled"));
    } catch {
      setError(t("settings.biometricFailed"));
    } finally {
      setWorking(false);
    }
  }

  const description = !available
    ? t("settings.biometricUnsupported")
    : enrolled
      ? t("settings.biometricEnabledDescription")
      : enabled
        ? t("settings.biometricAuto")
        : t("settings.biometricDescription");

  return (
    <SettingsRow
      label={t("settings.biometric")}
      description={description}
    >
      <div className="flex flex-col items-end gap-1">
        <Switch
          checked={enabled}
          onCheckedChange={(checked) => void toggle(checked)}
          disabled={!available || working || !address}
          aria-label={t("settings.biometric")}
        />
        {error ? (
          <span className="text-destructive max-w-[14rem] text-end text-[0.6875rem]">
            {error}
          </span>
        ) : null}
      </div>
    </SettingsRow>
  );
}
