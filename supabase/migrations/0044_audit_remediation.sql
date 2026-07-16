-- 0044_audit_remediation.sql
--
-- C1: activity_logs.user_id FK CASCADE -> SET NULL (preserve audit trail on user delete)
-- C2: findings.po_id FK CASCADE -> RESTRICT (prevent PO deletion when findings exist)
-- H1: Drop is_super_admin() -- replace profiles policy with is_staf_iw()
-- H2: Narrow system_settings SELECT from all-authenticated -> staf-iw/admin-terminal only
-- H3: Remove terminal_id branch from petugas_terminal INSERT/UPDATE (privilege hardening)
-- M1: Drop duplicate CHECK constraints (rekonsiliasi_periode, armada_dokumen)
-- M3: Add admin-terminal SELECT policy on terminals
-- M5: Narrow activity_logs SELECT policies from {public} -> {authenticated}

-- ============================================================
-- C1: activity_logs.user_id -- CASCADE -> SET NULL
-- ============================================================
ALTER TABLE public.activity_logs
  DROP CONSTRAINT activity_logs_user_id_fkey,
  ADD CONSTRAINT activity_logs_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id)
    ON DELETE SET NULL;

-- ============================================================
-- C2: findings.po_id -- CASCADE -> RESTRICT
-- ============================================================
ALTER TABLE public.findings
  DROP CONSTRAINT findings_po_id_fkey,
  ADD CONSTRAINT findings_po_id_fkey
    FOREIGN KEY (po_id) REFERENCES public.po(id)
    ON DELETE RESTRICT;

-- ============================================================
-- H1: Replace is_super_admin() with is_staf_iw(), drop legacy fn
-- ============================================================
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (is_staf_iw((select auth.uid())));

DROP FUNCTION IF EXISTS public.is_super_admin();

-- ============================================================
-- H2: Narrow system_settings SELECT to staf-iw + admin-terminal
-- ============================================================
DROP POLICY IF EXISTS system_settings_read ON public.system_settings;
CREATE POLICY system_settings_read ON public.system_settings
  FOR SELECT TO authenticated
  USING (
    is_staf_iw((select auth.uid()))
    OR is_admin_terminal((select auth.uid()))
  );

-- ============================================================
-- H3: Remove terminal_id branch from petugas_terminal write policies
--     (loket users with terminal_id could INSERT/UPDATE petugas via
--      direct PostgREST -- restrict to admin-terminal + staf-iw only)
-- ============================================================
DROP POLICY IF EXISTS petugas_terminal_write_scope ON public.petugas_terminal;
CREATE POLICY petugas_terminal_write_scope ON public.petugas_terminal
  FOR INSERT TO authenticated
  WITH CHECK (
    is_admin_terminal((select auth.uid()))
    OR is_staf_iw((select auth.uid()))
  );

DROP POLICY IF EXISTS petugas_terminal_update_scope ON public.petugas_terminal;
CREATE POLICY petugas_terminal_update_scope ON public.petugas_terminal
  FOR UPDATE TO authenticated
  USING (
    is_admin_terminal((select auth.uid()))
    OR is_staf_iw((select auth.uid()))
  )
  WITH CHECK (
    is_admin_terminal((select auth.uid()))
    OR is_staf_iw((select auth.uid()))
  );

-- ============================================================
-- M1: Drop duplicate CHECK constraints
-- ============================================================
ALTER TABLE public.rekonsiliasi_periode
  DROP CONSTRAINT IF EXISTS rekonsiliasi_periode_status_check;

ALTER TABLE public.armada_dokumen
  DROP CONSTRAINT IF EXISTS armada_dokumen_jenis_dokumen_check;

-- ============================================================
-- M3: Add admin-terminal SELECT on terminals
-- ============================================================
CREATE POLICY admin_terminal_read_terminals ON public.terminals
  FOR SELECT TO authenticated
  USING (is_admin_terminal((select auth.uid())));

-- ============================================================
-- M5: Narrow activity_logs SELECT policies {public} -> {authenticated}
-- ============================================================
DROP POLICY IF EXISTS admin_select_all_logs ON public.activity_logs;
CREATE POLICY admin_select_all_logs ON public.activity_logs
  FOR SELECT TO authenticated
  USING (
    is_admin_terminal((select auth.uid()))
    OR is_staf_iw((select auth.uid()))
  );

DROP POLICY IF EXISTS users_select_own_log ON public.activity_logs;
CREATE POLICY users_select_own_log ON public.activity_logs
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));
