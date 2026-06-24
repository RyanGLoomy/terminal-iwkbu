# API Documentation — Terminal IWKBU

Dokumen ini menjelaskan seluruh endpoint API pada aplikasi Terminal IWKBU. Aplikasi ini menggunakan Next.js App Router dengan route handler di `src/app/api/`. Setiap endpoint mengembalikan respons JSON dengan konvensi berikut:

- **Sukses:** `{ "data": ... }` atau `{ "success": true, ... }` atau `{ "ok": true, ... }`
- **Error:** `{ "message": "Deskripsi pesan error" }`

## Konvensi Autentikasi & Otorisasi

Semua endpoint (kecuali `auth/login`, `auth/logout`, `auth/callback`, `auth/forgot-password`, dan cron) memverifikasi identitas pengguna melalui:

- `getAuthenticatedActor()` dari `@/lib/auth/server-actor` — membaca sesi Supabase dari cookie, mengembalikan objek `{ user, profile, role, terminalId }` atau `null`.
- `ensureRoleOrThrow(user, profile, ...roles)` dari `@/lib/auth/requireRole.server` — melempar `AuthorizationError` jika role tidak cocok.

Karena middleware (`src/proxy.ts`) melewati path `/api`, **setiap route handler wajib melakukan pengecekan autentikasi sendiri**.

### Role yang Tersedia

| Role App | Deskripsi |
|---|---|
| `po` | Perusahaan Otobus — mengelola armada sendiri |
| `loket` | Petugas loket terminal — input transaksi kendaraan |
| `admin-terminal` | Admin terminal tertentu — kelola petugas & laporan terminalnya |
| `staf-iw` | Staf Inspeksi Wilayah — super admin, akses penuh sistem |

---

## Daftar Endpoint

| # | Method | Path | Role | Deskripsi Singkat |
|---|---|---|---|---|
| 1 | POST | `/api/auth/login` | Publik | Login dengan email & password |
| 2 | POST | `/api/auth/logout` | Terotentikasi | Logout dan hapus sesi |
| 3 | GET | `/api/auth/callback` | Publik | Callback OAuth Supabase |
| 4 | POST | `/api/auth/verify-pin` | loket | Verifikasi PIN petugas terminal |
| 5 | POST | `/api/auth/change-pin` | loket | Ubah PIN petugas terminal |
| 6 | POST | `/api/auth/change-password` | Terotentikasi | Ubah password akun |
| 7 | POST | `/api/auth/forgot-password` | Publik | Kirim email reset password |
| 8 | POST | `/api/auth/reset-password` | Sesi recovery | Reset password via email |
| 9 | GET | `/api/auth/pin-session` | Terotentikasi | Cek status sesi PIN |
| 10 | DELETE | `/api/auth/pin-session` | Terotentikasi | Hapus sesi PIN |
| 11 | POST | `/api/auth/upsert-pin-session` | loket | Buat/perbarui sesi PIN |
| 12 | POST | `/api/auth/upsert-petugas-terminal` | admin-terminal, staf-iw | Buat/edit petugas terminal |
| 13 | POST | `/api/po/armada` | po | Tambah armada baru |
| 14 | PATCH | `/api/po/armada/[id]` | po | Edit data armada |
| 15 | DELETE | `/api/po/armada/[id]` | po, staf-iw, admin-terminal | Hapus armada |
| 16 | POST | `/api/po/armada/[id]/dokumen` | po | Upload dokumen armada |
| 17 | GET | `/api/po/findings` | po | Daftar temuan PO |
| 18 | GET | `/api/po/findings/[id]/actions` | po | Riwayat tindak lanjut temuan |
| 19 | POST | `/api/po/findings/[id]/clarifications` | po | Kirim klarifikasi temuan |
| 20 | GET | `/api/staf-iw/users` | staf-iw | Daftar semua pengguna |
| 21 | PATCH | `/api/staf-iw/users/[id]` | staf-iw | Ubah role pengguna |
| 22 | PATCH | `/api/staf-iw/po/[id]` | staf-iw, admin-terminal | Edit data PO |
| 23 | POST | `/api/staf-iw/po/[id]/verifikasi` | staf-iw, admin-terminal | Verifikasi/tolak PO |
| 24 | POST | `/api/staf-iw/armada/[id]/verifikasi` | staf-iw, admin-terminal | Verifikasi/tolak armada |
| 25 | GET | `/api/staf-iw/periode-rekonsiliasi` | staf-iw, admin-terminal | Daftar periode rekonsiliasi |
| 26 | POST | `/api/staf-iw/periode-rekonsiliasi` | staf-iw, admin-terminal | Buat periode rekonsiliasi |
| 27 | PATCH | `/api/staf-iw/periode-rekonsiliasi/[id]` | staf-iw, admin-terminal | Edit periode rekonsiliasi |
| 28 | DELETE | `/api/staf-iw/periode-rekonsiliasi/[id]` | staf-iw, admin-terminal | Hapus periode rekonsiliasi |
| 29 | GET | `/api/staf-iw/findings` | staf-iw, admin-terminal | Daftar semua temuan |
| 30 | POST | `/api/staf-iw/findings` | staf-iw, admin-terminal | Buat temuan baru |
| 31 | PATCH | `/api/staf-iw/findings/[id]` | staf-iw, admin-terminal | Edit/ubah status temuan |
| 32 | POST | `/api/staf-iw/findings/[id]/actions` | staf-iw, admin-terminal | Tambah tindak lanjut |
| 33 | PATCH | `/api/staf-iw/findings/[id]/actions/[actionId]` | staf-iw, admin-terminal | Ubah status tindak lanjut |
| 34 | POST | `/api/staf-iw/findings/[id]/clarifications` | staf-iw, admin-terminal | Kirim klarifikasi staf |
| 35 | GET | `/api/staf-iw/audit-trail` | staf-iw | Log aktivitas dengan filter |
| 36 | GET | `/api/staf-iw/iwkbu-source` | staf-iw, admin-terminal | Daftar source record IWKBU |
| 37 | POST | `/api/staf-iw/iwkbu-source` | staf-iw, admin-terminal | Import source record IWKBU |
| 38 | GET | `/api/staf-iw/iwkbu-sync` | staf-iw, admin-terminal | Dashboard sinkronisasi IWKBU |
| 39 | POST | `/api/staf-iw/iwkbu-sync` | staf-iw, admin-terminal | Jalankan sinkronisasi IWKBU |
| 40 | GET | `/api/staf-iw/rekonsiliasi` | staf-iw, admin-terminal | Data rekonsiliasi |
| 41 | GET | `/api/admin/system-settings` | staf-iw | Daftar pengaturan sistem |
| 42 | PUT | `/api/admin/system-settings` | staf-iw | Perbarui pengaturan sistem |
| 43 | GET | `/api/admin/terminals` | admin-terminal, staf-iw | Daftar terminal |
| 44 | POST | `/api/admin/terminals` | staf-iw | Tambah terminal |
| 45 | PATCH | `/api/admin/terminals` | admin-terminal, staf-iw | Edit terminal |
| 46 | DELETE | `/api/admin/terminals` | staf-iw | Hapus terminal |
| 47 | GET | `/api/admin/jenis-kendaraan` | Terotentikasi | Daftar jenis kendaraan |
| 48 | POST | `/api/admin/jenis-kendaraan` | staf-iw | Tambah jenis kendaraan |
| 49 | PATCH | `/api/admin/jenis-kendaraan/[id]` | staf-iw | Edit jenis kendaraan |
| 50 | DELETE | `/api/admin/jenis-kendaraan/[id]` | staf-iw | Hapus jenis kendaraan |
| 51 | GET | `/api/admin/petugas` | admin-terminal, staf-iw | Daftar akun loket |
| 52 | POST | `/api/admin/petugas` | admin-terminal, staf-iw | Buat akun loket |
| 53 | PATCH | `/api/admin/petugas` | admin-terminal, staf-iw | Edit akun loket |
| 54 | GET | `/api/admin/petugas-terminal` | admin-terminal, staf-iw | Daftar petugas terminal |
| 55 | PATCH | `/api/admin/petugas-terminal` | admin-terminal, staf-iw | Aktif/nonaktifkan petugas |
| 56 | DELETE | `/api/admin/petugas-terminal` | admin-terminal, staf-iw | Hapus petugas terminal |
| 57 | GET | `/api/admin/reports/terminal` | admin-terminal, staf-iw | Laporan terminal |
| 58 | POST | `/api/sesi/open` | loket | Buka sesi kerja |
| 59 | POST | `/api/sesi/close` | loket | Tutup sesi kerja |
| 60 | POST | `/api/transaksi/masuk` | loket | Catat kendaraan masuk |
| 61 | POST | `/api/transaksi/keluar` | loket | Catat kendaraan keluar |
| 62 | POST | `/api/cron/iwkbu-sync` | Bearer token | Cron: jalankan IWKBU sync |
| 63 | POST | `/api/cron/iwkbu-fetch` | Bearer token | Cron: fetch + sync IWKBU |
| 64 | GET | `/api/findings/evidence` | po/staf-iw/admin-terminal | Download bukti klarifikasi |
| 65 | PATCH | `/api/profile` | Terotentikasi | Edit profil sendiri |

