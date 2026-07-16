-- 0067: Link findings to rekonsiliasi_periode
-- Allows findings to be scoped/filter by reconciliation period.
-- Nullable — existing findings keep NULL (pre-period era).

ALTER TABLE public.findings
    ADD COLUMN IF NOT EXISTS periode_id UUID
    REFERENCES public.rekonsiliasi_periode(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_findings_periode_id
    ON public.findings(periode_id);
