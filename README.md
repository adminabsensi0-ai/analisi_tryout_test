# 📊 School Try Out & Assessment Analytics System
### Platform Analisis Ujian Sekolah, Psikometri Butir Soal, & Integrasi Google Form

[![Vite](https://img.shields.io/badge/Vite-8.3.0-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19.0.1-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-7.0.2-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-4.3.3-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat&logo=supabase&logoColor=white)](https://supabase.com/)

---

## 🌟 Tentang Aplikasi

**School Try Out & Assessment Analytics System** adalah aplikasi web modern yang dirancang untuk membantu sekolah (SMA/SMK/MA) mengelola seluruh siklus asesmen belajar:
- Pengumpulan jawaban ujian dari **Google Forms & Google Sheets**.
- Perhitungan skor deterministik dengan deteksi **Scoring Mismatch** (tanpa silent overwrite).
- Analisis psikometri butir soal otomatis: **Tingkat Kesukaran ($p$-value)**, **Daya Pembeda ($D$-value)**, dan **Efektivitas Pengecoh (Distraktor)**.
- Pemetaan daya serap **Kompetensi Dasar (KD)** per siswa dan per kelas.
- Portal hasil mandiri bagi siswa dengan autentikasi **Tanggal Lahir + NISN**.
- Ekspor laporan resmi dalam format **PDF Rapor Siswa** dan **Buku Kerja Excel (7 Sheet)**.

---

## 🏛️ Arsitektur & Peran Pengguna (RBAC)

Aplikasi memiliki pembagian peran yang terisolasi secara ketat:

| Peran | URL Portal | Deskripsi Hak Akses |
|---|---|---|
| **Admin** | `/admin` | Pengelolaan data master (Tahun Ajaran, Guru, Siswa, Kelas, Mata Pelajaran, Try Out, Parameter Skoring, Audit Logs). |
| **Wali Kelas** | `/wali-kelas` | Monitoring perkembangan kelas binaan, statistik per KD, siswa butuh intervensi, rekap peringkat nilai. |
| **Guru Mata Pelajaran** | `/guru` | Bank Soal HOTS, Impor Lembar Google Sheets, Analisis Psikometri Butir Soal, Publikasi Pembahasan Soal. |
| **Siswa** | `/hasil` | Portal mandiri untuk verifikasi NISN, melihat rekap skor, analisis kelemahan materi, pembahasan soal, & unduh PDF. |

---

## 🚀 Panduan Memulai Cepat (Lokal)

### 1. Prasyarat Sistem
- **Node.js** versi 18.x atau lebih baru
- **npm** atau **bun** / **yarn** / **pnpm**
- Akun [Supabase](https://supabase.com/) (gratis, untuk database produksi)

### 2. Kloning & Instalasi Dependensi
```bash
git clone https://github.com/USERNAME_ANDA/analisis-ujian.git
cd analisis-ujian
npm install
```

### 3. Konfigurasi Environment Variables
Salin file `.env.example` menjadi `.env.local`:
```bash
cp .env.example .env.local
```

Isi variabel di dalam `.env.local`:
```env
# Supabase (Wajib untuk mode Produksi)
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...

# App Config
VITE_APP_NAME=Analisis Ujian Sekolah
VITE_APP_URL=http://localhost:3000
```

> **Catatan Mode Demo:** Jika `VITE_SUPABASE_URL` belum diisi, aplikasi akan otomatis berjalan dalam **Mode Demo Offline** menggunakan penyimpanan lokal browser (`localStorage`) dengan data bawaan.

### 4. Menjalankan Server Pengembangan
```bash
npm run dev
```
Buka peramban di `http://localhost:3000`.

---

## 🗄️ Menyiapkan Basis Data Supabase (PostgreSQL)

Untuk menghubungkan aplikasi ke backend database PostgreSQL Supabase:

1. Buat proyek baru di [Supabase Dashboard](https://app.supabase.com/).
2. Buka menu **SQL Editor** pada proyek Anda.
3. Buka file [`supabase/migrations/001_initial_schema.sql`](supabase/migrations/001_initial_schema.sql), salin seluruh isinya, lalu klik **Run** untuk membuat 22 tabel, indeks, triggers, dan Row Level Security (RLS) policies.
4. Buka file [`supabase/seed.sql`](supabase/seed.sql), salin isinya, lalu klik **Run** untuk memasukkan data awal SMAN 1 Utama.
5. Salin **Project URL** dan **Anon Key** dari menu *Project Settings > API*, lalu tempelkan ke file `.env.local`.

---

## 🌐 Panduan Deployment ke Produksi

### 1. Hosting Frontend (Vercel) — Sangat Direkomendasikan
Aplikasi ini dioptimalkan untuk di-deploy di **Vercel**:
1. Buat akun di [Vercel](https://vercel.com/) dan hubungkan dengan repository GitHub Anda.
2. Pilih project `analisis-ujian`, pilih framework preset **Vite**.
3. Tambahkan Environment Variables di Vercel Dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Klik **Deploy**. Setiap push ke cabang `main` akan otomatis memicu deployment baru.

> 📖 **Panduan Lengkap untuk Sekolah Baru:**  
> Untuk panduan detail langkah demi langkah setup Supabase & Vercel bagi sekolah lain, lihat [docs/PANDUAN_DEPLOYMENT_SEKOLAH_BARU.md](docs/PANDUAN_DEPLOYMENT_SEKOLAH_BARU.md).

### 2. Konfigurasi Domain Kustom Sekolah
Untuk menggunakan domain sekolah (misal: `tryout.sekolahanda.sch.id`):
1. Masuk ke Vercel Project > **Settings** > **Domains**.
2. Masukkan subdomain yang diinginkan (misal `tryout.sekolahanda.sch.id`).
3. Tambahkan CNAME record pada DNS Manager sekolah:
   - **Type:** `CNAME`
   - **Name:** `tryout`
   - **Target:** `cname.vercel-dns.com`
4. Sertifikat SSL HTTPS akan otomatis diterbitkan oleh Vercel.

---

## 🔑 Akun Uji Coba Demo

Tersedia akun demonstrasi bawaan untuk pengujian alur pengguna:

| Peran | Identitas / Email | NIP Kedinasan | Kata Sandi Demo |
|---|---|---|---|
| **Administrator** | `admin@sekolah.sch.id` | `196803121994031002` | `password123` |
| **Wali Kelas XII IPA 1** | `bambang@sekolah.sch.id` | `197205151998021001` | `password123` |
| **Guru Fisika** | `rifai@sekolah.sch.id` | `198211042008011005` | `password123` |
| **Siswa (Portal Hasil)** | Tanggal Lahir: `2008-05-14` | NISN: `0061234561` | *(Tanpa sandi, verifikasi 2-faktor)* |

*(Di halaman login juga disediakan tombol **1-Klik Demo Login** untuk kemudahan demonstrasi).*

---

## 📁 Struktur Direktori Proyek

```
analisis-ujian/
├── docs/                      # Dokumentasi spesifikasi arsitektur & aturan bisnis
│   ├── ARCHITECTURE.md        # Blueprint arsitektur modul & data flow
│   ├── DATABASE_SCHEMA.md     # Spesifikasi 22 tabel & ERD relasional
│   ├── SCORING_RULES.md       # Rumus normalisasi & verifikasi selisih nilai
│   └── SECURITY_RULES.md      # Kebijakan Row Level Security (RLS) & isolasi data
├── supabase/                  # Skrip basis data PostgreSQL
│   ├── migrations/            # 001_initial_schema.sql (Tabel, RLS, & Triggers)
│   └── seed.sql               # Data benih sekolah SMAN 1 Utama
├── src/
│   ├── components/            # Komponen UI modular
│   │   ├── ConfirmDialog.tsx  # Dialog konfirmasi aksi destruktif
│   │   ├── ErrorBoundary.tsx  # Penangkap runtime crash dengan fallback UI
│   │   ├── LoadingSkeleton.tsx# Animasi placeholder pemuatan data
│   │   ├── Navbar.tsx         # Navigasi utama adaptif peran
│   │   ├── ToastContainer.tsx # Notifikasi toast global sistem
│   │   └── ...
│   ├── context/               # React Context (ThemeContext dark/light mode)
│   ├── hooks/                 # Custom hooks (useAuth, useToast)
│   ├── lib/                   # Supabase client singleton & helper
│   ├── pages/                 # Halaman portal per peran
│   │   ├── AdminAppPage.tsx   # Panel konfigurasi sistem Admin
│   │   ├── GuruAppPage.tsx    # Bank soal & analisis psikometri Guru
│   │   ├── LoginPage.tsx      # Halaman autentikasi terpadu
│   │   ├── StudentPortalPage.tsx # Portal hasil mandiri siswa
│   │   └── WaliKelasAppPage.tsx  # Dashboard pembinaan Wali Kelas
│   ├── services/              # Logika bisnis inti & kalkulasi
│   │   ├── analytics.ts       # Engine psikometri (p-value, D-value, distraktor)
│   │   ├── auth.ts            # Layanan autentikasi aman & sesi
│   │   ├── database.ts        # Layer akses data (localStorage / Supabase)
│   │   ├── export.ts          # Generator PDF rapor & Excel 7 sheet
│   │   ├── googleIntegration.ts # Pipeline parsing & validasi Google Sheets
│   │   └── scoring.ts         # Engine kalkulasi skor & negative marking
│   ├── types/
│   │   └── database.ts        # Definisi TypeScript untuk 22 entitas basis data
│   ├── App.tsx                # Routing aplikasi & proteksi rute
│   └── main.tsx               # Titik masuk aplikasi dengan ErrorBoundary
├── .env.example               # Template variabel lingkungan
├── .gitignore                 # Konfigurasi file yang diabaikan git
├── package.json               # Konfigurasi dependensi npm
└── vite.config.ts             # Konfigurasi bundler Vite
```

---

## 📜 Lisensi & Kontribusi

Proyek ini dibuat untuk mendukung digitalisasi penilaian pendidikan di Indonesia.  
Silakan lakukan *fork* dan ajukan *pull request* untuk berkontribusi.
