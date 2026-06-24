# Use Case Sistem Terminal IWKBU

Dokumen ini mendeskripsikan use case utama pada Sistem Terminal IWKBU berdasarkan role, route, dan halaman aplikasi yang tersedia di project.

## Artefak Diagram

| Artefak | Lokasi |
| --- | --- |
| Source PlantUML | `docs/uml/use-case-terminal-iwkbu.puml` |
| Source Draw.io | `docs/uml/use-case-terminal-iwkbu.drawio` |
| Renderer | `uml-mcp` by `antoinebou12` |
| Format render | SVG via Kroki/PlantUML |

File Draw.io dibuat dalam beberapa halaman agar layout lebih rapi dan connector tidak saling menembus use case: `Overview`, `Detail Loket`, `Detail PO & Admin`, `Detail Staf IW`, dan `Detail Autentikasi`.

## Aktor

| Aktor | Deskripsi | Akses utama |
| --- | --- | --- |
| Perusahaan Otobus (PO) | Perusahaan yang mendaftarkan dan memantau data operasional armadanya. | Registrasi, dashboard PO, rekonsiliasi PO, temuan dan klarifikasi. |
| Petugas Loket | Pengguna operasional di terminal yang mencatat aktivitas kendaraan. | Verifikasi PIN, buka sesi, catat kendaraan masuk, catat kendaraan keluar, tutup sesi, riwayat transaksi. |
| Admin Terminal | Pengelola operasional pada terminal tertentu. | Dashboard terminal, petugas, master data terminal, rekap operasional, rekap sesi, laporan terminal. |
| Staf IW | Pengelola pusat yang melakukan pengawasan, rekonsiliasi, sinkronisasi IWKBU, dan pengelolaan data global. | Dashboard staf, akun terminal, rekonsiliasi, sinkronisasi, master data global, audit trail, temuan. |
| Scheduler Cron | Proses otomatis terjadwal yang menjalankan sinkronisasi data IWKBU. | Sinkronisasi otomatis data IWKBU. |

## Relasi Use Case

| Relasi | Keterangan |
| --- | --- |
| `Buka Sesi Kerja` include `Verifikasi PIN Petugas` | Petugas loket wajib memiliki sesi PIN valid sebelum membuka sesi kerja. |
| `Catat Kendaraan Masuk` include `Verifikasi PIN Petugas` | Pencatatan kendaraan masuk hanya dapat dilakukan oleh petugas dengan PIN valid. |
| `Catat Kendaraan Keluar` include `Verifikasi PIN Petugas` | Pencatatan kendaraan keluar hanya dapat dilakukan oleh petugas dengan PIN valid. |
| `Tutup Sesi Kerja` include `Verifikasi PIN Petugas` | Penutupan sesi kerja membutuhkan validasi petugas. |
| `Kelola Sinkronisasi IWKBU` include `Rekonsiliasi Data Sumber` | Sinkronisasi manual memperbarui data yang dipakai untuk rekonsiliasi. |
| `Sinkronisasi Otomatis Data IWKBU` include `Rekonsiliasi Data Sumber` | Sinkronisasi terjadwal juga memperbarui hasil rekonsiliasi. |
| `Kelola Temuan dan Klarifikasi` extend `Tanggapi Temuan dan Klarifikasi` | Staf IW dapat meninjau dan menindaklanjuti klarifikasi yang dikirim PO. |

## Daftar Use Case

