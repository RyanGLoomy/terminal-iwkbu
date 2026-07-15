# Security Documentation

Dokumentasi langkah-langkah keamanan yang diterapkan pada Sistem Terminal IWKBU, dipetakan ke OWASP Top 10.

## OWASP Top 10 Compliance

| # | OWASP Category | Status | Implementasi |
|---|----------------|--------|-------------|
| A01 | Broken Access Control | Terverifikasi | Role-based routing di middleware + `ensureRoleOrThrow()` di setiap API route + RLS |
| A02 | Cryptographic Failures | Terverifikasi | bcrypt untuk PIN hash, Supabase Auth untuk password, HTTPS enforced via HSTS |
| A03 | Injection (SQL/XSS) | Terverifikasi | Supabase client (parameterized queries), React auto-escaping, no `dangerouslySetInnerHTML` |
| A04 | Insecure Design | Terverifikasi | Defense in depth: auth → authz → validation → RLS |
| A05 | Security Misconfiguration | Terverifikasi | CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy |
| A06 | Vulnerable Components | Terverifikasi | `pnpm audit` = 0 vulnerabilities |
| A07 | Auth Failures | Terverifikasi | Rate limiting (DB-backed), account lockout, generic error messages |
| A08 | Data Integrity Failures | Terverifikasi | Input validation server-side, no deserialization dari user input |
| A09 | Logging Failures | Terverifikasi | Audit trail via `logActivity()` TS helper untuk semua aksi penting |
| A10 | SSRF | Terverifikasi | Tidak ada endpoint yang menerima URL dari user untuk di-fetch |

## Security Headers

Diterapkan di `src/proxy.ts` untuk semua response:

| Header | Value | Tujuan |
|--------|-------|--------|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Force HTTPS |
| `X-Frame-Options` | `DENY` | Clickjacking prevention |
| `X-Content-Type-Options` | `nosniff` | MIME sniffing prevention |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Privacy |
| `Permissions-Policy` | `geolocation=(), microphone=()` | Disable unnecessary APIs |
| `Content-Security-Policy` | `default-src 'self'; ...` | XSS prevention |

### CSP Detail

```
default-src 'self';
base-uri 'self';
frame-ancestors 'none';
object-src 'none';
img-src 'self' data: https:;
style-src 'self' 'unsafe-inline';
script-src 'self' 'unsafe-inline' [unsafe-eval in dev only];
connect-src 'self' https: wss: [ws: in dev only];
font-src 'self' data:;
```

## Authentication & Authorization

### Auth Flow

1. User login via `POST /api/auth/login` → Supabase Auth (GoTrue)
2. Session disimpan di httpOnly cookie (Supabase managed)
3. Middleware (`src/proxy.ts`) mengecek session untuk page routes
4. API routes skip middleware → setiap route self-guard via `getAuthenticatedActor()`
5. Role check via `ensureRoleOrThrow(role)` atau `resolveRoleFromUserAndProfile()`

### Role System

| Role | DB Name | ID | Akses |
|------|---------|-----|-------|
| PO | `po` | 1 | `/po/*` |
| Admin Terminal | `admin-terminal` | 17 | `/admin-terminal/*` |
| Loket | `loket` | 18 | `/loket/*` (butuh PIN session) |
| Staf IW | `staf-iw` | 23 | `/staf-iw/*` |

Normalization: `normalizeRoleName()` di `src/lib/supabase/role-utils.ts` menangani hyphen/underscore conversion.

## Rate Limiting

DB-backed rate limiting via `rate_limit_buckets` table + atomic RPC functions.

### Auth Endpoints dengan Rate Limiting

| Endpoint | Limit | Key |
|----------|-------|-----|
| `POST /api/auth/login` | 5 attempts / 15 min | IP address |
| `POST /api/auth/change-password` | 5 attempts / 15 min | User ID |
| `POST /api/auth/verify-pin` | 5 attempts / 15 min | User ID |
| `POST /api/auth/change-pin` | 5 attempts / 15 min | User ID |
| `POST /api/auth/forgot-password` | 5 attempts / 15 min | IP address |

### RPC Functions

- `check_rate_limit(p_key)` — cek apakah key masih dalam lockout period
- `record_rate_limit_attempt(p_key, p_max_attempts, p_lockout_seconds)` — catat attempt, return lockout jika exceed
- `clear_rate_limit(p_key)` — reset counter setelah success

## Row Level Security (RLS)

