export type SesiStatus = "aktif" | "selesai";

export interface ShiftSession {
   id: string;
   petugas_id: string | null;
   terminal_id: string | null;
   waktu_mulai: string;
   waktu_selesai: string | null;
   status: SesiStatus;
   total_transaksi_masuk: number;
   total_transaksi_keluar: number;
   total_nominal: number;
   created_at: string;
}

export interface AdminTerminalStats {
   total_masuk: number;
   total_keluar: number;
   sesi_aktif: number;
   total_petugas: number;
}

export interface AdminRekapRow {
   masuk_id: string;
   nomor_polisi: string;
   waktu_masuk: string;
   waktu_keluar: string | null;
   petugas_nama: string | null;
   po_kode: string;
   po_nama: string;
   armada_merk: string | null;
   armada_tipe: string | null;
   armada_lambung: string | null;
}

export interface KendaraanMasuk {
   id: string;
   sesi_id: string;
   petugas_id: string | null;
   armada_id: string;
   po_id: string;
   nomor_polisi: string;
   waktu_masuk: string;
   created_at: string;
}

export interface KendaraanKeluar {
   id: string;
   sesi_id: string;
   petugas_id: string | null;
   masuk_id: string;
   waktu_keluar: string;
   created_at: string;
}

export interface ActivePO {
   id: string;
   kode_po: string;
   nama_perusahaan: string;
}

export interface ActiveMasuk {
   id: string;
   sesi_id: string;
   petugas_id: string | null;
   nomor_polisi: string;
   waktu_masuk: string;
   po: {
      kode_po: string;
      nama_perusahaan: string;
   } | null;
   armada: {
      nomor_lambung: string | null;
      merk: string | null;
      tipe: string | null;
   } | null;
}

export interface PinSession {
   user_id: string;
   verified_at: string;
   expires_at: string;
   updated_at: string;
   petugas_terminal_id: string | null;
   petugas_nama: string | null;
}

export interface PinVerifyResult {
   verified: boolean;
   petugas_id: string | null;
   petugas_nama: string | null;
}

export interface RekapHarianRow {
   id: string;
   nomor_polisi: string;
   waktu_masuk: string;
   waktu_keluar: string | null;
   po: {
      kode_po: string;
      nama_perusahaan: string;
   } | null;
   armada: {
      nomor_lambung: string | null;
      merk: string | null;
      tipe: string | null;
   } | null;
}

// Sprint 4: Rekap Sesi
export interface RekapSesiRow {
   sesi_id: string;
   petugas_id: string | null;
   petugas_nama: string;
   terminal_id: string;
   waktu_mulai: string;
   waktu_selesai: string | null;
   status: SesiStatus;
   total_transaksi_masuk: number;
   total_transaksi_keluar: number;
   total_nominal: number;
}

export interface DetailSesiRow {
   masuk_id: string;
   nomor_polisi: string;
   waktu_masuk: string;
   waktu_keluar: string | null;
   po_kode: string;
   po_nama: string;
   armada_merk: string | null;
   armada_tipe: string | null;
   armada_lambung: string | null;
}

// Sprint 4: Activity Log
export type AksiLog =
   | "SET_PIN"
   | "BUKA_SESI"
   | "TUTUP_SESI"
   | "INPUT_TRANSAKSI"
   | "BUAT_TEMUAN"
   | "UPDATE_TEMUAN"
   | "KIRIM_KLARIFIKASI"
   | "LOGIN"
   | "LOGIN_GAGAL"
   | "LOGOUT"
   | "UBAH_PASSWORD"
   | "BUAT_USER"
   | "UPDATE_USER"
   | "BUAT_TERMINAL"
   | "UPDATE_TERMINAL"
   | "HAPUS_TERMINAL"
   | "BUAT_JENIS_KENDARAAN"
   | "UPDATE_JENIS_KENDARAAN"
   | "HAPUS_JENIS_KENDARAAN"
   | "UPDATE_SETTINGS"
   | "IMPORT_IWKBU"
   | "JALANKAN_SYNC"
   | "TAMBAH_TINDAKAN"
   | "SELESAIKAN_TINDAKAN"
   | "BUKA_ULANG_TEMUAN"
   | "BUAT_ARMADA"
   | "UPDATE_ARMADA"
   | "VERIFIKASI_ARMADA"
   | "EDIT_PO"
   | "VERIFIKASI_PO"
   | "PERIODE_REKONSILIASI"
   | "VERIFIKASI_PIN"
   | "LOGOUT_SESI_PIN"
   | "BUAT_PETUGAS_TERMINAL"
   | "UPDATE_PETUGAS_TERMINAL"
   | "HAPUS_PETUGAS_TERMINAL"
   | "UPLOAD_DOKUMEN_ARMADA";

