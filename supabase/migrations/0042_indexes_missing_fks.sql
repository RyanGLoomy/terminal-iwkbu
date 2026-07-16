-- ============================================================================
-- 0042_indexes_missing_fks.sql
--
-- M2 (MEDIUM): 12 foreign key tanpa covering index. FK columns yang tidak
-- di-index menyebabkan seq scan pada JOIN, dan lock escalation pada
-- cascade delete/update.
--
-- CONCURRENTLY tidak kompatibel dengan pipeline Supabase migrations.
-- Tabel saat ini 0 baris — CREATE INDEX biasa aman (instant, no lock).
-- Jika tabel sudah besar di produksi, gunakan CREATE INDEX CONCURRENTLY
-- via Supabase Dashboard SQL Editor (di luar transaction block).
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_armada_diverifikasi_oleh
  ON public.armada(diverifikasi_oleh);

CREATE INDEX IF NOT EXISTS idx_armada_dokumen_uploaded_by
  ON public.armada_dokumen(uploaded_by);

CREATE INDEX IF NOT EXISTS idx_finding_actions_created_by
  ON public.finding_actions(created_by);

CREATE INDEX IF NOT EXISTS idx_finding_actions_done_by
  ON public.finding_actions(done_by);

CREATE INDEX IF NOT EXISTS idx_finding_clarifications_responder
  ON public.finding_clarifications(responder_id);

CREATE INDEX IF NOT EXISTS idx_findings_resolved_by
  ON public.findings(resolved_by);

CREATE INDEX IF NOT EXISTS idx_iwkbu_sync_runs_initiated_by
  ON public.iwkbu_sync_runs(initiated_by);

CREATE INDEX IF NOT EXISTS idx_iwkbu_sync_runs_periode_id
  ON public.iwkbu_sync_runs(periode_id);

CREATE INDEX IF NOT EXISTS idx_petugas_pin_sessions_petugas_term
  ON public.petugas_pin_sessions(petugas_terminal_id);

CREATE INDEX IF NOT EXISTS idx_po_diverifikasi_oleh
  ON public.po(diverifikasi_oleh);

CREATE INDEX IF NOT EXISTS idx_periode_created_by
  ON public.rekonsiliasi_periode(created_by);

CREATE INDEX IF NOT EXISTS idx_system_settings_updated_by
  ON public.system_settings(updated_by);
