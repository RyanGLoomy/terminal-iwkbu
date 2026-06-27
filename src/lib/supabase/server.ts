import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Explicit cookie security options.
 * Supabase defaults are correct but implicit — this makes the
 * security posture auditable and prevents accidental regression.
 */
const SECURE_COOKIE_OPTIONS: CookieOptions = {
   httpOnly: true,
   secure: process.env.NODE_ENV === "production",
   sameSite: "lax",
   path: "/",
};

export async function createClient() {
   const cookieStore = await cookies();

   const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
   const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

   if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase environment variables");
   }

   return createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
         getAll() {
            return cookieStore.getAll();
         },
         setAll(cookiesToSet) {
            try {
               cookiesToSet.forEach(({ name, value }) => {
                  cookieStore.set({
                     name,
                     value,
                     ...SECURE_COOKIE_OPTIONS,
                  });
               });
            } catch {
               // Dipanggil dari Server Component → boleh diabaikan
               // karena sesi akan di-refresh lewat middleware / proxy.
            }
         },
      },
   });
}
