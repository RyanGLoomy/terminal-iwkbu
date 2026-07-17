-- 0070: Index health fixes from ecc-database-reviewer post-audit
--
-- H1: Drop + recreate invalid idx_armada_diverifikasi_oleh
--     (failed CONCURRENTLY build left it in indisready=true, indisvalid=false state)
-- M1: Drop redundant idx_armada_nopol (subsumed by armada_nomor_polisi_unique from 0069)

-- Fix invalid index (was created via CONCURRENTLY that failed partway)
DROP INDEX IF EXISTS public.idx_armada_diverifikasi_oleh;
CREATE INDEX idx_armada_diverifikasi_oleh ON public.armada (diverifikasi_oleh);

-- Drop redundant non-unique index on nomor_polisi
-- (armada_nomor_polisi_unique from migration 0069 already covers all lookups)
DROP INDEX IF EXISTS public.idx_armada_nopol;
