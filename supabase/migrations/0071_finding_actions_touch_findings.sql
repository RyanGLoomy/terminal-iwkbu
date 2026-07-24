-- 0071_finding_actions_touch_findings.sql
-- Realtime: tindak lanjut (finding_actions) dibuat/diselesaikan oleh Staf IW
-- sebelumnya TIDAK memengaruhi baris findings, sehingga channel Realtime
-- "findings" di sisi PO tidak ikut ke-trigger. Akibatnya PO tidak melihat
-- tindak lanjut baru/status-done secara live (endpoint /actions hanya menyentuh
-- tabel finding_actions). Trigger ini membump findings.updated_at pada setiap
-- INSERT/UPDATE/DELETE finding_actions agar channel existing (0065) mem-fire
-- refresh di sisi PO. Tabel findings sudah ada di publication supabase_realtime.
--
-- Catatan: update ini juga mem-fire fn_log_finding_changes (AFTER trigger pada
-- findings) -> menambah entri activity_logs. Itu can be expected (tindak lanjut
-- memang mengubah state temuan) dan tidak berbahaya.

CREATE OR REPLACE FUNCTION public.fn_touch_finding_on_action()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
   IF (TG_OP = 'DELETE') THEN
      UPDATE public.findings SET updated_at = now() WHERE id = OLD.finding_id;
      RETURN OLD;
   END IF;
   UPDATE public.findings SET updated_at = now() WHERE id = NEW.finding_id;
   RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_finding_actions_touch_findings ON public.finding_actions;
CREATE TRIGGER trg_finding_actions_touch_findings
  AFTER INSERT OR UPDATE OR DELETE ON public.finding_actions
  FOR EACH ROW EXECUTE FUNCTION public.fn_touch_finding_on_action();
