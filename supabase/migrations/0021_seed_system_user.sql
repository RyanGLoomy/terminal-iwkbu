-- 0021_seed_system_user.sql
--
-- Seed profil sistem-user untuk Temuan otomatis hasil Rekonsiliasi (cron
-- terjadwal, initiated_by NULL). Kolom findings.created_by NOT NULL dan
-- REFERENCES profiles(id). Tanpa baris ini, environment/fresh DB baru akan
-- menghasilkan 0 finding (INSERT finding gagal FK, error ditelan).
--
-- Sebelumnya baris ini hanya ada karena di-seed manual di luar version-control
-- pada DB live, sehingga reproducibility hilang & klaim ADR-0001 ("di-seed via
-- migrasi") menyesatkan. Migrasi ini menjadikannya kanonik & idempoten.
--
-- Lihat: ADR-0001, CONTEXT.md "Mesin Rekonsiliasi",
--        src/lib/supabase/queries/iwkbu-sync.server.ts (SYSTEM_USER_ID).

insert into public.profiles (id, email, full_name, is_active)
values (
  '00000000-0000-0000-0000-000000000001',
  'sistem@terminal-iwkbu.internal',
  'Sistem (Rekonsiliasi Otomatis)',
  true
)
on conflict (id) do nothing;
