import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ROLES, ROLE_ROUTES, PUBLIC_ROUTES, DEFAULT_ROUTES } from "@/config/roles";
import { resolveRoleFromUserAndProfile } from "@/lib/auth/role";

export async function proxy(request: NextRequest) {
   // Nonce CSP per-request. Header 'x-nonce' dibaca Next.js dan diterapkan ke
   // script yang disuntiknya; kita pakai nonce yg sama di script-src. Ini
   // menutup 'unsafe-inline' pada script-src (sebelumnya XSS bisa mengeksekusi
   // inline script apa pun). Anti-flash script di layout.tsx juga memakai nonce.
   const nonce = crypto.randomUUID();
   const requestHeaders = new Headers(request.headers);
   requestHeaders.set("x-nonce", nonce);

   let response = NextResponse.next({
      request: {
         headers: requestHeaders,
      },
   });

   // Basic security headers
   try {
      response.headers.set(
         "Strict-Transport-Security",
         "max-age=63072000; includeSubDomains; preload",
      );
      response.headers.set("X-Frame-Options", "DENY");
      response.headers.set("X-Content-Type-Options", "nosniff");
      response.headers.set(
         "Referrer-Policy",
         "strict-origin-when-cross-origin",
      );
      response.headers.set(
         "Permissions-Policy",
         "geolocation=(), microphone=()",
      );
      const isDev = process.env.NODE_ENV !== "production";

      // connect-src allowlist (sebelumnya 'https:' -> XSS bisa eksfiltrasi ke
      // host HTTPS mana pun). Hanya origin sendiri + Supabase + HIBP (+Sentry
      // bila DSN diset).
      const connectHosts = ["'self'"];
      // APP-05: img-src dipersempit dari `https:` (wildcard) ke origin sendiri
      // + origin Supabase (gambar dari Storage). Mencegah exfiltrasi via
      // <img src="https://attacker/..."> bila nilai user-controlled pernah
      // dirender sebagai img src di masa depan.
      const imgHosts = ["'self'", "data:"];
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (supabaseUrl) {
         try {
            const supaOrigin = new URL(supabaseUrl).origin;
            connectHosts.push(supaOrigin);
            // Realtime Supabase memakai WebSocket (wss) ke host yang sama.
            connectHosts.push(supaOrigin.replace(/^http/i, "ws"));
            imgHosts.push(supaOrigin);
         } catch {
            // URL env tidak valid -> abaikan
         }
      }
      connectHosts.push("https://api.pwnedpasswords.com");
      if (
         process.env.SENTRY_DSN ||
         process.env.NEXT_PUBLIC_SENTRY_DSN
      ) {
         connectHosts.push("https://*.ingest.sentry.io");
      }

      const csp = [
         "default-src 'self'",
         "base-uri 'self'",
         "frame-ancestors 'none'",
         "object-src 'none'",
         `img-src ${imgHosts.join(" ")}`,
         "manifest-src 'self'",
         "style-src 'self' 'unsafe-inline'",
         `script-src 'self' 'nonce-${nonce}'${isDev ? " 'unsafe-eval'" : ""}`,
         "worker-src 'self'",
         `connect-src ${connectHosts.join(" ")}${isDev ? " ws:" : ""}`,
         "font-src 'self' data:",
      ].join("; ");
      response.headers.set("Content-Security-Policy", csp);
   } catch {
      // ignore header errors
   }

   const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
   const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

   const supabase = createServerClient(supabaseUrl!, supabaseKey!, {
      cookies: {
         get(name: string) {
            return request.cookies.get(name)?.value;
         },
         set(name: string, value: string, options: CookieOptions) {
            request.cookies.set({
               name,
               value,
               ...options,
            });
            response = NextResponse.next({
               request: {
                  headers: request.headers,
               },
            });
            response.cookies.set({
               name,
               value,
               ...options,
            });
         },
         remove(name: string, options: CookieOptions) {
            request.cookies.set({
               name,
               value: "",
               ...options,
            });
            response = NextResponse.next({
               request: {
                  headers: request.headers,
               },
            });
            response.cookies.set({
               name,
               value: "",
               ...options,
            });
         },
      },
   });

   const {
      data: { user },
   } = await supabase.auth.getUser();

   const { pathname } = request.nextUrl;

   if (pathname.startsWith("/api")) {
      return response;
   }

   // Izinkan akses ke route publik
   if (PUBLIC_ROUTES.includes(pathname)) {
      return response;
   }

   // Redirect ke login jika tidak ada user
   if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
   }

   // Resolve role using centralized util. Only query `profiles` when necessary
   // (e.g., metadata missing or we need terminal_id for loket checks).
   let profile: any = undefined;
   let resolved = resolveRoleFromUserAndProfile(user, undefined);

   // Fetch profile — needed for terminal_id (loket PIN check) and role fallback
   const { data: fetchedProfile } = await supabase
      .from("profiles")
      .select("terminal_id, is_active, user_roles(role:roles(name))")
      .eq("id", user.id)
      .maybeSingle();
   profile = fetchedProfile;

   if (profile?.is_active === false) {
      return NextResponse.redirect(new URL("/error", request.url));
   }

   // Re-resolve with fetched profile to get terminalId
   resolved = resolveRoleFromUserAndProfile(user, profile);

   if (!resolved.role) {
      const { data: rpcRole } = await supabase.rpc("get_current_user_role");
      if (rpcRole) {
         resolved.role = rpcRole.replace(/_/g, "-") as typeof resolved.role;
      }
   }

   const userRole = resolved.role as keyof typeof ROLE_ROUTES;

   if (!userRole || !(userRole in ROLE_ROUTES)) {
      return NextResponse.redirect(new URL("/error", request.url));
   }

   // Jika di root dashboard, redirect ke dashboard role masing-masing
   if (pathname === "/dashboard" || pathname === "/") {
      const defaultRoute = DEFAULT_ROUTES[userRole];
      return NextResponse.redirect(new URL(defaultRoute, request.url));
   }

   const isPetugasLoket = userRole === ROLES.PETUGAS_LOKET;
   const isPetugasArea = pathname.startsWith("/loket");
   const isPinPage = pathname.startsWith("/loket/pin");

   // If petugas loket role requires terminal membership, ensure terminal info exists.
   if (isPetugasLoket && !profile?.terminal_id && !resolved.terminalId) {
      return NextResponse.redirect(new URL("/error", request.url));
   }

    if (isPetugasLoket && isPetugasArea && !isPinPage) {
       const { data: pinValid } = await supabase.rpc("check_loket_pin_session");

       if (!pinValid) {
          return NextResponse.redirect(new URL("/loket/pin", request.url));
       }
    }

   // Cek apakah user mengakses route yang diizinkan untuk rolenya
   const allowedRoutes = ROLE_ROUTES[userRole] || [];
   const hasAccess = allowedRoutes.some(
      (route) => pathname.startsWith(route) || pathname === route,
   );

   if (!hasAccess) {
      // Redirect ke dashboard role mereka jika mencoba akses route lain
      return NextResponse.redirect(
         new URL(DEFAULT_ROUTES[userRole], request.url),
      );
   }

   return response;
}

export const config = {
   matcher: [
      "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
   ],
};
