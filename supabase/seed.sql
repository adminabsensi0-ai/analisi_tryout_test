-- ============================================================
-- SUPABASE INITIAL SEED DATA
-- School Try Out & Assessment Analytics System
-- SMA Negeri 1 Utama
-- ============================================================
-- Jalankan file ini SETELAH 001_initial_schema.sql dijalankan
-- di Supabase SQL Editor.
-- ============================================================

-- 1. TAHUN AJARAN
INSERT INTO academic_years (id, year_label, semester, is_active)
VALUES
  ('a0000000-0000-0000-0000-000000000001', '2025/2026', 'ODD', false),
  ('a0000000-0000-0000-0000-000000000002', '2025/2026', 'EVEN', true)
ON CONFLICT (id) DO NOTHING;

-- 2. USERS (Admin & Guru Akun)
INSERT INTO users (id, email, role, name)
VALUES
  ('u0000000-0000-0000-0000-000000000000', 'admin@sekolah.com', 'ADMIN', 'admin'),
  ('u0000000-0000-0000-0000-000000000001', 'admin@sekolah.sch.id', 'ADMIN', 'Drs. Supriyadi, M.Pd'),
  ('u0000000-0000-0000-0000-000000000002', 'bambang@sekolah.sch.id', 'WALI_KELAS', 'Drs. Bambang Sugiarto'),
  ('u0000000-0000-0000-0000-000000000003', 'siti@sekolah.sch.id', 'WALI_KELAS', 'Dra. Siti Nurhaliza'),
  ('u0000000-0000-0000-0000-000000000004', 'rifai@sekolah.sch.id', 'GURU', 'Ahmad Rifai, M.Pd'),
  ('u0000000-0000-0000-0000-000000000005', 'endang@sekolah.sch.id', 'GURU', 'Endang Rahayu, S.Pd')
ON CONFLICT (id) DO NOTHING;

-- 3. MATA PELAJARAN (SUBJECTS)
INSERT INTO subjects (id, code, name, category, passing_grade)
VALUES
  ('s0000000-0000-0000-0000-000000000001', 'MAT', 'Matematika IPA', 'PEMINATAN', 75.00),
  ('s0000000-0000-0000-0000-000000000002', 'FIS', 'Fisika', 'PEMINATAN', 75.00),
  ('s0000000-0000-0000-0000-000000000003', 'BIN', 'Bahasa Indonesia', 'WAJIB', 78.00),
  ('s0000000-0000-0000-0000-000000000004', 'BIO', 'Biologi', 'PEMINATAN', 75.00)
ON CONFLICT (id) DO NOTHING;

-- 4. TEACHERS (Profil Pengajar)
INSERT INTO teachers (id, user_id, nip, name, email, phone, subject_permissions, class_permissions, is_wali_kelas)
VALUES
  ('t0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000001', '196803121994031002', 'Drs. Supriyadi, M.Pd', 'admin@sekolah.sch.id', '081234567890', '["s0000000-0000-0000-0000-000000000001","s0000000-0000-0000-0000-000000000002"]'::jsonb, '[]'::jsonb, false),
  ('t0000000-0000-0000-0000-000000000002', 'u0000000-0000-0000-0000-000000000002', '197205151998021001', 'Drs. Bambang Sugiarto', 'bambang@sekolah.sch.id', '081298765432', '["s0000000-0000-0000-0000-000000000001"]'::jsonb, '[]'::jsonb, true),
  ('t0000000-0000-0000-0000-000000000003', 'u0000000-0000-0000-0000-000000000003', '197508202002122003', 'Dra. Siti Nurhaliza', 'siti@sekolah.sch.id', '081311223344', '["s0000000-0000-0000-0000-000000000003"]'::jsonb, '[]'::jsonb, true),
  ('t0000000-0000-0000-0000-000000000004', 'u0000000-0000-0000-0000-000000000004', '198211042008011005', 'Ahmad Rifai, M.Pd', 'rifai@sekolah.sch.id', '081555667788', '["s0000000-0000-0000-0000-000000000002"]'::jsonb, '[]'::jsonb, true),
  ('t0000000-0000-0000-0000-000000000005', 'u0000000-0000-0000-0000-000000000005', '198604182010012012', 'Endang Rahayu, S.Pd', 'endang@sekolah.sch.id', '081777889900', '["s0000000-0000-0000-0000-000000000004"]'::jsonb, '[]'::jsonb, true)
