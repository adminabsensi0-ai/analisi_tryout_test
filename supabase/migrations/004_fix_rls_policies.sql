-- ============================================================
-- MIGRATION 004: Fix RLS Infinite Recursion
-- ============================================================
-- Masalah: Policy pada tabel `users` mengquery tabel `users`
-- itu sendiri → infinite recursion (error code 42P17).
--
-- Solusi: Buat fungsi SECURITY DEFINER yang bypass RLS,
-- lalu gunakan fungsi tersebut di semua policy.
--
-- Cara menjalankan:
-- 1. Buka https://app.supabase.com → Project → SQL Editor
-- 2. Paste seluruh isi file ini lalu klik Run
-- ============================================================

-- ============================================================
-- LANGKAH 1: Buat Security Definer Function
-- Fungsi ini membaca role user dari tabel users TANPA kena RLS
-- karena SECURITY DEFINER = berjalan dengan hak pemilik fungsi
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid()
$$;

-- ============================================================
-- LANGKAH 2: Hapus semua policy lama yang rekursif
-- ============================================================

-- Tabel: users
DROP POLICY IF EXISTS "admin_all_access" ON public.users;
DROP POLICY IF EXISTS "users_read_own" ON public.users;

-- Tabel: teachers
DROP POLICY IF EXISTS "admin_all_access" ON public.teachers;
DROP POLICY IF EXISTS "teacher_read_own" ON public.teachers;

-- Tabel: students
DROP POLICY IF EXISTS "admin_all_access" ON public.students;
DROP POLICY IF EXISTS "anon_student_lookup_by_nisn" ON public.students;

-- Tabel: scores
DROP POLICY IF EXISTS "student_own_scores" ON public.scores;

-- Tabel: answers
DROP POLICY IF EXISTS "student_own_answers" ON public.answers;

-- Tabel: responses
DROP POLICY IF EXISTS "student_own_responses" ON public.responses;

-- Tabel: explanations
DROP POLICY IF EXISTS "public_published_explanations" ON public.explanations;
DROP POLICY IF EXISTS "guru_write_explanations" ON public.explanations;

-- Tabel: questions
DROP POLICY IF EXISTS "guru_write_questions" ON public.questions;

-- Tabel: audit_logs
DROP POLICY IF EXISTS "admin_read_audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "service_write_audit_logs" ON public.audit_logs;

-- Tabel: exam_packages (dari migration 002)
DROP POLICY IF EXISTS "admin_manage_exam_packages" ON public.exam_packages;
DROP POLICY IF EXISTS "admin_guru_manage_package_subjects" ON public.exam_package_subjects;

-- ============================================================
-- LANGKAH 3: Recreate policies dengan fungsi non-rekursif
-- ============================================================

-- === TABEL: users ===
-- Admin punya akses penuh
CREATE POLICY "admin_full_access" ON public.users
  FOR ALL
  USING (public.get_auth_role() = 'ADMIN')
  WITH CHECK (public.get_auth_role() = 'ADMIN');

-- User bisa baca data dirinya sendiri
CREATE POLICY "users_read_own" ON public.users
  FOR SELECT
  USING (id = auth.uid());

-- Anon bisa insert saat registrasi (dibutuhkan Supabase Auth)
CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT
  WITH CHECK (id = auth.uid());

-- === TABEL: teachers ===
-- Admin punya akses penuh
CREATE POLICY "admin_full_access" ON public.teachers
  FOR ALL
  USING (public.get_auth_role() = 'ADMIN')
  WITH CHECK (public.get_auth_role() = 'ADMIN');

-- Guru bisa baca semua profil teacher (untuk keperluan kolaborasi)
CREATE POLICY "authenticated_read_teachers" ON public.teachers
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Guru bisa baca & update profil dirinya sendiri
CREATE POLICY "teacher_manage_own" ON public.teachers
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- === TABEL: students ===
-- Admin punya akses penuh
CREATE POLICY "admin_full_access" ON public.students
  FOR ALL
  USING (public.get_auth_role() = 'ADMIN')
  WITH CHECK (public.get_auth_role() = 'ADMIN');

-- Guru & Wali Kelas bisa baca semua siswa
CREATE POLICY "staff_read_students" ON public.students
  FOR SELECT
  USING (
    public.get_auth_role() IN ('GURU', 'WALI_KELAS', 'ADMIN')
  );

-- Anon bisa lookup siswa berdasarkan NISN (portal hasil siswa)
CREATE POLICY "anon_student_lookup" ON public.students
  FOR SELECT
  USING (auth.role() = 'anon' OR auth.role() = 'authenticated');

