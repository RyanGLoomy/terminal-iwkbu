-- ============================================================
-- FASE 2.2: Notifikasi Realtime
-- Table: notifications
-- Realtime publication enabled for live updates.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notifications (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title      TEXT NOT NULL,
    message    TEXT NOT NULL,
    type       TEXT NOT NULL DEFAULT 'info'
               CHECK (type IN ('info', 'success', 'warning', 'error')),
    link       TEXT,
    is_read    BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_select_own_notifications" ON public.notifications
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "user_update_own_notifications" ON public.notifications
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
