import { NextRequest, NextResponse } from "next/server";
import { sanitizeDbError } from "@/lib/db-error";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActor, actorErrorHandler } from "@/lib/auth/actor";
import { ROLES } from "@/config/roles";
import { logActivity } from "@/lib/supabase/queries/operasional.server";
import { executeIwkbuSync } from "@/lib/supabase/queries/iwkbu-sync.server";

export async function PATCH(
   request: NextRequest,
   context: { params: Promise<{ id: string }> },
) {
   try {
      const actor = await requireActor(ROLES.STAF_IW);

      const { id } = await context.params;
      const body = await request.json();
      const updatePayload: Record<string, unknown> = {};

      const admin = createAdminClient();

      // Cek status saat ini untuk validasi transisi
      const { data: current } = await admin
         .from("rekonsiliasi_periode")
         .select("id, status, nama_periode")
         .eq("id", id)
         .single();

      if (!current) {
         return NextResponse.json(
            { message: "Periode tidak ditemukan" },
            { status: 404 },
         );
      }

      if (body?.status !== undefined) {
         const status = body.status as string;
         if (!["draft", "aktif", "ditutup"].includes(status)) {
            return NextResponse.json(
               { message: "Status tidak valid." },
               { status: 400 },
            );
         }

         // Validasi transisi: tidak boleh mundur dari ditutup
         if (current.status === "ditutup" && status !== "ditutup") {
            return NextResponse.json(
               { message: "Periode yang sudah ditutup tidak dapat diubah statusnya." },
               { status: 400 },
            );
         }

         updatePayload.status = status;
         const nowIso = new Date().toISOString();

         // === AKTIVASI: draft → aktif ===
         if (status === "aktif" && current.status !== "aktif") {
            // 1. Tutup semua periode aktif lain
            await admin
               .from("rekonsiliasi_periode")
               .update({ status: "ditutup", closed_at: nowIso, updated_at: nowIso })
               .eq("status", "aktif")
               .neq("id", id);

            updatePayload.closed_at = null;
            updatePayload.updated_at = nowIso;
         }

         // === PENUTUPAN: aktif → ditutup ===
         if (status === "ditutup") {
            updatePayload.closed_at = nowIso;

            // Auto-close semua findings open/on_progress dari periode ini
            await admin
               .from("findings")
               .update({ status: "closed", updated_at: nowIso })
               .eq("periode_id", id)
               .in("status", ["open", "on_progress"]);
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

      updatePayload.updated_at = updatePayload.updated_at ?? new Date().toISOString();

      const { data, error } = await admin
         .from("rekonsiliasi_periode")
         .update(updatePayload)
         .eq("id", id)
         .select()
         .single();

      if (error) {
         return NextResponse.json({ message: sanitizeDbError(error) }, { status: 500 });
      }

      await logActivity(
         "PERIODE_REKONSILIASI",
         `Memperbarui periode rekonsiliasi: ${data.nama_periode}`,
         { periode_id: id, changes: Object.keys(updatePayload) },
         { actorUserId: actor.user.id },
      );

      // === AUTO-TRIGGER SYNC saat aktivasi ===
      if (body?.status === "aktif" && current.status !== "aktif") {
         try {
            await executeIwkbuSync({
               triggerType: "manual",
               initiatedBy: actor.user.id,
               periodeId: id,
            });
         } catch (syncErr) {
            console.error("[Periode] Auto-sync failed:", syncErr);
         }
      }

      return NextResponse.json({ data });
   } catch (error) {
      return actorErrorHandler(error);
   }
}

export async function DELETE(
   _request: NextRequest,
   context: { params: Promise<{ id: string }> },
) {
   try {
      const actor = await requireActor(ROLES.STAF_IW);

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
         return NextResponse.json({ message: sanitizeDbError(error) }, { status: 500 });
      }

      await logActivity(
         "PERIODE_REKONSILIASI",
         `Menghapus periode rekonsiliasi: ${existing.nama_periode}`,
         { periode_id: id },
         { actorUserId: actor.user.id },
      );

      return NextResponse.json({ success: true });
   } catch (error) {
      return actorErrorHandler(error);
   }
}
