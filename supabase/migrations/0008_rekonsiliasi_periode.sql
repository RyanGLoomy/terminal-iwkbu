-- ============================================================
-- FASE 1.2: Kelola Periode Rekonsiliasi
-- Table: rekonsiliasi_periode
-- ============================================================

CREATE TABLE IF NOT EXISTS public.rekonsiliasi_periode (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_periode    TEXT NOT NULL,
    tanggal_mulai   DATE NOT NULL,
    tanggal_selesai DATE NOT NULL,
    status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'aktif', 'ditutup')),
    created_by      UUID REFERENCES auth.users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_at       TIMESTAMPTZ,
    catatan         TEXT
);

CREATE INDEX idx_periode_status ON public.rekonsiliasi_periode(status);
CREATE INDEX idx_periode_tanggal ON public.rekonsiliasi_periode(tanggal_mulai DESC);

ALTER TABLE public.rekonsiliasi_periode ENABLE ROW LEVEL SECURITY;

-- Staf IW & admin-terminal: full CRUD
CREATE POLICY "staf_manage_periode_select" ON public.rekonsiliasi_periode
    FOR SELECT TO authenticated
    USING (public.is_staf_iw() OR public.is_admin_terminal());

CREATE POLICY "staf_manage_periode_insert" ON public.rekonsiliasi_periode
    FOR INSERT TO authenticated
    WITH CHECK (public.is_staf_iw() OR public.is_admin_terminal());

CREATE POLICY "staf_manage_periode_update" ON public.rekonsiliasi_periode
    FOR UPDATE TO authenticated
    USING (public.is_staf_iw() OR public.is_admin_terminal());

CREATE POLICY "staf_manage_periode_delete" ON public.rekonsiliasi_periode
    FOR DELETE TO authenticated
    USING (public.is_staf_iw() OR public.is_admin_terminal());

-- PO can view periods (read-only)
CREATE POLICY "po_view_periode" ON public.rekonsiliasi_periode
    FOR SELECT TO authenticated
    USING (true);

-- Link sync runs to periods
ALTER TABLE public.iwkbu_sync_runs
    ADD COLUMN IF NOT EXISTS periode_id UUID REFERENCES public.rekonsiliasi_periode(id) ON DELETE SET NULL;
