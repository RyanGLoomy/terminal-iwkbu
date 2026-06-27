-- 0016_finding_evidence_storage_policies.sql
-- Storage RLS policies for finding-evidence bucket.
-- Pattern: path = `${findingId}/${timestamp}-${filename}`
-- foldername(name)[1] = findingId → scope via finding ownership.

-- PO can upload evidence to their own findings
CREATE POLICY "po_upload_own_evidence" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'finding-evidence'
        AND EXISTS (
            SELECT 1 FROM public.findings f
            WHERE f.id::text = (storage.foldername(name))[1]
              AND f.po_id = auth.uid()
        )
    );

-- PO can read evidence from their own findings
CREATE POLICY "po_read_own_evidence" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'finding-evidence'
        AND EXISTS (
            SELECT 1 FROM public.findings f
            WHERE f.id::text = (storage.foldername(name))[1]
              AND f.po_id = auth.uid()
        )
    );

-- Staf IW can read all evidence
CREATE POLICY "staf_read_all_evidence" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'finding-evidence'
        AND public.is_staf_iw()
    );
