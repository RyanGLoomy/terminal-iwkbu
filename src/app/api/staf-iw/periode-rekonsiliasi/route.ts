import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedActor } from "@/lib/auth/server-actor";
import {
   ensureRoleOrThrow,
   AuthorizationError,
} from "@/lib/auth/requireRole.server";
import { logActivity } from "@/lib/supabase/queries/operasional.server";

export async function GET() {
   try {
      const actor = await getAuthenticatedActor();
      if (!actor) {
         return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }

      try {
         ensureRoleOrThrow(actor.user, actor.profile, [
            "staf-iw",
            "admin-terminal",
         ]);
      } catch (e) {
         if (e instanceof AuthorizationError) {
            return NextResponse.json(
               { message: "Akses ditolak" },
               { status: 403 },
            );
         }
         throw e;
      }

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
   } catch {
      return NextResponse.json(
         { message: "Terjadi kesalahan internal" },
         { status: 500 },
      );
   }
}

export async function POST(request: NextRequest) {
   try {
      const actor = await getAuthenticatedActor();
      if (!actor) {
         return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }

      ensureRoleOrThrow(actor.user, actor.profile, [
         "staf-iw",
         "admin-terminal",
      ]);

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
         return NextResponse.json({ message: error.message }, { status: 500 });
      }

      await logActivity(
         "PERIODE_REKONSILIASI",
         `Membuat periode rekonsiliasi: ${nama_periode}`,
         { periode_id: data.id, nama_periode, tanggal_mulai, tanggal_selesai },
         { actorUserId: actor.user.id },
      );

      return NextResponse.json({ data }, { status: 201 });
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
