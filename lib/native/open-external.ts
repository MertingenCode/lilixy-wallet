import type { MouseEvent } from "react";

type CapacitorBrowser = {
  open?: (options: { url: string }) => Promise<unknown>;
};

type NativeWindow = Window & {
  electronAPI?: {
    openExternal?: (url: string) => Promise<unknown>;
  };
  Capacitor?: {
    isNativePlatform?: () => boolean;
    Plugins?: {
      Browser?: CapacitorBrowser;
    };
  };
};

export function isNativeShell(): boolean {
  if (typeof window === "undefined") return false;
  const native = window as NativeWindow;
  if (native.electronAPI?.openExternal) return true;
  if (native.Capacitor?.isNativePlatform?.()) return true;
  return /Electron/iu.test(window.navigator.userAgent);
}

/**
 * Opens a URL in the system browser when running inside Electron/Capacitor.
 * On the web this is a standard new tab with opener isolation.
 */
export function openExternalUrl(url: string): void {
  if (typeof window === "undefined") return;
  const native = window as NativeWindow;
  if (native.electronAPI?.openExternal) {
    void native.electronAPI.openExternal(url);
    return;
  }
  const browser = native.Capacitor?.Plugins?.Browser;
  if (native.Capacitor?.isNativePlatform?.() && browser?.open) {
    void browser.open({ url });
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

export function handleExternalClick(
  event: MouseEvent<HTMLAnchorElement>,
  url: string,
): void {
  if (!isNativeShell()) return;
  event.preventDefault();
  if (url.startsWith("mailto:")) {
    window.location.href = url;
    return;
  }
  openExternalUrl(url);
}
