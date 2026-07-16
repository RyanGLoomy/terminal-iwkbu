-- 0048_pin_hash_column_revoke.sql
--
-- H1: petugas_terminal.pin_hash dapat dibaca semua authenticated user yang
--     terminal_id cocok (loket di terminal tsb) via PostgREST
--     (GET /rest/v1/petugas_terminal?select=pin_hash). PIN pendek (4-6 digit)
--     + hash bocor = mudah di-crack offline.
--
-- Fix: REVOKE SELECT(pin_hash) dari anon + authenticated. Service-role
-- (bypass RLS) tetap bisa membaca -- semua PIN verification di app sudah
-- menggunakan createAdminClient() (verify-pin, change-pin, upsert-petugas).

REVOKE SELECT (pin_hash) ON public.petugas_terminal FROM anon;
REVOKE SELECT (pin_hash) ON public.petugas_terminal FROM authenticated;
