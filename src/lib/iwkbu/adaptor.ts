/**
 * IWKBU API Adaptor
 *
 * Seam nyata antara mesin rekonsiliasi dan sumber data IWKBU eksternal.
 *
 * Mode:
 * 1. Mode API — memanggil API IWKBU bila IWKBU_API_URL + IWKBU_API_KEY diset.
 * 2. Mode degraded — bila env tak diset ATAU fetch gagal, TIDAK memfabrikasi data;
 *    mengembalikan source="degraded" dengan records kosong. Pemanggil (cron) lalu
 *    melewati upsert source dan merekonsiliasi vs cache (iwkbu_source_records)
 *    yang sudah ada, serta menandai run degraded. Ini sesuai skripsi (fault-tolerance
 *    membaca cache, bukan mengarang data).
 *
 * Env vars mode API:
 *   IWKBU_API_URL  — base URL API IWKBU
 *   IWKBU_API_KEY  — Bearer token / API key
 */

export interface IwkbuComplianceRecord {
   nomor_polisi: string;
   compliance_status: "compliant" | "non_compliant" | "pending" | "unknown";
   issue_count: number;
   source_updated_at: string;
   payload?: Record<string, unknown>;
}

export interface IwkbuFetchResult {
   records: IwkbuComplianceRecord[];
   /** "api" = sukses dari API; "degraded" = gagal/env kosong -> pakai cache. */
   source: "api" | "degraded";
   fetched_at: string;
   count: number;
}

// Batas sesuai skema zod API (src index.ts: z.string().min(3).max(12)).
const PLATE_MIN_LEN = 3;
const PLATE_MAX_LEN = 12;
// API membatasi 5000 plat per request; kita ambil margin aman per batch.
const API_BATCH_SIZE = 1000;

function chunkPlates(plates: string[], size: number): string[][] {
   if (size <= 0) return [plates];
   const chunks: string[][] = [];
   for (let i = 0; i < plates.length; i += size) {
      chunks.push(plates.slice(i, i + size));
   }
   return chunks;
}

async function fetchFromApi(
   apiUrl: string,
   apiKey: string,
   plates: string[],
): Promise<IwkbuComplianceRecord[]> {
   const res = await fetch(`${apiUrl}/compliance/check`, {
      method: "POST",
      headers: {
         "Content-Type": "application/json",
         Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ plates }),
      // Timeout eksplisit: sebelumnya fetch tanpa AbortSignal bisa menggantung
      // cron sampai di-kill platform. 30s cukup untuk batch ≤1000 plat.
      signal: AbortSignal.timeout(30_000),
   });

   if (!res.ok) {
      throw new Error(`IWKBU API error: ${res.status} ${res.statusText}`);
   }

   const json = await res.json();
   const records: IwkbuComplianceRecord[] = (json.records ?? json.data ?? []).map(
      (r: Record<string, unknown>) => ({
         nomor_polisi: String(r.nomor_polisi ?? r.plate ?? ""),
         compliance_status: String(
            r.compliance_status ?? r.status ?? "unknown",
         ) as IwkbuComplianceRecord["compliance_status"],
         issue_count: Number(r.issue_count ?? r.issues ?? 0),
         source_updated_at: String(
            r.source_updated_at ?? r.updated_at ?? new Date().toISOString(),
         ),
         payload: r,
      }),
   );

   return records;
}

export async function fetchIwkbuCompliance(
   plates: string[],
): Promise<IwkbuFetchResult> {
   const apiUrl = process.env.IWKBU_API_URL;
   const apiKey = process.env.IWKBU_API_KEY;
   const now = new Date().toISOString();

   if (apiUrl && apiKey) {
      // Pre-filter: skema API (zod) menolak plat <3 atau >12 char dan membatalkan
      // seluruh batch secara atomik. Buang di sini agar 1 plat aneh tidak
      // mematikan sync untuk seluruh fleet (defense-in-depth).
      const valid: string[] = [];
      let skipped = 0;
      for (const p of plates) {
         if (
            typeof p === "string" &&
            p.length >= PLATE_MIN_LEN &&
            p.length <= PLATE_MAX_LEN
         ) {
            valid.push(p);
         } else {
            skipped += 1;
         }
      }
      if (skipped > 0) {
         console.warn(
            `[IWKBU Adaptor] ${skipped} plat di-skip (panjang di luar ${PLATE_MIN_LEN}-${PLATE_MAX_LEN} char).`,
         );
      }

      try {
         const all: IwkbuComplianceRecord[] = [];
         // Chunking: API membatasi plates ≤5000 per request. Batch lebih kecil
         // (1000) membatasi dampak kegagalan parsial per batch.
         for (const batch of chunkPlates(valid, API_BATCH_SIZE)) {
            const recs = await fetchFromApi(apiUrl, apiKey, batch);
            all.push(...recs);
         }
         return {
            records: all,
            source: "api",
            fetched_at: now,
            count: all.length,
         };
      } catch (error) {
         // Fault-tolerance: jangan fabrikasi. Sinyalkan degraded; pemanggil pakai cache.
         console.error("[IWKBU Adaptor] API fetch gagal -> degraded (pakai cache):", error);
      }
   } else {
      console.warn("[IWKBU Adaptor] Env IWKBU_API_URL/KEY tak diset -> degraded (pakai cache).");
   }

   return { records: [], source: "degraded", fetched_at: now, count: 0 };
}
