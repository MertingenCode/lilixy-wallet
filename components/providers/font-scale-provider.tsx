"use client";

import { useEffect } from "react";

import { useSettingsStore, type FontScale } from "@/store/settings";

const SCALE: Record<FontScale, string> = {
  small: "0.92",
  default: "1",
  large: "1.08",
};

export function FontScaleProvider() {
  const fontScale = useSettingsStore((state) => state.fontScale);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--font-scale",
      SCALE[fontScale],
    );
  }, [fontScale]);

  return null;
}
