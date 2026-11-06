import { Tryout, Subject, Score, Answer, Question, ExamPackage } from '../types/database';

export const TRYOUT_STAGE_OPTIONS: string[] = [
  'TO 1',
  'TO 2',
  'TO 3',
  'TO 4',
  'TO 5',
  'TO 6',
  'TO 7',
  'TO 8',
  'TO 9',
  'TO 10',
  'TO 11',
  'TO 12',
];

export const TRYOUT_GROUP_NONE = 'NONE';

export interface TryoutStageGroup {
  /** Kunci kelompok standar, misal: "TO 1", "TO 2", "TO 3" */
  groupKey: string;
  /** Nomor urut numerik untuk pengurutan (1 untuk TO 1, 2 untuk TO 2, dst.) */
  order: number;
  /** Judul tampilan siklus Try Out */
  title: string;
  /** Tanggal mulai paling awal dari anggota TO */
  startDate: string;
  /** Tanggal selesai paling akhir dari anggota TO */
  endDate: string;
  /** Daftar objek Tryout yang tergabung dalam siklus TO ini */
  tryouts: Tryout[];
  /** Pemetaan subjectId -> Tryout untuk pencarian cepat */
  subjectTryoutMap: Record<string, Tryout>;
}

export interface StageSubjectCoverage {
  groupKey: string;
  order: number;
  /** Daftar mapel yang sudah punya Try Out di kelompok ini */
  filledSubjects: { subject: Subject; tryouts: Tryout[] }[];
  /** Daftar mapel yang belum punya Try Out di kelompok ini */
  missingSubjects: Subject[];
  /** Daftar mapel yang memiliki lebih dari 1 Try Out di kelompok yang sama (duplikat/konflik) */
  duplicateSubjects: { subject: Subject; tryouts: Tryout[] }[];
  /** Apakah seluruh mapel aktif sudah terisi lengkap tanpa duplikat */
  isComplete: boolean;
}

/**
 * Mengekstrak label "TO <angka>" dari teks judul atau kode manual.
 * Mengabaikan angka tahun 4 digit seperti "TO-2026-01".
 */
