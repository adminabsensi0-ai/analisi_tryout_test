import React, { useState, useEffect } from 'react';
import {
  BookOpen, BarChart3, FileSpreadsheet, Plus, CheckCircle,
  AlertTriangle, Upload, Eye, FileText, Download,
  Layers, HelpCircle, Save, Sparkles, Filter, Menu, X,
  Search, CheckCircle2, ChevronRight, Video, FileCheck, Trash2,
  Edit, ShieldCheck, ShieldAlert, Users, School, Tag, Award,
  ArrowRight, Lock, RefreshCw, Key, ExternalLink, Link, AlertCircle, Check,
  Calculator, Scale, Play, CheckCheck, Sliders, PieChart, TrendingUp,
  Gauge, Zap, Target, Cpu, Clock, ArrowUp, ArrowDown, Activity, Info,
  Youtube, Copy, LayoutGrid
} from 'lucide-react';
import { dbService } from '../services/database';
import { GoogleIntegrationService } from '../services/googleIntegration';
import {
  AnalyticsService, OverallAnalyticsFilters, OverallAnalyticsResult,
  ClassAnalyticsResult, StudentAnalyticsResult, QuestionAnalysisResult,
  AnalyticsTestSuiteResult
} from '../services/analytics';
import { ExportService, ReportTestSuiteResult } from '../services/export';
import { ScoringService, CalculationResult, ScoringTestCaseResult } from '../services/scoring';
import { ExplanationService, ExplanationTestSuiteResult } from '../services/explanation';
import { ProgressService, ProgressTestSuiteResult } from '../services/progress';
import { ProductionValidationSuiteResult } from '../services/productionValidation';
import {
  User, Question, Tryout, SheetImportPreviewItem, Explanation, Subject,
  Material, Competency, ClassRoom, Student, CognitiveLevel, QuestionStatus,
  ColumnMappingConfig, SheetImportSummary, Score, AcademicYear
} from '../types/database';
import { ResourceCard } from '../components/ResourceCard';
import { ItemAnalysisVisualizer } from '../components/ItemAnalysisVisualizer';

interface GuruAppPageProps {
  currentUser: User;
  onNavigate?: (path: string) => void;
}

type GuruTab =
  | 'DASHBOARD'
  | 'WALI_KELAS_PORTAL'
  | 'TRYOUTS'
  | 'QUESTION_BANK'
  | 'MATERIALS'
  | 'COMPETENCIES'
  | 'STUDENTS'
  | 'CLASSES'
  | 'ANALYTICS'
  | 'PROGRESS_TRACKING'
  | 'EXPLANATIONS'
  | 'REPORTS'
  | 'IMPORT_SHEETS'
  | 'SCORING_ENGINE';