| Kode | Use Case | Aktor | Tujuan |
| --- | --- | --- | --- |
| UC-01 | Registrasi PO | Perusahaan Otobus | Mendaftarkan perusahaan otobus agar dapat mengakses sistem. |
| UC-02 | Login | PO, Petugas Loket, Admin Terminal, Staf IW | Mengautentikasi pengguna berdasarkan akun dan role. |
| UC-03 | Lupa / Reset Password | PO, Petugas Loket, Admin Terminal, Staf IW | Memulihkan akses akun ketika pengguna lupa password. |
| UC-04 | Logout | PO, Petugas Loket, Admin Terminal, Staf IW | Mengakhiri sesi login pengguna. |
| UC-05 | Kelola Profil dan Kredensial | PO, Petugas Loket, Admin Terminal, Staf IW | Mengubah data profil, password, atau kredensial terkait pengguna. |
| UC-06 | Lihat Dashboard PO | PO | Menampilkan ringkasan data dan status yang relevan dengan PO. |
| UC-07 | Lihat Rekonsiliasi PO | PO | Melihat hasil rekonsiliasi data armada milik PO. |
| UC-08 | Tanggapi Temuan dan Klarifikasi | PO | Memberikan tanggapan atau klarifikasi atas temuan dari Staf IW. |
| UC-09 | Verifikasi PIN Petugas | Petugas Loket | Memastikan identitas petugas loket sebelum aktivitas operasional. |
| UC-10 | Buka Sesi Kerja | Petugas Loket | Membuka sesi kerja sebelum transaksi operasional dilakukan. |
| UC-11 | Catat Kendaraan Masuk | Petugas Loket | Mencatat kendaraan yang masuk ke terminal. |
| UC-12 | Catat Kendaraan Keluar | Petugas Loket | Mencatat kendaraan yang keluar dari terminal. |
| UC-13 | Tutup Sesi Kerja | Petugas Loket | Menutup sesi kerja setelah aktivitas loket selesai. |
| UC-14 | Lihat Riwayat Transaksi | Petugas Loket | Melihat riwayat transaksi kendaraan yang telah dicatat. |
| UC-15 | Lihat Dashboard Admin Terminal | Admin Terminal | Melihat ringkasan operasional pada terminal yang dikelola. |
| UC-16 | Kelola Petugas dan PIN | Admin Terminal | Mengelola data petugas loket dan PIN petugas pada terminal. |
| UC-17 | Kelola Master Data Terminal | Admin Terminal | Mengelola data dasar terminal yang berkaitan dengan operasional. |
| UC-18 | Rekap Operasional Terminal | Admin Terminal | Melihat rekap kendaraan dan aktivitas operasional terminal. |
| UC-19 | Rekap Sesi Kerja | Admin Terminal | Melihat rekap sesi kerja petugas loket. |
| UC-20 | Cetak Laporan Terminal | Admin Terminal | Membuat laporan terminal untuk kebutuhan pelaporan. |
| UC-21 | Lihat Dashboard Staf IW | Staf IW | Melihat ringkasan pengawasan dan status data IWKBU. |
| UC-22 | Kelola Akun Terminal | Staf IW | Mengelola akun loket dan PIN petugas untuk seluruh terminal. |
| UC-23 | Rekonsiliasi Data Sumber | Staf IW | Mencocokkan data sumber IWKBU dengan data operasional sistem. |
| UC-24 | Kelola Sinkronisasi IWKBU | Staf IW | Mengunggah data sumber, menjalankan sinkronisasi manual, dan memantau hasil sinkronisasi. |
| UC-25 | Kelola Master Data Global | Staf IW | Mengelola data master yang berlaku lintas terminal. |
| UC-26 | Pantau Audit Trail | Staf IW | Melihat jejak aktivitas sistem untuk kebutuhan pengawasan. |
| UC-27 | Kelola Temuan dan Klarifikasi | Staf IW | Membuat, memantau, dan menindaklanjuti temuan beserta klarifikasi. |
| UC-28 | Sinkronisasi Otomatis Data IWKBU | Scheduler Cron | Menjalankan proses sinkronisasi data IWKBU secara terjadwal. |

## Spesifikasi Ringkas Use Case

