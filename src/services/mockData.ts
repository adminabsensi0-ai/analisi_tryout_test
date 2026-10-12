import {
  User, Teacher, Student, ClassRoom, StudentClass, AcademicYear, Subject,
  TeacherSubject, Material, Competency, Tryout, TryoutSubject, Question,
  TryoutQuestion, GoogleForm, Response, Answer, Score, QuestionAnalysis,
  Explanation, AuditLog
} from '../types/database';

export const INITIAL_ACADEMIC_YEARS: AcademicYear[] = [
  { id: 'ay-2025-1', yearLabel: '2025/2026', semester: 'ODD', isActive: false },
  { id: 'ay-2025-2', yearLabel: '2025/2026', semester: 'EVEN', isActive: true },
];

export const INITIAL_USERS: User[] = [
  { id: 'u-admin-custom', email: 'admin@sekolah.com', role: 'ADMIN', name: 'admin', password: 'admin123', createdAt: '2025-07-01T08:00:00Z' },
  { id: 'u-admin', email: 'admin@sekolah.sch.id', role: 'ADMIN', name: 'Drs. Supriyadi, M.Pd', password: 'password123', createdAt: '2025-07-01T08:00:00Z' },
  { id: 'u-guru1', email: 'bambang@sekolah.sch.id', role: 'WALI_KELAS', name: 'Drs. Bambang Sugiarto', password: 'password123', createdAt: '2025-07-01T08:00:00Z' },
  { id: 'u-guru2', email: 'siti@sekolah.sch.id', role: 'WALI_KELAS', name: 'Dra. Siti Nurhaliza', password: 'password123', createdAt: '2025-07-01T08:00:00Z' },
  { id: 'u-guru3', email: 'rifai@sekolah.sch.id', role: 'GURU', name: 'Ahmad Rifai, M.Pd', password: 'password123', createdAt: '2025-07-01T08:00:00Z' },
  { id: 'u-guru4', email: 'endang@sekolah.sch.id', role: 'GURU', name: 'Endang Rahayu, S.Pd', password: 'password123', createdAt: '2025-07-01T08:00:00Z' },
];

export const INITIAL_TEACHERS: Teacher[] = [
  { id: 't-1', userId: 'u-admin', nip: '196803121994031002', name: 'Drs. Supriyadi, M.Pd', email: 'admin@sekolah.sch.id', phone: '081234567890', subjectPermissions: ['subj-mat', 'subj-fis', 'subj-bin', 'subj-bio'], classPermissions: ['c-xii-ipa1', 'c-xii-ipa2', 'c-xii-ips1', 'c-xii-ips2'] },
  { id: 't-2', userId: 'u-guru1', nip: '197205151998021001', name: 'Drs. Bambang Sugiarto', email: 'bambang@sekolah.sch.id', phone: '081298765432', subjectPermissions: ['subj-mat'], classPermissions: ['c-xii-ipa1', 'c-xii-ipa2'], isWaliKelas: true, homeRoomClassId: 'c-xii-ipa1' },
  { id: 't-3', userId: 'u-guru2', nip: '197508202002122003', name: 'Dra. Siti Nurhaliza', email: 'siti@sekolah.sch.id', phone: '081311223344', subjectPermissions: ['subj-bin'], classPermissions: ['c-xii-ipa1', 'c-xii-ipa2'], isWaliKelas: true, homeRoomClassId: 'c-xii-ips1' },
  { id: 't-4', userId: 'u-guru3', nip: '198211042008011005', name: 'Ahmad Rifai, M.Pd', email: 'rifai@sekolah.sch.id', phone: '081555667788', subjectPermissions: ['subj-fis'], classPermissions: ['c-xii-ipa1', 'c-xii-ipa2'], isWaliKelas: true, homeRoomClassId: 'c-xii-ipa2' },
  { id: 't-5', userId: 'u-guru4', nip: '198604182010012012', name: 'Endang Rahayu, S.Pd', email: 'endang@sekolah.sch.id', phone: '081777889900', subjectPermissions: ['subj-bio'], classPermissions: ['c-xii-ipa1'], isWaliKelas: true, homeRoomClassId: 'c-xii-ips2' },
];

export const INITIAL_CLASSES: ClassRoom[] = [
  { id: 'c-xii-ipa1', name: 'XII IPA 1', gradeLevel: 'XII', academicYearId: 'ay-2025-2', homeRoomTeacherId: 't-2' },
  { id: 'c-xii-ipa2', name: 'XII IPA 2', gradeLevel: 'XII', academicYearId: 'ay-2025-2', homeRoomTeacherId: 't-4' },
  { id: 'c-xii-ips1', name: 'XII IPS 1', gradeLevel: 'XII', academicYearId: 'ay-2025-2', homeRoomTeacherId: 't-3' },
  { id: 'c-xii-ips2', name: 'XII IPS 2', gradeLevel: 'XII', academicYearId: 'ay-2025-2', homeRoomTeacherId: 't-5' },
];

export const INITIAL_SUBJECTS: Subject[] = [
  { id: 'subj-mat', code: 'MAT', name: 'Matematika IPA', category: 'PEMINATAN', passingGrade: 75 },
  { id: 'subj-fis', code: 'FIS', name: 'Fisika', category: 'PEMINATAN', passingGrade: 75 },
  { id: 'subj-bin', code: 'BIN', name: 'Bahasa Indonesia', category: 'WAJIB', passingGrade: 78 },
  { id: 'subj-bio', code: 'BIO', name: 'Biologi', category: 'PEMINATAN', passingGrade: 75 },
];

