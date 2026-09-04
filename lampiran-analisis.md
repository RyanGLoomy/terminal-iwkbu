# Lampiran Analisis Masukan dan Keluaran

## C.2 Analisis Sistem Berjalan

### Analisis Masukan

Analisis masukan menjelaskan data yang masuk pada sistem IWKBU Terminal. Berikut rincian masukan sistem.

| | | |
| --- | --- | --- |
| 1). | Nama Masukan: | Data Kendaraan Masuk |
| | Fungsi: | Mencatat waktu dan identitas kendaraan yang memasuki area terminal. |
| | Media: | Formulir pencatatan pada halaman Loket Pencatatan. |
| | Format: | Input manual berupa pilihan PO, armada, nomor polisi, kondisi kendaraan, dan catatan tambahan. |
| | Hasil Analisis: | Pencatatan kendaraan masuk dilakukan oleh petugas loket secara langsung melalui formulir web. Setiap kendaraan tercatat dengan timestamp otomatis, sehingga data masuk lebih konsisten dan terstruktur dibandingkan pencatatan manual. |
| 2). | Nama Masukan: | Data Kendaraan Keluar |
| | Fungsi: | Mencatat waktu dan identitas kendaraan yang keluar dari area terminal. |
| | Media: | Formulir pencatatan pada halaman Loket Pencatatan. |
| | Format: | Input manual berupa pilihan kendaraan yang sedang berada di terminal (dropdown dari data masuk aktif). |
| | Hasil Analisis: | Pencatatan kendaraan keluar menggunakan data masuk sebagai acuan, sehingga petugas loket hanya memilih kendaraan yang sudah tercatat masuk. Mekanisme ini mengurangi kesalahan pencatatan dan memastikan setiap kendaraan keluar terhubung dengan data masuk yang sesuai. |
| 3). | Nama Masukan: | Data Armada PO |
| | Fungsi: | Mengelola data armada (kendaraan) milik Perusahaan Otobus (PO) yang terdaftar di terminal. |
| | Media: | Formulir "Tambah Armada Baru" pada halaman Dashboard PO. |
| | Format: | Input manual berupa nomor polisi, nomor lambung, merk/tipe kendaraan, tahun pembuatan, dan status operasional. |
| | Hasil Analisis: | PO mendaftarkan armada baru melalui formulir yang tersedia di dashboard. Data armada tersimpan dalam sistem dan menunggu verifikasi oleh Staf IW sebelum dapat digunakan untuk pencatatan operasional. Proses ini memastikan hanya armada terverifikasi yang menjadi sumber data rekonsiliasi. |
| 4). | Nama Masukan: | Data IWKBU Upload |
| | Fungsi: | Mengunggah data IWKBU dari sumber eksternal untuk digunakan sebagai data pembanding dalam rekonsiliasi. |
| | Media: | Halaman Sync IWKBU pada menu Staf IW. |
| | Format: | Upload file CSV/Excel yang berisi data IWKBU, kemudian sinkronisasi ke dalam database sistem. |
| | Hasil Analisis: | Staf IW mengunggah data IWKBU dari sumber eksternal (misalnya data dari Jasa Raharja). Data yang diunggah disinkronisasi ke dalam sistem dan digunakan sebagai acuan dalam proses rekonsiliasi terhadap data armada PO. Proses ini menjadi dasar identifikasi diskrepansi antara data IWKBU dan data operasional terminal. |
| 5). | Nama Masukan: | Temuan Rekonsiliasi |
| | Fungsi: | Mencatat temuan atau diskrepansi yang ditemukan dari hasil rekonsiliasi data. |
| | Media: | Formulir "Buat Temuan Baru" pada halaman Temuan Staf IW. |
| | Format: | Input manual berupa pilihan PO, armada, nomor polisi, severity (Tinggi/Sedang/Rendah), tanggal sumber, tenggat waktu, judul, dan deskripsi temuan. |
| | Hasil Analisis: | Staf IW membuat temuan baru ketika ditemukan ketidaksesuaian antara data IWKBU dan data operasional. Temuan tercatat dengan severity dan tenggat waktu, sehingga proses penanganan dapat diprioritaskan. Status temuan akan berubah seiring klarifikasi dari PO hingga mencapai status selesai. |
| 6). | Nama Masukan: | Klarifikasi PO |
| | Fungsi: | Memberikan respons atau klarifikasi dari PO terhadap temuan yang diajukan oleh Staf IW. |
| | Media: | Formulir "Kirim Klarifikasi" pada halaman detail temuan PO. |
| | Format: | Input berupa pilihan tindakan (Melengkapi Bukti / Menerima / Menolak), teks klarifikasi, tautan bukti pendukung, dan unggah file bukti. |
| | Hasil Analisis: | PO merespons temuan dengan memberikan klarifikasi berupa teks, tautan, atau bukti unggahan. Respons ini dicatat dalam alur percakapan temuan sehingga Staf IW dapat meninjau dan memutuskan langkah selanjutnya. Mekanisme ini memastikan setiap temuan memiliki jejak komunikasi yang transparan antara PO dan Staf IW. |

### Analisis Keluaran

