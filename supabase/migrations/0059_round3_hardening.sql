-- 0059_round3_hardening.sql
-- Database review round 3 remediation:
--   R3-01. Add missing CHECK on finding_clarifications.decision + responder_role
--          (the lone enum-like columns without a CHECK). App enforces the sets in
--          route handlers + lifecycle.ts, but service-role/direct PostgREST bypassed.
--          Allowed values verified from src/:
--            decision       -> "menerima" | "menolak" | "melengkapi"
--                             (operasional.types.ts, lifecycle.test.ts)
--            responder_role -> "po" | "staf-iw"
--                             (operasional.types.ts:194, lifecycle.ts:167,202)
--   R3-02. REVOKE anon/PUBLIC EXECUTE on get_user_role(uuid) -- closes a
--          role-disclosure enumeration oracle (anon could probe any user's role).
--          authenticated is RETAINED because get_current_user_role() calls it.
--   R3-03. Trim EXECUTE grants on trigger + RLS-helper functions:
--          - trigger fns (guard_periode_delete_draft_only, guard_profiles_sensitive_
--            columns, fn_auto_update_sesi_totals, fn_check_sesi_aktif_before_insert):
--            revoke anon, PUBLIC, authenticated. Trigger invocation needs no EXECUTE
--            privilege; these are never called via .rpc() (grep src/ = 0 callers).
--          - RLS helpers (is_staf_iw, is_loket, is_admin_terminal, check_loket_pin_
--            session): revoke anon, PUBLIC. Keep authenticated (RLS policies and
--            proxy.ts:194 run under an authenticated context).
--   R3-04. FORCE ROW LEVEL SECURITY on the 7 tables where it was only ENABLED,
--          matching the 0052 hardening pattern. service_role still bypasses; this
--          only closes the table-owner (postgres) bypass.
--   R3-05. Drop 2 structurally redundant strict-prefix indexes (structural, not
--          load-dependent):
--          - idx_findings_po(po_id) is a prefix of idx_findings_po_status(po_id, status)
--          - idx_activity_logs_user(user_id) is a prefix of
--            idx_activity_logs_user_created(user_id, created_at DESC)

-- R3-01. CHECK constraints on finding_clarifications enum-like columns
ALTER TABLE public.finding_clarifications
  ADD CONSTRAINT chk_clarifications_decision
  CHECK (decision = ANY (ARRAY['menerima','menolak','melengkapi']));

ALTER TABLE public.finding_clarifications
  ADD CONSTRAINT chk_clarifications_responder_role
  CHECK (responder_role = ANY (ARRAY['po','staf-iw']));

-- R3-02. Close role-disclosure enumeration oracle (keep authenticated)
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM anon, PUBLIC;

-- R3-03. Trigger-only functions: no caller needs EXECUTE
REVOKE EXECUTE ON FUNCTION public.guard_periode_delete_draft_only()   FROM anon, PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_profiles_sensitive_columns()  FROM anon, PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_auto_update_sesi_totals()        FROM anon, PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_check_sesi_aktif_before_insert() FROM anon, PUBLIC, authenticated;

-- R3-03 (cont). RLS helpers: drop anon/PUBLIC, keep authenticated
REVOKE EXECUTE ON FUNCTION public.is_staf_iw(user_id uuid)            FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_loket(user_id uuid)              FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin_terminal(user_id uuid)     FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_loket_pin_session()           FROM anon, PUBLIC;

-- R3-04. Force RLS on remaining 7 tables (defense-in-depth; matches 0052)
ALTER TABLE public.armada_dokumen       FORCE ROW LEVEL SECURITY;
ALTER TABLE public.jenis_kendaraan      FORCE ROW LEVEL SECURITY;
ALTER TABLE public.notifications        FORCE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_buckets   FORCE ROW LEVEL SECURITY;
ALTER TABLE public.rekonsiliasi_periode FORCE ROW LEVEL SECURITY;
ALTER TABLE public.roles                FORCE ROW LEVEL SECURITY;
ALTER TABLE public.terminals            FORCE ROW LEVEL SECURITY;

-- R3-05. Drop redundant strict-prefix indexes
DROP INDEX IF EXISTS public.idx_findings_po;
DROP INDEX IF EXISTS public.idx_activity_logs_user;
