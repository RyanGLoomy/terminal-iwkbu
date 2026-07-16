-- ============================================================================
-- 0039_rate_limit_revoke_and_pin_audit.sql
--
-- H2 (HIGH): check_rate_limit, record_rate_limit_attempt, clear_rate_limit
-- semuanya SECURITY DEFINER dan masih punya GRANT EXECUTE TO anon dan/atau
-- authenticated. Namun rate-limiter.ts sudah beralih ke createAdminClient()
-- (service role) untuk ketiganya — service_role bypass EXECUTE grants.
-- Grant anon/authenticated murni attack surface: anon bisa mencek status
-- lock key manapun via /rest/v1/rpc/check_rate_limit.
--
-- Fix: REVOKE EXECUTE dari anon, authenticated, PUBLIC pada ketiganya.
--
-- H3 (HIGH): fn_log_pin_change() early-return saat auth.uid() IS NULL,
-- sehingga penulisan PIN oleh service role (admin scripts, cron) tidak
-- tercatat di audit trail. System user 00000000-0000-0000-0000-000000000001
-- (migration 0021) dipakai sebagai actor pengganti.
--
-- Fix: coalesce(auth.uid(), system-user) dan hapus early-return.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- H2: Revoke EXECUTE pada semua rate-limit RPC
-- ---------------------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.record_rate_limit_attempt(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.clear_rate_limit(text) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- H3: Fix fn_log_pin_change — log service-role PIN writes
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_log_pin_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_user uuid := coalesce(auth.uid(), '00000000-0000-0000-0000-000000000001'::uuid);
begin
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
