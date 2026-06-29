import { NextRequest, NextResponse } from "next/server";
import { sanitizeDbError } from "@/lib/db-error";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActor, actorErrorHandler } from "@/lib/auth/actor";
import { ROLES } from "@/config/roles";
import { logActivity } from "@/lib/supabase/queries/operasional.server";

export async function GET() {
   try {
      await requireActor(ROLES.STAF_IW);

      const admin = createAdminClient();
      const { data, error } = await admin
         .from("rekonsiliasi_periode")
         .select("*")
         .order("tanggal_mulai", { ascending: false });

      if (error) {
         return NextResponse.json(
            { message: "Terjadi kesalahan internal" },
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
      const actor = await requireActor([ROLES.STAF_IW, ROLES.ADMIN_TERMINAL]);

      const body = await request.json();
      const nama_periode = (body?.nama_periode as string)?.trim();
      const tanggal_mulai = body?.tanggal_mulai as string | undefined;
      const tanggal_selesai = body?.tanggal_selesai as string | undefined;
      const catatan = (body?.catatan as string | undefined)?.trim() ?? null;

      if (!nama_periode || !tanggal_mulai || !tanggal_selesai) {
         return NextResponse.json(
            { message: "Nama periode, tanggal mulai, dan tanggal selesai wajib diisi." },
            { status: 400 },
         );
      }

      if (new Date(tanggal_mulai) > new Date(tanggal_selesai)) {
         return NextResponse.json(
            { message: "Tanggal mulai tidak boleh setelah tanggal selesai." },
            { status: 400 },
         );
      }

      const admin = createAdminClient();
      const { data, error } = await admin
         .from("rekonsiliasi_periode")
         .insert({
            nama_periode,
            tanggal_mulai,
            tanggal_selesai,
            catatan,
            created_by: actor.user.id,
            status: "draft",
         })
         .select()
         .single();

      if (error) {
         return NextResponse.json({ message: sanitizeDbError(error) }, { status: 500 });
      }

      await logActivity(
         "PERIODE_REKONSILIASI",
         `Membuat periode rekonsiliasi: ${nama_periode}`,
         { periode_id: data.id, nama_periode, tanggal_mulai, tanggal_selesai },
         { actorUserId: actor.user.id },
      );

      return NextResponse.json({ data }, { status: 201 });
   } catch (error) {
      return actorErrorHandler(error);
   }
}
