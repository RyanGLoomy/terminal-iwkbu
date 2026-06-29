import { test, expect } from "@playwright/test";
import { findCredential, loginAs, navigateToDashboard } from "./helpers";

let cred: ReturnType<typeof findCredential>;

test.beforeAll(() => {
  cred = findCredential("po");
});

test("PO can login and access dashboard", async ({ page }) => {
  const result = await loginAs(page, cred.email, cred.password);
  expect(result.role).toBe("po");
  expect(result.defaultRoute).toBe("/po");
});

test("PO dashboard shows correct heading and sidebar navigation", async ({ page }) => {
  await loginAs(page, cred.email, cred.password);
  await navigateToDashboard(page, "/po", "po");

  await expect(page.locator("h1")).toContainText("Dashboard PO");
  await expect(page.getByRole("link", { name: /Dashboard/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Temuan & Klarifikasi/i })).toBeVisible();
});

test("PO dashboard shows PO identity", async ({ page }) => {
  await loginAs(page, cred.email, cred.password);
  await navigateToDashboard(page, "/po", "po");

  await expect(page.getByText(/E2EPO/)).toBeVisible();
  await expect(page.getByText(/PT PO Demo Playwright/)).toBeVisible();
});

test("PO can access Temuan & Klarifikasi page", async ({ page }) => {
  await loginAs(page, cred.email, cred.password);
  await page.goto("/po/temuan", { waitUntil: "domcontentloaded" });

  await expect(page.locator("h1")).toContainText("Temuan & Klarifikasi");
});

test("PO Tambah Armada button is visible", async ({ page }) => {
  await loginAs(page, cred.email, cred.password);
  await navigateToDashboard(page, "/po", "po");

  await expect(page.getByRole("button", { name: /Tambah Armada/i })).toBeVisible();
});

test("PO sidebar shows role badge", async ({ page }) => {
  await loginAs(page, cred.email, cred.password);
  await navigateToDashboard(page, "/po", "po");

  await expect(page.getByText(/PO Demo Playwright/).first()).toBeVisible();
});

test("PO can list own armada via API", async ({ request }) => {
  await loginAs(
    { request, goto: async () => {} } as any,
    cred.email,
    cred.password,
  );
  const res = await request.get("/api/po/armada");
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(Array.isArray(body.data)).toBe(true);
  expect(body.data.length).toBeGreaterThan(0);
});

test("PO armada contains expected fields", async ({ request }) => {
  await loginAs(
    { request, goto: async () => {} } as any,
    cred.email,
    cred.password,
  );
  const res = await request.get("/api/po/armada");
  const body = await res.json();
  const armada = body.data[0];
  expect(armada).toHaveProperty("nomor_polisi");
  expect(armada).toHaveProperty("status_operasional");
  expect(armada).toHaveProperty("status_verifikasi");
});

test("PO can access rekonsiliasi page", async ({ page }) => {
  await loginAs(page, cred.email, cred.password);
  await page.goto("/po/rekonsiliasi", { waitUntil: "domcontentloaded" });
  expect(page.url()).toContain("/po/rekonsiliasi");
});

test("PO cannot access staf-iw routes via API", async ({ request }) => {
  await loginAs(
    { request, goto: async () => {} } as any,
    cred.email,
    cred.password,
  );
  const res = await request.get("/api/staf-iw/users");
  expect(res.status()).toBe(403);
});

test("PO cannot access admin-terminal routes via API", async ({ request }) => {
  await loginAs(
    { request, goto: async () => {} } as any,
    cred.email,
    cred.password,
  );
  const res = await request.get("/api/admin/terminals");
  expect(res.status()).toBe(403);
});

test("PO cannot access loket transaksi routes via API", async ({ request }) => {
  await loginAs(
    { request, goto: async () => {} } as any,
    cred.email,
    cred.password,
  );
  const res = await request.post("/api/transaksi/masuk", {
    data: { sesi_id: "test", po_id: "test", nomor_polisi: "B 1234 CD" },
  });
  expect(res.status()).toBe(403);
});
