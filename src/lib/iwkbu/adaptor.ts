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
      try {
         const records = await fetchFromApi(apiUrl, apiKey, plates);
         return {
            records,
            source: "api",
            fetched_at: now,
            count: records.length,
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
