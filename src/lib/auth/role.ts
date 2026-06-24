import { getRoleNameFromProfile } from "@/lib/supabase/role-utils";
import type { RoleType } from "@/config/roles";

export type RoleResolution = {
   role?: RoleType;
   terminalId?: string | null | undefined;
   source?: "profile" | "user_metadata" | "app_metadata" | "unknown";
};

/**
 * Resolve role and terminal context from Supabase user + optional profile.
 * Does not create clients or perform DB calls—pure resolver to keep logic central.
 */
export function resolveRoleFromUserAndProfile(
   user: any,
   profile?: any,
): RoleResolution {
   const roleFromProfile = getRoleNameFromProfile(profile);
   const roleFromUserMeta = user?.user_metadata?.role as string | undefined;
   const roleFromAppMeta = user?.app_metadata?.role as string | undefined;

   const normalized = (
      roleFromProfile ??
      roleFromUserMeta ??
      roleFromAppMeta
   )?.replace(/_/g, "-");

   return {
      role: (normalized as RoleType) ?? undefined,
      terminalId: profile?.terminal_id ?? undefined,
      source: roleFromProfile
         ? "profile"
         : roleFromUserMeta
           ? "user_metadata"
           : roleFromAppMeta
             ? "app_metadata"
             : "unknown",
   };
}
