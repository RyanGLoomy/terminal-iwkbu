# CONTEXT.md — Domain Glossary

Kosakata domain untuk sistem Terminal–IWKBU. Dipakai sebagai acuan istilah saat
merancang seam/modul (lihat `.opencode/skills/improve-codebase-architecture`).
Dibangun dari `PROSKIP VINI.docx` bagian B.1 (Pemodelan) dan disilangkan dengan
kode di `src/`. Istilah arsitektur (module, interface, depth, seam, adapter,
leverage, locality) diatur oleh skill `/codebase-design`, bukan dokumen ini.

## Aktor (Roles)

Empat aktor fungsional. Nama kode pakai tanda hubung (`staf-iw`); DB/RPC dapat
pakai garis bawah (`staf_iw`). Lihat `src/config/roles.ts`.

| Aktor | Nama kode | Tanggung jawab inti |
|---|---|---|
| Petugas Loket Terminal | `loket` | Pencatatan kendaraan masuk/keluar di gate; Buka Sesi Petugas (PIN). |
| Admin Terminal | `admin-terminal` | Lihat rekap & riwayat terminal (global); Manajemen Akun Terminal. |
| Perusahaan Otobus | `po` | Registrasi; Update Data Armada; melihat & menanggapi Temuan miliknya. |
| Staf IW (Jasa Raharja) | `staf-iw` | Verifikasi akun PO; Kelola Master Data; Proses & Hasil Rekonsiliasi; Kelola Tindak Lanjut Temuan; Audit Trail. |

## Konsep Domain

- **Armada** — unit kendaraan milik sebuah PO. Di-master oleh Staf IW (Kelola
  Master Data); status operasional (`aktif`/`rusak`/`cadangan`) di-update oleh
  PO. Penanda unik: `nomor_polisi` (nopol).
- **PO (Perusahaan Otobus)** — pemilik armada, aktor eksternal. Mendaftar lalu
  diverifikasi Staf IW (`status_verifikasi`: `menunggu` → `aktif`).
- **Catat Kendaraan (Transaksi)** — peristiwa masuk/keluar kendaraan di terminal
  oleh Petugas Loket pada Sesi aktif. Tercatat dengan `timestamp` + id petugas.
- **Sesi Petugas** — otorisasi shift Petugas Loket via PIN; semua pencatatan
  terikat sesi ini.
- **IWKBU** — data status pembayaran/kepatuhan IWKBU dari API eksternal
  (`iwkbu-api-server`). Sumber: sinkronisasi API (otomatis) atau Upload File
  (manual CSV).
- **Rekonsiliasi** — mesin pemadanan (comparison) antara data operasional
  terminal vs status IWKBU untuk menghasilkan indikasi ketidaksesuaian. Skripsi
  menetapkan pendekatan *automation-first* dengan *fault tolerance* (pakai data
  cache bila API gagal + peringatan visual).
- **Temuan (Finding)** — catatan ketidaksesuaian/mismatch. Skripsi: dihasilkan
  dari Rekonsiliasi. Status: `open` → `on_progress` → `closed` (kode saat ini).
  Catatan: di kode, pembuatan Temuan **manual** oleh Staf IW; belum ada edge
  otomatis dari Rekonsiliasi ke Temuan (lihat laporan arsitektur, kandidat 1).
- **Klarifikasi (Clarification)** — tanggapan PO atas Temuan (alasan + bukti).
  `decision`: `menerima`/`menolak`/`melengkapi`. Bukti disimpan di bucket
  Storage `finding-evidence`.
- **Tindak Lanjut Temuan** — keputusan akhir Staf IW atas klarifikasi PO.
- **Audit Trail** — log aktivitas (`log_activity`) untuk akuntabilitas.
- **Notifikasi** — pemberitahuan otomatis perubahan status ke PO/Admin/Staf IW.
- **Master Data** — data referensi (armada, PO, jenis kendaraan, terminal, dst.).

## CatatanSkripsi vs Kode (mismatch terdokumentasi)

- Skripsi: Rekonsiliasi menghasilkan Temuan secara otomatis. Kode: Temuan hanya
  dibuat manual Staf IW (`/api/staf-iw/findings`). Edge `reconcile → insert
  finding` belum ada.
- Skripsi: fault-tolerance membaca data cache. Kode: fallback membuat status
  fiktif dari hash nopol (bukan cache) dan menimpa baris asli.
- Skripsi: ada status "Menunggu Verifikasi"/"Selesai"/"Pelanggaran Valid" +
  sanksi. Kode: hanya `open`/`on_progress`/`closed`, tanpa entitas sanksi.

Mismatch ini menjadi inti **Kandidat 1** pada laporan arsitektur.

## Modul Rekonsiliasi (hasil grilling Kandidat 1)

Kandidat 1 didalami menjadi modul `src/lib/rekonsiliasi/engine.ts` (pure).
Istilah yang mengkristal:

- **Mesin Rekonsiliasi (engine)** — modul pure pemilik aturan pemadanan.
  Interface: `reconcile({armada, sourceByPlate, terminalLastSeen}) → {rows, findings}`.
  Tidak menyentuh DB/HTTP; pemanggil (`executeIwkbuSync`) bertanggung jawab atas
  fetch, baca DB, dan persist. Interface = test surface (lihat `engine.test.ts`).
- **ProposedFinding** — Temuan yang diusulkan engine sebelum dipersist. Pemanggil
  menentukan dedup (satu finding OPEN per armada, source_type `rekonsiliasi`) dan
  actor (`created_by` = `initiated_by` atau user `system`).
- **Aturan emisi** — `reconciliationStatus` `ready` → tak ada finding;
  `needs_review` → finding severity `medium`; `blocked` → severity `high`.
- **Run degraded** — saat fetch API IWKBU gagal/env kosong, pemanggil TIDAK
  memfabrikasi data; ia melewati upsert source, merekonsiliasi vs cache
  (`iwkbu_source_records`) yang ada, dan menandai `iwkbu_sync_runs` degraded
  (warning). Path fabrikasi hash di adaptor dihapus.
- **normalizePlate** — kunci join seluruh mesin; pemilik tunggal di engine.
  Sebelumnya diduplikasi 3 tempat dan dipakai tak konsisten (cron tak menormalisasi).

