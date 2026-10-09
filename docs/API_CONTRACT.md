# API CONTRACT & SERVICES SPECIFICATION

## 1. Authentication & Session API (`AuthService`)
- `login(email: string, password: string): Promise<{ user: User, token: string }>`
  - Pintu masuk tunggal untuk Guru dan Admin di `/login`.
- `logout(): Promise<void>`
  - Mengakhiri sesi dan mencatat aktivitas logout pada `audit_logs`.
- `verifyStudent(nisn: string, tryoutId: string): Promise<{ student: Student, score: Score, explanations: Explanation[] }>`
  - API publik terisolasi untuk portal `/hasil`. Hanya mengembalikan data siswa bersangkutan.

## 2. Google Integration API (`GoogleIntegrationService`)
- `parseRawSheetText(rawText: string): ParseResult`
  - Mengurai teks terstruktur (CSV/TSV) dari Google Sheets export/paste.
- `validateSheetImport(rows: Record<string, string>[], tryout: Tryout, questions: Question[], students: Student[]): SheetImportPreviewItem[]`
  - Tahap Validasi & Pratinjau: Memeriksa keberadaan NISN, mencocokkan kode unik soal (`MAT-TO03-Q015`), menghitung ulang skor, dan memberikan penanda `MATCH` vs `SCORING_MISMATCH`.
- `confirmImportBatch(previewItems: SheetImportPreviewItem[], currentUser: User): Promise<void>`
  - Persistensi permanen batch impor ke tabel `responses`, `answers`, `scores`, serta pencatatan audit log.

## 3. Analytics & Psychometrics API (`AnalyticsService`)
- `calculateQuestionItemAnalysis(questions: Question[], answersList: Array<Record<string, string>>, scoresList: Score[]): QuestionAnalysis[]`
  - Menghitung $p$-value (Tingkat Kesukaran), $D$-value (Daya Pembeda), dan distribusi opsi pilihan A/B/C/D/E/Kosong.
- `calculateStudentCompetencyMastery(studentAnswerMap: Record<string, string>, questions: Question[], competencies: Competency[], materials: Material[]): CompetencyMastery[]`
  - Menghitung persentase daya serap per Kompetensi Dasar (KD) untuk profil siswa.
- `calculateClassPerformance(scores: Score[], passingGrade: number): ClassPerformanceSummary`
  - Agregasi statistik kelas: rata-rata, median, nilai tertinggi, nilai terendah, dan tingkat kelulusan.

## 4. Export & Report API (`ExportService`)
- `exportStudentPDF(student: Student, score: Score, tryout: Tryout, classObj?: ClassRoom): void`
  - Draf dan unduh Laporan Hasil Ujian PDF Resmi berbasis jsPDF.
- `exportClassToExcel(className: string, tryoutTitle: string, students: Student[], scores: Score[]): void`
  - Ekspor rekapitulasi nilai dan status scoring ke format Excel (.xlsx).
