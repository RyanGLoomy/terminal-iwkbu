import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeCompare } from "@/lib/auth/safe-compare";

/**
 * Cron: Cleanup expired push subscriptions.
 * Runs periodically (e.g. daily) to remove subscriptions whose endpoints
 * have expired (410 Gone / 404 Not Found) or are older than 90 days unused.
 */
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
         { error: error instanceof Error ? error.message : "Unknown error" },
         { status: 500 },
      );
   }
}
