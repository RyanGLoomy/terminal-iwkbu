-- 0065_realtime_findings.sql
-- Add findings table to Supabase Realtime publication so that staf-iw and PO
-- clients receive live push notifications when findings are created/updated/
-- closed. RLS policies govern which rows each subscriber receives (staf-iw
-- sees all, PO sees their own). Used by the staf-findings-panel and
-- po-findings-panel to trigger router.refresh() on any change (debounced 2s).
ALTER PUBLICATION supabase_realtime ADD TABLE public.findings;
