-- 0028_profiles_auth_users_fk.sql
-- S3 (MEDIUM): profiles.id tidak punya FK ke auth.users(id). Penghapusan user
-- auth langsung (admin API) meninggalkan profile yatim, dan cascade dari
-- auth.users tidak pernah menyala. Semua tabel anak (po, armada, findings,
-- sesi_petugas, ...) mereferensikan profiles(id), jadi yatim merambat.
--
-- NOT VALID: tidak memvalidasi baris eksisting (mungkin ada profile yatim
-- dari penghapusan admin API di masa lalu). Baris baru/diverifikasi nanti.
-- Jalankan `VALIDATE CONSTRAINT profiles_id_fkey_auth;` setelah pembersihan
-- yatim untuk menegakkan sepenuhnya.

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_id_fkey_auth
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
  NOT VALID;
