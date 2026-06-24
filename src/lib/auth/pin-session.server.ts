import type { AuthenticatedActor } from "@/lib/auth/server-actor";
import { createAdminClient } from "@/lib/supabase/admin";

type ValidPinSession = {
   valid: true;
   petugasTerminalId: string;
   petugasNama: string | null;
};

type InvalidPinSession = {
   valid: false;
   message: string;
   status: number;
};

export async function validatePetugasPinSession(
   actor: AuthenticatedActor,
): Promise<ValidPinSession | InvalidPinSession> {
   if (!actor.terminalId) {
      return {
         valid: false,
         message: "Terminal tidak ditemukan pada profil.",
         status: 400,
      };
   }

   const adminClient = createAdminClient();
   const { data: pinSession, error: pinSessionError } = await adminClient
      .from("petugas_pin_sessions")
      .select("user_id, expires_at, petugas_terminal_id, petugas_nama")
      .eq("user_id", actor.user.id)
      .maybeSingle();

   if (pinSessionError) throw pinSessionError;

   if (!pinSession || new Date(pinSession.expires_at) <= new Date()) {
      if (pinSession) {
         await adminClient
            .from("petugas_pin_sessions")
            .delete()
            .eq("user_id", actor.user.id);
      }

      return {
         valid: false,
         message: "PIN belum diverifikasi atau sudah kadaluarsa",
         status: 403,
      };
   }

   if (!pinSession.petugas_terminal_id) {
      await adminClient
         .from("petugas_pin_sessions")
         .delete()
         .eq("user_id", actor.user.id);

      return {
         valid: false,
         message: "Sesi PIN tidak valid",
         status: 403,
      };
   }

   const { data: petugasPin, error: petugasPinError } = await adminClient
      .from("petugas_terminal")
      .select("terminal_id, is_active")
      .eq("id", pinSession.petugas_terminal_id)
      .maybeSingle();

   if (petugasPinError) throw petugasPinError;

   if (
      !petugasPin ||
      petugasPin.terminal_id !== actor.terminalId ||
      petugasPin.is_active !== true
   ) {
      await adminClient
         .from("petugas_pin_sessions")
         .delete()
         .eq("user_id", actor.user.id);

      return {
         valid: false,
         message: "Petugas PIN tidak aktif atau tidak valid",
         status: 403,
      };
   }

   return {
      valid: true,
      petugasTerminalId: pinSession.petugas_terminal_id,
      petugasNama: pinSession.petugas_nama ?? null,
   };
}