Analisis keluaran menjelaskan informasi yang dihasilkan oleh sistem IWKBU Terminal. Berikut rincian keluaran sistem.

| | | |
| --- | --- | --- |
| 1). | Nama Keluaran: | Status Kepatuhan IWKBU |
| | Fungsi: | Menampilkan tingkat kepatuhan armada PO terhadap ketentuan IWKBU dalam bentuk visual (grafik donat) beserta ringkasan armada. |
| | Media: | Dashboard PO pada halaman utama. |
| | Format: | Tampilan grafik donat dengan persentase kepatuhan, ringkasan jumlah armada terverifikasi, menunggu verifikasi, dan temuan aktif. |
| | Hasil Analisis: | PO dapat melihat status kepatuhan armadanya secara visual melalui grafik donat pada dashboard. Informasi ini membantu PO memahami kondisi armada secara cepat: berapa yang sudah terverifikasi, berapa yang masih menunggu, dan berapa yang memiliki temuan aktif. Status kepatuhan menjadi indikator utama kesiapan armada untuk beroperasi. |
| 2). | Nama Keluaran: | Hasil Rekonsiliasi |
| | Fungsi: | Menampilkan hasil pemadanan data armada PO terhadap status verifikasi untuk memastikan data pembanding siap digunakan. |
| | Media: | Halaman Rekonsiliasi pada menu Staf IW. |
| | Format: | Tabel berisi kode PO, nama PO, jumlah armada, jumlah terverifikasi, jumlah menunggu, dan status (Siap / Perlu Perhatian). Dilengkapi dengan filter periode dan tombol ekspor XLSX/CSV. |
| | Hasil Analisis: | Staf IW dapat melihat ringkasan status rekonsiliasi untuk seluruh PO dalam satu tabel. Setiap PO ditampilkan jumlah armadanya, berapa yang sudah terverifikasi, dan berapa yang masih menunggu. Status "Siap" menandakan semua armada PO sudah terverifikasi, sedangkan "Perlu Perhatian" menandakan masih ada armada yang perlu ditindaklanjuti. Data ini menjadi dasar pengambilan keputusan dalam proses pengawasan. |
| 3). | Nama Keluaran: | Daftar Temuan |
| | Fungsi: | Menampilkan seluruh temuan rekonsiliasi beserta status, severity, dan progres klarifikasinya. |
| | Media: | Halaman Temuan pada menu Staf IW. |
| | Format: | Daftar card berisi judul temuan, nama PO, nomor polisi, severity, status (Terbuka / Dalam Proses / Selesai), keterangan progres, dan tanggal dibuat. Dilengkapi dengan filter status, periode, pencarian, dan tombol ekspor CSV/PDF. |
| | Hasil Analisis: | Staf IW dapat memantau seluruh temuan yang ada beserta progres penanganannya. Setiap temuan ditampilkan dalam bentuk card yang memuat informasi penting: siapa PO yang bersangkutan, severity temuan, dan status penanganan. Jumlah temuan tercatat sebanyak 562 dengan 228 masih terbuka, 1 dalam proses, dan 333 sudah selesai. Tampilan ini memudahkan Staf IW dalam memprioritaskan penanganan temuan. |
| 4). | Nama Keluaran: | Rekap Kendaraan Harian |
| | Fungsi: | Menampilkan rekapitulasi kendaraan masuk dan keluar per hari dalam satu tabel. |
| | Media: | Halaman Riwayat pada menu Loket. |
| | Format: | Tabel berisi nomor polisi, PO, armada, waktu masuk, waktu keluar, dan status. Dilengkapi dengan filter tanggal dan tombol ekspor CSV/XLSX. |
| | Hasil Analisis: | Petugas loket dapat melihat rekap seluruh kendaraan yang masuk dan keluar pada tanggal tertentu. Tabel ini menyajikan informasi waktu masuk dan waktu keluar setiap kendaraan, sehingga petugas dapat memverifikasi kelengkapan data pencatatan harian. Data rekap ini juga menjadi bahan laporan operasional harian terminal. |
| 5). | Nama Keluaran: | Laporan Ringkasan |
| | Fungsi: | Menyajikan ringkasan rekonsiliasi kepatuhan IWKBU lintas terminal dan PO, beserta daftar temuan untuk keperluan pelaporan dan ekspor. |
| | Media: | Halaman Laporan pada menu Staf IW. |
| | Format: | Tabel berisi kode PO, nama PO, nomor polisi, judul temuan, severity, status, dan tanggal dibuat. Dilengkapi dengan ringkasan jumlah PO aktif, armada terverifikasi, temuan terbuka, dan temuan selesai. Tersedia tombol ekspor XLSX/CSV. |
| | Hasil Analisis: | Staf IW memperoleh gambaran menyeluruh tentang kondisi kepatuhan IWKBU di seluruh terminal. Laporan ini menampilkan ringkasan statistik (21 PO aktif, 558 armada terverifikasi, 206 temuan terbuka, 294 temuan selesai) beserta detail temuan per PO. Laporan ini menjadi dokumen utama untuk keperluan audit, evaluasi, dan pengambilan keputusan oleh pimpinan. |
