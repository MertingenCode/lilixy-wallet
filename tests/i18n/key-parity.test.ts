import { describe, expect, it } from "vitest";

import ar from "@/locales/ar.json";
import de from "@/locales/de.json";
import en from "@/locales/en.json";
import es from "@/locales/es.json";
import fr from "@/locales/fr.json";
import ja from "@/locales/ja.json";
import ru from "@/locales/ru.json";
import tr from "@/locales/tr.json";
import zh from "@/locales/zh.json";

function flatten(value: unknown, prefix = "", out = new Set<string>()): Set<string> {
  if (!value || typeof value !== "object") return out;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === "object" && !Array.isArray(child)) {
      flatten(child, next, out);
    } else {
      out.add(next);
    }
  }
  return out;
}

const english = flatten(en);
const locales = { tr, es, de, fr, ru, ar, zh, ja };

describe("locale key parity", () => {
  for (const [locale, messages] of Object.entries(locales)) {
    it(`${locale} contains every English key and no extras`, () => {
      const keys = flatten(messages);
      expect([...english].filter((key) => !keys.has(key))).toEqual([]);
      expect([...keys].filter((key) => !english.has(key))).toEqual([]);
    });
  }

  it("all interpolation placeholders are preserved", () => {
    for (const [locale, messages] of Object.entries(locales)) {
      const flatMessages = flattenValues(messages);
      for (const key of english) {
        const placeholders = (valueAt(en, key).match(/\{\{\w+\}\}/gu) ?? []).sort();
        const translated = flatMessages[key] ?? "";
        for (const placeholder of placeholders) {
          expect(translated, `${locale}:${key}`).toContain(placeholder);
        }
      }
    }
  });
});

function flattenValues(value: unknown, prefix = "", out: Record<string, string> = {}) {
  if (!value || typeof value !== "object") return out;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === "object" && !Array.isArray(child)) {
      flattenValues(child, next, out);
    } else if (typeof child === "string") {
      out[next] = child;
    }
  }
  return out;
}

function valueAt(value: unknown, path: string): string {
  const result = path.split(".").reduce<unknown>((current, key) => {
    if (current && typeof current === "object") {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, value);
  return typeof result === "string" ? result : "";
}
