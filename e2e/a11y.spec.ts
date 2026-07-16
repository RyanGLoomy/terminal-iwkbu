import { test, expect } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";

/**
 * Accessibility (a11y) tests using axe-core.
 * Scans each major page for WCAG 2.1 AA violations.
 */

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:3000";

test.describe("Accessibility Audit", () => {
   test("login page — no critical violations", async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.waitForLoadState("domcontentloaded");

      const results = await new AxeBuilder({ page })
         .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
         .analyze();

      const criticalViolations = results.violations.filter(
         (v) => v.impact === "critical" || v.impact === "serious",
      );

      expect(criticalViolations).toEqual([]);
   });

   test("register PO page — no critical violations", async ({ page }) => {
      await page.goto(`${BASE_URL}/registrasi-po`);
      await page.waitForLoadState("domcontentloaded");

      const results = await new AxeBuilder({ page })
         .withTags(["wcag2a", "wcag2aa"])
         .analyze();

      const criticalViolations = results.violations.filter(
         (v) => v.impact === "critical" || v.impact === "serious",
      );

      expect(criticalViolations).toEqual([]);
   });

   test("forgot password page — no critical violations", async ({ page }) => {
      await page.goto(`${BASE_URL}/lupa-password`);
      await page.waitForLoadState("domcontentloaded");

      const results = await new AxeBuilder({ page })
         .withTags(["wcag2a", "wcag2aa"])
         .analyze();

      const criticalViolations = results.violations.filter(
         (v) => v.impact === "critical" || v.impact === "serious",
      );

      expect(criticalViolations).toEqual([]);
   });

   test("dashboard pages have skip link", async ({ page }) => {
      // Login first
      await page.goto(`${BASE_URL}/login`);
      await page.fill("#email", "e2e.po.iwkbu@example.com");
      await page.fill("#password", "Tmp-IWKBU-PO-2026");
      await page.click('button[type="submit"]');
      await page.waitForURL("**/po");

      // Check skip link exists and is focusable
      const skipLink = page.locator('a[href="#main-content"]');
      await expect(skipLink).toHaveCount(1);

      // Focus the skip link and verify it becomes visible
      await skipLink.focus();
      await expect(skipLink).toBeVisible();
   });

   test("all buttons have accessible names", async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.fill("#email", "e2e.po.iwkbu@example.com");
      await page.fill("#password", "Tmp-IWKBU-PO-2026");
      await page.click('button[type="submit"]');
      await page.waitForURL("**/po");

      const buttons = await page.locator("button").all();
      for (const button of buttons) {
         const ariaLabel = await button.getAttribute("aria-label");
         const text = (await button.textContent())?.trim();
         const title = await button.getAttribute("title");

         // Every button should have at least one of: text, aria-label, or title
         const hasAccessibleName = !!(text || ariaLabel || title);
         expect(hasAccessibleName, `Button missing accessible name: ${await button.innerHTML()}`).toBe(true);
      }
   });

   test("all images have alt text or aria-hidden", async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.fill("#email", "e2e.po.iwkbu@example.com");
      await page.fill("#password", "Tmp-IWKBU-PO-2026");
      await page.click('button[type="submit"]');
      await page.waitForURL("**/po");

      const images = await page.locator("img").all();
      for (const img of images) {
         const alt = await img.getAttribute("alt");
         const ariaHidden = await img.getAttribute("aria-hidden");
         const hasAccessibleName = alt !== null || ariaHidden === "true";
         expect(hasAccessibleName, "Image missing alt text").toBe(true);
      }
   });

   test("form inputs have associated labels", async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);

      const inputs = await page.locator("input:not([type='hidden'])").all();
      for (const input of inputs) {
         const id = await input.getAttribute("id");
         const ariaLabel = await input.getAttribute("aria-label");
         const ariaLabelledBy = await input.getAttribute("aria-labelledby");

         if (id) {
            const label = page.locator(`label[for="${id}"]`);
            const hasLabel = await label.count();
            if (hasLabel === 0 && !ariaLabel && !ariaLabelledBy) {
               // Input has id but no label — fail
               expect(true, `Input #${id} has no associated label`).toBe(false);
            }
         } else if (!ariaLabel && !ariaLabelledBy) {
            // Input has no id and no aria-label — fail
            expect(true, "Input has no label association").toBe(false);
         }
      }
   });
});
