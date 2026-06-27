-- 0017_terminals_admin_rls.sql
-- F10: Admin Terminal harus bisa membaca terminal sendiri (untuk master-data read-only).
-- Saat ini hanya is_staf_iw() yang bisa SELECT terminals.

CREATE POLICY "admin_terminal_read_own" ON public.terminals
    FOR SELECT TO authenticated
    USING (
        is_admin_terminal(auth.uid())
        AND id = (
            SELECT p.terminal_id
            FROM public.profiles p
            WHERE p.id = auth.uid()
        )
    );