---

## 1. Auth

### POST `/api/auth/login`

Melakukan autentikasi pengguna dengan email dan password. Mengembalikan cookie sesi Supabase, role yang ter-resolve, dan route default.

- **Autentikasi:** Tidak diperlukan (endpoint publik).
- **Rate limit:** 10 percobaan per 15 menit berdasarkan IP.

**Request Body:**

```json
{
  "email": "staf.iw@terminal.go.id",
  "password": "StafIw@2026!"
}
```

| Field | Tipe | Wajib | Deskripsi |
|---|---|---|---|
| `email` | string | Ya | Email pengguna |
| `password` | string | Ya | Password pengguna |

**Response Sukses (200):**

```json
{
  "ok": true,
  "defaultRoute": "/staf-iw",
  "role": "staf-iw"
}
```

**Response Error:**

| Status | Pesan |
|---|---|
| 400 | `"Email dan password wajib diisi."` |
| 401 | `"Email atau password salah"` |
| 403 | `"Akun tidak aktif. Hubungi admin."` |
| 422 | `"Login berhasil, tetapi role tidak ditemukan. Hubungi admin."` |
| 429 | `"Terlalu banyak percobaan login. Coba lagi dalam 15 menit."` |
| 500 | `"Terjadi kesalahan saat login. Silakan coba lagi."` |
| 503 | `"Layanan tidak tersedia sementara. Silakan coba lagi nanti."` |

---

### POST `/api/auth/logout`

Mengakhiri sesi pengguna, menghapus cookie autentikasi.

- **Autentikasi:** Sesi aktif (dihapus secara graceful bila tidak ada sesi).

**Request Body:** Tidak diperlukan.

**Response Sukses (200):**

```json
{ "ok": true }
```

---

### GET `/api/auth/callback`

Handler callback OAuth Supabase. Menukarkan kode otorisasi dengan sesi, lalu mengalihkan ke halaman tujuan. Mencegah open redirect dengan memvalidasi parameter `redirect` (harus diawali `/` dan tidak diawali `//`).

- **Autentikasi:** Tidak diperlukan.

**Query Parameters:**

| Param | Tipe | Wajib | Deskripsi |
|---|---|---|---|
| `code` | string | Tidak | Kode otorisasi Supabase |
| `type` | string | Tidak | Jenis callback (`"recovery"` untuk reset password) |
| `redirect` | string | Tidak | Path tujuan redirect (default: `/`) |

**Response:** HTTP 302 Redirect ke `/reset-password` (jika `type=recovery`) atau `redirect` parameter.

---

### POST `/api/auth/verify-pin`

Memverifikasi PIN petugas terminal untuk pengguna loket. Membandingkan input PIN dengan hash PIN yang tersimpan di tabel `petugas_terminal`.

- **Autentikasi:** Wajib login.
- **Role:** `loket` (403 jika bukan loket).
- **Rate limit:** Per-user, dengan lockout progresif.

**Request Body:**

```json
{
  "pin_input": "1234"
}
```

| Field | Tipe | Wajib | Deskripsi |
|---|---|---|---|
| `pin_input` | string | Ya | PIN yang akan diverifikasi |

**Response Sukses (200):**

```json
{
  "verified": true,
  "petugas_id": "uuid-petugas-terminal",
  "petugas_nama": "Petugas A"
}
```

**Response Error:**

| Status | Pesan |
|---|---|
| 400 | `"PIN wajib diisi."` / `"Terminal tidak ditemukan pada profil."` |
| 200 | `{ "verified": false, "message": "PIN tidak valid." }` (PIN salah) |
| 401 | `"Sesi habis. Silakan login ulang."` |
| 403 | `"Akses ditolak"` |
| 429 | `"Terlalu banyak percobaan PIN salah..."` |
| 500 | `"Terjadi kesalahan internal"` |

---

### POST `/api/auth/change-pin`

Mengubah PIN petugas terminal. Memverifikasi PIN lama sebelum menyimpan PIN baru.

- **Autentikasi:** Wajib login.
- **Role:** `loket`.
- **Rate limit:** 5 percobaan per 15 menit per-user.

**Request Body:**

```json
{
  "currentPin": "1234",
  "newPin": "5678"
}
```

| Field | Tipe | Wajib | Deskripsi |
|---|---|---|---|
| `currentPin` | string | Ya | PIN lama (harus cocok) |
| `newPin` | string | Ya | PIN baru (4–6 digit angka) |

**Response Sukses (200):**

```json
{ "message": "PIN berhasil diperbarui." }
```

**Response Error:**

| Status | Pesan |
|---|---|
| 400 | `"PIN lama dan PIN baru wajib diisi."` / `"PIN baru harus 4-6 digit angka."` / `"PIN baru tidak boleh sama dengan PIN lama."` / `"PIN lama tidak valid."` |
| 401 | `"Sesi habis. Silakan login ulang."` |
| 403 | `"Akses ditolak"` |
| 429 | `"Terlalu banyak percobaan..."` |
| 500 | `"Terjadi kesalahan internal"` |

---

### POST `/api/auth/change-password`

Mengubah password akun pengguna yang sedang login. Memverifikasi password lama sebelum memperbarui.

- **Autentikasi:** Wajib login.
- **Rate limit:** 5 percobaan per 15 menit per-user.

**Request Body:**

```json
{
  "currentPassword": "Lama123!",
  "newPassword": "Baru456!"
}
```

| Field | Tipe | Wajib | Deskripsi |
|---|---|---|---|
| `currentPassword` | string | Ya | Password lama |
| `newPassword` | string | Ya | Password baru (minimal 6 karakter) |

**Response Sukses (200):**

```json
{ "message": "Password berhasil diperbarui." }
```

**Response Error:**

| Status | Pesan |
|---|---|
| 400 | `"Password lama dan password baru wajib diisi."` / `"Password baru minimal 6 karakter."` / `"Password baru tidak boleh sama dengan password lama."` / `"Password lama tidak valid."` |
| 401 | `"Sesi habis. Silakan login ulang."` |
| 429 | `"Terlalu banyak percobaan..."` |
| 500 | Pesan error dari operasi |

---

### POST `/api/auth/forgot-password`

Memicu pengiriman email reset password. Selalu mengembalikan respons sukses untuk mencegah enumerasi email.

- **Autentikasi:** Tidak diperlukan.
- **Rate limit:** 5 percobaan per 15 menit berdasarkan IP.

**Request Body:**

```json
{
  "email": "user@terminal.go.id"
}
```

| Field | Tipe | Wajib | Deskripsi |
|---|---|---|---|
| `email` | string | Ya | Email terdaftar |

**Response Sukses (200):**

```json
{
  "message": "Jika email terdaftar, tautan reset password akan dikirim ke email Anda."
}
```

---

### POST `/api/auth/reset-password`

Mereset password setelah pengguna mengklik tautan dari email (sesi recovery).

- **Autentikasi:** Sesi recovery Supabase (dari callback `type=recovery`).
- **Rate limit:** 5 percobaan per 15 menit per-user.

**Request Body:**

```json
{
  "password": "PasswordBaru123!"
}
```

| Field | Tipe | Wajib | Deskripsi |
|---|---|---|---|
| `password` | string | Ya | Password baru (minimal 6 karakter) |

**Response Sukses (200):**

```json
{ "message": "Password berhasil diubah." }
```

**Response Error:**

| Status | Pesan |
|---|---|
| 400 | `"Password baru wajib diisi."` / `"Password minimal 6 karakter."` |
| 401 | `"Sesi reset tidak valid. Silakan ajukan ulang."` |
| 429 | `"Terlalu banyak percobaan..."` |
| 500 | Pesan error dari operasi |

---

### GET `/api/auth/pin-session`

Memeriksa status sesi PIN petugas saat ini. Mengembalikan informasi sesi jika masih valid dan belum kadaluarsa.

- **Autentikasi:** Wajib login.

