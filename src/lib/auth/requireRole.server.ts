import { resolveRoleFromUserAndProfile } from "./role";

export class AuthorizationError extends Error {
   status = 403;
   constructor(message = "Forbidden") {
      super(message);
      this.name = "AuthorizationError";
   }
}

/**
 * Ensure the provided user/profile has one of the allowed roles.
 * Throws AuthorizationError when check fails.
 */
export function ensureRoleOrThrow(
   user: any,
   profile: any | undefined,
   allowed: string | string[],
) {
   const allowedArr = Array.isArray(allowed) ? allowed : [allowed];
   const { role } = resolveRoleFromUserAndProfile(user, profile);

   if (!role || !allowedArr.includes(role)) {
      throw new AuthorizationError();
   }

   return { role } as const;
}
