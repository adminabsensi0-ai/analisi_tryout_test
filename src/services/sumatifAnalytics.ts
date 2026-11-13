/**
 * Sumatif Analytics Service — School Assessment Analytics System (SAS & SAT)
 * 
 * Khusus menangani analitik asesmen Sumatif Akhir Semester (SAS) dan Sumatif Akhir Tahun (SAT).
 * Terisolasi 100% dari progress.ts (Try Out) untuk menjaga Zero-Regression.
 * 
 * Fitur:
 * - Cross-Subject Composite & Radar Data untuk Siswa
 * - Item Psychometrics murni per nomor soal (P-value & D-value) untuk Guru tanpa tagging TP
 * - Leger Rapor Kelas & Deteksi Siswa Berisiko (At-Risk >= 3 remedial) untuk Wali Kelas
 */

import { Student, Score, Subject, Question, Answer, ClassRoom, ExamPackage } from '../types/database';

export interface StudentSubjectScoreItem {
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  score: number;
  passingGrade: number;
  isPassed: boolean;
  status: 'TUNTAS' | 'REMEDIAL';
}

export interface StudentSumatifProfile {
  studentId: string;
  studentName: string;
  nisn: string;
  className: string;
  packageId: string;
  packageTitle: string;
  packageType: 'SAS' | 'SAT';
  subjectScores: StudentSubjectScoreItem[];
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  passedCount: number;
  remedialCount: number;
  isAtRisk: boolean; // remedialCount >= 3
  radarData: {
    subject: string;
    subjectName: string;
    score: number;
    kktp: number;
    fullMark: number;
  }[];
}

export interface QuestionItemStat {
  questionNumber: number;
  questionText?: string;
  totalResponses: number;
  correctCount: number;
  wrongCount: number;
  facilityValue: number; // p-value (0.00 - 1.00)
  difficultyLabel: 'Sangat Mudah' | 'Mudah' | 'Sedang' | 'Sukar' | 'Sangat Sukar';
  discriminationIndex: number; // D-value (-1.00 - 1.00)
  discriminationLabel: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Buruk / Perlu Ditinjau';
  isReviewRecommended: boolean;
}

export interface TeacherSumatifAnalytics {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  packageId: string;
  packageTitle: string;
  passingGrade: number;
  studentCount: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  passingCount: number;
  remedialCount: number;
  passingRatePct: number;
  questionStats: QuestionItemStat[];
  studentRankings: {
    studentId: string;
    studentName: string;
    nisn: string;
    className: string;
    score: number;
    isPassed: boolean;
    rank: number;
  }[];
}

export interface LegerStudentRow {
  studentId: string;
  studentName: string;
  nisn: string;
  scoresBySubjectId: Record<string, number>;
  scoresBySubjectCode: Record<string, number>;
  totalScore: number;
  averageScore: number;
  rank: number;
  remedialSubjectCodes: string[];
  remedialCount: number;
  isAtRisk: boolean;
}

export interface WaliKelasLegerResult {
  classId: string;
  className: string;
  packageId: string;
  packageTitle: string;
  packageType: 'SAS' | 'SAT';
  subjects: {
    id: string;
    code: string;
    name: string;
    passingGrade: number;
  }[];
  rows: LegerStudentRow[];
  totalStudents: number;
  atRiskStudentsCount: number;
  atRiskStudents: LegerStudentRow[];
  subjectAverages: Record<string, number>; // subjectId -> avg
  overallClassAverage: number;
}

export class SumatifAnalyticsService {
  /**
   * Helper ekstraksi nilai mapel dari record Score (mendukung subjectScores map maupun calculatedScore fallback)
   */
  public static extractScoreForSubject(scoreRecord: Score | undefined, subjectId: string): number {
    if (!scoreRecord) return 0;
    if (scoreRecord.subjectScores && typeof scoreRecord.subjectScores[subjectId] === 'number') {
      return scoreRecord.subjectScores[subjectId];
    }
    return scoreRecord.calculatedScore ?? scoreRecord.googleFormScore ?? 0;
  }

