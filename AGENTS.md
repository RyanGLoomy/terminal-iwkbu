# AGENTS.md

## Sources Of Truth

- `README.md` is custom-written but may lag; trust `package.json`, CI config, and `src/` over prose.
- Single Next.js app, not a monorepo (`pnpm-workspace.yaml` only sets build settings).
- Use `pnpm` only. CI uses Node 20 and pnpm 10.29.1.

## Commands

```bash
pnpm dev                    # Next dev on 0.0.0.0:3000
pnpm typecheck              # tsc --noEmit (run before every commit)
pnpm lint                   # ESLint flat config
pnpm build                  # Production build
pnpm run size               # build + size-limit (1.1 MB budget)
pnpm audit                  # pnpm audit --audit-level=moderate
pnpm test:integration       # Auth smoke (requires running prod server)
pnpm test:e2e               # Build + create test users + Playwright
pnpm test:e2e:dev           # Same but skip build (use running dev server)
```

- CI order: `install --frozen-lockfile` → `audit` → `size` → `lint` → `typecheck` → `build` → `test:integration`.
- `pnpm lint` is `continue-on-error` in CI; still fix lint locally.
- Integration smoke needs a prod server: `pnpm build && pnpm start`, then `BASE_URL=http://127.0.0.1:3000 pnpm test:integration`.
- E2E tests use `request.fetch()` (API-level), not browser navigation. Setup script (`scripts/setup-e2e.mjs`) creates test users in Supabase and writes credentials to `/tmp/opencode/iwkbu-test-credentials.json`. The script reads `.env.local` automatically.
- No unit test runner — only integration smoke + Playwright E2E.

## App Wiring

- Stack: Next.js 16 App Router, React 19, TypeScript strict, Tailwind CSS v4 via `@tailwindcss/postcss`, shadcn/ui `new-york`, Supabase Auth/Postgres.
- Route middleware is `src/proxy.ts` (not `src/middleware.ts`). Exports `proxy()` + `config`. Handles page-level auth/roles/security headers. **Returns early for `/api` paths** — every API route must self-guard with `getAuthenticatedActor()` (`src/lib/auth/server-actor.ts`) and `ensureRoleOrThrow()` (`src/lib/auth/requireRole.server.ts`).
- Roles (`src/config/roles.ts`): `po`, `loket`, `admin-terminal`, `staf-iw`. App names use hyphens; DB/RPC may use underscores. Normalize via `resolveRoleFromUserAndProfile()` / `normalizeRoleName()` in `src/lib/supabase/role-utils.ts`.
- Supabase clients: `server.ts` (Server Components/handlers), `client.ts` (browser singleton), `admin.ts` (service-role). Query modules in `src/lib/supabase/queries/` split by `.server.ts` vs `.client.ts` — keep that boundary.
- IWKBU sync: `src/lib/iwkbu/adaptor.ts` switches between mock and real API via `IWKBU_API_URL` + `IWKBU_API_KEY`. Cron endpoints at `src/app/api/cron/iwkbu-fetch/route.ts` (fetch + sync) and `iwkbu-sync/route.ts` (sync only). Both use timing-safe Bearer comparison (`src/lib/auth/safe-compare.ts`).
- Migrations: `supabase/migrations/` (20 files). `0000_01`–`0000_06` are captured from live DB to reconcile drift; `0001`–`0014` are canonical local migrations. Plus `supabase/seed.sql`.

## PostgREST Relationship Quirk

- Supabase JS client `.select("*, po:po_id(...)")` returns a **single object** for many-to-one FK joins, not an array. Access fields directly: `row.po?.status_verifikasi`, never `row.po?.[0]`. This affects all files using `po:po_id(...)` joins (iwkbu-sync, verification, findings, rekonsiliasi, operasional).

## Environment

- Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`), `SUPABASE_SERVICE_ROLE_KEY`.
- IWKBU sync: `IWKBU_API_URL`, `IWKBU_API_KEY`, `IWKBU_SYNC_CRON_SECRET` (or `CRON_SECRET`).
- Sentry optional (no-ops without DSN): `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`.
- `SUPABASE_DB_URL` used only by GitHub backup workflow, not app runtime.
- `.env.local` is gitignored. `.env.example` is committed as reference. `opencode.json` contains MCP tokens — treat as sensitive.

## Conventions

- UI copy and code comments in Bahasa Indonesia unless matching surrounding English.
- `@/` for cross-directory imports; sibling relative imports for local modules.
- API responses use JSON. Match the local route's existing error key (`error` or `message`).
- No shared Zod API schemas; validation is manual in route handlers. Zod only in form components via `@hookform/resolvers`.
- Open redirect protection: callback routes must use `getSafeRedirect()` pattern — validate `new URL(raw, origin).origin === origin`, reject `//` and `\`.

## UI Gotchas

- Brand tokens in `globals.css` (`brand-navy`, `brand-sky`, `brand-gold`, `brand-green`, `brand-ink`, `brand-panel`). Prefer these over hardcoded colors. `brand-gold` = JR gold accent for CTAs/active states.
- `cn()` = `clsx` + `tailwind-merge` — standard shadcn override semantics work.
- Font: **Plus Jakarta Sans** (400–800 via `next/font/google`). Mono: **Geist Mono**.
- Dark mode: class-based `.dark` + `<html suppressHydrationWarning>`.
- React Compiler enabled in `next.config.ts` — avoid `useMemo`/`useCallback` unless measured.
- `xlsx`, `jspdf`, `jspdf-autotable` via dynamic imports only (keep out of static imports).
- `recharts` via `next/dynamic` with loading skeleton in 3 dashboard pages (keeps bundle under 1.1 MB).
- Shared components in `src/components/shared/`: `StatusBadge`, `EmptyState`, `LoadingState`, `ConfirmDialog`.
- shadcn components in `src/components/ui/`: includes `dropdown-menu`, `select`, `tooltip`, `skeleton`, `breadcrumb`, `separator`, `avatar`, `sheet`, `alert-dialog` beyond base set.
- Dashboard shell: collapsible sidebar + topbar breadcrumbs + mobile bottom nav (`src/components/dashboard/dashboard-shell.tsx`).

## Security Checklist For New API Routes

1. Call `getAuthenticatedActor()` — reject if null (401).
2. Call `ensureRoleOrThrow("role")` with allowed roles (403).
3. Validate input manually (no Zod for API routes).
4. Sanitize error messages — never leak Supabase URLs or DB internals.
5. Use `rate-limiter.ts` / `pin-rate-limiter.ts` for auth-adjacent endpoints.
6. Log via `log_activity` RPC for audit trail.
