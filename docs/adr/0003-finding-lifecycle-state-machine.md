# ADR-0003: State machine Temuan — tabel transisi pure + helper klarifikasi

## Status
Accepted

## Context
Lifecycle Temuan (Temuan = Finding) sebelumnya **emergent** dari kondisional
yang tersebar di 3 handler (lihat laporan arsitektur Pass 1, Kandidat 3):

- Status `open`/`on_progress`/`closed`; transisi tersebar:
  - PO klarifikasi → `decision === "menolak" ? "open" : "on_progress"`
    (`po/findings/[id]/clarifications`).
  - Staf klarifikasi → `"on_progress"` unconditional
    (`staf-iw/findings/[id]/clarifications`).
  - Staf PATCH → status bebas + deteksi *reopen* (closed→open) + *close*
    (`staf-iw/findings/[id]`).
- Dua route klarifikasi (PO & Staf) **~90% identik** — `ALLOWED_MIME`,
  `MAX_FILE_SIZE`, validasi file, upload storage, insert `finding_clarifications`,
  guard `closed → 409`, `logActivity`, `createNotification`.
- Guard "closed → 409" **diduplikasi** di kedua route.
- Untuk memahami "apa yang terjadi saat Temuan dibuat sampai selesai" harus
  membaur di banyak file; state machine tak dideklarasikan di mana pun.

## Decision
Buat modul `src/lib/findings/lifecycle.ts` dengan dua lapis:

```ts
nextStatus({ from, event, decision? }) → FindingStatus | null   // PURE, tabel transisi
submitClarification({ actor, responder, finding, decision, message, evidence... })
                                                                 // helper dedup 2 route
class FindingClosedError (409), class InvalidClarificationError (400)
```

Keputusan desain (hasil grilling):
1. **`nextStatus` pure** — tabel transisi; `null` berarti invalid. Event typed:
   `po_clarify`/`staf_clarify`/`staf_close`/`staf_reopen`.
2. **Permissive (pertahankan perilaku)** — `nextStatus` tak menambah batasan
   baru; hanya mendokumentasikan & menyentralisasi aturan yang sudah ada.
   `*_clarify` dari `closed` → `null` (→ 409); lainnya bebas antar status.
3. **`submitClarification` helper** — menggabungkan body duplikat 2 route
   (upload + insert + update status via `nextStatus` + log + notify). Route
   tetap terpisah (URL & RBAC per-role).
4. **Side-effect scope** — `submitClarification` memiliki log+notify bawaan
   (identik untuk kedua role, modulo target). Side-effect PATCH (reopen/close
   notify) **tetap di route** (sudah ada & spesifik).
5. **Typed errors** — `FindingClosedError` (409) & `InvalidClarificationError`
   (400); route memetakan keduanya.
6. **`node:test`** untuk matriks transisi `nextStatus` (10 unit test).

## Consequences

### Positive
- **Locality**: aturan transisi status + guard `closed→409` terkonsentrasi di
  satu tabel; tak lagi emergent di 3 handler.
- **Deduplication**: ~90% body duplikat 2 route klarifikasi hilang (route
  ~170 → ~85 baris).
- **Testable**: `nextStatus` pure diuji 10 unit test (matriks: po_clarify
  menerima/menolak/melengkapi × open/on_progress/closed; staf_clarify; close;
  reopen; closed-guard).
- Guard `closed → 409` disentralisasi (sebelumnya diduplikasi).

### Negative
- PATCH route (`staf-iw/findings/[id]`) **belum** merutekan status melalui
  `nextStatus` — transisinya tetap permissive di route. Pilihan ini disengaja
  (Q4 = preserve behavior); ketatkan nanti bila diperlukan via ADR lanjutan.
- `submitClarification` coupled DB (tak pure) → diuji integration, bukan unit.

### Neutral
- Konstanta `ALLOWED_EVIDENCE_MIME`/`MAX_EVIDENCE_FILE_SIZE` sekarang pemilik
  tunggal di `lifecycle.ts` (sebelumnya diduplikasi + di bucket config).

## Alternatives Considered

- **Strict transitions (hanya transisi terdeklarasi valid; lainnya → 400/409)** —
  ditolak: mengubah perilaku, berisiko memutus alur yang ada. (Q4)
- **Service coupled `FindingLifecycle` jalankan transisi penuh (DB+notify+log)** —
  ditolak: bukan pure, sulit diuji. (Q1)
- **Merge 2 route klarifikasi jadi 1 route parameterized** — ditolak: mengubah
  URL & RBAC, refactor lebih besar. (Q3)
- **Hanya `nextStatus` tanpa dedup route** — ditolak: duplikasi tetap. (Q1)
- **`recordStatusChange` helper untuk PATCH juga** — ditangguhkan: lebih invasif,
  PATCH side-effect sudah bekerja. (Q5)

## References
- `src/lib/findings/lifecycle.ts`, `lifecycle.test.ts`
- `src/app/api/po/findings/[id]/clarifications/route.ts`
- `src/app/api/staf-iw/findings/[id]/clarifications/route.ts`
- `src/app/api/staf-iw/findings/[id]/route.ts` (PATCH, tak diubah)
- `CONTEXT.md` → "Temuan (Finding)"
- Laporan arsitektur Pass 1, Kandidat 3
