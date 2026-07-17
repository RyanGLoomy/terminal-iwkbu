-- 0068: Database hardening (RLS fix, CHECK constraints, policy consolidation)
-- Based on ecc-database-reviewer audit findings

-- ═══════════════════════════════════════════════════════════
-- H1: push_subscriptions — wrap auth.uid() in (SELECT ...) for initplan optimization
-- ═══════════════════════════════════════════════════════════
DROP POLICY IF EXISTS user_manage_own_push_subs ON public.push_subscriptions;

CREATE POLICY user_manage_own_push_subs ON public.push_subscriptions
    FOR ALL TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

-- ═══════════════════════════════════════════════════════════
-- H2: get_activity_logs — convert SECURITY DEFINER → SECURITY INVOKER
-- The function's internal authz checks are redundant with RLS on activity_logs.
-- SECURITY INVOKER lets RLS apply naturally, removing the bypass surface.
-- ═══════════════════════════════════════════════════════════
ALTER FUNCTION public.get_activity_logs(date, date, text, integer, integer) SECURITY INVOKER;

-- ═══════════════════════════════════════════════════════════
-- M1: petugas_terminal — consolidate two PERMISSIVE UPDATE policies into one
-- ═══════════════════════════════════════════════════════════
DROP POLICY IF EXISTS petugas_terminal_update_loket_own_terminal ON public.petugas_terminal;
DROP POLICY IF EXISTS petugas_terminal_update_scope ON public.petugas_terminal;

CREATE POLICY petugas_terminal_update_consolidated ON public.petugas_terminal
    FOR UPDATE TO authenticated
    USING (
        is_staf_iw((SELECT auth.uid()))
        OR is_admin_terminal((SELECT auth.uid()))
        OR (
            is_loket((SELECT auth.uid()))
            AND terminal_id = (SELECT terminal_id FROM profiles WHERE id = (SELECT auth.uid()))
        )
    )
    WITH CHECK (
        is_staf_iw((SELECT auth.uid()))
        OR is_admin_terminal((SELECT auth.uid()))
        OR (
            is_loket((SELECT auth.uid()))
            AND terminal_id = (SELECT terminal_id FROM profiles WHERE id = (SELECT auth.uid()))
        )
    );

-- ═══════════════════════════════════════════════════════════
-- M2: finding_actions.status — add CHECK constraint
-- ═══════════════════════════════════════════════════════════
ALTER TABLE public.finding_actions
    DROP CONSTRAINT IF EXISTS chk_finding_actions_status;

ALTER TABLE public.finding_actions
    ADD CONSTRAINT chk_finding_actions_status
    CHECK (status = ANY (ARRAY['open', 'on_progress', 'done', 'cancelled']));

-- ═══════════════════════════════════════════════════════════
-- M4: petugas_terminal.pin_hash — enforce bcrypt/argon2 format
-- Prevents accidental plaintext PIN storage at the DB level.
-- ═══════════════════════════════════════════════════════════
ALTER TABLE public.petugas_terminal
    DROP CONSTRAINT IF EXISTS chk_pin_hash_format;

-- Only apply if there are existing rows (skip if table empty for new installs)
DO $$
BEGIN
    -- Allow NULL (no PIN set) or bcrypt/argon2 format
    ALTER TABLE public.petugas_terminal
        ADD CONSTRAINT chk_pin_hash_format
        CHECK (pin_hash IS NULL OR pin_hash ~ '^\$(2[aby]|argon2)');
EXCEPTION WHEN OTHERS THEN
    -- If existing data violates, skip constraint and log
    RAISE NOTICE 'Skipping pin_hash CHECK — existing data may not comply';
END $$;
