import { describe, expect, it } from "vitest";

import { LIFI_FEE, parseLifiFee } from "@/lib/lifi/config";

describe("LI.FI integrator fee", () => {
  it("defaults to 0.25%", () => {
    expect(parseLifiFee(undefined)).toBe(0.0025);
    expect(parseLifiFee("")).toBe(0.0025);
    expect(LIFI_FEE).toBe(0.0025);
  });

  it("reads 0.0025 from the environment format", () => {
    expect(parseLifiFee("0.0025")).toBe(0.0025);
    expect(parseLifiFee(" 0.0025 ")).toBe(0.0025);
  });

  it("falls back safely for invalid values", () => {
    expect(parseLifiFee("not-a-number")).toBe(0.0025);
    expect(parseLifiFee("-1")).toBe(0.0025);
  });

  it("caps malformed values at 5%", () => {
    expect(parseLifiFee("0.5")).toBe(0.05);
  });
});
