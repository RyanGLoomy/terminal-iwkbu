-- ============================================================================
-- 0037_aksi_add_hapus_transaksi.sql
--
-- C1 (CRITICAL): Trigger fn_log_hapus_transaksi_masuk/keluar insert
-- aksi='HAPUS_TRANSAKSI' ke activity_logs, tapi nilai tersebut tidak ada
-- di chk_activity_logs_aksi. Akibatnya setiap DELETE pada kendaraan_masuk
-- atau kendaraan_keluar gagal (AFTER DELETE trigger → CHECK violation →
-- rollback transaksi).
--
-- Fix: tambahkan 'HAPUS_TRANSAKSI' ke daftar nilai yang diizinkan.
-- ============================================================================

ALTER TABLE public.activity_logs
  DROP CONSTRAINT chk_activity_logs_aksi,
  ADD CONSTRAINT chk_activity_logs_aksi CHECK (
    aksi = ANY (ARRAY[
      'SET_PIN',
      'BUKA_SESI',
      'TUTUP_SESI',
      'INPUT_TRANSAKSI',
      'BUAT_TEMUAN',
      'UPDATE_TEMUAN',
      'KIRIM_KLARIFIKASI',
      'LOGIN',
      'LOGIN_GAGAL',
      'LOGOUT',
      'UBAH_PASSWORD',
      'BUAT_USER',
      'UPDATE_USER',
      'BUAT_TERMINAL',
      'UPDATE_TERMINAL',
      'HAPUS_TERMINAL',
      'BUAT_JENIS_KENDARAAN',
      'UPDATE_JENIS_KENDARAAN',
      'HAPUS_JENIS_KENDARAAN',
      'UPDATE_SETTINGS',
      'IMPORT_IWKBU',
      'JALANKAN_SYNC',
      'TAMBAH_TINDAKAN',
      'SELESAIKAN_TINDAKAN',
      'BUKA_ULANG_TEMUAN',
      'BUAT_ARMADA',
      'UPDATE_ARMADA',
      'VERIFIKASI_ARMADA',
      'EDIT_PO',
      'VERIFIKASI_PO',
      'PERIODE_REKONSILIASI',
      'VERIFIKASI_PIN',
      'LOGOUT_SESI_PIN',
      'BUAT_PETUGAS_TERMINAL',
      'UPDATE_PETUGAS_TERMINAL',
      'HAPUS_PETUGAS_TERMINAL',
      'UPLOAD_DOKUMEN_ARMADA',
      'HAPUS_TRANSAKSI'
    ])
  );
