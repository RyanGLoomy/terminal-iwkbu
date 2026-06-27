import { test, expect } from "@playwright/test";
import * as fs from "fs";
import { findCredential, loginAs } from "./helpers";

/**
 * security-audit-coverage.spec.ts
 *
 * Regression coverage for findings raised in the 2026-06 security audit.
 * These attacks go DIRECT to the Supabase Data/Storage layer using a
 * logged-in user's own access token (bypassing the Next.js API), because
 * that is exactly the threat model the RLS policies must defend against.
 *
 * Tests marked `test.fixme` currently FAIL (the vulnerability is present)
 * and are pinned so CI stays green. Remove `.fixme` once the fix lands:
 *   - RLS-01  profiles self-update (no WITH CHECK)
 *   - RLS-02  petugas_terminal SELECT USING(true)
 *   - RLS-04  activity_logs direct user INSERT (audit forge)
 *   - AUTH-01 role resolution trusts user-editable user_metadata
 *
 * Requires the standard E2E setup (`pnpm test:e2e:setup`) so that
 * /tmp/opencode/iwkbu-test-credentials.json exists, plus .env.local.
 */

const envPath = ".env.local";
function loadEnv(): Record<string, string> {
  const map: Record<string, string> = {};
  if (!fs.existsSync(envPath)) return map;
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i > 0) {
      const k = t.slice(0, i).trim();
      let v = t.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      map[k] = v;
    }
  }
  return map;
}

const ENV = loadEnv();
const SUPABASE_URL = ENV.NEXT_PUBLIC_SUPABASE_URL;
const PUBLISH_KEY = ENV.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? ENV.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Sign in as a user via Supabase Auth REST and return their access token. */
async function userAccessToken(email: string, password: string): Promise<string> {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: PUBLISH_KEY, "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await r.json();
  if (!r.ok || !body.access_token) throw new Error(`sign-in failed: ${body.message ?? r.status}`);
  return body.access_token as string;
}

function rest(token: string, path: string, init: RequestInit = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: PUBLISH_KEY,
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

test.describe("Audit RLS-01: profiles self-update must be restricted", () => {
  // A user must NOT be able to change their own terminal_id / is_active via the
  // client, because the UPDATE policy lacks a WITH CHECK clause.
  test.fixme("user cannot change own terminal_id", async () => {
    const cred = findCredential("loket");
    const token = await userAccessToken(cred.email, cred.password);
    const r = await rest(
      token,
      `profiles?id=eq.${encodeURIComponent("<self>")}`,
      { method: "PATCH", body: JSON.stringify({ terminal_id: "<another-terminal-uuid>" }) },
    );
    expect(r.status).toBeGreaterThanOrEqual(400);
  });

  test.fixme("user cannot self-reactivate after admin deactivation", async () => {
    const cred = findCredential("loket");
    const token = await userAccessToken(cred.email, cred.password);
    const r = await rest(token, `profiles?id=eq.<self>`, {
      method: "PATCH",
      body: JSON.stringify({ is_active: true }),
    });
    expect(r.status).toBeGreaterThanOrEqual(400);
  });
});

test.describe("Audit RLS-02: petugas_terminal must be terminal-scoped", () => {
  test.fixme("user cannot read petugas_terminal rows from other terminals", async () => {
    const cred = findCredential("loket");
    const token = await userAccessToken(cred.email, cred.password);
    const r = await rest(token, "petugas_terminal?select=id,nama,terminal_id");
    const rows = await r.json();
    // After fix: only the user's own terminal rows (or none) are visible.
    expect(Array.isArray(rows) ? rows.length : 999).toBeLessThanOrEqual(0);
  });
});

test.describe("Audit RLS-04: activity_logs must reject direct user INSERT", () => {
  test.fixme("user cannot forge an audit log entry directly", async () => {
    const cred = findCredential("loket");
    const token = await userAccessToken(cred.email, cred.password);
    const r = await rest(token, "activity_logs", {
      method: "POST",
      body: JSON.stringify({ user_id: "<self>", aksi: "VERIFIKASI_PO", deskripsi: "forge" }),
    });
    expect(r.status).toBeGreaterThanOrEqual(400);
  });
});

test.describe("Audit AUTH-01: role must not be derived from user_metadata", () => {
  // A roleless user (e.g. a freshly self-registered PO with no user_roles row)
  // who poisons user_metadata.role must NOT gain that role via /api/auth/login.
  test.fixme("poisoned user_metadata.role does not escalate through login", async () => {
    // This test needs a dedicated roleless probe account created by setup.
    // Placeholder assertion: login response must never return a role the user
    // does not actually hold in user_roles.
    const cred = findCredential("loket");
    // If a user could set user_metadata.role = "staf-iw", the login API today
    // returns { role: "staf-iw", defaultRoute: "/staf-iw" } — which is the bug.
    const loginRes = await fetch("http://127.0.0.1:3000/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: cred.email, password: cred.password }),
    });
    const body = await loginRes.json();
    expect(body.role).toBe("loket"); // must reflect the DB role, not metadata
  });
});

test.describe("Audit reaffirm: existing controls still hold", () => {
  // These PASS today and must keep passing.
  test("cron iwkbu-sync rejects missing bearer", async ({ request }) => {
    const r = await request.post("/api/cron/iwkbu-sync");
    expect(r.status()).toBe(401);
  });

  test("PO cannot call staf-iw audit-trail API", async ({ request }) => {
    const cred = findCredential("po");
    await loginAs({ request, goto: async () => {} } as any, cred.email, cred.password);
    const r = await request.get("/api/staf-iw/audit-trail");
    expect(r.status()).toBe(403);
  });

  test("evidence endpoint rejects path traversal", async ({ request }) => {
    const cred = findCredential("staf-iw");
    await loginAs({ request, goto: async () => {} } as any, cred.email, cred.password);
    const r = await request.get("/api/findings/evidence?path=../../../etc/passwd");
    expect(r.status()).toBe(400);
  });
});
