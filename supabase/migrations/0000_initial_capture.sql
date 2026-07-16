-- 0000_initial_capture.sql
--
-- Consolidated capture of 6 pre-repo migrations that were applied directly
-- to the live Supabase DB before the local migration system was set up.
-- These were originally tracked as separate live migrations:
--   01_add_missing_admin_dashboard_rpcs
--   02_fix_handle_new_user_security_definer
--   03_harden_activity_log_triggers_for_seed
--   04_add_offset_to_get_activity_logs
--   05_tindak_lanjut_add_due_date_and_actions
--   06_master_data_jenis_kendaraan_and_settings
--
-- All 6 share version 0000 in schema_migrations. Consolidated into one
-- file so `supabase db push` recognises version 0000 as applied.

-- ============================================================
-- 01: add_missing_admin_dashboard_rpcs
-- ============================================================
create or replace function public.get_admin_statistics(p_terminal_id uuid, p_date date)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select public.get_admin_terminal_stats(p_terminal_id, p_date)
$$;

create or replace function public.get_weekly_trends(p_terminal_id uuid)
returns table(tanggal text, label text, masuk integer, keluar integer, total integer)
language sql
stable
security definer
set search_path = public
as $$
  with days as (
    select generate_series((current_date - interval '6 days')::date, current_date, interval '1 day')::date as day
  ), masuk_counts as (
    select km.waktu_masuk::date as day, count(*)::integer as cnt
    from public.kendaraan_masuk km
    join public.sesi_petugas sp on sp.id = km.sesi_id
    where sp.terminal_id = p_terminal_id
      and km.waktu_masuk >= (current_date - interval '6 days')::timestamptz
    group by km.waktu_masuk::date
  ), keluar_counts as (
    select kk.waktu_keluar::date as day, count(*)::integer as cnt
    from public.kendaraan_keluar kk
    join public.sesi_petugas sp on sp.id = kk.sesi_id
    where sp.terminal_id = p_terminal_id
      and kk.waktu_keluar >= (current_date - interval '6 days')::timestamptz
    group by kk.waktu_keluar::date
  )
  select
    d.day::text as tanggal,
    case extract(dow from d.day)::int
      when 0 then 'Min'
      when 1 then 'Sen'
      when 2 then 'Sel'
      when 3 then 'Rab'
      when 4 then 'Kam'
      when 5 then 'Jum'
      else 'Sab'
    end as label,
    coalesce(m.cnt, 0) as masuk,
    coalesce(k.cnt, 0) as keluar,
    coalesce(m.cnt, 0) + coalesce(k.cnt, 0) as total
  from days d
  left join masuk_counts m on m.day = d.day
  left join keluar_counts k on k.day = d.day
  order by d.day
$$;

grant execute on function public.get_admin_statistics(uuid, date) to authenticated, service_role;
grant execute on function public.get_weekly_trends(uuid) to authenticated, service_role;

-- ============================================================
-- 02: fix_handle_new_user_security_definer
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role_name text;
  v_role_id integer;
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    updated_at = now();

  v_role_name := nullif(new.raw_user_meta_data->>'role', '');

  if v_role_name is not null then
    select id into v_role_id
    from public.roles
    where name = v_role_name
    limit 1;

    if v_role_id is not null then
      insert into public.user_roles (user_id, role_id)
      values (new.id, v_role_id)
      on conflict (user_id, role_id) do nothing;
    end if;
  end if;

  return new;
end;
$$;