export function extractTryoutStageFromText(text?: string | null): string | null {
  if (!text) return null;
  const clean = text.trim();
  if (!clean) return null;

  // Abaikan pola kode otomatis berbasis tahun: TO-2026-01
  if (/^TO-\d{4}-\d+$/i.test(clean)) {
    return null;
  }

  // Cocokkan "TO 1", "TO-1", "TO_01", "Try Out 1", "Tryout Ke-1", "Try Out Ke 2"
  const match = clean.match(/\b(?:TO|TRY\s*OUT)(?:\s*KE)?[\s\-_#]*0*(\d{1,2})\b/i);
  if (match && match[1]) {
    const num = parseInt(match[1], 10);
    if (!isNaN(num) && num >= 1 && num <= 30) {
      return `TO ${num}`;
    }
  }

  return null;
}

/**
 * Mengambil nomor urut dari groupKey (contoh: "TO 1" -> 1, "TO 10" -> 10).
 */
export function getStageOrderNumber(groupKey: string): number {
  const m = (groupKey || '').match(/(\d+)/);
  if (m && m[1]) {
    const n = parseInt(m[1], 10);
    if (!isNaN(n) && n > 0) return n;
  }
  return 999;
}

/**
 * Menentukan kelompok siklus Try Out ("TO 1", "TO 2", dst., atau "NONE") untuk sebuah Tryout.
 * Prioritas:
 * 1. Pilihan eksplisit Guru Mapel (`tryout.tryoutGroup` atau `scoringConfig._meta.tryoutGroup`)
 * 2. Wadah Paket Ujian (`packageId`) jika ada
 * 3. Ekstraksi dari judul Try Out (misal "TO 1 Matematika" -> "TO 1")
 * 4. Urutan kronologis per mata pelajaran (ujian ke-1 mapel MAT -> "TO 1", ujian ke-2 mapel MAT -> "TO 2")
 */
export function resolveTryoutGroup(
  tryout: Tryout,
  allTryouts: Tryout[] = [],
  examPackages: ExamPackage[] = []
): string {
  // 1. Pilihan eksplisit dari Guru Mapel
  const explicitGroup =
    tryout.tryoutGroup ||
    ((tryout.scoringConfig as any)?._meta?.tryoutGroup as string | undefined);

  if (explicitGroup && explicitGroup.trim() !== '') {
    const trimmed = explicitGroup.trim().toUpperCase();
    if (trimmed === TRYOUT_GROUP_NONE) return TRYOUT_GROUP_NONE;
    const normalized = extractTryoutStageFromText(trimmed);
    return normalized || trimmed;
  }

  // 2. Jika terhubung ke Wadah Paket Ujian (ExamPackage)
  if (tryout.packageId && examPackages.length > 0) {
    const pkg = examPackages.find(p => p.id === tryout.packageId);
    if (pkg) {
      const fromPkg = extractTryoutStageFromText(pkg.title) || extractTryoutStageFromText(pkg.code);
      if (fromPkg) return fromPkg;
    }
  }

  // 3. Ekstraksi dari Judul atau Kode Kustom
  const fromTitle = extractTryoutStageFromText(tryout.title);
  if (fromTitle) return fromTitle;

  const fromCode = extractTryoutStageFromText(tryout.code);
  if (fromCode) return fromCode;

  // 4. Fallback cerdas: Urutan kronologis per Mata Pelajaran
  if (tryout.subjectId && allTryouts.length > 0) {
    const sameSubjectTryouts = allTryouts
      .filter(t => {
        const g = t.tryoutGroup || ((t.scoringConfig as any)?._meta?.tryoutGroup as string | undefined);
        if (g && g.trim().toUpperCase() === TRYOUT_GROUP_NONE) return false;
        return t.subjectId === tryout.subjectId;
      })
      .sort((a, b) => {
        const da = new Date(a.startDate || 0).getTime();
        const db = new Date(b.startDate || 0).getTime();
        if (da !== db) return da - db;
        return (a.code || '').localeCompare(b.code || '');
      });

    const idx = sameSubjectTryouts.findIndex(t => t.id === tryout.id);
    if (idx !== -1) {
      return `TO ${idx + 1}`;
    }
  }

  // 5. Fallback umum berdasarkan urutan di daftar semua tryout
  if (allTryouts.length > 0) {
    const sortedAll = [...allTryouts].sort((a, b) => {
      const da = new Date(a.startDate || 0).getTime();
      const db = new Date(b.startDate || 0).getTime();
      if (da !== db) return da - db;
      return (a.code || '').localeCompare(b.code || '');
    });
    const idx = sortedAll.findIndex(t => t.id === tryout.id);
    if (idx !== -1) {
      return `TO ${idx + 1}`;
    }
  }

  return 'TO 1';
}

/**
 * Mengelompokkan daftar Tryout menjadi tahapan siklus terurut: TO 1, TO 2, TO 3, dst.
 * Tryout yang ditandai 'NONE' oleh guru tidak dimasukkan ke dalam grup grafik siklus.
 */
export function buildTryoutStageGroups(
  tryouts: Tryout[],
  examPackages: ExamPackage[] = []
): TryoutStageGroup[] {
  const map = new Map<string, Tryout[]>();

  tryouts.forEach(to => {
    const groupKey = resolveTryoutGroup(to, tryouts, examPackages);
    if (groupKey === TRYOUT_GROUP_NONE) return;
    if (!map.has(groupKey)) {
      map.set(groupKey, []);
    }
    map.get(groupKey)!.push(to);
  });

  const groups: TryoutStageGroup[] = [];

  map.forEach((memberTryouts, groupKey) => {
    const sortedMembers = [...memberTryouts].sort((a, b) => {
      const da = new Date(a.startDate || 0).getTime();
      const db = new Date(b.startDate || 0).getTime();
      if (da !== db) return da - db;
      return (a.code || '').localeCompare(b.code || '');
    });

    const subjectTryoutMap: Record<string, Tryout> = {};
    sortedMembers.forEach(t => {
      if (t.subjectId) {
        subjectTryoutMap[t.subjectId] = t;
      }
      if (t.isExternal && Array.isArray(t.externalSubjectIds)) {
        t.externalSubjectIds.forEach(sid => {
          subjectTryoutMap[sid] = t;
        });
      }
    });

    const startDates = sortedMembers
      .map(t => t.startDate)
      .filter(Boolean)
      .sort();
    const endDates = sortedMembers
      .map(t => t.endDate)
      .filter(Boolean)
      .sort();

    const order = getStageOrderNumber(groupKey);
    const defaultTitle = order < 999 ? `Try Out ${order}` : groupKey;

    groups.push({
      groupKey,
      order,
      title: defaultTitle,
      startDate: startDates[0] || new Date().toISOString(),
      endDate: endDates[endDates.length - 1] || new Date().toISOString(),
      tryouts: sortedMembers,
      subjectTryoutMap,
    });
  });

  return groups.sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return a.groupKey.localeCompare(b.groupKey);
  });
}

