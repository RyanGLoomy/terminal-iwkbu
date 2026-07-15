# Sistem Terminal IWKBU

Sistem pengawasan dan rekonsiliasi Integrasi Wilayah Kota Bulan (IWKBU) untuk terminal. Dibangun dengan Next.js 16, React 19, Supabase, dan TypeScript.

## Fitur Utama

- **4 Role Pengguna**: Perusahaan Otobus (PO), Petugas Loket, Admin Terminal, Staf IW
- **Manajemen Armada**: CRUD armada + upload dokumen (STCK, KIR, Asuransi)
- **Pencatatan Operasional**: Sesi kerja, pencatatan kendaraan masuk/keluar dengan PIN verification
- **Rekonsiliasi IWKBU**: Perbandingan data source IWKBU dengan data terminal, detail per-armada
- **Sinkronisasi Otomatis**: Cron endpoint untuk fetch dan sync data IWKBU (mock/real mode)
- **Temuan & Klarifikasi**: Workflow temuan dengan severity, klarifikasi + upload bukti, tindak lanjut
- **Manajemen Role**: CRUD role pengguna oleh Staf IW
- **Notifikasi Realtime**: Badge notifikasi live via Supabase Realtime
- **Audit Trail**: Logging semua aksi penting
- **Dashboard Charts**: Visualisasi distribusi PO dan armada

## Tech Stack

| Layer      | Teknologi                                               |
| ---------- | ------------------------------------------------------- |
| Frontend   | Next.js 16 (App Router), React 19, TypeScript (strict)  |
| Styling    | Tailwind CSS v4, DaisyUI v5 (tema jr/jr-dark)           |
| Backend    | Next.js Route Handlers (65 API routes)                  |
| Database   | Supabase Postgres 17 (21 tabel, RLS, CHECK constraints) |
| Auth       | Supabase Auth (GoTrue) + role-based access control      |
| Storage    | Supabase Storage (armada-dokumen, finding-evidence)     |
| Realtime   | Supabase Realtime (notifications)                       |
| Charts     | Recharts                                                |
| Monitoring | Sentry (opsional, no-op tanpa DSN)                      |

## Persyaratan

- Node.js 20+
- pnpm 10+
- Akun Supabase (URL + anon/publishable key + service role key)

## Setup Lokal

```bash
# Clone repo
git clone <repo-url>
cd terminal-iwkbu

# Install dependencies
pnpm install

# Buat .env.local
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
EOF

# Jalankan dev server
pnpm dev
```

Buka [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable                               | Wajib | Deskripsi                                                  |
| -------------------------------------- | ----- | ---------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Ya    | URL project Supabase                                       |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`        | Ya\*  | Anon key (legacy)                                          |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Ya\*  | Publishable key (modern)                                   |
| `SUPABASE_SERVICE_ROLE_KEY`            | Ya    | Service role key (server-only, jangan prefix NEXT*PUBLIC*) |
| `SUPABASE_URL`                         | Tidak | Backup URL untuk admin client                              |
| `IWKBU_SYNC_CRON_SECRET`               | Tidak | Bearer token untuk cron endpoints                          |
| `CRON_SECRET`                          | Tidak | Fallback cron secret                                       |
| `IWKBU_API_URL`                        | Tidak | URL API IWKBU real (kosong = mock mode)                    |
| `IWKBU_API_KEY`                        | Tidak | API key IWKBU real                                         |
| `SENTRY_DSN`                           | Tidak | DSN Sentry server-side                                     |
| `NEXT_PUBLIC_SENTRY_DSN`               | Tidak | DSN Sentry client-side                                     |

\* Salah satu dari anon/publishable key cukup, tetapi sebaiknya set keduanya.

## Scripts

```bash
pnpm dev                    # Dev server di 0.0.0.0:3000
pnpm typecheck              # TypeScript strict check (tsc --noEmit)
pnpm lint                   # ESLint (flat config, Next core-web-vitals + TS)
pnpm build                  # Production build
pnpm run size               # Build + size-limit check (1.1 MB chunks)
pnpm audit                  # Dependency audit (moderate level)
pnpm test:integration       # Auth smoke test (butuh prod server)
pnpm test:e2e               # Build + setup data + Playwright E2E
pnpm test:e2e:dev           # Setup data + Playwright E2E (tanpa build)
```

## Struktur Folder

```
src/
├── app/                      # Next.js App Router
│   ├── (dashboard)/          # Role-scoped pages (po/, loket/, admin-terminal/, staf-iw/)
│   ├── api/                  # 65 API route handlers
│   ├── globals.css           # Tailwind v4 + DaisyUI v5 themes (jr/jr-dark)
│   └── layout.tsx            # Root layout (dark mode, suppressHydrationWarning)
├── components/               # React components
│   ├── ui/                   # DaisyUI-backed thin wrappers
│   ├── dashboard/            # Dashboard cards, charts, sidebar, notifications
│   ├── operasional/          # Findings, rekonsiliasi, pencatatan, etc.
│   └── verification/         # Armada table, PO manager, dokumen dialog
├── config/                   # roles.ts, design-tokens.ts, typography.tsx
├── lib/
│   ├── auth/                 # server-actor, requireRole, rate-limiter, safe-compare
│   ├── iwkbu/                # IWKBU adaptor (mock/real)
│   ├── supabase/             # server.ts, client.ts, admin.ts, queries/
│   └── monitoring.ts         # Sentry wrapper
├── proxy.ts                  # Middleware (auth, roles, security headers)
e2e/                          # Playwright E2E tests
supabase/migrations/          # 66 SQL migrations (0000-0065)
docs/                         # Dokumentasi teknis
```

## Roles & Access Control

| Role           | Akses                                                                                                                          | Route Prefix      |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------- |
| PO             | Dashboard armada, rekonsiliasi, temuan & klarifikasi                                                                           | `/po`             |
| Loket          | Dashboard, pencatatan, riwayat (butuh PIN session)                                                                             | `/loket`          |
| Admin Terminal | Dashboard, petugas/loket, rekap, sesi, laporan, master-data (read-only)                                                        | `/admin-terminal` |
| Staf IW        | Dashboard, akun (admin-terminal/staf-iw), verifikasi PO, master data, rekonsiliasi, findings, IWKBU sync, laporan, audit trail | `/staf-iw`        |

Role didefinisikan di `src/config/roles.ts`. Middleware `src/proxy.ts` menangani auth dan role-based routing untuk pages. Setiap API route melakukan auth + role check sendiri via `getAuthenticatedActor()` + `ensureRoleOrThrow()`.

## Database

66 migration files di `supabase/migrations/`.

## Dokumentasi

- [API Reference](docs/API.md) — Semua 65 endpoint
- [Deployment Guide](docs/DEPLOYMENT.md) — Setup production
- [Database Schema](docs/DATABASE.md) — 21 tabel + RLS
- [Security](docs/SECURITY.md) — OWASP Top 10 hardening checklist

## E2E Testing

```bash
# Setup test accounts + seed data
pnpm test:e2e:setup

# Run all tests (requires running server)
BASE_URL=http://127.0.0.1:3000 pnpm test:e2e:dev
```

Test coverage: 6 spec files (~70 test cases) — auth, security (role isolation, IDOR, headers), PO, Loket, Admin Terminal, Staf IW.
