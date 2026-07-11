-- 0029_rls_admin_terminal_scope.sql
-- R4 (MEDIUM): policy SELECT admin-terminal pada kendaraan_masuk,
-- kendaraan_keluar, dan sesi_petugas TIDAK scope-per-terminal
-- (`is_admin_terminal(auth.uid())` tanpa batasan terminal). Sebelumnya aman
-- karena route API memfilter via resolveTerminalId, tapi query browser
-- langsung (konsol) membocorkan data lintas-terminal.
--
-- Aman diperketat: RPC server (get_admin_terminal_stats, get_admin_rekap_harian,
-- get_rekap_sesi) sudah memfilter `sp.terminal_id = p_terminal_id` dan route
-- meneruskan terminal_id dari profile admin sendiri -> RLS mengizinkan tepat
-- baris terminal itu.

-- kendaraan_masuk: admin-terminal hanya lihat transaksi di terminalnya
DROP POLICY IF EXISTS "all_roles_select_masuk" ON public.kendaraan_masuk;
CREATE POLICY "all_roles_select_masuk" ON public.kendaraan_masuk
  FOR SELECT TO authenticated USING (
    petugas_id = auth.uid()
    OR public.is_staf_iw(auth.uid())
    OR (
      public.is_admin_terminal(auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.sesi_petugas sp
        WHERE sp.id = kendaraan_masuk.sesi_id
          AND sp.terminal_id = (
            SELECT profiles.terminal_id
            FROM public.profiles
            WHERE profiles.id = auth.uid()
          )
      )
    )
  );

-- kendaraan_keluar: pola sama, sesi via kk.sesi_id
DROP POLICY IF EXISTS "all_roles_select_keluar" ON public.kendaraan_keluar;
CREATE POLICY "all_roles_select_keluar" ON public.kendaraan_keluar
  FOR SELECT TO authenticated USING (
    petugas_id = auth.uid()
    OR public.is_staf_iw(auth.uid())
    OR (
      public.is_admin_terminal(auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.sesi_petugas sp
        WHERE sp.id = kendaraan_keluar.sesi_id
          AND sp.terminal_id = (
            SELECT profiles.terminal_id
            FROM public.profiles
            WHERE profiles.id = auth.uid()
          )
      )
    )
  );

-- sesi_petugas: admin-terminal hanya lihat sesi di terminalnya
DROP POLICY IF EXISTS "admin_select_sesi" ON public.sesi_petugas;
CREATE POLICY "admin_select_sesi" ON public.sesi_petugas
  FOR SELECT TO authenticated USING (
    petugas_id = auth.uid()
    OR public.is_staf_iw(auth.uid())
    OR (
      public.is_admin_terminal(auth.uid())
      AND terminal_id = (
        SELECT profiles.terminal_id
        FROM public.profiles
        WHERE profiles.id = auth.uid()
      )
    )
  );
