# 📋 Panduan Deployment untuk Sekolah Baru

> Panduan ini ditujukan untuk **staf IT atau operator** sekolah yang ingin menggunakan aplikasi Analisis Ujian secara mandiri.
> Tidak diperlukan kemampuan coding — cukup ikuti langkah-langkah di bawah ini.

---

## ✅ Yang Anda Butuhkan Sebelum Mulai

Pastikan Anda sudah memiliki:

- [ ] Akun **GitHub** (gratis) → [github.com](https://github.com)
- [ ] Akun **Supabase** (gratis) → [supabase.com](https://supabase.com)
- [ ] Akun **Vercel** (gratis) → [vercel.com](https://vercel.com)

> 💡 Ketiga layanan di atas **sepenuhnya gratis** untuk pemakaian normal sekolah.

---

## 🗺️ Gambaran Besar (3 Langkah Utama)

```
GitHub (kode aplikasi)
      ↓
Supabase (database sekolah Anda)
      ↓
Vercel (website yang bisa diakses guru & siswa)
```

---

## LANGKAH 1 — Fork Repository di GitHub

1. Buka repository aplikasi ini di GitHub
2. Klik tombol **"Fork"** di pojok kanan atas
3. Pilih akun GitHub Anda → klik **"Create fork"**
4. Sekarang Anda punya salinan kode sendiri di akun GitHub Anda

> ✅ **Selesai langkah 1** — Anda punya "resep" aplikasi sendiri

---

## LANGKAH 2 — Buat Database Sekolah di Supabase

### 2a. Buat Project Baru

1. Login ke [app.supabase.com](https://app.supabase.com)
2. Klik **"New project"**
3. Isi:
   - **Name**: nama sekolah Anda (contoh: `smkn2-kotaX`)
   - **Database Password**: buat password yang kuat, **simpan baik-baik!**
   - **Region**: pilih **Southeast Asia (Singapore)**
4. Klik **"Create new project"** — tunggu sekitar 1-2 menit hingga selesai

### 2b. Jalankan Struktur Database (Migration)

> ⚠️ **Penting:** Lakukan langkah ini secara berurutan, jangan dilewati atau diacak.

1. Di dashboard Supabase, klik menu **"SQL Editor"** di sebelah kiri
2. Buka folder `supabase/migrations/` di repository GitHub Anda
3. **Jalankan file satu per satu** dengan cara:
   - Buka file migration (misalnya `001_initial_schema.sql`)
   - Klik tombol **"Raw"** di GitHub untuk melihat isi teks lengkapnya
   - **Select All** (Ctrl+A) → **Copy** (Ctrl+C)
   - Kembali ke SQL Editor Supabase → **Paste** (Ctrl+V)
   - Klik tombol **"Run"** (atau tekan Ctrl+Enter)
   - Tunggu hingga muncul pesan sukses
4. Ulangi untuk file berikutnya **sesuai urutan nomor**:

| Urutan | File | Keterangan |
|--------|------|------------|
| 1 | `001_initial_schema.sql` | Tabel utama (user, guru, siswa, kelas) |
| 2 | `002_exam_packages.sql` | Tabel paket ujian |
| 3 | `003_flexible_grade_level.sql` | Pengaturan tingkat kelas |
| 4 | `004_fix_rls_policies.sql` | Keamanan akses data |
| 5 | `005_enable_realtime_and_sync_rls.sql` | Sinkronisasi realtime |
| 6 | `006_create_school_profile_table.sql` | Profil sekolah |
| 7 | `007_add_is_answer_key_account.sql` | Akun kunci jawaban |

### 2c. Ambil Kunci API Supabase

1. Di dashboard Supabase, klik **"Settings"** (ikon gear) → **"API"**
2. Catat dua nilai berikut — Anda akan butuhkan di Langkah 3:
   - **Project URL** → bentuknya seperti `https://abcdefgh.supabase.co`
   - **anon/public key** → teks panjang dimulai dengan `eyJhbGci...`

> ✅ **Selesai langkah 2** — Database sekolah Anda sudah siap

---

## LANGKAH 3 — Deploy Website di Vercel

### 3a. Buat Project Baru di Vercel

1. Login ke [vercel.com](https://vercel.com)
2. Klik **"Add New..."** → **"Project"**
3. Di bagian **"Import Git Repository"**, pilih repository fork Anda dari GitHub
4. Klik **"Import"**

### 3b. Isi Konfigurasi Environment Variables

> ⚠️ Ini langkah **paling penting**. Jangan sampai terlewat.

Sebelum klik Deploy, cari bagian **"Environment Variables"** dan tambahkan:

| Nama Variabel | Nilai | Keterangan |
|---------------|-------|------------|
| `VITE_SUPABASE_URL` | `https://xxxxx.supabase.co` | Project URL dari langkah 2c |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGci...` | anon key dari langkah 2c |
| `VITE_APP_NAME` | `Analisis Ujian - NAMA SEKOLAH` | Nama sekolah Anda |
| `VITE_APP_URL` | *(biarkan kosong dulu, isi setelah deploy)* | URL website Anda |

### 3c. Deploy

1. Klik **"Deploy"**
2. Tunggu sekitar 2-3 menit hingga selesai
3. Setelah selesai, Vercel akan memberikan URL website Anda
   - Contoh: `https://analisis-ujian-smkn2.vercel.app`

### 3d. (Opsional) Atur URL di Supabase

Agar fitur login bekerja dengan benar:

1. Kembali ke Supabase → **Authentication** → **URL Configuration**
2. Isi **Site URL** dengan URL Vercel Anda (contoh: `https://analisis-ujian-smkn2.vercel.app`)
3. Klik **Save**

> ✅ **Selesai langkah 3** — Website Anda sudah online!

---

## LANGKAH 4 — Pengaturan Pertama Kali (Setelah Deploy)

### Login pertama kali

Buka URL website Anda, lalu login menggunakan akun Admin default:

| Email | Password |
|-------|----------|
| `admin@sekolah.com` | `admin123` |

> ⚠️ **Ganti password ini segera setelah login pertama!**

### Yang harus dilakukan pertama kali:

1. **Isi Profil Sekolah** → Menu Admin → Profil Sekolah
   - Nama sekolah, alamat, nama kepala sekolah, NPSN, dll.

2. **Ganti Password Admin** → Menu Admin → Manajemen Pengguna

3. **Tambahkan Tahun Ajaran** yang aktif

4. **Tambahkan Data Guru, Kelas, dan Siswa**

---

## ❓ Pertanyaan Umum

**Q: Apakah data sekolah kami bercampur dengan sekolah lain?**
> Tidak. Setiap sekolah punya database Supabase sendiri yang sepenuhnya terpisah dan tidak bisa diakses oleh siapapun selain Anda.

**Q: Berapa biayanya?**
> Gratis untuk pemakaian normal (hingga ratusan siswa). Supabase dan Vercel menyediakan tier gratis yang cukup luas.

**Q: Apakah perlu internet untuk menggunakan aplikasi ini?**
> Ya, karena ini aplikasi berbasis web.

**Q: Bagaimana jika ada update/pembaruan aplikasi?**
> Anda perlu menarik (pull) perubahan terbaru dari repository asal ke fork Anda, lalu menjalankan migration SQL baru (jika ada). Akan ada pemberitahuan jika ada pembaruan penting.

**Q: Siapa yang bisa dihubungi jika ada kendala teknis?**
> Hubungi pengembang aplikasi ini untuk bantuan teknis lebih lanjut.

---

## 🔐 Catatan Keamanan Penting

- **JANGAN** membagikan `VITE_SUPABASE_ANON_KEY` kepada orang lain secara publik
- **JANGAN** membagikan password database Supabase Anda
- Segera ganti password Admin default setelah pertama kali login
- Gunakan password yang kuat untuk akun Admin

---

*Panduan ini dibuat untuk kemudahan deployment mandiri. Jika ada pertanyaan atau kendala, silakan hubungi tim pengembang.*
