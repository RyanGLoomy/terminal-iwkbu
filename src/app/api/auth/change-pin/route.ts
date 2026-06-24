import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedActor } from "@/lib/auth/server-actor";
import {
   ensureRoleOrThrow,
   AuthorizationError,
} from "@/lib/auth/requireRole.server";
import { logActivity } from "@/lib/supabase/queries/operasional.server";
import {
   checkRateLimit,
   recordFailedAttempt,
   clearAttempts,
   formatRetryAfter,
} from "@/lib/auth/rate-limiter";
import bcrypt from "bcryptjs";

const PIN_LIMIT = { maxAttempts: 5, lockoutMs: 15 * 60 * 1000 };

export async function POST(request: Request) {
   try {
      const actor = await getAuthenticatedActor();
      if (!actor) {
         return NextResponse.json(
            { message: "Sesi habis. Silakan login ulang." },
            { status: 401 },
         );
      }

      ensureRoleOrThrow(actor.user, actor.profile, "loket");

      const pinKey = `change-pin:${actor.user.id}`;
      const rateCheck = await checkRateLimit(pinKey);
      if (!rateCheck.allowed) {
         return NextResponse.json(
            {
               message: `Terlalu banyak percobaan. Coba lagi dalam ${formatRetryAfter(rateCheck.retryAfterMs)}.`,
            },
            { status: 429 },
         );
      }

      const body = await request.json();
      const currentPin = (body?.currentPin as string)?.trim();
      const newPin = (body?.newPin as string)?.trim();

      if (!currentPin || !newPin) {
         return NextResponse.json(
            { message: "PIN lama dan PIN baru wajib diisi." },
            { status: 400 },
         );
      }

      if (!/^\d{4,6}$/.test(newPin)) {
         return NextResponse.json(
            { message: "PIN baru harus 4-6 digit angka." },
            { status: 400 },
         );
      }

      if (currentPin === newPin) {
         return NextResponse.json(
            { message: "PIN baru tidak boleh sama dengan PIN lama." },
            { status: 400 },
         );
      }

      const terminalId = actor.profile?.terminal_id ?? actor.terminalId;
      if (!terminalId) {
         return NextResponse.json(
            { message: "Terminal tidak ditemukan pada profil." },
            { status: 400 },
         );
      }

      const adminClient = (await import("@/lib/supabase/admin")).createAdminClient();

      // Fetch all active petugas records for the terminal
      const { data: rows, error: fetchError } = await adminClient
         .from("petugas_terminal")
         .select("id, pin_hash")
         .eq("terminal_id", terminalId)
         .eq("is_active", true);

       if (fetchError) {
         return NextResponse.json(
            { message: "Terjadi kesalahan internal" },
            { status: 500 },
         );
      }

      // Cari petugas yang PIN-nya cocok
      let matched = null;
      for (const pt of rows ?? []) {
         if (pt.pin_hash && bcrypt.compareSync(currentPin, pt.pin_hash)) {
            matched = pt;
            break;
         }
      }

        if (!matched) {
          await recordFailedAttempt(pinKey, PIN_LIMIT);
          return NextResponse.json(
             { message: "PIN lama tidak valid." },
             { status: 400 },
          );
       }

        await clearAttempts(pinKey);

      // Update PIN using server client (preserves auth.uid() for triggers)
      const supabase = await createClient();
      const newPinHash = bcrypt.hashSync(newPin, 10);
      const { error: updateError } = await supabase
         .from("petugas_terminal")
         .update({ pin_hash: newPinHash })
         .eq("id", matched.id);

      if (updateError) {
         return NextResponse.json(
            { message: "Terjadi kesalahan internal" },
            { status: 500 },
         );
      }

      await logActivity("SET_PIN", "Memperbarui PIN petugas terminal", {
         terminal_id: terminalId,
         petugas_terminal_id: matched.id,
      });

      return NextResponse.json({ message: "PIN berhasil diperbarui." });
   } catch (error) {
      if (error instanceof AuthorizationError) {
         return NextResponse.json(
            { message: "Akses ditolak" },
            { status: 403 },
         );
      }
      return NextResponse.json(
         { message: "Terjadi kesalahan internal" },
         { status: 500 },
      );
   }
}
