import { describe, expect, it } from "vitest";

import { evaluatePassword } from "@/lib/security/password-strength";

describe("password policy", () => {
  it("accepts a long, varied password", () => {
    const result = evaluatePassword("Lilixy!Strong2026");
    expect(result.valid).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(2);
  });

  it("rejects short passwords", () => {
    const result = evaluatePassword("Aa1!aaa");
    expect(result.valid).toBe(false);
    expect(result.issues).toContain("TOO_SHORT");
  });

  it("rejects a common password even with substitutions", () => {
    expect(evaluatePassword("password123").valid).toBe(false);
    expect(evaluatePassword("Password123").valid).toBe(false);
  });

  it("rejects character sequences and excessive repeats", () => {
    expect(evaluatePassword("Abcd1234!xyz").valid).toBe(false);
    expect(evaluatePassword("Aaaaaa1111!!!!").valid).toBe(false);
  });

  it("requires at least three character classes", () => {
    const result = evaluatePassword("onlylowercaseletters");
    expect(result.valid).toBe(false);
    expect(result.issues).toContain("MISSING_VARIETY");
  });
});