**Response Sukses — Sesi Aktif (200):**

```json
{
  "verified": true,
  "user_id": "uuid",
  "verified_at": "2026-01-01T00:00:00.000Z",
  "expires_at": "2026-01-01T08:00:00.000Z",
  "updated_at": "2026-01-01T00:00:00.000Z",
  "petugas_terminal_id": "uuid-petugas",
  "petugas_nama": "Petugas A"
}
```

**Response — Sesi Tidak Valid (200):**

```json
{
  "verified": false,
  "message": "PIN belum diverifikasi atau sudah kadaluarsa"
}
```

---

### DELETE `/api/auth/pin-session`

Menghapus sesi PIN aktif (logout dari PIN).

- **Autentikasi:** Wajib login.

**Response Sukses (200):**

```json
{ "message": "Sesi PIN dihapus." }
```

---

### POST `/api/auth/upsert-pin-session`

Membuat atau memperbarui sesi PIN setelah verifikasi berhasil. Sesi berlaku 8 jam.

- **Autentikasi:** Wajib login.
- **Role:** `loket`.

**Request Body:**

```json
{
  "petugas_terminal_id": "uuid-petugas-terminal",
  "petugas_nama": "Petugas A"
}
```

| Field | Tipe | Wajib | Deskripsi |
|---|---|---|---|
| `petugas_terminal_id` | string | Ya | ID petugas terminal yang terverifikasi |
| `petugas_nama` | string | Tidak | Nama petugas (override) |

**Response Sukses (200):**

```json
{
  "session": {
    "user_id": "uuid",
    "verified_at": "2026-01-01T00:00:00.000Z",
    "expires_at": "2026-01-01T08:00:00.000Z",
    "petugas_terminal_id": "uuid-petugas",
    "petugas_nama": "Petugas A"
  }
}
```

**Response Error:**

| Status | Pesan |
|---|---|
| 400 | `"petugas_terminal_id wajib diisi."` / `"Terminal tidak ditemukan pada profil."` |
| 401 | `"Sesi habis. Silakan login ulang."` |
| 403 | `"Petugas terminal tidak aktif atau tidak valid."` |
| 500 | Pesan error |

---

### POST `/api/auth/upsert-petugas-terminal`

Membuat atau memperbarui data petugas terminal beserta PIN-nya. Admin-terminal hanya dapat mengelola terminalnya sendiri. PIN baru divalidasi untuk keunikan dalam terminal yang sama.

- **Autentikasi:** Wajib login.
- **Role:** `admin-terminal` atau `staf-iw`.

**Request Body:**

```json
{
  "terminal_id": "uuid-terminal",
  "nama": "Petugas B",
  "pin": "1234",
  "petugas_id": "uuid-petugas"
}
```

| Field | Tipe | Wajib | Deskripsi |
|---|---|---|---|
| `terminal_id` | string | Ya | ID terminal |
| `nama` | string | Ya | Nama petugas |
| `pin` | string | Tidak | PIN 4–6 digit (auto-generate jika kosong saat create) |
| `petugas_id` | string | Tidak | Jika diisi = update; jika kosong = create |

**Response Sukses (200):**

```json
{
  "id": "uuid-petugas",
  "pin": "1234"
}
```

> Jika PIN di-generate otomatis, field `pin` akan berisi PIN yang dihasilkan. Jika update tanpa PIN baru, `pin` tidak disertakan.

**Response Error:**

| Status | Pesan |
|---|---|
| 400 | `"terminal_id dan nama wajib diisi."` / `"PIN harus 4-6 digit angka."` / `"PIN sudah digunakan petugas lain."` |
| 401 | `"Sesi habis. Silakan login ulang."` |
| 403 | `"Forbidden"` |
| 404 | `"Petugas tidak ditemukan."` |
| 500 | `"Gagal menghasilkan PIN unik."` / Pesan error lain |

---

## 2. PO (Perusahaan Otobus)

### POST `/api/po/armada`

Menambahkan data armada baru milik PO yang sedang login. PO harus berstatus `aktif` (terverifikasi).

- **Autentikasi:** Wajib login.
- **Role:** `po`.

**Request Body:**

```json
{
  "nomor_polisi": "B 1234 ABC",
  "nomor_lambung": "01",
  "merk": "Toyota",
  "tipe": "Coaster",
  "tahun_pembuatan": 2020,
  "nomor_chassis": "MHFKE...",
  "nomor_mesin": "1KD...",
  "kapasitas_penumpang": 30,
  "status_operasional": "aktif"
}
```

| Field | Tipe | Wajib | Deskripsi |
|---|---|---|---|
| `nomor_polisi` | string | Ya | Nomor polisi (akan di-uppercased) |
| `nomor_lambung` | string | Tidak | Nomor lambung |
| `merk` | string | Tidak | Merk kendaraan |
| `tipe` | string | Tidak | Tipe kendaraan |
| `tahun_pembuatan` | number | Tidak | Tahun pembuatan |
| `nomor_chassis` | string | Tidak | Nomor rangka |
| `nomor_mesin` | string | Tidak | Nomor mesin |
| `kapasitas_penumpang` | number | Tidak | Kapasitas penumpang |
| `status_operasional` | string | Tidak | Default: `"aktif"` |

**Response Sukses (201):**

```json
{
  "data": {
    "id": "uuid",
    "po_id": "uuid-po",
    "nomor_polisi": "B 1234 ABC",
    "status_verifikasi": "menunggu",
    "..."
  }
}
```

**Response Error:**

| Status | Pesan |
|---|---|
| 400 | `"Nomor polisi wajib diisi"` |
| 403 | `"PO belum terverifikasi atau tidak aktif"` |
| 409 | `"Nomor polisi sudah terdaftar untuk PO ini"` |
| 500 | Pesan error |

---

### PATCH `/api/po/armada/[id]`

Memperbarui data armada milik PO sendiri. Hanya field yang dikirim yang akan diubah.

- **Autentikasi:** Wajib login.
- **Role:** `po`.
- **Ownership:** Armada harus milik PO yang login.

**Path Parameter:** `id` — UUID armada.

**Request Body (opsional semua):**

```json
{
  "nomor_polisi": "B 5678 XYZ",
  "merk": "Mitsubishi",
  "status_operasional": "tidak_aktif"
}
```

**Response Sukses (200):**

```json
{ "data": { "...armada terupdate..." } }
```

**Response Error:**

| Status | Pesan |
|---|---|
| 400 | `"Tidak ada field yang diubah"` |
| 403 | `"Armada bukan milik PO ini"` |
| 404 | `"Armada tidak ditemukan"` |
| 409 | `"Nomor polisi sudah terdaftar untuk PO ini"` |

---

### DELETE `/api/po/armada/[id]`

Menghapus armada. PO hanya dapat menghapus armada miliknya yang **belum terverifikasi**. Staf-IW dan admin-terminal dapat menghapus armada apa pun.

- **Autentikasi:** Wajib login.
- **Role:** `po`, `staf-iw`, atau `admin-terminal`.

**Path Parameter:** `id` — UUID armada.

**Response Sukses (200):**

```json
{ "success": true }
```

**Response Error:**

| Status | Pesan |
|---|---|
| 400 | `"Armada yang sudah terverifikasi tidak dapat dihapus. Hubungi Staf IW."` |
| 403 | `"Armada bukan milik PO ini"` |
| 404 | `"Armada tidak ditemukan"` |

---

### POST `/api/po/armada/[id]/dokumen`

Mengunggah dokumen armada (STCK, KIR, Asuransi, atau Lainnya) ke storage bucket `armada-dokumen`.

- **Autentikasi:** Wajib login.
- **Role:** `po`.
- **Ownership:** Armada harus milik PO yang login.
- **Content-Type:** `multipart/form-data`.
- **Batasan:** PDF/JPEG/PNG/WebP, maksimal 5 MB.

**Path Parameter:** `id` — UUID armada.

**Form Data:**

| Field | Tipe | Wajib | Deskripsi |
|---|---|---|---|
| `file` | File | Ya | File dokumen (PDF/JPEG/PNG/WebP, maks 5 MB) |
| `jenis` | string | Ya | `stck` / `kir` / `asuransi` / `lainnya` |

**Response Sukses (201):**

```json
{
  "data": {
    "id": "uuid",
    "armada_id": "uuid",
    "jenis_dokumen": "kir",
    "file_path": "po-id/armada-id/kir-1234567890.pdf",
    "file_name": "kir-2026.pdf",
    "file_size": 102400,
    "mime_type": "application/pdf",
    "..."
  }
}
```

**Response Error:**