ON CONFLICT (id) DO NOTHING;

-- 5. KELAS (CLASSES)
INSERT INTO classes (id, name, grade_level, academic_year_id, home_room_teacher_id)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'XII IPA 1', 'XII', 'a0000000-0000-0000-0000-000000000002', 't0000000-0000-0000-0000-000000000002'),
  ('c0000000-0000-0000-0000-000000000002', 'XII IPA 2', 'XII', 'a0000000-0000-0000-0000-000000000002', 't0000000-0000-0000-0000-000000000004'),
  ('c0000000-0000-0000-0000-000000000003', 'XII IPS 1', 'XII', 'a0000000-0000-0000-0000-000000000002', 't0000000-0000-0000-0000-000000000003'),
  ('c0000000-0000-0000-0000-000000000004', 'XII IPS 2', 'XII', 'a0000000-0000-0000-0000-000000000002', 't0000000-0000-0000-0000-000000000005')
ON CONFLICT (id) DO NOTHING;

-- 6. POKOK MATERI (MATERIALS)
INSERT INTO materials (id, subject_id, code, title, description)
VALUES
  ('m0000000-0000-0000-0000-000000000001', 's0000000-0000-0000-0000-000000000001', 'MAT-01', 'Kalkulus & Turunan', 'Turunan fungsi aljabar, trigonometri, dan optimasi nilai ekstrim.'),
  ('m0000000-0000-0000-0000-000000000002', 's0000000-0000-0000-0000-000000000001', 'MAT-02', 'Integral Tentu & Tak Tentu', 'Teknik pengintegralan, luas daerah bidang, dan volume benda putar.'),
  ('m0000000-0000-0000-0000-000000000003', 's0000000-0000-0000-0000-000000000001', 'MAT-03', 'Geometri Dimensi Tiga', 'Jarak titik ke garis, jarak titik ke bidang, dan sudut antar bidang.'),
  ('m0000000-0000-0000-0000-000000000004', 's0000000-0000-0000-0000-000000000001', 'MAT-04', 'Statistika & Peluang', 'Ukuran pemusatan data, pencacahan, dan peluang kejadian bersyarat.')
ON CONFLICT (id) DO NOTHING;

-- 7. KOMPETENSI DASAR (COMPETENCIES)
INSERT INTO competencies (id, subject_id, code, statement, grade_level)
VALUES
  ('kd000000-0000-0000-0000-000000000001', 's0000000-0000-0000-0000-000000000001', 'KD-3.1', 'Menjelaskan keberkaitaan turunan fungsi dengan nilai maksimum, nilai minimum, dan selang kemonotonan fungsi.', 'XII'),
  ('kd000000-0000-0000-0000-000000000002', 's0000000-0000-0000-0000-000000000001', 'KD-3.2', 'Mendeskripsikan jarak dalam ruang (antar titik, titik ke garis, dan titik ke bidang).', 'XII'),
  ('kd000000-0000-0000-0000-000000000003', 's0000000-0000-0000-0000-000000000001', 'KD-3.3', 'Menentukan dan menganalisis ukuran pemusatan dan penyebaran data yang disajikan dalam bentuk tabel distribusi frekuensi dan histogram.', 'XII')
ON CONFLICT (id) DO NOTHING;

