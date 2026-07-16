-- ============================================================================
-- 0043_fk_standardize_and_cleanup.sql
--
-- M5 (LOW): 3 FK masih menunjuk auth.users.id alih-alih profiles.id,
-- menyebabkan pola JOIN tidak konsisten (beberapa via profiles, beberapa
-- via auth.users). Standardisasi semuanya ke profiles.id.
--
--   armada_dokumen.uploaded_by       auth.users → profiles ON DELETE SET NULL
--   notifications.user_id            auth.users → profiles ON DELETE CASCADE
--   rekonsiliasi_periode.created_by  auth.users → profiles ON DELETE SET NULL
--
-- profiles.id sendiri tetap → auth.users.id (itu benar).
--
-- L2 (LOW): 3 fungsi touch_updated_at yang hampir identik. Konsolidasi
-- ke satu: touch_updated_at() (search_path '').
--   - update_updated_at_column()  → dipakai armada, po
--   - fn_touch_findings_updated_at() → dipakai findings
--   - touch_updated_at()          → dipakai sisanya (kanonik)
--
-- L4 (LOW): GRANT USAGE ON SCHEMA cron TO authenticated lebih luas dari
-- yang dibutuhkan — authenticated bisa membaca metadata cron.job.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- M5: Standardisasi FK → profiles.id
-- ---------------------------------------------------------------------------

ALTER TABLE public.armada_dokumen
  DROP CONSTRAINT IF EXISTS armada_dokumen_uploaded_by_fkey,
  ADD CONSTRAINT armada_dokumen_uploaded_by_fkey
    FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_user_id_fkey,
  ADD CONSTRAINT notifications_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.rekonsiliasi_periode
  DROP CONSTRAINT IF EXISTS rekonsiliasi_periode_created_by_fkey,
  ADD CONSTRAINT rekonsiliasi_periode_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- L2: Konsolidasi touch_updated_at
-- ---------------------------------------------------------------------------

-- Re-point armada trigger
DROP TRIGGER IF EXISTS update_armada_updated_at ON public.armada;
CREATE TRIGGER update_armada_updated_at
  BEFORE UPDATE ON public.armada
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Re-point po trigger
DROP TRIGGER IF EXISTS update_po_updated_at ON public.po;
CREATE TRIGGER update_po_updated_at
  BEFORE UPDATE ON public.po
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Re-point findings trigger
DROP TRIGGER IF EXISTS trg_findings_touch_updated_at ON public.findings;
CREATE TRIGGER trg_findings_touch_updated_at
  BEFORE UPDATE ON public.findings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Drop redundant functions
DROP FUNCTION IF EXISTS public.update_updated_at_column();
DROP FUNCTION IF EXISTS public.fn_touch_findings_updated_at();

-- ---------------------------------------------------------------------------
-- L4: Narrow cron schema grant
-- ---------------------------------------------------------------------------

REVOKE USAGE ON SCHEMA cron FROM authenticated;
