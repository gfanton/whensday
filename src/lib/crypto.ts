import { timingSafeEqual, createHash } from "crypto";

// ---- Client-side (Web Crypto API)

/**
 * Hash an owner key using SHA-256 (works in browser and Node 18+)
 */
export async function hashOwnerKey(ownerKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ownerKey);
  const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ---- Server-side (Node crypto)

/**
 * Hash an owner key synchronously (server-side only)
 */
export function hashOwnerKeySync(ownerKey: string): string {
  return createHash("sha256").update(ownerKey).digest("hex");
}

/**
 * Verify an owner key against a stored hash using timing-safe comparison
 */
export function verifyOwnerKey(
  providedKey: string,
  storedHash: string
): boolean {
  const providedHash = hashOwnerKeySync(providedKey);
  // Both hashes are 64 characters (SHA-256 hex), so same length is guaranteed
  return timingSafeEqual(Buffer.from(providedHash), Buffer.from(storedHash));
}
