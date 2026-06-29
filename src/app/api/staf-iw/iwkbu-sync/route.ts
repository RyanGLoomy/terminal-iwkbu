import { NextResponse } from "next/server";
import { requireActor, actorErrorHandler } from "@/lib/auth/actor";
import { ROLES } from "@/config/roles";
import {
   executeIwkbuSync,
   getIwkbuSyncDashboard,
} from "@/lib/supabase/queries/iwkbu-sync.server";
import { logActivity } from "@/lib/supabase/queries/operasional.server";

export async function GET() {
   try {
      await requireActor(ROLES.STAF_IW);

      const data = await getIwkbuSyncDashboard(200);
      return NextResponse.json({ data });
   } catch (error) {
      return actorErrorHandler(error);
   }
}

export async function POST() {
   try {
      const actor = await requireActor(ROLES.STAF_IW);

      const result = await executeIwkbuSync({
         triggerType: "manual",
         initiatedBy: actor.user.id,
      });

      await logActivity(
         "JALANKAN_SYNC",
         "Menjalankan IWKBU sync manual",
         { sync_run_id: result.runId, trigger: "manual" },
      );

      return NextResponse.json({ data: result }, { status: 201 });
   } catch (error) {
      return actorErrorHandler(error);
   }
}
