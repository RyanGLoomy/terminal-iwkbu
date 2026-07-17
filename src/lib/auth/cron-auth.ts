import { safeCompare } from "./safe-compare";

/**
 * Shared cron authorization check.
 * Extracts Bearer token (case-insensitive) and compares timing-safe.
 */
export function isCronAuthorized(request: Request): boolean {
   const secret = process.env.IWKBU_SYNC_CRON_SECRET ?? process.env.CRON_SECRET;
   if (!secret) return false;
   const authHeader = request.headers.get("authorization") ?? "";
   const token = authHeader.replace(/^Bearer\s+/i, "");
   return Boolean(token) && safeCompare(token, secret);
}
