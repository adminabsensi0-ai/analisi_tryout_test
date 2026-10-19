-- ============================================================
-- Migration 003: Flexible Grade Level (SD–SMA Support)
-- ============================================================
-- Tujuan: Melepas batasan grade_level agar sistem mendukung semua
-- jenjang pendidikan: SD (1–6), SMP (7–9), SMA/SMK (10/X – 12/XII).
--
-- Sebelumnya grade_level dibatasi CHECK hanya untuk ('X', 'XI', 'XII').
-- Perubahan ini menghapus constraint tersebut dan menggantinya dengan
-- validasi yang lebih fleksibel.
-- ============================================================

-- 1. Hapus constraint CHECK lama di tabel classes
ALTER TABLE classes
  DROP CONSTRAINT IF EXISTS classes_grade_level_check;

-- 2. Tambah constraint baru yang mendukung SD–SMA/SMK
--    Format yang diterima: angka 1–12 atau romawi X/XI/XII (legacy)
ALTER TABLE classes
  ADD CONSTRAINT classes_grade_level_check
  CHECK (
    grade_level IN (
      -- SD
      '1', '2', '3', '4', '5', '6',
      -- SMP
      '7', '8', '9',
      -- SMA/SMK (format angka modern)
      '10', '11', '12',
      -- SMA/SMK (format romawi legacy — backward compatible)
      'X', 'XI', 'XII'
    )
  );

-- 3. Hapus constraint CHECK lama di tabel competencies (jika ada)
ALTER TABLE competencies
  DROP CONSTRAINT IF EXISTS competencies_grade_level_check;

-- 4. Tambah constraint baru yang sama untuk competencies
ALTER TABLE competencies
  ADD CONSTRAINT competencies_grade_level_check
  CHECK (
    grade_level IN (
      '1', '2', '3', '4', '5', '6',
      '7', '8', '9',
      '10', '11', '12',
      'X', 'XI', 'XII'
    )
  );

-- Catatan: Data lama yang menggunakan 'X', 'XI', 'XII' tetap valid
-- karena format tersebut masih diizinkan oleh constraint baru.
