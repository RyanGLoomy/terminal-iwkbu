import { NextResponse } from "next/server";
import { sanitizeDbError } from "@/lib/db-error";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActor, actorErrorHandler } from "@/lib/auth/actor";
import { ROLES } from "@/config/roles";
import { logActivity } from "@/lib/supabase/queries/operasional.server";
import { createNotification } from "@/lib/supabase/queries/notifications.server";

export async function GET() {
   try {
      await requireActor(ROLES.STAF_IW);

      const admin = createAdminClient();
       const { data, error } = await admin
          .from("findings")
          .select(
             "id, po_id, armada_id, nomor_polisi, source_type, judul, deskripsi, severity, status, source_date, due_date, created_by, resolved_by, resolved_at, resolution_note, created_at, updated_at, po:po_id(kode_po, nama_perusahaan), armada:armada_id(nomor_polisi, nomor_lambung, status_verifikasi, status_operasional), finding_clarifications(id, finding_id, responder_id, responder_role, decision, message, evidence, created_at), finding_actions(id, finding_id, action_text, status, done_at, done_by, created_by, created_at)",
          )
          .order("created_at", { ascending: false })
         .limit(200);

      if (error) {
         return NextResponse.json({ message: sanitizeDbError(error) }, { status: 500 });
      }

      return NextResponse.json({ data: data ?? [] });
   } catch (error) {
      return actorErrorHandler(error);
   }
}

export async function POST(request: Request) {
   try {
      const actor = await requireActor(ROLES.STAF_IW);

      const body = await request.json();
      const poId =
         (body?.poId as string | undefined)?.trim() ??
         (body?.po_id as string | undefined)?.trim();
      const armadaId =
         (body?.armadaId as string | undefined)?.trim() ??
         (body?.armada_id as string | undefined)?.trim() ??
         null;
      const nomorPolisiInput =
         (body?.nomorPolisi as string | undefined)?.trim() ??
         (body?.nomor_polisi as string | undefined)?.trim();
      const sourceType =
         (body?.sourceType as string | undefined)?.trim() ?? "rekonsiliasi";
      const judul = (body?.judul as string | undefined)?.trim();
      const deskripsi = (body?.deskripsi as string | undefined)?.trim();
      const severity =
         (body?.severity as string | undefined)?.trim() ?? "medium";
       const sourceDate =
          (body?.sourceDate as string | undefined)?.trim() ?? null;
       const dueDate =
          (body?.dueDate as string | undefined)?.trim() ?? null;

      if (!judul || !deskripsi) {
         return NextResponse.json(
            { message: "Judul dan deskripsi wajib diisi" },
            { status: 400 },
         );
      }

      const admin = createAdminClient();
      let resolvedPoId = poId;
      let resolvedNomorPolisi = nomorPolisiInput;

      if (armadaId) {
         const { data: armada, error: armadaError } = await admin
            .from("armada")
            .select("id, po_id, nomor_polisi")
            .eq("id", armadaId)
            .single();

         if (armadaError || !armada) {
            return NextResponse.json(
               { message: "Armada tidak valid" },
               { status: 400 },
            );
         }

         resolvedPoId = resolvedPoId ?? armada.po_id;
         resolvedNomorPolisi = resolvedNomorPolisi || armada.nomor_polisi;
      }

      if (!resolvedPoId) {
         return NextResponse.json(
            { message: "PO wajib dipilih" },
            { status: 400 },
         );
      }

      if (!resolvedNomorPolisi) {
         return NextResponse.json(
            { message: "Nomor polisi wajib diisi" },
            { status: 400 },
         );
      }

      const { data, error } = await admin
         .from("findings")
          .insert({
             po_id: resolvedPoId,
             armada_id: armadaId,
             nomor_polisi: resolvedNomorPolisi,
             source_type: sourceType,
             judul,
             deskripsi,
             severity,
             status: "open",
             source_date: sourceDate,
             due_date: dueDate || null,
             created_by: actor.user.id,
          })
          .select(
             "id, po_id, armada_id, nomor_polisi, source_type, judul, deskripsi, severity, status, source_date, due_date, created_by, resolved_by, resolved_at, resolution_note, created_at, updated_at",
          )
         .single();

      if (error) {
         return NextResponse.json({ message: sanitizeDbError(error) }, { status: 500 });
      }

       await logActivity(
          "BUAT_TEMUAN",
           "Membuat temuan rekonsiliasi",
           {
              finding_id: data.id,
              po_id: data.po_id,
              armada_id: data.armada_id,
              nomor_polisi: data.nomor_polisi,
              severity: data.severity,
              source_type: data.source_type,
              due_date: data.due_date,
           },
           { actorUserId: actor.user.id },
        );

       await createNotification({
          userId: data.po_id,
          title: "Temuan Baru",
          message: `Temuan untuk armada ${data.nomor_polisi}: ${data.judul}`,
          type: "warning",
          link: "/po/temuan",
       });

        return NextResponse.json({ data }, { status: 201 });
   } catch (error) {
      return actorErrorHandler(error);
   }
}
