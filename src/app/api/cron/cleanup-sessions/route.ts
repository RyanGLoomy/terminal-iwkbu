import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCronAuthorized } from "@/lib/auth/cron-auth";
import { sanitizeDbError } from "@/lib/db-error";

/**
 * Cron: Close stale loket sessions.
 * Sessions left "aktif" due to browser crash/network loss are auto-closed
 * after MAX_SESSION_HOURS (default 24h).
 */
const MAX_SESSION_HOURS = 24;

export async function POST(request: Request) {
   if (!isCronAuthorized(request)) { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

   try {
      const admin = createAdminClient();
      const cutoff = new Date();
      cutoff.setHours(cutoff.getHours() - MAX_SESSION_HOURS);

      const { count } = await admin
         .from("sesi_petugas")
         .update({
            status: "ditutup",
            waktu_selesai: new Date().toISOString(),
         })
         .eq("status", "aktif")
         .lt("waktu_mulai", cutoff.toISOString());

      return NextResponse.json({
         success: true,
         closed: count ?? 0,
      });
   } catch (error: unknown) {
      return NextResponse.json(
         { error: sanitizeDbError(error, "cleanup-sessions") },
         { status: 500 },
      );
   }
}
