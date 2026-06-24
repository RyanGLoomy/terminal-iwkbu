export type UserRoleRelation = {
   role?:
      | {
           name?: string | null;
        }
      | Array<{ name?: string | null }>
      | null;
} | null;

export type ProfileWithRoles = {
   user_roles?: UserRoleRelation | UserRoleRelation[];
   roles?:
      | {
           name?: string | null;
        }
      | Array<{ name?: string | null }>
      | null;
} | null;

export function getRoleNameFromProfile(profile: any) {
   const userRoles = profile?.user_roles;

   if (Array.isArray(userRoles)) {
      const firstRole = userRoles[0]?.role?.name;
      if (firstRole) return firstRole;
   } else if (userRoles?.role?.name) {
      return userRoles.role.name;
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
