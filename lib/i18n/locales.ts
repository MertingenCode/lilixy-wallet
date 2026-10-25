export const SUPPORTED_LOCALES = [
  "en",
  "tr",
  "es",
  "de",
  "fr",
  "ru",
  "ar",
  "zh",
  "ja",
] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];
export type LocalePreference = "auto" | AppLocale;

export interface LocaleMeta {
  code: AppLocale;
  nativeName: string;
  englishName: string;
  intlLocale: string;
  dir: "ltr" | "rtl";
}

export const LOCALE_META: Record<AppLocale, LocaleMeta> = {
  en: {
    code: "en",
    nativeName: "English",
    englishName: "English",
    intlLocale: "en-US",
    dir: "ltr",
  },
  tr: {
    code: "tr",
    nativeName: "Türkçe",
    englishName: "Turkish",
    intlLocale: "tr-TR",
    dir: "ltr",
  },
  es: {
    code: "es",
    nativeName: "Español",
    englishName: "Spanish",
    intlLocale: "es-ES",
    dir: "ltr",
  },
  de: {
    code: "de",
    nativeName: "Deutsch",
    englishName: "German",
    intlLocale: "de-DE",
    dir: "ltr",
  },
  fr: {
    code: "fr",
    nativeName: "Français",
    englishName: "French",
    intlLocale: "fr-FR",
    dir: "ltr",
  },
  ru: {
    code: "ru",
    nativeName: "Русский",
    englishName: "Russian",
    intlLocale: "ru-RU",
    dir: "ltr",
  },
  ar: {
    code: "ar",
    nativeName: "العربية",
    englishName: "Arabic",
    intlLocale: "ar-EG",
    dir: "rtl",
  },
  zh: {
    code: "zh",
    nativeName: "简体中文",
    englishName: "Chinese",
    intlLocale: "zh-CN",
    dir: "ltr",
  },
  ja: {
    code: "ja",
    nativeName: "日本語",
    englishName: "Japanese",
    intlLocale: "ja-JP",
    dir: "ltr",
  },
};

export function isSupportedLocale(value: string): value is AppLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function normalizeLocaleTag(value: string): string {
  return value.trim().toLowerCase().split(/[-_]/u)[0] ?? "";
}

/**
 * navigator.languages is preferred so the first supported user preference wins.
 * Unsupported/browserless environments intentionally fall back to English.
 */
export function detectDeviceLocale(): AppLocale {
  if (typeof navigator === "undefined") return "en";
  const languages =
    navigator.languages && navigator.languages.length > 0
      ? navigator.languages
      : [navigator.language];
  for (const language of languages) {
    const normalized = normalizeLocaleTag(language);
    if (isSupportedLocale(normalized)) return normalized;
  }
  return "en";
}

export function resolveLocale(preference: LocalePreference): AppLocale {
  return preference === "auto" ? detectDeviceLocale() : preference;
}
