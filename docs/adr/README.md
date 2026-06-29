# Architecture Decision Records

Catatan keputusan arsitektur yang *load-bearing* — keputusan yang akan
diperlukan lagi oleh penjelajah masa depan, dirumuskan agar tinjauan arsitektur
berikutnya tidak usah mengusulkan alternatif yang sudah ditolak beserta alasannya.

Format mengikuti skill `architecture-designer` (referensi:
`.opencode/skills/architecture-designer/references/adr-template.md`). Domain
merujuk `CONTEXT.md`. Vocabulary arsitektur (module, interface, depth, seam,
adapter, leverage, locality) diatur skill `improve-codebase-architecture`.

| ADR | Judul | Status |
|---|---|---|
| [0001](0001-rekonsiliasi-engine-pure-module.md) | Mesin Rekonsiliasi sebagai modul pure + edge ke Temuan | Accepted |
| [0002](0002-authorisation-actor-module.md) | Modul Authorisation tunggal berbasis `AuthenticatedActor` | Accepted |
| [0003](0003-finding-lifecycle-state-machine.md) | State machine Temuan: tabel transisi pure + helper klarifikasi | Accepted |
