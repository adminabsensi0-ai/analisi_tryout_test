# DATABASE SCHEMA & ERD SPECIFICATION

## 1. Entity Relationship Overview (ERD)

```
[academic_years] 1──< [classes] 1──< [student_classes] >──1 [students] >──0/1 [users]
       │                 │
       │                 └──1 [teachers] >──1 [users]
       │                         │
       │                   [teacher_subjects]
       │                         │
[tryouts] 1──< [tryout_subjects] >──1 [subjects]
   │                 │                    │
   ├──1──< [google_forms]                 ├──1──< [materials]
   │                                      │
   ├──1──< [responses] 1──< [answers]     └──1──< [competencies]
   │           │                 │                   │
   │           └──1──< [scores]  └───────> [questions] <──1 [materials]
   │                                           │
   ├──1──< [tryout_questions] >────────────────┘
   ├──1──< [question_analysis]
   └──1──< [explanations]
```

---

## 2. Table Specifications (21 Entities)

### 1. `users`
- **Description**: Autentikasi dan profil akun sistem (Admin, Guru, Siswa).
- **Columns**:
  - `id` (UUID, PK, Default `gen_random_uuid()`)
  - `email` (VARCHAR(255), UNIQUE, NOT NULL)
  - `role` (VARCHAR(20), NOT NULL, Check `role IN ('ADMIN', 'GURU', 'SISWA')`)
  - `name` (VARCHAR(255), NOT NULL)
  - `avatar_url` (TEXT, NULLABLE)
  - `created_at` (TIMESTAMPTZ, NOT NULL, Default `CURRENT_TIMESTAMP`)
- **Indexes**: `idx_users_email` (email)

### 2. `teachers`
- **Description**: Profil spesifik guru terhubung ke `users`.
- **Columns**:
  - `id` (UUID, PK, Default `gen_random_uuid()`)
  - `user_id` (UUID, FK `users.id` ON DELETE CASCADE, UNIQUE, NOT NULL)
  - `nip` (VARCHAR(50), UNIQUE, NOT NULL)
  - `name` (VARCHAR(255), NOT NULL)
  - `email` (VARCHAR(255), NULLABLE) -- Auto-generated fallback "${nip}@guru.sekolah.id"
  - `phone` (VARCHAR(30), NULLABLE)
  - `subject_permissions` (JSONB, NOT NULL, Default `'[]'::jsonb`) -- Array of subject_ids
  - `created_at` (TIMESTAMPTZ, NOT NULL, Default `CURRENT_TIMESTAMP`)
- **Indexes**: `idx_teachers_user_id`, `idx_teachers_nip`

### 3. `students`
- **Description**: Profil spesifik siswa terhubung ke `users` (opsional jika siswa mengaktifkan akun).
- **Columns**:
  - `id` (UUID, PK, Default `gen_random_uuid()`)
  - `user_id` (UUID, FK `users.id` ON DELETE SET NULL, UNIQUE, NULLABLE)
  - `nisn` (VARCHAR(20), UNIQUE, NOT NULL)
  - `nis` (VARCHAR(20), UNIQUE, NOT NULL)
  - `name` (VARCHAR(255), NOT NULL)
  - `gender` (CHAR(1), NOT NULL, Check `gender IN ('L', 'P')`)
  - `class_id` (UUID, FK `classes.id` ON DELETE RESTRICT, NOT NULL)
  - `email` (VARCHAR(255), NULLABLE)
  - `phone` (VARCHAR(30), NULLABLE)
  - `target_score` (NUMERIC(5,2), DEFAULT 80.00)
  - `created_at` (TIMESTAMPTZ, NOT NULL, Default `CURRENT_TIMESTAMP`)
- **Indexes**: `idx_students_nisn`, `idx_students_class_id`

### 4. `classes`
- **Description**: Rombongan belajar / kelas siswa.
- **Columns**:
  - `id` (UUID, PK, Default `gen_random_uuid()`)
  - `name` (VARCHAR(50), NOT NULL) -- e.g. "XII IPA 1"
  - `grade_level` (VARCHAR(10), NOT NULL, Check `grade_level IN ('X', 'XI', 'XII')`)
  - `academic_year_id` (UUID, FK `academic_years.id` ON DELETE RESTRICT, NOT NULL)
  - `home_room_teacher_id` (UUID, FK `teachers.id` ON DELETE SET NULL, NULLABLE)
  - `created_at` (TIMESTAMPTZ, NOT NULL, Default `CURRENT_TIMESTAMP`)
