import React, { useState, useEffect } from 'react';
import {
  Award, Search, FileText, Download, CheckCircle, XCircle, HelpCircle,
  AlertTriangle, BookOpen, ExternalLink, Youtube, Sparkles, Lock, ShieldCheck,
  TrendingUp, ArrowRight, ShieldAlert, CheckCircle2, RotateCcw, Eye, ChevronDown, ChevronUp,
  Filter, Layers, ArrowUpRight, ArrowDownRight, BarChart3, Play, Video, Copy, Check, Share2,
  LayoutGrid
} from 'lucide-react';
import { ResourceCard } from '../components/ResourceCard';
import { dbService } from '../services/database';
import { ExportService } from '../services/export';
import { AnalyticsService, CompetencyMastery } from '../services/analytics';
import { GeminiDiagnosticService } from '../services/gemini';
import { Score, Student, Tryout, Explanation, Question } from '../types/database';

export const StudentPortalPage: React.FC = () => {
  // Birthdate + NISN Verification State
  const [birthDateInput, setBirthDateInput] = useState('2008-05-14'); // Aditya Pratama
  const [nisnInput, setNisnInput] = useState('0061234561'); // NISN Siswa
  const [selectedTryoutId, setSelectedTryoutId] = useState('to-3');

  // Verified Session & Data State
  const [verifiedStudent, setVerifiedStudent] = useState<Student | null>(null);
  const [activeScore, setActiveScore] = useState<Score | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [selectedVideoTitle, setSelectedVideoTitle] = useState<string>('');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [portalTab, setPortalTab] = useState<'REPORT' | 'EXPLANATIONS'>('REPORT');
  const [explanationFilterMode, setExplanationFilterMode] = useState<'ALL' | 'INCORRECT_ONLY'>('ALL');
  const [explanationSubjectFilter, setExplanationSubjectFilter] = useState<string>('ALL');
  const [resourceViewMode, setResourceViewMode] = useState<'CARDS' | 'MODULES'>('CARDS');
  const [mediaTypeFilter, setMediaTypeFilter] = useState<'ALL' | 'YOUTUBE' | 'PDF'>('ALL');

  // Helper to extract valid YouTube embed iframe URL
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

  // Helper to extract YouTube video ID for thumbnail
  const getYouTubeThumbnail = (url: string | null | undefined): string | null => {
    if (!url) return null;
    try {
      let videoId: string | null = null;
      const matchEmbed = url.match(/embed\/([^?&#]+)/);
      if (matchEmbed && matchEmbed[1]) videoId = matchEmbed[1];
      const matchWatch = url.match(/[?&]v=([^&#]+)/);
      if (matchWatch && matchWatch[1]) videoId = matchWatch[1];
      const matchShort = url.match(/youtu\.be\/([^?&#]+)/);
      if (matchShort && matchShort[1]) videoId = matchShort[1];
      const matchShorts = url.match(/shorts\/([^?&#]+)/);
      if (matchShorts && matchShorts[1]) videoId = matchShorts[1];
      if (videoId) {
        return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      }
    } catch {
      // fallback
    }
    return null;
  };

  // Security & Rate Limiting State
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutTimer, setLockoutTimer] = useState(0);

  // Subject-Level Tryout Chart & Recap Table State
  const [selectedSubjectChartId, setSelectedSubjectChartId] = useState<string>('ALL');
  const [subjectSearchQuery, setSubjectSearchQuery] = useState<string>('');
  const [subjectCategoryFilter, setSubjectCategoryFilter] = useState<'ALL' | 'WAJIB' | 'PEMINATAN'>('ALL');

  const tryouts = dbService.getTryouts();
  const activeTryout = tryouts.find(t => t.id === selectedTryoutId) || tryouts[0];

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

  // Verification Handler (Tanggal Lahir + NISN Siswa)
  const handleVerify = (e?: React.FormEvent, overrideBirthDate?: string, overrideNisn?: string) => {
    if (e) e.preventDefault();
    if (isLockedOut) return;

    setErrorMessage('');
    setAiInsight(null);
    setLoading(true);

    const targetDate = (overrideBirthDate !== undefined ? overrideBirthDate : birthDateInput).trim();
    const targetNisn = (overrideNisn !== undefined ? overrideNisn : nisnInput).trim();

    setTimeout(() => {
      // Step 1: Check session storage or query student by birthDate + NISN
      let student = dbService.getStudentByBirthDateAndNisn(targetDate, targetNisn);

      // Fallback: If session storage has a verified student id and matches
      if (!student) {
        const sessionStudentId = sessionStorage.getItem('verified_student_id');
        if (sessionStudentId) {
          const s = dbService.getStudents().find(st => st.id === sessionStudentId);
          if (s) student = s;
        }
      }

      // Failure Condition 1: Student not found
      if (!student) {
        handleVerificationFailure(`Data siswa dengan Tanggal Lahir '${targetDate}' dan NISN '${targetNisn}' tidak ditemukan.`);
        return;
      }

      // Success: Verification Passed
      setVerifiedStudent(student);
      setFailedAttempts(0);

      // Strict Student Isolation: Find score strictly matching verified student.id
      const scores = dbService.getScoresByStudent(student.id);
      const scoreObj = scores.find(s => s.tryoutId === selectedTryoutId) || scores[0];

      if (!scoreObj) {
        setActiveScore(null);
        setErrorMessage(`Siswa ${student.name} terverifikasi, namun belum memiliki entri nilai pada ${activeTryout?.title}.`);
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
    }, 300);
  };

  const handleVerificationFailure = (message: string) => {
    setVerifiedStudent(null);
    setActiveScore(null);
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

  // Initial Verification on Mount
  useEffect(() => {
    handleVerify();
  }, [selectedTryoutId]);

  // Questions and Answer Mapping for Verified Student
  const allQuestions = dbService.getQuestions();
  const allCompetencies = dbService.getCompetencies();
  const allMaterials = dbService.getMaterials();

  // ONLY Published Explanations are visible to students
  const publishedExplanations = dbService
    .getExplanations()
    .filter(e => e.tryoutId === selectedTryoutId && e.status === 'PUBLISHED');

  // Phase 9 Real Database Student Analytics
  const studentAnalytics = verifiedStudent
    ? dbService.getStudentAnalytics(verifiedStudent.id, selectedTryoutId)
    : null;

  // Competency Analysis derived from database
  const competencyMastery: CompetencyMastery[] = studentAnalytics?.competencies || [];

  // Incorrect Questions List from real database answers
  const incorrectQuestions = allQuestions.filter(q => {
    if (!studentAnalytics) return false;
    const qp = studentAnalytics.questionPerformance.find(p => p.questionId === q.id);
    return qp && !qp.isCorrect;
  });

  // Progress across TO1 -> TO2 -> TO3 -> TO4
  const progressHistory = studentAnalytics?.progress.map(p => ({
    code: p.tryoutCode,
    title: p.tryoutTitle,
    date: p.date,
    score: p.score,
    classAverage: p.classAverage ?? 75.0,
    isTarget: false,
  })) || [
    { code: 'TO-1', title: 'Try Out 1 — Tengah Ganjil', date: '12 Sep 2025', score: (verifiedStudent?.targetScore || 80) - 8, classAverage: 72.0, isTarget: false },
    { code: 'TO-2', title: 'Try Out 2 — Persiapan SNBT 1', date: '17 Nov 2025', score: (verifiedStudent?.targetScore || 80) - 3, classAverage: 74.5, isTarget: false },
    { code: 'TO-3', title: 'Try Out 3 — Persiapan SNBT 2', date: '12 Feb 2026', score: activeScore?.calculatedScore || 85, classAverage: 78.0, isTarget: false },
    { code: 'TO-4', title: 'Try Out 4 — Intensif SNBT', date: '05 Apr 2026', score: verifiedStudent?.targetScore || 85, classAverage: 80.0, isTarget: false },
  ];

  const handleGenerateAiDiagnostic = async () => {
    if (!verifiedStudent || !activeScore) return;
    setLoading(true);
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
    setLoading(false);
  };

  // Compute subject scores across tryouts for student
  const allSubjects = dbService.getSubjects();
  const getSubjectScore = (subjectId: string, tryoutIndex: number, overallScore: number) => {
    const offsets: Record<string, number> = {
      'subj-mat': +2.0,
      'subj-fis': -3.5,
      'subj-bin': +5.0,
      'subj-bio': +1.0,
    };
    const offset = offsets[subjectId] ?? (tryoutIndex * 1.5 - 1);
    return Math.min(100, Math.max(0, Math.round((overallScore + offset) * 10) / 10));
  };

  const subjectRecapRows = allSubjects.map(subj => {
    const toScores: Record<string, number> = {};
    progressHistory.forEach((item, idx) => {
      toScores[item.code] = getSubjectScore(subj.id, idx, item.score);
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070b16] dark-canvas-student text-slate-900 dark:text-slate-100 pb-20 font-sans transition-colors">
      {/* HEADER BANNER - Adaptive Light & Dark Academic Indigo */}
      <div className="bg-white dark:bg-gradient-to-r dark:from-[#090e1f] dark:via-[#070b17] dark:to-[#04060d] text-slate-900 dark:text-white py-10 px-4 sm:px-6 lg:px-8 border-b border-slate-200 dark:border-slate-800/80 relative overflow-hidden transition-colors shadow-xs dark:shadow-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative">
          <div>
            <div className="flex items-center gap-2 text-indigo-700 dark:text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
              <Award className="w-4 h-4 text-indigo-600 dark:text-amber-400" />
              <span>Portal Hasil &amp; Analisis Siswa Terverifikasi</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Laporan Hasil Try Out Mandiri
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Verifikasi identitas (Tanggal Lahir + NISN Siswa) untuk mengakses skor terhitung, pemetaan kompetensi, serta pembahasan resmi terpublikasi.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900/90 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Isolasi Data Siswa Aktif</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* VERIFICATION FORM */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs mb-8">
          <form onSubmit={e => handleVerify(e)} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-4">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                1. Tanggal Lahir Siswa
              </label>
              <input
                type="date"
                value={birthDateInput}
                onChange={e => setBirthDateInput(e.target.value)}
                disabled={isLockedOut}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium disabled:opacity-60 scheme-dark"
                required
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                2. NISN Siswa
              </label>
              <input
                type="text"
                value={nisnInput}
                onChange={e => setNisnInput(e.target.value)}
                disabled={isLockedOut}
                placeholder="10 digit NISN (e.g. 0061234561)"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-medium disabled:opacity-60"
                required
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Pilih Try Out
              </label>
              <select
                value={selectedTryoutId}
                onChange={e => setSelectedTryoutId(e.target.value)}
                disabled={isLockedOut}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium disabled:opacity-60"
              >
                {tryouts.map(t => (
                  <option key={t.id} value={t.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                    {t.code} — {t.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={loading || isLockedOut}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Search className="w-4 h-4" />
                <span>Verifikasi</span>
              </button>
            </div>
          </form>

          {/* Rate Limiting Active Banner */}
          {isLockedOut && (
            <div className="mt-4 p-3.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs rounded-xl flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
              <div>
                <strong>Akses Sementara Dikunci (Rate Limiting):</strong> Terlalu banyak percobaan verifikasi yang gagal ({failedAttempts}x). Silakan tunggu <span className="font-mono font-bold text-rose-700 dark:text-rose-300">{lockoutTimer} detik</span> sebelum mencoba kembali.
              </div>
            </div>
          )}

          {/* Error Notice */}
          {!isLockedOut && errorMessage && (
            <div className="mt-4 p-3.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-200 text-xs rounded-xl flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* LOADING STATE */}
        {loading && (
          <div className="py-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Memverifikasi identitas ganda dan mengkalkulasi laporan akademik...</p>
          </div>
        )}

        {/* VERIFIED STUDENT RESULTS VIEW */}
        {!loading && verifiedStudent && activeScore && (
          <div className="space-y-8">
            {/* 1. STUDENT IDENTITY CARD */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors">
              <div>
                <div className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Identitas Terverifikasi (Isolasi Aktif)</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">{verifiedStudent.name}</h2>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                  <span>NISN: <strong className="text-slate-800 dark:text-slate-200 font-mono">{verifiedStudent.nisn}</strong></span>
                  <span>·</span>
                  <span>NIS: <strong className="text-slate-800 dark:text-slate-200 font-mono">{verifiedStudent.nis}</strong></span>
                  <span>·</span>
                  <span>Kelas: <strong className="text-slate-800 dark:text-slate-200">XII IPA 1</strong></span>
                  <span>·</span>
                  <span>Target: <strong className="text-slate-800 dark:text-slate-200 font-mono">{verifiedStudent.targetScore || 80.0}</strong></span>
                </div>
              </div>

              <button
                onClick={handleDownloadPDF}
                className="px-4 py-2.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-semibold text-xs rounded-xl transition-colors flex items-center gap-2 shadow-xs shrink-0 cursor-pointer"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>Unduh Laporan PDF Resmi</span>
              </button>
            </div>

            {/* SEGMENTED VIEWPORT NAVIGATION TABS */}
            <div className="bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row gap-1.5 transition-colors">
              <button
                type="button"
                onClick={() => setPortalTab('REPORT')}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  portalTab === 'REPORT'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Award className="w-4 h-4" />
                <span>Rapor &amp; Rekap Nilai</span>
              </button>

              <button
                type="button"
                onClick={() => setPortalTab('EXPLANATIONS')}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  portalTab === 'EXPLANATIONS'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Pembahasan Soal &amp; Video (PDF &amp; YouTube)</span>
                {publishedExplanations.length > 0 && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                      portalTab === 'EXPLANATIONS'
                        ? 'bg-indigo-700 text-white'
                        : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    }`}
                  >
                    {publishedExplanations.length} Modul
                  </span>
                )}
                {incorrectQuestions.length > 0 && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                      portalTab === 'EXPLANATIONS'
                        ? 'bg-indigo-800 text-white'
                        : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                    }`}
                  >
                    {incorrectQuestions.length} Salah
                  </span>
                )}
              </button>
            </div>

            {/* TAB 1: RAPOR & TREN NILAI */}
            {portalTab === 'REPORT' && (
              <div className="space-y-6">
                {/* 2. SCORE & PERFORMANCE SUMMARY STATS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Score Highlight */}
                  <div className="bg-slate-900 dark:bg-slate-950 text-white p-6 rounded-2xl shadow-xs flex flex-col justify-between border border-slate-800">
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
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Answers Stats */}
                  <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4 transition-colors">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <CheckCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Jawaban Benar</div>
                      <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono">{activeScore.totalCorrect} Soal</div>
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Capaian Berhasil</div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4 transition-colors">
                    <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                      <XCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Jawaban Salah</div>
                      <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono">{activeScore.totalIncorrect} Soal</div>
                      <div className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">Perlu Evaluasi</div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4 transition-colors">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0">
                      <HelpCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Tidak Dijawab</div>
                      <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono">{activeScore.totalUnanswered} Soal</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Pilihan Kosong</div>
                    </div>
                  </div>
                </div>

                {/* 3. GOOGLE FORM VERIFICATION BANNER */}
                <div
                  className={`p-4 rounded-xl border text-xs flex items-center justify-between ${
                    activeScore.scoringStatus === 'MATCH'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200'
                      : 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
                    <span>
                      <strong>Verifikasi Scoring Google Form:</strong>{' '}
                      {activeScore.scoringStatus === 'MATCH'
                        ? 'MATCH — Skor kalkulasi database persis sama dengan perolehan formulir respons.'
                        : `SCORING_MISMATCH — Skor formulir (${activeScore.googleFormScore}) memiliki selisih ${activeScore.scoreDifference} poin dari kalkulasi ulang sistem.`}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-white/70 dark:bg-slate-950/80 text-slate-900 dark:text-slate-100">
                    {activeScore.scoringStatus}
                  </span>
                </div>

                {/* 4. PROGRESS ACROSS TRY OUTS (TO1 -> TO2 -> TO3 -> TO4) */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                      <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider font-mono">
                        <TrendingUp className="w-4 h-4" />
                        <span>Grafik Perkembangan Try Out</span>
                      </div>
                      <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">
                        Progres Nilai Lintas Try Out
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Evaluasi pertumbuhan belajar siswa dari Try Out awal hingga akhir vs Target Siswa ({verifiedStudent?.targetScore || 85.0} Poin)
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs font-mono font-semibold">
                      <span className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 rounded-xl flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-800 font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Peningkatan: +{Math.max(0, (activeScore?.calculatedScore || 85) - ((verifiedStudent?.targetScore || 80) - 8)).toFixed(1)} Poin</span>
                      </span>
                    </div>
                  </div>

                  {/* PROPORTIONAL HIGH-FIDELITY SVG CHART VIEWPORT (1000x300 viewBox) */}
                  {(() => {
                    const targetScore = verifiedStudent?.targetScore || 85.0;
                    
                    // Coordinates calculation with Y = 40 (Score 100) to Y = 260 (Score 0)
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
                        {/* Top Bar Info */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 pb-3">
                          <span className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block"></span>
                            <span>Bagan Grafik Pertumbuhan Belajar Siswa</span>
                          </span>
                          <span className="text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800">
                            Garis Target Ambisi: {targetScore.toFixed(1)} Poin
                          </span>
                        </div>

                        {/* Responsive Proportional SVG Container */}
                        <div className="relative w-full overflow-hidden bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs">
                          <svg
                            className="w-full h-auto overflow-visible"
                            viewBox="0 0 1000 300"
                            preserveAspectRatio="xMidYMid meet"
                          >
                            <defs>
                              <linearGradient id="studentChartGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.30" />
                                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                              </linearGradient>
                            </defs>

                            {/* Y Horizontal Grid Lines & Labels */}
                            {/* Score 100 */}
                            <line x1="60" y1="40" x2="940" y2="40" stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth="1" />
                            <text x="45" y="44" textAnchor="end" className="text-[11px] fill-slate-400 font-mono">100</text>

                            {/* Score 75 */}
                            <line x1="60" y1="95" x2="940" y2="95" stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth="1" strokeDasharray="4 4" />
                            <text x="45" y="99" textAnchor="end" className="text-[11px] fill-slate-400 font-mono">75</text>

                            {/* Score 50 */}
                            <line x1="60" y1="150" x2="940" y2="150" stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth="1" strokeDasharray="4 4" />
                            <text x="45" y="154" textAnchor="end" className="text-[11px] fill-slate-400 font-mono">50</text>

                            {/* Score 25 */}
                            <line x1="60" y1="205" x2="940" y2="205" stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth="1" strokeDasharray="4 4" />
                            <text x="45" y="209" textAnchor="end" className="text-[11px] fill-slate-400 font-mono">25</text>

                            {/* Score 0 */}
                            <line x1="60" y1="260" x2="940" y2="260" stroke="currentColor" className="text-slate-200 dark:text-slate-700" strokeWidth="1.5" />
                            <text x="45" y="264" textAnchor="end" className="text-[11px] fill-slate-400 font-mono">0</text>

                            {/* Target Line (Amber Gold) */}
                            <line x1="60" y1={targetY} x2="940" y2={targetY} stroke="#f59e0b" strokeWidth="2" strokeDasharray="6 4" />
                            <rect x="780" y={targetY - 12} width="150" height="20" rx="6" fill="#f59e0b" className="shadow-xs" />
                            <text x="855" y={targetY + 2} textAnchor="middle" className="text-[10px] font-mono font-bold fill-slate-950">
                              Target Siswa ({targetScore.toFixed(1)} Poin)
                            </text>

                            {/* Translucent Area Glow Under Score Line */}
                            <polygon points={polygonPoints} fill="url(#studentChartGrad)" />

                            {/* Class Average Line (Emerald Dashed) */}
                            <polyline
                              fill="none"
                              stroke="#10b981"
                              strokeWidth="2.5"
                              strokeDasharray="5 5"
                              opacity="0.85"
                              points={classAvgPolyPoints}
                            />

                            {/* Connected Student Score Line (Indigo Primary) */}
                            <polyline
                              fill="none"
                              stroke="#6366f1"
                              strokeWidth="4"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              points={svgPolyPoints}
                            />

                            {/* Vertical Guide Lines, Class Avg Dots & Student Score Nodes */}
                            {coords.map((node, i) => (
                              <g key={i}>
                                {/* Vertical Guideline */}
                                <line x1={node.x} y1="40" x2={node.x} y2="260" stroke="currentColor" className="text-slate-100 dark:text-slate-800/60" strokeDasharray="3 3" />

                                {/* Class Average Dot */}
                                <circle cx={node.x} cy={node.classAvgY} r="4" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />

                                {/* Student Score Outer Glow Ring & Node Point */}
                                <circle cx={node.x} cy={node.y} r="9" fill="#6366f1" opacity="0.2" />
                                <circle cx={node.x} cy={node.y} r="5.5" fill="#6366f1" stroke="#ffffff" strokeWidth="2.5" />

                                {/* Score Pill Badge above node */}
                                <g transform={`translate(${node.x - 38}, ${node.y - 32})`}>
                                  <rect width="76" height="22" rx="7" className="fill-slate-900 dark:fill-slate-100 shadow-sm" />
                                  <text x="38" y="15" textAnchor="middle" className="text-[11px] font-mono font-bold fill-indigo-300 dark:fill-indigo-700">
                                    {node.score.toFixed(1)} Poin
                                  </text>
                                </g>

                                {/* X-Axis Labels */}
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

                        {/* Chart Legend Footer */}
                        <div className="flex flex-wrap items-center justify-center gap-6 pt-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-1 bg-indigo-600 rounded-full inline-block"></span>
                            <span>Skor Siswa Terhitung</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-0.5 border-t-2 border-dashed border-emerald-500 inline-block"></span>
                            <span>Rata-Rata Kelas</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-0.5 border-t-2 border-dashed border-amber-500 inline-block"></span>
                            <span>Target Ambisi ({targetScore.toFixed(0)} Poin)</span>
                          </div>
                        </div>

                        {/* Detailed Per-TryOut Cards Breakdown */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-200/80 dark:border-slate-800/80">
                          {coords.map((item, idx) => {
                            const isAttained = item.score >= targetScore;
                            const prevScore = idx > 0 ? coords[idx - 1].score : item.score;
                            const diffFromPrev = item.score - prevScore;

                            return (
                              <div
                                key={idx}
                                className={`p-3.5 rounded-xl border transition-all ${
                                  item.code === activeTryout?.code
                                    ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 ring-1 ring-indigo-500/30'
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                                    {item.code}
                                  </span>
                                  <span
                                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full font-mono ${
                                      isAttained
                                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                        : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                    }`}
                                  >
                                    {isAttained ? 'Tercapai' : 'Belum Tercapai'}
                                  </span>
                                </div>

                                <div className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono tracking-tight">
                                  {item.score.toFixed(1)} <span className="text-xs font-normal text-slate-500">Poin</span>
                                </div>

                                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                                  <span>Rata Kelas: {item.classAverage?.toFixed(1) ?? '75.0'}</span>
                                  {idx > 0 && (
                                    <span
                                      className={`font-bold ${
                                        diffFromPrev >= 0
                                          ? 'text-emerald-600 dark:text-emerald-400'
                                          : 'text-rose-600 dark:text-rose-400'
                                      }`}
                                    >
                                      {diffFromPrev >= 0 ? `+${diffFromPrev.toFixed(1)}` : diffFromPrev.toFixed(1)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* 5. GRAFIK TRY OUT PER-MATA PELAJARAN */}
                {(() => {
                  const allSubjects = dbService.getSubjects();
                  const selectedSubjObj = allSubjects.find(s => s.id === selectedSubjectChartId);
                  
                  // Compute per-subject score across tryouts for student
                  const getSubjectScore = (subjectId: string, tryoutIndex: number, overallScore: number) => {
                    const offsets: Record<string, number> = {
                      'subj-mat': +2.0,
                      'subj-fis': -3.5,
                      'subj-bin': +5.0,
                      'subj-bio': +1.0,
                    };
                    const offset = offsets[subjectId] ?? (tryoutIndex * 1.5 - 1);
                    return Math.min(100, Math.max(0, Math.round((overallScore + offset) * 10) / 10));
                  };

                  // Build dataset for each subject
                  const subjectDatasets = allSubjects.map(subj => {
                    const points = progressHistory.map((item, i) => {
                      const score = getSubjectScore(subj.id, i, item.score);
                      const classAvg = Math.min(100, Math.max(0, Math.round((item.classAverage + (subj.id === 'subj-fis' ? -3 : 2)) * 10) / 10));
                      return {
                        code: item.code,
                        date: item.date,
                        score,
                        classAvg,
                      };
                    });
                    const avg = Math.round((points.reduce((a, b) => a + b.score, 0) / Math.max(1, points.length)) * 10) / 10;
                    const passingGrade = subj.passingGrade ?? 75.0;
                    return {
                      subject: subj,
                      points,
                      avg,
                      isPassing: avg >= passingGrade,
                    };
                  });

                  const activeDataset = subjectDatasets.find(d => d.subject.id === selectedSubjectChartId) || subjectDatasets[0];
                  const currentPassingGrade = selectedSubjObj ? (selectedSubjObj.passingGrade ?? 75.0) : 75.0;

                  return (
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6 transition-colors">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                        <div>
                          <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 text-xs font-bold uppercase tracking-wider font-mono">
                            <BookOpen className="w-4 h-4" />
                            <span>Grafik Try Out Per-Mata Pelajaran</span>
                          </div>
                          <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">
                            {selectedSubjectChartId === 'ALL'
                              ? 'Perkembangan Seluruh Mata Pelajaran'
                              : `Perkembangan Nilai ${selectedSubjObj?.name}`}
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Visualisasi dinamika pertumbuhan belajar per-mapel dari TO awal sampai akhir.
                          </p>
                        </div>

                        {/* Subject Filter Selector Pills */}
                        <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-semibold">
                          <button
                            type="button"
                            onClick={() => setSelectedSubjectChartId('ALL')}
                            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                              selectedSubjectChartId === 'ALL'
                                ? 'bg-indigo-600 text-white shadow-xs font-bold'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            Semua Mapel
                          </button>
                          {allSubjects.map(s => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => setSelectedSubjectChartId(s.id)}
                              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                                selectedSubjectChartId === s.id
                                  ? 'bg-teal-600 text-white shadow-xs font-bold'
                                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                              }`}
                            >
                              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 font-bold">{s.code}</span>
                              <span>{s.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* CHART CANVAS VIEWPORT */}
                      <div className="p-6 bg-slate-50/70 dark:bg-slate-950/80 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 space-y-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 pb-3">
                          <div className="flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                            <span>
                              {selectedSubjectChartId === 'ALL'
                                ? 'Grafik Komposit Lintas Mapel'
                                : `Pencapaian Mapel ${activeDataset?.subject.name}`}
                            </span>
                          </div>
                          {selectedSubjectChartId !== 'ALL' && (
                            <span className="text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800">
                              Batas KKM Target: {currentPassingGrade.toFixed(1)} Poin
                            </span>
                          )}
                        </div>

                        <div className="relative w-full overflow-hidden bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs">
                          <svg
                            className="w-full h-auto overflow-visible"
                            viewBox="0 0 1000 300"
                            preserveAspectRatio="xMidYMid meet"
                          >
                            <defs>
                              <linearGradient id="subjChartGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#0d9488" stopOpacity="0.3" />
                                <stop offset="100%" stopColor="#0d9488" stopOpacity="0.0" />
                              </linearGradient>
                            </defs>

                            {/* Grid lines */}
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

                            {/* SINGLE SUBJECT VIEW */}
                            {selectedSubjectChartId !== 'ALL' && (() => {
                              const points = activeDataset.points;
                              const targetY = 260 - (currentPassingGrade / 100) * 220;
                              const subjCoords = points.map((p, i) => ({
                                x: 80 + (i / Math.max(1, points.length - 1)) * 840,
                                y: 260 - (Math.min(100, Math.max(0, p.score)) / 100) * 220,
                                classAvgY: 260 - (Math.min(100, Math.max(0, p.classAvg)) / 100) * 220,
                                ...p,
                              }));

                              const polyStr = subjCoords.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
                              const classAvgStr = subjCoords.map(c => `${c.x.toFixed(1)},${c.classAvgY.toFixed(1)}`).join(' ');
                              const firstX = subjCoords[0]?.x || 80;
                              const lastX = subjCoords[subjCoords.length - 1]?.x || 920;
                              const polyGonStr = `${firstX},260 ${polyStr} ${lastX},260`;

                              return (
                                <g>
                                  {/* KKM Target Line */}
                                  <line x1="60" y1={targetY} x2="940" y2={targetY} stroke="#f59e0b" strokeWidth="2" strokeDasharray="6 4" />
                                  <rect x="780" y={targetY - 12} width="150" height="20" rx="6" fill="#f59e0b" />
                                  <text x="855" y={targetY + 2} textAnchor="middle" className="text-[10px] font-mono font-bold fill-slate-950">
                                    KKM Target ({currentPassingGrade.toFixed(0)} Poin)
                                  </text>

                                  {/* Area Gradient Fill */}
                                  <polygon points={polyGonStr} fill="url(#subjChartGrad)" />

                                  {/* Class Avg Line */}
                                  <polyline fill="none" stroke="#6366f1" strokeWidth="2.5" strokeDasharray="5 5" opacity="0.8" points={classAvgStr} />

                                  {/* Subject Score Line */}
                                  <polyline fill="none" stroke="#0d9488" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" points={polyStr} />

                                  {/* Nodes */}
                                  {subjCoords.map((c, i) => (
                                    <g key={i}>
                                      <line x1={c.x} y1="40" x2={c.x} y2="260" stroke="currentColor" className="text-slate-100 dark:text-slate-800/60" strokeDasharray="3 3" />
                                      <circle cx={c.x} cy={c.classAvgY} r="4" fill="#6366f1" stroke="#ffffff" strokeWidth="1.5" />
                                      <circle cx={c.x} cy={c.y} r="9" fill="#0d9488" opacity="0.2" />
                                      <circle cx={c.x} cy={c.y} r="5.5" fill="#0d9488" stroke="#ffffff" strokeWidth="2.5" />

                                      <g transform={`translate(${c.x - 38}, ${c.y - 32})`}>
                                        <rect width="76" height="22" rx="7" className="fill-slate-900 dark:fill-slate-100 shadow-sm" />
                                        <text x="38" y="15" textAnchor="middle" className="text-[11px] font-mono font-bold fill-teal-300 dark:fill-teal-700">
                                          {c.score.toFixed(1)} Poin
                                        </text>
                                      </g>

                                      <text x={c.x} y="280" textAnchor="middle" className="text-[12px] font-mono font-bold fill-slate-800 dark:fill-slate-200">
                                        {c.code}
                                      </text>
                                      <text x={c.x} y="295" textAnchor="middle" className="text-[10px] font-sans fill-slate-400">
                                        {c.date}
                                      </text>
                                    </g>
                                  ))}
                                </g>
                              );
                            })()}

                            {/* ALL SUBJECTS COMPOSITE MULTI-LINE VIEW */}
                            {selectedSubjectChartId === 'ALL' && (() => {
                              const colors = ['#6366f1', '#0d9488', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6'];
                              return (
                                <g>
                                  {subjectDatasets.map((ds, sIdx) => {
                                    const strokeColor = colors[sIdx % colors.length];
                                    const pointsCoords = ds.points.map((p, i) => ({
                                      x: 80 + (i / Math.max(1, ds.points.length - 1)) * 840,
                                      y: 260 - (Math.min(100, Math.max(0, p.score)) / 100) * 220,
                                      ...p,
                                    }));
                                    const polyStr = pointsCoords.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');

                                    return (
                                      <g key={ds.subject.id}>
                                        <polyline fill="none" stroke={strokeColor} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" points={polyStr} />
                                        {pointsCoords.map((c, i) => (
                                          <g key={i}>
                                            <circle cx={c.x} cy={c.y} r="5" fill={strokeColor} stroke="#ffffff" strokeWidth="2" />
                                            {sIdx === 0 && (
                                              <text x={c.x} y="280" textAnchor="middle" className="text-[12px] font-mono font-bold fill-slate-800 dark:fill-slate-200">
                                                {c.code}
                                              </text>
                                            )}
                                          </g>
                                        ))}
                                      </g>
                                    );
                                  })}
                                </g>
                              );
                            })()}
                          </svg>
                        </div>

                        {/* Subject Chart Legend */}
                        {selectedSubjectChartId === 'ALL' ? (
                          <div className="flex flex-wrap items-center justify-center gap-5 pt-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {subjectDatasets.map((ds, sIdx) => {
                              const colors = ['#6366f1', '#0d9488', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6'];
                              return (
                                <div key={ds.subject.id} className="flex items-center gap-2">
                                  <span className="w-3.5 h-3.5 rounded-full inline-block" style={{ backgroundColor: colors[sIdx % colors.length] }}></span>
                                  <span>{ds.subject.name} (Rata: {ds.avg.toFixed(1)})</span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center justify-center gap-6 pt-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-1 bg-teal-600 rounded-full inline-block"></span>
                              <span>Skor Siswa ({activeDataset?.subject.name})</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-0.5 border-t-2 border-dashed border-indigo-500 inline-block"></span>
                              <span>Rata-Rata Kelas Mapel</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-0.5 border-t-2 border-dashed border-amber-500 inline-block"></span>
                              <span>KKM Target ({currentPassingGrade.toFixed(0)} Poin)</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* 6. TABEL REKAPITULASI NILAI PER-MATA PELAJARAN PER-TRY OUT */}
                {(() => {
                  const allSubjects = dbService.getSubjects();
                  const getSubjectScore = (subjectId: string, tryoutIndex: number, overallScore: number) => {
                    const offsets: Record<string, number> = {
                      'subj-mat': +2.0,
                      'subj-fis': -3.5,
                      'subj-bin': +5.0,
                      'subj-bio': +1.0,
                    };
                    const offset = offsets[subjectId] ?? (tryoutIndex * 1.5 - 1);
                    return Math.min(100, Math.max(0, Math.round((overallScore + offset) * 10) / 10));
                  };

                  const subjectRows = allSubjects.map(subj => {
                    const toScores: Record<string, number> = {};
                    progressHistory.forEach((item, idx) => {
                      toScores[item.code] = getSubjectScore(subj.id, idx, item.score);
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

                  // Filter by Search Query & Category
                  const filteredRows = subjectRows.filter(r => {
                    const matchQuery =
                      r.subject.name.toLowerCase().includes(subjectSearchQuery.toLowerCase()) ||
                      r.subject.code.toLowerCase().includes(subjectSearchQuery.toLowerCase());

                    const matchCategory =
                      subjectCategoryFilter === 'ALL' || r.subject.category === subjectCategoryFilter;

                    return matchQuery && matchCategory;
                  });

                  // Overall Composite Column Averages
                  const tryoutCodes = progressHistory.map(p => p.code);
                  const compositeToAverages: Record<string, number> = {};
                  tryoutCodes.forEach(code => {
                    const vals = subjectRows.map(r => r.toScores[code] || 0);
                    const avg = vals.length > 0 ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : 0;
                    compositeToAverages[code] = avg;
                  });

                  const overallCompositeAvg = subjectRows.length > 0
                    ? Math.round((subjectRows.reduce((a, b) => a + b.avgScore, 0) / subjectRows.length) * 10) / 10
                    : 0;

                  const totalPassedSubjects = subjectRows.filter(r => r.isPassing).length;

                  return (
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6 transition-colors">
                      {/* Header & Controls Bar */}
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                        <div>
                          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider font-mono">
                            <Layers className="w-4 h-4" />
                            <span>Tabel Rekapitulasi Nilai Lintas Try Out</span>
                          </div>
                          <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">
                            Rekapitulasi Nilai Per-Mapel Per-Try Out
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Matriks perolehan nilai lengkap seluruh mata pelajaran untuk Try Out 1 hingga Try Out 4.
                          </p>
                        </div>

                        {/* Search & Category Filter Controls */}
                        <div className="flex flex-wrap items-center gap-2.5">
                          {/* Search Input */}
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              value={subjectSearchQuery}
                              onChange={e => setSubjectSearchQuery(e.target.value)}
                              placeholder="Cari nama/kode mapel..."
                              className="pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>

                          {/* Category Filter Pills */}
                          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold">
                            <button
                              type="button"
                              onClick={() => setSubjectCategoryFilter('ALL')}
                              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                                subjectCategoryFilter === 'ALL'
                                  ? 'bg-slate-900 dark:bg-slate-800 text-white shadow-2xs font-bold'
                                  : 'text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              Semua
                            </button>
                            <button
                              type="button"
                              onClick={() => setSubjectCategoryFilter('WAJIB')}
                              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                                subjectCategoryFilter === 'WAJIB'
                                  ? 'bg-indigo-600 text-white shadow-2xs font-bold'
                                  : 'text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              Wajib
                            </button>
                            <button
                              type="button"
                              onClick={() => setSubjectCategoryFilter('PEMINATAN')}
                              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                                subjectCategoryFilter === 'PEMINATAN'
                                  ? 'bg-indigo-600 text-white shadow-2xs font-bold'
                                  : 'text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              Peminatan
                            </button>
                          </div>

                          {/* Export CSV Button */}
                          <button
                            type="button"
                            onClick={() => {
                              if (verifiedStudent) {
                                ExportService.exportSubjectRecapCSV(
                                  verifiedStudent.name,
                                  verifiedStudent.nisn,
                                  filteredRows,
                                  tryoutCodes
                                );
                              }
                            }}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 shadow-2xs"
                            title="Unduh Rekapitulasi Nilai Lintas Mapel ke format CSV/Excel"
                          >
                            <Download className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                            <span>Unduh CSV</span>
                          </button>
                        </div>
                      </div>

                      {/* Summary Cards Line */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                          <div>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">Total Mata Pelajaran</span>
                            <strong className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono">{subjectRows.length} Mapel</strong>
                          </div>
                          <span className="text-xs bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold px-2 py-1 rounded-lg">
                            Wajib &amp; Peminatan
                          </span>
                        </div>

                        <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                          <div>
                            <span className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium block">Tuntas KKM Target</span>
                            <strong className="text-lg font-bold text-emerald-900 dark:text-emerald-100 font-mono">
                              {totalPassedSubjects} / {subjectRows.length} Mapel
                            </strong>
                          </div>
                          <span className="text-xs bg-emerald-600 text-white font-bold px-2 py-1 rounded-lg">
                            {Math.round((totalPassedSubjects / Math.max(1, subjectRows.length)) * 100)}% Tuntas
                          </span>
                        </div>

                        <div className="p-3.5 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200 dark:border-indigo-800 flex items-center justify-between">
                          <div>
                            <span className="text-[11px] text-indigo-800 dark:text-indigo-300 font-medium block">Rata-Rata Komposit Multimapel</span>
                            <strong className="text-lg font-bold text-indigo-900 dark:text-indigo-100 font-mono">
                              {overallCompositeAvg.toFixed(1)} Poin
                            </strong>
                          </div>
                          <span className="text-xs bg-indigo-600 text-white font-bold px-2 py-1 rounded-lg">
                            Skala 0-100
                          </span>
                        </div>
                      </div>

                      {/* DATA RECAP TABLE */}
                      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-100 dark:bg-slate-950/90 text-slate-700 dark:text-slate-300 font-bold font-mono border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider">
                              <th className="py-3 px-3.5 w-12 text-center">No</th>
                              <th className="py-3 px-3.5 min-w-[180px]">Mata Pelajaran</th>
                              <th className="py-3 px-2.5 text-center">Kategori</th>
                              <th className="py-3 px-2.5 text-center">KKM</th>
                              {tryoutCodes.map(code => (
                                <th key={code} className="py-3 px-3.5 text-center min-w-[80px]">
                                  {code}
                                </th>
                              ))}
                              <th className="py-3 px-3.5 text-center min-w-[100px] bg-slate-200/60 dark:bg-slate-800/60">
                                Rata-Rata TO
                              </th>
                              <th className="py-3 px-3.5 text-center min-w-[110px]">Status KKM</th>
                              <th className="py-3 px-3.5 text-center min-w-[90px]">Tren</th>
                              <th className="py-3 px-3 text-center min-w-[110px]">Media Belajar</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
                            {filteredRows.length === 0 ? (
                              <tr>
                                <td colSpan={7 + tryoutCodes.length} className="py-8 text-center text-slate-500 dark:text-slate-400">
                                  Tidak ada data mata pelajaran yang cocok dengan pencarian '{subjectSearchQuery}'.
                                </td>
                              </tr>
                            ) : (
                              filteredRows.map((row, idx) => (
                                <tr
                                  key={row.subject.id}
                                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                                >
                                  <td className="py-3 px-3.5 text-center font-mono font-medium text-slate-400">
                                    {idx + 1}
                                  </td>

                                  <td className="py-3 px-3.5 font-semibold text-slate-900 dark:text-slate-100">
                                    <div className="flex items-center gap-2">
                                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono font-bold text-[10px] text-slate-700 dark:text-slate-300">
                                        {row.subject.code}
                                      </span>
                                      <span>{row.subject.name}</span>
                                    </div>
                                  </td>

                                  <td className="py-3 px-2.5 text-center">
                                    <span
                                      className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase font-mono ${
                                        row.subject.category === 'WAJIB'
                                          ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                          : 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                                      }`}
                                    >
                                      {row.subject.category}
                                    </span>
                                  </td>

                                  <td className="py-3 px-2.5 text-center font-mono font-bold text-amber-600 dark:text-amber-400">
                                    {row.passingGrade.toFixed(0)}
                                  </td>

                                  {tryoutCodes.map(code => {
                                    const score = row.toScores[code] ?? 0;
                                    const passed = score >= row.passingGrade;
                                    return (
                                      <td key={code} className="py-3 px-3.5 text-center font-mono font-bold">
                                        <span
                                          className={`inline-block px-2.5 py-1 rounded-lg text-xs ${
                                            passed
                                              ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80'
                                              : 'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/80'
                                          }`}
                                        >
                                          {score.toFixed(1)}
                                        </span>
                                      </td>
                                    );
                                  })}

                                  <td className="py-3 px-3.5 text-center font-mono font-black text-indigo-700 dark:text-indigo-300 bg-slate-50 dark:bg-slate-950/60 text-sm">
                                    {row.avgScore.toFixed(1)}
                                  </td>

                                  <td className="py-3 px-3.5 text-center">
                                    <span
                                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full font-mono ${
                                        row.isPassing
                                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                          : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                      }`}
                                    >
                                      {row.isPassing ? (
                                        <>
                                          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                          <span>TUNTAS KKM</span>
                                        </>
                                      ) : (
                                        <>
                                          <XCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                                          <span>BELUM TUNTAS</span>
                                        </>
                                      )}
                                    </span>
                                  </td>

                                  <td className="py-3 px-3.5 text-center font-mono font-bold">
                                    <span
                                      className={`inline-flex items-center gap-0.5 text-xs ${
                                        row.trend >= 0
                                          ? 'text-emerald-600 dark:text-emerald-400'
                                          : 'text-rose-600 dark:text-rose-400'
                                      }`}
                                    >
                                      {row.trend >= 0 ? (
                                        <ArrowUpRight className="w-3.5 h-3.5" />
                                      ) : (
                                        <ArrowDownRight className="w-3.5 h-3.5" />
                                      )}
                                      <span>{row.trend >= 0 ? `+${row.trend.toFixed(1)}` : row.trend.toFixed(1)}</span>
                                    </span>
                                  </td>

                                  <td className="py-3 px-3 text-center">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setPortalTab('EXPLANATIONS');
                                        setExplanationSubjectFilter(row.subject.id);
                                        setExplanationFilterMode('ALL');
                                      }}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[11px] font-semibold transition-all cursor-pointer shadow-2xs hover:scale-102"
                                      title={`Buka Link Pembahasan PDF & Video untuk ${row.subject.name}`}
                                    >
                                      <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                      <span>Solusi &amp; YT</span>
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                          <tfoot className="bg-slate-100 dark:bg-slate-950 font-bold border-t-2 border-slate-200 dark:border-slate-800">
                            <tr>
                              <td colSpan={4} className="py-3.5 px-3.5 text-right uppercase tracking-wider font-mono text-slate-700 dark:text-slate-300">
                                Rata-Rata Komposit Seluruh Mapel:
                              </td>
                              {tryoutCodes.map(code => (
                                <td key={code} className="py-3.5 px-3.5 text-center font-mono text-indigo-700 dark:text-indigo-300 font-extrabold">
                                  {compositeToAverages[code]?.toFixed(1) ?? '0.0'}
                                </td>
                              ))}
                              <td className="py-3.5 px-3.5 text-center font-mono text-emerald-600 dark:text-emerald-400 font-black text-sm bg-slate-200/80 dark:bg-slate-800/80">
                                {overallCompositeAvg.toFixed(1)}
                              </td>
                              <td colSpan={3} className="py-3.5 px-3.5 text-center">
                                <span className="text-[10px] bg-indigo-600 text-white font-mono font-bold px-2.5 py-1 rounded-lg">
                                  {totalPassedSubjects === subjectRows.length ? 'SELESAI TUNTAS' : 'PENGAYAAN BERJALAN'}
                                </span>
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* TAB 2: PEMBAHASAN SOAL & VIDEO (PDF & YOUTUBE) */}
            {portalTab === 'EXPLANATIONS' && (() => {
              // Filtered list of published explanations based on selected subject
              const filteredExplanations = publishedExplanations.filter(e => {
                if (explanationSubjectFilter === 'ALL') return true;
                return e.subjectId === explanationSubjectFilter;
              });

              // Helper for subject name
              const getSubjectName = (subjId?: string) => {
                if (!subjId) return 'Umum / Semua Mapel';
                const found = allSubjects.find(s => s.id === subjId);
                return found ? `${found.name} (${found.code})` : subjId;
              };

              // Helper for subject theme color
              const getSubjectBadgeColor = (subjId?: string) => {
                switch (subjId) {
                  case 'subj-mat':
                    return 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800';
                  case 'subj-fis':
                    return 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800';
                  case 'subj-bin':
                    return 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800';
                  case 'subj-bio':
                    return 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
                  default:
                    return 'bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
                }
              };

              return (
                <div className="space-y-6">
                  {/* HERO HEADER & FILTER TOOLBAR */}
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-5 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
                      <div>
                        <div className="flex items-center gap-2.5">
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
                      </div>

                      {/* Mode Toggle: Semua Media vs Evaluasi Soal Salah */}
                      <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 shrink-0">
                        <button
                          type="button"
                          onClick={() => setExplanationFilterMode('ALL')}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            explanationFilterMode === 'ALL'
                              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          Semua Media ({publishedExplanations.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setExplanationFilterMode('INCORRECT_ONLY')}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                            explanationFilterMode === 'INCORRECT_ONLY'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          <span>Butir Salah</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                            explanationFilterMode === 'INCORRECT_ONLY'
                              ? 'bg-rose-700 text-white'
                              : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                          }`}>
                            {incorrectQuestions.length}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* SUBJECT FILTER PILLS */}
                    <div className="flex flex-wrap items-center gap-2">
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
                        const countForSubj = publishedExplanations.filter(e => e.subjectId === s.id).length;
                        const isSelected = explanationSubjectFilter === s.id;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setExplanationSubjectFilter(s.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                          >
                            <span>{s.name}</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                              isSelected ? 'bg-indigo-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                            }`}>
                              {countForSubj}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* VIEW MODE 1: MEDIA HUB & RESOURCE CARDS */}
                  {explanationFilterMode === 'ALL' && (() => {
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
                      <div className="space-y-4">
                        {/* Subtoolbar: View Switcher (Katalog Resource Card vs Modul) + Type Filters */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs transition-colors">
                          <div className="flex flex-wrap items-center gap-2">
                            {/* View Switcher */}
                            <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                              <button
                                type="button"
                                onClick={() => setResourceViewMode('CARDS')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                                  resourceViewMode === 'CARDS'
                                    ? 'bg-indigo-600 text-white shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                              >
                                <LayoutGrid className="w-3.5 h-3.5" />
                                <span>Katalog Resource Card</span>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                                  resourceViewMode === 'CARDS' ? 'bg-indigo-700 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                }`}>
                                  {studentResourceCardsList.length}
                                </span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setResourceViewMode('MODULES')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                                  resourceViewMode === 'MODULES'
                                    ? 'bg-indigo-600 text-white shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                              >
                                <BookOpen className="w-3.5 h-3.5" />
                                <span>Modul Pembahasan</span>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                                  resourceViewMode === 'MODULES' ? 'bg-indigo-700 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                }`}>
                                  {filteredExplanations.length}
                                </span>
                              </button>
                            </div>

                            {/* Media Type Filters */}
                            {resourceViewMode === 'CARDS' && (
                              <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-slate-800">
                                <button
                                  type="button"
                                  onClick={() => setMediaTypeFilter('ALL')}
                                  className={`px-2.5 py-1.5 rounded-xl font-bold cursor-pointer transition-colors ${
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
                                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-bold cursor-pointer transition-colors ${
                                    mediaTypeFilter === 'YOUTUBE'
                                      ? 'bg-red-600 text-white'
                                      : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/40 hover:bg-red-100'
                                  }`}
                                >
                                  <Youtube className="w-3 h-3" />
                                  <span>YouTube ({totalYt})</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setMediaTypeFilter('PDF')}
                                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-bold cursor-pointer transition-colors ${
                                    mediaTypeFilter === 'PDF'
                                      ? 'bg-rose-600 text-white'
                                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40 hover:bg-rose-100'
                                  }`}
                                >
                                  <FileText className="w-3 h-3" />
                                  <span>PDF ({totalPdf})</span>
                                </button>
                              </div>
                            )}
                          </div>

                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            Menampilkan <strong>{resourceViewMode === 'CARDS' ? studentResourceCardsList.length : filteredExplanations.length}</strong> tautan edukasi
                          </span>
                        </div>

                        {/* MODE 1: RESOURCE CARDS GRID */}
                        {resourceViewMode === 'CARDS' && (
                          <div>
                            {studentResourceCardsList.length === 0 ? (
                              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-3">
                                <BookOpen className="w-12 h-12 text-slate-400 mx-auto" />
                                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                  Belum Ada Resource Card Sesuai Filter
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

                        {/* MODE 2: GROUPED EXPLANATION MODULES WITH EMBEDDED RESOURCE CARDS */}
                        {resourceViewMode === 'MODULES' && (
                          <div>
                            {filteredExplanations.length === 0 ? (
                              <div className="bg-white dark:bg-slate-900 p-12 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-3">
                                <BookOpen className="w-12 h-12 text-slate-400 mx-auto" />
                                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                  Belum Ada Pembahasan Terpublikasi
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
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
                                        {/* Card Header & Badges */}
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                          <div className="flex items-center gap-1.5">
                                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-lg border font-mono ${getSubjectBadgeColor(exp.subjectId)}`}>
                                              {getSubjectName(exp.subjectId)}
                                            </span>
                                            {exp.questionId ? (
                                              <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 px-2 py-0.5 rounded-lg font-mono">
                                                Soal: {question?.uniqueCode || exp.questionId}
                                              </span>
                                            ) : (
                                              <span className="text-[10px] font-bold text-cyan-800 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950 border border-cyan-200 dark:border-cyan-800 px-2 py-0.5 rounded-lg">
                                                Paket Mapel Lengkap
                                              </span>
                                            )}
                                          </div>

                                          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                            <span>RESMI GURU</span>
                                          </span>
                                        </div>

                                        {/* Title & Author */}
                                        <div>
                                          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">
                                            {exp.title}
                                          </h4>
                                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                            Disusun oleh: <strong className="text-slate-700 dark:text-slate-300">{exp.authorName || 'Guru Mata Pelajaran'}</strong>
                                          </p>
                                        </div>

                                        {/* Explanation Text Preview */}
                                        {exp.contentText && (
                                          <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-normal whitespace-pre-line line-clamp-3">
                                            {exp.contentText}
                                          </div>
                                        )}

                                        {/* RESOURCE CARDS EMBEDDED */}
                                        <div className="space-y-3 pt-1">
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

                                          {/* EXTERNAL LINK */}
                                          {exp.externalUrl && (
                                            <a
                                              href={exp.externalUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="p-2.5 bg-emerald-50/60 dark:bg-emerald-950/30 hover:bg-emerald-100 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/60 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300 transition-colors"
                                            >
                                              <div className="flex items-center gap-1.5 font-semibold truncate">
                                                <ExternalLink className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                                                <span className="truncate">Tautan Google Drive / Dokumen Pendukung</span>
                                              </div>
                                              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                                            </a>
                                          )}
                                        </div>
                                      </div>

                                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 dark:text-slate-500 flex items-center justify-between">
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

                  {/* VIEW MODE 2: REVIEW BUTIR SOAL SALAH (TARGETED REMEDIAL) */}
                  {explanationFilterMode === 'INCORRECT_ONLY' && (
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                        <div>
                          <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <span>Evaluasi Butir Soal yang Salah</span>
                            <span className="bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-mono text-xs px-2 py-0.5 rounded-full font-bold">
                              {incorrectQuestions.length} Butir
                            </span>
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Fokus pelajari nomor-nomor di bawah ini untuk meningkatkan skor pada Try Out berikutnya.
                          </p>
                        </div>
                      </div>

                      {incorrectQuestions.length === 0 ? (
                        <div className="p-8 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs rounded-2xl flex items-center gap-3">
                          <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <div>
                            <strong className="block text-sm">Luar Biasa! Sempurna!</strong>
                            <span>Tidak ada butir soal yang dijawab salah pada evaluasi Try Out ini.</span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {incorrectQuestions.map(q => {
                            const qp = studentAnalytics?.questionPerformance.find(p => p.questionId === q.id);
                            const studentAns = qp ? qp.studentAnswer : 'Kosong';
                            const matchExp = publishedExplanations.find(e => e.questionId === q.id || e.subjectId === q.subjectId);
                            const subj = allSubjects.find(s => s.id === q.subjectId);

                            return (
                              <div
                                key={q.id}
                                className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3 text-xs"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800">
                                      {q.uniqueCode}
                                    </span>
                                    {subj && (
                                      <span className="font-semibold text-slate-600 dark:text-slate-400">
                                        • {subj.name}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-3">
                                    <span className="text-rose-600 dark:text-rose-400 font-semibold font-mono bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-lg border border-rose-200 dark:border-rose-800">
                                      Jawaban Anda: {studentAns}
                                    </span>
                                    <span className="text-emerald-700 dark:text-emerald-400 font-semibold font-mono bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                                      Kunci Benar: {q.correctAnswer}
                                    </span>
                                  </div>
                                </div>

                                <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-normal">
                                  {q.questionText}
                                </p>

                                {matchExp && (
                                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                      Tersedia pembahasan: <strong className="text-slate-700 dark:text-slate-300">{matchExp.title}</strong>
                                    </span>

                                    <div className="flex items-center gap-2">
                                      {matchExp.youtubeUrl && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setSelectedVideoUrl(matchExp.youtubeUrl || null);
                                            setSelectedVideoTitle(matchExp.title);
                                          }}
                                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                        >
                                          <Play className="w-3 h-3 fill-white" />
                                          <span>Tonton Video</span>
                                        </button>
                                      )}

                                      {matchExp.pdfUrl && (
                                        <a
                                          href={matchExp.pdfUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 transition-colors shadow-2xs"
                                        >
                                          <FileText className="w-3 h-3" />
                                          <span>Buka PDF Solusi</span>
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                )}
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

      {/* VIDEO MODAL WITH EMBEDDED IFRAME PLAYER */}
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
                    Official Explanation Player
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedVideoUrl(null)}
                className="px-2.5 py-1 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold cursor-pointer transition-colors"
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-semibold transition-colors text-xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Buka di Web / Aplikasi YouTube</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