export interface ActivityLog {
   id: string;
   user_id: string | null;
   user_name: string;
   aksi: AksiLog;
   deskripsi: string | null;
   metadata: Record<string, unknown>;
   created_at: string;
}

export type FindingStatus = "open" | "on_progress" | "closed";
export type FindingSeverity = "low" | "medium" | "high";
export type ClarificationDecision = "menerima" | "menolak" | "melengkapi";

export interface FindingClarification {
   id: string;
   finding_id: string;
   responder_id: string;
   responder_role: "po" | "staf-iw";
   decision: ClarificationDecision;
   message: string;
   evidence: Record<string, unknown>;
   created_at: string;
}

export interface FindingAction {
   id: string;
   finding_id: string;
   action_text: string;
   status: "open" | "done";
   done_at: string | null;
   done_by: string | null;
   created_by: string | null;
   created_at: string;
}

export interface FindingRecord {
   id: string;
   po_id: string;
   armada_id: string | null;
   nomor_polisi: string;
   source_type: "rekonsiliasi" | "manual" | "audit";
   judul: string;
   deskripsi: string;
   severity: FindingSeverity;
   status: FindingStatus;
   source_date: string | null;
   due_date: string | null;
   created_by: string | null;
   resolved_by: string | null;
   resolved_at: string | null;
   resolution_note: string | null;
   created_at: string;
   updated_at: string;
   periode_id: string | null;
   po?: {
      kode_po: string;
      nama_perusahaan: string;
   } | null;
   armada?: {
      nomor_polisi: string;
      nomor_lambung: string | null;
      status_verifikasi: string;
      status_operasional: string;
   } | null;
   finding_clarifications?: FindingClarification[];
   finding_actions?: FindingAction[];
}

// Sprint 4: Petugas Dashboard Stats (from RPC)
export interface PetugasDashboardRPC {
   sesi_aktif: {
      id: string;
      waktu_mulai: string;
      status: SesiStatus;
      terminal_id: string;
   } | null;
   total_masuk_hari_ini: number;
   total_keluar_hari_ini: number;
   total_transaksi_hari_ini: number;
}

// Sprint 5: Weekly Trend Data
export interface DailyTrendRow {
   tanggal: string; // YYYY-MM-DD
   label: string; // e.g. "Sen", "Sel"
   masuk: number;
   keluar: number;
   total: number;
}

export interface TerminalReportSummary {
   total_masuk: number;
   total_keluar: number;
   masih_di_terminal: number;
   jumlah_po: number;
   jumlah_petugas: number;
   jumlah_armada: number;
}

export interface TerminalReportPoRow {
   po_kode: string;
   po_nama: string;
   total_masuk: number;
   total_keluar: number;
   di_terminal: number;
}

export interface TerminalReportPetugasRow {
   petugas_nama: string;
   total_masuk: number;
   total_keluar: number;
   di_terminal: number;
}

export interface TerminalReportArmadaRow {
   nomor_polisi: string;
   po_kode: string;
   po_nama: string;
   armada_label: string;
   total_masuk: number;
   total_keluar: number;
   di_terminal: number;
}

export interface TerminalReportPeriodRow {
   period_key: string;
   label: string;
   total_masuk: number;
   total_keluar: number;
   di_terminal: number;
}

export interface TerminalReport {
   terminal_id: string;
   start_date: string;
   end_date: string;
   rows: AdminRekapRow[];
   summary: TerminalReportSummary;
   per_po: TerminalReportPoRow[];
   per_petugas: TerminalReportPetugasRow[];
   per_armada: TerminalReportArmadaRow[];
   per_hari: TerminalReportPeriodRow[];
   per_minggu: TerminalReportPeriodRow[];
   per_bulan: TerminalReportPeriodRow[];
}

export interface JenisKendaraan {
   id: string;
   nama: string;
   kode: string;
   keterangan: string | null;
   urutan: number;
   is_active: boolean;
   created_at: string;
   updated_at: string;
}

export interface SystemSetting {
   key: string;
   value: string;
   description: string | null;
   category: string;
   updated_at: string;
   updated_by: string | null;
}
