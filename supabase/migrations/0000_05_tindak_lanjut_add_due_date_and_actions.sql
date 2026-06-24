-- Captured from live Supabase migration: tindak_lanjut_add_due_date_and_actions (20260622092107)

-- 1. Add due_date to findings for SLA tracking
ALTER TABLE findings ADD COLUMN IF NOT EXISTS due_date date;

-- 2. Create finding_actions table for discrete follow-up tasks
CREATE TABLE IF NOT EXISTS finding_actions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    finding_id uuid NOT NULL REFERENCES findings(id) ON DELETE CASCADE,
    action_text text NOT NULL,
    status text NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'done')),
    done_at timestamptz,
    done_by uuid REFERENCES auth.users(id),
    created_by uuid NOT NULL REFERENCES auth.users(id),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for efficient per-finding queries
CREATE INDEX IF NOT EXISTS idx_finding_actions_finding_id
    ON finding_actions(finding_id);

-- Enable RLS
ALTER TABLE finding_actions ENABLE ROW LEVEL SECURITY;

-- RLS: staf-iw / admin-terminal can see all action items
CREATE POLICY finding_actions_select_staff ON finding_actions
    FOR SELECT TO authenticated
    USING (
        is_staf_iw(auth.uid()) OR is_admin_terminal(auth.uid())
    );

-- RLS: PO can see actions on their own findings
CREATE POLICY finding_actions_select_po ON finding_actions
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM findings f
            WHERE f.id = finding_actions.finding_id
              AND f.po_id = auth.uid()
        )
    );

-- RLS: only staf-iw / admin-terminal can create/update actions
CREATE POLICY finding_actions_insert_staff ON finding_actions
    FOR INSERT TO authenticated
    WITH CHECK (
        is_staf_iw(auth.uid()) OR is_admin_terminal(auth.uid())
    );

CREATE POLICY finding_actions_update_staff ON finding_actions
    FOR UPDATE TO authenticated
    USING (
        is_staf_iw(auth.uid()) OR is_admin_terminal(auth.uid())
    )
    WITH CHECK (
        is_staf_iw(auth.uid()) OR is_admin_terminal(auth.uid())
    );
