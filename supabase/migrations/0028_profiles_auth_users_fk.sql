-- 0028_profiles_auth_users_fk.sql
--
-- Drift capture: FK dari profiles.id ke auth.users.id.
-- Formalisasi relasi auth ↔ profile. Sudah diterapkan di live DB.
-- Idempotent.
--
-- NOT VALID: profil sistem-user sintetik (seed 0021,
-- '00000000-0000-0000-0000-000000000001') tidak punya pasangan di auth.users
-- (cron rekonsiliasi memakainya sebagai findings.created_by). Tanpa NOT VALID,
-- ADD CONSTRAINT memvalidasi baris existing saat fresh `supabase db reset`
-- (auth.users masih kosong) → gagal. Live DB sudah NOT VALID (convalidated=false);
-- migrasi ini direkonsiliasi agar repo = live dan fresh reset berhasil.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_id_fkey_auth'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_id_fkey_auth
      FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
  END IF;
END $$;
