# SYSTEM ARCHITECTURE & PRODUCT BLUEPRINT

## 1. System Architecture Overview
Aplikasi dibangun menggunakan arsitektur modular Full-Stack berbasis React/Next.js/Vite, Express server capabilities, TypeScript, Tailwind CSS, serta Supabase PostgreSQL sebagai basis data utama.

```
+-----------------------------------------------------------------------------------+
|                                  USER INTERFACE                                   |
|  / (Landing Page)  |  /hasil (Portal Siswa)  |  /login  |  /guru  |  /admin       |
+-----------------------------------------------------------------------------------+
                                          |
+-----------------------------------------------------------------------------------+
|                          ROLE ROUTING & ACCESS CONTROL                            |
|  Public Access (/ & /hasil)  |  Auth Guard (/login)  |  RBAC (/guru & /admin)     |
+-----------------------------------------------------------------------------------+
                                          |
+-----------------------------------------------------------------------------------+
|                          SERVICES & INTEGRATION PIPELINE                          |
|  AuthService  |  ScoringEngine  |  AnalyticsEngine  |  GoogleIntegrationLayer   |
|  ExportService (PDF/Excel)  |  GeminiDiagnosticService  |  AuditLogger            |
+-----------------------------------------------------------------------------------+
                                          |
+-----------------------------------------------------------------------------------+
|                             DATABASE STORAGE LAYER                                |
|  PostgreSQL / Supabase Schema (21 Core Entities & RLS Security Rules)             |
+-----------------------------------------------------------------------------------+
```

## 2. Role Architecture
1. **ADMIN**:
   - Memiliki wewenang penuh atas seluruh entitas dan konfigurasi sistem.
   - Mengelola data Guru, Siswa, Kelas, Mata Pelajaran, Tahun Ajaran, Materi, Kompetensi Dasar, Try Out, Parameter Scoring Global, Integrasi Google, dan Audit Log.
2. **GURU**:
   - Terbatas pada mata pelajaran dan kelas yang ditugaskan (*subject/class permissions*).
   - Mengelola Bank Soal HOTS, melihat hasil Try Out kelas, menjalankan analisis butir soal psikometrik ($p$-value & $D$-value), mengimpor respons Google Sheet, mengelola pembahasan (teks/PDF/video), dan mengekspor rekap nilai.
3. **SISWA**:
   - Hanya mengakses Portal Hasil (`/hasil`).
   - Melakukan verifikasi menggunakan NISN / NIS.
   - Hanya dapat melihat data hasil sendiri, pemetaan KD sendiri, pembahasan terpublikasi, serta mengunduh PDF laporan individual. Terisolasi dari data siswa lain.

## 3. User Journeys
### A. Admin Journey
1. Admin membuka `/login` $\rightarrow$ autentikasi berhasil $\rightarrow$ terarah ke `/admin`.
2. Mengonfigurasi Tahun Ajaran aktif, Kelas, Mata Pelajaran, dan akun Guru/Siswa.
3. Membuat Try Out baru dan menentukan *Scoring Configuration* (skor maksimum, bobot benar/salah/kosong, negative marking).
4. Memantau *Audit Log* sistem dan mengelola integrasi Google Forms/Sheets.

### B. Guru Journey
1. Guru membuka `/login` $\rightarrow$ autentikasi berhasil $\rightarrow$ terarah ke `/guru`.
2. Memilih Try Out aktif dan Mata Pelajaran wewenang.
3. Menginput/mengedit Bank Soal HOTS dan menghubungkannya dengan Kompetensi Dasar.
4. Melakukan impor respons siswa melalui *Google Form/Sheets Integration Layer*.
5. Mengulas hasil *Validation & Preview* (memeriksa indikator `MATCH` vs `SCORING_MISMATCH`).
6. Mengonfirmasi penyimpanan data respons dan skor.
7. Mengevaluasi Analisis Butir Soal ($p$-value & $D$-value) dan Pemetaan Kompetensi.
8. Membuat dan mempublikasikan Pembahasan Soal (Teks, PDF, Video YouTube).
9. Mengekspor rekap kelas ke format Excel/PDF.

### C. Siswa Journey
1. Siswa membuka portal `/hasil`.
2. Memasukkan NISN (10 digit) dan memilih Try Out.
3. Sistem memverifikasi NISN $\rightarrow$ menampilkan Laporan Hasil Individual:
   - Skor Akhir Terhitung & perbandingan dengan Target Siswa.
   - Rincian Jumlah Benar, Salah, dan Kosong.
   - Indikator Verifikasi Google Form (`MATCH` / `SCORING_MISMATCH`).
   - Tabel Pemetaan Penguasaan Kompetensi Dasar (KD).
   - Rekomendasi Diagnostik Belajar Akademik AI.
   - Pembahasan Soal Resmi Terpublikasi (baca teks, modul PDF, tonton video YouTube).
   - Tombol "Unduh Laporan PDF Resmi".

## 4. Sitemap & URL Structure
- `/` — Landing Page (Public)
- `/hasil` — Student Result Verification & Analytics Portal (Public Student)
- `/login` — Unified Teacher & Admin Login Portal (Auth)
- `/guru` — Teacher Application & Assessment Analytics Panel (Authenticated Guru/Admin)
- `/admin` — Admin Control Center & System Configuration Panel (Authenticated Admin)