- **Indexes**: `idx_classes_academic_year`

### 5. `student_classes`
- **Description**: Riwayat pendaftaran siswa pada kelas per tahun ajaran.
- **Columns**:
  - `id` (UUID, PK, Default `gen_random_uuid()`)
  - `student_id` (UUID, FK `students.id` ON DELETE CASCADE, NOT NULL)
  - `class_id` (UUID, FK `classes.id` ON DELETE CASCADE, NOT NULL)
  - `academic_year_id` (UUID, FK `academic_years.id` ON DELETE CASCADE, NOT NULL)
- **Unique Constraint**: UNIQUE(`student_id`, `academic_year_id`)

### 6. `academic_years`
- **Description**: Tahun ajaran dan semester aktif.
- **Columns**:
  - `id` (UUID, PK, Default `gen_random_uuid()`)
  - `year_label` (VARCHAR(20), NOT NULL) -- e.g. "2025/2026"
  - `semester` (VARCHAR(10), NOT NULL, Check `semester IN ('ODD', 'EVEN')`)
  - `is_active` (BOOLEAN, NOT NULL, Default `false`)
- **Unique Constraint**: UNIQUE(`year_label`, `semester`)

### 7. `subjects`
- **Description**: Mata pelajaran sekolah.
- **Columns**:
  - `id` (UUID, PK, Default `gen_random_uuid()`)
  - `code` (VARCHAR(20), UNIQUE, NOT NULL) -- e.g. "MAT", "FIS"
  - `name` (VARCHAR(100), NOT NULL)
  - `category` (VARCHAR(20), NOT NULL, Check `category IN ('WAJIB', 'PEMINATAN', 'VOKASI')`)

### 8. `teacher_subjects`
- **Description**: Pemetaan penugasan mengajar guru pada kelas dan mapel.
- **Columns**:
  - `id` (UUID, PK, Default `gen_random_uuid()`)
  - `teacher_id` (UUID, FK `teachers.id` ON DELETE CASCADE, NOT NULL)
  - `subject_id` (UUID, FK `subjects.id` ON DELETE CASCADE, NOT NULL)
  - `class_id` (UUID, FK `classes.id` ON DELETE CASCADE, NOT NULL)
- **Unique Constraint**: UNIQUE(`teacher_id`, `subject_id`, `class_id`)

### 9. `materials`
- **Description**: Pokok bahasan / materi pembelajaran.
- **Columns**:
  - `id` (UUID, PK, Default `gen_random_uuid()`)
  - `subject_id` (UUID, FK `subjects.id` ON DELETE CASCADE, NOT NULL)
  - `code` (VARCHAR(30), NOT NULL) -- e.g. "MAT-01"
  - `title` (VARCHAR(255), NOT NULL)
  - `description` (TEXT, NULLABLE)

### 10. `competencies`
- **Description**: Pemetaan Kompetensi Dasar (KD) per tingkatan.
- **Columns**:
  - `id` (UUID, PK, Default `gen_random_uuid()`)
  - `subject_id` (UUID, FK `subjects.id` ON DELETE CASCADE, NOT NULL)
  - `code` (VARCHAR(30), NOT NULL) -- e.g. "KD-3.1"
  - `statement` (TEXT, NOT NULL)
  - `grade_level` (VARCHAR(10), NOT NULL)

### 11. `tryouts`
- **Description**: Pelaksanaan Try Out dan konfigurasi scoring-nya.
- **Columns**:
  - `id` (UUID, PK, Default `gen_random_uuid()`)
  - `code` (VARCHAR(50), UNIQUE, NOT NULL)
  - `title` (VARCHAR(255), NOT NULL)
  - `academic_year_id` (UUID, FK `academic_years.id` ON DELETE RESTRICT, NOT NULL)
  - `start_date` (TIMESTAMPTZ, NOT NULL)
  - `end_date` (TIMESTAMPTZ, NOT NULL)
  - `scoring_config` (JSONB, NOT NULL) -- { scoringType, maxScore, correctScore, wrongScore, unansweredScore, allowNegativeMarking }
  - `status` (VARCHAR(20), NOT NULL, Default `'DRAFT'`, Check `status IN ('DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED')`)
  - `description` (TEXT, NULLABLE)

