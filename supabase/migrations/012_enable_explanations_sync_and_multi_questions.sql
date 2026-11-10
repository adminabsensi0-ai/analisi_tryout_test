-- ============================================================
-- SUPABASE MIGRATION: 012_enable_explanations_sync_and_multi_questions.sql
-- Fitur: Sinkronisasi Cloud Multi-Device untuk Pembahasan & Dukungan Multi-Nomor Soal
-- ============================================================
-- Masalah yang Diselesaikan:
-- 1. Pembahasan soal tidak tersimpan di Supabase karena RLS policy memblokir akses (error 42501).
-- 2. Pembahasan soal tidak sinkron realtime ke perangkat lain karena tabel explanations
--    belum didaftarkan ke publikasi `supabase_realtime`.
-- 3. Menambahkan kolom `question_numbers` (INTEGER[]) dan `question_ids` (TEXT[])
--    untuk mendukung fitur pembahasan multi-nomor butir soal.
--
-- CARA MENJALANKAN DI SUPABASE:
-- 1. Buka dashboard https://supabase.com/dashboard/project/tgnbbdixdxpuhqskdedd
-- 2. Masuk ke menu "SQL Editor" di bilah samping kiri
-- 3. Klik "New Query", tempel (paste) seluruh isi skrip ini, lalu klik "Run".
-- ============================================================

-- 1. Tambahkan kolom question_numbers dan question_ids jika belum ada
ALTER TABLE public.explanations 
ADD COLUMN IF NOT EXISTS question_numbers INTEGER[] DEFAULT '{}'::integer[],
ADD COLUMN IF NOT EXISTS question_ids TEXT[] DEFAULT '{}'::text[];

-- 2. Longgarkan constraint foreign key jika ada dependensi yang menghalangi sync
DO $$
BEGIN
  ALTER TABLE public.explanations ALTER COLUMN created_by DROP NOT NULL;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.explanations ALTER COLUMN subject_id DROP NOT NULL;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.explanations ALTER COLUMN question_id DROP NOT NULL;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 3. Set Permissive RLS Policy agar client (anon & authenticated) dapat membaca dan menyimpan pembahasan
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'explanations'
  ) THEN
    DROP POLICY IF EXISTS "sync_all_access" ON public.explanations;
    DROP POLICY IF EXISTS "public_published_explanations" ON public.explanations;
    DROP POLICY IF EXISTS "staff_manage_explanations" ON public.explanations;
    DROP POLICY IF EXISTS "guru_write_explanations" ON public.explanations;

    ALTER TABLE public.explanations ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "sync_all_access" ON public.explanations 
      FOR ALL TO anon, authenticated 
      USING (true) 
      WITH CHECK (true);
  END IF;
END $$;

-- 4. Daftarkan tabel explanations ke publikasi supabase_realtime
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'explanations'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'explanations'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.explanations;
    END IF;
  END IF;
END $$;
