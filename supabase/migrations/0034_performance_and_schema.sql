-- 0034_performance_and_schema.sql
--
-- M1: Index pada finding_actions.finding_id (missing — sibling table
--     finding_clarifications sudah punya idx_finding_clarifications_finding_id).
-- L1: Trigger touch_updated_at pada profiles (kolom updated_at ada tapi
--     tidak ada trigger yang memperbaruinya, tidak seperti armada/po/dll).
-- L6: Drop policy redundant admin_manage_petugas_terminal FOR ALL di
--     petugas_terminal — per-command policies sudah mencakup semua kasus.
-- H3: VALIDATE CHECK constraint activity_logs_aksi_check.

-- ============================================================
-- M1: Missing index on finding_actions.finding_id
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_finding_actions_finding_id
  ON public.finding_actions(finding_id);

-- ============================================================
-- L1: profiles updated_at trigger
-- ============================================================
DROP TRIGGER IF EXISTS trg_profiles_touch_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_touch_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================================
-- L6: Drop redundant FOR ALL policy on petugas_terminal
-- ============================================================
-- Per-command policies (select_scope, write_scope, update_scope) already
-- cover admin_terminal and staf_iw. The blanket FOR ALL policy is
-- redundant and could mask gaps in per-command coverage.
DROP POLICY IF EXISTS "admin_manage_petugas_terminal" ON public.petugas_terminal;

-- ============================================================
-- H3: Validate the activity_logs aksi CHECK constraint
-- ============================================================
-- The constraint was added as NOT VALID in migration 0031.
-- VALIDATE checks all existing rows without taking an ACCESS EXCLUSIVE
-- lock (unlike ALTER TABLE ... ADD CONSTRAINT).
DO $$
DECLARE
  v_constraint_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'activity_logs_aksi_check'
      AND conrelid = 'public.activity_logs'::regclass
  ) INTO v_constraint_exists;

  IF v_constraint_exists THEN
    ALTER TABLE public.activity_logs VALIDATE CONSTRAINT activity_logs_aksi_check;
  END IF;
END $$;
