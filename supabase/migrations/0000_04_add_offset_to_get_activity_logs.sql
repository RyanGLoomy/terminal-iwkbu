-- Captured from live Supabase migration: add_offset_to_get_activity_logs (20260622083243)

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
