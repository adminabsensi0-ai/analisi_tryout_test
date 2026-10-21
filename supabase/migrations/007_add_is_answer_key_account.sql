-- ============================================================
-- 007: Tambah kolom is_answer_key_account pada tabel students
-- Untuk menandai akun siswa khusus yang difungsikan sebagai Kunci Jawaban
-- ============================================================
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS is_answer_key_account BOOLEAN DEFAULT false;

COMMENT ON COLUMN students.is_answer_key_account IS 'Menandakan akun ini khusus sebagai respon kunci jawaban tryout (dikecualikan dari statistik & rapor siswa nyata)';
