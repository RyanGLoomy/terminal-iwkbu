import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedActor } from "@/lib/auth/server-actor";
import { ensureRoleOrThrow } from "@/lib/auth/requireRole.server";
import { validatePetugasPinSession } from "@/lib/auth/pin-session.server";
import { logActivity } from "@/lib/supabase/queries/operasional.server";

/**
 * POST /api/transaksi/masuk — Catat kendaraan masuk
 * Validasi backend:
 * - Harus login
 * - Sesi harus aktif
 * - Sesi harus milik user
 * - Armada harus valid & aktif
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
      const { sesi_id, po_id, nomor_polisi } = body;

      if (!sesi_id || !po_id || !nomor_polisi) {
         return NextResponse.json(
            { message: "sesi_id, po_id, dan nomor_polisi wajib diisi" },
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

      // Normalize
      const nomorPolisiNorm = nomor_polisi.trim().toUpperCase();

      // Validasi armada
      const { data: armada, error: armadaError } = await supabase
         .from("armada")
         .select("id, po_id")
         .eq("po_id", po_id)
         .ilike("nomor_polisi", nomorPolisiNorm)
         .eq("status_verifikasi", "terverifikasi")
         .eq("status_operasional", "aktif")
         .single();

      if (armadaError || !armada) {
         return NextResponse.json(
            { message: "Armada tidak ditemukan atau belum aktif" },
            { status: 404 },
         );
      }

      // Insert kendaraan masuk
      const { data: masuk, error: insertError } = await supabase
         .from("kendaraan_masuk")
         .insert({
            sesi_id: sesi_id,
            petugas_id: actor.user.id,
            armada_id: armada.id,
            po_id: po_id,
            nomor_polisi: nomorPolisiNorm,
            waktu_masuk: new Date().toISOString(),
         })
         .select()
         .single();

      if (insertError) throw insertError;

      await logActivity("INPUT_TRANSAKSI", "Mencatat kendaraan masuk", {
         transaksi_id: masuk.id,
         sesi_id,
         terminal_id: sesi.terminal_id,
         petugas_terminal_id: pinSession.petugasTerminalId,
         armada_id: armada.id,
         po_id,
         nomor_polisi: nomorPolisiNorm,
         jenis: "masuk",
      });

      return NextResponse.json({
         success: true,
         data: masuk,
      });
   } catch (error: unknown) {
      const message =
         error instanceof Error ? error.message : "Internal server error";
       return NextResponse.json({ message }, { status: 500 });
   }
}
