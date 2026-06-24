-- ============================================================================
-- 0003_rls_policies.sql
-- Row-Level Security. Deny-by-default: tabel di-enable RLS-nya, lalu hanya
-- operasi yang punya policy eksplisit yang diizinkan. Dipakai sebagai lapisan
-- pertahanan terakhir karena middleware (proxy.ts) melewatkan path /api.
-- ============================================================================

-- Aktifkan RLS di semua tabel aplikasi
alter table activity_logs          enable row level security;
alter table armada                 enable row level security;
alter table finding_actions        enable row level security;
alter table finding_clarifications enable row level security;
alter table findings               enable row level security;
alter table iwkbu_source_records   enable row level security;
alter table iwkbu_sync_runs        enable row level security;
alter table iwkbu_sync_status      enable row level security;
alter table jenis_kendaraan        enable row level security;
alter table kendaraan_keluar       enable row level security;
alter table kendaraan_masuk        enable row level security;
alter table petugas_pin_sessions   enable row level security;
alter table petugas_terminal       enable row level security;
alter table po                      enable row level security;
alter table profiles               enable row level security;
alter table roles                  enable row level security;
alter table sesi_petugas           enable row level security;
alter table system_settings        enable row level security;
alter table terminal_pins          enable row level security;
alter table terminals              enable row level security;
alter table user_roles             enable row level security;

-- ---------------------------------------------------------------------------
-- activity_logs
-- ---------------------------------------------------------------------------
create policy "users_select_own_log" on activity_logs
  for select using (user_id = auth.uid());
create policy "users_insert_own_log" on activity_logs
  for insert with check (user_id = auth.uid());
create policy "admin_select_all_logs" on activity_logs
  for select using (is_admin_terminal(auth.uid()) or is_staf_iw(auth.uid()));
create policy "admin_insert_logs" on activity_logs
  for insert with check (is_admin_terminal(auth.uid()) or is_staf_iw(auth.uid()));

-- ---------------------------------------------------------------------------
-- armada
-- ---------------------------------------------------------------------------
create policy "PO can view own armada" on armada
  for select using (
    po_id = auth.uid()
    and exists (select 1 from po where po.id = auth.uid() and po.status_verifikasi = 'aktif')
  );
create policy "Admin Terminal can view all armada" on armada
  for select using (is_admin_terminal(auth.uid()));
create policy "Staf IW can view all armada" on armada
  for select using (is_staf_iw(auth.uid()));
create policy "PO can insert own armada" on armada
  for insert with check (
    po_id = auth.uid()
    and exists (select 1 from po where po.id = auth.uid() and po.status_verifikasi = 'aktif')
  );
create policy "PO can update own armada" on armada
  for update using (
    po_id = auth.uid()
    and exists (select 1 from po where po.id = auth.uid() and po.status_verifikasi = 'aktif')
  )
  with check (po_id = auth.uid());
create policy "Staf IW can verify armada" on armada
  for update to authenticated
  using (is_staf_iw(auth.uid())) with check (is_staf_iw(auth.uid()));

-- ---------------------------------------------------------------------------
-- findings
-- ---------------------------------------------------------------------------
create policy "findings_select_po_own" on findings
  for select using (po_id = auth.uid());
create policy "findings_select_staff" on findings
  for select using (is_staf_iw(auth.uid()) or is_admin_terminal(auth.uid()));
create policy "findings_insert_staff" on findings
  for insert with check (is_staf_iw(auth.uid()) or is_admin_terminal(auth.uid()));
create policy "findings_update_staff" on findings
  for update using (is_staf_iw(auth.uid()) or is_admin_terminal(auth.uid()));

-- ---------------------------------------------------------------------------
-- finding_clarifications
-- ---------------------------------------------------------------------------
create policy "clarifications_select_related" on finding_clarifications
  for select using (
    is_staf_iw(auth.uid()) or is_admin_terminal(auth.uid())
    or exists (
      select 1 from findings f
      where f.id = finding_clarifications.finding_id and f.po_id = auth.uid()
    )
  );
