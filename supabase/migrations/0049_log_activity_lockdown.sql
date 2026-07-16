-- 0049_log_activity_lockdown.sql
--
-- M1: log_activity() RPC diberikan ke authenticated, sehingga user manapun
--     bisa insert baris audit palsu (aksi dari whitelist CHECK, deskripsi/
--     metadata arbitrer). Audit trail yang trustworthy hanya yang di-generate
--     oleh trigger fn_log_* (fired by real DML).
--
-- Fix: REVOKE EXECUTE dari authenticated. App sudah direfactor: logActivity()
--     di operasional.server.ts selalu menggunakan createAdminClient() untuk
--     insert langsung ke activity_logs (bypass RLS), tidak lagi memanggil RPC.
--
-- Function tetap ada (tidak DROP) untuk backward-compat jika ada trigger
-- yang memanggilnya di masa depan, tapi tidak callable oleh client.

REVOKE EXECUTE ON FUNCTION public.log_activity(text, text, jsonb) FROM authenticated;
