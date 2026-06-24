import { createAdminClient } from "@/lib/supabase/admin";

type SyncTrigger = "manual" | "scheduled" | "api";

type SourceRecord = {
   nomor_polisi: string;
   compliance_status: "compliant" | "non_compliant" | "pending" | "unknown";
   issue_count: number;
   source_updated_at: string | null;
   payload: Record<string, unknown> | null;
};

type ArmadaRecord = {
   id: string;
   po_id: string;
   nomor_polisi: string;
   status_verifikasi: string;
   status_operasional: string;
   po:
      | {
           status_verifikasi: string;
           kode_po: string;
           nama_perusahaan: string;
        }
      | null;
};

function normalizePlate(value: string | null | undefined) {
   return (value ?? "").toUpperCase().replace(/\s+/g, "").trim();
}

function buildReconciliation(
   armada: ArmadaRecord,
   source: SourceRecord | undefined,
): {
   iwkbuComplianceStatus: "compliant" | "non_compliant" | "pending" | "unknown";
   reconciliationStatus: "ready" | "needs_review" | "blocked";
   discrepancyNote: string | null;
   issueCount: number;
   sourceUpdatedAt: string | null;
   sourcePayload: Record<string, unknown>;
} {
   const iwkbuStatus = source?.compliance_status ?? "unknown";
   const issueCount = source?.issue_count ?? 0;

   const reasons: string[] = [];
   if (!source) reasons.push("data IWKBU belum tersedia");
    if (armada.po?.status_verifikasi !== "aktif")
       reasons.push("PO belum aktif");
   if (armada.status_verifikasi !== "terverifikasi")
      reasons.push("armada belum terverifikasi");
   if (armada.status_operasional !== "aktif")
      reasons.push("armada tidak aktif");
   if (iwkbuStatus === "non_compliant")
      reasons.push("status IWKBU non-compliant");
   if (iwkbuStatus === "pending") reasons.push("status IWKBU pending");

   let reconciliationStatus: "ready" | "needs_review" | "blocked" =
      "needs_review";

   if (iwkbuStatus === "compliant" && reasons.length === 0) {
      reconciliationStatus = "ready";
   } else if (
      iwkbuStatus === "non_compliant" ||
      reasons.includes("PO belum aktif") ||
      reasons.includes("armada belum terverifikasi")
   ) {
      reconciliationStatus = "blocked";
   }

   return {
      iwkbuComplianceStatus: iwkbuStatus,
      reconciliationStatus,
      discrepancyNote: reasons.length > 0 ? reasons.join("; ") : null,
      issueCount,
      sourceUpdatedAt: source?.source_updated_at ?? null,
      sourcePayload: source?.payload ?? {},
   };
}

export async function executeIwkbuSync(params: {
   triggerType: SyncTrigger;
   initiatedBy?: string | null;
}) {
   const admin = createAdminClient();

   const { data: runRow, error: runCreateError } = await admin
      .from("iwkbu_sync_runs")
      .insert({
         trigger_type: params.triggerType,
         initiated_by: params.initiatedBy ?? null,
         status: "running",
         summary: {},
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

      const sourceMap = new Map<string, SourceRecord>();
      (sourceData ?? []).forEach((item: any) => {
         sourceMap.set(normalizePlate(item.nomor_polisi), item as SourceRecord);
      });

      const terminalLastSeen = new Map<string, string>();
      (terminalData ?? []).forEach((item: any) => {
         if (!item.armada_id) return;
         if (!terminalLastSeen.has(item.armada_id)) {
            terminalLastSeen.set(item.armada_id, item.waktu_masuk);
         }
      });

      const rows = (armadaData ?? []) as unknown as ArmadaRecord[];

      const upserts = rows.map((armada) => {
         const source = sourceMap.get(normalizePlate(armada.nomor_polisi));
         const result = buildReconciliation(armada, source);

         return {
            armada_id: armada.id,
            po_id: armada.po_id,
            nomor_polisi: armada.nomor_polisi,
            iwkbu_compliance_status: result.iwkbuComplianceStatus,
            issue_count: result.issueCount,
            source_updated_at: result.sourceUpdatedAt,
            terminal_last_seen: terminalLastSeen.get(armada.id) ?? null,
             po_status_verifikasi: armada.po?.status_verifikasi ?? null,
            armada_status_verifikasi: armada.status_verifikasi,
            armada_status_operasional: armada.status_operasional,
            reconciliation_status: result.reconciliationStatus,
            discrepancy_note: result.discrepancyNote,
            source_payload: result.sourcePayload,
            last_synced_at: new Date().toISOString(),
         };
      });

      if (upserts.length > 0) {
         const { error: upsertError } = await admin
            .from("iwkbu_sync_status")
            .upsert(upserts, { onConflict: "armada_id" });

         if (upsertError) throw new Error(upsertError.message);
      }

      const summary = {
         total_armada: upserts.length,
         with_iwkbu_data: upserts.filter(
            (row) => row.iwkbu_compliance_status !== "unknown",
         ).length,
         ready: upserts.filter((row) => row.reconciliation_status === "ready")
            .length,
         needs_review: upserts.filter(
            (row) => row.reconciliation_status === "needs_review",
         ).length,
         blocked: upserts.filter(
            (row) => row.reconciliation_status === "blocked",
         ).length,
         finished_at: new Date().toISOString(),
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
   } catch (error: any) {
      await admin
         .from("iwkbu_sync_runs")
         .update({
            status: "failed",
            finished_at: new Date().toISOString(),
            error_message: error?.message ?? "Unknown error",
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
            "id, trigger_type, status, started_at, finished_at, initiated_by, summary, error_message",
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
         (row: any) => row.reconciliation_status === "ready",
      ).length,
      needs_review: (statuses ?? []).filter(
         (row: any) => row.reconciliation_status === "needs_review",
      ).length,
      blocked: (statuses ?? []).filter(
         (row: any) => row.reconciliation_status === "blocked",
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
         ready: rows.filter((r: any) => r.reconciliation_status === "ready")
            .length,
         needs_review: rows.filter(
            (r: any) => r.reconciliation_status === "needs_review",
         ).length,
         blocked: rows.filter((r: any) => r.reconciliation_status === "blocked")
            .length,
      },
   };
}
