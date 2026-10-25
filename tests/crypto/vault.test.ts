import { describe, expect, it } from "vitest";

import { VaultError } from "@/lib/crypto/types";
import { decryptVault, encryptMnemonic } from "@/lib/crypto/vault";

const MNEMONIC =
  "test test test test test test test test test test test junk";
const PASSWORD = "A-strong-wallet-password-2026!";

describe("AES-GCM vault", () => {
  it("round-trips a mnemonic without storing plaintext", async () => {
    const record = await encryptMnemonic(MNEMONIC, PASSWORD);
    expect(record.version).toBe(1);
    expect(record.kdf.iterations).toBeGreaterThanOrEqual(600_000);
    expect(record.kdf.salt).toBeTruthy();
    expect(record.cipher.iv).toBeTruthy();
    expect(record.cipher.ciphertext).toBeTruthy();

    const serialized = JSON.stringify(record);
    expect(serialized).not.toContain("test test");
    expect(serialized).not.toContain("mnemonic");

    const recovered = await decryptVault(record, PASSWORD);
    expect(recovered).toBe(MNEMONIC);
  });

  it("rejects the wrong password with a generic decrypt failure", async () => {
    const record = await encryptMnemonic(MNEMONIC, PASSWORD);
    await expect(decryptVault(record, "not-the-password")).rejects.toMatchObject({
      code: "DECRYPT_FAILED",
    });
  });

  it("rejects tampered ciphertext and IV with AES-GCM authentication", async () => {
    const record = await encryptMnemonic(MNEMONIC, PASSWORD);
    const tampered = structuredClone(record);
    const cipher = atob(tampered.cipher.ciphertext);
    const changed = `${cipher.slice(0, -1)}${cipher.endsWith("A") ? "B" : "A"}`;
    tampered.cipher.ciphertext = btoa(changed);

    await expect(decryptVault(tampered, PASSWORD)).rejects.toBeInstanceOf(
      VaultError,
    );

    const badIv = structuredClone(record);
    badIv.cipher.iv = btoa("short");
    await expect(decryptVault(badIv, PASSWORD)).rejects.toMatchObject({
      code: "INVALID_VAULT",
    });
  });

  it("uses a fresh random salt and IV for every encryption", async () => {
    const first = await encryptMnemonic(MNEMONIC, PASSWORD);
    const second = await encryptMnemonic(MNEMONIC, PASSWORD);
    expect(first.kdf.salt).not.toBe(second.kdf.salt);
    expect(first.cipher.iv).not.toBe(second.cipher.iv);
    expect(first.cipher.ciphertext).not.toBe(second.cipher.ciphertext);
  });

  it("refuses to create a vault below the minimum PBKDF2 work factor", async () => {
    await expect(
      encryptMnemonic(MNEMONIC, PASSWORD, 1_000),
    ).rejects.toMatchObject({ code: "WEAK_KDF" });
  });

  it("refuses to decrypt a vault whose stored KDF parameters were weakened", async () => {
    const record = await encryptMnemonic(MNEMONIC, PASSWORD);
    const weakened = { ...record, kdf: { ...record.kdf, iterations: 1_000 } };
    await expect(decryptVault(weakened, PASSWORD)).rejects.toMatchObject({
      code: "WEAK_KDF",
    });
  });
});
