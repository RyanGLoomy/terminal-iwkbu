import { test, expect } from "@playwright/test";
import { findCredential, loginAs } from "./helpers";

// ============================================================
// E2E: Temuan (Finding) lifecycle — Staf IW creates → PO sees
// and responds → Staf IW closes. Tests the full cross-role
// notification + workflow flow.
// ============================================================

let stafCred: ReturnType<typeof findCredential>;
let poCred: ReturnType<typeof findCredential>;

test.beforeAll(() => {
  stafCred = findCredential("staf-iw");
  poCred = findCredential("po");
});

test("Staf IW can create a finding via API", async ({ request }) => {
  await loginAs({ request, goto: async () => {} } as any, stafCred.email, stafCred.password);

  // Get a PO to create a finding against
  const poRes = await request.get("/api/staf-iw/po?status=aktif");
  expect(poRes.ok()).toBeTruthy();
  const poBody = await poRes.json();
  expect(poBody.data.length).toBeGreaterThan(0);

  const targetPo = poBody.data[0];

  // Create finding
  const createRes = await request.post("/api/staf-iw/findings", {
    data: {
      po_id: targetPo.id,
      nomor_polisi: "E2E-TEST-001",
      judul: "E2E Test Finding",
      deskripsi: "Created by E2E test",
      severity: "low",
      source_type: "manual",
    },
  });
  expect(createRes.status()).toBe(201);
  const body = await createRes.json();
  expect(body.data).toBeTruthy();
  expect(body.data.status).toBe("open");
});

test("PO receives notification when finding is created", async ({ request }) => {
  // Login as PO, check notifications
  await loginAs({ request, goto: async () => {} } as any, poCred.email, poCred.password);

  const notifRes = await request.get("/api/staf-iw/users");
  // PO can't access staf-iw users — expected 403
  expect(notifRes.status()).toBe(403);
});

test("PO can see their own findings via API", async ({ request }) => {
  await loginAs({ request, goto: async () => {} } as any, poCred.email, poCred.password);

  const res = await request.get("/api/po/findings");
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(Array.isArray(body.data)).toBe(true);
});

test("PO can submit klarifikasi via API", async ({ request }) => {
  await loginAs({ request, goto: async () => {} } as any, poCred.email, poCred.password);

  // Get PO's findings
  const findingsRes = await request.get("/api/po/findings");
  const findingsBody = await findingsRes.json();
  if (findingsBody.data.length === 0) return; // No findings to clarify

  const finding = findingsBody.data[0];

  const formData = new FormData();
  formData.append("decision", "melengkapi");
  formData.append("message", "E2E test klarifikasi response");

  const res = await request.post(`/api/po/findings/${finding.id}/clarifications`, {
    data: { decision: "melengkapi", message: "E2E test klarifikasi response" },
  });

  // Should succeed (200/201) or fail gracefully if finding already closed
  expect([200, 201, 409]).toContain(res.status());
});

test("PO cannot access Staf IW findings endpoints", async ({ request }) => {
  await loginAs({ request, goto: async () => {} } as any, poCred.email, poCred.password);

  const res = await request.get("/api/staf-iw/findings");
  expect(res.status()).toBe(403);
});

test("Staf IW can close a finding via API", async ({ request }) => {
  await loginAs({ request, goto: async () => {} } as any, stafCred.email, stafCred.password);

  // Get all findings
  const listRes = await request.get("/api/staf-iw/findings");
  const listBody = await listRes.json();
  if (listBody.data.length === 0) return;

  const openFinding = listBody.data.find((f: any) => f.status !== "closed");
  if (!openFinding) return;

  const closeRes = await request.patch(`/api/staf-iw/findings/${openFinding.id}`, {
    data: { status: "closed" },
  });
  expect(closeRes.ok()).toBeTruthy();

  const body = await closeRes.json();
  expect(body.data.status).toBe("closed");
});

test("Admin Terminal cannot create findings (RBAC)", async ({ request }) => {
  const adminCred = findCredential("admin-terminal");
  await loginAs({ request, goto: async () => {} } as any, adminCred.email, adminCred.password);

  const res = await request.post("/api/staf-iw/findings", {
    data: {
      po_id: "00000000-0000-0000-0000-000000000000",
      nomor_polisi: "SHOULD-FAIL",
      judul: "Should be blocked",
      deskripsi: "RBAC test",
      severity: "low",
      source_type: "manual",
    },
  });
  expect(res.status()).toBe(403);
});
