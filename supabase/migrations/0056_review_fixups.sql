-- 0056_review_fixups.sql
-- Database review (M3) remediation for rekonsiliasi_periode:
--   A. Enforce "only draft periodes can be deleted" at DB level via BEFORE DELETE
--      trigger. Previously enforced only in TypeScript
--      (src/app/api/staf-iw/periode-rekonsiliasi/[id]/route.ts), which is bypassed
--      by the service-role admin client and absent for direct PostgREST calls.
--   B. Narrow RLS UPDATE/DELETE to staf-iw only, matching requireActor(STAF_IW).
--      SELECT and INSERT policies intentionally retain admin-terminal.

-- A. Guard trigger: block deletion of non-draft periode
DROP FUNCTION IF EXISTS public.guard_periode_delete_draft_only() CASCADE;

CREATE FUNCTION public.guard_periode_delete_draft_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM 'draft' THEN
    RAISE EXCEPTION 'Periode rekonsiliasi hanya dapat dihapus bila status draft (current: %)', OLD.status
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_periode_guard_delete ON public.rekonsiliasi_periode;
CREATE TRIGGER trg_periode_guard_delete
  BEFORE DELETE ON public.rekonsiliasi_periode
  FOR EACH ROW EXECUTE FUNCTION public.guard_periode_delete_draft_only();

-- B. Tighten UPDATE/DELETE policies to staf-iw only
ALTER POLICY staf_manage_periode_update
  ON public.rekonsiliasi_periode
  USING (is_staf_iw()) WITH CHECK (is_staf_iw());

ALTER POLICY staf_manage_periode_delete
  ON public.rekonsiliasi_periode
  USING (is_staf_iw());
