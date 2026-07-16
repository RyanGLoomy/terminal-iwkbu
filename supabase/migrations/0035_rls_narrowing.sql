-- 0035_rls_narrowing.sql
--
-- L2: Persempit policy yang saat ini di role {public} ke {authenticated}.
--     Role {public} di Supabase mencakup anon + authenticated. Semua policy
--     di bawah sudah memakai auth.uid() yang mengembalikan NULL untuk anon,
--     jadi secara fungsional aman — tapi mempersempit ke {authenticated}
--     mengurangi attack surface dan lebih eksplisit.
--
--     Policy yang tetap di {public}: TIDAK ADA. Semua policy di bawah
--     memerlukan auth.uid() yang non-NULL.
--
--     Catatan: petugas_pin_sessions dan sesi_petugas INSERT policy tetap
--     di {public} karena Supabase auth flow mungkin insert sebelum session
--     fully established. Akan ditinggalkan apa adanya untuk safety.

-- ============================================================
-- po: SELECT/INSERT/UPDATE dari {public} ke {authenticated}
-- ============================================================
DROP POLICY IF EXISTS "PO can view own data" ON public.po;
CREATE POLICY "PO can view own data" ON public.po
  FOR SELECT TO authenticated USING (id = auth.uid());

DROP POLICY IF EXISTS "PO can insert own data" ON public.po;
CREATE POLICY "PO can insert own data" ON public.po
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "PO can update own data" ON public.po;
CREATE POLICY "PO can update own data" ON public.po
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() and status_verifikasi = 'menunggu');

DROP POLICY IF EXISTS "Admin Terminal can view all PO" ON public.po;
CREATE POLICY "Admin Terminal can view all PO" ON public.po
  FOR SELECT TO authenticated USING (is_admin_terminal(auth.uid()));

DROP POLICY IF EXISTS "Staf IW can view all PO" ON public.po;
CREATE POLICY "Staf IW can view all PO" ON public.po
  FOR SELECT TO authenticated USING (is_staf_iw(auth.uid()));

DROP POLICY IF EXISTS "Staf IW can verify PO" ON public.po;
CREATE POLICY "Staf IW can verify PO" ON public.po
  FOR UPDATE TO authenticated
  USING (is_staf_iw(auth.uid())) WITH CHECK (is_staf_iw(auth.uid()));

-- ============================================================
-- armada: SELECT/INSERT/UPDATE dari {public} ke {authenticated}
-- ============================================================
DROP POLICY IF EXISTS "PO can view own armada" ON public.armada;
CREATE POLICY "PO can view own armada" ON public.armada
  FOR SELECT TO authenticated
  USING (
    po_id = auth.uid()
    AND EXISTS (SELECT 1 FROM po WHERE po.id = auth.uid() AND po.status_verifikasi = 'aktif')
  );

DROP POLICY IF EXISTS "Admin Terminal can view all armada" ON public.armada;
CREATE POLICY "Admin Terminal can view all armada" ON public.armada
  FOR SELECT TO authenticated USING (is_admin_terminal(auth.uid()));

DROP POLICY IF EXISTS "Staf IW can view all armada" ON public.armada;
CREATE POLICY "Staf IW can view all armada" ON public.armada
  FOR SELECT TO authenticated USING (is_staf_iw(auth.uid()));

DROP POLICY IF EXISTS "PO can insert own armada" ON public.armada;
CREATE POLICY "PO can insert own armada" ON public.armada
  FOR INSERT TO authenticated
  WITH CHECK (
    po_id = auth.uid()
    AND EXISTS (SELECT 1 FROM po WHERE po.id = auth.uid() AND po.status_verifikasi = 'aktif')
  );

DROP POLICY IF EXISTS "PO can update own armada" ON public.armada;
CREATE POLICY "PO can update own armada" ON public.armada
  FOR UPDATE TO authenticated
  USING (
    po_id = auth.uid()
    AND EXISTS (SELECT 1 FROM po WHERE po.id = auth.uid() AND po.status_verifikasi = 'aktif')
  )
  WITH CHECK (po_id = auth.uid());

-- ============================================================
-- findings: SELECT/INSERT/UPDATE dari {public} ke {authenticated}
-- ============================================================
DROP POLICY IF EXISTS "findings_select_po_own" ON public.findings;
CREATE POLICY "findings_select_po_own" ON public.findings
  FOR SELECT TO authenticated USING (po_id = auth.uid());

DROP POLICY IF EXISTS "findings_select_staff" ON public.findings;
CREATE POLICY "findings_select_staff" ON public.findings
  FOR SELECT TO authenticated
  USING (is_staf_iw(auth.uid()) OR is_admin_terminal(auth.uid()));

DROP POLICY IF EXISTS "findings_insert_staff" ON public.findings;
CREATE POLICY "findings_insert_staff" ON public.findings
  FOR INSERT TO authenticated
  WITH CHECK (is_staf_iw(auth.uid()) OR is_admin_terminal(auth.uid()));

DROP POLICY IF EXISTS "findings_update_staff" ON public.findings;
CREATE POLICY "findings_update_staff" ON public.findings
  FOR UPDATE TO authenticated
  USING (is_staf_iw(auth.uid()) OR is_admin_terminal(auth.uid()));

