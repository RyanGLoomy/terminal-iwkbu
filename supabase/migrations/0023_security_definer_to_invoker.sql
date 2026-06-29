-- 0023_security_definer_to_invoker.sql
--
-- Menutup sisa advisor `authenticated_security_definer_function_executable`
-- (5 fungsi). Pendekatan per-fungsi (lihat skill supabase "SECURITY DEFINER in
-- public"): revoke bila tak dipakai via RPC, atau ubah ke SECURITY INVOKER bila
-- dipakai oleh authenticated — sehingga RLS berlaku normal & warning hilang.
--
-- Aman diterapkan ulang (idempotent).

-- 1) handle_new_user: trigger function. TIDAK dipanggil via RPC oleh app (hanya
--    fires via trigger auth.users). Trigger invocation tidak butuh privilege
--    EXECUTE, jadi revoke authenticated aman.
revoke execute on function public.handle_new_user() from authenticated;

-- 2) get_admin_statistics: wrapper yg tak terpakai (app memanggil
--    get_admin_terminal_stats langsung, yg sudah SECURITY INVOKER). Revoke.
revoke execute on function public.get_admin_statistics(uuid, date) from authenticated;

-- 3) get_weekly_trends: tak dipanggil app. Revoke.
revoke execute on function public.get_weekly_trends(uuid) from authenticated;

-- 4) check_loket_pin_session: scoped ke auth.uid() (cek sesi PIN milik SENDIRI).
--    RLS pada petugas_pin_sessions / petugas_terminal / profiles sudah
--    memperbolehkan loket membaca row miliknya -> aman sebagai SECURITY INVOKER.
create or replace function public.check_loket_pin_session()
returns boolean
language sql
security invoker
set search_path to 'public'
as $$
  select exists (
    select 1
    from petugas_pin_sessions ps
    join petugas_terminal pt on pt.id = ps.petugas_terminal_id
    join profiles p on p.id = ps.user_id
    where ps.user_id = auth.uid()
      and ps.expires_at > now()
      and pt.is_active = true
      and pt.terminal_id = p.terminal_id
  );
$$;

-- 5) log_activity: app memanggil via RPC authenticated (path fallback saat
--    actorUserId tak disertakan). Ubah ke SECURITY INVOKER + policy INSERT agar
--    user hanya bisa mencatat audit untuk dirinya (user_id = auth.uid()). Path
--    admin-client (direct insert via service role) tak terpengaruh.
create or replace function public.log_activity(
  p_aksi text,
  p_deskripsi text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security invoker
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

-- Pastikan authenticated bisa INSERT (table-level grant + policy).
grant insert on public.activity_logs to authenticated;

create policy activity_logs_user_insert_own
  on public.activity_logs
  for insert
  to authenticated
  with check (user_id = auth.uid());
