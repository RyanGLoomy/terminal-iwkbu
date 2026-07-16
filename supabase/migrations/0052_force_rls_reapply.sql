-- 0052_force_rls_reapply.sql
--
-- H2: 0004_security_hardening menjalankan FORCE ROW LEVEL SECURITY pada 17
--     tabel sensitif, namun live DB menunjukkan relforcerowsecurity=false di
--     semua tabel tersebut (FORCE tidak berlaku, kemungkinan di-revert oleh
--     operasi DDL turunan seperti ALTER TABLE ... REPLICA). Tanpa FORCE, table
--     owner bebas dari RLS. service_role tetap bypass RLS via BYPASSRLS
--     sehingga dampak produksi rendah, tapi hardening yang 0004 klaim tidak
--     hadir. Re-apply FORCE agar konsisten dengan maksud 0004.
--
-- Idempotent: FORCE pada tabel yang sudah FORCE adalah no-op.

ALTER TABLE public.activity_logs          FORCE ROW LEVEL SECURITY;
ALTER TABLE public.armada                 FORCE ROW LEVEL SECURITY;
ALTER TABLE public.findings               FORCE ROW LEVEL SECURITY;
ALTER TABLE public.finding_clarifications FORCE ROW LEVEL SECURITY;
ALTER TABLE public.finding_actions        FORCE ROW LEVEL SECURITY;
ALTER TABLE public.po                     FORCE ROW LEVEL SECURITY;
ALTER TABLE public.profiles               FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles             FORCE ROW LEVEL SECURITY;
ALTER TABLE public.petugas_terminal       FORCE ROW LEVEL SECURITY;
ALTER TABLE public.petugas_pin_sessions   FORCE ROW LEVEL SECURITY;
ALTER TABLE public.kendaraan_masuk        FORCE ROW LEVEL SECURITY;
ALTER TABLE public.kendaraan_keluar       FORCE ROW LEVEL SECURITY;
ALTER TABLE public.sesi_petugas           FORCE ROW LEVEL SECURITY;
ALTER TABLE public.iwkbu_source_records   FORCE ROW LEVEL SECURITY;
ALTER TABLE public.iwkbu_sync_runs        FORCE ROW LEVEL SECURITY;
ALTER TABLE public.iwkbu_sync_status      FORCE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings        FORCE ROW LEVEL SECURITY;
