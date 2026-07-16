-- 0033_security_remediation.sql
--
-- H1: Revoke EXECUTE pada clear_rate_limit & record_rate_limit_attempt
--     dari authenticated. Sebelumnya, user terautentikasi bisa memanggil
--     via /rest/v1/rpc/ untuk mereset lockout korban (clear) atau
--     mengunci akun korban (record). App sudah pakai admin client.
--     service_role tetap bisa (bypass grants).
--
-- H2: Tambah auth guard di get_activity_logs. Function SECURITY DEFINER
--     tanpa cek role — jika ada route yang meneruskan input user ke RPC
--     via admin client, semua log terekspos. Tambah guard di awal.
--
-- M4: Drop get_admin_statistics & get_weekly_trends (redundant SECURITY
--     DEFINER wrappers). App memakai get_admin_terminal_stats (INVOKER)
--     via admin client. 0004 mencoba drop, 0000_01 recreate. Drop final.
--
-- M7: Persempit roles_select_all dari {public} ke {authenticated}.
--     Tabel roles hanya metadata display, tidak perlu anon akses.

-- ============================================================
-- H1: Revoke rate-limit RPCs from authenticated
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.clear_rate_limit(text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.record_rate_limit_attempt(text, integer, integer) FROM authenticated;

-- ============================================================
-- H2: Auth guard di get_activity_logs
-- ============================================================
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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
begin
  if not (is_admin_terminal(auth.uid()) or is_staf_iw(auth.uid())) then
    raise exception 'Akses ditolak: hanya admin-terminal atau staf-iw yang dapat melihat log aktivitas'
      using errcode = '42501';
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
  order by al.created_at desc
  limit p_limit
  offset p_offset;
end;
$function$;

-- ============================================================
-- M4: Drop redundant SECURITY DEFINER wrappers
-- ============================================================
DROP FUNCTION IF EXISTS public.get_admin_statistics(uuid, date);
DROP FUNCTION IF EXISTS public.get_weekly_trends(uuid);

-- ============================================================
-- M7: Persempit roles table ke authenticated
-- ============================================================
DROP POLICY IF EXISTS "roles_select_all" ON public.roles;
CREATE POLICY "roles_select_all" ON public.roles
  FOR SELECT TO authenticated
  USING (true);
