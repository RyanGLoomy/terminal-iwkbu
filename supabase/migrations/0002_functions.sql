-- ============================================================================
-- 0002_functions.sql
-- RPC functions, role-helper functions, dan trigger yang dipakai aplikasi.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Role helper functions (dipakai oleh RLS policies)
-- ---------------------------------------------------------------------------
create or replace function public.is_staf_iw(user_id uuid default auth.uid())
returns boolean
language sql stable
set search_path to 'public'
as $$
  select exists (
    select 1
    from profiles p
    join user_roles ur on ur.user_id = p.id
    join roles r on r.id = ur.role_id
    where p.id = user_id
      and r.name = 'staf-iw'
  );
$$;

create or replace function public.is_admin_terminal(user_id uuid default auth.uid())
returns boolean
language sql stable
set search_path to 'public'
as $$
  select exists (
    select 1
    from profiles p
    join user_roles ur on ur.user_id = p.id
    join roles r on r.id = ur.role_id
    where p.id = user_id
      and r.name = 'admin-terminal'
  );
$$;

create or replace function public.is_loket(user_id uuid default auth.uid())
returns boolean
language sql stable
set search_path to 'public'
as $$
  select exists (
    select 1
    from profiles p
    join user_roles ur on ur.user_id = p.id
    join roles r on r.id = ur.role_id
    where p.id = user_id
      and r.name = 'loket'
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql stable
set search_path to 'public', 'auth'
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and r.name in ('staf-iw', 'super-admin', 'super_admin')
  );
$$;

create or replace function public.get_user_role(p_user_id uuid)
returns text
language sql stable
set search_path to 'public'
as $$
  select r.name
  from public.user_roles ur
  join public.roles r on r.id = ur.role_id
  where ur.user_id = p_user_id
  limit 1;
$$;

