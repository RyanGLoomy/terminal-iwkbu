import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedActor } from "@/lib/auth/server-actor";
import {
   ensureRoleOrThrow,
   AuthorizationError,
} from "@/lib/auth/requireRole.server";
import { logActivity } from "@/lib/supabase/queries/operasional.server";
import { createNotification } from "@/lib/supabase/queries/notifications.server";

export async function PATCH(
   request: NextRequest,
   context: {
      params: Promise<{ id: string; actionId: string }>;
   },
) {
   try {
      const actor = await getAuthenticatedActor();
      if (!actor) {
         return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }

      ensureRoleOrThrow(actor.user, actor.profile, "staf-iw");

      const { id, actionId } = await context.params;
      const body = await request.json();
      const newStatus = body?.status as string | undefined;

      if (!newStatus || !["open", "done"].includes(newStatus)) {
         return NextResponse.json(
            { message: "Status tindakan tidak valid" },
            { status: 400 },
         );
      }

      const admin = createAdminClient();

      const { data: existing } = await admin
         .from("finding_actions")
         .select("id, finding_id, status, action_text")
         .eq("id", actionId)
         .eq("finding_id", id)
         .single();

      if (!existing) {
         return NextResponse.json(
            { message: "Tindakan tidak ditemukan" },
            { status: 404 },
         );
      }

      const updatePayload: Record<string, unknown> = { status: newStatus };

      if (newStatus === "done") {
         updatePayload.done_at = new Date().toISOString();
         updatePayload.done_by = actor.user.id;
      } else {
         updatePayload.done_at = null;
         updatePayload.done_by = null;
      }

      const { data, error } = await admin
         .from("finding_actions")
         .update(updatePayload)
         .eq("id", actionId)
         .select(
            "id, finding_id, action_text, status, done_at, done_by, created_by, created_at",
         )
         .single();

      if (error) {
         return NextResponse.json({ message: error.message }, { status: 500 });
      }

      if (newStatus === "done") {
         await logActivity(
            "SELESAIKAN_TINDAKAN",
            "Menyelesaikan tindak lanjut",
            {
               finding_id: id,
               action_id: data.id,
               action_text: data.action_text,
            },
            { actorUserId: actor.user.id },
         );

         const { data: f } = await admin
            .from("findings")
            .select("po_id, nomor_polisi")
            .eq("id", id)
            .single();
         if (f?.po_id) {
            await createNotification({
               userId: f.po_id,
               title: "Tindakan Diselesaikan",
               message: `Tindakan "${existing.action_text}" untuk temuan armada ${f.nomor_polisi} telah diselesaikan.`,
               type: "success",
               link: "/po/temuan",
            });
         }
      }

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