/**
 * Mengecek kelengkapan dan potensi duplikasi mata pelajaran pada suatu kelompok TO (misal "TO 1").
 * Digunakan sebagai kontrol validasi visual bagi Guru Mapel.
 */
export function getStageSubjectCoverage(
  groupKey: string,
  allTryouts: Tryout[],
  allSubjects: Subject[],
  examPackages: ExamPackage[] = []
): StageSubjectCoverage {
  const order = getStageOrderNumber(groupKey);
  const activeSubjects = allSubjects.filter(
    s => (s.code || '').toUpperCase().trim() !== 'BIND'
  );

  const tryoutsInGroup = allTryouts.filter(
    t => resolveTryoutGroup(t, allTryouts, examPackages) === groupKey
  );

  const filledSubjects: { subject: Subject; tryouts: Tryout[] }[] = [];
  const missingSubjects: Subject[] = [];
  const duplicateSubjects: { subject: Subject; tryouts: Tryout[] }[] = [];

  activeSubjects.forEach(subj => {
    const matching = tryoutsInGroup.filter(t => {
      if (t.isExternal) {
        if (t.externalSubjectIds && t.externalSubjectIds.includes(subj.id)) return true;
        if (
          t.externalSubjects &&
          t.externalSubjects.some(
            es =>
              es.toLowerCase().trim() === subj.name.toLowerCase().trim() ||
              es.toLowerCase().trim() === subj.code.toLowerCase().trim()
          )
        ) {
          return true;
        }
        return false;
      }
      return t.subjectId === subj.id;
    });

    if (matching.length > 0) {
      filledSubjects.push({ subject: subj, tryouts: matching });
      if (matching.length > 1) {
        duplicateSubjects.push({ subject: subj, tryouts: matching });
      }
    } else {
      missingSubjects.push(subj);
    }
  });

  return {
    groupKey,
    order,
    filledSubjects,
    missingSubjects,
    duplicateSubjects,
    isComplete:
      activeSubjects.length > 0 &&
      missingSubjects.length === 0 &&
      duplicateSubjects.length === 0,
  };
}

/**
 * Membaca nilai seorang siswa untuk mata pelajaran tertentu pada satu objek Score.
 */
export function extractSubjectScoreFromScoreRecord(
  scoreObj: Score | undefined,
  tryout: Tryout,
  subj: Subject,
  studentAnswers?: Answer[],
  subjQuestions?: Question[]
): number | null {
  if (!scoreObj) return null;

  // 1. Cek subjectScores JSON map (untuk TO Eksternal atau multi-mapel)
  if (scoreObj.subjectScores) {
    const byId = scoreObj.subjectScores[subj.id];
    if (typeof byId === 'number' && !isNaN(byId)) return byId;

    const byCode = scoreObj.subjectScores[subj.code];
    if (typeof byCode === 'number' && !isNaN(byCode)) return byCode;

    const byName = scoreObj.subjectScores[subj.name];
    if (typeof byName === 'number' && !isNaN(byName)) return byName;

    const matchKey = Object.keys(scoreObj.subjectScores).find(k => {
      const lk = k.toLowerCase().trim();
      return (
        lk === subj.id.toLowerCase().trim() ||
        lk === subj.code.toLowerCase().trim() ||
        lk === subj.name.toLowerCase().trim() ||
        subj.name.toLowerCase().includes(lk) ||
        lk.includes(subj.name.toLowerCase())
      );
    });
    if (matchKey !== undefined) {
      const val = Number(scoreObj.subjectScores[matchKey]);
      if (!isNaN(val)) return val;
    }
  }

  // 2. Cek apakah Tryout Internal ini memang untuk mata pelajaran tersebut
  if (!tryout.isExternal && tryout.subjectId === subj.id) {
    return typeof scoreObj.calculatedScore === 'number' ? scoreObj.calculatedScore : null;
  }

  // 3. Fallback dari jawaban butir soal jika tersedia dan tryout belum punya subjectId
  if (!tryout.isExternal && !tryout.subjectId && studentAnswers && subjQuestions && subjQuestions.length > 0) {
    const qIds = new Set(subjQuestions.map(q => q.id));
    const rel = studentAnswers.filter(a => qIds.has(a.questionId));
    if (rel.length > 0) {
      const correctCount = rel.filter(a => a.isCorrect).length;
      return Math.round((correctCount / rel.length) * 1000) / 10;
    }
  }

  return null;
}

