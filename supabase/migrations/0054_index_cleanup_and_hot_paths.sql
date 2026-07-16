-- 0054_index_cleanup_and_hot_paths.sql
--
-- M4 (MEDIUM): 3 index benar-benar redundan (bukan false-positive cold
--     cache). Setiap kolom sudah dilayani oleh UNIQUE constraint atau
--     composite index yang ada:
--       idx_kendaraan_keluar_masuk (masuk_id)        ← UNIQUE kendaraan_keluar_masuk_id_key
--       idx_kendaraan_masuk_petugas (petugas_id)     ← idx_kendaraan_masuk_petugas_waktu (petugas_id, waktu_masuk DESC)
--       idx_armada_po_id (po_id)                     ← UNIQUE armada_po_id_nomor_polisi_key (po_id, nomor_polisi)
--
-- M5 (MEDIUM): 2 composite index untuk hot query yang akan muncul saat
--     produksi:
--       findings (po_id, status)         — dashboard PO "temuan saya yang terbuka"
--       activity_logs (user_id, created_at DESC) — own-log range scan
--
-- Catatan: composite ini juga mensubsumsi idx_findings_po & idx_activity_logs_user
-- (leftmost-prefix), tapi index single-column itu dipertahankan dulu karena
-- tabel masih 0 baris dan drop tidak mendapat apa-apa; bisa di-drop nanti.
--
-- Konvensi: CREATE INDEX biasa (bukan CONCURRENTLY) mengikuti 0026/0042 —
-- aman pada volume saat ini; Supabase migration berjalan dalam transaksi
-- sehingga CONCURRENTLY tidak dapat digunakan.

-- ============================================================
-- M4: Drop 3 index redundan
-- ============================================================
DROP INDEX IF EXISTS public.idx_kendaraan_keluar_masuk;
DROP INDEX IF EXISTS public.idx_kendaraan_masuk_petugas;
DROP INDEX IF EXISTS public.idx_armada_po_id;

-- ============================================================
-- M5: Tambah 2 composite index untuk hot path
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_findings_po_status
  ON public.findings (po_id, status);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_created
  ON public.activity_logs (user_id, created_at DESC);
