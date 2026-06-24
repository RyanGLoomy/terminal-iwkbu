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

export async function getAuthenticatedActor() {
   const supabase = await createClient();
   const {
      data: { user },
   } = await supabase.auth.getUser();

   if (!user) return null;

   const { data: profile } = await supabase
      .from("profiles")
      .select("terminal_id, full_name, is_active")
      .eq("id", user.id)
      .maybeSingle();

   if (profile?.is_active === false) return null;

   if (profile) {
      const { data: userRole } = await supabase
         .from("user_roles")
         .select("role:roles(name)")
         .eq("user_id", user.id)
         .maybeSingle();
      (profile as any).user_roles = userRole;
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
}
