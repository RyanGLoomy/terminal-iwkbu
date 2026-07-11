-- 0025_revoke_anon_rate_limit_rpc.sql
-- R2/R3 (HIGH): fungsi rate-limit diberi GRANT ke `anon`, sehingga klien
-- anonim bisa memanggilnya langsung via /rest/v1/rpc/...:
--   * clear_rate_limit(key)  -> reset lockout sendiri -> bypass brute-force
--   * record_rate_limit_attempt -> probe/enumerate status lockout, atau
--     menaikkan counter korban dengan menebak format key (mis. login:<email>).
--
-- Mitigasi: REVOKE dari anon. check_rate_limit tetap anon karena dibutuhkan
-- pre-login (baca-only, mengembalikan retry seconds). Pendamping kode
-- (rate-limiter.ts) sudah dipindah ke admin client sehingga alur login
-- pre-auth tetap berfungsi (service_role bypass EXECUTE grants).

REVOKE EXECUTE ON FUNCTION public.clear_rate_limit(text)
  FROM PUBLIC, anon;

REVOKE EXECUTE ON FUNCTION public.record_rate_limit_attempt(text, integer, integer)
  FROM PUBLIC, anon;

-- check_rate_limit tetap tersedia untuk anon (dibutuhkan pengecekan pre-login,
-- bersifat read-only). Pastikan hanya anon/authenticated, bukan PUBLIC.
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text) TO anon, authenticated;

-- Pertahankan grant authenticated untuk clear/record (defense-in-depth jika
-- ada pemanggil via cookie client yang sudah terautentikasi).
GRANT EXECUTE ON FUNCTION public.clear_rate_limit(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_rate_limit_attempt(text, integer, integer)
  TO authenticated;
