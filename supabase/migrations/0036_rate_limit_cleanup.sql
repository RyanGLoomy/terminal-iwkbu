-- 0036_rate_limit_cleanup.sql
--
-- M5: Jadwalkan pg_cron untuk membersihkan rate_limit_buckets yang expired.
--     Tanpa ini, tabel accumulate terus (tidak ada TTL/purge).
--     Job harian 04:00 UTC: hapus entry yang locked_until < now() - 1 day.
--     Aman bila project paused (cron tidak run, tapi tabel tidak grow saat pause).

-- Pastikan extension terinstall
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Grant usage pada cron schema ke authenticated (diperlukan untuk schedule)
-- Sebenarnya tidak diperlukan untuk service_role, tapi untuk completeness.
GRANT USAGE ON SCHEMA cron TO authenticated;

-- Unschedule jika sudah ada (idempotent)
SELECT cron.unschedule('cleanup-rate-limit-buckets') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cleanup-rate-limit-buckets'
);

-- Schedule: hapus entry expired setiap hari jam 04:00 UTC
SELECT cron.schedule(
  'cleanup-rate-limit-buckets',
  '0 4 * * *',
  $$
    DELETE FROM public.rate_limit_buckets
    WHERE locked_until IS NOT NULL
      AND locked_until < now() - interval '1 day'
  $$
);
