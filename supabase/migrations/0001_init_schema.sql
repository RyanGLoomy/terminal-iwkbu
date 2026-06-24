-- ============================================================================
-- 0001_init_schema.sql
-- Baseline schema untuk Sistem Integrasi Data Terminal–IWKBU.
-- Di-capture dari proyek Supabase aktif (fxzvfzexxklpqnaczyjs) sebagai
-- sumber kebenaran skema dalam-repo. Jalankan berurutan dengan 0002 & 0003.
-- Catatan: ini bukan migrasi inkremental untuk DB yang sudah berjalan;
-- gunakan `supabase db reset` pada DB baru untuk mereplikasi skema ini.
-- ============================================================================

-- required extension
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Referensi inti: roles, profiles, terminals
-- ---------------------------------------------------------------------------
create table if not exists roles (
  id          integer generated always as identity primary key,
  name        varchar(50) not null unique,
  display_name varchar(100) not null,
  description text,
  created_at  timestamptz not null default now()
);

create table if not exists terminals (
  id         uuid primary key default gen_random_uuid(),
  kode       text not null unique,
  nama       text not null,
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id          uuid primary key,
  email       varchar(255) not null unique,
  full_name   varchar(255),
  is_active   boolean not null default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  terminal_id uuid references terminals(id) on delete set null
);

