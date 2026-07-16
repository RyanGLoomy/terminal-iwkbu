-- ============================================================================
-- 0041_rls_initplan_wrap.sql
--
-- M1 (MEDIUM): 68 policy RLS memanggil auth.uid() tanpa subselect, sehingga
-- Postgres mengevaluasi ulang per baris, bukan sekali per query (initplan).
--
-- Fix: bungkus setiap auth.uid() → (select auth.uid()). Ini memberitahu
-- Postgres untuk men-cache hasil sebagai initplan (sekali per query).
--
-- Pendekatan: DO block yang iterasi semua policy di schema public yang
-- mengandung auth.uid() di qual atau with_check, lalu DROP + CREATE dengan
-- versi yang sama persis kecuali auth.uid() → (select auth.uid()).
-- ============================================================================

DO $$
DECLARE
  r record;
  v_qual text;
  v_check text;
  v_roles text;
  v_sql text;
BEGIN
  FOR r IN
    SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (qual ILIKE '%auth.uid()%' OR with_check ILIKE '%auth.uid()%')
    ORDER BY tablename, cmd, policyname
  LOOP
    -- Transformasi: auth.uid() → (select auth.uid())
    v_qual  := replace(r.qual, 'auth.uid()', '(select auth.uid())');
    v_check := replace(r.with_check, 'auth.uid()', '(select auth.uid())');

    -- Roles: array_to_string('{public}', ', ') → 'public'
    v_roles := array_to_string(r.roles, ', ');

    -- DROP existing
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);

    -- BUILD CREATE
    v_sql := format('CREATE POLICY %I ON public.%I', r.policyname, r.tablename);

    IF r.permissive = 'RESTRICTIVE' THEN
      v_sql := v_sql || ' AS RESTRICTIVE';
    END IF;

    v_sql := v_sql || format(' FOR %s TO %s', lower(r.cmd), v_roles);

    IF r.qual IS NOT NULL THEN
      v_sql := v_sql || format(' USING (%s)', v_qual);
    END IF;

    IF r.with_check IS NOT NULL THEN
      v_sql := v_sql || format(' WITH CHECK (%s)', v_check);
    END IF;

    EXECUTE v_sql;

    RAISE NOTICE 'Wrapped auth.uid() in %.% (%)', r.tablename, r.policyname, r.cmd;
  END LOOP;
END;
$$;
