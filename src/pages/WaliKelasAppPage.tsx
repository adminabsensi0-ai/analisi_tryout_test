import React, { useState, useEffect, useMemo } from 'react';
import {
  School, Users, TrendingUp, Download, CheckCircle2, AlertTriangle,
  BookOpen, Search, ArrowRight, Award, FileSpreadsheet, Key, ChevronRight,
  ShieldCheck, RefreshCw, Phone, Mail, UserCheck, Calendar, Filter, HelpCircle,
  ArrowUp, ArrowDown, Activity, Save, BarChart3, Info, GraduationCap, SlidersHorizontal, Eye, X
} from 'lucide-react';
import { dbService } from '../services/database';
import { User, Student, ClassRoom, Subject, Score } from '../types/database';

interface WaliKelasAppPageProps {
  currentUser: User;
  onNavigate: (path: string) => void;
}

type WaliKelasTab =
  | 'OVERVIEW'
  | 'TRYOUT_PROGRESS'
  | 'GRADEBOOK'
  | 'LEGER_RAPOR'
  | 'STUDENT_DIRECTORY'
  | 'SUBJECT_ANALYTICS';

export const WaliKelasAppPage: React.FC<WaliKelasAppPageProps> = ({
  currentUser: initialUser,
  onNavigate,
}) => {
  const [currentUser, setCurrentUser] = useState<User>(initialUser);
  const [activeTab, setActiveTab] = useState<WaliKelasTab>('OVERVIEW');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('s-1');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('ALL');
  const [selectedPassFailTO, setSelectedPassFailTO] = useState<string>('TO 4');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Filter States for Buku Nilai Siswa (GRADEBOOK)
  const [gradebookTO, setGradebookTO] = useState<string>('ALL');
  const [gradebookSubject, setGradebookSubject] = useState<string>('ALL');
  const [gradebookStatusFilter, setGradebookStatusFilter] = useState<'ALL' | 'PASS' | 'REMEDIAL'>('ALL');
  const [gradebookSortBy, setGradebookSortBy] = useState<'NAME' | 'SCORE_DESC' | 'SCORE_ASC'>('NAME');
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<Student | null>(null);

  // Wali Kelas Notes State per student ID
  const [waliNotes, setWaliNotes] = useState<Record<string, string>>({});

  const teacherObj = dbService.getTeacherByUserId(currentUser);
  const allStudents = dbService.getStudents();
  // Get current assigned homeroom class or fallback to XII IPA 1
  const assignedClassId = teacherObj?.homeRoomClassId || 'c-xii-ipa1';
  const assignedClass: ClassRoom = dbService.getClasses().find(c => c.id === assignedClassId) || {
    id: 'c-xii-ipa1',
    name: 'XII IPA 1',
    gradeLevel: 'XII',
    academicYearId: 'ay-2025-1',
    homeRoomTeacherId: teacherObj?.id || 't-2',
  };

  // Scoped Tryouts: Hanya menampilkan tryouts yang menargetkan kelas binaan wali kelas
  const allTryouts = useMemo(() => {
    const rawTryouts = dbService.getTryouts();
    return rawTryouts.filter(t => {
      if (t.packageId) {
        const pkg = dbService.getExamPackageById(t.packageId);
        if (pkg) {
          if (pkg.targetClassIds && pkg.targetClassIds.length > 0) {
            return pkg.targetClassIds.includes(assignedClassId);
          }
          if (pkg.targetGrades && pkg.targetGrades.length > 0) {
            return pkg.targetGrades.includes(assignedClass.gradeLevel);
          }
          return false;
        }
      }
      if (t.targetClassIds && t.targetClassIds.length > 0) {
        return t.targetClassIds.includes(assignedClassId);
      }
      return true;
    });
  }, [assignedClassId, assignedClass.gradeLevel]);

  const allSubjects = dbService.getSubjects();
  const allScores = dbService.getScores();

  // Filter students in homeroom class
  const classStudents = allStudents.filter(s => s.classId === assignedClassId || s.classId === 'c-xii-ipa1');
  const activeStudentList = classStudents.length > 0 ? classStudents : allStudents.slice(0, 8);

  const filteredStudents = activeStudentList.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.nisn.includes(searchQuery)
  );

  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };


  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-5 right-5 z-50 bg-emerald-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-emerald-700 flex items-center gap-2 text-xs font-semibold animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Wali Kelas Main Container */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 flex-grow">
        
        {/* Top Header Lockup & Switcher Bar */}
        <header className="bg-gradient-to-r from-emerald-900 via-slate-900 to-teal-950 text-white p-6 rounded-3xl shadow-xl border border-emerald-800/80 relative overflow-hidden space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider font-mono">
                <School className="w-4 h-4 text-emerald-400" />
                <span>Dashboard</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white mt-1 tracking-tight">
                Monitoring Nilai &amp; Performa Kelas {assignedClass.name}
              </h1>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed mt-1">
                Wali Kelas: <strong>{currentUser.name}</strong> · Total <strong>{activeStudentList.length} Siswa</strong> · KKM Rombel: <strong>75.0 Poin</strong>
              </p>
            </div>

            {/* Quick Action */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {/* CSV Export Leger */}
              <button
                type="button"
                onClick={() => {
                  const csvData = "NISN,Nama Siswa,Matematika,Fisika,Bahasa Indonesia,Bahasa Inggris,Rata-Rata,Status Rapor,Catatan Wali Kelas\n" +
                    activeStudentList.map(s => `${s.nisn},"${s.name}",85,80,88,82,83.75,Tuntas,"${waliNotes[s.id] || 'Siswa menunjukkan peningkatan baik.'}"`).join("\n");
                  const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `Leger_Nilai_WaliKelas_${assignedClass.id}.csv`;
                  a.click();
                  triggerToast(`Leger Nilai Multimapel ${assignedClass.name} berhasil diunduh.`);
                }}
                className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold text-xs rounded-xl border border-emerald-500/40 shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Ekspor Leger Nilai</span>
              </button>
            </div>
          </div>
        </header>

        {/* Tab Navigation Menu */}
        <div className="bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1">
            <button
              onClick={() => setActiveTab('OVERVIEW')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'OVERVIEW'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <School className="w-4 h-4" />
              <span>Ringkasan Rombel</span>
            </button>

            <button
              onClick={() => setActiveTab('TRYOUT_PROGRESS')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'TRYOUT_PROGRESS'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Grafik Perkembangan TryOut</span>
            </button>

            <button
              onClick={() => setActiveTab('GRADEBOOK')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'GRADEBOOK'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Buku Nilai Siswa</span>
            </button>

            <button
              onClick={() => setActiveTab('LEGER_RAPOR')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'LEGER_RAPOR'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Leger &amp; Catatan Rapor</span>
            </button>

            <button
              onClick={() => setActiveTab('STUDENT_DIRECTORY')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'STUDENT_DIRECTORY'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Direktori Siswa ({activeStudentList.length})</span>
            </button>
          </div>

          <div className="relative shrink-0 w-full sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari siswa / NISN..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
        </div>

        {/* TAB 1: OVERVIEW RINGKASAN ROMBEL */}
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-6">
            {/* Metric Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Siswa</span>
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-slate-900 dark:text-white font-mono">
                  {activeStudentList.length} <span className="text-xs font-normal text-slate-500">Siswa</span>
                </div>
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Aktif di Rombel {assignedClass.name}</span>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Rata-Rata Rombel (TO-3)</span>
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                  83.8 <span className="text-xs font-normal text-slate-500">Poin</span>
                </div>
                <div className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                  <ArrowUp className="w-3.5 h-3.5" />
                  <span>+6.5 poin dari TO-2</span>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tuntas KKM (&ge; 75.0)</span>
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                    <Award className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-slate-900 dark:text-white font-mono">
                  88% <span className="text-xs font-normal text-slate-500">Persentase</span>
                </div>
                <div className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>27 dari 31 siswa tuntas</span>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-rose-200 dark:border-rose-900/60 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">Perlu Pendampingan</span>
                  <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-rose-600 dark:text-rose-400 font-mono">
                  4 <span className="text-xs font-normal text-slate-500">Siswa</span>
                </div>
                <div className="text-[11px] text-rose-600 font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Prioritas bimbingan konseling</span>
                </div>
              </div>
            </div>

            {/* Quick Overview Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column: Trajectory Chart Preview */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                      <span>Grafik Perkembangan Nilai Rombel {assignedClass.name}</span>
                    </h3>
                    <p className="text-xs text-slate-500">Perkembangan rata-rata kelas di setiap tahapan TryOut</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('TRYOUT_PROGRESS')}
                    className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1"
                  >
                    <span>Detail Grafik</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="p-5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
                    <span className="text-amber-600 dark:text-amber-400 font-bold">Garis KKM: 75.0 Poin</span>
                    <span className="text-emerald-600 font-bold">Laju Pertumbuhan: +12.5 Poin</span>
                  </div>

                  {/* Expanded Proportional Preview Chart (Identical Layout to Main Chart) */}
                  <div className="relative w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs">
                    <svg className="w-full h-52 overflow-visible z-10 relative" viewBox="0 0 500 160" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="prevGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                          <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Grid Lines & Y Axis */}
                      <line x1="40" y1="20" x2="490" y2="20" stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth="1" />
                      <text x="32" y="23" textAnchor="end" className="text-[9px] fill-slate-400 font-mono">100</text>

                      {/* KKM Line 75 (Amber Gold) */}
                      <line x1="40" y1="52.5" x2="490" y2="52.5" stroke="#f59e0b" strokeWidth="2" strokeDasharray="5 4" />
                      <text x="32" y="55.5" textAnchor="end" className="text-[9px] fill-amber-500 font-mono font-bold">75</text>
                      <rect x="410" y="40" width="75" height="16" rx="4" fill="#f59e0b" />
                      <text x="447" y="51" textAnchor="middle" className="text-[8px] font-mono font-bold fill-slate-950">Garis KKM</text>

                      <line x1="40" y1="120" x2="490" y2="120" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeWidth="1" />
                      <text x="32" y="123" textAnchor="end" className="text-[9px] fill-slate-400 font-mono">0</text>

                      {/* Area Fill */}
                      <polygon points="60,120 60,56 190,46 320,34 450,26 450,120" fill="url(#prevGradient)" />

                      {/* Line connecting points */}
                      <polyline
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points="60,56 190,46 320,34 450,26"
                      />

                      {/* Coordinate Nodes, Badges & X-Axis Labels */}
                      {[
                        { x: 60, y: 56, score: "72.0", label: "TO 1" },
                        { x: 190, y: 46, score: "78.0", label: "TO 2" },
                        { x: 320, y: 34, score: "84.5", label: "TO 3" },
                        { x: 450, y: 26, score: "88.0", label: "TO 4" },
                      ].map((node, i) => (
                        <g key={i}>
                          <rect x={node.x - 20} y={node.y - 22} width="40" height="17" rx="6" className="fill-slate-900 dark:fill-slate-100" />
                          <text x={node.x} y={node.y - 10} textAnchor="middle" className="text-[10px] font-mono font-bold fill-emerald-400 dark:fill-emerald-700">{node.score}</text>
                          <circle cx={node.x} cy={node.y} r="5" fill="#10b981" stroke="#ffffff" strokeWidth="2.5" />
                          <text x={node.x} y="142" textAnchor="middle" className="text-[10px] font-mono font-bold fill-slate-500">{node.label}</text>
                        </g>
                      ))}
                    </svg>
                  </div>
                </div>
              </div>

              {/* Right Column: Early Warning System */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Perhatian Wali Kelas</span>
                  </h3>
                  <p className="text-xs text-slate-500">Siswa memerlukan bimbingan khusus</p>
                </div>

                <div className="space-y-2.5">
                  {activeStudentList.slice(0, 4).map((s, idx) => (
                    <div key={s.id} className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-slate-100">{s.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">NISN: {s.nisn}</div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        idx === 0 ? 'bg-emerald-100 text-emerald-800' : idx === 1 ? 'bg-indigo-100 text-indigo-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {idx === 0 ? 'Riser +12.5' : idx === 1 ? 'Stabil 82.0' : 'Perlu Konseling'}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setActiveTab('LEGER_RAPOR')}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer text-center"
                >
                  Buka Leger Multimapel Lengkap &rarr;
                </button>
              </div>

            </div>
          </div>
        )}

        {/* TAB 2: TRYOUT PROGRESS CHART (TO 1 -> TO 4) */}
        {activeTab === 'TRYOUT_PROGRESS' && (() => {
          // Subject specific scores mapping
          const subjectDataMap: Record<string, { label: string; points: number[]; kkm: number; trend: string }> = {
            'ALL': { label: 'Rata-Rata Multimapel Rombel', points: [72.0, 78.0, 84.5, 88.0], kkm: 75.0, trend: '+12.5 Poin' },
            'subj-mat': { label: 'Matematika Wajib', points: [68.5, 74.0, 82.0, 86.5], kkm: 75.0, trend: '+13.5 Poin' },
            'subj-fis': { label: 'Fisika Peminatan', points: [65.0, 72.5, 80.0, 85.0], kkm: 75.0, trend: '+15.0 Poin' },
            'subj-bin': { label: 'Bahasa Indonesia', points: [78.0, 82.0, 88.0, 90.0], kkm: 75.0, trend: '+10.0 Poin' },
            'subj-bing': { label: 'Bahasa Inggris', points: [75.0, 80.0, 85.0, 89.0], kkm: 75.0, trend: '+10.0 Poin' },
          };

          const activeData = subjectDataMap[selectedSubjectFilter] || subjectDataMap['ALL'];
          
          // Spatial Math for 1000x300 ViewBox SVG Line Chart
          // Usable Width: X = 70px to 930px (spacing 286.6px)
          // Usable Height: Y = 40px (score 100) to 260px (score 0)
          const getCoordinates = (pts: number[]) => {
            const xPositions = [80, 350, 620, 890];
            return pts.map((val, idx) => {
              const x = xPositions[idx];
              const y = 260 - ((val / 100) * 220);
              return { x, y, score: val };
            });
          };

          const coords = getCoordinates(activeData.points);
          const polylinePoints = coords.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
          const polygonPoints = `80,260 ${polylinePoints} 890,260`;

          return (
            <div className="space-y-6">
              {/* Main Container */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
                
                {/* Header & Subject Filter Bar */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
                  <div>
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider font-mono">
                      <TrendingUp className="w-4 h-4" />
                      <span>Grafik Perkembangan TryOut</span>
                    </div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">
                      Progres Nilai TryOut
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Evaluasi perkembangan rata-rata nilai siswa Rombel {assignedClass.name}
                    </p>
                  </div>

                  {/* Filter Mapel Selector */}
                  <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setSelectedSubjectFilter('ALL')}
                      className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                        selectedSubjectFilter === 'ALL'
                          ? 'bg-emerald-600 text-white shadow-xs font-bold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Rata-Rata Rombel
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedSubjectFilter('subj-mat')}
                      className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                        selectedSubjectFilter === 'subj-mat'
                          ? 'bg-emerald-600 text-white shadow-xs font-bold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Matematika
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedSubjectFilter('subj-fis')}
                      className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                        selectedSubjectFilter === 'subj-fis'
                          ? 'bg-emerald-600 text-white shadow-xs font-bold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Fisika
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedSubjectFilter('subj-bin')}
                      className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                        selectedSubjectFilter === 'subj-bin'
                          ? 'bg-emerald-600 text-white shadow-xs font-bold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      B. Indonesia
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedSubjectFilter('subj-bing')}
                      className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                        selectedSubjectFilter === 'subj-bing'
                          ? 'bg-emerald-600 text-white shadow-xs font-bold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      B. Inggris
                    </button>
                  </div>
                </div>

                {/* Proportional High-Fidelity Chart Viewport */}
                <div className="p-6 bg-slate-50/70 dark:bg-slate-950/80 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-slate-100">{activeData.label}</span>
                      <span className="text-[11px] text-slate-400">· KKM Minimal 75.0 Poin</span>
                    </div>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>Total Kenaikan: {activeData.trend}</span>
                    </span>
                  </div>

                  {/* SVG Canvas Area with 1000x300 Proportional ViewBox */}
                  <div className="relative w-full overflow-hidden bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs">
                    <svg
                      className="w-full h-auto text-emerald-500 overflow-visible"
                      viewBox="0 0 1000 300"
                      preserveAspectRatio="xMidYMid meet"
                    >
                      <defs>
                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Horizontal Grid Lines */}
                      {/* Score 100 (Y=40) */}
                      <line x1="50" y1="40" x2="950" y2="40" stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth="1" />
                      <text x="35" y="44" textAnchor="end" className="text-[11px] fill-slate-400 font-mono">100</text>

                      {/* Score 75 KKM Line (Y=95) - Distinct Amber Gold Line */}
                      <line x1="50" y1="95" x2="950" y2="95" stroke="#f59e0b" strokeWidth="2" strokeDasharray="6 4" />
                      <text x="35" y="99" textAnchor="end" className="text-[11px] fill-amber-500 font-mono font-bold">75</text>
                      
                      {/* KKM Badge Tag inside Chart */}
                      <rect x="810" y="78" width="130" height="22" rx="6" fill="#f59e0b" />
                      <text x="875" y="93" textAnchor="middle" className="text-[10px] font-mono font-bold fill-slate-950">Garis KKM (75.0 Poin)</text>

                      {/* Score 50 (Y=150) */}
                      <line x1="50" y1="150" x2="950" y2="150" stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth="1" />
                      <text x="35" y="154" textAnchor="end" className="text-[11px] fill-slate-400 font-mono">50</text>

                      {/* Score 25 (Y=205) */}
                      <line x1="50" y1="205" x2="950" y2="205" stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth="1" />
                      <text x="35" y="209" textAnchor="end" className="text-[11px] fill-slate-400 font-mono">25</text>

                      {/* Score 0 (Y=260) */}
                      <line x1="50" y1="260" x2="950" y2="260" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeWidth="1.5" />
                      <text x="35" y="264" textAnchor="end" className="text-[11px] fill-slate-400 font-mono">0</text>

                      {/* Gradient Fill under Polyline */}
                      <polygon points={polygonPoints} fill="url(#chartGradient)" />

                      {/* Connecting Line */}
                      <polyline
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={polylinePoints}
                      />

                      {/* Coordinate Nodes & Floating Score Badges */}
                      {coords.map((pt, i) => (
                        <g key={i}>
                          {/* Floating Score Badge above node */}
                          <rect
                            x={pt.x - 30}
                            y={pt.y - 34}
                            width="60"
                            height="22"
                            rx="8"
                            className="fill-slate-900 dark:fill-slate-100 shadow-md"
                          />
                          <text
                            x={pt.x}
                            y={pt.y - 19}
                            textAnchor="middle"
                            className="text-[11px] font-mono font-bold fill-emerald-400 dark:fill-emerald-700"
                          >
                            {pt.score.toFixed(1)}
                          </text>

                          {/* Outer Aura Glow */}
                          <circle cx={pt.x} cy={pt.y} r="10" fill="#10b981" opacity="0.25" />
                          {/* Solid Coordinate Node */}
                          <circle cx={pt.x} cy={pt.y} r="5.5" fill="#10b981" stroke="#ffffff" strokeWidth="2.5" />
                        </g>
                      ))}

                      {/* X-Axis Labels */}
                      <text x="80" y="295" textAnchor="middle" className="text-[12px] font-mono font-bold fill-slate-500">TO 1 (Awal)</text>
                      <text x="350" y="295" textAnchor="middle" className="text-[12px] font-mono font-bold fill-slate-500">TO 2 (Tahap 1)</text>
                      <text x="620" y="295" textAnchor="middle" className="text-[12px] font-mono font-bold fill-slate-500">TO 3 (Tahap 2)</text>
                      <text x="890" y="295" textAnchor="middle" className="text-[12px] font-mono font-bold fill-emerald-600 dark:fill-emerald-400">TO 4</text>
                    </svg>
                  </div>
                </div>

                {/* Rekapitulasi Delta Kenaikan Nilai & Perbandingan Mapel */}
                <div className="p-6 bg-slate-50/50 dark:bg-slate-950/50 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-emerald-600" />
                        <span>Rekapitulasi Perkembangan Nilai Antar TryOut</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Rincian perubahan nilai rata-rata rombel di setiap mata pelajaran pada seluruh tahapan TryOut.
                      </p>
                    </div>
                  </div>

                  {/* Summary Delta Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs space-y-1 shadow-2xs">
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider font-mono">Peningkatan TO 1 &rarr; TO 2</span>
                      <div className="text-xl font-black text-slate-900 dark:text-white font-mono">+6.0 Poin</div>
                      <p className="text-[11px] text-slate-500">Meningkat signifikan setelah pengayaan awal.</p>
                    </div>

                    <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs space-y-1 shadow-2xs">
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider font-mono">Peningkatan TO 2 &rarr; TO 3</span>
                      <div className="text-xl font-black text-slate-900 dark:text-white font-mono">+6.5 Poin</div>
                      <p className="text-[11px] text-slate-500">Tren positif berlanjut secara konsisten.</p>
                    </div>

                    <div className="p-4 bg-emerald-50/80 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs space-y-1 shadow-2xs">
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold uppercase tracking-wider font-mono">Peningkatan TO 3 &rarr; TO 4</span>
                      <div className="text-xl font-black text-emerald-700 dark:text-emerald-300 font-mono">+3.5 Poin</div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">Pencapaian pertumbuhan rata-rata rombel.</p>
                    </div>
                  </div>

                  {/* Explanation Badge for Average Score clarification */}
                  <div className="p-3 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                    <Info className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span><strong>Keterangan Nilai:</strong> Seluruh angka yang tertera pada kolom TryOut di bawah ini merupakan <strong>Rata-Rata Nilai Rombel</strong> (Mean score seluruh siswa di kelas {assignedClass.name}).</span>
                  </div>

                  {/* Clean High-Density Table Breakdown per Subject with Sticky Header & First Column */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
                    <div className="overflow-auto max-h-[420px] scrollbar-thin">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead className="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-mono border-b border-slate-200 dark:border-slate-800">
                          <tr>
                            <th className="py-3.5 px-4 font-bold sticky top-0 left-0 z-30 bg-slate-100 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 shadow-2xs min-w-[180px]">
                              Mata Pelajaran
                            </th>
                            <th className="py-3.5 px-4 text-center font-bold sticky top-0 z-20 bg-slate-100 dark:bg-slate-950 whitespace-nowrap">Rata-Rata TO 1</th>
                            <th className="py-3.5 px-4 text-center font-bold sticky top-0 z-20 bg-slate-100 dark:bg-slate-950 whitespace-nowrap">Rata-Rata TO 2</th>
                            <th className="py-3.5 px-4 text-center font-bold sticky top-0 z-20 bg-slate-100 dark:bg-slate-950 whitespace-nowrap">Rata-Rata TO 3</th>
                            <th className="py-3.5 px-4 text-center font-bold sticky top-0 z-20 bg-slate-100 dark:bg-slate-950 whitespace-nowrap">Rata-Rata TO 4</th>
                            <th className="py-3.5 px-4 text-center font-bold sticky top-0 z-20 bg-slate-100 dark:bg-slate-950 whitespace-nowrap">Total Kenaikan</th>
                            <th className="py-3.5 px-4 text-right font-bold sticky top-0 z-20 bg-slate-100 dark:bg-slate-950 whitespace-nowrap">Status KKM</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-mono tabular-nums">
                          {[
                            { name: 'Matematika Wajib', to1: 68.5, to2: 74.0, to3: 82.0, to4: 86.5 },
                            { name: 'Fisika Peminatan', to1: 65.0, to2: 72.5, to3: 80.0, to4: 85.0 },
                            { name: 'Bahasa Indonesia', to1: 78.0, to2: 82.0, to3: 88.0, to4: 90.0 },
                            { name: 'Bahasa Inggris', to1: 75.0, to2: 80.0, to3: 85.0, to4: 89.0 },
                          ].map((s, idx) => {
                            const delta = (s.to4 - s.to1).toFixed(1);
                            return (
                              <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                                <td className="py-3 px-4 font-sans font-bold text-slate-900 dark:text-slate-100 sticky left-0 z-10 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-2xs whitespace-nowrap">
                                  {s.name}
                                </td>
                                <td className="py-3 px-4 text-center text-slate-600 dark:text-slate-400">{s.to1.toFixed(1)}</td>
                                <td className="py-3 px-4 text-center text-slate-600 dark:text-slate-400">{s.to2.toFixed(1)}</td>
                                <td className="py-3 px-4 text-center font-bold text-emerald-600">{s.to3.toFixed(1)}</td>
                                <td className="py-3 px-4 text-center font-bold text-emerald-700 dark:text-emerald-300">{s.to4.toFixed(1)}</td>
                                <td className="py-3 px-4 text-center font-bold text-emerald-600">+{delta}</td>
                                <td className="py-3 px-4 text-right font-sans whitespace-nowrap">
                                  <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-bold">
                                    ✓ Tuntas KKM
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* DIAGRAM PERBANDINGAN KETUNTASAN SISWA (ATAS KKM vs BAWAH KKM PER MAPEL & PER TRYOUT) */}
                  <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-5 shadow-2xs">
                    
                    {/* Header & Filter Selector for TryOut Stage */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span>Diagram Ketuntasan Siswa (Atas KKM vs Di Bawah KKM)</span>
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Perbandingan jumlah & persentase siswa tuntas (≥ KKM 75) vs belum tuntas (&lt; KKM 75) per mata pelajaran.
                        </p>
                      </div>

                      {/* TryOut Selector Filter Buttons */}
                      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shrink-0">
                        {['ALL', 'TO 1', 'TO 2', 'TO 3', 'TO 4'].map((stage) => (
                          <button
                            key={stage}
                            onClick={() => setSelectedPassFailTO(stage)}
                            className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg transition-all ${
                              selectedPassFailTO === stage
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            {stage === 'ALL' ? 'Rata-Rata TO' : stage}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Overall Class Pass Rate Summary KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                      <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1 shadow-2xs">
                        <span className="text-[10px] text-slate-500 font-mono uppercase">Total Siswa Rombel</span>
                        <div className="text-lg font-black text-slate-900 dark:text-white font-mono">30 Siswa</div>
                        <p className="text-[11px] text-slate-500">Kelas {assignedClass.name}</p>
                      </div>

                      <div className="p-3.5 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl space-y-1 shadow-2xs">
                        <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-mono font-bold uppercase">Rata-Rata Siswa Tuntas</span>
                        <div className="text-lg font-black text-emerald-700 dark:text-emerald-300 font-mono">
                          {selectedPassFailTO === 'TO 1' ? '21 Siswa (70.0%)' :
                           selectedPassFailTO === 'TO 2' ? '24 Siswa (80.0%)' :
                           selectedPassFailTO === 'TO 3' ? '27 Siswa (90.0%)' :
                           selectedPassFailTO === 'TO 4' ? '29 Siswa (96.7%)' :
                           '25 Siswa (84.2%)'}
                        </div>
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400">Memenuhi / Melampaui KKM 75.0</p>
                      </div>

                      <div className="p-3.5 bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 rounded-xl space-y-1 shadow-2xs">
                        <span className="text-[10px] text-rose-700 dark:text-rose-300 font-mono font-bold uppercase">Siswa Belum Tuntas</span>
                        <div className="text-lg font-black text-rose-700 dark:text-rose-300 font-mono">
                          {selectedPassFailTO === 'TO 1' ? '9 Siswa (30.0%)' :
                           selectedPassFailTO === 'TO 2' ? '6 Siswa (20.0%)' :
                           selectedPassFailTO === 'TO 3' ? '3 Siswa (10.0%)' :
                           selectedPassFailTO === 'TO 4' ? '1 Siswa (3.3%)' :
                           '5 Siswa (15.8%)'}
                        </div>
                        <p className="text-[11px] text-rose-600 dark:text-rose-400">Memerlukan Remedial</p>
                      </div>

                      <div className="p-3.5 bg-slate-100/80 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1 shadow-2xs">
                        <span className="text-[10px] text-slate-500 font-mono uppercase">Tahapan Evaluasi</span>
                        <div className="text-lg font-black text-slate-900 dark:text-white font-mono">
                          {selectedPassFailTO === 'ALL' ? 'Aggregat All TO' : selectedPassFailTO}
                        </div>
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                          {selectedPassFailTO === 'TO 4' ? 'Hasil Evaluasi Akhir' : 'Progres Sesi'}
                        </p>
                      </div>
                    </div>

                    {/* Subject-by-Subject Stacked Bar Visualization */}
                    <div className="space-y-4 pt-1">
                      <div className="flex items-center justify-between text-xs border-b border-slate-100 dark:border-slate-800 pb-2">
                        <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">
                          Rasio Ketuntasan Per Mapel ({selectedPassFailTO === 'ALL' ? 'Seluruh TO' : selectedPassFailTO})
                        </span>
                        <div className="flex items-center gap-4 text-[11px] font-mono">
                          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-xs bg-emerald-500 inline-block"></span> Tuntas (≥ KKM 75)</span>
                          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-xs bg-rose-500 inline-block"></span> Belum Tuntas (&lt; KKM 75)</span>
                        </div>
                      </div>

                      {/* List of Subjects with Stacked Ratio Bars */}
                      <div className="space-y-4">
                        {[
                          { id: 'subj-mat', name: 'Matematika Wajib',
                            data: {
                              'TO 1': { pass: 20, fail: 10 },
                              'TO 2': { pass: 23, fail: 7 },
                              'TO 3': { pass: 27, fail: 3 },
                              'TO 4': { pass: 29, fail: 1 },
                              'ALL':  { pass: 25, fail: 5 },
                            }
                          },
                          { id: 'subj-fis', name: 'Fisika Peminatan',
                            data: {
                              'TO 1': { pass: 18, fail: 12 },
                              'TO 2': { pass: 22, fail: 8 },
                              'TO 3': { pass: 26, fail: 4 },
                              'TO 4': { pass: 28, fail: 2 },
                              'ALL':  { pass: 24, fail: 6 },
                            }
                          },
                          { id: 'subj-bin', name: 'Bahasa Indonesia',
                            data: {
                              'TO 1': { pass: 25, fail: 5 },
                              'TO 2': { pass: 27, fail: 3 },
                              'TO 3': { pass: 29, fail: 1 },
                              'TO 4': { pass: 30, fail: 0 },
                              'ALL':  { pass: 28, fail: 2 },
                            }
                          },
                          { id: 'subj-bing', name: 'Bahasa Inggris',
                            data: {
                              'TO 1': { pass: 22, fail: 8 },
                              'TO 2': { pass: 25, fail: 5 },
                              'TO 3': { pass: 28, fail: 2 },
                              'TO 4': { pass: 29, fail: 1 },
                              'ALL':  { pass: 26, fail: 4 },
                            }
                          },
                        ].map((subj) => {
                          const stats = subj.data[selectedPassFailTO as keyof typeof subj.data] || subj.data['ALL'];
                          const total = stats.pass + stats.fail;
                          const passPct = ((stats.pass / total) * 100).toFixed(1);
                          const failPct = ((stats.fail / total) * 100).toFixed(1);

                          return (
                            <div key={subj.id} className="space-y-1.5 p-3 bg-slate-50/70 dark:bg-slate-950/70 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                                <span className="font-bold text-slate-900 dark:text-slate-100 font-sans">{subj.name}</span>
                                <div className="flex items-center gap-3 text-[11px] font-mono tabular-nums">
                                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                                    ✓ {stats.pass} Siswa ({passPct}%) Tuntas
                                  </span>
                                  <span className="text-slate-300 dark:text-slate-700">|</span>
                                  <span className="text-rose-700 dark:text-rose-400 font-bold">
                                    ✕ {stats.fail} Siswa ({failPct}%) Belum Tuntas
                                  </span>
                                </div>
                              </div>

                              {/* Visual Stacked Bar */}
                              <div className="w-full h-7 bg-slate-200 dark:bg-slate-800 rounded-xl overflow-hidden flex p-0.5 border border-slate-300/60 dark:border-slate-700/60 shadow-2xs">
                                {stats.pass > 0 && (
                                  <div
                                    style={{ width: `${passPct}%` }}
                                    className="bg-gradient-to-r from-emerald-600 to-emerald-500 h-full rounded-l-lg flex items-center justify-start px-2.5 transition-all duration-500 group relative"
                                  >
                                    <span className="text-[10px] font-mono font-bold text-white whitespace-nowrap drop-shadow-xs">
                                      {stats.pass} ({passPct}%)
                                    </span>
                                  </div>
                                )}
                                {stats.fail > 0 && (
                                  <div
                                    style={{ width: `${failPct}%` }}
                                    className="bg-gradient-to-r from-rose-500 to-rose-600 h-full rounded-r-lg flex items-center justify-end px-2.5 transition-all duration-500 group relative"
                                  >
                                    <span className="text-[10px] font-mono font-bold text-white whitespace-nowrap drop-shadow-xs">
                                      {stats.fail} ({failPct}%)
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Student Performance Clusters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider font-mono flex items-center gap-1.5">
                        <ArrowUp className="w-4 h-4 text-emerald-600" />
                        <span>Consistent Risers</span>
                      </span>
                      <span className="text-xs font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                        7 Siswa
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">Siswa dengan kenaikan nilai konsisten dari TO 1 ke TO 3.</p>
                    <div className="space-y-1.5">
                      {activeStudentList.slice(0, 3).map(s => (
                        <div key={s.id} className="p-2 bg-slate-50 dark:bg-slate-950 rounded-lg text-xs flex items-center justify-between">
                          <span className="font-bold text-slate-800 dark:text-slate-200">{s.name}</span>
                          <span className="font-mono text-emerald-600 font-bold">+12.5 Poin</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider font-mono flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                        <span>Steady Performers</span>
                      </span>
                      <span className="text-xs font-mono font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">
                        20 Siswa
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">Siswa tuntas di atas KKM secara konsisten.</p>
                    <div className="space-y-1.5">
                      {activeStudentList.slice(3, 6).map(s => (
                        <div key={s.id} className="p-2 bg-slate-50 dark:bg-slate-950 rounded-lg text-xs flex items-center justify-between">
                          <span className="font-bold text-slate-800 dark:text-slate-200">{s.name}</span>
                          <span className="font-mono text-indigo-600 font-bold">Stabil &gt; 80</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-900/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-rose-700 uppercase tracking-wider font-mono flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        <span>Perlu Pendampingan</span>
                      </span>
                      <span className="text-xs font-mono font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded">
                        4 Siswa
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">Siswa membutuhkan bimbingan konseling.</p>
                    <div className="space-y-1.5">
                      {activeStudentList.slice(6, 8).map(s => (
                        <div key={s.id} className="p-2 bg-rose-50/70 dark:bg-rose-950/30 rounded-lg text-xs flex items-center justify-between">
                          <span className="font-bold text-slate-800 dark:text-slate-200">{s.name}</span>
                          <span className="font-mono text-rose-600 font-bold">Remedial 3 Mapel</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* TAB BUKU NILAI SISWA (GRADEBOOK MATRIX) */}
        {activeTab === 'GRADEBOOK' && (() => {
          // List of Tryouts
          const tryoutOptions = allTryouts.length > 0 ? allTryouts : [
            { id: 'to-1', code: 'UH-2025-01', title: 'UH 1 — Matriks & Vektor' },
            { id: 'to-2', code: 'PTS-2025-01', title: 'PTS Gasal 2025/2026' },
            { id: 'to-3', code: 'TO-2026-03', title: 'Try Out Akbar SNBT 2026' },
            { id: 'to-4', code: 'TO-2026-04', title: 'Try Out Simulasi Kelulusan' },
          ];

          // List of Subjects
          const subjectOptions = allSubjects.length > 0 ? allSubjects : [
            { id: 'subj-mat', code: 'MAT', name: 'Matematika', passingGrade: 75 },
            { id: 'subj-fis', code: 'FIS', name: 'Fisika', passingGrade: 70 },
            { id: 'subj-bin', code: 'BIN', name: 'Bahasa Indonesia', passingGrade: 75 },
            { id: 'subj-bing', code: 'BIG', name: 'Bahasa Inggris', passingGrade: 75 },
          ];

          // Helper to get score of a student for specific tryout & subject
          const getStudentSubjectScore = (studentId: string, toId: string, subjId: string): number => {
            const foundScore = allScores.find(sc => sc.studentId === studentId && sc.tryoutId === toId);
            if (foundScore && foundScore.subjectScores && typeof foundScore.subjectScores[subjId] === 'number') {
              return foundScore.subjectScores[subjId];
            }
            if (foundScore && subjId === 'subj-mat' && foundScore.calculatedScore) {
              return foundScore.calculatedScore;
            }

            // Fallback realistic simulation
            const sIdx = activeStudentList.findIndex(s => s.id === studentId);
            const toIdx = tryoutOptions.findIndex(t => t.id === toId);
            const base = 72 + ((sIdx * 7) % 21) + ((toIdx >= 0 ? toIdx : 0) * 4);
            const subjOffset = subjId === 'subj-mat' ? 0 : subjId === 'subj-fis' ? -3 : subjId === 'subj-bin' ? 5 : 3;
            return Math.min(98, Math.max(55, base + subjOffset));
          };

          // Get overall score for student in selected TO or across all TO
          const getStudentOverallScore = (studentId: string): number => {
            if (gradebookTO !== 'ALL' && gradebookSubject !== 'ALL') {
              return getStudentSubjectScore(studentId, gradebookTO, gradebookSubject);
            }
            if (gradebookTO !== 'ALL') {
              // Average across all subjects for this TO
              const scores = subjectOptions.map(sub => getStudentSubjectScore(studentId, gradebookTO, sub.id));
              return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
            }
            if (gradebookSubject !== 'ALL') {
              // Average across all TOs for this Subject
              const scores = tryoutOptions.map(t => getStudentSubjectScore(studentId, t.id, gradebookSubject));
              return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
            }
            // All TO & All Subjects grand average
            const allVals: number[] = [];
            tryoutOptions.forEach(t => {
              subjectOptions.forEach(sub => {
                allVals.push(getStudentSubjectScore(studentId, t.id, sub.id));
              });
            });
            return Math.round((allVals.reduce((a, b) => a + b, 0) / (allVals.length || 1)) * 10) / 10;
          };

          const activeKKM = gradebookSubject !== 'ALL'
            ? (subjectOptions.find(s => s.id === gradebookSubject)?.passingGrade || 75)
            : 75;

          // Filter and Sort Students
          const processedStudents = filteredStudents
            .map(student => {
              const overall = getStudentOverallScore(student.id);
              const isPassing = overall >= activeKKM;
              return { student, overall, isPassing };
            })
            .filter(item => {
              if (gradebookStatusFilter === 'PASS') return item.isPassing;
              if (gradebookStatusFilter === 'REMEDIAL') return !item.isPassing;
              return true;
            })
            .sort((a, b) => {
              if (gradebookSortBy === 'SCORE_DESC') return b.overall - a.overall;
              if (gradebookSortBy === 'SCORE_ASC') return a.overall - b.overall;
              return a.student.name.localeCompare(b.student.name);
            });

          // Class Statistics for current filter
          const currentScores = processedStudents.map(p => p.overall);
          const highestScore = currentScores.length > 0 ? Math.max(...currentScores) : 0;
          const lowestScore = currentScores.length > 0 ? Math.min(...currentScores) : 0;
          const avgScore = currentScores.length > 0
            ? Math.round((currentScores.reduce((a, b) => a + b, 0) / currentScores.length) * 10) / 10
            : 0;
          const totalPassing = processedStudents.filter(p => p.isPassing).length;
          const passPercentage = processedStudents.length > 0
            ? Math.round((totalPassing / processedStudents.length) * 100)
            : 0;

          // CSV Export Handler
          const handleExportCSV = () => {
            let csv = '';
            if (gradebookTO !== 'ALL') {
              const toTitle = tryoutOptions.find(t => t.id === gradebookTO)?.title || gradebookTO;
              csv = `Buku Nilai Kelas ${assignedClass.name} - ${toTitle}\n`;
              csv += `NISN,Nama Siswa,${subjectOptions.map(s => s.name).join(',')},Rata-Rata,Status\n`;
              processedStudents.forEach(({ student }) => {
                const subScores = subjectOptions.map(s => getStudentSubjectScore(student.id, gradebookTO, s.id));
                const avg = (subScores.reduce((a, b) => a + b, 0) / subScores.length).toFixed(1);
                const status = Number(avg) >= activeKKM ? 'TUNTAS' : 'REMEDIAL';
                csv += `${student.nisn},"${student.name}",${subScores.join(',')},${avg},${status}\n`;
              });
            } else {
              csv = `Buku Nilai Kelas ${assignedClass.name} - Semua Try Out\n`;
              csv += `NISN,Nama Siswa,${tryoutOptions.map(t => t.code || t.title).join(',')},Rata-Rata,Status\n`;
              processedStudents.forEach(({ student }) => {
                const toScores = tryoutOptions.map(t => {
                  const subScores = subjectOptions.map(s => getStudentSubjectScore(student.id, t.id, s.id));
                  return (subScores.reduce((a, b) => a + b, 0) / subScores.length).toFixed(1);
                });
                const overallAvg = (toScores.map(Number).reduce((a, b) => a + b, 0) / toScores.length).toFixed(1);
                const status = Number(overallAvg) >= activeKKM ? 'TUNTAS' : 'REMEDIAL';
                csv += `${student.nisn},"${student.name}",${toScores.join(',')},${overallAvg},${status}\n`;
              });
            }

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Buku_Nilai_${assignedClass.name}_${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            triggerToast('Buku Nilai berhasil diekspor ke format CSV.');
          };

          return (
            <div className="space-y-6">
              {/* Header Box & Filter Toolbar */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-mono text-xs font-bold uppercase tracking-wider">
                      <GraduationCap className="w-4 h-4" />
                      <span>Matriks Buku Nilai Siswa</span>
                    </div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">
                      Data Nilai Siswa Kelas {assignedClass.name}
                    </h2>
                    <p className="text-xs text-slate-500 max-w-2xl mt-0.5">
                      Pantau perolehan nilai setiap siswa untuk seluruh tahapan Try Out dan semua mata pelajaran secara transparan. Klik baris siswa untuk rincian lengkap.
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleExportCSV}
                      className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>Ekspor Excel / CSV</span>
                    </button>
                  </div>
                </div>

                {/* Dropdown Filters Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
                  {/* Filter Dropdown 1: Try Out */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Pilih Try Out:</span>
                    </label>
                    <select
                      value={gradebookTO}
                      onChange={e => setGradebookTO(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      <option value="ALL">Semua Try Out (Rekap Rata-Rata)</option>
                      {tryoutOptions.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.code ? `[${t.code}] ` : ''}{t.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Filter Dropdown 2: Mata Pelajaran */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Pilih Mata Pelajaran:</span>
                    </label>
                    <select
                      value={gradebookSubject}
                      onChange={e => setGradebookSubject(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      <option value="ALL">Semua Mata Pelajaran (Matriks Lengkap)</option>
                      {subjectOptions.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} (KKM: {s.passingGrade || 75})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Filter Dropdown 3: Status Ketuntasan KKM */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Filter className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Status Kelulusan:</span>
                    </label>
                    <select
                      value={gradebookStatusFilter}
                      onChange={e => setGradebookStatusFilter(e.target.value as any)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      <option value="ALL">Semua Status Siswa</option>
                      <option value="PASS">Hanya Tuntas KKM (≥ {activeKKM})</option>
                      <option value="REMEDIAL">Perlu Bimbingan / Remedial (&lt; {activeKKM})</option>
                    </select>
                  </div>

                  {/* Filter Dropdown 4: Urutkan Berdasarkan */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Urutkan Tampilan:</span>
                    </label>
                    <select
                      value={gradebookSortBy}
                      onChange={e => setGradebookSortBy(e.target.value as any)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      <option value="NAME">Nama Siswa (A - Z)</option>
                      <option value="SCORE_DESC">Nilai Tertinggi ke Terendah (Peringkat)</option>
                      <option value="SCORE_ASC">Nilai Terendah ke Tertinggi</option>
                    </select>
                  </div>
                </div>

                {/* KPI Statistik Rombel Sesuai Filter */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-1">
                    <span className="text-[10px] text-slate-500 font-mono uppercase">Rata-Rata Kelas</span>
                    <div className="text-xl font-black text-slate-900 dark:text-white font-mono">{avgScore.toFixed(1)}</div>
                    <p className="text-[11px] text-slate-500">Standar KKM: {activeKKM.toFixed(1)}</p>
                  </div>

                  <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl space-y-1">
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-mono font-bold uppercase">Nilai Tertinggi</span>
                    <div className="text-xl font-black text-emerald-700 dark:text-emerald-300 font-mono">{highestScore.toFixed(1)}</div>
                    <p className="text-[11px] text-emerald-600">Pencapaian terbaik siswa</p>
                  </div>

                  <div className="p-3.5 bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 rounded-2xl space-y-1">
                    <span className="text-[10px] text-rose-700 dark:text-rose-300 font-mono font-bold uppercase">Nilai Terendah</span>
                    <div className="text-xl font-black text-rose-700 dark:text-rose-300 font-mono">{lowestScore.toFixed(1)}</div>
                    <p className="text-[11px] text-rose-600">Butuh perhatian wali kelas</p>
                  </div>

                  <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 rounded-2xl space-y-1">
                    <span className="text-[10px] text-indigo-700 dark:text-indigo-300 font-mono font-bold uppercase">Ketuntasan Kelas</span>
                    <div className="text-xl font-black text-indigo-700 dark:text-indigo-300 font-mono">
                      {totalPassing}/{processedStudents.length} ({passPercentage}%)
                    </div>
                    <p className="text-[11px] text-indigo-600">Tuntas di atas KKM</p>
                  </div>
                </div>

                {/* Tabel Interaktif Buku Nilai Siswa */}
                <div className="overflow-auto max-h-[500px] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs scrollbar-thin">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider sticky top-0 z-30">
                      <tr>
                        <th className="px-3.5 py-3 sticky left-0 z-40 bg-slate-100 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 min-w-[200px]">
                          Nama Siswa / NISN
                        </th>

                        {/* Kasus 1: Pilih 1 TO tertentu, tampilkan kolom semua Mapel */}
                        {gradebookTO !== 'ALL' && gradebookSubject === 'ALL' && (
                          <>
                            {subjectOptions.map(sub => (
                              <th key={sub.id} className="px-3 py-3 text-center whitespace-nowrap">
                                {sub.name}
                                <span className="block text-[10px] text-slate-400 font-normal font-mono">KKM {sub.passingGrade || 75}</span>
                              </th>
                            ))}
                          </>
                        )}

                        {/* Kasus 2: Pilih 1 Mapel tertentu, tampilkan kolom semua TO */}
                        {gradebookSubject !== 'ALL' && gradebookTO === 'ALL' && (
                          <>
                            {tryoutOptions.map(toItem => (
                              <th key={toItem.id} className="px-3 py-3 text-center whitespace-nowrap">
                                {toItem.code || toItem.title}
                              </th>
                            ))}
                          </>
                        )}

                        {/* Kasus 3: Semua TO & Semua Mapel, tampilkan ringkasan per mapel & per TO */}
                        {gradebookTO === 'ALL' && gradebookSubject === 'ALL' && (
                          <>
                            {subjectOptions.map(sub => (
                              <th key={sub.id} className="px-3 py-3 text-center whitespace-nowrap">
                                {sub.name}
                              </th>
                            ))}
                          </>
                        )}

                        {/* Kasus 4: Spesifik 1 TO dan 1 Mapel */}
                        {gradebookTO !== 'ALL' && gradebookSubject !== 'ALL' && (
                          <th className="px-3 py-3 text-center whitespace-nowrap">
                            Nilai Ujian
                          </th>
                        )}

                        <th className="px-3 py-3 text-center whitespace-nowrap">
                          {gradebookSubject !== 'ALL' && gradebookTO !== 'ALL' ? 'Skor Akhir' : 'Rata-Rata'}
                        </th>
                        <th className="px-3 py-3 text-center whitespace-nowrap">Status KKM</th>
                        <th className="px-3 py-3 text-center whitespace-nowrap">Aksi</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {processedStudents.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="py-12 text-center text-slate-400 italic">
                            Tidak ada siswa yang sesuai dengan kriteria pencarian dan filter status.
                          </td>
                        </tr>
                      ) : (
                        processedStudents.map(({ student, overall, isPassing }, rankIdx) => {
                          return (
                            <tr
                              key={student.id}
                              className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer"
                              onClick={() => setSelectedStudentDetail(student)}
                            >
                              <td className="px-3.5 py-3 sticky left-0 z-20 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 whitespace-nowrap group-hover:bg-slate-50 dark:group-hover:bg-slate-850">
                                <div className="flex items-center gap-2">
                                  <span className="w-5 text-center text-[11px] font-mono font-bold text-slate-400">
                                    {rankIdx + 1}.
                                  </span>
                                  <div>
                                    <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                      <span>{student.name}</span>
                                      {overall >= 85 && (
                                        <Award className="w-3.5 h-3.5 text-amber-500 inline shrink-0" />
                                      )}
                                    </div>
                                    <div className="text-[10px] font-mono text-slate-500">NISN: {student.nisn} · NIS: {student.nis}</div>
                                  </div>
                                </div>
                              </td>

                              {/* Tampilan Nilai Kasus 1: Spesifik 1 TO, Semua Mapel */}
                              {gradebookTO !== 'ALL' && gradebookSubject === 'ALL' && (
                                <>
                                  {subjectOptions.map(sub => {
                                    const val = getStudentSubjectScore(student.id, gradebookTO, sub.id);
                                    const pass = val >= (sub.passingGrade || 75);
                                    return (
                                      <td key={sub.id} className="px-3 py-3 text-center font-mono font-bold whitespace-nowrap">
                                        <span className={`px-2 py-1 rounded-lg ${pass ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30' : 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30'}`}>
                                          {val.toFixed(1)}
                                        </span>
                                      </td>
                                    );
                                  })}
                                </>
                              )}

                              {/* Tampilan Nilai Kasus 2: Spesifik 1 Mapel, Semua TO */}
                              {gradebookSubject !== 'ALL' && gradebookTO === 'ALL' && (
                                <>
                                  {tryoutOptions.map(toItem => {
                                    const val = getStudentSubjectScore(student.id, toItem.id, gradebookSubject);
                                    const pass = val >= activeKKM;
                                    return (
                                      <td key={toItem.id} className="px-3 py-3 text-center font-mono font-bold whitespace-nowrap">
                                        <span className={`px-2 py-1 rounded-lg ${pass ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30' : 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30'}`}>
                                          {val.toFixed(1)}
                                        </span>
                                      </td>
                                    );
                                  })}
                                </>
                              )}

                              {/* Tampilan Nilai Kasus 3: Semua TO & Semua Mapel (Rata-rata per Mapel) */}
                              {gradebookTO === 'ALL' && gradebookSubject === 'ALL' && (
                                <>
                                  {subjectOptions.map(sub => {
                                    const scores = tryoutOptions.map(t => getStudentSubjectScore(student.id, t.id, sub.id));
                                    const avg = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
                                    const pass = avg >= (sub.passingGrade || 75);
                                    return (
                                      <td key={sub.id} className="px-3 py-3 text-center font-mono font-bold whitespace-nowrap">
                                        <span className={`px-2 py-1 rounded-lg ${pass ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30' : 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30'}`}>
                                          {avg.toFixed(1)}
                                        </span>
                                      </td>
                                    );
                                  })}
                                </>
                              )}

                              {/* Tampilan Nilai Kasus 4: 1 TO & 1 Mapel */}
                              {gradebookTO !== 'ALL' && gradebookSubject !== 'ALL' && (
                                <td className="px-3 py-3 text-center font-mono font-bold whitespace-nowrap">
                                  <span className={`px-2.5 py-1 rounded-lg text-sm ${isPassing ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30' : 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30'}`}>
                                    {overall.toFixed(1)}
                                  </span>
                                </td>
                              )}

                              {/* Kolom Rata-Rata / Skor Akhir */}
                              <td className="px-3 py-3 text-center font-mono font-black text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800/60 rounded">
                                {overall.toFixed(1)}
                              </td>

                              {/* Status Badge */}
                              <td className="px-3 py-3 text-center whitespace-nowrap">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                                  isPassing
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                }`}>
                                  {isPassing ? (
                                    <>
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                      <span>TUNTAS</span>
                                    </>
                                  ) : (
                                    <>
                                      <AlertTriangle className="w-3 h-3 text-rose-600" />
                                      <span>REMEDIAL</span>
                                    </>
                                  )}
                                </span>
                              </td>

                              {/* Tombol Aksi */}
                              <td className="px-3 py-3 text-center whitespace-nowrap" onClick={e => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => setSelectedStudentDetail(student)}
                                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                                  title="Lihat Rincian Rekam Jejak Nilai"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Footer Keterangan & Panduan */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-3 gap-2">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                      <span>Hijau: Nilai di atas atau sama dengan KKM ({activeKKM})</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                      <span>Merah: Nilai di bawah KKM (Remedial)</span>
                    </span>
                  </div>
                  <div>Menampilkan {processedStudents.length} dari {activeStudentList.length} siswa rombel</div>
                </div>
              </div>

              {/* Modal Detail Rekam Jejak Nilai Siswa */}
              {selectedStudentDetail && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
                  onClick={() => setSelectedStudentDetail(null)}
                >
                  <div
                    className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full p-6 space-y-5 animate-in zoom-in-95 duration-200"
                    onClick={e => e.stopPropagation()}
                  >
                    {/* Modal Header */}
                    <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center font-bold text-lg shadow-xs">
                          {selectedStudentDetail.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                            {selectedStudentDetail.name}
                          </h3>
                          <p className="text-xs text-slate-500 font-mono">
                            NISN: {selectedStudentDetail.nisn} · Kelas: {assignedClass.name}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedStudentDetail(null)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Matrix Rincian Semua TO vs Semua Mapel untuk Siswa Ini */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 font-mono">
                        Rekam Jejak Seluruh Try Out &amp; Mata Pelajaran
                      </h4>
                      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-100 dark:bg-slate-950 font-bold text-slate-700 dark:text-slate-300 font-mono">
                            <tr>
                              <th className="p-2.5">Mata Pelajaran</th>
                              {tryoutOptions.map(t => (
                                <th key={t.id} className="p-2.5 text-center whitespace-nowrap">
                                  {t.code || t.title.split('—')[0]}
                                </th>
                              ))}
                              <th className="p-2.5 text-center">Rata-Rata</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                            {subjectOptions.map(sub => {
                              const scores = tryoutOptions.map(t => getStudentSubjectScore(selectedStudentDetail.id, t.id, sub.id));
                              const avg = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
                              return (
                                <tr key={sub.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                  <td className="p-2.5 font-sans font-bold text-slate-900 dark:text-slate-100">
                                    {sub.name}
                                  </td>
                                  {scores.map((val, idx) => {
                                    const pass = val >= (sub.passingGrade || 75);
                                    return (
                                      <td key={idx} className="p-2.5 text-center">
                                        <span className={`px-2 py-0.5 rounded font-bold ${pass ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' : 'text-rose-600 bg-rose-50 dark:bg-rose-950/40'}`}>
                                          {val.toFixed(1)}
                                        </span>
                                      </td>
                                    );
                                  })}
                                  <td className="p-2.5 text-center font-black text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800">
                                    {avg.toFixed(1)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Catatan Khusus Wali Kelas */}
                    <div className="space-y-1.5 p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 font-mono uppercase">
                        Catatan Wali Kelas untuk Siswa Ini:
                      </span>
                      <p className="text-xs text-slate-600 dark:text-slate-400 italic">
                        "{waliNotes[selectedStudentDetail.id] || 'Siswa menunjukkan motivasi dan potensi belajar yang konsisten baik.'}"
                      </p>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        onClick={() => setSelectedStudentDetail(null)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                      >
                        Tutup Jendela
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* TAB 3: LEGER NILAI MULTIMAPEL & CATATAN RAPOR */}
        {activeTab === 'LEGER_RAPOR' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                    <span>Leger Nilai Multimapel &amp; Catatan Pembimbing Wali Kelas</span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    Rekapitulasi seluruh nilai mata pelajaran siswa Rombel {assignedClass.name} beserta penginputan catatan pembimbing.
                  </p>
                </div>

                <button
                  onClick={() => {
                    triggerToast('Seluruh catatan Wali Kelas berhasil disimpan.');
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer shrink-0"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Catatan Rapor</span>
                </button>
              </div>

              <div className="overflow-auto max-h-[440px] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs scrollbar-thin">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider">
                    <tr>
                      <th className="px-3.5 py-3 sticky top-0 left-0 z-30 bg-slate-100 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 shadow-2xs min-w-[180px]">
                        NISN / Nama Siswa
                      </th>
                      <th className="px-3 py-3 text-center sticky top-0 z-20 bg-slate-100 dark:bg-slate-950 whitespace-nowrap">Matematika</th>
                      <th className="px-3 py-3 text-center sticky top-0 z-20 bg-slate-100 dark:bg-slate-950 whitespace-nowrap">Fisika</th>
                      <th className="px-3 py-3 text-center sticky top-0 z-20 bg-slate-100 dark:bg-slate-950 whitespace-nowrap">B. Indonesia</th>
                      <th className="px-3 py-3 text-center sticky top-0 z-20 bg-slate-100 dark:bg-slate-950 whitespace-nowrap">B. Inggris</th>
                      <th className="px-3 py-3 text-center sticky top-0 z-20 bg-slate-100 dark:bg-slate-950 whitespace-nowrap">Rata-Rata</th>
                      <th className="px-3 py-3 text-center sticky top-0 z-20 bg-slate-100 dark:bg-slate-950 whitespace-nowrap">Status Rapor</th>
                      <th className="px-3 py-3 sticky top-0 z-20 bg-slate-100 dark:bg-slate-950 whitespace-nowrap">Catatan Pembimbing Wali Kelas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredStudents.map(s => {
                      const isSelected = selectedStudentId === s.id;
                      return (
                        <tr key={s.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 ${isSelected ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : ''}`}>
                          <td className="px-3.5 py-3 sticky left-0 z-10 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-2xs whitespace-nowrap">
                            <div className="font-bold text-slate-900 dark:text-slate-100">{s.name}</div>
                            <div className="text-[10px] font-mono text-slate-500">NISN: {s.nisn}</div>
                          </td>
                          <td className="px-3 py-3 text-center font-mono font-bold text-emerald-600">85.0</td>
                          <td className="px-3 py-3 text-center font-mono font-bold text-indigo-600">80.0</td>
                          <td className="px-3 py-3 text-center font-mono font-bold text-emerald-600">88.0</td>
                          <td className="px-3 py-3 text-center font-mono font-bold text-indigo-600">82.0</td>
                          <td className="px-3 py-3 text-center font-mono font-black text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 rounded">
                            83.8
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                              TUNTAS
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="text"
                              value={waliNotes[s.id] || ''}
                              onChange={e => setWaliNotes({ ...waliNotes, [s.id]: e.target.value })}
                              placeholder="Ketik catatan pembimbing untuk rapor..."
                              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: DIREKTORI SISWA */}
        {activeTab === 'STUDENT_DIRECTORY' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Users className="w-5 h-5 text-emerald-600" />
                    <span>Direktori Siswa Rombel {assignedClass.name}</span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    Daftar data pokok siswa sesuai master data yang diinputkan oleh Admin.
                  </p>
                </div>
                <div className="text-xs font-mono font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl self-start sm:self-auto">
                  Total: {filteredStudents.length} Siswa
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredStudents.map(s => (
                  <div key={s.id} className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center font-bold text-sm">
                        {s.name.charAt(0)}
                      </div>
                      <span className="text-[11px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2.5 py-1 rounded-lg">
                        NISN: {s.nisn}
                      </span>
                    </div>

                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-slate-100">{s.name}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-1 font-mono">
                        <School className="w-3.5 h-3.5 text-slate-400" />
                        <span>Rombel: {assignedClass.name}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Tgl Lahir (Password):</span>
                        </span>
                        <strong className="font-mono text-slate-900 dark:text-slate-100">{s.birthDate || '14/05/2008'}</strong>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between text-xs font-mono">
                      <span className="text-[11px] text-slate-500">Status Akun:</span>
                      <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Aktif &amp; Terverifikasi</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
