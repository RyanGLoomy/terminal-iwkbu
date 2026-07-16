-- 0027_finding_actions_fk_profiles.sql
--
-- Drift capture: FK constraints on finding_actions.created_by dan .done_by
-- ke profiles.id. Sudah diterapkan di live DB, baru dicapture ke repo.
-- Idempotent: DO NOTHING jika constraint sudah ada.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'finding_actions_created_by_fkey'
  ) THEN
    ALTER TABLE public.finding_actions
      ADD CONSTRAINT finding_actions_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES public.profiles(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'finding_actions_done_by_fkey'
  ) THEN
    ALTER TABLE public.finding_actions
      ADD CONSTRAINT finding_actions_done_by_fkey
      FOREIGN KEY (done_by) REFERENCES public.profiles(id);
  END IF;
END $$;
