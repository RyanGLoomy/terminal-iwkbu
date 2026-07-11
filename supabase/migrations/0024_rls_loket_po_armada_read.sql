-- 0024_rls_loket_po_armada_read.sql
-- S1/R1 (BLOCKER): peran loket tidak punya policy SELECT apa pun pada `po`
-- maupun `armada`, sehingga alur inti pencatatan kendaraan (listActivePOs,
-- searchArmadaByNopol) selalu kosong/null di bawah RLS dan transaksi/masuk
-- selalu 404 ("Armada tidak ditemukan").
--
-- Loket perlu MEMBACA PO aktif + armada terverifikasi untuk memilih PO dan
-- mencari plat. PO/armada tidak scope-per-terminal (armada PO terverifikasi
-- boleh masuk terminal mana pun), jadi cukup dibatasi status.

-- Loket dapat melihat daftar PO yang sudah aktif (untuk dropdown pemilihan PO).
CREATE POLICY "loket_select_active_po" ON public.po
  FOR SELECT TO authenticated
  USING (
    public.is_loket(auth.uid())
    AND status_verifikasi = 'aktif'
  );

-- Loket dapat mencari armada yang sudah terverifikasi & operasional aktif
-- (untuk pencarian nomor polisi saat catat transaksi masuk).
CREATE POLICY "loket_select_verified_armada" ON public.armada
  FOR SELECT TO authenticated
  USING (
    public.is_loket(auth.uid())
    AND status_verifikasi = 'terverifikasi'
    AND status_operasional = 'aktif'
  );