-- ============================================================
-- finding_clarifications: dari {public} ke {authenticated}
-- ============================================================
DROP POLICY IF EXISTS "clarifications_select_related" ON public.finding_clarifications;
CREATE POLICY "clarifications_select_related" ON public.finding_clarifications
  FOR SELECT TO authenticated
  USING (
    is_staf_iw(auth.uid()) OR is_admin_terminal(auth.uid())
    OR EXISTS (
      SELECT 1 FROM findings f
      WHERE f.id = finding_clarifications.finding_id AND f.po_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "clarifications_insert_po" ON public.finding_clarifications;
CREATE POLICY "clarifications_insert_po" ON public.finding_clarifications
  FOR INSERT TO authenticated
  WITH CHECK (
    responder_id = auth.uid()
    AND (
      is_staf_iw(auth.uid()) OR is_admin_terminal(auth.uid())
      OR EXISTS (
        SELECT 1 FROM findings f
        WHERE f.id = finding_clarifications.finding_id AND f.po_id = auth.uid()
      )
    )
  );

-- ============================================================
-- iwkbu_source_records / iwkbu_sync_runs / iwkbu_sync_status
-- dari {public} ke {authenticated}
-- ============================================================
DROP POLICY IF EXISTS "iwkbu_source_select_staff" ON public.iwkbu_source_records;
CREATE POLICY "iwkbu_source_select_staff" ON public.iwkbu_source_records
  FOR SELECT TO authenticated
  USING (is_staf_iw(auth.uid()) OR is_admin_terminal(auth.uid()));

DROP POLICY IF EXISTS "iwkbu_source_write_staff" ON public.iwkbu_source_records;
CREATE POLICY "iwkbu_source_write_staff" ON public.iwkbu_source_records
  FOR ALL TO authenticated
  USING (is_staf_iw(auth.uid())) WITH CHECK (is_staf_iw(auth.uid()));

DROP POLICY IF EXISTS "iwkbu_runs_select_staff" ON public.iwkbu_sync_runs;
CREATE POLICY "iwkbu_runs_select_staff" ON public.iwkbu_sync_runs
  FOR SELECT TO authenticated
  USING (is_staf_iw(auth.uid()) OR is_admin_terminal(auth.uid()));

DROP POLICY IF EXISTS "iwkbu_runs_write_staff" ON public.iwkbu_sync_runs;
CREATE POLICY "iwkbu_runs_write_staff" ON public.iwkbu_sync_runs
  FOR ALL TO authenticated
  USING (is_staf_iw(auth.uid())) WITH CHECK (is_staf_iw(auth.uid()));

DROP POLICY IF EXISTS "iwkbu_status_select_po_own" ON public.iwkbu_sync_status;
CREATE POLICY "iwkbu_status_select_po_own" ON public.iwkbu_sync_status
  FOR SELECT TO authenticated USING (po_id = auth.uid());

DROP POLICY IF EXISTS "iwkbu_status_select_staff" ON public.iwkbu_sync_status;
CREATE POLICY "iwkbu_status_select_staff" ON public.iwkbu_sync_status
  FOR SELECT TO authenticated
  USING (is_staf_iw(auth.uid()) OR is_admin_terminal(auth.uid()));

DROP POLICY IF EXISTS "iwkbu_status_write_staff" ON public.iwkbu_sync_status;
CREATE POLICY "iwkbu_status_write_staff" ON public.iwkbu_sync_status
  FOR ALL TO authenticated
  USING (is_staf_iw(auth.uid())) WITH CHECK (is_staf_iw(auth.uid()));

-- ============================================================
-- petugas_terminal: dari {public} ke {authenticated}
-- ============================================================
DROP POLICY IF EXISTS "petugas_terminal_select_scope" ON public.petugas_terminal;
CREATE POLICY "petugas_terminal_select_scope" ON public.petugas_terminal
  FOR SELECT TO authenticated
  USING (
    is_admin_terminal(auth.uid()) OR is_staf_iw(auth.uid())
    OR terminal_id = (SELECT profiles.terminal_id FROM profiles WHERE profiles.id = auth.uid())
  );

DROP POLICY IF EXISTS "petugas_terminal_write_scope" ON public.petugas_terminal;
CREATE POLICY "petugas_terminal_write_scope" ON public.petugas_terminal
  FOR INSERT TO authenticated
  WITH CHECK (
    is_admin_terminal(auth.uid()) OR is_staf_iw(auth.uid())
    OR terminal_id = (SELECT profiles.terminal_id FROM profiles WHERE profiles.id = auth.uid())
  );

DROP POLICY IF EXISTS "petugas_terminal_update_scope" ON public.petugas_terminal;
CREATE POLICY "petugas_terminal_update_scope" ON public.petugas_terminal
  FOR UPDATE TO authenticated
  USING (
    is_admin_terminal(auth.uid()) OR is_staf_iw(auth.uid())
    OR terminal_id = (SELECT profiles.terminal_id FROM profiles WHERE profiles.id = auth.uid())
  )
  WITH CHECK (
    is_admin_terminal(auth.uid()) OR is_staf_iw(auth.uid())
    OR terminal_id = (SELECT profiles.terminal_id FROM profiles WHERE profiles.id = auth.uid())
  );

-- ============================================================
-- profiles: dari {public} ke {authenticated}
-- ============================================================
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (is_super_admin());

-- ============================================================
-- user_roles: dari {public} ke {authenticated}
-- ============================================================
DROP POLICY IF EXISTS "user_roles_select_own" ON public.user_roles;
CREATE POLICY "user_roles_select_own" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ============================================================
-- terminals: dari {public} ke {authenticated}
-- ============================================================
DROP POLICY IF EXISTS "staf_iw_read_all_terminals" ON public.terminals;
CREATE POLICY "staf_iw_read_all_terminals" ON public.terminals
  FOR SELECT TO authenticated USING (is_staf_iw(auth.uid()));