-- 8. SISWA CONTOH (STUDENTS)
INSERT INTO students (id, nisn, nis, name, gender, class_id, birth_date, email, phone, target_score)
VALUES
  ('st000000-0000-0000-0000-000000000001', '0061234561', '212210001', 'Aditya Pratama', 'L', 'c0000000-0000-0000-0000-000000000001', '2008-05-14', 'aditya@siswa.sch.id', '081234567801', 85.00),
  ('st000000-0000-0000-0000-000000000002', '0061234562', '212210002', 'Bella Safitri', 'P', 'c0000000-0000-0000-0000-000000000001', '2008-08-22', 'bella@siswa.sch.id', '081234567802', 88.00),
  ('st000000-0000-0000-0000-000000000003', '0061234563', '212210003', 'Citra Dewi', 'P', 'c0000000-0000-0000-0000-000000000001', '2008-01-10', 'citra@siswa.sch.id', '081234567803', 82.00),
  ('st000000-0000-0000-0000-000000000004', '0061234564', '212210004', 'Dimas Anggara', 'L', 'c0000000-0000-0000-0000-000000000001', '2007-11-05', 'dimas@siswa.sch.id', '081234567804', 80.00),
  ('st000000-0000-0000-0000-000000000005', '0061234565', '212210005', 'Eka Rahmawati', 'P', 'c0000000-0000-0000-0000-000000000001', '2008-03-30', 'eka@siswa.sch.id', '081234567805', 90.00)
ON CONFLICT (id) DO NOTHING;

-- 9. TRYOUT CONTOH
INSERT INTO tryouts (id, code, title, assessment_type, academic_year_id, start_date, end_date, scoring_config, status, description)
VALUES
  ('to000000-0000-0000-0000-000000000001', 'TO-2026-01', 'Try Out UTBK & Ujian Sekolah Ke-1', 'TRYOUT', 'a0000000-0000-0000-0000-000000000002', '2026-02-01T08:00:00Z', '2026-02-05T16:00:00Z', '{"scoringType":"EQUAL_WEIGHT","maxScore":100,"correctScore":5,"wrongScore":0,"unansweredScore":0,"allowNegativeMarking":false,"passingGrade":75}'::jsonb, 'COMPLETED', 'Simulasi perdana persiapan ujian sekolah tahun 2026.'),
  ('to000000-0000-0000-0000-000000000002', 'TO-2026-02', 'Try Out UTBK & Ujian Sekolah Ke-2', 'TRYOUT', 'a0000000-0000-0000-0000-000000000002', '2026-03-01T08:00:00Z', '2026-03-05T16:00:00Z', '{"scoringType":"EQUAL_WEIGHT","maxScore":100,"correctScore":5,"wrongScore":0,"unansweredScore":0,"allowNegativeMarking":false,"passingGrade":75}'::jsonb, 'COMPLETED', 'Simulasi kedua dengan pengayaan tipe soal HOTS.'),
  ('to000000-0000-0000-0000-000000000003', 'TO-2026-03', 'Try Out Akbar Terpadu Ke-3 (Aktif)', 'TRYOUT', 'a0000000-0000-0000-0000-000000000002', '2026-04-01T08:00:00Z', '2026-04-10T16:00:00Z', '{"scoringType":"EQUAL_WEIGHT","maxScore":100,"correctScore":5,"wrongScore":0,"unansweredScore":0,"allowNegativeMarking":false,"passingGrade":75}'::jsonb, 'ACTIVE', 'Try Out akbar terintegrasi Google Forms dengan pemetaan psikometri.')
ON CONFLICT (id) DO NOTHING;

-- 10. AUDIT LOG INISIAL
INSERT INTO audit_logs (id, user_name, role, action, target_entity, details, ip_address)
VALUES
  (gen_random_uuid(), 'System Bootstrap', 'ADMIN', 'SEED_DATABASE', 'SYSTEM', 'Inisialisasi data benih awal SMAN 1 Utama berhasil dilakukan.', '127.0.0.1');

-- SELESAI