| Kode | Prasyarat | Alur Utama | Hasil |
| --- | --- | --- | --- |
| UC-01 | PO belum memiliki akun aktif. | PO mengisi data registrasi, sistem memvalidasi data, sistem menyimpan permohonan registrasi. | Data PO tersimpan dan dapat diproses sesuai kebijakan sistem. |
| UC-02 | Pengguna memiliki akun. | Pengguna mengisi email dan password, sistem memvalidasi kredensial, sistem mengarahkan pengguna ke dashboard sesuai role. | Pengguna masuk ke sistem sesuai hak akses. |
| UC-03 | Pengguna memiliki email terdaftar. | Pengguna meminta reset password, sistem mengirim tautan reset, pengguna membuat password baru. | Password pengguna diperbarui. |
| UC-04 | Pengguna sedang login. | Pengguna memilih logout, sistem menghapus sesi autentikasi. | Pengguna keluar dari sistem. |
| UC-05 | Pengguna sedang login. | Pengguna membuka profil, memperbarui data atau kredensial, sistem menyimpan perubahan. | Profil atau kredensial pengguna diperbarui. |
| UC-06 | PO sudah login. | PO membuka dashboard, sistem menampilkan ringkasan data PO. | PO mendapat informasi status terkini. |
| UC-07 | PO sudah login. | PO membuka rekonsiliasi, sistem menampilkan hasil pencocokan data armada PO. | PO mengetahui status rekonsiliasi armadanya. |
| UC-08 | PO memiliki temuan yang perlu ditanggapi. | PO membuka daftar temuan, mengirim klarifikasi atau bukti, sistem menyimpan tanggapan. | Klarifikasi PO tercatat untuk ditinjau. |
| UC-09 | Pengguna ber-role loket dan terhubung ke terminal. | Petugas memasukkan PIN, sistem memvalidasi PIN, sistem membuat sesi PIN jika valid. | Petugas dapat mengakses fungsi operasional loket. |
| UC-10 | Petugas memiliki sesi PIN valid. | Petugas membuka sesi kerja, sistem mencatat awal sesi. | Sesi kerja loket aktif. |
| UC-11 | Sesi kerja aktif dan PIN valid. | Petugas memasukkan data kendaraan masuk, sistem memvalidasi data, sistem menyimpan transaksi masuk. | Transaksi kendaraan masuk tercatat. |
| UC-12 | Sesi kerja aktif dan PIN valid. | Petugas memasukkan data kendaraan keluar, sistem memvalidasi data, sistem menyimpan transaksi keluar. | Transaksi kendaraan keluar tercatat. |
| UC-13 | Sesi kerja aktif dan PIN valid. | Petugas menutup sesi, sistem menghitung dan menyimpan ringkasan sesi. | Sesi kerja loket selesai. |
| UC-14 | Petugas sudah login. | Petugas membuka riwayat, sistem menampilkan transaksi sesuai terminal dan periode. | Riwayat transaksi dapat ditinjau. |
| UC-15 | Admin terminal sudah login dan memiliki terminal. | Admin membuka dashboard, sistem menampilkan ringkasan terminal. | Admin memperoleh gambaran operasional terminal. |
| UC-16 | Admin terminal sudah login. | Admin mengelola petugas dan PIN, sistem menyimpan perubahan. | Data petugas terminal dan PIN diperbarui. |
| UC-17 | Admin terminal sudah login. | Admin mengelola data dasar terminal, sistem menyimpan perubahan sesuai hak akses. | Master data terminal diperbarui. |
| UC-18 | Admin terminal sudah login. | Admin memilih periode rekap, sistem menampilkan data operasional terminal. | Rekap operasional tersedia. |
| UC-19 | Admin terminal sudah login. | Admin membuka rekap sesi, sistem menampilkan sesi kerja petugas. | Rekap sesi kerja tersedia. |
| UC-20 | Admin terminal sudah login. | Admin memilih parameter laporan, sistem menghasilkan laporan terminal. | Laporan terminal siap digunakan. |
| UC-21 | Staf IW sudah login. | Staf membuka dashboard, sistem menampilkan ringkasan pengawasan. | Staf mendapat informasi status pengawasan. |
| UC-22 | Staf IW sudah login. | Staf memilih terminal, mengelola akun loket dan PIN, sistem menyimpan perubahan. | Akun terminal dan PIN petugas diperbarui. |
| UC-23 | Data operasional atau data sumber tersedia. | Staf membuka rekonsiliasi, sistem mencocokkan data sumber dengan data operasional. | Status rekonsiliasi tersedia. |
| UC-24 | Staf IW sudah login. | Staf mengunggah data sumber atau menjalankan sinkronisasi manual, sistem memproses data dan menampilkan hasil. | Data IWKBU tersinkron dan hasil proses tercatat. |
| UC-25 | Staf IW sudah login. | Staf mengelola master data global, sistem memvalidasi dan menyimpan data. | Data master global diperbarui. |
| UC-26 | Staf IW sudah login. | Staf membuka audit trail, sistem menampilkan catatan aktivitas. | Riwayat aktivitas sistem dapat diaudit. |
| UC-27 | Staf IW sudah login. | Staf membuat atau meninjau temuan, sistem menyimpan tindak lanjut dan status klarifikasi. | Temuan dan klarifikasi terdokumentasi. |
| UC-28 | Secret cron valid dan jadwal berjalan. | Scheduler memanggil endpoint sinkronisasi, sistem memproses data IWKBU secara otomatis. | Data IWKBU tersinkron tanpa interaksi pengguna. |

## Batasan Sistem

Sistem menggunakan autentikasi Supabase dan role-based access control. Pengguna hanya dapat mengakses halaman sesuai role, sedangkan route API tetap memvalidasi autentikasi dan otorisasi pada masing-masing endpoint.

Petugas loket memiliki validasi tambahan berupa PIN session. Tanpa sesi PIN yang valid, petugas diarahkan ke halaman verifikasi PIN sebelum mengakses fungsi operasional loket.
