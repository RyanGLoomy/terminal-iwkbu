-- ============================================================
-- FASE 1.1: Upload dokumen armada
-- Table: armada_dokumen
-- Storage bucket: armada-dokumen (private, RLS-controlled)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.armada_dokumen (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    armada_id     UUID NOT NULL REFERENCES public.armada(id) ON DELETE CASCADE,
    jenis_dokumen TEXT NOT NULL CHECK (jenis_dokumen IN ('stck', 'kir', 'asuransi', 'lainnya')),
    file_path     TEXT NOT NULL,
    file_name     TEXT NOT NULL,
    file_size     BIGINT,
    mime_type     TEXT,
    uploaded_by   UUID REFERENCES auth.users(id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_armada_dokumen_armada_id ON public.armada_dokumen(armada_id);

ALTER TABLE public.armada_dokumen ENABLE ROW LEVEL SECURITY;

-- PO can manage documents for their own armada
CREATE POLICY "po_select_own_dokumen" ON public.armada_dokumen
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.armada a
            WHERE a.id = armada_dokumen.armada_id
              AND a.po_id = auth.uid()
        )
    );

CREATE POLICY "po_insert_own_dokumen" ON public.armada_dokumen
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.armada a
            WHERE a.id = armada_dokumen.armada_id
              AND a.po_id = auth.uid()
        )
    );

CREATE POLICY "po_delete_own_dokumen" ON public.armada_dokumen
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.armada a
            WHERE a.id = armada_dokumen.armada_id
              AND a.po_id = auth.uid()
        )
    );

-- Staf IW & admin-terminal can read all armada documents
CREATE POLICY "staf_read_all_dokumen" ON public.armada_dokumen
    FOR SELECT TO authenticated
    USING (public.is_staf_iw() OR public.is_admin_terminal());

-- ============================================================
-- Storage bucket: armada-dokumen (private)
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'armada-dokumen',
    'armada-dokumen',
    false,
    5242880, -- 5 MB
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Storage RLS: PO can manage files in their own folder
CREATE POLICY "po_upload_own_armada_dokumen" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'armada-dokumen'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "po_read_own_armada_dokumen" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'armada-dokumen'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "po_delete_own_armada_dokumen" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'armada-dokumen'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Staf IW & admin-terminal can read all armada documents
CREATE POLICY "staf_read_all_armada_dokumen" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'armada-dokumen'
        AND (public.is_staf_iw() OR public.is_admin_terminal())
    );