## 5. Module Structure
- `src/types/database.ts` — Definisi tipe TypeScript untuk 21 entitas skema database.
- `src/services/mockData.ts` — Data benih (*seed data*) terstruktur sekolah SMA Negeri 1 Utama.
- `src/services/database.ts` — Layer layanan penyimpanan lokal/Supabase, terintegrasi localStorage dan logger audit otomatis.
- `src/services/scoring.ts` — Engine kalkulasi skor deterministik dan pendeteksi selisih skor Google Form.
- `src/services/analytics.ts` — Engine analisis psikometrik butir soal ($p$-value, $D$-value, distraktor) dan daya serap KD.
- `src/services/googleIntegration.ts` — Integration layer pengurai, pemvalidasi, dan penyedia pratinjau data Google Sheets.
- `src/services/export.ts` — Engine pembuat dokumen Laporan PDF (jsPDF) dan Lembar Kerja Excel (XLSX).
- `src/services/gemini.ts` — Layanan diagnosa belajar berbasis Gemini AI SDK.

## 6. End-to-End Operational Flows

### A. Google Forms & Sheets Flow
```
[Siswa Mengerjakan Google Form]
              │
              ▼
[Respons Terkumpul di Google Sheet]
              │
              ▼
[Guru Salin / Impor Data Sheet ke Integration Layer]
              │
              ▼
[TAHAP 1: VALIDASI]
- Verifikasi NISN terhadap Database Siswa
- Cocokkan Kode Unik Soal (e.g. MAT-TO03-Q015)
- Hitung ulang skor kalkulasi database
              │
              ▼
[TAHAP 2: PRATINJAU (PREVIEW)]
- Tampilkan Tabel Pratinjau
- Tandai Status: MATCH (Selaras) vs SCORING_MISMATCH (Ada Selisih)
- Peringatkan NISN tidak terdaftar atau submission ganda
              │
              ▼
[TAHAP 3: KONFIRMASI (CONFIRM)]
- Konfirmasi Guru
- Simpan ke entitas `responses`, `answers`, `scores`
- Perbarui `question_analysis` & Audit Log
```

### B. Scoring Flow
1. Setiap jawaban siswa dibandingkan dengan kunci jawaban pada entitas `questions`.
2. Bobot soal diterapkan:
   - *Equal Weighting*: Setiap soal memiliki bobot seimbang (e.g. +5 poin per soal benar).
   - *Custom Weighting*: Bobot khusus per soal dengan dukungan *negative marking* (e.g. Benar +4, Salah -1, Kosong 0).
3. Skor kalkulasi dinormalisasi ke skala 0–100:
   $$\text{Calculated Score} = \min\left(100, \max\left(0, \frac{\text{Raw Score}}{\text{Max Possible Raw}} \times 100\right)\right)$$
4. Selisih dengan skor Google Form dihitung:
   $$\text{score\_difference} = |\text{google\_form\_score} - \text{calculated\_score}|$$
5. Jika $\text{score\_difference} \le 0.01$, status = `MATCH`.
6. Jika $\text{score\_difference} > 0.01$, status = `SCORING_MISMATCH`. Kedua nilai disimpan tanpa *silent overwrite*.

### C. Analytics Flow
1. **Tingkat Kesukaran ($p$-value)**:
   $$p = \frac{\text{Jumlah Siswa Benar}}{\text{Total Responden}}$$
   Kategori: Sangat Mudah ($p > 0.8$), Mudah ($0.6 < p \le 0.8$), Sedang ($0.4 < p \le 0.6$), Sulit ($0.2 < p \le 0.4$), Sangat Sulit ($p \le 0.2$).
2. **Daya Pembeda ($D$-value)**:
   $$D = p_{\text{Kelompok Atas (27\%)}} - p_{\text{Kelompok Bawah (27\%)}}$$
   Kategori: Sangat Baik ($D \ge 0.40$), Baik ($0.30 \le D < 0.40$), Cukup ($0.20 \le D < 0.30$), Buruk ($D < 0.20$).
3. **Analisis Distraktor**: Menghitung frekuensi pemilih opsi A, B, C, D, E, dan Kosong.
4. **Pemetaan Kompetensi Dasar (KD)**: Menghitung persentase keberhasilan per KD untuk mengidentifikasi materi kuat dan lemah.

### D. Explanation Flow
1. Guru membuat pembahasan pada panel `/guru`.
2. Pembahasan dapat bersifat umum (Try Out wide) atau khusus nomor soal (`question_id`).
3. Guru dapat melampirkan Teks Penjelasan, Dokumen PDF (URL/Storage), dan Video YouTube.
4. Status diawali sebagai `DRAFT`.
5. Pembahasan diubah ke status `PUBLISHED` agar dapat diakses oleh siswa di portal `/hasil`.

### E. Reporting Flow
1. **Siswa PDF Report**: Dihasilkan via `ExportService.exportStudentPDF` berisi identitas siswa, ringkasan skor, breakdown benar/salah/kosong, perbandingan target, indikator match, dan garansi keaslian.
2. **Teacher Class Excel Report**: Dihasilkan via `ExportService.exportClassToExcel` berisi sheet Rekap Nilai, NISN, skor kalkulasi vs GForm, selisih, dan rincian jawaban.

## 7. Security & Isolation Overview
- **Student Data Isolation**: Siswa di portal `/hasil` hanya dapat melihat data dirinya sendiri berdasarkan verifikasi NISN aktif. Tidak ada API list atau UI yang mengekspos daftar siswa lain.
- **Role Validation**: Akses ke `/admin` dan `/guru` dilindungi *Auth Guard* berbasis peran pengguna.
- **Audit Logging**: Seluruh transaksi penting (login, impor Google Sheets, pembuatan soal, perubahan skor, publikasi pembahasan) dicatat secara otomatis pada entitas `audit_logs`.

## 8. Deployment Overview
- **Build System**: Vite bundler (`npm run build`).
- **Runtime Environment**: Node.js / Express server (`server.ts`) atau Vite Preview Container pada Port 3000.
- **Metadata Sync**: `metadata.json` dan `index.html` selalu tersinkronisasi.
