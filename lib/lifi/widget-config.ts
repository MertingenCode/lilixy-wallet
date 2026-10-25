import type { WidgetConfig } from "@lifi/widget";

import { designTokens } from "@/lib/design/tokens";
import type { AppLocale } from "@/lib/i18n/locales";
import {
  LIFI_API_KEY,
  LIFI_FEE,
  LIFI_INTEGRATOR,
} from "@/lib/lifi/config";

type LifiLanguage =
  | "en"
  | "es"
  | "fr"
  | "de"
  | "ja"
  | "zh"
  | "tr";

const LANGUAGE_MAP: Partial<Record<AppLocale, LifiLanguage>> = {
  en: "en",
  tr: "tr",
  es: "es",
  de: "de",
  fr: "fr",
  ja: "ja",
  zh: "zh",
};

export function lifiLanguageForLocale(locale: AppLocale): LifiLanguage {
  // LI.FI v3 has no Arabic or Russian resource. Fall back to English for those
  // locales and document the limitation instead of mixing a wrong language.
  return LANGUAGE_MAP[locale] ?? "en";
}

const PROXY_CHAIN_IDS = [1, 56, 137, 42161, 10, 8453, 43114, 146, 324, 4663];

function sdkRpcUrls(): Record<number, string[]> {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  return Object.fromEntries(
    PROXY_CHAIN_IDS.map((chainId) => [
      chainId,
      [`${origin}/api/rpc/${chainId}`],
    ]),
  );
}

const NATIVE_TOKEN = "0x0000000000000000000000000000000000000000";
const ETHEREUM_USDC = "0xA0b86991c6218b36c1d19d4a2e9Eb0cE3606eB48";

export interface WidgetTabLabels {
  swap: string;
  bridge: string;
}

export function createWidgetConfig({
  appearance,
  locale,
  tabLabels,
}: {
  appearance: "light" | "dark";
  locale: AppLocale;
  tabLabels: WidgetTabLabels;
}): WidgetConfig {
  const language = lifiLanguageForLocale(locale);
  const colors = designTokens.colors[appearance];
  const glassShell =
    appearance === "light"
      ? "linear-gradient(145deg, rgba(255, 255, 255, 0.6), rgba(191, 219, 254, 0.4))"
      : "linear-gradient(145deg, rgba(17, 27, 46, 0.68), rgba(30, 58, 138, 0.4))";
  const glassCard =
    appearance === "light"
      ? "rgba(255, 255, 255, 0.42)"
      : "rgba(17, 27, 46, 0.52)";
  const glassEdge =
    appearance === "light"
      ? "rgba(255, 255, 255, 0.72)"
      : "rgba(255, 255, 255, 0.12)";

  return {
    integrator: LIFI_INTEGRATOR,
    fee: LIFI_FEE,
    apiKey: LIFI_API_KEY,
    fromChain: 1,
    toChain: 1,
    fromToken: NATIVE_TOKEN,
    toToken: ETHEREUM_USDC,
    subvariant: "split",
    subvariantOptions: {
      split: { defaultTab: "swap" },
    },
    appearance,
    languages: {
      default: language,
      allow: [language],
    },
    languageResources: {
      [language]: {
        header: {
          swap: tabLabels.swap,
          bridge: tabLabels.bridge,
        },
        button: {
          swap: tabLabels.swap,
          bridge: tabLabels.bridge,
        },
      },
    },
    hiddenUI: [
      "walletMenu",
      "appearance",
      "language",
      "history",
      "drawerCloseButton",
    ],
    theme: {
      colorSchemes: {
        light: {
          palette: {
            mode: "light",
            primary: { main: colors.primary, contrastText: colors.primaryForeground },
            secondary: { main: colors.primary, contrastText: colors.primaryForeground },
            background: { default: "transparent", paper: glassCard },
            text: {
              primary: colors.foreground,
              secondary: colors.mutedForeground,
            },
            divider: colors.border,
          },
        },
        dark: {
          palette: {
            mode: "dark",
            primary: { main: colors.primary, contrastText: colors.primaryForeground },
            secondary: { main: colors.primary, contrastText: colors.primaryForeground },
            background: { default: "transparent", paper: glassCard },
            text: {
              primary: colors.foreground,
              secondary: colors.mutedForeground,
            },
            divider: colors.border,
          },
        },
      },
      shape: {
        borderRadius: designTokens.radius.card,
        borderRadiusSecondary: designTokens.radius.control,
        borderRadiusTertiary: designTokens.radius.small,
      },
      typography: {
        fontFamily: designTokens.font.body,
      },
      container: {
        width: "100%",
        maxWidth: "none",
        minHeight: "32rem",
        borderRadius: 22,
        border: `1px solid ${glassEdge}`,
        boxShadow: "0 30px 80px -42px rgba(37, 99, 235, 0.48)",
        background: glassShell,
        backdropFilter: "blur(26px) saturate(1.35)",
        WebkitBackdropFilter: "blur(26px) saturate(1.35)",
      },
      components: {
        MuiButton: {
          styleOverrides: {
            root: {
              textTransform: "none",
              fontWeight: 500,
              borderRadius: designTokens.radius.pill,
              boxShadow: "none",
            },
          },
        },
        MuiAppBar: {
          styleOverrides: {
            root: {
              background: "transparent",
              backgroundImage: "none",
              boxShadow: "none",
            },
          },
        },
        MuiCard: {
          styleOverrides: {
            root: {
              background: glassCard,
              backgroundImage: "none",
              backdropFilter: "blur(20px) saturate(1.25)",
              WebkitBackdropFilter: "blur(20px) saturate(1.25)",
              borderRadius: 16,
              border: `1px solid ${glassEdge}`,
              boxShadow: "none",
            },
          },
        },
        MuiInputCard: {
          styleOverrides: {
            root: {
              background: glassCard,
              backgroundImage: "none",
              backdropFilter: "blur(18px) saturate(1.2)",
              WebkitBackdropFilter: "blur(18px) saturate(1.2)",
              borderRadius: 14,
              border: `1px solid ${glassEdge}`,
            },
          },
        },
        MuiNavigationTabs: {
          styleOverrides: {
            root: {
              "& .MuiTabs-indicator": {
                backgroundColor: colors.primary,
                opacity: 1,
                borderRadius: 999,
              },
            },
          },
        },
        MuiNavigationTab: {
          styleOverrides: {
            root: {
              minHeight: 44,
              borderRadius: 999,
              fontWeight: 600,
              color: colors.mutedForeground,
              "&.Mui-selected": {
                color: colors.primaryForeground,
              },
            },
          },
        },
      },
    },
    walletConfig: {
      usePartialWalletManagement: false,
    },
    sdkConfig: {
      rpcUrls: sdkRpcUrls(),
    },
  };
}
