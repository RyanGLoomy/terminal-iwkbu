import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { resolveRoleFromUserAndProfile } from "./role";
import { normalizeRoleName } from "@/lib/supabase/role-utils";

export type AuthenticatedActor = {
   user: {
      id: string;
      email?: string | null;
      user_metadata?: Record<string, unknown>;
      app_metadata?: Record<string, unknown>;
   };
   profile: {
        terminal_id?: string | null;
        full_name?: string | null;
       is_active?: boolean | null;
        role?: string | null;
       [key: string]: unknown;
    } | null;
    role: string;
    terminalId?: string | null;
};

/**
 * Dibungkus `cache()` React agar resolusi actor (sekali per request HTTP)
 * tidak diulang antara layout, page, maupun komponen server di render yang sama.
 * Query `profiles` dan `user_roles` dijalankan paralel (sebelumnya berurutan).
 */
export const getAuthenticatedActor = cache(async () => {
   const supabase = await createClient();
   const {
      data: { user },
   } = await supabase.auth.getUser();

   if (!user) return null;

   // Paralel: ambil profil dan relasi role sekaligus (keduanya hanya butuh user.id).
   const [profileRes, userRoleRes] = await Promise.all([
      supabase
         .from("profiles")
         .select("terminal_id, full_name, is_active")
         .eq("id", user.id)
         .maybeSingle(),
      supabase
         .from("user_roles")
         .select("role:roles(name)")
         .eq("user_id", user.id)
         .maybeSingle(),
   ]);

   const profile = profileRes.data;
   if (profile?.is_active === false) return null;

   if (profile) {
      (profile as { user_roles?: unknown }).user_roles = userRoleRes.data;
   }

   const resolved = resolveRoleFromUserAndProfile(user, profile);

   if (!resolved.role) {
      const { data: rpcRole } = await supabase.rpc("get_current_user_role");
      resolved.role = normalizeRoleName(rpcRole) as typeof resolved.role;
   }

   if (!resolved.role) return null;

   return {
      user,
      profile,
      role: resolved.role,
      terminalId: resolved.terminalId ?? profile?.terminal_id ?? null,
   } satisfies AuthenticatedActor;
});
