-- ============================================================================
-- 0011_trigger_functions.sql
-- Mencatat 13 trigger function + 16 trigger yang ada di live DB namun belum
-- ter-capture di migrasi repo. Membuat repo self-contained untuk `db reset`.
-- Semua fungsi idempoten (CREATE OR REPLACE / DROP IF EXISTS).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Helper: touch updated_at (3 varian)
-- ---------------------------------------------------------------------------

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path to 'public', 'auth'
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.fn_touch_findings_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Audit-log trigger functions (SECURITY DEFINER)
-- ---------------------------------------------------------------------------

create or replace function public.fn_log_transaksi_masuk()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into activity_logs (user_id, aksi, deskripsi, metadata)
  values (
    new.petugas_id,
    'INPUT_TRANSAKSI',
    format('Mencatat kendaraan masuk: %s', new.nomor_polisi),
    json_build_object(
      'masuk_id', new.id,
      'sesi_id', new.sesi_id,
      'nomor_polisi', new.nomor_polisi,
      'po_id', new.po_id,
      'tipe', 'masuk'
    )::jsonb
  );
  return new;
end;
$$;

create or replace function public.fn_log_transaksi_keluar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into activity_logs (user_id, aksi, deskripsi, metadata)
  values (
    new.petugas_id,
    'INPUT_TRANSAKSI',
    format('Mencatat kendaraan keluar (masuk_id: %s)', new.masuk_id),
    json_build_object(
      'keluar_id', new.id,
      'masuk_id', new.masuk_id,
      'sesi_id', new.sesi_id,
      'tipe', 'keluar'
    )::jsonb
  );
  return new;
end;
$$;

create or replace function public.fn_log_hapus_transaksi_masuk()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into activity_logs (user_id, aksi, deskripsi, metadata)
  values (
    old.petugas_id,
    'HAPUS_TRANSAKSI',
    format('Menghapus data kendaraan masuk: %s', old.nomor_polisi),
    json_build_object(
      'masuk_id', old.id,
      'sesi_id', old.sesi_id,
      'nomor_polisi', old.nomor_polisi,
      'tipe', 'masuk'
    )::jsonb
  );
  return old;
end;
$$;

create or replace function public.fn_log_hapus_transaksi_keluar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into activity_logs (user_id, aksi, deskripsi, metadata)
  values (
    old.petugas_id,
    'HAPUS_TRANSAKSI',
    format('Menghapus data kendaraan keluar (masuk_id: %s)', old.masuk_id),
    json_build_object(
      'keluar_id', old.id,
      'masuk_id', old.masuk_id,
      'sesi_id', old.sesi_id,
      'tipe', 'keluar'
    )::jsonb
  );
  return old;
end;
$$;

create or replace function public.fn_log_pin_change()
returns trigger
language plpgsql
security definer
set search_path = ''
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

create or replace function public.fn_log_sesi_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if TG_OP = 'INSERT' then
    insert into activity_logs (user_id, aksi, deskripsi, metadata)
    values (
      new.petugas_id,
      'BUKA_SESI',
      'Membuka sesi kerja',
      json_build_object(
        'sesi_id', new.id,
        'terminal_id', new.terminal_id,
        'waktu_mulai', new.waktu_mulai
      )::jsonb
    );
  elsif TG_OP = 'UPDATE' and new.status = 'selesai' and old.status = 'aktif' then
    insert into activity_logs (user_id, aksi, deskripsi, metadata)
    values (
      new.petugas_id,
      'TUTUP_SESI',
      format('Menutup sesi kerja. Masuk: %s, Keluar: %s',
        new.total_transaksi_masuk, new.total_transaksi_keluar),
      json_build_object(
        'sesi_id', new.id,
        'terminal_id', new.terminal_id,
        'total_masuk', new.total_transaksi_masuk,
        'total_keluar', new.total_transaksi_keluar,
        'waktu_mulai', new.waktu_mulai,
        'waktu_selesai', new.waktu_selesai
      )::jsonb
    );
  end if;

  return new;
