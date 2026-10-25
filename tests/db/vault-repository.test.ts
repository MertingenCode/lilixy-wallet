// @vitest-environment jsdom
import "fake-indexeddb/auto";

import { beforeEach, describe, expect, it } from "vitest";

import { encryptMnemonic } from "@/lib/crypto/vault";
import {
  deleteVault,
  hasVault,
  loadVault,
  saveVault,
} from "@/lib/crypto/vault-repository";
import { deleteDatabase } from "@/lib/db/indexeddb";

const MNEMONIC =
  "test test test test test test test test test test test junk";

describe("encrypted vault repository", () => {
  beforeEach(async () => {
    await deleteDatabase();
  });

  it("persists only the vault envelope and detects its existence", async () => {
    const vault = await encryptMnemonic(MNEMONIC, "Lilixy!Strong2026");
    await saveVault(vault);
    expect(await hasVault()).toBe(true);
    const loaded = await loadVault();
    expect(loaded).toEqual(vault);
    expect(JSON.stringify(loaded)).not.toContain("test test");
  });

  it("deletes the vault without touching other stores", async () => {
    const vault = await encryptMnemonic(MNEMONIC, "Lilixy!Strong2026");
    await saveVault(vault);
    await deleteVault();
    expect(await hasVault()).toBe(false);
    expect(await loadVault()).toBeUndefined();
  });
});
