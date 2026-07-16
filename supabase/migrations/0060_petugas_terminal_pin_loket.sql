-- 0060_petugas_terminal_pin_loket.sql
-- R4-01 (round 4 review) remediation — Option B (DB-side, least-privilege).
--
-- Bug: src/app/api/auth/change-pin/route.ts updates petugas_terminal via the
-- user-scoped client (createClient(), to keep auth.uid() in trigger context),
-- but the table's only UPDATE policy admitted admin-terminal/staf-iw only.
-- PostgREST silently filtered the UPDATE to 0 rows, so a loket user's PIN change
-- appeared to succeed but was never persisted.
--
-- Fix: add a column-narrow UPDATE policy that lets a loket user update rows in
-- their OWN terminal, plus a BEFORE UPDATE guard trigger that raises if a loket
-- actor changes any column other than pin_hash. admin-terminal/staf-iw and
-- service_role (auth.uid() NULL) paths remain unconstrained. The app route is
-- also updated (separate edit) to assert the UPDATE touched a row, so future
-- policy drift fails loudly instead of silently no-op'ing.

-- Guard function: loket may only change pin_hash
DROP FUNCTION IF EXISTS public.guard_petugas_terminal_pin_loket() CASCADE;

CREATE OR REPLACE FUNCTION public.guard_petugas_terminal_pin_loket()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  -- service_role (auth.uid() NULL) and non-loket roles are unconstrained
  IF v_uid IS NULL OR NOT is_loket(v_uid) THEN
    RETURN NEW;
  END IF;
  -- loket: only pin_hash may change (updated_at is managed by the touch trigger)
  IF NEW.terminal_id IS DISTINCT FROM OLD.terminal_id
     OR NEW.nama IS DISTINCT FROM OLD.nama
     OR NEW.is_active IS DISTINCT FROM OLD.is_active
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Loket hanya boleh memperbarui pin_hash pada petugas_terminal'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_petugas_terminal_pin_loket ON public.petugas_terminal;
CREATE TRIGGER trg_guard_petugas_terminal_pin_loket
  BEFORE UPDATE ON public.petugas_terminal
  FOR EACH ROW EXECUTE FUNCTION public.guard_petugas_terminal_pin_loket();

-- Loket UPDATE policy: own terminal only (column-narrowing enforced by trigger above)
DROP POLICY IF EXISTS petugas_terminal_update_loket_own_terminal ON public.petugas_terminal;
CREATE POLICY petugas_terminal_update_loket_own_terminal ON public.petugas_terminal
  FOR UPDATE TO authenticated
  USING (terminal_id = (SELECT terminal_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (terminal_id = (SELECT terminal_id FROM profiles WHERE id = auth.uid()));
