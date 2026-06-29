import { getRoleNameFromProfile } from "@/lib/supabase/role-utils";
import type { ProfileWithRoles } from "@/lib/supabase/role-utils";
import type { RoleType } from "@/config/roles";

export type RoleResolution = {
   role?: RoleType;
   terminalId?: string | null | undefined;
   source?: "profile" | "unknown";
};

/**
 * Resolve role and terminal context from the user's DB profile only.
 *
 * SECURITY (AUTH-01): Supabase `user_metadata` is user-editable via
 * `auth.updateUser()` / `signUp` options, so it MUST NOT be trusted for
 * authorization — doing so allowed a roleless user to escalate by writing
 * `user_metadata.role`. Role is resolved exclusively from the `user_roles`
 * join on the profile (DB source of truth). Callers that need a fallback
 * use the `get_current_user_role` RPC (see server-actor / login / proxy).
 */
export function resolveRoleFromUserAndProfile(
   user: unknown,
   profile?: ProfileWithRoles | null,
): RoleResolution {
   void user;
   const roleFromProfile = getRoleNameFromProfile(profile);
   const normalized = roleFromProfile?.replace(/_/g, "-");

   return {
      role: (normalized as RoleType) ?? undefined,
      terminalId: profile?.terminal_id ?? undefined,
      source: roleFromProfile ? "profile" : "unknown",
   };
}
