"use client";

import { useEffect, useRef } from "react";

import { lockWallet } from "@/lib/wallet/controller";
import { useSessionStore } from "@/store/session";
import { useSettingsStore } from "@/store/settings";

/**
 * Activity-driven auto-lock. For timed modes we both reset a timer on activity
 * and re-check elapsed time when the tab becomes visible again (background
 * timers are throttled by browsers). The tab-close mode listens to pagehide and
 * always drops the in-memory wallet.
 */
export function useAutoLock() {
  const status = useSessionStore((state) => state.status);
  const autoLock = useSettingsStore((state) => state.autoLock);
  const lastActivity = useRef(0);
  const lastReset = useRef(0);

  useEffect(() => {
    if (status !== "unlocked") return;
    lastActivity.current = Date.now();

    const timeoutMs =
      autoLock === "tab-close" ? null : autoLock * 60 * 1000;

    function lock() {
      lockWallet();
    }

    function resetActivity() {
      const now = Date.now();
      if (now - lastReset.current < 500) return;
      lastReset.current = now;
      lastActivity.current = now;
    }

    function check() {
      if (!timeoutMs) return;
      if (Date.now() - lastActivity.current >= timeoutMs) {
        lock();
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState === "hidden") {
        check();
      } else {
        check();
        lastActivity.current = Date.now();
      }
    }

    function onPageHide() {
      // Closing/restoring a tab must not leave an authorized connector behind.
      if (autoLock === "tab-close") lock();
      else if (timeoutMs && Date.now() - lastActivity.current >= timeoutMs) {
        lock();
      }
    }

    const events: Array<keyof WindowEventMap> = [
      "pointerdown",
      "keydown",
      "touchstart",
      "wheel",
    ];
    for (const event of events) {
      window.addEventListener(event, resetActivity, { passive: true });
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);

    const interval = window.setInterval(check, 15_000);

    return () => {
      for (const event of events) {
        window.removeEventListener(event, resetActivity);
      }
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
      window.clearInterval(interval);
    };
  }, [autoLock, status]);
}
