-- 0057_hardening_followups.sql
-- Database review (round 2) hardening follow-ups:
--   H2. finding_clarifications.responder_id FK CASCADE -> SET NULL, matching the
--       "preserve audit records" contract (migrations 0044/0046) that every other
--       audit-bearing profiles FK follows. Requires dropping NOT NULL on the column
--       so the SET NULL on user-delete is valid.
--   N1. Revoke EXECUTE ... TO PUBLIC on 6 read/dashboard RPCs missed by the
--       0022/0025 revocation pass; grant to authenticated only. All are SECURITY
--       INVOKER and RLS-backed (not exploitable) -- consistency hardening.
--   M1. Tighten 11 policies on petugas_pin_sessions / sesi_petugas /
--       kendaraan_masuk / kendaraan_keluar from role {public} to {authenticated}.
--       Currently safe (auth.uid() is NULL for anon); removes latent anon surface.
--   M2. Set search_path = public on touch_updated_at() (was empty), matching the
--       migration 0015 hardening sweep. 9 triggers call this function.
--   H1. Drop the dead log_activity() RPC. The TS wrapper logActivity() in
--       operasional.server.ts inserts via the service-role admin client, and the
--       fn_log_* triggers are SECURITY DEFINER -- no caller uses the RPC.

-- H2. Preserve clarification history on user deletion
ALTER TABLE public.finding_clarifications
  ALTER COLUMN responder_id DROP NOT NULL;

ALTER TABLE public.finding_clarifications
  DROP CONSTRAINT IF EXISTS finding_clarifications_responder_id_fkey;

ALTER TABLE public.finding_clarifications
  ADD CONSTRAINT finding_clarifications_responder_id_fkey
  FOREIGN KEY (responder_id) REFERENCES public.profiles(id)
  ON DELETE SET NULL;

-- N1. Restrict dashboard RPC execute grants to authenticated
REVOKE EXECUTE ON FUNCTION public.get_admin_rekap_harian(uuid, date)    FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_rekap_sesi(uuid, date, date)      FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_detail_sesi(uuid)                 FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_current_user_role()               FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_admin_terminal_stats(uuid, date)  FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_petugas_dashboard_stats()         FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_admin_rekap_harian(uuid, date)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_rekap_sesi(uuid, date, date)       TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_detail_sesi(uuid)                  TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_user_role()                TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_terminal_stats(uuid, date)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_petugas_dashboard_stats()          TO authenticated;

-- M1. Narrow transaction/pin/sesi policies from {public} to {authenticated}
ALTER POLICY petugas_insert_own_masuk     ON public.kendaraan_masuk       TO authenticated;
ALTER POLICY petugas_insert_own_keluar    ON public.kendaraan_keluar     TO authenticated;
ALTER POLICY petugas_insert_own_sesi      ON public.sesi_petugas         TO authenticated;
ALTER POLICY petugas_update_own_sesi      ON public.sesi_petugas         TO authenticated;

ALTER POLICY users_select_own_pin_session ON public.petugas_pin_sessions TO authenticated;
ALTER POLICY users_insert_own_pin_session ON public.petugas_pin_sessions TO authenticated;
ALTER POLICY users_update_own_pin_session ON public.petugas_pin_sessions TO authenticated;
ALTER POLICY users_delete_own_pin_session ON public.petugas_pin_sessions TO authenticated;
ALTER POLICY pin_session_loket_insert     ON public.petugas_pin_sessions TO authenticated;
ALTER POLICY pin_session_loket_update     ON public.petugas_pin_sessions TO authenticated;
ALTER POLICY pin_session_loket_delete     ON public.petugas_pin_sessions TO authenticated;

-- M2. Harden touch_updated_at search_path
ALTER FUNCTION public.touch_updated_at() SET search_path TO 'public';

-- H1. Drop dead log_activity RPC (TS wrapper + fn_log_* triggers are the real paths)
DROP FUNCTION IF EXISTS public.log_activity(text, text, jsonb);
