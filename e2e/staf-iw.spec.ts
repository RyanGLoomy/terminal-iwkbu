import { test, expect } from "@playwright/test";
import { findCredential, loginAs, navigateToDashboard } from "./helpers";

let cred: ReturnType<typeof findCredential>;

test.beforeAll(() => {
  cred = findCredential("staf-iw");
});

test("Staf IW can login", async ({ request }) => {
  const res = await request.post("/api/auth/login", {
    data: { email: cred.email, password: cred.password },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.role).toBe("staf-iw");
});

test("Staf IW dashboard renders correctly", async ({ page }) => {
  await loginAs(page, cred.email, cred.password);
  await navigateToDashboard(page, "/staf-iw", "staf-iw");

  await expect(page.locator("h1")).toContainText("Pengawasan Integrasi Data");
});

test("Staf IW dashboard shows PO and Armada summary cards", async ({ page }) => {
  await loginAs(page, cred.email, cred.password);
  await navigateToDashboard(page, "/staf-iw", "staf-iw");

  await expect(page.getByText(/PO Menunggu/).first()).toBeVisible();
  await expect(page.getByText(/PO Aktif/).first()).toBeVisible();
  await expect(page.getByText(/Armada Menunggu/).first()).toBeVisible();
  await expect(page.getByText(/Armada Terverifikasi/).first()).toBeVisible();
});

test("Staf IW sidebar shows all menu items", async ({ page }) => {
  await loginAs(page, cred.email, cred.password);
  await navigateToDashboard(page, "/staf-iw", "staf-iw");

  await expect(page.getByRole("link", { name: /Dashboard/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Temuan/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Rekonsiliasi/i }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Audit Trail/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Sinkronisasi IWKBU/i })).toBeVisible();
});

test("Staf IW can access Rekonsiliasi page", async ({ page }) => {
  await loginAs(page, cred.email, cred.password);
  await page.goto("/staf-iw/rekonsiliasi", { waitUntil: "domcontentloaded" });
  expect(page.url()).toContain("/staf-iw/rekonsiliasi");
});

test("Staf IW can access Audit Trail page", async ({ page }) => {
  await loginAs(page, cred.email, cred.password);
  await page.goto("/staf-iw/audit-trail", { waitUntil: "domcontentloaded" });
  expect(page.url()).toContain("/staf-iw/audit-trail");
});

test("Staf IW dashboard has action buttons", async ({ page }) => {
  await loginAs(page, cred.email, cred.password);
  await navigateToDashboard(page, "/staf-iw", "staf-iw");

  await expect(page.getByRole("link", { name: /Buka Rekonsiliasi/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Lihat Audit Trail/i })).toBeVisible();
});

test("Staf IW can list users via API", async ({ request }) => {
  await loginAs(
    { request, goto: async () => {} } as any,
    cred.email,
    cred.password,
  );
  const res = await request.get("/api/staf-iw/users");
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(Array.isArray(body.data)).toBe(true);
});

test("Staf IW can list findings via API", async ({ request }) => {
  await loginAs(
    { request, goto: async () => {} } as any,
    cred.email,
    cred.password,
  );
  const res = await request.get("/api/staf-iw/findings");
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body).toHaveProperty("data");
});

test("Staf IW can list periode rekonsiliasi via API", async ({ request }) => {
  await loginAs(
    { request, goto: async () => {} } as any,
    cred.email,
    cred.password,
  );
  const res = await request.get("/api/staf-iw/periode-rekonsiliasi");
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(Array.isArray(body.data)).toBe(true);
});

test("Staf IW can access IWKBU sync page", async ({ page }) => {
  await loginAs(page, cred.email, cred.password);
  await page.goto("/staf-iw/iwkbu-sync", { waitUntil: "domcontentloaded" });
  expect(page.url()).toContain("/staf-iw/iwkbu-sync");
});

test("Staf IW can access Akun page", async ({ page }) => {
  await loginAs(page, cred.email, cred.password);
  await page.goto("/staf-iw/akun", { waitUntil: "domcontentloaded" });
  expect(page.url()).toContain("/staf-iw/akun");
});

test("Staf IW cannot access PO routes via API", async ({ request }) => {
  await loginAs(
    { request, goto: async () => {} } as any,
    cred.email,
    cred.password,
  );
  const res = await request.get("/api/po/armada");
  expect(res.status()).toBe(403);
});

test("Staf IW cannot access loket transaksi routes via API", async ({ request }) => {
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