-- ============================================================
-- 03: harden_activity_log_triggers_for_seed
-- ============================================================
create or replace function public.log_activity(p_aksi text, p_deskripsi text default null, p_metadata jsonb default '{}'::jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
begin
  if v_user is null then
    return null;
  end if;

  insert into public.activity_logs (user_id, aksi, deskripsi, metadata)
  values (v_user, p_aksi, p_deskripsi, coalesce(p_metadata, '{}'::jsonb))
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.fn_log_pin_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    return new;
  end if;

  if TG_OP = 'INSERT' then
    insert into public.activity_logs (user_id, aksi, deskripsi, metadata)
    values (
      v_user,
      'SET_PIN',
      format('Set PIN untuk petugas: %s', new.nama),
      json_build_object(
        'petugas_terminal_id', new.id,
        'terminal_id', new.terminal_id,
        'nama', new.nama,
        'operasi', 'insert'
      )::jsonb
    );
  elsif TG_OP = 'UPDATE' and old.pin_hash is distinct from new.pin_hash then
    insert into public.activity_logs (user_id, aksi, deskripsi, metadata)
    values (
      v_user,
      'SET_PIN',
      format('Update PIN petugas: %s', new.nama),
      json_build_object(
        'petugas_terminal_id', new.id,
        'terminal_id', new.terminal_id,
        'nama', new.nama,
        'operasi', 'update'
      )::jsonb
    );
  end if;

  return new;
end;
$$;

alter function public.fn_log_sesi_changes() security definer;
alter function public.fn_log_transaksi_masuk() security definer;
alter function public.fn_log_transaksi_keluar() security definer;
alter function public.fn_log_hapus_transaksi_masuk() security definer;
alter function public.fn_log_hapus_transaksi_keluar() security definer;
alter function public.fn_log_finding_changes() security definer;
alter function public.fn_log_clarification_changes() security definer;

grant execute on function public.log_activity(text, text, jsonb) to authenticated, service_role;

-- ============================================================
-- 04: add_offset_to_get_activity_logs
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_activity_logs(
  p_start_date date DEFAULT CURRENT_DATE,
  p_end_date date DEFAULT CURRENT_DATE,
  p_aksi text DEFAULT NULL,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(id uuid, user_id uuid, user_name text, aksi text, deskripsi text, metadata jsonb, created_at timestamp with time zone)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
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
  order by al.created_at desc
  limit p_limit
  offset p_offset;
$function$;

-- ============================================================
-- 05: tindak_lanjut_add_due_date_and_actions
-- ============================================================
ALTER TABLE findings ADD COLUMN IF NOT EXISTS due_date date;

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

CREATE INDEX IF NOT EXISTS idx_finding_actions_finding_id
    ON finding_actions(finding_id);

ALTER TABLE finding_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY finding_actions_select_staff ON finding_actions
    FOR SELECT TO authenticated
    USING (
        is_staf_iw(auth.uid()) OR is_admin_terminal(auth.uid())
    );

CREATE POLICY finding_actions_select_po ON finding_actions
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM findings f
            WHERE f.id = finding_actions.finding_id
              AND f.po_id = auth.uid()
        )
    );

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

-- ============================================================
-- 06: master_data_jenis_kendaraan_and_settings
-- ============================================================
CREATE TABLE public.jenis_kendaraan (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nama        varchar NOT NULL UNIQUE,
    kode        varchar NOT NULL UNIQUE,
    keterangan  text,
    urutan      integer NOT NULL DEFAULT 0,
    is_active   boolean NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.jenis_kendaraan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jenis_kendaraan_read"
    ON public.jenis_kendaraan
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "jenis_kendaraan_write"
    ON public.jenis_kendaraan
    FOR ALL TO authenticated
    USING (is_staf_iw(auth.uid()))
    WITH CHECK (is_staf_iw(auth.uid()));

INSERT INTO public.jenis_kendaraan (nama, kode, urutan) VALUES
    ('Bus Besar',    'BUS_BESAR',   1),
    ('Bus Sedang',   'BUS_SEDANG',  2),
    ('Minibus',      'MINIBUS',     3),
    ('Microbus',     'MICROBUS',    4);

CREATE TABLE public.system_settings (
    key         text PRIMARY KEY,
    value       text NOT NULL,
    description text,
    category    varchar NOT NULL DEFAULT 'general',
    updated_at  timestamptz NOT NULL DEFAULT now(),
    updated_by  uuid REFERENCES auth.users(id)
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "system_settings_read"
    ON public.system_settings
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "system_settings_write"
    ON public.system_settings
    FOR ALL TO authenticated
    USING (is_staf_iw(auth.uid()))
    WITH CHECK (is_staf_iw(auth.uid()));

INSERT INTO public.system_settings (key, value, description, category) VALUES
    ('app_name',              'Terminal IWKBU', 'Nama aplikasi yang ditampilkan',     'general'),
    ('pin_max_attempts',      '5',              'Maksimum percobaan PIN sebelum lockout', 'security'),
    ('pin_lockout_minutes',   '15',             'Durasi lockout PIN dalam menit',      'security'),
    ('sync_auto_enabled',     'false',          'Aktifkan sinkronisasi IWKBU otomatis', 'sync');

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_jenis_kendaraan_touch
    BEFORE UPDATE ON public.jenis_kendaraan
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_system_settings_touch
    BEFORE UPDATE ON public.system_settings
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