create policy "clarifications_insert_po" on finding_clarifications
  for insert with check (
    responder_id = auth.uid()
    and (
      is_staf_iw(auth.uid()) or is_admin_terminal(auth.uid())
      or exists (
        select 1 from findings f
        where f.id = finding_clarifications.finding_id and f.po_id = auth.uid()
      )
    )
  );

-- ---------------------------------------------------------------------------
-- finding_actions
-- ---------------------------------------------------------------------------
create policy "finding_actions_select_po" on finding_actions
  for select to authenticated using (
    exists (
      select 1 from findings f
      where f.id = finding_actions.finding_id and f.po_id = auth.uid()
    )
  );
create policy "finding_actions_select_staff" on finding_actions
  for select to authenticated using (is_staf_iw(auth.uid()) or is_admin_terminal(auth.uid()));
create policy "finding_actions_insert_staff" on finding_actions
  for insert to authenticated with check (is_staf_iw(auth.uid()) or is_admin_terminal(auth.uid()));
create policy "finding_actions_update_staff" on finding_actions
  for update to authenticated
  using (is_staf_iw(auth.uid()) or is_admin_terminal(auth.uid()))
  with check (is_staf_iw(auth.uid()) or is_admin_terminal(auth.uid()));

-- ---------------------------------------------------------------------------
-- iwkbu_source_records / iwkbu_sync_runs / iwkbu_sync_status
-- ---------------------------------------------------------------------------
create policy "iwkbu_source_select_staff" on iwkbu_source_records
  for select using (is_staf_iw(auth.uid()) or is_admin_terminal(auth.uid()));
create policy "iwkbu_source_write_staff" on iwkbu_source_records
  for all using (is_staf_iw(auth.uid())) with check (is_staf_iw(auth.uid()));

create policy "iwkbu_runs_select_staff" on iwkbu_sync_runs
  for select using (is_staf_iw(auth.uid()) or is_admin_terminal(auth.uid()));
create policy "iwkbu_runs_write_staff" on iwkbu_sync_runs
  for all using (is_staf_iw(auth.uid())) with check (is_staf_iw(auth.uid()));

create policy "iwkbu_status_select_po_own" on iwkbu_sync_status
  for select using (po_id = auth.uid());
create policy "iwkbu_status_select_staff" on iwkbu_sync_status
  for select using (is_staf_iw(auth.uid()) or is_admin_terminal(auth.uid()));
create policy "iwkbu_status_write_staff" on iwkbu_sync_status
  for all using (is_staf_iw(auth.uid())) with check (is_staf_iw(auth.uid()));

-- ---------------------------------------------------------------------------
-- jenis_kendaraan
-- ---------------------------------------------------------------------------
create policy "jenis_kendaraan_read" on jenis_kendaraan
  for select to authenticated using (true);
create policy "jenis_kendaraan_write" on jenis_kendaraan
  for all to authenticated using (is_staf_iw(auth.uid())) with check (is_staf_iw(auth.uid()));

-- ---------------------------------------------------------------------------
-- kendaraan_masuk / kendaraan_keluar
-- ---------------------------------------------------------------------------
create policy "all_roles_select_masuk" on kendaraan_masuk
  for select using (
    petugas_id = auth.uid() or is_admin_terminal(auth.uid()) or is_staf_iw(auth.uid())
  );
create policy "petugas_insert_own_masuk" on kendaraan_masuk
  for insert with check (petugas_id = auth.uid());

create policy "all_roles_select_keluar" on kendaraan_keluar
  for select using (
    petugas_id = auth.uid() or is_admin_terminal(auth.uid()) or is_staf_iw(auth.uid())
  );
create policy "petugas_insert_own_keluar" on kendaraan_keluar
  for insert with check (petugas_id = auth.uid());

-- ---------------------------------------------------------------------------
-- petugas_pin_sessions
-- ---------------------------------------------------------------------------
create policy "users_select_own_pin_session" on petugas_pin_sessions
  for select using (user_id = auth.uid());
create policy "users_insert_own_pin_session" on petugas_pin_sessions
  for insert with check (user_id = auth.uid());
