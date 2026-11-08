-- ============================================================
-- SUPABASE MIGRATION: 011_add_logo_url_to_school_profile.sql
-- Fitur: Sinkronisasi Logo Sekolah Antar-Perangkat (Multi-Device)
-- ============================================================
-- Mengatasi:
-- Logo sekolah yang diunggah Admin di laptop dapat otomatis muncul
-- di HP siswa, HP guru, dan laptop wali kelas via Supabase Realtime Sync.
--
-- CARA MENJALANKAN DI SUPABASE:
-- 1. Buka dashboard https://supabase.com/dashboard/project/tgnbbdixdxpuhqskdedd
-- 2. Masuk ke menu "SQL Editor" di bilah samping kiri
-- 3. Klik "New Query", tempel kode di bawah ini, lalu klik "Run".
-- ============================================================

-- 1. Tambahkan kolom logo_url bertipe TEXT ke tabel school_profile
ALTER TABLE public.school_profile 
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- 2. Beri komentar dokumentasi kolom
COMMENT ON COLUMN public.school_profile.logo_url IS 'Data URL Base64 atau URL gambar logo resmi sekolah untuk branding di seluruh perangkat';