end;
$$;

create or replace function public.fn_log_finding_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if TG_OP = 'INSERT' then
    insert into activity_logs (user_id, aksi, deskripsi, metadata)
    values (
      new.created_by,
      'BUAT_TEMUAN',
      new.judul,
      json_build_object(
        'finding_id', new.id,
        'po_id', new.po_id,
        'armada_id', new.armada_id,
        'nomor_polisi', new.nomor_polisi,
        'severity', new.severity,
        'status', new.status
      )::jsonb
    );
  elsif TG_OP = 'UPDATE' then
    insert into activity_logs (user_id, aksi, deskripsi, metadata)
    values (
      coalesce(new.resolved_by, new.created_by),
      'UPDATE_TEMUAN',
      coalesce(new.resolution_note, new.judul),
      json_build_object(
        'finding_id', new.id,
        'status_lama', old.status,
        'status_baru', new.status,
        'po_id', new.po_id
      )::jsonb
    );
  end if;

  return new;
end;
$$;

create or replace function public.fn_log_clarification_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into activity_logs (user_id, aksi, deskripsi, metadata)
  values (
    new.responder_id,
    'KIRIM_KLARIFIKASI',
    new.decision,
    json_build_object(
      'clarification_id', new.id,
      'finding_id', new.finding_id,
      'decision', new.decision,
      'responder_role', new.responder_role
    )::jsonb
  );
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Business-logic trigger functions
-- ---------------------------------------------------------------------------

create or replace function public.fn_check_sesi_aktif_before_insert()
returns trigger
language plpgsql
set search_path to 'public'
as $$
declare
  v_status text;
begin
  select status into v_status
  from sesi_petugas
  where id = new.sesi_id;

  if v_status is null then
    raise exception 'Sesi kerja tidak ditemukan (sesi_id: %)', new.sesi_id;
  end if;

  if v_status != 'aktif' then
    raise exception 'Tidak bisa mencatat transaksi: sesi kerja sudah ditutup';
  end if;

  return new;
end;
$$;

create or replace function public.fn_auto_update_sesi_totals()
returns trigger
language plpgsql
set search_path to 'public'
as $$
declare
  v_total_masuk integer;
  v_total_keluar integer;
begin
  if new.status = 'selesai' and (old.status is distinct from 'selesai') then
    select count(*) into v_total_masuk
    from kendaraan_masuk
    where sesi_id = new.id;

    select count(*) into v_total_keluar
    from kendaraan_keluar
    where sesi_id = new.id;

    new.total_transaksi_masuk := v_total_masuk;
    new.total_transaksi_keluar := v_total_keluar;
    new.total_nominal := 0;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. REVOKE EXECUTE on SECURITY DEFINER trigger functions
--    (sejalan dengan 0004_security_hardening.sql)
-- ---------------------------------------------------------------------------

revoke execute on function public.fn_log_clarification_changes() from public, anon, authenticated;
revoke execute on function public.fn_log_finding_changes() from public, anon, authenticated;
revoke execute on function public.fn_log_hapus_transaksi_keluar() from public, anon, authenticated;
revoke execute on function public.fn_log_hapus_transaksi_masuk() from public, anon, authenticated;
revoke execute on function public.fn_log_pin_change() from public, anon, authenticated;
revoke execute on function public.fn_log_sesi_changes() from public, anon, authenticated;
revoke execute on function public.fn_log_transaksi_keluar() from public, anon, authenticated;
revoke execute on function public.fn_log_transaksi_masuk() from public, anon, authenticated;

revoke execute on function public.fn_touch_findings_updated_at() from public, anon, authenticated;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;
revoke execute on function public.update_updated_at_column() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Triggers (idempoten: DROP IF EXISTS + CREATE)
-- ---------------------------------------------------------------------------

