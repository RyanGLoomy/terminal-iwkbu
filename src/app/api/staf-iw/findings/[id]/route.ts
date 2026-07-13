import { NextRequest, NextResponse } from "next/server";
import { sanitizeDbError } from "@/lib/db-error";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActor, actorErrorHandler } from "@/lib/auth/actor";
import { ROLES } from "@/config/roles";
import { logActivity } from "@/lib/supabase/queries/operasional.server";
import { createNotification } from "@/lib/supabase/queries/notifications.server";

export async function PATCH(
   request: NextRequest,
   context: { params: Promise<{ id: string }> },
) {
   try {
      const actor = await requireActor(ROLES.STAF_IW);

      const { id } = await context.params;
      const body = await request.json();

      const status = body?.status as string | undefined;
      const resolutionNote =
         (body?.resolutionNote as string | undefined)?.trim() ?? undefined;
      const severity = body?.severity as string | undefined;
      const judul = (body?.judul as string | undefined)?.trim() ?? undefined;
      const deskripsi =
         (body?.deskripsi as string | undefined)?.trim() ?? undefined;
      const dueDate = body?.dueDate as string | null | undefined;

      if (
         status !== undefined &&
         !["open", "on_progress", "closed"].includes(status)
      ) {
         return NextResponse.json(
            { message: "Status tidak valid" },
            { status: 400 },
         );
      }

      if (
         severity !== undefined &&
         !["low", "medium", "high"].includes(severity)
      ) {
         return NextResponse.json(
            { message: "Severity tidak valid" },
            { status: 400 },
         );
      }

      if (status === "closed" && !resolutionNote) {
         return NextResponse.json(
            { message: "Catatan penyelesaian wajib diisi saat menutup temuan" },
            { status: 400 },
         );
      }

      const admin = createAdminClient();

      const { data: existing } = await admin
         .from("findings")
         .select("id, status")
         .eq("id", id)
         .single();

      if (!existing) {
         return NextResponse.json(
            { message: "Temuan tidak ditemukan" },
            { status: 404 },
         );
      }

      const wasClosed = existing.status === "closed";
      const isReopening = wasClosed && status && status !== "closed";

      const updatePayload: Record<string, unknown> = {};

      if (status !== undefined) {
         updatePayload.status = status;
         updatePayload.resolution_note = resolutionNote ?? null;

         if (status === "closed") {
            updatePayload.resolved_by = actor.user.id;
            updatePayload.resolved_at = new Date().toISOString();
         } else {
            updatePayload.resolved_by = null;
            updatePayload.resolved_at = null;
            if (!resolutionNote) {
               updatePayload.resolution_note = null;
            }
         }
      }

      if (severity !== undefined) {
         updatePayload.severity = severity;
      }
      if (judul !== undefined) {
         updatePayload.judul = judul;
      }
      if (deskripsi !== undefined) {
         updatePayload.deskripsi = deskripsi;
      }
      if (dueDate !== undefined) {
         updatePayload.due_date = dueDate;
      }

      const { data, error } = await admin
         .from("findings")
         .update(updatePayload)
         .eq("id", id)
         .select(
            "id, po_id, armada_id, nomor_polisi, source_type, judul, deskripsi, severity, status, source_date, due_date, created_by, resolved_by, resolved_at, resolution_note, created_at, updated_at",
         )
         .single();

      if (error) {
         return NextResponse.json({ message: sanitizeDbError(error) }, { status: 500 });
      }

      if (isReopening) {
         await logActivity(
            "BUKA_ULANG_TEMUAN",
            "Membuka kembali temuan yang sudah ditutup",
            {
               finding_id: data.id,
               po_id: data.po_id,
               nomor_polisi: data.nomor_polisi,
               new_status: data.status,
            },
            { actorUserId: actor.user.id },
         );
      }

       await logActivity(
          "UPDATE_TEMUAN",
          "Memperbarui temuan",
          {
             finding_id: data.id,
             po_id: data.po_id,
             armada_id: data.armada_id,
             nomor_polisi: data.nomor_polisi,
             status: data.status,
             severity: data.severity,
             due_date: data.due_date,
             resolved_at: data.resolved_at,
          },
           { actorUserId: actor.user.id },
        );

       if (data.po_id) {
          const isReopen = isReopening;
          const isClosedNow = data.status === "closed" && !wasClosed;
          if (isReopen || isClosedNow) {
             await createNotification({
                userId: data.po_id,
                title: isReopen ? "Temuan Dibuka Kembali" : "Temuan Diselesaikan",
                message: isReopen
                   ? `Temuan "${data.judul}" untuk armada ${data.nomor_polisi} dibuka kembali.`
                   : `Temuan "${data.judul}" untuk armada ${data.nomor_polisi} telah diselesaikan.`,
                type: isReopen ? "warning" : "success",
                link: `/po/temuan?highlight=${id}`,
             });
          }
       }

       return NextResponse.json({ data });
   } catch (error) {
      return actorErrorHandler(error);
   }
}
