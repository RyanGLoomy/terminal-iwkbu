import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeCompare } from "@/lib/auth/safe-compare";

const RETENTION_DAYS = 90;

export async function POST(request: Request) {
   const authHeader = request.headers.get("authorization");
   const token = authHeader?.replace("Bearer ", "");
   const secret =
      process.env.IWKBU_SYNC_CRON_SECRET ?? process.env.CRON_SECRET;

   if (!secret || !token || !safeCompare(token, secret)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }

   try {
      const admin = createAdminClient();
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

      const { count, error } = await admin
         .from("activity_logs")
         .delete({ count: "exact" })
         .lt("created_at", cutoff.toISOString());

      if (error) {
         return NextResponse.json(
            { error: "Cleanup failed" },
            { status: 500 },
         );
      }

      console.log(
         `[cleanup-logs] Deleted ${count ?? 0} activity_logs older than ${RETENTION_DAYS} days`,
      );

      return NextResponse.json({
         deleted: count ?? 0,
         retention_days: RETENTION_DAYS,
      });
   } catch {
      return NextResponse.json(
         { error: "Internal error" },
         { status: 500 },
      );
   }
}
