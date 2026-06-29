import { NextResponse } from "next/server";
import { requireActor, actorErrorHandler } from "@/lib/auth/actor";
import { ROLES } from "@/config/roles";
import { logActivity } from "@/lib/supabase/queries/operasional.server";
import {
   checkRateLimit,
   recordFailedAttempt,
   clearAttempts,
   formatRetryAfter,
} from "@/lib/auth/pin-rate-limiter";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
   try {
      const actor = await requireActor(ROLES.PETUGAS_LOKET);

      const terminalId = actor.profile?.terminal_id ?? actor.terminalId;
      if (!terminalId) {
         return NextResponse.json(
            { message: "Terminal tidak ditemukan pada profil." },
            { status: 400 },
         );
      }

      const body = await request.json().catch(() => null);
      const pinInput = (body?.pin_input as string)?.trim();

      if (!pinInput) {
         return NextResponse.json(
            { message: "PIN wajib diisi." },
            { status: 400 },
         );
      }

      const rateLimitKey = actor.user.id;
      const rateLimit = await checkRateLimit(rateLimitKey);
      if (!rateLimit.allowed) {
         return NextResponse.json(
            {
               verified: false,
               message: `Terlalu banyak percobaan. Coba lagi dalam ${formatRetryAfter(rateLimit.retryAfterMs)}.`,
            },
            { status: 429 },
         );
      }

      const adminClient = (await import("@/lib/supabase/admin")).createAdminClient();

      const { data: rows, error } = await adminClient
         .from("petugas_terminal")
         .select("id, nama, pin_hash")
         .eq("terminal_id", terminalId)
         .eq("is_active", true);

      if (error) {
         return NextResponse.json(
            { message: "Terjadi kesalahan internal" },
            { status: 500 },
         );
      }

      let matched = null;
      for (const pt of rows ?? []) {
         if (pt.pin_hash && bcrypt.compareSync(pinInput, pt.pin_hash)) {
            matched = pt;
            break;
         }
      }

      if (!matched) {
         const result = await recordFailedAttempt(rateLimitKey);
         if (result.locked) {
            return NextResponse.json(
               {
                  verified: false,
                  message: `Terlalu banyak percobaan PIN salah. Akun dikunci selama ${formatRetryAfter(result.retryAfterMs)}.`,
               },
               { status: 429 },
            );
         }
         return NextResponse.json(
            { verified: false, message: "PIN tidak valid." },
            { status: 200 },
         );
      }

      await clearAttempts(rateLimitKey);

      await logActivity(
         "VERIFIKASI_PIN",
         `Verifikasi PIN petugas: ${matched.nama}`,
         { petugas_terminal_id: matched.id },
         { actorUserId: actor.user.id },
      );

      return NextResponse.json({
          verified: true,
          petugas_id: matched.id,
          petugas_nama: matched.nama,
      });
   } catch (error) {
      return actorErrorHandler(error);
   }
}
