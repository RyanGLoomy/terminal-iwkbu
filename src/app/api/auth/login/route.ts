import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { DEFAULT_ROUTES } from "@/config/roles";
import { resolveRoleFromUserAndProfile } from "@/lib/auth/role";
import { normalizeRoleName } from "@/lib/supabase/role-utils";
import { logActivity } from "@/lib/supabase/queries/operasional.server";
import {
   checkRateLimit,
   recordFailedAttempt,
   clearAttempts,
   formatRetryAfter,
   getClientIp,
} from "@/lib/auth/rate-limiter";

const LOGIN_LIMIT = { maxAttempts: 10, lockoutMs: 15 * 60 * 1000 };

export async function POST(request: NextRequest) {
   try {
      const body = await request.json().catch(() => null);
      const email = (body?.email as string | undefined)?.trim();
      const password = (body?.password as string | undefined)?.trim();

      if (!email || !password) {
         return NextResponse.json(
            { message: "Email dan password wajib diisi." },
            { status: 400 },
         );
      }

      // Key per (email + IP terpercaya). Sebelumnya hanya per IP (bisa di-spoof
      // via X-Forwarded-For -> bypass). getClientIp kini memakai header platform.
      const clientIp = getClientIp(request);
      const ipKey = `login:${email.toLowerCase()}:${clientIp}`;
      const rateCheck = await checkRateLimit(ipKey);
      if (!rateCheck.allowed) {
         return NextResponse.json(
            {
               message: `Terlalu banyak percobaan login. Coba lagi dalam ${formatRetryAfter(rateCheck.retryAfterMs)}.`,
            },
            { status: 429 },
         );
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey =
         process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
         process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

      if (!supabaseUrl || !supabaseKey) {
         return NextResponse.json(
            { message: "Konfigurasi Supabase belum lengkap." },
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

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
         email,
         password,
      });

      if (signInError || !data.user) {
         await recordFailedAttempt(ipKey, LOGIN_LIMIT);
         await logActivity(
            "LOGIN_GAGAL",
            "Login gagal: kredensial salah",
            { email, ip: clientIp },
            { actorUserId: data.user?.id ?? "unknown" },
         );
         const message = signInError?.message ?? "";

         return NextResponse.json(
            {
               message:
                  message === "Invalid login credentials"
                     ? "Email atau password salah"
                     : message === "fetch failed"
                       ? "Layanan tidak tersedia sementara. Silakan coba lagi nanti."
                       : "Email atau password salah",
            },
            { status: message === "fetch failed" ? 503 : 401 },
         );
      }

      const { data: profile } = await supabase
         .from("profiles")
         .select("is_active, user_roles(role:roles(name))")
         .eq("id", data.user.id)
         .maybeSingle();

         if (profile?.is_active === false) {
            await recordFailedAttempt(ipKey, LOGIN_LIMIT);
           await logActivity(
              "LOGIN_GAGAL",
              "Login gagal: akun tidak aktif",
              { email, user_id: data.user.id },
              { actorUserId: data.user.id },
           );
           await supabase.auth.signOut();
         return NextResponse.json(
            { message: "Akun tidak aktif. Hubungi admin." },
            { status: 403 },
         );
      }

      const resolvedFromProfile = resolveRoleFromUserAndProfile(data.user, profile);

      let resolvedRole = resolvedFromProfile.role;

      if (!resolvedRole) {
         const { data: rpcRole, error: rpcError } = await supabase.rpc(
            "get_current_user_role",
         );

         if (rpcError) {
            console.error("[auth/login] rpc role error:", rpcError);
         }

         resolvedRole = rpcRole
            ? (normalizeRoleName(rpcRole) as keyof typeof DEFAULT_ROUTES)
            : undefined;
      }

      if (!resolvedRole || !DEFAULT_ROUTES[resolvedRole]) {
         return NextResponse.json(
            {
               message:
                  "Login berhasil, tetapi role tidak ditemukan. Hubungi admin.",
            },
            { status: 422 },
         );
      }

       await logActivity(
          "LOGIN",
          `Login berhasil sebagai ${resolvedRole}`,
          { email, role: resolvedRole },
          { actorUserId: data.user.id },
       );

        await clearAttempts(ipKey);

      const successResponse = NextResponse.json({
         ok: true,
         defaultRoute: DEFAULT_ROUTES[resolvedRole],
         role: resolvedRole,
      });

      cookiesToApply.forEach(({ name, value, options }) => {
         successResponse.cookies.set({ name, value, ...options });
      });

      return successResponse;
   } catch {
      return NextResponse.json(
         { message: "Terjadi kesalahan saat login. Silakan coba lagi." },
         { status: 500 },
      );
   }
}
