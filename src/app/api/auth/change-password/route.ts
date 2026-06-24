import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/supabase/queries/operasional.server";
import { createClient } from "@supabase/supabase-js";
import {
   checkRateLimit,
   recordFailedAttempt,
   clearAttempts,
   formatRetryAfter,
} from "@/lib/auth/rate-limiter";

const PWD_LIMIT = { maxAttempts: 5, lockoutMs: 15 * 60 * 1000 };

export async function POST(request: Request) {
   try {
      const supabase = await createServerClient();
      const {
         data: { user },
      } = await supabase.auth.getUser();

      if (!user || !user.email) {
         return NextResponse.json(
            { message: "Sesi habis. Silakan login ulang." },
            { status: 401 },
         );
      }

      const pwdKey = `change-pwd:${user.id}`;
      const rateCheck = await checkRateLimit(pwdKey);
      if (!rateCheck.allowed) {
         return NextResponse.json(
            {
               message: `Terlalu banyak percobaan. Coba lagi dalam ${formatRetryAfter(rateCheck.retryAfterMs)}.`,
            },
            { status: 429 },
         );
      }

      const body = (await request.json().catch(() => null)) as {
         currentPassword?: unknown;
         newPassword?: unknown;
      } | null;
      const currentPassword =
         typeof body?.currentPassword === "string"
            ? body.currentPassword.trim()
            : "";
      const newPassword =
         typeof body?.newPassword === "string" ? body.newPassword.trim() : "";

      if (!currentPassword || !newPassword) {
         return NextResponse.json(
            { message: "Password lama dan password baru wajib diisi." },
            { status: 400 },
         );
      }

      if (newPassword.length < 6) {
         return NextResponse.json(
            { message: "Password baru minimal 6 karakter." },
            { status: 400 },
         );
      }

      if (currentPassword === newPassword) {
         return NextResponse.json(
            { message: "Password baru tidak boleh sama dengan password lama." },
            { status: 400 },
         );
      }

      // Verify current password using a temporary client
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseKey =
         process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
         process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      if (!supabaseKey) {
         return NextResponse.json(
            { message: "Konfigurasi autentikasi belum lengkap." },
            { status: 500 },
         );
      }
      const tempClient = createClient(supabaseUrl, supabaseKey, {
         auth: { persistSession: false, autoRefreshToken: false },
      });

      const { error: signInError } = await tempClient.auth.signInWithPassword({
         email: user.email,
         password: currentPassword,
      });

      if (signInError) {
         await recordFailedAttempt(pwdKey, PWD_LIMIT);
         return NextResponse.json(
            { message: "Password lama tidak valid." },
            { status: 400 },
         );
      }

      await clearAttempts(pwdKey);

      // Update password via admin client
      const adminClient = createAdminClient();
      const { error: updateError } =
         await adminClient.auth.admin.updateUserById(user.id, {
            password: newPassword,
         });

      if (updateError) {
         return NextResponse.json(
            { message: "Gagal memperbarui password." },
            { status: 500 },
         );
      }

      await logActivity(
         "UBAH_PASSWORD",
         "Mengubah password akun",
         { user_id: user.id },
      );

      return NextResponse.json({ message: "Password berhasil diperbarui." });
   } catch {
      return NextResponse.json(
         { message: "Terjadi kesalahan." },
         { status: 500 },
      );
   }
}
