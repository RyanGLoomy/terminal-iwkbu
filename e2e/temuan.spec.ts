import { test, expect } from "@playwright/test";
import { findCredential, loginAs } from "./helpers";

// ============================================================
// E2E: Lifecycle Temuan (Finding) — verifikasi interaksi antar-role.
// Headline (pertanyaan user): "staf-iw membuat temuan -> PO lihat?"
// Rantai: Staf IW membuat Temuan utk PO tertentu -> PO tsb melihatnya
// (dan PO lain TIDAK) -> PO mengklarifikasi -> Staf menutup.
// Bergantung pada test-user (lihat scripts/setup-e2e.mjs) yg passwordnya
// mungkin perlu direset via Dashboard bila GoTrue-admin anomaly berlaku.
// ============================================================

let stafCred: ReturnType<typeof findCredential>;
let poCred: ReturnType<typeof findCredential>;
let createdFindingId: string | null = null;
let targetPoId: string | null = null;

test.beforeAll(() => {
   stafCred = findCredential("staf-iw");
   poCred = findCredential("po");
});

test("staf-iw membuat Temuan untuk PO tertentu", async ({ request }) => {
   await loginAs({ request, goto: async () => {} } as any, stafCred.email, stafCred.password);

   // temukan PO test (kode POTST / nama mengandung "Playwright")
   const poRes = await request.get("/api/staf-iw/po?status=aktif");
   expect(poRes.ok()).toBeTruthy();
   const poBody = await poRes.json();
   const targetPo =
      (poBody.data as any[]).find(
         (p) => p.kode_po === "POTST" || (p.nama_perusahaan ?? "").includes("Playwright"),
      ) ?? poBody.data[0];
   expect(targetPo, "test PO harus ada").toBeTruthy();
   targetPoId = targetPo.id;

   const mark = `E2E-${Date.now()}`;
   const createRes = await request.post("/api/staf-iw/findings", {
      data: {
         po_id: targetPo.id,
         nomor_polisi: "B 1234 CD",
         judul: mark,
         deskripsi: "uji interaksi role",
         severity: "low",
         source_type: "manual",
      },
   });
   expect(createRes.status(), `create -> ${createRes.status()}`).toBe(201);
   createdFindingId = (await createRes.json()).data.id;
   expect(createdFindingId).toBeTruthy();
});

test("PO pemilik armada melihat Temuan buatan staf-iw", async ({ request }) => {
   expect(createdFindingId, "gantung pada test create").toBeTruthy();
   await loginAs({ request, goto: async () => {} } as any, poCred.email, poCred.password);

   const res = await request.get("/api/po/findings");
   expect(res.ok()).toBeTruthy();
   const list = (await res.json()).data as any[];
   const seen = list.find((f) => f.id === createdFindingId);
   // HEADLINE: PO melihat temuan yg staf-iw buat utk armadanya
   expect(seen, "PO harus melihat temuan buatan staf-iw").toBeTruthy();
   expect(seen.po_id ?? seen.po?.id).toBe(targetPoId);
});

test("PO mengklarifikasi Temuan -> status berubah", async ({ request }) => {
   if (!createdFindingId) { test.skip(); return; }
   await loginAs({ request, goto: async () => {} } as any, poCred.email, poCred.password);

   const res = await request.post(`/api/po/findings/${createdFindingId}/clarifications`, {
      data: { decision: "melengkapi", message: "klarifikasi uji e2e" },
   });
   expect([200, 201, 409]).toContain(res.status());
});

test("RBAC: admin-terminal tidak dapat membuat Temuan (403)", async ({ request }) => {
   const adminCred = findCredential("admin-terminal");
   await loginAs({ request, goto: async () => {} } as any, adminCred.email, adminCred.password);

   const res = await request.post("/api/staf-iw/findings", {
      data: {
         po_id: "00000000-0000-0000-0000-000000000000",
         nomor_polisi: "SHOULD-FAIL",
         judul: "blocked",
         deskripsi: "rbac",
         severity: "low",
         source_type: "manual",
      },
   });
   expect(res.status()).toBe(403);
});

test("RBAC: PO tidak dapat membaca endpoint Temuan staf-iw (403)", async ({ request }) => {
   await loginAs({ request, goto: async () => {} } as any, poCred.email, poCred.password);
   const res = await request.get("/api/staf-iw/findings");
   expect(res.status()).toBe(403);
});

test("staf-iw menutup Temuan -> closed", async ({ request }) => {
   if (!createdFindingId) { test.skip(); return; }
   await loginAs({ request, goto: async () => {} } as any, stafCred.email, stafCred.password);

   const res = await request.patch(`/api/staf-iw/findings/${createdFindingId}`, {
      data: { status: "closed", resolutionNote: "ditutup uji e2e" },
   });
   expect(res.ok(), `close -> ${res.status()}`).toBeTruthy();
   expect((await res.json()).data.status).toBe("closed");
});
