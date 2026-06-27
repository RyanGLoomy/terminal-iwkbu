import { NextRequest, NextResponse } from "next/server";
import { sanitizeDbError } from "@/lib/db-error";
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

      ensureRoleOrThrow(actor.user, actor.profile, "po");

      const { id } = await context.params;
      const admin = createAdminClient();

      const { data: existing } = await admin
         .from("armada")
         .select("id, po_id")
         .eq("id", id)
         .single();

      if (!existing) {
         return NextResponse.json(
            { message: "Armada tidak ditemukan" },
            { status: 404 },
         );
      }

      if (existing.po_id !== actor.user.id) {
         return NextResponse.json(
            { message: "Armada bukan milik PO ini" },
            { status: 403 },
         );
      }

      const body = await request.json();
      const updatePayload: Record<string, unknown> = {};

      if (body?.nomor_polisi !== undefined) {
         updatePayload.nomor_polisi = String(body.nomor_polisi).trim().toUpperCase();
      }
      if (body?.nomor_lambung !== undefined) {
         updatePayload.nomor_lambung = String(body.nomor_lambung).trim() || null;
      }
      if (body?.merk !== undefined) {
         updatePayload.merk = String(body.merk).trim() || null;
      }
      if (body?.tipe !== undefined) {
         updatePayload.tipe = String(body.tipe).trim() || null;
      }
      if (body?.tahun_pembuatan !== undefined) {
         updatePayload.tahun_pembuatan = body.tahun_pembuatan
            ? Number(body.tahun_pembuatan)
            : null;
      }
      if (body?.nomor_chassis !== undefined) {
         updatePayload.nomor_chassis = String(body.nomor_chassis).trim() || null;
      }
      if (body?.nomor_mesin !== undefined) {
         updatePayload.nomor_mesin = String(body.nomor_mesin).trim() || null;
      }
      if (body?.kapasitas_penumpang !== undefined) {
         updatePayload.kapasitas_penumpang = body.kapasitas_penumpang
            ? Number(body.kapasitas_penumpang)
            : null;
      }
      if (body?.status_operasional !== undefined) {
         updatePayload.status_operasional = String(body.status_operasional).trim();
      }

      if (Object.keys(updatePayload).length === 0) {
         return NextResponse.json(
            { message: "Tidak ada field yang diubah" },
            { status: 400 },
         );
      }

      const { data: armada, error } = await admin
         .from("armada")
         .update(updatePayload)
         .eq("id", id)
         .select()
         .single();

      if (error) {
         if (error.code === "23505") {
            return NextResponse.json(
               { message: "Nomor polisi sudah terdaftar untuk PO ini" },
               { status: 409 },
            );
         }
         return NextResponse.json({ message: sanitizeDbError(error) }, { status: 500 });
      }

      await logActivity(
         "UPDATE_ARMADA",
         "Memperbarui data armada",
         {
            armada_id: armada.id,
            nomor_polisi: armada.nomor_polisi,
            changed_fields: Object.keys(updatePayload),
         },
         { actorUserId: actor.user.id },
      );

      return NextResponse.json({ data: armada });
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

export async function DELETE(
   _request: NextRequest,
   context: { params: Promise<{ id: string }> },
) {
   try {
      const actor = await getAuthenticatedActor();
      if (!actor) {
         return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }

      const { id } = await context.params;
      const admin = createAdminClient();

      const { data: existing } = await admin
         .from("armada")
         .select("id, po_id, nomor_polisi, status_verifikasi")
         .eq("id", id)
         .single();

      if (!existing) {
         return NextResponse.json(
            { message: "Armada tidak ditemukan" },
            { status: 404 },
         );
      }

      // Hanya Staf IW yang boleh menghapus armada milik PO lain secara administratif.
      // Admin Terminal tidak memiliki use case penghapusan armada (spec).
      const isStaf = actor.role === "staf-iw";

      if (!isStaf) {
         ensureRoleOrThrow(actor.user, actor.profile, "po");

         if (existing.po_id !== actor.user.id) {
            return NextResponse.json(
               { message: "Armada bukan milik PO ini" },
               { status: 403 },
            );
         }

         if (existing.status_verifikasi === "terverifikasi") {
            return NextResponse.json(
               {
                  message:
                     "Armada yang sudah terverifikasi tidak dapat dihapus. Hubungi Staf IW.",
               },
               { status: 400 },
            );
         }
      }

      const { error } = await admin.from("armada").delete().eq("id", id);

      if (error) {
         return NextResponse.json({ message: sanitizeDbError(error) }, { status: 500 });
      }

      await logActivity(
         "UPDATE_ARMADA",
         `Menghapus armada: ${existing.nomor_polisi}`,
         { armada_id: id, nomor_polisi: existing.nomor_polisi },
         { actorUserId: actor.user.id },
      );

      return NextResponse.json({ success: true });
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
