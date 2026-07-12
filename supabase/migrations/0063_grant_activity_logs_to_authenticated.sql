-- 0063_grant_activity_logs_to_authenticated.sql
-- Restore EXECUTE grant on get_activity_logs to authenticated. The grant from
-- migration 0022 was lost when a later migration recreated the function
-- (CREATE OR REPLACE preserves grants, but DROP + CREATE resets them to default).
--
-- The function is called via the user-scoped client (operasional.server.ts
-- getActivityLogs) so auth.uid() resolves inside the SECURITY DEFINER body for
-- the in-body staf-iw/admin-terminal authorization check. Without this grant,
-- the staf-iw user gets "permission denied for function get_activity_logs"
-- (42501 → route returns 500).

GRANT EXECUTE ON FUNCTION public.get_activity_logs(date, date, text, integer, integer) TO authenticated;
