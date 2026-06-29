import { NextResponse } from "next/server";
import { sanitizeDbError } from "@/lib/db-error";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActor, actorErrorHandler } from "@/lib/auth/actor";
import { ROLES } from "@/config/roles";

export async function GET() {
   try {
      const actor = await requireActor(ROLES.PO);

      const admin = createAdminClient();
      const { data, error } = await admin
         .from("findings")
          .select(
             "id, po_id, armada_id, nomor_polisi, source_type, judul, deskripsi, severity, status, source_date, due_date, created_by, resolved_by, resolved_at, resolution_note, created_at, updated_at, po:po_id(kode_po, nama_perusahaan), armada:armada_id(nomor_polisi, nomor_lambung, status_verifikasi, status_operasional), finding_clarifications(id, finding_id, responder_id, responder_role, decision, message, evidence, created_at)",
          )
         .eq("po_id", actor.user.id)
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
