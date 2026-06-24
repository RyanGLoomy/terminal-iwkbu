-- ============================================================================
-- seed.sql
-- Data awal: definisi 4 role RBAC. Jalankan setelah 0001–0003.
-- ============================================================================

insert into roles (name, display_name, description) values
  ('po',             'Perusahaan Otobus', 'Operator PO — pemilik armada, melihat hasil rekonsiliasi, menanggapi temuan'),
  ('loket',          'Loket Terminal',     'Petugas loket — pencatatan kendaraan masuk/keluar'),
  ('admin-terminal', 'Admin Terminal',     'Admin terminal — pengawasan, rekap, manajemen akun terminal'),
  ('staf-iw',        'Staf IW',            'Staf Inspeksi Wajib — master data, rekonsiliasi, temuan, audit trail')
on conflict (name) do update
set display_name = excluded.display_name,
    description = excluded.description;

-- Settings default
insert into system_settings (key, value, description, category) values
  ('app_name',           'IWKBU Terminal',         'Nama aplikasi', 'general'),
  ('pin_session_hours',  '8',                       'Durasi sesi PIN petugas (jam)', 'operasional'),
  ('max_login_attempts', '10',                      'Maksimum percobaan login sebelum lockout', 'security')
on conflict (key) do update
set value = excluded.value,
    description = excluded.description,
    category = excluded.category;
