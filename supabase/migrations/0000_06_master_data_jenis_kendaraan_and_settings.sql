-- Captured from live Supabase migration: master_data_jenis_kendaraan_and_settings (20260622101925)

-- ============================================================
-- 1. Jenis Kendaraan master table
-- ============================================================
CREATE TABLE public.jenis_kendaraan (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nama        varchar NOT NULL UNIQUE,
    kode        varchar NOT NULL UNIQUE,
    keterangan  text,
    urutan      integer NOT NULL DEFAULT 0,
    is_active   boolean NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.jenis_kendaraan ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read
CREATE POLICY "jenis_kendaraan_read"
    ON public.jenis_kendaraan
    FOR SELECT TO authenticated
    USING (true);

-- Only staf-iw can write
CREATE POLICY "jenis_kendaraan_write"
    ON public.jenis_kendaraan
    FOR ALL TO authenticated
    USING (is_staf_iw(auth.uid()))
    WITH CHECK (is_staf_iw(auth.uid()));

-- Seed data
INSERT INTO public.jenis_kendaraan (nama, kode, urutan) VALUES
    ('Bus Besar',    'BUS_BESAR',   1),
    ('Bus Sedang',   'BUS_SEDANG',  2),
    ('Minibus',      'MINIBUS',     3),
    ('Microbus',     'MICROBUS',    4);

-- ============================================================
-- 2. System Settings key-value config table
-- ============================================================
CREATE TABLE public.system_settings (
    key         text PRIMARY KEY,
    value       text NOT NULL,
    description text,
    category    varchar NOT NULL DEFAULT 'general',
    updated_at  timestamptz NOT NULL DEFAULT now(),
    updated_by  uuid REFERENCES auth.users(id)
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read
CREATE POLICY "system_settings_read"
    ON public.system_settings
    FOR SELECT TO authenticated
    USING (true);

-- Only staf-iw can write
CREATE POLICY "system_settings_write"
    ON public.system_settings
    FOR ALL TO authenticated
    USING (is_staf_iw(auth.uid()))
    WITH CHECK (is_staf_iw(auth.uid()));

-- Seed data
INSERT INTO public.system_settings (key, value, description, category) VALUES
    ('app_name',              'Terminal IWKBU', 'Nama aplikasi yang ditampilkan',     'general'),
    ('pin_max_attempts',      '5',              'Maksimum percobaan PIN sebelum lockout', 'security'),
    ('pin_lockout_minutes',   '15',             'Durasi lockout PIN dalam menit',      'security'),
    ('sync_auto_enabled',     'false',          'Aktifkan sinkronisasi IWKBU otomatis', 'sync');

-- ============================================================
-- 3. updated_at triggers
-- ============================================================
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_jenis_kendaraan_touch
    BEFORE UPDATE ON public.jenis_kendaraan
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_system_settings_touch
    BEFORE UPDATE ON public.system_settings
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