| Status | Pesan |
|---|---|
| 400 | `"File wajib diunggah"` / `"Jenis dokumen tidak valid"` / `"Tipe file tidak diizinkan..."` / `"Ukuran file maksimal 5 MB"` |
| 403 | `"Armada bukan milik PO ini"` |
| 404 | `"Armada tidak ditemukan"` |

---

### GET `/api/po/findings`

Mengambil daftar temuan (findings) milik PO yang sedang login, diurutkan berdasarkan terbaru (maks 200).

- **Autentikasi:** Wajib login.
- **Role:** `po`.

**Response Sukses (200):**

```json
{
  "data": [
    {
      "id": "uuid",
      "po_id": "uuid",
      "armada_id": "uuid|null",
      "nomor_polisi": "B 1234 ABC",
      "source_type": "rekonsiliasi",
      "judul": "IWKBU tidak patuh",
      "deskripsi": "...",
      "severity": "high",
      "status": "open",
      "po": { "kode_po": "PO-001", "nama_perusahaan": "..." },
      "armada": { "nomor_polisi": "...", "status_verifikasi": "..." },
      "finding_clarifications": [ { "...": "..." } ]
    }
  ]
}
```

---

### GET `/api/po/findings/[id]/actions`

Mengambil riwayat tindak lanjut (actions) pada sebuah temuan milik PO.

- **Autentikasi:** Wajib login.
- **Role:** `po`.
- **Ownership:** Temuan harus milik PO yang login.

**Path Parameter:** `id` — UUID finding.

**Response Sukses (200):**

