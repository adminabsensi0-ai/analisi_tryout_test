-- ============================================================
-- SUPABASE MIGRATION: 006_create_school_profile_table.sql
-- Fitur: Sinkronisasi Informasi Profil Sekolah Antar-Perangkat
-- ============================================================
-- Mengatasi:
-- Perubahan "Informasi Sekolah" tidak terupdate di perangkat lain
-- karena belum ada tabel penampung school_profile di database Supabase.
--
-- CARA MENJALANKAN DI SUPABASE:
-- 1. Buka dashboard https://supabase.com/dashboard/project/tgnbbdixdxpuhqskdedd
-- 2. Masuk ke menu "SQL Editor" di bilah samping kiri
-- 3. Klik "New Query", tempel kode ini, lalu klik "Run".
-- ============================================================

-- 1. Buat Tabel school_profile
CREATE TABLE IF NOT EXISTS public.school_profile (
  id             VARCHAR(50) PRIMARY KEY DEFAULT 'default',
  name           VARCHAR(255) NOT NULL,
  sub_header     TEXT,
  address        TEXT,
  principal_name VARCHAR(255),
  principal_nip  VARCHAR(50),
  academic_year  VARCHAR(100),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Aktifkan RLS & Kebijakan Permissive untuk Sinkronisasi Multi-Device
ALTER TABLE public.school_profile ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sync_all_access" ON public.school_profile;
CREATE POLICY "sync_all_access" ON public.school_profile
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 3. Daftarkan ke Supabase Realtime Engine
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'school_profile'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.school_profile;
  END IF;

  ALTER TABLE public.school_profile REPLICA IDENTITY FULL;
END $$;
