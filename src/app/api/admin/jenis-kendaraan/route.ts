import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedActor } from "@/lib/auth/server-actor";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/supabase/queries/operasional.server";

export async function GET() {
   try {
      const actor = await getAuthenticatedActor();
      if (!actor) {
         return NextResponse.json(
            { message: "Unauthorized" },
            { status: 401 },
         );
      }

      const admin = createAdminClient();
      const { data, error } = await admin
         .from("jenis_kendaraan")
         .select("*")
         .order("urutan", { ascending: true });

      if (error) {
         return NextResponse.json(
            { message: error.message },
            { status: 500 },
         );
      }

      return NextResponse.json({ data: data ?? [] });
   } catch (error: any) {
      return NextResponse.json(
         { message: error?.message ?? "Internal error" },
         { status: 500 },
      );
   }
}

export async function POST(request: NextRequest) {
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

      const body = await request.json();
      const nama = typeof body.nama === "string" ? body.nama.trim() : "";
      const kode = typeof body.kode === "string" ? body.kode.trim().toUpperCase() : "";
      const keterangan =
         typeof body.keterangan === "string" ? body.keterangan.trim() : null;
      const urutan =
         typeof body.urutan === "number" && body.urutan >= 0
            ? body.urutan
            : 0;
      const isActive =
         typeof body.is_active === "boolean" ? body.is_active : true;

      if (!nama || !kode) {
         return NextResponse.json(
            { message: "Nama dan kode wajib diisi" },
            { status: 400 },
         );
      }

      const admin = createAdminClient();
      const { data, error } = await admin
         .from("jenis_kendaraan")
         .insert({ nama, kode, keterangan, urutan, is_active: isActive })
         .select()
         .single();

      if (error) {
         const status = error.code === "23505" ? 409 : 500;
         return NextResponse.json(
            { message: error.message },
            { status },
         );
      }

      await logActivity(
         "BUAT_JENIS_KENDARAAN",
         `Tambah jenis kendaraan: ${nama} (${kode})`,
         { table: "jenis_kendaraan", id: data.id },
         { actorUserId: actor.user.id },
      );

      return NextResponse.json({ data }, { status: 201 });
   } catch (error: any) {
      return NextResponse.json(
         { message: error?.message ?? "Internal error" },
         { status: 500 },
      );
   }
}
