import { describe, expect, it } from "vitest";

import { formatDate, formatShortDate } from "@/lib/i18n/format";

describe("Intl date formatting", () => {
  it("formats a date with the default style", () => {
    expect(formatDate(1_700_000_000_000, "en")).toContain("2023");
  });

  it("supports explicit date/time parts without mixing dateStyle", () => {
    const formatted = formatShortDate(1_700_000_000_000, "en");
    expect(formatted).toContain("2023");
    expect(formatted).toMatch(/\d{1,2}:\d{2}/u);
  });

  it("does not throw in a non-Latin locale", () => {
    expect(() => formatShortDate(1_700_000_000_000, "ar")).not.toThrow();
  });
});
