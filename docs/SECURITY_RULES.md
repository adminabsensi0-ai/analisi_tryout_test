# SECURITY RULES & ACCESS CONTROL SPECIFICATIONS

## 1. Row Level Security (RLS) Principles
Setiap tabel pada Supabase PostgreSQL wajib mengaktifkan `ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;`.

### A. Role Definitions
1. `service_role`: Akses internal penuh bypass RLS (digunakan terbatas oleh backend proxy server). **Kunci Service Role TIDAK PERNAH masuk ke sisi client / frontend**.
2. `authenticated`: Pengguna terautentikasi (Admin & Guru) yang memiliki sesi aktif melalui `authService`.
3. `anon` / Public: Akses publik terbatas untuk verifikasi hasil siswa di `/hasil`.

---

## 2. Protected Routes & Authorization Matrix

| Rute Web | Hak Akses Peran | Kebijakan & Penanganan Pelanggaran |
| :--- | :--- | :--- |
| `/` (Beranda) | Publik / Siapapun | Terbuka tanpa syarat autentikasi. |
| `/hasil` (Portal Siswa) | Publik / Siswa | Terbuka dengan validasi ganda NISN + NIS Sekolah. Akses data dibatasi ketat ke ID siswa bersangkutan (*Student Isolation*). |
| `/login` (Unified Login) | Publik / Belum Login | Menangani autentikasi kredensial Guru & Admin. Mendukung parameter query `?returnTo=...`. |
| `/admin` (Panel Admin) | **Hanya ADMIN** | Pengguna belum login diarahkan ke `/login?returnTo=/admin`. Pengguna dengan peran `GURU` diblokir langsung dengan layar **403 Forbidden** dan insiden dicatat di `audit_logs` dengan aksi `UNAUTHORIZED_ACCESS_ATTEMPT`. |
| `/guru` (Aplikasi Guru) | **GURU & ADMIN** | Pengguna belum login diarahkan ke `/login?returnTo=/guru`. Pengguna non-staff dilarang mengakses. |

---

## 3. Server-Side & Service-Level Mutation Protection
Otorisasi tidak boleh hanya bergantung pada antarmuka frontend (UI). Pada layer `DatabaseService` (`src/services/database.ts`):
- Seluruh mutasi data inti Admin (`addStudent`, `updateStudent`, `deleteStudent`, `addTeacher`, `updateTeacher`, `deleteTeacher`, `addClass`, `updateClass`, `deleteClass`, `addSubject`, `updateSubject`, `deleteSubject`, `addAcademicYear`, `toggleAcademicYear`, `addTryout`, `updateTryout`, `updateTryoutStatus`, `updateTryoutScoringConfig`, `deleteTryout`) memanggil pengawal:
  ```typescript
  private assertAdmin(currentUser: any, actionName: string)
  ```
- Jika pemanggil bukan `role === 'ADMIN'`, operasi langsung dibatalkan (*throws Error*), dan sistem mencatat `UNAUTHORIZED_MUTATION_ATTEMPT` ke `audit_logs`.
- Validasi duplikasi ketat diterapkan untuk mencegah NISN kembar, NIP kembar, kode mata pelajaran kembar, dan kode Try Out kembar.

---

## 4. RLS Policies per Role

### A. Student Isolation (`/hasil`)
- **Tabel `students`**:
  - `anon` / Public `SELECT`: Diizinkan query berdasarkan NISN persis.
- **Tabel `scores`, `answers`, `responses`**:
  - `anon` / Public `SELECT`: Hanya diizinkan membaca entri milik siswa terverifikasi (`student_id = <verified_student_id>`). Dilarang melakukan listing massal (*bulk listing*).
- **Tabel `explanations`**:
  - `anon` / Public `SELECT`: Hanya diizinkan membaca baris berstatus `status = 'PUBLISHED'`.
- **Dilarang**: Siswa/Anon tidak memiliki akses `INSERT`, `UPDATE`, atau `DELETE` pada tabel manapun.

### B. Teacher Isolation (`/guru`)
- **Tabel `questions`, `tryout_questions`, `materials`, `competencies`**:
  - `SELECT`, `INSERT`, `UPDATE`, `DELETE`: Hanya diizinkan jika `subject_id` termasuk dalam `teacher_subjects` atau `teachers.subject_permissions` milik guru yang login.
- **Tabel `responses`, `scores`, `answers`, `question_analysis`**:
  - `SELECT`, `INSERT`, `UPDATE`: Diizinkan untuk Try Out dan kelas yang diajar oleh guru terkait.
- **Tabel `explanations`**:
  - `INSERT`, `UPDATE`, `DELETE`: Guru hanya dapat mengedit pembahasan pada mata pelajaran wewenang.

### C. Admin Full Access (`/admin`)
- **Semua Tabel**:
  - Admin memiliki akses `ALL` (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) berdasarkan perannya di `users.role = 'ADMIN'`.

---

## 5. Storage & File Access Security
- Bucket `explanations_pdf`:
  - `READ`: Publik (untuk file terpublikasi) atau terautentikasi.
  - `WRITE`: Hanya Guru terautentikasi dan Admin.
- Service Role Key **TIDAK BOLEH** dipaparkan ke frontend client.

---

## 6. Audit Logging of Security Events
Sistem mencatat setiap aktivitas autentikasi dan pelanggaran otorisasi ke `audit_logs`:
- `LOGIN`: Pencatatan waktu, nama, peran, dan IP saat berhasil masuk.
- `LOGOUT`: Pencatatan sesi keluar.
- `UNAUTHORIZED_ACCESS_ATTEMPT`: Pencatatan rute target dan peran pengguna saat akses terlarang (403) dicegah oleh `ProtectedRoute`.
- `UNAUTHORIZED_MUTATION_ATTEMPT`: Pencatatan saat pengguna non-admin mencoba memanggil fungsi mutasi admin di database service.
- `SYSTEM_RESET`: Pencatatan saat database dikembalikan ke data pabrik default.

---

## 7. Security & Performance Hardening Specifications (Phase 13)
- **10 Attack Scenarios Hardening**:
  1. *Student Isolation*: Direct ID tampering between Student A and Student B blocked with strict 403 error and audit logging.
  2. *Teacher Isolation*: Mutation attempts on subjects or classes outside assigned scope rejected.
  3. *Secret Management*: Automatic scan prevents `SUPABASE_SERVICE_ROLE_KEY` or private keys exposure in client state.
  4. *Input Sanitization & XSS*: Automatic sanitization strips `<script>` tags, `javascript:` and `data:` protocols from inputs.
  5. *Rate Limiting*: Client IP request throttling enforces max 100 requests/minute.
  6. *Storage Blob Protection*: Storage files stored via metadata path (`pdfStoragePath`), preventing direct unverified binary blob exposure.
  7. *Import Idempotency*: Duplicate response/score imports detected and update existing records without creating duplicates.
  8. *Audit Logging*: Automated audit event generation for authentication, mutation, and security rejections.
  9. *Performance & SLA*: Map-indexed query architecture maintains sub-200ms response time for 900+ students, 29 classes, and 30,000+ answers.
  10. *RLS & Direct URL Protection*: Frontend & service-layer RLS guards intercept URL parameter tampering.

