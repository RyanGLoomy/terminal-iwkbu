-- 0031_activity_logs_aksi_check.sql
-- R6 (MEDIUM): activity_logs.aksi adalah text bebas. Setelah 0019/0023,
-- pengguna bisa insert sendiri via RPC log_activity (SECURITY INVOKER,
-- activity_logs_user_insert_own membatasi user_id = auth.uid()). Walaupun
-- user_id tidak bisa dipalsukan, nilai aksi bisa — CHECK ini membatasi
-- kosakata ke enum AksiLog yang dikenal (operasional.types.ts).
--
-- NOT VALID: baris eksisting tidak diperiksa (mungkin ada nilai legacy).
-- Baris baru/diverifikasi nanti. Pertahankan sinkron dengan tipe AksiLog
-- (operasional.types.ts) saat menambah aksi baru.

ALTER TABLE public.activity_logs
  ADD CONSTRAINT chk_activity_logs_aksi CHECK (
    aksi IN (
      'SET_PIN', 'BUKA_SESI', 'TUTUP_SESI', 'INPUT_TRANSAKSI',
      'BUAT_TEMUAN', 'UPDATE_TEMUAN', 'KIRIM_KLARIFIKASI',
      'LOGIN', 'LOGIN_GAGAL', 'LOGOUT', 'UBAH_PASSWORD',
      'BUAT_USER', 'UPDATE_USER', 'BUAT_TERMINAL', 'UPDATE_TERMINAL',
      'HAPUS_TERMINAL', 'BUAT_JENIS_KENDARAAN', 'UPDATE_JENIS_KENDARAAN',
      'HAPUS_JENIS_KENDARAAN', 'UPDATE_SETTINGS', 'IMPORT_IWKBU',
      'JALANKAN_SYNC', 'TAMBAH_TINDAKAN', 'SELESAIKAN_TINDAKAN',
      'BUKA_ULANG_TEMUAN', 'BUAT_ARMADA', 'UPDATE_ARMADA',
      'VERIFIKASI_ARMADA', 'EDIT_PO', 'VERIFIKASI_PO',
      'PERIODE_REKONSILIASI', 'VERIFIKASI_PIN', 'LOGOUT_SESI_PIN',
      'BUAT_PETUGAS_TERMINAL', 'UPDATE_PETUGAS_TERMINAL',
      'HAPUS_PETUGAS_TERMINAL', 'UPLOAD_DOKUMEN_ARMADA'
    )
  ) NOT VALID;
