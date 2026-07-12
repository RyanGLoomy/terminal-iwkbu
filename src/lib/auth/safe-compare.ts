import { createHash, timingSafeEqual } from "crypto";

/**
 * Constant-time string comparison that does not leak input length.
 *
 * The previous implementation short-circuited on length mismatch
 * (`bufA.length !== bufB.length → false`), letting a remote caller distinguish
 * "wrong length" from "wrong content" by timing. Hashing both inputs to a
 * fixed-length SHA-256 digest first removes that side channel: both digests
 * are always 32 bytes, so timingSafeEqual always compares equal-length buffers.
 *
 * Used for cron/webhook Bearer secret comparison.
 */
export function safeCompare(a: string, b: string): boolean {
   if (!a || !b) return false;
   const hashA = createHash("sha256").update(a).digest();
   const hashB = createHash("sha256").update(b).digest();
   return timingSafeEqual(hashA, hashB);
}
