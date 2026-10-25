export type PasswordIssue =
  | "TOO_SHORT"
  | "TOO_WEAK"
  | "MISSING_VARIETY"
  | "COMMON_PASSWORD"
  | "SEQUENTIAL"
  | "REPEATED";

export interface PasswordEvaluation {
  valid: boolean;
  score: 0 | 1 | 2 | 3 | 4;
  issues: PasswordIssue[];
  characterClasses: number;
  length: number;
}

const COMMON_PASSWORDS = new Set([
  "password",
  "password1",
  "password123",
  "12345678",
  "123456789",
  "1234567890",
  "qwerty123",
  "qwertyuiop",
  "letmein",
  "welcome",
  "admin123",
  "iloveyou",
  "monkey123",
  "dragon123",
  "football",
  "baseball",
  "sunshine",
  "princess",
  "trustno1",
  "abc12345",
  "cüzdan123",
  "sifre123",
  "şifre123",
  "parola123",
]);

const SEQUENCES = [
  "abcdefghijklmnopqrstuvwxyz",
  "0123456789",
  "qwertyuiop",
  "asdfghjkl",
  "zxcvbnm",
];

function classesIn(password: string): number {
  let classes = 0;
  if (/[a-z]/.test(password)) classes += 1;
  if (/[A-Z]/.test(password)) classes += 1;
  if (/\d/.test(password)) classes += 1;
  if (/[^\p{L}\p{N}\s]/u.test(password)) classes += 1;
  if (/\s/.test(password)) classes += 1;
  return classes;
}

function hasSequence(password: string): boolean {
  const lower = password.toLowerCase();
  for (const sequence of SEQUENCES) {
    for (let i = 0; i <= sequence.length - 4; i += 1) {
      const chunk = sequence.slice(i, i + 4);
      if (lower.includes(chunk) || lower.includes([...chunk].reverse().join(""))) {
        return true;
      }
    }
  }
  return false;
}

function hasExcessiveRepeat(password: string): boolean {
  return /(.)\1{3,}/u.test(password) || /^(.{1,2})\1{4,}$/u.test(password);
}

/**
 * A local, dependency-free password policy. It is intentionally conservative:
 * 10+ characters, at least three character classes and no trivially guessable
 * patterns. The password is never transmitted or persisted in plaintext.
 */
export function evaluatePassword(password: string): PasswordEvaluation {
  const issues: PasswordIssue[] = [];
  const length = [...password].length;
  const characterClasses = classesIn(password);
  const common = COMMON_PASSWORDS.has(password.toLowerCase().trim());
  const sequential = hasSequence(password);
  const repeated = hasExcessiveRepeat(password);

  if (length < 10) issues.push("TOO_SHORT");
  if (characterClasses < 3) issues.push("MISSING_VARIETY");
  if (common) issues.push("COMMON_PASSWORD");
  if (sequential) issues.push("SEQUENTIAL");
  if (repeated) issues.push("REPEATED");

  let score: 0 | 1 | 2 | 3 | 4 = 0;
  if (length >= 8) score = 1;
  if (length >= 10 && characterClasses >= 2) score = 2;
  if (length >= 12 && characterClasses >= 3 && !common && !sequential) score = 3;
  if (length >= 16 && characterClasses >= 3 && !common && !sequential) score = 4;

  const valid =
    length >= 10 &&
    characterClasses >= 3 &&
    !common &&
    !sequential &&
    !repeated;
  if (!valid && score === 4) score = 3;
  if (!valid && score === 3) score = 2;
  if (issues.includes("TOO_WEAK")) score = 1;

  return { valid, score, issues, characterClasses, length };
}

export function isStrongPassword(password: string): boolean {
  return evaluatePassword(password).valid;
}
