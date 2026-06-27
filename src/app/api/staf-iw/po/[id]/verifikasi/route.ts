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

      return NextResponse.json({ data: po });
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
