-- 0055_keep_rls_auto_enable.sql
--
-- L1 (LOW) — DITINJAU ULANG: reviewer awal menandai rls_auto_enable() sebagai
--     "dead weight" yang aman di-drop. SALAH: function ini men-backing event
--     trigger `ensure_rls` (ddl_command_end) yang otomatis mengaktifkan RLS
--     pada setiap tabel baru yang dibuat — guardrail keamanan kritis.
--     Mencoba DROP FUNCTION gagal dengan:
--       ERROR: cannot drop function rls_auto_enable() because other objects
--       depend on it — event trigger ensure_rls depends on function
--       rls_auto_enable()
--
-- Keputusan: PERTAHANKAN function. Tidak ada DDL di migrasi ini — hanya
-- mencatat keputusan agar auditor tahu mengapa function tetap ada dan
-- menonaktifkan advisor false-positive di masa depan.

-- No-op: rls_auto_enable() tetap ada untuk men-support event trigger ensure_rls.
SELECT 1;
