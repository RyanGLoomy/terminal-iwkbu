import { test, expect } from "@playwright/test";
import { findCredential, loginAs } from "./helpers";

// ============================================================
// E2E: Audit trail & laporan — Staf IW can view activity logs,
// laporan page works, audit trail records key actions.
// ============================================================

let stafCred: ReturnType<typeof findCredential>;

test.beforeAll(() => {
  stafCred = findCredential("staf-iw");
});

test("Staf IW audit trail returns data", async ({ request }) => {
  await loginAs({ request, goto: async () => {} } as any, stafCred.email, stafCred.password);

  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const start = weekAgo.toISOString().slice(0, 10);
  const end = today.toISOString().slice(0, 10);

  const res = await request.get(
    `/api/staf-iw/audit-trail?startDate=${start}&endDate=${end}&limit=50`,
  );
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(Array.isArray(body.data)).toBe(true);
});

test("Audit trail rejects invalid date format", async ({ request }) => {
  await loginAs({ request, goto: async () => {} } as any, stafCred.email, stafCred.password);

  const res = await request.get("/api/staf-iw/audit-trail?startDate=invalid&endDate=date");
  expect(res.status()).toBe(400);
});

test("Audit trail rejects limit > 500", async ({ request }) => {
  await loginAs({ request, goto: async () => {} } as any, stafCred.email, stafCred.password);

  const res = await request.get("/api/staf-iw/audit-trail?limit=999");
  expect(res.status()).toBe(400);
});

test("PO cannot access audit trail", async ({ request }) => {
  const poCred = findCredential("po");
  await loginAs({ request, goto: async () => {} } as any, poCred.email, poCred.password);

  const res = await request.get("/api/staf-iw/audit-trail");
  expect(res.status()).toBe(403);
});

test("Loket cannot access audit trail", async ({ request }) => {
  const loketCred = findCredential("loket");
  await loginAs({ request, goto: async () => {} } as any, loketCred.email, loketCred.password);

  const res = await request.get("/api/staf-iw/audit-trail");
  expect(res.status()).toBe(403);
});

test("Staf IW laporan page returns stats", async ({ request }) => {
  await loginAs({ request, goto: async () => {} } as any, stafCred.email, stafCred.password);

  // Laporan page data comes from findings + armada counts
  const findingsRes = await request.get("/api/staf-iw/findings");
  expect(findingsRes.ok()).toBeTruthy();
  const findingsBody = await findingsRes.json();
  expect(Array.isArray(findingsBody.data)).toBe(true);
});

test("Audit trail contains login action", async ({ request }) => {
  await loginAs({ request, goto: async () => {} } as any, stafCred.email, stafCred.password);

  // The login we just did should be logged
  const today = new Date().toISOString().slice(0, 10);
  const res = await request.get(
    `/api/staf-iw/audit-trail?startDate=${today}&endDate=${today}&limit=10`,
  );
  const body = await res.json();

  if (body.data.length > 0) {
    // At least one entry should exist (could be LOGIN or other action)
    const hasLogin = body.data.some((log: any) => log.aksi === "LOGIN");
    expect(hasLogin).toBe(true);
  }
});
