const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";

const cases = [
   {
      name: "POST /api/sesi/open rejects anonymous request",
      url: "/api/sesi/open",
      method: "POST",
      body: {},
      expectedStatus: 401,
   },
   {
      name: "POST /api/sesi/close rejects anonymous request",
      url: "/api/sesi/close",
      method: "POST",
      body: { sesi_id: "test" },
      expectedStatus: 401,
   },
   {
      name: "POST /api/transaksi/masuk rejects anonymous request",
      url: "/api/transaksi/masuk",
      method: "POST",
      body: { sesi_id: "test", po_id: "test", nomor_polisi: "B 1234 CD" },
      expectedStatus: 401,
   },
   {
      name: "POST /api/transaksi/keluar rejects anonymous request",
      url: "/api/transaksi/keluar",
      method: "POST",
      body: { sesi_id: "test", masuk_id: "test" },
      expectedStatus: 401,
   },
   {
      name: "GET /api/admin/petugas rejects anonymous request",
      url: "/api/admin/petugas",
      method: "GET",
      expectedStatus: 401,
   },
    {
       name: "GET /api/admin/terminals rejects anonymous request",
       url: "/api/admin/terminals",
       method: "GET",
       expectedStatus: 401,
    },
    {
       name: "GET /api/staf-iw/findings rejects anonymous request",
       url: "/api/staf-iw/findings",
       method: "GET",
       expectedStatus: 401,
    },
    {
       name: "GET /api/admin/jenis-kendaraan rejects anonymous request",
       url: "/api/admin/jenis-kendaraan",
       method: "GET",
       expectedStatus: 401,
    },
   {
      name: "POST /api/auth/change-pin rejects anonymous request",
      url: "/api/auth/change-pin",
      method: "POST",
      body: { currentPin: "1234", newPin: "5678" },
      expectedStatus: 401,
   },
   {
      name: "POST /api/auth/change-password rejects anonymous request",
      url: "/api/auth/change-password",
      method: "POST",
      body: { currentPassword: "old", newPassword: "newpass123" },
      expectedStatus: 401,
   },
];

async function requestCase(testCase) {
   const controller = new AbortController();
   const timeout = setTimeout(() => controller.abort(), 20000);

   try {
      console.log(`RUN  - ${testCase.name}`);
      const response = await fetch(new URL(testCase.url, baseUrl), {
         method: testCase.method,
         headers: testCase.body
            ? { "content-type": "application/json" }
            : undefined,
         body: testCase.body ? JSON.stringify(testCase.body) : undefined,
         redirect: "manual",
         signal: controller.signal,
      });

      const text = await response.text();
      const ok = response.status === testCase.expectedStatus;
      return {
         name: testCase.name,
         ok,
         status: response.status,
         expected: testCase.expectedStatus,
         bodyPreview: text.slice(0, 120),
      };
   } catch (error) {
      return {
         name: testCase.name,
         ok: false,
         status: "ERROR",
         expected: testCase.expectedStatus,
         bodyPreview: error instanceof Error ? error.message : String(error),
      };
   } finally {
      clearTimeout(timeout);
   }
}

const results = [];
for (const testCase of cases) {
   results.push(await requestCase(testCase));
}

const failed = results.filter((result) => !result.ok);

for (const result of results) {
   const statusLabel = result.ok ? "PASS" : "FAIL";
   console.log(
      `${statusLabel} - ${result.name} (status ${result.status}, expected ${result.expected})`,
   );
   if (!result.ok) {
      console.log(`  body: ${result.bodyPreview}`);
   }
}

if (failed.length > 0) {
   console.error(`\n${failed.length} integration checks failed.`);
   process.exit(1);
}

console.log(`\nAll ${results.length} integration checks passed.`);
