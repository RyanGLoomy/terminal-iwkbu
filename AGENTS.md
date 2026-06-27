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

- CI order (`.github/workflows/ci.yml`): `install --frozen-lockfile` → `audit` → `size` → `lint` → `typecheck` → `build` → start prod server → `test:integration` → **Lighthouse perf check (threshold ≥ 0.6)**. A perf regression fails CI even when the build is green.
- `pnpm audit` **hard-fails** CI (`continue-on-error: false`); `pnpm lint` is `continue-on-error: true` — still fix lint locally.
- **E2E (`test:e2e*`) is NOT run in CI** — CI runs integration smoke only. E2E is local/manual. CI pins Node 20 + pnpm 10.29.1; local versions may differ, so trust the lockfile.
- Integration smoke needs a prod server: `pnpm build && pnpm start`, then `BASE_URL=http://127.0.0.1:3000 pnpm test:integration`.
- E2E tests use `request.fetch()` (API-level), not browser navigation (~84 cases across 6 spec files). Setup script (`scripts/setup-e2e.mjs`) creates test users in Supabase and writes credentials to `/tmp/opencode/iwkbu-test-credentials.json`. It reads `.env.local` automatically.
- No unit test runner — only integration smoke + Playwright E2E.
- Scheduled workflows: `nightly-backup.yml` (02:00 UTC, `pg_dump` via `SUPABASE_DB_URL` → 7-day artifact), `scheduled-audit.yml` (03:00 UTC, opens a GitHub issue on vulns). Dependabot PRs **auto squash-merge when green** — don't merge them manually.

## App Wiring

- Stack: Next.js 16 App Router, React 19, TypeScript strict, Tailwind CSS v4 via `@tailwindcss/postcss`, **DaisyUI v5** (component classes), Supabase Auth/Postgres.
- Route middleware is `src/proxy.ts` (not `src/middleware.ts`). Exports `proxy()` + `config`. Handles page-level auth/roles/security headers. **Returns early for `/api` paths** — every API route must self-guard with `getAuthenticatedActor()` (`src/lib/auth/server-actor.ts`) and `ensureRoleOrThrow()` (`src/lib/auth/requireRole.server.ts`).
- Roles (`src/config/roles.ts`): `po`, `loket`, `admin-terminal`, `staf-iw`. App names use hyphens; DB/RPC may use underscores. Normalize via `resolveRoleFromUserAndProfile()` (`src/lib/auth/role.ts`) and `normalizeRoleName()` (`src/lib/supabase/role-utils.ts`) — two different files.
- Supabase clients: `server.ts` (Server Components/handlers), `client.ts` (browser singleton), `admin.ts` (service-role). Query modules in `src/lib/supabase/queries/` split by `.server.ts` vs `.client.ts` — keep that boundary.
- IWKBU sync: `src/lib/iwkbu/adaptor.ts` switches between mock and real API via `IWKBU_API_URL` + `IWKBU_API_KEY`. Cron endpoints at `src/app/api/cron/iwkbu-fetch/route.ts` (fetch + sync) and `iwkbu-sync/route.ts` (sync only). Both use timing-safe Bearer comparison (`src/lib/auth/safe-compare.ts`).
- Migrations: `supabase/migrations/` (21 files). `0000_01`–`0000_06` are captured from live DB to reconcile drift; `0001`–`0015` are canonical local migrations. Plus `supabase/seed.sql`.

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
- Open redirect protection: `getSafeRedirect()` is an **inline local function** in `src/app/api/auth/callback/route.ts` (not a shared import). It validates `new URL(raw, origin).origin === origin` and rejects `//` and `\`. Reuse the pattern by copying it, don't hunt for a module.

## UI Gotchas

- **UI library is DaisyUI v5** (Tailwind plugin via `@plugin "daisyui"` in `src/app/globals.css`). Two custom themes are defined there: `jr` (light, default) and `jr-dark` (prefersdark). Brand palette is mapped into DaisyUI semantic tokens — `primary` = JR sky (CTA), `secondary` = JR navy, `accent`/`warning` = JR gold, `success` = JR green, `error` = red. **Prefer DaisyUI semantic tokens** (`bg-base-100/200/300`, `text-base-content`, `bg-primary`, `text-primary-content`, `bg-error`, etc.) and component classes (`btn`, `card`, `input input-bordered`, `badge`, `alert`, `table`, `tabs`, `modal`, `tooltip`) over hardcoded colors/effects.
- Legacy `brand-*` tokens (`brand-navy/sky/gold/green/ink/panel`) and old shadcn token names (`bg-card`, `text-muted-foreground`, `border-border`, `bg-background`, etc.) are kept as a **bridge** in `globals.css` `@theme inline` for gradual migration. `brand-gold` is now only `accent`/`warning` — primary CTAs use sky.
- `cn()` = `clsx` + `tailwind-merge` (framework-agnostic; standard override semantics).
- Components in `src/components/ui/` are **thin DaisyUI-backed wrappers** (same export names/props as the old shadcn set: `button`, `card`, `input`, `label`, `textarea`, `select`, `badge`, `alert`, `table`, `tabs`, `dialog`, `alert-dialog`, `sheet`, `dropdown-menu`, `tooltip`, `skeleton`, `separator`, `avatar`, `breadcrumb`, `date-picker`). They no longer depend on Radix or `class-variance-authority`. Interactive overlays (`Dialog`/`AlertDialog`/`Sheet`) use native `<dialog>` or controlled panels; `Select`/`DropdownMenu` use portal + fixed positioning with click-outside (`src/lib/use-click-outside.ts`); `asChild` is supported via a minimal `Slot` (`src/lib/slot.ts`) that composes event handlers.
- Font: **Plus Jakarta Sans** (400–800 via `next/font/google`). Mono: **Geist Mono**.
- Dark mode: `data-theme="jr|jr-dark"` attribute on `<html>` (set by `src/components/theme-provider.tsx`) + an inline anti-flash script in `src/app/layout.tsx`. `<html suppressHydrationWarning>`.
- Avoid "gaming" effects (neon glows, heavy gradients, glass blur, `shadow-elevation-3`). Keep visuals clean/Nexus-like: `shadow-sm`, subtle borders (`border-base-300`), restrained accent use. `.command-panel`/`.card-interactive`/`.text-heading`/`.font700/800` are clean legacy bridge classes.
- React Compiler enabled in `next.config.ts` — avoid `useMemo`/`useCallback` unless measured.
- `xlsx`, `jspdf`, `jspdf-autotable` via dynamic imports only (keep out of static imports).
- `recharts` via `next/dynamic` with loading skeleton in 3 dashboard pages (keeps bundle under 1.1 MB).
- Shared components in `src/components/shared/`: `StatusBadge`, `EmptyState`, `LoadingState`, `ConfirmDialog`.
- Dashboard shell: collapsible sidebar + topbar breadcrumbs + mobile bottom nav (`src/components/dashboard/dashboard-shell.tsx`).

## Security Checklist For New API Routes

1. Call `getAuthenticatedActor()` — reject if null (401).
2. Call `ensureRoleOrThrow("role")` with allowed roles (403).
3. Validate input manually (no Zod for API routes).
4. Sanitize error messages — never leak Supabase URLs or DB internals.
5. Use `rate-limiter.ts` / `pin-rate-limiter.ts` for auth-adjacent endpoints.
6. Log via `log_activity` RPC for audit trail.
