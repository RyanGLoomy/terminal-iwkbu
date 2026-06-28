-- 0019_rls_batch_medium.sql
-- SECURITY PATCH (audit 2026-06): RLS-02, RLS-03, RLS-04, RLS-05.
-- These are SELECT / INSERT / Storage / function-EXECUTE controls, all of which
-- ARE enforced by PostgREST in this project (unlike UPDATE, see PLAT-01).

-- ============================================================
-- RLS-02: petugas_terminal SELECT was effectively USING(true) because
-- "loket_read_petugas_terminal" OR-override made every authenticated user read
-- ALL petugas across ALL terminals (staff-name + terminal enumeration leak).
-- The existing "petugas_terminal_select_scope" policy already lets a loket
-- read the petugas of their OWN terminal, so the wide policy is redundant.
-- ============================================================
DROP POLICY IF EXISTS "loket_read_petugas_terminal" ON public.petugas_terminal;

-- ============================================================
-- RLS-04: activity_logs allowed direct client INSERTs
-- (users_insert_own_log / admin_insert_logs), letting a user forge audit
-- entries with an arbitrary action enum. All logging in the app flows through
-- log_activity() (SECURITY DEFINER, service-role only) or the service-role
-- admin client (logActivity helper), so direct table INSERT policies are not
-- needed. Drop them -> INSERT denied to clients by RLS deny-default.
-- ============================================================
DROP POLICY IF EXISTS "users_insert_own_log" ON public.activity_logs;
DROP POLICY IF EXISTS "admin_insert_logs" ON public.activity_logs;

-- ============================================================
-- RLS-03: Storage policy "staf_read_all_armada_dokumen" granted admin-terminal
-- read access to ALL PO armada documents across every terminal. Armada are
-- PO-scoped (not terminal-scoped), so this leaked every PO's STCK/KIR/asuransi
-- to any admin-terminal user. Restrict the all-read to staf-iw only.
-- ============================================================
DROP POLICY IF EXISTS "staf_read_all_armada_dokumen" ON storage.objects;
CREATE POLICY "staf_read_all_armada_dokumen" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'armada-dokumen'
        AND public.is_staf_iw()
    );

-- ============================================================
-- RLS-05: check_loket_pin_session() is SECURITY DEFINER and was still
-- executable by PUBLIC / anon (the REVOKE from migration 0005 did not stick),
-- flagged by Supabase advisors. Restrict EXECUTE to authenticated only.
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.check_loket_pin_session() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_loket_pin_session() TO authenticated;
