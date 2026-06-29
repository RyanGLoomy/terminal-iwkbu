-- 0022_revoke_anon_rpc_execute.sql
--
-- Menutup celah level-DB: setiap fungsi SECURITY DEFINER di schema `public`
-- secara default boleh dijalankan (EXECUTE) oleh PUBLIC, sehingga anon maupun
-- authenticated mewarisinya dan bisa memanggilnya via /rest/v1/rpc/<name>.
--
-- Dampak sebelum migrasi (Supabase advisor, live):
--   * log_activity  -> anon bisa MEMASUKKAN baris audit palsu (forgery audit trail)
--   * rls_auto_enable -> anon/authenticated bisa mem-toggle RLS
--   * handle_new_user -> anon bisa memanggil langsung (vektor langsung)
--   * get_admin_statistics / get_weekly_trends -> anon bisa membaca statistik terminal
--
-- Strategi (lihat skill supabase "SECURITY DEFINER in public"):
--   * REVOKE FROM PUBLIC untuk semua (menghapus warisan anon & authenticated).
--   * GRANT TO authenticated hanya untuk fungsi yang APP panggil via RPC
--     dengan klien user (log_activity path fallback, get_admin_statistics,
--     get_weekly_trends). Aplikasi memakai admin client untuk sisanya.
--   * Trigger (handle_new_user) tetap aktif: pemanggilan trigger TIDAK butuh
--     privilege EXECUTE pada SECURITY DEFINER function.
--   * rls_auto_enable: maintenance-only -> tidak di-grant balik ke siapa pun.
--
-- Catatan: REVOKE dari anon/authenticated saja TIDAK cukup karena mereka bisa
-- mewarisi dari PUBLIC; harus REVOKE dari PUBLIC lalu GRANT selektif. Selain
-- itu, beberapa fungsi (log_activity, handle_new_user) punya GRANT langsung ke
-- `anon` (anon=X pada pg_proc.proacl), sehingga harus direvoke eksplisit dari
-- `anon` juga — REVOKE FROM PUBLIC saja tidak menghapus grant langsung tsb.

revoke execute on function public.log_activity(text, text, jsonb) from public, anon;
grant  execute on function public.log_activity(text, text, jsonb) to authenticated;

revoke execute on function public.rls_auto_enable() from public, anon;

-- Trigger handle_new_user tetap aktif tanpa privilege EXECUTE publik
-- (pemanggilan trigger TIDAK butuh EXECUTE pada SECURITY DEFINER function).
revoke execute on function public.handle_new_user() from public, anon;

revoke execute on function public.get_admin_statistics(uuid, date) from public, anon;
grant  execute on function public.get_admin_statistics(uuid, date) to authenticated;

revoke execute on function public.get_weekly_trends(uuid) from public, anon;
grant  execute on function public.get_weekly_trends(uuid) to authenticated;

