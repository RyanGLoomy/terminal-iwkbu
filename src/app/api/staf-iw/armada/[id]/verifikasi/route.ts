import { NextRequest, NextResponse } from "next/server";
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

      if (!status || !["terverifikasi", "ditolak"].includes(status)) {
         return NextResponse.json(
            { message: "Status verifikasi tidak valid" },
            { status: 400 },
         );
      }

      const admin = createAdminClient();

      const { data: existing } = await admin
         .from("armada")
         .select("id, po_id, nomor_polisi")
         .eq("id", id)
         .single();

      if (!existing) {
         return NextResponse.json(
            { message: "Armada tidak ditemukan" },
            { status: 404 },
         );
      }

      const { data: armada, error } = await admin
         .from("armada")
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
         return NextResponse.json({ message: error.message }, { status: 500 });
      }

      await logActivity(
         "VERIFIKASI_ARMADA",
         status === "terverifikasi"
            ? "Memverifikasi armada"
            : "Menolak armada",
         {
            armada_id: armada.id,
            po_id: existing.po_id,
            nomor_polisi: existing.nomor_polisi,
            status_verifikasi: status,
            keterangan: keterangan,
         },
         { actorUserId: actor.user.id },
      );

      await createNotification({
         userId: existing.po_id,
         title:
            status === "terverifikasi"
               ? "Armada Diverifikasi"
               : "Armada Ditolak",
         message: `Armada ${existing.nomor_polisi} ${status === "terverifikasi" ? "telah diverifikasi" : "ditolak"}.`,
         type: status === "terverifikasi" ? "success" : "warning",
         link: "/po",
      });

      return NextResponse.json({ data: armada });
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
