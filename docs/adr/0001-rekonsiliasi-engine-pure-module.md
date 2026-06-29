# ADR-0001: Mesin Rekonsiliasi sebagai modul pure + edge ke Temuan

## Status
Accepted

## Context
Skripsi (B.1) menetapkan Rekonsiliasi *automation-first*: tarik status IWKBU,
jalankan algoritma pemadanan, dan **menghasilkan daftar temuan ketidaksesuaian**.
Kode sebelumnya **tidak menerapkan ini**:

- `executeIwkbuSync` berhenti di upsert `iwkbu_sync_status`. Edge
  `reconcile → insert findings` **tidak ada** — Temuan hanya bisa dibuat manual
  Staf IW lewat `/api/staf-iw/findings`.
- `buildReconciliation` (aturan domain inti: ready/needs_review/blocked) bersifat
  **dalam tapi private** — tak bisa diuji langsung; leverage ~0 (output
  `discrepancyNote` dead-end di kolom tampilan).
- `normalizePlate` (kunci join seluruh mesin) **diduplikasi 3 tempat**
  (`iwkbu-sync.server.ts`, `iwkbu-source/route.ts`, `adaptor.ts` inline) dan cron
  **tak menormalisasi** plate sebelum upsert → silent false-negative saat match.
- Fault-tolerance salah: `fallbackFetch` **memfabrikasi** status dari hash nopol
  (bukan membaca cache `iwkbu_source_records`), lalu cron menimpa baris asli
  dengan data fabrikasi tanpa memeriksa `result.source`.

Lihat laporan arsitektur (Pass 1, Kandidat 1) & `CONTEXT.md`.

## Decision
Buat modul pure `src/lib/rekonsiliasi/engine.ts` sebagai pemilik tunggal aturan
pemadanan, dengan interface sempit:

```ts
reconcile({ armada, sourceByPlate, terminalLastSeen }) → { rows, findings }
normalizePlate(value) → string
```

Keputusan desain (hasil grilling):
1. **Engine pure** — menerima data (armada + source map), **mengembalikan**
   `rows` (untuk `iwkbu_sync_status`) DAN `ProposedFinding[]`. Tidak menyentuh
   DB/HTTP. Pemanggil (`executeIwkbuSync`) bertanggung jawab atas fetch, baca DB,
   dan persist.
2. **Aturan emisi** — `reconciliationStatus` `ready` → tak ada finding;
   `needs_review` → severity `medium`; `blocked` → severity `high`.
3. **Dedup app-level** — persist: satu finding OPEN per armada
   (`source_type='rekonsiliasi'`); lookup batch → update bila ada, insert bila
   tidak. Tanpa migrasi DB.
4. **`created_by`** = `initiated_by` ‖ user `system`
   (`00000000-0000-0000-0000-000000000001`, di-seed via migrasi) — memenuhi
   `findings.created_by NOT NULL` untuk cron terjadwal.
5. **Fault-tolerance = cache** — path fabrikasi hash dihapus; saat fetch API
   gagal/env kosong → `source:"degraded"`, cron **melewatkan upsert source** dan
   merekonsiliasi vs cache `iwkbu_source_records` yang ada, run ditandai degraded.
6. **`normalizePlate` pemilik tunggal** di engine; cron menormalisasi plate
   sebelum menulis `external_ref`.
7. **`node:test`** + `tsx` untuk engine (pure → interface = test surface).

## Consequences

### Positive
- Celah skripsi tertutup nyata: reconcile menghasilkan Temuan (terverifikasi
  end-to-end: 41 findings dari 101 armada).
- Aturan domain terkonsentrasi di satu modul pure → **locality**; interface
  sempit → **leverage** (3 konsumen: cron, manual upload, test).
- `buildReconciliation` kini diekspor & teruji (8 unit test); bug aturan domain
  bisa ditangkap tanpa mock Supabase/HTTP/cron.
- False-negative `normalizePlate` teratasi (join key konsisten lintas path).
- Fault-tolerance sesuai skripsi (cache, bukan fabrikasi) — tak lagi menimpa
  data asli dengan estimasi.
- Idempoten: run ulang update, bukan duplikat (terverifikasi).

### Negative
- Pemanggil memiliki boilerplate persist (fetch + persist + dedup) —
  dianggap oke karena menjaga engine pure.
- Auto-finding dari cron perlu user `system` (migrasi seed) — dependensi
  data awal.

### Neutral
- Status `iwkbu_sync_runs.summary` kini membawa `findings_created`/
  `findings_updated`/`degraded`.

## Alternatives Considered

- **Engine persist langsung (INSERT findings di dalam engine)** — ditolak:
  engine jadi coupled DB, sulit diuji, idempotensi rapuh. (Q1=A)
- **Tetap manual saja; hanya perbaiki cache+normalize** — ditolak: celah skripsi
  tetap terbuka. (Q1=C)
- **Fabrikasi hash dipertahankan tapi transparan** — ditolak: bertentangan
  skripsi (cache), menimpa data asli. (Q2)
- **Dedup per `sync_run_id` (kolom + FK)** — ditolak: butuh migrasi skema,
  riwayat lebih kaya tapi tak sebanding dengan kompleksitas. (Q3)
- **Fabrikasi cold-start saja** — ditolak: kompleks, tetap menyesatkan. (Q9)

## References
- `src/lib/rekonsiliasi/engine.ts`, `engine.test.ts`
- `src/lib/supabase/queries/iwkbu-sync.server.ts` (pemanggil + persist)
- `src/lib/iwkbu/adaptor.ts` (fault-tolerance degraded)
- `src/app/api/cron/iwkbu-fetch/route.ts`
- `CONTEXT.md` → "Modul Rekonsiliasi"
- Laporan arsitektur Pass 1, Kandidat 1
