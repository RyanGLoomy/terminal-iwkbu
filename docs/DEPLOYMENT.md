# Panduan Deployment — Terminal IWKBU

Panduan lengkap untuk men-deploy aplikasi **Terminal IWKBU** (Next.js 16 App Router + Supabase) ke lingkungan produksi (Vercel).

---

## Daftar Isi

1. [Prasyarat](#1-prasyarat)
2. [Setup Supabase](#2-setup-supabase)
3. [Environment Variables](#3-environment-variables)
4. [Deploy ke Vercel](#4-deploy-ke-vercel)
5. [Post-Deploy](#5-post-deploy)
6. [Backup Strategy](#6-backup-strategy)
7. [Rollback](#7-rollback)

---

## 1. Prasyarat

| Komponen | Versi / Kebutuhan | Keterangan |
|----------|-------------------|------------|
| **Node.js** | 20+ | CI menggunakan Node 20; Vercel mendukung Node 22 secara default. |
| **pnpm** | 10.29.1+ | Satu-satunya package manager yang didukung (`pnpm-workspace.yaml` mengatur build dependencies). Jangan gunakan `npm` atau `yarn`. |
| **Vercel Account** | — | Tempat hosting aplikasi Next.js. Buat di [vercel.com](https://vercel.com). Akun gratis (Hobby) cukup untuk staging; gunakan Pro untuk production. |
| **Supabase Project** | — | Backend: Auth, Postgres, Storage, Realtime. Buat di [supabase.com](https://supabase.com). |
| **Git Repository** | — | Repo harus terhubung ke Vercel (GitHub / GitLab / Bitbucket). |
| **Sentry Account** _(opsional)_ | — | Error tracking. No-op jika DSN tidak diset, jadi ini opsional. |
| **IWKBU API Access** _(opsional)_ | — | Jika tersedia, adaptor akan fetch data compliance dari API eksternal. Tanpa ini, adaptor berjalan dalam mode mock. |

### Verifikasi Prasyarat Lokal

```bash
node --version    # harus >= 20
pnpm --version    # harus >= 10.29.1
git remote -v     # pastikan remote GitHub terkonfigurasi
```

---

## 2. Setup Supabase

### 2.1 Buat Project Supabase

1. Login ke [Supabase Dashboard](https://supabase.com/dashboard).
2. Klik **New Project**.
3. Pilih organisasi, isi:
   - **Name**: `terminal-iwkbu-prod` (atau sesuai konvensi penamaan)
   - **Database Password**: Generate password kuat, simpan di password manager.
   - **Region**: Pilih region terdekat dengan pengguna (mis. `Southeast Asia (Singapore)`). Region ini juga harus dekat dengan region deployment Vercel untuk latensi minimum.
   - **Plan**: Free tier cukup untuk dev/staging. Gunakan Pro untuk production (minimal untuk daily backups).
4. Tunggu provisioning selesai (~2 menit).

### 2.2 Jalankan Migrations

Aplikasi ini menggunakan **14 file migration** di `supabase/migrations/` (0001–0014). Repo sudah self-contained untuk `supabase db reset`.

**Opsi A — Via Supabase CLI (rekomendasi, reproducible):**

```bash
# Install Supabase CLI (sudah ada sebagai dependency dev)
pnpm exec supabase --version

# Link ke project remote
pnpm exec supabase link --project-ref <PROJECT_REF>

# Push semua migration (0001–0014) ke database remote
pnpm exec supabase db push

# (Opsional) Jalankan seed data ke remote DB dengan psql
psql "<SUPABASE_DB_URL>" -f supabase/seed.sql
```

> **PROJECT_REF** ada di **Dashboard → Project Settings → General → Reference ID**.

**Opsi B — Via Supabase MCP / SQL Editor (alternatif):**

Jalankan setiap file `.sql` di `supabase/migrations/` secara berurutan (0001 → 0014) melalui **Dashboard → SQL Editor**.

Urutan migration wajib dijalankan secara berurutan karena ada dependensi antar file:

| # | File | Fungsi |
|---|------|--------|
| 0001 | `init_schema.sql` | 21 tabel baseline + indexes |
| 0002 | `functions.sql` | RPC + helper functions |
| 0003 | `rls_policies.sql` | Row Level Security policies |
| 0004 | `security_hardening.sql` | FORCE RLS + lock functions + `search_path` |
| 0005 | `check_loket_pin_session.sql` | RPC untuk middleware PIN check |
| 0006 | `db_backed_rate_limiter.sql` | Tabel rate limit + RPCs |
| 0007 | `armada_dokumen.sql` | Tabel dokumen armada + storage bucket |
| 0008 | `rekonsiliasi_periode.sql` | Tabel periode rekonsiliasi |
| 0009 | `notifications.sql` | Tabel notifikasi + Realtime |
| 0010 | `bootstrap_staf_iw.sql` | Bootstrap user staf-iw + konsolidasi roles |
| 0011 | `trigger_functions.sql` | 13 trigger functions + 16 triggers |
| 0012 | `check_constraints.sql` | 9 CHECK constraints |
| 0013 | `cleanup_terminal_pins_and_roles.sql` | Drop `terminal_pins` + fix `is_super_admin()` |
| 0014 | `finding_evidence_bucket.sql` | Storage bucket untuk evidence files |

### 2.3 Verifikasi Row Level Security (RLS)

Semua tabel sensitif telah menerapkan `FORCE ROW LEVEL SECURITY` (migration 0004). Verifikasi:

```sql
-- Jalankan di SQL Editor
SELECT tablename, rowsecurity, forcerowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

Semua tabel di schema `public` harus memiliki `rowsecurity = true`. Tabel sensitif harus `forcerowsecurity = true`.

Jalankan juga **Security Advisors** di **Dashboard → Advisors → Security** untuk memastikan tidak ada peringatan yang tidak diharapkan. Peringatan yang dapat diterima (by-design):

- `check_rate_limit` / `record_rate_limit_attempt` / `clear_rate_limit` — callable by anon (diperlukan untuk pre-auth login rate limiting).
- `log_activity` — menggunakan `auth.uid()`.
- `check_loket_pin_session` — callable by anon (dipanggil dari middleware).

### 2.4 Verifikasi Storage Buckets

Dua storage bucket harus ada (dibuat oleh migration 0007 dan 0014):

| Bucket | Visibility | Size Limit | Allowed MIME | Digunakan oleh |
|--------|------------|------------|--------------|----------------|
| `armada-dokumen` | Private | 5 MB | PDF, JPEG, PNG, WebP | Upload STCK/KIR/Asuransi armada |
| `finding-evidence` | Private | 5 MB | PDF, JPEG, PNG, WebP | Upload dokumen klarifikasi findings |

Verifikasi di **Dashboard → Storage**. Jika bucket tidak ada (mis. jika migration dijalankan via SQL Editor tanpa storage hooks), buat manual:

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('armada-dokumen', 'armada-dokumen', false, 5242880,
   ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  ('finding-evidence', 'finding-evidence', false, 5242880,
   ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;
```

### 2.5 Konfigurasi Auth

Di **Dashboard → Authentication → Providers**:

1. **Email provider**: Pastikan **Enabled**.
2. **Confirm email**: Sesuaikan kebutuhan (rekomendasi: aktifkan untuk production).
3. **Leaked password protection** _(wajib)_:
   - Buka **Dashboard → Authentication → Settings → Passwords**.
   - Aktifkan **"Detect leaked passwords"** (HaveIBeenPwned check).
   - Ini mencegah pengguna menggunakan password yang telah bocor di breach database publik.
4. **Site URL & Redirect URLs**:
   - **Site URL**: `https://<domain-vercel-anda>` (mis. `https://terminal-iwkbu.vercel.app`).
   - **Redirect URLs**: Tambahkan:
     ```
     https://<domain-vercel-anda>/api/auth/callback
     https://<staging-domain>.vercel.app/api/auth/callback
     http://localhost:3000/api/auth/callback   # untuk development
     ```
5. **Session expiry**: Sesuaikan jika diperlukan (default 7 hari untuk access token).

### 2.6 Bootstrap User staf-iw

Migration `0010_bootstrap_staf_iw.sql` membuat user staf-iw pertama untuk administrasi awal:

- **Email**: `staf.iw@terminal.go.id`
- **Password**: `StafIw@2026!`

> **PERINGATAN KEAMANAN**: Ganti password ini segera setelah login pertama melalui halaman profil aplikasi. Jangan gunakan kredensial default di production.

---

## 3. Environment Variables

Semua environment variable berikut harus dikonfigurasi di **Vercel → Project → Settings → Environment Variables**.

### 3.1 Wajib (Aplikasi tidak akan berfungsi tanpa ini)

| Variable | Scope Vercel | Contoh Nilai | Keterangan |
|----------|--------------|--------------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview, Development | `https://xxxxxxxxxxxxx.supabase.co` | URL project Supabase. Dari **Dashboard → Project Settings → API → Project URL**. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Production, Preview, Development | `sb_publishable_...` | Publishable key Supabase modern. Dari **Dashboard → Project Settings → API → Project API keys**. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview, Development | `eyJhbGciOi...` | Anon/public key Supabase legacy. Opsional jika publishable key sudah diset, tetapi boleh diset untuk kompatibilitas. |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview | `eyJhbGciOi...` | Service role key untuk operasi admin (manajemen user, PIN/session loket). Dari **Dashboard → Project Settings → API → Project API keys → service_role**. **JANGAN** set dengan prefix `NEXT_PUBLIC_`. |

> **Catatan**: Set minimal salah satu public key: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (preferred) atau `NEXT_PUBLIC_SUPABASE_ANON_KEY` (legacy). Menyetel keduanya tetap aman untuk kompatibilitas.

### 3.2 Wajib untuk Cron Jobs

| Variable | Scope Vercel | Contoh Nilai | Keterangan |
|----------|--------------|--------------|------------|
| `IWKBU_SYNC_CRON_SECRET` | Production | _(generate string acak 32+ karakter)_ | Bearer token untuk mengautentikasi cron endpoint `/api/cron/iwkbu-sync` dan `/api/cron/iwkbu-fetch`. Diverifikasi dengan `crypto.timingSafeEqual()` (timing-safe). Alternatif: `CRON_SECRET` (fallback). |

Generate secret yang kuat:

```bash
openssl rand -base64 32
```

### 3.3 Opsional — IWKBU API Eksternal

| Variable | Scope Vercel | Keterangan |
|----------|--------------|------------|
| `IWKBU_API_URL` | Production | URL endpoint API IWKBU eksternal. Jika tidak diset, adaptor berjalan dalam **mode mock** (data dummy). |
| `IWKBU_API_KEY` | Production | API key untuk autentikasi ke API IWKBU. Wajib jika `IWKBU_API_URL` diset. |

### 3.4 Opsional — Sentry (Error Tracking)

| Variable | Scope Vercel | Keterangan |
|----------|--------------|------------|
| `SENTRY_DSN` | Production | DSN Sentry untuk server-side. No-op jika tidak diset. |
| `SENTRY_TRACES_SAMPLE_RATE` | Production | Sample rate tracing server (default: `0.1`). |
| `NEXT_PUBLIC_SENTRY_DSN` | Production, Preview | DSN Sentry untuk client-side (browser). No-op jika tidak diset. |
| `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` | Production, Preview | Sample rate tracing client (default: `0.05`). |

### 3.5 Opsional — DB Backup (CI/GitHub Actions)

| Variable | Scope GitHub | Keterangan |
|----------|--------------|------------|
| `SUPABASE_DB_URL` | GitHub Secrets | Connection string Postgres untuk workflow backup DB. **Tidak digunakan oleh aplikasi runtime**, hanya oleh CI. Format: `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres` |

### 3.6 Otomatis (diset oleh Vercel/Next.js)

| Variable | Keterangan |
|----------|------------|
| `NODE_ENV` | Diset otomatis oleh Vercel (`production` untuk deployment production). Digunakan di `src/proxy.ts` untuk menentukan CSP mode. |
| `NEXT_RUNTIME` | Diset otomatis oleh Vercel (`nodejs` atau `edge`). |

### 3.7 Referensi Cepat — `.env.local` untuk Development

```bash
# Wajib
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
# Opsional legacy fallback:
# NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...

# Cron (untuk testing cron endpoint lokal)
IWKBU_SYNC_CRON_SECRET=dev-secret-change-me

# Opsional
# IWKBU_API_URL=https://api.iwkbu.example.com
# IWKBU_API_KEY=your-api-key
# SENTRY_DSN=https://xxx@sentry.io/xxx
# NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
```

> **Penting**: File `.env.local` sudah ada di `.gitignore` dan tidak pernah di-commit. Jangan memasukkan secrets ke dalam kode atau dokumentasi.

---

## 4. Deploy ke Vercel

### 4.1 Connect Repository

1. Login ke [Vercel Dashboard](https://vercel.com/dashboard).
2. Klik **Add New → Project**.
3. Import repository GitHub/GitLab Anda.
4. Vercel akan mendeteksi framework **Next.js** secara otomatis.

### 4.2 Konfigurasi Build

Vercel mendeteksi Next.js secara otomatis, tetapi verifikasi pengaturan berikut:

| Setting | Nilai | Keterangan |
|---------|-------|------------|
| **Framework Preset** | Next.js | Auto-detected. |
| **Build Command** | `next build` _(default)_ | Atau `pnpm build`. Tidak perlu override. |
| **Output Directory** | `.next` _(default)_ | Auto-detected untuk Next.js. |
| **Install Command** | `pnpm install --frozen-lockfile` | Vercel auto-detect `pnpm` dari `pnpm-lock.yaml`. Pastikan lockfile di-commit. |
| **Node.js Version** | 20.x | Set di **Settings → General → Node.js Version**. |

> **Build Dependencies**: `pnpm-workspace.yaml` mengonfigurasi `allowBuilds` untuk `core-js`, `esbuild`, `sharp`, `supabase`, dll. Vercel menghormati ini. Pastikan file ini di-commit.

### 4.3 Set Environment Variables

1. Buka **Settings → Environment Variables**.
2. Tambahkan semua variable dari [Section 3](#3-environment-variables).
3. Set scope dengan benar:
   - `NEXT_PUBLIC_*` → **Production, Preview, Development** (exposed ke browser).
   - `SUPABASE_SERVICE_ROLE_KEY` → **Production, Preview** saja (jangan Development/public).
   - `IWKBU_SYNC_CRON_SECRET` → **Production**.
   - Sentry DSN → sesuai kebutuhan.

### 4.4 Deploy

1. Klik **Deploy**.
2. Tunggu build selesai. Build akan menjalankan:
   ```
   pnpm install --frozen-lockfile → next build
   ```
3. Setelah selesai, Vercel memberikan URL deployment (mis. `terminal-iwkbu.vercel.app`).

### 4.5 Custom Domain

1. Buka **Settings → Domains**.
2. Tambahkan domain custom (mis. `iwkbu.terminal.go.id`).
3. Konfigurasi DNS sesuai instruksi Vercel (CNAME atau A record).
4. Setelah DNS propagate, Vercel otomatis provisi SSL certificate (Let's Encrypt).
5. Update **Site URL** dan **Redirect URLs** di Supabase Auth (Section 2.5) untuk mencakup domain custom.

### 4.6 Verifikasi Build Sukses

Build harus menghasilkan output tanpa error. Untuk verifikasi lokal sebelum push:

```bash
pnpm typecheck     # tsc --noEmit → 0 errors
pnpm lint          # ESLint → 0 errors (warnings any type diperbolehkan)
pnpm build         # next build → sukses
pnpm run size      # build + size-limit (chunk ≤ 900 KB)
```

---

## 5. Post-Deploy

### 5.1 Health Check

Setelah deployment pertama, verifikasi:

1. **Halaman login** dapat diakses:
   ```bash
   curl -s -o /dev/null -w "%{http_code}" https://<domain-anda>/login
   # Harus: 200
   ```

2. **API route publik** merespons:
   ```bash
   curl -s -o /dev/null -w "%{http_code}" https://<domain-anda>/api/auth/login
   # GET tidak didukung → 405 (Method Not Allowed) = normal
   ```

3. **Protected API route** menolak anonymous request:
   ```bash
   curl -s -o /dev/null -w "%{http_code}" https://<domain-anda>/api/staf-iw/users
   # Harus: 401 (Unauthorized)
   ```

4. **Security headers** aktif:
   ```bash
   curl -sI https://<domain-anda>/login | grep -iE 'strict-transport|x-frame|x-content|content-security|referrer-policy|permissions-policy'
   ```
   Harus mengembalikan:
   - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
   - `X-Frame-Options: DENY`
   - `X-Content-Type-Options: nosniff`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Permissions-Policy: geolocation=(), microphone=()`
   - `Content-Security-Policy: default-src 'self'; ...`

5. **Login smoke test**: Login dengan user staf-iw, verifikasi redirect ke `/staf-iw`.

### 5.2 Integration Test

Jalankan integration smoke test terhadap deployment production:

```bash
BASE_URL=https://<domain-anda> pnpm test:integration
```

Untuk smoke test lokal terhadap production build:

```bash
pnpm build
pnpm exec next start -H 127.0.0.1 -p 3000 &
BASE_URL=http://127.0.0.1:3000 pnpm test:integration
```

Test ini memverifikasi bahwa semua protected API route menolak request anonymous dengan **401**.

### 5.3 Konfigurasi Cron Jobs

Aplikasi memiliki dua cron endpoint yang menjalankan sinkronisasi IWKBU:

| Endpoint | Fungsi |
|----------|--------|
| `POST /api/cron/iwkbu-fetch` | Fetch data compliance IWKBU dari API eksternal → upsert ke `iwkbu_source_records` → jalankan sync |
| `POST /api/cron/iwkbu-sync` | Jalankan sync saja (tanpa fetch data baru) |

Kedua endpoint memerlukan header `Authorization: Bearer <IWKBU_SYNC_CRON_SECRET>`.

#### Opsi A — Vercel Cron (rekomendasi untuk Vercel deployment)

Buat file `vercel.json` di root project:

```json
{
  "crons": [
    {
      "path": "/api/cron/iwkbu-fetch",
      "schedule": "0 6 * * *"
    }
  ]
}
```

> **Schedule**: Contoh `0 6 * * *` = setiap hari pukul 06:00 UTC. Sesuaikan timezone kebutuhan (WIB = UTC+7).

Vercel Cron otomatis mengirim request ke endpoint dengan path yang ditentukan. Namun, Vercel Cron **tidak** mengirim Bearer token secara default, jadi Anda perlu menyesuaikan:

- **Solusi 1**: Gunakan [Vercel Cron dengan custom header](https://vercel.com/docs/cron-jobs) jika tersedia, atau
- **Solusi 2 (rekomendasi)**: Gunakan external cron service (lihat Opsi B).

> **Catatan**: Vercel Cron pada plan Hobby dibatasi maksimal 2 cron jobs dengan frekuensi minimum 1x/hari. Plan Pro mendukung lebih banyak dan lebih sering.

#### Opsi B — External Cron Service (rekomendasi untuk fleksibilitas)

Gunakan layanan seperti **cron-job.org**, **EasyCron**, **GitHub Actions**, atau **Upstash QStash**:

**Via curl / cron-job.org:**

```
POST https://<domain-anda>/api/cron/iwkbu-fetch
Headers:
  Authorization: Bearer <IWKBU_SYNC_CRON_SECRET>
```

**Via GitHub Actions** (`.github/workflows/iwkbu-sync.yml`):

```yaml
name: IWKBU Sync
on:
  schedule:
    - cron: '0 6 * * *'  # 06:00 UTC setiap hari
  workflow_dispatch:
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger IWKBU Fetch
        run: |
          curl -sSf -X POST \
            -H "Authorization: Bearer ${{ secrets.IWKBU_SYNC_CRON_SECRET }}" \
            https://<domain-anda>/api/cron/iwkbu-fetch
```

> Set `IWKBU_SYNC_CRON_SECRET` di **GitHub → Settings → Secrets and variables → Actions**.

#### Verifikasi Cron

```bash
curl -X POST \
  -H "Authorization: Bearer <secret>" \
  https://<domain-anda>/api/cron/iwkbu-fetch
# Harus: 200 + JSON dengan field "fetched", "synced_at"
```

### 5.4 Setup Sentry (Opsional)

Sentry no-op tanpa DSN, jama opsional. Jika ingin error tracking:

1. Buat project di [sentry.io](https://sentry.io).
2. Dapatkan **DSN** untuk platform **Node.js** (server) dan **React** (client).
3. Set environment variables:
   - `SENTRY_DSN` — DSN server-side.
   - `NEXT_PUBLIC_SENTRY_DSN` — DSN client-side.
   - `SENTRY_TRACES_SAMPLE_RATE` — opsional (default `0.1`).
   - `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` — opsional (default `0.05`).
4. Redeploy. Sentry diinisialisasi di:
   - `src/lib/sentry.server.ts` — server-side (Route Handlers, Server Components).
   - `src/lib/sentry.client.tsx` — client-side (browser errors, performance).
5. Verifikasi di Sentry Dashboard — trigger error test dan pastikan muncul.

### 5.5 Ganti Password Bootstrap

Setelah deploy pertama:

1. Login sebagai `staf.iw@terminal.go.id` dengan password `StafIw@2026!`.
2. Buka halaman **Profil** → ubah password.
3. Verifikasi bahwa password lama tidak dapat digunakan lagi.

---

## 6. Backup Strategy

### 6.1 Supabase Built-in Backups

| Plan | Fitur Backup | Retention |
|------|--------------|-----------|
| **Free** | Tidak ada automated backup | — |
| **Pro** | Daily automated backup + Point-in-Time Recovery (PITR) | 7 hari daily + 2 minggu PITR |
| **Team** | Daily + PITR + log-based recovery | 14 hari daily + 1 bulan PITR |
| **Enterprise** | Custom | Custom |

> **Rekomendasi Production**: Minimal plan **Pro** untuk mendapatkan daily backup + PITR.

**Akses backup**:
- **Dashboard → Database → Backups** untuk melihat dan restore dari snapshot.
- PITR memungkinkan restore ke titik waktu tertentu (granularitas detik).

### 6.2 Manual Backup via `pg_dump`

Untuk backup on-demand atau offsite:

```bash
# Full dump (schema + data)
pg_dump "postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres" \
  --clean --if-exists --schema=public \
  -F c -f backup_$(date +%Y%m%d_%H%M%S).dump

# Restore (ke database kosong)
pg_restore --clean --if-exists -d "<TARGET_DB_URL>" backup_YYYYMMDD_HHMMSS.dump
```

### 6.3 Automated Backup via GitHub Actions

Aplikasi sudah dapat memanfaatkan workflow backup yang menggunakan `SUPABASE_DB_URL`. Contoh konfigurasi:

```yaml
# .github/workflows/db-backup.yml
name: DB Backup
on:
  schedule:
    - cron: '0 2 * * *'  # 02:00 UTC setiap hari
  workflow_dispatch:
jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install PostgreSQL client
        run: sudo apt-get update && sudo apt-get install -y postgresql-client
      - name: Dump database
        env:
          SUPABASE_DB_URL: ${{ secrets.SUPABASE_DB_URL }}
        run: |
          pg_dump "$SUPABASE_DB_URL" --clean --if-exists --schema=public \
            -F c -f backup_$(date +%Y%m%d).dump
      - name: Upload backup artifact
        uses: actions/upload-artifact@v4
        with:
          name: db-backup-${{ github.run_id }}
          path: backup_*.dump
          retention-days: 30
```

> Set `SUPABASE_DB_URL` di **GitHub → Settings → Secrets and variables → Actions**.

### 6.4 Storage Backup

File di Supabase Storage (`armada-dokumen`, `finding-evidence` buckets) **tidak** termasuk dalam backup database standar. Untuk backup storage:

```bash
# Download semua file dari bucket (memerlukan service role key)
# Gunakan Supabase CLI atau script custom dengan Storage API
pnpm exec supabase storage download --bucket armada-dokumen --recursive ./backup-storage/
```

---

## 7. Rollback

### 7.1 Rollback Deployment Vercel (Aplikasi)

Vercel menyimpan riwayat setiap deployment. Untuk rollback ke versi sebelumnya:

**Via Vercel Dashboard:**

1. Buka **Dashboard → Project → Deployments**.
2. Cari deployment sebelumnya yang stabil.
3. Klik menu **⋯** → **Promote to Production**.
4. Konfirmasi. Vercel akan mengarahkan traffic production ke deployment tersebut secara instan (tidak perlu rebuild).

**Via Vercel CLI:**

```bash
# List deployments
pnpm dlx vercel ls

# Rollback ke deployment tertentu
pnpm dlx vercel promote <DEPLOYMENT_URL_OR_ID>
```

> Rollback Vercel bersifat **instant** (atomic switch). Tidak ada downtime.

### 7.2 Rollback Database (Supabase)

Jika migration terakhir menyebabkan masalah:

#### Via PITR (Point-in-Time Recovery) — Plan Pro+

1. **Dashboard → Database → Backups → Point in Time Recovery**.
2. Pilih timestamp sebelum migration bermasalah dijalankan.
3. Klik **Restore**. Supabase akan membuat project restore baru (tidak overwrite project existing).
4. Arahkan aplikasi ke project restore baru dengan meng-update environment variables Supabase.

> PITR membuat project baru — tidak menggantikan project existing. Aman untuk verifikasi dulu.

#### Via Backup Snapshot

1. **Dashboard → Database → Backups**.
2. Pilih snapshot → **Restore**.

#### Rollback Migration Manual (Resiko Tinggi)

Jika tidak ada backup, rollback migration secara manual memerlukan SQL terbalik (down migration). Buat file migration baru (mis. `0015_rollback_xxx.sql`) dengan operasi kebalikan. **Selalu uji di staging terlebih dahulu**.

> **Penting**: Jangan pernah menjalankan `DROP TABLE` atau `ALTER TABLE` tanpa backup yang valid.

### 7.3 Rollback Checklist

Saat melakukan rollback, pastikan konsistensi antara aplikasi dan database:

- [ ] **Versi aplikasi** di-rollback ke deployment yang kompatibel dengan **skema database** yang aktif.
- [ ] **Environment variables** diperiksa (mis. jika rollback ke versi yang menggunakan anon key berbeda).
- [ ] **Cron jobs** diverifikasi masih berjalan setelah rollback.
- [ ] **Smoke test** dijalankan setelah rollback (login, navigasi role, upload dokumen).
- [ ] **Tim** diberitahu tentang rollback dan alasannya.

---

## Lampiran — Checklist Deployment Cepat

```
[ ] 1. Supabase project dibuat (region sesuai)
[ ] 2. 14 migration dijalankan (0001–0014) secara berurutan
[ ] 3. RLS diverifikasi aktif (FORCE RLS di semua tabel sensitif)
[ ] 4. Storage buckets ada (armada-dokumen, finding-evidence)
[ ] 5. Auth: Email enabled, Site URL & Redirect URLs di-set
[ ] 6. Auth: Leaked password protection diaktifkan
[ ] 7. Bootstrap staf-iw user dapat login
[ ] 8. Env vars diset di Vercel (NEXT_PUBLIC_SUPABASE_URL, PUBLISHABLE_KEY/ANON_KEY, SERVICE_ROLE_KEY)
[ ] 9. IWKBU_SYNC_CRON_SECRET di-generate dan diset
[ ] 10. Vercel project ter-connect, build sukses
[ ] 11. Domain custom dikonfigurasi (opsional)
[ ] 12. Security headers diverifikasi (curl -sI)
[ ] 13. Protected API route menolak anonymous (401)
[ ] 14. Cron job dikonfigurasi (Vercel Cron / external)
[ ] 15. Sentry DSN diset (opsional)
[ ] 16. Password bootstrap staf-iw diganti
[ ] 17. Backup strategy dikonfigurasi (Supabase Pro / GitHub Actions)
```
