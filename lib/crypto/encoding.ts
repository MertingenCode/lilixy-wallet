const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder("utf-8", { fatal: true });

export function utf8ToBytes(value: string): Uint8Array {
  return textEncoder.encode(value);
}

export function bytesToUtf8(bytes: Uint8Array): string {
  return textDecoder.decode(bytes);
}

/**
 * Chunked conversion avoids `String.fromCharCode(...bytes)` stack overflows for
 * large ciphertexts and works in both the browser and Node's Web Crypto runtime.
 */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

export function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function bytesToHex(bytes: Uint8Array): `0x${string}` {
  let hex = "0x";
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, "0");
  }
  return hex as `0x${string}`;
}

export function randomBytes(length: number): Uint8Array {
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error("SECURE_RANDOM_UNAVAILABLE");
  }
  return globalThis.crypto.getRandomValues(new Uint8Array(length));
}

export function normalizePassword(password: string): string {
  // NFKC makes visually identical passwords produce the same derived key on
  // every platform while still treating the password as opaque bytes.
  return password.normalize("NFKC");
}
