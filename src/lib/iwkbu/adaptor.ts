/**
 * IWKBU API Adaptor
 *
 * Mendukung dua mode:
 * 1. Mode fallback — estimasi berbasis algoritma deterministik (default).
 * 2. Mode API — memanggil API IWKBU ketika env vars tersedia.
 *
 * Env vars untuk mode API:
 *   IWKBU_API_URL  — base URL API IWKBU
 *   IWKBU_API_KEY  — Bearer token / API key
 *
 * Struktur adaptor dirancang agar fallback dapat diganti dengan
 * implementasi API tanpa mengubah kode pemanggil.
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
   source: "fallback" | "api";
   fetched_at: string;
   count: number;
}

const FALLBACK_SEED_ISSUES: Record<string, { status: string; issues: number }> = {};

function fallbackStatusForPlate(plate: string): {
   status: IwkbuComplianceRecord["compliance_status"];
   issues: number;
} {
   if (FALLBACK_SEED_ISSUES[plate]) {
      return {
         status: FALLBACK_SEED_ISSUES[plate].status as IwkbuComplianceRecord["compliance_status"],
         issues: FALLBACK_SEED_ISSUES[plate].issues,
      };
   }

   const hash = plate
      .toUpperCase()
      .replace(/\s/g, "")
      .split("")
      .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);

   const bucket = hash % 10;
   let status: IwkbuComplianceRecord["compliance_status"];
   let issues = 0;

   if (bucket < 6) {
      status = "compliant";
   } else if (bucket < 8) {
      status = "pending";
      issues = 1;
   } else if (bucket === 8) {
      status = "non_compliant";
      issues = 2 + (hash % 3);
   } else {
      status = "unknown";
   }

   FALLBACK_SEED_ISSUES[plate] = { status, issues };
   return { status, issues };
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

function fallbackFetch(
   plates: string[],
): IwkbuComplianceRecord[] {
   const now = new Date().toISOString();
   return plates.map((plate) => {
      const { status, issues } = fallbackStatusForPlate(plate);
      return {
         nomor_polisi: plate,
         compliance_status: status,
         issue_count: issues,
         source_updated_at: now,
         payload: {
            estimated: true,
            source: "iwkbu-adaptor-fallback",
         },
      };
   });
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
         console.error("[IWKBU Adaptor] API fetch failed, using fallback:", error);
      }
   }

   const records = fallbackFetch(plates);
   return {
      records,
      source: "fallback",
      fetched_at: now,
      count: records.length,
   };
}
