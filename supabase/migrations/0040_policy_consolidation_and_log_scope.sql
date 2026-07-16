-- ============================================================================
-- 0040_policy_consolidation_and_log_scope.sql
--
-- M4 (MEDIUM): 5 tabel punya policy FOR ALL (write) yang ter-shadow dengan
-- policy FOR SELECT terpisah — keduanya PERMISSIVE, di-OR-kan. FOR ALL
-- sudah mengabulkan SELECT, membuat policy SELECT dedicated redundan dan
-- memunculkan warning multiple_permissive_policies.
--
-- Fix: ubah FOR ALL menjadi FOR INSERT/UPDATE/DELETE terpisah. Policy
-- SELECT dedicated menjadi satu-satunya gate baca.
--
-- M3 (MEDIUM): get_activity_logs (SECURITY DEFINER) mem-bypass RLS.
-- Guard internal menerima admin-terminal tapi tidak memfilter berdasarkan
-- terminal_id — admin-terminal Terminal A melihat log Terminal B.
--
-- Fix: scope admin-terminal ke terminal sendiri; staf-iw tetap global.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- M4: Split FOR ALL write policies → per-command
-- ---------------------------------------------------------------------------

-- iwkbu_source_records
DROP POLICY IF EXISTS iwkbu_source_write_staff ON public.iwkbu_source_records;
CREATE POLICY iwkbu_source_insert_staff ON public.iwkbu_source_records
  FOR INSERT TO authenticated WITH CHECK (is_staf_iw(auth.uid()));
CREATE POLICY iwkbu_source_update_staff ON public.iwkbu_source_records
  FOR UPDATE TO authenticated
  USING (is_staf_iw(auth.uid())) WITH CHECK (is_staf_iw(auth.uid()));
CREATE POLICY iwkbu_source_delete_staff ON public.iwkbu_source_records
  FOR DELETE TO authenticated USING (is_staf_iw(auth.uid()));

-- iwkbu_sync_runs
DROP POLICY IF EXISTS iwkbu_runs_write_staff ON public.iwkbu_sync_runs;
CREATE POLICY iwkbu_runs_insert_staff ON public.iwkbu_sync_runs
  FOR INSERT TO authenticated WITH CHECK (is_staf_iw(auth.uid()));
CREATE POLICY iwkbu_runs_update_staff ON public.iwkbu_sync_runs
  FOR UPDATE TO authenticated
  USING (is_staf_iw(auth.uid())) WITH CHECK (is_staf_iw(auth.uid()));
CREATE POLICY iwkbu_runs_delete_staff ON public.iwkbu_sync_runs
  FOR DELETE TO authenticated USING (is_staf_iw(auth.uid()));

-- iwkbu_sync_status
DROP POLICY IF EXISTS iwkbu_status_write_staff ON public.iwkbu_sync_status;
CREATE POLICY iwkbu_status_insert_staff ON public.iwkbu_sync_status
  FOR INSERT TO authenticated WITH CHECK (is_staf_iw(auth.uid()));
CREATE POLICY iwkbu_status_update_staff ON public.iwkbu_sync_status
  FOR UPDATE TO authenticated
  USING (is_staf_iw(auth.uid())) WITH CHECK (is_staf_iw(auth.uid()));
CREATE POLICY iwkbu_status_delete_staff ON public.iwkbu_sync_status
  FOR DELETE TO authenticated USING (is_staf_iw(auth.uid()));

-- jenis_kendaraan
DROP POLICY IF EXISTS jenis_kendaraan_write ON public.jenis_kendaraan;
CREATE POLICY jenis_kendaraan_insert ON public.jenis_kendaraan
  FOR INSERT TO authenticated WITH CHECK (is_staf_iw(auth.uid()));
CREATE POLICY jenis_kendaraan_update ON public.jenis_kendaraan
  FOR UPDATE TO authenticated
  USING (is_staf_iw(auth.uid())) WITH CHECK (is_staf_iw(auth.uid()));
CREATE POLICY jenis_kendaraan_delete ON public.jenis_kendaraan
  FOR DELETE TO authenticated USING (is_staf_iw(auth.uid()));

-- system_settings
DROP POLICY IF EXISTS system_settings_write ON public.system_settings;
CREATE POLICY system_settings_insert ON public.system_settings
  FOR INSERT TO authenticated WITH CHECK (is_staf_iw(auth.uid()));
CREATE POLICY system_settings_update ON public.system_settings
  FOR UPDATE TO authenticated
  USING (is_staf_iw(auth.uid())) WITH CHECK (is_staf_iw(auth.uid()));
CREATE POLICY system_settings_delete ON public.system_settings
  FOR DELETE TO authenticated USING (is_staf_iw(auth.uid()));

-- ---------------------------------------------------------------------------
-- M3: Scope get_activity_logs by terminal for admin-terminal
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_activity_logs(
  p_start_date date DEFAULT CURRENT_DATE,
  p_end_date date DEFAULT CURRENT_DATE,
  p_aksi text DEFAULT NULL::text,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid, user_id uuid, user_name text, aksi text,
  deskripsi text, metadata jsonb, created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_uid uuid := auth.uid();
  v_is_staf_iw boolean;
  v_terminal_id uuid;
begin
  if v_uid is null then
    raise exception 'Akses ditolak: tidak terautentikasi' using errcode = '42501';
  end if;

  v_is_staf_iw := is_staf_iw(v_uid);

  if not (v_is_staf_iw or is_admin_terminal(v_uid)) then
    raise exception 'Akses ditolak: hanya admin-terminal atau staf-iw yang dapat melihat log aktivitas'
      using errcode = '42501';
  end if;

  -- admin-terminal hanya melihat log dari terminal sendiri;
  -- staf-iw melihat semua (v_terminal_id tetap NULL = no filter)
  if not v_is_staf_iw then
    select terminal_id into v_terminal_id
    from profiles
    where id = v_uid;
  end if;

  return query
  select
    al.id,
    al.user_id,
    coalesce(p.full_name, 'System') as user_name,
    al.aksi,
    al.deskripsi,
    al.metadata,
    al.created_at
  from activity_logs al
  left join profiles p on p.id = al.user_id
  where al.created_at >= p_start_date::timestamptz
    and al.created_at < (p_end_date + interval '1 day')::timestamptz
    and (p_aksi is null or al.aksi = p_aksi)
    and (v_is_staf_iw or p.terminal_id = v_terminal_id)
  order by al.created_at desc
  limit p_limit
  offset p_offset;
end;
$$;
