-- 0058_revoke_anon_execute_dashboards.sql
-- Completes N1 from the round-2 database review. Migration 0057 issued
-- REVOKE EXECUTE ... FROM PUBLIC on 6 dashboard/read RPCs, but each also carries
-- a DIRECT grant to `anon` (visible in pg_proc.proacl as `anon=X/postgres`) left
-- by Supabase default privileges; REVOKE FROM PUBLIC does not remove direct
-- grants. This drops the residual anon grant so only authenticated/service_role
-- may execute -- matching the pattern migration 0022 used for log_activity.
--
-- Verified safe: every call site runs post-authentication, never under anon:
--   get_current_user_role -> proxy.ts:166 (after `if (!user) redirect`),
--                             server-actor.ts:67 (after `if (!user) return null`),
--                             login/route.ts:126 (after signInWithPassword)
--   get_*_stats / get_*_rekap / get_detail_sesi -> operasional.{server,client}.ts
-- All functions remain SECURITY INVOKER + RLS-backed, so even if invoked by anon,
-- no data would be returned -- this is pure consistency hardening.

REVOKE EXECUTE ON FUNCTION public.get_admin_rekap_harian(uuid, date)    FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_rekap_sesi(uuid, date, date)      FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_detail_sesi(uuid)                 FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_current_user_role()               FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_admin_terminal_stats(uuid, date)  FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_petugas_dashboard_stats()         FROM anon;
