import crypto from "node:crypto";
import { getEnv } from "@/lib/env";

/**
 * AES-256-GCM encryption for sensitive values (broker API tokens) at rest.
 *
 * Format of the stored string: base64( iv(12) || authTag(16) || ciphertext ).
 * The key is derived from ENCRYPTION_KEY (accepts base64, hex, or raw text and
 * normalises to 32 bytes via SHA-256). Tokens are only ever decrypted on the
 * server immediately before a provider call; they are never sent to the client.
 */
const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

function getKey(): Buffer {
  const raw = getEnv().ENCRYPTION_KEY;
  // Try base64 / hex first; fall back to hashing arbitrary text to 32 bytes.
  let keyBuf: Buffer | null = null;
  try {
    const b64 = Buffer.from(raw, "base64");
    if (b64.length === 32) keyBuf = b64;
  } catch {
    /* ignore */
  }
  if (!keyBuf && /^[0-9a-fA-F]{64}$/.test(raw)) {
    keyBuf = Buffer.from(raw, "hex");
  }
  if (!keyBuf) {
    keyBuf = crypto.createHash("sha256").update(raw).digest();
  }
  return keyBuf;
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decrypt(payload: string): string {
  const key = getKey();
  const data = Buffer.from(payload, "base64");
  const iv = data.subarray(0, IV_LEN);
  const tag = data.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ciphertext = data.subarray(IV_LEN + TAG_LEN);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

/** Masks a token for display, e.g. "abcd…wxyz". Never returns the full token. */
export function maskToken(token: string): string {
  if (token.length <= 8) return "••••";
  return `${token.slice(0, 4)}…${token.slice(-4)}`;
}
