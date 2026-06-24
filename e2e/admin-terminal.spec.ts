import { test, expect } from "@playwright/test";
import { findCredential, loginAs, navigateToDashboard } from "./helpers";

let cred: ReturnType<typeof findCredential>;

test.beforeAll(() => {
  cred = findCredential("admin-terminal");
});

test("Admin Terminal can login", async ({ request }) => {
  const res = await request.post("/api/auth/login", {
    data: { email: cred.email, password: cred.password },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.role).toBe("admin-terminal");
});

test("Admin Terminal dashboard renders correctly", async ({ page }) => {
  await loginAs(page, cred.email, cred.password);
  await navigateToDashboard(page, "/admin-terminal", "admin-terminal");

  await expect(page.locator("h1")).toContainText("Dashboard Admin Terminal");
});

test("Admin Terminal sidebar shows all menu items", async ({ page }) => {
  await loginAs(page, cred.email, cred.password);
  await navigateToDashboard(page, "/admin-terminal", "admin-terminal");

  await expect(page.getByRole("link", { name: /Dashboard/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Manajemen Akun/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Rekap Data/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Rekap Sesi/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Laporan/i })).toBeVisible();
});

test("Admin Terminal can access Manajemen Akun", async ({ page }) => {
  await loginAs(page, cred.email, cred.password);
  await page.goto("/admin-terminal/petugas", { waitUntil: "networkidle" });
  expect(page.url()).toContain("/admin-terminal/petugas");
});

test("Admin Terminal can access Rekap Data", async ({ page }) => {
  await loginAs(page, cred.email, cred.password);
  await page.goto("/admin-terminal/rekap", { waitUntil: "networkidle" });
  expect(page.url()).toContain("/admin-terminal/rekap");
});

test("Admin Terminal can access Rekap Sesi", async ({ page }) => {
  await loginAs(page, cred.email, cred.password);
  await page.goto("/admin-terminal/sesi", { waitUntil: "networkidle" });
  expect(page.url()).toContain("/admin-terminal/sesi");
});

test("Admin Terminal can access Laporan", async ({ page }) => {
  await loginAs(page, cred.email, cred.password);
  await page.goto("/admin-terminal/laporan", { waitUntil: "networkidle" });
  expect(page.url()).toContain("/admin-terminal/laporan");
});

test("Admin Terminal dashboard has date range pickers", async ({ page }) => {
  await loginAs(page, cred.email, cred.password);
  await navigateToDashboard(page, "/admin-terminal", "admin-terminal");

  const dateInputs = page.locator('input[type="date"]');
  await expect(dateInputs.first()).toBeVisible();
});

test("Admin Terminal can access Master Data page", async ({ page }) => {
  await loginAs(page, cred.email, cred.password);
  await page.goto("/admin-terminal/master-data", { waitUntil: "networkidle" });
  expect(page.url()).toContain("/admin-terminal/master-data");
});

test("Admin Terminal can list terminals via API", async ({ request }) => {
  await loginAs(
    { request, goto: async () => {} } as any,
    cred.email,
    cred.password,
  );
  const res = await request.get("/api/admin/terminals");
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(Array.isArray(body.data)).toBe(true);
});

test("Admin Terminal can list petugas via API", async ({ request }) => {
  await loginAs(
    { request, goto: async () => {} } as any,
    cred.email,
    cred.password,
  );
  const res = await request.get("/api/admin/petugas");
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body).toHaveProperty("data");
});

test("Admin Terminal cannot access staf-iw user management", async ({ request }) => {
  await loginAs(
    { request, goto: async () => {} } as any,
    cred.email,
    cred.password,
  );
  const res = await request.get("/api/staf-iw/users");
  expect(res.status()).toBe(403);
});

test("Admin Terminal cannot access PO armada routes", async ({ request }) => {
  await loginAs(
    { request, goto: async () => {} } as any,
    cred.email,
    cred.password,
  );
  const res = await request.get("/api/po/armada");
  expect(res.status()).toBe(403);
});
