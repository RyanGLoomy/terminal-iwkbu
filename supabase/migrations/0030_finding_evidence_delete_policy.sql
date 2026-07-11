-- 0030_finding_evidence_delete_policy.sql
-- R5 (MEDIUM): bucket finding-evidence punya policy INSERT + SELECT (PO) dan
-- SELECT (staf-iw) di 0016, tapi TIDAK ada policy DELETE. Akibatnya PO/staf-iw
-- tidak bisa menghapus file evidence yang salah upload. Bandingkan bucket
-- armada-dokumen (0007) yang punya po_delete_own_dokumen.
--
-- Path: `${findingId}/${timestamp}-${filename}` -> foldername(name)[1] = findingId.

-- PO dapat menghapus evidence dari temuan miliknya.
CREATE POLICY "po_delete_own_evidence" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'finding-evidence'
    AND EXISTS (
      SELECT 1 FROM public.findings f
      WHERE f.id::text = (storage.foldername(name))[1]
        AND f.po_id = auth.uid()
    )
  );

-- Staf IW dapat menghapus evidence (moderasi / pembersihan).
CREATE POLICY "staf_delete_evidence" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'finding-evidence'
    AND public.is_staf_iw(auth.uid())
  );