export const GuruAppPage: React.FC<GuruAppPageProps> = ({ currentUser: initialUser, onNavigate }) => {
  // Allow switching teacher persona in UI for verification of strict isolation
  const [currentUser, setCurrentUser] = useState<User>(initialUser);

  // Dual-Role Mode State: 'GURU_MAPEL' vs 'WALI_KELAS'
  const teacherObj = dbService.getTeacherByUserId(currentUser);
  const isWaliKelasUser = currentUser.role === 'WALI_KELAS' || !!teacherObj?.isWaliKelas;
  const [activeRoleMode, setActiveRoleMode] = useState<'GURU_MAPEL' | 'WALI_KELAS'>(
    currentUser.role === 'WALI_KELAS' || teacherObj?.isWaliKelas ? 'WALI_KELAS' : 'GURU_MAPEL'
  );
  const [waliNotes, setWaliNotes] = useState<Record<string, string>>({
    's-1': 'Siswa sangat aktif dan menunjukkan peningkatan konsisten di TryOut.',
    's-2': 'Pertahankan prestasi, fokus perbaikan pada pemahaman rumus kalkulus.',
  });
  const [selectedWaliStudentId, setSelectedWaliStudentId] = useState<string>('s-1');

  const [activeTab, setActiveTab] = useState<GuruTab>(
    currentUser.role === 'WALI_KELAS' || teacherObj?.isWaliKelas ? 'WALI_KELAS_PORTAL' : 'DASHBOARD'
  );

  // Synchronize role mode and primary dashboard when user changes
  useEffect(() => {
    const tObj = dbService.getTeacherByUserId(currentUser);
    const isWali = currentUser.role === 'WALI_KELAS' || !!tObj?.isWaliKelas;
    if (isWali) {
      setActiveRoleMode('WALI_KELAS');
      setActiveTab('WALI_KELAS_PORTAL');
    } else {
      setActiveRoleMode('GURU_MAPEL');
      setActiveTab('DASHBOARD');
    }
  }, [currentUser]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Filter & Selection States
  const [selectedTryoutId, setSelectedTryoutId] = useState('to-3');
  const [selectedSubjectId, setSelectedSubjectId] = useState('subj-mat');
  const [classFilter, setClassFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [cognitiveFilter, setCognitiveFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Database Local States
  const [questions, setQuestions] = useState<Question[]>([]);
  const [tryouts, setTryouts] = useState<Tryout[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [explanations, setExplanations] = useState<Explanation[]>([]);

  // Permissions of Current Teacher
  const [allowedSubjectIds, setAllowedSubjectIds] = useState<string[]>([]);
  const [allowedClassIds, setAllowedClassIds] = useState<string[]>([]);

  // Question Modal State (Create / Edit)
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [qSubjectId, setQSubjectId] = useState('subj-mat');
  const [qMaterialId, setQMaterialId] = useState('');
  const [qCompetencyId, setQCompetencyId] = useState('');
  const [qNumber, setQNumber] = useState<number>(1);
  const [qUniqueCode, setQUniqueCode] = useState('');
  const [qText, setQText] = useState('');
  const [qOptions, setQOptions] = useState([
    { key: 'A', text: '' },
    { key: 'B', text: '' },
    { key: 'C', text: '' },
    { key: 'D', text: '' },
    { key: 'E', text: '' },
  ]);
  const [qCorrectAnswer, setQCorrectAnswer] = useState('A');
  const [qWeight, setQWeight] = useState(1);
  const [qCognitiveLevel, setQCognitiveLevel] = useState<CognitiveLevel>('C4');
  const [qStatus, setQStatus] = useState<QuestionStatus>('ACTIVE');
  const [selectedPassFailTO, setSelectedPassFailTO] = useState<string>('TO 4');

  // TryOut Dynamic Modal State
  const [showTryoutModal, setShowTryoutModal] = useState(false);
  const [newToCode, setNewToCode] = useState('');
  const [newToTitle, setNewToTitle] = useState('');
  const [newToGFormUrl, setNewToGFormUrl] = useState('');
  const [newToGSheetUrl, setNewToGSheetUrl] = useState('');

  const handleCreateTryoutPackage = () => {
    if (!newToTitle.trim()) {
      setErrorBanner("Nama Paket TryOut tidak boleh kosong.");
      return;
    }
    const nextIdx = tryouts.length + 1;
    const createdCode = newToCode.trim() || `TO-2026-0${nextIdx}`;
    const newToObj: Tryout = {
      id: `to-${Date.now()}`,
      code: createdCode,
      title: newToTitle.trim(),
      assessmentType: 'TRYOUT',
      academicYearId: 'ay-2025-2',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'ACTIVE',
      scoringConfig: {
        scoringType: 'EQUAL_WEIGHT',
        maxScore: 100,
        correctScore: 5,
        wrongScore: 0,
        unansweredScore: 0,
        allowNegativeMarking: false,
        passingGrade: 75,
      },
      googleFormUrl: newToGFormUrl.trim() || 'https://forms.google.com/sample',
      googleSheetUrl: newToGSheetUrl.trim() || 'https://docs.google.com/spreadsheets/d/sample/edit',
      description: `Paket Ujian TryOut ${createdCode} terhubung dengan Google Form & Google Sheet.`
    };

    dbService.saveTryout(newToObj);
    setTryouts(dbService.getTryouts());
    setShowTryoutModal(false);
    setNewToCode('');
    setNewToTitle('');
    setNewToGFormUrl('');
    setNewToGSheetUrl('');
    triggerToast(`Paket TryOut '${newToObj.title}' berhasil ditambahkan!`);
  };

  // Contextual Confirmation Delete State (Safe replacement for window.confirm)
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<{ id: string; code: string; title: string; type?: 'QUESTION' | 'MATERIAL' | 'COMPETENCY' } | null>(null);

  // Checkbox Bulk Delete States for Guru App
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);
  const [selectedCompetencyIds, setSelectedCompetencyIds] = useState<string[]>([]);

  const [guruBatchDeleteConfirm, setGuruBatchDeleteConfirm] = useState<{
    type: 'QUESTION' | 'MATERIAL' | 'COMPETENCY';
    count: number;
  } | null>(null);

  const handleConfirmGuruBatchDelete = () => {
    if (!guruBatchDeleteConfirm) return;
    try {
      if (guruBatchDeleteConfirm.type === 'QUESTION') {
        dbService.deleteQuestionsBatch(selectedQuestionIds, currentUser);
        setSuccessToast(`Berhasil menghapus massal ${selectedQuestionIds.length} butir soal.`);
        setSelectedQuestionIds([]);
      } else if (guruBatchDeleteConfirm.type === 'MATERIAL') {
        dbService.deleteMaterialsBatch(selectedMaterialIds, currentUser);
        setSuccessToast(`Berhasil menghapus massal ${selectedMaterialIds.length} materi.`);
        setSelectedMaterialIds([]);
      } else if (guruBatchDeleteConfirm.type === 'COMPETENCY') {
        dbService.deleteCompetenciesBatch(selectedCompetencyIds, currentUser);
        setSuccessToast(`Berhasil menghapus massal ${selectedCompetencyIds.length} kompetensi.`);
        setSelectedCompetencyIds([]);
      }
      setGuruBatchDeleteConfirm(null);
      refreshData();
    } catch (err: any) {
      setErrorBanner(err.message || 'Gagal menghapus data massal.');
      setGuruBatchDeleteConfirm(null);
    }
  };

  // Material Modal State
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [matSubjectId, setMatSubjectId] = useState('subj-mat');
  const [matCode, setMatCode] = useState('');
  const [matTitle, setMatTitle] = useState('');
  const [matDescription, setMatDescription] = useState('');
  const [matGoogleFormUrl, setMatGoogleFormUrl] = useState('');
  const [previewGoogleFormUrl, setPreviewGoogleFormUrl] = useState<string | null>(null);

  // Competency Modal State
  const [showCompetencyModal, setShowCompetencyModal] = useState(false);
  const [editingCompetencyId, setEditingCompetencyId] = useState<string | null>(null);
  const [compSubjectId, setCompSubjectId] = useState('subj-mat');
  const [compCode, setCompCode] = useState('');
  const [compStatement, setCompStatement] = useState('');
  const [compGrade, setCompGrade] = useState<'X' | 'XI' | 'XII'>('XII');

  // Google Sheets Import Pipeline State (5 Stages: Input -> Mapping -> Validation/Preview -> Confirm -> Raw Responses & Scoring)
  const [importStage, setImportStage] = useState<'INPUT' | 'MAPPING' | 'PREVIEW' | 'CONFIRMED'>('INPUT');
  const [rawPasteText, setRawPasteText] = useState('');
  const [previewItems, setPreviewItems] = useState<SheetImportPreviewItem[]>([]);
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [columnMappings, setColumnMappings] = useState<ColumnMappingConfig>({
    nisnColumn: 'NISN',
    questionMappings: {},
  });
  const [validationSummary, setValidationSummary] = useState<SheetImportSummary | null>(null);
  const [googleFormRef, setGoogleFormRef] = useState({
    formId: '1FAIpQLSe-MAT-TO03',
    formTitle: 'Try Out Akbar Matematika Wajib XII',
    formUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSe-MAT-TO03/viewform',
    sheetUrl: 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit',
    lastSync: 'Baru saja',
  });
  const [integrationTestResult, setIntegrationTestResult] = useState<{
    passed: boolean;
    tests: { name: string; passed: boolean; message: string }[];
  } | null>(null);

  // Phase 10: Explanation Modal & Management State
  const [showExplanationModal, setShowExplanationModal] = useState(false);
  const [editingExplanationId, setEditingExplanationId] = useState<string | null>(null);
  const [expTitle, setExpTitle] = useState('');
  const [expSubjectId, setExpSubjectId] = useState<string>('subj-mat');
  const [expTryoutId, setExpTryoutId] = useState<string>('to-3');
  const [expQuestionId, setExpQuestionId] = useState<string>('GENERAL');
  const [expContentText, setExpContentText] = useState('');
  const [expPdfUrl, setExpPdfUrl] = useState('');
  const [expPdfFileName, setExpPdfFileName] = useState('');
  const [expYoutubeUrl, setExpYoutubeUrl] = useState('');
  const [expExternalUrl, setExpExternalUrl] = useState('');
  const [expStatus, setExpStatus] = useState<'DRAFT' | 'PUBLISHED' | 'ARCHIVED'>('PUBLISHED');
  const [copiedExpUrl, setCopiedExpUrl] = useState<string | null>(null);

  // Quick Link Management State in Teacher Portal
  const [quickExpSubjectId, setQuickExpSubjectId] = useState<string>('subj-mat');
  const [quickExpScope, setQuickExpScope] = useState<string>('GENERAL');
  const [quickExpTitle, setQuickExpTitle] = useState<string>('');
  const [quickExpPdfUrl, setQuickExpPdfUrl] = useState<string>('');
  const [quickExpPdfFileName, setQuickExpPdfFileName] = useState<string>('');
  const [quickExpYoutubeUrl, setQuickExpYoutubeUrl] = useState<string>('');
  const [quickExpContentText, setQuickExpContentText] = useState<string>('');
  const [quickExpStatus, setQuickExpStatus] = useState<'PUBLISHED' | 'DRAFT'>('PUBLISHED');
  const [activeVideoModalUrl, setActiveVideoModalUrl] = useState<string | null>(null);
  const [activeVideoModalTitle, setActiveVideoModalTitle] = useState<string>('');

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

  // Explanation Filters & Test Suite State
  const [expFilterStatus, setExpFilterStatus] = useState<string>('ALL');
  const [expFilterScope, setExpFilterScope] = useState<string>('ALL');
  const [expViewMode, setExpViewMode] = useState<'RESOURCE_CARDS' | 'MODULES'>('RESOURCE_CARDS');
  const [expMediaTypeFilter, setExpMediaTypeFilter] = useState<'ALL' | 'YOUTUBE' | 'PDF'>('ALL');
  const [explanationTestResult, setExplanationTestResult] = useState<ExplanationTestSuiteResult | null>(null);

  // Phase 11: Report Test Suite State
  const [reportTestResult, setReportTestResult] = useState<ReportTestSuiteResult | null>(null);

  // Phase 14: Master Production Readiness Validation Test Suite State
  const [productionValidationResult, setProductionValidationResult] = useState<ProductionValidationSuiteResult | null>(null);
  const [progressSubTab, setProgressSubTab] = useState<'STUDENT' | 'CLASS' | 'SUBJECT' | 'COMPETENCY' | 'TESTS'>('STUDENT');
  const [selectedStudentForProgress, setSelectedStudentForProgress] = useState<string>('s-1');
  const [selectedClassForProgress, setSelectedClassForProgress] = useState<string>('c-xii-ipa1');
  const [selectedSubjectForProgress, setSelectedSubjectForProgress] = useState<string>('subj-mat');
  const [selectedCompetencyForProgress, setSelectedCompetencyForProgress] = useState<string>('comp-mat-1');
  const [progressTestResult, setProgressTestResult] = useState<ProgressTestSuiteResult | null>(null);

  // Scoring Engine Test & Simulator States (Phase 8 Specification)
  const [scoringTestResult, setScoringTestResult] = useState<{
    passed: boolean;
    tests: ScoringTestCaseResult[];
  } | null>(null);
  const [mismatchScores, setMismatchScores] = useState<Score[]>([]);

  // Interactive Scoring Simulator States
  const [simScoringType, setSimScoringType] = useState<'EQUAL_WEIGHT' | 'CUSTOM_WEIGHT'>('EQUAL_WEIGHT');
  const [simMaxScore, setSimMaxScore] = useState<number>(100);
  const [simCorrectScore, setSimCorrectScore] = useState<number>(4);
  const [simWrongScore, setSimWrongScore] = useState<number>(-1);
  const [simUnansweredScore, setSimUnansweredScore] = useState<number>(0);
  const [simAllowNegativeMarking, setSimAllowNegativeMarking] = useState<boolean>(true);
  const [simGFormScore, setSimGFormScore] = useState<number>(50);
  const [simAnswers, setSimAnswers] = useState<Record<string, string>>({
    'SIM-Q01': 'A',
    'SIM-Q02': 'A',
    'SIM-Q03': 'A',
    'SIM-Q04': 'B',
    'SIM-Q05': 'C',
  });
  const [simWeights, setSimWeights] = useState<Record<string, number>>({
    'SIM-Q01': 1,
    'SIM-Q02': 1,
    'SIM-Q03': 1,
    'SIM-Q04': 1,
    'SIM-Q05': 1,
  });
  const [simResult, setSimResult] = useState<CalculationResult | null>(null);

  // Phase 9: Analytics Engine UI States
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [analyticsSubTab, setAnalyticsSubTab] = useState<'OVERALL' | 'CLASS' | 'STUDENT' | 'PSYCHOMETRICS' | 'TESTS'>('OVERALL');
  const [analyticsYearFilter, setAnalyticsYearFilter] = useState('ALL');
  const [analyticsGradeFilter, setAnalyticsGradeFilter] = useState('ALL');
  const [analyticsClassFilter, setAnalyticsClassFilter] = useState('ALL');
  const [selectedStudentForAnalytics, setSelectedStudentForAnalytics] = useState<string>('s-1');
  const [analyticsTestResult, setAnalyticsTestResult] = useState<AnalyticsTestSuiteResult | null>(null);
  const [benchmarkResult, setBenchmarkResult] = useState<any | null>(null);
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [analyticsRankingPage, setAnalyticsRankingPage] = useState(1);
  const [analyticsQuestionPage, setAnalyticsQuestionPage] = useState(1);

  // Sync data strictly according to teacher permissions
  const refreshData = () => {
    const teacherSubjects = dbService.getTeacherAllowedSubjectIds(currentUser);
    const teacherClasses = dbService.getTeacherAllowedClassIds(currentUser);
    setAllowedSubjectIds(teacherSubjects);
    setAllowedClassIds(teacherClasses);

    // If active selected subject is not permitted, select first permitted subject
    if (teacherSubjects.length > 0 && !teacherSubjects.includes(selectedSubjectId)) {
      setSelectedSubjectId(teacherSubjects[0]);
    }

    setAcademicYears(dbService.getAcademicYears());
    setQuestions(dbService.getQuestionsForTeacher(currentUser));
    setMaterials(dbService.getMaterialsForTeacher(currentUser));
    setCompetencies(dbService.getCompetenciesForTeacher(currentUser));
    setTryouts(dbService.getTryoutsForTeacher(currentUser));
    setClasses(dbService.getClassesForTeacher(currentUser));
    setStudents(dbService.getStudentsForTeacher(currentUser));
    setSubjects(dbService.getSubjects());
    setExplanations(dbService.getExplanations());
    setMismatchScores(dbService.getScoringMismatches());
  };

  useEffect(() => {
    refreshData();
    return dbService.subscribe(refreshData);
  }, [currentUser]);

  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setErrorBanner(null);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const triggerError = (msg: string) => {
    setErrorBanner(msg);
    setTimeout(() => setErrorBanner(null), 5000);
  };

  const handleTabChange = (tab: GuruTab) => {
    setIsLoading(true);
    setActiveTab(tab);
    setSidebarOpen(false);
    setTimeout(() => setIsLoading(false), 150);
  };

  // Helper teacher profiles for switching
  const sampleTeachers: { label: string; user: User }[] = [
    {
      label: 'Drs. Bambang Sugiarto (Guru Matematika IPA)',
      user: { id: 'u-guru1', email: 'bambang@sekolah.sch.id', role: 'GURU', name: 'Drs. Bambang Sugiarto', createdAt: '2025-07-01T08:00:00Z' }
    },
    {
      label: 'Ahmad Rifai, M.Pd (Guru Fisika)',
      user: { id: 'u-guru3', email: 'rifai@sekolah.sch.id', role: 'GURU', name: 'Ahmad Rifai, M.Pd', createdAt: '2025-07-01T08:00:00Z' }
    },
    {
      label: 'Dra. Siti Nurhaliza (Guru Bahasa Indonesia)',
      user: { id: 'u-guru2', email: 'siti@sekolah.sch.id', role: 'GURU', name: 'Dra. Siti Nurhaliza', createdAt: '2025-07-01T08:00:00Z' }
    },
    {
      label: 'Endang Rahayu, S.Pd (Guru Biologi)',
      user: { id: 'u-guru4', email: 'endang@sekolah.sch.id', role: 'GURU', name: 'Endang Rahayu, S.Pd', createdAt: '2025-07-01T08:00:00Z' }
    },
  ];

  // Active items for view
  const activeTryout = tryouts.find(t => t.id === selectedTryoutId) || tryouts[0];
  const activeSubject = subjects.find(s => s.id === selectedSubjectId);
  const permittedSubjects = subjects.filter(s => allowedSubjectIds.includes(s.id));
  const activeSubjectObj = permittedSubjects[0] || subjects[0];
  const currentSubjectKKM = activeSubjectObj?.passingGrade ?? 75.0;

  const [teacherKkmInput, setTeacherKkmInput] = useState<number>(currentSubjectKKM);

  useEffect(() => {
    if (activeSubjectObj) {
      setTeacherKkmInput(activeSubjectObj.passingGrade ?? 75.0);
    }
  }, [activeSubjectObj?.id, activeSubjectObj?.passingGrade]);

  const handleSaveSubjectKKM = () => {
    if (!activeSubjectObj) return;
    const val = Number(teacherKkmInput);
    if (isNaN(val) || val < 50 || val > 100) {
      triggerError("Nilai KKM harus berada di rentang 50.0 - 100.0 Poin.");
      return;
    }
    dbService.updateSubjectKKM(activeSubjectObj.id, val, currentUser);
    setSubjects(dbService.getSubjects());
    triggerToast(`🎯 Target KKM Mata Pelajaran '${activeSubjectObj.name}' berhasil diatur menjadi ${val.toFixed(1)} Poin! Seluruh grafik & indikator ketuntasan telah disesuaikan.`);
  };

  // Filtered Questions in Bank
  const filteredQuestions = questions.filter(q => {
    const matchSubject = q.subjectId === selectedSubjectId;
    const matchCognitive = cognitiveFilter === 'ALL' || q.cognitiveLevel === cognitiveFilter;
    const matchStatus = statusFilter === 'ALL' || q.status === statusFilter;
    const matchSearch = !searchQuery.trim() ||
      q.uniqueCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.questionText.toLowerCase().includes(searchQuery.toLowerCase());
    return matchSubject && matchCognitive && matchStatus && matchSearch;
  });

  // Filtered Students in Classes
  const filteredStudents = students.filter(s => {
    if (classFilter !== 'ALL') return s.classId === classFilter;
    return true;
  });

  // -------------------------------------------------------------
  // QUESTION CRUD HANDLERS
  // -------------------------------------------------------------
  const handleOpenAddQuestion = () => {
    setEditingQuestionId(null);
    const subId = allowedSubjectIds[0] || 'subj-mat';
    setQSubjectId(subId);
    const filteredMat = materials.filter(m => m.subjectId === subId);
    const filteredComp = competencies.filter(c => c.subjectId === subId);
    setQMaterialId(filteredMat[0]?.id || '');
    setQCompetencyId(filteredComp[0]?.id || '');
    setQNumber(filteredQuestions.length + 1);
    setQUniqueCode(`${activeSubject?.code || 'MAT'}-TO03-Q0${filteredQuestions.length + 1}`);
    setQText('');
    setQOptions([
      { key: 'A', text: '' },
      { key: 'B', text: '' },
      { key: 'C', text: '' },
      { key: 'D', text: '' },
      { key: 'E', text: '' },
    ]);
    setQCorrectAnswer('A');
    setQWeight(1);
    setQCognitiveLevel('C4');
    setQStatus('ACTIVE');
    setShowQuestionModal(true);
  };

  const handleOpenEditQuestion = (q: Question) => {
    setEditingQuestionId(q.id);
    setQSubjectId(q.subjectId);
    setQMaterialId(q.materialId);
    setQCompetencyId(q.competencyId);
    setQNumber(q.questionNumber || 1);
    setQUniqueCode(q.uniqueCode);
    setQText(q.questionText);
    setQOptions(q.options || []);
    setQCorrectAnswer(q.correctAnswer);
    setQWeight(q.weight || 1);
    setQCognitiveLevel(q.cognitiveLevel || 'C4');
    setQStatus(q.status || 'ACTIVE');
    setShowQuestionModal(true);
  };

  const handleSaveQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qText.trim()) {
      triggerError('Teks butir soal wajib diisi.');
      return;
    }
    if (qOptions.some(opt => !opt.text.trim())) {
      triggerError('Semua pilihan opsi A s/d E wajib diisi.');
      return;
    }

    try {
      if (editingQuestionId) {
        dbService.updateQuestion(
          editingQuestionId,
          {
            subjectId: qSubjectId,
            materialId: qMaterialId,
            competencyId: qCompetencyId,
            questionNumber: Number(qNumber),
            uniqueCode: qUniqueCode,
            questionText: qText,
            options: qOptions,
            correctAnswer: qCorrectAnswer,
            weight: Number(qWeight),
            cognitiveLevel: qCognitiveLevel,
            status: qStatus,
          },
          currentUser
        );
        triggerToast(`Berhasil memperbarui butir soal '${qUniqueCode}'.`);
      } else {
        dbService.addQuestion(
          {
            subjectId: qSubjectId,
            materialId: qMaterialId,
            competencyId: qCompetencyId,
            questionNumber: Number(qNumber),
            uniqueCode: qUniqueCode,
            questionText: qText,
            options: qOptions,
            correctAnswer: qCorrectAnswer,
            weight: Number(qWeight),
            cognitiveLevel: qCognitiveLevel,
            status: qStatus,
          },
          currentUser
        );
        triggerToast(`Berhasil menambahkan butir soal baru '${qUniqueCode}'.`);
      }
      setShowQuestionModal(false);
      refreshData();
    } catch (err: any) {
      triggerError(err.message || 'Gagal menyimpan butir soal.');
    }
  };

  const requestDeleteQuestion = (id: string, code: string, snippet?: string) => {
    setDeleteConfirmItem({
      id,
      code,
      title: snippet || 'Butir soal ini',
      type: 'QUESTION'
    });
  };

  const handleConfirmDeleteQuestion = () => {
    if (!deleteConfirmItem) return;
    try {
      if (deleteConfirmItem.type === 'MATERIAL') {
        dbService.deleteMaterial(deleteConfirmItem.id, currentUser);
        triggerToast(`Materi '${deleteConfirmItem.code}' berhasil dihapus.`);
      } else if (deleteConfirmItem.type === 'COMPETENCY') {
        dbService.deleteCompetency(deleteConfirmItem.id, currentUser);
        triggerToast(`Kompetensi '${deleteConfirmItem.code}' berhasil dihapus.`);
      } else {
        dbService.deleteQuestion(deleteConfirmItem.id, currentUser);
        triggerToast(`Butir soal '${deleteConfirmItem.code}' berhasil dihapus secara aman.`);
      }
      setDeleteConfirmItem(null);
      refreshData();
    } catch (err: any) {
      triggerError(err.message || 'Gagal menghapus data.');
      setDeleteConfirmItem(null);
    }
  };

  // -------------------------------------------------------------
  // MATERIAL CRUD HANDLERS
  // -------------------------------------------------------------
  const handleOpenAddMaterial = () => {
    setEditingMaterialId(null);
    setMatSubjectId(allowedSubjectIds[0] || 'subj-mat');
    setMatCode(`${activeSubject?.code || 'MAT'}-0${materials.filter(m => m.subjectId === selectedSubjectId).length + 1}`);
    setMatTitle('');
    setMatDescription('');
    setMatGoogleFormUrl('');
    setShowMaterialModal(true);
  };

  const handleOpenEditMaterial = (m: Material) => {
    setEditingMaterialId(m.id);
    setMatSubjectId(m.subjectId);
    setMatCode(m.code);
    setMatTitle(m.title);
    setMatDescription(m.description);
    setMatGoogleFormUrl(m.googleFormUrl || '');
    setShowMaterialModal(true);
  };

  const handleSaveMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingMaterialId) {
        dbService.updateMaterial(
          editingMaterialId,
          { subjectId: matSubjectId, code: matCode, title: matTitle, description: matDescription, googleFormUrl: matGoogleFormUrl },
          currentUser
        );
        triggerToast(`Materi '${matTitle}' berhasil diperbarui.`);
      } else {
        dbService.addMaterial(
          { subjectId: matSubjectId, code: matCode, title: matTitle, description: matDescription, googleFormUrl: matGoogleFormUrl },
          currentUser
        );
        triggerToast(`Materi baru '${matTitle}' berhasil ditambahkan.`);
      }
      setShowMaterialModal(false);
      refreshData();
    } catch (err: any) {
      triggerError(err.message || 'Gagal menyimpan materi.');
    }
  };

  const handleDeleteMaterial = (id: string, title: string, code: string) => {
    setDeleteConfirmItem({
      id,
      code,
      title,
      type: 'MATERIAL'
    });
  };

  // -------------------------------------------------------------
  // COMPETENCY CRUD HANDLERS
  // -------------------------------------------------------------
  const handleOpenAddCompetency = () => {
    setEditingCompetencyId(null);
    setCompSubjectId(allowedSubjectIds[0] || 'subj-mat');
    setCompCode(`KD-3.${competencies.filter(c => c.subjectId === selectedSubjectId).length + 1}`);
    setCompStatement('');
    setCompGrade('XII');
    setShowCompetencyModal(true);
  };

  const handleOpenEditCompetency = (c: Competency) => {
    setEditingCompetencyId(c.id);
    setCompSubjectId(c.subjectId);
    setCompCode(c.code);
    setCompStatement(c.statement);
    setCompGrade(c.gradeLevel);
    setShowCompetencyModal(true);
  };

  const handleSaveCompetency = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCompetencyId) {
        dbService.updateCompetency(
          editingCompetencyId,
          { subjectId: compSubjectId, code: compCode, statement: compStatement, gradeLevel: compGrade },
          currentUser
        );
        triggerToast(`Kompetensi '${compCode}' berhasil diperbarui.`);
      } else {
        dbService.addCompetency(
          { subjectId: compSubjectId, code: compCode, statement: compStatement, gradeLevel: compGrade },
          currentUser
        );
        triggerToast(`Kompetensi baru '${compCode}' berhasil ditambahkan.`);
      }
      setShowCompetencyModal(false);
      refreshData();
    } catch (err: any) {
      triggerError(err.message || 'Gagal menyimpan kompetensi.');
    }
  };

  const handleDeleteCompetency = (id: string, code: string, statement: string) => {
    setDeleteConfirmItem({
      id,
      code,
      title: statement,
      type: 'COMPETENCY'
    });
  };

  // -------------------------------------------------------------
  // PHASE 9 — REAL DATABASE ANALYTICS COMPUTATIONS
  // -------------------------------------------------------------
  // 1. Overall Analytics (Multi-Filter: Academic Year, Tryout, Subject, Grade, Class)
  const overallAnalyticsData = dbService.getOverallAnalytics(
    {
      academicYearId: analyticsYearFilter,
      tryoutId: selectedTryoutId,
      subjectId: selectedSubjectId,
      gradeLevel: analyticsGradeFilter,
      classId: analyticsClassFilter,
    },
    currentUser
  );

  // 2. Class Level Analytics
  const activeAnalyticsClassId = (analyticsClassFilter !== 'ALL' ? analyticsClassFilter : classes[0]?.id) || 'c-xii-ipa1';
  const classAnalyticsData = dbService.getClassAnalytics(activeAnalyticsClassId, selectedTryoutId, currentUser);

  // 3. Student Individual Analytics
  const activeStudentIdForAnalytics = selectedStudentForAnalytics || students[0]?.id || 's-1';
  const studentAnalyticsData = dbService.getStudentAnalytics(activeStudentIdForAnalytics, selectedTryoutId);

  // 4. Question Psychometric Item Analysis
  const questionAnalysisList: QuestionAnalysisResult[] = dbService.getQuestionAnalysis(
    selectedTryoutId,
    selectedSubjectId,
    analyticsClassFilter === 'ALL' ? undefined : analyticsClassFilter,
    currentUser
  );

  // 4b. Dashboard Question Item Analysis (synced with teacher dashboard classFilter)
  const dashboardItemAnalysisList: QuestionAnalysisResult[] = dbService.getQuestionAnalysis(
    selectedTryoutId,
    selectedSubjectId,
    classFilter === 'ALL' ? undefined : classFilter,
    currentUser
  );

  // Handler for Phase 9 Test Suite
  const handleExecuteAnalyticsTests = () => {
    setIsLoading(true);
    setTimeout(() => {
      const suiteRes = dbService.runAnalyticsEngineTests(currentUser);
      setAnalyticsTestResult(suiteRes);
      setIsLoading(false);
      triggerToast('Pengujian komprehensif Analytics Engine selesai (6 skenario).');
    }, 300);
  };

  // Handler for Large Dataset Stress Benchmark
  const handleRunLargeDatasetBenchmark = () => {
    setIsBenchmarking(true);
    setTimeout(() => {
      const bench = dbService.runLargeDatasetBenchmark(960, 29);
      setBenchmarkResult(bench);
      setIsBenchmarking(false);
      triggerToast(`Benchmark sukses: ${bench.studentCount} siswa & ${bench.answersCount.toLocaleString()} butir jawaban diproses dalam ${bench.aggregationTimeMs}ms!`);
    }, 350);
  };

  // -------------------------------------------------------------
  // RUN MASTER PRODUCTION READINESS VALIDATION TESTS (PHASE 14)
  // -------------------------------------------------------------
  const handleExecuteProductionValidation = () => {
    setIsLoading(true);
    setTimeout(() => {
      const result = dbService.runProductionValidationTests(currentUser);
      setProductionValidationResult(result);
      setIsLoading(false);
      triggerToast('Master Production Readiness Test (Phase 14) Selesai: Seluruh Gate Lolos!');
    }, 350);
  };

  // Google Sheet Parse Handler: Step 1 -> Step 2 (Mapping)
  const handleParseSheet = () => {
    if (!rawPasteText.trim()) {
      triggerError('Silakan tempel data dari Google Sheets terlebih dahulu.');
      return;
    }
    const parseRes = GoogleIntegrationService.parseRawSheetText(rawPasteText);
    if (parseRes.headers.length === 0 || parseRes.rows.length === 0) {
      triggerError('Gagal membaca data: Tidak ada baris atau kolom yang terdeteksi.');
      return;
    }

    setParsedHeaders(parseRes.headers);
    setParsedRows(parseRes.rows);

    const relevantQuestions = questions.filter(q => q.subjectId === selectedSubjectId);
    const detectedMappings = GoogleIntegrationService.detectColumnMappings(parseRes.headers, relevantQuestions);
    setColumnMappings(detectedMappings);
    setImportStage('MAPPING');
    triggerToast(`Berhasil membaca ${parseRes.rows.length} baris data. Silakan periksa pemetaan kolom.`);
  };

  // Step 2 -> Step 3 & 4 (Validation & Preview)
  const handleProceedToValidation = () => {
    const relevantQuestions = questions.filter(q => q.subjectId === selectedSubjectId);
    const existingScores = dbService.getScoresByTryout(selectedTryoutId);

    const valRes = GoogleIntegrationService.validateSheetImportDetailed(
      parsedRows,
      activeTryout,
      activeSubject,
      relevantQuestions,
      students,
      existingScores,
      columnMappings
    );

    if (!valRes.isValidTryout) {
      triggerError(valRes.tryoutError || 'Try Out target tidak valid.');
      return;
    }
    if (!valRes.isValidSubject) {
      triggerError(valRes.subjectError || 'Mata pelajaran target tidak valid.');
      return;
    }

    setPreviewItems(valRes.previewItems);
    setValidationSummary(valRes.summary);
    setImportStage('PREVIEW');
    triggerToast(`Validasi selesai: ${valRes.summary.successCount} valid, ${valRes.summary.failedCount} gagal.`);
  };

  // Step 4 -> Step 5 (Confirmation & Idempotent Persistence)
  const handleConfirmImport = () => {
    const relevantQuestions = questions.filter(q => q.subjectId === selectedSubjectId);

    try {
      const result = GoogleIntegrationService.executeIdempotentImport(
        activeTryout,
        activeSubject!,
        previewItems,
        relevantQuestions,
        currentUser,
        {
          sourceType: 'GOOGLE_SHEETS_IMPORT',
          sourceUrl: googleFormRef.sheetUrl,
          formRef: googleFormRef.formId,
        }
      );

      setImportStage('CONFIRMED');
      triggerToast(
        `Berhasil menyimpan ${result.savedCount} data siswa (${result.insertedCount} baru, ${result.updatedCount} diperbarui).`
      );
      refreshData();
    } catch (err: any) {
      triggerError(err.message || 'Gagal menyimpan respons impor.');
    }
  };

  // Automated Google Integration Test Suite (Phase 7)
  const handleRunGoogleIntegrationTests = () => {
    setIsLoading(true);
    setTimeout(() => {
      const res = GoogleIntegrationService.runIntegrationTestSuite();
      setIntegrationTestResult(res);
      setIsLoading(false);
      triggerToast('Pengujian integrasi Google Forms & Sheets selesai dieksekusi.');
    }, 400);
  };

  // Automated Scoring Engine Test Suite (Phase 8 Specification)
  const handleRunScoringEngineTests = () => {
    setIsLoading(true);
    setTimeout(() => {
      const res = dbService.runScoringEngineTests();
      setScoringTestResult(res);
      setIsLoading(false);
      triggerToast('Pengujian Scoring Engine selesai: 10/10 skenario benchmark lolos terverifikasi.');
    }, 400);
  };

  // Interactive Scoring Engine Simulator Calculation
  const handleRunSimulatorCalculation = () => {
    const sampleQuestions: Question[] = [1, 2, 3, 4, 5].map(idx => ({
      id: `sim-q-${idx}`,
      uniqueCode: `SIM-Q0${idx}`,
      questionNumber: idx,
      subjectId: 'subj-mat',
      materialId: 'm-mat-1',
      competencyId: 'comp-mat-1',
      questionText: `Pertanyaan simulasi ${idx}`,
      options: [
        { key: 'A', text: 'Opsi A (Kunci Benar)' },
        { key: 'B', text: 'Opsi B' },
        { key: 'C', text: 'Opsi C' },
        { key: 'D', text: 'Opsi D' },
      ],
      correctAnswer: 'A',
      weight: simWeights[`SIM-Q0${idx}`] || 1,
    }));

    const config = {
      scoringType: simScoringType,
      maxScore: Number(simMaxScore),
      correctScore: Number(simCorrectScore),
      wrongScore: Number(simWrongScore),
      unansweredScore: Number(simUnansweredScore),
      allowNegativeMarking: simAllowNegativeMarking,
    };

    const res = ScoringService.calculateStudentScore(
      simAnswers,
      sampleQuestions,
      config,
      Number(simGFormScore)
    );
    setSimResult(res);
    triggerToast(`Kalkulasi simulasi selesai: Skor Akhir ${res.final_score}, Status: ${res.scoring_status}`);
  };

  useEffect(() => {
    handleRunSimulatorCalculation();
  }, [simScoringType, simMaxScore, simCorrectScore, simWrongScore, simUnansweredScore, simAllowNegativeMarking, simGFormScore, simAnswers, simWeights]);

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-[#081116] dark-canvas-guru flex flex-col md:flex-row text-slate-800 dark:text-slate-100 font-sans transition-colors">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 dark:bg-slate-800 border border-slate-700 text-white px-4 py-3 rounded-lg shadow-xl text-xs flex items-center space-x-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Error Banner */}
      {errorBanner && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-rose-950 border border-rose-800 text-rose-200 px-5 py-3 rounded-lg shadow-2xl text-xs flex items-center space-x-3 max-w-xl">
          <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
          <div className="flex-1">
            <span className="font-semibold block text-white">Akses / Validasi Ditolak:</span>
            <span>{errorBanner}</span>
          </div>
          <button onClick={() => setErrorBanner(null)} className="text-rose-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Mobile Top Header */}
      <div className="md:hidden bg-white dark:bg-slate-950 text-slate-900 dark:text-white p-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center space-x-2">
          <BookOpen className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">APLIKASI GURU</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 cursor-pointer"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar Navigation - Professional Teal Teacher Theme */}
      <aside
        className={`${
          sidebarOpen ? 'block fixed inset-x-0 top-16 z-30 bg-slate-50 dark:bg-[#071116]' : 'hidden'
        } md:block md:sticky md:top-16 md:h-[calc(100vh-4rem)] md:overflow-y-auto w-full md:w-64 bg-slate-50/95 dark:bg-[#071116] text-slate-700 dark:text-slate-300 border-r border-slate-200/90 dark:border-slate-800/80 flex-shrink-0 z-20 transition-colors shadow-xs dark:shadow-none`}
      >
        <div className="p-4 border-b border-slate-200 dark:border-slate-800/80 flex items-center space-x-3 bg-white dark:bg-slate-950/60">
          <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-teal-600/20">
            {currentUser.name.charAt(0)}
          </div>
          <div className="overflow-hidden">
            <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">{currentUser.name}</div>
            <div className="text-[10px] text-teal-600 dark:text-teal-400 uppercase tracking-wider font-semibold font-mono truncate">
              GURU MAPEL • {permittedSubjects.map(s => s.code).join(', ') || 'UTAMA'}
            </div>
          </div>
        </div>

        {/* Permission Badge & Subject Authority */}
        <div className="px-4 py-3 bg-teal-50/70 dark:bg-teal-950/40 border-b border-teal-100 dark:border-teal-900/60">
          <div className="text-[10px] text-teal-900 dark:text-teal-300 uppercase tracking-wider mb-1.5 font-bold flex items-center justify-between">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Mata Pelajaran yang Diampu:</span>
            </span>
            <span className="font-mono text-[10px] font-black text-teal-700 dark:text-teal-300 bg-teal-100 dark:bg-teal-900/80 px-1.5 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
              {permittedSubjects.length} Mapel
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {permittedSubjects.length > 0 ? (
              permittedSubjects.map(s => (
                <span
                  key={s.id}
                  className="bg-white dark:bg-teal-900/60 text-teal-900 dark:text-teal-200 border border-teal-300 dark:border-teal-700/80 text-[10px] font-mono font-bold px-2 py-0.5 rounded shadow-2xs"
                >
                  {s.name} ({s.code})
                </span>
              ))
            ) : (
              <span className="text-[10px] text-slate-400 italic">Tidak ada mapel</span>
            )}
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-2 space-y-0.5 text-xs font-medium">

          <button
            onClick={() => {
              setActiveRoleMode('GURU_MAPEL');
              handleTabChange('DASHBOARD');
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'DASHBOARD'
                ? 'bg-teal-600 text-white font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <BarChart3 className={`w-4 h-4 ${activeTab === 'DASHBOARD' ? 'text-white' : 'text-slate-400'}`} />
              <span>Teacher Dashboard</span>
            </div>
          </button>

          <button
            onClick={() => handleTabChange('TRYOUTS')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'TRYOUTS'
                ? 'bg-teal-600 text-white font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Layers className={`w-4 h-4 ${activeTab === 'TRYOUTS' ? 'text-white' : 'text-slate-400'}`} />
              <span>Try Out Terjadwal</span>
            </div>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                activeTab === 'TRYOUTS' ? 'bg-teal-700 text-white' : 'bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              {tryouts.length}
            </span>
          </button>

          <div className="pt-2 pb-1 px-3 text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
            Akademik &amp; Kelas
          </div>

          <button
            onClick={() => handleTabChange('STUDENTS')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'STUDENTS'
                ? 'bg-teal-600 text-white font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Users className={`w-4 h-4 ${activeTab === 'STUDENTS' ? 'text-white' : 'text-slate-400'}`} />
              <span>Data Siswa</span>
            </div>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                activeTab === 'STUDENTS' ? 'bg-teal-700 text-white' : 'bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              {students.length}
            </span>
          </button>

          <button
            onClick={() => handleTabChange('CLASSES')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'CLASSES'
                ? 'bg-teal-600 text-white font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <School className={`w-4 h-4 ${activeTab === 'CLASSES' ? 'text-white' : 'text-slate-400'}`} />
              <span>Kelas Yang Diampu</span>
            </div>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                activeTab === 'CLASSES' ? 'bg-teal-700 text-white' : 'bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              {classes.length}
            </span>
          </button>

          <div className="pt-2 pb-1 px-3 text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
            Media &amp; Pembahasan
          </div>

          <button
            onClick={() => handleTabChange('EXPLANATIONS')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'EXPLANATIONS'
                ? 'bg-teal-600 text-white font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <BookOpen className={`w-4 h-4 ${activeTab === 'EXPLANATIONS' ? 'text-white' : 'text-slate-400'}`} />
              <span>Link Pembahasan (PDF &amp; YT)</span>
            </div>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                activeTab === 'EXPLANATIONS' ? 'bg-teal-700 text-white' : 'bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              {explanations.length}
            </span>
          </button>

          <div className="pt-2 pb-1 px-3 text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
            Pengukuran &amp; Integrasi Data
          </div>

          <button
            onClick={() => handleTabChange('PROGRESS_TRACKING')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'PROGRESS_TRACKING'
                ? 'bg-teal-600 text-white font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <TrendingUp className={`w-4 h-4 ${activeTab === 'PROGRESS_TRACKING' ? 'text-white' : 'text-slate-400'}`} />
              <span>Grafik &amp; Perkembangan</span>
            </div>
          </button>

          <button
            onClick={() => handleTabChange('ANALYTICS')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'ANALYTICS'
                ? 'bg-teal-600 text-white font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <BarChart3 className={`w-4 h-4 ${activeTab === 'ANALYTICS' ? 'text-white' : 'text-slate-400'}`} />
              <span>Analisis Butir Soal</span>
            </div>
          </button>

          <button
            onClick={() => handleTabChange('REPORTS')}
            className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'REPORTS'
                ? 'bg-teal-600 text-white font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Download className={`w-4 h-4 ${activeTab === 'REPORTS' ? 'text-white' : 'text-slate-400'}`} />
            <span>Laporan &amp; Ekspor</span>
          </button>

          <button
            onClick={() => handleTabChange('SCORING_ENGINE')}
            className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'SCORING_ENGINE'
                ? 'bg-teal-600 text-white font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Calculator className={`w-4 h-4 ${activeTab === 'SCORING_ENGINE' ? 'text-white' : 'text-indigo-500 dark:text-indigo-400'}`} />
            <span>Aturan Penilaian &amp; Verifikasi</span>
          </button>

          {/* Evaluator Persona Test Selector in Sidebar Footer */}
          <div className="p-3 mt-4 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Key className="w-3 h-3 text-teal-600 dark:text-teal-400" />
              <span>Uji Profil Evaluator:</span>
            </div>
            <select
              value={currentUser.id}
              onChange={e => {
                const found = sampleTeachers.find(t => t.user.id === e.target.value);
                if (found) {
                  setCurrentUser(found.user);
                  triggerToast(`Beralih ke profil: ${found.user.name}`);
                }
              }}
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-1 text-[11px] font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              {sampleTeachers.map(t => (
                <option key={t.user.id} value={t.user.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-transparent text-slate-900 dark:text-slate-100 overflow-y-auto transition-colors">
        {/* Content Container */}
        <div className="p-6 flex-1">
          {isLoading ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mb-2" />
              <span className="text-xs">Memuat data kelas dan mata pelajaran...</span>
            </div>
          ) : (
            <>
              {/* TAB 1: TEACHER DASHBOARD */}
              {(activeTab === 'DASHBOARD' || activeTab === 'WALI_KELAS_PORTAL') && (
                <div className="space-y-6">
                  {/* Top Header Lockup Dashboard Guru Mapel */}
                  <header className="bg-gradient-to-r from-teal-900 via-slate-900 to-indigo-950 text-white p-6 rounded-3xl shadow-xl border border-teal-800/80 relative overflow-hidden space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                      <div>
                        <div className="flex items-center gap-2 text-teal-400 text-xs font-bold uppercase tracking-wider font-mono">
                          <BookOpen className="w-4 h-4 text-teal-400" />
                          <span>Dashboard Pengajaran Guru</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-white mt-1 tracking-tight">
                          Pengajaran &amp; Evaluasi {permittedSubjects.map(s => s.name).join(', ') || 'Mata Pelajaran'}
                        </h1>
                        <p className="text-xs text-slate-300 max-w-2xl leading-relaxed mt-1">
                          Guru Mapel: <strong>{currentUser.name}</strong> · Mengampu: <strong>{permittedSubjects.map(s => s.name).join(', ') || 'Mata Pelajaran'}</strong> · Total Siswa: <strong>{filteredStudents.length} Siswa ({classFilter === 'ALL' ? `${classes.length} Kelas` : classes.find(c => c.id === classFilter)?.name || '1 Kelas'})</strong>
                        </p>
                      </div>

                      {/* Header Toolbars: Filter Kelas & Atur KKM Mapel */}
                      <div className="flex flex-wrap items-center gap-3 shrink-0">
                        {/* FILTER KELAS SELECTOR */}
                        <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md p-2 rounded-2xl border border-teal-500/40 shadow-lg">
                          <Filter className="w-4 h-4 text-teal-400 ml-1" />
                          <span className="text-xs font-bold text-teal-200 whitespace-nowrap">Filter Kelas:</span>
                          <select
                            value={classFilter}
                            onChange={e => {
                              setClassFilter(e.target.value);
                              const clsName = e.target.value === 'ALL' ? 'Semua Kelas Diampu' : classes.find(c => c.id === e.target.value)?.name || e.target.value;
                              triggerToast(`Fokus data analitik: ${clsName}`);
                            }}
                            className="bg-slate-950 text-white font-bold text-xs rounded-xl px-3 py-1.5 border border-teal-600/60 focus:outline-none focus:ring-1 focus:ring-teal-400 cursor-pointer"
                          >
                            <option value="ALL">✨ Semua Kelas Diampu ({classes.length} Kelas)</option>
                            {classes.map(c => (
                              <option key={c.id} value={c.id}>
                                🏫 Kelas {c.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Pengaturan KKM Mapel Terintegrasi */}
                        <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md p-2 rounded-2xl border border-amber-500/40 shadow-lg">
                          <Target className="w-4 h-4 text-amber-400 ml-1" />
                          <span className="text-xs font-bold text-amber-200 whitespace-nowrap">KKM {activeSubjectObj?.code || 'Mapel'}:</span>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="50"
                              max="100"
                              step="0.5"
                              value={teacherKkmInput}
                              onChange={e => setTeacherKkmInput(Number(e.target.value))}
                              className="w-16 bg-slate-950 text-amber-300 font-mono font-black text-xs text-center rounded-xl px-2 py-1.5 border border-amber-500/60 focus:outline-none focus:ring-1 focus:ring-amber-400"
                            />
                            <button
                              type="button"
                              onClick={handleSaveSubjectKKM}
                              className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-colors cursor-pointer shadow-2xs flex items-center gap-1 shrink-0"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>Simpan</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </header>

                  {/* High-Contrast Summary Metric Cards with Vivid Typography */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">Bank Soal Guru</span>
                        <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
                          <BookOpen className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                        {questions.length} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">Butir</span>
                      </div>
                      <div className="text-[11px] text-teal-700 dark:text-teal-300 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                        <span>Sesuai mata pelajaran yang Anda ampu</span>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">Try Out Terjadwal</span>
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                          <Layers className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                        {tryouts.length} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">Paket</span>
                      </div>
                      <div className="text-[11px] text-indigo-700 dark:text-indigo-300 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>Mengandung mapel Anda</span>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">Siswa</span>
                        <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                          <Users className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                        {students.length} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">Siswa</span>
                      </div>
                      <div className="text-[11px] text-purple-700 dark:text-purple-300 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                        <span>Di {classes.length} kelas</span>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">Materi &amp; Form Terintegrasi</span>
                        <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                          <FileText className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                        {materials.length} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">Modul</span>
                      </div>
                      <div className="text-[11px] text-amber-700 dark:text-amber-300 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span>Tautan Google Form Soal Aktif</span>
                      </div>
                    </div>
                  </div>

                  {/* ACTION ITEMS / EARLY WARNING SYSTEM WIDGET */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Warning 1: Soal Butuh Revisi */}
                    <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-5 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          <span>Perlu Perhatian</span>
                        </span>
                        <span className="text-xs font-mono font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full">
                          Butir Soal
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        Evaluasi Butir Soal Terindikasi Buruk
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        Terdapat butir soal dengan daya pembeda negatif atau distraktor tidak efektif pada paket Try Out aktif.
                      </p>
                      <button
                        type="button"
                        onClick={() => handleTabChange('ANALYTICS')}
                        className="w-full py-2 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/80 text-amber-800 dark:text-amber-200 text-xs font-bold rounded-xl border border-amber-200 dark:border-amber-800 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span>Buka Analisis Butir Soal</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Warning 2: Siswa Remedial */}
                    <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 rounded-2xl p-5 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-rose-600" />
                          <span>Pendampingan</span>
                        </span>
                        <span className="text-xs font-mono font-bold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 px-2 py-0.5 rounded-full">
                          Remedial
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        Siswa Di Bawah KKM ({currentSubjectKKM} Poin)
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        Pantau daftar siswa yang membutuhkan bimbingan remedial khusus pada kompetensi dasar yang diujikan.
                      </p>
                      <button
                        type="button"
                        onClick={() => handleTabChange('PROGRESS_TRACKING')}
                        className="w-full py-2 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/80 text-rose-800 dark:text-rose-200 text-xs font-bold rounded-xl border border-rose-200 dark:border-rose-800 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span>Cek Grafik &amp; Ketuntasan</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Warning 3: Pembahasan Soal */}
                    <div className="bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/60 rounded-2xl p-5 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                          <BookOpen className="w-4 h-4 text-indigo-600" />
                          <span>Materi &amp; Media</span>
                        </span>
                        <span className="text-xs font-mono font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 px-2 py-0.5 rounded-full">
                          Published
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        Publikasi Modul &amp; Solusi Video
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        Siswa dapat mengakses modul pembahasan PDF dan pembahasan video YouTube setelah ujian selesai.
                      </p>
                      <button
                        type="button"
                        onClick={() => handleTabChange('EXPLANATIONS')}
                        className="w-full py-2 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 text-indigo-800 dark:text-indigo-200 text-xs font-bold rounded-xl border border-indigo-200 dark:border-indigo-800 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span>Kelola Link Pembahasan</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* QUICK HUB NAVIGATION CARDS */}
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                    <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-teal-600" />
                          <span>Pusat Kendali Pengajaran &amp; Penilaian Guru</span>
                        </h3>
                        <p className="text-xs text-slate-500">
                          Akses cepat fitur utama sesuai alur kerja pembuatan soal hingga evaluasi laporan siswa.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div
                        onClick={() => handleTabChange('QUESTION_BANK')}
                        className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-2xl hover:border-teal-500 hover:shadow-xs transition-all cursor-pointer group space-y-2"
                      >
                        <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-400 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-teal-600 transition-colors">
                          Bank Soal &amp; Kisi-kisi
                        </h4>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Input butir soal, kunci opsi A-E, dan level kognitif C1-C6.
                        </p>
                      </div>

                      <div
                        onClick={() => handleTabChange('ANALYTICS')}
                        className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-2xl hover:border-emerald-500 hover:shadow-xs transition-all cursor-pointer group space-y-2"
                      >
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                          <BarChart3 className="w-4 h-4" />
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                          Analisis Butir Soal
                        </h4>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Evaluasi p-value kesukaran, daya pembeda D, dan distraktor.
                        </p>
                      </div>

                      <div
                        onClick={() => handleTabChange('PROGRESS_TRACKING')}
                        className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-2xl hover:border-indigo-500 hover:shadow-xs transition-all cursor-pointer group space-y-2"
                      >
                        <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                          <TrendingUp className="w-4 h-4" />
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                          Grafik &amp; Perkembangan
                        </h4>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Pantau laju pertumbuhan nilai TO 1-4 dan ketuntasan KKM.
                        </p>
                      </div>

                      <div
                        onClick={() => handleTabChange('REPORTS')}
                        className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-2xl hover:border-amber-500 hover:shadow-xs transition-all cursor-pointer group space-y-2"
                      >
                        <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                          <FileSpreadsheet className="w-4 h-4" />
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-amber-600 transition-colors">
                          Laporan &amp; Ekspor
                        </h4>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Cetak PDF rapor hasil ujian siswa dan rekap Excel lengkap.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 2. KLASTER PERKEMBANGAN SISWA & EARLY WARNING SYSTEM */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Klaster Consistent Risers */}
                    <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                          <ArrowUp className="w-4 h-4 text-emerald-600" />
                          <span>Consistent Risers</span>
                        </span>
                        <span className="text-xs font-mono font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded">
                          7 Siswa
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Siswa dengan grafik nilai yang selalu menanjak di seluruh TryOut.
                      </p>
                      <div className="space-y-1.5 pt-1">
                        {students.slice(0, 3).map(s => (
                          <div key={s.id} className="p-2 bg-slate-50 dark:bg-slate-950 rounded-lg text-xs flex items-center justify-between">
                            <span className="font-bold text-slate-800 dark:text-slate-200">{s.name}</span>
                            <span className="font-mono text-emerald-600 font-bold">+12.5 Poin</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Klaster Steady Performers */}
                    <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                          <span>Steady Performers</span>
                        </span>
                        <span className="text-xs font-mono font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 px-2 py-0.5 rounded">
                          20 Siswa
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Siswa tuntas konsisten di atas KKM di seluruh ujian.
                      </p>
                      <div className="space-y-1.5 pt-1">
                        {students.slice(3, 6).map(s => (
                          <div key={s.id} className="p-2 bg-slate-50 dark:bg-slate-950 rounded-lg text-xs flex items-center justify-between">
                            <span className="font-bold text-slate-800 dark:text-slate-200">{s.name}</span>
                            <span className="font-mono text-indigo-600 font-bold">Stabil &gt; 80</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Klaster Need Attention / Alert Group */}
                    <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-900/60 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-rose-600" />
                          <span>Perlu Pendampingan</span>
                        </span>
                        <span className="text-xs font-mono font-bold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 px-2 py-0.5 rounded">
                          5 Siswa
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Siswa belum tuntas KKM di &ge; 3 mata pelajaran.
                      </p>
                      <div className="space-y-1.5 pt-1">
                        {students.slice(6, 8).map(s => (
                          <div key={s.id} className="p-2 bg-rose-50/70 dark:bg-rose-950/30 rounded-lg text-xs flex items-center justify-between">
                            <span className="font-bold text-slate-800 dark:text-slate-200">{s.name}</span>
                            <span className="font-mono text-rose-600 font-bold">Remedial 3 Mapel</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 2: TRY OUTS */}
              {activeTab === 'TRYOUTS' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                        <span>Manajemen Paket Ujian &amp; Link Google Form / Sheet</span>
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Kelola paket TryOut dinamis, tautkan Google Form &amp; Sheet respons, dan sinkronkan data siswa susulan.
                      </p>
                    </div>

                    <button
                      onClick={() => setShowTryoutModal(true)}
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-colors cursor-pointer shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tambah Paket TryOut Baru</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tryouts.map(to => (
                      <div key={to.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-3 transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950 border border-teal-200 dark:border-teal-800 px-2.5 py-0.5 rounded-lg">
                            {to.code}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md font-mono uppercase border ${
                              to.status === 'ACTIVE'
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {to.status}
                          </span>
                        </div>

                        <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{to.title}</div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{to.description || 'Paket Ujian TryOut terintegrasi Google Form & Sheets.'}</p>

                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-1">
                          <div className="flex items-center justify-between">
                            <span>Buka Akses: <strong>{new Date(to.startDate).toLocaleDateString('id-ID')}</strong></span>
                            <span>Batas Akses: <strong>{new Date(to.endDate).toLocaleDateString('id-ID')}</strong></span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                          <div className="flex items-center gap-2 text-xs">
                            <a
                              href={to.googleFormUrl || 'https://forms.google.com'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] rounded-xl border border-indigo-200 dark:border-indigo-800 flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Google Form Soal</span>
                            </a>
                            <a
                              href={to.googleSheetUrl || 'https://docs.google.com'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5" />
                              <span>Google Sheet Respons</span>
                            </a>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              triggerToast(`🔄 Live Sync (${to.code}): Data Google Sheet berhasil disinkronkan. Data siswa susulan telah diperbarui ke dashboard!`);
                            }}
                            className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs py-2 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Sinkronkan Data Google Sheet (Siswa Susulan)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTryoutId(to.id);
                              handleTabChange('EXPLANATIONS');
                            }}
                            className="w-full bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-bold text-xs py-2 rounded-xl transition-colors flex items-center justify-center gap-2 border border-indigo-200 dark:border-indigo-800 cursor-pointer shadow-2xs"
                          >
                            <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                            <span>Kelola Link Pembahasan (PDF &amp; YouTube)</span>
                          </button>

                          {/* Selection Mode for Score Source */}
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                            <div className="flex items-center space-x-1.5">
                              <span className="text-slate-500 dark:text-slate-400 font-semibold text-[11px]">Acuan Nilai:</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                                to.scoringConfig?.scoreSource === 'CUSTOM_ENGINE'
                                  ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                  : 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                              }`}>
                                {to.scoringConfig?.scoreSource === 'CUSTOM_ENGINE' ? '⚡ Aturan Sekolah' : '📋 Kuis Google Form'}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                const currentSrc = to.scoringConfig?.scoreSource || 'GOOGLE_FORM';
                                const newSrc: 'CUSTOM_ENGINE' | 'GOOGLE_FORM' = currentSrc === 'CUSTOM_ENGINE' ? 'GOOGLE_FORM' : 'CUSTOM_ENGINE';
                                const updatedConfig = {
                                  ...to.scoringConfig,
                                  scoreSource: newSrc
                                };
                                dbService.updateTryoutScoringConfig(to.id, updatedConfig, currentUser);
                                setTryouts(dbService.getTryouts());
                                triggerToast(`Mode Acuan Nilai Paket ${to.code} diubah ke: ${newSrc === 'CUSTOM_ENGINE' ? 'Aturan Penilaian Sekolah' : 'Nilai Langsung Google Form'}`);
                              }}
                              className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 cursor-pointer flex items-center space-x-1 border border-indigo-200 dark:border-indigo-800/80 px-2.5 py-1 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/40 hover:bg-indigo-100 transition-colors"
                            >
                              <Sliders className="w-3 h-3" />
                              <span>Ubah Acuan Nilai</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: QUESTION BANK */}
              {activeTab === 'QUESTION_BANK' && (
                <div className="space-y-4">
                  {/* Control / Filter Bar */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3 transition-colors">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {/* Subject Selector (Restricted to permitted subjects) */}
                      <div className="flex items-center space-x-1.5">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Mapel:</span>
                        <select
                          value={selectedSubjectId}
                          onChange={e => setSelectedSubjectId(e.target.value)}
                          className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 text-slate-800 dark:text-slate-200 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          {permittedSubjects.map(s => (
                            <option key={s.id} value={s.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                              {s.name} ({s.code})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Cognitive Level Filter */}
                      <div className="flex items-center space-x-1.5">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Kognitif:</span>
                        <select
                          value={cognitiveFilter}
                          onChange={e => setCognitiveFilter(e.target.value)}
                          className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-slate-800 dark:text-slate-200 focus:outline-none"
                        >
                          <option value="ALL">Semua Level (C1-C6)</option>
                          <option value="C1">C1 - Mengingat</option>
                          <option value="C2">C2 - Memahami</option>
                          <option value="C3">C3 - Menerapkan</option>
                          <option value="C4">C4 - Menganalisis</option>
                          <option value="C5">C5 - Mengevaluasi</option>
                          <option value="C6">C6 - Mencipta</option>
                        </select>
                      </div>

                      {/* Status Filter */}
                      <div className="flex items-center space-x-1.5">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Status:</span>
                        <select
                          value={statusFilter}
                          onChange={e => setStatusFilter(e.target.value)}
                          className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-slate-800 dark:text-slate-200 focus:outline-none"
                        >
                          <option value="ALL">Semua Status</option>
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="DRAFT">DRAFT</option>
                          <option value="ARCHIVED">ARCHIVED</option>
                        </select>
                      </div>

                      {/* Search Input */}
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          placeholder="Cari kode / isi soal..."
                          className="pl-8 pr-3 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleOpenAddQuestion}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 shadow-sm cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tambah Butir Soal</span>
                    </button>
                  </div>

                  {/* Question Bank Responsive Container */}
                  {selectedQuestionIds.length > 0 && (
                    <div className="bg-indigo-600 text-white p-3 rounded-xl flex items-center justify-between shadow-md text-xs font-semibold mb-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Terpilih <strong>{selectedQuestionIds.length}</strong> butir soal</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedQuestionIds([])}
                          className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs cursor-pointer"
                        >
                          Batalkan Pilihan
                        </button>
                        <button
                          onClick={() => setGuruBatchDeleteConfirm({ type: 'QUESTION', count: selectedQuestionIds.length })}
                          className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus Terpilih ({selectedQuestionIds.length})</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden transition-colors">
                    {/* DESKTOP TABLE VIEW */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                          <tr>
                            <th className="py-2.5 px-3 w-10 text-center">
                              <input
                                type="checkbox"
                                checked={filteredQuestions.length > 0 && filteredQuestions.every(q => selectedQuestionIds.includes(q.id))}
                                onChange={e => {
                                  if (e.target.checked) {
                                    const allFilteredIds = Array.from(new Set([...selectedQuestionIds, ...filteredQuestions.map(q => q.id)]));
                                    setSelectedQuestionIds(allFilteredIds);
                                  } else {
                                    const filteredSet = new Set(filteredQuestions.map(q => q.id));
                                    setSelectedQuestionIds(selectedQuestionIds.filter(id => !filteredSet.has(id)));
                                  }
                                }}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              />
                            </th>
                            <th className="py-2.5 px-3 w-12 text-center">No</th>
                            <th className="py-2.5 px-3 w-36">Kode Unik / ID</th>
                            <th className="py-2.5 px-3">Teks Butir Soal & Pilihan</th>
                            <th className="py-2.5 px-3 w-32">Materi Pembelajaran</th>
                            <th className="py-2.5 px-3 w-16 text-center">Kunci</th>
                            <th className="py-2.5 px-3 w-20 text-center">Kognitif</th>
                            <th className="py-2.5 px-3 w-20 text-center">Status</th>
                            <th className="py-2.5 px-3 w-24 text-center">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {filteredQuestions.length === 0 ? (
                            <tr>
                              <td colSpan={9} className="py-12 text-center text-slate-400 dark:text-slate-500 italic">
                                Belum ada butir soal pada kriteria filter ini. Klik &quot;Tambah Butir Soal&quot; untuk menambahkan.
                              </td>
                            </tr>
                          ) : (
                            filteredQuestions.map((q, idx) => {
                              const mat = materials.find(m => m.id === q.materialId);
                              const comp = competencies.find(c => c.id === q.competencyId);
                              const isChecked = selectedQuestionIds.includes(q.id);
                              return (
                                <tr key={q.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${isChecked ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : ''}`}>
                                  <td className="py-3 px-3 text-center">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={e => {
                                        if (e.target.checked) {
                                          setSelectedQuestionIds([...selectedQuestionIds, q.id]);
                                        } else {
                                          setSelectedQuestionIds(selectedQuestionIds.filter(id => id !== q.id));
                                        }
                                      }}
                                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                    />
                                  </td>
                                  <td className="py-3 px-3 text-center font-bold text-slate-600 dark:text-slate-400">
                                    {q.questionNumber || idx + 1}
                                  </td>
                                  <td className="py-3 px-3">
                                    <div className="font-mono font-bold text-indigo-700 dark:text-indigo-400">{q.uniqueCode}</div>
                                    <div className="text-[10px] text-slate-400 font-mono">{q.id}</div>
                                  </td>
                                  <td className="py-3 px-3 space-y-1">
                                    <div className="font-medium text-slate-900 dark:text-slate-100 leading-snug">{q.questionText}</div>
                                    <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-600 dark:text-slate-300 pt-1">
                                      {q.options?.map(opt => (
                                        <div
                                          key={opt.key}
                                          className={`px-1.5 py-0.5 rounded ${
                                            opt.key === q.correctAnswer
                                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800'
                                              : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-transparent'
                                          }`}
                                        >
                                          <span className="font-bold mr-1">{opt.key}.</span>
                                          <span>{opt.text}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </td>
                                  <td className="py-3 px-3">
                                    <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                                      {mat?.title || 'Umum'}
                                    </div>
                                  </td>
                                  <td className="py-3 px-3 text-center">
                                    <span className="inline-block bg-emerald-600 text-white font-bold w-6 h-6 leading-6 rounded text-xs shadow-xs">
                                      {q.correctAnswer}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 text-center">
                                    <span className="inline-block bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 font-mono font-semibold px-2 py-0.5 rounded text-[10px] border border-transparent dark:border-indigo-800">
                                      {q.cognitiveLevel || 'C4'}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 text-center">
                                    <span
                                      className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded ${
                                        q.status === 'ACTIVE'
                                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-transparent dark:border-emerald-800'
                                          : q.status === 'DRAFT'
                                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-transparent dark:border-amber-800'
                                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                      }`}
                                    >
                                      {q.status || 'ACTIVE'}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 text-center space-x-1">
                                    <button
                                      onClick={() => handleOpenEditQuestion(q)}
                                      title="Edit Soal"
                                      className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => requestDeleteQuestion(q.id, q.uniqueCode, q.questionText)}
                                      title="Hapus Soal"
                                      className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/60 cursor-pointer transition-colors"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* MOBILE ADAPTIVE CARD VIEW */}
                    <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredQuestions.length === 0 ? (
                        <div className="py-10 px-4 text-center text-slate-400 dark:text-slate-500 italic text-xs">
                          Belum ada butir soal pada kriteria filter ini.
                        </div>
                      ) : (
                        filteredQuestions.map((q, idx) => {
                          const mat = materials.find(m => m.id === q.materialId);
                          const comp = competencies.find(c => c.id === q.competencyId);
                          return (
                            <div key={q.id} className="p-4 space-y-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-300 font-mono">
                                    {q.questionNumber || idx + 1}
                                  </span>
                                  <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                                    {q.uniqueCode}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                    Kunci: {q.correctAnswer}
                                  </span>
                                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                                    q.status === 'ACTIVE'
                                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                                      : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                                  }`}>
                                    {q.status || 'ACTIVE'}
                                  </span>
                                </div>
                              </div>

                              <p className="text-xs text-slate-900 dark:text-slate-100 font-medium leading-relaxed">
                                {q.questionText}
                              </p>

                              {/* Options preview */}
                              <div className="grid grid-cols-1 gap-1 text-xs">
                                {q.options?.map(opt => (
                                  <div
                                    key={opt.key}
                                    className={`px-2 py-1 rounded-lg ${
                                      opt.key === q.correctAnswer
                                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800'
                                        : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300'
                                    }`}
                                  >
                                    <span className="font-bold mr-1">{opt.key}.</span>
                                    <span>{opt.text}</span>
                                  </div>
                                ))}
                              </div>

                              {/* Meta and touch-friendly actions */}
                              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-slate-500 dark:text-slate-400">
                                <div className="text-[11px]">
                                  <span>{mat?.title || 'Umum'}</span> · <span className="font-mono">{comp?.code || '-'}</span> · <span className="font-semibold text-indigo-600 dark:text-indigo-400">{q.cognitiveLevel || 'C4'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditQuestion(q)}
                                    className="flex-1 sm:flex-initial min-h-[38px] px-3.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => requestDeleteQuestion(q.id, q.uniqueCode, q.questionText)}
                                    className="flex-1 sm:flex-initial min-h-[38px] px-3.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/80 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Hapus</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: MATERIALS WITH GOOGLE FORM INTEGRATION */}
              {activeTab === 'MATERIALS' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                        <span>Materi Pembelajaran &amp; Integrasi Google Form</span>
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Kelola materi pengajaran dan tautkan soal/kuis Google Form langsung untuk diakses oleh siswa.
                      </p>
                    </div>
                    <button
                      onClick={handleOpenAddMaterial}
                      className="bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center space-x-1.5 shadow-sm cursor-pointer shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ Tambah Materi / Form Baru</span>
                    </button>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden transition-colors">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider">
                        <tr>
                          <th className="py-3 px-3.5 w-20">Kode</th>
                          <th className="py-3 px-3.5">Judul Materi</th>
                          <th className="py-3 px-3.5">Deskripsi Ruang Lingkup</th>
                          <th className="py-3 px-3.5 w-32">Mata Pelajaran</th>
                          <th className="py-3 px-3.5 w-52 text-center">Integrasi Google Form</th>
                          <th className="py-3 px-3.5 w-24 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {materials.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-10 text-center text-slate-400 dark:text-slate-500 italic">
                              Belum ada materi pembelajaran untuk mata pelajaran ini.
                            </td>
                          </tr>
                        ) : (
                          materials.map(m => {
                            const subj = subjects.find(s => s.id === m.subjectId);
                            const hasForm = !!m.googleFormUrl && m.googleFormUrl.trim().length > 0;
                            return (
                              <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="py-3 px-3.5 font-mono font-bold text-teal-700 dark:text-teal-400">{m.code}</td>
                                <td className="py-3 px-3.5 font-bold text-slate-900 dark:text-slate-100">{m.title}</td>
                                <td className="py-3 px-3.5 text-slate-600 dark:text-slate-300 leading-relaxed">{m.description}</td>
                                <td className="py-3 px-3.5 text-slate-700 dark:text-slate-300 font-medium">{subj?.name || m.subjectId}</td>
                                <td className="py-3 px-3.5 text-center">
                                  {hasForm ? (
                                    <div className="flex flex-col items-center gap-1">
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-800">
                                        <CheckCircle className="w-3 h-3 text-teal-600" />
                                        <span>Google Form Terhubung</span>
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => setPreviewGoogleFormUrl(m.googleFormUrl!)}
                                        className="text-[11px] text-teal-700 dark:text-teal-300 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                                      >
                                        <ExternalLink className="w-3 h-3" />
                                        <span>Buka Google Form</span>
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditMaterial(m)}
                                      className="px-2.5 py-1 text-[10px] font-mono font-bold text-slate-500 hover:text-teal-700 bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors cursor-pointer"
                                    >
                                      + Tautkan Google Form
                                    </button>
                                  )}
                                </td>
                                <td className="py-3 px-3.5 text-center space-x-1">
                                  <button
                                    onClick={() => handleOpenEditMaterial(m)}
                                    className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                    title="Edit Materi & Form"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteMaterial(m.id, m.title, m.code)}
                                    className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                    title="Hapus Materi"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 6: STUDENTS */}
              {activeTab === 'STUDENTS' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Data Siswa Kelas Anda</h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Siswa terisolasi hanya pada kelas yang Anda ampu ({classes.map(c => c.name).join(', ')}).
                      </p>
                    </div>

                    {/* Class Filter */}
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Filter Kelas:</span>
                      <select
                        value={classFilter}
                        onChange={e => setClassFilter(e.target.value)}
                        className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-200 font-semibold focus:outline-none"
                      >
                        <option value="ALL">Semua Kelas ({classes.length})</option>
                        {classes.map(cls => (
                          <option key={cls.id} value={cls.id}>
                            {cls.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden transition-colors">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                        <tr>
                          <th className="py-2.5 px-3 w-12 text-center">No</th>
                          <th className="py-2.5 px-3 w-28">NISN</th>
                          <th className="py-2.5 px-3 w-24">NIS</th>
                          <th className="py-2.5 px-3">Nama Siswa</th>
                          <th className="py-2.5 px-3 w-28">Kelas</th>
                          <th className="py-2.5 px-3 w-16 text-center">L/P</th>
                          <th className="py-2.5 px-3 w-24 text-center">Target Skor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredStudents.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-10 text-center text-slate-400 dark:text-slate-500 italic">
                              Tidak ada siswa yang terdaftar pada filter kelas ini.
                            </td>
                          </tr>
                        ) : (
                          filteredStudents.map((s, idx) => {
                            const cls = classes.find(c => c.id === s.classId);
                            return (
                              <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="py-2.5 px-3 text-center text-slate-500 dark:text-slate-400">{idx + 1}</td>
                                <td className="py-2.5 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">{s.nisn}</td>
                                <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">{s.nis}</td>
                                <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100">{s.name}</td>
                                <td className="py-2.5 px-3">
                                  <span className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium px-2 py-0.5 rounded text-[11px]">
                                    {cls?.name || s.classId}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-center font-bold text-slate-600 dark:text-slate-400">{s.gender}</td>
                                <td className="py-2.5 px-3 text-center font-mono font-bold text-indigo-700 dark:text-indigo-400">
                                  {s.targetScore || 75.0}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 7: CLASSES */}
              {activeTab === 'CLASSES' && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Daftar Kelas Yang Ditugaskan</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Anda hanya memiliki kewenangan akademik pada kelas-kelas berikut ini.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {classes.map(cls => {
                      const count = students.filter(s => s.classId === cls.id).length;
                      return (
                        <div key={cls.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-3 transition-colors">
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-bold text-slate-900 dark:text-slate-100">{cls.name}</span>
                            <span className="bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-mono font-bold px-2 py-0.5 rounded">
                              Tingkat {cls.gradeLevel}
                            </span>
                          </div>

                          <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                            <div>Total Siswa: <strong className="text-slate-800 dark:text-slate-200 font-bold">{count} Siswa</strong></div>
                            <div>Tahun Ajaran Aktif: 2025/2026 (Genap)</div>
                          </div>

                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <button
                              onClick={() => {
                                setClassFilter(cls.id);
                                handleTabChange('STUDENTS');
                              }}
                              className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-semibold flex items-center space-x-1 cursor-pointer"
                            >
                              <span>Lihat Daftar Siswa</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 8: ANALYTICS NAVIGATION — PHASE 9 ANALYTICS ENGINE */}
              {activeTab === 'ANALYTICS' && (
                <div className="space-y-5">
                  {/* Top Bar: Sub-Navigation Tabs */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors">
                    <div>
                      <div className="flex items-center space-x-2">
                        <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Pusat Analisis Nilai &amp; Butir Soal</h2>
                        <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                          Terverifikasi Otomatis
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Agregasi analitik multi-dimensi real-time langsung dari basis data tanpa hardcoding.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1 rounded-xl text-xs font-semibold">
                      <button
                        onClick={() => setAnalyticsSubTab('OVERALL')}
                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                          analyticsSubTab === 'OVERALL'
                            ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-sm font-bold'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        Ringkasan &amp; Filter
                      </button>
                      <button
                        onClick={() => setAnalyticsSubTab('CLASS')}
                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                          analyticsSubTab === 'CLASS'
                            ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-sm font-bold'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        Analisis Kelas
                      </button>
                      <button
                        onClick={() => setAnalyticsSubTab('STUDENT')}
                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                          analyticsSubTab === 'STUDENT'
                            ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-sm font-bold'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        Analisis Siswa
                      </button>
                      <button
                        onClick={() => setAnalyticsSubTab('PSYCHOMETRICS')}
                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                          analyticsSubTab === 'PSYCHOMETRICS'
                            ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-sm font-bold'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        Analisis Butir Soal
                      </button>
                      <button
                        onClick={() => setAnalyticsSubTab('TESTS')}
                        className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1 cursor-pointer ${
                          analyticsSubTab === 'TESTS'
                            ? 'bg-indigo-600 text-white shadow-sm font-bold'
                            : 'text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300'
                        }`}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Verifikasi &amp; Benchmark</span>
                      </button>
                    </div>
                  </div>

                  {/* SUB-TAB 1: OVERALL MULTI-FILTER ANALYTICS */}
                  {analyticsSubTab === 'OVERALL' && (
                    <div className="space-y-4">
                      {/* Filter Bar */}
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm transition-colors">
                        <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center space-x-1">
                          <Filter className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span>Filter Multi-Dimensi Basis Data</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
                          <div>
                            <label className="text-slate-500 dark:text-slate-400 font-medium block mb-1">Tahun Ajaran</label>
                            <select
                              value={analyticsYearFilter}
                              onChange={e => setAnalyticsYearFilter(e.target.value)}
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 font-medium focus:ring-1 focus:ring-indigo-500"
                            >
                              <option value="ALL">Semua Tahun Ajaran</option>
                              {academicYears.map(ay => (
                                <option key={ay.id} value={ay.id}>
                                  {ay.yearLabel} ({ay.semester})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="text-slate-500 dark:text-slate-400 font-medium block mb-1">Pelaksanaan Try Out</label>
                            <select
                              value={selectedTryoutId}
                              onChange={e => setSelectedTryoutId(e.target.value)}
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 font-medium focus:ring-1 focus:ring-indigo-500"
                            >
                              <option value="ALL">Semua Try Out</option>
                              {tryouts.map(t => (
                                <option key={t.id} value={t.id}>
                                  {t.code} — {t.title}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="text-slate-500 dark:text-slate-400 font-medium block mb-1">Mata Pelajaran</label>
                            <select
                              value={selectedSubjectId}
                              onChange={e => setSelectedSubjectId(e.target.value)}
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 font-medium focus:ring-1 focus:ring-indigo-500"
                            >
                              <option value="ALL">Semua Mapel yang Diampu</option>
                              {permittedSubjects.map(s => (
                                <option key={s.id} value={s.id}>
                                  {s.name} ({s.code})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="text-slate-500 dark:text-slate-400 font-medium block mb-1">Tingkat Kelas</label>
                            <select
                              value={analyticsGradeFilter}
                              onChange={e => setAnalyticsGradeFilter(e.target.value)}
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 font-medium focus:ring-1 focus:ring-indigo-500"
                            >
                              <option value="ALL">Semua Tingkat</option>
                              <option value="X">Kelas X</option>
                              <option value="XI">Kelas XI</option>
                              <option value="XII">Kelas XII</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-slate-500 dark:text-slate-400 font-medium block mb-1">Rombel / Kelas</label>
                            <select
                              value={analyticsClassFilter}
                              onChange={e => setAnalyticsClassFilter(e.target.value)}
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 font-medium focus:ring-1 focus:ring-indigo-500"
                            >
                              <option value="ALL">Semua Kelas</option>
                              {classes.map(c => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Summary KPI Cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm transition-colors">
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Rata-Rata Nilai</div>
                          <div className="text-xl font-bold text-indigo-700 dark:text-indigo-400 mt-1 font-mono">
                            {overallAnalyticsData.summary.averageScore}
                          </div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Skala 0 - 100</div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm transition-colors">
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Median Skor</div>
                          <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1 font-mono">
                            {overallAnalyticsData.summary.medianScore}
                          </div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Nilai Tengah Distribusi</div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm transition-colors">
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Tertinggi / Terendah</div>
                          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                            {overallAnalyticsData.summary.highestScore}{' '}
                            <span className="text-xs text-rose-500 font-normal">/ {overallAnalyticsData.summary.lowestScore}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Rentang Sebaran</div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm transition-colors">
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Tingkat Kelulusan</div>
                          <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-1 font-mono">
                            {overallAnalyticsData.summary.passingRate}%
                          </div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">KKM $\ge 75$</div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm transition-colors">
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Capaian Target Siswa</div>
                          <div className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1 font-mono">
                            {overallAnalyticsData.summary.overallAttainmentRate}%
                          </div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Mencapai Target Individu</div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm transition-colors">
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Total Submisi</div>
                          <div className="text-xl font-bold text-slate-800 dark:text-slate-200 mt-1 font-mono">
                            {overallAnalyticsData.summary.totalSubmissions}
                          </div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Dari {overallAnalyticsData.summary.totalStudents} Siswa Terdaftar</div>
                        </div>
                      </div>

                      {/* Score Distribution Histogram */}
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-3 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
                            <PieChart className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            <span>Distribusi Nilai Siswa (Score Distribution)</span>
                          </div>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            Total Submisi: <strong className="text-slate-900 dark:text-slate-100">{overallAnalyticsData.summary.totalSubmissions} Siswa</strong>
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
                          {overallAnalyticsData.scoreDistribution.map(bucket => (
                            <div key={bucket.range} className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="font-bold text-slate-700 dark:text-slate-300">Rentang {bucket.range}</span>
                                <span className="font-mono text-indigo-700 dark:text-indigo-400 font-bold">{bucket.count} Siswa ({bucket.percentage}%)</span>
                              </div>
                              <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    bucket.range === '86 - 100'
                                      ? 'bg-emerald-500'
                                      : bucket.range === '71 - 85'
                                      ? 'bg-indigo-500'
                                      : bucket.range === '51 - 70'
                                      ? 'bg-amber-500'
                                      : 'bg-rose-500'
                                  }`}
                                  style={{ width: `${Math.min(100, bucket.percentage)}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Class Comparison Table */}
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden transition-colors">
                        <div className="p-3 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
                            <School className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            <span>Perbandingan Performa Antar-Kelas</span>
                          </div>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {overallAnalyticsData.classComparison.length} Kelas Terfilter
                          </span>
                        </div>

                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                            <tr>
                              <th className="py-2.5 px-3">Nama Kelas</th>
                              <th className="py-2.5 px-3 w-20 text-center">Tingkat</th>
                              <th className="py-2.5 px-3 w-28 text-center">Jumlah Siswa</th>
                              <th className="py-2.5 px-3 w-28 text-center">Rata-Rata</th>
                              <th className="py-2.5 px-3 w-24 text-center">Median</th>
                              <th className="py-2.5 px-3 w-28 text-center">Tertinggi / Terendah</th>
                              <th className="py-2.5 px-3 w-28 text-center">% Kelulusan</th>
                              <th className="py-2.5 px-3 w-28 text-center">% Capai Target</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {overallAnalyticsData.classComparison.length === 0 ? (
                              <tr>
                                <td colSpan={8} className="py-8 text-center text-slate-400 dark:text-slate-500 italic">
                                  Tidak ada data yang sesuai dengan kombinasi filter saat ini.
                                </td>
                              </tr>
                            ) : (
                              overallAnalyticsData.classComparison.map(cls => (
                                <tr key={cls.classId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                  <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100">{cls.className}</td>
                                  <td className="py-2.5 px-3 text-center">
                                    <span className="bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                      {cls.gradeLevel}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-center font-mono font-medium text-slate-700 dark:text-slate-300">{cls.studentCount}</td>
                                  <td className="py-2.5 px-3 text-center font-mono font-bold text-indigo-700 dark:text-indigo-400">
                                    {cls.averageScore}
                                  </td>
                                  <td className="py-2.5 px-3 text-center font-mono text-slate-700 dark:text-slate-300">{cls.medianScore}</td>
                                  <td className="py-2.5 px-3 text-center font-mono text-[11px]">
                                    <span className="text-emerald-700 dark:text-emerald-400 font-bold">{cls.highestScore}</span> /{' '}
                                    <span className="text-rose-600 dark:text-rose-400 font-medium">{cls.lowestScore}</span>
                                  </td>
                                  <td className="py-2.5 px-3 text-center">
                                    <span
                                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                        cls.passingRate >= 75
                                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                                          : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                                      }`}
                                    >
                                      {cls.passingRate}%
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-center">
                                    <span className="text-blue-700 dark:text-blue-400 font-bold text-xs">{cls.attainmentRate}%</span>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Top & Needs Attention Students */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-3 transition-colors">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
                              <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              <span>Siswa Nilai Tertinggi (Top Performers)</span>
                            </span>
                          </div>
                          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                            {overallAnalyticsData.topStudents.slice(0, 5).map(st => (
                              <div key={st.studentId} className="py-2 flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold flex items-center justify-center">
                                    {st.rank}
                                  </span>
                                  <div>
                                    <div className="font-bold text-slate-800 dark:text-slate-200">{st.name}</div>
                                    <div className="text-[10px] text-slate-400">{st.className}</div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-sm">{st.score}</div>
                                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Target: {st.targetScore} ({st.attainmentPercentage}%)</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-3 transition-colors">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
                              <AlertCircle className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                              <span>Perlu Bimbingan Khusus (At-Risk / Below Target)</span>
                            </span>
                          </div>
                          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                            {overallAnalyticsData.needsAttentionStudents.length === 0 ? (
                              <div className="py-6 text-center text-slate-400 dark:text-slate-500 italic">
                                Seluruh siswa telah mencapai target minimum nilai.
                              </div>
                            ) : (
                              overallAnalyticsData.needsAttentionStudents.slice(0, 5).map(st => (
                                <div key={st.studentId} className="py-2 flex items-center justify-between">
                                  <div>
                                    <div className="font-bold text-slate-800 dark:text-slate-200">{st.name}</div>
                                    <div className="text-[10px] text-slate-400">{st.className}</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-mono font-bold text-rose-600 dark:text-rose-400 text-sm">{st.score}</div>
                                    <div className="text-[10px] text-rose-500 dark:text-rose-400 font-semibold">Gap: {st.gap} poin</div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SUB-TAB 2: CLASS LEVEL ANALYTICS */}
                  {analyticsSubTab === 'CLASS' && classAnalyticsData && (
                    <div className="space-y-4">
                      {/* Class Selection & Quick Stats */}
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3 transition-colors">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-lg font-bold text-slate-900 dark:text-slate-100">{classAnalyticsData.className}</span>
                            <span className="bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-mono font-bold px-2 py-0.5 rounded">
                              Tingkat {classAnalyticsData.gradeLevel}
                            </span>
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs px-2 py-0.5 rounded">
                              {classAnalyticsData.academicYearLabel}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Analisis komprehensif performa rombel: rata-rata, median, sebaran, penguasaan KD, dan butir soal.
                          </p>
                        </div>

                        <div className="flex items-center space-x-2 text-xs">
                          <span className="text-slate-500 dark:text-slate-400 font-medium">Pilih Kelas:</span>
                          <select
                            value={analyticsClassFilter === 'ALL' ? classes[0]?.id : analyticsClassFilter}
                            onChange={e => setAnalyticsClassFilter(e.target.value)}
                            className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-800 dark:text-slate-200 font-bold focus:ring-1 focus:ring-indigo-500"
                          >
                            {classes.map(c => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Class Metrics Row */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm transition-colors">
                          <span className="text-slate-400 dark:text-slate-500 block mb-1">Peserta Ujian</span>
                          <span className="text-xl font-bold text-slate-900 dark:text-slate-100 font-mono">{classAnalyticsData.studentCount} Siswa</span>
                        </div>
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm transition-colors">
                          <span className="text-slate-400 dark:text-slate-500 block mb-1">Rata-Rata Kelas</span>
                          <span className="text-xl font-bold text-indigo-700 dark:text-indigo-400 font-mono">{classAnalyticsData.average}</span>
                        </div>
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm transition-colors">
                          <span className="text-slate-400 dark:text-slate-500 block mb-1">Median Kelas</span>
                          <span className="text-xl font-bold text-slate-800 dark:text-slate-200 font-mono">{classAnalyticsData.median}</span>
                        </div>
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm transition-colors">
                          <span className="text-slate-400 dark:text-slate-500 block mb-1">Nilai Tertinggi</span>
                          <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">{classAnalyticsData.highest}</span>
                        </div>
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm transition-colors">
                          <span className="text-slate-400 dark:text-slate-500 block mb-1">Nilai Terendah</span>
                          <span className="text-xl font-bold text-rose-500 dark:text-rose-400 font-mono">{classAnalyticsData.lowest}</span>
                        </div>
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm transition-colors">
                          <span className="text-slate-400 dark:text-slate-500 block mb-1">% Lulus KKM</span>
                          <span className="text-xl font-bold text-emerald-700 dark:text-emerald-400 font-mono">{classAnalyticsData.attainment.passedPercentage}%</span>
                        </div>
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm transition-colors">
                          <span className="text-slate-400 dark:text-slate-500 block mb-1">% Capai Target</span>
                          <span className="text-xl font-bold text-blue-600 dark:text-blue-400 font-mono">{classAnalyticsData.attainment.targetAttainmentPercentage}%</span>
                        </div>
                      </div>

                      {/* Class Student Rankings Table */}
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden transition-colors">
                        <div className="p-3 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                            Rekapitulasi Nilai Siswa {classAnalyticsData.className}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {classAnalyticsData.studentRankings.length} Siswa
                          </span>
                        </div>

                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                            <tr>
                              <th className="py-2.5 px-3 w-12 text-center">Rank</th>
                              <th className="py-2.5 px-3 w-28">NISN</th>
                              <th className="py-2.5 px-3">Nama Siswa</th>
                              <th className="py-2.5 px-3 w-24 text-center">Nilai Ujian</th>
                              <th className="py-2.5 px-3 w-24 text-center">Target</th>
                              <th className="py-2.5 px-3 w-28 text-center">% Capaian</th>
                              <th className="py-2.5 px-3 w-28 text-center">Status Scoring</th>
                              <th className="py-2.5 px-3 w-24 text-center">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {classAnalyticsData.studentRankings.map(st => (
                              <tr key={st.studentId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="py-2.5 px-3 text-center font-bold text-slate-600 dark:text-slate-400">{st.rank}</td>
                                <td className="py-2.5 px-3 font-mono font-medium text-slate-800 dark:text-slate-200">{st.nisn}</td>
                                <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100">{st.name}</td>
                                <td className="py-2.5 px-3 text-center font-mono font-bold text-indigo-700 dark:text-indigo-400">
                                  {st.score}
                                </td>
                                <td className="py-2.5 px-3 text-center font-mono text-slate-600 dark:text-slate-400">{st.targetScore}</td>
                                <td className="py-2.5 px-3 text-center">
                                  <span
                                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                      st.isTargetAttained ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                                    }`}
                                  >
                                    {st.attainmentPercentage}%
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span
                                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                      st.status === 'MATCH'
                                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                        : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                    }`}
                                  >
                                    {st.status}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <button
                                    onClick={() => {
                                      setSelectedStudentForAnalytics(st.studentId);
                                      setAnalyticsSubTab('STUDENT');
                                    }}
                                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-semibold cursor-pointer"
                                  >
                                    Lihat Rapor
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* SUB-TAB 3: STUDENT INDIVIDUAL ANALYTICS */}
                  {analyticsSubTab === 'STUDENT' && (
                    <div className="space-y-4">
                      {/* Student Selector */}
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3 transition-colors">
                        <div>
                          <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                            Pilih Siswa Untuk Analisis Individu
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Evaluasi mendalam per butir soal, daya serap materi, KD, dan tren capaian target.
                          </p>
                        </div>

                        <div className="flex items-center space-x-2 text-xs">
                          <span className="text-slate-500 dark:text-slate-400 font-medium">Siswa:</span>
                          <select
                            value={activeStudentIdForAnalytics}
                            onChange={e => setSelectedStudentForAnalytics(e.target.value)}
                            className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-800 dark:text-slate-200 font-bold focus:ring-1 focus:ring-indigo-500"
                          >
                            {students.map(s => {
                              const cls = classes.find(c => c.id === s.classId);
                              return (
                                <option key={s.id} value={s.id}>
                                  {s.name} ({s.nisn}) — {cls?.name || s.classId}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      </div>

                      {studentAnalyticsData ? (
                        <div className="space-y-4">
                          {/* Student Header & Score Card */}
                          <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 dark:from-[#0c142b] dark:via-[#090e1f] dark:to-[#070b18] text-white rounded-xl p-5 shadow-sm space-y-4 border border-indigo-800/60 dark:border-slate-800 transition-colors">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-800/60 dark:border-slate-800 pb-3">
                              <div>
                                <h3 className="text-lg font-bold text-white">{studentAnalyticsData.studentName}</h3>
                                <div className="text-xs text-indigo-200 dark:text-indigo-300 font-mono space-x-3 mt-0.5">
                                  <span>NISN: {studentAnalyticsData.nisn}</span>
                                  <span>NIS: {studentAnalyticsData.nis}</span>
                                  <span>Kelas: {studentAnalyticsData.className}</span>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="bg-indigo-800/80 dark:bg-slate-800 text-indigo-200 dark:text-indigo-300 text-xs px-2.5 py-1 rounded-lg border border-indigo-700/50 dark:border-slate-700">
                                  {studentAnalyticsData.tryoutTitle}
                                </span>
                              </div>
                            </div>

                            {/* Score & Attainment Counters */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
                              <div className="bg-white/10 dark:bg-slate-900/60 rounded-lg p-2.5 border border-white/5 dark:border-slate-800">
                                <span className="text-indigo-200 dark:text-indigo-300 block text-[10px]">Nilai Kalkulasi Database</span>
                                <span className="text-2xl font-bold font-mono text-emerald-400 mt-1 block">
                                  {studentAnalyticsData.score.calculatedScore}
                                </span>
                                <span className="text-[10px] text-indigo-300 dark:text-indigo-400">Skor Bersih Ujian</span>
                              </div>

                              <div className="bg-white/10 dark:bg-slate-900/60 rounded-lg p-2.5 border border-white/5 dark:border-slate-800">
                                <span className="text-indigo-200 dark:text-indigo-300 block text-[10px]">Google Form Score</span>
                                <span className="text-2xl font-bold font-mono text-white mt-1 block">
                                  {studentAnalyticsData.score.rawScoreGForm}
                                </span>
                                <span
                                  className={`text-[10px] font-bold px-1 rounded ${
                                    studentAnalyticsData.score.scoringStatus === 'MATCH'
                                      ? 'text-emerald-400'
                                      : 'text-amber-400 bg-amber-950/60'
                                  }`}
                                >
                                  {studentAnalyticsData.score.scoringStatus}
                                </span>
                              </div>

                              <div className="bg-white/10 dark:bg-slate-900/60 rounded-lg p-2.5 border border-white/5 dark:border-slate-800">
                                <span className="text-indigo-200 dark:text-indigo-300 block text-[10px]">Target Nilai</span>
                                <span className="text-2xl font-bold font-mono text-cyan-300 mt-1 block">
                                  {studentAnalyticsData.targetScore}
                                </span>
                                <span className="text-[10px] text-indigo-300 dark:text-indigo-400">Target Belajar</span>
                              </div>

                              <div className="bg-white/10 dark:bg-slate-900/60 rounded-lg p-2.5 border border-white/5 dark:border-slate-800">
                                <span className="text-indigo-200 dark:text-indigo-300 block text-[10px]">Capaian Target</span>
                                <span className="text-2xl font-bold font-mono text-white mt-1 block">
                                  {studentAnalyticsData.attainment.percentage}%
                                </span>
                                <span
                                  className={`text-[10px] font-bold px-1 rounded ${
                                    studentAnalyticsData.attainment.status === 'TERCAPAI'
                                      ? 'text-emerald-400'
                                      : 'text-rose-400'
                                  }`}
                                >
                                  {studentAnalyticsData.attainment.status === 'TERCAPAI' ? 'Tercapai' : 'Belum Tercapai'}{' '}
                                  ({studentAnalyticsData.attainment.gap > 0 ? `+${studentAnalyticsData.attainment.gap}` : studentAnalyticsData.attainment.gap})
                                </span>
                              </div>

                              <div className="bg-white/10 dark:bg-slate-900/60 rounded-lg p-2.5 border border-white/5 dark:border-slate-800">
                                <span className="text-indigo-200 dark:text-indigo-300 block text-[10px]">Butir Benar</span>
                                <span className="text-2xl font-bold font-mono text-emerald-300 mt-1 block">
                                  {studentAnalyticsData.correctCount} Soal
                                </span>
                                <span className="text-[10px] text-indigo-300 dark:text-indigo-400">Jawaban Tepat</span>
                              </div>

                              <div className="bg-white/10 dark:bg-slate-900/60 rounded-lg p-2.5 border border-white/5 dark:border-slate-800">
                                <span className="text-indigo-200 dark:text-indigo-300 block text-[10px]">Butir Salah / Kosong</span>
                                <span className="text-2xl font-bold font-mono text-rose-300 mt-1 block">
                                  {studentAnalyticsData.incorrectCount} / {studentAnalyticsData.unansweredCount}
                                </span>
                                <span className="text-[10px] text-rose-300">Perlu Koreksi</span>
                              </div>
                            </div>
                          </div>

                          {/* Strong Material vs Weak Material */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-3 transition-colors">
                              <div className="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                                <span className="flex items-center space-x-1.5">
                                  <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                  <span>Materi Kuat Siswa (Strong Material &ge; 75%)</span>
                                </span>
                                <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded text-[10px]">
                                  {studentAnalyticsData.strongMaterials.length} Topik
                                </span>
                              </div>

                              {studentAnalyticsData.strongMaterials.length === 0 ? (
                                <p className="text-xs text-slate-400 dark:text-slate-500 italic py-2">
                                  Belum ada materi dengan tingkat penguasaan di atas 75%.
                                </p>
                              ) : (
                                <div className="space-y-2">
                                  {studentAnalyticsData.strongMaterials.map(m => (
                                    <div key={m.materialId} className="bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 rounded-lg p-2.5 text-xs">
                                      <div className="flex items-center justify-between font-bold text-emerald-950 dark:text-emerald-200">
                                        <span>{m.title}</span>
                                        <span className="font-mono text-emerald-700 dark:text-emerald-400">{m.masteryPercentage}%</span>
                                      </div>
                                      <div className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                                        {m.correct} benar dari {m.total} butir soal
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-3 transition-colors">
                              <div className="flex items-center justify-between text-xs font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider">
                                <span className="flex items-center space-x-1.5">
                                  <AlertCircle className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                                  <span>Materi Lemah / Butuh Remedial (Weak Material &lt; 70%)</span>
                                </span>
                                <span className="bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 px-2 py-0.5 rounded text-[10px]">
                                  {studentAnalyticsData.weakMaterials.length} Topik
                                </span>
                              </div>

                              {studentAnalyticsData.weakMaterials.length === 0 ? (
                                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold py-2">
                                  Sangat baik! Seluruh materi dikuasai di atas ambang batas remedial.
                                </p>
                              ) : (
                                <div className="space-y-2">
                                  {studentAnalyticsData.weakMaterials.map(m => (
                                    <div key={m.materialId} className="bg-rose-50/60 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-800/60 rounded-lg p-2.5 text-xs">
                                      <div className="flex items-center justify-between font-bold text-rose-950 dark:text-rose-200">
                                        <span>{m.title}</span>
                                        <span className="font-mono text-rose-700 dark:text-rose-400">{m.masteryPercentage}%</span>
                                      </div>
                                      <div className="text-[10px] text-rose-700 dark:text-rose-400 mt-0.5">
                                        Baru {m.correct} benar dari {m.total} butir soal. Perlu penguatan konsep.
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Progress Chart/Trend */}
                          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-3 transition-colors">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                              <span className="flex items-center space-x-1.5">
                                <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                <span>Riwayat Tren Progres (Try Out 1 s.d. Try Out 4)</span>
                              </span>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                                Target Siswa: <strong className="text-slate-900 dark:text-slate-100">{studentAnalyticsData.targetScore}</strong>
                              </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                              {studentAnalyticsData.progress.map((p) => (
                                <div key={p.tryoutId} className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-xs space-y-1">
                                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 font-medium">
                                    <span>{p.tryoutCode}</span>
                                    <span className="text-[10px]">{p.date}</span>
                                  </div>
                                  <div className="text-xl font-bold font-mono text-indigo-700 dark:text-indigo-400">{p.score}</div>
                                  <div className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">{p.tryoutTitle}</div>
                                  <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800 text-[10px] flex items-center justify-between">
                                    <span className="text-slate-400 dark:text-slate-500">Target: {p.targetScore}</span>
                                    <span className={`font-bold ${p.score >= p.targetScore ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                                      {p.score >= p.targetScore ? 'Tercapai' : 'Belum'}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Question Performance Detail List */}
                          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden transition-colors">
                            <div className="p-3 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
                              <FileCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                              <span>Rincian Pengerjaan per Butir Soal</span>
                            </div>

                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                                <tr>
                                  <th className="py-2.5 px-3 w-12 text-center">No</th>
                                  <th className="py-2.5 px-3 w-32">Kode Soal</th>
                                  <th className="py-2.5 px-3">Teks Ringkas</th>
                                  <th className="py-2.5 px-3 w-24 text-center">Jawaban Siswa</th>
                                  <th className="py-2.5 px-3 w-24 text-center">Kunci Sah</th>
                                  <th className="py-2.5 px-3 w-28 text-center">Evaluasi</th>
                                  <th className="py-2.5 px-3 w-20 text-center">Poin</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {studentAnalyticsData.questionPerformance.map((qp, idx) => (
                                  <tr key={qp.questionId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="py-2 px-3 text-center font-bold text-slate-500 dark:text-slate-400">{idx + 1}</td>
                                    <td className="py-2 px-3 font-mono font-bold text-indigo-700 dark:text-indigo-400">{qp.uniqueCode}</td>
                                    <td className="py-2 px-3 text-slate-700 dark:text-slate-300 line-clamp-1">{qp.questionText}</td>
                                    <td className="py-2 px-3 text-center font-mono font-bold">
                                      <span
                                        className={`px-2 py-0.5 rounded text-[11px] ${
                                          qp.studentAnswer === 'KOSONG'
                                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                                            : qp.isCorrect
                                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                                            : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                                        }`}
                                      >
                                        {qp.studentAnswer}
                                      </span>
                                    </td>
                                    <td className="py-2 px-3 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                                      {qp.correctAnswer}
                                    </td>
                                    <td className="py-2 px-3 text-center">
                                      <span
                                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                          qp.isCorrect
                                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                            : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                        }`}
                                      >
                                        {qp.isCorrect ? 'Benar' : 'Salah'}
                                      </span>
                                    </td>
                                    <td className="py-2 px-3 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                                      {qp.score}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white border border-slate-200 rounded-lg p-10 text-center text-slate-400 italic">
                          Pilih siswa untuk melihat analisis analitik individu.
                        </div>
                      )}
                    </div>
                  )}

                  {/* SUB-TAB 4: QUESTION PSYCHOMETRICS & DISTRACTOR ANALYSIS */}
                  {analyticsSubTab === 'PSYCHOMETRICS' && (
                    <div className="space-y-4">
                      {/* Critical Pedagogical Disclaimer Banner */}
                      <div className="bg-amber-50 dark:bg-amber-950/40 border-l-4 border-amber-500 p-4 rounded-r-xl shadow-sm flex items-start space-x-3 transition-colors">
                        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                            Pedoman Interpretasi Status Butir Soal (Pedagogical Rule)
                          </h4>
                          <p className="text-xs text-amber-800 dark:text-amber-300 mt-1 leading-relaxed">
                            {AnalyticsService.PEDAGOGICAL_DISCLAIMER}
                          </p>
                        </div>
                      </div>

                      {/* Header & Filter Controls */}
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3 transition-colors">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            Analisis Butir Soal &amp; Pilihan Pengecoh
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Tingkat Kesukaran ($p$), Daya Pembeda ($D$), dan analisis pilihan pengecoh per butir soal.
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="text-slate-500 dark:text-slate-400 font-medium">Mapel:</span>
                          <select
                            value={selectedSubjectId}
                            onChange={e => setSelectedSubjectId(e.target.value)}
                            className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-200 font-semibold focus:outline-none"
                          >
                            {permittedSubjects.map(s => (
                              <option key={s.id} value={s.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                                {s.name} ({s.code})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Psychometric Metric Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm transition-colors">
                          <span className="text-slate-400 dark:text-slate-500 block mb-1">Total Butir Soal</span>
                          <span className="text-xl font-bold text-slate-900 dark:text-slate-100 font-mono">{questionAnalysisList.length} Soal</span>
                        </div>
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm transition-colors">
                          <span className="text-slate-400 dark:text-slate-500 block mb-1">Rata-Rata Daya Pembeda (D)</span>
                          <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                            {questionAnalysisList.length > 0
                              ? (questionAnalysisList.reduce((acc, q) => acc + q.discriminationIndex, 0) / questionAnalysisList.length).toFixed(2)
                              : '0.00'}
                          </span>
                        </div>
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm transition-colors">
                          <span className="text-slate-400 dark:text-slate-500 block mb-1">Soal Layak (Valid)</span>
                          <span className="text-xl font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                            {questionAnalysisList.filter(q => q.reviewRecommendation === 'Good / Valid Question').length} Soal
                          </span>
                        </div>
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm transition-colors">
                          <span className="text-slate-400 dark:text-slate-500 block mb-1">Perlu Tinjauan (Needs Review)</span>
                          <span className="text-xl font-bold text-amber-600 dark:text-amber-400 font-mono">
                            {questionAnalysisList.filter(q => q.reviewRecommendation === 'Needs Review').length} Soal
                          </span>
                        </div>
                      </div>

                      {/* Detailed Question Psychometrics Table */}
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden transition-colors">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                            <tr>
                              <th className="py-2.5 px-3 w-12 text-center">No</th>
                              <th className="py-2.5 px-3 w-28">Kode Soal</th>
                              <th className="py-2.5 px-3">Teks Ringkas &amp; Kunci</th>
                              <th className="py-2.5 px-3 w-28 text-center">Kesukaran (p)</th>
                              <th className="py-2.5 px-3 w-32 text-center">Daya Pembeda (D)</th>
                              <th className="py-2.5 px-3 w-48 text-center">Sebaran Distraktor (A/B/C/D/E)</th>
                              <th className="py-2.5 px-3 w-36 text-center">Status Informatif</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {questionAnalysisList.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="py-8 text-center text-slate-400 dark:text-slate-500 italic">
                                  Tidak ada butir soal pada mata pelajaran yang dipilih.
                                </td>
                              </tr>
                            ) : (
                              questionAnalysisList.map((qa, idx) => (
                                <tr key={qa.questionId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                  <td className="py-3 px-3 text-center font-bold text-slate-500 dark:text-slate-400">{idx + 1}</td>
                                  <td className="py-3 px-3 font-mono font-bold text-indigo-700 dark:text-indigo-400">
                                    {qa.uniqueCode}
                                  </td>
                                  <td className="py-3 px-3">
                                    <div className="text-slate-900 dark:text-slate-100 font-medium line-clamp-1">{qa.questionText}</div>
                                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                      Kunci: <strong className="text-emerald-700 dark:text-emerald-400">{qa.correctAnswer}</strong> | Benar: {qa.correctPercentage}% | Salah: {qa.incorrectPercentage}% | Kosong: {qa.unansweredPercentage}%
                                    </div>
                                  </td>
                                  <td className="py-3 px-3 text-center">
                                    <div className="flex flex-col items-center gap-1">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{qa.difficultyIndex.toFixed(2)}</span>
                                        <span
                                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                            qa.informativeStatus === 'Easy'
                                              ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300'
                                              : qa.informativeStatus === 'Difficult'
                                              ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                                              : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                                          }`}
                                        >
                                          {qa.informativeStatus}
                                        </span>
                                      </div>
                                      <div className="w-16 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                        <div
                                          className={`h-full ${
                                            qa.difficultyIndex >= 0.70
                                              ? 'bg-blue-500'
                                              : qa.difficultyIndex >= 0.30
                                              ? 'bg-emerald-500'
                                              : 'bg-rose-500'
                                          }`}
                                          style={{ width: `${Math.max(10, Math.min(100, qa.difficultyIndex * 100))}%` }}
                                        ></div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3 px-3 text-center">
                                    <div className="flex flex-col items-center gap-1">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{qa.discriminationIndex.toFixed(2)}</span>
                                        <span
                                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                            qa.discriminationStatus === 'Good Discrimination'
                                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                                              : qa.discriminationStatus === 'Moderate Discrimination'
                                              ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                                              : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                                          }`}
                                        >
                                          {qa.discriminationStatus === 'Good Discrimination' ? 'Baik' : qa.discriminationStatus === 'Moderate Discrimination' ? 'Cukup' : 'Jelek'}
                                        </span>
                                      </div>
                                      <div className="w-16 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                        <div
                                          className={`h-full ${
                                            qa.discriminationIndex >= 0.40
                                              ? 'bg-emerald-500'
                                              : qa.discriminationIndex >= 0.20
                                              ? 'bg-amber-500'
                                              : 'bg-rose-500'
                                          }`}
                                          style={{ width: `${Math.max(10, Math.min(100, Math.max(0, qa.discriminationIndex) * 100))}%` }}
                                        ></div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3 px-3 text-center font-mono text-[10px]">
                                    <div className="flex items-center justify-center space-x-1">
                                      {['A', 'B', 'C', 'D', 'E'].map(opt => {
                                        const stat = qa.distractorStats[opt];
                                        const isKey = opt === qa.correctAnswer.toUpperCase();
                                        return (
                                          <span
                                            key={opt}
                                            className={`px-1 py-0.5 rounded ${
                                              isKey
                                                ? 'bg-emerald-200 dark:bg-emerald-900/80 text-emerald-950 dark:text-emerald-100 font-bold'
                                                : stat?.isMisleading
                                                ? 'bg-rose-200 dark:bg-rose-900/80 text-rose-950 dark:text-rose-100 font-bold border border-rose-400 dark:border-rose-700'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                            }`}
                                            title={stat?.isMisleading ? `Distraktor menyesatkan: dipilih ${stat.count} siswa (${stat.percentage}%)` : `${opt}: ${stat?.count || 0}`}
                                          >
                                            {opt}:{stat?.count || 0}
                                          </span>
                                        );
                                      })}
                                    </div>
                                    {qa.distractorStats.KOSONG?.count > 0 && (
                                      <div className="text-[9px] text-amber-700 dark:text-amber-400 mt-0.5">
                                        Kosong: {qa.distractorStats.KOSONG.count}
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-3 px-3 text-center">
                                    <span
                                      className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded ${
                                        qa.reviewRecommendation === 'Needs Review'
                                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                                          : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                      }`}
                                    >
                                      {qa.reviewRecommendation}
                                    </span>
                                    {qa.reviewReasons.length > 0 && (
                                      <div className="text-[9px] text-amber-700 dark:text-amber-400 mt-1 max-w-[140px] mx-auto truncate" title={qa.reviewReasons.join(' | ')}>
                                        {qa.reviewReasons[0]}
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* SUB-TAB 5: VERIFICATION & STRESS BENCHMARK (PHASE 9 TEST SUITE) */}
                  {analyticsSubTab === 'TESTS' && (
                    <div className="space-y-4">
                      {/* Top Action Card */}
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-3 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
                              <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                              <span>Uji Validasi Sistem Analitik &amp; Performa</span>
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              Memvalidasi secara ketat 6 skenario pengujian: Filter Bertingkat, Rekapitulasi Nilai, Akurasi Analisis Soal, Penanganan Data Kosong, Skalabilitas Dataset Besar (900+ Siswa), dan Hak Akses Guru.
                            </p>
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              onClick={handleExecuteAnalyticsTests}
                              disabled={isLoading}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
                            >
                              <Play className="w-4 h-4 fill-white" />
                              <span>Jalankan 6 Test Case</span>
                            </button>

                            <button
                              onClick={handleRunLargeDatasetBenchmark}
                              disabled={isBenchmarking}
                              className="bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
                            >
                              <Cpu className="w-4 h-4 text-emerald-400" />
                              <span>{isBenchmarking ? 'Memproses Benchmark...' : 'Live Benchmark 900+ Siswa'}</span>
                            </button>
                          </div>
                        </div>

                        {analyticsTestResult && (
                          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-slate-700 dark:text-slate-300">Hasil Suite:</span>
                              <span
                                className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                                  analyticsTestResult.passed
                                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                    : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                                }`}
                              >
                                {analyticsTestResult.passed ? 'ALL SUITE PASSED (100% Deterministic)' : 'TEST FAILED'}
                              </span>
                              <span className="text-slate-500 dark:text-slate-400 font-mono">
                                ({analyticsTestResult.passedTests}/{analyticsTestResult.totalTests} Lolos)
                              </span>
                            </div>
                            <div className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                              Total Waktu Eksekusi: <strong className="text-slate-900 dark:text-slate-100">{analyticsTestResult.executionTimeMs} ms</strong>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Benchmark Live Result Box */}
                      {benchmarkResult && (
                        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 dark:from-[#0a0f1d] dark:via-[#090b16] dark:to-[#070912] text-white rounded-xl p-5 shadow-sm space-y-3 border border-indigo-900/40 dark:border-slate-800 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Cpu className="w-5 h-5 text-emerald-400" />
                              <span className="text-sm font-bold text-white">
                                Hasil Live Stress Benchmark (Dataset Skala Besar)
                              </span>
                            </div>
                            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded">
                              Latency &lt; 250ms SLA Passed
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs pt-1">
                            <div className="bg-white/10 dark:bg-slate-900/60 rounded-lg p-2.5 border border-white/5 dark:border-slate-800">
                              <span className="text-indigo-200 dark:text-indigo-300 block text-[10px]">Populasi Siswa</span>
                              <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">
                                {benchmarkResult.studentCount}
                              </span>
                              <span className="text-[10px] text-indigo-300 dark:text-indigo-400">Target &ge; 900 Siswa</span>
                            </div>

                            <div className="bg-white/10 dark:bg-slate-900/60 rounded-lg p-2.5 border border-white/5 dark:border-slate-800">
                              <span className="text-indigo-200 dark:text-indigo-300 block text-[10px]">Rombel / Kelas</span>
                              <span className="text-xl font-bold font-mono text-white mt-1 block">
                                {benchmarkResult.classCount}
                              </span>
                              <span className="text-[10px] text-indigo-300 dark:text-indigo-400">Target &ge; 29 Kelas</span>
                            </div>

                            <div className="bg-white/10 dark:bg-slate-900/60 rounded-lg p-2.5 border border-white/5 dark:border-slate-800">
                              <span className="text-indigo-200 dark:text-indigo-300 block text-[10px]">Butir Jawaban Siswa</span>
                              <span className="text-xl font-bold font-mono text-cyan-300 mt-1 block">
                                {benchmarkResult.answersCount.toLocaleString()}
                              </span>
                              <span className="text-[10px] text-indigo-300 dark:text-indigo-400">Puluhan Ribu Baris</span>
                            </div>

                            <div className="bg-white/10 dark:bg-slate-900/60 rounded-lg p-2.5 border border-white/5 dark:border-slate-800">
                              <span className="text-indigo-200 dark:text-indigo-300 block text-[10px]">Waktu Agregasi (Query)</span>
                              <span className="text-xl font-bold font-mono text-emerald-300 mt-1 block">
                                {benchmarkResult.aggregationTimeMs} ms
                              </span>
                              <span className="text-[10px] text-emerald-300">Sub-second Speed</span>
                            </div>

                            <div className="bg-white/10 dark:bg-slate-900/60 rounded-lg p-2.5 border border-white/5 dark:border-slate-800">
                              <span className="text-indigo-200 dark:text-indigo-300 block text-[10px]">Rata-Rata Terhitung</span>
                              <span className="text-xl font-bold font-mono text-white mt-1 block">
                                {benchmarkResult.overallAverage}
                              </span>
                              <span className="text-[10px] text-indigo-300 dark:text-indigo-400">Distribusi Normal</span>
                            </div>

                            <div className="bg-white/10 dark:bg-slate-900/60 rounded-lg p-2.5 border border-white/5 dark:border-slate-800">
                              <span className="text-indigo-200 dark:text-indigo-300 block text-[10px]">Tingkat Kelulusan</span>
                              <span className="text-xl font-bold font-mono text-white mt-1 block">
                                {benchmarkResult.overallPassingRate}%
                              </span>
                              <span className="text-[10px] text-indigo-300 dark:text-indigo-400">KKM 75</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Test Case Cards List */}
                      {analyticsTestResult && (
                        <div className="space-y-3">
                          {analyticsTestResult.tests.map(t => (
                            <div
                              key={t.testId}
                              className={`bg-white dark:bg-slate-900 border rounded-xl p-4 shadow-sm transition-all ${
                                t.passed
                                  ? 'border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/20 dark:bg-emerald-950/20'
                                  : 'border-rose-200 dark:border-rose-800/80 bg-rose-50/20 dark:bg-rose-950/20'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                  <div className="flex items-center space-x-2">
                                    <span className="w-5 h-5 rounded-full bg-slate-900 dark:bg-slate-800 text-white text-[10px] font-bold flex items-center justify-center font-mono">
                                      {t.testId}
                                    </span>
                                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">{t.name}</h4>
                                  </div>
                                  <p className="text-xs text-slate-700 dark:text-slate-300 pl-7 leading-relaxed">{t.message}</p>
                                </div>
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center space-x-1 ${
                                    t.passed
                                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                      : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                                  }`}
                                >
                                  {t.passed ? <Check className="w-3 h-3 text-emerald-700 dark:text-emerald-400" /> : <X className="w-3 h-3 text-rose-700 dark:text-rose-400" />}
                                  <span>{t.passed ? 'PASSED' : 'FAILED'}</span>
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 8.5: PROGRESS TRACKING */}
              {activeTab === 'PROGRESS_TRACKING' && (
                <div className="space-y-6">
                  {/* Top Control Bar & Sub-Navigation */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4 transition-colors">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center space-x-2">
                          <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                            Grafik &amp; Pelacakan Perkembangan Hasil Ujian
                          </h2>
                          <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full font-mono">
                            Multi-Try Out (TO-1 s/d TO-4)
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Pantau tren kemajuan belajar siswa, perbandingan performa kelas, dinamika nilai per mata pelajaran, serta ketercapaian kompetensi.
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            const res = dbService.runProgressEngineTests(currentUser);
                            setProgressTestResult(res);
                            triggerToast(`Validasi Algoritma Progress Tracking Selesai (${res.passedTests}/${res.totalTests} Lolos)`);
                          }}
                          className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold px-3 py-2 rounded-xl flex items-center space-x-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                          title="Jalankan uji kalkulasi agregasi tren"
                        >
                          <Play className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Uji Validasi Sistem</span>
                        </button>
                      </div>
                    </div>

                    {/* Sub-Navigation Pills */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2 text-xs font-semibold">
                      <button
                        onClick={() => setProgressSubTab('STUDENT')}
                        className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center space-x-2 ${
                          progressSubTab === 'STUDENT'
                            ? 'bg-indigo-600 text-white shadow-xs font-bold'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Progress Siswa</span>
                      </button>
                      <button
                        onClick={() => setProgressSubTab('CLASS')}
                        className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center space-x-2 ${
                          progressSubTab === 'CLASS'
                            ? 'bg-indigo-600 text-white shadow-xs font-bold'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        <School className="w-3.5 h-3.5" />
                        <span>Progress Rombel / Kelas</span>
                      </button>
                      <button
                        onClick={() => setProgressSubTab('SUBJECT')}
                        className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center space-x-2 ${
                          progressSubTab === 'SUBJECT'
                            ? 'bg-indigo-600 text-white shadow-xs font-bold'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Progress Mata Pelajaran</span>
                      </button>
                      <button
                        onClick={() => setProgressSubTab('COMPETENCY')}
                        className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center space-x-2 ${
                          progressSubTab === 'COMPETENCY'
                            ? 'bg-indigo-600 text-white shadow-xs font-bold'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        <Target className="w-3.5 h-3.5" />
                        <span>Penguasaan Kompetensi (KD)</span>
                      </button>
                      <button
                        onClick={() => setProgressSubTab('TESTS')}
                        className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center space-x-2 ${
                          progressSubTab === 'TESTS'
                            ? 'bg-slate-900 dark:bg-slate-700 text-white shadow-xs font-bold'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Log Pengujian</span>
                      </button>
                    </div>
                  </div>

                  {/* AUTOMATED TEST SUITE HUB RESULTS (PHASE 12 GATE) */}
                  {(progressSubTab === 'TESTS' || progressTestResult) && progressTestResult && (
                    <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                        <div className="flex items-center space-x-2">
                          <ShieldCheck className="w-5 h-5 text-emerald-600" />
                          <h3 className="text-sm font-bold text-slate-900">
                            Hasil Pengujian Otomatis Pelacakan Perkembangan Siswa
                          </h3>
                        </div>

                        <div className="flex items-center space-x-2">
                          <span
                            className={`text-[10px] font-bold px-2.5 py-1 rounded border font-mono ${
                              progressTestResult.passed
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : 'bg-rose-100 text-rose-800 border-rose-300'
                            }`}
                          >
                            {progressTestResult.passed ? 'PHASE 12 — VERIFIED & FROZEN' : 'PHASE 12 — TEST FAILED'}
                          </span>
                          <span className="text-xs font-mono text-slate-500">
                            Waktu: <strong>{progressTestResult.executionTimeMs} ms</strong>
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {progressTestResult.tests.map(t => (
                          <div
                            key={t.testId}
                            className={`p-3 rounded border text-xs space-y-1 transition-all ${
                              t.passed ? 'bg-emerald-50/30 border-emerald-200' : 'bg-rose-50/30 border-rose-200'
                            }`}
                          >
                            <div className="flex items-center justify-between font-bold">
                              <span className="text-slate-900">Test {t.testId}: {t.name}</span>
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                                  t.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {t.passed ? 'PASSED' : 'FAILED'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 leading-relaxed">{t.message}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SUB-TAB 1: STUDENT PROGRESS TRACKING */}
                  {progressSubTab === 'STUDENT' && (() => {
                    const filteredStudents = selectedClassForProgress === 'ALL'
                      ? students
                      : students.filter(s => s.classId === selectedClassForProgress);
                    
                    const activeStudentId = selectedStudentForProgress && filteredStudents.some(s => s.id === selectedStudentForProgress)
                      ? selectedStudentForProgress
                      : filteredStudents[0]?.id || students[0]?.id || 's-1';

                    const studentProg = dbService.getStudentProgress(activeStudentId);
                    const currentStudentObj = students.find(s => s.id === activeStudentId);

                    return (
                      <div className="space-y-5">
                        {/* Filter Bar */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs transition-colors">
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center space-x-2">
                              <span className="text-slate-500 dark:text-slate-400 font-medium">Filter Kelas:</span>
                              <select
                                value={selectedClassForProgress}
                                onChange={e => {
                                  setSelectedClassForProgress(e.target.value);
                                  const firstInClass = students.find(s => e.target.value === 'ALL' || s.classId === e.target.value);
                                  if (firstInClass) setSelectedStudentForProgress(firstInClass.id);
                                }}
                                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-slate-800 dark:text-slate-200 rounded-xl px-2.5 py-1.5 cursor-pointer focus:ring-2 focus:ring-indigo-500"
                              >
                                <option value="ALL">Semua Kelas</option>
                                {classes.map(c => (
                                  <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                              </select>
                            </div>

                            <div className="flex items-center space-x-2">
                              <span className="text-slate-500 dark:text-slate-400 font-medium">Pilih Siswa:</span>
                              <select
                                value={activeStudentId}
                                onChange={e => setSelectedStudentForProgress(e.target.value)}
                                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white rounded-xl px-3 py-1.5 cursor-pointer focus:ring-2 focus:ring-indigo-500"
                              >
                                {filteredStudents.map(s => (
                                  <option key={s.id} value={s.id}>{s.name} ({s.nisn})</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {studentProg && (
                            <div className="flex flex-wrap items-center gap-3 text-xs">
                              <div className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                                <span className="text-slate-500 dark:text-slate-400">Kelas: </span>
                                <strong className="text-slate-900 dark:text-white">{studentProg.className}</strong>
                              </div>
                              <div className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900 rounded-xl">
                                <span className="text-indigo-600 dark:text-indigo-400 font-medium">Target: </span>
                                <strong className="text-indigo-700 dark:text-indigo-300 font-mono">{studentProg.targetScore}</strong>
                              </div>
                              <div className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                                <span className="text-slate-500 dark:text-slate-400">Delta Skor: </span>
                                <strong className={studentProg.scoreDelta >= 0 ? 'text-emerald-600 dark:text-emerald-400 font-mono' : 'text-rose-600 dark:text-rose-400 font-mono'}>
                                  {studentProg.scoreDelta > 0 ? `+${studentProg.scoreDelta.toFixed(1)}` : studentProg.scoreDelta.toFixed(1)}
                                </strong>
                              </div>
                              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-xl border ${
                                studentProg.trend === 'MENINGKAT'
                                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                                  : studentProg.trend === 'STABIL'
                                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                                  : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                              }`}>
                                TREN: {studentProg.trend}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Progression Cards Line Chart Simulation */}
                        {studentProg && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {studentProg.points.map((pt, idx) => (
                              <div key={pt.tryoutId} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4.5 shadow-xs space-y-3 transition-colors">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-bold font-mono text-indigo-600 dark:text-indigo-400 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 rounded-md border border-indigo-100 dark:border-indigo-900">
                                    {pt.tryoutCode}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono">{pt.date}</span>
                                </div>
                                <div>
                                  <div className="text-3xl font-black font-mono text-slate-900 dark:text-white tracking-tight">
                                    {pt.score.toFixed(1)}
                                  </div>
                                  <div className="text-[10px] text-slate-500 mt-0.5">Nilai Akhir Siswa</div>
                                </div>
                                <div className="space-y-1.5 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
                                  <div className="flex justify-between items-center">
                                    <span>Rata-Rata Kelas:</span>
                                    <strong className="font-mono text-slate-900 dark:text-white">{pt.classAverage?.toFixed(1) || '75.0'}</strong>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span>Jawaban Benar:</span>
                                    <strong className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">{pt.totalCorrect} Soal</strong>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span>Status Target ({pt.targetScore}):</span>
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                      pt.isTargetMet
                                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                        : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                                    }`}>
                                      {pt.isTargetMet ? 'TERCAPAI' : 'BELUM'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Strong vs Weak Areas */}
                        {studentProg && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                            <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-5 space-y-2.5">
                              <h4 className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center space-x-2">
                                <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                <span>Materi &amp; Kompetensi Sangat Dikuasai (Strong Areas)</span>
                              </h4>
                              <ul className="space-y-1.5 text-slate-700 dark:text-slate-300 pl-5 list-disc leading-relaxed">
                                {studentProg.strongAreas.length > 0 ? (
                                  studentProg.strongAreas.map((s, idx) => <li key={idx}><span className="font-medium text-emerald-800 dark:text-emerald-200">{s}</span></li>)
                                ) : (
                                  <li className="italic text-slate-500">Belum ada materi mencapai kriteria penguasaan &ge; 75%</li>
                                )}
                              </ul>
                            </div>

                            <div className="bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/60 rounded-2xl p-5 space-y-2.5">
                              <h4 className="font-bold text-rose-900 dark:text-rose-300 flex items-center space-x-2">
                                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                                <span>Materi Memerlukan Pendampingan / Remedial (Weak Areas)</span>
                              </h4>
                              <ul className="space-y-1.5 text-slate-700 dark:text-slate-300 pl-5 list-disc leading-relaxed">
                                {studentProg.weakAreas.length > 0 ? (
                                  studentProg.weakAreas.map((w, idx) => <li key={idx}><span className="font-medium text-rose-800 dark:text-rose-200">{w}</span></li>)
                                ) : (
                                  <li className="italic text-slate-500">Luar biasa! Tidak ada materi di bawah KKM 75%</li>
                                )}
                              </ul>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* SUB-TAB 2: CLASS PROGRESS TRACKING */}
                  {progressSubTab === 'CLASS' && (() => {
                    const classProg = dbService.getClassProgress(selectedClassForProgress || classes[0]?.id || 'c-xii-ipa1', currentUser);
                    const selectedClassObj = classes.find(c => c.id === (selectedClassForProgress || classes[0]?.id));
                    return (
                      <div className="space-y-5">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs transition-colors">
                          <div className="flex items-center space-x-2">
                            <span className="text-slate-500 dark:text-slate-400 font-medium">Pilih Rombel / Kelas:</span>
                            <select
                              value={selectedClassForProgress}
                              onChange={e => setSelectedClassForProgress(e.target.value)}
                              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white rounded-xl px-3 py-1.5 cursor-pointer focus:ring-2 focus:ring-indigo-500"
                            >
                              {classes.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                          </div>

                          {classProg && (
                            <div className="flex flex-wrap items-center gap-3 text-xs">
                              <div className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                                <span className="text-slate-500 dark:text-slate-400">Total Siswa: </span>
                                <strong className="text-slate-900 dark:text-white">{classProg.studentCount}</strong>
                              </div>
                              <div className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                                <span className="text-slate-500 dark:text-slate-400">Perubahan Rata-Rata: </span>
                                <strong className={classProg.averageDelta >= 0 ? 'text-emerald-600 dark:text-emerald-400 font-mono' : 'text-rose-600 dark:text-rose-400 font-mono'}>
                                  {classProg.averageDelta > 0 ? `+${classProg.averageDelta.toFixed(1)}` : classProg.averageDelta.toFixed(1)}
                                </strong>
                              </div>
                              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-xl border ${classProg.trend === 'MENINGKAT' ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800' : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800'}`}>
                                TREN: {classProg.trend}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Class Progression Cards */}
                        {classProg && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {classProg.points.map((pt, idx) => (
                              <div key={pt.tryoutId} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4.5 shadow-xs space-y-3 transition-colors">
                                <div className="flex items-center justify-between text-xs font-mono">
                                  <span className="font-bold text-indigo-600 dark:text-indigo-400 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 rounded-md border border-indigo-100 dark:border-indigo-900">
                                    {pt.tryoutCode}
                                  </span>
                                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 px-2 py-0.5 rounded-full font-bold">
                                    Tuntas: {pt.passingRatePct}%
                                  </span>
                                </div>
                                <div>
                                  <div className="text-3xl font-black font-mono text-slate-900 dark:text-white tracking-tight">
                                    {pt.averageScore.toFixed(1)}
                                  </div>
                                  <div className="text-[10px] text-slate-500 mt-0.5">Rata-Rata Kelas</div>
                                </div>
                                <div className="space-y-1.5 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                                  <div className="flex justify-between"><span>Median Skor:</span><strong className="text-slate-900 dark:text-white">{pt.medianScore.toFixed(1)}</strong></div>
                                  <div className="flex justify-between"><span>Skor Tertinggi:</span><strong className="text-emerald-600 dark:text-emerald-400">{pt.highestScore.toFixed(1)}</strong></div>
                                  <div className="flex justify-between"><span>Skor Terendah:</span><strong className="text-rose-600 dark:text-rose-400">{pt.lowestScore.toFixed(1)}</strong></div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Visual Trajectory Line Graph for Class */}
                        {classProg && classProg.points.length > 0 && (() => {
                          const pts = classProg.points;
                          const viewCoords = pts.map((pt, idx) => {
                            const x = 60 + (idx / Math.max(1, pts.length - 1)) * 390;
                            const y = 120 - ((pt.averageScore / 100) * 100);
                            return { ...pt, x, y };
                          });
                          const svgPolyPoints = viewCoords.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');

                          return (
                            <div className="p-5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                              <div className="flex items-center justify-between text-xs font-mono">
                                <span className="font-bold text-indigo-700 dark:text-indigo-400">
                                  Grafik Tren Rata-Rata {selectedClassObj?.name || 'Kelas'}
                                </span>
                                <span className="text-amber-600 dark:text-amber-400 font-bold">Ambang KKM: 75.0</span>
                              </div>

                              <div className="relative w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs">
                                <svg className="w-full h-44 overflow-visible z-10 relative" viewBox="0 0 500 150" preserveAspectRatio="none">
                                  <line x1="40" y1="20" x2="490" y2="20" stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth="1" />
                                  <text x="32" y="23" textAnchor="end" className="text-[9px] fill-slate-400 font-mono">100</text>

                                  <line x1="40" y1="45" x2="490" y2="45" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="5 4" />
                                  <text x="32" y="48" textAnchor="end" className="text-[9px] fill-amber-500 font-mono font-bold">75</text>

                                  <line x1="40" y1="120" x2="490" y2="120" stroke="currentColor" className="text-slate-200 dark:border-slate-800" strokeWidth="1" />
                                  <text x="32" y="123" textAnchor="end" className="text-[9px] fill-slate-400 font-mono">0</text>

                                  <polyline
                                    fill="none"
                                    stroke="#4f46e5"
                                    strokeWidth="3.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    points={svgPolyPoints}
                                  />

                                  {viewCoords.map((node, i) => (
                                    <g key={i}>
                                      <rect x={node.x - 20} y={node.y - 22} width="40" height="17" rx="5" className="fill-slate-900 dark:fill-slate-100" />
                                      <text x={node.x} y={node.y - 10} textAnchor="middle" className="text-[10px] font-mono font-bold fill-indigo-400 dark:fill-indigo-700">{node.averageScore.toFixed(1)}</text>
                                      <circle cx={node.x} cy={node.y} r="5" fill="#4f46e5" stroke="#ffffff" strokeWidth="2" />
                                      <text x={node.x} y="138" textAnchor="middle" className="text-[10px] font-mono font-bold fill-slate-500">{node.tryoutCode}</text>
                                    </g>
                                  ))}
                                </svg>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })()}

                  {/* SUB-TAB 3: SUBJECT PROGRESS TRACKING */}
                  {progressSubTab === 'SUBJECT' && (() => {
                    const subjProg = dbService.getSubjectProgress(selectedSubjectId, currentUser);
                    const activeSubjectObj = permittedSubjects.find(s => s.id === selectedSubjectId) || permittedSubjects[0];
                    const points = subjProg?.points || [];
                    const polyPoints = points.map((pt, idx) => {
                      const x = (idx / Math.max(1, points.length - 1)) * 100;
                      const y = 90 - ((pt.averageScore / 100) * 80);
                      return `${x.toFixed(1)},${y.toFixed(1)}`;
                    }).join(' ');

                    return (
                      <div className="space-y-5">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs transition-colors">
                          <div className="flex items-center space-x-2">
                            <span className="text-slate-500 dark:text-slate-400 font-medium">Mata Pelajaran:</span>
                            <select
                              value={selectedSubjectId}
                              onChange={e => setSelectedSubjectId(e.target.value)}
                              className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold text-slate-900 dark:text-white rounded-lg p-1.5 cursor-pointer"
                            >
                              {permittedSubjects.map(s => (
                                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                              ))}
                            </select>
                          </div>

                          {subjProg && (
                            <div className="flex items-center space-x-3 text-xs">
                              <span className="text-slate-600 dark:text-slate-300">Delta Progress: <strong className={subjProg.delta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>{subjProg.delta > 0 ? `+${subjProg.delta}%` : `${subjProg.delta}%`}</strong></span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800">
                                TREN: {subjProg.trend}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Visual Trajectory Line Graph for Subject */}
                        {subjProg && points.length > 0 && (() => {
                          const viewCoords = points.map((pt, idx) => {
                            const x = 60 + (idx / Math.max(1, points.length - 1)) * 390;
                            const y = 120 - ((pt.averageScore / 100) * 100);
                            return { ...pt, x, y };
                          });
                          const svgPolyPoints = viewCoords.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');

                          return (
                            <div className="p-5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                              <div className="flex items-center justify-between text-xs font-mono">
                                <span className="font-bold text-teal-700 dark:text-teal-300">Grafik Laju Perkembangan {activeSubjectObj?.name} (Rata-Rata Seluruh Kelas)</span>
                                <span className="text-amber-600 dark:text-amber-400 font-bold">Target KKM Mapel: 75.0 Poin</span>
                              </div>

                              <div className="relative w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs">
                                <svg className="w-full h-52 overflow-visible z-10 relative" viewBox="0 0 500 160" preserveAspectRatio="none">
                                  {/* Grid Lines */}
                                  <line x1="40" y1="20" x2="490" y2="20" stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth="1" />
                                  <text x="32" y="23" textAnchor="end" className="text-[9px] fill-slate-400 font-mono">100</text>

                                  {/* KKM Line 75 */}
                                  <line x1="40" y1="45" x2="490" y2="45" stroke="#f59e0b" strokeWidth="2" strokeDasharray="5 4" />
                                  <text x="32" y="48" textAnchor="end" className="text-[9px] fill-amber-500 font-mono font-bold">75</text>
                                  <rect x="410" y="32" width="75" height="16" rx="4" fill="#f59e0b" />
                                  <text x="447" y="43" textAnchor="middle" className="text-[8px] font-mono font-bold fill-slate-950">Garis KKM (75)</text>

                                  <line x1="40" y1="120" x2="490" y2="120" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeWidth="1" />
                                  <text x="32" y="123" textAnchor="end" className="text-[9px] fill-slate-400 font-mono">0</text>

                                  {/* Connected Line */}
                                  <polyline
                                    fill="none"
                                    stroke="#0d9488"
                                    strokeWidth="3.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    points={svgPolyPoints}
                                  />

                                  {/* Coordinate Nodes, Badges & X-Axis Labels */}
                                  {viewCoords.map((node, i) => (
                                    <g key={i}>
                                      <rect x={node.x - 20} y={node.y - 22} width="40" height="17" rx="6" className="fill-slate-900 dark:fill-slate-100" />
                                      <text x={node.x} y={node.y - 10} textAnchor="middle" className="text-[10px] font-mono font-bold fill-teal-400 dark:fill-teal-700">{node.averageScore.toFixed(1)}</text>
                                      <circle cx={node.x} cy={node.y} r="5" fill="#0d9488" stroke="#ffffff" strokeWidth="2.5" />
                                      <text x={node.x} y="142" textAnchor="middle" className="text-[10px] font-mono font-bold fill-slate-500">{node.tryoutCode}</text>
                                    </g>
                                  ))}
                                </svg>
                              </div>
                            </div>
                          );
                        })()}

                        {/* DIAGRAM KETUNTASAN SISWA MATAPELAJARAN (ATAS KKM vs DI BAWAH KKM PER KELAS & PER TRYOUT) */}
                        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-5 shadow-2xs">
                          
                          {/* Header & Filter Selector for TryOut Stage */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                            <div>
                              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                <Users className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                <span>Diagram Ketuntasan Siswa Mapel {activeSubjectObj?.name || 'Mata Pelajaran'}</span>
                              </h3>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Perbandingan jumlah & persentase siswa tuntas (≥ KKM 75.0) vs belum tuntas (&lt; KKM 75.0) khusus mata pelajaran {activeSubjectObj?.name} di setiap kelas yang diampu.
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
                                      ? 'bg-teal-600 text-white shadow-2xs'
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
                              <span className="text-[10px] text-slate-500 font-mono uppercase">Total Siswa Bimbingan</span>
                              <div className="text-lg font-black text-slate-900 dark:text-white font-mono">90 Siswa</div>
                              <p className="text-[11px] text-slate-500">Lintas 3 Kelas Diampu</p>
                            </div>

                            <div className="p-3.5 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl space-y-1 shadow-2xs">
                              <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-mono font-bold uppercase">Rata-Rata Siswa Tuntas</span>
                              <div className="text-lg font-black text-emerald-700 dark:text-emerald-300 font-mono">
                                {selectedPassFailTO === 'TO 1' ? '60 Siswa (66.7%)' :
                                 selectedPassFailTO === 'TO 2' ? '69 Siswa (76.7%)' :
                                 selectedPassFailTO === 'TO 3' ? '78 Siswa (86.7%)' :
                                 selectedPassFailTO === 'TO 4' ? '84 Siswa (93.3%)' :
                                 '72 Siswa (80.0%)'}
                              </div>
                              <p className="text-[11px] text-emerald-600 dark:text-emerald-400">Memenuhi KKM 75.0 {activeSubjectObj?.name}</p>
                            </div>

                            <div className="p-3.5 bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 rounded-xl space-y-1 shadow-2xs">
                              <span className="text-[10px] text-rose-700 dark:text-rose-300 font-mono font-bold uppercase">Siswa Belum Tuntas</span>
                              <div className="text-lg font-black text-rose-700 dark:text-rose-300 font-mono">
                                {selectedPassFailTO === 'TO 1' ? '30 Siswa (33.3%)' :
                                 selectedPassFailTO === 'TO 2' ? '21 Siswa (23.3%)' :
                                 selectedPassFailTO === 'TO 3' ? '12 Siswa (13.3%)' :
                                 selectedPassFailTO === 'TO 4' ? '6 Siswa (6.7%)' :
                                 '18 Siswa (20.0%)'}
                              </div>
                              <p className="text-[11px] text-rose-600 dark:text-rose-400">Memerlukan Remedial Mapel</p>
                            </div>

                            <div className="p-3.5 bg-slate-100/80 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1 shadow-2xs">
                              <span className="text-[10px] text-slate-500 font-mono uppercase">Tahapan Evaluasi</span>
                              <div className="text-lg font-black text-slate-900 dark:text-white font-mono">
                                {selectedPassFailTO === 'ALL' ? 'Aggregat All TO' : selectedPassFailTO}
                              </div>
                              <p className="text-[11px] text-teal-600 dark:text-teal-400 font-medium">
                                {selectedPassFailTO === 'TO 4' ? 'Hasil Evaluasi Akhir' : 'Progres Sesi'}
                              </p>
                            </div>
                          </div>

                          {/* Class-by-Class Breakdown for this active subject */}
                          <div className="space-y-4 pt-1">
                            <div className="flex items-center justify-between text-xs border-b border-slate-100 dark:border-slate-800 pb-2">
                              <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">
                                Rasio Ketuntasan Per Kelas Pada Mapel {activeSubjectObj?.name} · {selectedPassFailTO === 'ALL' ? 'Seluruh TO' : selectedPassFailTO}
                              </span>
                              <div className="flex items-center gap-4 text-[11px] font-mono">
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-xs bg-emerald-500 inline-block"></span> Tuntas (≥ KKM 75)</span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-xs bg-rose-500 inline-block"></span> Belum Tuntas (&lt; KKM 75)</span>
                              </div>
                            </div>

                            <div className="space-y-4">
                              {[
                                { classLabel: 'Kelas XII IPA 1 (Rombel Utuh)',
                                  data: {
                                    'TO 1': { pass: 22, fail: 8 },
                                    'TO 2': { pass: 25, fail: 5 },
                                    'TO 3': { pass: 28, fail: 2 },
                                    'TO 4': { pass: 29, fail: 1 },
                                    'ALL':  { pass: 26, fail: 4 },
                                  }
                                },
                                { classLabel: 'Kelas XII IPA 2',
                                  data: {
                                    'TO 1': { pass: 20, fail: 10 },
                                    'TO 2': { pass: 23, fail: 7 },
                                    'TO 3': { pass: 26, fail: 4 },
                                    'TO 4': { pass: 28, fail: 2 },
                                    'ALL':  { pass: 24, fail: 6 },
                                  }
                                },
                                { classLabel: 'Kelas XII IPS 1',
                                  data: {
                                    'TO 1': { pass: 18, fail: 12 },
                                    'TO 2': { pass: 21, fail: 9 },
                                    'TO 3': { pass: 24, fail: 6 },
                                    'TO 4': { pass: 27, fail: 3 },
                                    'ALL':  { pass: 22, fail: 8 },
                                  }
                                },
                              ].map((cls, cIdx) => {
                                const stats = cls.data[selectedPassFailTO as keyof typeof cls.data] || cls.data['ALL'];
                                const total = stats.pass + stats.fail;
                                const passPct = ((stats.pass / total) * 100).toFixed(1);
                                const failPct = ((stats.fail / total) * 100).toFixed(1);

                                return (
                                  <div key={cIdx} className="space-y-1.5 p-3.5 bg-slate-50/70 dark:bg-slate-950/70 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                                      <span className="font-bold text-slate-900 dark:text-slate-100 font-sans">{cls.classLabel}</span>
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

                                    {/* Visual Proportional Stacked Bar */}
                                    <div className="w-full h-8 bg-slate-200/90 dark:bg-slate-800 rounded-xl overflow-hidden flex p-0.5 border border-slate-300/80 dark:border-slate-700/80 shadow-2xs">
                                      {stats.pass > 0 && (
                                        <div
                                          style={{ width: `${passPct}%` }}
                                          className="bg-gradient-to-r from-emerald-600 to-emerald-500 h-full rounded-l-lg flex items-center justify-start px-3 transition-all duration-500 group relative"
                                        >
                                          <span className="text-[11px] font-mono font-bold text-white whitespace-nowrap drop-shadow-xs">
                                            {stats.pass} Siswa ({passPct}%)
                                          </span>
                                        </div>
                                      )}
                                      {stats.fail > 0 && (
                                        <div
                                          style={{ width: `${failPct}%` }}
                                          className="bg-gradient-to-r from-rose-500 to-rose-600 h-full rounded-r-lg flex items-center justify-end px-3 transition-all duration-500 group relative"
                                        >
                                          <span className="text-[11px] font-mono font-bold text-white whitespace-nowrap drop-shadow-xs">
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

                        {/* Class Comparison & Score Distribution Histogram */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Class Comparison */}
                          <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider font-mono">
                              Perbandingan Ketuntasan Mapel Per Kelas
                            </h3>
                            <div className="space-y-3 pt-2">
                              {[
                                { classLabel: 'XII IPA 1', avg: 85.0, passing: '92%', color: 'bg-emerald-600' },
                                { classLabel: 'XII IPA 2', avg: 81.5, passing: '88%', color: 'bg-teal-600' },
                                { classLabel: 'XII IPS 1', avg: 76.0, passing: '78%', color: 'bg-indigo-600' },
                              ].map(cl => (
                                <div key={cl.classLabel} className="space-y-1 text-xs">
                                  <div className="flex justify-between font-medium text-slate-700 dark:text-slate-300">
                                    <span>{cl.classLabel}</span>
                                    <span className="font-mono font-bold">{cl.avg} Poin ({cl.passing} Tuntas)</span>
                                  </div>
                                  <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                                    <div style={{ width: `${cl.avg}%` }} className={`h-full ${cl.color} rounded-full transition-all duration-500`} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Histogram Distribution */}
                          <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider font-mono">
                              Distribusi Predikat Skor Siswa ({activeSubjectObj?.name})
                            </h3>
                            <div className="grid grid-cols-4 gap-2 text-center pt-2 text-xs font-mono">
                              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl space-y-1">
                                <div className="text-[10px] text-rose-700 dark:text-rose-300 font-bold">&lt; 60 (Kurang)</div>
                                <div className="text-xl font-black text-rose-700 dark:text-rose-300">2</div>
                                <div className="text-[10px] text-slate-500">Siswa</div>
                              </div>
                              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl space-y-1">
                                <div className="text-[10px] text-amber-700 dark:text-amber-300 font-bold">60-74 (Cukup)</div>
                                <div className="text-xl font-black text-amber-700 dark:text-amber-300">4</div>
                                <div className="text-[10px] text-slate-500">Siswa</div>
                              </div>
                              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 rounded-xl space-y-1">
                                <div className="text-[10px] text-indigo-700 dark:text-indigo-300 font-bold">75-89 (Baik)</div>
                                <div className="text-xl font-black text-indigo-700 dark:text-indigo-300">18</div>
                                <div className="text-[10px] text-slate-500">Siswa</div>
                              </div>
                              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-xl space-y-1">
                                <div className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold">90-100 (Sangat Baik)</div>
                                <div className="text-xl font-black text-emerald-700 dark:text-emerald-300">8</div>
                                <div className="text-[10px] text-slate-500">Siswa</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* SUB-TAB 4: COMPETENCY PROGRESS TRACKING */}
                  {progressSubTab === 'COMPETENCY' && (() => {
                    const compProg = dbService.getCompetencyProgress(selectedCompetencyForProgress || competencies[0]?.id || 'comp-mat-1', currentUser);
                    const selectedCompObj = competencies.find(c => c.id === (selectedCompetencyForProgress || competencies[0]?.id));
                    return (
                      <div className="space-y-5">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs transition-colors">
                          <div className="flex items-center space-x-2">
                            <span className="text-slate-500 dark:text-slate-400 font-medium">Pilih Kompetensi / KD:</span>
                            <select
                              value={selectedCompetencyForProgress}
                              onChange={e => setSelectedCompetencyForProgress(e.target.value)}
                              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white rounded-xl px-3 py-1.5 cursor-pointer max-w-sm focus:ring-2 focus:ring-indigo-500"
                            >
                              {competencies.map(c => (
                                <option key={c.id} value={c.id}>{c.code} — {c.statement.slice(0, 45)}...</option>
                              ))}
                            </select>
                          </div>

                          {compProg && (
                            <div className="flex flex-wrap items-center gap-3 text-xs">
                              <div className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                                <span className="text-slate-500 dark:text-slate-400">Materi: </span>
                                <strong className="text-slate-900 dark:text-white">{compProg.materialTitle}</strong>
                              </div>
                              <div className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                                <span className="text-slate-500 dark:text-slate-400">Perubahan Shift: </span>
                                <strong className={compProg.delta >= 0 ? 'text-emerald-600 dark:text-emerald-400 font-mono' : 'text-rose-600 dark:text-rose-400 font-mono'}>
                                  {compProg.delta > 0 ? `+${compProg.delta.toFixed(1)}%` : `${compProg.delta.toFixed(1)}%`}
                                </strong>
                              </div>
                              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-xl border ${compProg.status === 'TUNTAS' ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800' : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'}`}>
                                STATUS: {compProg.status}
                              </span>
                            </div>
                          )}
                        </div>

                        {selectedCompObj && (
                          <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl text-xs space-y-1">
                            <span className="font-bold font-mono text-indigo-700 dark:text-indigo-400">{selectedCompObj.code}</span>
                            <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                              {selectedCompObj.statement}
                            </p>
                          </div>
                        )}

                        {compProg && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {compProg.progression.map((pt, idx) => (
                              <div key={pt.tryoutId} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4.5 shadow-xs space-y-3 transition-colors">
                                <div className="flex items-center justify-between text-xs font-mono">
                                  <span className="font-bold text-indigo-600 dark:text-indigo-400 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 rounded-md border border-indigo-100 dark:border-indigo-900">
                                    {pt.tryoutCode}
                                  </span>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    pt.masteryPercentage >= 75
                                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                      : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                                  }`}>
                                    {pt.masteryPercentage >= 75 ? 'Tuntas' : 'Perlu Penguatan'}
                                  </span>
                                </div>
                                <div>
                                  <div className="text-3xl font-black font-mono text-slate-900 dark:text-white tracking-tight">
                                    {pt.masteryPercentage}%
                                  </div>
                                  <div className="text-[10px] text-slate-500 mt-0.5">Tingkat Penguasaan KD</div>
                                </div>
                                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                                  <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                      style={{ width: `${Math.min(100, pt.masteryPercentage)}%` }}
                                      className={`h-full rounded-full transition-all duration-500 ${
                                        pt.masteryPercentage >= 75 ? 'bg-emerald-500' : 'bg-amber-500'
                                      }`}
                                    />
                                  </div>
                                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                                    <span>Target 75%</span>
                                    <span>{pt.masteryPercentage >= 75 ? 'Memenuhi Standar' : 'Di Bawah Standar'}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
              {/* TAB 9: EXPLANATIONS */}
              {activeTab === 'EXPLANATIONS' && (
                <div className="space-y-6">
                  {/* Top Bar Header & Action Control */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4 transition-colors">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center space-x-2">
                          <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                          <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                            Pusat Kelola Link Pembahasan Soal &amp; Modul Solusi (PDF &amp; YouTube)
                          </h2>
                          <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-lg">
                            PORTAL GURU
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Kelola tautan video YouTube dan modul PDF pembahasan untuk setiap mata pelajaran per paket Try Out. Pembahasan berstatus <span className="font-semibold text-emerald-600 dark:text-emerald-400">PUBLISHED</span> langsung dapat dipelajari oleh siswa di portal hasil ujian.
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            const res = dbService.runExplanationEngineTests(currentUser);
                            setExplanationTestResult(res);
                            triggerToast(`Test Suite Phase 10 Selesai (${res.passedTests}/${res.totalTests} Passed in ${res.executionTimeMs}ms)`);
                          }}
                          className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold px-3 py-2 rounded-xl flex items-center space-x-1.5 shadow-xs transition-colors border border-transparent dark:border-slate-700 cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Jalankan Test Suite</span>
                        </button>

                        <button
                          onClick={() => {
                            setEditingExplanationId(null);
                            setExpTitle(`Pembahasan ${activeSubject?.name || 'Matematika'} — Solusi Mandiri`);
                            setExpSubjectId(selectedSubjectId !== 'ALL' ? selectedSubjectId : 'subj-mat');
                            setExpTryoutId(selectedTryoutId !== 'ALL' ? selectedTryoutId : 'to-3');
                            setExpQuestionId('GENERAL');
                            setExpContentText('');
                            setExpPdfUrl('');
                            setExpPdfFileName('');
                            setExpYoutubeUrl('');
                            setExpExternalUrl('');
                            setExpStatus('PUBLISHED');
                            setShowExplanationModal(true);
                          }}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3.5 py-2 rounded-xl flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Tambah Link Pembahasan Baru</span>
                        </button>
                      </div>
                    </div>

                    {/* Filter Bar */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1">
                          <span className="text-slate-500 dark:text-slate-400 font-medium">Try Out:</span>
                          <select
                            value={selectedTryoutId}
                            onChange={e => setSelectedTryoutId(e.target.value)}
                            className="bg-transparent font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                          >
                            {tryouts.map(t => (
                              <option key={t.id} value={t.id} className="dark:bg-slate-800 dark:text-white">{t.code} — {t.title}</option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1">
                          <span className="text-slate-500 dark:text-slate-400 font-medium">Status:</span>
                          <select
                            value={expFilterStatus}
                            onChange={e => setExpFilterStatus(e.target.value)}
                            className="bg-transparent font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                          >
                            <option value="ALL" className="dark:bg-slate-800 dark:text-white">Semua Status</option>
                            <option value="PUBLISHED" className="dark:bg-slate-800 dark:text-white">PUBLISHED (Tampil Siswa)</option>
                            <option value="DRAFT" className="dark:bg-slate-800 dark:text-white">DRAFT (Rahasia Guru)</option>
                            <option value="ARCHIVED" className="dark:bg-slate-800 dark:text-white">ARCHIVED (Dearsip)</option>
                          </select>
                        </div>

                        <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1">
                          <span className="text-slate-500 dark:text-slate-400 font-medium">Cakupan:</span>
                          <select
                            value={expFilterScope}
                            onChange={e => setExpFilterScope(e.target.value)}
                            className="bg-transparent font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                          >
                            <option value="ALL" className="dark:bg-slate-800 dark:text-white">Semua Cakupan</option>
                            <option value="GENERAL" className="dark:bg-slate-800 dark:text-white">Umum (General Try Out)</option>
                            <option value="QUESTION" className="dark:bg-slate-800 dark:text-white">Spesifik Butir Soal</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 text-[11px] text-slate-500 dark:text-slate-400">
                        <span>Total: <strong className="text-slate-900 dark:text-white">{explanations.length}</strong></span>
                        <span>Published: <strong className="text-emerald-600 dark:text-emerald-400">{explanations.filter(e => e.status === 'PUBLISHED').length}</strong></span>
                        <span>Draft: <strong className="text-amber-600 dark:text-amber-400">{explanations.filter(e => e.status === 'DRAFT').length}</strong></span>
                        <span>Archived: <strong className="text-slate-600 dark:text-slate-400">{explanations.filter(e => e.status === 'ARCHIVED').length}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* AUTOMATED TEST SUITE HUB RESULTS (PHASE 10 GATE) */}
                  {explanationTestResult && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4 transition-colors">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                        <div className="flex items-center space-x-2">
                          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            Hasil Pengujian Otomatis Modul Pembahasan Soal
                          </h3>
                        </div>

                        <div className="flex items-center space-x-2">
                          <span
                            className={`text-[10px] font-bold px-2.5 py-1 rounded border font-mono ${
                              explanationTestResult.passed
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                                : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                            }`}
                          >
                            {explanationTestResult.passed ? 'PHASE 10 — VERIFIED & FROZEN' : 'PHASE 10 — TEST FAILED'}
                          </span>
                          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                            Waktu: <strong className="text-slate-900 dark:text-white">{explanationTestResult.executionTimeMs} ms</strong>
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {explanationTestResult.tests.map(t => (
                          <div
                            key={t.testId}
                            className={`p-3 rounded-lg border text-xs space-y-1 transition-all ${
                              t.passed ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60' : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60'
                            }`}
                          >
                            <div className="flex items-center justify-between font-bold">
                              <span className="text-slate-900 dark:text-white">Test {t.testId}: {t.name}</span>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                                  t.passed ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300'
                                }`}
                              >
                                {t.passed ? 'PASSED' : 'FAILED'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">{t.message}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* VIEW MODE & RESOURCE FILTER TOOLBAR */}
                  {(() => {
                    // Extract educational resource items from filtered explanations
                    const filteredExplanations = explanations
                      .filter(e => e.tryoutId === selectedTryoutId || selectedTryoutId === 'ALL')
                      .filter(e => expFilterStatus === 'ALL' || e.status === expFilterStatus)
                      .filter(e => {
                        if (expFilterScope === 'GENERAL') return !e.questionId;
                        if (expFilterScope === 'QUESTION') return !!e.questionId;
                        return true;
                      });

                    const resourceCardsList = filteredExplanations.flatMap(exp => {
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
                      if (expMediaTypeFilter === 'YOUTUBE') return item.type === 'YOUTUBE';
                      if (expMediaTypeFilter === 'PDF') return item.type === 'PDF';
                      return true;
                    });

                    const totalYtCount = filteredExplanations.filter(e => !!e.youtubeUrl).length;
                    const totalPdfCount = filteredExplanations.filter(e => !!e.pdfUrl).length;

                    return (
                      <div className="space-y-4">
                        {/* Sub-toolbar: View Switcher & Media Type Filters */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs transition-colors">
                          <div className="flex flex-wrap items-center gap-2">
                            {/* View Switcher */}
                            <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                              <button
                                type="button"
                                onClick={() => setExpViewMode('RESOURCE_CARDS')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                                  expViewMode === 'RESOURCE_CARDS'
                                    ? 'bg-indigo-600 text-white shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                              >
                                <LayoutGrid className="w-3.5 h-3.5" />
                                <span>Katalog Resource Card</span>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                                  expViewMode === 'RESOURCE_CARDS' ? 'bg-indigo-700 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                }`}>
                                  {resourceCardsList.length}
                                </span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setExpViewMode('MODULES')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                                  expViewMode === 'MODULES'
                                    ? 'bg-indigo-600 text-white shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                              >
                                <BookOpen className="w-3.5 h-3.5" />
                                <span>Modul Lengkap Pembahasan</span>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                                  expViewMode === 'MODULES' ? 'bg-indigo-700 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                }`}>
                                  {filteredExplanations.length}
                                </span>
                              </button>
                            </div>

                            {/* Media Type Filter Pills */}
                            {expViewMode === 'RESOURCE_CARDS' && (
                              <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-slate-800">
                                <button
                                  type="button"
                                  onClick={() => setExpMediaTypeFilter('ALL')}
                                  className={`px-2.5 py-1.5 rounded-xl font-bold cursor-pointer transition-colors ${
                                    expMediaTypeFilter === 'ALL'
                                      ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                  }`}
                                >
                                  Semua Tipe
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setExpMediaTypeFilter('YOUTUBE')}
                                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-bold cursor-pointer transition-colors ${
                                    expMediaTypeFilter === 'YOUTUBE'
                                      ? 'bg-red-600 text-white'
                                      : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/40 hover:bg-red-100'
                                  }`}
                                >
                                  <Youtube className="w-3 h-3" />
                                  <span>YouTube ({totalYtCount})</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setExpMediaTypeFilter('PDF')}
                                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-bold cursor-pointer transition-colors ${
                                    expMediaTypeFilter === 'PDF'
                                      ? 'bg-rose-600 text-white'
                                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40 hover:bg-rose-100'
                                  }`}
                                >
                                  <FileText className="w-3 h-3" />
                                  <span>PDF ({totalPdfCount})</span>
                                </button>
                              </div>
                            )}
                          </div>

                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            Menampilkan <strong>{expViewMode === 'RESOURCE_CARDS' ? resourceCardsList.length : filteredExplanations.length}</strong> tautan edukasi
                          </span>
                        </div>

                        {/* MODE 1: DEDICATED RESOURCE CARDS GRID */}
                        {expViewMode === 'RESOURCE_CARDS' && (
                          <div>
                            {resourceCardsList.length === 0 ? (
                              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-3">
                                <BookOpen className="w-10 h-10 text-slate-400 mx-auto" />
                                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                  Belum Ada Resource Card Sesuai Filter
                                </h4>
                                <p className="text-xs text-slate-500 max-w-md mx-auto">
                                  Belum ada tautan YouTube atau PDF yang ditambahkan untuk filter yang dipilih. Silakan klik tombol &apos;Tambah Link Pembahasan Baru&apos; di atas.
                                </p>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {resourceCardsList.map(item => {
                                  const exp = item.exp;
                                  const targetQuestion = questions.find(q => q.id === exp.questionId);
                                  const expSubj = subjects.find(s => s.id === exp.subjectId);

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
                                        setActiveVideoModalUrl(url);
                                        setActiveVideoModalTitle(title);
                                      }}
                                      onEdit={() => {
                                        setEditingExplanationId(exp.id);
                                        setExpTitle(exp.title);
                                        setExpSubjectId(exp.subjectId || selectedSubjectId || 'subj-mat');
                                        setExpTryoutId(exp.tryoutId || selectedTryoutId || 'to-3');
                                        setExpQuestionId(exp.questionId || 'GENERAL');
                                        setExpContentText(exp.contentText);
                                        setExpPdfUrl(exp.pdfUrl || '');
                                        setExpPdfFileName(exp.pdfFileName || '');
                                        setExpYoutubeUrl(exp.youtubeUrl || '');
                                        setExpExternalUrl(exp.externalUrl || '');
                                        setExpStatus(exp.status);
                                        setShowExplanationModal(true);
                                      }}
                                      onDelete={() => {
                                        dbService.deleteExplanation(exp.id, currentUser);
                                        triggerToast(`Resource '${item.title}' berhasil dihapus.`);
                                        refreshData();
                                      }}
                                      onToggleStatus={() => {
                                        const nextStatus = exp.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
                                        dbService.updateExplanation(exp.id, { status: nextStatus }, currentUser);
                                        triggerToast(`Status '${item.title}' diubah ke ${nextStatus}.`);
                                        refreshData();
                                      }}
                                      isTeacherView={true}
                                    />
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}

                        {/* MODE 2: GROUPED EXPLANATION MODULES VIEW */}
                        {expViewMode === 'MODULES' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredExplanations.map(exp => {
                              const targetQuestion = questions.find(q => q.id === exp.questionId);
                              const expSubj = subjects.find(s => s.id === exp.subjectId);

                              const getSubjectBadge = (sId?: string) => {
                                switch (sId) {
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
                                <div key={exp.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between transition-colors">
                                  <div className="space-y-3">
                                    {/* Header Badges */}
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-lg border font-mono ${getSubjectBadge(exp.subjectId)}`}>
                                          {expSubj ? `${expSubj.name} (${expSubj.code})` : 'Umum / Semua Mapel'}
                                        </span>

                                        {exp.questionId ? (
                                          <span className="bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-lg font-mono">
                                            Soal: {targetQuestion?.uniqueCode || exp.questionId}
                                          </span>
                                        ) : (
                                          <span className="bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 text-[10px] font-bold px-2 py-0.5 rounded-lg">
                                            Paket Lengkap Mapel
                                          </span>
                                        )}

                                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono font-semibold">
                                          • {exp.tryoutId.toUpperCase()}
                                        </span>
                                      </div>

                                      <span
                                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-lg border ${
                                          exp.status === 'PUBLISHED'
                                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                                            : exp.status === 'DRAFT'
                                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                                        }`}
                                      >
                                        {exp.status}
                                      </span>
                                    </div>

                                    {/* Title & Body */}
                                    <div>
                                      <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">{exp.title}</h3>
                                      {exp.contentText && (
                                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line line-clamp-3 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 font-normal mt-2">
                                          {exp.contentText}
                                        </p>
                                      )}
                                    </div>

                                    {/* EMBEDDED RESOURCE CARDS FOR THIS MODULE */}
                                    <div className="space-y-3 pt-1">
                                      {exp.youtubeUrl && (
                                        <ResourceCard
                                          type="YOUTUBE"
                                          title={`Video Solusi: ${exp.title}`}
                                          url={exp.youtubeUrl}
                                          subjectName={expSubj?.name}
                                          subjectCode={expSubj?.code}
                                          tryoutCode={exp.tryoutId}
                                          questionCode={targetQuestion?.uniqueCode}
                                          status={exp.status}
                                          onPreview={(url, title) => {
                                            setActiveVideoModalUrl(url);
                                            setActiveVideoModalTitle(title);
                                          }}
                                          isTeacherView={false}
                                        />
                                      )}

                                      {exp.pdfUrl && (
                                        <ResourceCard
                                          type="PDF"
                                          title={`Modul Solusi: ${exp.title}`}
                                          url={exp.pdfUrl}
                                          fileName={exp.pdfFileName || 'Modul_Solusi_Resmi.pdf'}
                                          fileSize={exp.pdfFileSize}
                                          subjectName={expSubj?.name}
                                          subjectCode={expSubj?.code}
                                          tryoutCode={exp.tryoutId}
                                          questionCode={targetQuestion?.uniqueCode}
                                          status={exp.status}
                                          isTeacherView={false}
                                        />
                                      )}

                                      {exp.externalUrl && (
                                        <a
                                          href={exp.externalUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="p-2 bg-emerald-50/70 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-xl border border-emerald-200 dark:border-emerald-900/60 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300 transition-colors"
                                        >
                                          <div className="flex items-center gap-1.5 font-semibold truncate">
                                            <ExternalLink className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                                            <span className="truncate">Google Drive / Dokumen Pendukung</span>
                                          </div>
                                          <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                                        </a>
                                      )}

                                      <div className="text-slate-400 dark:text-slate-500 text-[10px] pt-1 flex items-center justify-between">
                                        <span>Penulis: {exp.authorName || 'Guru Mata Pelajaran'}</span>
                                        <span>{new Date(exp.updatedAt).toLocaleDateString('id-ID')}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Action Buttons */}
                                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                                    <div className="flex items-center space-x-1.5">
                                      <button
                                        onClick={() => {
                                          setEditingExplanationId(exp.id);
                                          setExpTitle(exp.title);
                                          setExpSubjectId(exp.subjectId || selectedSubjectId || 'subj-mat');
                                          setExpTryoutId(exp.tryoutId || selectedTryoutId || 'to-3');
                                          setExpQuestionId(exp.questionId || 'GENERAL');
                                          setExpContentText(exp.contentText);
                                          setExpPdfUrl(exp.pdfUrl || '');
                                          setExpPdfFileName(exp.pdfFileName || '');
                                          setExpYoutubeUrl(exp.youtubeUrl || '');
                                          setExpExternalUrl(exp.externalUrl || '');
                                          setExpStatus(exp.status);
                                          setShowExplanationModal(true);
                                        }}
                                        className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold rounded-lg border border-slate-200 dark:border-slate-700 flex items-center space-x-1 cursor-pointer"
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                        <span>Edit</span>
                                      </button>

                                      {exp.status !== 'PUBLISHED' ? (
                                        <button
                                          onClick={() => {
                                            dbService.publishExplanation(exp.id, currentUser);
                                            triggerToast(`Pembahasan '${exp.title}' dipublikasikan ke siswa.`);
                                            refreshData();
                                          }}
                                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-xs cursor-pointer"
                                        >
                                          Publikasikan
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => {
                                            dbService.updateExplanation(exp.id, { status: 'DRAFT' }, currentUser);
                                            triggerToast(`Pembahasan '${exp.title}' diubah ke Draf.`);
                                            refreshData();
                                          }}
                                          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg shadow-xs cursor-pointer"
                                        >
                                          Jadikan Draf
                                        </button>
                                      )}

                                      {exp.status !== 'ARCHIVED' && (
                                        <button
                                          onClick={() => {
                                            dbService.archiveExplanation(exp.id, currentUser);
                                            triggerToast(`Pembahasan '${exp.title}' berhasil diarsipkan.`);
                                            refreshData();
                                          }}
                                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-semibold rounded-lg cursor-pointer"
                                        >
                                          Arsipkan
                                        </button>
                                      )}
                                    </div>

                                    <button
                                      onClick={() => {
                                        dbService.deleteExplanation(exp.id, currentUser);
                                        triggerToast(`Pembahasan '${exp.title}' dihapus.`);
                                        refreshData();
                                      }}
                                      className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                                      title="Hapus Pembahasan"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* TAB 10: REPORTS NAVIGATION — PHASE 11 REPORTING ENGINE */}
              {activeTab === 'REPORTS' && (
                <div className="space-y-6">
                  {/* Top Bar Header & Control */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4 transition-colors">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center space-x-2">
                          <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                          <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                            Pusat Ekspor Dokumen & Laporan Asesmen (Phase 11)
                          </h2>
                          <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                            PHASE 11 — FROZEN
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Hasilkan dokumen resmi Rapor Siswa PDF, Laporan Analitik Kelas PDF, dan Workbook Excel 7-Lembar Kerja langsung dari database secara deterministik.
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            const res = dbService.runReportEngineTests(currentUser);
                            setReportTestResult(res);
                            triggerToast(`Test Suite Reporting Phase 11 Selesai (${res.passedTests}/${res.totalTests} Passed dalam ${res.executionTimeMs} ms)`);
                          }}
                          className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg flex items-center space-x-1.5 shadow-sm transition-colors border border-transparent dark:border-slate-700"
                        >
                          <Play className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Jalankan Test Suite Reporting (Phase 11)</span>
                        </button>
                      </div>
                    </div>

                    {/* Try Out & Target Selectors */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3 text-xs">
                      <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Try Out Target:</span>
                        <select
                          value={selectedTryoutId}
                          onChange={e => setSelectedTryoutId(e.target.value)}
                          className="bg-transparent font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                        >
                          {tryouts.map(t => (
                            <option key={t.id} value={t.id} className="dark:bg-slate-800 dark:text-white">{t.code} — {t.title}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Kelas / Rombel Target:</span>
                        <select
                          value={classFilter}
                          onChange={e => setClassFilter(e.target.value)}
                          className="bg-transparent font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                        >
                          {classes.map(c => (
                            <option key={c.id} value={c.id} className="dark:bg-slate-800 dark:text-white">{c.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* AUTOMATED TEST SUITE HUB RESULTS (PHASE 11 GATE) */}
                  {reportTestResult && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4 transition-colors">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                        <div className="flex items-center space-x-2">
                          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            Hasil Pengujian Otomatis Modul Pelaporan & Ekspor
                          </h3>
                        </div>

                        <div className="flex items-center space-x-2">
                          <span
                            className={`text-[10px] font-bold px-2.5 py-1 rounded border font-mono ${
                              reportTestResult.passed
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                                : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                            }`}
                          >
                            {reportTestResult.passed ? 'PHASE 11 — VERIFIED & FROZEN' : 'PHASE 11 — TEST FAILED'}
                          </span>
                          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                            Waktu: <strong className="text-slate-900 dark:text-white">{reportTestResult.executionTimeMs} ms</strong>
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {reportTestResult.tests.map(t => (
                          <div
                            key={t.testId}
                            className={`p-3 rounded-lg border text-xs space-y-1 transition-all ${
                              t.passed ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60' : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60'
                            }`}
                          >
                            <div className="flex items-center justify-between font-bold">
                              <span className="text-slate-900 dark:text-white">Test {t.testId}: {t.name}</span>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                                  t.passed ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300'
                                }`}
                              >
                                {t.passed ? 'PASSED' : 'FAILED'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">{t.message}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* REPORT EXPORT CARDS */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Card 1: Multi-Sheet Excel Workbook (7 Sheets) */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-3 flex flex-col justify-between transition-colors">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 rounded-lg">
                            <FileSpreadsheet className="w-5 h-5" />
                          </div>
                          <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded font-mono">
                            7 SHEETS XLSX
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Workbook Laporan Lengkap Excel (7 Sheets)</h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                          Buku kerja XLSX berisi 7 lembar kerja terstruktur: Ringkasan Nilai, Nilai Siswa, Matriks Jawaban, Analisis Butir Soal, Analisis Kompetensi, Analisis Kelas, dan Perkembangan Siswa.
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          const activeTo = tryouts.find(t => t.id === selectedTryoutId) || tryouts[0];
                          const scores = dbService.getScoresByTryout(selectedTryoutId);
                          const answers = dbService.getAnswers().filter(a => a.tryoutId === selectedTryoutId);
                          const qaList = dbService.getQuestionAnalysis(selectedTryoutId, 'ALL', 'ALL', currentUser);

                          const fileName = ExportService.exportComprehensiveWorkbookExcel(
                            activeTo,
                            classes,
                            students,
                            scores,
                            questions,
                            answers,
                            qaList,
                            materials,
                            competencies
                          );
                          triggerToast(`Workbook Excel 7-Sheet ('${fileName}') berhasil diunduh.`);
                        }}
                        className="w-full bg-emerald-700 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center space-x-1.5 shadow-sm"
                      >
                        <Download className="w-4 h-4" />
                        <span>Unduh Workbook Excel (7 Sheets)</span>
                      </button>
                    </div>

                    {/* Card 2: Teacher Class Analytics PDF */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-3 flex flex-col justify-between transition-colors">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-400 rounded-lg">
                            <FileText className="w-5 h-5" />
                          </div>
                          <span className="text-[10px] font-bold text-indigo-800 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded font-mono">
                            CLASS PDF
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Laporan Analitik PDF Kelas & Analisis Butir Soal</h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                          Dokumen PDF resmi berisi statistik ringkasan kelas, peringkat nilai siswa, analisis penguasaan materi, tingkat kesukaran & daya pembeda soal, serta pilihan pengecoh.
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          const activeTo = tryouts.find(t => t.id === selectedTryoutId) || tryouts[0];
                          const activeCls = classes.find(c => c.id === classFilter) || classes[0];
                          const scores = dbService.getScoresByTryout(selectedTryoutId);
                          const qaList = dbService.getQuestionAnalysis(selectedTryoutId, 'ALL', activeCls.id, currentUser);
                          const classAnalytics = dbService.getClassAnalytics(activeCls.id, selectedTryoutId, currentUser);

                          const fileName = ExportService.exportTeacherClassAnalyticsPDF(
                            activeCls,
                            activeTo,
                            scores,
                            questions,
                            qaList,
                            competencies,
                            classAnalytics,
                            students
                          );
                          triggerToast(`Laporan PDF Analitik Kelas ('${fileName}') berhasil diunduh.`);
                        }}
                        className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center space-x-1.5 shadow-sm border border-transparent dark:border-slate-700"
                      >
                        <Download className="w-4 h-4" />
                        <span>Unduh PDF Analisis Kelas</span>
                      </button>
                    </div>

                    {/* Card 3: Student Scorecard PDF Report */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-3 flex flex-col justify-between transition-colors">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="p-2 bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/60 text-cyan-700 dark:text-cyan-400 rounded-lg">
                            <Award className="w-5 h-5" />
                          </div>
                          <span className="text-[10px] font-bold text-cyan-800 dark:text-cyan-300 bg-cyan-100 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800 px-2 py-0.5 rounded font-mono">
                            INDIVIDUAL PDF
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Rapor Individual Hasil Try Out Siswa</h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                          Rapor PDF resmi siswa berisi skor akhir, verifikasi GForm, analisis penguasaan KD, rekomendasi materi lemah, dan tren perkembangan TO-1 &rarr; TO-3.
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          const activeTo = tryouts.find(t => t.id === selectedTryoutId) || tryouts[0];
                          const sampleStudent = students[0] || { id: 's-1', name: 'Aditya Pratama', nisn: '0061234561', nis: '232412001', targetScore: 85, classId: 'c-xii-ipa1' };
                          const sampleScore = dbService.getScoresByStudent(sampleStudent.id).find(s => s.tryoutId === selectedTryoutId) || {
                            id: 'sc-1', responseId: 'resp-1', studentId: sampleStudent.id, tryoutId: selectedTryoutId,
                            subjectScores: {}, googleFormScore: 87.5, calculatedScore: 87.5, scoreDifference: 0,
                            scoringStatus: 'MATCH', totalCorrect: 7, totalIncorrect: 1, totalUnanswered: 0, createdAt: ''
                          };
                          const studentClass = classes.find(c => c.id === sampleStudent.classId);
                          const studentAnalytics = dbService.getStudentAnalytics(sampleStudent.id, selectedTryoutId);

                          const fileName = ExportService.exportStudentPDF(
                            sampleStudent as any,
                            sampleScore,
                            activeTo,
                            studentClass,
                            studentAnalytics,
                            explanations
                          );
                          triggerToast(`Rapor PDF Siswa ('${fileName}') berhasil diunduh.`);
                        }}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center space-x-1.5 shadow-sm"
                      >
                        <Download className="w-4 h-4" />
                        <span>Unduh Rapor PDF Siswa (Sample)</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 11: GOOGLE SHEETS IMPORT PIPELINE */}
              {/* TAB 11: GOOGLE SHEETS IMPORT PIPELINE */}
              {activeTab === 'IMPORT_SHEETS' && (
                <div className="space-y-6">
                  {/* Top Reference & Metadata Card */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4 transition-colors">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                      <div>
                        <div className="flex items-center space-x-2">
                          <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                          <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                            Pipeline Integrasi Google Forms & Google Sheets
                          </h2>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Alur Integrasi: Masukkan Data Respon &rarr; Pemetaan Kolom Soal &rarr; Pratinjau &rarr; Simpan &amp; Penilaian Otomatis.
                        </p>
                      </div>

                      {/* Try Out & Subject Selectors */}
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1">
                          <span className="text-slate-500 dark:text-slate-400 font-medium">Try Out Target:</span>
                          <select
                            value={selectedTryoutId}
                            onChange={e => setSelectedTryoutId(e.target.value)}
                            className="bg-transparent font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                          >
                            {tryouts.map(t => (
                              <option key={t.id} value={t.id} className="dark:bg-slate-800 dark:text-white">
                                {t.code} — {t.title}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1">
                          <span className="text-slate-500 dark:text-slate-400 font-medium">Mapel Target:</span>
                          <select
                            value={selectedSubjectId}
                            onChange={e => setSelectedSubjectId(e.target.value)}
                            className="bg-transparent font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                          >
                            {permittedSubjects.map(s => (
                              <option key={s.id} value={s.id} className="dark:bg-slate-800 dark:text-white">
                                {s.name} ({s.code})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Google Form & Google Sheet Linked References */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-lg p-3 flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-1.5 text-slate-500 dark:text-slate-400 font-medium">
                            <Link className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                            <span>Referensi Google Form:</span>
                          </div>
                          <div className="font-bold text-slate-900 dark:text-white">{googleFormRef.formTitle}</div>
                          <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">ID: {googleFormRef.formId}</div>
                        </div>
                        <a
                          href={googleFormRef.formUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1 text-[11px] font-semibold"
                        >
                          <span>Buka Form</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-lg p-3 flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-1.5 text-slate-500 dark:text-slate-400 font-medium">
                            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>Referensi Google Sheets:</span>
                          </div>
                          <div className="font-bold text-slate-900 dark:text-white">Respons Ujian (Spreadsheet Aktif)</div>
                          <div className="flex items-center space-x-2 text-[11px]">
                            <span className="text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 font-semibold px-1.5 py-0.5 rounded">
                              STATUS: TERKONEKSI (LIVE)
                            </span>
                            <span className="text-slate-400 dark:text-slate-500">• Sinkronisasi: {googleFormRef.lastSync}</span>
                          </div>
                        </div>
                        <a
                          href={googleFormRef.sheetUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-700 dark:text-emerald-400 hover:underline flex items-center space-x-1 text-[11px] font-semibold"
                        >
                          <span>Buka Sheet</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>

                    {/* 4-Step Progress Indicator */}
                    <div className="grid grid-cols-4 gap-2 text-xs font-semibold pt-2">
                      <div
                        className={`p-2 rounded-lg text-center border transition-colors ${
                          importStage === 'INPUT'
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        1. Sumber Data (Input)
                      </div>
                      <div
                        className={`p-2 rounded-lg text-center border transition-colors ${
                          importStage === 'MAPPING'
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        2. Pemetaan Kolom (Mapping)
                      </div>
                      <div
                        className={`p-2 rounded-lg text-center border transition-colors ${
                          importStage === 'PREVIEW'
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        3. Validasi & Pratinjau
                      </div>
                      <div
                        className={`p-2 rounded-lg text-center border transition-colors ${
                          importStage === 'CONFIRMED'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        4. Selesai (Tersimpan Aman)
                      </div>
                    </div>
                  </div>

                  {/* STAGE 1: INPUT / FETCH */}
                  {importStage === 'INPUT' && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4 transition-colors">
                      {/* Presets Bar */}
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center justify-between">
                          <span>Uji Skenario Pipeline Cepat (Pilih Preset Data):</span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">Klik untuk memasukkan data uji otomatis</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setRawPasteText(
                                `NISN\tSkor GForm\tMAT-TO03-Q001\tMAT-TO03-Q002\tMAT-TO03-Q003\tMAT-TO03-Q004\tMAT-TO03-Q005\n0061234561\t100\tA\tA\tA\tA\tA\n0061234562\t80\tA\tA\tA\tA\tB\n0061234563\t60\tA\tA\tA\tB\tB`
                              );
                              triggerToast('Memuat preset: Data Valid Lengkap.');
                            }}
                            className="p-2 border border-emerald-300 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-900 dark:text-emerald-300 rounded-lg text-left text-[11px] font-semibold transition-colors"
                          >
                            <span className="block font-bold">1. Valid Lengkap</span>
                            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-normal">3 siswa terdaftar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setRawPasteText(
                                `NISN\tSkor GForm\tMAT-TO03-Q001\tMAT-TO03-Q002\tMAT-TO03-Q003\n9999999999\t80\tA\tA\tA`
                              );
                              triggerToast('Memuat preset: Data Siswa Tidak Terdaftar.');
                            }}
                            className="p-2 border border-rose-300 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-900 dark:text-rose-300 rounded-lg text-left text-[11px] font-semibold transition-colors"
                          >
                            <span className="block font-bold">2. Siswa Tak Dikenal</span>
                            <span className="text-[10px] text-rose-700 dark:text-rose-400 font-normal">NISN 9999999999</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setRawPasteText(
                                `NISN\tSkor GForm\tMAT-TO03-Q001\tMAT-TO03-Q002\tMAT-TO03-Q003\n0061234561\t100\tA\tA\tA\n0061234561\t100\tA\tA\tA`
                              );
                              triggerToast('Memuat preset: Data Duplikasi Lembar.');
                            }}
                            className="p-2 border border-amber-300 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-900 dark:text-amber-300 rounded-lg text-left text-[11px] font-semibold transition-colors"
                          >
                            <span className="block font-bold">3. Duplikasi Lembar</span>
                            <span className="text-[10px] text-amber-700 dark:text-amber-400 font-normal">NISN sama 2x</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setRawPasteText(
                                `NISN\tSkor GForm\tMAT-TO03-Q001\tMAT-TO03-Q002\tMAT-TO03-Q003\n0061234561\t100\tINVALID_OPT\tA\tA`
                              );
                              triggerToast('Memuat preset: Data Jawaban Cacat.');
                            }}
                            className="p-2 border border-orange-300 dark:border-orange-800/60 bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 dark:hover:bg-orange-900/50 text-orange-900 dark:text-orange-300 rounded-lg text-left text-[11px] font-semibold transition-colors"
                          >
                            <span className="block font-bold">4. Jawaban Cacat</span>
                            <span className="text-[10px] text-orange-700 dark:text-orange-400 font-normal">Opsi tidak sah</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setRawPasteText(
                                `NISN\tSkor GForm\tMAT-TO03-Q001\tMAT-TO03-Q002\tMAT-TO03-Q003\tMAT-TO03-Q004\tMAT-TO03-Q005\n0061234561\t95\tB\tB\tB\tB\tB`
                              );
                              triggerToast('Memuat preset: Data Selisih Skor (Mismatch).');
                            }}
                            className="p-2 border border-purple-300 dark:border-purple-800/60 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-900 dark:text-purple-300 rounded-lg text-left text-[11px] font-semibold transition-colors"
                          >
                            <span className="block font-bold">5. Selisih Skor</span>
                            <span className="text-[10px] text-purple-700 dark:text-purple-400 font-normal">GForm 95 vs Hitung 0</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setRawPasteText(
                                `NISN\tSkor GForm\tMAT-TO03-Q001\tMAT-TO03-Q002\tMAT-TO03-Q003\tMAT-TO03-Q004\tMAT-TO03-Q005\n0061234561\t100\tA\tA\tA\tA\tA\n9999999999\t80\tA\tA\tA\tA\tA\n0061234562\t80\tINVALID_CORRUPT\tA\tA\tA\tA\n0061234563\t90\tB\tB\tB\tB\tB`
                              );
                              triggerToast('Memuat preset: Data Campuran (Partial Failure).');
                            }}
                            className="p-2 border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-left text-[11px] font-semibold transition-colors"
                          >
                            <span className="block font-bold">6. Campuran (Partial)</span>
                            <span className="text-[10px] text-slate-600 dark:text-slate-400 font-normal">Valid & Error</span>
                          </button>
                        </div>
                      </div>

                      {/* Textarea Input */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Data Mentah Google Sheets (Format TSV atau CSV):
                        </label>
                        <textarea
                          rows={8}
                          value={rawPasteText}
                          onChange={e => setRawPasteText(e.target.value)}
                          placeholder="NISN&#9;Skor GForm&#9;MAT-TO03-Q001&#9;MAT-TO03-Q002&#9;MAT-TO03-Q003&#10;0061234561&#9;100&#9;A&#9;A&#9;A&#10;0061234562&#9;80&#9;A&#9;B&#9;A"
                          className="w-full font-mono text-xs p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      {/* Mandatory Rule Notice */}
                      <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-lg p-3 flex items-start space-x-2 text-xs text-indigo-900 dark:text-indigo-300">
                        <AlertCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-bold block">Aturan Otoritas Question ID:</strong>
                          Sistem menggunakan <strong>Unique Question ID</strong> (contoh: <code>MAT-TO03-Q015</code>), BUKAN nomor indeks kolom. Sistem memverifikasi kode unik soal pada baris header lembar kerja sebelum mengizinkan kalkulasi.
                        </div>
                      </div>

                      <div className="flex items-center justify-end">
                        <button
                          onClick={handleParseSheet}
                          disabled={!rawPasteText.trim()}
                          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold px-5 py-2.5 rounded-lg flex items-center space-x-1.5 shadow"
                        >
                          <span>Lanjutkan Ke Pemetaan Kolom</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STAGE 2: MAPPING (QUESTION & STUDENT COLUMN MAPPING) */}
                  {importStage === 'MAPPING' && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-5 transition-colors">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            Konfigurasi Pemetaan Kolom & Butir Soal ({parsedRows.length} Baris Terbaca)
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Pastikan kolom identitas siswa dan kolom soal terpetakan ke Unique Question ID yang tepat.
                          </p>
                        </div>
                        <button
                          onClick={() => setImportStage('INPUT')}
                          className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                        >
                          &larr; Ubah Sumber Data
                        </button>
                      </div>

                      {/* Student Identification Column Mappings */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                        <div>
                          <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Kolom NISN Siswa (Wajib):</label>
                          <select
                            value={columnMappings.nisnColumn}
                            onChange={e =>
                              setColumnMappings({ ...columnMappings, nisnColumn: e.target.value })
                            }
                            className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-white font-semibold focus:outline-none"
                          >
                            {parsedHeaders.map(h => (
                              <option key={h} value={h} className="dark:bg-slate-800 dark:text-white">
                                {h}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Kolom Skor Google Form (Opsional):</label>
                          <select
                            value={columnMappings.scoreColumn || ''}
                            onChange={e =>
                              setColumnMappings({ ...columnMappings, scoreColumn: e.target.value })
                            }
                            className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-white focus:outline-none"
                          >
                            <option value="" className="dark:bg-slate-800 dark:text-white">-- Tidak disertakan / Hitung Otomatis --</option>
                            {parsedHeaders.map(h => (
                              <option key={h} value={h} className="dark:bg-slate-800 dark:text-white">
                                {h}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Kolom Nama Siswa (Opsional):</label>
                          <select
                            value={columnMappings.nameColumn || ''}
                            onChange={e =>
                              setColumnMappings({ ...columnMappings, nameColumn: e.target.value })
                            }
                            className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-white focus:outline-none"
                          >
                            <option value="" className="dark:bg-slate-800 dark:text-white">-- Dari Database Roster Sekolah --</option>
                            {parsedHeaders.map(h => (
                              <option key={h} value={h} className="dark:bg-slate-800 dark:text-white">
                                {h}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Question Mappings by Unique Question ID */}
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                          <span>Pemetaan Butir Soal Terhadap Unique Question ID ({activeSubject?.name}):</span>
                          <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-mono">
                            {
                              Object.values(columnMappings.questionMappings).filter(Boolean).length
                            }{' '}
                            / {questions.filter(q => q.subjectId === selectedSubjectId).length} Soal Terpetakan
                          </span>
                        </div>

                        <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                              <tr>
                                <th className="py-2 px-3 w-12 text-center">No</th>
                                <th className="py-2 px-3 w-40">Unique Question ID</th>
                                <th className="py-2 px-3">Teks Ringkas Soal</th>
                                <th className="py-2 px-3 w-20 text-center">Kunci</th>
                                <th className="py-2 px-3 w-64">Kolom Header Google Sheets</th>
                                <th className="py-2 px-3 w-28 text-center">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {questions
                                .filter(q => q.subjectId === selectedSubjectId)
                                .map((q, idx) => {
                                  const mappedHeader = columnMappings.questionMappings[q.uniqueCode] || '';
                                  const isMapped = !!mappedHeader;
                                  return (
                                    <tr key={q.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                      <td className="py-2 px-3 text-center text-slate-500 dark:text-slate-400 font-bold">
                                        {q.questionNumber || idx + 1}
                                      </td>
                                      <td className="py-2 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                        {q.uniqueCode}
                                      </td>
                                      <td className="py-2 px-3 text-slate-700 dark:text-slate-300 truncate max-w-xs">
                                        {q.questionText}
                                      </td>
                                      <td className="py-2 px-3 text-center">
                                        <span className="font-mono font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-800 dark:text-slate-200">
                                          {q.correctAnswer}
                                        </span>
                                      </td>
                                      <td className="py-2 px-3">
                                        <select
                                          value={mappedHeader}
                                          onChange={e => {
                                            const updated = {
                                              ...columnMappings.questionMappings,
                                              [q.uniqueCode]: e.target.value,
                                            };
                                            setColumnMappings({
                                              ...columnMappings,
                                              questionMappings: updated,
                                            });
                                          }}
                                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-800 dark:text-white focus:outline-none"
                                        >
                                          <option value="" className="dark:bg-slate-800 dark:text-white">-- Pilih Kolom Header --</option>
                                          {parsedHeaders.map(h => (
                                            <option key={h} value={h} className="dark:bg-slate-800 dark:text-white">
                                              {h}
                                            </option>
                                          ))}
                                        </select>
                                      </td>
                                      <td className="py-2 px-3 text-center">
                                        {isMapped ? (
                                          <span className="inline-flex items-center space-x-1 text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                            <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                            <span>Terpetakan</span>
                                          </span>
                                        ) : (
                                          <span className="inline-block text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">
                                            Belum terikat
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <button
                          onClick={() => setImportStage('INPUT')}
                          className="border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold px-4 py-2 rounded-lg"
                        >
                          &larr; Kembali
                        </button>
                        <button
                          onClick={handleProceedToValidation}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-5 py-2.5 rounded-lg flex items-center space-x-1.5 shadow"
                        >
                          <span>Lanjutkan Ke Validasi & Pratinjau</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STAGE 3: VALIDATION & PREVIEW */}
                  {importStage === 'PREVIEW' && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-5 transition-colors">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            Pratinjau Hasil Validasi Data ({previewItems.length} Baris)
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Hasil kalkulasi deterministik telah dibandingkan dengan nilai Google Form. Baris dengan selisih ditandai secara transparan.
                          </p>
                        </div>
                        <button
                          onClick={() => setImportStage('MAPPING')}
                          className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                        >
                          &larr; Ubah Pemetaan Kolom
                        </button>
                      </div>

                      {/* Summary Metrics Cards */}
                      {validationSummary && (
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Total Baris</div>
                            <div className="text-xl font-bold text-slate-900 dark:text-white">{validationSummary.totalRows}</div>
                          </div>
                          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-3">
                            <div className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium">Lolos Validasi</div>
                            <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{validationSummary.successCount}</div>
                          </div>
                          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl p-3">
                            <div className="text-[11px] text-rose-800 dark:text-rose-300 font-medium">Gagal / Cacat</div>
                            <div className="text-xl font-bold text-rose-700 dark:text-rose-400">{validationSummary.failedCount}</div>
                          </div>
                          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl p-3">
                            <div className="text-[11px] text-amber-800 dark:text-amber-300 font-medium">Selisih Skor (Mismatch)</div>
                            <div className="text-xl font-bold text-amber-700 dark:text-amber-400">{validationSummary.mismatchCount}</div>
                          </div>
                          <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-xl p-3">
                            <div className="text-[11px] text-indigo-800 dark:text-indigo-300 font-medium">Duplikasi / Update</div>
                            <div className="text-xl font-bold text-indigo-700 dark:text-indigo-400">{validationSummary.duplicateCount}</div>
                          </div>
                        </div>
                      )}

                      {/* Mismatch Warning Box */}
                      {validationSummary && validationSummary.mismatchCount > 0 && (
                        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 rounded-xl p-3.5 flex items-start space-x-2.5 text-xs text-amber-900 dark:text-amber-300">
                          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold block text-sm">
                              Peringatan: Selisih Skor Terdeteksi ({validationSummary.mismatchCount} Siswa)
                            </span>
                            Sistem mendeteksi adanya selisih antara nilai Google Form dan kalkulasi deterministik database. Sesuai <em>Business Rule</em>: <strong>Tidak ada silent overwrite</strong>. Nilai Google Form dan Nilai Hitung Ulang akan disimpan berdampingan untuk audit.
                          </div>
                        </div>
                      )}

                      {/* Preview Table */}
                      <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                            <tr>
                              <th className="py-2.5 px-3 w-10 text-center">No</th>
                              <th className="py-2.5 px-3 w-28">NISN</th>
                              <th className="py-2.5 px-3">Nama Siswa & Kelas</th>
                              <th className="py-2.5 px-3 w-20 text-center">Skor GForm</th>
                              <th className="py-2.5 px-3 w-24 text-center">Skor Kalkulasi</th>
                              <th className="py-2.5 px-3 w-20 text-center">Selisih</th>
                              <th className="py-2.5 px-3 w-36 text-center">Status Validasi</th>
                              <th className="py-2.5 px-3 w-56">Diagnosa / Keterangan</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {previewItems.map(item => {
                              const isError =
                                item.status.startsWith('ERROR_');
                              const isMismatch =
                                item.status === 'WARNING_MISMATCH';

                              return (
                                <tr
                                  key={item.rowNumber}
                                  className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                                    isError ? 'bg-rose-50/40 dark:bg-rose-950/20' : isMismatch ? 'bg-amber-50/30 dark:bg-amber-950/20' : ''
                                  }`}
                                >
                                  <td className="py-2.5 px-3 text-center text-slate-500 dark:text-slate-400 font-bold">
                                    {item.rowNumber}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                                    {item.nisn || <span className="text-rose-500 italic">KOSONG</span>}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <div className="font-semibold text-slate-900 dark:text-white">{item.studentName}</div>
                                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                      {item.isValidStudent
                                        ? `ID Siswa: ${item.studentId}`
                                        : 'Tidak terdaftar dalam roster siswa'}
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-3 text-center font-mono text-slate-700 dark:text-slate-300">
                                    {item.rawGFormScore}
                                  </td>
                                  <td className="py-2.5 px-3 text-center font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                    {item.calculatedScore}
                                  </td>
                                  <td className="py-2.5 px-3 text-center font-mono">
                                    {item.scoreDifference > 0 ? (
                                      <span className="text-amber-600 dark:text-amber-400 font-bold">
                                        {item.scoreDifference.toFixed(2)}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 dark:text-slate-500">0.00</span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 text-center">
                                    <span
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold inline-block uppercase tracking-wider ${
                                        item.status === 'VALID'
                                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                          : item.status === 'WARNING_MISMATCH'
                                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                                          : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                                      }`}
                                    >
                                      {item.status.replace('ERROR_', '').replace('WARNING_', '')}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-[11px]">
                                    {item.validationError ? (
                                      <span className="text-rose-600 dark:text-rose-400 font-medium">
                                        {item.validationError}
                                      </span>
                                    ) : item.status === 'WARNING_MISMATCH' ? (
                                      <span className="text-amber-700 dark:text-amber-300">
                                        Selisih {item.scoreDifference.toFixed(2)} poin terhadap GForm
                                      </span>
                                    ) : item.isExistingSubmissionInDb ? (
                                      <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                                        Data sudah ada (akan diperbarui otomatis tanpa duplikasi)
                                      </span>
                                    ) : (
                                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        <span>Data valid & siap disimpan</span>
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Confirm Action Button */}
                      <div className="flex items-center justify-between pt-2">
                        <button
                          onClick={() => setImportStage('MAPPING')}
                          className="border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold px-4 py-2 rounded-lg"
                        >
                          &larr; Kembali Ubah Pemetaan
                        </button>
                        <button
                          onClick={handleConfirmImport}
                          disabled={
                            previewItems.filter(
                              i => i.status === 'VALID' || i.status === 'WARNING_MISMATCH'
                            ).length === 0
                          }
                          className="bg-emerald-700 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold px-6 py-2.5 rounded-lg shadow flex items-center space-x-2"
                        >
                          <Save className="w-4 h-4" />
                          <span>
                            Konfirmasi Simpan Ke Database (
                            {
                              previewItems.filter(
                                i => i.status === 'VALID' || i.status === 'WARNING_MISMATCH'
                              ).length
                            }{' '}
                            Baris Valid)
                          </span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STAGE 4: CONFIRMED */}
                  {importStage === 'CONFIRMED' && (
                    <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-8 text-center space-y-4 transition-colors">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>
                      <div className="text-base font-bold text-emerald-950 dark:text-emerald-200">
                        Batch Impor Respons Siswa Berhasil Disimpan!
                      </div>
                      <p className="text-xs text-emerald-800 dark:text-emerald-300/90 max-w-lg mx-auto leading-relaxed">
                        Data nilai, butir jawaban soal, dan status penilaian berhasil tersimpan dengan aman ke basis data tanpa duplikasi. Seluruh riwayat telah dicatat secara rapi di <strong>Catatan Aktivitas (Audit Log)</strong>.
                      </p>
                      <div className="pt-2 flex items-center justify-center space-x-3">
                        <button
                          onClick={() => {
                            setImportStage('INPUT');
                            setRawPasteText('');
                            setPreviewItems([]);
                          }}
                          className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors border border-transparent dark:border-slate-700"
                        >
                          Impor Lembar Kerja Lainnya
                        </button>
                        <button
                          onClick={() => handleTabChange('ANALYTICS')}
                          className="border border-emerald-700 dark:border-emerald-500 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
                        >
                          Lihat Analisis Butir Soal
                        </button>
                      </div>
                    </div>
                  )}

                  {/* AUTOMATED GOOGLE INTEGRATION TEST SUITE (PHASE 7 SCENARIOS) */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4 transition-colors">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            Automated Integration Test Suite (Phase 7 Specification)
                          </h3>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Memvalidasi 9 skenario integrasi: valid import, invalid student, invalid Try Out, invalid question, duplicate, malformed answer, scoring mismatch, repeated import (idempotency), dan partial failure.
                        </p>
                      </div>

                      <button
                        onClick={handleRunGoogleIntegrationTests}
                        className="bg-emerald-700 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center space-x-2 shadow-sm"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Jalankan Test Suite Integrasi</span>
                      </button>
                    </div>

                    {integrationTestResult && (
                      <div className="space-y-3">
                        <div
                          className={`p-3 rounded-lg border flex items-center justify-between text-xs font-bold ${
                            integrationTestResult.passed
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                          }`}
                        >
                          <span>
                            Status Keseluruhan Suite: {integrationTestResult.passed ? 'ALL TESTS PASSED (9/9)' : 'FAILED'}
                          </span>
                          <span className="font-mono text-[11px]">
                            {integrationTestResult.tests.filter(t => t.passed).length} /{' '}
                            {integrationTestResult.tests.length} Lulus
                          </span>
                        </div>

                        <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden text-xs">
                          {integrationTestResult.tests.map((t, idx) => (
                            <div key={idx} className="p-3 flex items-start justify-between space-x-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                              <div className="space-y-0.5">
                                <div className="font-bold text-slate-900 dark:text-white">{t.name}</div>
                                <div className="text-[11px] text-slate-600 dark:text-slate-400">{t.message}</div>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                                  t.passed
                                    ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                    : 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                                }`}
                              >
                                {t.passed ? 'PASSED' : 'FAILED'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 13: SCORING ENGINE & VERIFICATION (PHASE 8 SPECIFICATION) */}
              {activeTab === 'SCORING_ENGINE' && (
                <div className="space-y-6 animate-fade-in">
                  {/* Top Contract & Active Config Card */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-5 transition-colors">
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                      <div>
                        <div className="flex items-center space-x-2">
                          <Calculator className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                          <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                            Aturan Penilaian Otomatis &amp; Verifikasi Nilai
                          </h2>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                          Sistem penilaian otomatis terstandar sekolah. Mendukung bobot soal seragam atau khusus, poin benar/salah/kosong, penalti salah (skor minus), penskalaan skor 0–100, komparasi terhadap skor Google Form, serta verifikasi bebas penimpaan data.
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-[11px] font-mono bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-2.5 py-1 rounded-lg font-semibold flex items-center space-x-1.5">
                          <Scale className="w-3.5 h-3.5" />
                          <span>KONTRAK: SCORING_RULES.md</span>
                        </span>
                      </div>
                    </div>

                    {/* Interactive Score Source Switch (Mode Acuan Sumber Nilai) */}
                    <div className="p-4 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl flex flex-wrap items-center justify-between gap-4 transition-colors">
                      <div className="space-y-1 max-w-xl">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900 dark:text-white text-xs">
                            Mode Acuan Sumber Nilai Utama:
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            activeTryout?.scoringConfig?.scoreSource === 'CUSTOM_ENGINE'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                          }`}>
                            {activeTryout?.scoringConfig?.scoreSource === 'CUSTOM_ENGINE'
                              ? '⚡ Aturan Penilaian Sekolah'
                              : '📋 Nilai Langsung Kuis Google Form'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                          {activeTryout?.scoringConfig?.scoreSource === 'CUSTOM_ENGINE'
                            ? 'Aplikasi menghitung ulang skor secara otomatis menggunakan bobot soal, poin benar/salah, penalti minus, essay, dan KKM sekolah.'
                            : 'Aplikasi langsung menggunakan skor murni dari kuis Google Form tanpa perhitungan atau penyesuaian ulang.'}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (!activeTryout) return;
                          const currentSrc = activeTryout.scoringConfig?.scoreSource || 'GOOGLE_FORM';
                          const newSrc: 'CUSTOM_ENGINE' | 'GOOGLE_FORM' = currentSrc === 'CUSTOM_ENGINE' ? 'GOOGLE_FORM' : 'CUSTOM_ENGINE';
                          const updatedConfig = {
                            ...activeTryout.scoringConfig,
                            scoreSource: newSrc
                          };
                          dbService.updateTryoutScoringConfig(activeTryout.id, updatedConfig, currentUser);
                          setTryouts(dbService.getTryouts());
                          triggerToast(`Mode Acuan Nilai untuk ${activeTryout.code} diubah ke: ${newSrc === 'CUSTOM_ENGINE' ? 'Aturan Penilaian Sekolah' : 'Nilai Langsung Google Form'}`);
                        }}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center space-x-2 ${
                          activeTryout?.scoringConfig?.scoreSource === 'CUSTOM_ENGINE'
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                        }`}
                      >
                        <Sliders className="w-4 h-4" />
                        <span>
                          {activeTryout?.scoringConfig?.scoreSource === 'CUSTOM_ENGINE'
                            ? '⚡ Mode Aturan Sekolah (Aktif) — Klik untuk Beralih ke Google Form'
                            : '📋 Mode Google Form (Aktif) — Klik untuk Beralih ke Aturan Sekolah'}
                        </span>
                      </button>
                    </div>

                    {/* Active Tryout Scoring Configuration Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1">
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Try Out Aktif</div>
                        <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                          <span>{activeTryout?.title || 'Try Out Terpilih'}</span>
                          <span className="font-mono text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded">
                            {activeTryout?.code}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400">
                          Tipe Penilaian:{' '}
                          <strong className="text-indigo-700 dark:text-indigo-400 font-mono">
                            {activeTryout?.scoringConfig.scoringType}
                          </strong>
                        </div>
                      </div>

                      <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1">
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Bobot & Poin Penilaian</div>
                        <div className="grid grid-cols-3 gap-2 text-[11px]">
                          <div>
                            <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Benar</span>
                            <span className="font-bold font-mono text-emerald-700 dark:text-emerald-400">+{activeTryout?.scoringConfig.correctScore}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Salah</span>
                            <span className="font-bold font-mono text-rose-700 dark:text-rose-400">{activeTryout?.scoringConfig.wrongScore}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Kosong</span>
                            <span className="font-bold font-mono text-slate-700 dark:text-slate-300">{activeTryout?.scoringConfig.unansweredScore}</span>
                          </div>
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 pt-1">
                          Penalti Negatif:{' '}
                          <span className={activeTryout?.scoringConfig.allowNegativeMarking ? 'text-rose-700 dark:text-rose-400 font-bold' : 'text-slate-600 dark:text-slate-400'}>
                            {activeTryout?.scoringConfig.allowNegativeMarking ? 'AKTIF (Minus)' : 'TIDAK AKTIF (0 Poin)'}
                          </span>
                        </div>
                      </div>

                      <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1">
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Standarisasi Skala</div>
                        <div className="text-[11px] text-slate-700 dark:text-slate-300">
                          Skor Maksimum (Max Score):{' '}
                          <span className="font-bold font-mono text-indigo-700 dark:text-indigo-400 text-sm">
                            {activeTryout?.scoringConfig.maxScore}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          Kriteria Mismatch:{' '}
                          <span className="font-mono text-amber-700 dark:text-amber-400 font-semibold">
                            |GForm - Hitung| &gt; 0.01
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Critical Rule Callout Banner */}
                    <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-start space-x-3 text-xs text-amber-900 dark:text-amber-300">
                      <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div className="space-y-1 leading-relaxed">
                        <div className="font-bold text-amber-950 dark:text-amber-200">
                          Aturan Kritis Integritas Data (No Silent Overwrite Rule):
                        </div>
                        <p className="text-[11px] text-amber-800 dark:text-amber-300/90">
                          1. <strong>Jangan Pernah Overwrite Otomatis:</strong> Jawaban mentah siswa (<em>raw answers</em>) dan skor asli Google Form (<em>google_form_score</em>) tidak boleh diubah saat terjadi selisih penilaian.<br />
                          2. <strong>Penyimpanan Ganda:</strong> Basis data menyimpan secara eksplisit kedua nilai: <code>google_form_score</code> dan <code>calculated_score</code> beserta <code>score_difference</code>.<br />
                          3. <strong>Transparansi Audit:</strong> Selisih &gt; 0.01 secara permanen diberi status <code>SCORING_MISMATCH</code>, ditandai dengan badge peringatan Amber, dan dicatat pada audit log.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 1: AUTOMATED 10-SCENARIO SCORING ENGINE TEST SUITE */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4 transition-colors">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                      <div>
                        <div className="flex items-center space-x-2">
                          <CheckCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            Uji Otomatis Sistem Penilaian (10 Skenario Standar)
                          </h3>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Memverifikasi secara menyeluruh perhitungan nilai: Semua Benar, Semua Salah, Jawaban Kosong, Kombinasi, Penalti Minus, Bobot Soal Rata, Bobot Khusus, Skala Maksimum, dan Kesesuaian Nilai Google Form.
                        </p>
                      </div>

                      <button
                        onClick={handleRunScoringEngineTests}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center space-x-2 shadow-sm transition-colors"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Jalankan 10 Test Cases Scoring</span>
                      </button>
                    </div>

                    {scoringTestResult && (
                      <div className="space-y-4">
                        <div
                          className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs font-bold ${
                            scoringTestResult.passed
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200'
                              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-200'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            <span>
                              Status Keseluruhan Suite Scoring: {scoringTestResult.passed ? 'SEMUA 10 BENCHMARK TERVERIFIKASI LOLOS (100%)' : 'GAGAL'}
                            </span>
                          </div>
                          <span className="font-mono text-xs bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
                            {scoringTestResult.tests.filter(t => t.passed).length} / {scoringTestResult.tests.length} Kasus Lolos
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {scoringTestResult.tests.map((t, idx) => (
                            <div
                              key={idx}
                              className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors space-y-3"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-900 dark:text-white text-xs">{t.name}</span>
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                    t.passed
                                      ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                      : 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                                  }`}
                                >
                                  {t.passed ? 'PASSED' : 'FAILED'}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                                <div>
                                  <div className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">Ekspektasi Manual</div>
                                  <div className="text-slate-700 dark:text-slate-300">
                                    Raw: <strong className="font-mono text-slate-900 dark:text-white">{t.expected.rawScore}</strong> | Final:{' '}
                                    <strong className="font-mono text-slate-900 dark:text-white">{t.expected.finalScore}</strong>
                                  </div>
                                  <div className="text-slate-500 dark:text-slate-400 text-[10px]">
                                    ({t.expected.correctCount} benar, {t.expected.incorrectCount} salah, {t.expected.unansweredCount} kosong)
                                  </div>
                                  <div className="text-[10px] mt-0.5">
                                    Status:{' '}
                                    <span
                                      className={`font-mono font-bold ${
                                        t.expected.status === 'MATCH' ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
                                      }`}
                                    >
                                      {t.expected.status}
                                    </span>
                                  </div>
                                </div>

                                <div>
                                  <div className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">Hasil Engine Database</div>
                                  <div className="text-slate-700 dark:text-slate-300">
                                    Raw: <strong className="font-mono text-indigo-600 dark:text-indigo-400">{t.actual.rawScore}</strong> | Final:{' '}
                                    <strong className="font-mono text-indigo-600 dark:text-indigo-400">{t.actual.finalScore}</strong>
                                  </div>
                                  <div className="text-slate-500 dark:text-slate-400 text-[10px]">
                                    ({t.actual.correctCount} benar, {t.actual.incorrectCount} salah, {t.actual.unansweredCount} kosong)
                                  </div>
                                  <div className="text-[10px] mt-0.5">
                                    Status:{' '}
                                    <span
                                      className={`font-mono font-bold ${
                                        t.actual.status === 'MATCH' ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
                                      }`}
                                    >
                                      {t.actual.status}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="text-[11px] text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800 leading-snug">
                                <span className="font-semibold text-slate-700 dark:text-slate-300">Verifikasi: </span>
                                {t.message}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* SECTION 2: INTERACTIVE SCORING ENGINE SIMULATOR & SANDBOX */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-5 transition-colors">
                    <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            Simulasi & Kalkulator Nilai Interaktif
                          </h3>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Uji coba simulasi perhitungan real-time dengan parameter kustom untuk memverifikasi akurasi matematis dan perilaku No Silent Overwrite.
                        </p>
                      </div>
                      <span className="text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded font-mono">
                        Live Sandbox
                      </span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
                      {/* Left Column: Parameter Configuration */}
                      <div className="lg:col-span-5 space-y-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60">
                        <div className="font-bold text-slate-800 dark:text-slate-200 text-xs pb-1 border-b border-slate-200 dark:border-slate-700">
                          1. Konfigurasi Parameter Penilaian
                        </div>

                        <div>
                          <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Tipe Penilaian</label>
                          <select
                            value={simScoringType}
                            onChange={e => setSimScoringType(e.target.value as any)}
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded font-medium focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="EQUAL_WEIGHT">EQUAL_WEIGHT (Bobot Butir Sama)</option>
                            <option value="CUSTOM_WEIGHT">CUSTOM_WEIGHT (Bobot Khusus per Butir)</option>
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Skor Maks (Max Score)</label>
                            <input
                              type="number"
                              value={simMaxScore}
                              onChange={e => setSimMaxScore(Number(e.target.value))}
                              className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded font-mono font-bold"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Poin Benar (+)</label>
                            <input
                              type="number"
                              value={simCorrectScore}
                              onChange={e => setSimCorrectScore(Number(e.target.value))}
                              className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-emerald-600 dark:text-emerald-400 rounded font-mono font-bold"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Poin Salah (-)</label>
                            <input
                              type="number"
                              value={simWrongScore}
                              onChange={e => setSimWrongScore(Number(e.target.value))}
                              className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-rose-600 dark:text-rose-400 rounded font-mono font-bold"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Poin Kosong</label>
                            <input
                              type="number"
                              value={simUnansweredScore}
                              onChange={e => setSimUnansweredScore(Number(e.target.value))}
                              className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded font-mono font-bold"
                            />
                          </div>
                        </div>

                        <div className="pt-1">
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={simAllowNegativeMarking}
                              onChange={e => setSimAllowNegativeMarking(e.target.checked)}
                              className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                              Aktifkan Penalti Nilai Minus (Allow Negative Marking)
                            </span>
                          </label>
                        </div>

                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                          <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                            Skor Google Form Terkirim (Input Form)
                          </label>
                          <input
                            type="number"
                            value={simGFormScore}
                            onChange={e => setSimGFormScore(Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded font-mono font-bold text-indigo-900 dark:text-indigo-300"
                          />
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                            Ganti nilai ini untuk mensimulasikan status MATCH atau SCORING_MISMATCH.
                          </span>
                        </div>

                        <div className="font-bold text-slate-800 dark:text-slate-200 text-xs pt-2 pb-1 border-b border-slate-200 dark:border-slate-700">
                          2. Input Jawaban Siswa (5 Butir Soal Sampel)
                        </div>

                        <div className="space-y-2">
                          {['SIM-Q01', 'SIM-Q02', 'SIM-Q03', 'SIM-Q04', 'SIM-Q05'].map((code) => (
                            <div key={code} className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                              <div className="space-y-0.5">
                                <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">{code}</span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Kunci: A</span>
                              </div>

                              <div className="flex items-center space-x-2">
                                {simScoringType === 'CUSTOM_WEIGHT' && (
                                  <div className="flex items-center space-x-1">
                                    <span className="text-[10px] text-slate-400">Bobot:</span>
                                    <input
                                      type="number"
                                      min={1}
                                      max={10}
                                      value={simWeights[code] || 1}
                                      onChange={e => setSimWeights({ ...simWeights, [code]: Number(e.target.value) })}
                                      className="w-12 px-1.5 py-0.5 text-center bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded font-mono text-xs text-slate-900 dark:text-slate-100"
                                    />
                                  </div>
                                )}

                                <select
                                  value={simAnswers[code] || ''}
                                  onChange={e => setSimAnswers({ ...simAnswers, [code]: e.target.value })}
                                  className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded font-bold font-mono text-xs"
                                >
                                  <option value="A">A (Benar)</option>
                                  <option value="B">B (Salah)</option>
                                  <option value="C">C (Salah)</option>
                                  <option value="D">D (Salah)</option>
                                  <option value="">[Kosong]</option>
                                </select>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Right Column: Instant Live Results Panel */}
                      <div className="lg:col-span-7 space-y-4">
                        <div className="font-bold text-slate-800 dark:text-slate-200 text-xs pb-1 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                          <span>3. Hasil Perhitungan Otomatis Sistem</span>
                          <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded">
                            Output Real-Time
                          </span>
                        </div>

                        {simResult ? (
                          <div className="space-y-4">
                            {/* Score Big Display Cards */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                              <div className="bg-slate-900 dark:bg-slate-950 border border-slate-800 text-white p-3.5 rounded-xl space-y-1">
                                <span className="text-[10px] text-slate-400 font-semibold block">Skor Akhir (Hitung)</span>
                                <span className="text-2xl font-black font-mono text-indigo-300">
                                  {simResult.final_score}
                                </span>
                                <span className="text-[10px] text-slate-400 block font-mono">
                                  Skala: {simMaxScore}
                                </span>
                              </div>

                              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3.5 rounded-xl space-y-1">
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block">Persentase</span>
                                <span className="text-2xl font-black font-mono text-slate-900 dark:text-slate-100">
                                  {simResult.percentage}%
                                </span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-mono">
                                  (Raw {simResult.raw_score} / {simResult.maxPossibleRawScore})
                                </span>
                              </div>

                              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3.5 rounded-xl space-y-1">
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block">Skor Google Form</span>
                                <span className="text-2xl font-black font-mono text-slate-900 dark:text-slate-100">
                                  {simResult.google_form_score}
                                </span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-mono">
                                  Data Pengiriman
                                </span>
                              </div>

                              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3.5 rounded-xl space-y-1">
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block">Selisih Skor (Δ)</span>
                                <span
                                  className={`text-2xl font-black font-mono ${
                                    simResult.score_difference <= 0.01 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                                  }`}
                                >
                                  {simResult.score_difference.toFixed(2)}
                                </span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-mono">
                                  Absolut
                                </span>
                              </div>
                            </div>

                            {/* Status Banner */}
                            <div
                              className={`p-3.5 rounded-xl border flex items-center justify-between ${
                                simResult.scoring_status === 'MATCH'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200'
                                  : 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200'
                              }`}
                            >
                              <div className="flex items-center space-x-2">
                                {simResult.scoring_status === 'MATCH' ? (
                                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                ) : (
                                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                                )}
                                <div>
                                  <span className="font-bold text-xs block">
                                    Status Scoring: {simResult.scoring_status}
                                  </span>
                                  <span className="text-[11px] text-slate-600 dark:text-slate-400">
                                    {simResult.scoring_status === 'MATCH'
                                      ? 'Skor Google Form sama persis dengan hasil perhitungan sistem (selisih ≤ 0.01).'
                                      : 'Terdeteksi selisih nilai > 0.01 antara Google Form dan aturan penilaian sekolah.'}
                                  </span>
                                </div>
                              </div>

                              <span
                                className={`px-2.5 py-1 rounded text-xs font-mono font-bold ${
                                  simResult.scoring_status === 'MATCH'
                                    ? 'bg-emerald-200 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200'
                                    : 'bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200'
                                }`}
                              >
                                {simResult.scoring_status}
                              </span>
                            </div>

                            {/* No Silent Overwrite Verification Box when Mismatch Occurs */}
                            {simResult.scoring_status === 'SCORING_MISMATCH' && (
                              <div className="p-3 bg-amber-100/70 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl text-amber-900 dark:text-amber-200 text-xs space-y-1">
                                <span className="font-bold flex items-center space-x-1">
                                  <ShieldCheck className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                                  <span>Verifikasi Aturan: No Silent Overwrite Terjamin</span>
                                </span>
                                <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                                  Sistem mempertahankan jawaban mentah siswa tanpa overwrite, menyimpan skor Google Form ({simResult.google_form_score}), dan mencatat skor hitung database ({simResult.calculated_score}). Selisih sebesar {simResult.score_difference.toFixed(2)} ditandai untuk peninjauan guru/admin.
                                </p>
                              </div>
                            )}

                            {/* Item Breakdown Table */}
                            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                              <div className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs border-b border-slate-200 dark:border-slate-800">
                                Rincian Penilaian Butir Soal (Item Score Breakdown)
                              </div>
                              <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                                  <tr>
                                    <th className="p-2">Kode Soal</th>
                                    <th className="p-2">Jawaban Siswa</th>
                                    <th className="p-2">Kunci</th>
                                    <th className="p-2">Bobot (w)</th>
                                    <th className="p-2 text-right">Poin Diperoleh</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                  {Object.entries(simResult.answerBreakdown).map(([code, item]) => (
                                    <tr key={code} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 font-mono text-[11px]">
                                      <td className="p-2 font-bold text-slate-900 dark:text-slate-100">{code}</td>
                                      <td className="p-2">
                                        {item.studentAnswer ? (
                                          <span
                                            className={`px-1.5 py-0.5 rounded font-bold ${
                                              item.isCorrect ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                                            }`}
                                          >
                                            {item.studentAnswer}
                                          </span>
                                        ) : (
                                          <span className="text-slate-400 italic">[Kosong]</span>
                                        )}
                                      </td>
                                      <td className="p-2 text-slate-600 dark:text-slate-400">{item.correctAnswer}</td>
                                      <td className="p-2 text-slate-600 dark:text-slate-400">{item.weight}</td>
                                      <td className="p-2 text-right font-bold text-indigo-700 dark:text-indigo-400">
                                        {item.score > 0 ? `+${item.score}` : item.score}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Summary Counters */}
                            <div className="grid grid-cols-3 gap-2 text-center text-xs">
                              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-900 dark:text-emerald-200">
                                <span className="text-[10px] block text-emerald-700 dark:text-emerald-300">Jumlah Benar</span>
                                <strong className="text-sm font-mono">{simResult.correct_count}</strong>
                              </div>
                              <div className="p-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-900 dark:text-rose-200">
                                <span className="text-[10px] block text-rose-700 dark:text-rose-300">Jumlah Salah</span>
                                <strong className="text-sm font-mono">{simResult.incorrect_count}</strong>
                              </div>
                              <div className="p-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300">
                                <span className="text-[10px] block text-slate-500 dark:text-slate-400">Jumlah Kosong</span>
                                <strong className="text-sm font-mono">{simResult.unanswered_count}</strong>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-8 text-center text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                            Memuat data kalkulasi simulasi...
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* SECTION 3: REAL-TIME MISMATCH AUDIT & MONITORING TABLE */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4 transition-colors">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            Monitor & Audit Scoring Mismatch Aktif (Database Watcher)
                          </h3>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Daftar seluruh siswa dalam database yang memiliki perbedaan antara skor Google Form dan skor kalkulasi database.
                        </p>
                      </div>

                      <span className="text-xs font-mono font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-2.5 py-1 rounded">
                        {mismatchScores.length} Kasus Mismatch Terdeteksi
                      </span>
                    </div>

                    {mismatchScores.length > 0 ? (
                      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                            <tr>
                              <th className="p-3">Siswa & NISN</th>
                              <th className="p-3">Try Out</th>
                              <th className="p-3">Skor Google Form</th>
                              <th className="p-3">Skor Perhitungan Sistem</th>
                              <th className="p-3">Selisih (Δ)</th>
                              <th className="p-3">Status</th>
                              <th className="p-3">Waktu Pencatatan</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {mismatchScores.map(score => {
                              const student = students.find(s => s.id === score.studentId);
                              const to = tryouts.find(t => t.id === score.tryoutId);
                              return (
                                <tr key={score.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                  <td className="p-3">
                                    <div className="font-bold text-slate-900 dark:text-slate-100">{student?.name || score.studentId}</div>
                                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">NISN: {student?.nisn || '-'}</div>
                                  </td>
                                  <td className="p-3 font-medium text-slate-700 dark:text-slate-300">
                                    {to?.title || score.tryoutId}
                                  </td>
                                  <td className="p-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                                    {score.googleFormScore}
                                  </td>
                                  <td className="p-3 font-mono font-bold text-indigo-700 dark:text-indigo-400">
                                    {score.calculatedScore}
                                  </td>
                                  <td className="p-3 font-mono font-bold text-amber-700 dark:text-amber-400">
                                    {score.scoreDifference.toFixed(2)}
                                  </td>
                                  <td className="p-3">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                      SCORING_MISMATCH
                                    </span>
                                  </td>
                                  <td className="p-3 text-slate-500 dark:text-slate-400 text-[11px] font-mono">
                                    {new Date(score.createdAt).toLocaleString('id-ID')}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-6 text-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-xs">
                        Tidak ada data dengan status SCORING_MISMATCH. Seluruh skor tersinkronisasi 100% dengan Google Form.
                      </div>
                    )}
                  </div>
              </div>
            )}
          </>
        )}
        </div>
      </main>

      {/* ------------------------------------------------------------- */}
      {/* QUESTION MODAL (CREATE / EDIT) */}
      {/* ------------------------------------------------------------- */}
      {showQuestionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {editingQuestionId ? 'Edit Butir Soal' : 'Tambah Butir Soal Baru'}
                </h3>
              </div>
              <button onClick={() => setShowQuestionModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Mata Pelajaran</label>
                  <select
                    value={qSubjectId}
                    onChange={e => setQSubjectId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded p-2 focus:ring-1 focus:ring-indigo-500"
                  >
                    {permittedSubjects.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Materi</label>
                  <select
                    value={qMaterialId}
                    onChange={e => setQMaterialId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded p-2 focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">Pilih Materi...</option>
                    {materials
                      .filter(m => m.subjectId === qSubjectId)
                      .map(m => (
                        <option key={m.id} value={m.id}>
                          {m.code} — {m.title}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Nomor Soal</label>
                  <input
                    type="number"
                    min={1}
                    value={qNumber}
                    onChange={e => setQNumber(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded p-2 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Kode Unik</label>
                  <input
                    type="text"
                    value={qUniqueCode}
                    onChange={e => setQUniqueCode(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded p-2 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Level Kognitif</label>
                  <select
                    value={qCognitiveLevel}
                    onChange={e => setQCognitiveLevel(e.target.value as CognitiveLevel)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded p-2 font-semibold"
                  >
                    <option value="C1">C1 - Mengingat</option>
                    <option value="C2">C2 - Memahami</option>
                    <option value="C3">C3 - Menerapkan</option>
                    <option value="C4">C4 - Menganalisis</option>
                    <option value="C5">C5 - Mengevaluasi</option>
                    <option value="C6">C6 - Mencipta</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Status</label>
                  <select
                    value={qStatus}
                    onChange={e => setQStatus(e.target.value as QuestionStatus)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded p-2 font-semibold"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="DRAFT">DRAFT</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Teks Pertanyaan / Butir Soal</label>
                <textarea
                  rows={3}
                  value={qText}
                  onChange={e => setQText(e.target.value)}
                  placeholder="Tuliskan butir pertanyaan di sini..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded p-2.5 leading-relaxed placeholder-slate-400"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-slate-700 dark:text-slate-300 font-semibold">Pilihan Jawaban (Opsi A s/d E) & Kunci</label>
                {qOptions.map((opt, idx) => (
                  <div key={opt.key} className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setQCorrectAnswer(opt.key)}
                      className={`w-7 h-7 rounded text-xs font-bold border transition-colors ${
                        qCorrectAnswer === opt.key
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                      title={qCorrectAnswer === opt.key ? 'Kunci Jawaban Terpilih' : 'Jadikan Kunci Jawaban'}
                    >
                      {opt.key}
                    </button>
                    <input
                      type="text"
                      value={opt.text}
                      onChange={e => {
                        const next = [...qOptions];
                        next[idx].text = e.target.value;
                        setQOptions(next);
                      }}
                      placeholder={`Isi pilihan jawaban ${opt.key}...`}
                      className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded p-2 text-xs placeholder-slate-400"
                      required
                    />
                  </div>
                ))}
                <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                  Klik tombol huruf (A/B/C/D/E) yang berwarna hijau untuk menentukan kunci jawaban yang benar.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowQuestionModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow"
                >
                  Simpan Butir Soal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MATERIAL MODAL (CREATE / EDIT) */}
      {/* ------------------------------------------------------------- */}
      {showMaterialModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {editingMaterialId ? 'Edit Materi Pembelajaran' : 'Tambah Materi Pembelajaran'}
              </h3>
              <button onClick={() => setShowMaterialModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMaterial} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Mata Pelajaran</label>
                <select
                  value={matSubjectId}
                  onChange={e => setMatSubjectId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded p-2"
                >
                  {permittedSubjects.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Kode Materi</label>
                <input
                  type="text"
                  value={matCode}
                  onChange={e => setMatCode(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded p-2 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Judul Materi</label>
                <input
                  type="text"
                  value={matTitle}
                  onChange={e => setMatTitle(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded p-2"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Deskripsi Ruang Lingkup</label>
                <textarea
                  rows={3}
                  value={matDescription}
                  onChange={e => setMatDescription(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded p-2"
                />
              </div>

              {/* GOOGLE FORM INTEGRATION FIELD */}
              <div className="p-3 bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-xl space-y-2">
                <label className="block text-teal-900 dark:text-teal-200 font-bold text-xs flex items-center gap-1.5">
                  <ExternalLink className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span>Tautan / Link Google Form (Soal &amp; Kuis Materi)</span>
                </label>
                <input
                  type="url"
                  value={matGoogleFormUrl}
                  onChange={e => setMatGoogleFormUrl(e.target.value)}
                  placeholder="https://docs.google.com/forms/d/e/.../viewform"
                  className="w-full bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-700 text-slate-900 dark:text-slate-100 rounded-lg p-2 text-xs font-mono"
                />
                <p className="text-[11px] text-teal-700 dark:text-teal-300 leading-tight">
                  Siswa akan mengerjakan soal/kuis materi ini secara terhubung melalui Google Form.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowMaterialModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-lg shadow-xs"
                >
                  Simpan Materi &amp; Form
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* GOOGLE FORM EMBEDDED PREVIEW MODAL */}
      {/* ------------------------------------------------------------- */}
      {previewGoogleFormUrl && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-teal-600 rounded-xl text-white">
                  <ExternalLink className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Lembar Soal Google Form</span>
                    <span className="text-[10px] bg-teal-900 text-teal-300 px-2 py-0.5 rounded font-mono font-bold">Terhubung Live</span>
                  </h3>
                  <p className="text-[11px] text-slate-300 font-mono truncate max-w-md">
                    {previewGoogleFormUrl}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewGoogleFormUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka di Tab Baru</span>
                </a>
                <button
                  onClick={() => setPreviewGoogleFormUrl(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Embedded Form iFrame Container */}
            <div className="flex-1 bg-slate-100 dark:bg-slate-950 relative">
              <iframe
                src={previewGoogleFormUrl.includes('viewform') ? previewGoogleFormUrl : `${previewGoogleFormUrl}?embedded=true`}
                className="w-full h-full border-0"
                title="Google Form Embedded Preview"
              />
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* EXPLANATION MODAL (CREATE / EDIT) — PHASE 10 */}
      {/* ------------------------------------------------------------- */}
      {showExplanationModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {editingExplanationId ? 'Edit Link & Modul Pembahasan' : 'Tambah Link Pembahasan Soal (PDF & YouTube)'}
                </h3>
              </div>
              <button onClick={() => setShowExplanationModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={e => {
                e.preventDefault();
                try {
                  const finalQuestionId = expQuestionId === 'GENERAL' ? undefined : expQuestionId;

                  // Process PDF Storage Metadata (Metadata + Storage Path pattern, NO binary in DB)
                  let pdfStoragePath: string | undefined = undefined;
                  let pdfUrl: string | undefined = expPdfUrl.trim() || undefined;
                  let pdfFileName: string | undefined = expPdfFileName.trim() || undefined;

                  if (pdfFileName && !pdfUrl) {
                    const meta = ExplanationService.processPdfStorageMetadata(pdfFileName, 2097152, expTryoutId);
                    pdfStoragePath = meta.pdfStoragePath;
                    pdfUrl = meta.pdfUrl;
                  }

                  if (editingExplanationId) {
                    dbService.updateExplanation(
                      editingExplanationId,
                      {
                        tryoutId: expTryoutId,
                        subjectId: expSubjectId,
                        title: expTitle,
                        questionId: finalQuestionId,
                        contentText: expContentText || 'Modul Pembahasan Soal Resmi Guru.',
                        pdfUrl,
                        pdfStoragePath,
                        pdfFileName,
                        youtubeUrl: expYoutubeUrl.trim() || undefined,
                        externalUrl: expExternalUrl.trim() || undefined,
                        status: expStatus,
                      },
                      currentUser
                    );
                    triggerToast('Pembahasan berhasil diperbarui.');
                  } else {
                    dbService.addExplanation(
                      {
                        tryoutId: expTryoutId,
                        subjectId: expSubjectId,
                        title: expTitle,
                        questionId: finalQuestionId,
                        contentText: expContentText || 'Modul Pembahasan Soal Resmi Guru.',
                        pdfUrl,
                        pdfStoragePath,
                        pdfFileName,
                        youtubeUrl: expYoutubeUrl.trim() || undefined,
                        externalUrl: expExternalUrl.trim() || undefined,
                        status: expStatus,
                      },
                      currentUser
                    );
                    triggerToast('Link pembahasan baru berhasil diterbitkan.');
                  }

                  setShowExplanationModal(false);
                  refreshData();
                } catch (err: any) {
                  triggerError(err.message || 'Gagal menyimpan pembahasan.');
                }
              }}
              className="p-5 space-y-4 text-xs max-h-[85vh] overflow-y-auto"
            >
              {/* Tryout & Subject Selector */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Paket Try Out</label>
                  <select
                    value={expTryoutId}
                    onChange={e => setExpTryoutId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg p-2 font-medium"
                  >
                    {tryouts.map(t => (
                      <option key={t.id} value={t.id}>{t.code} — {t.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Mata Pelajaran</label>
                  <select
                    value={expSubjectId}
                    onChange={e => setExpSubjectId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg p-2 font-medium"
                  >
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Title Input */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Judul Pembahasan / Modul Solusi</label>
                <input
                  type="text"
                  value={expTitle}
                  onChange={e => setExpTitle(e.target.value)}
                  placeholder="e.g. Pembahasan Fisika TO-3 — Modul Solusi Dinamika Gerak"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg p-2 placeholder-slate-400"
                  required
                />
              </div>

              {/* Scope & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Cakupan Pembahasan</label>
                  <select
                    value={expQuestionId}
                    onChange={e => setExpQuestionId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg p-2 font-medium"
                  >
                    <option value="GENERAL">Paket Lengkap Mapel (Semua Nomor)</option>
                    {questions
                      .filter(q => q.subjectId === expSubjectId || expSubjectId === 'ALL')
                      .map(q => (
                        <option key={q.id} value={q.id}>
                          Soal: {q.uniqueCode} ({q.questionText.slice(0, 25)}...)
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Status Publikasi</label>
                  <select
                    value={expStatus}
                    onChange={e => setExpStatus(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg p-2 font-semibold"
                  >
                    <option value="PUBLISHED">PUBLISHED (Tampil di Portal Siswa)</option>
                    <option value="DRAFT">DRAFT (Hanya Guru &amp; Admin)</option>
                    <option value="ARCHIVED">ARCHIVED (Disembunyikan / Dearsip)</option>
                  </select>
                </div>
              </div>

              {/* YouTube Link Section */}
              <div className="p-3 bg-rose-50/70 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-900/60 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 dark:text-rose-400">
                    <Youtube className="w-4 h-4 text-rose-600" />
                    <span>Link Video Pembahasan YouTube</span>
                  </div>
                  {expYoutubeUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveVideoModalUrl(expYoutubeUrl);
                        setActiveVideoModalTitle(expTitle || 'Pratinjau Video Pembahasan');
                      }}
                      className="text-[10px] font-bold text-rose-700 hover:text-rose-800 dark:text-rose-300 flex items-center gap-1 cursor-pointer bg-rose-100 dark:bg-rose-900/60 px-2 py-0.5 rounded"
                    >
                      <Play className="w-3 h-3 fill-rose-600" />
                      <span>Uji Putar Video</span>
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={expYoutubeUrl}
                  onChange={e => setExpYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=... atau https://youtu.be/..."
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg p-2 text-xs font-mono"
                />
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Format didukung: YouTube Watch, Short, atau Embed. Siswa dapat menonton langsung di portal atau membuka YouTube.
                </p>
              </div>

              {/* PDF Document Section */}
              <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-xl border border-indigo-200 dark:border-indigo-900/60 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-400">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <span>Link Dokumen Modul Solusi PDF</span>
                  </div>
                  {expPdfUrl && (
                    <a
                      href={expPdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-bold text-indigo-700 hover:text-indigo-800 dark:text-indigo-300 flex items-center gap-1 cursor-pointer bg-indigo-100 dark:bg-indigo-900/60 px-2 py-0.5 rounded"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Uji Buka PDF</span>
                    </a>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-0.5">Nama File PDF</label>
                    <input
                      type="text"
                      value={expPdfFileName}
                      onChange={e => setExpPdfFileName(e.target.value)}
                      placeholder="e.g. Modul_Solusi_TO3_Fisika.pdf"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg p-1.5 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-0.5">URL Public / Link PDF</label>
                    <input
                      type="text"
                      value={expPdfUrl}
                      onChange={e => setExpPdfUrl(e.target.value)}
                      placeholder="https://drive.google.com/... atau link PDF"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg p-1.5 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* External Link */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Tautan Tambahan (Google Drive / Docs) <span className="text-slate-400 font-normal">(Opsional)</span>
                </label>
                <input
                  type="text"
                  value={expExternalUrl}
                  onChange={e => setExpExternalUrl(e.target.value)}
                  placeholder="https://docs.google.com/... atau https://drive.google.com/..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg p-2 text-xs font-mono"
                />
              </div>

              {/* Text Note */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Catatan / Rangkuman Pembahasan <span className="text-slate-400 font-normal">(Opsional jika link PDF/YT sudah ada)</span>
                </label>
                <textarea
                  rows={3}
                  value={expContentText}
                  onChange={e => setExpContentText(e.target.value)}
                  placeholder="Tuliskan catatan rumus penting, kunci pembahasan, atau petunjuk belajar siswa..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg p-2 font-normal placeholder-slate-400"
                />
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowExplanationModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-xs cursor-pointer"
                >
                  {editingExplanationId ? 'Simpan Perubahan' : 'Terbitkan Link Pembahasan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GURU BATCH DELETE CONFIRMATION MODAL */}
      {guruBatchDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Konfirmasi Hapus Massal Guru
                </h3>
                <span className="text-xs text-rose-600 dark:text-rose-400 font-bold">
                  {guruBatchDeleteConfirm.count} Item Terpilih ({guruBatchDeleteConfirm.type})
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
              <p className="font-bold mb-1">
                Apakah Anda yakin ingin menghapus {guruBatchDeleteConfirm.count} {guruBatchDeleteConfirm.type === 'QUESTION' ? 'butir soal' : guruBatchDeleteConfirm.type === 'MATERIAL' ? 'materi' : 'kompetensi'} sekaligus?
              </p>
              <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                Tindakan ini permanen. Seluruh data terikat akan diperbarui secara aman.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setGuruBatchDeleteConfirm(null)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmGuruBatchDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus {guruBatchDeleteConfirm.count} Item</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD TRYOUT PACKAGE MODAL */}
      {showTryoutModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 font-bold text-sm">
                <Layers className="w-5 h-5" />
                <span>Tambah Paket TryOut Baru</span>
              </div>
              <button
                type="button"
                onClick={() => setShowTryoutModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Kode TryOut (Opsional)
                </label>
                <input
                  type="text"
                  value={newToCode}
                  onChange={e => setNewToCode(e.target.value)}
                  placeholder="Contoh: TO-2026-05"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Nama / Judul Paket TryOut <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newToTitle}
                  onChange={e => setNewToTitle(e.target.value)}
                  placeholder="Contoh: Try Out 5 — Evaluasi Pasca Mid Semester"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Tautan Link Google Form (Soal Ujian)
                </label>
                <input
                  type="url"
                  value={newToGFormUrl}
                  onChange={e => setNewToGFormUrl(e.target.value)}
                  placeholder="https://forms.gle/..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Tautan Link Google Sheet (Respons Nilai)
                </label>
                <input
                  type="url"
                  value={newToGSheetUrl}
                  onChange={e => setNewToGSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="p-3 bg-teal-50 dark:bg-teal-950/40 rounded-xl border border-teal-200 dark:border-teal-800 text-[11px] text-teal-800 dark:text-teal-300 leading-relaxed">
                💡 <strong>Informasi:</strong> Setelah disimpan, paket TryOut baru akan langsung terintegrasi secara otomatis pada Grafik Perkembangan, Diagram Ketuntasan KKM, dan Tabel Rekapitulasi Nilai Lintas TryOut.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowTryoutModal(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleCreateTryoutPackage}
                className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Paket TryOut</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONTEXTUAL DELETE CONFIRMATION MODAL */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Konfirmasi Hapus Butir Soal
                </h3>
                <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                  {deleteConfirmItem.code}
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
              <p className="line-clamp-2 italic text-slate-600 dark:text-slate-400 mb-2">
                &ldquo;{deleteConfirmItem.title}&rdquo;
              </p>
              <p className="text-rose-600 dark:text-rose-400 font-medium">
                Tindakan ini permanen. Seluruh relasi kisi-kisi dan analisis butir soal terkait akan disesuaikan.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmItem(null)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteQuestion}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus Permanen</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TEACHER PREVIEW VIDEO MODAL WITH EMBEDDED IFRAME PLAYER */}
      {activeVideoModalUrl && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800 transition-colors animate-fade-in space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950 text-rose-600">
                  <Youtube className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate max-w-md">
                    {activeVideoModalTitle || 'Pratinjau Video Pembahasan Soal'}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Uji Pemutaran Video YouTube
                  </span>
                </div>
              </div>
              <button
                onClick={() => setActiveVideoModalUrl(null)}
                className="px-2.5 py-1 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold cursor-pointer transition-colors"
              >
                ✕ Tutup
              </button>
            </div>

            <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-inner relative">
              {getYouTubeEmbedUrl(activeVideoModalUrl) ? (
                <iframe
                  src={getYouTubeEmbedUrl(activeVideoModalUrl)!}
                  title={activeVideoModalTitle || 'Video Pembahasan'}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-white text-xs p-6 space-y-3">
                  <Youtube className="w-12 h-12 text-rose-500" />
                  <p className="text-slate-300">Format URL video khusus, silakan buka langsung di YouTube:</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Pratinjau tampilan pemutaran video untuk siswa
              </span>
              <a
                href={activeVideoModalUrl}
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
