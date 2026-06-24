import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { logActivity } from "@/lib/supabase/queries/operasional.server";

export async function POST(request: Request) {
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
        const cookieHeader = request.headers.get("cookie") ?? "";
        return cookieHeader
          .split("; ")
          .filter(Boolean)
          .map((c) => {
            const eqIdx = c.indexOf("=");
            if (eqIdx === -1) return { name: c, value: "" };
            return { name: c.slice(0, eqIdx), value: c.slice(eqIdx + 1) };
          });
      },
      setAll(cookiesToSet) {
        cookiesToApply.push(...cookiesToSet);
      },
    },
  });

   const { data: { user } } = await supabase.auth.getUser();

   if (user) {
      await logActivity("LOGOUT", "Pengguna logout", {}, { actorUserId: user.id });
   }

   await supabase.auth.signOut();

  const response = NextResponse.json({ ok: true });

  cookiesToApply.forEach(({ name, value, options }) => {
    response.cookies.set({ name, value, ...options });
  });

  return response;
}
