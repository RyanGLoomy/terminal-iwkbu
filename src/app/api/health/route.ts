import { NextResponse } from "next/server";

export async function GET() {
  const checks: Record<string, string> = {};

  // Check env vars
  checks.supabase_url = process.env.NEXT_PUBLIC_SUPABASE_URL ? "ok" : "missing";
  checks.service_key = process.env.SUPABASE_SERVICE_ROLE_KEY ? "ok" : "missing";

  // Check DB connection
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    const { error } = await admin.from("roles").select("id").limit(1);
    checks.database = error ? `error: ${error.code}` : "ok";
  } catch {
    checks.database = "error: client init failed";
  }

  const allOk = Object.values(checks).every((v) => v === "ok");

  return NextResponse.json(
    { status: allOk ? "ok" : "degraded", checks },
    { status: allOk ? 200 : 503 },
  );
}
