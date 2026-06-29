# ADR-0002: Modul Authorisation tunggal berbasis `AuthenticatedActor`

## Status
Accepted

## Context
Sebelumnya otorisasi API tersebar dangkal di ~40 route (lihat laporan arsitektur
Pass 1, Kandidat 2):

- `proxy.ts` *early-return* untuk `/api`, sehingga **setiap route menulis ulang
  penjagaan** dalam 4 idiom berbeda: 7 helper lokal (`requireStafActor`,
  `requireStaffActor` ×2, `requireStafIwActor`, `requireAccountActor`,
  `requireMasterDataActor`, `requirePetugasActor`) — dengan **drift ejaan
  "Staff" vs "Staf"** — 4 array `ALLOWED_ROLES` + `isAllowedRole`, 15 inline
  `actor.role ===/!==`, serta 30 pemanggilan `ensureRoleOrThrow`.
- **Deformasi inti**: `ensureRoleOrThrow(user, profile, allowed)` **menyelesaikan
  ulang role dari profile** (tanpa fallback RPC) — mengabaikan `actor.role` yang
  sudah dihitung `getAuthenticatedActor`. Ada **3 path resolusi role**
  (`proxy.ts`, `server-actor.ts`, `ensureRoleOrThrow`) yang bisa tak konsisten
  pada edge case (role dari fallback RPC).
- String peran (**role literal**) bocor ke 65+ titik (`"po"`, `"staf-iw"`),
  bukan merujuk `ROLES`.
- Tak ada **seam yang bisa di-inject** → otorisasi tak dapat diuji tanpa
  Supabase + server berjalan.

## Decision
Buat modul `src/lib/auth/actor.ts` sebagai **satu-satunya seam otorisasi API**.
Menggantikan `ensureRoleOrThrow` + 7 helper lokal + 4 `ALLOWED_ROLES` +
15 inline. File `requireRole.server.ts` **dihapus**.

```ts
hasRole(actor, allowed): boolean                 // PURE, testable
requireActor(allowed: RoleType|RoleType[]): Promise<AuthenticatedActor>
actorErrorHandler(error): NextResponse           // 401 / 403 / 500
class UnauthorizedError (401), class AuthorizationError (403)
```

Keputusan desain (hasil grilling):
1. **`requireActor(roles) → Actor`** — async tunggal; memanggil
   `getAuthenticatedActor` sebagai **satu-satunya path resolusi** (dengan
   fallback RPC), lalu **percaya `actor.role`** (tak re-resolve).
2. **Throw typed** — `UnauthorizedError`(401) bila no-actor;
   `AuthorizationError`(403) bila role tak cocok.
3. **Central `actorErrorHandler`** — standar catch untuk semua route (4 idiom → 1).
4. **Pure `hasRole`** untuk testability (interface = test surface) — diuji
   langsung tanpa Supabase.
5. **Migrasi penuh 39 route** — literal role → `ROLES` constants; per-method
   `requireActor(ROLES.X)` menggantikan inline check.
6. **Lokasi**: file baru `actor.ts` (bukan memperluas `requireRole.server.ts`).
7. **`getAuthenticatedActor` tak diubah**; `proxy.ts` /api early-return **tetap**
   (memindahkan auth API ke proxy = perubahan terpisah, di luar cakupan).

## Consequences

### Positive
- **Leverage tertinggi**: menambah/membatasi role pada endpoint = ubah 1 argumen
  `requireActor(ROLES.X)`, bukan audit ~40 berkas.
- **Locality**: keputusan otorisasi terkonsentrasi; role literal tak lagi bocor
  (semua via `ROLES`).
- **Konsistensi resolusi**: satu path (`getAuthenticatedActor` dgn fallback RPC);
  deformasi re-resolve tanpa fallback hilang.
- **Testable**: `hasRole` pure diuji 7 unit test tanpa Supabase.
- Standar catch (401/403/500) menutup kebocoran error mentah di path otorisasi.

### Negative
- Migrasi menyentuh 39 berkas sekaligus (risiko regresi — dimitigasi via
  typecheck + build + E2E).
- Perilaku `findings/evidence` yang sengaja mengembalikan **404** (menyembunyikan
  eksistensi file dari non-owner) tetap ditangani khusus, bukan via
  `actorErrorHandler` default — pengecualian yang harus diingat.

### Neutral
- `actorErrorHandler` kini juga jadi fallback 500 terstandar (via `sanitizeDbError`).

## Alternatives Considered

- **Pisah `getActorOr401()` + `hasRole()` (2 langkah per route)** — ditolak:
  lebih bertele-telu. (Q1)
- **`requireActor` return `{actor}|{error}` (gaya C, no throw)** — ditolak:
  pemanggil harus mengecek error. (Q1)
- **403 throw, 401 return manual** — ditolak: 2 langkah. (Q2)
- **Additive + deprecate `ensureRoleOrThrow`** — ditolak: dual-API jangka
  panjang, duplikasi tak hilang. (Q3)
- **Mock `getAuthenticatedActor` untuk pengujian** — ditolak: ribet; pure
  `hasRole` lebih langsung. (Q4)
- **Memusatkan auth API di `proxy.ts` (bukan per-route)** — di luar cakupan;
  perubahan lebih besar, ditangguhkan.

## References
- `src/lib/auth/actor.ts`, `actor.test.ts`
- 39 berkas `src/app/api/**/route.ts` (dimigrasi)
- `src/lib/auth/server-actor.ts` (resolusi, tak diubah)
- `src/config/roles.ts`
- Laporan arsitektur Pass 1, Kandidat 2 & Pass 2 (SEC)
