# PROJECT CONTEXT — SCHOOL TRY OUT & ASSESSMENT ANALYTICS SYSTEM

## 1. System Vision & Purpose
**School Try Out & Assessment Analytics System** (Sistem Terpadu Pengelolaan Try Out, Analisis Butir Soal, Pemetaan Kompetensi, dan Portal Hasil Ujian Sekolah) adalah platform web manajemen ujian dan analisis psikometrik akademik untuk SMA Negeri 1 Utama.

Platform ini mengintegrasikan seluruh alur evaluasi belajar: dari pembuatan bank soal HOTS, pengumpulan jawaban melalui Google Forms & Google Sheets, perhitungan skor deterministik, identifikasi *scoring mismatch*, analisis butir soal (tingkat kesukaran $p$-value dan daya pembeda $D$-value), pemetaan daya serap kompetensi dasar (KD), hingga pembagian laporan hasil dan pembahasan terpublikasi bagi siswa.

## 2. Fundamental Architectural Principles
1. **Database First**: Seluruh status entitas (21 tabel PostgreSQL/Supabase) dikelola secara ketat berdasarkan integritas referensial dan kriteria skema.
2. **Security First**: Otentikasi berbasis peran (RBAC) yang terpisah tegas antara Admin/Guru dan Siswa. Siswa terisolasi sepenuhnya di portal `/hasil` dan tidak dapat melihat data siswa lain.
3. **Mobile First**: Antarmuka responsif yang dioptimalkan untuk tampilan ponsel pintar siswa saat melihat hasil ujian, serta tampilan desktop serbaguna untuk Guru dan Admin.
4. **No Silent Data Mutation**: Setiap perbedaan antara skor Google Form dan hasil kalkulasi ulang database memicu status `SCORING_MISMATCH` tanpa penimpaan data secara diam-diam (*no silent overwrite*).
5. **Validation Before Persistence**: Seluruh impor dari Google Sheets wajib melewati alur Validasi $\rightarrow$ Pratinjau $\rightarrow$ Konfirmasi sebelum disimpan secara permanen.
6. **Explicit Data Flow**: Alur data bergerak secara eksplisit: Google Form $\rightarrow$ Google Sheets $\rightarrow$ Integration Layer $\rightarrow$ Validation $\rightarrow$ Preview $\rightarrow$ Confirm $\rightarrow$ Raw Responses $\rightarrow$ Scoring Engine $\rightarrow$ Analytics Engine.

## 3. Product Boundaries & Target Audience
- **Admin**: Pengelola utama sistem sekolah (data guru, siswa, kelas, mata pelajaran, tahun ajaran, konfigurasi scoring global, integrasi, audit logs).
- **Guru**: Pengelola akademis mata pelajaran (bank soal HOTS, analisis butir soal, pemetaan KD, impor respons Google Sheet, publikasi pembahasan, laporan kelas).
- **Siswa**: Pengguna portal publik `/hasil` untuk verifikasi NISN, melihat rekap nilai, indikator pencapaian target, analisis KD lemah, membaca pembahasan terpublikasi, serta mengunduh Laporan Resmi PDF.

## 4. Single Source of Truth
Seluruh keputusan teknis, aturan bisnis, skema basis data, dan kontrak API merujuk pada dokumentasi resmi di direktori `/docs`.
