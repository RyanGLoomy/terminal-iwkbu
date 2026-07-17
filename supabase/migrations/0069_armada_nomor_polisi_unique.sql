-- 0069: Enforce global uniqueness on armada.nomor_polisi
-- A plate belongs to exactly ONE PO — no cross-PO duplicates allowed.
--
-- Steps:
-- 1. Normalize all plates to uppercase + strip spaces
-- 2. Deduplicate: keep one record per plate (smallest id wins)
-- 3. Add UNIQUE index

-- Step 1: Normalize plate format
UPDATE armada SET nomor_polisi = upper(replace(nomor_polisi, ' ', ''))
WHERE nomor_polisi != upper(replace(nomor_polisi, ' ', ''));

-- Step 2: Remove duplicates (keep row with smallest id per plate)
DELETE FROM armada a USING armada b
WHERE a.nomor_polisi = b.nomor_polisi AND a.id > b.id;

-- Step 3: Enforce uniqueness going forward
CREATE UNIQUE INDEX IF NOT EXISTS armada_nomor_polisi_unique ON armada (nomor_polisi);
