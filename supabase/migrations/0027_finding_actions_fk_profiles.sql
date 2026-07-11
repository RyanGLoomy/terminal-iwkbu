-- 0027_finding_actions_fk_profiles.sql
-- S2 (MEDIUM): finding_actions didefinisikan dua kali dengan target FK berbeda.
--   0000_05 (run pertama alphabetically): done_by/created_by -> auth.users(id)
--   0001: done_by/created_by -> profiles(id) ON DELETE SET NULL
-- Karena CREATE TABLE IF NOT EXISTS, tabel live mengikuti bentuk 0000_05
-- (auth.users). Ini tidak konsisten dengan findings.created_by -> profiles(id)
-- dan dengan system user (0021) yang ada di profiles, bukan auth.users.
--
-- Reconcile: arahkan ulang kedua FK ke profiles(id). Idempoten — DROP IF EXISTS
-- menangani kedua kemungkinan bentuk live. Nilai UUID cocok karena
-- profiles.id = auth.users.id (handle_new_user membuat profile dgn id sama).

ALTER TABLE public.finding_actions
  DROP CONSTRAINT IF EXISTS finding_actions_done_by_fkey,
  DROP CONSTRAINT IF EXISTS finding_actions_created_by_fkey;

ALTER TABLE public.finding_actions
  ADD CONSTRAINT finding_actions_done_by_fkey
    FOREIGN KEY (done_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD CONSTRAINT finding_actions_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
