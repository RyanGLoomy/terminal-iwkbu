-- 0064_fix_get_activity_logs_return_type.sql
-- Fix "structure of query does not match function result type" error in
-- get_activity_logs. The RETURN QUERY column `coalesce(p.full_name, 'System')`
-- resolves to varchar (because profiles.full_name is varchar(255) and the
-- 'System' literal is unknown→varchar), but RETURNS TABLE declares user_name
-- as text. PL/pgSQL's RETURN QUERY check is strict about this even though
-- varchar and text are binary-compatible. Adding an explicit ::text cast.
--
-- CREATE OR REPLACE preserves the EXECUTE grants (0063 restored authenticated).

CREATE OR REPLACE FUNCTION public.get_activity_logs(
  p_start_date date DEFAULT CURRENT_DATE,
  p_end_date date DEFAULT CURRENT_DATE,
  p_aksi text DEFAULT NULL::text,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
) RETURNS TABLE(id uuid, user_id uuid, user_name text, aksi text, deskripsi text, metadata jsonb, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    coalesce(p.full_name, 'System')::text as user_name,
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
$function$;
