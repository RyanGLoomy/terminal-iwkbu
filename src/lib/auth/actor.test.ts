import { test } from "node:test";
import assert from "node:assert/strict";

import {
   hasRole,
   UnauthorizedError,
   AuthorizationError,
} from "./actor";
import { ROLES, type RoleType } from "@/config/roles";
import type { AuthenticatedActor } from "./server-actor";

function actor(role: RoleType): AuthenticatedActor {
   return {
      user: { id: "u1", email: "x@x" },
      profile: { terminal_id: null, is_active: true },
      role,
      terminalId: null,
   };
}

test("hasRole: single role cocok", () => {
   assert.equal(hasRole(actor(ROLES.PO), ROLES.PO), true);
});

test("hasRole: single role tak cocok", () => {
   assert.equal(hasRole(actor(ROLES.PETUGAS_LOKET), ROLES.PO), false);
});

test("hasRole: multi-role, salah satu cocok", () => {
   assert.equal(
      hasRole(actor(ROLES.STAF_IW), [ROLES.ADMIN_TERMINAL, ROLES.STAF_IW]),
      true,
   );
});

test("hasRole: multi-role, tak ada yg cocok", () => {
   assert.equal(
      hasRole(actor(ROLES.PO), [ROLES.ADMIN_TERMINAL, ROLES.STAF_IW]),
      false,
   );
});

test("UnauthorizedError status 401", () => {
   assert.equal(new UnauthorizedError().status, 401);
});

test("AuthorizationError status 403", () => {
   assert.equal(new AuthorizationError().status, 403);
});

test("semua role dikenali (ROLES konsisten)", () => {
   const all: RoleType[] = [ROLES.PO, ROLES.PETUGAS_LOKET, ROLES.ADMIN_TERMINAL, ROLES.STAF_IW];
   for (const r of all) {
      assert.equal(hasRole(actor(r), r), true);
   }
});
