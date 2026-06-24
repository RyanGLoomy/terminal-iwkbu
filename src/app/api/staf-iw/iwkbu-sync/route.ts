import { NextResponse } from "next/server";
import { getAuthenticatedActor } from "@/lib/auth/server-actor";
import {
   ensureRoleOrThrow,
   AuthorizationError,
} from "@/lib/auth/requireRole.server";
import {
   executeIwkbuSync,
   getIwkbuSyncDashboard,
} from "@/lib/supabase/queries/iwkbu-sync.server";
import { logActivity } from "@/lib/supabase/queries/operasional.server";

async function requireStaffActor() {
   const actor = await getAuthenticatedActor();
   if (!actor) return null;

   ensureRoleOrThrow(actor.user, actor.profile, ["staf-iw", "admin-terminal"]);
   return actor;
}

export async function GET() {
   try {
      const actor = await requireStaffActor();
      if (!actor) {
         return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }

      const data = await getIwkbuSyncDashboard(200);
      return NextResponse.json({ data });
   } catch (error: any) {
      if (error instanceof AuthorizationError) {
         return NextResponse.json(
            { message: error.message },
            { status: 403 },
         );
      }
      return NextResponse.json(
         { message: error?.message ?? "Internal error" },
         { status: 500 },
      );
   }
}

export async function POST() {
   try {
      const actor = await requireStaffActor();
      if (!actor) {
         return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }

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
   } catch (error: any) {
      if (error instanceof AuthorizationError) {
         return NextResponse.json(
            { message: error.message },
            { status: 403 },
         );
      }
      return NextResponse.json(
         { message: error?.message ?? "Internal error" },
         { status: 500 },
      );
   }
}