  /**
   * Menghitung Profil Multidisipliner Siswa untuk SAS/SAT (Radar Chart & Kartu KKTP)
   */
  public static calculateStudentProfile(
    student: Student,
    studentClass: ClassRoom | undefined,
    pkg: ExamPackage,
    allScores: Score[],
    allSubjects: Subject[]
  ): StudentSumatifProfile {
    const pkgSubjects = pkg.subjects || [];
    const studentScores = allScores.filter(s => s.studentId === student.id);

    const subjectScores: StudentSubjectScoreItem[] = [];
    const radarData: StudentSumatifProfile['radarData'] = [];

    pkgSubjects.forEach(pkgSub => {
      const subInfo = allSubjects.find(s => s.id === pkgSub.subjectId);
      const subCode = subInfo?.code || 'MAPEL';
      const subName = subInfo?.name || 'Mata Pelajaran';
      const passingGrade = pkgSub.passingGrade || subInfo?.passingGrade || 75;

      // Cari skor siswa untuk mapel ini di wadah terkait
      const matchScore = studentScores.find(s => {
        return s.subjectScores && typeof s.subjectScores[pkgSub.subjectId] === 'number';
      }) || studentScores[0];

      const rawScore = this.extractScoreForSubject(matchScore, pkgSub.subjectId);
      const roundedScore = Math.round(rawScore * 10) / 10;
      const isPassed = roundedScore >= passingGrade;

      subjectScores.push({
        subjectId: pkgSub.subjectId,
        subjectCode: subCode,
        subjectName: subName,
        score: roundedScore,
        passingGrade,
        isPassed,
        status: isPassed ? 'TUNTAS' : 'REMEDIAL',
      });

      radarData.push({
        subject: subCode,
        subjectName: subName,
        score: roundedScore,
        kktp: passingGrade,
        fullMark: 100,
      });
    });

    const totalScore = subjectScores.reduce((acc, curr) => acc + curr.score, 0);
    const validCount = subjectScores.length || 1;
    const averageScore = Math.round((totalScore / validCount) * 10) / 10;
    const scoresOnly = subjectScores.map(s => s.score);
    const highestScore = scoresOnly.length > 0 ? Math.max(...scoresOnly) : 0;
    const lowestScore = scoresOnly.length > 0 ? Math.min(...scoresOnly) : 0;
    const passedCount = subjectScores.filter(s => s.isPassed).length;
    const remedialCount = subjectScores.filter(s => !s.isPassed).length;
    const isAtRisk = remedialCount >= 3;

    return {
      studentId: student.id,
      studentName: student.name,
      nisn: student.nisn,
      className: studentClass?.name || 'Kelas',
      packageId: pkg.id,
      packageTitle: pkg.title,
      packageType: pkg.assessmentType === 'SAT' ? 'SAT' : 'SAS',
      subjectScores,
      averageScore,
      highestScore,
      lowestScore,
      passedCount,
      remedialCount,
      isAtRisk,
      radarData,
    };
  }

