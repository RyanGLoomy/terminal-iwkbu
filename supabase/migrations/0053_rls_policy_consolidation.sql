-- 0053_rls_policy_consolidation.sql
--
-- M1 (MEDIUM): 11 tabel memiliki multiple permissive policies untuk role +
--     command yang sama (lihat advisor `multiple_permissive_policies`).
--     Postgres mengevaluasi SEMUA policy permissive (OR) per baris, jadi
--     N policy = N predikat dievaluasi. Merge menjadi 1 policy per command
--     dengan OR eksplisit menghilangkan warning & merapikan surface, tanpa
--     mengubah semantik akses.
--
-- M2 (MEDIUM): rekonsiliasi_periode.po_view_periode USING (true) → semua
--     user authenticated (termasuk loket) bisa membaca periode rekonsiliasi
--     (financial close windows). Dipersempit ke PO + staf + admin.
--
-- Pola auth.uid(): (select auth.uid()) sesuai 0041 (initplan cache).
-- Semantika SETIAP policy diawetikan persis — hanya struktur yang diubah.

-- ============================================================
-- activity_logs — SELECT (2 → 1)
-- ============================================================
DROP POLICY IF EXISTS admin_select_all_logs ON public.activity_logs;
DROP POLICY IF EXISTS users_select_own_log ON public.activity_logs;

CREATE POLICY activity_logs_select_consolidated ON public.activity_logs
  FOR SELECT TO authenticated
  USING (
         user_id = (select auth.uid())
      OR is_admin_terminal()
      OR is_staf_iw()
  );

-- ============================================================
-- armada — SELECT (4 → 1)
-- ============================================================
DROP POLICY IF EXISTS "Admin Terminal can view all armada" ON public.armada;
DROP POLICY IF EXISTS "PO can view own armada" ON public.armada;
DROP POLICY IF EXISTS "Staf IW can view all armada" ON public.armada;
DROP POLICY IF EXISTS loket_select_verified_armada ON public.armada;

CREATE POLICY armada_select_consolidated ON public.armada
  FOR SELECT TO authenticated
  USING (
         is_admin_terminal()
      OR is_staf_iw()
      OR (    po_id = (select auth.uid())
          AND EXISTS (SELECT 1 FROM po
                      WHERE po.id = (select auth.uid())
                        AND po.status_verifikasi = 'aktif')
         )
      OR (    is_loket()
          AND status_verifikasi = 'terverifikasi'
          AND status_operasional = 'aktif')
  );

-- ============================================================
-- armada — UPDATE (2 → 1)
-- ============================================================
DROP POLICY IF EXISTS "PO can update own armada" ON public.armada;
DROP POLICY IF EXISTS "Staf IW can verify armada" ON public.armada;

CREATE POLICY armada_update_consolidated ON public.armada
  FOR UPDATE TO authenticated
  USING (
         is_staf_iw()
      OR (    po_id = (select auth.uid())
          AND EXISTS (SELECT 1 FROM po
                      WHERE po.id = (select auth.uid())
                        AND po.status_verifikasi = 'aktif')
         )
  )
  WITH CHECK (
         is_staf_iw()
      OR po_id = (select auth.uid())
  );

-- ============================================================
-- armada_dokumen — SELECT (2 → 1)
-- ============================================================
DROP POLICY IF EXISTS po_select_own_dokumen ON public.armada_dokumen;
DROP POLICY IF EXISTS staf_read_all_dokumen ON public.armada_dokumen;

CREATE POLICY armada_dokumen_select_consolidated ON public.armada_dokumen
  FOR SELECT TO authenticated
  USING (
         (is_staf_iw() OR is_admin_terminal())
      OR EXISTS (SELECT 1 FROM armada a
                 WHERE a.id = armada_dokumen.armada_id
                   AND a.po_id = (select auth.uid()))
  );

-- ============================================================
-- finding_actions — SELECT (2 → 1)
-- ============================================================
DROP POLICY IF EXISTS finding_actions_select_po ON public.finding_actions;
DROP POLICY IF EXISTS finding_actions_select_staff ON public.finding_actions;