/**
 * Mengambil nilai seorang siswa untuk mata pelajaran tertentu pada suatu tahapan Siklus TO (misal "TO 1").
 * Mengembalikan `null` jika siswa belum memiliki nilai pada mapel tersebut di siklus TO ini.
 */
export function getStudentStageSubjectScore(
  studentId: string,
  subj: Subject,
  stage: TryoutStageGroup,
  allScores: Score[],
  allAnswers?: Answer[],
  allQuestions?: Question[]
): number | null {
  const subjQuestions = allQuestions ? allQuestions.filter(q => q.subjectId === subj.id) : undefined;

  // Prioritaskan tryout yang secara spesifik terhubung ke mapel ini
  const directTryout = stage.subjectTryoutMap[subj.id];
  if (directTryout) {
    const scoreObj = allScores.find(
      s => s.studentId === studentId && s.tryoutId === directTryout.id
    );
    const studentAnswers = allAnswers
      ? allAnswers.filter(a => a.studentId === studentId && a.tryoutId === directTryout.id)
      : undefined;
    const val = extractSubjectScoreFromScoreRecord(
      scoreObj,
      directTryout,
      subj,
      studentAnswers,
      subjQuestions
    );
    if (val !== null) return val;
  }

  // Cek seluruh tryout anggota di dalam stage ini
  for (const to of stage.tryouts) {
    const scoreObj = allScores.find(s => s.studentId === studentId && s.tryoutId === to.id);
    if (!scoreObj) continue;
    const studentAnswers = allAnswers
      ? allAnswers.filter(a => a.studentId === studentId && a.tryoutId === to.id)
      : undefined;
    const val = extractSubjectScoreFromScoreRecord(
      scoreObj,
      to,
      subj,
      studentAnswers,
      subjQuestions
    );
    if (val !== null) return val;
  }

  return null;
}

/**
 * Menghitung rata-rata gabungan (komposit) seorang siswa pada satu siklus TO (misal rata-rata MAT & BIN di TO 1).
 * Hanya merata-ratakan mata pelajaran yang sudah memiliki nilai valid pada siklus TO tersebut.
 */
export function getStudentStageCompositeScore(
  studentId: string,
  stage: TryoutStageGroup,
  subjects: Subject[],
  allScores: Score[],
  allAnswers?: Answer[],
  allQuestions?: Question[]
): {
  compositeScore: number | null;
  subjectScores: Record<string, number>;
  availableCount: number;
} {
  const activeSubjects = subjects.filter(
    s => (s.code || '').toUpperCase().trim() !== 'BIND'
  );
  const subjectScores: Record<string, number> = {};
  const validValues: number[] = [];

  activeSubjects.forEach(subj => {
    const val = getStudentStageSubjectScore(
      studentId,
      subj,
      stage,
      allScores,
      allAnswers,
      allQuestions
    );
    if (val !== null) {
      subjectScores[subj.id] = val;
      validValues.push(val);
    }
  });

  // Fallback jika tryout di stage belum terpetakan ke subjectId mana pun namun siswa punya skor
  if (validValues.length === 0) {
    stage.tryouts.forEach(to => {
      const sc = allScores.find(s => s.studentId === studentId && s.tryoutId === to.id);
      if (sc && typeof sc.calculatedScore === 'number') {
        validValues.push(sc.calculatedScore);
      }
    });
  }

  const compositeScore =
    validValues.length > 0
      ? Math.round((validValues.reduce((a, b) => a + b, 0) / validValues.length) * 10) / 10
      : null;

  return {
    compositeScore,
    subjectScores,
    availableCount: validValues.length,
  };
}
