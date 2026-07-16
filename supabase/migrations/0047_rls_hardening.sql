-- 0047_rls_hardening.sql
--
-- H4: po INSERT policy hanya cek id = auth.uid() tanpa verifikasi role.
--     User manapun (loket, staf-iw, admin-terminal) bisa insert baris po
--     dengan uid sendiri. Fix: wajibkan role 'po' di user_roles.
--     Legitimate flow: /api/auth/register-po (service-role) inserts user_roles
--     sebelum po row. Direct PostgREST oleh non-po user diblokir (defense
--     in depth).
--
-- M2: findings_update_staff tidak punya WITH CHECK. Staf bisa reassign
--     po_id/armada_id/created_by ke nilai arbitrer saat update. Fix:
--     tambah WITH CHECK yang re-validasi caller adalah staf/admin.

-- ============================================================
-- H4: po INSERT -- require 'po' role
-- ============================================================
DROP POLICY IF EXISTS "PO can insert own data" ON public.po;
CREATE POLICY "PO can insert own data" ON public.po
  FOR INSERT TO authenticated
  WITH CHECK (
    id = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = (select auth.uid())
        AND r.name = 'po'
    )
  );

-- ============================================================
-- M2: findings UPDATE -- add WITH CHECK
-- ============================================================
DROP POLICY IF EXISTS findings_update_staff ON public.findings;
CREATE POLICY findings_update_staff ON public.findings
  FOR UPDATE TO authenticated
  USING (is_staf_iw((select auth.uid())) OR is_admin_terminal((select auth.uid())))
  WITH CHECK (is_staf_iw((select auth.uid())) OR is_admin_terminal((select auth.uid())));
