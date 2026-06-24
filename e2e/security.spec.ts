import { test, expect } from "@playwright/test";
import { findCredential, loginAs } from "./helpers";

test.describe("Security: Cross-Role Access Control", () => {
  const poCred = findCredential("po");
  const stafCred = findCredential("staf-iw");
  const loketCred = findCredential("loket");
  const adminCred = findCredential("admin-terminal");

  test("PO cannot access staf-iw findings API", async ({ request }) => {
    await loginAs({ request, goto: async () => {} } as any, poCred.email, poCred.password);
    const res = await request.get("/api/staf-iw/findings");
    expect(res.status()).toBe(403);
  });

  test("PO cannot access admin terminals API", async ({ request }) => {
    await loginAs({ request, goto: async () => {} } as any, poCred.email, poCred.password);
    const res = await request.get("/api/admin/terminals");
    expect(res.status()).toBe(403);
  });

  test("PO cannot access staf-iw periode-rekonsiliasi", async ({ request }) => {
    await loginAs({ request, goto: async () => {} } as any, poCred.email, poCred.password);
    const res = await request.get("/api/staf-iw/periode-rekonsiliasi");
    expect(res.status()).toBe(403);
  });

  test("PO cannot access staf-iw user list", async ({ request }) => {
    await loginAs({ request, goto: async () => {} } as any, poCred.email, poCred.password);
    const res = await request.get("/api/staf-iw/users");
    expect(res.status()).toBe(403);
  });

  test("Staf-IW cannot access PO armada", async ({ request }) => {
    await loginAs({ request, goto: async () => {} } as any, stafCred.email, stafCred.password);
    const res = await request.get("/api/po/armada");
    expect(res.status()).toBe(403);
  });

  test("Staf-IW can access admin petugas with scoped terminal_id", async ({ request }) => {
    await loginAs({ request, goto: async () => {} } as any, stafCred.email, stafCred.password);
    const terminalsRes = await request.get("/api/admin/terminals");
    expect(terminalsRes.ok()).toBeTruthy();

    const terminalsBody = await terminalsRes.json();
    const terminalId = terminalsBody.data?.[0]?.id;
    expect(terminalId).toBeTruthy();

    const res = await request.get(`/api/admin/petugas?terminal_id=${terminalId}`);
    expect(res.ok()).toBeTruthy();
  });

  test("Staf-IW cannot create transaksi masuk", async ({ request }) => {
    await loginAs({ request, goto: async () => {} } as any, stafCred.email, stafCred.password);
    const res = await request.post("/api/transaksi/masuk", {
      data: { sesi_id: "x", po_id: "x", nomor_polisi: "B 1 CD" },
    });
    expect(res.status()).toBe(403);
  });

  test("Loket cannot access staf-iw findings", async ({ request }) => {
    await loginAs({ request, goto: async () => {} } as any, loketCred.email, loketCred.password);
    const res = await request.get("/api/staf-iw/findings");
    expect(res.status()).toBe(403);
  });

  test("Loket cannot access PO armada", async ({ request }) => {
    await loginAs({ request, goto: async () => {} } as any, loketCred.email, loketCred.password);
    const res = await request.get("/api/po/armada");
    expect(res.status()).toBe(403);
  });

  test("Admin-Terminal cannot access staf-iw users", async ({ request }) => {
    await loginAs({ request, goto: async () => {} } as any, adminCred.email, adminCred.password);
    const res = await request.get("/api/staf-iw/users");
    expect(res.status()).toBe(403);
  });

  test("Admin-Terminal cannot access PO armada", async ({ request }) => {
    await loginAs({ request, goto: async () => {} } as any, adminCred.email, adminCred.password);
    const res = await request.get("/api/po/armada");
    expect(res.status()).toBe(403);
  });
});

test.describe("Security: Auth Callback Open Redirect Fix", () => {
  test("redirects to external URL are blocked", async ({ request }) => {
    const res = await request.get("/api/auth/callback?redirect=https://evil.com", {
      maxRedirects: 0,
    });
    const location = res.headers()["location"] ?? "";
    expect(location).not.toContain("evil.com");
  });

  test("redirect with protocol-relative URL is blocked", async ({ request }) => {
    const res = await request.get("/api/auth/callback?redirect=//evil.com", {
      maxRedirects: 0,
    });
    const location = res.headers()["location"] ?? "";
    expect(location).not.toContain("evil.com");
  });

  test("redirect with encoded backslash URL is blocked", async ({ request }) => {
    const res = await request.get("/api/auth/callback?redirect=/%5Cevil.com", {
      maxRedirects: 0,
    });
    const location = res.headers()["location"] ?? "";
    expect(location).not.toContain("evil.com");
  });

  test("internal redirect path is allowed", async ({ request }) => {
    const res = await request.get("/api/auth/callback?redirect=/login", {
      maxRedirects: 0,
    });
    const location = res.headers()["location"] ?? "";
    expect(location).toContain("/login");
  });
});

test.describe("Security: Evidence IDOR Protection", () => {
  test("evidence endpoint rejects anonymous access", async ({ request }) => {
    const res = await request.get("/api/findings/evidence?path=test/file.pdf");
    expect(res.status()).toBe(401);
  });

  test("evidence endpoint rejects missing path param", async ({ request }) => {
    const cred = findCredential("staf-iw");
    await loginAs({ request, goto: async () => {} } as any, cred.email, cred.password);
    const res = await request.get("/api/findings/evidence");
    expect(res.status()).toBe(400);
  });

  test("evidence endpoint rejects path traversal", async ({ request }) => {
    const cred = findCredential("staf-iw");
    await loginAs({ request, goto: async () => {} } as any, cred.email, cred.password);
    const res = await request.get("/api/findings/evidence?path=../../../etc/passwd");
    expect(res.status()).toBe(400);
  });
});

test.describe("Security: Cron Endpoint Protection", () => {
  test("cron iwkbu-sync rejects requests without secret", async ({ request }) => {
    const res = await request.post("/api/cron/iwkbu-sync");
    expect(res.status()).toBe(401);
  });

  test("cron iwkbu-fetch rejects requests with wrong secret", async ({ request }) => {
    const res = await request.post("/api/cron/iwkbu-fetch", {
      headers: { authorization: "Bearer wrong-secret" },
    });
    expect(res.status()).toBe(401);
  });
});
