-- 0030_finding_evidence_delete_policy.sql
--
-- Drift capture: Storage DELETE policies untuk bucket 'finding-evidence'.
-- PO dapat menghapus evidence milik finding miliknya.
-- Staf IW dapat menghapus evidence apapun.
-- Sudah diterapkan di live DB.

-- PO delete own evidence
DROP POLICY IF EXISTS "po_delete_own_evidence" ON storage.objects;
CREATE POLICY "po_delete_own_evidence" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'finding-evidence'
    AND EXISTS (
      SELECT 1 FROM findings f
      WHERE f.id::text = (storage.foldername(objects.name))[1]
        AND f.po_id = auth.uid()
    )
  );

-- Staf IW delete any evidence
DROP POLICY IF EXISTS "staf_delete_evidence" ON storage.objects;
CREATE POLICY "staf_delete_evidence" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'finding-evidence'
    AND is_staf_iw(auth.uid())
  );
