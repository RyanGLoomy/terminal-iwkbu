-- 0031_activity_logs_aksi_check.sql
--
-- Drift capture: CHECK constraint pada activity_logs.aksi untuk membatasi
-- nilai yang valid. NOT VALID karena ditambahkan setelah data ada (jika ada).
-- Akan divalidasi di migrasi 0034 (performance_and_schema).
-- Sudah diterapkan di live DB.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'activity_logs_aksi_check'
  ) THEN
    ALTER TABLE public.activity_logs
      ADD CONSTRAINT activity_logs_aksi_check
      CHECK (aksi = ANY (ARRAY[
        'SET_PIN', 'BUKA_SESI', 'TUTUP_SESI', 'INPUT_TRANSAKSI',
        'BUAT_TEMUAN', 'UPDATE_TEMUAN', 'KIRIM_KLARIFIKASI',
        'LOGIN', 'LOGIN_GAGAL', 'LOGOUT', 'UBAH_PASSWORD',
        'BUAT_USER', 'UPDATE_USER',
        'BUAT_TERMINAL', 'UPDATE_TERMINAL', 'HAPUS_TERMINAL',
        'BUAT_JENIS_KENDARAAN', 'UPDATE_JENIS_KENDARAAN', 'HAPUS_JENIS_KENDARAAN',
        'UPDATE_SETTINGS',
        'IMPORT_IWKBU', 'JALANKAN_SYNC',
        'TAMBAH_TINDAKAN', 'SELESAIKAN_TINDAKAN', 'BUKA_ULANG_TEMUAN',
        'BUAT_ARMADA', 'UPDATE_ARMADA', 'VERIFIKASI_ARMADA',
        'EDIT_PO', 'VERIFIKASI_PO',
        'PERIODE_REKONSILIASI',
        'VERIFIKASI_PIN', 'LOGOUT_SESI_PIN',
        'BUAT_PETUGAS_TERMINAL', 'UPDATE_PETUGAS_TERMINAL', 'HAPUS_PETUGAS_TERMINAL',
        'UPLOAD_DOKUMEN_ARMADA'
      ])) NOT VALID;
  END IF;
END $$;
