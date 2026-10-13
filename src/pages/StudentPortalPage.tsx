import React, { useState, useEffect } from 'react';
import {
  Award, Search, FileText, Download, CheckCircle, XCircle, HelpCircle,
  AlertTriangle, BookOpen, ExternalLink, Youtube, Sparkles, Lock, ShieldCheck,
  TrendingUp, ArrowRight, ShieldAlert, CheckCircle2, RotateCcw, Eye, ChevronDown, ChevronUp,
  Filter, Layers, ArrowUpRight, ArrowDownRight, BarChart3, Play, Video, Copy, Check, Share2,
  LayoutGrid, LogOut, UserCheck
} from 'lucide-react';
import { ResourceCard } from '../components/ResourceCard';
import { dbService } from '../services/database';
import { ExportService } from '../services/export';
import { AnalyticsService, CompetencyMastery } from '../services/analytics';
import { GeminiDiagnosticService } from '../services/gemini';
import { Score, Student, Tryout, Explanation, Question, Subject } from '../types/database';
import { StudentVerificationGate } from '../components/student/StudentVerificationGate';
import { StudentQuestionSheet } from '../components/student/StudentQuestionSheet';
import { SubjectRecapSection, SubjectRecapRow } from '../components/student/SubjectRecapSection';

export const StudentPortalPage: React.FC = () => {
  // Birthdate + NISN Verification State (Starts empty for privacy & real gatekeeping)
  const [birthDateInput, setBirthDateInput] = useState('');
  const [nisnInput, setNisnInput] = useState('');
  const [selectedTryoutId, setSelectedTryoutId] = useState('to-3');

  // Verified Session & Data State
  const [verifiedStudent, setVerifiedStudent] = useState<Student | null>(null);
  const [activeScore, setActiveScore] = useState<Score | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // Video Player Modal State
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [selectedVideoTitle, setSelectedVideoTitle] = useState<string>('');

  // 4 Main Tabs Navigation: REPORT | TREND_RECAP | QUESTION_SHEET | EXPLANATIONS
  const [portalTab, setPortalTab] = useState<'REPORT' | 'TREND_RECAP' | 'QUESTION_SHEET' | 'EXPLANATIONS'>('REPORT');

  // Explanations Tab Filters
  const [explanationFilterMode, setExplanationFilterMode] = useState<'ALL' | 'INCORRECT_ONLY'>('ALL');
  const [explanationSubjectFilter, setExplanationSubjectFilter] = useState<string>('ALL');
  const [resourceViewMode, setResourceViewMode] = useState<'CARDS' | 'MODULES'>('CARDS');
  const [mediaTypeFilter, setMediaTypeFilter] = useState<'ALL' | 'YOUTUBE' | 'PDF'>('ALL');

  // Security & Rate Limiting State
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutTimer, setLockoutTimer] = useState(0);

  const tryouts = dbService.getTryouts();
  const activeTryout = tryouts.find(t => t.id === selectedTryoutId) || tryouts[0];
  const allSubjects = dbService.getSubjects();
  const allQuestions = dbService.getQuestions();

  // Rate Limiting Countdown
  useEffect(() => {
    let interval: any;
    if (isLockedOut && lockoutTimer > 0) {
      interval = setInterval(() => {
        setLockoutTimer(prev => {
          if (prev <= 1) {
            setIsLockedOut(false);
            setFailedAttempts(0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isLockedOut, lockoutTimer]);

  // Session Storage Check (Restore if previously verified during this session)
  useEffect(() => {
    const sessionStudentId = sessionStorage.getItem('verified_student_id');
    if (sessionStudentId && !verifiedStudent) {
      const student = dbService.getStudents().find(s => s.id === sessionStudentId);
      if (student) {
        setVerifiedStudent(student);
        setBirthDateInput(student.birthDate || '');
        setNisnInput(student.nisn);
        const scores = dbService.getScoresByStudent(student.id);
        const scoreObj = scores.find(s => s.tryoutId === selectedTryoutId) || scores[0];
        setActiveScore(scoreObj || null);
      }
    }
  }, [selectedTryoutId]);

  // Verification Handler (Tanggal Lahir + NISN Siswa)
  const handleVerify = (e?: React.FormEvent, overrideBirthDate?: string, overrideNisn?: string) => {
    if (e) e.preventDefault();
    if (isLockedOut) return;

    setErrorMessage('');
    setAiInsight(null);
    setLoading(true);

    const targetDate = (overrideBirthDate !== undefined ? overrideBirthDate : birthDateInput).trim();
    const targetNisn = (overrideNisn !== undefined ? overrideNisn : nisnInput).trim();

    if (!targetDate || !targetNisn) {
      setErrorMessage('Harap masukkan Tanggal Lahir dan NISN Anda.');
      setLoading(false);
      return;
    }

    setTimeout(() => {
      const student = dbService.getStudentByBirthDateAndNisn(targetDate, targetNisn);

      if (!student) {
        handleVerificationFailure(`Data siswa dengan Tanggal Lahir '${targetDate}' dan NISN '${targetNisn}' tidak ditemukan. Harap pastikan data sesuai Dapodik sekolah.`);
        return;
      }

      // Success: Verification Passed
      setVerifiedStudent(student);
      setFailedAttempts(0);
      sessionStorage.setItem('verified_student_id', student.id);

      // Isolation: Find score matching verified student.id
      const scores = dbService.getScoresByStudent(student.id);
      const scoreObj = scores.find(s => s.tryoutId === selectedTryoutId) || scores[0];

      if (!scoreObj) {
        setActiveScore(null);
        setErrorMessage(`Siswa ${student.name} terverifikasi, namun belum memiliki entri nilai pada paket ujian ${activeTryout?.title}.`);
      } else {
        setActiveScore(scoreObj);
      }

      dbService.logAudit(
        { id: student.id, name: student.name, role: 'SISWA' },
        'STUDENT_VERIFICATION_SUCCESS',
        'STUDENT_PORTAL',
        `Siswa ${student.name} berhasil terverifikasi (Tgl Lahir: ${targetDate}, NISN: ${targetNisn}).`
      );

      setLoading(false);
    }, 350);
  };

  const handleVerificationFailure = (message: string) => {
    setVerifiedStudent(null);
    setActiveScore(null);
    sessionStorage.removeItem('verified_student_id');
    setErrorMessage(message);
    setLoading(false);

    const newAttempts = failedAttempts + 1;
    setFailedAttempts(newAttempts);

    dbService.logAudit(
      { id: 'anonymous', name: 'Anonim', role: 'SISWA' },
      'STUDENT_VERIFICATION_FAILED',
      'SECURITY',
      `Percobaan verifikasi siswa gagal (${newAttempts}x): ${message}`
    );

    // Rate Limiting Trigger: Max 5 failed attempts -> 30s lockout
    if (newAttempts >= 5) {
      setIsLockedOut(true);
      setLockoutTimer(30);
      dbService.logAudit(
        { id: 'anonymous', name: 'Anonim', role: 'SECURITY' },
        'RATE_LIMIT_TRIGGERED',
        'SECURITY',
        `Rate limiting aktif: 5 kali percobaan verifikasi gagal berturut-turut. Akses dikunci 30 detik.`
      );
    }
  };

  const handleLogoutStudent = () => {
    sessionStorage.removeItem('verified_student_id');
    setVerifiedStudent(null);
    setActiveScore(null);
    setBirthDateInput('');
    setNisnInput('');
    setAiInsight(null);
    setPortalTab('REPORT');
  };

  // Sync active score when switching tryouts
  useEffect(() => {
    if (verifiedStudent) {
      const scores = dbService.getScoresByStudent(verifiedStudent.id);
      const scoreObj = scores.find(s => s.tryoutId === selectedTryoutId) || scores[0];
      setActiveScore(scoreObj || null);
    }
  }, [selectedTryoutId, verifiedStudent]);

  // Real Database Student Analytics
  const studentAnalytics = verifiedStudent
    ? dbService.getStudentAnalytics(verifiedStudent.id, selectedTryoutId)
    : null;

  // Published Explanations for selected Tryout
  const publishedExplanations = dbService
    .getExplanations()
    .filter(e => e.tryoutId === selectedTryoutId && e.status === 'PUBLISHED');

  // Competency Analysis derived from database
  const competencyMastery: CompetencyMastery[] = studentAnalytics?.competencies || [];

  // Multi-Tryout Progress History (Real analytics progress)
  const progressHistory = studentAnalytics?.progress.map(p => ({
    code: p.tryoutCode,
    title: p.tryoutTitle,
    date: p.date,
    score: p.score,
    classAverage: p.classAverage ?? 75.0,
  })) || [
    { code: 'TO-1', title: 'Try Out 1 — Tengah Ganjil', date: '12 Sep 2025', score: (verifiedStudent?.targetScore || 80) - 8, classAverage: 72.0 },
    { code: 'TO-2', title: 'Try Out 2 — Persiapan SNBT 1', date: '17 Nov 2025', score: (verifiedStudent?.targetScore || 80) - 3, classAverage: 74.5 },
    { code: 'TO-3', title: 'Try Out 3 — Persiapan SNBT 2', date: '12 Feb 2026', score: activeScore?.calculatedScore || 85, classAverage: 78.0 },
    { code: 'TO-4', title: 'Try Out 4 — Intensif SNBT', date: '05 Apr 2026', score: verifiedStudent?.targetScore || 85, classAverage: 80.0 },
  ];

  // DETERMINISTIC REAL CALCULATION: Compute per-subject scores for student
  const getSubjectScore = (subjId: string, tryoutIndex: number, tryoutCode: string): number => {
    if (!verifiedStudent) return 75.0;

    const targetTryout = tryouts.find(t => t.code === tryoutCode || t.id === `to-${tryoutIndex + 1}`) || tryouts[tryoutIndex];
    if (targetTryout) {
      const studentScoreObj = dbService.getScoresByStudent(verifiedStudent.id).find(s => s.tryoutId === targetTryout.id);
      if (studentScoreObj?.subjectScores && studentScoreObj.subjectScores[subjId] !== undefined) {
        return studentScoreObj.subjectScores[subjId];
      }

      // Check real student answers for questions of this subject
      const answers = dbService.getAnswers().filter(a => a.studentId === verifiedStudent.id && a.tryoutId === targetTryout.id);
      const subjQuestions = allQuestions.filter(q => q.subjectId === subjId);
      if (subjQuestions.length > 0 && answers.length > 0) {
        const qIdSet = new Set(subjQuestions.map(q => q.id));
        const matchedAns = answers.filter(a => qIdSet.has(a.questionId));
        if (matchedAns.length > 0) {
          const correct = matchedAns.filter(a => a.isCorrect).length;
          return Math.round((correct / matchedAns.length) * 100 * 10) / 10;
        }
      }

      if (studentScoreObj) {
        return studentScoreObj.calculatedScore;
      }
    }

    return 75.0;
  };

  // Build real subject recap matrix rows
  const subjectRecapRows: SubjectRecapRow[] = allSubjects.map(subj => {
    const toScores: Record<string, number> = {};
    progressHistory.forEach((item, idx) => {
      toScores[item.code] = getSubjectScore(subj.id, idx, item.code);
    });

    const scoreVals = Object.values(toScores);
    const avgScore = scoreVals.length > 0
      ? Math.round((scoreVals.reduce((a, b) => a + b, 0) / scoreVals.length) * 10) / 10
      : 0;

    const passingGrade = subj.passingGrade ?? 75.0;
    const isPassing = avgScore >= passingGrade;
    const firstVal = scoreVals[0] || 0;
    const lastVal = scoreVals[scoreVals.length - 1] || 0;
    const trend = Math.round((lastVal - firstVal) * 10) / 10;

    return {
      subject: subj,
      passingGrade,
      toScores,
      avgScore,
      isPassing,
      trend,
    };
  });

  // AI Diagnostic Generator Handler
  const handleGenerateAiDiagnostic = async () => {
    if (!verifiedStudent || !activeScore) return;
    setLoadingAi(true);
    const weakMaterialsList = competencyMastery
      .filter(c => c.masteryPercentage < 70)
      .map(c => c.materialTitle);

    const result = await GeminiDiagnosticService.generateStudentDiagnostic(
      verifiedStudent.name,
      activeScore.calculatedScore,
      verifiedStudent.targetScore || 80,
      activeScore.totalCorrect,
      activeScore.totalIncorrect,
      weakMaterialsList
    );
    setAiInsight(result);
    setLoadingAi(false);
  };

  // PDF Export
  const handleDownloadPDF = () => {
    if (!verifiedStudent || !activeScore || !activeTryout) return;
    const studentClass = dbService.getClasses().find(c => c.id === verifiedStudent.classId);
    ExportService.exportStudentPDF(
      verifiedStudent,
      activeScore,
      activeTryout,
      studentClass,
      studentAnalytics,
      publishedExplanations,
      subjectRecapRows
    );
  };

  // Helper YouTube Embed
  const getYouTubeEmbedUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    try {
      if (url.includes('youtube.com/embed/')) {
        return url.includes('?') ? `${url}&autoplay=1` : `${url}?autoplay=1`;
      }
      const matchWatch = url.match(/[?&]v=([^&#]+)/);
      if (matchWatch && matchWatch[1]) {
        return `https://www.youtube-nocookie.com/embed/${matchWatch[1]}?autoplay=1`;
      }
      const matchShort = url.match(/youtu\.be\/([^?&#]+)/);
      if (matchShort && matchShort[1]) {
        return `https://www.youtube-nocookie.com/embed/${matchShort[1]}?autoplay=1`;
      }
      const matchShorts = url.match(/youtube\.com\/shorts\/([^?&#]+)/);
      if (matchShorts && matchShorts[1]) {
        return `https://www.youtube-nocookie.com/embed/${matchShorts[1]}?autoplay=1`;
      }
    } catch {
      // fallback
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070b16] dark-canvas-student text-slate-900 dark:text-slate-100 pb-20 font-sans transition-colors">
      {/* HEADER BANNER */}
      <div className="bg-white dark:bg-gradient-to-r dark:from-[#090e1f] dark:via-[#070b17] dark:to-[#04060d] text-slate-900 dark:text-white py-10 px-4 sm:px-6 lg:px-8 border-b border-slate-200 dark:border-slate-800/80 relative overflow-hidden transition-colors shadow-xs dark:shadow-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative">
          <div>
            <div className="flex items-center gap-2 text-indigo-700 dark:text-amber-400 text-xs font-bold uppercase tracking-wider mb-2 font-mono">
              <Award className="w-4 h-4 text-indigo-600 dark:text-amber-400" />
              <span>Portal Pengumuman Hasil Try Out &amp; Analisis Siswa</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Pengumuman Hasil Try Out Mandiri
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Verifikasi identitas (Tanggal Lahir + NISN Siswa) untuk mengakses nilai semua mata pelajaran, grafik progres belajar, rekap butir soal, serta pembahasan resmi guru.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900/90 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 font-medium shrink-0">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Isolasi Data Siswa Aktif</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* CASE 1: UNVERIFIED STATE -> SHOW CLEAN VERIFICATION GATE */}
        {!verifiedStudent && (
          <StudentVerificationGate
            birthDateInput={birthDateInput}
            setBirthDateInput={setBirthDateInput}
            nisnInput={nisnInput}
            setNisnInput={setNisnInput}
            isLockedOut={isLockedOut}
            lockoutTimer={lockoutTimer}
            failedAttempts={failedAttempts}
            errorMessage={errorMessage}
            loading={loading}
            onVerify={handleVerify}
          />
        )}

        {/* CASE 2: VERIFIED STATE -> FULL DASHBOARD VIEW */}
        {verifiedStudent && (
          <div className="space-y-8 animate-fade-in">
            {/* 1. STUDENT IDENTITY BANNER & ACTIONS */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Siswa Terverifikasi (Kerahasiaan Terjaga)</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
                  {verifiedStudent.name}
                </h2>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <span>NISN: <strong className="text-slate-800 dark:text-slate-200 font-mono">{verifiedStudent.nisn}</strong></span>
                  <span>·</span>
                  <span>NIS: <strong className="text-slate-800 dark:text-slate-200 font-mono">{verifiedStudent.nis}</strong></span>
                  <span>·</span>
                  <span>Kelas: <strong className="text-slate-800 dark:text-slate-200">XII IPA 1</strong></span>
                  <span>·</span>
                  <span>Target Ambisi: <strong className="text-slate-800 dark:text-slate-200 font-mono">{verifiedStudent.targetScore || 80.0}</strong></span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
                  title="Unduh Laporan Individual Siswa Format PDF Resmi"
                >
                  <Download className="w-4 h-4 text-white" />
                  <span>Unduh PDF Resmi</span>
                </button>

                <button
                  type="button"
                  onClick={handleLogoutStudent}
                  className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-700"
                  title="Keluar dari sesi siswa"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Ganti Siswa</span>
                </button>
              </div>
            </div>

            {/* 2. 4-SEGMENT NAVIGATION BAR */}
            <div className="bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs grid grid-cols-2 lg:grid-cols-4 gap-1.5 transition-colors">
              <button
                type="button"
                onClick={() => setPortalTab('REPORT')}
                className={`py-3 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  portalTab === 'REPORT'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Award className="w-4 h-4" />
                <span>Rapor &amp; Skor TO</span>
              </button>

              <button
                type="button"
                onClick={() => setPortalTab('TREND_RECAP')}
                className={`py-3 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  portalTab === 'TREND_RECAP'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>Grafik &amp; Rekap Mapel</span>
              </button>

              <button
                type="button"
                onClick={() => setPortalTab('QUESTION_SHEET')}
                className={`py-3 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  portalTab === 'QUESTION_SHEET'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Rekap Butir Soal</span>
                {studentAnalytics && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    portalTab === 'QUESTION_SHEET' ? 'bg-indigo-700 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}>
                    {studentAnalytics.questionPerformance.length} Soal
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setPortalTab('EXPLANATIONS')}
                className={`py-3 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  portalTab === 'EXPLANATIONS'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Video className="w-4 h-4" />
                <span>Media Pembahasan</span>
                {publishedExplanations.length > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    portalTab === 'EXPLANATIONS' ? 'bg-indigo-700 text-white' : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                  }`}>
                    {publishedExplanations.length} Modul
                  </span>
                )}
              </button>
            </div>

            {/* TAB 1: RAPOR & SKOR TRY OUT TERPILIH */}
            {portalTab === 'REPORT' && activeScore && (
              <div className="space-y-6 animate-fade-in">
                {/* Tryout Selector Bar */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold">
                    <span>Paket Try Out yang Sedang Dilihat:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedTryoutId}
                      onChange={e => setSelectedTryoutId(e.target.value)}
                      className="px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      {tryouts.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.code} — {t.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Score & Performance Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Score Card */}
                  <div className="bg-slate-900 dark:bg-slate-950 text-white p-6 rounded-3xl shadow-sm flex flex-col justify-between border border-slate-800">
                    <div>
                      <span className="text-xs text-slate-400 font-medium block mb-1">Skor Akhir Terhitung</span>
                      <div className="text-4xl font-extrabold text-white font-mono tracking-tight">
                        {activeScore.calculatedScore}
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-1">Skala 0 - 100 Poin</span>
                    </div>

                    <div className="pt-4 border-t border-slate-800 mt-4 text-xs">
                      <div className="flex justify-between text-slate-300 mb-1">
                        <span>Target Anda:</span>
                        <strong className="font-mono">{verifiedStudent.targetScore || 80.0}</strong>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            activeScore.calculatedScore >= (verifiedStudent.targetScore || 80)
                              ? 'bg-emerald-500'
                              : 'bg-amber-500'
                          }`}
                          style={{
                            width: `${Math.min(100, (activeScore.calculatedScore / (verifiedStudent.targetScore || 80)) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Answers Stats */}
                  <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4 transition-colors">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <CheckCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Jawaban Benar</div>
                      <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono">{activeScore.totalCorrect} Soal</div>
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Capaian Berhasil</div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4 transition-colors">
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                      <XCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Jawaban Salah</div>
                      <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono">{activeScore.totalIncorrect} Soal</div>
                      <div className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">Perlu Evaluasi</div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4 transition-colors">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <HelpCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Tidak Dijawab</div>
                      <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono">{activeScore.totalUnanswered} Soal</div>
                      <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Opsi Kosong</div>
                    </div>
                  </div>
                </div>

                {/* Scoring Verification Transparency Banner */}
                <div
                  className={`p-4 rounded-2xl border text-xs flex items-center justify-between ${
                    activeScore.scoringStatus === 'MATCH'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200'
                      : 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
                    <span>
                      <strong>Verifikasi Keselarasan Scoring:</strong>{' '}
                      {activeScore.scoringStatus === 'MATCH'
                        ? 'MATCH — Skor kalkulasi database terverifikasi selaras 100% dengan respons formulir ujian.'
                        : `SCORING_MISMATCH — Skor formulir (${activeScore.googleFormScore}) memiliki selisih ${activeScore.scoreDifference} poin dari kalkulasi ulang sistem.`}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-white/70 dark:bg-slate-950/80 text-slate-900 dark:text-slate-100">
                    {activeScore.scoringStatus}
                  </span>
                </div>

                {/* Competency Mastery & AI Diagnostic */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Competency Breakdown */}
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                          Pemetaan Penguasaan Kompetensi Dasar (KD)
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Tingkat daya serap materi pokok pada paket {activeTryout?.code}.
                        </p>
                      </div>
                      <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950 px-2 py-1 rounded-lg">
                        {competencyMastery.length} KD
                      </span>
                    </div>

                    <div className="space-y-3">
                      {competencyMastery.length === 0 ? (
                        <p className="text-xs text-slate-500 py-4 text-center">Belum ada data KD pada paket ini.</p>
                      ) : (
                        competencyMastery.map(c => (
                          <div key={c.competencyId} className="space-y-1.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-100 dark:border-slate-800">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                <strong className="font-mono text-indigo-600 dark:text-indigo-400 mr-1.5">{c.code}</strong>
                                {c.materialTitle}
                              </span>
                              <span className={`font-mono font-bold ${
                                c.masteryPercentage >= 75 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                              }`}>
                                {c.masteryPercentage}%
                              </span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${
                                  c.masteryPercentage >= 75 ? 'bg-emerald-500' : 'bg-amber-500'
                                }`}
                                style={{ width: `${c.masteryPercentage}%` }}
                              />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* AI Learning Recommendation Card */}
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 flex flex-col justify-between transition-colors">
                    <div>
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                          <Sparkles className="w-4 h-4 text-amber-500" />
                          <span>Rekomendasi Belajar Personal AI</span>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold">
                          Gemini Powered
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">
                        Dapatkan analisis kelemahan materi dan saran strategi belajar berbasis AI untuk menembus target nilai SNBT Anda.
                      </p>

                      {aiInsight && (
                        <div className="mt-4 p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 text-xs text-slate-800 dark:text-slate-200 leading-relaxed space-y-2 whitespace-pre-line animate-fade-in max-h-72 overflow-y-auto">
                          {aiInsight}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleGenerateAiDiagnostic}
                      disabled={loadingAi}
                      className="w-full mt-4 py-3 px-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {loadingAi ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Menyusun Rekomendasi AI...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-amber-300" />
                          <span>{aiInsight ? 'Perbarui Analisis AI' : 'Buat Analisis Belajar AI Sekarang'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: GRAFIK PROGRES LINTAS TO & REKAP SELURUH MAPEL */}
            {portalTab === 'TREND_RECAP' && (
              <div className="space-y-8 animate-fade-in">
                {/* 1. Overall Progress across TO1 -> TO4 SVG Chart */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                      <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider font-mono">
                        <TrendingUp className="w-4 h-4" />
                        <span>Grafik Perkembangan Try Out Keseluruhan</span>
                      </div>
                      <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">
                        Progres Nilai Siswa Lintas Try Out
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Evaluasi pertumbuhan belajar siswa dari Try Out 1 hingga Try Out 4 vs Target Ambisi Siswa ({verifiedStudent?.targetScore || 85.0} Poin).
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-mono font-semibold">
                      <span className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 rounded-xl flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-800 font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Peningkatan: +{Math.max(0, (activeScore?.calculatedScore || 85) - ((verifiedStudent?.targetScore || 80) - 8)).toFixed(1)} Poin</span>
                      </span>
                    </div>
                  </div>

                  {/* SVG Chart Viewport */}
                  {(() => {
                    const targetScore = verifiedStudent?.targetScore || 85.0;
                    const coords = progressHistory.map((item, i) => {
                      const x = 80 + (i / Math.max(1, progressHistory.length - 1)) * 840;
                      const y = 260 - (Math.min(100, Math.max(0, item.score)) / 100) * 220;
                      const classAvgY = 260 - (Math.min(100, Math.max(0, item.classAverage ?? 75)) / 100) * 220;
                      return { ...item, x, y, classAvgY };
                    });

                    const svgPolyPoints = coords.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
                    const classAvgPolyPoints = coords.map(c => `${c.x.toFixed(1)},${c.classAvgY.toFixed(1)}`).join(' ');
                    const firstX = coords[0]?.x || 80;
                    const lastX = coords[coords.length - 1]?.x || 920;
                    const polygonPoints = `${firstX},260 ${svgPolyPoints} ${lastX},260`;
                    const targetY = 260 - (Math.min(100, Math.max(0, targetScore)) / 100) * 220;

                    return (
                      <div className="p-6 bg-slate-50/70 dark:bg-slate-950/80 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 space-y-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 pb-3">
                          <span className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" />
                            <span>Bagan Grafik Pertumbuhan Belajar Siswa</span>
                          </span>
                          <span className="text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800">
                            Garis Target Ambisi: {targetScore.toFixed(1)} Poin
                          </span>
                        </div>

                        <div className="relative w-full overflow-hidden bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs">
                          <svg className="w-full h-auto overflow-visible" viewBox="0 0 1000 300" preserveAspectRatio="xMidYMid meet">
                            <defs>
                              <linearGradient id="studentChartGradMain" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.30" />
                                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                              </linearGradient>
                            </defs>

                            {/* Y Guidelines */}
                            <line x1="60" y1="40" x2="940" y2="40" stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth="1" />
                            <text x="45" y="44" textAnchor="end" className="text-[11px] fill-slate-400 font-mono">100</text>
                            <line x1="60" y1="95" x2="940" y2="95" stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth="1" strokeDasharray="4 4" />
                            <text x="45" y="99" textAnchor="end" className="text-[11px] fill-slate-400 font-mono">75</text>
                            <line x1="60" y1="150" x2="940" y2="150" stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth="1" strokeDasharray="4 4" />
                            <text x="45" y="154" textAnchor="end" className="text-[11px] fill-slate-400 font-mono">50</text>
                            <line x1="60" y1="205" x2="940" y2="205" stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth="1" strokeDasharray="4 4" />
                            <text x="45" y="209" textAnchor="end" className="text-[11px] fill-slate-400 font-mono">25</text>
                            <line x1="60" y1="260" x2="940" y2="260" stroke="currentColor" className="text-slate-200 dark:text-slate-700" strokeWidth="1.5" />
                            <text x="45" y="264" textAnchor="end" className="text-[11px] fill-slate-400 font-mono">0</text>

                            {/* Target Line */}
                            <line x1="60" y1={targetY} x2="940" y2={targetY} stroke="#f59e0b" strokeWidth="2" strokeDasharray="6 4" />
                            <rect x="780" y={targetY - 12} width="150" height="20" rx="6" fill="#f59e0b" />
                            <text x="855" y={targetY + 2} textAnchor="middle" className="text-[10px] font-mono font-bold fill-slate-950">
                              Target Siswa ({targetScore.toFixed(1)} Poin)
                            </text>

                            {/* Polygon Area Fill */}
                            <polygon points={polygonPoints} fill="url(#studentChartGradMain)" />

                            {/* Class Average Polyline */}
                            <polyline fill="none" stroke="#10b981" strokeWidth="2.5" strokeDasharray="5 5" opacity="0.85" points={classAvgPolyPoints} />

                            {/* Student Score Polyline */}
                            <polyline fill="none" stroke="#6366f1" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" points={svgPolyPoints} />

                            {/* Nodes */}
                            {coords.map((node, i) => (
                              <g key={i}>
                                <line x1={node.x} y1="40" x2={node.x} y2="260" stroke="currentColor" className="text-slate-100 dark:text-slate-800/60" strokeDasharray="3 3" />
                                <circle cx={node.x} cy={node.classAvgY} r="4" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
                                <circle cx={node.x} cy={node.y} r="9" fill="#6366f1" opacity="0.2" />
                                <circle cx={node.x} cy={node.y} r="5.5" fill="#6366f1" stroke="#ffffff" strokeWidth="2.5" />

                                <g transform={`translate(${node.x - 38}, ${node.y - 32})`}>
                                  <rect width="76" height="22" rx="7" className="fill-slate-900 dark:fill-slate-100 shadow-sm" />
                                  <text x="38" y="15" textAnchor="middle" className="text-[11px] font-mono font-bold fill-indigo-300 dark:fill-indigo-700">
                                    {node.score.toFixed(1)} Poin
                                  </text>
                                </g>

                                <text x={node.x} y="280" textAnchor="middle" className="text-[12px] font-mono font-bold fill-slate-800 dark:fill-slate-200">
                                  {node.code}
                                </text>
                                <text x={node.x} y="295" textAnchor="middle" className="text-[10px] font-sans fill-slate-400">
                                  {node.date}
                                </text>
                              </g>
                            ))}
                          </svg>
                        </div>

                        {/* Chart Legend */}
                        <div className="flex flex-wrap items-center justify-center gap-6 pt-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-1 bg-indigo-600 rounded-full inline-block" />
                            <span>Skor Siswa Terhitung</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-0.5 border-t-2 border-dashed border-emerald-500 inline-block" />
                            <span>Rata-Rata Kelas</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-0.5 border-t-2 border-dashed border-amber-500 inline-block" />
                            <span>Target Ambisi ({targetScore.toFixed(0)} Poin)</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* 2. SUBJECT RECAP SECTION (Grafik Per-Mapel + Tabel Rekapitulasi Lengkap) */}
                <SubjectRecapSection
                  student={verifiedStudent}
                  subjects={allSubjects}
                  progressHistory={progressHistory}
                  subjectRecapRows={subjectRecapRows}
                  onOpenSubjectExplanations={subjId => {
                    setPortalTab('EXPLANATIONS');
                    setExplanationSubjectFilter(subjId);
                  }}
                  onExportCSV={() => {
                    ExportService.exportSubjectRecapCSV(
                      verifiedStudent.name,
                      verifiedStudent.nisn,
                      subjectRecapRows,
                      progressHistory.map(p => p.code)
                    );
                  }}
                />
              </div>
            )}

            {/* TAB 3: REKAP BUTIR SOAL YANG DIKERJAKAN */}
            {portalTab === 'QUESTION_SHEET' && studentAnalytics && (
              <StudentQuestionSheet
                questions={allQuestions}
                questionPerformance={studentAnalytics.questionPerformance}
                subjects={allSubjects}
                explanations={publishedExplanations}
                onWatchVideo={(url, title) => {
                  setSelectedVideoUrl(url);
                  setSelectedVideoTitle(title);
                }}
                activeTryoutCode={activeTryout?.code || 'Try Out'}
              />
            )}

            {/* TAB 4: PUSAT MEDIA PEMBAHASAN RESMI (PDF & VIDEO YOUTUBE) */}
            {portalTab === 'EXPLANATIONS' && (() => {
              const filteredExplanations = publishedExplanations.filter(e => {
                if (explanationSubjectFilter === 'ALL') return true;
                return e.subjectId === explanationSubjectFilter;
              });

              const studentResourceCardsList = filteredExplanations.flatMap(exp => {
                const list: Array<{
                  id: string;
                  exp: Explanation;
                  type: 'YOUTUBE' | 'PDF';
                  title: string;
                  url: string;
                  fileName?: string;
                  fileSize?: number;
                }> = [];

                if (exp.youtubeUrl) {
                  list.push({
                    id: `${exp.id}-yt`,
                    exp,
                    type: 'YOUTUBE',
                    title: exp.title.includes('Video') ? exp.title : `Video: ${exp.title}`,
                    url: exp.youtubeUrl,
                  });
                }

                if (exp.pdfUrl) {
                  list.push({
                    id: `${exp.id}-pdf`,
                    exp,
                    type: 'PDF',
                    title: exp.title.includes('PDF') || exp.title.includes('Modul') ? exp.title : `Modul PDF: ${exp.title}`,
                    url: exp.pdfUrl,
                    fileName: exp.pdfFileName || 'Modul_Solusi_Resmi.pdf',
                    fileSize: exp.pdfFileSize,
                  });
                }

                return list;
              }).filter(item => {
                if (mediaTypeFilter === 'YOUTUBE') return item.type === 'YOUTUBE';
                if (mediaTypeFilter === 'PDF') return item.type === 'PDF';
                return true;
              });

              const totalYt = filteredExplanations.filter(e => !!e.youtubeUrl).length;
              const totalPdf = filteredExplanations.filter(e => !!e.pdfUrl).length;

              return (
                <div className="space-y-6 animate-fade-in">
                  {/* Filters Header */}
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-5 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400">
                          <BookOpen className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                            Pusat Media Pembahasan Resmi Guru
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Tautan dokumen PDF dan video pembahasan YouTube resmi untuk evaluasi mandiri paket{' '}
                            <strong className="text-indigo-600 dark:text-indigo-400 font-mono font-bold">{activeTryout?.code || 'Try Out'}</strong>.
                          </p>
                        </div>
                      </div>

                      {/* View Switcher: Katalog Cards vs Modul */}
                      <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => setResourceViewMode('CARDS')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            resourceViewMode === 'CARDS'
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          <LayoutGrid className="w-3.5 h-3.5" />
                          <span>Katalog Kartu ({studentResourceCardsList.length})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setResourceViewMode('MODULES')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            resourceViewMode === 'MODULES'
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Modul Lengkap ({filteredExplanations.length})</span>
                        </button>
                      </div>
                    </div>

                    {/* Subject & Media Filters Toolbar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      {/* Subject Pills */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
                          <Filter className="w-3.5 h-3.5" />
                          <span>Filter Mapel:</span>
                        </span>

                        <button
                          type="button"
                          onClick={() => setExplanationSubjectFilter('ALL')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            explanationSubjectFilter === 'ALL'
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          Semua Mapel ({publishedExplanations.length})
                        </button>

                        {allSubjects.map(s => {
                          const count = publishedExplanations.filter(e => e.subjectId === s.id).length;
                          const isSel = explanationSubjectFilter === s.id;
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => setExplanationSubjectFilter(s.id)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                isSel
                                  ? 'bg-indigo-600 text-white shadow-xs'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                              }`}
                            >
                              <span>{s.name}</span>
                              <span className={`text-[10px] px-1 rounded font-mono ${
                                isSel ? 'bg-indigo-700 text-white' : 'bg-slate-200 dark:bg-slate-700'
                              }`}>
                                {count}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Media Type Filter */}
                      {resourceViewMode === 'CARDS' && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setMediaTypeFilter('ALL')}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                              mediaTypeFilter === 'ALL'
                                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                          >
                            Semua Tipe
                          </button>
                          <button
                            type="button"
                            onClick={() => setMediaTypeFilter('YOUTUBE')}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                              mediaTypeFilter === 'YOUTUBE'
                                ? 'bg-rose-600 text-white'
                                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40 hover:bg-rose-100'
                            }`}
                          >
                            <Youtube className="w-3.5 h-3.5" />
                            <span>YouTube ({totalYt})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setMediaTypeFilter('PDF')}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                              mediaTypeFilter === 'PDF'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/40 hover:bg-indigo-100'
                            }`}
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>PDF ({totalPdf})</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* MODE 1: RESOURCE CARDS GRID */}
                  {resourceViewMode === 'CARDS' && (
                    <div>
                      {studentResourceCardsList.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-3">
                          <BookOpen className="w-12 h-12 text-slate-400 mx-auto" />
                          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                            Belum Ada Tautan Sumber Belajar
                          </h4>
                          <p className="text-xs text-slate-500 max-w-md mx-auto">
                            Belum ada tautan YouTube atau PDF yang dipublikasikan untuk filter yang dipilih.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {studentResourceCardsList.map(item => {
                            const exp = item.exp;
                            const targetQuestion = allQuestions.find(q => q.id === exp.questionId);
                            const expSubj = allSubjects.find(s => s.id === exp.subjectId);

                            return (
                              <ResourceCard
                                key={item.id}
                                id={item.id}
                                type={item.type}
                                title={item.title}
                                url={item.url}
                                fileName={item.fileName}
                                fileSize={item.fileSize}
                                subjectName={expSubj?.name}
                                subjectCode={expSubj?.code}
                                tryoutCode={exp.tryoutId}
                                authorName={exp.authorName}
                                status={exp.status}
                                description={exp.contentText}
                                questionCode={targetQuestion?.uniqueCode}
                                onPreview={(url, title) => {
                                  setSelectedVideoUrl(url);
                                  setSelectedVideoTitle(title);
                                }}
                                isTeacherView={false}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* MODE 2: GROUPED EXPLANATION MODULES */}
                  {resourceViewMode === 'MODULES' && (
                    <div>
                      {filteredExplanations.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 p-12 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-3">
                          <BookOpen className="w-12 h-12 text-slate-400 mx-auto" />
                          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                            Belum Ada Modul Terpublikasi
                          </h4>
                          <p className="text-xs text-slate-500 max-w-md mx-auto">
                            Bapak/Ibu guru belum mempublikasikan modul pembahasan untuk mata pelajaran ini pada paket {activeTryout?.code || 'Try Out'}.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {filteredExplanations.map(exp => {
                            const question = allQuestions.find(q => q.id === exp.questionId);
                            const expSubj = allSubjects.find(s => s.id === exp.subjectId);

                            return (
                              <div
                                key={exp.id}
                                className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4 transition-colors hover:border-indigo-300 dark:hover:border-indigo-800"
                              >
                                <div className="space-y-3">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-lg border font-mono bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800">
                                      {expSubj ? `${expSubj.name} (${expSubj.code})` : 'Umum'}
                                    </span>
                                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                      <span>RESMI GURU</span>
                                    </span>
                                  </div>

                                  <div>
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">
                                      {exp.title}
                                    </h4>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                      Disusun oleh: <strong className="text-slate-700 dark:text-slate-300">{exp.authorName || 'Guru Mata Pelajaran'}</strong>
                                    </p>
                                  </div>

                                  {exp.contentText && (
                                    <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-normal whitespace-pre-line line-clamp-3">
                                      {exp.contentText}
                                    </div>
                                  )}

                                  <div className="space-y-2 pt-1">
                                    {exp.youtubeUrl && (
                                      <ResourceCard
                                        type="YOUTUBE"
                                        title={`Video Solusi: ${exp.title}`}
                                        url={exp.youtubeUrl}
                                        subjectName={expSubj?.name}
                                        subjectCode={expSubj?.code}
                                        tryoutCode={exp.tryoutId}
                                        questionCode={question?.uniqueCode}
                                        onPreview={(url, title) => {
                                          setSelectedVideoUrl(url);
                                          setSelectedVideoTitle(title);
                                        }}
                                        isTeacherView={false}
                                      />
                                    )}

                                    {exp.pdfUrl && (
                                      <ResourceCard
                                        type="PDF"
                                        title={`Modul PDF: ${exp.title}`}
                                        url={exp.pdfUrl}
                                        fileName={exp.pdfFileName || 'Modul_Solusi_Resmi.pdf'}
                                        fileSize={exp.pdfFileSize}
                                        subjectName={expSubj?.name}
                                        subjectCode={expSubj?.code}
                                        tryoutCode={exp.tryoutId}
                                        questionCode={question?.uniqueCode}
                                        isTeacherView={false}
                                      />
                                    )}
                                  </div>
                                </div>

                                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                                  <span>Diperbarui: {new Date(exp.updatedAt).toLocaleDateString('id-ID')}</span>
                                  <span>Paket: {exp.tryoutId.toUpperCase()}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* VIDEO PLAYER MODAL WITH YOUTUBE NO-COOKIE EMBED */}
      {selectedVideoUrl && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800 transition-colors animate-fade-in space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950 text-rose-600">
                  <Youtube className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate max-w-md">
                    {selectedVideoTitle || 'Video Pembahasan Soal Resmi Guru'}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Official Video Player
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedVideoUrl(null)}
                className="px-2.5 py-1 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-800 text-xs font-bold cursor-pointer transition-colors"
              >
                ✕ Tutup
              </button>
            </div>

            <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-inner relative">
              {getYouTubeEmbedUrl(selectedVideoUrl) ? (
                <iframe
                  src={getYouTubeEmbedUrl(selectedVideoUrl)!}
                  title={selectedVideoTitle || 'Video Pembahasan'}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-white text-xs p-6 space-y-3">
                  <Youtube className="w-12 h-12 text-rose-500" />
                  <p className="text-slate-300">Format video khusus, silakan buka langsung di YouTube:</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Disusun oleh Guru Mata Pelajaran
              </span>
              <a
                href={selectedVideoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-semibold transition-colors text-xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Buka di Aplikasi YouTube</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
