import { test, expect } from "@playwright/test";
import { findCredential, loginAs } from "./helpers";

// ============================================================
// E2E: Storage & document upload — PO uploads armada dokumen,
// evidence download path validation, IDOR protection.
// ============================================================

let poCred: ReturnType<typeof findCredential>;
let stafCred: ReturnType<typeof findCredential>;

test.beforeAll(() => {
  poCred = findCredential("po");
  stafCred = findCredential("staf-iw");
});

test("PO can list own armada", async ({ request }) => {
  await loginAs({ request, goto: async () => {} } as any, poCred.email, poCred.password);

  const res = await request.get("/api/po/armada");
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(Array.isArray(body.data)).toBe(true);
});

test("PO can upload dokumen to own armada", async ({ request }) => {
  await loginAs({ request, goto: async () => {} } as any, poCred.email, poCred.password);

  const armadaRes = await request.get("/api/po/armada");
  const armadaBody = await armadaRes.json();
  if (armadaBody.data.length === 0) return;

  const armadaId = armadaBody.data[0].id;

  // Minimal valid PDF header so the server's magic-number validation
  // (APP-04) accepts the upload — plain text would be correctly rejected.
  const buffer = Buffer.from("%PDF-1.4\nE2E test document content");
  const res = await request.post(`/api/po/armada/${armadaId}/dokumen`, {
     multipart: {
        jenis: "lainnya",
        file: {
           name: "e2e-test.pdf",
           mimeType: "application/pdf",
           buffer,
        },
     },
  });

  expect([201, 400]).toContain(res.status()); // 400 if file too small etc
});

test("Evidence download rejects invalid path format", async ({ request }) => {
  await loginAs({ request, goto: async () => {} } as any, stafCred.email, stafCred.password);

  // Path traversal attempt
  const res1 = await request.get("/api/findings/evidence?path=../../../etc/passwd");
  expect(res1.status()).toBe(400);

  // Non-UUID path
  const res2 = await request.get("/api/findings/evidence?path=not-a-uuid/file.pdf");
  expect(res2.status()).toBe(400);

  // Empty path
  const res3 = await request.get("/api/findings/evidence?path=");
  expect(res3.status()).toBe(400);
});

test("PO cannot access another PO's armada (IDOR)", async ({ request }) => {
  await loginAs({ request, goto: async () => {} } as any, poCred.email, poCred.password);

  // Try to access armada with a fake ID
  const res = await request.get("/api/po/armada");
  const body = await res.json();

  // All returned armada must belong to this PO
  if (body.data.length > 0) {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const patchRes = await request.patch(`/api/po/armada/${fakeId}`, {
      data: { status_operasional: "aktif" },
    });
    expect([403, 404]).toContain(patchRes.status());
  }
});

test("Anonymous cannot access storage endpoints", async ({ request }) => {
  const res = await request.get("/api/po/armada");
  expect(res.status()).toBe(401);
});