create table if not exists user_roles (
  user_id   uuid not null references profiles(id) on delete cascade,
  role_id   integer not null references roles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

-- ---------------------------------------------------------------------------
-- Master data PO & armada
-- ---------------------------------------------------------------------------
create table if not exists po (
  id                   uuid primary key references profiles(id) on delete cascade,
  kode_po              varchar(20) not null unique,
  nama_perusahaan      varchar(255) not null,
  nama_pemilik         varchar(255),
  alamat               text,
  telepon              varchar(20),
  npwp                 varchar(30),
  status_verifikasi    varchar(20) not null default 'menunggu',
  diverifikasi_oleh    uuid references profiles(id) on delete set null,
  tanggal_verifikasi   timestamptz,
  keterangan_verifikasi text,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

create table if not exists jenis_kendaraan (
  id         uuid primary key default gen_random_uuid(),
  nama       varchar not null unique,
  kode       varchar not null unique,
  keterangan text,
  urutan     integer not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists armada (
  id                    uuid primary key default gen_random_uuid(),
  po_id                 uuid not null references po(id) on delete cascade,
  nomor_polisi          varchar(20) not null,
  nomor_lambung         varchar(50),
  merk                  varchar(100),
  tipe                  varchar(100),
  tahun_pembuatan       integer,
  nomor_chassis         varchar(100),
  nomor_mesin           varchar(100),
  kapasitas_penumpang   integer,
  status_operasional    varchar(20) default 'aktif',
  status_verifikasi     varchar(20) default 'menunggu',
  diverifikasi_oleh     uuid references profiles(id) on delete set null,
  tanggal_verifikasi    timestamptz,
  keterangan_verifikasi text,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now(),
  unique (po_id, nomor_polisi)
);

-- ---------------------------------------------------------------------------
-- Petugas terminal & PIN
-- ---------------------------------------------------------------------------
create table if not exists petugas_terminal (
  id          uuid primary key default gen_random_uuid(),
  terminal_id uuid not null references terminals(id) on delete cascade,
  nama        text not null,
  pin_hash    text not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists petugas_pin_sessions (
  user_id             uuid primary key references profiles(id) on delete cascade,
  verified_at         timestamptz not null default now(),
  expires_at          timestamptz not null,
  updated_at          timestamptz not null default now(),
  petugas_terminal_id uuid references petugas_terminal(id) on delete cascade,
  petugas_nama        text
);

-- Legacy: terminal_pins dikunci penuh oleh RLS (deny_all). Dipertahankan
-- untuk kompatibilitas namun tidak dipakai aplikasi.
create table if not exists terminal_pins (
  terminal_id uuid primary key references terminals(id) on delete cascade,
  pin_hash    text not null,
  active      boolean not null default true,
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Operasional terminal: sesi & transaksi
-- ---------------------------------------------------------------------------
create table if not exists sesi_petugas (
  id                      uuid primary key default gen_random_uuid(),
  petugas_id              uuid not null references profiles(id) on delete cascade,
  waktu_mulai             timestamptz not null default now(),
  waktu_selesai           timestamptz,
  created_at              timestamptz not null default now(),
  terminal_id             uuid references terminals(id) on delete set null,
  status                  text not null default 'aktif',
  total_transaksi_masuk   integer not null default 0,
  total_transaksi_keluar  integer not null default 0,
  total_nominal           numeric not null default 0
);

create table if not exists kendaraan_masuk (
  id          uuid primary key default gen_random_uuid(),
  sesi_id     uuid not null references sesi_petugas(id) on delete cascade,
  petugas_id  uuid not null references profiles(id) on delete cascade,
  armada_id   uuid not null references armada(id) on delete restrict,
  po_id       uuid not null references po(id) on delete cascade,
  nomor_polisi text not null,
  waktu_masuk timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

create table if not exists kendaraan_keluar (
  id          uuid primary key default gen_random_uuid(),
  masuk_id    uuid not null unique references kendaraan_masuk(id) on delete cascade,
  sesi_id     uuid not null references sesi_petugas(id) on delete cascade,
  petugas_id  uuid not null references profiles(id) on delete cascade,
  waktu_keluar timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Temuan, klarifikasi, tindak lanjut
-- ---------------------------------------------------------------------------
create table if not exists findings (
  id              uuid primary key default gen_random_uuid(),
  po_id           uuid not null references po(id) on delete cascade,
  armada_id       uuid references armada(id) on delete set null,
  nomor_polisi    text not null,
  source_type     text not null default 'rekonsiliasi',
  judul           text not null,
  deskripsi       text not null,
  severity        text not null default 'medium',
  status          text not null default 'open',
  source_date     date,
  created_by      uuid not null references profiles(id) on delete set null,
  resolved_by     uuid references profiles(id) on delete set null,
  resolved_at     timestamptz,
  resolution_note text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  due_date        date
);

create table if not exists finding_clarifications (
  id            uuid primary key default gen_random_uuid(),
  finding_id    uuid not null references findings(id) on delete cascade,
  responder_id  uuid not null references profiles(id) on delete cascade,
  responder_role text not null,
  decision      text not null,
  message       text not null,
  evidence      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create table if not exists finding_actions (
  id          uuid primary key default gen_random_uuid(),
  finding_id  uuid not null references findings(id) on delete cascade,
  action_text text not null,
  status      text not null default 'open',
  done_at     timestamptz,
  done_by     uuid references profiles(id) on delete set null,
  created_by  uuid not null references profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Audit trail & pengaturan
-- ---------------------------------------------------------------------------
create table if not exists activity_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  aksi       text not null,
  deskripsi  text,
  metadata   jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists system_settings (
  key         text primary key,
  value       text not null,
  description text,
  category    varchar not null default 'general',
  updated_at  timestamptz not null default now(),
  updated_by  uuid references profiles(id) on delete set null
);

-- ---------------------------------------------------------------------------
-- Sumber & hasil IWKBU / rekonsiliasi
-- ---------------------------------------------------------------------------
create table if not exists iwkbu_source_records (
  id                uuid primary key default gen_random_uuid(),
  external_ref      text unique,
  nomor_polisi      text not null,
  compliance_status text not null default 'unknown',
  issue_count       integer not null default 0,
  source_updated_at timestamptz,
  payload           jsonb not null default '{}'::jsonb,
  imported_at       timestamptz not null default now()
);

create table if not exists iwkbu_sync_runs (
  id            uuid primary key default gen_random_uuid(),
  trigger_type  text not null default 'manual',
  status        text not null default 'running',
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  initiated_by  uuid references profiles(id) on delete set null,
  summary       jsonb not null default '{}'::jsonb,
  error_message text
);

create table if not exists iwkbu_sync_status (
  armada_id                uuid primary key references armada(id) on delete cascade,
  po_id                    uuid not null references po(id) on delete cascade,
  nomor_polisi             text not null,
  iwkbu_compliance_status  text not null,
  issue_count              integer not null default 0,
  source_updated_at        timestamptz,
  terminal_last_seen       timestamptz,
  po_status_verifikasi     text,
  armada_status_verifikasi text,
  armada_status_operasional text,
  reconciliation_status    text not null,
  discrepancy_note         text,
  last_synced_at           timestamptz not null default now(),
  source_payload           jsonb not null default '{}'::jsonb
);

-- ---------------------------------------------------------------------------
-- Index pendukung (kinerja query operasional & rekonsiliasi)
-- ---------------------------------------------------------------------------
create index if not exists idx_armada_po_id on armada(po_id);
create index if not exists idx_armada_nopol on armada(nomor_polisi);
create index if not exists idx_kendaraan_masuk_sesi on kendaraan_masuk(sesi_id);
create index if not exists idx_kendaraan_masuk_petugas on kendaraan_masuk(petugas_id);
create index if not exists idx_kendaraan_keluar_masuk on kendaraan_keluar(masuk_id);
create index if not exists idx_sesi_petugas_terminal on sesi_petugas(terminal_id);
create index if not exists idx_findings_po on findings(po_id);
create index if not exists idx_findings_status on findings(status);
create index if not exists idx_activity_logs_created on activity_logs(created_at desc);
create index if not exists idx_activity_logs_user on activity_logs(user_id);
create index if not exists idx_petugas_terminal_terminal on petugas_terminal(terminal_id);
create index if not exists idx_iwkbu_source_nopol on iwkbu_source_records(nomor_polisi);
