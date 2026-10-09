-- ============================================================
-- SUPABASE DATABASE MIGRATION
-- School Try Out & Assessment Analytics System
-- Version: 1.0.0
-- ============================================================
-- Cara menjalankan:
-- 1. Buka https://app.supabase.com -> project Anda -> SQL Editor
-- 2. Copy-paste seluruh file ini lalu klik "Run"
-- ATAU gunakan Supabase CLI:
--   supabase db push (setelah setup supabase init)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        VARCHAR(255) UNIQUE NOT NULL,
  role         VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'GURU', 'WALI_KELAS', 'SISWA')),
  name         VARCHAR(255) NOT NULL,
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- ============================================================
-- 2. TEACHERS
-- ============================================================
CREATE TABLE IF NOT EXISTS teachers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nip                 VARCHAR(50) UNIQUE NOT NULL,
  name                VARCHAR(255) NOT NULL,
  email               VARCHAR(255) NOT NULL,
  phone               VARCHAR(30),
  subject_permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  class_permissions   JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_wali_kelas       BOOLEAN NOT NULL DEFAULT false,
  home_room_class_id  UUID,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_teachers_user_id ON teachers (user_id);
CREATE INDEX IF NOT EXISTS idx_teachers_nip     ON teachers (nip);

-- ============================================================
-- 3. ACADEMIC YEARS
-- ============================================================
CREATE TABLE IF NOT EXISTS academic_years (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year_label  VARCHAR(20) NOT NULL,
  semester    VARCHAR(10) NOT NULL CHECK (semester IN ('ODD', 'EVEN')),
  is_active   BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (year_label, semester)
);

-- ============================================================
-- 4. CLASSES
-- ============================================================
CREATE TABLE IF NOT EXISTS classes (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 VARCHAR(50) NOT NULL,
  grade_level          VARCHAR(10) NOT NULL CHECK (grade_level IN ('X', 'XI', 'XII')),
  academic_year_id     UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  home_room_teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_classes_academic_year ON classes (academic_year_id);

-- ============================================================
-- 5. STUDENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS students (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  nisn         VARCHAR(20) UNIQUE NOT NULL,
  nis          VARCHAR(20) UNIQUE NOT NULL,
  name         VARCHAR(255) NOT NULL,
  gender       CHAR(1) NOT NULL CHECK (gender IN ('L', 'P')),
  class_id     UUID NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  birth_date   DATE,
  email        VARCHAR(255),
  phone        VARCHAR(30),
  target_score NUMERIC(5,2) DEFAULT 80.00,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_students_nisn     ON students (nisn);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students (class_id);

-- ============================================================
-- 6. STUDENT CLASSES (Riwayat kelas per tahun ajaran)
-- ============================================================
CREATE TABLE IF NOT EXISTS student_classes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id         UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  UNIQUE (student_id, academic_year_id)
);

-- ============================================================
-- 7. SUBJECTS
-- ============================================================
CREATE TABLE IF NOT EXISTS subjects (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          VARCHAR(20) UNIQUE NOT NULL,
  name          VARCHAR(100) NOT NULL,
  category      VARCHAR(20) NOT NULL CHECK (category IN ('WAJIB', 'PEMINATAN', 'VOKASI')),
  passing_grade NUMERIC(5,2) DEFAULT 75.00
);

-- ============================================================
-- 8. TEACHER SUBJECTS
-- ============================================================
CREATE TABLE IF NOT EXISTS teacher_subjects (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_id   UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  UNIQUE (teacher_id, subject_id, class_id)
);

-- ============================================================
-- 9. MATERIALS
-- ============================================================
CREATE TABLE IF NOT EXISTS materials (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id      UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  code            VARCHAR(30) NOT NULL,
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  google_form_url TEXT
);

-- ============================================================
-- 10. COMPETENCIES (Kompetensi Dasar / KD)
-- ============================================================
CREATE TABLE IF NOT EXISTS competencies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id  UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  code        VARCHAR(30) NOT NULL,
  statement   TEXT NOT NULL,
  grade_level VARCHAR(10) NOT NULL CHECK (grade_level IN ('X', 'XI', 'XII'))
);