export const INITIAL_TEACHER_SUBJECTS: TeacherSubject[] = [
  { id: 'ts-1', teacherId: 't-2', subjectId: 'subj-mat', classId: 'c-xii-ipa1' },
  { id: 'ts-2', teacherId: 't-2', subjectId: 'subj-mat', classId: 'c-xii-ipa2' },
  { id: 'ts-3', teacherId: 't-3', subjectId: 'subj-bin', classId: 'c-xii-ipa1' },
  { id: 'ts-4', teacherId: 't-3', subjectId: 'subj-bin', classId: 'c-xii-ipa2' },
  { id: 'ts-5', teacherId: 't-4', subjectId: 'subj-fis', classId: 'c-xii-ipa1' },
  { id: 'ts-6', teacherId: 't-4', subjectId: 'subj-fis', classId: 'c-xii-ipa2' },
  { id: 'ts-7', teacherId: 't-5', subjectId: 'subj-bio', classId: 'c-xii-ipa1' },
];

export const INITIAL_MATERIALS: Material[] = [
  // Matematika
  { id: 'm-mat-1', subjectId: 'subj-mat', code: 'MAT-01', title: 'Kalkulus & Turunan', description: 'Turunan fungsi aljabar, trigonometri, dan aplikasi nilai maksimum/minimum.', googleFormUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSc_SampleMatKalkulus/viewform' },
  { id: 'm-mat-2', subjectId: 'subj-mat', code: 'MAT-02', title: 'Integral Tentu & Tak Tentu', description: 'Integral fungsi, luas daerah, dan volume benda putar.', googleFormUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSc_SampleMatIntegral/viewform' },
  { id: 'm-mat-3', subjectId: 'subj-mat', code: 'MAT-03', title: 'Geometri Dimensi Tiga', description: 'Jarak titik ke garis, jarak titik ke bidang, dan sudut antar bidang.', googleFormUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSc_SampleMatGeometri/viewform' },
  { id: 'm-mat-4', subjectId: 'subj-mat', code: 'MAT-04', title: 'Statistika & Peluang', description: 'Ukuran pemusatan data, penyebaran, kombinatorika, dan peluang kejadian.', googleFormUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSc_SampleMatStatistika/viewform' },

  // Fisika
  { id: 'm-fis-1', subjectId: 'subj-fis', code: 'FIS-01', title: 'Dinamika Rotasi & Benda Tegar', description: 'Momen inersia, torsi, dan hukum kekekalan momentum sudut.', googleFormUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSc_SampleFisRotasi/viewform' },
  { id: 'm-fis-2', subjectId: 'subj-fis', code: 'FIS-02', title: 'Listrik Dinamis & Magnet', description: 'Hukum Ohm, Kirchhoff, medan magnetik, dan induksi elektromagnetik.', googleFormUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSc_SampleFisListrik/viewform' },
  { id: 'm-fis-3', subjectId: 'subj-fis', code: 'FIS-03', title: 'Gelombang & Optik', description: 'Gelombang bunyi, cahaya, interferensi, difraksi, dan alat optik.', googleFormUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSc_SampleFisGelombang/viewform' },

  // Bahasa Indonesia
  { id: 'm-bin-1', subjectId: 'subj-bin', code: 'BIN-01', title: 'Teks Argumentasi & Editorial', description: 'Ide pokok, kalimat utama, fakta vs opini, dan struktur teks.', googleFormUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSc_SampleBinEditorial/viewform' },
  { id: 'm-bin-2', subjectId: 'subj-bin', code: 'BIN-02', title: 'Literasi Bahasa & Ejaan', description: 'PUEBI/Ejaan Bahasa Indonesia, kaidah konjungsi, dan keefektifan kalimat.', googleFormUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSc_SampleBinLiterasi/viewform' },
];

export const INITIAL_COMPETENCIES: Competency[] = [
  // Matematika
  { id: 'comp-mat-1', subjectId: 'subj-mat', code: 'KD-3.1', statement: 'Menganalisis konsep turunan fungsi dan penerapannya dalam mengoptimalkan nilai fungsi.', gradeLevel: 'XII' },
  { id: 'comp-mat-2', subjectId: 'subj-mat', code: 'KD-3.2', statement: 'Memahami konsep integral tentu dan menggunakannya untuk menghitung luas daerah.', gradeLevel: 'XII' },
  { id: 'comp-mat-3', subjectId: 'subj-mat', code: 'KD-3.3', statement: 'Determining jarak dan sudut dalam ruang dimensi tiga.', gradeLevel: 'XII' },
  { id: 'comp-mat-4', subjectId: 'subj-mat', code: 'KD-3.4', statement: 'Menganalisis kaidah pencacahan dan peluang kejadian majemuk.', gradeLevel: 'XII' },

  // Fisika
  { id: 'comp-fis-1', subjectId: 'subj-fis', code: 'KD-3.1', statement: 'Menerapkan konsep torsi dan momen inersia pada benda tegar.', gradeLevel: 'XII' },
  { id: 'comp-fis-2', subjectId: 'subj-fis', code: 'KD-3.2', statement: 'Menganalisis prinsip kerja rangkaian listrik arus searah dan bolak-balik.', gradeLevel: 'XII' },

  // Bahasa Indonesia
  { id: 'comp-bin-1', subjectId: 'subj-bin', code: 'KD-3.1', statement: 'Mengevaluasi informasi opini dan fakta dalam teks editorial.', gradeLevel: 'XII' },
];

export const INITIAL_STUDENTS: Student[] = [
  { id: 's-1', nisn: '0061234561', nis: '232412001', name: 'Aditya Pratama', gender: 'L', classId: 'c-xii-ipa1', birthDate: '2008-05-14', email: 'aditya@student.sch.id', targetScore: 82.5 },
  { id: 's-2', nisn: '0061234562', nis: '232412002', name: 'Annisa Rahmawati', gender: 'P', classId: 'c-xii-ipa1', birthDate: '2008-08-20', email: 'annisa@student.sch.id', targetScore: 88.0 },
  { id: 's-3', nisn: '0061234563', nis: '232412003', name: 'Bagas Kurniawan', gender: 'L', classId: 'c-xii-ipa1', birthDate: '2008-03-10', email: 'bagas@student.sch.id', targetScore: 78.0 },
  { id: 's-4', nisn: '0061234564', nis: '232412004', name: 'Dian Sastro Utami', gender: 'P', classId: 'c-xii-ipa1', birthDate: '2008-11-25', email: 'dian@student.sch.id', targetScore: 85.0 },
  { id: 's-5', nisn: '0061234565', nis: '232412005', name: 'Eko Prasetyo', gender: 'L', classId: 'c-xii-ipa1', birthDate: '2008-01-05', email: 'eko@student.sch.id', targetScore: 75.0 },
  { id: 's-6', nisn: '0061234566', nis: '232412006', name: 'Fikri Haikal', gender: 'L', classId: 'c-xii-ipa1', birthDate: '2008-06-18', email: 'fikri@student.sch.id', targetScore: 80.0 },
  { id: 's-7', nisn: '0061234567', nis: '232412007', name: 'Gita Gutawa', gender: 'P', classId: 'c-xii-ipa1', birthDate: '2008-09-12', email: 'gita@student.sch.id', targetScore: 90.0 },
  { id: 's-8', nisn: '0061234568', nis: '232412008', name: 'Hendra Setiawan', gender: 'L', classId: 'c-xii-ipa1', birthDate: '2008-04-02', email: 'hendra@student.sch.id', targetScore: 72.0 },
  { id: 's-9', nisn: '0061234569', nis: '232412009', name: 'Indah Permatasari', gender: 'P', classId: 'c-xii-ipa1', birthDate: '2008-07-22', email: 'indah@student.sch.id', targetScore: 86.0 },
  { id: 's-10', nisn: '0061234570', nis: '232412010', name: 'Joko Widodo Putra', gender: 'L', classId: 'c-xii-ipa1', birthDate: '2008-12-30', email: 'joko@student.sch.id', targetScore: 79.0 },

  // IPA 2
  { id: 's-11', nisn: '0061234571', nis: '232412011', name: 'Kevin Sanjaya', gender: 'L', classId: 'c-xii-ipa2', birthDate: '2008-02-14', email: 'kevin@student.sch.id', targetScore: 84.0 },
  { id: 's-12', nisn: '0061234572', nis: '232412012', name: 'Larasati Putri', gender: 'P', classId: 'c-xii-ipa2', birthDate: '2008-10-08', email: 'laras@student.sch.id', targetScore: 87.5 },
  { id: 's-13', nisn: '0061234573', nis: '232412013', name: 'Muhammad Rizky', gender: 'L', classId: 'c-xii-ipa2', birthDate: '2008-05-01', email: 'mrizky@student.sch.id', targetScore: 76.0 },
  { id: 's-14', nisn: '0061234574', nis: '232412014', name: 'Nadia Safira', gender: 'P', classId: 'c-xii-ipa2', birthDate: '2008-03-28', email: 'nadia@student.sch.id', targetScore: 81.0 },
  { id: 's-15', nisn: '0061234575', nis: '232412015', name: 'Oktavianus Dwi', gender: 'L', classId: 'c-xii-ipa2', birthDate: '2008-10-15', email: 'okta@student.sch.id', targetScore: 74.0 },
];

export const INITIAL_TRYOUTS: Tryout[] = [
  {
    id: 'to-1',
    code: 'UH-2025-01',
    title: 'Ulangan Harian 1 — Matriks & Vektor (UH)',
    assessmentType: 'UH',
    academicYearId: 'ay-2025-1',
    startDate: '2025-09-10T07:30:00Z',
    endDate: '2025-09-12T15:00:00Z',
    status: 'COMPLETED',
    scoringConfig: {
      scoreSource: 'GOOGLE_FORM',
      scoringType: 'EQUAL_WEIGHT',
      maxScore: 100,
      correctScore: 5,
      wrongScore: 0,
      unansweredScore: 0,
      allowNegativeMarking: false,
      hasEssay: true,
      essayWeightPercent: 30,
      passingGrade: 75,
    },
    description: 'Ulangan Harian Asesmen Formatif per KD 3.1 dengan kombinasi 70% Pilihan Ganda + 30% Uraian.',
    googleFormUrl: 'https://forms.google.com/sample-form-to1',
    googleSheetUrl: 'https://docs.google.com/spreadsheets/d/sample-sheet-to1/edit',
  },
  {
    id: 'to-2',
    code: 'PTS-2025-01',
    title: 'Penilaian Tengah Semester (PTS Ganjil)',
    assessmentType: 'PTS',
    academicYearId: 'ay-2025-1',
    startDate: '2025-11-15T07:30:00Z',
    endDate: '2025-11-17T15:00:00Z',
    status: 'COMPLETED',
    scoringConfig: {
      scoreSource: 'GOOGLE_FORM',
      scoringType: 'EQUAL_WEIGHT',
      maxScore: 100,
      correctScore: 5,
      wrongScore: 0,
      unansweredScore: 0,
      allowNegativeMarking: false,
      hasEssay: true,
      essayWeightPercent: 20,
      passingGrade: 75,
    },
    description: 'Evaluasi Penilaian Tengah Semester untuk mengukur KKM/KKTP siswa.',
    googleFormUrl: 'https://forms.google.com/sample-form-to2',
    googleSheetUrl: 'https://docs.google.com/spreadsheets/d/sample-sheet-to2/edit',
  },
  {
    id: 'to-3',
    code: 'TO-2026-03',
    title: 'Try Out Akbar 3 — Persiapan SNBT & UTBK',
    assessmentType: 'TRYOUT',
    academicYearId: 'ay-2025-2',
    startDate: '2026-02-10T07:30:00Z',
    endDate: '2026-02-12T15:00:00Z',
    status: 'COMPLETED',
    scoringConfig: {
      scoreSource: 'GOOGLE_FORM',
      scoringType: 'EQUAL_WEIGHT',
      maxScore: 100,
      correctScore: 5,
      wrongScore: 0,
      unansweredScore: 0,
      allowNegativeMarking: false,
      hasEssay: false,
      essayWeightPercent: 0,
      passingGrade: 80,
    },
    description: 'Simulasi kedua SNBT dengan integrasi Google Form & Sheets import.',
    googleFormUrl: 'https://forms.google.com/sample-form-to3',
    googleSheetUrl: 'https://docs.google.com/spreadsheets/d/sample-sheet-to3/edit',
  },
  {
    id: 'to-4',
    code: 'TO-2026-04',
    title: 'Try Out 4 — Final Intensif Ujian Sekolah & SNBT 2026',
    academicYearId: 'ay-2025-2',
    startDate: '2026-03-25T07:30:00Z',
    endDate: '2026-04-05T15:00:00Z',
    status: 'ACTIVE',
    scoringConfig: {
      scoreSource: 'CUSTOM_ENGINE',
      scoringType: 'CUSTOM_WEIGHT',
      maxScore: 100,
      correctScore: 4,
      wrongScore: -1,
      unansweredScore: 0,
      allowNegativeMarking: true,
    },
    description: 'Try Out penentu kelulusan dan pemetaan minat PTN 2026.',
    googleFormUrl: 'https://forms.google.com/sample-form-to4',
    googleSheetUrl: 'https://docs.google.com/spreadsheets/d/sample-sheet-to4/edit',
  },
];

export const INITIAL_TRYOUT_SUBJECTS: TryoutSubject[] = [
  { id: 'tsub-1-mat', tryoutId: 'to-1', subjectId: 'subj-mat', totalQuestions: 20, durationMinutes: 60, passingGrade: 75 },
  { id: 'tsub-1-fis', tryoutId: 'to-1', subjectId: 'subj-fis', totalQuestions: 20, durationMinutes: 60, passingGrade: 70 },
  { id: 'tsub-2-mat', tryoutId: 'to-2', subjectId: 'subj-mat', totalQuestions: 20, durationMinutes: 60, passingGrade: 75 },
  { id: 'tsub-3-mat', tryoutId: 'to-3', subjectId: 'subj-mat', totalQuestions: 20, durationMinutes: 60, passingGrade: 75 },
  { id: 'tsub-3-fis', tryoutId: 'to-3', subjectId: 'subj-fis', totalQuestions: 20, durationMinutes: 60, passingGrade: 70 },
  { id: 'tsub-3-bin', tryoutId: 'to-3', subjectId: 'subj-bin', totalQuestions: 20, durationMinutes: 60, passingGrade: 80 },
  { id: 'tsub-4-mat', tryoutId: 'to-4', subjectId: 'subj-mat', totalQuestions: 20, durationMinutes: 60, passingGrade: 75 },
];

export const INITIAL_QUESTIONS: Question[] = [
  // Matematika TO-3 Questions (1 to 5 sample)
  {
    id: 'q-mat-1',
    uniqueCode: 'MAT-TO03-Q001',
    questionNumber: 1,
    subjectId: 'subj-mat',
    materialId: 'm-mat-1',
    competencyId: 'comp-mat-1',
    questionText: 'Turunan pertama dari fungsi f(x) = (3x^2 - 5)^4 adalah...',
    options: [
      { key: 'A', text: 'f\'(x) = 24x(3x^2 - 5)^3' },
      { key: 'B', text: 'f\'(x) = 12x(3x^2 - 5)^3' },
      { key: 'C', text: 'f\'(x) = 24(3x^2 - 5)^3' },
      { key: 'D', text: 'f\'(x) = 6x(3x^2 - 5)^3' },
      { key: 'E', text: 'f\'(x) = 4(3x^2 - 5)^3' },
    ],
    correctAnswer: 'A',
    weight: 1,
    cognitiveLevel: 'C4',
    status: 'ACTIVE',
  },
  {
    id: 'q-mat-2',
    uniqueCode: 'MAT-TO03-Q002',
    questionNumber: 2,
    subjectId: 'subj-mat',
    materialId: 'm-mat-1',
    competencyId: 'comp-mat-1',
    questionText: 'Nilai maksimum dari fungsi f(x) = -2x^2 + 8x - 3 pada interval [0, 5] adalah...',
    options: [
      { key: 'A', text: '5' },
      { key: 'B', text: '8' },
      { key: 'C', text: '3' },
      { key: 'D', text: '13' },
      { key: 'E', text: '-13' },
    ],
    correctAnswer: 'A',
    weight: 1,
    cognitiveLevel: 'C3',
    status: 'ACTIVE',
  },
  {
    id: 'q-mat-3',
    uniqueCode: 'MAT-TO03-Q003',
    questionNumber: 3,
    subjectId: 'subj-mat',
    materialId: 'm-mat-2',
    competencyId: 'comp-mat-2',
    questionText: 'Hasil dari integral ∫ (6x^2 - 4x + 3) dx adalah...',
    options: [
      { key: 'A', text: '2x^3 - 2x^2 + 3x + C' },
      { key: 'B', text: '3x^3 - 4x^2 + 3x + C' },
      { key: 'C', text: '6x^3 - 2x^2 + 3x + C' },
      { key: 'D', text: '2x^3 - 4x^2 + 3x + C' },
      { key: 'E', text: '18x^3 - 8x^2 + 3x + C' },
    ],
    correctAnswer: 'A',
    weight: 1,
    cognitiveLevel: 'C3',
    status: 'ACTIVE',
  },
  {
    id: 'q-mat-4',
    uniqueCode: 'MAT-TO03-Q004',
    questionNumber: 4,
    subjectId: 'subj-mat',
    materialId: 'm-mat-3',
    competencyId: 'comp-mat-3',
    questionText: 'Diketahui kubus ABCD.EFGH dengan panjang rusuk 8 cm. Jarak titik A ke garis HG adalah...',
    options: [
      { key: 'A', text: '8√2 cm' },
      { key: 'B', text: '8 cm' },
      { key: 'C', text: '4√2 cm' },
      { key: 'D', text: '8√3 cm' },
      { key: 'E', text: '4 cm' },
    ],
    correctAnswer: 'A',
    weight: 1,
    cognitiveLevel: 'C4',
    status: 'ACTIVE',
  },
  {
    id: 'q-mat-5',
    uniqueCode: 'MAT-TO03-Q005',
    questionNumber: 5,
    subjectId: 'subj-mat',
    materialId: 'm-mat-4',
    competencyId: 'comp-mat-4',
    questionText: 'Dari 8 orang calon pengurus OSIS akan dipilih ketua, wakil, dan sekretaris. Banyaknya susunan pengurus yang dapat dibentuk adalah...',
    options: [
      { key: 'A', text: '336' },
      { key: 'B', text: '56' },
      { key: 'C', text: '512' },
      { key: 'D', text: '120' },
      { key: 'E', text: '720' },
    ],
    correctAnswer: 'A',
    weight: 1,
    cognitiveLevel: 'C4',
    status: 'ACTIVE',
  },

  // Fisika Questions
  {
    id: 'q-fis-1',
    uniqueCode: 'FIS-TO03-Q001',
    questionNumber: 1,
    subjectId: 'subj-fis',
    materialId: 'm-fis-1',
    competencyId: 'comp-fis-1',
    questionText: 'Momen gaya (torsi) didefinisikan sebagai hasil kali silang antara vektor posisi r dan vektor gaya F. Jika r = 2m dan F = 10N dengan sudut 90°, besar torsi adalah...',
    options: [
      { key: 'A', text: '20 Nm' },
      { key: 'B', text: '10 Nm' },
      { key: 'C', text: '5 Nm' },
      { key: 'D', text: '40 Nm' },
      { key: 'E', text: '0 Nm' },
    ],
    correctAnswer: 'A',
    weight: 1,
    cognitiveLevel: 'C3',
    status: 'ACTIVE',
  },
  {
    id: 'q-fis-2',
    uniqueCode: 'FIS-TO03-Q002',
    questionNumber: 2,
    subjectId: 'subj-fis',
    materialId: 'm-fis-2',
    competencyId: 'comp-fis-2',
    questionText: 'Dua buah resistor 4 ohm dan 6 ohm dirangkai secara seri lalu dihubungkan ke sumber tegangan 20 Volt. Kuat arus total pada rangkaian adalah...',
    options: [
      { key: 'A', text: '2 A' },
      { key: 'B', text: '3 A' },
      { key: 'C', text: '4 A' },
      { key: 'D', text: '5 A' },
      { key: 'E', text: '1 A' },
    ],
    correctAnswer: 'A',
    weight: 1,
    cognitiveLevel: 'C3',
    status: 'ACTIVE',
  },

  // Bahasa Indonesia Questions
  {
    id: 'q-bin-1',
    uniqueCode: 'BIN-TO03-Q001',
    questionNumber: 1,
    subjectId: 'subj-bin',
    materialId: 'm-bin-1',
    competencyId: 'comp-bin-1',
    questionText: 'Manakah dari pernyataan berikut yang merupakan kalimat fakta dalam teks editorial?',
    options: [
      { key: 'A', text: 'Berdasarkan data BPS tahun 2025, angka pengangguran terbuka turun menjadi 4,8%.' },
      { key: 'B', text: 'Pemerintah seharusnya bekerja lebih keras dalam membuka lapangan pekerjaan.' },
      { key: 'C', text: 'Masyarakat mungkin merasa khawatir terhadap lonjakan harga bahan pokok.' },
      { key: 'D', text: 'Kebijakan ekonomi tahun ini tampaknya akan menuai pro dan kontra.' },
      { key: 'E', text: 'Sebaiknya subsidi energi segera dialihkan ke sektor pendidikan.' },
    ],
    correctAnswer: 'A',
    weight: 1,
    cognitiveLevel: 'C4',
    status: 'ACTIVE',
  },
  {
    id: 'q-bin-2',
    uniqueCode: 'BIN-TO03-Q002',
    questionNumber: 2,
    subjectId: 'subj-bin',
    materialId: 'm-bin-2',
    competencyId: 'comp-bin-1',
    questionText: 'Penulisan kata serapan dan tanda baca yang tepat menurut kaidah bahasa Indonesia adalah...',
    options: [
      { key: 'A', text: 'Analisis data kualitatif dilakukan secara sistematis.' },
      { key: 'B', text: 'Analisa data kwalitatif dilakukan secara sistimatis.' },
      { key: 'C', text: 'Analisis data kwalitatif dilakukan secara sistim.' },
      { key: 'D', text: 'Analisa data kualitatif dilakukan sistimatik.' },
      { key: 'E', text: 'Analisa data dilakukan secara kwalitas.' },
    ],
    correctAnswer: 'A',
    weight: 1,
    cognitiveLevel: 'C2',
    status: 'DRAFT',
  },
];

export const INITIAL_TRYOUT_QUESTIONS: TryoutQuestion[] = [
  { id: 'tq-1', tryoutId: 'to-3', questionId: 'q-mat-1', questionOrder: 1 },
  { id: 'tq-2', tryoutId: 'to-3', questionId: 'q-mat-2', questionOrder: 2 },
  { id: 'tq-3', tryoutId: 'to-3', questionId: 'q-mat-3', questionOrder: 3 },
  { id: 'tq-4', tryoutId: 'to-3', questionId: 'q-mat-4', questionOrder: 4 },
  { id: 'tq-5', tryoutId: 'to-3', questionId: 'q-mat-5', questionOrder: 5 },
  { id: 'tq-6', tryoutId: 'to-3', questionId: 'q-fis-1', questionOrder: 6 },
];

export const INITIAL_EXPLANATIONS: Explanation[] = [
  {
    id: 'exp-mat-1',
    tryoutId: 'to-3',
    subjectId: 'subj-mat',
    questionId: 'q-mat-1',
    title: 'Pembahasan Turunan Rantai F(x) = (3x^2 - 5)^4',
    contentText: 'Gunakan Aturan Rantai: f(x) = u^4 dengan u = 3x^2 - 5.\nf\'(x) = 4u^3 · u\' = 4(3x^2 - 5)^3 · (6x) = 24x(3x^2 - 5)^3.\nJawaban yang benar adalah A.',
    pdfUrl: 'https://sekolah.sch.id/storage/v1/object/public/explanations-storage/to-3/mat-to03-q001.pdf',
    pdfStoragePath: 'explanations-storage/to-3/mat-to03-q001.pdf',
    pdfFileName: 'mat-to03-q001.pdf',
    pdfFileSize: 1048576,
    youtubeUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    externalUrl: 'https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit',
    status: 'PUBLISHED',
    createdBy: 'u-guru1',
    authorName: 'Drs. Bambang Sugiarto',
    createdAt: '2026-02-13T10:00:00Z',
    updatedAt: '2026-02-13T10:00:00Z',
  },
  {
    id: 'exp-mat-2',
    tryoutId: 'to-3',
    subjectId: 'subj-mat',
    questionId: 'q-mat-2',
    title: 'Pembahasan Nilai Maksimum Fungsi Kuadrat Turunan',
    contentText: 'Cari titik stasioner dengan turunan f\'(x) = 0:\nf\'(x) = -4x + 8 = 0 => x = 2.\nEvaluasi f(2) = -2(2)^2 + 8(2) - 3 = -8 + 16 - 3 = 5.\nKarena x=2 berada di dalam interval [0, 5], maka nilai maksimumnya adalah 5 (Jawaban A).',
    status: 'PUBLISHED',
    createdBy: 'u-guru1',
    authorName: 'Drs. Bambang Sugiarto',
    createdAt: '2026-02-13T10:15:00Z',
    updatedAt: '2026-02-13T10:15:00Z',
  },
  {
    id: 'exp-mat-gen',
    tryoutId: 'to-3',
    subjectId: 'subj-mat',
    questionId: undefined, // General Try Out explanation
    title: 'Ringkasan Materi & Panduan Strategi Matematika TO-3',
    contentText: 'Panduan lengkap penyelesaian soal HOTS Matematika IPA Try Out 3. Fokus pada penguasaan turunan fungsi rantai, kalkulus integral, dan geometri ruang 3D.',
    pdfUrl: 'https://sekolah.sch.id/storage/v1/object/public/explanations-storage/to-3/Panduan_Lengkap_Matematika_TO3.pdf',
    pdfStoragePath: 'explanations-storage/to-3/Panduan_Lengkap_Matematika_TO3.pdf',
    pdfFileName: 'Panduan_Lengkap_Matematika_TO3.pdf',
    pdfFileSize: 2097152,
    youtubeUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    externalUrl: 'https://drive.google.com/file/d/1A2B3C4D5E6F7G8H9I0J/view',
    status: 'PUBLISHED',
    createdBy: 'u-guru1',
    authorName: 'Drs. Bambang Sugiarto',
    createdAt: '2026-02-13T11:00:00Z',
    updatedAt: '2026-02-13T11:00:00Z',
  },
  {
    id: 'exp-fis-gen',
    tryoutId: 'to-3',
    subjectId: 'subj-fis',
    questionId: undefined,
    title: 'Pembahasan Lengkap Solusi Fisika — Dinamika & Gelombang TO-3',
    contentText: 'Modul komprehensif bedah konsep Hukum II Newton, momen inersia, dan persamaan gelombang mekanik beserta contoh soal HOTS.',
    pdfUrl: 'https://sekolah.sch.id/storage/v1/object/public/explanations-storage/to-3/Modul_Solusi_Fisika_TO3.pdf',
    pdfStoragePath: 'explanations-storage/to-3/Modul_Solusi_Fisika_TO3.pdf',
    pdfFileName: 'Modul_Solusi_Fisika_TO3.pdf',
    pdfFileSize: 1843200,
    youtubeUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    externalUrl: 'https://drive.google.com/file/d/1F2G3H4I5J6K7L8M9N0O/view',
    status: 'PUBLISHED',
    createdBy: 'u-guru1',
    authorName: 'Dr. Hendra Gunawan, M.Si',
    createdAt: '2026-02-13T12:00:00Z',
    updatedAt: '2026-02-13T12:00:00Z',
  },
  {
    id: 'exp-bin-gen',
    tryoutId: 'to-3',
    subjectId: 'subj-bin',
    questionId: undefined,
    title: 'Pembahasan Bedah Teks & Literasi Bahasa Indonesia TO-3',
    contentText: 'Analisis struktur teks editorial, teknik menemukan ide pokok paragraf tersirat, dan ejaan baku sesuai PUEBI.',
    pdfUrl: 'https://sekolah.sch.id/storage/v1/object/public/explanations-storage/to-3/Pembahasan_BIndo_Literasi_TO3.pdf',
    pdfStoragePath: 'explanations-storage/to-3/Pembahasan_BIndo_Literasi_TO3.pdf',
    pdfFileName: 'Pembahasan_BIndo_Literasi_TO3.pdf',
    pdfFileSize: 1420000,
    youtubeUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    externalUrl: 'https://drive.google.com/file/d/1B2I3N4D5O6P7Q8R9S0T/view',
    status: 'PUBLISHED',
    createdBy: 'u-guru2',
    authorName: 'Siti Rahmawati, S.Pd',
    createdAt: '2026-02-13T13:00:00Z',
    updatedAt: '2026-02-13T13:00:00Z',
  },
  {
    id: 'exp-bio-gen',
    tryoutId: 'to-3',
    subjectId: 'subj-bio',
    questionId: undefined,
    title: 'Pembahasan Genetika & Metabolisme Biologi TO-3',
    contentText: 'Langkah mudah persilangan dihibrid Mendel, peta kromosom, respirasi seluler dan transkripsi translasi DNA.',
    pdfUrl: 'https://sekolah.sch.id/storage/v1/object/public/explanations-storage/to-3/Solusi_Genetika_Biologi_TO3.pdf',
    pdfStoragePath: 'explanations-storage/to-3/Solusi_Genetika_Biologi_TO3.pdf',
    pdfFileName: 'Solusi_Genetika_Biologi_TO3.pdf',
    pdfFileSize: 2200000,
    youtubeUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    externalUrl: 'https://drive.google.com/file/d/1B2I3O4L5O6G7Y8Z9A0B/view',
    status: 'PUBLISHED',
    createdBy: 'u-guru3',
    authorName: 'Nurul Hidayah, M.Pd',
    createdAt: '2026-02-13T14:00:00Z',
    updatedAt: '2026-02-13T14:00:00Z',
  },
  {
    id: 'exp-draft-1',
    tryoutId: 'to-3',
    subjectId: 'subj-mat',
    questionId: 'q-mat-3',
    title: 'Draf Pembahasan Integral Tentu & Luas Daerah',
    contentText: 'Draf penyusunan solusi integral tentu oleh guru. Belum terpublikasi ke siswa.',
    status: 'DRAFT',
    createdBy: 'u-guru1',
    authorName: 'Drs. Bambang Sugiarto',
    createdAt: '2026-02-14T08:00:00Z',
    updatedAt: '2026-02-14T08:00:00Z',
  },
  {
    id: 'exp-arch-1',
    tryoutId: 'to-3',
    subjectId: 'subj-mat',
    questionId: 'q-mat-4',
    title: 'Pembahasan Versi Lama Sifat Logaritma (Dearsip)',
    contentText: 'Pembahasan lama yang telah diarsipkan karena revisi kunci soal.',
    status: 'ARCHIVED',
    createdBy: 'u-guru1',
    authorName: 'Drs. Bambang Sugiarto',
    createdAt: '2026-02-10T09:00:00Z',
    updatedAt: '2026-02-12T14:00:00Z',
  },
];

// Initial Answer choices distribution for the 15 students across the 8 questions in TO-3
const STUDENT_ANSWERS_TO3: Record<string, Record<string, string>> = {
  's-1': { 'q-mat-1': 'A', 'q-mat-2': 'A', 'q-mat-3': 'A', 'q-mat-4': 'A', 'q-mat-5': 'B', 'q-fis-1': 'A', 'q-fis-2': 'A', 'q-bin-1': 'A' }, // 7/8 correct = 87.5%
  's-2': { 'q-mat-1': 'A', 'q-mat-2': 'A', 'q-mat-3': 'A', 'q-mat-4': 'A', 'q-mat-5': 'A', 'q-fis-1': 'A', 'q-fis-2': 'A', 'q-bin-1': 'B' }, // 7/8 correct = 87.5%
  's-3': { 'q-mat-1': 'A', 'q-mat-2': 'B', 'q-mat-3': 'A', 'q-mat-4': 'C', 'q-mat-5': 'A', 'q-fis-1': 'B', 'q-fis-2': 'A', 'q-bin-1': 'A' }, // 5/8 correct = 62.5% (Mismatch example)
  's-4': { 'q-mat-1': 'A', 'q-mat-2': 'A', 'q-mat-3': 'A', 'q-mat-4': 'A', 'q-mat-5': 'A', 'q-fis-1': 'A', 'q-fis-2': 'C', 'q-bin-1': 'A' }, // 7/8 correct
  's-5': { 'q-mat-1': 'A', 'q-mat-2': 'A', 'q-mat-3': 'B', 'q-mat-4': 'A', 'q-mat-5': 'B', 'q-fis-1': 'A', 'q-fis-2': 'A', 'q-bin-1': 'A' }, // 6/8 correct
  's-6': { 'q-mat-1': 'A', 'q-mat-2': 'A', 'q-mat-3': 'A', 'q-mat-4': 'B', 'q-mat-5': 'A', 'q-fis-1': 'B', 'q-fis-2': 'A', 'q-bin-1': 'A' }, // 6/8 correct
  's-7': { 'q-mat-1': 'A', 'q-mat-2': 'A', 'q-mat-3': 'A', 'q-mat-4': 'A', 'q-mat-5': 'A', 'q-fis-1': 'A', 'q-fis-2': 'A', 'q-bin-1': 'A' }, // 8/8 = 100%
  's-8': { 'q-mat-1': 'B', 'q-mat-2': 'A', 'q-mat-3': 'C', 'q-mat-4': 'A', 'q-mat-5': 'D', 'q-fis-1': 'A', 'q-fis-2': 'B', 'q-bin-1': 'A' }, // 4/8 = 50%
  's-9': { 'q-mat-1': 'A', 'q-mat-2': 'A', 'q-mat-3': 'A', 'q-mat-4': 'A', 'q-mat-5': 'A', 'q-fis-1': 'A', 'q-fis-2': 'A', 'q-bin-1': 'C' }, // 7/8 = 87.5%
  's-10': { 'q-mat-1': 'A', 'q-mat-2': 'B', 'q-mat-3': 'A', 'q-mat-4': 'A', 'q-mat-5': 'A', 'q-fis-1': 'A', 'q-fis-2': 'A', 'q-bin-1': 'A' }, // 7/8 = 87.5%
  // IPA 2
  's-11': { 'q-mat-1': 'A', 'q-mat-2': 'A', 'q-mat-3': 'A', 'q-mat-4': 'A', 'q-mat-5': 'B', 'q-fis-1': 'A', 'q-fis-2': 'A', 'q-bin-1': 'A' }, // 7/8
  's-12': { 'q-mat-1': 'A', 'q-mat-2': 'A', 'q-mat-3': 'A', 'q-mat-4': 'A', 'q-mat-5': 'A', 'q-fis-1': 'A', 'q-fis-2': 'A', 'q-bin-1': 'A' }, // 8/8 = 100%
  's-13': { 'q-mat-1': 'B', 'q-mat-2': 'C', 'q-mat-3': 'A', 'q-mat-4': 'A', 'q-mat-5': 'A', 'q-fis-1': 'A', 'q-fis-2': 'B', 'q-bin-1': 'A' }, // 5/8
  's-14': { 'q-mat-1': 'A', 'q-mat-2': 'A', 'q-mat-3': 'A', 'q-mat-4': 'B', 'q-mat-5': 'A', 'q-fis-1': 'A', 'q-fis-2': 'A', 'q-bin-1': 'B' }, // 6/8
  's-15': { 'q-mat-1': 'A', 'q-mat-2': 'C', 'q-mat-3': 'B', 'q-mat-4': 'D', 'q-mat-5': 'A', 'q-fis-1': 'B', 'q-fis-2': 'A', 'q-bin-1': 'A' }, // 4/8 = 50%
};

// Generate responses, answers, and scores for TO-3
const generatedResponses: Response[] = [];
const generatedAnswers: Answer[] = [];
const generatedScores: Score[] = [];

INITIAL_STUDENTS.forEach((student, idx) => {
  const respId = `resp-to3-${student.id}`;
  const studentAnswers = STUDENT_ANSWERS_TO3[student.id] || {};
  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;

  INITIAL_QUESTIONS.forEach(q => {
    const studentAns = studentAnswers[q.id] || '';
    const isCorrect = studentAns.toUpperCase() === q.correctAnswer.toUpperCase();
    if (!studentAns) {
      unansweredCount++;
    } else if (isCorrect) {
      correctCount++;
    } else {
      incorrectCount++;
    }

    generatedAnswers.push({
      id: `ans-to3-${student.id}-${q.id}`,
      responseId: respId,
      studentId: student.id,
      tryoutId: 'to-3',
      questionId: q.id,
      studentAnswer: studentAns,
      correctAnswer: q.correctAnswer,
      isCorrect,
      score: isCorrect ? 1 : 0,
      submittedAt: '2026-02-11T08:15:00Z',
    });
  });

  const totalQuestions = INITIAL_QUESTIONS.length;
  const calculatedScore = Math.round((correctCount / totalQuestions) * 100 * 10) / 10;
  
  // Create realistic Google Form Score with deliberate mismatch on student 3
  const isMismatchStudent = student.id === 's-3';
  const gformScore = isMismatchStudent ? 70.0 : calculatedScore;
  const scoreDiff = Math.round(Math.abs(gformScore - calculatedScore) * 10) / 10;

  generatedResponses.push({
    id: respId,
    tryoutId: 'to-3',
    studentId: student.id,
    nisnInput: student.nisn,
    rawScoreGForm: gformScore,
    submittedAt: `2026-02-11T08:${10 + idx}:00Z`,
  });

  generatedScores.push({
    id: `score-to3-${student.id}`,
    responseId: respId,
    studentId: student.id,
    tryoutId: 'to-3',
    subjectScores: {
      'subj-mat': Math.min(100, calculatedScore + (idx % 2 === 0 ? 5 : -5)),
      'subj-fis': calculatedScore,
      'subj-bin': Math.min(100, calculatedScore + 2),
    },
    googleFormScore: gformScore,
    calculatedScore,
    scoreDifference: scoreDiff,
    scoringStatus: scoreDiff > 0.01 ? 'SCORING_MISMATCH' : 'MATCH',
    totalCorrect: correctCount,
    totalIncorrect: incorrectCount,
    totalUnanswered: unansweredCount,
    createdAt: `2026-02-11T08:${10 + idx}:00Z`,
  });

  // Scores for TO-1 and TO-2 for progress analytics
  const to1Score = Math.max(45, Math.min(100, Math.round(calculatedScore - 12 + (idx % 5))));
  const to2Score = Math.max(50, Math.min(100, Math.round(calculatedScore - 5 + (idx % 3))));

  generatedScores.push({
    id: `score-to1-${student.id}`,
    responseId: `resp-to1-${student.id}`,
    studentId: student.id,
    tryoutId: 'to-1',
    subjectScores: { 'subj-mat': to1Score },
    googleFormScore: to1Score,
    calculatedScore: to1Score,
    scoreDifference: 0,
    scoringStatus: 'MATCH',
    totalCorrect: Math.round(to1Score / 10),
    totalIncorrect: 10 - Math.round(to1Score / 10),
    totalUnanswered: 0,
    createdAt: `2025-09-11T08:${10 + idx}:00Z`,
  });

  generatedScores.push({
    id: `score-to2-${student.id}`,
    responseId: `resp-to2-${student.id}`,
    studentId: student.id,
    tryoutId: 'to-2',
    subjectScores: { 'subj-mat': to2Score },
    googleFormScore: to2Score,
    calculatedScore: to2Score,
    scoreDifference: 0,
    scoringStatus: 'MATCH',
    totalCorrect: Math.round(to2Score / 10),
    totalIncorrect: 10 - Math.round(to2Score / 10),
    totalUnanswered: 0,
    createdAt: `2025-11-16T08:${10 + idx}:00Z`,
  });
});

export const INITIAL_RESPONSES: Response[] = generatedResponses;
export const INITIAL_ANSWERS: Answer[] = generatedAnswers;
export const INITIAL_SCORES: Score[] = generatedScores;

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-1',
    userId: 'u-admin',
    userName: 'Drs. Supriyadi, M.Pd',
    role: 'ADMIN',
    action: 'SYSTEM_INITIALIZATION',
    targetEntity: 'SYSTEM',
    details: 'Inisialisasi sistem Try Out & Assessment Analytics System SMA Negeri 1.',
    ipAddress: '127.0.0.1',
    timestamp: '2026-02-01T08:00:00Z',
  },
  {
    id: 'log-2',
    userId: 'u-guru1',
    userName: 'Drs. Bambang Sugiarto',
    role: 'GURU',
    action: 'IMPORT_GOOGLE_SHEETS',
    targetEntity: 'TRYOUT_RESPONSES',
    details: 'Impor 15 respons Google Sheet untuk Try Out 3 (Persiapan SNBT Series 2). Terdeteksi 1 SCORING_MISMATCH.',
    ipAddress: '192.168.1.45',
    timestamp: '2026-02-11T08:35:00Z',
  },
  {
    id: 'log-3',
    userId: 'u-guru1',
    userName: 'Drs. Bambang Sugiarto',
    role: 'GURU',
    action: 'PUBLISH_EXPLANATION',
    targetEntity: 'EXPLANATIONS',
    details: 'Mempublikasikan pembahasan untuk MAT-TO03-Q001 dan MAT-TO03-Q002.',
    ipAddress: '192.168.1.45',
    timestamp: '2026-02-13T11:05:00Z',
  },
];
