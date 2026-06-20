import bcrypt from "bcryptjs";
import crypto from "node:crypto";

const SALT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

/**
 * Creates a password-reset token. Returns the raw token (sent to the user once
 * via email/link) and its SHA-256 hash (the only thing stored in the DB).
 */
export function createResetToken(): { token: string; tokenHash: string } {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  return { token, tokenHash };
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
