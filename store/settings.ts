import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";

import {
  DEFAULT_AUTO_LOCK,
  type AutoLockOption,
  type CustomNetwork,
  type CustomToken,
  type FiatCurrency,
} from "@/lib/config/types";
import type { LocalePreference } from "@/lib/i18n/locales";

export type FontScale = "small" | "default" | "large";

interface SettingsState {
  locale: LocalePreference;
  fontScale: FontScale;
  currency: FiatCurrency;
  autoLock: AutoLockOption;
  activeChainId: number;
  customNetworks: CustomNetwork[];
  customTokens: CustomToken[];
  setLocale: (locale: LocalePreference) => void;
  setFontScale: (fontScale: FontScale) => void;
  setCurrency: (currency: FiatCurrency) => void;
  setAutoLock: (autoLock: AutoLockOption) => void;
  setActiveChainId: (chainId: number) => void;
  addCustomNetwork: (network: CustomNetwork) => void;
  updateCustomNetwork: (network: CustomNetwork) => void;
  removeCustomNetwork: (chainId: number) => void;
  addCustomToken: (token: CustomToken) => void;
  updateCustomToken: (token: CustomToken) => void;
  removeCustomToken: (id: string) => void;
  resetSettings: () => void;
}

const initialSettings = {
  locale: "auto" as LocalePreference,
  fontScale: "default" as FontScale,
  currency: "USD" as FiatCurrency,
  autoLock: DEFAULT_AUTO_LOCK,
  activeChainId: 1,
  customNetworks: [] as CustomNetwork[],
  customTokens: [] as CustomToken[],
};

const memoryStorage: StateStorage = {
  getItem: (name) => {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(name, value);
    } catch {
      // Private browsing/quota errors must not break the wallet UI.
    }
  },
  removeItem: (name) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(name);
    } catch {
      // ignore
    }
  },
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...initialSettings,
      setLocale: (locale) => set({ locale }),
      setFontScale: (fontScale) => set({ fontScale }),
      setCurrency: (currency) => set({ currency }),
      setAutoLock: (autoLock) => set({ autoLock }),
      setActiveChainId: (activeChainId) => set({ activeChainId }),
      addCustomNetwork: (network) =>
        set((state) => ({
          customNetworks: [
            ...state.customNetworks.filter(
              (item) => item.chainId !== network.chainId,
            ),
            network,
          ],
        })),
      updateCustomNetwork: (network) =>
        set((state) => ({
          customNetworks: state.customNetworks.map((item) =>
            item.chainId === network.chainId ? network : item,
          ),
        })),
      removeCustomNetwork: (chainId) =>
        set((state) => ({
          customNetworks: state.customNetworks.filter(
            (item) => item.chainId !== chainId,
          ),
          customTokens: state.customTokens.filter(
            (token) => token.chainId !== chainId,
          ),
        })),
      addCustomToken: (token) =>
        set((state) => ({
          customTokens: [
            ...state.customTokens.filter((item) => item.id !== token.id),
            token,
          ],
        })),
      updateCustomToken: (token) =>
        set((state) => ({
          customTokens: state.customTokens.map((item) =>
            item.id === token.id ? token : item,
          ),
        })),
      removeCustomToken: (id) =>
        set((state) => ({
          customTokens: state.customTokens.filter((item) => item.id !== id),
        })),
      resetSettings: () => set({ ...initialSettings }),
    }),
    {
      name: "lilixy.settings.v1",
      version: 1,
      storage: createJSONStorage(() => memoryStorage),
      partialize: (state) => ({
        locale: state.locale,
        fontScale: state.fontScale,
        currency: state.currency,
        autoLock: state.autoLock,
        activeChainId: state.activeChainId,
        customNetworks: state.customNetworks,
        customTokens: state.customTokens,
      }),
    },
  ),
);
