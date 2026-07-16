-- ============================================================================
-- 0038_petugas_pin_sessions_dedupe.sql
--
-- C2 (CRITICAL): petugas_pin_sessions punya 5 policy PERMISSIVE pada
-- TO public. Policy petugas_pin_sessions_self (FOR ALL, is_loket gate)
-- ter-shadow sepenuhnya oleh 4 policy users_*_own_pin_session (per-command,
-- hanya cek user_id = auth.uid()). Karena PERMISSIVE policy di-OR-kan,
-- is_loket tidak pernah dievaluasi — setiap user authenticated bisa
-- membuat/mengubah/menghapus pin session sendiri.
--
-- Fix (defense-in-depth):
-- 1. DROP petugas_pin_sessions_self (FOR ALL PERMISSIVE — redundan).
-- 2. Tambah 3 policy RESTRICTIVE untuk INSERT/UPDATE/DELETE yang
--    mengharuskan is_loket(auth.uid()). RESTRICTIVE policy di-AND-kan
--    dengan PERMISSIVE, sehingga gate is_loket menjadi efektif untuk
--    write, sementara SELECT tetap terbuka untuk semua user (own row).
--
-- Hasil:
--   SELECT  → user_id = auth.uid() (PERMISSIVE saja)
--   INSERT  → user_id = auth.uid() AND is_loket(auth.uid())
--   UPDATE  → user_id = auth.uid() AND is_loket(auth.uid())
--   DELETE  → user_id = auth.uid() AND is_loket(auth.uid())
-- ============================================================================

-- 1. Hapus policy FOR ALL yang ter-shadow
DROP POLICY IF EXISTS petugas_pin_sessions_self ON public.petugas_pin_sessions;

-- 2. Gate RESTRICTIVE: hanya loket yang boleh write
CREATE POLICY pin_session_loket_insert
  ON public.petugas_pin_sessions
  AS RESTRICTIVE FOR INSERT TO public
  WITH CHECK (is_loket(auth.uid()));

CREATE POLICY pin_session_loket_update
  ON public.petugas_pin_sessions
  AS RESTRICTIVE FOR UPDATE TO public
  USING (is_loket(auth.uid()))
  WITH CHECK (is_loket(auth.uid()));

CREATE POLICY pin_session_loket_delete
  ON public.petugas_pin_sessions
  AS RESTRICTIVE FOR DELETE TO public
  USING (is_loket(auth.uid()));
