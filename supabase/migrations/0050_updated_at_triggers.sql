-- 0050_updated_at_triggers.sql
--
-- L1: Tiga tabel punya kolom updated_at tetapi tidak ada BEFORE UPDATE
--     trigger yang menjaganya: petugas_terminal, rekonsiliasi_periode,
--     petugas_pin_sessions. Updates akan meninggalkan updated_at stale.
--     (rate_limit_buckets juga tidak punya, tetapi updated_at di-set
--     eksplisit di dalam record_rate_limit_attempt RPC -- tidak perlu trigger.)
--
-- touch_updated_at() sudah ada (didefinisikan di 0011_trigger_functions.sql).

DROP TRIGGER IF EXISTS trg_petugas_terminal_touch ON public.petugas_terminal;
CREATE TRIGGER trg_petugas_terminal_touch
  BEFORE UPDATE ON public.petugas_terminal
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_rekonsiliasi_periode_touch ON public.rekonsiliasi_periode;
CREATE TRIGGER trg_rekonsiliasi_periode_touch
  BEFORE UPDATE ON public.rekonsiliasi_periode
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_petugas_pin_sessions_touch ON public.petugas_pin_sessions;
CREATE TRIGGER trg_petugas_pin_sessions_touch
  BEFORE UPDATE ON public.petugas_pin_sessions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
