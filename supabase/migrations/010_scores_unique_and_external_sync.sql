-- ============================================================
-- 010: Ensure clean constraint on scores for multi-device sync
-- ============================================================

-- 1. Buat response_id di scores nullable jika belum
DO $$
BEGIN
  ALTER TABLE public.scores ALTER COLUMN response_id DROP NOT NULL;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- 2. Pastikan unique constraint pada (tryout_id, student_id) jika ada duplikat dibersihkan
DO $$
BEGIN
  -- Hapus duplikat lama jika pernah ada sebelum memasang unique constraint
  DELETE FROM public.scores a
  USING public.scores b
  WHERE a.ctid < b.ctid
    AND a.tryout_id = b.tryout_id
    AND a.student_id = b.student_id;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'scores_tryout_student_unique'
  ) THEN
    ALTER TABLE public.scores ADD CONSTRAINT scores_tryout_student_unique UNIQUE (tryout_id, student_id);
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;
