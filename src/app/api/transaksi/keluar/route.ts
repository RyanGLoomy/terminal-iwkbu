import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedActor } from "@/lib/auth/server-actor";
import { ensureRoleOrThrow } from "@/lib/auth/requireRole.server";
import { validatePetugasPinSession } from "@/lib/auth/pin-session.server";
import { logActivity } from "@/lib/supabase/queries/operasional.server";

/**
 * POST /api/transaksi/keluar — Catat kendaraan keluar
 * Validasi backend:
 * - Harus login
 * - Sesi harus aktif
 * - Sesi harus milik user
 * - Kendaraan masuk harus valid dan belum keluar
 */
export async function POST(request: NextRequest) {
   try {
      const actor = await getAuthenticatedActor();
      if (!actor) {
         return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }

      const supabase = await createClient();

      try {
         ensureRoleOrThrow(actor.user, actor.profile, "loket");
      } catch (err: unknown) {
         return NextResponse.json(
            { message: err instanceof Error ? err.message : "Forbidden" },
            { status: (err as any)?.status ?? 403 },
         );
      }

      const pinSession = await validatePetugasPinSession(actor);
      if (!pinSession.valid) {
         return NextResponse.json(
            { message: pinSession.message },
            { status: pinSession.status },
         );
      }

      const body = await request.json();
      const { sesi_id, masuk_id } = body;

      if (!sesi_id || !masuk_id) {
         return NextResponse.json(
            { message: "sesi_id dan masuk_id wajib diisi" },
            { status: 400 },
         );
      }

      // Validasi sesi aktif
      const { data: sesi } = await supabase
         .from("sesi_petugas")
         .select("id, petugas_id, terminal_id, status")
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

      if (sesi.status !== "aktif") {
         return NextResponse.json(
            {
               error: "Tidak bisa mencatat transaksi: sesi kerja sudah ditutup",
            },
            { status: 409 },
         );
      }

      // Validasi data masuk
      const { data: masuk } = await supabase
         .from("kendaraan_masuk")
         .select("id, sesi_id, petugas_id, nomor_polisi")
         .eq("id", masuk_id)
         .eq("sesi_id", sesi_id)
         .eq("petugas_id", actor.user.id)
         .maybeSingle();

      if (!masuk) {
         return NextResponse.json(
            { message: "Data kendaraan masuk tidak valid" },
            { status: 404 },
         );
      }

      // Cek belum keluar
      const { data: existingKeluar } = await supabase
         .from("kendaraan_keluar")
         .select("id")
         .eq("masuk_id", masuk_id)
         .maybeSingle();

      if (existingKeluar) {
         return NextResponse.json(
            { message: "Kendaraan sudah tercatat keluar" },
            { status: 409 },
         );
      }

      // Insert kendaraan keluar
      const { data: keluar, error: insertError } = await supabase
         .from("kendaraan_keluar")
         .insert({
            masuk_id: masuk_id,
            sesi_id: sesi_id,
            petugas_id: actor.user.id,
            waktu_keluar: new Date().toISOString(),
         })
         .select()
         .single();

      if (insertError) throw insertError;

      await logActivity("INPUT_TRANSAKSI", "Mencatat kendaraan keluar", {
         transaksi_id: keluar.id,
         masuk_id,
         sesi_id,
         terminal_id: sesi.terminal_id,
         petugas_terminal_id: pinSession.petugasTerminalId,
         nomor_polisi: masuk.nomor_polisi,
         jenis: "keluar",
      });

      return NextResponse.json({
         success: true,
         data: keluar,
      });
   } catch (error: unknown) {
      const message =
         error instanceof Error ? error.message : "Internal server error";
       return NextResponse.json({ message }, { status: 500 });
   }
}
