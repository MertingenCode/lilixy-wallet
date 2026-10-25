import { HDKey } from "@scure/bip32";
import {
  generateMnemonic,
  mnemonicToSeedSync,
  validateMnemonic,
} from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { mnemonicToAccount, type HDAccount } from "viem/accounts";

export const MNEMONIC_WORD_COUNT = 12;
export const ACCOUNT_PATH = "m/44'/60'/0'/0/0";

export interface WordChallenge {
  index: number;
  word: string;
}

export function generateWalletMnemonic(): string {
  // 128 bits of entropy produces a 12-word English BIP39 phrase.
  return generateMnemonic(wordlist, 128);
}

export function normalizeMnemonic(value: string): string {
  return value
    .normalize("NFKD")
    .trim()
    .toLowerCase()
    .split(/\s+/u)
    .filter(Boolean)
    .join(" ");
}

export function splitMnemonic(value: string): string[] {
  return normalizeMnemonic(value).split(" ").filter(Boolean);
}

export function isValidMnemonic(value: string): boolean {
  const normalized = normalizeMnemonic(value);
  if (!normalized) return false;
  // Lilixy intentionally supports only the 12-word (128-bit) flow required by
  // the product, even though BIP39 itself allows longer phrases.
  if (splitMnemonic(normalized).length !== MNEMONIC_WORD_COUNT) return false;
  return validateMnemonic(normalized, wordlist);
}

export function isKnownWord(word: string): boolean {
  return wordlist.includes(word.trim().toLowerCase());
}

export function createWordChallenge(
  mnemonic: string,
  count = 3,
): WordChallenge[] {
  const words = splitMnemonic(mnemonic);
  if (words.length < count) {
    throw new Error("MNEMONIC_TOO_SHORT");
  }

  // Fisher-Yates with Web Crypto, only over indexes so the displayed order is
  // random and never reveals the full phrase.
  const indexes = words.map((_, index) => index);
  const random = new Uint32Array(1);
  for (let i = indexes.length - 1; i > 0; i -= 1) {
    crypto.getRandomValues(random);
    const j = (random[0] ?? 0) % (i + 1);
    const a = indexes[i];
    const b = indexes[j];
    if (a !== undefined && b !== undefined) {
      indexes[i] = b;
      indexes[j] = a;
    }
  }

  return indexes.slice(0, count).map((index) => ({
    index,
    word: words[index] ?? "",
  }));
}

export function verifyWordChallenge(
  mnemonic: string,
  challenge: WordChallenge[],
  answers: string[],
): boolean {
  const words = splitMnemonic(mnemonic);
  if (answers.length !== challenge.length) return false;
  return challenge.every((entry, index) => {
    const answer = normalizeMnemonic(answers[index] ?? "");
    return answer === words[entry.index] && answer === entry.word;
  });
}

export function deriveAccount(mnemonic: string): HDAccount {
  const normalized = normalizeMnemonic(mnemonic);
  if (!isValidMnemonic(normalized)) {
    throw new Error("INVALID_MNEMONIC");
  }
  return mnemonicToAccount(normalized, { path: ACCOUNT_PATH });
}

/**
 * Kept as an explicit BIP32 derivation helper for verification/tests. Runtime
 * account creation still goes through viem's mnemonicToAccount as required.
 */
export function derivePrivateKey(
  mnemonic: string,
  path = ACCOUNT_PATH,
): `0x${string}` {
  const seed = mnemonicToSeedSync(normalizeMnemonic(mnemonic));
  const root = HDKey.fromMasterSeed(seed);
  const child = root.derive(path);
  if (!child.privateKey) throw new Error("PRIVATE_KEY_DERIVATION_FAILED");
  let hex = "0x";
  for (const byte of child.privateKey) hex += byte.toString(16).padStart(2, "0");
  seed.fill(0);
  return hex as `0x${string}`;
}
