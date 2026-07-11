import { createAdminClient } from "@/lib/supabase/admin";

interface RateLimitConfig {
   maxAttempts: number;
   lockoutMs: number;
}

// Rate-limiting adalah infrastruktur server-side, bukan data pengguna. Memakai
// admin (service-role) client agar pemanggilan RPC tidak bergantung pada grant
// `anon`/`authenticated` — memungkinkan REVOKE EXECUTE dari anon tanpa
// menghancurkan alur login pre-auth (yang berjalan sebagai anon di cookie
// client). service_role bypass EXECUTE grants.
export async function checkRateLimit(
   key: string,
): Promise<{ allowed: true } | { allowed: false; retryAfterMs: number }> {
   const supabase = createAdminClient();
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
   const supabase = createAdminClient();
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
   const supabase = createAdminClient();
   await supabase.rpc("clear_rate_limit", { p_key: key });
}

export function formatRetryAfter(ms: number): string {
   const minutes = Math.ceil(ms / 60000);
   return `${minutes} menit`;
}

export function getClientIp(request: Request): string {
   // Header platform (Vercel) yang di-set dari connecting socket — TIDAK bisa
   // di-spoof oleh klien. Sebelumnya kita mempercayai octet PERTAMA
   // x-forwarded-for, yang sepenuhnya dikendalikan klien -> bypass rate limit
   // dengan memutar IP per request.
   const vercel = request.headers.get("x-vercel-forwarded-for");
   if (vercel) return vercel.split(",")[0].trim();
   const forwarded = request.headers.get("x-forwarded-for");
   if (forwarded) {
      // Entri TERAKANAN paling dekat dengan proxy kita; entri pertama bisa
      // disisipkan klien. Hindari mempercayainya.
      const parts = forwarded
         .split(",")
         .map((s) => s.trim())
         .filter(Boolean);
      if (parts.length > 0) return parts[parts.length - 1];
   }
   const realIp = request.headers.get("x-real-ip");
   if (realIp) return realIp.trim();
   return "unknown";
}
