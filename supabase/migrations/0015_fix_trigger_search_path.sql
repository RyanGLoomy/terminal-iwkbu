-- Fix trigger functions that had SET search_path TO '' but referenced
-- unqualified table names (e.g., "activity_logs" without "public." prefix).
-- This caused "relation does not exist" errors at runtime when triggers fired.
-- Fix: change search_path from '' to 'public' so unqualified names resolve.

ALTER FUNCTION public.fn_log_finding_changes() SET search_path TO 'public';
ALTER FUNCTION public.fn_log_clarification_changes() SET search_path TO 'public';
ALTER FUNCTION public.fn_log_transaksi_masuk() SET search_path TO 'public';
ALTER FUNCTION public.fn_log_transaksi_keluar() SET search_path TO 'public';
ALTER FUNCTION public.fn_log_hapus_transaksi_masuk() SET search_path TO 'public';
ALTER FUNCTION public.fn_log_hapus_transaksi_keluar() SET search_path TO 'public';
ALTER FUNCTION public.fn_log_sesi_changes() SET search_path TO 'public';
ALTER FUNCTION public.fn_log_pin_change() SET search_path TO 'public';
ALTER FUNCTION public.handle_new_user() SET search_path TO 'public';
ALTER FUNCTION public.fn_touch_findings_updated_at() SET search_path TO 'public';

-- Drop the old 4-param version of get_activity_logs to avoid signature ambiguity.
-- The 5-param version (with p_offset) is the canonical one.
DROP FUNCTION IF EXISTS public.get_activity_logs(date, date, text, integer);
