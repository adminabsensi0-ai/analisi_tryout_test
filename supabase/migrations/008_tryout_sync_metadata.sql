-- ============================================================
-- 008: Tryout Sync Metadata & Column Mapping Persistence
-- ============================================================

-- Tambahkan kolom untuk menyimpan konfigurasi kolom Google Sheet yang dipilih guru
ALTER TABLE tryouts 
ADD COLUMN IF NOT EXISTS selected_question_columns JSONB DEFAULT '[]'::jsonb;

-- Tambahkan kolom untuk kunci jawaban resmi yang otomatis diekstrak
ALTER TABLE tryouts 
ADD COLUMN IF NOT EXISTS answer_key JSONB DEFAULT '[]'::jsonb;

-- Tambahkan kolom mata pelajaran acuan untuk Try Out internal
ALTER TABLE tryouts 
ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL;

-- Tambahkan metadata pendukung Try Out Eksternal
ALTER TABLE tryouts 
ADD COLUMN IF NOT EXISTS is_external BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'INTERNAL',
ADD COLUMN IF NOT EXISTS external_subjects JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS external_subject_ids JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS external_score_scale VARCHAR(50) DEFAULT 'SCALE_100';

-- Komentar dokumentasi
COMMENT ON COLUMN tryouts.selected_question_columns IS 'Daftar nama kolom butir soal Google Sheet yang dipilih guru untuk dianalisis';
COMMENT ON COLUMN tryouts.answer_key IS 'Array kunci jawaban per nomor soal (Index 0 = Soal 1)';
COMMENT ON COLUMN tryouts.subject_id IS 'ID mata pelajaran acuan untuk Try Out internal';
