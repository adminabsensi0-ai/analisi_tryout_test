-- ============================================================
-- SUPABASE MIGRATION: 002_exam_packages.sql
-- Fitur: Wadah / Paket Ujian (Exam Events & Multi-Subject Management)
-- ============================================================
-- Cara Eksekusi di Supabase:
-- 1. Buka dashboard https://app.supabase.com -> Pilih Project Anda
-- 2. Masuk ke menu "SQL Editor" di bilah kiri
-- 3. Klik "New Query", paste seluruh kode di bawah ini, lalu klik "Run"
-- ============================================================

-- 1. EXTENSION UUID (JIKA BELUM ADA)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABEL WADAH / PAKET UJIAN UTAMA
CREATE TABLE IF NOT EXISTS exam_packages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code             VARCHAR(50) UNIQUE NOT NULL,
  title            VARCHAR(255) NOT NULL,
  assessment_type  VARCHAR(20) NOT NULL DEFAULT 'TRYOUT' CHECK (assessment_type IN ('TRYOUT', 'UH', 'PTS', 'PAS')),
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  target_grades    JSONB NOT NULL DEFAULT '[]'::jsonb,
  target_class_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  start_date       TIMESTAMPTZ NOT NULL,
  end_date         TIMESTAMPTZ NOT NULL,
  status           VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
                     CHECK (status IN ('DRAFT', 'ACTIVE', 'COMPLETED', 'CLOSED', 'ARCHIVED')),
  description      TEXT,
  created_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_exam_packages_code ON exam_packages (code);
CREATE INDEX IF NOT EXISTS idx_exam_packages_status ON exam_packages (status);
CREATE INDEX IF NOT EXISTS idx_exam_packages_ay ON exam_packages (academic_year_id);

-- 3. TABEL SLOT MAPEL DI DALAM WADAH / PAKET
CREATE TABLE IF NOT EXISTS exam_package_subjects (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id       UUID NOT NULL REFERENCES exam_packages(id) ON DELETE CASCADE,
  subject_id       UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id       UUID REFERENCES teachers(id) ON DELETE SET NULL,
  google_form_url  TEXT,
  google_sheet_url TEXT,
  answer_key       JSONB DEFAULT '[]'::jsonb,
  total_questions  INT NOT NULL DEFAULT 40,
  duration_minutes INT NOT NULL DEFAULT 60,
  passing_grade    NUMERIC(5,2) NOT NULL DEFAULT 75.00,
  sync_status      VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (sync_status IN ('SYNCED', 'PENDING', 'ERROR')),
  last_updated_by  VARCHAR(255),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (package_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_exam_package_subjects_pkg ON exam_package_subjects (package_id);
CREATE INDEX IF NOT EXISTS idx_exam_package_subjects_sub ON exam_package_subjects (subject_id);

-- 4. MIGRASI KOLOM TAMBAHAN PADA TABEL TRYOUTS EKSISTING
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tryouts' AND column_name = 'package_id'
  ) THEN
    ALTER TABLE tryouts ADD COLUMN package_id UUID REFERENCES exam_packages(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tryouts' AND column_name = 'target_class_ids'
  ) THEN
    ALTER TABLE tryouts ADD COLUMN target_class_ids JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- 5. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE exam_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_package_subjects ENABLE ROW LEVEL SECURITY;

-- 6. RLS POLICIES (KEBIJAKAN HAK AKSES)
DROP POLICY IF EXISTS "public_read_exam_packages" ON exam_packages;
CREATE POLICY "public_read_exam_packages" ON exam_packages
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "public_read_exam_package_subjects" ON exam_package_subjects;
CREATE POLICY "public_read_exam_package_subjects" ON exam_package_subjects
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "admin_manage_exam_packages" ON exam_packages;
CREATE POLICY "admin_manage_exam_packages" ON exam_packages
  FOR ALL USING (
    auth.role() = 'service_role' OR
    (SELECT role FROM users WHERE id = auth.uid()) = 'ADMIN'
  );

DROP POLICY IF EXISTS "admin_guru_manage_package_subjects" ON exam_package_subjects;
CREATE POLICY "admin_guru_manage_package_subjects" ON exam_package_subjects
  FOR ALL USING (
    auth.role() = 'service_role' OR
    (SELECT role FROM users WHERE id = auth.uid()) IN ('ADMIN', 'GURU')
  );
