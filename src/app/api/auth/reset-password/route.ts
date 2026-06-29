import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeDbError } from "@/lib/db-error";
import { logActivity } from "@/lib/supabase/queries/operasional.server";
import {
   PASSWORD_POLICY_MESSAGE,
   validateAccountPassword,
} from "@/lib/auth/account-helpers.server";
import {
   checkRateLimit,
   recordFailedAttempt,
   clearAttempts,
   formatRetryAfter,
} from "@/lib/auth/rate-limiter";

const RESET_LIMIT = { maxAttempts: 5, lockoutMs: 15 * 60 * 1000 };

export async function POST(request: Request) {
   try {
      const supabase = await createServerClient();
      const {
         data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
         return NextResponse.json(
            { message: "Sesi reset tidak valid. Silakan ajukan ulang." },
            { status: 401 },
         );
      }

      const rateKey = `reset-pwd:${user.id}`;
      const rateCheck = await checkRateLimit(rateKey);
      if (!rateCheck.allowed) {
         return NextResponse.json(
            {
               message: `Terlalu banyak percobaan. Coba lagi dalam ${formatRetryAfter(rateCheck.retryAfterMs)}.`,
            },
            { status: 429 },
         );
      }

      const body = await request.json();
      const password = (body?.password as string)?.trim();

      if (!password) {
         return NextResponse.json(
            { message: "Password baru wajib diisi." },
            { status: 400 },
         );
      }

      if (!validateAccountPassword(password)) {
         return NextResponse.json(
            { message: PASSWORD_POLICY_MESSAGE },
            { status: 400 },
         );
      }

      const adminClient = createAdminClient();
      const { error: updateError } =
         await adminClient.auth.admin.updateUserById(user.id, {
            password,
         });

      if (updateError) {
         await recordFailedAttempt(rateKey, RESET_LIMIT);
         return NextResponse.json(
            { message: sanitizeDbError(updateError, "reset-password update") },
            { status: 500 },
         );
      }

      await clearAttempts(rateKey);

      await logActivity(
         "UBAH_PASSWORD",
         "Reset password via email recovery",
         { user_id: user.id, method: "recovery" },
         { actorUserId: user.id },
      );

      return NextResponse.json({ message: "Password berhasil diubah." });
    } catch (error: unknown) {
       return NextResponse.json(
          { message: sanitizeDbError(error, "reset-password") },
          { status: 500 },
       );
    }
}
