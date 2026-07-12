import { NextRequest, NextResponse } from "next/server";
import { sanitizeDbError } from "@/lib/db-error";
import { logActivity } from "@/lib/supabase/queries/operasional.server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActor, actorErrorHandler } from "@/lib/auth/actor";
import { ROLES } from "@/config/roles";

const ALLOWED_MIME = [
   "application/pdf",
   "image/jpeg",
   "image/png",
   "image/webp",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const VALID_JENIS = ["stck", "kir", "asuransi", "lainnya"] as const;

export async function POST(
   request: NextRequest,
   context: { params: Promise<{ id: string }> },
) {
   try {
      const actor = await requireActor(ROLES.PO);

      const { id: armadaId } = await context.params;
      const admin = createAdminClient();

      const { data: armada } = await admin
         .from("armada")
         .select("id, po_id")
         .eq("id", armadaId)
         .single();

      if (!armada) {
         return NextResponse.json(
            { message: "Armada tidak ditemukan" },
            { status: 404 },
         );
      }

      if (armada.po_id !== actor.user.id) {
         return NextResponse.json(
            { message: "Armada bukan milik PO ini" },
            { status: 403 },
         );
      }

      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const jenis = formData.get("jenis") as string | null;

      if (!file) {
         return NextResponse.json(
            { message: "File wajib diunggah" },
            { status: 400 },
         );
      }

      if (!jenis || !VALID_JENIS.includes(jenis as (typeof VALID_JENIS)[number])) {
         return NextResponse.json(
            { message: "Jenis dokumen tidak valid" },
            { status: 400 },
         );
      }

      if (!ALLOWED_MIME.includes(file.type)) {
         return NextResponse.json(
            {
               message: `Tipe file tidak diizinkan. Gunakan: PDF, JPEG, PNG, atau WebP.`,
            },
            { status: 400 },
         );
      }

      if (file.size > MAX_FILE_SIZE) {
         return NextResponse.json(
            { message: "Ukuran file maksimal 5 MB" },
            { status: 400 },
         );
      }

      // APP-03: sanitize the extension to alphanumerics only — File.name is
      // client-controlled and could carry traversal/special chars.
      const rawExt = file.name.split(".").pop() ?? "pdf";
      const ext = rawExt.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8) || "pdf";
      const filePath = `${armada.po_id}/${armadaId}/${jenis}-${Date.now()}.${ext}`;

      const fileBuffer = Buffer.from(await file.arrayBuffer());

      const { error: uploadError } = await admin.storage
         .from("armada-dokumen")
         .upload(filePath, fileBuffer, {
            contentType: file.type,
            upsert: false,
         });

      if (uploadError) {
         return NextResponse.json(
            { message: sanitizeDbError(uploadError, "po-armada-dokumen upload") },
            { status: 500 },
         );
      }

      const { data, error: dbError } = await admin
         .from("armada_dokumen")
         .insert({
            armada_id: armadaId,
            jenis_dokumen: jenis,
            file_path: filePath,
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type,
            uploaded_by: actor.user.id,
         })
         .select()
         .single();

      if (dbError) {
         await admin.storage.from("armada-dokumen").remove([filePath]);
         return NextResponse.json(
            { message: sanitizeDbError(dbError, "po-armada-dokumen insert") },
            { status: 500 },
         );
      }

      await logActivity(
         "UPLOAD_DOKUMEN_ARMADA",
         "Mengunggah dokumen armada",
         { armada_id: armadaId, jenis_dokumen: jenis, file_name: file.name, file_size: file.size },
         { actorUserId: actor.user.id },
      );

      return NextResponse.json({ data }, { status: 201 });
   } catch (error) {
      return actorErrorHandler(error);
   }
}
