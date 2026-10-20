-- ============================================================
-- SUPABASE MIGRATION: 005_enable_realtime_and_sync_rls.sql
-- Fitur: Membuka Akses Sinkronisasi Cloud Multi-Device & Mengaktifkan Supabase Realtime
-- ============================================================
-- Masalah yang Diselesaikan:
-- 1. Error RLS (42501): "new row violates row-level security policy"
--    karena aplikasi menggunakan autentikasi aplikasi internal (bukan auth.users).
-- 2. Realtime WebSocket tidak aktif karena tabel belum dimasukkan
--    ke dalam publikasi `supabase_realtime`.
-- 3. Menambahkan UNIQUE constraint pada classes(name, academic_year_id)
--    agar upsert data kelas berjalan mulus.
--
-- CARA MENJALANKAN DI SUPABASE:
-- 1. Buka dashboard https://supabase.com/dashboard/project/tgnbbdixdxpuhqskdedd
-- 2. Masuk ke menu "SQL Editor" di bilah samping kiri
-- 3. Klik "New Query", tempel (paste) seluruh isi skrip ini, lalu klik "Run".
-- ============================================================

-- ============================================================
-- LANGKAH 1: Constraint Helpers
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_classes_name_ay'
  ) THEN
    ALTER TABLE public.classes ADD CONSTRAINT uq_classes_name_ay UNIQUE (name, academic_year_id);
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL; -- Lanjutkan jika constraint sudah ada atau struktur berbeda
END $$;

-- ============================================================
-- LANGKAH 2: Set Permissive RLS Policies untuk Sinkronisasi Multi-Device
-- ============================================================
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'users', 'teachers', 'students', 'classes', 'subjects', 'academic_years',
    'exam_packages', 'exam_package_subjects', 'tryouts', 'tryout_subjects',
    'questions', 'tryout_questions', 'responses', 'answers', 'scores', 'audit_logs'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      -- Hapus policy lama yang membatasi akses sync
      EXECUTE format('DROP POLICY IF EXISTS "sync_all_access" ON public.%I', tbl);
      EXECUTE format('DROP POLICY IF EXISTS "admin_full_access" ON public.%I', tbl);
      EXECUTE format('DROP POLICY IF EXISTS "admin_all_access" ON public.%I', tbl);
      EXECUTE format('DROP POLICY IF EXISTS "anon_read_all" ON public.%I', tbl);
      EXECUTE format('DROP POLICY IF EXISTS "users_read_own" ON public.%I', tbl);
      EXECUTE format('DROP POLICY IF EXISTS "users_insert_own" ON public.%I', tbl);
      EXECUTE format('DROP POLICY IF EXISTS "authenticated_read_teachers" ON public.%I', tbl);
      EXECUTE format('DROP POLICY IF EXISTS "public_read_exam_packages" ON public.%I', tbl);
      EXECUTE format('DROP POLICY IF EXISTS "public_read_exam_package_subjects" ON public.%I', tbl);
      EXECUTE format('DROP POLICY IF EXISTS "admin_manage_exam_packages" ON public.%I', tbl);
      EXECUTE format('DROP POLICY IF EXISTS "admin_guru_manage_package_subjects" ON public.%I', tbl);

      -- Aktifkan RLS dan pasang policy permissive untuk client sync (anon & authenticated)
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
      EXECUTE format('CREATE POLICY "sync_all_access" ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)', tbl);
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- LANGKAH 3: Daftarkan Tabel ke Supabase Realtime Publication
-- ============================================================
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'users', 'teachers', 'students', 'classes', 'subjects', 'academic_years',
    'exam_packages', 'exam_package_subjects', 'tryouts', 'tryout_subjects',
    'scores'
  ];
BEGIN
  -- Pastikan publication supabase_realtime ada
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  FOREACH tbl IN ARRAY tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      -- Cek apakah tabel sudah terdaftar di publication
      IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = tbl
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
      END IF;

      -- Set REPLICA IDENTITY FULL agar payload realtime mengirim old and new record lengkap
      EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', tbl);
    END IF;
  END LOOP;
END $$;
