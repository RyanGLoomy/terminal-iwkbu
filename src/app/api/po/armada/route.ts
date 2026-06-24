import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedActor } from "@/lib/auth/server-actor";
import {
   ensureRoleOrThrow,
   AuthorizationError,
} from "@/lib/auth/requireRole.server";
import { logActivity } from "@/lib/supabase/queries/operasional.server";

const STATUS_OPERASIONAL = new Set([
   "aktif",
   "tidak_aktif",
   "rusak",
   "cadangan",
   "dijual",
]);

export async function GET() {
   try {
      const actor = await getAuthenticatedActor();
      if (!actor) {
         return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }

      ensureRoleOrThrow(actor.user, actor.profile, "po");

      const admin = createAdminClient();
      const { data, error } = await admin
         .from("armada")
         .select("*")
         .eq("po_id", actor.user.id)
         .order("created_at", { ascending: false });

      if (error) {
         return NextResponse.json(
            { message: "Gagal mengambil data armada." },
            { status: 500 },
         );
      }

      return NextResponse.json({ data: data ?? [] });
   } catch (error: unknown) {
      if (error instanceof AuthorizationError) {
         return NextResponse.json(
            { message: error.message },
            { status: 403 },
         );
      }
      return NextResponse.json(
         { message: "Internal error" },
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

      ensureRoleOrThrow(actor.user, actor.profile, "po");

      const admin = createAdminClient();

      const { data: po } = await admin
         .from("po")
         .select("status_verifikasi")
         .eq("id", actor.user.id)
         .single();

      if (!po || po.status_verifikasi !== "aktif") {
         return NextResponse.json(
            { message: "PO belum terverifikasi atau tidak aktif" },
            { status: 403 },
         );
      }

      const rawBody = await request.json().catch(() => null);
      if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
         return NextResponse.json(
            { message: "Payload tidak valid." },
            { status: 400 },
         );
      }

      const body = rawBody as Record<string, unknown>;
      const readText = (key: string) =>
         typeof body[key] === "string" ? body[key].trim() : "";
      const readOptionalNumber = (key: string) => {
         const value = body[key];
         if (value === undefined || value === null || value === "") return null;
         const numberValue = Number(value);
         return Number.isInteger(numberValue) && numberValue >= 0
            ? numberValue
            : Number.NaN;
      };

      const nomor_polisi = readText("nomor_polisi");
      const nomor_lambung = readText("nomor_lambung") || null;
      const merk = readText("merk") || null;
      const tipe = readText("tipe") || null;
      const tahun_pembuatan = readOptionalNumber("tahun_pembuatan");
      const nomor_chassis = readText("nomor_chassis") || null;
      const nomor_mesin = readText("nomor_mesin") || null;
      const kapasitas_penumpang = readOptionalNumber("kapasitas_penumpang");
      const status_operasional = readText("status_operasional") || "aktif";

      if (!nomor_polisi) {
         return NextResponse.json(
            { message: "Nomor polisi wajib diisi" },
            { status: 400 },
         );
      }

      if (Number.isNaN(tahun_pembuatan)) {
         return NextResponse.json(
            { message: "Tahun pembuatan tidak valid." },
            { status: 400 },
         );
      }

      if (Number.isNaN(kapasitas_penumpang)) {
         return NextResponse.json(
            { message: "Kapasitas penumpang tidak valid." },
            { status: 400 },
         );
      }

      if (!STATUS_OPERASIONAL.has(status_operasional)) {
         return NextResponse.json(
            { message: "Status operasional tidak valid." },
            { status: 400 },
         );
      }

      const { data: armada, error } = await admin
         .from("armada")
         .insert({
            po_id: actor.user.id,
            nomor_polisi: nomor_polisi.toUpperCase(),
            nomor_lambung,
            merk,
            tipe,
            tahun_pembuatan,
            nomor_chassis,
            nomor_mesin,
            kapasitas_penumpang,
            status_operasional,
            status_verifikasi: "menunggu",
         })
         .select()
         .single();

      if (error) {
         if (error.code === "23505") {
            return NextResponse.json(
               { message: "Nomor polisi sudah terdaftar untuk PO ini" },
               { status: 409 },
            );
         }
         return NextResponse.json(
            { message: "Gagal membuat armada." },
            { status: 500 },
         );
      }

      await logActivity(
         "BUAT_ARMADA",
         "Membuat data armada baru",
         {
            armada_id: armada.id,
            nomor_polisi: armada.nomor_polisi,
            nomor_lambung: armada.nomor_lambung,
            merk: armada.merk,
            tipe: armada.tipe,
         },
         { actorUserId: actor.user.id },
      );

      return NextResponse.json({ data: armada }, { status: 201 });
   } catch (error: unknown) {
      if (error instanceof AuthorizationError) {
         return NextResponse.json(
            { message: error.message },
            { status: 403 },
         );
      }
      return NextResponse.json(
         { message: "Internal error" },
         { status: 500 },
      );
   }
}
