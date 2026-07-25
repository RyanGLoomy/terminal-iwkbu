// ==UserScript==
// @name         IWKBU Terminal — Showcase Demo Automation v2
// @namespace    https://terminal-iwkbu.vercel.app
// @version      2.0
// @description  Automated presentation demo (~12 min). PO(ARIMBI) → Loket → Admin → Staf IW. Shift+D start, Shift+S skip, Shift+X stop.
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
   // CONFIG — TIMING TUNED FOR 12-13 MINUTE PRESENTATION
   // ════════════════════════════════════════════════════════════

   const T_INTRO = 8000;     // 8s — baca penjelasan overlay
   const T_VIEW = 18000;     // 18s — lihat halaman
   const T_ACTION = 3000;    // 3s — setelah aksi (klik, input)
   const T_LOGIN = 6000;     // 6s — tunggu redirect login
   const T_LOGOUT = 4000;    // 4s — logout transition

   const ACCOUNTS = {
      po:     { email: "arimbi@iwkbu-banten.id",         password: "Banten2026!" },
      loket:  { email: "loket.demo@iwkbu-banten.id",     password: "Banten2026!", pin: "123456" },
      admin:  { email: "admin.demo@iwkbu-banten.id",     password: "Banten2026!" },
      stafiw: { email: "stafiw.demo@iwkbu-banten.id",    password: "Banten2026!" },
   };

   // ════════════════════════════════════════════════════════════
   // HELPERS
   // ════════════════════════════════════════════════════════════

   const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

   function log(msg) {
      console.log(`%c[IWKBU Demo]%c ${msg}`, "color:#0050b3;font-weight:bold", "color:inherit");
   }

   function setNativeValue(el, value) {
      const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
      setter.call(el, value);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
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
      removeOverlay();
      removeHighlight();
      log("Demo dihentikan");
   }

   // ════════════════════════════════════════════════════════════
   // PRESENTATION OVERLAY — speaker notes on screen
   // ════════════════════════════════════════════════════════════

   function showPresentationOverlay(title, description, points, duration) {
      removeOverlay();

      const overlay = document.createElement("div");
      overlay.id = "demo-presentation-overlay";
      overlay.style.cssText = [
         "position:fixed", "top:0", "left:0", "right:0", "z-index:99998",
         "background:linear-gradient(135deg, rgba(0,80,179,0.95), rgba(15,23,42,0.95))",
         "color:white", "padding:20px 30px",
         "font-family:'Plus Jakarta Sans',system-ui,sans-serif",
         "box-shadow:0 4px 20px rgba(0,0,0,0.4)",
         "animation:demo-slide-down 0.5s ease-out",
         "border-bottom:3px solid #fbbf24",
      ].join(";");

      let pointsHtml = "";
      if (points && points.length > 0) {
         pointsHtml = '<ul style="margin:8px 0 0;padding-left:20px;font-size:14px;opacity:0.9;line-height:1.6;">' +
            points.map((p) => `<li>${p}</li>`).join("") +
            "</ul>";
      }

      overlay.innerHTML = `
         <div style="display:flex;align-items:start;gap:16px;">
            <div style="font-size:28px;flex-shrink:0;">${getRoleIcon()}</div>
            <div style="flex:1;">
               <div style="font-size:18px;font-weight:700;letter-spacing:-0.02em;">${title}</div>
               <div style="font-size:14px;opacity:0.85;margin-top:4px;">${description}</div>
               ${pointsHtml}
            </div>
            <div style="font-size:12px;opacity:0.5;flex-shrink:0;margin-top:4px;">
               <span id="demo-timer">${Math.round(duration / 1000)}s</span>
            </div>
         </div>
      `;

      // Add animation style if not exists
      if (!document.getElementById("demo-anim-style")) {
         const style = document.createElement("style");
         style.id = "demo-anim-style";
         style.textContent = `
            @keyframes demo-slide-down {
               from { transform: translateY(-100%); opacity: 0; }
               to { transform: translateY(0); opacity: 1; }
            }
            @keyframes demo-pulse-highlight {
               0%, 100% { box-shadow: 0 0 0 4px rgba(251,191,36,0.8), 0 0 20px rgba(251,191,36,0.4); }
               50% { box-shadow: 0 0 0 4px rgba(251,191,36,0.4), 0 0 30px rgba(251,191,36,0.6); }
            }
            .demo-highlight {
               animation: demo-pulse-highlight 1.5s ease-in-out infinite !important;
               border-radius: 8px !important;
               position: relative !important;
               z-index: 99997 !important;
            }
         `;
         document.head.appendChild(style);
      }

      document.body.appendChild(overlay);

      // Countdown timer
      const timerEl = document.getElementById("demo-timer");
      let remaining = Math.round(duration / 1000);
      const interval = setInterval(() => {
         remaining--;
         if (timerEl) timerEl.textContent = `${remaining}s`;
         if (remaining <= 0) clearInterval(interval);
      }, 1000);

      // Auto-remove after duration
      setTimeout(() => removeOverlay(), duration);
   }

   function getRoleIcon() {
      const step = sessionStorage.getItem("demo_step") || "";
      if (step.startsWith("po")) return "🚌";
      if (step.startsWith("loket")) return "🚌";
      if (step.startsWith("admin")) return "🏛️";
      if (step.startsWith("stafiw")) return "⚡";
      return "📋";
   }

   function removeOverlay() {
      const overlay = document.getElementById("demo-presentation-overlay");
      if (overlay) overlay.remove();
   }

   function highlightElement(selector, duration = 5000) {
      removeHighlight();
      const el = typeof selector === "string" ? document.querySelector(selector) : selector;
      if (!el) return;

      el.classList.add("demo-highlight");
      el.scrollIntoView({ behavior: "smooth", block: "center" });

      setTimeout(() => removeHighlight(), duration);
   }

   function highlightText(text, duration = 5000) {
      const allElements = document.querySelectorAll("h1, h2, h3, button, .card, [class*='card'], [class*='stat'], table");
      for (const el of allElements) {
         if (el.textContent.includes(text)) {
            highlightElement(el, duration);
            return;
         }
      }
   }

   function removeHighlight() {
      document.querySelectorAll(".demo-highlight").forEach((el) => {
         el.classList.remove("demo-highlight");
      });
   }

   // ════════════════════════════════════════════════════════════
   // STATUS BADGE
   // ════════════════════════════════════════════════════════════

   function showStatusBadge() {
      if (document.getElementById("demo-status-badge")) return;
      const badge = document.createElement("div");
      badge.id = "demo-status-badge";
      badge.style.cssText =
         "position:fixed;top:8px;right:8px;background:#10b981;color:white;" +
         "padding:4px 12px;border-radius:9999px;font-size:11px;font-family:sans-serif;" +
         "z-index:99999;box-shadow:0 2px 8px rgba(0,0,0,0.2);";
      badge.textContent = "● DEMO AKTIF";
      badge.title = "Shift+D: Start | Shift+S: Skip | Shift+X: Stop";
      document.body.appendChild(badge);
   }

   // ════════════════════════════════════════════════════════════
   // ACTIONS
   // ════════════════════════════════════════════════════════════

   async function doLogin(account, nextStep) {
      log(`Login: ${account.email}`);

      // Show explanation
      showPresentationOverlay(
         "🔐 Login Sistem",
         `Masuk sebagai ${account.email}`,
         [
            "Sistem menggunakan Supabase Auth dengan enkripsi end-to-end",
            "Rate limiting: 10 percobaan / 15 menit per akun + IP",
            "Password di-hash dengan bcrypt (cost factor 12)",
         ],
         T_INTRO,
      );
      await sleep(T_INTRO);

      const emailInput = await waitForElement('input[type="email"], input#email');
      const passInput = await waitForElement('input[type="password"], input#password');
      if (!emailInput || !passInput) {
         log("Form login tidak ditemukan!");
         goNext(nextStep, null);
         return;
      }

      // Type-like animation for presentation effect
      setNativeValue(emailInput, "");
      await sleep(200);
      for (const char of account.email) {
         emailInput.value += char;
         emailInput.dispatchEvent(new Event("input", { bubbles: true }));
         await sleep(30);
      }
      await sleep(300);

      setNativeValue(passInput, "");
      await sleep(200);
      for (const char of account.password) {
         passInput.value += char;
         passInput.dispatchEvent(new Event("input", { bubbles: true }));
         await sleep(20);
      }
      await sleep(500);

      clickByText("button", "Masuk");
      goNext(nextStep, null);
      await sleep(T_LOGIN + 2000);
   }

   async function doLogout(nextStep, roleLabel) {
      showPresentationOverlay(
         "🚪 Logout",
         `Keluar dari akun ${roleLabel}`,
         ["Session di-clear dari server", "Cookie auth dihapus", "Redirect ke halaman login"],
         T_LOGOUT,
      );

      try {
         await fetch("/api/auth/logout", { method: "POST" });
      } catch (e) {}

      await sleep(T_LOGOUT);
      goNext(nextStep, "/login");
   }

   async function showPage(stepId, nextStep, nextUrl, title, desc, points, highlightSelector, scroll) {
      showPresentationOverlay(title, desc, points, T_INTRO);
      await sleep(T_INTRO);

      if (highlightSelector) {
         await sleep(500);
         highlightElement(highlightSelector, T_VIEW);
      }

      if (scroll) {
         await sleep(2000);
         window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
         await sleep(3000);
         window.scrollTo({ top: 0, behavior: "smooth" });
         await sleep(1000);
      } else {
         await sleep(T_VIEW);
      }

      goNext(nextStep, nextUrl);
   }

   async function doPin(nextStep) {
      showPresentationOverlay(
         "🔑 Verifikasi PIN Petugas",
         "Loket wajib verifikasi PIN sebelum akses dashboard",
         [
            "PIN 4-6 digit di-hash dengan bcrypt",
            "Session PIN berlaku 8 jam (sesuai shift kerja)",
            "Rate limit: 5 percobaan salah → lockout 15 menit",
         ],
         T_INTRO,
      );
      await sleep(T_INTRO);

      const pinInput = await waitForElement('input[type="password"], input#pin, input[inputmode="numeric"]');
      if (pinInput) {
         setNativeValue(pinInput, ACCOUNTS.loket.pin);
         await sleep(500);
         clickByText("button", "Verifikasi PIN");
      }
      goNext(nextStep, null);
      await sleep(3000);
   }

   async function doPencatatan(nextStep) {
      showPresentationOverlay(
         "📝 Pencatatan Kendaraan Masuk",
         "Demo input transaksi kendaraan masuk terminal",
         [
            "Petugas input nomor polisi → sistem auto-uppercase",
            "Pilih PO pemilik kendaraan dari dropdown",
            "Data tersimpan real-time dengan validasi sesi aktif",
            "Offline mode: transaksi di-queue jika koneksi putus",
         ],
         T_INTRO + 2000,
      );
      await sleep(T_INTRO);

      // Check if session is active
      const tutupBtn = clickByText("button", "Tutup Sesi");
      if (!tutupBtn) {
         const bukaBtn = clickByText("button", "Buka Sesi");
         if (bukaBtn) {
            bukaBtn.click();
            log("Membuka sesi petugas...");
            await sleep(3000);
         }
      }

      // Input nopol
      const nopolInput = await waitForElement('input[placeholder*="B 1234"], input[placeholder*="Nomor"]');
      if (nopolInput) {
         const uniquePlate = "B" + Math.floor(1000 + Math.random() * 8999) + "TST";
         setNativeValue(nopolInput, uniquePlate);
         log(`Input: ${uniquePlate}`);
         highlightElement(nopolInput, 3000);
         await sleep(2000);

         // Select PO
         const poTrigger = document.querySelector('[data-slot="select-trigger"]');
         if (poTrigger) {
            poTrigger.click();
            await sleep(500);
            const opts = document.querySelectorAll('[role="option"]');
            // Select ARIMBI (has data)
            for (const opt of opts) {
               if (opt.textContent.includes("ARIMBI")) {
                  opt.click();
                  break;
               }
            }
            if (!document.querySelector('[role="option"]')) {
               if (opts[0]) opts[0].click();
            }
            await sleep(500);
         }

         // Submit
         const submitBtn = clickByText("button", "Simpan");
         if (submitBtn) {
            highlightElement(submitBtn, 2000);
            await sleep(1000);
            submitBtn.click();
            log("Kendaraan tersimpan!");
            await sleep(3000);
         }
      }

      await sleep(T_VIEW);
      goNext(nextStep, null);
   }

   async function doBuatTemuan(nextStep) {
      showPresentationOverlay(
         "🔍 Buat Temuan Baru",
         "Staf IW membuat temuan untuk PO (TIDAK DI-SUBMIT — demo only)",
         [
            "Pilih PO dan armada yang bermasalah",
            "Tentukan severity: Rendah / Sedang / Tinggi",
            "Sistem otomatis kirim notifikasi ke PO setelah submit",
            "PO dapat memberikan klarifikasi dengan bukti",
         ],
         T_INTRO + 2000,
      );
      await sleep(T_INTRO);

      const createBtn = clickByText("button", "Buat Temuan");
      if (!createBtn) {
         log("Tombol Buat Temuan tidak ditemukan");
         goNext(nextStep, null);
         return;
      }
      createBtn.click();
      await sleep(1500);

      const dialog = await waitForElement("dialog[open], .modal[open], .modal-box", 5000);
      if (!dialog) {
         log("Modal tidak muncul");
         goNext(nextStep, null);
         return;
      }

      const container = document.querySelector(".modal-box") || dialog;

      // Select PO (ARIMBI)
      const selects = container.querySelectorAll('[data-slot="select-trigger"]');
      if (selects[0]) {
         selects[0].click();
         await sleep(500);
         const opts = document.querySelectorAll('[role="option"]');
         for (const opt of opts) {
            if (opt.textContent.includes("ARIMBI")) { opt.click(); break; }
         }
         await sleep(500);
      }

      // Fill nopol
      const nopolInput = container.querySelector('input[placeholder*="B1234"], input[placeholder*="nomor"]');
      if (nopolInput) {
         setNativeValue(nopolInput, "B1234DEMO");
         await sleep(300);
      }

      // Fill judul
      const judulInput = container.querySelector('input[placeholder*="Judul"]');
      if (judulInput) {
         setNativeValue(judulInput, "IWKBU Belum Terbayar — Demo Presentasi");
         await sleep(300);
      }

      // Fill deskripsi
      const deskripsiTextarea = container.querySelector("textarea");
      if (deskripsiTextarea) {
         setNativeValue(deskripsiTextarea, "Armada B1234DEMO terdeteksi belum membayar IWKBU periode Juli 2026. Mohon segera melakukan pembayaran dan melampirkan bukti.");
         await sleep(300);
      }

      // Show filled form
      showPresentationOverlay(
         "✅ Form Terisi Lengkap",
         "Form siap submit — untuk demo, form akan ditutup tanpa submit",
         [
            "PO: ARIMBI",
            "Plat: B1234DEMO",
            "Judul: IWKBU Belum Terbayar — Demo Presentasi",
            "Severity: Medium (Sedang)",
            "⚠ TIDAK DI-SUBMIT untuk menjaga data bersih",
         ],
         T_VIEW,
      );

      await sleep(T_VIEW);

      // Close modal WITHOUT submitting
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", keyCode: 27, bubbles: true }));
      await sleep(500);

      // Try clicking backdrop or close button
      const closeBtn = document.querySelector("dialog[open] form button, dialog[open] button[method]");
      if (closeBtn) closeBtn.click();

      goNext(nextStep, null);
   }

   async function doClickFirstFinding(nextStep, basePath) {
      log("Membuka detail temuan...");
      await sleep(T_ACTION);

      const findingLink = document.querySelector('[data-highlight-id] a, a[href*="' + basePath + '/temuan/"]');
      if (findingLink) {
         goNext(nextStep, findingLink.getAttribute("href"));
         return;
      }

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
   // STEP REGISTRY — FULL 12-MINUTE PRESENTATION
   // ════════════════════════════════════════════════════════════

   const STEP_ORDER = [
      // ─── PHASE 1: PO (ARIMBI — 106 armada) ───
      "po_login",
      "po_dashboard",
      "po_armada",
      "po_rekonsiliasi",
      "po_temuan",
      "po_temuan_detail",
      "po_logout",

      // ─── PHASE 2: LOKET ───
      "loket_login",
      "loket_pin",
      "loket_dashboard",
      "loket_pencatatan",
      "loket_riwayat",
      "loket_logout",

      // ─── PHASE 3: ADMIN TERMINAL ───
      "admin_login",
      "admin_dashboard",
      "admin_rekap",
      "admin_laporan",
      "admin_logout",

      // ─── PHASE 4: STAF IW ───
      "stafiw_login",
      "stafiw_dashboard",
      "stafiw_rekonsiliasi",
      "stafiw_sync",
      "stafiw_temuan_list",
      "stafiw_temuan_create",
      "stafiw_temuan_detail_list",
      "stafiw_temuan_detail",
      "stafiw_audit",
      "stafiw_logout",

      "done",
   ];

   const STEPS = {
      // ═══ PO ═══
      po_login: () => doLogin(ACCOUNTS.po, "po_dashboard"),

      po_dashboard: () => showPage("po_dashboard", "po_armada", null,
         "🚌 Dashboard PO — ARIMBI",
         "PO melihat statistik armada dan status verifikasi",
         [
            "Total 106 armada terdaftar",
            "Status: menunggu / terverifikasi / ditolak",
            "Akses ke rekonsiliasi dan temuan",
         ],
         "h1", true),

      po_armada: () => showPage("po_armada", "po_rekonsiliasi", "/po/rekonsiliasi",
         "🚌 Data Armada PO",
         "Daftar lengkap armada dengan status operasional",
         [
            "Nomor polisi, merk, kapasitas",
            "Status verifikasi oleh Staf IW",
            "Export data ke CSV/Excel",
         ],
         "table", true),

      po_rekonsiliasi: () => showPage("po_rekonsiliasi", "po_temuan", "/po/temuan",
         "🔄 Hasil Rekonsiliasi IWKBU",
         "Status kepatuhan IWKBU per armada",
         [
            "🟢 Ready — kepatuhan terverifikasi",
            "🟡 Needs Review — menunggu data",
            "🔴 Blocked — tidak patuh",
            "Data dari sinkronisasi API IWKBU pusat",
         ],
         "table", true),

      po_temuan: () => {
         showPresentationOverlay(
            "📝 Temuan & Klarifikasi",
            "Daftar temuan yang dialamatkan ke PO",
            [
               "PO dapat melihat detail temuan",
               "Memberikan klarifikasi dengan bukti",
               "Status: Open → On Progress → Closed",
            ],
            T_INTRO,
         );
         return sleep(T_INTRO).then(() => doClickFirstFinding("po_temuan_detail", "/po"));
      },

      po_temuan_detail: () => showPage("po_temuan_detail", "po_logout", null,
         "📝 Detail Temuan",
         "Thread klarifikasi PO ↔ Staf IW",
         [
            "Riwayat klarifikasi (conversation thread)",
            "Form klarifikasi dengan upload bukti",
            "Decision: Melengkapi / Menerima / Menolak",
         ],
         null, true),

      po_logout: () => doLogout("loket_login", "PO (ARIMBI)"),

      // ═══ LOKET ═══
      loket_login: () => doLogin(ACCOUNTS.loket, "loket_pin"),

      loket_pin: () => doPin("loket_dashboard"),

      loket_dashboard: () => showPage("loket_dashboard", "loket_pencatatan", "/loket/pencatatan",
         "📊 Dashboard Loket Terminal",
         "Operasional terminal real-time",
         [
            "Sesi kerja: Buka/Tutup shift",
            "Kendaraan masuk/keluar hari ini",
            "Tren transaksi 7 hari",
         ],
         "h1", true),

      loket_pencatatan: () => doPencatatan("loket_riwayat"),

      loket_riwayat: () => showPage("loket_riwayat", "loket_logout", "/loket/riwayat",
         "📋 Riwayat Pencatatan",
         "Rekap transaksi harian dengan export",
         [
            "Filter berdasarkan tanggal",
            "Export ke CSV/Excel untuk laporan",
            "Detail per kendaraan (masuk/keluar)",
         ],
         "table", true),

      loket_logout: () => doLogout("admin_login", "Loket Terminal"),

      // ═══ ADMIN ═══
      admin_login: () => doLogin(ACCOUNTS.admin, "admin_dashboard"),

      admin_dashboard: () => showPage("admin_dashboard", "admin_rekap", null,
         "🏛️ Dashboard Admin Terminal",
         "Overview operasional terminal",
         [
            "Statistik kendaraan masuk/keluar",
            "Sesi aktif petugas",
            "PO aktif dan armada terdaftar",
         ],
         "h1", true),

      admin_rekap: () => showPage("admin_rekap", "admin_laporan", "/admin-terminal/laporan",
         "📈 Rekap Data Terminal",
         "Rekapitulasi transaksi dengan filter",
         [
            "Filter per tanggal / rentang",
            "Breakdown per PO dan rute",
            "Export laporan untuk dinas",
         ],
         "table", true),

      admin_laporan: () => showPage("admin_laporan", "admin_logout", null,
         "📑 Laporan Operasional",
         "Laporan komprehensif untuk manajemen",
         [
            "Laporan harian/mingguan/bulanan",
            "Metrik kinerja terminal",
            "Export PDF/Excel siap cetak",
         ],
         null, true),

      admin_logout: () => doLogout("stafiw_login", "Admin Terminal"),

      // ═══ STAF IW ═══
      stafiw_login: () => doLogin(ACCOUNTS.stafiw, "stafiw_dashboard"),

      stafiw_dashboard: () => showPage("stafiw_dashboard", "stafiw_rekonsiliasi", "/staf-iw/rekonsiliasi",
         "⚡ Dashboard Staf IW — Pengawasan Integrasi",
         "Pusat kendali rekonsiliasi dengan analitik",
         [
            "557 armada terdaftar dari 20 PO",
            "418 ready, 177 needs review, 100 blocked",
            "Chart analitik: aktivitas, tren temuan, sync",
            "Quick actions: rekonsiliasi, sync, temuan",
         ],
         "h1", true),

      stafiw_rekonsiliasi: () => showPage("stafiw_rekonsiliasi", "stafiw_sync", "/staf-iw/iwkbu-sync",
         "🔄 Rekonsiliasi Data Sumber",
         "Cek kesiapan data PO sebelum rekonsiliasi IWKBU",
         [
            "Status: Siap / Perlu Perhatian / Belum Ada Armada",
            "Kelola periode rekonsiliasi (aktif/ditutup)",
            "Auto-trigger sync saat periode diaktifkan",
         ],
         null, true),

      stafiw_sync: () => showPage("stafiw_sync", "stafiw_temuan_list", "/staf-iw/temuan",
         "⚡ Sinkronisasi IWKBU",
         "Fetch data compliance dari API IWKBU pusat",
         [
            "API: https://iwkbu-api-server.vercel.app",
            "557 records tersinkron (deterministic mock)",
            "Manual sync / cron scheduled",
            "Degraded mode: cache dipertahankan saat API down",
         ],
         null, true),

      stafiw_temuan_list: () => showPage("stafiw_temuan_list", "stafiw_temuan_create", null,
         "📝 Temuan & Tindak Lanjut",
         "Kelola semua temuan rekonsiliasi",
         [
            "Filter: status, periode, search",
            "Pagination 15/page dengan export CSV/PDF",
            "Klik untuk detail + aksi (close, edit, klarifikasi)",
         ],
         "table", true),

      stafiw_temuan_create: () => doBuatTemuan("stafiw_temuan_detail_list"),

      stafiw_temuan_detail_list: () => doClickFirstFinding("stafiw_temuan_detail", "/staf-iw"),

      stafiw_temuan_detail: () => showPage("stafiw_temuan_detail", "stafiw_audit", null,
         "📝 Detail Temuan — Staf IW",
         "Kelola temuan individual dengan thread klarifikasi",
         [
            "Thread klarifikasi PO ↔ Staf IW",
            "Aksi: Edit, On Progress, Close, Buka Ulang",
            "Riwayat aktivitas lengkap",
         ],
         null, true),

      stafiw_audit: () => showPage("stafiw_audit", "stafiw_logout", "/staf-iw/audit-trail",
         "🔍 Audit Trail",
         "Log aktivitas semua user di sistem",
         [
            "Setiap aksi tercatat: login, verifikasi, sync",
            "Filter berdasarkan aksi / tanggal",
            "Tidak dapat dihapus (immutable audit log)",
            "Retention: 90 hari + auto-cleanup cron",
         ],
         "table", true),

      stafiw_logout: () => doLogout("done", "Staf IW"),

      done: () => {
         showPresentationOverlay(
            "✅ Demo Selesai!",
            "Terima kasih atas perhatian Anda",
            [
               "4 role ditampilkan: PO, Loket, Admin Terminal, Staf IW",
               "557 armada, 20 PO, 557 IWKBU records",
               "Service Worker + Web Push aktif",
               "Pertanyaan?",
            ],
            15000,
         );
         log("Demo selesai!");
         setTimeout(() => stopDemo(), 16000);
      },
   };

   // ════════════════════════════════════════════════════════════
   // MAIN — RUN ON PAGE LOAD
   // ════════════════════════════════════════════════════════════

   async function runStep() {
      const step = sessionStorage.getItem("demo_step");
      if (!step || !isRunning()) return;

      if (sessionStorage.getItem("demo_skip") === "1") {
         sessionStorage.removeItem("demo_skip");
         const idx = STEP_ORDER.indexOf(step);
         if (idx >= 0 && idx < STEP_ORDER.length - 1) {
            sessionStorage.setItem("demo_step", STEP_ORDER[idx + 1]);
            return runStep();
         }
      }

      const action = STEPS[step];
      if (action) {
         log(`▶ ${step}`);
         try {
            await action();
         } catch (e) {
            log(`Error: ${e.message}. Skip...`);
            await sleep(2000);
            sessionStorage.setItem("demo_skip", "1");
            runStep();
         }
      } else {
         log(`Step tidak dikenal: ${step}`);
         stopDemo();
      }
   }

   // ════════════════════════════════════════════════════════════
   // HOTKEYS
   // ════════════════════════════════════════════════════════════

   document.addEventListener("keydown", (e) => {
      if (e.shiftKey && e.key === "D") {
         e.preventDefault();
         if (!isRunning()) {
            log("🚀 Memulai demo presentasi (~12 menit)...");
            sessionStorage.setItem("demo_running", "1");
            sessionStorage.setItem("demo_step", "po_login");
            showStatusBadge();
            if (window.location.pathname !== "/login") {
               window.location.href = "/login";
            } else {
               setTimeout(() => runStep(), 500);
            }
         }
      }

      if (e.shiftKey && e.key === "S") {
         e.preventDefault();
         if (isRunning()) {
            log("⏭ Skip...");
            removeOverlay();
            removeHighlight();
            sessionStorage.setItem("demo_skip", "1");
            window.location.reload();
         }
      }

      if (e.shiftKey && e.key === "X") {
         e.preventDefault();
         stopDemo();
      }
   });

   // ════════════════════════════════════════════════════════════
   // INIT
   // ════════════════════════════════════════════════════════════

   if (isRunning()) {
      showStatusBadge();
      setTimeout(() => runStep(), 1500);
   } else {
      if (window.location.pathname === "/login") {
         setTimeout(() => {
            showPresentationOverlay(
               "👋 Selamat Datang",
               "IWKBU Terminal — Jasa Raharja Banten",
               [
                  "Tekan Shift+D untuk memulai demo otomatis (~12 menit)",
                  "Shift+S untuk skip halaman",
                  "Shift+X untuk stop demo",
               ],
               10000,
            );
         }, 2000);
      }
   }
})();
