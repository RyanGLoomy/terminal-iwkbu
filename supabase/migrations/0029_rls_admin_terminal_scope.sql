-- 0029_rls_admin_terminal_scope.sql
--
-- Drift capture: Scope admin_terminal SELECT ke terminal sendiri.
-- Sebelumnya admin_terminal bisa melihat SEMUA kendaraan_masuk/keluar/sesi
-- di semua terminal. Sekarang hanya terminal miliknya (profiles.terminal_id).
--
-- Juga mempersempit role dari {public} ke {authenticated} untuk policy SELECT.
-- Sudah diterapkan di live DB.

-- kendaraan_masuk: scope admin_terminal ke terminal sendiri
DROP POLICY IF EXISTS "all_roles_select_masuk" ON public.kendaraan_masuk;
CREATE POLICY "all_roles_select_masuk" ON public.kendaraan_masuk
  FOR SELECT TO authenticated
  USING (
    petugas_id = auth.uid()
    OR is_staf_iw(auth.uid())
    OR (
      is_admin_terminal(auth.uid())
      AND EXISTS (
        SELECT 1 FROM sesi_petugas sp
        WHERE sp.id = kendaraan_masuk.sesi_id
          AND sp.terminal_id = (
            SELECT profiles.terminal_id FROM profiles
            WHERE profiles.id = auth.uid()
          )
      )
    )
  );

-- kendaraan_keluar: scope admin_terminal ke terminal sendiri
DROP POLICY IF EXISTS "all_roles_select_keluar" ON public.kendaraan_keluar;
CREATE POLICY "all_roles_select_keluar" ON public.kendaraan_keluar
  FOR SELECT TO authenticated
  USING (
    petugas_id = auth.uid()
    OR is_staf_iw(auth.uid())
    OR (
      is_admin_terminal(auth.uid())
      AND EXISTS (
        SELECT 1 FROM sesi_petugas sp
        WHERE sp.id = kendaraan_keluar.sesi_id
          AND sp.terminal_id = (
            SELECT profiles.terminal_id FROM profiles
            WHERE profiles.id = auth.uid()
          )
      )
    )
  );

-- sesi_petugas: scope admin_terminal ke terminal sendiri
DROP POLICY IF EXISTS "admin_select_sesi" ON public.sesi_petugas;
CREATE POLICY "admin_select_sesi" ON public.sesi_petugas
  FOR SELECT TO authenticated
  USING (
    petugas_id = auth.uid()
    OR is_staf_iw(auth.uid())
    OR (
      is_admin_terminal(auth.uid())
      AND terminal_id = (
        SELECT profiles.terminal_id FROM profiles
        WHERE profiles.id = auth.uid()
      )
    )
  );
