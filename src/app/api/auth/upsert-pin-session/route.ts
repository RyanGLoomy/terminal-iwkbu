import { NextResponse } from "next/server";
import { sanitizeDbError } from "@/lib/db-error";
import { getAuthenticatedActor } from "@/lib/auth/server-actor";
import { ensureRoleOrThrow } from "@/lib/auth/requireRole.server";

const PIN_SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

export async function POST(request: Request) {
   try {
      const actor = await getAuthenticatedActor();
      if (!actor) {
         return NextResponse.json(
            { message: "Sesi habis. Silakan login ulang." },
            { status: 401 },
         );
      }

      try {
         ensureRoleOrThrow(actor.user, actor.profile, "loket");
      } catch (err: unknown) {
         return NextResponse.json(
            { message: err instanceof Error ? err.message : "Forbidden" },
            { status: 403 },
         );
      }

      if (!actor.terminalId) {
         return NextResponse.json(
            { message: "Terminal tidak ditemukan pada profil." },
            { status: 400 },
         );
      }

      const body = await request.json().catch(() => null);
      const petugasTerminalId = (body?.petugas_terminal_id as string)?.trim();
      const petugasNama = (body?.petugas_nama as string)?.trim();

      if (!petugasTerminalId) {
         return NextResponse.json(
            { message: "petugas_terminal_id wajib diisi." },
            { status: 400 },
         );
      }

      const adminClient = (await import("@/lib/supabase/admin")).createAdminClient();

      const { data: petugas, error: petugasError } = await adminClient
         .from("petugas_terminal")
         .select("id, nama, terminal_id, is_active")
         .eq("id", petugasTerminalId)
         .maybeSingle();

      if (petugasError) {
         return NextResponse.json({ message: petugasError.message }, { status: 500 });
      }

      if (!petugas || petugas.terminal_id !== actor.terminalId || !petugas.is_active) {
         return NextResponse.json(
            { message: "Petugas terminal tidak aktif atau tidak valid." },
            { status: 403 },
         );
      }

      const expiresAt = new Date(
         Date.now() + PIN_SESSION_DURATION_MS,
      ).toISOString();

      const { data, error } = await adminClient
         .from("petugas_pin_sessions")
         .upsert(
            {
               user_id: actor.user.id,
               verified_at: new Date().toISOString(),
               expires_at: expiresAt,
               updated_at: new Date().toISOString(),
               petugas_terminal_id: petugasTerminalId,
               petugas_nama: petugas.nama ?? petugasNama ?? null,
            },
            { onConflict: "user_id" },
         )
         .select()
         .single();

      if (error) {
         return NextResponse.json({ message: sanitizeDbError(error) }, { status: 500 });
      }

      return NextResponse.json({ session: data });
    } catch (error: unknown) {
      return NextResponse.json(
         { message: error instanceof Error ? error.message : "Terjadi kesalahan." },
         { status: 500 },
      );
   }
}