Semua tabel sensitif memiliki `FORCE ROW LEVEL SECURITY`. Detail policy di [DATABASE.md](DATABASE.md#rls-policies).

Key principles:
- PO hanya bisa melihat/modifikasi data miliknya (`po_id = auth.uid()`)
- Loket scoped ke terminal-nya (`terminal_id` via profile)
- Staf IW akses global untuk pengawasan
- Admin Terminal scoped ke terminal-nya

## IDOR Protection

Setiap API route dengan `[id]` parameter memverifikasi ownership:
- `po/armada/[id]` — cek `po_id === actor.user.id`
- `po/findings/[id]/*` — cek `finding.po_id === actor.user.id`
- `findings/evidence` — cek finding ownership atau role staf-iw/admin-terminal
- `sesi/close` — cek `sesi.user_id === actor.user.id`
- `transaksi/*` — cek via sesi ownership

## Security Fixes Applied (FASE C)

| ID | Severity | Fix |
|----|----------|-----|
| C1 | CRITICAL | Evidence IDOR — ownership check before signed URL |
| C2 | HIGH | Open redirect — validate redirect param is internal path |
| C3 | HIGH | verify-pin — added `ensureRoleOrThrow("loket")` |
| C4 | HIGH | change-pin — added `ensureRoleOrThrow("loket")` |
| C5 | MEDIUM | forgot-password — IP-based rate limiting |
| C6 | MEDIUM | periode-rekonsiliasi GET — role check staf-iw/admin-terminal |
| C7 | MEDIUM | Atomic role assignment — insert before delete |
| C8 | MEDIUM | Timing-safe cron secret — `crypto.timingSafeEqual()` |
| C9 | LOW | Login error sanitization — no Supabase URL/DB error leak |
| C10 | — | `pnpm audit` = 0 vulns, no hardcoded secrets, no `.env` tracked |
| C11 | — | Supabase advisors — all warnings intentional |

## Input Validation

- File upload: MIME type + file size validation server-side (5MB max, PDF/JPEG/PNG/WebP)
- API input: manual validation di setiap route (trim, required check, enum check)
- SQL injection: Supabase client menggunakan parameterized queries
- XSS: React auto-escaping, tidak ada `dangerouslySetInnerHTML` tanpa sanitization
- Path traversal: `filePath.includes("..")` check di evidence endpoint

## Audit Trail

Semua aksi penting dicatat via `logActivity()` TS helper (`src/lib/supabase/queries/operasional.server.ts`):

```sql
SELECT log_activity(
  p_aksi TEXT,         -- nilai dari enum AksiLog (27 values)
  p_deskripsi TEXT,    -- deskripsi human-readable
  p_metadata JSONB     -- detail kontekstual
);
```

Tabel `audit_trail` dengan RLS: staf-iw bisa lihat semua, role lain tidak bisa akses.

## Cron Security

Cron endpoints (`/api/cron/iwkbu-sync`, `/api/cron/iwkbu-fetch`) menggunakan Bearer token:
- Env var `IWKBU_SYNC_CRON_SECRET` atau fallback `CRON_SECRET`
- Comparison via `crypto.timingSafeEqual()` (timing-safe)
- Reject jika secret tidak diset atau tidak match

## Storage Security

| Bucket | Public | Size Limit | MIME Types | Access |
|--------|--------|-----------|------------|--------|
| `armada-dokumen` | No | 5 MB | PDF, JPEG, PNG, WebP | PO upload own, staf-iw view all |
| `finding-evidence` | No | 5 MB | PDF, JPEG, PNG, WebP | PO/staf-iw upload, signed URL download |

Download via signed URL (60 detik expiry) setelah ownership/role verification.

## Pending Manual Actions

- [ ] **0.9**: Enable "Leaked Password Protection" di Supabase Auth dashboard → Settings → Passwords. Mencegah penggunaan password yang sudah ter-compromise (HaveIBeenPwned).

## FASE D: Database Review Round 1-5 (0056-0065)

### Migrasi Keamanan (10 file)

| Migration | Deskripsi |
|-----------|-----------|
| 0056 | Draft-only delete guard pada rekonsiliasi_periode + RLS narrowing ke staf-iw |
| 0057 | FK cascade fix (clarifications), EXECUTE grants, policy roles, search_path, drop dead log_activity RPC |
| 0058 | Revoke residual direct anon EXECUTE pada 6 dashboard RPCs |
| 0059 | CHECK pada finding_clarifications, get_userrole enumeration oracle, FORCE RLS, redundant indexes |
| 0060 | Loket petugas_terminal pin-write contract (column-narrow policy + guard trigger) |
| 0061 | Atomic rate-limit attempt + 3 covering indexes |
| 0062 | Wrap auth.uid() in loket policy (initplan pattern) |
| 0063 | Restore EXECUTE grant get_activity_logs to authenticated |
| 0064 | Fix get_activity_logs return type (varchar/text mismatch) |
| 0065 | Add findings to Supabase Realtime publication |

### App Security Fixes

- **APP-01**: register-po guard (reject if caller already has role or po row exists)
- **APP-02**: Evidence link URL scheme validation (http/https only, blok javascript:)
- **APP-03**: Filename sanitization sebelum storage key interpolation
- **APP-04**: Magic-number file validation (PDF/JPEG/PNG/WebP) — bukan client file.type
- **APP-05**: CSP img-src tightened dari wildcard https: ke self + Supabase origin
- **APP-06**: safeCompare hash-then-compare (SHA-256 digest, no length leak)
- **Q-01**: mime_type column consistency (detectedMime, bukan file.type)
- **Q-02**: register-po ordering (po insert first, role upsert after)
- **DRY**: PIN config dedup, clarification form parsing, unit tests (25→36)

### Hasil Review

- 6 rounds database review → 10 migrations (0056-0065)
- 3 rounds application security review → register-po guard, XSS/upload/CSP/safeCompare
- 1 round code quality review → DRY, consistency, tests
- 110/110 E2E tests green
- Black-box testing: 14/14 cross-role RBAC blocks, 5/5 security headers