### 12. `tryout_subjects`
- **Description**: Pengaturan per mapel dalam Try Out.
- **Columns**:
  - `id` (UUID, PK, Default `gen_random_uuid()`)
  - `tryout_id` (UUID, FK `tryouts.id` ON DELETE CASCADE, NOT NULL)
  - `subject_id` (UUID, FK `subjects.id` ON DELETE CASCADE, NOT NULL)
  - `total_questions` (INT, NOT NULL, Default 20)
  - `duration_minutes` (INT, NOT NULL, Default 60)
  - `passing_grade` (NUMERIC(5,2), NOT NULL, Default 75.00)
- **Unique Constraint**: UNIQUE(`tryout_id`, `subject_id`)

### 13. `questions`
- **Description**: Bank Soal HOTS dengan kode unik.
- **Columns**:
  - `id` (UUID, PK, Default `gen_random_uuid()`)
  - `unique_code` (VARCHAR(50), UNIQUE, NOT NULL) -- e.g. "MAT-TO03-Q015"
  - `subject_id` (UUID, FK `subjects.id` ON DELETE CASCADE, NOT NULL)
  - `material_id` (UUID, FK `materials.id` ON DELETE RESTRICT, NOT NULL)
  - `competency_id` (UUID, FK `competencies.id` ON DELETE RESTRICT, NOT NULL)
  - `question_text` (TEXT, NOT NULL)
  - `options` (JSONB, NOT NULL) -- Array of { key: 'A', text: '...' }
  - `correct_answer` (CHAR(1), NOT NULL)
  - `weight` (NUMERIC(5,2), NOT NULL, Default 1.00)

### 14. `tryout_questions`
- **Description**: Pemetaan soal ke Try Out dan urutannya.
- **Columns**:
  - `id` (UUID, PK, Default `gen_random_uuid()`)
  - `tryout_id` (UUID, FK `tryouts.id` ON DELETE CASCADE, NOT NULL)
  - `question_id` (UUID, FK `questions.id` ON DELETE CASCADE, NOT NULL)
  - `question_order` (INT, NOT NULL)
- **Unique Constraint**: UNIQUE(`tryout_id`, `question_id`)

### 15. `google_forms`
- **Description**: Tautan dan status sinkronisasi Google Forms/Sheets.
- **Columns**:
  - `id` (UUID, PK, Default `gen_random_uuid()`)
  - `tryout_id` (UUID, FK `tryouts.id` ON DELETE CASCADE, NOT NULL)
  - `subject_id` (UUID, FK `subjects.id` ON DELETE CASCADE, NOT NULL)
  - `form_id` (VARCHAR(255), NULLABLE)
  - `form_url` (TEXT, NOT NULL)
  - `sheet_url` (TEXT, NOT NULL)
  - `sync_status` (VARCHAR(20), NOT NULL, Default `'PENDING'`)
  - `last_synced_at` (TIMESTAMPTZ, NULLABLE)

### 16. `responses`
- **Description**: Entri pengerjaan mentah siswa dari Google Forms/Sheets.
- **Columns**:
  - `id` (UUID, PK, Default `gen_random_uuid()`)
  - `tryout_id` (UUID, FK `tryouts.id` ON DELETE CASCADE, NOT NULL)
  - `student_id` (UUID, FK `students.id` ON DELETE CASCADE, NOT NULL)
  - `nisn_input` (VARCHAR(20), NOT NULL)
  - `raw_score_gform` (NUMERIC(5,2), NOT NULL)
  - `submitted_at` (TIMESTAMPTZ, NOT NULL)
  - `sync_batch_id` (UUID, NULLABLE)
- **Unique Constraint**: UNIQUE(`tryout_id`, `student_id`)

### 17. `answers`
- **Description**: Jawaban butir per soal per siswa.
- **Columns**:
  - `id` (UUID, PK, Default `gen_random_uuid()`)
  - `response_id` (UUID, FK `responses.id` ON DELETE CASCADE, NOT NULL)
  - `student_id` (UUID, FK `students.id` ON DELETE CASCADE, NOT NULL)
  - `tryout_id` (UUID, FK `tryouts.id` ON DELETE CASCADE, NOT NULL)
  - `question_id` (UUID, FK `questions.id` ON DELETE CASCADE, NOT NULL)
  - `student_answer` (CHAR(1), NULLABLE) -- 'A'..'E' or ''
  - `correct_answer` (CHAR(1), NOT NULL)
  - `is_correct` (BOOLEAN, NOT NULL)
  - `score` (NUMERIC(5,2), NOT NULL)
  - `submitted_at` (TIMESTAMPTZ, NOT NULL)