create policy "users_update_own_pin_session" on petugas_pin_sessions
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users_delete_own_pin_session" on petugas_pin_sessions
  for delete using (user_id = auth.uid());
create policy "petugas_pin_sessions_self" on petugas_pin_sessions
  for all using (user_id = auth.uid() and is_loket(auth.uid()))
  with check (user_id = auth.uid() and is_loket(auth.uid()));

-- ---------------------------------------------------------------------------
-- petugas_terminal
-- ---------------------------------------------------------------------------
create policy "petugas_terminal_select_scope" on petugas_terminal
  for select using (
    is_admin_terminal(auth.uid()) or is_staf_iw(auth.uid())
    or terminal_id = (select profiles.terminal_id from profiles where profiles.id = auth.uid())
  );
create policy "petugas_terminal_write_scope" on petugas_terminal
  for insert with check (
    is_admin_terminal(auth.uid()) or is_staf_iw(auth.uid())
    or terminal_id = (select profiles.terminal_id from profiles where profiles.id = auth.uid())
  );
create policy "petugas_terminal_update_scope" on petugas_terminal
  for update using (
    is_admin_terminal(auth.uid()) or is_staf_iw(auth.uid())
    or terminal_id = (select profiles.terminal_id from profiles where profiles.id = auth.uid())
  )
  with check (
    is_admin_terminal(auth.uid()) or is_staf_iw(auth.uid())
    or terminal_id = (select profiles.terminal_id from profiles where profiles.id = auth.uid())
  );
create policy "admin_manage_petugas_terminal" on petugas_terminal
  for all using (is_admin_terminal(auth.uid()) or is_staf_iw(auth.uid()));
create policy "loket_read_petugas_terminal" on petugas_terminal
  for select using (true);

-- ---------------------------------------------------------------------------
-- po
-- ---------------------------------------------------------------------------
create policy "PO can view own data" on po
  for select using (id = auth.uid());
create policy "PO can insert own data" on po
  for insert with check (id = auth.uid());
create policy "PO can update own data" on po
  for update using (id = auth.uid())
  with check (id = auth.uid() and status_verifikasi = 'menunggu');
create policy "Admin Terminal can view all PO" on po
  for select using (is_admin_terminal(auth.uid()));
create policy "Staf IW can view all PO" on po
  for select using (is_staf_iw(auth.uid()));
create policy "Staf IW can verify PO" on po
  for update using (is_staf_iw(auth.uid())) with check (is_staf_iw(auth.uid()));

-- ---------------------------------------------------------------------------
-- profiles / roles / user_roles
-- ---------------------------------------------------------------------------
create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);
create policy "Admins can view all profiles" on profiles
  for select using (is_super_admin());

create policy "roles_select_all" on roles
  for select using (true);

create policy "user_roles_select_own" on user_roles
  for select using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- sesi_petugas
-- ---------------------------------------------------------------------------
create policy "admin_select_sesi" on sesi_petugas
  for select using (
    petugas_id = auth.uid() or is_admin_terminal(auth.uid()) or is_staf_iw(auth.uid())
  );
create policy "petugas_insert_own_sesi" on sesi_petugas
  for insert with check (petugas_id = auth.uid());
create policy "petugas_update_own_sesi" on sesi_petugas
  for update using (petugas_id = auth.uid()) with check (petugas_id = auth.uid());

-- ---------------------------------------------------------------------------
-- system_settings
-- ---------------------------------------------------------------------------
create policy "system_settings_read" on system_settings
  for select to authenticated using (true);
create policy "system_settings_write" on system_settings
  for all to authenticated using (is_staf_iw(auth.uid())) with check (is_staf_iw(auth.uid()));

-- ---------------------------------------------------------------------------
-- terminal_pins — legacy, dikunci penuh
-- ---------------------------------------------------------------------------
create policy "deny_all_terminal_pins" on terminal_pins
  for all using (false) with check (false);

-- ---------------------------------------------------------------------------
-- terminals
-- ---------------------------------------------------------------------------
create policy "staf_iw_read_all_terminals" on terminals
  for select using (is_staf_iw(auth.uid()));
