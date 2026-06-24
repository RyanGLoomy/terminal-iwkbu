import { createClient } from "@/lib/supabase/server";

interface RateLimitConfig {
   maxAttempts: number;
   lockoutMs: number;
}

export async function checkRateLimit(
   key: string,
): Promise<{ allowed: true } | { allowed: false; retryAfterMs: number }> {
   const supabase = await createClient();
   const { data, error } = await supabase.rpc("check_rate_limit", {
      p_key: key,
   });

   if (error || !data) {
      return { allowed: true };
   }

   if (data > 0) {
      return { allowed: false, retryAfterMs: data * 1000 };
   }

   return { allowed: true };
}

export async function recordFailedAttempt(
   key: string,
   { maxAttempts, lockoutMs }: RateLimitConfig,
): Promise<{ locked: boolean; retryAfterMs: number }> {
   const supabase = await createClient();
   const { data, error } = await supabase.rpc("record_rate_limit_attempt", {
      p_key: key,
      p_max_attempts: maxAttempts,
      p_lockout_seconds: Math.ceil(lockoutMs / 1000),
   });

   if (error || data === null) {
      return { locked: false, retryAfterMs: 0 };
   }

   if (data > 0) {
      return { locked: true, retryAfterMs: data * 1000 };
   }

   return { locked: false, retryAfterMs: 0 };
}

export async function clearAttempts(key: string): Promise<void> {
   const supabase = await createClient();
   await supabase.rpc("clear_rate_limit", { p_key: key });
}

export function formatRetryAfter(ms: number): string {
   const minutes = Math.ceil(ms / 60000);
   return `${minutes} menit`;
}

export function getClientIp(request: Request): string {
   const forwarded = request.headers.get("x-forwarded-for");
   if (forwarded) return forwarded.split(",")[0].trim();
   const realIp = request.headers.get("x-real-ip");
   if (realIp) return realIp.trim();
   return "unknown";
}
