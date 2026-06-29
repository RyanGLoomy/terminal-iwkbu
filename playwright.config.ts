import { defineConfig } from "@playwright/test";

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const BASE = new URL(BASE_URL);
const CHROME_PATH = process.env.PLAYWRIGHT_CHROME_PATH;
const shouldStartWebServer =
  process.env.PLAYWRIGHT_SKIP_WEBSERVER !== "1" &&
  (BASE.hostname === "127.0.0.1" || BASE.hostname === "localhost");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    ...(CHROME_PATH ? { launchOptions: { executablePath: CHROME_PATH } } : {}),
  },
  webServer: shouldStartWebServer
    ? {
        // Source .env.local agar men-override stale shell env (mis. SUPABASE_URL
        // / SUPABASE_SERVICE_ROLE_KEY dari project lain) — Next.js tidak override
        // process.env yang sudah ada, jadi harus dispesifikkan eksplisit.
        command: `bash -c "set -a; . ./.env.local 2>/dev/null; set +a; exec pnpm exec next start -p ${BASE.port || "3000"} -H ${BASE.hostname}"`,
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      }
    : undefined,
  projects: [
    { name: "auth", testMatch: "auth.spec.ts" },
    { name: "security", testMatch: "security.spec.ts", dependencies: ["auth"] },
    { name: "po", testMatch: "po.spec.ts", dependencies: ["auth"] },
    { name: "loket", testMatch: "loket.spec.ts", dependencies: ["auth"] },
    { name: "admin-terminal", testMatch: "admin-terminal.spec.ts", dependencies: ["auth"] },
    { name: "staf-iw", testMatch: "staf-iw.spec.ts", dependencies: ["auth"] },
    // Sebelumnya orphaned (tak masuk projects) -> tak pernah dijalankan `npx playwright test`.
    { name: "temuan", testMatch: "temuan.spec.ts", dependencies: ["auth"] },
    { name: "audit-laporan", testMatch: "audit-laporan.spec.ts", dependencies: ["auth"] },
    { name: "storage", testMatch: "storage.spec.ts", dependencies: ["auth"] },
  ],
});
