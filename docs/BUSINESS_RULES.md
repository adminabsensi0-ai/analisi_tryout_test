# BUSINESS RULES — SCHOOL TRY OUT & ASSESSMENT ANALYTICS SYSTEM

## 1. Access Control & Authorization
- **ADMIN**: Akses penuh ke `/admin`. Mengelola seluruh modul (Guru, Siswa, Kelas, Mata Pelajaran, Tahun Ajaran, Try Out, Parameter Scoring, Audit Logs).
- **GURU**: Akses ke `/guru`. Terbatas pada mata pelajaran dan kelas yang ditugaskan dalam `teacher_subjects`. Mengelola Bank Soal, Impor Google Sheets, Analisis Psikometri, dan Publikasi Pembahasan.
- **SISWA**: Akses penuh ke `/hasil`. 
  - Verifikasi wajib menggunakan autentikasi 2-faktor: **NISN (10 digit)** + **NIS Sekolah**.
  - Rate limiting diaktifkan: maksimal 5 kali percobaan gagal berturut-turut memicu penguncian sementara (*lockout*) 30 detik.
  - Hanya dapat melihat nilai individual miliknya sendiri, pencapaian target, pemetaan KD sendiri, butir soal yang salah dikerjakan, pembahasan terpublikasi, serta mengunduh PDF rapor resmi.
  - **Student Isolation**: Siswa A dilarang keras membaca atau mengakses data Siswa B. Setiap percobaan manipulasi query ditolak dan dicatat di `audit_logs`.

## 2. Rules Scoring & Google Form Comparison
- Skor kalkulasi database dihitung secara deterministik dari raw answers.
- Hasil kalkulasi dibandingkan dengan skor mentah Google Form.
- Status ditentukan:
  - `MATCH`: jika selisih skor $\le 0.01$.
  - `SCORING_MISMATCH`: jika selisih skor $> 0.01$.
- **No Silent Data Mutation**: Bila terjadi mismatch, sistem mempertahankan kedua nilai skor dan menampilkan indikator peringatan khusus kepada Guru/Admin serta mencatatnya di audit log.

## 3. Rules Google Sheets Import Pipeline
- Setiap proses impor wajib melalui 3 tahap:
  1. **Input**: Penempelan/pengunggahan data baris sheet.
  2. **Validasi & Pratinjau**: Pengecekan NISN terdaftar, kecocokan kode unik soal, pencocokan skor, serta penandaan indikator MATCH/MISMATCH.
  3. **Konfirmasi**: Persistensi data ke entitas `responses`, `answers`, dan `scores`.
- Impor bersifat *idempotent* (mencegah duplikasi data siswa pada Try Out yang sama).

## 4. Rules Explanation Publication
- Pembahasan yang dibuat Guru berstatus awal `DRAFT`.
- Hanya pembahasan berstatus `PUBLISHED` yang ditampilkan kepada siswa di portal `/hasil`.

## 5. Rules Audit Logging
- Sistem wajib mencatat setiap aktivitas berisiko/penting pada `audit_logs`:
  - Login / Logout pengguna
  - Verifikasi siswa berhasil / gagal / rate limit dipicu
  - Percobaan akses lintas data siswa (*CROSS_STUDENT_ACCESS_REJECTED*)
  - Impor data respons Google Sheets
  - Pembuatan & perubahan soal / konfigurasi scoring
  - Publikasi pembahasan soal
  - Unduh laporan PDF / Excel
