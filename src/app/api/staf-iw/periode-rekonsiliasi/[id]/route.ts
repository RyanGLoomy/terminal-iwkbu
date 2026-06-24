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

      if (body?.status !== undefined) {
         const status = body.status as string;
         if (!["draft", "aktif", "ditutup"].includes(status)) {
            return NextResponse.json(
               { message: "Status tidak valid." },
               { status: 400 },
            );
         }
         updatePayload.status = status;
         if (status === "ditutup") {
            updatePayload.closed_at = new Date().toISOString();
         }
      }

      if (body?.nama_periode !== undefined) {
         updatePayload.nama_periode = String(body.nama_periode).trim();
      }
      if (body?.tanggal_mulai !== undefined) {
         updatePayload.tanggal_mulai = body.tanggal_mulai;
      }
      if (body?.tanggal_selesai !== undefined) {
         updatePayload.tanggal_selesai = body.tanggal_selesai;
      }
      if (body?.catatan !== undefined) {
         updatePayload.catatan = String(body.catatan).trim() || null;
      }

      if (Object.keys(updatePayload).length === 0) {
         return NextResponse.json(
            { message: "Tidak ada field yang diubah" },
            { status: 400 },
         );
      }

      updatePayload.updated_at = new Date().toISOString();

      const admin = createAdminClient();
      const { data, error } = await admin
         .from("rekonsiliasi_periode")
         .update(updatePayload)
         .eq("id", id)
         .select()
         .single();

      if (error) {
         return NextResponse.json({ message: error.message }, { status: 500 });
      }

      await logActivity(
         "PERIODE_REKONSILIASI",
         `Memperbarui periode rekonsiliasi: ${data.nama_periode}`,
         { periode_id: id, changes: Object.keys(updatePayload) },
         { actorUserId: actor.user.id },
      );

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

export async function DELETE(
   _request: NextRequest,
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
      const admin = createAdminClient();

      const { data: existing } = await admin
         .from("rekonsiliasi_periode")
         .select("id, nama_periode, status")
         .eq("id", id)
         .single();

      if (!existing) {
         return NextResponse.json(
            { message: "Periode tidak ditemukan" },
            { status: 404 },
         );
      }

      if (existing.status !== "draft") {
         return NextResponse.json(
            { message: "Hanya periode dengan status draft yang dapat dihapus." },
            { status: 400 },
         );
      }

      const { error } = await admin
         .from("rekonsiliasi_periode")
         .delete()
         .eq("id", id);

      if (error) {
         return NextResponse.json({ message: error.message }, { status: 500 });
      }

      await logActivity(
         "PERIODE_REKONSILIASI",
         `Menghapus periode rekonsiliasi: ${existing.nama_periode}`,
         { periode_id: id },
         { actorUserId: actor.user.id },
      );

      return NextResponse.json({ success: true });
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
