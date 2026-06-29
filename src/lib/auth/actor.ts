import { NextResponse } from "next/server";
import { getAuthenticatedActor, type AuthenticatedActor } from "./server-actor";
import type { RoleType } from "@/config/roles";
import { sanitizeDbError } from "@/lib/db-error";

/**
 * Modul Authorisation (deepened).
 *
 * Satu-satunya seam otorisasi untuk route API. Memakai `getAuthenticatedActor`
 * sebagai SATU-SATUNYA path resolusi role (dengan fallback RPC), lalu memeriksa
 * `actor.role` langsung — tidak melakukan re-resolusi (seperti `ensureRoleOrThrow`
 * lama yang memecahkan profile ulang tanpa fallback RPC).
 *
 * Tiga bagian:
 *   - `hasRole(actor, roles)`  : PURE, testable (interface = test surface).
 *   - `requireActor(roles)`    : async wrapper; resolve actor + hasRole, throw 401/403.
 *   - `actorErrorHandler(err)` : standar catch → 401/403/500 untuk semua route.
 *
 * Menggantikan: ensureRoleOrThrow + 7 helper lokal (requireStaf/Staff/StafIw/
 * Account/MasterData/PetugasActor) + 4 ALLOWED_ROLES + 15 inline actor.role ===.
 */

export class UnauthorizedError extends Error {
   status = 401;
   constructor(message = "Unauthorized") {
      super(message);
      this.name = "UnauthorizedError";
   }
}

export class AuthorizationError extends Error {
   status = 403;
   constructor(message = "Forbidden") {
      super(message);
      this.name = "AuthorizationError";
   }
}

function toRoleArray(allowed: RoleType | RoleType[]): RoleType[] {
   return Array.isArray(allowed) ? allowed : [allowed];
}

/** PURE: apakah actor memiliki salah satu role yang diizinkan. Testable langsung. */
export function hasRole(
   actor: AuthenticatedActor,
   allowed: RoleType | RoleType[],
): boolean {
   const arr = toRoleArray(allowed);
   return arr.includes(actor.role as RoleType);
}

/**
 * Resolve actor (via getAuthenticatedActor) dan pastikan role-nya diizinkan.
 * Throw UnauthorizedError (401) bila tidak ada actor; AuthorizationError (403)
 * bila role tak cocok. Panggil sekali per route handler.
 */
export async function requireActor(
   allowed: RoleType | RoleType[],
): Promise<AuthenticatedActor> {
   const actor = await getAuthenticatedActor();
   if (!actor) throw new UnauthorizedError();
   if (!hasRole(actor, allowed)) throw new AuthorizationError();
   return actor;
}

/** Standar penanganan error di catch route API: 401/403/500. */
export function actorErrorHandler(error: unknown): NextResponse {
   if (error instanceof UnauthorizedError) {
      return NextResponse.json(
         { message: "Sesi habis. Silakan login ulang." },
         { status: 401 },
      );
   }
   if (error instanceof AuthorizationError) {
      return NextResponse.json({ message: "Akses ditolak" }, { status: 403 });
   }
   return NextResponse.json(
      { message: sanitizeDbError(error, "api") },
      { status: 500 },
   );
}
