-- 0014_finding_evidence_bucket.sql
-- B5: Storage bucket for finding clarification evidence files (private, 5MB, PDF/JPEG/PNG/WebP)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'finding-evidence',
  'finding-evidence',
  false,
  5242880,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;
