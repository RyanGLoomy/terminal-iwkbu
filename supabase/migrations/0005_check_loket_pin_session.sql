-- ============================================================
-- RPC: check_loket_pin_session()
-- Menggantikan pengecekan service-role di middleware.
-- Memeriksa apakah user saat ini memiliki sesi PIN yang valid
-- dan aktif untuk terminal miliknya.
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_loket_pin_session()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM petugas_pin_sessions ps
    JOIN petugas_terminal pt ON pt.id = ps.petugas_terminal_id
    JOIN profiles p ON p.id = ps.user_id
    WHERE ps.user_id = auth.uid()
      AND ps.expires_at > now()
      AND pt.is_active = true
      AND pt.terminal_id = p.terminal_id
  );
$$;

REVOKE EXECUTE ON FUNCTION public.check_loket_pin_session() FROM anon;
GRANT EXECUTE ON FUNCTION public.check_loket_pin_session() TO authenticated;
