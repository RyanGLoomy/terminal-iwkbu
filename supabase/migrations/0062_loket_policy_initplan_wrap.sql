-- 0062_loket_policy_initplan_wrap.sql
-- R5-01 polish (round 5 review). The loket UPDATE policy added in 0060 used bare
-- auth.uid(), regressing the 0041 initplan-wrap pattern that every sibling
-- petugas_terminal policy follows. Wrap it as (SELECT auth.uid()) so the planner
-- hoists auth.uid() into an InitPlan (once per query, not once per row).
-- Impact is negligible (tiny table, single-row update) but restores consistency
-- with the rest of the schema and clears the auth_rls_initplan advisor WARN.

DROP POLICY IF EXISTS petugas_terminal_update_loket_own_terminal ON public.petugas_terminal;
CREATE POLICY petugas_terminal_update_loket_own_terminal ON public.petugas_terminal
  FOR UPDATE TO authenticated
  USING (terminal_id = (SELECT terminal_id FROM profiles WHERE id = (SELECT auth.uid())))
  WITH CHECK (terminal_id = (SELECT terminal_id FROM profiles WHERE id = (SELECT auth.uid())));
