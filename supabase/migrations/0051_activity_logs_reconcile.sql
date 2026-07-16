-- 0051_activity_logs_reconcile.sql
--
-- C1 (CRITICAL): Menutup pintu pemalsuan audit log. Migrasi 0023 membuka
--     kembali GRANT INSERT + policy activity_logs_user_insert_own yang
--     memungkinkan client authenticated menyisipkan baris audit palsu
--     (aksi dari whitelist CHECK, deskripsi/metadata arbitrer) langsung via
--     PostgREST. Migrasi 0049 hanya me-revoke EXECUTE pada fungsi
--     log_activity(); tidak menyentuh grant/policy level tabel. Path trigger
--     (fn_log_* SECURITY DEFINER, owned by postgres) dan path admin
--     (service_role, BYPASSRLS) tidak terpengaruh oleh revoke di bawah.
--
-- C2 (CRITICAL drift): Migrasi 0031 membuat constraint activity_logs_aksi_check
--     (TANPA 'HAPUS_TRANSAKSI'), kemudian divalidasi di 0034. Migrasi 0037
--     menjalankan `DROP CONSTRAINT chk_activity_logs_aksi` — nama dengan
--     prefix `chk_` yang TIDAK ADA — sehingga DROP adalah no-op, lalu ADD
--     constraint kedua `chk_activity_logs_aksi` (dengan HAPUS_TRANSAKSI). Di
--     live hanya `chk_activity_logs_aksi` ada (patch manual). Namun fresh
--     `db reset` meninggalkan KEDUA constraint; CHECK digabung dengan AND
--     sehingga constraint lama yang restriktif menang → trigger
--     fn_log_hapus_transaksi_* gagal CHECK → setiap DELETE pada
--     kendaraan_masuk/kendaraan_keluar rollback. Fix: drop constraint stale
--     sehingga hanya chk_activity_logs_aksi tersisa.

-- ============================================================
-- C1: Tutup path insert/update/delete/truncate langsung dari client.
-- ============================================================
DROP POLICY IF EXISTS activity_logs_user_insert_own ON public.activity_logs;

-- Revoke write privileges dari authenticated & anon. SELECT tetap untuk
-- authenticated (policy admin_select_all_logs / users_select_own_log).
-- service_role bypass RLS dan tidak terpengaruh. REVOKE idempotent.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.activity_logs FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.activity_logs FROM anon;

-- ============================================================
-- C2: Drop stale constraint (hanya ada di replay path fresh reset).
--     chk_activity_logs_aksi (lengkap, termasuk HAPUS_TRANSAKSI) tetap.
-- ============================================================
ALTER TABLE public.activity_logs DROP CONSTRAINT IF EXISTS activity_logs_aksi_check;
