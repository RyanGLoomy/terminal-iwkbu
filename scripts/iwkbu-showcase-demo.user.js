// ==UserScript==
// @name         IWKBU Terminal — Showcase Demo Automation
// @namespace    https://terminal-iwkbu.vercel.app
// @version      1.0
// @description  Automated showcase for presentation: PO → Loket → Admin → Staf IW. Press Shift+D to start, Shift+X to stop.
// @author       IWKBU Dev Team
// @match        https://terminal-iwkbu.vercel.app/*
// @match        https://terminal-iwkbu-*.vercel.app/*
// @match        http://localhost:3000/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
   "use strict";

   // ════════════════════════════════════════════════════════════
   // CONFIG
   // ════════════════════════════════════════════════════════════

   const DELAY_PAGE = 3000; // ms per halaman
   const DELAY_ACTION = 1500; // ms setelah aksi (klik, input)
   const DELAY_LOGIN = 4000; // ms setelah submit login (tunggu redirect)

   const ACCOUNTS = {
      po: { email: "po.demo@iwkbu-banten.id", password: "Banten2026!" },
      loket: { email: "loket.demo@iwkbu-banten.id", password: "Banten2026!", pin: "123456" },
      admin: { email: "admin.demo@iwkbu-banten.id", password: "Banten2026!" },
      stafiw: { email: "stafiw.demo@iwkbu-banten.id", password: "Banten2026!" },
   };

   // ════════════════════════════════════════════════════════════
   // HELPERS
   // ════════════════════════════════════════════════════════════

   const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

   function log(msg) {
      console.log(`%c[IWKBU Demo]%c ${msg}`, "color:#0050b3;font-weight:bold", "color:inherit");
      showBanner(msg);
   }

   function showBanner(msg) {
      let banner = document.getElementById("demo-banner");
      if (!banner) {
         banner = document.createElement("div");
         banner.id = "demo-banner";
         banner.style.cssText =
            "position:fixed;bottom:16px;left:50%;transform:translateX(-50%);" +
            "background:#0050b3;color:white;padding:8px 20px;border-radius:8px;" +
            "font-size:13px;font-family:sans-serif;z-index:99999;box-shadow:0 4px 12px rgba(0,0,0,0.3);" +
            "transition:opacity 0.3s;pointer-events:none;";
         document.body.appendChild(banner);
      }
      banner.textContent = msg;
      banner.style.opacity = "1";
   }

   function setNativeValue(el, value) {
      const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
      setter.call(el, value);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
   }

   async function waitForElement(selector, timeout = 10000) {
      const start = Date.now();
      while (Date.now() - start < timeout) {
         const el = document.querySelector(selector);
         if (el) return el;
         await sleep(200);
      }
      return null;
   }

   async function waitForElementFn(fn, timeout = 10000) {
      const start = Date.now();
      while (Date.now() - start < timeout) {
         const result = fn();
         if (result) return result;
         await sleep(200);
      }
      return null;
   }

   function clickByText(tag, text) {
      const elements = document.querySelectorAll(tag);
      for (const el of elements) {
         if (el.textContent.trim().includes(text)) {
            el.click();
            return el;
         }
      }
      return null;
   }

   async function pickSelectValue(triggerSelector, value, timeout = 8000) {
      const trigger = typeof triggerSelector === "string" ? document.querySelector(triggerSelector) : triggerSelector;
      if (!trigger) return false;
      trigger.click();
      await sleep(300);

      const opt = await waitForElementFn(
         () => document.querySelector(`[role="option"][data-value="${value}"]`),
         timeout,
      );
      if (opt) {
         opt.click();
         await sleep(200);
         return true;
      }
      // Fallback: try matching by text content
      const opts = document.querySelectorAll('[role="option"]');
      for (const o of opts) {
         if (o.textContent.trim().includes(value)) {
            o.click();
            await sleep(200);
            return true;
         }
      }
      return false;
   }

   // Navigate and set next step
   function goNext(stepId, url) {
      sessionStorage.setItem("demo_step", stepId);
      sessionStorage.setItem("demo_running", "1");
      if (url) {
         window.location.href = url;
      }
   }

   function isRunning() {
      return sessionStorage.getItem("demo_running") === "1";
   }

   function stopDemo() {
      sessionStorage.removeItem("demo_step");
      sessionStorage.removeItem("demo_running");
      sessionStorage.removeItem("demo_skip");
      log("Demo dihentikan");
   }

   function skipStep() {
      sessionStorage.setItem("demo_skip", "1");
   }

   // ════════════════════════════════════════════════════════════
   // LOGIN ACTION
   // ════════════════════════════════════════════════════════════

   async function doLogin(account, nextStep, nextUrl) {
      log(`Login sebagai ${account.email}...`);

      const emailInput = await waitForElement('input[type="email"], input#email, input[name="email"]');
      const passInput = await waitForElement('input[type="password"], input#password, input[name="password"]');

      if (!emailInput || !passInput) {
         log("Form login tidak ditemukan!");
         return;
      }

      setNativeValue(emailInput, account.email);
      await sleep(300);
      setNativeValue(passInput, account.password);
      await sleep(500);

      // Click submit
      const btn = clickByText("button", "Masuk");
      if (!btn) {
         const submitBtn = document.querySelector('button[type="submit"]');
         if (submitBtn) submitBtn.click();
      }

      // Set next step — will execute after page redirects
      goNext(nextStep, null);
      // Wait for redirect to happen
      await sleep(DELAY_LOGIN + 2000);
   }

   // ════════════════════════════════════════════════════════════
   // LOGOUT ACTION
   // ════════════════════════════════════════════════════════════

   async function doLogout(nextStep) {
      log("Logout...");
      try {
         await fetch("/api/auth/logout", { method: "POST" });
      } catch (e) {
         // ignore
      }
      goNext(nextStep, "/login");
   }

   // ════════════════════════════════════════════════════════════
   // SHOWCASE (just wait on page)
   // ════════════════════════════════════════════════════════════

   async function showcase(label, nextStep, nextUrl, scroll = false) {
      log(label);
      await sleep(DELAY_PAGE);
      if (scroll) {
         window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
         await sleep(1000);
         window.scrollTo({ top: 0, behavior: "smooth" });
         await sleep(500);
      }
      goNext(nextStep, nextUrl);
   }

   // ════════════════════════════════════════════════════════════
   // LOKET PIN
   // ════════════════════════════════════════════════════════════

   async function doPin(nextStep) {
      log("Memasukkan PIN...");
      const pinInput = await waitForElement('input[type="password"], input#pin, input[inputmode="numeric"]');
      if (!pinInput) {
         log("Input PIN tidak ditemukan!");
         goNext(nextStep, "/loket");
         return;
      }
      setNativeValue(pinInput, ACCOUNTS.loket.pin);
      await sleep(500);
      clickByText("button", "Verifikasi PIN");
      await sleep(2000);
      // After PIN, we should be on /loket
   }

   // ════════════════════════════════════════════════════════════
   // LOKET PENCATATAN (buka sesi + catat kendaraan)
   // ════════════════════════════════════════════════════════════

   async function doPencatatan(nextStep) {
      log("Demo pencatatan kendaraan...");

      // Step 1: Buka Sesi
      await sleep(DELAY_ACTION);
      const bukaBtn = clickByText("button", "Buka Sesi");
      if (bukaBtn) {
         log("Membuka sesi petugas...");
         await sleep(2000);
      }

      // Step 2: Input nomor polisi
      const nopolInput = await waitForElement('input#nomor-polisi-masuk, input[placeholder*="B 1234"], input[placeholder*="nomor"]');
      if (nopolInput) {
         const testPlate = "B9999TST";
         setNativeValue(nopolInput, testPlate);
         log(`Input nopol: ${testPlate}`);
         await sleep(500);

         // Step 3: Select PO (custom select)
         const poTrigger = document.querySelector('[data-slot="select-trigger"], button#po-select');
         if (poTrigger) {
            log("Memilih PO...");
            poTrigger.click();
            await sleep(500);
            // Pick first option
            const firstOpt = document.querySelector('[role="option"]');
            if (firstOpt) {
               firstOpt.click();
               await sleep(500);
            }
         }

         // Step 4: Submit
         const submitBtn = clickByText("button", "Simpan");
         if (submitBtn) {
            log("Menyimpan kendaraan masuk...");
            await sleep(2000);
         }
      }

      await sleep(DELAY_PAGE);
      goNext(nextStep, null);
   }

   // ════════════════════════════════════════════════════════════
   // STAF IW — BUAT TEMUAN
   // ════════════════════════════════════════════════════════════

   async function doBuatTemuan(nextStep) {
      log("Membuka form Buat Temuan...");

      await sleep(DELAY_ACTION);

      // Click "Buat Temuan" button
      const createBtn = clickByText("button", "Buat Temuan");
      if (!createBtn) {
         log("Tombol Buat Temuan tidak ditemukan, lanjut...");
         goNext(nextStep, null);
         return;
      }
      await sleep(1000);

      // Wait for dialog
      const dialog = await waitForElement("dialog[open]", 5000);
      if (!dialog) {
         log("Dialog tidak muncul, lanjut...");
         goNext(nextStep, null);
         return;
      }

      log("Mengisi form temuan...");

      // Select PO (first option)
      const poTrigger = dialog.querySelector('[data-slot="select-trigger"]');
      if (poTrigger) {
         poTrigger.click();
         await sleep(400);
         const firstOpt = document.querySelector('[role="option"]');
         if (firstOpt) {
            firstOpt.click();
            await sleep(300);
         }
      }

      // Input nomor polisi
      const nopolInput = dialog.querySelector('input[placeholder*="B1234"], input[placeholder*="nomor"], input[placeholder*="polisi"]');
      if (nopolInput) {
         setNativeValue(nopolInput, "B9999TST");
         await sleep(300);
      }

      // Input judul
      const judulInput = dialog.querySelector('input[placeholder*="Judul"], input[placeholder*="judul"]');
      if (judulInput) {
         setNativeValue(judulInput, "Temuan Demo Presentasi");
         await sleep(300);
      }

      // Input deskripsi
      const deskripsiInput = dialog.querySelector("textarea");
      if (deskripsiInput) {
         setNativeValue(deskripsiInput, "Temuan ini dibuat otomatis untuk demo presentasi sistem IWKBU Terminal Jasa Raharja Banten.");
         await sleep(300);
      }

      // Select severity (medium)
      const severityTriggers = dialog.querySelectorAll('[data-slot="select-trigger"]');
      if (severityTriggers.length > 1) {
         severityTriggers[severityTriggers.length - 1].click();
         await sleep(400);
         // Find "medium" / "Sedang" option
         const opts = document.querySelectorAll('[role="option"]');
         for (const opt of opts) {
            if (opt.textContent.includes("Sedang") || opt.textContent.includes("medium")) {
               opt.click();
               break;
            }
         }
         await sleep(300);
      }

      log("Submit temuan...");
      // Click submit button inside dialog
      const submitBtns = dialog.querySelectorAll("button");
      for (const btn of submitBtns) {
         if (btn.textContent.includes("Buat Temuan") && btn.type !== "button") {
            btn.click();
            break;
         }
      }
      // Fallback: any submit button in dialog
      const submitBtn = dialog.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.click();

      await sleep(3000);
      goNext(nextStep, null);
   }

   // ════════════════════════════════════════════════════════════
   // TEMUAN DETAIL (click first finding)
   // ════════════════════════════════════════════════════════════

   async function doClickFirstFinding(nextStep, basePath) {
      log("Membuka detail temuan pertama...");
      await sleep(DELAY_ACTION);

      // Find first finding link
      const findingLink = document.querySelector('[data-highlight-id] a, a[href*="' + basePath + '/temuan/"]');
      if (findingLink) {
         const href = findingLink.getAttribute("href");
         goNext(nextStep, href);
         return;
      }

      // Fallback: any link with finding UUID pattern
      const allLinks = document.querySelectorAll('a[href*="/temuan/"]');
      for (const link of allLinks) {
         const href = link.getAttribute("href");
         if (href && href.match(/\/temuan\/[0-9a-f-]{36}/)) {
            goNext(nextStep, href);
            return;
         }
      }

      log("Tidak ada temuan ditemukan, lanjut...");
      goNext(nextStep, null);
   }

   // ════════════════════════════════════════════════════════════
   // STEP REGISTRY — Full demo sequence
   // ════════════════════════════════════════════════════════════

   const STEPS = {
      // ─── PHASE 1: PO ───
      po_login: () => doLogin(ACCOUNTS.po, "po_dashboard"),
      po_dashboard: () => showcase("📊 Dashboard PO", "po_armada", null, true),
      po_armada: () => showcase("🚌 Data Armada PO", "po_rekonsiliasi", "/po/rekonsiliasi", true),
      po_rekonsiliasi: () => showcase("🔄 Rekonsiliasi PO", "po_temuan", "/po/temuan"),
      po_temuan: () => doClickFirstFinding("po_temuan_detail", "/po"),
      po_temuan_detail: () => showcase("📝 Detail Temuan PO", "po_logout", null, true),
      po_logout: () => doLogout("loket_login"),

      // ─── PHASE 2: LOKET ───
      loket_login: () => doLogin(ACCOUNTS.loket, "loket_pin"),
      loket_pin: () => doPin("loket_dashboard"),
      loket_dashboard: () => showcase("📊 Dashboard Loket", "loket_pencatatan", "/loket/pencatatan"),
      loket_pencatatan: () => doPencatatan("loket_riwayat"),
      loket_riwayat: () => showcase("📋 Riwayat Pencatatan", "loket_logout", "/loket/riwayat", true),
      loket_logout: () => doLogout("admin_login"),

      // ─── PHASE 3: ADMIN TERMINAL ───
      admin_login: () => doLogin(ACCOUNTS.admin, "admin_dashboard"),
      admin_dashboard: () => showcase("📊 Dashboard Admin Terminal", "admin_rekap", null, true),
      admin_rekap: () => showcase("📈 Rekap Data Terminal", "admin_laporan", "/admin-terminal/laporan", true),
      admin_laporan: () => showcase("📑 Laporan Operasional", "admin_logout", null, true),
      admin_logout: () => doLogout("stafiw_login"),

      // ─── PHASE 4: STAF IW ───
      stafiw_login: () => doLogin(ACCOUNTS.stafiw, "stafiw_dashboard"),
      stafiw_dashboard: () => showcase("📊 Dashboard Staf IW (Analitik)", "stafiw_rekonsiliasi", null, true),
      stafiw_rekonsiliasi: () => showcase("🔄 Rekonsiliasi Data Sumber", "stafiw_sync", "/staf-iw/iwkbu-sync"),
      stafiw_sync: () => showcase("⚡ Sinkronisasi IWKBU", "stafiw_temuan", "/staf-iw/temuan"),
      stafiw_temuan: () => doBuatTemuan("stafiw_temuan_list"),
      stafiw_temuan_list: () => doClickFirstFinding("stafiw_temuan_detail", "/staf-iw"),
      stafiw_temuan_detail: () => showcase("📝 Detail Temuan Staf IW", "stafiw_audit", null, true),
      stafiw_audit: () => showcase("🔍 Audit Trail", "stafiw_logout", "/staf-iw/audit-trail", true),
      stafiw_logout: () => doLogout("done"),

      // ─── DONE ───
      done: () => {
         log("✅ Demo selesai! Semua 4 role telah ditampilkan.");
         stopDemo();
      },
   };

   // ════════════════════════════════════════════════════════════
   // MAIN — runs on every page load
   // ════════════════════════════════════════════════════════════

   async function runStep() {
      const step = sessionStorage.getItem("demo_step");
      if (!step || !isRunning()) return;

      // Check skip
      if (sessionStorage.getItem("demo_skip") === "1") {
         sessionStorage.removeItem("demo_skip");
         // Find next step in sequence
         const order = [
            "po_login", "po_dashboard", "po_armada", "po_rekonsiliasi",
            "po_temuan", "po_temuan_detail", "po_logout",
            "loket_login", "loket_pin", "loket_dashboard", "loket_pencatatan",
            "loket_riwayat", "loket_logout",
            "admin_login", "admin_dashboard", "admin_rekap", "admin_laporan",
            "admin_logout",
            "stafiw_login", "stafiw_dashboard", "stafiw_rekonsiliasi", "stafiw_sync",
            "stafiw_temuan", "stafiw_temuan_list", "stafiw_temuan_detail",
            "stafiw_audit", "stafiw_logout", "done",
         ];
         const idx = order.indexOf(step);
         if (idx >= 0 && idx < order.length - 1) {
            sessionStorage.setItem("demo_step", order[idx + 1]);
            // Re-run with next step
            return runStep();
         }
      }

      const action = STEPS[step];
      if (action) {
         log(`▶ Step: ${step}`);
         try {
            await action();
         } catch (e) {
            log(`Error di step ${step}: ${e.message}. Lanjut ke step berikutnya...`);
            await sleep(2000);
            // Auto-skip on error
            sessionStorage.setItem("demo_skip", "1");
            runStep();
         }
      } else {
         log(`Step tidak dikenal: ${step}. Demo dihentikan.`);
         stopDemo();
      }
   }

   // ════════════════════════════════════════════════════════════
   // HOTKEYS
   // ════════════════════════════════════════════════════════════

   document.addEventListener("keydown", (e) => {
      // Shift+D = Start demo
      if (e.shiftKey && e.key === "D") {
         e.preventDefault();
         if (!isRunning()) {
            log("🚀 Memulai demo presentasi...");
            sessionStorage.setItem("demo_running", "1");
            sessionStorage.setItem("demo_step", "po_login");
            if (window.location.pathname !== "/login") {
               window.location.href = "/login";
            } else {
               runStep();
            }
         } else {
            log("Demo sudah berjalan. Shift+S untuk skip, Shift+X untuk stop.");
         }
      }

      // Shift+S = Skip current step
      if (e.shiftKey && e.key === "S") {
         e.preventDefault();
         if (isRunning()) {
            log("⏭ Skip ke step berikutnya...");
            skipStep();
            // Reload to trigger next step
            window.location.reload();
         }
      }

      // Shift+X = Stop demo
      if (e.shiftKey && e.key === "X") {
         e.preventDefault();
         stopDemo();
         const banner = document.getElementById("demo-banner");
         if (banner) banner.remove();
      }
   });

   // ════════════════════════════════════════════════════════════
   // STATUS INDICATOR
   // ════════════════════════════════════════════════════════════

   function showStatusBadge() {
      if (!isRunning()) return;
      const badge = document.createElement("div");
      badge.style.cssText =
         "position:fixed;top:8px;right:8px;background:#10b981;color:white;" +
         "padding:4px 12px;border-radius:9999px;font-size:11px;font-family:sans-serif;" +
         "z-index:99999;box-shadow:0 2px 8px rgba(0,0,0,0.2);";
      badge.textContent = "● DEMO";
      badge.title = "Shift+D: Start | Shift+S: Skip | Shift+X: Stop";
      document.body.appendChild(badge);
   }

   // ════════════════════════════════════════════════════════════
   // INIT
   // ════════════════════════════════════════════════════════════

   if (isRunning()) {
      showStatusBadge();
      // Small delay to let React render
      setTimeout(() => runStep(), 1000);
   } else {
      // Show hint on login page
      if (window.location.pathname === "/login") {
         setTimeout(() => {
            log("Tekan Shift+D untuk memulai demo presentasi");
            setTimeout(() => {
               const banner = document.getElementById("demo-banner");
               if (banner) banner.style.opacity = "0.7";
            }, 5000);
         }, 1500);
      }
   }
})();
