import { NextRequest, NextResponse } from "next/server";
import { sanitizeDbError } from "@/lib/db-error";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedActor } from "@/lib/auth/server-actor";
import {
   ensureRoleOrThrow,
   AuthorizationError,
} from "@/lib/auth/requireRole.server";
import { logActivity } from "@/lib/supabase/queries/operasional.server";
import { createNotification } from "@/lib/supabase/queries/notifications.server";

const ALLOWED_MIME = [
   "application/pdf",
   "image/jpeg",
   "image/png",
   "image/webp",
];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(
   request: NextRequest,
   context: { params: Promise<{ id: string }> },
) {
   try {
      const actor = await getAuthenticatedActor();
      if (!actor) {
         return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }

      ensureRoleOrThrow(actor.user, actor.profile, "staf-iw");

      const { id } = await context.params;
      const formData = await request.formData();
      const decision = (formData.get("decision") as string | null) ?? undefined;
      const message = (
         (formData.get("message") as string | null) ?? ""
      ).trim();
      const evidenceLink = (
         (formData.get("evidenceLink") as string | null) ?? ""
      ).trim() || undefined;
      const evidenceFile = formData.get("evidenceFile") as File | null;

      if (
         !decision ||
         !["menerima", "menolak", "melengkapi"].includes(decision)
      ) {
         return NextResponse.json(
            { message: "Keputusan klarifikasi tidak valid" },
            { status: 400 },
         );
      }

      if (!message) {
         return NextResponse.json(
            { message: "Pesan klarifikasi wajib diisi" },
            { status: 400 },
         );
      }

      const admin = createAdminClient();

      const { data: finding, error: findingError } = await admin
         .from("findings")
         .select("id, po_id, status, created_by, judul, nomor_polisi")
         .eq("id", id)
         .single();

      if (findingError || !finding) {
         return NextResponse.json(
            { message: "Temuan tidak ditemukan" },
            { status: 404 },
         );
      }

      if (finding.status === "closed") {
         return NextResponse.json(
            { message: "Temuan sudah ditutup" },
            { status: 409 },
         );
      }

      const evidence: Record<string, unknown> = {};
      if (evidenceLink) evidence.link = evidenceLink;

      if (evidenceFile && evidenceFile.size > 0) {
         if (!ALLOWED_MIME.includes(evidenceFile.type)) {
            return NextResponse.json(
               { message: "Format file tidak didukung. Gunakan PDF, JPEG, PNG, atau WebP." },
               { status: 400 },
            );
         }
         if (evidenceFile.size > MAX_FILE_SIZE) {
            return NextResponse.json(
               { message: "Ukuran file melebihi batas 5 MB" },
               { status: 400 },
            );
         }

         const filePath = `${id}/${Date.now()}-${evidenceFile.name}`;
         const { error: uploadError } = await admin.storage
            .from("finding-evidence")
            .upload(filePath, evidenceFile, {
               contentType: evidenceFile.type,
               upsert: false,
            });

         if (uploadError) {
            return NextResponse.json(
               { message: `Gagal mengunggah file: ${uploadError.message}` },
               { status: 500 },
            );
         }

         evidence.file_path = filePath;
         evidence.file_name = evidenceFile.name;
      }

      const { data, error } = await admin
         .from("finding_clarifications")
         .insert({
            finding_id: id,
            responder_id: actor.user.id,
            responder_role: "staf-iw",
            decision,
            message,
            evidence,
         })
         .select(
            "id, finding_id, responder_id, responder_role, decision, message, evidence, created_at",
         )
         .single();

      if (error) {
         return NextResponse.json({ message: sanitizeDbError(error) }, { status: 500 });
      }

      const { error: statusError } = await admin
         .from("findings")
         .update({ status: "on_progress" })
         .eq("id", id);

      if (statusError) {
         console.error(
            "Failed to auto-update finding status after staf clarification:",
            statusError.message,
         );
      }

      await logActivity(
         "KIRIM_KLARIFIKASI",
         "Mengirim klarifikasi temuan (staf-iw)",
         {
            finding_id: id,
            clarification_id: data.id,
            po_id: finding.po_id,
            decision,
            responder_role: "staf-iw",
             has_evidence_link: Boolean(evidenceLink),
             has_evidence_file: Boolean(evidenceFile),
         },
          { actorUserId: actor.user.id },
       );

       await createNotification({
          userId: finding.po_id,
          title: "Staf IW Merespon Klarifikasi",
          message: `Staf IW merespon klarifikasi temuan: ${finding.judul}`,
          type: "info",
          link: "/po/temuan",
       });

       return NextResponse.json({ data }, { status: 201 });
   } catch (error: any) {
      if (error instanceof AuthorizationError) {
         return NextResponse.json(
            { message: sanitizeDbError(error) },
            { status: 403 },
         );
      }
      return NextResponse.json(
         { message: error?.message ?? "Internal error" },
         { status: 500 },
      );
   }
}
