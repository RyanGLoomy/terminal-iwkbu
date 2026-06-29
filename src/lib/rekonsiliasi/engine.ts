/**
 * Mesin Rekonsiliasi (pure module).
 *
 * Pemilik tunggal aturan pemadanan data operasional terminal vs status IWKBU.
 * Pure: tidak mengimpor DB/HTTP/side-effect apa pun. Menerima data, mengembalikan
 * { rows, findings }. Dengan demikian interface-nya = test surface (lihat
 * engine.test.ts). Pemanggil (executeIwkbuSync) bertanggung jawab atas fetch,
 * baca DB, dan persist.
 *
 * Domain (lihat CONTEXT.md): Armada, PO, IWKBU, Rekonsiliasi, Temuan.
 *
 * Aturan emisi (keputusan grilling):
 *   reconciliationStatus == "ready"        -> tidak menghasilkan Temuan
 *   reconciliationStatus == "needs_review" -> ProposedFinding severity medium
 *   reconciliationStatus == "blocked"      -> ProposedFinding severity high
 */

export type ComplianceStatus =
   | "compliant"
   | "non_compliant"
   | "pending"
   | "unknown";

export type ReconciliationStatus = "ready" | "needs_review" | "blocked";

export interface ArmadaRecord {
   id: string;
   po_id: string;
   nomor_polisi: string;
   status_verifikasi: string;
   status_operasional: string;
   po?: {
      status_verifikasi: string;
      kode_po: string;
      nama_perusahaan: string;
   } | null;
}

export interface SourceRecord {
   nomor_polisi: string;
   compliance_status: ComplianceStatus;
   issue_count: number;
   source_updated_at: string | null;
   payload?: Record<string, unknown> | null;
}

/**
 * Temuan yang diusulkan oleh rekonsiliasi sebelum dipersist.
 * Pemanggil yang menentukan dedup & actor (created_by).
 */
export interface ProposedFinding {
   po_id: string;
   armada_id: string;
   nomor_polisi: string;
   judul: string;
   deskripsi: string;
   severity: "low" | "medium" | "high";
   source_type: "rekonsiliasi";
}

export interface ReconciliationRow {
   armada_id: string;
   po_id: string;
   nomor_polisi: string;
   iwkbu_compliance_status: ComplianceStatus;
   issue_count: number;
   source_updated_at: string | null;
   source_payload: Record<string, unknown>;
   terminal_last_seen: string | null;
   po_status_verifikasi: string | null;
   armada_status_verifikasi: string;
   armada_status_operasional: string;
   reconciliation_status: ReconciliationStatus;
   discrepancy_note: string | null;
}

export interface ReconciliationInput {
   armada: ArmadaRecord[];
   /** Dipetakan per normalizePlate(nomor_polisi). */
   sourceByPlate: Map<string, SourceRecord>;
   /** armada_id -> ISO timestamp (opsional). */
   terminalLastSeen?: Map<string, string>;
}

export interface ReconciliationOutput {
   rows: ReconciliationRow[];
   findings: ProposedFinding[];
}

/**
 * Normalisasi nomor polisi — kunci join seluruh mesin. Pemilik tunggal di sini
 * (sebelumnya diduplikasi 3 tempat). Konsisten: uppercase, hapus spasi, trim.
 */
export function normalizePlate(value: string | null | undefined): string {
   return (value ?? "").toUpperCase().replace(/\s+/g, "").trim();
}

interface ReconciliationDecision {
   iwkbuComplianceStatus: ComplianceStatus;
   reconciliationStatus: ReconciliationStatus;
   discrepancyNote: string | null;
   issueCount: number;
   sourceUpdatedAt: string | null;
   sourcePayload: Record<string, unknown>;
}

function buildReconciliation(
   armada: ArmadaRecord,
   source: SourceRecord | undefined,
): ReconciliationDecision {
   const iwkbuStatus: ComplianceStatus = source?.compliance_status ?? "unknown";
   const issueCount = source?.issue_count ?? 0;

   const reasons: string[] = [];
   if (!source) reasons.push("data IWKBU belum tersedia");
   if (armada.po?.status_verifikasi !== "aktif") reasons.push("PO belum aktif");
   if (armada.status_verifikasi !== "terverifikasi")
      reasons.push("armada belum terverifikasi");
   if (armada.status_operasional !== "aktif") reasons.push("armada tidak aktif");
   if (iwkbuStatus === "non_compliant")
      reasons.push("status IWKBU non-compliant");
   if (iwkbuStatus === "pending") reasons.push("status IWKBU pending");

   let reconciliationStatus: ReconciliationStatus = "needs_review";

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

/**
 * Inti mesin: memadankan armada vs source IWKBU, menghasilkan baris status
 * (untuk iwkbu_sync_status) DAN ProposedFinding (edge yang sebelumnya hilang).
 */
export function reconcile(input: ReconciliationInput): ReconciliationOutput {
   const rows: ReconciliationRow[] = [];
   const findings: ProposedFinding[] = [];

   for (const armada of input.armada) {
      const source = input.sourceByPlate.get(normalizePlate(armada.nomor_polisi));
      const decision = buildReconciliation(armada, source);

      rows.push({
         armada_id: armada.id,
         po_id: armada.po_id,
         nomor_polisi: armada.nomor_polisi,
         iwkbu_compliance_status: decision.iwkbuComplianceStatus,
         issue_count: decision.issueCount,
         source_updated_at: decision.sourceUpdatedAt,
         source_payload: decision.sourcePayload,
         terminal_last_seen: input.terminalLastSeen?.get(armada.id) ?? null,
         po_status_verifikasi: armada.po?.status_verifikasi ?? null,
         armada_status_verifikasi: armada.status_verifikasi,
         armada_status_operasional: armada.status_operasional,
         reconciliation_status: decision.reconciliationStatus,
         discrepancy_note: decision.discrepancyNote,
      });

      if (decision.reconciliationStatus !== "ready") {
         findings.push({
            po_id: armada.po_id,
            armada_id: armada.id,
            nomor_polisi: armada.nomor_polisi,
            judul: `Diskrepansi IWKBU: ${armada.nomor_polisi}`,
            deskripsi: decision.discrepancyNote ?? "Ketidaksesuaian hasil rekonsiliasi",
            severity: decision.reconciliationStatus === "blocked" ? "high" : "medium",
            source_type: "rekonsiliasi",
         });
      }
   }

   return { rows, findings };
}
