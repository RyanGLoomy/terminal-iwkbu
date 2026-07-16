-- 0046_fk_integrity_preserve_records.sql
--
-- H2: NOT NULL + ON DELETE SET NULL = konflik. activity_logs.user_id,
--     findings.created_by, finding_actions.created_by adalah NOT NULL tetapi
--     FK-nya ON DELETE SET NULL. Saat user dihapus, SET NULL gagal karena
--     kolom NOT NULL -> constraint violation -> delete gagal seluruhnya
--     (kebalik dari tujuan 0044 "preserve audit trail").
--     Fix: DROP NOT NULL agar SET NULL berhasil.
--
-- H3: kendaraan_masuk/keluar + sesi_petugas .petugas_id FK ON DELETE CASCADE.
--     Hapus user -> transaksi operasional/finansial hilang.
--     Fix: CASCADE -> SET NULL + DROP NOT NULL agar transaksi selamat.

-- ============================================================
-- H2: DROP NOT NULL on audit/finding actor columns (SET NULL can work)
-- ============================================================
ALTER TABLE public.activity_logs ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.findings ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.finding_actions ALTER COLUMN created_by DROP NOT NULL;

-- ============================================================
-- H3: CASCADE -> SET NULL on operational transaction FKs
-- ============================================================
ALTER TABLE public.sesi_petugas
  DROP CONSTRAINT sesi_petugas_petugas_id_fkey,
  ADD CONSTRAINT sesi_petugas_petugas_id_fkey
    FOREIGN KEY (petugas_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.sesi_petugas ALTER COLUMN petugas_id DROP NOT NULL;

ALTER TABLE public.kendaraan_masuk
  DROP CONSTRAINT kendaraan_masuk_petugas_id_fkey,
  ADD CONSTRAINT kendaraan_masuk_petugas_id_fkey
    FOREIGN KEY (petugas_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.kendaraan_masuk ALTER COLUMN petugas_id DROP NOT NULL;

ALTER TABLE public.kendaraan_keluar
  DROP CONSTRAINT kendaraan_keluar_petugas_id_fkey,
  ADD CONSTRAINT kendaraan_keluar_petugas_id_fkey
    FOREIGN KEY (petugas_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.kendaraan_keluar ALTER COLUMN petugas_id DROP NOT NULL;
