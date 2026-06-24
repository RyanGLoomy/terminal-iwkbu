-- ============================================================
-- Security hardening: FORCE RLS, lock internal functions,
-- fix search_path, drop unused legacy functions.
-- ============================================================

-- 1) FORCE ROW LEVEL SECURITY pada tabel sensitif.
ALTER TABLE activity_logs          FORCE ROW LEVEL SECURITY;
ALTER TABLE armada                 FORCE ROW LEVEL SECURITY;
ALTER TABLE findings               FORCE ROW LEVEL SECURITY;
ALTER TABLE finding_clarifications FORCE ROW LEVEL SECURITY;
ALTER TABLE finding_actions        FORCE ROW LEVEL SECURITY;
ALTER TABLE po                      FORCE ROW LEVEL SECURITY;
ALTER TABLE profiles               FORCE ROW LEVEL SECURITY;
ALTER TABLE user_roles             FORCE ROW LEVEL SECURITY;
ALTER TABLE petugas_terminal       FORCE ROW LEVEL SECURITY;
ALTER TABLE petugas_pin_sessions   FORCE ROW LEVEL SECURITY;
ALTER TABLE kendaraan_masuk        FORCE ROW LEVEL SECURITY;
ALTER TABLE kendaraan_keluar       FORCE ROW LEVEL SECURITY;
ALTER TABLE sesi_petugas           FORCE ROW LEVEL SECURITY;
ALTER TABLE iwkbu_source_records   FORCE ROW LEVEL SECURITY;
ALTER TABLE iwkbu_sync_runs        FORCE ROW LEVEL SECURITY;
ALTER TABLE iwkbu_sync_status      FORCE ROW LEVEL SECURITY;
ALTER TABLE system_settings        FORCE ROW LEVEL SECURITY;

-- 2) Set search_path on all trigger/internal functions.
ALTER FUNCTION public.fn_touch_findings_updated_at() SET search_path = '';
ALTER FUNCTION public.touch_updated_at() SET search_path = '';
ALTER FUNCTION public.fn_log_clarification_changes() SET search_path = '';
ALTER FUNCTION public.fn_log_finding_changes() SET search_path = '';
ALTER FUNCTION public.fn_log_hapus_transaksi_keluar() SET search_path = '';
ALTER FUNCTION public.fn_log_hapus_transaksi_masuk() SET search_path = '';
ALTER FUNCTION public.fn_log_pin_change() SET search_path = '';
ALTER FUNCTION public.fn_log_sesi_changes() SET search_path = '';
ALTER FUNCTION public.fn_log_transaksi_keluar() SET search_path = '';
ALTER FUNCTION public.fn_log_transaksi_masuk() SET search_path = '';
ALTER FUNCTION public.handle_new_user() SET search_path = '';

-- 3) REVOKE EXECUTE on trigger/internal functions from all roles.
REVOKE EXECUTE ON FUNCTION public.fn_touch_findings_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_log_clarification_changes() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_log_finding_changes() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_log_hapus_transaksi_keluar() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_log_hapus_transaksi_masuk() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_log_pin_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_log_sesi_changes() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_log_transaksi_keluar() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_log_transaksi_masuk() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;

-- 4) SECURITY DEFINER functions: REVOKE FROM PUBLIC, GRANT TO authenticated.
REVOKE EXECUTE ON FUNCTION public.log_activity(text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_activity(text, text, jsonb) TO authenticated;

-- 5) RPC/helper functions: REVOKE FROM anon.
REVOKE EXECUTE ON FUNCTION public.get_current_user_role() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_activity_logs(date, date, text, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_activity_logs(date, date, text, integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_admin_terminal_stats(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_admin_terminal_stats(uuid, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_staf_iw(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin_terminal(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_loket(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM anon;

-- 6) Drop unused legacy functions.
DROP FUNCTION IF EXISTS public.get_admin_statistics(uuid, date);
DROP FUNCTION IF EXISTS public.get_weekly_trends(uuid);
