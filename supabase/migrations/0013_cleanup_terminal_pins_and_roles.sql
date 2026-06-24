-- ============================================================================
-- 0013_cleanup_terminal_pins_and_roles.sql
-- A5: Drop legacy terminal_pins table (unused, deny-all RLS, 2 orphan rows).
-- A6: Fix is_super_admin() to only accept staf-iw. Remove unused legacy roles.
-- ============================================================================

-- A5: Drop terminal_pins
DROP TABLE IF EXISTS public.terminal_pins CASCADE;

-- A6: Fix is_super_admin() — remove phantom 'super-admin'/'super_admin' names
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public', 'auth'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND r.name = 'staf-iw'
  );
$$;

-- A6: Clean up unused legacy roles (underscore variants — nobody assigned)
DELETE FROM public.roles WHERE name IN ('admin_terminal', 'staf_iw');
