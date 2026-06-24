import { Page, expect } from "@playwright/test";
import * as fs from "fs";

const CREDENTIALS_PATH = "/tmp/opencode/iwkbu-test-credentials.json";

export interface Credential {
  email: string;
  password: string;
  role: string;
  fullName: string;
  pin?: string;
}

export function loadCredentials(): Credential[] {
  return JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf-8"));
}

export function findCredential(role: string): Credential {
  const creds = loadCredentials();
  const found = creds.find((c) => c.role === role);
  if (!found) throw new Error(`No credential for role: ${role}`);
  return found;
}

export async function loginAs(page: Page, email: string, password: string) {
  const loginRes = await page.request.post("/api/auth/login", {
    data: { email, password },
  });
  expect(loginRes.ok()).toBeTruthy();
  const body = await loginRes.json();
  expect(body.ok).toBe(true);
  return body as { ok: boolean; defaultRoute: string; role: string };
}

export async function navigateToDashboard(
  page: Page,
  route: string,
  expectedRole: string,
) {
  await page.goto(route, { waitUntil: "networkidle" });
  await page.waitForLoadState("domcontentloaded");
  expect(page.url()).toContain(route);
}
