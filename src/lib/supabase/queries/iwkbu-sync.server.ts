import { createAdminClient } from "@/lib/supabase/admin";
import {
   reconcile,
   normalizePlate,
   type ArmadaRecord,
   type SourceRecord,
} from "@/lib/rekonsiliasi/engine";

type SyncTrigger = "manual" | "scheduled" | "api";

/** Actor untuk Temuan otomatis saat cron terjadwal (initiated_by NULL). */
const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000001";

export async function executeIwkbuSync(params: {
   triggerType: SyncTrigger;
   initiatedBy?: string | null;
   /** true bila fetch API IWKBU gagal/env kosong -> rekonsiliasi vs cache, run degraded. */
   degraded?: boolean;
   /** ID periode rekonsiliasi aktif. Auto-resolved jika tidak disediakan. */
   periodeId?: string | null;
}) {
   const admin = createAdminClient();

   // Auto-resolve active period jika tidak explicit
   let periodeId = params.periodeId ?? null;
   if (!periodeId) {
      const { data: active } = await admin
         .from("rekonsiliasi_periode")
         .select("id")
         .eq("status", "aktif")
         .order("tanggal_mulai", { ascending: false })
         .limit(1)
         .maybeSingle();
      periodeId = active?.id ?? null;
   }

   const { data: runRow, error: runCreateError } = await admin
      .from("iwkbu_sync_runs")
      .insert({
         trigger_type: params.triggerType,
         initiated_by: params.initiatedBy ?? null,
         status: "running",
         summary: {},
         periode_id: periodeId,
      })
      .select("id, started_at")
      .single();

   if (runCreateError || !runRow) {
      throw new Error(runCreateError?.message ?? "Gagal membuat sync run");
   }

   try {
      const [
         { data: sourceData, error: sourceError },
         { data: armadaData, error: armadaError },
         { data: terminalData, error: terminalError },
      ] = await Promise.all([
         admin
            .from("iwkbu_source_records")
            .select(
               "nomor_polisi, compliance_status, issue_count, source_updated_at, payload",
            )
            .limit(20000),
         admin
            .from("armada")
            .select(
               "id, po_id, nomor_polisi, status_verifikasi, status_operasional, po:po_id(status_verifikasi, kode_po, nama_perusahaan)",
            )
            .limit(20000),
         admin
            .from("kendaraan_masuk")
            .select("armada_id, waktu_masuk")
            .order("waktu_masuk", { ascending: false })
            .limit(50000),
      ]);

      if (sourceError) throw new Error(sourceError.message);
      if (armadaError) throw new Error(armadaError.message);
      if (terminalError) throw new Error(terminalError.message);

      // Bangun map source & last-seen. normalizePlate adalah milik engine (join key tunggal).
      const sourceByPlate = new Map<string, SourceRecord>();
      (sourceData ?? []).forEach((item: SourceRecord) => {
         sourceByPlate.set(normalizePlate(item.nomor_polisi), item);
      });

      const terminalLastSeen = new Map<string, string>();
      (terminalData ?? []).forEach(
         (item: { armada_id: string | null; waktu_masuk: string }) => {
            if (!item.armada_id) return;
            if (!terminalLastSeen.has(item.armada_id)) {
               terminalLastSeen.set(item.armada_id, item.waktu_masuk);
            }
         },
      );

      const armadaRows = (armadaData ?? []) as unknown as ArmadaRecord[];

      // Inti mesin: pure reconcile -> {rows, findings}. Edge reconcile->findings hidup di sini.
      const { rows: reconRows, findings } = reconcile({
         armada: armadaRows,
         sourceByPlate,
         terminalLastSeen,
      });

      const nowIso = new Date().toISOString();

      const upserts = reconRows.map((row) => ({
         ...row,
         last_synced_at: nowIso,
      }));

      if (upserts.length > 0) {
         const { error: upsertError } = await admin
            .from("iwkbu_sync_status")
            .upsert(upserts, { onConflict: "armada_id" });

         if (upsertError) throw new Error(upsertError.message);
      }

      // Persist ProposedFinding dengan dedup: satu finding OPEN per armada (source_type rekonsiliasi).
      const createdBy = params.initiatedBy ?? SYSTEM_USER_ID;
      let findingsCreated = 0;
      let findingsUpdated = 0;
      // Agregasi error persist (lookup/update/insert) agar kegagalan parsial
      // tidak lenyap — sebelumnya hanya console.error & sync tetap "success".
      const persistErrors: string[] = [];

      // Batch lookup (1 query, bukan N): semua finding OPEN rekonsiliasi untuk armada terkait.
      const armadaIds = findings.map((f) => f.armada_id);
      const existingByArmada = new Map<string, string>();
      if (armadaIds.length > 0) {
         const { data: existingRows, error: lookupError } = await admin
            .from("findings")
            .select("id, armada_id")
            .in("armada_id", armadaIds)
            .eq("source_type", "rekonsiliasi")
            .eq("status", "open");
          if (lookupError) {
             console.error("[IWKBU Sync] finding batch lookup error:", lookupError.message);
             persistErrors.push(`lookup: ${lookupError.message}`);
          } else {
            for (const row of existingRows as { id: string; armada_id: string }[]) {
               existingByArmada.set(row.armada_id, row.id);
            }
         }
      }

      // Persist paralel. Sebelumnya sekuen per-finding (bisa N round-trip
      // bergantian). Baris saling independen (armada_id/id berbeda) -> aman
      // dijalankan concurrency lewat Promise.all.
      const persistResults = await Promise.all(
         findings.map(async (pf): Promise<"created" | "updated" | "failed"> => {
            const existingId = existingByArmada.get(pf.armada_id);

            if (existingId) {
               const { error: updError } = await admin
                  .from("findings")
                  .update({
                     judul: pf.judul,
                     deskripsi: pf.deskripsi,
                     severity: pf.severity,
                     updated_at: nowIso,
                  })
                  .eq("id", existingId);
               if (updError) {
                  console.error(
                     "[IWKBU Sync] finding update error:",
                     updError.message,
                  );
                  persistErrors.push(`update ${pf.armada_id}: ${updError.message}`);
                  return "failed";
               }
               return "updated";
            }

            const { error: insError } = await admin.from("findings").insert({
                po_id: pf.po_id,
                armada_id: pf.armada_id,
                nomor_polisi: pf.nomor_polisi,
                source_type: "rekonsiliasi",
                judul: pf.judul,
                deskripsi: pf.deskripsi,
                severity: pf.severity,
                status: "open",
                created_by: createdBy,
                periode_id: periodeId,
            });
            if (insError) {
               console.error(
                  "[IWKBU Sync] finding insert error:",
                  insError.message,
               );
               persistErrors.push(`insert ${pf.armada_id}: ${insError.message}`);
               return "failed";
            }
            return "created";
         }),
      );
      findingsCreated = persistResults.filter((r) => r === "created").length;
      findingsUpdated = persistResults.filter((r) => r === "updated").length;

      const summary = {
         total_armada: reconRows.length,
         with_iwkbu_data: reconRows.filter(
            (row) => row.iwkbu_compliance_status !== "unknown",
         ).length,
         ready: reconRows.filter((row) => row.reconciliation_status === "ready").length,
         needs_review: reconRows.filter(
            (row) => row.reconciliation_status === "needs_review",
         ).length,
         blocked: reconRows.filter((row) => row.reconciliation_status === "blocked")
            .length,
          findings_created: findingsCreated,
          findings_updated: findingsUpdated,
          degraded: params.degraded === true,
          partial_failure: persistErrors.length > 0,
          persist_errors: persistErrors.slice(0, 20),
          finished_at: nowIso,
       };

      await admin
         .from("iwkbu_sync_runs")
         .update({
            status: "success",
            finished_at: summary.finished_at,
            summary,
         })
         .eq("id", runRow.id);

      return {
         runId: runRow.id,
         summary,
      };
   } catch (error: unknown) {
      await admin
         .from("iwkbu_sync_runs")
         .update({
            status: "failed",
            finished_at: new Date().toISOString(),
            error_message:
               error instanceof Error ? error.message : "Unknown error",
         })
         .eq("id", runRow.id);

      throw error;
   }
}

