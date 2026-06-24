export {
   checkRateLimit,
   clearAttempts,
   formatRetryAfter,
} from "./rate-limiter";

import { recordFailedAttempt as _record } from "./rate-limiter";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

export async function recordFailedAttempt(
   key: string,
): Promise<{ locked: boolean; retryAfterMs: number }> {
   return _record(key, { maxAttempts: MAX_ATTEMPTS, lockoutMs: LOCKOUT_MS });
}
