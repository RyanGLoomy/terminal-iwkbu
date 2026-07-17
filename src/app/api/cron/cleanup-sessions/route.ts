import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeCompare } from "@/lib/auth/safe-compare";

/**
 * Cron: Close stale loket sessions.
 * Sessions left "aktif" due to browser crash/network loss are auto-closed
 * after MAX_SESSION_HOURS (default 24h).
 */
const MAX_SESSION_HOURS = 24;

export async function POST(request: Request) {
   const authHeader = request.headers.get("authorization");
   const token = authHeader?.replace("Bearer ", "");
   const secret = process.env.IWKBU_SYNC_CRON_SECRET ?? process.env.CRON_SECRET;

   if (!secret || !token || !safeCompare(token, secret)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }

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
         { error: error instanceof Error ? error.message : "Unknown error" },
         { status: 500 },
      );
   }
}
