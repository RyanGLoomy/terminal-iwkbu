import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

function getSafeRedirect(rawRedirect: string | null, origin: string) {
  const fallback = "/";
  if (!rawRedirect) return fallback;

  if (
    !rawRedirect.startsWith("/") ||
    rawRedirect.startsWith("//") ||
    rawRedirect.includes("\\")
  ) {
    return fallback;
  }

  try {
    const destination = new URL(rawRedirect, origin);
    if (destination.origin !== origin) return fallback;
    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return fallback;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const type = url.searchParams.get("type");
  const safeRedirect = getSafeRedirect(url.searchParams.get("redirect"), url.origin);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (code && supabaseUrl && supabaseKey) {
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

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
       const destination =
         type === "recovery" ? "/reset-password" : safeRedirect;
       const response = NextResponse.redirect(
         new URL(destination, url.origin),
       );
       cookiesToApply.forEach(({ name, value, options }) => {
         response.cookies.set({ name, value, ...options });
       });
       return response;
    }
  }

   const destination = type === "recovery" ? "/reset-password" : safeRedirect;
   return NextResponse.redirect(new URL(destination, url.origin));
}
