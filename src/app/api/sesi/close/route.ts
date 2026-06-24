import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedActor } from "@/lib/auth/server-actor";
import { ensureRoleOrThrow } from "@/lib/auth/requireRole.server";
import { logActivity } from "@/lib/supabase/queries/operasional.server";

/**
 * POST /api/sesi/close — Tutup sesi kerja
 * Body: { sesi_id: string }
 * Validasi:
 * - Harus login
 * - Sesi harus milik user
 * - Sesi harus berstatus aktif
 * - Auto-hitung total transaksi & nominal
 */
export async function POST(request: NextRequest) {
   try {
      const actor = await getAuthenticatedActor();
      if (!actor) {
         return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }

      const supabase = await createClient();

      const body = await request.json();
      const { sesi_id } = body;

      if (!sesi_id) {
         return NextResponse.json(
            { message: "sesi_id wajib diisi" },
            { status: 400 },
         );
      }

      // Validasi sesi milik user dan masih aktif
      const { data: sesi } = await supabase
         .from("sesi_petugas")
         .select("id, petugas_id, status, terminal_id")
         .eq("id", sesi_id)
         .single();

      if (!sesi) {
         return NextResponse.json(
            { message: "Sesi kerja tidak ditemukan" },
            { status: 404 },
         );
      }

      if (sesi.petugas_id !== actor.user.id) {
         return NextResponse.json(
            { message: "Sesi bukan milik Anda" },
            { status: 403 },
         );
      }

      try {
         ensureRoleOrThrow(actor.user, actor.profile, "loket");
      } catch (err: unknown) {
         return NextResponse.json(
            { message: err instanceof Error ? err.message : "Forbidden" },
            { status: (err as any)?.status ?? 403 },
         );
      }

      if (sesi.status !== "aktif") {
         return NextResponse.json(
            { message: "Sesi sudah ditutup sebelumnya" },
            { status: 409 },
         );
      }

      // Hitung total transaksi
      const { count: totalMasuk } = await supabase
         .from("kendaraan_masuk")
         .select("id", { count: "exact", head: true })
         .eq("sesi_id", sesi_id);

      const { count: totalKeluar } = await supabase
         .from("kendaraan_keluar")
         .select("id", { count: "exact", head: true })
         .eq("sesi_id", sesi_id);

      // Tutup sesi dengan total
      const { data: updatedSesi, error: updateError } = await supabase
         .from("sesi_petugas")
         .update({
            status: "selesai",
            waktu_selesai: new Date().toISOString(),
            total_transaksi_masuk: totalMasuk ?? 0,
            total_transaksi_keluar: totalKeluar ?? 0,
         })
         .eq("id", sesi_id)
         .eq("petugas_id", actor.user.id)
         .select()
         .single();

      if (updateError) throw updateError;

      // PIN session tetap aktif — petugas bisa navigasi tanpa harus input PIN lagi

      await logActivity("TUTUP_SESI", "Menutup sesi kerja loket", {
         sesi_id,
         terminal_id: sesi.terminal_id,
         total_masuk: totalMasuk ?? 0,
         total_keluar: totalKeluar ?? 0,
      });

      return NextResponse.json({
         success: true,
         data: updatedSesi,
      });
   } catch (error: unknown) {
      const message =
         error instanceof Error ? error.message : "Internal server error";
       return NextResponse.json({ message }, { status: 500 });
   }
}