-- === TABEL: scores ===
CREATE POLICY "scores_access" ON public.scores
  FOR SELECT
  USING (
    student_id = (SELECT id FROM public.students WHERE user_id = auth.uid())
    OR public.get_auth_role() IN ('ADMIN', 'GURU', 'WALI_KELAS')
    OR auth.role() = 'anon'
  );

CREATE POLICY "staff_write_scores" ON public.scores
  FOR ALL
  USING (public.get_auth_role() IN ('ADMIN', 'GURU', 'WALI_KELAS'))
  WITH CHECK (public.get_auth_role() IN ('ADMIN', 'GURU', 'WALI_KELAS'));

-- === TABEL: answers ===
CREATE POLICY "answers_access" ON public.answers
  FOR SELECT
  USING (
    student_id = (SELECT id FROM public.students WHERE user_id = auth.uid())
    OR public.get_auth_role() IN ('ADMIN', 'GURU', 'WALI_KELAS')
    OR auth.role() = 'anon'
  );

CREATE POLICY "staff_write_answers" ON public.answers
  FOR ALL
  USING (public.get_auth_role() IN ('ADMIN', 'GURU', 'WALI_KELAS'))
  WITH CHECK (public.get_auth_role() IN ('ADMIN', 'GURU', 'WALI_KELAS'));

-- === TABEL: responses ===
CREATE POLICY "responses_access" ON public.responses
  FOR SELECT
  USING (
    student_id = (SELECT id FROM public.students WHERE user_id = auth.uid())
    OR public.get_auth_role() IN ('ADMIN', 'GURU', 'WALI_KELAS')
    OR auth.role() = 'anon'
  );

CREATE POLICY "staff_write_responses" ON public.responses
  FOR ALL
  USING (public.get_auth_role() IN ('ADMIN', 'GURU', 'WALI_KELAS'))
  WITH CHECK (public.get_auth_role() IN ('ADMIN', 'GURU', 'WALI_KELAS'));

-- === TABEL: questions ===
CREATE POLICY "staff_manage_questions" ON public.questions
  FOR ALL
  USING (public.get_auth_role() IN ('ADMIN', 'GURU', 'WALI_KELAS'))
  WITH CHECK (public.get_auth_role() IN ('ADMIN', 'GURU', 'WALI_KELAS'));

-- === TABEL: explanations ===
-- Anon hanya baca yang PUBLISHED
CREATE POLICY "public_published_explanations" ON public.explanations
  FOR SELECT
  USING (
    status = 'PUBLISHED'
    OR public.get_auth_role() IN ('ADMIN', 'GURU', 'WALI_KELAS')
  );

CREATE POLICY "staff_manage_explanations" ON public.explanations
  FOR ALL
  USING (public.get_auth_role() IN ('ADMIN', 'GURU', 'WALI_KELAS'))
  WITH CHECK (public.get_auth_role() IN ('ADMIN', 'GURU', 'WALI_KELAS'));

-- === TABEL: audit_logs ===
CREATE POLICY "admin_read_audit_logs" ON public.audit_logs
  FOR SELECT
  USING (public.get_auth_role() = 'ADMIN');

CREATE POLICY "service_write_audit_logs" ON public.audit_logs
  FOR INSERT
  WITH CHECK (true);

-- === TABEL: exam_packages (dari migration 002) ===
CREATE POLICY "admin_manage_exam_packages" ON public.exam_packages
  FOR ALL
  USING (
    auth.role() = 'service_role'
    OR public.get_auth_role() = 'ADMIN'
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR public.get_auth_role() = 'ADMIN'
  );

CREATE POLICY "admin_guru_manage_package_subjects" ON public.exam_package_subjects
  FOR ALL
  USING (
    auth.role() = 'service_role'
    OR public.get_auth_role() IN ('ADMIN', 'GURU')
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR public.get_auth_role() IN ('ADMIN', 'GURU')
  );

-- ============================================================
-- LANGKAH 4: Tambah kolom `password_hint` di teachers
-- Untuk menyimpan password yang diset admin (opsional, tidak aman untuk produksi penuh)
-- Ini hanya untuk keperluan demo/sekolah kecil
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teachers' AND column_name = 'password_hint'
  ) THEN
    ALTER TABLE public.teachers ADD COLUMN password_hint TEXT;
  END IF;
END $$;

-- ============================================================
-- SELESAI
-- Verifikasi: coba query SELECT * FROM teachers LIMIT 1;
-- Jika tidak ada error infinite recursion, migration berhasil.
-- ============================================================
