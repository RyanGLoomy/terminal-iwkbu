import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchIwkbuCompliance } from "@/lib/iwkbu/adaptor";
import { executeIwkbuSync } from "@/lib/supabase/queries/iwkbu-sync.server";
import { safeCompare } from "@/lib/auth/safe-compare";
import { sanitizeDbError } from "@/lib/db-error";
import { normalizePlate } from "@/lib/rekonsiliasi/engine";

export async function POST(request: Request) {
   const authHeader = request.headers.get("authorization");
   const token = authHeader?.replace(/^Bearer\s+/i, "");

   const secret =
      process.env.IWKBU_SYNC_CRON_SECRET ?? process.env.CRON_SECRET;

   if (!secret || !safeCompare(token ?? "", secret)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
   }

   try {
      const admin = createAdminClient();

      const { data: armada, error: armadaError } = await admin
         .from("armada")
         .select("nomor_polisi")
         .limit(20000);

      if (armadaError) {
         return NextResponse.json(
            { message: sanitizeDbError(armadaError, "iwkbu-fetch armada") },
            { status: 500 },
         );
      }

      const plates = (armada ?? [])
         .map((a) => a.nomor_polisi)
         .filter(Boolean);

      if (plates.length === 0) {
         return NextResponse.json({
            message: "Tidak ada armada untuk di-fetch",
            fetched: 0,
         });
      }

      const result = await fetchIwkbuCompliance(plates);

      let upserted = 0;
      // Hanya upsert source bila fetch API berhasil. Bila degraded, pakai cache
      // existing (iwkbu_source_records) -> jangan ditimpa.
      if (result.source === "api" && result.records.length > 0) {
         const rows = result.records.map((r) => ({
            external_ref: `IWKBU-API-${normalizePlate(r.nomor_polisi)}`,
            nomor_polisi: r.nomor_polisi,
            compliance_status: r.compliance_status,
            issue_count: r.issue_count,
            source_updated_at: r.source_updated_at,
            payload: r.payload ?? {},
            imported_at: new Date().toISOString(),
         }));

         const { error: upsertError } = await admin
            .from("iwkbu_source_records")
            .upsert(rows, { onConflict: "external_ref" });

         if (upsertError) {
            return NextResponse.json(
               { message: sanitizeDbError(upsertError, "iwkbu-fetch upsert") },
               { status: 500 },
            );
         }
         upserted = rows.length;
      }

      const syncSummary = await executeIwkbuSync({
         triggerType: "scheduled",
         initiatedBy: null,
         degraded: result.source !== "api",
      });

      return NextResponse.json({
         success: true,
         source: result.source,
         fetched: result.source === "api" ? result.count : 0,
         source_upserted: upserted,
         degraded: result.source !== "api",
         synced_at: result.fetched_at,
         sync: syncSummary.summary,
      });
   } catch (error: unknown) {
      return NextResponse.json(
         { message: sanitizeDbError(error, "iwkbu-fetch") },
         { status: 500 },
      );
   }
}
