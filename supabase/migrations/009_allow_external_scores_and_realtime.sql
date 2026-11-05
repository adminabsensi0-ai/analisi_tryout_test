-- ============================================================
-- 009: Allow External Scores, Complete Realtime Publication & Full Sync RLS
-- ============================================================

-- 1. Buat response_id di scores nullable agar Try Out Eksternal dapat disimpan langsung
DO $$
BEGIN
  ALTER TABLE public.scores ALTER COLUMN response_id DROP NOT NULL;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- 2. Buat material_id dan competency_id di questions nullable
-- agar butir soal dari Google Form dapat langsung diimpor tanpa dependensi paksa
DO $$
BEGIN
  ALTER TABLE public.questions ALTER COLUMN material_id DROP NOT NULL;
  ALTER TABLE public.questions ALTER COLUMN competency_id DROP NOT NULL;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- 3. Pastikan kolom metadata di tryouts tersedia
ALTER TABLE public.tryouts 
ADD COLUMN IF NOT EXISTS selected_question_columns JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS answer_key JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_external BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'INTERNAL',
ADD COLUMN IF NOT EXISTS external_subjects JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS external_subject_ids JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS external_score_scale VARCHAR(50) DEFAULT 'SCALE_100';

-- 4. RLS Permissive untuk seluruh tabel sinkronisasi cloud
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'users', 'teachers', 'students', 'classes', 'subjects', 'academic_years',
    'exam_packages', 'exam_package_subjects', 'tryouts', 'tryout_subjects',
    'questions', 'answers', 'materials', 'competencies', 'responses', 'scores', 'school_profile', 'audit_logs'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      EXECUTE format('DROP POLICY IF EXISTS "sync_all_access" ON public.%I', tbl);
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
      EXECUTE format('CREATE POLICY "sync_all_access" ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)', tbl);
    END IF;
  END LOOP;
END $$;

-- 5. Daftarkan seluruh tabel ke publikasi supabase_realtime
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'users', 'teachers', 'students', 'classes', 'subjects', 'academic_years',
    'exam_packages', 'exam_package_subjects', 'tryouts', 'tryout_subjects',
    'responses', 'scores', 'questions', 'answers', 'materials', 'competencies', 'school_profile'
  ];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  FOREACH tbl IN ARRAY tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = tbl
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
      END IF;

      EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', tbl);
    END IF;
  END LOOP;
END $$;
