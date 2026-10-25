import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import ar from "@/locales/ar.json";
import de from "@/locales/de.json";
import en from "@/locales/en.json";
import es from "@/locales/es.json";
import fr from "@/locales/fr.json";
import ja from "@/locales/ja.json";
import ru from "@/locales/ru.json";
import tr from "@/locales/tr.json";
import zh from "@/locales/zh.json";
import {
  SUPPORTED_LOCALES,
  type AppLocale,
} from "@/lib/i18n/locales";

export const resources = {
  en: { translation: en },
  tr: { translation: tr },
  es: { translation: es },
  de: { translation: de },
  fr: { translation: fr },
  ru: { translation: ru },
  ar: { translation: ar },
  zh: { translation: zh },
  ja: { translation: ja },
} as const;

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources,
    lng: "en",
    fallbackLng: "en",
    supportedLngs: [...SUPPORTED_LOCALES],
    interpolation: { escapeValue: false },
    returnNull: false,
    initImmediate: false,
    react: { useSuspense: false },
  });
}

export function changeAppLanguage(locale: AppLocale) {
  return i18n.changeLanguage(locale);
}

export default i18n;