  /**
   * Menghitung Analisis Butir Soal Murni (Psikometri) dan Capaian Kelas untuk Guru
   * Tanpa memerlukan tagging TP / Materi sama sekali!
   */
  public static calculateTeacherAnalytics(
    subjectId: string,
    pkg: ExamPackage,
    allScores: Score[],
    allStudents: Student[],
    allClasses: ClassRoom[],
    allQuestions: Question[],
    allAnswers: Answer[],
    allSubjects: Subject[]
  ): TeacherSumatifAnalytics {
    const subInfo = allSubjects.find(s => s.id === subjectId);
    const pkgSub = pkg.subjects?.find(s => s.subjectId === subjectId);
    const passingGrade = pkgSub?.passingGrade || subInfo?.passingGrade || 75;

    // Filter siswa yang memiliki skor untuk mapel ini
    const scoresWithSub = allScores.map(s => ({
      scoreRecord: s,
      studentId: s.studentId,
      scoreValue: this.extractScoreForSubject(s, subjectId),
    })).filter(item => item.scoreValue > 0 || (item.scoreRecord.subjectScores && typeof item.scoreRecord.subjectScores[subjectId] === 'number'));

    const studentCount = scoresWithSub.length;
    const scoreValues = scoresWithSub.map(s => s.scoreValue);
    const totalScore = scoreValues.reduce((a, b) => a + b, 0);
    const averageScore = studentCount > 0 ? Math.round((totalScore / studentCount) * 10) / 10 : 0;
    const highestScore = studentCount > 0 ? Math.max(...scoreValues) : 0;
    const lowestScore = studentCount > 0 ? Math.min(...scoreValues) : 0;
    const passingCount = scoreValues.filter(v => v >= passingGrade).length;
    const remedialCount = studentCount - passingCount;
    const passingRatePct = studentCount > 0 ? Math.round((passingCount / studentCount) * 100) : 0;

    // Hitung ranking siswa
    const studentRankings = scoresWithSub
      .map(item => {
        const st = allStudents.find(std => std.id === item.studentId);
        const cl = allClasses.find(c => c.id === st?.classId);
        const sc = item.scoreValue;
        return {
          studentId: item.studentId,
          studentName: st?.name || 'Siswa',
          nisn: st?.nisn || '-',
          className: cl?.name || '-',
          score: Math.round(sc * 10) / 10,
          isPassed: sc >= passingGrade,
          rank: 1,
        };
      })
      .sort((a, b) => b.score - a.score)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));

    // Hitung Analisis Butir Soal Murni per Nomor Soal
    // Kelompokkan siswa menjadi Kelompok Atas (27%) dan Kelompok Bawah (27%) untuk Daya Pembeda
    const sortedScores = [...scoresWithSub].sort((a, b) => b.scoreValue - a.scoreValue);
    const groupSize = Math.max(1, Math.round(sortedScores.length * 0.27));
    const upperGroupStudentIds = new Set(sortedScores.slice(0, groupSize).map(s => s.studentId));
    const lowerGroupStudentIds = new Set(sortedScores.slice(-groupSize).map(s => s.studentId));

    // Ambil soal yang relevan untuk mapel ini
    const subjectQuestions = allQuestions
      .filter(q => q.subjectId === subjectId)
      .sort((a, b) => (a.questionNumber || 0) - (b.questionNumber || 0));

    const questionStats: QuestionItemStat[] = subjectQuestions.map((q, idx) => {
      const qNum = q.questionNumber || idx + 1;
      const answersForQ = allAnswers.filter(a => a.questionId === q.id);
      const totalResp = answersForQ.length || 1;
      const correctResp = answersForQ.filter(a => a.isCorrect).length;
      const wrongResp = totalResp - correctResp;

      // P-Value (Tingkat Kesukaran)
      const pVal = Math.round((correctResp / totalResp) * 100) / 100;
      let diffLabel: QuestionItemStat['difficultyLabel'] = 'Sedang';
      if (pVal > 0.80) diffLabel = 'Sangat Mudah';
      else if (pVal > 0.60) diffLabel = 'Mudah';
      else if (pVal > 0.40) diffLabel = 'Sedang';
      else if (pVal > 0.20) diffLabel = 'Sukar';
      else diffLabel = 'Sangat Sukar';

      // D-Value (Daya Pembeda) = (Ru - Rl) / N_group
      const correctUpper = answersForQ.filter(a => a.isCorrect && upperGroupStudentIds.has(a.studentId)).length;
      const correctLower = answersForQ.filter(a => a.isCorrect && lowerGroupStudentIds.has(a.studentId)).length;
      const rawD = (correctUpper - correctLower) / (groupSize || 1);
      const dVal = Math.round(Math.max(-1, Math.min(1, rawD)) * 100) / 100;

      let discLabel: QuestionItemStat['discriminationLabel'] = 'Baik';
      let isReview = false;
      if (dVal >= 0.40) {
        discLabel = 'Sangat Baik';
      } else if (dVal >= 0.30) {
        discLabel = 'Baik';
      } else if (dVal >= 0.20) {
        discLabel = 'Cukup';
      } else {
        discLabel = 'Buruk / Perlu Ditinjau';
        isReview = true;
      }

      return {
        questionNumber: qNum,
        questionText: q.questionText,
        totalResponses: totalResp,
        correctCount: correctResp,
        wrongCount: wrongResp,
        facilityValue: pVal,
        difficultyLabel: diffLabel,
        discriminationIndex: dVal,
        discriminationLabel: discLabel,
        isReviewRecommended: isReview,
      };
    });

    return {
      subjectId,
      subjectName: subInfo?.name || 'Mata Pelajaran',
      subjectCode: subInfo?.code || 'MAPEL',
      packageId: pkg.id,
      packageTitle: pkg.title,
      passingGrade,
      studentCount,
      averageScore,
      highestScore,
      lowestScore,
      passingCount,
      remedialCount,
      passingRatePct,
      questionStats,
      studentRankings,
    };
  }

  /**
   * Menghitung Leger Nilai Rapor Satu Rombel Kelas untuk Wali Kelas (SAS / SAT)
   */
  public static calculateWaliKelasLeger(
    classId: string,
    pkg: ExamPackage,
    allStudents: Student[],
    allClasses: ClassRoom[],
    allScores: Score[],
    allSubjects: Subject[]
  ): WaliKelasLegerResult {
    const targetClass = allClasses.find(c => c.id === classId);
    const classStudents = allStudents.filter(s => s.classId === classId && !s.isAnswerKeyAccount);

    const subjects = (pkg.subjects || []).map(pkgSub => {
      const sub = allSubjects.find(s => s.id === pkgSub.subjectId);
      return {
        id: pkgSub.subjectId,
        code: sub?.code || 'MAPEL',
        name: sub?.name || 'Mata Pelajaran',
        passingGrade: pkgSub.passingGrade || sub?.passingGrade || 75,
      };
    });

    const rows: LegerStudentRow[] = classStudents.map(student => {
      const scoresBySubjectId: Record<string, number> = {};
      const scoresBySubjectCode: Record<string, number> = {};
      const remedialSubjectCodes: string[] = [];
      let totalScore = 0;

      subjects.forEach(sub => {
        const studentScoreRecords = allScores.filter(s => s.studentId === student.id);
        const matchRecord = studentScoreRecords.find(s => s.subjectScores && typeof s.subjectScores[sub.id] === 'number') || studentScoreRecords[0];
        const sc = Math.round(this.extractScoreForSubject(matchRecord, sub.id) * 10) / 10;
        scoresBySubjectId[sub.id] = sc;
        scoresBySubjectCode[sub.code] = sc;
        totalScore += sc;

        if (sc < sub.passingGrade) {
          remedialSubjectCodes.push(sub.code);
        }
      });

      const avg = subjects.length > 0 ? Math.round((totalScore / subjects.length) * 10) / 10 : 0;
      const remedialCount = remedialSubjectCodes.length;

      return {
        studentId: student.id,
        studentName: student.name,
        nisn: student.nisn,
        scoresBySubjectId,
        scoresBySubjectCode,
        totalScore: Math.round(totalScore * 10) / 10,
        averageScore: avg,
        rank: 1,
        remedialSubjectCodes,
        remedialCount,
        isAtRisk: remedialCount >= 3,
      };
    });

    // Urutkan peringkat berdasarkan totalScore / averageScore descending
    rows.sort((a, b) => b.totalScore - a.totalScore);
    rows.forEach((r, idx) => {
      r.rank = idx + 1;
    });

    // Hitung rata-rata tiap mata pelajaran di kelas
    const subjectAverages: Record<string, number> = {};
    let totalAllScores = 0;
    let totalScorePoints = 0;

    subjects.forEach(sub => {
      const allSubjectScores = rows.map(r => r.scoresBySubjectId[sub.id] || 0);
      const sum = allSubjectScores.reduce((a, b) => a + b, 0);
      const avg = rows.length > 0 ? Math.round((sum / rows.length) * 10) / 10 : 0;
      subjectAverages[sub.id] = avg;
      totalAllScores += sum;
      totalScorePoints += rows.length;
    });

    const overallClassAverage = totalScorePoints > 0 ? Math.round((totalAllScores / totalScorePoints) * 10) / 10 : 0;
    const atRiskStudents = rows.filter(r => r.isAtRisk);

    return {
      classId,
      className: targetClass?.name || 'Kelas',
      packageId: pkg.id,
      packageTitle: pkg.title,
      packageType: pkg.assessmentType === 'SAT' ? 'SAT' : 'SAS',
      subjects,
      rows,
      totalStudents: rows.length,
      atRiskStudentsCount: atRiskStudents.length,
      atRiskStudents,
      subjectAverages,
      overallClassAverage,
    };
  }
}
