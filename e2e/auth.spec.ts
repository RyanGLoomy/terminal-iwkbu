import { test, expect } from "@playwright/test";
import { findCredential } from "./helpers";

const ANON_CASES = [
  { url: "/api/sesi/open", method: "POST", body: {} },
  { url: "/api/sesi/close", method: "POST", body: { sesi_id: "test" } },
  { url: "/api/transaksi/masuk", method: "POST", body: { sesi_id: "test", po_id: "test", nomor_polisi: "B 1234 CD" } },
  { url: "/api/transaksi/keluar", method: "POST", body: { sesi_id: "test", masuk_id: "test" } },
  { url: "/api/admin/petugas", method: "GET" },
  { url: "/api/admin/terminals", method: "GET" },
  { url: "/api/staf-iw/findings", method: "GET" },
  { url: "/api/auth/change-pin", method: "POST", body: { currentPin: "1234", newPin: "5678" } },
  { url: "/api/auth/change-password", method: "POST", body: { currentPassword: "old", newPassword: "newpass123" } },
  { url: "/api/staf-iw/users", method: "GET" },
  { url: "/api/profile", method: "PATCH", body: { full_name: "test" } },
  { url: "/api/po/armada", method: "GET" },
  { url: "/api/findings/evidence?path=test/file.pdf", method: "GET" },
];

for (const { url, method, body } of ANON_CASES) {
  test(`rejects anonymous ${method} ${url}`, async ({ request }) => {
    const res = await request.fetch(url, {
      method,
      headers: body ? { "content-type": "application/json" } : undefined,
      data: body ? JSON.stringify(body) : undefined,
    });
    expect(res.status()).toBe(401);
  });
}

test("login page renders correctly", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator("h2")).toContainText("Masuk ke dashboard");
  await expect(page.getByRole("button", { name: "Masuk" })).toBeVisible();
});

test("login with valid credentials works", async ({ request }) => {
  const cred = findCredential("po");
  const res = await request.post("/api/auth/login", {
    data: { email: cred.email, password: cred.password },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.ok).toBe(true);
  expect(body.role).toBe("po");
});

test("login with wrong password returns error", async ({ request }) => {
  const res = await request.post("/api/auth/login", {
    data: { email: "nonexistent@example.com", password: "wrongpass" },
  });
  expect(res.status()).toBe(401);
});

test("login error does not leak Supabase internals", async ({ request }) => {
  const res = await request.post("/api/auth/login", {
    data: { email: "test@example.com", password: "wrong" },
  });
  const body = await res.json();
  expect(body.message).not.toContain("supabase");
  expect(body.message).not.toContain("SUPABASE");
  expect(body.message).not.toContain("postgresql");
});

test("security headers are present on responses", async ({ request }) => {
  const res = await request.get("/login");
  expect(res.headers()["x-frame-options"]).toBe("DENY");
  expect(res.headers()["x-content-type-options"]).toBe("nosniff");
  expect(res.headers()["strict-transport-security"]).toBeDefined();
  expect(res.headers()["content-security-policy"]).toBeDefined();
  expect(res.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
});

test("login with empty email is rejected", async ({ request }) => {
  const res = await request.post("/api/auth/login", {
    data: { email: "", password: "test123" },
  });
  expect(res.status()).toBe(400);
});

test("login with missing password field is rejected", async ({ request }) => {
  const res = await request.post("/api/auth/login", {
    data: { email: "test@example.com" },
  });
  expect(res.status()).toBe(400);
});

test("forgot-password returns generic message (no user enumeration)", async ({ request }) => {
  const res = await request.post("/api/auth/forgot-password", {
    data: { email: "definitely-not-exist@example.com" },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.message).toContain("Jika email terdaftar");
});

test("forgot-password rejects empty email", async ({ request }) => {
  const res = await request.post("/api/auth/forgot-password", {
    data: { email: "" },
  });
  expect(res.status()).toBe(400);
});
