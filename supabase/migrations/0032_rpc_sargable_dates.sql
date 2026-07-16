-- 0032_rpc_sargable_dates.sql
--
-- Drift capture: Rewrite date filtering di RPC agar sargable (gunakan range
-- >= start AND < end+1day alih-alih ::date cast yang tidak memakai index).
-- Sudah diterapkan di live DB.

CREATE OR REPLACE FUNCTION public.get_activity_logs(
  p_start_date date DEFAULT CURRENT_DATE,
  p_end_date date DEFAULT CURRENT_DATE,
  p_aksi text DEFAULT NULL,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  user_name text,
  aksi text,
  deskripsi text,
  metadata jsonb,
  created_at timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
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

CREATE OR REPLACE FUNCTION public.get_admin_terminal_stats(
  p_terminal_id uuid,
  p_date date DEFAULT CURRENT_DATE
)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = 'public'
AS $function$
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
$function$;
