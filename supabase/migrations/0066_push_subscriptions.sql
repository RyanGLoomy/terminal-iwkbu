-- 0066: Push notification subscriptions table
-- Stores browser push subscriptions (Web Push API + VAPID) per user.
-- Follows the same pattern as notifications: user_id FK with ON DELETE CASCADE + RLS.

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint    TEXT NOT NULL,
    keys_p256dh TEXT NOT NULL,
    keys_auth   TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(endpoint)
);

CREATE INDEX idx_push_subs_user ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
FORCE ROW LEVEL SECURITY ON public.push_subscriptions;

-- Users can only manage their own push subscriptions
CREATE POLICY user_manage_own_push_subs ON public.push_subscriptions
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