export async function getIwkbuSyncDashboard(limit = 100) {
   const admin = createAdminClient();

   const [
      { data: runs, error: runsError },
      { data: statuses, error: statusError },
      { count: sourceRecordsCount, error: sourceCountError },
   ] = await Promise.all([
         admin
            .from("iwkbu_sync_runs")
            .select(
               "id, trigger_type, status, started_at, finished_at, initiated_by, periode_id, summary, error_message",
            )
         .order("started_at", { ascending: false })
         .limit(20),
      admin
         .from("iwkbu_sync_status")
         .select(
            "armada_id, po_id, nomor_polisi, iwkbu_compliance_status, issue_count, source_updated_at, terminal_last_seen, po_status_verifikasi, armada_status_verifikasi, armada_status_operasional, reconciliation_status, discrepancy_note, last_synced_at",
         )
         .order("last_synced_at", { ascending: false })
         .limit(limit),
      admin
         .from("iwkbu_source_records")
         .select("id", { count: "exact", head: true }),
   ]);

   if (runsError) throw new Error(runsError.message);
   if (statusError) throw new Error(statusError.message);
   if (sourceCountError) throw new Error(sourceCountError.message);

   const summary = {
      total_rows: statuses?.length ?? 0,
      ready: (statuses ?? []).filter(
         (row: { reconciliation_status: string }) =>
            row.reconciliation_status === "ready",
      ).length,
      needs_review: (statuses ?? []).filter(
         (row: { reconciliation_status: string }) =>
            row.reconciliation_status === "needs_review",
      ).length,
      blocked: (statuses ?? []).filter(
         (row: { reconciliation_status: string }) =>
            row.reconciliation_status === "blocked",
      ).length,
      source_records: sourceRecordsCount ?? 0,
   };

   return {
      summary,
      runs: runs ?? [],
      statuses: statuses ?? [],
   };
}

export async function getPoIwkbuStatus(poId: string) {
   const admin = createAdminClient();

   const { data, error } = await admin
      .from("iwkbu_sync_status")
      .select(
         "armada_id, po_id, nomor_polisi, iwkbu_compliance_status, issue_count, source_updated_at, terminal_last_seen, reconciliation_status, discrepancy_note, last_synced_at",
      )
      .eq("po_id", poId)
      .order("nomor_polisi", { ascending: true });

   if (error) throw new Error(error.message);

   const rows = data ?? [];

   return {
      statuses: rows,
      summary: {
         total: rows.length,
         ready: rows.filter(
            (r: { reconciliation_status: string }) =>
               r.reconciliation_status === "ready",
         ).length,
         needs_review: rows.filter(
            (r: { reconciliation_status: string }) =>
               r.reconciliation_status === "needs_review",
         ).length,
         blocked: rows.filter(
            (r: { reconciliation_status: string }) =>
               r.reconciliation_status === "blocked",
         ).length,
      },
   };
}
