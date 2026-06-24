-- ============================================================
-- FASE 3: Bootstrap staf-iw user
-- Creates a default staf-iw account for initial access.
-- CHANGE THE PASSWORD after first login!
-- Default credentials: staf.iw@terminal.go.id / StafIw@2026!
--
-- NOTE: The auth user MUST be created via the GoTrue Admin API
-- (POST /auth/v1/admin/users) or `supabase` CLI, NOT via direct
-- SQL INSERT into auth.users. GoTrue caches user state internally
-- and a raw SQL insert will cause "Database error loading user"
-- on login. The SQL below handles profile + role assignment only.
-- ============================================================

-- Consolidate role names (migrate underscore → hyphenated).
UPDATE user_roles SET role_id = (SELECT id FROM roles WHERE name = 'staf-iw' LIMIT 1)
WHERE role_id = (SELECT id FROM roles WHERE name = 'staf_iw' LIMIT 1)
  AND EXISTS (SELECT 1 FROM roles WHERE name = 'staf-iw');

UPDATE user_roles SET role_id = (SELECT id FROM roles WHERE name = 'admin-terminal' LIMIT 1)
WHERE role_id = (SELECT id FROM roles WHERE name = 'admin_terminal' LIMIT 1)
  AND EXISTS (SELECT 1 FROM roles WHERE name = 'admin-terminal');

-- Create profile for the staf-iw user (assumes auth user already exists
-- via GoTrue Admin API).
INSERT INTO public.profiles (id, email, full_name, is_active)
SELECT au.id, au.email, 'Staf IW Bootstrap', true
FROM auth.users au
WHERE au.email = 'staf.iw@terminal.go.id'
  AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = au.id);

-- Assign role.
INSERT INTO public.user_roles (user_id, role_id)
SELECT au.id, (SELECT id FROM public.roles WHERE name = 'staf-iw' LIMIT 1)
FROM auth.users au
WHERE au.email = 'staf.iw@terminal.go.id'
  AND NOT EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = au.id
        AND ur.role_id = (SELECT id FROM public.roles WHERE name = 'staf-iw' LIMIT 1)
  );
