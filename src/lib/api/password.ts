import { createHash, timingSafeEqual } from "crypto";

/**
 * Hash a password using SHA-256.
 * For production, consider migrating to bcrypt or argon2.
 */
export async function hashPassword(password: string): Promise<string> {
  return createHash("sha256").update(password).digest("hex");
}

/**
 * Timing-safe string comparison to prevent timing attacks.
 */
export function timingSafeCompare(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
