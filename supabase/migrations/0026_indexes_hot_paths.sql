-- 0026_indexes_hot_paths.sql
-- I1-I5: index pada kolom hot-path yang hilang. Diverifikasi statis dari
-- 0001 (hanya ada idx_kendaraan_masuk_sesi/petugas, idx_kendaraan_keluar_masuk,
-- idx_findings_po/status) vs. pola .eq()/.order()/.gte()/.lte() di query
-- modules + body RPC.
--
-- Catatan: CREATE INDEX non-concurrent (mengikuti konvensi 0001). Tabel
-- aplikasi berukuran ribuan baris -> build sub-detik. Untuk tabel besar di
-- produksi, jalankan varian CONCURRENTLY secara manual.

-- I1: kolom range/order terpanas (semua dashboard & rekap memfilter ini)
CREATE INDEX IF NOT EXISTS idx_kendaraan_masuk_waktu_masuk
  ON public.kendaraan_masuk (waktu_masuk DESC);
CREATE INDEX IF NOT EXISTS idx_kendaraan_keluar_waktu_keluar
  ON public.kendaraan_keluar (waktu_keluar DESC);

-- I2: dedup finding iwkbu-sync + keamanan lock FK (findings.armada_id ON DELETE SET NULL)
CREATE INDEX IF NOT EXISTS idx_findings_armada_id
  ON public.findings (armada_id);
CREATE INDEX IF NOT EXISTS idx_findings_source_status
  ON public.findings (source_type, status);

-- I3: keamanan lock FK (kendaraan_masuk.armada_id ON DELETE RESTRICT) + join terminalLastSeen
CREATE INDEX IF NOT EXISTS idx_kendaraan_masuk_armada_id
  ON public.kendaraan_masuk (armada_id);

-- I4: filter/join sekunder
CREATE INDEX IF NOT EXISTS idx_kendaraan_masuk_po_id
  ON public.kendaraan_masuk (po_id);
CREATE INDEX IF NOT EXISTS idx_kendaraan_masuk_petugas_waktu
  ON public.kendaraan_masuk (petugas_id, waktu_masuk DESC);
CREATE INDEX IF NOT EXISTS idx_kendaraan_keluar_sesi
  ON public.kendaraan_keluar (sesi_id);
CREATE INDEX IF NOT EXISTS idx_kendaraan_keluar_petugas_waktu
  ON public.kendaraan_keluar (petugas_id, waktu_keluar DESC);
CREATE INDEX IF NOT EXISTS idx_sesi_petugas_petugas_status
  ON public.sesi_petugas (petugas_id, status, waktu_mulai DESC);
CREATE INDEX IF NOT EXISTS idx_finding_clarifications_finding_id
  ON public.finding_clarifications (finding_id);
CREATE INDEX IF NOT EXISTS idx_findings_created_by
  ON public.findings (created_by);
CREATE INDEX IF NOT EXISTS idx_iwkbu_sync_status_po_id
  ON public.iwkbu_sync_status (po_id);
CREATE INDEX IF NOT EXISTS idx_iwkbu_sync_status_recon_status
  ON public.iwkbu_sync_status (reconciliation_status);

-- I5: kolom yang dipakai subquery helper RLS (berjalan per-baris RLS)
CREATE INDEX IF NOT EXISTS idx_profiles_terminal_id
  ON public.profiles (terminal_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id
  ON public.user_roles (role_id);
