import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCronAuthorized } from "@/lib/auth/cron-auth";
import { sanitizeDbError } from "@/lib/db-error";

/**
 * Cron: Cleanup expired push subscriptions.
 * Runs periodically (e.g. daily) to remove subscriptions whose endpoints
 * have expired (410 Gone / 404 Not Found) or are older than 90 days unused.
 */
export async function POST(request: Request) {
   if (!isCronAuthorized(request)) { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

   try {
      const admin = createAdminClient();
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 90);

      const { count } = await admin
         .from("push_subscriptions")
         .delete()
         .lt("created_at", cutoff.toISOString());

      return NextResponse.json({
         success: true,
         deleted: count ?? 0,
      });
   } catch (error: unknown) {
      return NextResponse.json(
         { error: sanitizeDbError(error, "cleanup-push-subs") },
         { status: 500 },
      );
   }
}
