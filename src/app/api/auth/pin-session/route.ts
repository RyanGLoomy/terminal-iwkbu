import { NextResponse } from "next/server";
import { getAuthenticatedActor } from "@/lib/auth/server-actor";

function isExpired(isoDate: string) {
   return new Date(isoDate).getTime() <= Date.now();
}

export async function GET() {
   try {
      const actor = await getAuthenticatedActor();
      if (!actor) {
         return NextResponse.json(
            { message: "Sesi habis. Silakan login ulang." },
            { status: 401 },
         );
      }

      const adminClient = (await import("@/lib/supabase/admin")).createAdminClient();

      const { data, error } = await adminClient
         .from("petugas_pin_sessions")
         .select(
            "user_id, verified_at, expires_at, updated_at, petugas_terminal_id, petugas_nama",
         )
         .eq("user_id", actor.user.id)
         .maybeSingle();

      if (error) {
         return NextResponse.json({ message: error.message }, { status: 500 });
      }

      if (!data || isExpired(data.expires_at)) {
         if (data) {
            await adminClient
               .from("petugas_pin_sessions")
               .delete()
               .eq("user_id", actor.user.id);
         }
         return NextResponse.json(
            { verified: false, message: "PIN belum diverifikasi atau sudah kadaluarsa" },
            { status: 200 },
         );
      }

      if (!data.petugas_terminal_id || !actor.terminalId) {
         await adminClient
            .from("petugas_pin_sessions")
            .delete()
            .eq("user_id", actor.user.id);
         return NextResponse.json(
            { verified: false, message: "Sesi PIN tidak valid" },
            { status: 200 },
         );
      }

      const { data: petugas, error: petugasError } = await adminClient
         .from("petugas_terminal")
         .select("id, terminal_id, is_active")
         .eq("id", data.petugas_terminal_id)
         .maybeSingle();

      if (petugasError) {
         return NextResponse.json({ message: petugasError.message }, { status: 500 });
      }

      if (!petugas || petugas.terminal_id !== actor.terminalId || !petugas.is_active) {
         await adminClient
            .from("petugas_pin_sessions")
            .delete()
            .eq("user_id", actor.user.id);
         return NextResponse.json(
            { verified: false, message: "Petugas tidak aktif atau tidak valid" },
            { status: 200 },
         );
      }

      return NextResponse.json({
         verified: true,
         user_id: data.user_id,
         verified_at: data.verified_at,
         expires_at: data.expires_at,
         updated_at: data.updated_at,
         petugas_terminal_id: data.petugas_terminal_id,
         petugas_nama: data.petugas_nama,
      });
   } catch (error: unknown) {
      return NextResponse.json(
         { message: error instanceof Error ? error.message : "Terjadi kesalahan." },
         { status: 500 },
      );
   }
}

export async function DELETE() {
   try {
      const actor = await getAuthenticatedActor();
      if (!actor) {
         return NextResponse.json(
            { message: "Sesi habis. Silakan login ulang." },
            { status: 401 },
         );
      }

      const adminClient = (await import("@/lib/supabase/admin")).createAdminClient();

      const { error } = await adminClient
         .from("petugas_pin_sessions")
         .delete()
         .eq("user_id", actor.user.id);

      if (error) {
         return NextResponse.json({ message: error.message }, { status: 500 });
      }

      return NextResponse.json({ message: "Sesi PIN dihapus." });
   } catch (error: unknown) {
      return NextResponse.json(
         { message: error instanceof Error ? error.message : "Terjadi kesalahan." },
         { status: 500 },
      );
   }
}