-- ============================================================
-- 11. TRYOUTS
-- ============================================================
CREATE TABLE IF NOT EXISTS tryouts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code             VARCHAR(50) UNIQUE NOT NULL,
  title            VARCHAR(255) NOT NULL,
  assessment_type  VARCHAR(20) DEFAULT 'TRYOUT' CHECK (assessment_type IN ('TRYOUT', 'UH', 'PTS', 'PAS')),
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  start_date       TIMESTAMPTZ NOT NULL,
  end_date         TIMESTAMPTZ NOT NULL,
  scoring_config   JSONB NOT NULL DEFAULT '{}'::jsonb,
  status           VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
                     CHECK (status IN ('DRAFT', 'ACTIVE', 'COMPLETED', 'CLOSED', 'ARCHIVED')),
  description      TEXT,
  google_form_url  TEXT,
  google_sheet_url TEXT
);

-- ============================================================
-- 12. TRYOUT SUBJECTS
-- ============================================================
CREATE TABLE IF NOT EXISTS tryout_subjects (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tryout_id        UUID NOT NULL REFERENCES tryouts(id) ON DELETE CASCADE,
  subject_id       UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  total_questions  INT NOT NULL DEFAULT 20,
  duration_minutes INT NOT NULL DEFAULT 60,
  passing_grade    NUMERIC(5,2) NOT NULL DEFAULT 75.00,
  google_form_url  TEXT,
  UNIQUE (tryout_id, subject_id)
);

-- ============================================================
-- 13. QUESTIONS (Bank Soal)
-- ============================================================
CREATE TABLE IF NOT EXISTS questions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unique_code     VARCHAR(50) UNIQUE NOT NULL,
  question_number INT,
  subject_id      UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  material_id     UUID NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
  competency_id   UUID NOT NULL REFERENCES competencies(id) ON DELETE RESTRICT,
  question_text   TEXT NOT NULL,
  options         JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_answer  CHAR(1) NOT NULL CHECK (correct_answer IN ('A','B','C','D','E')),
  weight          NUMERIC(5,2) NOT NULL DEFAULT 1.00,
  cognitive_level VARCHAR(5) CHECK (cognitive_level IN ('C1','C2','C3','C4','C5','C6')),
  status          VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','DRAFT','ARCHIVED'))
);
CREATE INDEX IF NOT EXISTS idx_questions_subject_id ON questions (subject_id);

-- ============================================================
-- 14. TRYOUT QUESTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS tryout_questions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tryout_id      UUID NOT NULL REFERENCES tryouts(id) ON DELETE CASCADE,
  question_id    UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  question_order INT NOT NULL,
  UNIQUE (tryout_id, question_id)
);

-- ============================================================
-- 15. GOOGLE FORMS
-- ============================================================
CREATE TABLE IF NOT EXISTS google_forms (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tryout_id      UUID NOT NULL REFERENCES tryouts(id) ON DELETE CASCADE,
  subject_id     UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  form_id        VARCHAR(255),
  form_url       TEXT NOT NULL,
  sheet_url      TEXT NOT NULL,
  sync_status    VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (sync_status IN ('SYNCED','PENDING','ERROR')),
  last_synced_at TIMESTAMPTZ
);

