import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { sanitizeDbError } from "@/lib/db-error";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActor, actorErrorHandler } from "@/lib/auth/actor";
import { ROLES } from "@/config/roles";
import { logActivity } from "@/lib/supabase/queries/operasional.server";
import { createNotification } from "@/lib/supabase/queries/notifications.server";

export async function POST(
   request: NextRequest,
   context: { params: Promise<{ id: string }> },
) {
   try {
      const actor = await requireActor(ROLES.STAF_IW);

      const { id } = await context.params;
      const body = await request.json();
      const status = body?.status as string | undefined;
      const keterangan = (body?.keterangan as string | undefined)?.trim() ?? null;

      if (!status || !["aktif", "ditolak"].includes(status)) {
         return NextResponse.json(
            { message: "Status verifikasi tidak valid" },
            { status: 400 },
         );
      }

      const admin = createAdminClient();

      const { data: existing } = await admin
         .from("po")
         .select("id, kode_po, nama_perusahaan")
         .eq("id", id)
         .single();

      if (!existing) {
         return NextResponse.json(
            { message: "PO tidak ditemukan" },
            { status: 404 },
         );
      }

      const { data: po, error } = await admin
         .from("po")
         .update({
            status_verifikasi: status,
            diverifikasi_oleh: actor.user.id,
            tanggal_verifikasi: new Date().toISOString(),
            keterangan_verifikasi: keterangan,
         })
         .eq("id", id)
         .select()
         .single();

      if (error) {
         return NextResponse.json({ message: sanitizeDbError(error) }, { status: 500 });
      }

      // Saat PO disetujui, pastikan role `po` terpasang di user_roles.
      // Self-registration tidak lagi menugaskan role otomatis (AUTH-01 fix:
      // trigger hanya membaca app_metadata yang server-only), jadi role harus
      // dipasang eksplisit saat verifikasi.
      if (status === "aktif") {
         const { data: poRole } = await admin
            .from("roles")
            .select("id")
            .eq("name", "po")
            .single();
         if (poRole) {
            await admin.from("user_roles").upsert(
               { user_id: id, role_id: poRole.id },
               { onConflict: "user_id,role_id" },
            );
         }
      }

      await logActivity(
         "VERIFIKASI_PO",
         status === "aktif" ? "Memverifikasi PO" : "Menolak PO",
         {
            po_id: po.id,
            kode_po: existing.kode_po,
            nama_perusahaan: existing.nama_perusahaan,
            status_verifikasi: status,
            keterangan: keterangan,
         },
         { actorUserId: actor.user.id },
      );

      await createNotification({
         userId: id,
         title: status === "aktif" ? "PO Terverifikasi" : "PO Ditolak",
         message:
            status === "aktif"
               ? "Akun PO Anda telah diverifikasi dan diaktifkan."
               : `Pendaftaran PO ditolak. ${keterangan ?? ""}`,
         type: status === "aktif" ? "success" : "error",
         link: status === "aktif" ? "/po" : undefined,
      });

      revalidateTag("po-stats", "default");

      return NextResponse.json({ data: po });
   } catch (error) {
      return actorErrorHandler(error);
   }
}