create or replace function public.get_current_user_role()
returns text
language sql stable
set search_path to 'public', 'auth'
as $$
  select public.get_user_role(auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- Trigger: buat profile + role otomatis saat user auth baru dibuat
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Audit log writer (RPC)
-- ---------------------------------------------------------------------------
create or replace function public.log_activity(
  p_aksi text,
  p_deskripsi text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
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

-- ---------------------------------------------------------------------------
-- Reader RPC: audit trail (dengan pagination)
-- ---------------------------------------------------------------------------
create or replace function public.get_activity_logs(
  p_start_date date default current_date,
  p_end_date date default current_date,
  p_aksi text default null,
  p_limit integer default 100,
  p_offset integer default 0
)
returns table(
  id uuid, user_id uuid, user_name text, aksi text,
  deskripsi text, metadata jsonb, created_at timestamptz
)
language sql stable
set search_path to 'public'
as $$
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
$$;

-- ---------------------------------------------------------------------------
-- Dashboard & rekap RPC
-- ---------------------------------------------------------------------------
create or replace function public.get_petugas_dashboard_stats()
returns json
language plpgsql stable
set search_path to 'public'
as $$
declare
  v_user_id uuid;
  v_sesi sesi_petugas%rowtype;
  v_masuk_today integer;
  v_keluar_today integer;
  v_day_start timestamptz;
  v_day_end timestamptz;
begin
  v_user_id := auth.uid();
  v_day_start := current_date::timestamptz;
  v_day_end := (current_date + interval '1 day')::timestamptz;

  select * into v_sesi
  from sesi_petugas
  where petugas_id = v_user_id
    and status = 'aktif'
  order by waktu_mulai desc
  limit 1;

  select count(*) into v_masuk_today
  from kendaraan_masuk
  where petugas_id = v_user_id
    and waktu_masuk >= v_day_start
    and waktu_masuk < v_day_end;

  select count(*) into v_keluar_today
  from kendaraan_keluar
  where petugas_id = v_user_id
    and waktu_keluar >= v_day_start
    and waktu_keluar < v_day_end;

  return json_build_object(
    'sesi_aktif', case when v_sesi.id is not null then
      json_build_object(
        'id', v_sesi.id,
        'waktu_mulai', v_sesi.waktu_mulai,
        'status', v_sesi.status,
        'terminal_id', v_sesi.terminal_id
      )
    else null end,
    'total_masuk_hari_ini', v_masuk_today,
    'total_keluar_hari_ini', v_keluar_today,
    'total_transaksi_hari_ini', v_masuk_today + v_keluar_today
  );
end;
$$;

create or replace function public.get_admin_terminal_stats(
  p_terminal_id uuid,
  p_date date default current_date
)
returns json
language plpgsql stable
set search_path to 'public'
as $$
declare
  result json;
  day_start timestamptz;
  day_end timestamptz;
begin
  day_start := p_date::timestamptz;
  day_end := (p_date + interval '1 day')::timestamptz;

  select json_build_object(
    'total_masuk', (
      select count(*)
      from kendaraan_masuk km
      join sesi_petugas sp on sp.id = km.sesi_id
      where sp.terminal_id = p_terminal_id
        and km.waktu_masuk >= day_start
        and km.waktu_masuk < day_end
    ),
    'total_keluar', (
      select count(*)
      from kendaraan_keluar kk
      join sesi_petugas sp on sp.id = kk.sesi_id
      where sp.terminal_id = p_terminal_id
        and kk.waktu_keluar >= day_start
        and kk.waktu_keluar < day_end
    ),
    'sesi_aktif', (
      select count(*)
      from sesi_petugas
      where terminal_id = p_terminal_id
        and waktu_selesai is null
    ),
    'total_petugas', (
      select count(*)
      from profiles
      where terminal_id = p_terminal_id
        and is_active = true
    )
  ) into result;

  return result;
end;
$$;

create or replace function public.get_admin_rekap_harian(
  p_terminal_id uuid,
  p_date date
)
returns table(
  masuk_id uuid, nomor_polisi text, waktu_masuk timestamptz,
  waktu_keluar timestamptz, petugas_nama text, po_kode text, po_nama text,
  armada_merk text, armada_tipe text, armada_lambung text
)
language sql stable
set search_path to 'public'
as $$
  select
    km.id as masuk_id,
    km.nomor_polisi,
    km.waktu_masuk,
    kk.waktu_keluar,
    coalesce(p.full_name, 'System') as petugas_nama,
    po.kode_po as po_kode,
    po.nama_perusahaan as po_nama,
    a.merk as armada_merk,
    a.tipe as armada_tipe,
    a.nomor_lambung as armada_lambung
  from kendaraan_masuk km
  join sesi_petugas sp on sp.id = km.sesi_id
  left join kendaraan_keluar kk on kk.masuk_id = km.id
  join po on po.id = km.po_id
  join armada a on a.id = km.armada_id
  left join profiles p on p.id = km.petugas_id
  where sp.terminal_id = p_terminal_id
    and km.waktu_masuk::date = p_date
  order by km.waktu_masuk desc;
$$;

create or replace function public.get_rekap_sesi(
  p_terminal_id uuid,
  p_start_date date default current_date,
  p_end_date date default current_date
)
returns table(
  sesi_id uuid, petugas_id uuid, petugas_nama text, terminal_id uuid,
  waktu_mulai timestamptz, waktu_selesai timestamptz, status text,
  total_transaksi_masuk integer, total_transaksi_keluar integer, total_nominal numeric
)
language sql stable
set search_path to 'public'
as $$
  select
    sp.id as sesi_id,
    sp.petugas_id,
    coalesce(p.full_name, 'Unknown') as petugas_nama,
    sp.terminal_id,
    sp.waktu_mulai,
    sp.waktu_selesai,
    sp.status,
    sp.total_transaksi_masuk,
    sp.total_transaksi_keluar,
    sp.total_nominal
  from sesi_petugas sp
  join profiles p on p.id = sp.petugas_id
  where sp.terminal_id = p_terminal_id
    and sp.waktu_mulai::date >= p_start_date
    and sp.waktu_mulai::date <= p_end_date
  order by sp.waktu_mulai desc;
$$;

create or replace function public.get_detail_sesi(p_sesi_id uuid)
returns table(
  masuk_id uuid, nomor_polisi text, waktu_masuk timestamptz,
  waktu_keluar timestamptz, po_kode text, po_nama text,
  armada_merk text, armada_tipe text, armada_lambung text
)
language sql stable
set search_path to 'public'
as $$
  select
    km.id as masuk_id,
    km.nomor_polisi,
    km.waktu_masuk,
    kk.waktu_keluar,
    po.kode_po as po_kode,
    po.nama_perusahaan as po_nama,
    a.merk as armada_merk,
    a.tipe as armada_tipe,
    a.nomor_lambung as armada_lambung
  from kendaraan_masuk km
  join po on po.id = km.po_id
  join armada a on a.id = km.armada_id
  left join kendaraan_keluar kk on kk.masuk_id = km.id
  where km.sesi_id = p_sesi_id
  order by km.waktu_masuk desc;
$$;
