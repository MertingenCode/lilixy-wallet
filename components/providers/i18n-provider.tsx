"use client";

import { useEffect, useState, type ReactNode } from "react";
import { I18nextProvider } from "react-i18next";

import i18n, { changeAppLanguage } from "@/lib/i18n";
import {
  LOCALE_META,
  resolveLocale,
} from "@/lib/i18n/locales";
import { useSettingsStore } from "@/store/settings";

export function I18nProvider({ children }: { children: ReactNode }) {
  const preference = useSettingsStore((state) => state.locale);
  const [mounted, setMounted] = useState(false);
  const locale = resolveLocale(preference);
  const meta = LOCALE_META[locale];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    void changeAppLanguage(locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = meta.dir;
  }, [locale, meta.dir, mounted]);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
