import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedActor } from "@/lib/auth/server-actor";
import {
   ensureRoleOrThrow,
   AuthorizationError,
} from "@/lib/auth/requireRole.server";
import { logActivity } from "@/lib/supabase/queries/operasional.server";

export async function PATCH(
   request: NextRequest,
   context: { params: Promise<{ id: string }> },
) {
   try {
      const actor = await getAuthenticatedActor();
      if (!actor) {
         return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }

      ensureRoleOrThrow(actor.user, actor.profile, [
         "staf-iw",
         "admin-terminal",
      ]);

      const { id } = await context.params;
      const body = await request.json();
      const updatePayload: Record<string, unknown> = {};

      if (body?.kode_po !== undefined) {
         updatePayload.kode_po = String(body.kode_po).trim();
      }
      if (body?.nama_perusahaan !== undefined) {
         updatePayload.nama_perusahaan = String(body.nama_perusahaan).trim();
      }
      if (body?.nama_pemilik !== undefined) {
         updatePayload.nama_pemilik = String(body.nama_pemilik).trim() || null;
      }
      if (body?.alamat !== undefined) {
         updatePayload.alamat = String(body.alamat).trim() || null;
      }
      if (body?.telepon !== undefined) {
         updatePayload.telepon = String(body.telepon).trim() || null;
      }
      if (body?.npwp !== undefined) {
         updatePayload.npwp = String(body.npwp).trim() || null;
      }

      if (Object.keys(updatePayload).length === 0) {
         return NextResponse.json(
            { message: "Tidak ada field yang diubah" },
            { status: 400 },
         );
      }

      const admin = createAdminClient();

      const { data: existing } = await admin
         .from("po")
         .select("id")
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
         .update(updatePayload)
         .eq("id", id)
         .select()
         .single();

      if (error) {
         return NextResponse.json({ message: error.message }, { status: 500 });
      }

      await logActivity(
         "EDIT_PO",
         "Mengedit data PO",
         {
            po_id: po.id,
            kode_po: po.kode_po,
            nama_perusahaan: po.nama_perusahaan,
            changed_fields: Object.keys(updatePayload),
         },
         { actorUserId: actor.user.id },
      );

      return NextResponse.json({ data: po });
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
