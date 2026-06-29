import { NextRequest, NextResponse } from "next/server";
import { sanitizeDbError } from "@/lib/db-error";
import { requireActor, actorErrorHandler } from "@/lib/auth/actor";
import { ROLES } from "@/config/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/supabase/queries/operasional.server";

export async function GET() {
   try {
      await requireActor([ROLES.STAF_IW, ROLES.ADMIN_TERMINAL]);

      const admin = createAdminClient();
      const { data, error } = await admin
         .from("jenis_kendaraan")
         .select("*")
         .order("urutan", { ascending: true });

      if (error) {
         return NextResponse.json(
            { message: sanitizeDbError(error) },
            { status: 500 },
         );
      }

      return NextResponse.json({ data: data ?? [] });
   } catch (error) {
      return actorErrorHandler(error);
   }
}

export async function POST(request: NextRequest) {
   try {
      const actor = await requireActor(ROLES.STAF_IW);

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
            { message: sanitizeDbError(error) },
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
   } catch (error) {
      return actorErrorHandler(error);
   }
}
