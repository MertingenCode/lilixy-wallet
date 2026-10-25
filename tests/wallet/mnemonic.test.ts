import { privateKeyToAccount } from "viem/accounts";
import { describe, expect, it } from "vitest";

import {
  createWordChallenge,
  deriveAccount,
  derivePrivateKey,
  generateWalletMnemonic,
  isKnownWord,
  isValidMnemonic,
  normalizeMnemonic,
  splitMnemonic,
  verifyWordChallenge,
} from "@/lib/wallet/mnemonic";

const VALID =
  "test test test test test test test test test test test junk";
const INVALID_CHECKSUM =
  "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon";

describe("BIP39 mnemonic handling", () => {
  it("generates a valid 12-word English mnemonic", () => {
    const mnemonic = generateWalletMnemonic();
    expect(splitMnemonic(mnemonic)).toHaveLength(12);
    expect(isValidMnemonic(mnemonic)).toBe(true);
  });

  it("normalizes case and whitespace before validation", () => {
    const messy = `  ${VALID.toUpperCase().replaceAll(" ", "   ")}  `;
    expect(normalizeMnemonic(messy)).toBe(VALID);
    expect(isValidMnemonic(messy)).toBe(true);
  });

  it("rejects a checksum-invalid phrase", () => {
    expect(isValidMnemonic(INVALID_CHECKSUM)).toBe(false);
  });

  it("detects unknown BIP39 words", () => {
    expect(isKnownWord("test")).toBe(true);
    expect(isKnownWord("lilixycoin")).toBe(false);
  });

  it("creates three unique word challenges and validates answers", () => {
    const challenge = createWordChallenge(VALID, 3);
    expect(challenge).toHaveLength(3);
    expect(new Set(challenge.map((item) => item.index)).size).toBe(3);
    expect(
      verifyWordChallenge(
        VALID,
        challenge,
        challenge.map((item) => item.word),
      ),
    ).toBe(true);
    expect(
      verifyWordChallenge(
        VALID,
        challenge,
        challenge.map(() => "wrong"),
      ),
    ).toBe(false);
  });

  it("derives the same BIP44 account as the explicit BIP32 path", () => {
    const account = deriveAccount(VALID);
    const privateKey = derivePrivateKey(VALID);
    expect(privateKeyToAccount(privateKey).address).toBe(account.address);
  });
});
