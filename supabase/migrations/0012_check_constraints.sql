-- ============================================================================
-- 0012_check_constraints.sql
-- CHECK constraints pada kolom enum-like untuk integritas data.
-- ============================================================================

-- po.status_verifikasi
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'chk_po_status_verifikasi'
      and table_name = 'po'
  ) then
    alter table public.po
      add constraint chk_po_status_verifikasi
      check (status_verifikasi in ('menunggu', 'aktif', 'ditolak'));
  end if;
end $$;

-- armada.status_operasional
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'chk_armada_status_operasional'
      and table_name = 'armada'
  ) then
    alter table public.armada
      add constraint chk_armada_status_operasional
      check (status_operasional in ('aktif', 'tidak_aktif', 'rusak', 'cadangan', 'dijual'));
  end if;
end $$;

-- armada.status_verifikasi
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'chk_armada_status_verifikasi'
      and table_name = 'armada'
  ) then
    alter table public.armada
      add constraint chk_armada_status_verifikasi
      check (status_verifikasi in ('menunggu', 'terverifikasi', 'ditolak'));
  end if;
end $$;

-- findings.severity
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'chk_findings_severity'
      and table_name = 'findings'
  ) then
    alter table public.findings
      add constraint chk_findings_severity
      check (severity in ('low', 'medium', 'high'));
  end if;
end $$;

-- findings.status
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'chk_findings_status'
      and table_name = 'findings'
  ) then
    alter table public.findings
      add constraint chk_findings_status
      check (status in ('open', 'on_progress', 'closed'));
  end if;
end $$;

-- sesi_petugas.status
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'chk_sesi_petugas_status'
      and table_name = 'sesi_petugas'
  ) then
    alter table public.sesi_petugas
      add constraint chk_sesi_petugas_status
      check (status in ('aktif', 'selesai'));
  end if;
end $$;

-- rekonsiliasi_periode.status
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'chk_rekonsiliasi_periode_status'
      and table_name = 'rekonsiliasi_periode'
  ) then
    alter table public.rekonsiliasi_periode
      add constraint chk_rekonsiliasi_periode_status
      check (status in ('draft', 'aktif', 'ditutup'));
  end if;
end $$;

-- iwkbu_sync_runs.status
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'chk_iwkbu_sync_runs_status'
      and table_name = 'iwkbu_sync_runs'
  ) then
    alter table public.iwkbu_sync_runs
      add constraint chk_iwkbu_sync_runs_status
      check (status in ('running', 'success', 'failed'));
  end if;
end $$;

-- armada_dokumen.jenis_dokumen
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'chk_armada_dokumen_jenis'
      and table_name = 'armada_dokumen'
  ) then
    alter table public.armada_dokumen
      add constraint chk_armada_dokumen_jenis
      check (jenis_dokumen in ('stck', 'kir', 'asuransi', 'lainnya'));
  end if;
end $$;