### 18. `scores`
- **Description**: Hasil kalkulasi skor dan verifikasi keselarasan GForm.
- **Columns**:
  - `id` (UUID, PK, Default `gen_random_uuid()`)
  - `response_id` (UUID, FK `responses.id` ON DELETE CASCADE, UNIQUE, NOT NULL)
  - `student_id` (UUID, FK `students.id` ON DELETE CASCADE, NOT NULL)
  - `tryout_id` (UUID, FK `tryouts.id` ON DELETE CASCADE, NOT NULL)
  - `subject_scores` (JSONB, NOT NULL) -- Map subjectId -> numeric score
  - `google_form_score` (NUMERIC(5,2), NOT NULL)
  - `calculated_score` (NUMERIC(5,2), NOT NULL)
  - `score_difference` (NUMERIC(5,2), NOT NULL)
  - `scoring_status` (VARCHAR(20), NOT NULL, Check `scoring_status IN ('MATCH', 'SCORING_MISMATCH')`)
  - `total_correct` (INT, NOT NULL)
  - `total_incorrect` (INT, NOT NULL)
  - `total_unanswered` (INT, NOT NULL)
  - `created_at` (TIMESTAMPTZ, NOT NULL, Default `CURRENT_TIMESTAMP`)

### 19. `question_analysis`
- **Description**: Hasil perhitungan psikometri butir soal.
- **Columns**:
  - `id` (UUID, PK, Default `gen_random_uuid()`)
  - `tryout_id` (UUID, FK `tryouts.id` ON DELETE CASCADE, NOT NULL)
  - `question_id` (UUID, FK `questions.id` ON DELETE CASCADE, NOT NULL)
  - `total_respondents` (INT, NOT NULL)
  - `correct_count` (INT, NOT NULL)
  - `incorrect_count` (INT, NOT NULL)
  - `unanswered_count` (INT, NOT NULL)
  - `difficulty_index` (NUMERIC(4,2), NOT NULL) -- p-value
  - `difficulty_category` (VARCHAR(30), NOT NULL)
  - `discrimination_index` (NUMERIC(4,2), NOT NULL) -- D-value
  - `discrimination_category` (VARCHAR(30), NOT NULL)
  - `distractor_counts` (JSONB, NOT NULL) -- { "A": 10, "B": 2, ... }

### 20. `explanations`
- **Description**: Modul & pembahasan soal oleh guru.
- **Columns**:
  - `id` (UUID, PK, Default `gen_random_uuid()`)
  - `tryout_id` (UUID, FK `tryouts.id` ON DELETE CASCADE, NOT NULL)
  - `question_id` (UUID, FK `questions.id` ON DELETE SET NULL, NULLABLE)
  - `title` (VARCHAR(255), NOT NULL)
  - `content_text` (TEXT, NOT NULL)
  - `pdf_url` (TEXT, NULLABLE)
  - `youtube_url` (TEXT, NULLABLE)
  - `external_url` (TEXT, NULLABLE)
  - `status` (VARCHAR(20), NOT NULL, Default `'DRAFT'`, Check `status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')`)
  - `created_at` (TIMESTAMPTZ, NOT NULL, Default `CURRENT_TIMESTAMP`)
  - `updatedAt` (TIMESTAMPTZ, NOT NULL, Default `CURRENT_TIMESTAMP`)

### 21. `reports`
- **Description**: Metadata dokumen laporan yang dihasilkan.
- **Columns**:
  - `id` (UUID, PK, Default `gen_random_uuid()`)
  - `title` (VARCHAR(255), NOT NULL)
  - `report_type` (VARCHAR(30), NOT NULL)
  - `tryout_id` (UUID, FK `tryouts.id` ON DELETE CASCADE, NOT NULL)
  - `generated_by` (UUID, FK `users.id` ON DELETE CASCADE, NOT NULL)
  - `file_path` (TEXT, NOT NULL)
  - `created_at` (TIMESTAMPTZ, NOT NULL, Default `CURRENT_TIMESTAMP`)

### 22. `audit_logs`
- **Description**: Catatan jejak audit aktivitas sistem.
- **Columns**:
  - `id` (UUID, PK, Default `gen_random_uuid()`)
  - `user_id` (UUID, NULLABLE)
  - `user_name` (VARCHAR(255), NOT NULL)
  - `role` (VARCHAR(20), NOT NULL)
  - `action` (VARCHAR(100), NOT NULL)
  - `target_entity` (VARCHAR(100), NOT NULL)
  - `details` (TEXT, NOT NULL)
  - `ip_address` (VARCHAR(45), NOT NULL)
  - `timestamp` (TIMESTAMPTZ, NOT NULL, Default `CURRENT_TIMESTAMP`)
