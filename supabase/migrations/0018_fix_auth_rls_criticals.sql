-- 0018_fix_auth_rls_criticals.sql
-- SECURITY PATCH (audit 2026-06): AUTH-01 + RLS-01.
--
-- AUTH-01: Role must NOT be derived from user-editable user_metadata.
--   - handle_new_user() now reads role from raw_app_meta_data (server-only).
--     A user cannot set app_metadata via signUp/updateUser, so self-signup can
--     no longer inject an arbitrary role. Admin-created users set
--     app_metadata.role via the service-role admin client.
--   - App-level resolver (src/lib/auth/role.ts) no longer falls back to
--     user_metadata/app_metadata — only the user_roles DB row is trusted.
--
-- RLS-01: profiles UPDATE policy had no WITH CHECK, letting any authenticated
--   user change their own terminal_id / is_active / email via a direct client
--   (cross-terminal scope shift, self-reactivation bypassing admin, email
--   desync). Add WITH CHECK and revoke UPDATE on those sensitive columns from
--   authenticated/anon; only the service role (admin client) may change them.

-- ============================================================
-- 1) handle_new_user(): assign NO authorization role from metadata.
--    An earlier design read role from raw_user_meta_data; that was an
--    AUTH-01 escalation vector (user_metadata is user-editable, including at
--    signUp). Switching to raw_app_meta_data was still insufficient. The
--    trigger now only creates the display profile. Authorization roles are
--    granted exclusively via explicit service-role inserts in the admin
--    routes (admin/petugas, staf-iw/admin-terminal) and the staf-iw PO
--    verification route.
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    updated_at = now();

  -- No role assignment here.
  return new;
end;
$function$;

-- Trigger itself is unchanged (auth.users AFTER INSERT). No-op if present.

-- ============================================================
-- 2) RLS-01: protect profiles.terminal_id / is_active / email from being
--    changed by a logged-in user via a direct client call (bypass-admin-
--    deactivation, cross-terminal scope shift, identity desync).
--
--    NOTE on enforcement: in this project, PostgREST was observed to bypass
--    RLS for UPDATE statements while enforcing it for SELECT (platform
--    anomaly). RLS WITH CHECK + column GRANT/REVOKE therefore do not fully
--    restrain the browser-console path. The definitive control is a BEFORE
--    UPDATE trigger (fires for direct SQL and the SECURITY DEFINER profile
--    upsert). The app additionally routes every legitimate profile write
--    through /api/profile which only ever sets full_name / updated_at.
-- ============================================================
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_deny_clients" ON public.profiles;

-- Nominal own-row UPDATE policy (correct for any environment that enforces
-- UPDATE RLS; harmless where the platform bypasses it).
CREATE POLICY "users_update_own_profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Column-level belt-and-suspenders for direct-SQL contexts.
REVOKE UPDATE ON public.profiles FROM authenticated, anon;
GRANT UPDATE (full_name, updated_at) ON public.profiles TO authenticated;

-- Definitive guard: block changes to authorization-driving columns whenever a
-- user context (auth.uid()) is present.
CREATE OR REPLACE FUNCTION public.guard_profiles_sensitive_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is not null
     and (
       NEW.terminal_id is distinct from OLD.terminal_id
       or NEW.is_active is distinct from OLD.is_active
       or NEW.email is distinct from OLD.email
     ) then
    raise exception 'Profil: kolom terminal_id/is_active/email tidak boleh diubah dari sesi pengguna'
      using errcode = '42501';
  end if;
  return NEW;
end;
$function$;

DROP TRIGGER IF EXISTS trg_guard_profiles_sensitive ON public.profiles;
CREATE TRIGGER trg_guard_profiles_sensitive
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION guard_profiles_sensitive_columns();
