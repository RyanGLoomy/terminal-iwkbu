import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireActor, actorErrorHandler } from "@/lib/auth/actor";
import { ROLES } from "@/config/roles";
import { validatePetugasPinSession } from "@/lib/auth/pin-session.server";
import { logActivity } from "@/lib/supabase/queries/operasional.server";

/**
 * POST /api/sesi/open — Buka sesi kerja baru
 * Validasi:
 * - Harus login sebagai loket
 * - Harus punya terminal_id
 * - Tidak boleh ada sesi aktif
 * - Validasi PIN dilakukan server-side karena proxy tidak berjalan untuk /api
 */
export async function POST() {
   try {
      const actor = await requireActor(ROLES.PETUGAS_LOKET);

      const supabase = await createClient();

      if (!actor.terminalId) {
         return NextResponse.json(
            { message: "Petugas tidak terdaftar di terminal manapun" },
            { status: 400 },
         );
      }

      const pinSession = await validatePetugasPinSession(actor);
      if (!pinSession.valid) {
         return NextResponse.json(
            { message: pinSession.message },
            { status: pinSession.status },
         );
      }

      // Cek sesi aktif yang sudah ada
      const { data: existingSesi } = await supabase
         .from("sesi_petugas")
         .select("id")
         .eq("petugas_id", actor.user.id)
         .eq("status", "aktif")
         .limit(1)
         .maybeSingle();

      if (existingSesi) {
         return NextResponse.json(
            { message: "Sudah ada sesi aktif. Tutup sesi terlebih dahulu." },
            { status: 409 },
         );
      }

      // Buka sesi baru
      const { data: newSesi, error: insertError } = await supabase
         .from("sesi_petugas")
         .insert({
            petugas_id: actor.user.id,
            terminal_id: actor.terminalId,
            waktu_mulai: new Date().toISOString(),
            status: "aktif",
         })
         .select()
         .single();

      if (insertError) {
         // Handle unique constraint violation
         if (insertError.code === "23505") {
            return NextResponse.json(
               { message: "Sudah ada sesi aktif hari ini" },
               { status: 409 },
            );
         }
         throw insertError;
      }

      await logActivity("BUKA_SESI", "Membuka sesi kerja loket", {
         sesi_id: newSesi.id,
         terminal_id: actor.terminalId,
         petugas_terminal_id: pinSession.petugasTerminalId,
      });

      return NextResponse.json({
         success: true,
         data: newSesi,
      });
   } catch (error) {
      return actorErrorHandler(error);
   }
}