CREATE POLICY finding_actions_select_consolidated ON public.finding_actions
  FOR SELECT TO authenticated
  USING (
         (is_staf_iw() OR is_admin_terminal())
      OR EXISTS (SELECT 1 FROM findings f
                 WHERE f.id = finding_actions.finding_id
                   AND f.po_id = (select auth.uid()))
  );

-- ============================================================
-- findings — SELECT (2 → 1)
-- ============================================================
DROP POLICY IF EXISTS findings_select_po_own ON public.findings;
DROP POLICY IF EXISTS findings_select_staff ON public.findings;

CREATE POLICY findings_select_consolidated ON public.findings
  FOR SELECT TO authenticated
  USING (
         po_id = (select auth.uid())
      OR is_staf_iw()
      OR is_admin_terminal()
  );

-- ============================================================
-- iwkbu_sync_status — SELECT (2 → 1)
-- ============================================================
DROP POLICY IF EXISTS iwkbu_status_select_po_own ON public.iwkbu_sync_status;
DROP POLICY IF EXISTS iwkbu_status_select_staff ON public.iwkbu_sync_status;

CREATE POLICY iwkbu_sync_status_select_consolidated ON public.iwkbu_sync_status
  FOR SELECT TO authenticated
  USING (
         po_id = (select auth.uid())
      OR is_staf_iw()
      OR is_admin_terminal()
  );

-- ============================================================
-- po — SELECT (4 → 1)
-- ============================================================
DROP POLICY IF EXISTS "Admin Terminal can view all PO" ON public.po;
DROP POLICY IF EXISTS "PO can view own data" ON public.po;
DROP POLICY IF EXISTS "Staf IW can view all PO" ON public.po;
DROP POLICY IF EXISTS loket_select_active_po ON public.po;

CREATE POLICY po_select_consolidated ON public.po
  FOR SELECT TO authenticated
  USING (
         is_admin_terminal()
      OR is_staf_iw()
      OR id = (select auth.uid())
      OR (is_loket() AND status_verifikasi = 'aktif')
  );

-- ============================================================
-- po — UPDATE (2 → 1)
-- ============================================================
DROP POLICY IF EXISTS "PO can update own data" ON public.po;
DROP POLICY IF EXISTS "Staf IW can verify PO" ON public.po;

CREATE POLICY po_update_consolidated ON public.po
  FOR UPDATE TO authenticated
  USING (
         is_staf_iw()
      OR id = (select auth.uid())
  )
  WITH CHECK (
         is_staf_iw()
      OR (id = (select auth.uid()) AND status_verifikasi = 'menunggu')
  );

-- ============================================================
-- profiles — SELECT (2 → 1)
-- ============================================================
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY profiles_select_consolidated ON public.profiles
  FOR SELECT TO authenticated
  USING (
         (select auth.uid()) = id
      OR is_staf_iw()
  );

-- ============================================================
-- rekonsiliasi_periode — SELECT (2 → 1)  + M2 narrowing
-- (po_view_periode sebelumnya USING (true) → semua authenticated.
--  Dipersempit: PO + staf-iw + admin-terminal.)
-- ============================================================
DROP POLICY IF EXISTS po_view_periode ON public.rekonsiliasi_periode;
DROP POLICY IF EXISTS staf_manage_periode_select ON public.rekonsiliasi_periode;

CREATE POLICY rekonsiliasi_periode_select_consolidated ON public.rekonsiliasi_periode
  FOR SELECT TO authenticated
  USING (
         (is_staf_iw() OR is_admin_terminal())
      OR EXISTS (SELECT 1 FROM po WHERE po.id = (select auth.uid()))
  );

-- ============================================================
-- terminals — SELECT (2 → 1)
-- ============================================================
DROP POLICY IF EXISTS admin_terminal_read_terminals ON public.terminals;
DROP POLICY IF EXISTS staf_iw_read_all_terminals ON public.terminals;

CREATE POLICY terminals_select_consolidated ON public.terminals
  FOR SELECT TO authenticated
  USING (
         is_admin_terminal()
      OR is_staf_iw()
  );
