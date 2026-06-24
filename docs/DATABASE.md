# Dokumentasi Skema Database — Sistem Integrasi Data Terminal–IWKBU

> **Sumber kebenaran:** `supabase/migrations/0001`–`0014` + `supabase/seed.sql`.
> Dokumen ini menjelaskan seluruh skema PostgreSQL, kebijakan RLS, constraint,
> trigger, storage bucket, dan sistem rate limiting yang berjalan di Supabase.

---

## Daftar Isi

1. [Overview](#1-overview)
2. [ERD / Skema Tabel](#2-erd--skema-tabel)
3. [Relasi (Foreign Key)](#3-relasi-foreign-key)
4. [RLS Policies](#4-rls-policies)
5. [CHECK Constraints](#5-check-constraints)
6. [Trigger Functions](#6-trigger-functions)
7. [Storage Buckets](#7-storage-buckets)
8. [Rate Limiting](#8-rate-limiting)
9. [Daftar Migrasi](#9-daftar-migrasi)

---

## 1. Overview

### Tech Stack

| Komponen | Teknologi |
|---|---|
| Database | PostgreSQL 15 (Supabase) |
| Auth | Supabase Auth (GoTrue) |
| Storage | Supabase Storage (S3-backed) |
| Realtime | Supabase Realtime (Postgres WAL) |
| Ekstensi | `pgcrypto` (untuk `gen_random_uuid()`) |

### Statistik Skema

| Metrik | Jumlah |
|---|---|
| Tabel aplikasi | 21 (+ 1 dihapus: `terminal_pins`) |
| Migrasi | 14 file (0001–0014) |
| Storage bucket | 2 (`armada-dokumen`, `finding-evidence`) |
| Trigger functions | 13 |
| Triggers | 16 |
| CHECK constraints | 9 |
| RPC functions | 15+ (role helpers, dashboard, rate limiter, audit log) |
| Role RBAC | 4 (`po`, `loket`, `admin-terminal`, `staf-iw`) |

### Cara Menjalankan Migrasi

Migrasi bersifat **baseline snapshot**, bukan inkremental. Untuk mereplikasi
skema dari nol, gunakan `supabase db reset` pada database baru:

```bash
supabase db reset    # menjalankan 0001–0014 + seed.sql secara berurutan
```

> **Catatan:** Jangan menjalankan migrasi ini pada DB yang sudah berjalan
> tanpa reviu manual — gunakan untuk fresh setup atau testing.

---

## 2. ERD / Skema Tabel

### 2.1 Referensi Inti — Autentikasi & Otorisasi

#### `roles`

Menyimpan definisi 4 role RBAC aplikasi.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | `integer` | PK, `GENERATED ALWAYS AS IDENTITY` | Auto-increment |
| `name` | `varchar(50)` | `NOT NULL UNIQUE` | Nama role: `po`, `loket`, `admin-terminal`, `staf-iw` |
| `display_name` | `varchar(100)` | `NOT NULL` | Nama tampilan |
| `description` | `text` | — | Deskripsi role |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` | — |

**Seed data:** 4 role diisi oleh `seed.sql`.

---

#### `profiles`

Data profil pengguna. `id` merujuk ke `auth.users.id`.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | `uuid` | PK | FK ke `auth.users.id` |
| `email` | `varchar(255)` | `NOT NULL UNIQUE` | Email pengguna |
| `full_name` | `varchar(255)` | — | Nama lengkap |
| `is_active` | `boolean` | `NOT NULL DEFAULT true` | Status aktif |
| `created_at` | `timestamptz` | `DEFAULT now()` | — |
| `updated_at` | `timestamptz` | `DEFAULT now()` | Di-update oleh trigger |
| `terminal_id` | `uuid` | FK → `terminals(id)`, `ON DELETE SET NULL` | Terminal tempat user ditugaskan |

---

#### `user_roles`

Relasi many-to-many antara `profiles` dan `roles`.

| Kolom | Tipe | Constraint |
|---|---|---|
| `user_id` | `uuid` | PK (composite), FK → `profiles(id)`, `ON DELETE CASCADE` |
| `role_id` | `integer` | PK (composite), FK → `roles(id)`, `ON DELETE CASCADE` |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` |

**Primary key:** `(user_id, role_id)`.

---

#### `terminals`

Master data terminal.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | `uuid` | PK, `DEFAULT gen_random_uuid()` | — |
| `kode` | `text` | `NOT NULL UNIQUE` | Kode terminal (mis. `T-01`) |
| `nama` | `text` | `NOT NULL` | Nama terminal |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` | — |

---

### 2.2 Master Data PO & Armada

#### `po`

Data Perusahaan Otobus. `id` sama dengan `profiles.id` (relasi 1:1).

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | `uuid` | PK, FK → `profiles(id)`, `ON DELETE CASCADE` | Sama dengan profile ID |
| `kode_po` | `varchar(20)` | `NOT NULL UNIQUE` | Kode PO |
| `nama_perusahaan` | `varchar(255)` | `NOT NULL` | Nama perusahaan |
| `nama_pemilik` | `varchar(255)` | — | Nama pemilik |
| `alamat` | `text` | — | Alamat |
| `telepon` | `varchar(20)` | — | Nomor telepon |
| `npwp` | `varchar(30)` | — | NPWP |
| `status_verifikasi` | `varchar(20)` | `NOT NULL DEFAULT 'menunggu'` | CHECK: `menunggu`, `aktif`, `ditolak` |
| `diverifikasi_oleh` | `uuid` | FK → `profiles(id)`, `ON DELETE SET NULL` | Staf IW yang verifikasi |
| `tanggal_verifikasi` | `timestamptz` | — | Tanggal verifikasi |
| `keterangan_verifikasi` | `text` | — | Catatan verifikasi |
| `created_at` | `timestamptz` | `DEFAULT now()` | — |
| `updated_at` | `timestamptz` | `DEFAULT now()` | Di-update oleh trigger |

---

#### `jenis_kendaraan`

Master jenis/tipe kendaraan.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | `uuid` | PK, `DEFAULT gen_random_uuid()` | — |
| `nama` | `varchar` | `NOT NULL UNIQUE` | Nama jenis kendaraan |
| `kode` | `varchar` | `NOT NULL UNIQUE` | Kode jenis |
| `keterangan` | `text` | — | Deskripsi |
| `urutan` | `integer` | `NOT NULL DEFAULT 0` | Urutan tampil |
| `is_active` | `boolean` | `NOT NULL DEFAULT true` | Status aktif |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` | — |
| `updated_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Di-update oleh trigger |

---

#### `armada`

Data armada milik PO.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | `uuid` | PK, `DEFAULT gen_random_uuid()` | — |
| `po_id` | `uuid` | `NOT NULL`, FK → `po(id)`, `ON DELETE CASCADE` | Pemilik armada |
| `nomor_polisi` | `varchar(20)` | `NOT NULL` | Nomor polisi |
| `nomor_lambung` | `varchar(50)` | — | Nomor lambung/body |
| `merk` | `varchar(100)` | — | Merk kendaraan |
| `tipe` | `varchar(100)` | — | Tipe kendaraan |
| `tahun_pembuatan` | `integer` | — | Tahun pembuatan |
| `nomor_chassis` | `varchar(100)` | — | Nomor rangka |
| `nomor_mesin` | `varchar(100)` | — | Nomor mesin |
| `kapasitas_penumpang` | `integer` | — | Kapasitas duduk |
| `status_operasional` | `varchar(20)` | `DEFAULT 'aktif'` | CHECK: `aktif`, `tidak_aktif`, `rusak`, `cadangan`, `dijual` |
| `status_verifikasi` | `varchar(20)` | `DEFAULT 'menunggu'` | CHECK: `menunggu`, `terverifikasi`, `ditolak` |
| `diverifikasi_oleh` | `uuid` | FK → `profiles(id)`, `ON DELETE SET NULL` | Staf IW pemeriksa |
| `tanggal_verifikasi` | `timestamptz` | — | Tanggal verifikasi |
| `keterangan_verifikasi` | `text` | — | Catatan verifikasi |
| `created_at` | `timestamptz` | `DEFAULT now()` | — |
| `updated_at` | `timestamptz` | `DEFAULT now()` | Di-update oleh trigger |

**Unique constraint:** `(po_id, nomor_polisi)`.

---

#### `armada_dokumen`

Dokumen armada (STCK, KIR, Asuransi). Diperkenalkan di migrasi 0007.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | `uuid` | PK, `DEFAULT gen_random_uuid()` | — |
| `armada_id` | `uuid` | `NOT NULL`, FK → `armada(id)`, `ON DELETE CASCADE` | Armada terkait |
| `jenis_dokumen` | `text` | `NOT NULL` | CHECK: `stck`, `kir`, `asuransi`, `lainnya` |
| `file_path` | `text` | `NOT NULL` | Path di storage bucket |
| `file_name` | `text` | `NOT NULL` | Nama file asli |
| `file_size` | `bigint` | — | Ukuran dalam byte |
| `mime_type` | `text` | — | MIME type |
| `uploaded_by` | `uuid` | FK → `auth.users(id)` | Pengunggah |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` | — |

**Index:** `idx_armada_dokumen_armada_id` pada `armada_id`.

---

### 2.3 Petugas Terminal & PIN

#### `petugas_terminal`

Data petugas terminal beserta PIN hash.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | `uuid` | PK, `DEFAULT gen_random_uuid()` | — |
| `terminal_id` | `uuid` | `NOT NULL`, FK → `terminals(id)`, `ON DELETE CASCADE` | Terminal tempat bertugas |
| `nama` | `text` | `NOT NULL` | Nama petugas |
| `pin_hash` | `text` | `NOT NULL` | Hash PIN (bcrypt) |
| `is_active` | `boolean` | `NOT NULL DEFAULT true` | Status aktif |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` | — |
| `updated_at` | `timestamptz` | `NOT NULL DEFAULT now()` | — |

---

#### `petugas_pin_sessions`

Sesi PIN petugas loket. Dicek oleh middleware via `check_loket_pin_session()`.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `user_id` | `uuid` | PK, FK → `profiles(id)`, `ON DELETE CASCADE` | User loket |
| `verified_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Waktu verifikasi |
| `expires_at` | `timestamptz` | `NOT NULL` | Waktu kedaluwarsa |
| `updated_at` | `timestamptz` | `NOT NULL DEFAULT now()` | — |
| `petugas_terminal_id` | `uuid` | FK → `petugas_terminal(id)`, `ON DELETE CASCADE` | Petugas yang dipilih |
| `petugas_nama` | `text` | — | Nama petugas (cache) |

---

### 2.4 Operasional Terminal

#### `sesi_petugas`

Sesi kerja petugas loket (buka/tutup shift).

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | `uuid` | PK, `DEFAULT gen_random_uuid()` | — |
| `petugas_id` | `uuid` | `NOT NULL`, FK → `profiles(id)`, `ON DELETE CASCADE` | Petugas pelaksana |
| `waktu_mulai` | `timestamptz` | `NOT NULL DEFAULT now()` | Mulai sesi |
| `waktu_selesai` | `timestamptz` | — | Selesai sesi |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` | — |
| `terminal_id` | `uuid` | FK → `terminals(id)`, `ON DELETE SET NULL` | Terminal lokasi |
| `status` | `text` | `NOT NULL DEFAULT 'aktif'` | CHECK: `aktif`, `selesai` |
| `total_transaksi_masuk` | `integer` | `NOT NULL DEFAULT 0` | Auto-update saat sesi ditutup |
| `total_transaksi_keluar` | `integer` | `NOT NULL DEFAULT 0` | Auto-update saat sesi ditutup |
| `total_nominal` | `numeric` | `NOT NULL DEFAULT 0` | Auto-update saat sesi ditutup |

---

#### `kendaraan_masuk`

Pencatatan kendaraan masuk terminal.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | `uuid` | PK, `DEFAULT gen_random_uuid()` | — |
| `sesi_id` | `uuid` | `NOT NULL`, FK → `sesi_petugas(id)`, `ON DELETE CASCADE` | Sesi aktif |
| `petugas_id` | `uuid` | `NOT NULL`, FK → `profiles(id)`, `ON DELETE CASCADE` | Petugas input |
| `armada_id` | `uuid` | `NOT NULL`, FK → `armada(id)`, `ON DELETE RESTRICT` | Armada terkait |
| `po_id` | `uuid` | `NOT NULL`, FK → `po(id)`, `ON DELETE CASCADE` | PO pemilik |
| `nomor_polisi` | `text` | `NOT NULL` | Plat nomor |
| `waktu_masuk` | `timestamptz` | `NOT NULL DEFAULT now()` | Waktu masuk |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` | — |

---

#### `kendaraan_keluar`

Pencatatan kendaraan keluar terminal. Relasi 1:1 ke `kendaraan_masuk`.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | `uuid` | PK, `DEFAULT gen_random_uuid()` | — |
| `masuk_id` | `uuid` | `NOT NULL UNIQUE`, FK → `kendaraan_masuk(id)`, `ON DELETE CASCADE` | Relasi 1:1 ke masuk |
| `sesi_id` | `uuid` | `NOT NULL`, FK → `sesi_petugas(id)`, `ON DELETE CASCADE` | Sesi aktif |
| `petugas_id` | `uuid` | `NOT NULL`, FK → `profiles(id)`, `ON DELETE CASCADE` | Petugas input |
| `waktu_keluar` | `timestamptz` | `NOT NULL DEFAULT now()` | Waktu keluar |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` | — |

---

### 2.5 Temuan, Klarifikasi & Tindak Lanjut

#### `findings`

Temuan/keterangan dari rekonsiliasi atau audit.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | `uuid` | PK, `DEFAULT gen_random_uuid()` | — |
| `po_id` | `uuid` | `NOT NULL`, FK → `po(id)`, `ON DELETE CASCADE` | PO terkait |
| `armada_id` | `uuid` | FK → `armada(id)`, `ON DELETE SET NULL` | Armada terkait |
| `nomor_polisi` | `text` | `NOT NULL` | Plat nomor (snapshot) |
| `source_type` | `text` | `NOT NULL DEFAULT 'rekonsiliasi'` | Sumber: `rekonsiliasi`, `manual`, `audit` |
| `judul` | `text` | `NOT NULL` | Judul temuan |
| `deskripsi` | `text` | `NOT NULL` | Deskripsi temuan |
| `severity` | `text` | `NOT NULL DEFAULT 'medium'` | CHECK: `low`, `medium`, `high` |
| `status` | `text` | `NOT NULL DEFAULT 'open'` | CHECK: `open`, `on_progress`, `closed` |
| `source_date` | `date` | — | Tanggal sumber data |
| `created_by` | `uuid` | `NOT NULL`, FK → `profiles(id)`, `ON DELETE SET NULL` | Pembuat |
| `resolved_by` | `uuid` | FK → `profiles(id)`, `ON DELETE SET NULL` | Penyelesai |
| `resolved_at` | `timestamptz` | — | Waktu selesai |
| `resolution_note` | `text` | — | Catatan penyelesaian |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` | — |
| `updated_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Di-update oleh trigger |
| `due_date` | `date` | — | Tenggat penyelesaian |

---

#### `finding_clarifications`

Klarifikasi/tanggapan atas temuan dari PO atau staf IW.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | `uuid` | PK, `DEFAULT gen_random_uuid()` | — |
| `finding_id` | `uuid` | `NOT NULL`, FK → `findings(id)`, `ON DELETE CASCADE` | Temuan terkait |
| `responder_id` | `uuid` | `NOT NULL`, FK → `profiles(id)`, `ON DELETE CASCADE` | Pengirim klarifikasi |
| `responder_role` | `text` | `NOT NULL` | `po` atau `staf-iw` |
| `decision` | `text` | `NOT NULL` | `menerima`, `menolak`, `melengkapi` |
| `message` | `text` | `NOT NULL` | Isi klarifikasi |
| `evidence` | `jsonb` | `NOT NULL DEFAULT '{}'` | Metadata bukti (file path, dll.) |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` | — |

---

#### `finding_actions`

Tindak lanjut (action items) atas temuan.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | `uuid` | PK, `DEFAULT gen_random_uuid()` | — |
| `finding_id` | `uuid` | `NOT NULL`, FK → `findings(id)`, `ON DELETE CASCADE` | Temuan terkait |
| `action_text` | `text` | `NOT NULL` | Deskripsi tindakan |
| `status` | `text` | `NOT NULL DEFAULT 'open'` | `open` atau `done` |
| `done_at` | `timestamptz` | — | Waktu selesai |
| `done_by` | `uuid` | FK → `profiles(id)`, `ON DELETE SET NULL` | Pelaksana |
| `created_by` | `uuid` | `NOT NULL`, FK → `profiles(id)`, `ON DELETE SET NULL` | Pembuat |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` | — |

---

### 2.6 Audit Trail & Pengaturan

#### `activity_logs`

Log aktivitas pengguna untuk audit trail.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | `uuid` | PK, `DEFAULT gen_random_uuid()` | — |
| `user_id` | `uuid` | `NOT NULL`, FK → `profiles(id)`, `ON DELETE CASCADE` | Pelaku |
| `aksi` | `text` | `NOT NULL` | Kode aksi (mis. `INPUT_TRANSAKSI`, `VERIFIKASI_PO`) |
| `deskripsi` | `text` | — | Deskripsi human-readable |
| `metadata` | `jsonb` | `NOT NULL DEFAULT '{}'` | Detail tambahan |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` | — |

**Nilai `aksi` yang umum:** `SET_PIN`, `BUKA_SESI`, `TUTUP_SESI`,
`INPUT_TRANSAKSI`, `BUAT_TEMUAN`, `UPDATE_TEMUAN`, `KIRIM_KLARIFIKASI`,
`LOGIN`, `LOGOUT`, `UBAH_PASSWORD`, `BUAT_USER`, `UPDATE_USER`,
`BUAT_TERMINAL`, `UPDATE_TERMINAL`, `HAPUS_TERMINAL`, `BUAT_JENIS_KENDARAAN`,
`UPDATE_JENIS_KENDARAAN`, `HAPUS_JENIS_KENDARAAN`, `UPDATE_SETTINGS`,
`IMPORT_IWKBU`, `JALANKAN_SYNC`, `TAMBAH_TINDAKAN`, `SELESAIKAN_TINDAKAN`,
`BUKA_ULANG_TEMUAN`, `BUAT_ARMADA`, `UPDATE_ARMADA`, `VERIFIKASI_ARMADA`,
`EDIT_PO`, `VERIFIKASI_PO`, `PERIODE_REKONSILIASI`.

---

#### `system_settings`

Konfigurasi sistem key-value.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `key` | `text` | PK | Kunci setting |
| `value` | `text` | `NOT NULL` | Nilai setting |
| `description` | `text` | — | Deskripsi |
| `category` | `varchar` | `NOT NULL DEFAULT 'general'` | Kategori (general, operasional, security) |
| `updated_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Di-update oleh trigger |
| `updated_by` | `uuid` | FK → `profiles(id)`, `ON DELETE SET NULL` | Pengubah |

**Seed data:** `app_name`, `pin_session_hours`, `max_login_attempts`.

---

### 2.7 IWKBU & Rekonsiliasi

#### `iwkbu_source_records`

Data mentah dari API IWKBU eksternal sebelum diproses.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | `uuid` | PK, `DEFAULT gen_random_uuid()` | — |
| `external_ref` | `text` | `UNIQUE` | Referensi eksternal |
| `nomor_polisi` | `text` | `NOT NULL` | Plat nomor |
| `compliance_status` | `text` | `NOT NULL DEFAULT 'unknown'` | Status kepatuhan |
| `issue_count` | `integer` | `NOT NULL DEFAULT 0` | Jumlah issue |
| `source_updated_at` | `timestamptz` | — | Update terakhir dari sumber |
| `payload` | `jsonb` | `NOT NULL DEFAULT '{}'` | Payload mentah |
| `imported_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Waktu import |

---

#### `iwkbu_sync_runs`

Log eksekusi sinkronisasi IWKBU.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | `uuid` | PK, `DEFAULT gen_random_uuid()` | — |
| `trigger_type` | `text` | `NOT NULL DEFAULT 'manual'` | Pemicu: `manual` atau `cron` |
| `status` | `text` | `NOT NULL DEFAULT 'running'` | CHECK: `running`, `success`, `failed` |
| `started_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Mulai |
| `finished_at` | `timestamptz` | — | Selesai |
| `initiated_by` | `uuid` | FK → `profiles(id)`, `ON DELETE SET NULL` | Pemulai |
| `summary` | `jsonb` | `NOT NULL DEFAULT '{}'` | Ringkasan hasil |
| `error_message` | `text` | — | Pesan error jika gagal |
| `periode_id` | `uuid` | FK → `rekonsiliasi_periode(id)`, `ON DELETE SET NULL` | Periode terkait (ditambah di 0008) |

---

#### `iwkbu_sync_status`

Status rekonsiliasi per armada (hasil pemrosesan sync).

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `armada_id` | `uuid` | PK, FK → `armada(id)`, `ON DELETE CASCADE` | Relasi 1:1 ke armada |
| `po_id` | `uuid` | `NOT NULL`, FK → `po(id)`, `ON DELETE CASCADE` | PO pemilik |
| `nomor_polisi` | `text` | `NOT NULL` | Plat nomor |
| `iwkbu_compliance_status` | `text` | `NOT NULL` | Status kepatuhan IWKBU |
| `issue_count` | `integer` | `NOT NULL DEFAULT 0` | Jumlah issue |
| `source_updated_at` | `timestamptz` | — | Update sumber terakhir |
| `terminal_last_seen` | `timestamptz` | — | Terakhir terlihat di terminal |
| `po_status_verifikasi` | `text` | — | Snapshot status PO |
| `armada_status_verifikasi` | `text` | — | Snapshot status verifikasi armada |
| `armada_status_operasional` | `text` | — | Snapshot status operasional armada |
| `reconciliation_status` | `text` | `NOT NULL` | Status rekonsiliasi |
| `discrepan_note` | `text` | — | Catatan discrepancy |
| `last_synced_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Sinkronisasi terakhir |
| `source_payload` | `jsonb` | `NOT NULL DEFAULT '{}'` | Payload sumber |

---

#### `rekonsiliasi_periode`

Periode rekonsiliasi (draft → aktif → ditutup). Diperkenalkan di migrasi 0008.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | `uuid` | PK, `DEFAULT gen_random_uuid()` | — |
| `nama_periode` | `text` | `NOT NULL` | Nama periode |
| `tanggal_mulai` | `date` | `NOT NULL` | Tanggal mulai |
| `tanggal_selesai` | `date` | `NOT NULL` | Tanggal selesai |
| `status` | `text` | `NOT NULL DEFAULT 'draft'` | CHECK: `draft`, `aktif`, `ditutup` |
| `created_by` | `uuid` | FK → `auth.users(id)` | Pembuat |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` | — |
| `updated_at` | `timestamptz` | `NOT NULL DEFAULT now()` | — |
| `closed_at` | `timestamptz` | — | Waktu ditutup |
| `catatan` | `text` | — | Catatan |

---

### 2.8 Notifikasi

#### `notifications`

Notifikasi pengguna dengan dukungan Supabase Realtime.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | `uuid` | PK, `DEFAULT gen_random_uuid()` | — |
| `user_id` | `uuid` | `NOT NULL`, FK → `auth.users(id)`, `ON DELETE CASCADE` | Penerima |
| `title` | `text` | `NOT NULL` | Judul |
| `message` | `text` | `NOT NULL` | Isi pesan |
| `type` | `text` | `NOT NULL DEFAULT 'info'` | CHECK: `info`, `success`, `warning`, `error` |
| `link` | `text` | — | URL tujuan klik |
| `is_read` | `boolean` | `NOT NULL DEFAULT false` | Status baca |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` | — |

**Realtime:** Tabel ini ditambahkan ke `supabase_realtime` publication
untuk update badge notifikasi secara live.

---

### 2.9 Rate Limiting

#### `rate_limit_buckets`

Tabel rate limiting berbasis database untuk menggantikan in-memory cache
yang hilang saat serverless cold start.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `key` | `text` | PK | Key unik (mis. `login:ip:1.2.3.4`) |
| `attempt_count` | `integer` | `NOT NULL DEFAULT 0` | Jumlah percobaan |
| `locked_until` | `timestamptz` | — | Waktu unlock |
| `updated_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Update terakhir |

> **RLS:** Enabled tanpa policy. Akses langsung dari client ditolak.
> Hanya `SECURITY DEFINER` RPC dan `service_role` yang dapat akses.

---

### 2.10 Tabel yang Dihapus

#### `terminal_pins` (dihapus di migrasi 0013)

Tabel legacy untuk menyimpan PIN terminal. Tidak digunakan oleh aplikasi,
memiliki RLS deny-all, dan hanya menyisa 2 barir orphan. Dihapus dengan
`DROP TABLE ... CASCADE`.

---

## 3. Relasi (Foreign Key)

Diagram relasi antar tabel (text-based):

```
auth.users (Supabase)
  │
  ├── 1:1 ── profiles ──────────────────────────────────────────
  │              │                                              │
  │              ├── M:N → user_roles ←── roles                 │
  │              ├── M:1 → terminals                            │
  │              │                                              │
  │              ├── 1:1 → po ──┬── 1:N → armada ──┬── 1:N → armada_dokumen
  │              │              │                   │
  │              │              │                   ├── 1:1 → iwkbu_sync_status
  │              │              │                   │
  │              │              │                   └── (FK dari kendaraan_masuk)
  │              │              │
  │              │              ├── 1:N → findings ──┬── 1:N → finding_clarifications
  │              │              │                     │
  │              │              │                     └── 1:N → finding_actions
  │              │              │
  │              │              └── (FK dari iwkbu_sync_status)
  │              │
  │              ├── 1:N → sesi_petugas ──┬── 1:N → kendaraan_masuk ── 1:1 → kendaraan_keluar
  │              │                         │
  │              │                         └── 1:N → kendaraan_keluar
  │              │
  │              ├── 1:N → activity_logs
  │              ├── 1:N → petugas_pin_sessions → petugas_terminal
  │              └── 1:N → notifications (via auth.users)
  │
  terminals ──┬── 1:N → petugas_terminal
              │
              └── (FK dari: profiles, sesi_petugas)

  rekonsiliasi_periode ── 1:N → iwkbu_sync_runs
  iwkbu_source_records   (tabel mandiri, relasi via nomor_polisi)
```

### Daftar Lengkap Foreign Key

| Tabel Anak | Kolom | Tabel Induk | On Delete |
|---|---|---|---|
| `profiles` | `terminal_id` | `terminals(id)` | `SET NULL` |
| `user_roles` | `user_id` | `profiles(id)` | `CASCADE` |
| `user_roles` | `role_id` | `roles(id)` | `CASCADE` |
| `po` | `id` | `profiles(id)` | `CASCADE` |
| `po` | `diverifikasi_oleh` | `profiles(id)` | `SET NULL` |
| `armada` | `po_id` | `po(id)` | `CASCADE` |
| `armada` | `diverifikasi_oleh` | `profiles(id)` | `SET NULL` |
| `armada_dokumen` | `armada_id` | `armada(id)` | `CASCADE` |
| `armada_dokumen` | `uploaded_by` | `auth.users(id)` | — |
| `petugas_terminal` | `terminal_id` | `terminals(id)` | `CASCADE` |
| `petugas_pin_sessions` | `user_id` | `profiles(id)` | `CASCADE` |
| `petugas_pin_sessions` | `petugas_terminal_id` | `petugas_terminal(id)` | `CASCADE` |
| `sesi_petugas` | `petugas_id` | `profiles(id)` | `CASCADE` |
| `sesi_petugas` | `terminal_id` | `terminals(id)` | `SET NULL` |
| `kendaraan_masuk` | `sesi_id` | `sesi_petugas(id)` | `CASCADE` |
| `kendaraan_masuk` | `petugas_id` | `profiles(id)` | `CASCADE` |
| `kendaraan_masuk` | `armada_id` | `armada(id)` | `RESTRICT` |
| `kendaraan_masuk` | `po_id` | `po(id)` | `CASCADE` |
| `kendaraan_keluar` | `masuk_id` | `kendaraan_masuk(id)` | `CASCADE` |
| `kendaraan_keluar` | `sesi_id` | `sesi_petugas(id)` | `CASCADE` |
| `kendaraan_keluar` | `petugas_id` | `profiles(id)` | `CASCADE` |
| `findings` | `po_id` | `po(id)` | `CASCADE` |
| `findings` | `armada_id` | `armada(id)` | `SET NULL` |
| `findings` | `created_by` | `profiles(id)` | `SET NULL` |
| `findings` | `resolved_by` | `profiles(id)` | `SET NULL` |
| `finding_clarifications` | `finding_id` | `findings(id)` | `CASCADE` |
| `finding_clarifications` | `responder_id` | `profiles(id)` | `CASCADE` |
| `finding_actions` | `finding_id` | `findings(id)` | `CASCADE` |
| `finding_actions` | `done_by` | `profiles(id)` | `SET NULL` |
| `finding_actions` | `created_by` | `profiles(id)` | `SET NULL` |
| `activity_logs` | `user_id` | `profiles(id)` | `CASCADE` |
| `system_settings` | `updated_by` | `profiles(id)` | `SET NULL` |
| `iwkbu_sync_runs` | `initiated_by` | `profiles(id)` | `SET NULL` |
| `iwkbu_sync_runs` | `periode_id` | `rekonsiliasi_periode(id)` | `SET NULL` |
| `iwkbu_sync_status` | `armada_id` | `armada(id)` | `CASCADE` |
| `iwkbu_sync_status` | `po_id` | `po(id)` | `CASCADE` |
| `rekonsiliasi_periode` | `created_by` | `auth.users(id)` | — |
| `notifications` | `user_id` | `auth.users(id)` | `CASCADE` |

---

## 4. RLS Policies

### 4.1 Ringkasan Status RLS

Semua tabel aplikasi memiliki RLS **enabled**. Tabel sensitif juga di-set
**`FORCE ROW LEVEL SECURITY`** di migrasi 0004, yang berarti bahkan
`table owner` dan `superuser` (non-service-role) tetap tunduk pada policy.

### Tabel dengan `FORCE ROW LEVEL SECURITY`

| Tabel | FORCE RLS |
|---|---|
| `activity_logs` | ✅ |
| `armada` | ✅ |
| `findings` | ✅ |
| `finding_clarifications` | ✅ |
| `finding_actions` | ✅ |
| `po` | ✅ |
| `profiles` | ✅ |
| `user_roles` | ✅ |
| `petugas_terminal` | ✅ |
| `petugas_pin_sessions` | ✅ |
| `kendaraan_masuk` | ✅ |
| `kendaraan_keluar` | ✅ |
| `sesi_petugas` | ✅ |
| `iwkbu_source_records` | ✅ |
| `iwkbu_sync_runs` | ✅ |
| `iwkbu_sync_status` | ✅ |
| `system_settings` | ✅ |

### Tabel dengan RLS Enabled (tanpa FORCE)

`armada_dokumen`, `rekonsiliasi_periode`, `notifications`, `rate_limit_buckets`,
`jenis_kendaraan`, `terminals`, `roles`.

### 4.2 Detail Policy per Tabel

#### `profiles`

| Policy | Operasi | Aturan |
|---|---|---|
| `Users can view own profile` | SELECT | `auth.uid() = id` |
| `Users can update own profile` | UPDATE | `auth.uid() = id` |
| `Admins can view all profiles` | SELECT | `is_super_admin()` |

#### `po`

| Policy | Operasi | Aturan |
|---|---|---|
| `PO can view own data` | SELECT | `id = auth.uid()` |
| `PO can insert own data` | INSERT | `id = auth.uid()` |
| `PO can update own data` | UPDATE | `id = auth.uid()` + `status_verifikasi = 'menunggu'` |
| `Admin Terminal can view all PO` | SELECT | `is_admin_terminal()` |
| `Staf IW can view all PO` | SELECT | `is_staf_iw()` |
| `Staf IW can verify PO` | UPDATE | `is_staf_iw()` |

#### `armada`

| Policy | Operasi | Aturan |
|---|---|---|
| `PO can view own armada` | SELECT | `po_id = auth.uid()` + PO status `aktif` |
| `Admin Terminal can view all armada` | SELECT | `is_admin_terminal()` |
| `Staf IW can view all armada` | SELECT | `is_staf_iw()` |
| `PO can insert own armada` | INSERT | `po_id = auth.uid()` + PO status `aktif` |
| `PO can update own armada` | UPDATE | `po_id = auth.uid()` + PO status `aktif` |
| `Staf IW can verify armada` | UPDATE | `is_staf_iw()` |

#### `armada_dokumen`

| Policy | Operasi | Aturan |
|---|---|---|
| `po_select_own_dokumen` | SELECT | `armada.po_id = auth.uid()` |
| `po_insert_own_dokumen` | INSERT | `armada.po_id = auth.uid()` |
| `po_delete_own_dokumen` | DELETE | `armada.po_id = auth.uid()` |
| `staf_read_all_dokumen` | SELECT | `is_staf_iw()` atau `is_admin_terminal()` |

#### `findings`

| Policy | Operasi | Aturan |
|---|---|---|
| `findings_select_po_own` | SELECT | `po_id = auth.uid()` |
| `findings_select_staff` | SELECT | `is_staf_iw()` atau `is_admin_terminal()` |
| `findings_insert_staff` | INSERT | `is_staf_iw()` atau `is_admin_terminal()` |
| `findings_update_staff` | UPDATE | `is_staf_iw()` atau `is_admin_terminal()` |

#### `finding_clarifications`

| Policy | Operasi | Aturan |
|---|---|---|
| `clarifications_select_related` | SELECT | Staf/admin, atau finding milik PO |
| `clarifications_insert_po` | INSERT | `responder_id = auth.uid()` + akses ke finding |

#### `finding_actions`

| Policy | Operasi | Aturan |
|---|---|---|
| `finding_actions_select_po` | SELECT | Finding milik `auth.uid()` |
| `finding_actions_select_staff` | SELECT | `is_staf_iw()` atau `is_admin_terminal()` |
| `finding_actions_insert_staff` | INSERT | `is_staf_iw()` atau `is_admin_terminal()` |
| `finding_actions_update_staff` | UPDATE | `is_staf_iw()` atau `is_admin_terminal()` |

#### `sesi_petugas`

| Policy | Operasi | Aturan |
|---|---|---|
| `admin_select_sesi` | SELECT | `petugas_id = auth.uid()` atau admin/staf |
| `petugas_insert_own_sesi` | INSERT | `petugas_id = auth.uid()` |
| `petugas_update_own_sesi` | UPDATE | `petugas_id = auth.uid()` |

#### `kendaraan_masuk`

| Policy | Operasi | Aturan |
|---|---|---|
| `all_roles_select_masuk` | SELECT | `petugas_id = auth.uid()` atau admin/staf |
| `petugas_insert_own_masuk` | INSERT | `petugas_id = auth.uid()` |

#### `kendaraan_keluar`

| Policy | Operasi | Aturan |
|---|---|---|
| `all_roles_select_keluar` | SELECT | `petugas_id = auth.uid()` atau admin/staf |
| `petugas_insert_own_keluar` | INSERT | `petugas_id = auth.uid()` |

#### `petugas_terminal`

| Policy | Operasi | Aturan |
|---|---|---|
| `petugas_terminal_select_scope` | SELECT | Admin/staf atau terminal sama dengan user |
| `petugas_terminal_write_scope` | INSERT | Admin/staf atau terminal sama dengan user |
| `petugas_terminal_update_scope` | UPDATE | Admin/staf atau terminal sama dengan user |
| `admin_manage_petugas_terminal` | ALL | `is_admin_terminal()` atau `is_staf_iw()` |
| `loket_read_petugas_terminal` | SELECT | `true` (semua authenticated) |

#### `petugas_pin_sessions`

| Policy | Operasi | Aturan |
|---|---|---|
| `users_select_own_pin_session` | SELECT | `user_id = auth.uid()` |
| `users_insert_own_pin_session` | INSERT | `user_id = auth.uid()` |
| `users_update_own_pin_session` | UPDATE | `user_id = auth.uid()` |
| `users_delete_own_pin_session` | DELETE | `user_id = auth.uid()` |
| `petugas_pin_sessions_self` | ALL | `user_id = auth.uid()` + `is_loket()` |

#### `activity_logs`

| Policy | Operasi | Aturan |
|---|---|---|
| `users_select_own_log` | SELECT | `user_id = auth.uid()` |
| `users_insert_own_log` | INSERT | `user_id = auth.uid()` |
| `admin_select_all_logs` | SELECT | `is_admin_terminal()` atau `is_staf_iw()` |
| `admin_insert_logs` | INSERT | `is_admin_terminal()` atau `is_staf_iw()` |

#### `system_settings`

| Policy | Operasi | Aturan |
|---|---|---|
| `system_settings_read` | SELECT | `true` (semua authenticated) |
| `system_settings_write` | ALL | `is_staf_iw()` |

#### `jenis_kendaraan`

| Policy | Operasi | Aturan |
|---|---|---|
| `jenis_kendaraan_read` | SELECT | `true` (semua authenticated) |
| `jenis_kendaraan_write` | ALL | `is_staf_iw()` |

#### `terminals`

| Policy | Operasi | Aturan |
|---|---|---|
| `staf_iw_read_all_terminals` | SELECT | `is_staf_iw()` |

#### `roles`

| Policy | Operasi | Aturan |
|---|---|---|
| `roles_select_all` | SELECT | `true` |

#### `user_roles`

| Policy | Operasi | Aturan |
|---|---|---|
| `user_roles_select_own` | SELECT | `user_id = auth.uid()` |

#### `iwkbu_source_records`

| Policy | Operasi | Aturan |
|---|---|---|
| `iwkbu_source_select_staff` | SELECT | `is_staf_iw()` atau `is_admin_terminal()` |
| `iwkbu_source_write_staff` | ALL | `is_staf_iw()` |

#### `iwkbu_sync_runs`

| Policy | Operasi | Aturan |
|---|---|---|
| `iwkbu_runs_select_staff` | SELECT | `is_staf_iw()` atau `is_admin_terminal()` |
| `iwkbu_runs_write_staff` | ALL | `is_staf_iw()` |

#### `iwkbu_sync_status`

| Policy | Operasi | Aturan |
|---|---|---|
| `iwkbu_status_select_po_own` | SELECT | `po_id = auth.uid()` |
| `iwkbu_status_select_staff` | SELECT | `is_staf_iw()` atau `is_admin_terminal()` |
| `iwkbu_status_write_staff` | ALL | `is_staf_iw()` |

#### `rekonsiliasi_periode`

| Policy | Operasi | Aturan |
|---|---|---|
| `staf_manage_periode_select` | SELECT | `is_staf_iw()` atau `is_admin_terminal()` |
| `staf_manage_periode_insert` | INSERT | `is_staf_iw()` atau `is_admin_terminal()` |
| `staf_manage_periode_update` | UPDATE | `is_staf_iw()` atau `is_admin_terminal()` |
| `staf_manage_periode_delete` | DELETE | `is_staf_iw()` atau `is_admin_terminal()` |
| `po_view_periode` | SELECT | `true` (semua authenticated) |

#### `notifications`

| Policy | Operasi | Aturan |
|---|---|---|
| `user_select_own_notifications` | SELECT | `user_id = auth.uid()` |
| `user_update_own_notifications` | UPDATE | `user_id = auth.uid()` |

#### `rate_limit_buckets`

RLS enabled, **tidak ada policy**. Hanya `SECURITY DEFINER` RPC dan
`service_role` yang dapat akses. Anon/authenticated ditolak sepenuhnya.

### 4.3 Storage RLS Policies

#### Bucket `armada-dokumen`

| Policy | Operasi | Aturan |
|---|---|---|
| `po_upload_own_armada_dokumen` | INSERT | `bucket_id = 'armada-dokumen'` + folder = `auth.uid()` |
| `po_read_own_armada_dokumen` | SELECT | `bucket_id = 'armada-dokumen'` + folder = `auth.uid()` |
| `po_delete_own_armada_dokumen` | DELETE | `bucket_id = 'armada-dokumen'` + folder = `auth.uid()` |
| `staf_read_all_armada_dokumen` | SELECT | `bucket_id = 'armada-dokumen'` + `is_staf_iw()` atau `is_admin_terminal()` |

---

## 5. CHECK Constraints

Semua CHECK constraint didefinisikan di migrasi `0012_check_constraints.sql`
menggunakan pattern idempoten (`IF NOT EXISTS`). Constraint lain yang
didefinisikan inline pada `CREATE TABLE` juga tercantum.

| Tabel | Kolom | Constraint | Nilai yang Diizinkan | Sumber |
|---|---|---|---|---|
| `po` | `status_verifikasi` | `chk_po_status_verifikasi` | `menunggu`, `aktif`, `ditolak` | 0012 |
| `armada` | `status_operasional` | `chk_armada_status_operasional` | `aktif`, `tidak_aktif`, `rusak`, `cadangan`, `dijual` | 0012 |
| `armada` | `status_verifikasi` | `chk_armada_status_verifikasi` | `menunggu`, `terverifikasi`, `ditolak` | 0012 |
| `findings` | `severity` | `chk_findings_severity` | `low`, `medium`, `high` | 0012 |
| `findings` | `status` | `chk_findings_status` | `open`, `on_progress`, `closed` | 0012 |
| `sesi_petugas` | `status` | `chk_sesi_petugas_status` | `aktif`, `selesai` | 0012 |
| `rekonsiliasi_periode` | `status` | `chk_rekonsiliasi_periode_status` | `draft`, `aktif`, `ditutup` | 0008 (inline) + 0012 |
| `iwkbu_sync_runs` | `status` | `chk_iwkbu_sync_runs_status` | `running`, `success`, `failed` | 0012 |
| `armada_dokumen` | `jenis_dokumen` | `chk_armada_dokumen_jenis` | `stck`, `kir`, `asuransi`, `lainnya` | 0007 (inline) + 0012 |
| `notifications` | `type` | (inline) | `info`, `success`, `warning`, `error` | 0009 |

---

## 6. Trigger Functions

Didefinisikan di migrasi `0011_trigger_functions.sql` (13 fungsi, 16 trigger).
Semua `SECURITY DEFINER` trigger function telah di-`REVOKE EXECUTE FROM PUBLIC`
untuk mencegah eksekusi langsung. `search_path` diset ke `''` pada fungsi
keamanan tinggi.

### 6.1 Helper Functions (Touch `updated_at`)

| Fungsi | Keterangan |
|---|---|
| `update_updated_at_column()` | Set `new.updated_at = now()` — dipakai oleh trigger armada, po |
| `touch_updated_at()` | Sama, versi dengan `search_path = ''` — dipakai oleh jenis_kendaraan, system_settings |
| `fn_touch_findings_updated_at()` | Sama, khusus findings — `search_path = ''` |

### 6.2 Audit Log Trigger Functions (SECURITY DEFINER)

| Fungsi | Trigger | Tabel | Event | Aksi yang Dilog |
|---|---|---|---|---|
| `fn_log_transaksi_masuk()` | `trg_log_transaksi_masuk` | `kendaraan_masuk` | AFTER INSERT | `INPUT_TRANSAKSI` (tipe: masuk) |
| `fn_log_transaksi_keluar()` | `trg_log_transaksi_keluar` | `kendaraan_keluar` | AFTER INSERT | `INPUT_TRANSAKSI` (tipe: keluar) |
| `fn_log_hapus_transaksi_masuk()` | `trg_log_hapus_masuk` | `kendaraan_masuk` | AFTER DELETE | `HAPUS_TRANSAKSI` (tipe: masuk) |
| `fn_log_hapus_transaksi_keluar()` | `trg_log_hapus_keluar` | `kendaraan_keluar` | AFTER DELETE | `HAPUS_TRANSAKSI` (tipe: keluar) |
| `fn_log_pin_change()` | `trg_log_pin_change` | `petugas_terminal` | AFTER INSERT/UPDATE | `SET_PIN` (deteksi perubahan pin_hash) |
| `fn_log_sesi_changes()` | `trg_log_sesi_changes` | `sesi_petugas` | AFTER INSERT/UPDATE | `BUKA_SESI` / `TUTUP_SESI` |
| `fn_log_finding_changes()` | `trg_log_finding_changes` | `findings` | AFTER INSERT/UPDATE | `BUAT_TEMUAN` / `UPDATE_TEMUAN` |
| `fn_log_clarification_changes()` | `trg_log_clarification_changes` | `finding_clarifications` | AFTER INSERT | `KIRIM_KLARIFIKASI` |

### 6.3 Business Logic Trigger Functions

| Fungsi | Trigger | Tabel | Event | Keterangan |
|---|---|---|---|---|
| `fn_check_sesi_aktif_before_insert()` | `trg_check_sesi_before_masuk` | `kendaraan_masuk` | BEFORE INSERT | Tolak insert jika sesi sudah `selesai` |
| `fn_check_sesi_aktif_before_insert()` | `trg_check_sesi_before_keluar` | `kendaraan_keluar` | BEFORE INSERT | Tolak insert jika sesi sudah `selesai` |
| `fn_auto_update_sesi_totals()` | `trg_auto_update_sesi_totals` | `sesi_petugas` | BEFORE UPDATE | Hitung ulang total transaksi saat sesi ditutup |

### 6.4 Touch Updated At Triggers

| Trigger | Tabel | Event | Fungsi |
|---|---|---|---|
| `trg_findings_touch_updated_at` | `findings` | BEFORE UPDATE | `fn_touch_findings_updated_at()` |
| `update_armada_updated_at` | `armada` | BEFORE UPDATE | `update_updated_at_column()` |
| `update_po_updated_at` | `po` | BEFORE UPDATE | `update_updated_at_column()` |
| `trg_jenis_kendaraan_touch` | `jenis_kendaraan` | BEFORE UPDATE | `touch_updated_at()` |
| `trg_system_settings_touch` | `system_settings` | BEFORE UPDATE | `touch_updated_at()` |

### 6.5 Auth Trigger (dari migrasi 0002)

| Trigger | Tabel | Event | Fungsi | Keterangan |
|---|---|---|---|---|
| `on_auth_user_created` | `auth.users` | AFTER INSERT | `handle_new_user()` | Buat profile + assign role dari `raw_user_meta_data` |

`handle_new_user()` melakukan:
1. `INSERT` ke `profiles` (upsert: update jika sudah ada).
2. Baca `role` dari `raw_user_meta_data`.
3. `INSERT` ke `user_roles` jika role valid.

---

## 7. Storage Buckets

### 7.1 `armada-dokumen`

Bucket penyimpanan dokumen armada (STCK, KIR, Asuransi).

| Properti | Nilai |
|---|---|
| Bucket ID | `armada-dokumen` |
| Visibility | **Private** (RLS-controlled) |
| File size limit | **5 MB** (5.242.880 byte) |
| Allowed MIME types | `application/pdf`, `image/jpeg`, `image/png`, `image/webp` |
| Struktur folder | `{auth.uid()}/{filename}` — folder per PO |
| Didefinisikan di | Migrasi 0007 |

**Storage RLS:**
- PO dapat upload/read/delete file di folder mereka sendiri.
- Staf IW & admin-terminal dapat read semua file.

### 7.2 `finding-evidence`

Bucket penyimpanan bukti/lampiran klarifikasi temuan.

| Properti | Nilai |
|---|---|
| Bucket ID | `finding-evidence` |
| Visibility | **Private** |
| File size limit | **5 MB** (5.242.880 byte) |
| Allowed MIME types | `application/pdf`, `image/jpeg`, `image/png`, `image/webp` |
| Didefinisikan di | Migrasi 0014 |

> Download file dari bucket ini dilakukan melalui **signed URL** endpoint
> `GET /api/findings/evidence` yang memverifikasi ownership/role sebelum
> menghasilkan URL. Mencegah IDOR cross-role access.

---

## 8. Rate Limiting

Sistem rate limiting berbasis database untuk menggantikan in-memory cache
yang tidak persistent di lingkungan serverless.

### 8.1 Tabel `rate_limit_buckets`

Lihat [§2.9](#29-rate-limiting) untuk detail kolom.

RLS enabled tanpa policy — akses hanya via `SECURITY DEFINER` RPC.

### 8.2 RPC Functions

| Fungsi | Parameter | Return | Keterangan |
|---|---|---|---|
| `check_rate_limit(p_key)` | `text` | `INTEGER` | Cek apakah key terkunci. Return `>0` = retry_after_seconds, `0` = boleh coba |
| `record_rate_limit_attempt(p_key, p_max_attempts, p_lockout_seconds)` | `text`, `integer` (default 5), `integer` (default 900) | `INTEGER` | Increment counter atomik. Return `>0` jika terkunci setelah percobaan ini |
| `clear_rate_limit(p_key)` | `text` | `VOID` | Reset bucket setelah upaya berhasil |

### 8.3 Cara Kerja

```
Client mencoba aksi
       │
       ▼
check_rate_limit(key) ──── return 0 (bebas) ──→ lanjutkan aksi
       │                                         │
       │ return >0 (terkunci)                    │ sukses → clear_rate_limit(key)
       ▼                                         │ gagal  → record_rate_limit_attempt(key)
  Tolak dengan HTTP 429 + Retry-After            │         └── return >0 jika mencapai max
```

### 8.4 Penggunaan di Aplikasi

Rate limiter digunakan di:

| Endpoint | Key Pattern | Max Attempts | Lockout |
|---|---|---|---|
| `POST /api/auth/login` | `login:{ip}` atau `login:{email}` | 5 | 15 menit |
| `POST /api/auth/verify-pin` | `pin:{ip}` | 5 | 15 menit |
| `POST /api/auth/change-pin` | `change-pin:{user_id}` | 5 | 15 menit |
| `POST /api/auth/forgot-password` | `forgot:{ip}` | 5 | 15 menit |

Diimplementasikan via `src/lib/auth/rate-limiter.ts` dan
`src/lib/auth/pin-rate-limiter.ts`.

---

## 9. Daftar Migrasi

| # | File | Nama | Deskripsi |
|---|---|---|---|
| 0001 | `0001_init_schema.sql` | init_schema | Baseline schema: 21 tabel + 12 index + ekstensi pgcrypto |
| 0002 | `0002_functions.sql` | functions | Role helper functions, `handle_new_user()` trigger, `log_activity()` RPC, dashboard & rekap RPC |
| 0003 | `0003_rls_policies.sql` | rls_policies | Enable RLS di semua tabel + 60+ policy definitions |
| 0004 | `0004_security_hardening.sql` | security_hardening | FORCE RLS pada 17 tabel sensitif, lock internal functions (`search_path = ''`, `REVOKE EXECUTE`), drop legacy functions |
| 0005 | `0005_check_loket_pin_session.sql` | check_loket_pin_session | RPC `check_loket_pin_session()` untuk middleware (menggantikan service-role di proxy.ts) |
| 0006 | `0006_db_backed_rate_limiter.sql` | db_backed_rate_limiter | Tabel `rate_limit_buckets` + 3 RPC atomik (`check_rate_limit`, `record_rate_limit_attempt`, `clear_rate_limit`) |
| 0007 | `0007_armada_dokumen.sql` | armada_dokumen | Tabel `armada_dokumen` + storage bucket `armada-dokumen` (private, 5MB, PDF/JPEG/PNG) |
| 0008 | `0008_rekonsiliasi_periode.sql` | rekonsiliasi_periode | Tabel `rekonsiliasi_periode` (draft/aktif/ditutup) + kolom `periode_id` di `iwkbu_sync_runs` |
| 0009 | `0009_notifications.sql` | notifications | Tabel `notifications` + Realtime publication untuk live badge |
| 0010 | `0010_bootstrap_staf_iw.sql` | bootstrap_staf_iw | Profile + role assignment untuk user `staf.iw@terminal.go.id` (auth user harus dibuat via GoTrue Admin API) |
| 0011 | `0011_trigger_functions.sql` | trigger_functions | 13 trigger functions + 16 triggers (audit log, touch updated_at, sesi validation, auto totals) |
| 0012 | `0012_check_constraints.sql` | check_constraints | 9 CHECK constraints pada kolom enum-like |
| 0013 | `0013_cleanup_terminal_pins_and_roles.sql` | cleanup_terminal_pins_and_roles | Drop `terminal_pins`, fix `is_super_admin()` (hanya `staf-iw`), hapus role legacy (`admin_terminal`, `staf_iw`) |
| 0014 | `0014_finding_evidence_bucket.sql` | finding_evidence_bucket | Storage bucket `finding-evidence` (private, 5MB, PDF/JPEG/PNG/WebP) |

### Urutan Eksekusi

```
0001 (schema)
  └─ 0002 (functions)
       └─ 0003 (RLS)
            └─ 0004 (security hardening)
                 ├─ 0005 (loket PIN check)
                 ├─ 0006 (rate limiter)
                 ├─ 0007 (armada dokumen)
                 ├─ 0008 (rekonsiliasi periode)
                 ├─ 0009 (notifications)
                 ├─ 0010 (bootstrap staf-iw)
                 ├─ 0011 (trigger functions)
                 ├─ 0012 (CHECK constraints)
                 ├─ 0013 (cleanup)
                 └─ 0014 (finding evidence bucket)

seed.sql (4 roles + 3 settings)
```

---

## Appendix A: Role Helper Functions

| Fungsi | Parameter | Return | Keterangan |
|---|---|---|---|
| `is_staf_iw(user_id)` | `uuid` (default `auth.uid()`) | `boolean` | Cek apakah user memiliki role `staf-iw` |
| `is_admin_terminal(user_id)` | `uuid` (default `auth.uid()`) | `boolean` | Cek apakah user memiliki role `admin-terminal` |
| `is_loket(user_id)` | `uuid` (default `auth.uid()`) | `boolean` | Cek apakah user memiliki role `loket` |
| `is_super_admin()` | — | `boolean` | Alias untuk `is_staf_iw()` (role super-admin) |
| `get_user_role(p_user_id)` | `uuid` | `text` | Ambil nama role user |
| `get_current_user_role()` | — | `text` | Ambil nama role user saat ini |

> **Catatan:** Setelah migrasi 0013, `is_super_admin()` hanya menerima
> role `staf-iw`. Legacy `super-admin` / `super_admin` telah dihapus.

## Appendix B: RPC Dashboard & Rekap Functions

| Fungsi | Parameter | Return | Keterangan |
|---|---|---|---|
| `log_activity(p_aksi, p_deskripsi, p_metadata)` | `text`, `text`, `jsonb` | `uuid` | Tulis audit log (SECURITY DEFINER) |
| `get_activity_logs(p_start, p_end, p_aksi, p_limit, p_offset)` | `date`, `date`, `text`, `int`, `int` | `TABLE` | Baca audit log dengan pagination |
| `get_petugas_dashboard_stats()` | — | `json` | Statistik dashboard petugas (sesi aktif, transaksi hari ini) |
| `get_admin_terminal_stats(p_terminal_id, p_date)` | `uuid`, `date` | `json` | Statistik dashboard admin terminal |
| `get_admin_rekap_harian(p_terminal_id, p_date)` | `uuid`, `date` | `TABLE` | Rekap harian transaksi terminal |
| `get_rekap_sesi(p_terminal_id, p_start, p_end)` | `uuid`, `date`, `date` | `TABLE` | Rekap sesi petugas per terminal |
| `get_detail_sesi(p_sesi_id)` | `uuid` | `TABLE` | Detail transaksi dalam satu sesi |
| `check_loket_pin_session()` | — | `boolean` | Validasi sesi PIN loket (untuk middleware) |

## Appendix C: Index

| Index | Tabel | Kolom | Keterangan |
|---|---|---|---|
| `idx_armada_po_id` | `armada` | `po_id` | Query armada per PO |
| `idx_armada_nopol` | `armada` | `nomor_polisi` | Pencarian plat nomor |
| `idx_kendaraan_masuk_sesi` | `kendaraan_masuk` | `sesi_id` | Query transaksi per sesi |
| `idx_kendaraan_masuk_petugas` | `kendaraan_masuk` | `petugas_id` | Query transaksi per petugas |
| `idx_kendaraan_keluar_masuk` | `kendaraan_keluar` | `masuk_id` | Join masuk-keluar |
| `idx_sesi_petugas_terminal` | `sesi_petugas` | `terminal_id` | Query sesi per terminal |
| `idx_findings_po` | `findings` | `po_id` | Query temuan per PO |
| `idx_findings_status` | `findings` | `status` | Filter temuan by status |
| `idx_activity_logs_created` | `activity_logs` | `created_at DESC` | Sort log terbaru |
| `idx_activity_logs_user` | `activity_logs` | `user_id` | Filter log per user |
| `idx_petugas_terminal_terminal` | `petugas_terminal` | `terminal_id` | Query petugas per terminal |
| `idx_iwkbu_source_nopol` | `iwkbu_source_records` | `nomor_polisi` | Pencarian record IWKBU |
| `idx_armada_dokumen_armada_id` | `armada_dokumen` | `armada_id` | Query dokumen per armada |
| `idx_periode_status` | `rekonsiliasi_periode` | `status` | Filter periode by status |
| `idx_periode_tanggal` | `rekonsiliasi_periode` | `tanggal_mulai DESC` | Sort periode terbaru |
| `idx_notifications_user_unread` | `notifications` | `(user_id, is_read, created_at DESC)` | Badge notifikasi unread |

## Appendix D: TypeScript Type Mapping

Tipe TypeScript yang memetakan ke skema database didefinisikan di
`src/lib/supabase/queries/operasional.types.ts`. Pemetaan utama:

| TypeScript Type | Tabel/View DB |
|---|---|
| `ShiftSession` | `sesi_petugas` |
| `KendaraanMasuk` | `kendaraan_masuk` |
| `KendaraanKeluar` | `kendaraan_keluar` |
| `ActivePO` | `po` |
| `PinSession` | `petugas_pin_sessions` |
| `FindingRecord` | `findings` (+ join `po`, `armada`, `finding_clarifications`, `finding_actions`) |
| `FindingClarification` | `finding_clarifications` |
| `FindingAction` | `finding_actions` |
| `ActivityLog` | `activity_logs` |
| `JenisKendaraan` | `jenis_kendaraan` |
| `SystemSetting` | `system_settings` |
| `SesiStatus` | Union: `"aktif" \| "selesai"` |
| `FindingStatus` | Union: `"open" \| "on_progress" \| "closed"` |
| `FindingSeverity` | Union: `"low" \| "medium" \| "high"` |
| `AksiLog` | Union literal dari semua nilai `activity_logs.aksi` |
