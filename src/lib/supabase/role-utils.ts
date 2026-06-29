export type UserRoleRelation = {
   role?:
      | { name?: string | null }
      | Array<{ name?: string | null }>
      | null;
} | null;

export type ProfileWithRoles = {
   user_roles?: UserRoleRelation | UserRoleRelation[];
   roles?:
      | { name?: string | null }
      | Array<{ name?: string | null }>
      | null;
   terminal_id?: string | null;
} | null;

type RoleLike =
   | { name?: string | null }
   | Array<{ name?: string | null }>
   | null
   | undefined;

function firstRoleName(role: RoleLike): string | null | undefined {
   if (Array.isArray(role)) return role[0]?.name;
   return role?.name;
}

export function getRoleNameFromProfile(
   profile: ProfileWithRoles | null | undefined,
) {
   const userRoles = profile?.user_roles;

   if (Array.isArray(userRoles)) {
      const firstRole = firstRoleName(userRoles[0]?.role);
      if (firstRole) return firstRole;
   } else {
      const firstRole = firstRoleName(userRoles?.role);
      if (firstRole) return firstRole;
   }

   const legacyRoles = profile?.roles;
   if (Array.isArray(legacyRoles)) {
      const firstRole = legacyRoles[0]?.name;
      if (firstRole) return firstRole;
   } else if (legacyRoles?.name) {
      return legacyRoles.name;
   }

   return undefined;
}

export function normalizeRoleName(roleName: string | undefined | null) {
   return roleName?.replace(/_/g, "-") ?? undefined;
}