-- findings: touch updated_at + audit log
drop trigger if exists trg_findings_touch_updated_at on public.findings;
create trigger trg_findings_touch_updated_at
  before update on public.findings
  for each row execute function public.fn_touch_findings_updated_at();

drop trigger if exists trg_log_finding_changes on public.findings;
create trigger trg_log_finding_changes
  after insert or update on public.findings
  for each row execute function public.fn_log_finding_changes();

-- finding_clarifications: audit log
drop trigger if exists trg_log_clarification_changes on public.finding_clarifications;
create trigger trg_log_clarification_changes
  after insert on public.finding_clarifications
  for each row execute function public.fn_log_clarification_changes();

-- kendaraan_masuk: sesi check + audit log
drop trigger if exists trg_check_sesi_before_masuk on public.kendaraan_masuk;
create trigger trg_check_sesi_before_masuk
  before insert on public.kendaraan_masuk
  for each row execute function public.fn_check_sesi_aktif_before_insert();

drop trigger if exists trg_log_transaksi_masuk on public.kendaraan_masuk;
create trigger trg_log_transaksi_masuk
  after insert on public.kendaraan_masuk
  for each row execute function public.fn_log_transaksi_masuk();

drop trigger if exists trg_log_hapus_masuk on public.kendaraan_masuk;
create trigger trg_log_hapus_masuk
  after delete on public.kendaraan_masuk
  for each row execute function public.fn_log_hapus_transaksi_masuk();

-- kendaraan_keluar: sesi check + audit log
drop trigger if exists trg_check_sesi_before_keluar on public.kendaraan_keluar;
create trigger trg_check_sesi_before_keluar
  before insert on public.kendaraan_keluar
  for each row execute function public.fn_check_sesi_aktif_before_insert();

drop trigger if exists trg_log_transaksi_keluar on public.kendaraan_keluar;
create trigger trg_log_transaksi_keluar
  after insert on public.kendaraan_keluar
  for each row execute function public.fn_log_transaksi_keluar();

drop trigger if exists trg_log_hapus_keluar on public.kendaraan_keluar;
create trigger trg_log_hapus_keluar
  after delete on public.kendaraan_keluar
  for each row execute function public.fn_log_hapus_transaksi_keluar();

-- petugas_terminal: audit PIN change
drop trigger if exists trg_log_pin_change on public.petugas_terminal;
create trigger trg_log_pin_change
  after insert or update on public.petugas_terminal
  for each row execute function public.fn_log_pin_change();

-- sesi_petugas: auto totals + audit log
drop trigger if exists trg_auto_update_sesi_totals on public.sesi_petugas;
create trigger trg_auto_update_sesi_totals
  before update on public.sesi_petugas
  for each row execute function public.fn_auto_update_sesi_totals();

drop trigger if exists trg_log_sesi_changes on public.sesi_petugas;
create trigger trg_log_sesi_changes
  after insert or update on public.sesi_petugas
  for each row execute function public.fn_log_sesi_changes();

-- armada: touch updated_at
drop trigger if exists update_armada_updated_at on public.armada;
create trigger update_armada_updated_at
  before update on public.armada
  for each row execute function public.update_updated_at_column();

-- po: touch updated_at
drop trigger if exists update_po_updated_at on public.po;
create trigger update_po_updated_at
  before update on public.po
  for each row execute function public.update_updated_at_column();

-- jenis_kendaraan: touch updated_at
drop trigger if exists trg_jenis_kendaraan_touch on public.jenis_kendaraan;
create trigger trg_jenis_kendaraan_touch
  before update on public.jenis_kendaraan
  for each row execute function public.touch_updated_at();

-- system_settings: touch updated_at
drop trigger if exists trg_system_settings_touch on public.system_settings;
create trigger trg_system_settings_touch
  before update on public.system_settings
  for each row execute function public.touch_updated_at();
