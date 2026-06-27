import { NextRequest, NextResponse } from "next/server";
import { sanitizeDbError } from "@/lib/db-error";
import { getAuthenticatedActor } from "@/lib/auth/server-actor";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/supabase/queries/operasional.server";

export async function PATCH(
   request: NextRequest,
   { params }: { params: Promise<{ id: string }> },
) {
   try {
      const actor = await getAuthenticatedActor();
      if (!actor) {
         return NextResponse.json(
            { message: "Unauthorized" },
            { status: 401 },
         );
      }

      if (actor.role !== "staf-iw") {
         return NextResponse.json(
            { message: "Forbidden" },
            { status: 403 },
         );
      }

      const { id } = await params;
      const body = await request.json();

      const updates: Record<string, unknown> = {};
      if (typeof body.nama === "string" && body.nama.trim())
         updates.nama = body.nama.trim();
      if (typeof body.kode === "string" && body.kode.trim())
         updates.kode = body.kode.trim().toUpperCase();
      if (typeof body.keterangan === "string")
         updates.keterangan = body.keterangan.trim() || null;
      if (typeof body.urutan === "number" && body.urutan >= 0)
         updates.urutan = body.urutan;
      if (typeof body.is_active === "boolean")
         updates.is_active = body.is_active;

      if (Object.keys(updates).length === 0) {
         return NextResponse.json(
            { message: "Tidak ada field yang diubah" },
            { status: 400 },
         );
      }

      const admin = createAdminClient();
      const { data, error } = await admin
         .from("jenis_kendaraan")
         .update(updates)
         .eq("id", id)
         .select()
         .single();

      if (error) {
         const status = error.code === "23505" ? 409 : 500;
         return NextResponse.json(
            { message: sanitizeDbError(error) },
            { status },
         );
      }

      await logActivity(
         "UPDATE_JENIS_KENDARAAN",
         `Ubah jenis kendaraan: ${data.nama} (${data.kode})`,
         { table: "jenis_kendaraan", id: data.id },
         { actorUserId: actor.user.id },
      );

      return NextResponse.json({ data });
   } catch (error: any) {
      return NextResponse.json(
         { message: error?.message ?? "Internal error" },
         { status: 500 },
      );
   }
}

export async function DELETE(
   _request: NextRequest,
   { params }: { params: Promise<{ id: string }> },
) {
   try {
      const actor = await getAuthenticatedActor();
      if (!actor) {
         return NextResponse.json(
            { message: "Unauthorized" },
            { status: 401 },
         );
      }

      if (actor.role !== "staf-iw") {
         return NextResponse.json(
            { message: "Forbidden" },
            { status: 403 },
         );
      }

      const { id } = await params;

      const admin = createAdminClient();
      const { error } = await admin
         .from("jenis_kendaraan")
         .delete()
         .eq("id", id);

      if (error) {
         return NextResponse.json(
            { message: sanitizeDbError(error) },
            { status: 500 },
         );
      }

      await logActivity(
         "HAPUS_JENIS_KENDARAAN",
         `Hapus jenis kendaraan ID: ${id}`,
         { table: "jenis_kendaraan", id },
         { actorUserId: actor.user.id },
      );

      return NextResponse.json({ success: true });
   } catch (error: any) {
      return NextResponse.json(
         { message: error?.message ?? "Internal error" },
         { status: 500 },
      );
   }
}
