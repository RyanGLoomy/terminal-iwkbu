import { NextRequest, NextResponse } from "next/server";
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

export async function POST(request: NextRequest) {
   try {
      const actor = await requireActor(ROLES.STAF_IW);

      const body = await request.json().catch(() => ({}));
      const periodeId = (body as { periodeId?: string })?.periodeId ?? undefined;

      const result = await executeIwkbuSync({
         triggerType: "manual",
         initiatedBy: actor.user.id,
         periodeId,
      });

      await logActivity(
         "JALANKAN_SYNC",
         "Menjalankan IWKBU sync manual",
         { sync_run_id: result.runId, trigger: "manual", periode_id: periodeId ?? null },
      );

      return NextResponse.json({ data: result }, { status: 201 });
   } catch (error) {
      return actorErrorHandler(error);
   }
}
