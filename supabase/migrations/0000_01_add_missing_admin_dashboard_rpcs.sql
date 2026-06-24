-- Captured from live Supabase migration: add_missing_admin_dashboard_rpcs (20260621040432)

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
