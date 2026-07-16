-- 0045_handle_new_user_no_self_grant.sql
--
-- C1 (CRITICAL): handle_new_user() membaca raw_user_meta_data->>'role' dan
-- auto-assign role apa pun yang dikirim klien saat signup. Karena Supabase
-- mengizinkan klien menulis user_metadata arbitrer, attacker bisa set
-- role='staf-iw' atau 'admin-terminal' untuk privilege escalation penuh
-- di layer DB, melewati semua logika aplikasi.
--
-- Fix: hapus blok role-assignment sepenuhnya. Roles hanya di-grant via
-- service-role inserts ke user_roles (provisioning flow admin/staf-iw).
-- PO self-registration menambahkan role 'po' via server-side route
-- /api/auth/register-po (service-role).
--
-- Live DB sudah di-patch via Dashboard; migrasi ini menyelaraskan repo.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = excluded.email,
    full_name = COALESCE(excluded.full_name, public.profiles.full_name),
    updated_at = now();

  RETURN new;
END;
$$;
