import { NextResponse } from "next/server";
import { safeCompare } from "@/lib/auth/safe-compare";

export async function GET(request: Request) {
   // Shallow check: always returns ok without internals — safe for external probes
   const authHeader = request.headers.get("authorization") ?? "";
   const token = authHeader.replace(/^Bearer\s+/i, "");
   const secret = process.env.IWKBU_SYNC_CRON_SECRET ?? process.env.CRON_SECRET;
   const isAuthorized = secret && token && safeCompare(token, secret);

   if (!isAuthorized) {
      return NextResponse.json({ status: "ok" });
   }

   // Deep check: only for authenticated/internal callers
   const checks: Record<string, string> = {};
   checks.supabase_url = process.env.NEXT_PUBLIC_SUPABASE_URL ? "ok" : "missing";
   checks.service_key = process.env.SUPABASE_SERVICE_ROLE_KEY ? "ok" : "missing";

   try {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const admin = createAdminClient();
      const { error } = await admin.from("roles").select("id").limit(1);
      checks.database = error ? "degraded" : "ok";
   } catch {
      checks.database = "degraded";
   }

   const allOk = Object.values(checks).every((v) => v === "ok");

   return NextResponse.json(
      { status: allOk ? "ok" : "degraded", checks },
      { status: allOk ? 200 : 503 },
   );
}