```json
{
  "data": [
    {
      "id": "uuid",
      "finding_id": "uuid",
      "action_text": "Menghubungi PO untuk klarifikasi",
      "status": "done",
      "done_at": "2026-01-02T00:00:00.000Z",
      "done_by": "uuid",
      "created_by": "uuid",
      "created_at": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### POST `/api/po/findings/[id]/clarifications`

Mengirim klarifikasi/respons dari sisi PO terhadap sebuah temuan. Mendukung unggahan file bukti.

- **Autentikasi:** Wajib login.
- **Role:** `po`.
- **Content-Type:** `multipart/form-data`.

**Path Parameter:** `id` — UUID finding.

**Form Data:**

| Field | Tipe | Wajib | Deskripsi |
|---|---|---|---|
| `decision` | string | Ya | `menerima` / `menolak` / `melengkapi` |
| `message` | string | Ya | Pesan klarifikasi |
| `evidenceLink` | string | Tidak | URL bukti eksternal |
| `evidenceFile` | File | Tidak | File bukti (PDF/JPEG/PNG/WebP, maks 5 MB) |

**Response Sukses (201):**

```json
{
  "data": {
    "id": "uuid",
    "finding_id": "uuid",
    "responder_id": "uuid-po",
    "responder_role": "po",
    "decision": "melengkapi",
    "message": "Berikut dokumen pendukung",
    "evidence": { "link": "https://...", "file_path": "...", "file_name": "..." },
    "created_at": "2026-01-01T00:00:00.000Z"
  }
}
```

> Status finding otomatis berubah menjadi `on_progress` setelah klarifikasi dikirim.

**Response Error:**

| Status | Pesan |
|---|---|
| 400 | `"Keputusan klarifikasi tidak valid"` / `"Pesan klarifikasi wajib diisi"` |
| 404 | `"Temuan tidak ditemukan"` |
| 409 | `"Temuan sudah ditutup"` |

---

## 3. Staf-IW

### GET `/api/staf-iw/users`

Mengambil daftar semua pengguna beserta role mereka.

- **Autentikasi:** Wajib login.
- **Role:** `staf-iw`.

**Response Sukses (200):**

```json
{
  "data": [
    {
      "id": "uuid",
      "email": "user@terminal.go.id",
      "full_name": "Nama User",
      "is_active": true,
      "terminal_id": "uuid|null",
      "user_roles": [{ "role": { "id": "uuid", "name": "po" } }]
    }
  ]
}
```

---

### PATCH `/api/staf-iw/users/[id]`

Mengubah role pengguna. Melakukan insert role baru terlebih dahulu, kemudian menghapus role lama (atomic-safe untuk mencegah lockout).

- **Autentikasi:** Wajib login.
- **Role:** `staf-iw`.

**Path Parameter:** `id` — UUID user target.

**Request Body:**

```json
{
  "role": "po",
  "old_role": "loket"
}
```

| Field | Tipe | Wajib | Deskripsi |
|---|---|---|---|
| `role` | string | Ya | Role baru (`po`/`loket`/`admin-terminal`/`staf-iw`) |
| `old_role` | string | Tidak | Role lama (untuk logging) |

**Response Sukses (200):**

```json
{ "success": true }
```

**Response Error:**

| Status | Pesan |
|---|---|
| 400 | `"Role wajib diisi."` / `"Anda tidak dapat mengubah role akun sendiri."` / `"Role \"...\" tidak ditemukan."` |
| 404 | `"User tidak ditemukan."` |
| 500 | `"Terjadi kesalahan internal"` |

---

### PATCH `/api/staf-iw/po/[id]`

Mengedit data PO (kode PO, nama perusahaan, kontak, dll).

- **Autentikasi:** Wajib login.
- **Role:** `staf-iw` atau `admin-terminal`.

**Path Parameter:** `id` — UUID PO.

**Request Body (opsional semua):**

```json
{
  "kode_po": "PO-002",
  "nama_perusahaan": "PT Angkutan Jaya",
  "nama_pemilik": "Budi",
  "alamat": "Jl. ...",
  "telepon": "021...",
  "npwp": "01.000..."
}
```

**Response Sukses (200):**

```json
{ "data": { "...po terupdate..." } }
```

---

### POST `/api/staf-iw/po/[id]/verifikasi`

Memverifikasi atau menolak pendaftaran PO. Mengirim notifikasi realtime ke PO.

- **Autentikasi:** Wajib login.
- **Role:** `staf-iw` atau `admin-terminal`.

**Path Parameter:** `id` — UUID PO.

**Request Body:**

```json
{
  "status": "aktif",
  "keterangan": "Dokumen lengkap"
}
```

| Field | Tipe | Wajib | Deskripsi |
|---|---|---|---|
| `status` | string | Ya | `"aktif"` atau `"ditolak"` |
| `keterangan` | string | Tidak | Catatan verifikasi |

**Response Sukses (200):**

```json
{ "data": { "...po terupdate dengan status_verifikasi..." } }
```

---

### POST `/api/staf-iw/armada/[id]/verifikasi`

Memverifikasi atau menolak armada. Mengirim notifikasi realtime ke PO pemilik armada.

- **Autentikasi:** Wajib login.
- **Role:** `staf-iw` atau `admin-terminal`.

**Path Parameter:** `id` — UUID armada.

**Request Body:**

```json
{
  "status": "terverifikasi",
  "keterangan": "Dokumen STCK valid"
}
```

| Field | Tipe | Wajib | Deskripsi |
|---|---|---|---|
| `status` | string | Ya | `"terverifikasi"` atau `"ditolak"` |
| `keterangan` | string | Tidak | Catatan verifikasi |

**Response Sukses (200):**

```json
{ "data": { "...armada terupdate..." } }
```

---

### GET `/api/staf-iw/periode-rekonsiliasi`

Mengambil daftar semua periode rekonsiliasi.

- **Autentikasi:** Wajib login.
- **Role:** `staf-iw` atau `admin-terminal`.

**Response Sukses (200):**

```json
{
  "data": [
    {
      "id": "uuid",
      "nama_periode": "Q1 2026",
      "tanggal_mulai": "2026-01-01",
      "tanggal_selesai": "2026-03-31",
      "status": "aktif",
      "catatan": "...",
      "created_by": "uuid",
      "closed_at": null
    }
  ]
}
```

---

### POST `/api/staf-iw/periode-rekonsiliasi`

Membuat periode rekonsiliasi baru dengan status awal `draft`.

- **Autentikasi:** Wajib login.
- **Role:** `staf-iw` atau `admin-terminal`.

**Request Body:**

```json
{
  "nama_periode": "Q1 2026",
  "tanggal_mulai": "2026-01-01",
  "tanggal_selesai": "2026-03-31",
  "catatan": "Periode kuartal pertama"
}
```

| Field | Tipe | Wajib | Deskripsi |
|---|---|---|---|
| `nama_periode` | string | Ya | Nama periode |
| `tanggal_mulai` | string | Ya | Tanggal mulai (YYYY-MM-DD) |
| `tanggal_selesai` | string | Ya | Tanggal selesai (YYYY-MM-DD) |
| `catatan` | string | Tidak | Catatan tambahan |

**Response Sukses (201):**

```json
{ "data": { "...periode rekonsiliasi baru..." } }
```

---

### PATCH `/api/staf-iw/periode-rekonsiliasi/[id]`

Memperbarui periode rekonsiliasi. Mendukung perubahan status (`draft` → `aktif` → `ditutup`), nama, tanggal, dan catatan.

- **Autentikasi:** Wajib login.
- **Role:** `staf-iw` atau `admin-terminal`.

**Path Parameter:** `id` — UUID periode.

**Request Body (opsional semua):**

```json
{
  "status": "aktif",
  "nama_periode": "Q1 2026 Revisi",
  "catatan": "Diperbarui"
}
```

| Field | Tipe | Deskripsi |
|---|---|---|
| `status` | string | `"draft"` / `"aktif"` / `"ditutup"` (menutup akan set `closed_at`) |
| `nama_periode` | string | Nama periode |
| `tanggal_mulai` | string | Tanggal mulai |
| `tanggal_selesai` | string | Tanggal selesai |
| `catatan` | string | Catatan |

**Response Sukses (200):**

```json
{ "data": { "...periode terupdate..." } }
```

---

### DELETE `/api/staf-iw/periode-rekonsiliasi/[id]`

Menghapus periode rekonsiliasi. Hanya periode dengan status `draft` yang dapat dihapus.

- **Autentikasi:** Wajib login.
- **Role:** `staf-iw` atau `admin-terminal`.

**Path Parameter:** `id` — UUID periode.

**Response Sukses (200):**

```json
{ "success": true }
```

**Response Error:**

| Status | Pesan |
|---|---|
| 400 | `"Hanya periode dengan status draft yang dapat dihapus."` |
| 404 | `"Periode tidak ditemukan"` |

---

### GET `/api/staf-iw/findings`

Mengambil daftar semua temuan di sistem (maks 200), beserta data PO, armada, klarifikasi, dan tindakan terkait.

- **Autentikasi:** Wajib login.
- **Role:** `staf-iw` atau `admin-terminal`.

**Response Sukses (200):**

```json
{
  "data": [
    {
      "id": "uuid",
      "judul": "...",
      "severity": "high",
      "status": "open",
      "po": { "kode_po": "...", "nama_perusahaan": "..." },
      "armada": { "nomor_polisi": "..." },
      "finding_clarifications": [ ],
      "finding_actions": [ ]
    }
  ]
}
```

---

### POST `/api/staf-iw/findings`

Membuat temuan baru. Bisa dikaitkan dengan PO spesifik, armada spesifik, atau nomor polisi bebas.

- **Autentikasi:** Wajib login.
- **Role:** `staf-iw` atau `admin-terminal`.

**Request Body:**

```json
{
  "poId": "uuid-po",
  "armadaId": "uuid-armada",
  "nomorPolisi": "B 1234 ABC",
  "sourceType": "rekonsiliasi",
  "judul": "IWKBU Tidak Patuh",
  "deskripsi": "Armada belum melakukan pembayaran IWKBU",
  "severity": "high",
  "sourceDate": "2026-01-01",
  "dueDate": "2026-02-01"
}
```

| Field | Tipe | Wajib | Deskripsi |
|---|---|---|---|
| `poId` / `po_id` | string | Ya* | ID PO (*wajib jika tanpa armadaId) |
| `armadaId` / `armada_id` | string | Tidak | ID armada (jika diisi, poId & nomorPolisi di-resolve dari armada) |
| `nomorPolisi` / `nomor_polisi` | string | Ya | Nomor polisi |
| `sourceType` / `source_type` | string | Tidak | Default: `"rekonsiliasi"` |
| `judul` | string | Ya | Judul temuan |
| `deskripsi` | string | Ya | Deskripsi temuan |
| `severity` | string | Tidak | `"low"` / `"medium"` / `"high"` (default: `"medium"`) |
| `sourceDate` | string | Tidak | Tanggal sumber |
| `dueDate` | string | Tidak | Tenggat waktu |

**Response Sukses (201):**

```json
{ "data": { "...finding baru..." } }
```

---

### PATCH `/api/staf-iw/findings/[id]`

Memperbarui temuan (status, severity, judul, deskripsi, due date). Saat menutup temuan (`status: "closed"`), `resolutionNote` wajib diisi.

- **Autentikasi:** Wajib login.
- **Role:** `staf-iw` atau `admin-terminal`.

**Path Parameter:** `id` — UUID finding.

**Request Body (opsional semua):**

```json
{
  "status": "closed",
  "resolutionNote": "Sudah dilunasi",
  "severity": "medium",
  "judul": "Judul revisi",
  "deskripsi": "Deskripsi revisi",
  "dueDate": "2026-03-01"
}
```

| Field | Tipe | Deskripsi |
|---|---|---|
| `status` | string | `"open"` / `"on_progress"` / `"closed"` |
| `resolutionNote` | string | Catatan penyelesaian (wajib saat `status=closed`) |
| `severity` | string | `"low"` / `"medium"` / `"high"` |
| `judul` | string | Judul temuan |
| `deskripsi` | string | Deskripsi temuan |
| `dueDate` | string\|null | Tenggat waktu |

**Response Sukses (200):**

```json
{ "data": { "...finding terupdate..." } }
```

---

### POST `/api/staf-iw/findings/[id]/actions`

Menambahkan tindak lanjut baru pada sebuah temuan.

- **Autentikasi:** Wajib login.
- **Role:** `staf-iw` atau `admin-terminal`.

**Path Parameter:** `id` — UUID finding.

**Request Body:**

```json
{
  "actionText": "Menghubungi PO untuk klarifikasi"
}
```

| Field | Tipe | Wajib | Deskripsi |
|---|---|---|---|
| `actionText` | string | Ya | Teks tindak lanjut |

**Response Sukses (201):**

```json
{
  "data": {
    "id": "uuid",
    "finding_id": "uuid",
    "action_text": "...",
    "status": "open",
    "done_at": null,
    "done_by": null,
    "created_by": "uuid",
    "created_at": "2026-01-01T00:00:00.000Z"
  }
}
```

---

### PATCH `/api/staf-iw/findings/[id]/actions/[actionId]`

Mengubah status tindak lanjut menjadi `done` atau kembali ke `open`.

- **Autentikasi:** Wajib login.
- **Role:** `staf-iw` atau `admin-terminal`.

**Path Parameters:** `id` — UUID finding, `actionId` — UUID action.

**Request Body:**

```json
{
  "status": "done"
}
```

| Field | Tipe | Wajib | Deskripsi |
|---|---|---|---|
| `status` | string | Ya | `"open"` atau `"done"` |

**Response Sukses (200):**

```json
{ "data": { "...action terupdate..." } }
```

---

### POST `/api/staf-iw/findings/[id]/clarifications`

Mengirim klarifikasi dari sisi staf/admin terhadap sebuah temuan. Mendukung unggahan file bukti.

- **Autentikasi:** Wajib login.
- **Role:** `staf-iw` atau `admin-terminal`.
- **Content-Type:** `multipart/form-data`.

**Path Parameter:** `id` — UUID finding.

**Form Data:**

| Field | Tipe | Wajib | Deskripsi |
|---|---|---|---|
| `decision` | string | Ya | `menerima` / `menolak` / `melengkapi` |
| `message` | string | Ya | Pesan klarifikasi |
| `evidenceLink` | string | Tidak | URL bukti eksternal |
| `evidenceFile` | File | Tidak | File bukti (PDF/JPEG/PNG/WebP, maks 5 MB) |

**Response Sukses (201):**

```json
{
  "data": {
    "id": "uuid",
    "responder_role": "staf-iw",
    "decision": "menerima",
    "message": "...",
    "..."
  }
}
```

> Status finding otomatis berubah menjadi `on_progress` setelah klarifikasi dikirim.

---

### GET `/api/staf-iw/audit-trail`

Mengambil log aktivitas sistem dengan filter rentang tanggal, jenis aksi, paginasi, dan pencarian teks.

- **Autentikasi:** Wajib login.
- **Role:** `staf-iw`.

**Query Parameters:**

| Param | Tipe | Default | Deskripsi |
|---|---|---|---|
| `startDate` | string | 7 hari lalu | Format `YYYY-MM-DD` |
| `endDate` | string | Hari ini | Format `YYYY-MM-DD` |
| `aksi` | string | `"SEMUA"` | Filter berdasarkan jenis aksi (mis. `LOGIN`, `BUAT_ARMADA`, dll) |
| `limit` | number | 100 | Jumlah hasil per halaman (1–500) |
| `offset` | number | 0 | Offset paginasi |
| `q` / `search` | string | — | Pencarian teks (maks 100 karakter) |

**Response Sukses (200):**

```json
{
  "data": [
    {
      "id": "uuid",
      "user_name": "Nama User",
      "aksi": "LOGIN",
      "deskripsi": "Login berhasil sebagai staf-iw",
      "metadata": { "email": "...", "role": "..." },
      "created_at": "2026-01-01T00:00:00.000Z"
    }
  ],
  "hasMore": false
}
```

---

### GET `/api/staf-iw/iwkbu-source`

Mengambil daftar source record IWKBU yang telah diimport (maks 500).

- **Autentikasi:** Wajib login.
- **Role:** `staf-iw` atau `admin-terminal`.

**Response Sukses (200):**

```json
{
  "data": [
    {
      "id": "uuid",
      "external_ref": "plate:B1234ABC",
      "nomor_polisi": "B1234ABC",
      "compliance_status": "non_compliant",
      "issue_count": 3,
      "source_updated_at": "2026-01-01T00:00:00.000Z",
      "imported_at": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### POST `/api/staf-iw/iwkbu-source`

Mengimport source record IWKBU secara batch. Mendukung format JSON array, JSON dengan properti `records`, atau upload file CSV/JSON (multipart).

- **Autentikasi:** Wajib login.
- **Role:** `staf-iw` atau `admin-terminal`.
- **Batasan:** Maksimal 5.000 baris, ukuran body maksimal ~2 MB. Header `Content-Length` wajib untuk upload.

**Request Body (JSON):**

```json
{
  "records": [
    {
      "nomor_polisi": "B 1234 ABC",
      "compliance_status": "non_compliant",
      "issue_count": 2,
      "source_updated_at": "2026-01-15"
    }
  ]
}
```

Atau array langsung, atau `multipart/form-data` dengan field `file` (CSV/JSON).

**Field yang Dipetakan:**

| Field Sumber | Alias yang Dikenali |
|---|---|
| `nomor_polisi` | `nomorPolisi`, `nomor polisi`, `nopol` |
| `compliance_status` | `complianceStatus`, `status_iwkbu`, `status kepatuhan`, `status` |
| `issue_count` | `issueCount`, `jumlah_temuan` |
| `source_updated_at` | `sourceUpdatedAt`, `tanggal_update`, `updated_at` |
| `external_ref` | `externalRef`, `referensi` (default: `plate:<NORMALISASI>`) |

**Response Sukses (201):**

```json
{
  "message": "Source records berhasil di-upsert",
  "count": 150
}
```

**Response Error:**

| Status | Pesan |
|---|---|
| 400 | `"records wajib berupa array dan tidak boleh kosong"` / `"Jumlah record melebihi batas 5000 baris"` / `"Baris N: nomor_polisi wajib diisi"` / format file tidak valid, dll |

---

### GET `/api/staf-iw/iwkbu-sync`

Mengambil data dashboard sinkronisasi IWKBU (riwayat sync run, statistik).

- **Autentikasi:** Wajib login.
- **Role:** `staf-iw` atau `admin-terminal`.

**Response Sukses (200):**

```json
{
  "data": {
    "runs": [ ],
    "..."
  }
}
```

---

### POST `/api/staf-iw/iwkbu-sync`

Menjalankan sinkronisasi IWKBU secara manual (trigger type: `manual`).

- **Autentikasi:** Wajib login.
- **Role:** `staf-iw` atau `admin-terminal`.

**Response Sukses (201):**

```json
{
  "data": {
    "runId": "uuid",
    "..."
  }
}
```

---

### GET `/api/staf-iw/rekonsiliasi`

Mengambil data rekonsiliasi (perbandingan data armada dengan source record IWKBU).

- **Autentikasi:** Wajib login.
- **Role:** `staf-iw` atau `admin-terminal`.

**Response Sukses (200):**

```json
{
  "data": {
    "..."
  }
}
```

---

## 4. Admin

### GET `/api/admin/system-settings`

Mengambil semua pengaturan sistem, diurutkan berdasarkan kategori dan key.

- **Autentikasi:** Wajib login.
- **Role:** `staf-iw`.

**Response Sukses (200):**

```json
{
  "data": [
    { "id": "uuid", "category": "general", "key": "app_name", "value": "...", "..." }
  ]
}
```

---

### PUT `/api/admin/system-settings`

Memperbarui satu atau lebih pengaturan sistem secara batch.

- **Autentikasi:** Wajib login.
- **Role:** `staf-iw`.

**Request Body (array atau object dengan `items`):**

```json
[
  { "key": "app_name", "value": "Terminal App v2" },
  { "key": "max_armada", "value": "500" }
]
```

Atau:

```json
{
  "items": [
    { "key": "app_name", "value": "Terminal App v2" }
  ]
}
```

**Response Sukses (200):**

```json
{ "success": true, "updated": 2 }
```

---

### GET `/api/admin/terminals`

Mengambil daftar terminal. Admin-terminal hanya melihat terminalnya sendiri.

- **Autentikasi:** Wajib login.
- **Role:** `admin-terminal` atau `staf-iw`.

**Response Sukses (200):**

```json
{
  "data": [
    { "id": "uuid", "kode": "T-001", "nama": "Terminal Leuwi Panjang" }
  ]
}
```

---

### POST `/api/admin/terminals`

Membuat terminal baru.

- **Autentikasi:** Wajib login.
- **Role:** `staf-iw` (saja).

**Request Body:**

```json
{
  "kode": "T-002",
  "nama": "Terminal Cicaheum"
}
```

| Field | Tipe | Wajib | Deskripsi |
|---|---|---|---|
| `kode` | string | Ya | Kode terminal (di-uppercased) |
| `nama` | string | Ya | Nama terminal |

**Response Sukses (201):**

```json
{ "data": { "id": "uuid", "kode": "T-002", "nama": "Terminal Cicaheum" } }
```

---

### PATCH `/api/admin/terminals`

Memperbarui data terminal. Admin-terminal hanya bisa mengedit terminalnya sendiri.

- **Autentikasi:** Wajib login.
- **Role:** `admin-terminal` atau `staf-iw`.

**Request Body:**

```json
{
  "id": "uuid",
  "kode": "T-002",
  "nama": "Terminal Cicaheum Updated"
}
```

| Field | Tipe | Wajib | Deskripsi |
|---|---|---|---|
| `id` | string | Ya | ID terminal |
| `kode` | string | Ya | Kode terminal |
| `nama` | string | Ya | Nama terminal |

**Response Sukses (200):**

```json
{ "data": { "id": "uuid", "kode": "T-002", "nama": "..." } }
```

---

### DELETE `/api/admin/terminals?id={id}`

Menghapus terminal.

- **Autentikasi:** Wajib login.
- **Role:** `staf-iw` (saja).

**Query Parameter:** `id` — UUID terminal.

**Response Sukses (200):**

```json
{ "ok": true }
```

---

### GET `/api/admin/jenis-kendaraan`

Mengambil daftar jenis kendaraan, diurutkan berdasarkan `urutan`.

- **Autentikasi:** Wajib login (semua role).

**Response Sukses (200):**

```json
{
  "data": [
    { "id": "uuid", "nama": "Bus Besar", "kode": "BB", "urutan": 1, "is_active": true }
  ]
}
```

---

### POST `/api/admin/jenis-kendaraan`

Menambah jenis kendaraan baru.

- **Autentikasi:** Wajib login.
- **Role:** `staf-iw`.

**Request Body:**

```json
{
  "nama": "Bus Sedang",
  "kode": "BS",
  "keterangan": "Kapasitas 30-40",
  "urutan": 2,
  "is_active": true
}
```

| Field | Tipe | Wajib | Deskripsi |
|---|---|---|---|
| `nama` | string | Ya | Nama jenis |
| `kode` | string | Ya | Kode (di-uppercased) |
| `keterangan` | string | Tidak | Keterangan |
| `urutan` | number | Tidak | Urutan tampil (default: 0) |
| `is_active` | boolean | Tidak | Default: `true` |

**Response Sukses (201):**

```json
{ "data": { "...jenis kendaraan baru..." } }
```

---

### PATCH `/api/admin/jenis-kendaraan/[id]`

Memperbarui data jenis kendaraan.

- **Autentikasi:** Wajib login.
- **Role:** `staf-iw`.

**Path Parameter:** `id` — UUID jenis kendaraan.

**Request Body (opsional semua):**

```json
{
  "nama": "Bus Sedang Updated",
  "urutan": 3,
  "is_active": false
}
```

**Response Sukses (200):**

```json
{ "data": { "...jenis kendaraan terupdate..." } }
```

---

### DELETE `/api/admin/jenis-kendaraan/[id]`

Menghapus jenis kendaraan.

- **Autentikasi:** Wajib login.
- **Role:** `staf-iw`.

**Path Parameter:** `id` — UUID jenis kendaraan.

**Response Sukses (200):**

```json
{ "success": true }
```

---

### GET `/api/admin/petugas?terminal_id={id}`

Mengambil daftar akun loket (petugas) di sebuah terminal. Admin-terminal otomatis difilter ke terminalnya sendiri.

- **Autentikasi:** Wajib login.
- **Role:** `admin-terminal` atau `staf-iw`.

**Query Parameter:** `terminal_id` (opsional untuk admin-terminal, wajib untuk staf-iw).

**Response Sukses (200):**

```json
{
  "data": [
    {
      "id": "uuid",
      "email": "loket-xxx@terminal.local",
      "full_name": "Loket 1",
      "is_active": true,
      "terminal_id": "uuid",
      "created_at": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### POST `/api/admin/petugas`

Membuat akun loket baru. Jika email/password tidak diisi, akan di-generate otomatis.

- **Autentikasi:** Wajib login.
- **Role:** `admin-terminal` atau `staf-iw`.

**Request Body:**

```json
{
  "label": "Loket Pintu 1",
  "email": "loket1@terminal.go.id",
  "password": "Password123!",
  "terminal_id": "uuid-terminal"
}
```

| Field | Tipe | Wajib | Deskripsi |
|---|---|---|---|
| `label` | string | Ya | Nama device/loket |
| `email` | string | Tidak | Email (auto-generate jika kosong) |
| `password` | string | Tidak | Password min 8 karakter (auto-generate jika kosong) |
| `terminal_id` | string | Ya* | ID terminal (*wajib untuk staf-iw) |

**Response Sukses (200):**

```json
{
  "password": "Iw-abc123-def4",
  "user_id": "uuid"
}
```

> `password` akan `null` jika password diberikan oleh requester. Hanya muncul jika di-generate sistem.

---

### PATCH `/api/admin/petugas`

Memperbarui akun loket (nama, status aktif, reset password).

- **Autentikasi:** Wajib login.
- **Role:** `admin-terminal` atau `staf-iw`.

**Request Body:**

```json
{
  "id": "uuid-loket",
  "full_name": "Loket Updated",
  "is_active": false,
  "reset_password": true
}
```

| Field | Tipe | Wajib | Deskripsi |
|---|---|---|---|
| `id` | string | Ya | ID akun loket |
| `full_name` | string | Tidak | Nama baru |
| `is_active` | boolean | Tidak | Status aktif |
| `password` | string | Tidak | Password baru (min 8 karakter) |
| `reset_password` | boolean | Tidak | Jika `true`, generate password baru |

**Response Sukses (200):**

```json
{
  "data": { "...profile terupdate..." },
  "password": "Iw-xyz789-ab12"
}
```

> `password` hanya muncul jika di-generate sistem (reset atau baru). Jika tidak ada perubahan password, bernilai `null`.

---

### GET `/api/admin/petugas-terminal?terminal_id={id}`

Mengambil daftar petugas terminal (entitas PIN, bukan akun login). Admin-terminal otomatis difilter ke terminalnya sendiri.

- **Autentikasi:** Wajib login.
- **Role:** `admin-terminal` atau `staf-iw`.

**Query Parameter:** `terminal_id` (opsional untuk admin-terminal, wajib untuk staf-iw).

**Response Sukses (200):**

```json
{
  "data": [
    {
      "id": "uuid",
      "nama": "Petugas A",
      "is_active": true,
      "created_at": "2026-01-01T00:00:00.000Z",
      "updated_at": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### PATCH `/api/admin/petugas-terminal`

Mengaktifkan/menonaktifkan petugas terminal. Menonaktifkan juga akan menghapus sesi PIN yang aktif.

- **Autentikasi:** Wajib login.
- **Role:** `admin-terminal` atau `staf-iw`.

**Request Body:**

```json
{
  "id": "uuid-petugas",
  "is_active": false
}
```

| Field | Tipe | Wajib | Deskripsi |
|---|---|---|---|
| `id` | string | Ya | ID petugas terminal |
| `is_active` | boolean | Ya | Status aktif |

**Response Sukses (200):**

```json
{ "data": { "...petugas terupdate..." } }
```

---

### DELETE `/api/admin/petugas-terminal?id={id}`

Menghapus petugas terminal.

- **Autentikasi:** Wajib login.
- **Role:** `admin-terminal` atau `staf-iw`.

**Query Parameter:** `id` — UUID petugas terminal.

**Response Sukses (200):**

```json
{ "success": true }
```

---

### GET `/api/admin/reports/terminal`

Menghasilkan laporan terminal komprehensif (rekap harian, per PO, per petugas, per armada, per periode).

- **Autentikasi:** Wajib login.
- **Role:** `admin-terminal` atau `staf-iw`.

**Query Parameters:**

| Param | Tipe | Wajib | Deskripsi |
|---|---|---|---|
| `terminalId` | string | Ya* | ID terminal (*admin-terminal dibatasi ke terminalnya sendiri) |
| `startDate` | string | Ya | Tanggal mulai `YYYY-MM-DD` |
| `endDate` | string | Ya | Tanggal akhir `YYYY-MM-DD` |

> Rentang maksimal 62 hari.

**Response Sukses (200):**

```json
{
  "data": {
    "terminal_id": "uuid",
    "start_date": "2026-01-01",
    "end_date": "2026-01-07",
    "rows": [ ],
    "summary": {
      "total_masuk": 1500,
      "total_keluar": 1200,
      "masih_di_terminal": 300,
      "jumlah_po": 5,
      "jumlah_petugas": 3,
      "jumlah_armada": 50
    },
    "per_po": [ ],
    "per_petugas": [ ],
    "per_armada": [ ],
    "per_hari": [ ],
    "per_minggu": [ ],
    "per_bulan": [ ]
  }
}
```

**Response Error:**

| Status | Pesan |
|---|---|
| 400 | `"Tanggal laporan wajib berformat YYYY-MM-DD"` / `"Tanggal awal tidak boleh melebihi tanggal akhir"` / `"Rentang laporan maksimal 62 hari"` |

---

## 5. Sesi

### POST `/api/sesi/open`

Membuka sesi kerja baru untuk petugas loket. Tidak boleh ada sesi aktif sebelumnya.

- **Autentikasi:** Wajib login.
- **Role:** `loket`.
- **Prasyarat:** PIN session harus aktif (terverifikasi), terminal_id harus ada di profil.

**Request Body:** Tidak diperlukan.

**Response Sukses (200):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "petugas_id": "uuid",
    "terminal_id": "uuid",
    "waktu_mulai": "2026-01-01T00:00:00.000Z",
    "status": "aktif"
  }
}
```

**Response Error:**

| Status | Pesan |
|---|---|
| 400 | `"Petugas tidak terdaftar di terminal manapun"` |
| 403 | `"Forbidden"` / Pesan PIN session tidak valid |
| 409 | `"Sudah ada sesi aktif. Tutup sesi terlebih dahulu."` |

---

### POST `/api/sesi/close`

Menutup sesi kerja. Menghitung total transaksi masuk & keluar secara otomatis.

- **Autentikasi:** Wajib login.
- **Role:** `loket`.

**Request Body:**

```json
{
  "sesi_id": "uuid"
}
```

| Field | Tipe | Wajib | Deskripsi |
|---|---|---|---|
| `sesi_id` | string | Ya | ID sesi yang akan ditutup |

**Response Sukses (200):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "selesai",
    "waktu_selesai": "2026-01-01T08:00:00.000Z",
    "total_transaksi_masuk": 25,
    "total_transaksi_keluar": 20
  }
}
```

**Response Error:**

| Status | Pesan |
|---|---|
| 400 | `"sesi_id wajib diisi"` |
| 403 | `"Sesi bukan milik Anda"` / `"Forbidden"` |
| 404 | `"Sesi kerja tidak ditemukan"` |
| 409 | `"Sesi sudah ditutup sebelumnya"` |

---

## 6. Transaksi

### POST `/api/transaksi/masuk`

Mencatat kendaraan masuk terminal. Armada harus terverifikasi dan berstatus operasional aktif.

- **Autentikasi:** Wajib login.
- **Role:** `loket`.
- **Prasyarat:** Sesi kerja aktif + PIN session aktif.

**Request Body:**

```json
{
  "sesi_id": "uuid",
  "po_id": "uuid-po",
  "nomor_polisi": "B 1234 ABC"
}
```

| Field | Tipe | Wajib | Deskripsi |
|---|---|---|---|
| `sesi_id` | string | Ya | ID sesi aktif |
| `po_id` | string | Ya | ID PO pemilik armada |
| `nomor_polisi` | string | Ya | Nomor polisi armada |

**Response Sukses (200):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "sesi_id": "uuid",
    "petugas_id": "uuid",
    "armada_id": "uuid",
    "po_id": "uuid",
    "nomor_polisi": "B 1234 ABC",
    "waktu_masuk": "2026-01-01T00:00:00.000Z"
  }
}
```

**Response Error:**

| Status | Pesan |
|---|---|
| 400 | `"sesi_id, po_id, dan nomor_polisi wajib diisi"` |
| 403 | `"Forbidden"` / `"Sesi bukan milik Anda"` |
| 404 | `"Sesi kerja tidak ditemukan"` / `"Armada tidak ditemukan atau belum aktif"` |
| 409 | `"Tidak bisa mencatat transaksi: sesi kerja sudah ditutup"` |

---

### POST `/api/transaksi/keluar`

Mencatat kendaraan keluar terminal. Kendaraan harus sudah tercatat masuk dan belum keluar sebelumnya.

- **Autentikasi:** Wajib login.
- **Role:** `loket`.
- **Prasyarat:** Sesi kerja aktif + PIN session aktif.

**Request Body:**

```json
{
  "sesi_id": "uuid",
  "masuk_id": "uuid"
}
```

| Field | Tipe | Wajib | Deskripsi |
|---|---|---|---|
| `sesi_id` | string | Ya | ID sesi aktif |
| `masuk_id` | string | Ya | ID record kendaraan masuk |

**Response Sukses (200):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "masuk_id": "uuid",
    "sesi_id": "uuid",
    "petugas_id": "uuid",
    "waktu_keluar": "2026-01-01T02:00:00.000Z"
  }
}
```

**Response Error:**

| Status | Pesan |
|---|---|
| 400 | `"sesi_id dan masuk_id wajib diisi"` |
| 403 | `"Forbidden"` / `"Sesi bukan milik Anda"` |
| 404 | `"Sesi kerja tidak ditemukan"` / `"Data kendaraan masuk tidak valid"` |
| 409 | `"Kendaraan sudah tercatat keluar"` / `"Tidak bisa mencatat transaksi: sesi kerja sudah ditutup"` |

---

## 7. Cron

Endpoint cron untuk sinkronisasi IWKBU otomatis. Tidak memerlukan sesi pengguna — diotorisasi melalui Bearer token.

### POST `/api/cron/iwkbu-sync`

Menjalankan sinkronisasi IWKBU (trigger type: `scheduled`).

- **Autentikasi:** Bearer token `IWKBU_SYNC_CRON_SECRET` atau `CRON_SECRET`.
- **Otorisasi:** Timing-safe comparison via `crypto.timingSafeEqual()`.

**Header:**

```
Authorization: Bearer <IWKBU_SYNC_CRON_SECRET>
```

**Response Sukses (200):**

```json
{
  "data": {
    "runId": "uuid",
    "..."
  }
}
```

**Response Error:**

| Status | Pesan |
|---|---|
| 401 | `"Unauthorized"` |
| 500 | Pesan error |

---

### POST `/api/cron/iwkbu-fetch`

Melakukan fetch data kepatuhan IWKBU dari API eksternal (atau mock adaptor), menyimpannya ke `iwkbu_source_records`, lalu menjalankan sinkronisasi.

- **Autentikasi:** Bearer token `IWKBU_SYNC_CRON_SECRET` atau `CRON_SECRET`.

**Header:**

```
Authorization: Bearer <IWKBU_SYNC_CRON_SECRET>
```

**Response Sukses (200):**

```json
{
  "success": true,
  "source": "mock",
  "fetched": 150,
  "synced_at": "2026-01-01T00:00:00.000Z"
}
```

**Response Error:**

| Status | Pesan |
|---|---|
| 401 | `"Unauthorized"` |
| 500 | Pesan error |

---

## 8. Findings (Bukti/Evidence)

### GET `/api/findings/evidence?path={path}`

Menghasilkan signed URL (berlaku 60 detik) untuk mengunduh file bukti klarifikasi dari storage bucket `finding-evidence`.

- **Autentikasi:** Wajib login.
- **Role:** `po` (pemilik finding) atau `staf-iw`/`admin-terminal`.

**Query Parameter:**

| Param | Tipe | Wajib | Deskripsi |
|---|---|---|---|
| `path` | string | Ya | Path file di storage (format: `{findingId}/{timestamp}-{fileName}`) |

**Response Sukses (200):**

```json
{ "url": "https://...supabase.co/.../signed-url..." }
```

**Response Error:**

| Status | Pesan |
|---|---|
| 400 | `"Parameter path wajib diisi"` / `"Path tidak valid"` |
| 403 | `"Akses ditolak"` |
| 404 | `"File tidak ditemukan"` |
| 500 | `"Gagal membuat tautan unduhan"` |

> **Catatan keamanan:** Endpoint ini memverifikasi ownership finding sebelum memberikan akses. PO hanya bisa mengakses bukti dari finding miliknya. Path traversal (`..`) ditolak.

---

## 9. Profile

### PATCH `/api/profile`

Memperbarui profil pengguna yang sedang login (saat ini hanya `full_name`).

- **Autentikasi:** Wajib login.

**Request Body:**

```json
{
  "full_name": "Nama Lengkap Baru"
}
```

| Field | Tipe | Wajib | Deskripsi |
|---|---|---|---|
| `full_name` | string | Tidak | Nama lengkap (maks 255 karakter, bisa dikosongkan) |

**Response Sukses (200):**

```json
{ "success": true }
```

**Response Error:**

| Status | Pesan |
|---|---|
| 400 | `"Nama lengkap maksimal 255 karakter."` |
| 401 | `"Unauthorized"` |
| 500 | Pesan error |

---

## Rate Limiting

Sistem menggunakan rate limiter berbasis database (`rate_limit_buckets`) dengan dua implementasi:

| Modul | File | Fungsi |
|---|---|---|
| Rate limiter umum | `src/lib/auth/rate-limiter.ts` | Login, change-password, change-pin, forgot-password, reset-password |
| PIN rate limiter | `src/lib/auth/pin-rate-limiter.ts` | verify-pin |

**Konfigurasi rate limit:**

| Endpoint | Key | Batas |
|---|---|---|
| Login | `login:{IP}` | 10 percobaan / 15 menit |
| Change password | `change-pwd:{userId}` | 5 percobaan / 15 menit |
| Change PIN | `change-pin:{userId}` | 5 percobaan / 15 menit |
| Forgot password | `forgot-password:{IP}` | 5 percobaan / 15 menit |
| Reset password | `reset-pwd:{userId}` | 5 percobaan / 15 menit |
| Verify PIN | `{userId}` | Progresif dengan lockout |

---

## Audit Trail

Hampir semua endpoint yang melakukan perubahan data memanggil `logActivity()` untuk mencatat audit trail. Log dapat dilihat melalui `GET /api/staf-iw/audit-trail`.

Tipe aksi yang tercatat: `LOGIN`, `LOGOUT`, `UBAH_PASSWORD`, `SET_PIN`, `BUKA_SESI`, `TUTUP_SESI`, `INPUT_TRANSAKSI`, `BUAT_ARMADA`, `UPDATE_ARMADA`, `VERIFIKASI_ARMADA`, `EDIT_PO`, `VERIFIKASI_PO`, `BUAT_USER`, `UPDATE_USER`, `BUAT_TERMINAL`, `UPDATE_TERMINAL`, `HAPUS_TERMINAL`, `BUAT_JENIS_KENDARAAN`, `UPDATE_JENIS_KENDARAAN`, `HAPUS_JENIS_KENDARAAN`, `UPDATE_SETTINGS`, `IMPORT_IWKBU`, `JALANKAN_SYNC`, `BUAT_TEMUAN`, `UPDATE_TEMUAN`, `BUKA_ULANG_TEMUAN`, `KIRIM_KLARIFIKASI`, `TAMBAH_TINDAKAN`, `SELESAIKAN_TINDAKAN`, `PERIODE_REKONSILIASI`.
