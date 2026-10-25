"use client";

import { useTranslation } from "react-i18next";

import {
  LOCALE_META,
  resolveLocale,
  type AppLocale,
} from "@/lib/i18n/locales";
import { useSettingsStore } from "@/store/settings";

export function useAppLocale(): {
  locale: AppLocale;
  dir: "ltr" | "rtl";
  setLocale: (value: string) => void;
} {
  const preference = useSettingsStore((state) => state.locale);
  const setLocale = useSettingsStore((state) => state.setLocale);
  const locale = resolveLocale(preference);
  return {
    locale,
    dir: LOCALE_META[locale].dir,
    setLocale: (value) => {
      if (value === "auto") {
        setLocale("auto");
        return;
      }
      if (value in LOCALE_META) {
        setLocale(value as AppLocale);
      }
    },
  };
}

export function useT() {
  const { t } = useTranslation();
  const { locale, dir } = useAppLocale();
  return { t, locale, dir };
}
