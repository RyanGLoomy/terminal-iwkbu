-- Captured from live Supabase migration: harden_activity_log_triggers_for_seed (20260621041335)

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
