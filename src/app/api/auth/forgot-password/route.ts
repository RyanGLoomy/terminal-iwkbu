import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import {
   checkRateLimit,
   recordFailedAttempt,
   formatRetryAfter,
} from "@/lib/auth/rate-limiter";

const FORGOT_LIMIT = { maxAttempts: 5, lockoutMs: 15 * 60 * 1000 };

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const email = (body?.email as string | undefined)?.trim();

    if (!email) {
      return NextResponse.json(
        { message: "Email wajib diisi." },
        { status: 400 },
      );
    }

    // Key per-EMAIL (bukan IP). Mencegah spam reset email ke satu korban
    // lewat rotasi IP, dan tak bisa di-bypass dengan spoofing header.
    const rateKey = `forgot-password:${email.toLowerCase()}`;

    const rateCheck = await checkRateLimit(rateKey);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          message: `Terlalu banyak permintaan. Coba lagi dalam ${formatRetryAfter(rateCheck.retryAfterMs)}.`,
        },
        { status: 429 },
      );
    }

    await recordFailedAttempt(rateKey, FORGOT_LIMIT);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { message: "Konfigurasi tidak lengkap." },
        { status: 500 },
      );
    }

    const cookiesToApply: Array<{
      name: string;
      value: string;
      options: CookieOptions;
    }> = [];

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToApply.push(...cookiesToSet);
        },
      },
    });

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${request.nextUrl.origin}/api/auth/callback`,
    });

    if (error) {
      console.error("[forgot-password] Supabase error:", error.message);
    }

    const response = NextResponse.json({
      message:
        "Jika email terdaftar, tautan reset password akan dikirim ke email Anda.",
    });

    cookiesToApply.forEach(({ name, value, options }) => {
      response.cookies.set({ name, value, ...options });
    });

    return response;
  } catch {
    return NextResponse.json(
      {
        message:
          "Jika email terdaftar, tautan reset password akan dikirim ke email Anda.",
      },
      { status: 200 },
    );
  }
}