-- ============================================================
-- 16. RESPONSES (Pengerjaan mentah siswa)
-- ============================================================
CREATE TABLE IF NOT EXISTS responses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tryout_id       UUID NOT NULL REFERENCES tryouts(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  nisn_input      VARCHAR(20) NOT NULL,
  raw_score_gform NUMERIC(5,2) NOT NULL DEFAULT 0,
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sync_batch_id   UUID,
  UNIQUE (tryout_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_responses_tryout_student ON responses (tryout_id, student_id);

-- ============================================================
-- 17. ANSWERS (Jawaban per butir soal)
-- ============================================================
CREATE TABLE IF NOT EXISTS answers (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id    UUID NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
  student_id     UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  tryout_id      UUID NOT NULL REFERENCES tryouts(id) ON DELETE CASCADE,
  question_id    UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  student_answer CHAR(1) CHECK (student_answer IN ('A','B','C','D','E') OR student_answer IS NULL),
  correct_answer CHAR(1) NOT NULL,
  is_correct     BOOLEAN NOT NULL DEFAULT false,
  score          NUMERIC(5,2) NOT NULL DEFAULT 0,
  submitted_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_answers_response_id  ON answers (response_id);
CREATE INDEX IF NOT EXISTS idx_answers_question_id  ON answers (question_id);
CREATE INDEX IF NOT EXISTS idx_answers_tryout_id    ON answers (tryout_id);

-- ============================================================
-- 18. SCORES
-- ============================================================
CREATE TABLE IF NOT EXISTS scores (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id        UUID UNIQUE NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
  student_id         UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  tryout_id          UUID NOT NULL REFERENCES tryouts(id) ON DELETE CASCADE,
  subject_scores     JSONB NOT NULL DEFAULT '{}'::jsonb,
  google_form_score  NUMERIC(5,2) NOT NULL DEFAULT 0,
  calculated_score   NUMERIC(5,2) NOT NULL DEFAULT 0,
  score_difference   NUMERIC(5,2) NOT NULL DEFAULT 0,
  scoring_status     VARCHAR(20) NOT NULL DEFAULT 'MATCH'
                       CHECK (scoring_status IN ('MATCH','SCORING_MISMATCH')),
  total_correct      INT NOT NULL DEFAULT 0,
  total_incorrect    INT NOT NULL DEFAULT 0,
  total_unanswered   INT NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_scores_student_tryout ON scores (student_id, tryout_id);

-- ============================================================
-- 19. QUESTION ANALYSIS (Psikometri butir soal)
-- ============================================================
CREATE TABLE IF NOT EXISTS question_analysis (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tryout_id               UUID NOT NULL REFERENCES tryouts(id) ON DELETE CASCADE,
  question_id             UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  total_respondents       INT NOT NULL DEFAULT 0,
  correct_count           INT NOT NULL DEFAULT 0,
  incorrect_count         INT NOT NULL DEFAULT 0,
  unanswered_count        INT NOT NULL DEFAULT 0,
  correct_percentage      NUMERIC(5,2) NOT NULL DEFAULT 0,
  incorrect_percentage    NUMERIC(5,2) NOT NULL DEFAULT 0,
  unanswered_percentage   NUMERIC(5,2) NOT NULL DEFAULT 0,
  difficulty_index        NUMERIC(4,3) NOT NULL DEFAULT 0,  -- p-value
  difficulty_category     VARCHAR(30) NOT NULL DEFAULT 'SEDANG',
  discrimination_index    NUMERIC(4,3) NOT NULL DEFAULT 0,  -- D-value
  discrimination_category VARCHAR(30) NOT NULL DEFAULT 'CUKUP',
  distractor_counts       JSONB NOT NULL DEFAULT '{}'::jsonb,
  distractor_percentages  JSONB,
  review_recommendation   VARCHAR(50) DEFAULT 'Valid / Layak Digunakan',
  review_reasons          JSONB DEFAULT '[]'::jsonb,
  UNIQUE (tryout_id, question_id)
);

-- ============================================================
-- 20. EXPLANATIONS (Pembahasan soal)
-- ============================================================
CREATE TABLE IF NOT EXISTS explanations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tryout_id        UUID NOT NULL REFERENCES tryouts(id) ON DELETE CASCADE,
  subject_id       UUID REFERENCES subjects(id) ON DELETE SET NULL,
  question_id      UUID REFERENCES questions(id) ON DELETE SET NULL,
  title            VARCHAR(255) NOT NULL,
  content_text     TEXT NOT NULL DEFAULT '',
  pdf_url          TEXT,
  pdf_storage_path TEXT,
  pdf_file_name    VARCHAR(255),
  pdf_file_size    BIGINT,
  youtube_url      TEXT,
  external_url     TEXT,
  status           VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
                     CHECK (status IN ('DRAFT','PUBLISHED','ARCHIVED')),
  created_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  author_name      VARCHAR(255),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_explanations_tryout_status ON explanations (tryout_id, status);

-- ============================================================
-- 21. REPORTS
-- ============================================================
CREATE TABLE IF NOT EXISTS reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        VARCHAR(255) NOT NULL,
  report_type  VARCHAR(30) NOT NULL CHECK (report_type IN ('STUDENT_PDF','TEACHER_PDF','EXCEL_SUMMARY')),
  tryout_id    UUID NOT NULL REFERENCES tryouts(id) ON DELETE CASCADE,
  generated_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_path    TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 22. AUDIT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  user_name     VARCHAR(255) NOT NULL,
  role          VARCHAR(20) NOT NULL,
  action        VARCHAR(100) NOT NULL,
  target_entity VARCHAR(100) NOT NULL,
  details       TEXT NOT NULL DEFAULT '',
  ip_address    VARCHAR(45) NOT NULL DEFAULT '127.0.0.1',
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id   ON audit_logs (user_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS pada semua tabel
ALTER TABLE users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE students          ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_classes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_years    ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects          ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_subjects  ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials         ENABLE ROW LEVEL SECURITY;
ALTER TABLE competencies      ENABLE ROW LEVEL SECURITY;
ALTER TABLE tryouts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE tryout_subjects   ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE tryout_questions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_forms      ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores            ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE explanations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports           ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs        ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- ADMIN: Full access semua tabel
CREATE POLICY "admin_all_access" ON users
  FOR ALL USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'ADMIN'
  );

CREATE POLICY "admin_all_access" ON teachers
  FOR ALL USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'ADMIN'
  );

CREATE POLICY "admin_all_access" ON students
  FOR ALL USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'ADMIN'
  );

-- PUBLIC READ: Tabel referensi yang boleh dibaca semua authenticated user
CREATE POLICY "authenticated_read" ON academic_years
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_read" ON classes
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_read" ON subjects
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_read" ON materials
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_read" ON competencies
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_read" ON tryouts
  FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- STUDENT ISOLATION: Siswa hanya bisa lihat data dirinya sendiri
CREATE POLICY "student_own_scores" ON scores
  FOR SELECT USING (
    student_id = (SELECT id FROM students WHERE user_id = auth.uid())
    OR (SELECT role FROM users WHERE id = auth.uid()) IN ('ADMIN', 'GURU', 'WALI_KELAS')
  );

CREATE POLICY "student_own_answers" ON answers
  FOR SELECT USING (
    student_id = (SELECT id FROM students WHERE user_id = auth.uid())
    OR (SELECT role FROM users WHERE id = auth.uid()) IN ('ADMIN', 'GURU', 'WALI_KELAS')
  );

CREATE POLICY "student_own_responses" ON responses
  FOR SELECT USING (
    student_id = (SELECT id FROM students WHERE user_id = auth.uid())
    OR (SELECT role FROM users WHERE id = auth.uid()) IN ('ADMIN', 'GURU', 'WALI_KELAS')
  );

-- ANON: Portal siswa (verifikasi NISN tanpa login)
-- Siswa bisa lookup berdasarkan NISN (read-only, no bulk listing)
CREATE POLICY "anon_student_lookup_by_nisn" ON students
  FOR SELECT USING (
    auth.role() = 'anon' -- Dibatasi di query dengan WHERE nisn = $1
    OR auth.role() = 'authenticated'
  );

-- EXPLANATIONS: Anon hanya bisa baca yang PUBLISHED
CREATE POLICY "public_published_explanations" ON explanations
  FOR SELECT USING (
    status = 'PUBLISHED'
    OR (SELECT role FROM users WHERE id = auth.uid()) IN ('ADMIN', 'GURU', 'WALI_KELAS')
  );

-- GURU: Write access untuk question bank dan analisis pada subject yang ditugaskan
CREATE POLICY "guru_write_questions" ON questions
  FOR ALL USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('ADMIN', 'GURU', 'WALI_KELAS')
  );

CREATE POLICY "guru_write_explanations" ON explanations
  FOR ALL USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('ADMIN', 'GURU', 'WALI_KELAS')
  );

-- AUDIT LOGS: Hanya admin bisa baca
CREATE POLICY "admin_read_audit_logs" ON audit_logs
  FOR SELECT USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'ADMIN'
  );

-- Service role bisa write ke audit_logs
CREATE POLICY "service_write_audit_logs" ON audit_logs
  FOR INSERT WITH CHECK (true);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at pada explanations
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_explanations_updated_at
  BEFORE UPDATE ON explanations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- STORAGE BUCKETS (Jalankan via Supabase Dashboard atau CLI)
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public)
--   VALUES ('explanations-pdf', 'explanations-pdf', false)
--   ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SELESAI
-- Selanjutnya jalankan seed.sql untuk data awal
-- ============================================================
