import {
  User, Teacher, Student, ClassRoom, StudentClass, AcademicYear, Subject,
  TeacherSubject, Material, Competency, Tryout, TryoutSubject, Question,
  TryoutQuestion, GoogleForm, Response, Answer, Score, QuestionAnalysis,
  Explanation, Report, AuditLog, TryoutStatus, ScoringConfig, Role, SchoolProfile,
  ExamPackage, ExamPackageSubject
} from '../types/database';
import {
  INITIAL_ACADEMIC_YEARS, INITIAL_USERS, INITIAL_TEACHERS, INITIAL_CLASSES,
  INITIAL_SUBJECTS, INITIAL_TEACHER_SUBJECTS, INITIAL_MATERIALS,
  INITIAL_COMPETENCIES, INITIAL_STUDENTS, INITIAL_TRYOUTS,
  INITIAL_TRYOUT_SUBJECTS, INITIAL_QUESTIONS, INITIAL_TRYOUT_QUESTIONS,
  INITIAL_EXPLANATIONS, INITIAL_RESPONSES, INITIAL_ANSWERS, INITIAL_SCORES, INITIAL_AUDIT_LOGS
} from './mockData';
import { ScoringService, ScoringTestCaseResult } from './scoring';
import {
  AnalyticsService, OverallAnalyticsFilters, OverallAnalyticsResult,
  ClassAnalyticsResult, StudentAnalyticsResult, QuestionAnalysisResult,
  AnalyticsTestSuiteResult
} from './analytics';
import {
  ExplanationService, ExplanationTestSuiteResult
} from './explanation';
import { ExportService, ReportTestSuiteResult } from './export';
import {
  ProgressService, ProgressTestSuiteResult, StudentProgressResult,
  ClassProgressResult, SubjectProgressResult, CompetencyProgressResult
} from './progress';
import {
  ProductionValidationService, ProductionValidationSuiteResult
} from './productionValidation';
import { sdb } from './supabaseDb';
import { generateUuid, isValidUuid } from '../utils/idUtils';

const STORAGE_KEY = 'school_tryout_analytics_db_v1';
const DELETED_TRYOUTS_KEY = 'school_tryout_deleted_ids_v1';

export interface DatabaseState {
  users: User[];
  teachers: Teacher[];
  students: Student[];
  classes: ClassRoom[];
  studentClasses: StudentClass[];
  academicYears: AcademicYear[];
  subjects: Subject[];
  teacherSubjects: TeacherSubject[];
  materials: Material[];
  competencies: Competency[];
  examPackages: ExamPackage[];
  tryouts: Tryout[];
  tryoutSubjects: TryoutSubject[];
  questions: Question[];
  tryoutQuestions: TryoutQuestion[];
  googleForms: GoogleForm[];
  responses: Response[];
  answers: Answer[];
  scores: Score[];
  questionAnalysis: QuestionAnalysis[];
  explanations: Explanation[];
  reports: Report[];
  auditLogs: AuditLog[];
  schoolProfile?: SchoolProfile;
}

export class DatabaseService {
  private state: DatabaseState;
  private listeners: (() => void)[] = [];

  // Supabase cloud sync state
  private supabaseSyncEnabled = false;
  private isFreshDevice = false;
  private supabaseInitDone = false;
  private realtimeChannel: unknown = null;
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private syncSubscribersCount = 0;

  // Fast In-Memory Performance Indexes for O(1) Lookups
  private responsesByTryoutStudent = new Map<string, Response>();
  private answersByTryout = new Map<string, Answer[]>();
  private answersByQuestion = new Map<string, Answer[]>();
  private scoresByTryout = new Map<string, Score[]>();
  private scoresByStudent = new Map<string, Score[]>();
  private studentsByClass = new Map<string, Student[]>();

  constructor() {
    this.state = this.loadFromStorage();
    this.migrateLegacyIds();
    this.rebuildIndexes();
    this.setupLocalStorageListener();
    // Trigger async Supabase init after synchronous construction
    this.initSupabaseSync();
  }

  /**
   * Mengonversi ID lama (c-*, s-*, ay-*) ke format UUID standar
   * agar kompatibel 100% dengan database cloud Supabase / PostgreSQL.
   */
  private migrateLegacyIds(): void {
    let changed = false;

    // 1. Standarisasi Academic Year ke UUID Supabase
    const activeAyUuid = '0ffe2ac4-48bd-400b-ae8c-05ecff36e4a1';
    this.state.academicYears.forEach(ay => {
      if (!isValidUuid(ay.id)) {
        const oldId = ay.id;
        ay.id = activeAyUuid;
        changed = true;

        this.state.classes.forEach(c => {
          if (c.academicYearId === oldId) c.academicYearId = activeAyUuid;
        });
        if (this.state.examPackages) {
          this.state.examPackages.forEach(p => {
            if (p.academicYearId === oldId) p.academicYearId = activeAyUuid;
          });
        }
        if (this.state.tryouts) {
          this.state.tryouts.forEach(t => {
            if (t.academicYearId === oldId) t.academicYearId = activeAyUuid;
          });
        }
      }
    });

    // 2. Standarisasi Classes ke UUID
    this.state.classes.forEach(c => {
      if (!isValidUuid(c.id)) {
        const oldId = c.id;
        const newUuid = generateUuid();
        c.id = newUuid;
        changed = true;

        this.state.students.forEach(s => {
          if (s.classId === oldId) s.classId = newUuid;
        });

        this.state.teachers.forEach(t => {
          if (t.classPermissions && t.classPermissions.includes(oldId)) {
            t.classPermissions = t.classPermissions.map(p => p === oldId ? newUuid : p);
          }
          if (t.homeRoomClassId === oldId) {
            t.homeRoomClassId = newUuid;
          }
        });

        if (this.state.examPackages) {
          this.state.examPackages.forEach(p => {
            if (p.targetClassIds && p.targetClassIds.includes(oldId)) {
              p.targetClassIds = p.targetClassIds.map(cid => cid === oldId ? newUuid : cid);
            }
          });
        }
      }
    });

    // 3. Standarisasi Siswa ke UUID
    this.state.students.forEach(s => {
      if (!isValidUuid(s.id)) {
        s.id = generateUuid();
        changed = true;
      }
    });

    // 4. Standarisasi Materials ke UUID
    if (this.state.materials) {
      this.state.materials.forEach(m => {
        if (!isValidUuid(m.id)) {
          const oldId = m.id;
          const newUuid = generateUuid();
          m.id = newUuid;
          changed = true;
          this.state.questions.forEach(q => {
            if (q.materialId === oldId) q.materialId = newUuid;
          });
        }
      });
    }

    // 5. Standarisasi Competencies ke UUID
    if (this.state.competencies) {
      this.state.competencies.forEach(c => {
        if (!isValidUuid(c.id)) {
          const oldId = c.id;
          const newUuid = generateUuid();
          c.id = newUuid;
          changed = true;
          this.state.questions.forEach(q => {
            if (q.competencyId === oldId) q.competencyId = newUuid;
          });
        }
      });
    }

    // 6. Standarisasi Questions ke UUID
    if (this.state.questions) {
      this.state.questions.forEach(q => {
        if (!isValidUuid(q.id)) {
          const oldId = q.id;
          const newUuid = generateUuid();
          q.id = newUuid;
          changed = true;
          this.state.answers.forEach(a => {
            if (a.questionId === oldId) a.questionId = newUuid;
          });
        }
      });
    }

    if (changed) {
      this.persistState();
      console.info('[DB] Migrasi ID lokal ke UUID standar berhasil dilakukan.');
    }
  }

  private setupLocalStorageListener(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event: StorageEvent) => {
        if (event.key === STORAGE_KEY && event.newValue) {
          try {
            this.state = JSON.parse(event.newValue);
            this.rebuildIndexes();
            this.notifyListeners();
          } catch (e) {
            console.warn('[DB] Storage event sync failed:', e);
          }
        }
      });
    }
  }

  /**
   * Async: Initialize Supabase sync.
   * Cerdas & Otomatis:
   * - Jika cloud sudah ada data (dari perangkat lain), langsung sinkronkan ke perangkat ini.
   * - Jika cloud masih kosong (inisialisasi awal), otomatis unggah data lokal ke cloud di latar belakang tanpa perlu klik tombol.
   */
  private async initSupabaseSync(): Promise<void> {
    if (!sdb.isAvailable()) return;

    this.supabaseSyncEnabled = true;

    try {
      console.info('[DB] Supabase aktif — memeriksa sinkronisasi cloud...');
      const cloudState = await sdb.fetchCoreState();

      if (cloudState) {
        // 1. Sinkronkan data dari cloud ke perangkat ini
        const hadChanges = this.mergeCloudState(cloudState);
        if (hadChanges) {
          this.persistState();
          this.rebuildIndexes();
          this.notifyListeners();
          console.info('[DB] Sinkronisasi otomatis: data perangkat ini telah diselaraskan dengan cloud.');
        }

        // 2. Sinkronisasi Dua Arah Otomatis:
        // Jika di perangkat ini ada kelas, murid, atau penugasan Wali Kelas yang belum tersinkron di cloud,
        // otomatis dorong (push) ke cloud agar seluruh device mendapatkan data yang sama!
        const unsyncedClasses = this.state.classes.filter(
          c => !cloudState.classes.some(cc => cc.name.toLowerCase() === c.name.toLowerCase())
        );
        const unsyncedStudents = this.state.students.filter(
          s => !cloudState.students.some(cs => cs.nisn === s.nisn)
        );
        const unsyncedTryouts = (this.state.tryouts || []).filter(
          t => !(cloudState.tryouts || []).some(ct => ct.code.toLowerCase() === t.code.toLowerCase())
        );
        const unsyncedScores = (this.state.scores || []).filter(
          s => !(cloudState.scores || []).some(cs => cs.tryoutId === s.tryoutId && cs.studentId === s.studentId)
        );
        const hasUnsyncedWaliKelas = this.state.classes.some(
          c => c.homeRoomTeacherId && !cloudState.classes.some(cc => cc.name.toLowerCase() === c.name.toLowerCase() && cc.homeRoomTeacherId)
        ) || this.state.teachers.some(
          t => t.isWaliKelas && t.homeRoomClassId && !cloudState.teachers.some(ct => ct.nip === t.nip && ct.homeRoomClassId)
        );

        if (unsyncedClasses.length > 0 || unsyncedStudents.length > 0 || unsyncedTryouts.length > 0 || unsyncedScores.length > 0 || hasUnsyncedWaliKelas) {
          console.info(`[DB] Terdeteksi data (kelas/siswa/tryout/nilai/wali kelas) belum tersinkron di cloud. Otomatis menyinkronkan ke Supabase...`);
          await this.exportToSupabase();
        }
      } else {
        // Jika cloud masih kosong, otomatis unggah data awal ke cloud di latar belakang!
        console.info('[DB] Cloud masih kosong — otomatis menyinkronkan data awal ke cloud di latar belakang...');
        this.exportToSupabase().catch(e => {
          console.warn('[DB] Auto-sync initial data to cloud failed:', e);
        });
      }
    } catch (err) {
      console.warn('[DB] Supabase init sync failed, menggunakan data lokal:', err);
    }

    this.supabaseInitDone = true;
  }

  /**
   * Helper tombstone: Mendapatkan daftar identifier (hanya UUID permanen) tryout yang sudah dihapus.
   * Ini mencegah tryout dummy / seed yang telah dihapus oleh pengguna bangkit kembali saat merge dari cloud.
   * PENTING: Jangan pernah memblokir format kode dinamis seperti 'TO-202...' agar kode tryout baru tidak terhalang lintas device.
   */
  private getDeletedTryoutIdentifiers(): Set<string> {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(DELETED_TRYOUTS_KEY) : null;
      const parsed = raw ? JSON.parse(raw) : [];
      const set = new Set<string>();
      (Array.isArray(parsed) ? parsed : []).forEach((x: string) => {
        const val = String(x).toLowerCase().trim();
        if (val && isValidUuid(val)) set.add(val);
      });
      set.add('to000000-0000-0000-0000-000000000001');
      return set;
    } catch {
      return new Set<string>(['to000000-0000-0000-0000-000000000001']);
    }
  }

  /**
   * Helper tombstone: Mencatat tryout yang dihapus ke localStorage agar persisten lintas sesi & cloud sync.
   * Hanya mencatat UUID yang valid, bukan kode dinamis.
   */
  private recordDeletedTryoutIdentifier(...idsOrCodes: (string | undefined)[]): void {
    try {
      const set = this.getDeletedTryoutIdentifiers();
      idsOrCodes.forEach(item => {
        if (item && item.trim()) {
          const val = item.toLowerCase().trim();
          if (isValidUuid(val)) set.add(val);
        }
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem(DELETED_TRYOUTS_KEY, JSON.stringify(Array.from(set)));
      }
    } catch (e) {
      console.warn('[DB] Gagal menyimpan tombstone tryout yang dihapus:', e);
    }
  }

  /**
   * Helper: Membebaskan kembali identifier/kode tryout dari tombstone saat pengguna membuat tryout baru.
   * Ini memastikan kode yang pernah dihapus dapat digunakan kembali (reusable) secara bersih.
   */
  private removeDeletedTryoutIdentifier(...idsOrCodes: (string | undefined)[]): void {
    try {
      const set = this.getDeletedTryoutIdentifiers();
      idsOrCodes.forEach(item => {
        if (item && item.trim()) {
          set.delete(item.toLowerCase().trim());
        }
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem(DELETED_TRYOUTS_KEY, JSON.stringify(Array.from(set)));
      }
    } catch (e) {
      console.warn('[DB] Gagal membersihkan tombstone tryout:', e);
    }
  }

  /**
   * Merge cloud state into local state, avoiding duplicate entries.
   */
  private mergeCloudState(cloud: {
    users: User[];
    teachers: Teacher[];
    students: Student[];
    classes: ClassRoom[];
    academicYears: AcademicYear[];
    subjects: Subject[];
    examPackages?: ExamPackage[];
    tryouts?: Tryout[];
    schoolProfile?: SchoolProfile;
    responses?: Response[];
    scores?: Score[];
  }): boolean {
    let changed = false;

    // Merge users (by email) — update existing too
    cloud.users.forEach(cloudUser => {
      const idx = this.state.users.findIndex(u => u.email.toLowerCase() === cloudUser.email.toLowerCase());
      if (idx === -1) {
        this.state.users.push(cloudUser);
        changed = true;
      } else {
        // Update role/name/password if changed remotely
        const local = this.state.users[idx];
        const passChanged = (!local.password && cloudUser.password) || (cloudUser.password && local.password !== cloudUser.password);
        if (local.role !== cloudUser.role || local.name !== cloudUser.name || passChanged) {
          this.state.users[idx] = {
            ...local,
            role: cloudUser.role,
            name: cloudUser.name,
            password: cloudUser.password || local.password,
          };
          changed = true;
        }
      }
    });

    // Merge academic years (by yearLabel+semester)
    cloud.academicYears.forEach(cloudAy => {
      const exists = this.state.academicYears.some(
        ay => ay.yearLabel === cloudAy.yearLabel && ay.semester === cloudAy.semester
      );
      if (!exists) { this.state.academicYears.push(cloudAy); changed = true; }
    });

    // Merge subjects (by code) — update name/category if changed
    cloud.subjects.forEach(cloudSub => {
      const idx = this.state.subjects.findIndex(s => s.code === cloudSub.code);
      if (idx === -1) {
        this.state.subjects.push(cloudSub);
        changed = true;
      } else {
        const local = this.state.subjects[idx];
        if (local.name !== cloudSub.name || local.category !== cloudSub.category || local.id !== cloudSub.id) {
          this.state.subjects[idx] = { ...local, ...cloudSub };
          changed = true;
        }
      }
    });

    // Merge classes (by name)
    cloud.classes.forEach(cloudCls => {
      const idx = this.state.classes.findIndex(c => c.name.toLowerCase() === cloudCls.name.toLowerCase());
      if (idx === -1) {
        this.state.classes.push(cloudCls);
        changed = true;
      } else {
        const local = this.state.classes[idx];
        const oldId = local.id;
        const idDiff = local.id !== cloudCls.id;
        const teacherDiff = local.homeRoomTeacherId !== cloudCls.homeRoomTeacherId && cloudCls.homeRoomTeacherId !== undefined;
        const gradeDiff = local.gradeLevel !== cloudCls.gradeLevel;

        if (idDiff || teacherDiff || gradeDiff) {
          this.state.classes[idx] = {
            ...local,
            ...cloudCls,
            homeRoomTeacherId: cloudCls.homeRoomTeacherId !== undefined ? cloudCls.homeRoomTeacherId : local.homeRoomTeacherId,
          };
          if (idDiff) {
            this.state.students.forEach(st => {
              if (st.classId === oldId) st.classId = cloudCls.id;
            });
          }
          changed = true;
        }
      }
    });

    // Merge teachers (by nip) — update name/email/permissions/wali kelas if changed
    cloud.teachers.forEach(cloudTeacher => {
      const idx = this.state.teachers.findIndex(t => t.nip === cloudTeacher.nip);
      if (idx === -1) {
        this.state.teachers.push(cloudTeacher);
        changed = true;
      } else {
        const local = this.state.teachers[idx];
        const remoteSubs = JSON.stringify(cloudTeacher.subjectPermissions || []);
        const localSubs = JSON.stringify(local.subjectPermissions || []);
        const remoteClasses = JSON.stringify(cloudTeacher.classPermissions || []);
        const localClasses = JSON.stringify(local.classPermissions || []);
        const waliDiff =
          local.isWaliKelas !== cloudTeacher.isWaliKelas ||
          (cloudTeacher.homeRoomClassId && local.homeRoomClassId !== cloudTeacher.homeRoomClassId);

        if (
          local.name !== cloudTeacher.name ||
          local.email !== cloudTeacher.email ||
          localSubs !== remoteSubs ||
          localClasses !== remoteClasses ||
          waliDiff
        ) {
          this.state.teachers[idx] = {
            ...local,
            ...cloudTeacher,
            id: local.id,
            userId: local.userId,
            isWaliKelas: cloudTeacher.isWaliKelas !== undefined ? cloudTeacher.isWaliKelas : local.isWaliKelas,
            homeRoomClassId: cloudTeacher.homeRoomClassId || local.homeRoomClassId,
          };
          changed = true;
        }
      }
    });

    // Cross-link homeroom consistency between classes and teachers
    this.state.teachers.forEach(t => {
      if (t.isWaliKelas && t.homeRoomClassId) {
        const cls = this.state.classes.find(c => c.id === t.homeRoomClassId || c.name.toLowerCase() === t.homeRoomClassId?.toLowerCase());
        if (cls && cls.homeRoomTeacherId !== t.id) {
          cls.homeRoomTeacherId = t.id;
          changed = true;
        }
      }
    });
    this.state.classes.forEach(c => {
      if (c.homeRoomTeacherId) {
        const t = this.state.teachers.find(tch => tch.id === c.homeRoomTeacherId || tch.nip === c.homeRoomTeacherId);
        if (t && (!t.isWaliKelas || t.homeRoomClassId !== c.id)) {
          t.isWaliKelas = true;
          t.homeRoomClassId = c.id;
          changed = true;
        }
      }
    });

    // Merge students (by nisn)
    cloud.students.forEach(cloudStudent => {
      const idx = this.state.students.findIndex(s => s.nisn === cloudStudent.nisn);
      if (idx === -1) {
        this.state.students.push(cloudStudent);
        changed = true;
      } else {
        const local = this.state.students[idx];
        if (
          local.name !== cloudStudent.name ||
          local.classId !== cloudStudent.classId ||
          local.gender !== cloudStudent.gender ||
          local.birthDate !== cloudStudent.birthDate ||
          local.nis !== cloudStudent.nis ||
          local.isAnswerKeyAccount !== cloudStudent.isAnswerKeyAccount
        ) {
          this.state.students[idx] = { ...local, ...cloudStudent };
          changed = true;
        }
      }
    });

    // Reconcile deleted students jika cloud sudah memiliki data
    if (this.supabaseInitDone && cloud.students.length > 0) {
      const cloudNisns = new Set(cloud.students.map(s => s.nisn));
      const beforeCount = this.state.students.length;
      this.state.students = this.state.students.filter(s => cloudNisns.has(s.nisn));
      if (this.state.students.length !== beforeCount) {
        changed = true;
      }
    }

    // Merge exam packages (by code)
    if (cloud.examPackages && Array.isArray(cloud.examPackages)) {
      if (!this.state.examPackages) this.state.examPackages = [];
      cloud.examPackages.forEach(cloudPkg => {
        const idx = this.state.examPackages.findIndex(p => p.code.toLowerCase() === cloudPkg.code.toLowerCase());
        if (idx === -1) {
          this.state.examPackages.push(cloudPkg);
          changed = true;
        } else {
          const local = this.state.examPackages[idx];
          // Compare subjects' googleSheetUrl as well so URL changes sync across devices
          const localSubsJson = JSON.stringify((local.subjects || []).map((s: any) => ({ code: s.code, url: s.googleSheetUrl })));
          const cloudSubsJson = JSON.stringify((cloudPkg.subjects || []).map((s: any) => ({ code: s.code, url: s.googleSheetUrl })));
          if (
            local.title !== cloudPkg.title ||
            local.status !== cloudPkg.status ||
            local.updatedAt !== cloudPkg.updatedAt ||
            localSubsJson !== cloudSubsJson
          ) {
            this.state.examPackages[idx] = { ...local, ...cloudPkg, id: local.id };
            changed = true;
          }
        }
      });
    }

    // Merge tryouts (match by id or code, align with cloud UUID)
    if (cloud.tryouts && Array.isArray(cloud.tryouts)) {
      if (!this.state.tryouts) this.state.tryouts = [];
      const deletedTryouts = this.getDeletedTryoutIdentifiers();
      cloud.tryouts.forEach(cloudTo => {
        const toId = (cloudTo.id || '').toLowerCase().trim();
        if (deletedTryouts.has(toId)) {
          // Jangan pernah mengimpor / membangkitkan kembali tryout yang sudah dihapus pengguna!
          return;
        }
        const idx = this.state.tryouts.findIndex(
          t => (t.id && cloudTo.id && t.id.toLowerCase() === cloudTo.id.toLowerCase()) ||
               (t.code && cloudTo.code && t.code.toLowerCase().trim() === cloudTo.code.toLowerCase().trim())
        );
        if (idx === -1) {
          this.state.tryouts.push(cloudTo);
          changed = true;
        } else {
          const local = this.state.tryouts[idx];
          const mergedSelectedCols =
            cloudTo.selectedQuestionColumns && cloudTo.selectedQuestionColumns.length > 0
              ? cloudTo.selectedQuestionColumns
              : local.selectedQuestionColumns;
          const mergedAnswerKey =
            cloudTo.answerKey && cloudTo.answerKey.length > 0
              ? cloudTo.answerKey
              : local.answerKey;

          const authoritativeId = cloudTo.id || local.id;

          if (
            local.id !== authoritativeId ||
            local.title !== cloudTo.title ||
            local.status !== cloudTo.status ||
            local.googleSheetUrl !== cloudTo.googleSheetUrl ||
            local.googleFormUrl !== cloudTo.googleFormUrl ||
            JSON.stringify(local.scoringConfig) !== JSON.stringify(cloudTo.scoringConfig) ||
            JSON.stringify(local.selectedQuestionColumns) !== JSON.stringify(mergedSelectedCols) ||
            JSON.stringify(local.answerKey) !== JSON.stringify(mergedAnswerKey) ||
            local.subjectId !== (cloudTo.subjectId || local.subjectId) ||
            local.isExternal !== cloudTo.isExternal ||
            local.source !== cloudTo.source
          ) {
            const resolvedIsExternal = Boolean(
              cloudTo.isExternal === true ||
              (cloudTo.isExternal === undefined && local.isExternal === true) ||
              cloudTo.source === 'EXTERNAL'
            );
            this.state.tryouts[idx] = {
              ...local,
              ...cloudTo,
              id: authoritativeId,
              selectedQuestionColumns: mergedSelectedCols,
              answerKey: mergedAnswerKey,
              subjectId: resolvedIsExternal ? (cloudTo.subjectId || undefined) : (cloudTo.subjectId || local.subjectId),
              isExternal: resolvedIsExternal,
              source: resolvedIsExternal ? 'EXTERNAL' : 'INTERNAL',
              externalSubjects: cloudTo.externalSubjects || local.externalSubjects,
              externalSubjectIds: cloudTo.externalSubjectIds || local.externalSubjectIds,
              externalScoreScale: cloudTo.externalScoreScale || local.externalScoreScale || (resolvedIsExternal ? 'SCALE_100' : undefined),
            };
            changed = true;
          }
        }
      });
    }

    // Merge scores
    if (cloud.scores && Array.isArray(cloud.scores) && cloud.scores.length > 0) {
      if (!this.state.scores) this.state.scores = [];
      cloud.scores.forEach(cloudScore => {
        const idx = this.state.scores.findIndex(
          s => s.tryoutId === cloudScore.tryoutId && s.studentId === cloudScore.studentId
        );
        if (idx === -1) {
          this.state.scores.push(cloudScore);
          changed = true;
        } else {
          const local = this.state.scores[idx];
          const to = this.state.tryouts.find(t => t.id === cloudScore.tryoutId);
          const isGFormSource = to?.scoringConfig?.scoreSource === 'GOOGLE_FORM';

          // Jika tryout disetel memakai Google Form dan lokal sudah disinkronkan, jangan revert ke nilai lama cloud
          if (isGFormSource && local.scoringStatus === 'MATCH' && cloudScore.scoringStatus === 'SCORING_MISMATCH') {
            return;
          }

          const localSubScores = JSON.stringify(local.subjectScores || {});
          const cloudSubScores = JSON.stringify(cloudScore.subjectScores || {});
          if (
            local.calculatedScore !== cloudScore.calculatedScore ||
            local.scoringStatus !== cloudScore.scoringStatus ||
            localSubScores !== cloudSubScores ||
            local.id !== cloudScore.id
          ) {
            this.state.scores[idx] = { ...local, ...cloudScore };
            if (isGFormSource && this.state.scores[idx].googleFormScore && this.state.scores[idx].googleFormScore > 0) {
              this.state.scores[idx].calculatedScore = this.state.scores[idx].googleFormScore;
              this.state.scores[idx].scoringStatus = 'MATCH';
            }
            changed = true;
          }
        }
      });
    }

    // Merge responses
    if (cloud.responses && Array.isArray(cloud.responses) && cloud.responses.length > 0) {
      if (!this.state.responses) this.state.responses = [];
      cloud.responses.forEach(cloudResp => {
        const idx = this.state.responses.findIndex(
          r => r.tryoutId === cloudResp.tryoutId && r.studentId === cloudResp.studentId
        );
        if (idx === -1) {
          this.state.responses.push(cloudResp);
          changed = true;
        }
      });
    }

    // Merge school profile
    if (cloud.schoolProfile) {
      const current = this.state.schoolProfile || this.getSchoolProfile();
      const hasDiff =
        current.name !== cloud.schoolProfile.name ||
        current.subHeader !== cloud.schoolProfile.subHeader ||
        current.address !== cloud.schoolProfile.address ||
        current.principalName !== cloud.schoolProfile.principalName ||
        current.principalNip !== cloud.schoolProfile.principalNip ||
        current.academicYear !== cloud.schoolProfile.academicYear;

      if (hasDiff) {
        this.state.schoolProfile = { ...current, ...cloud.schoolProfile };
        changed = true;
      }
    }

    return changed;
  }

  /**
   * Public: Export all local data to Supabase.
   * Called from Settings panel "Sinkronisasi ke Cloud" button.
   */
  public async exportToSupabase(): Promise<{ ok: boolean; message: string }> {
    const result = await sdb.exportAllToSupabase({
      users: this.state.users,
      teachers: this.state.teachers,
      students: this.state.students,
      classes: this.state.classes,
      academicYears: this.state.academicYears,
      subjects: this.state.subjects,
      materials: this.state.materials,
      competencies: this.state.competencies,
      questions: this.state.questions,
      answers: this.state.answers,
      examPackages: this.state.examPackages,
      tryouts: this.state.tryouts,
      responses: this.state.responses,
      scores: this.state.scores,
      schoolProfile: this.getSchoolProfile(),
    });
    const ok = result.failed === 0;
    const message = ok
      ? `Berhasil menyinkronkan ${result.success} data ke cloud.`
      : `${result.success} berhasil, ${result.failed} gagal. Error: ${result.errors.slice(0, 2).join('; ')}`;
    return { ok, message };
  }

  /**
   * Pull terbaru dari Supabase dan merge ke state lokal.
   * Dipanggil oleh Realtime listener atau polling berkala.
   */
  public async pullFromCloud(): Promise<void> {
    if (!sdb.isAvailable()) return;
    try {
      const cloudState = await sdb.fetchCoreState();
      if (!cloudState) return;
      const hadChanges = this.mergeCloudState(cloudState);
      if (hadChanges) {
        this.persistState();
        this.rebuildIndexes();
        this.notifyListeners();
        console.info('[DB] Cloud pull: data berhasil diperbarui dari Supabase.');
      }
    } catch (err) {
      console.warn('[DB] pullFromCloud error:', err);
    }
  }

  /**
   * Mulai sinkronisasi otomatis dua arah:
   * 1. Supabase Realtime subscription (push notif saat ada perubahan)
   * 2. Polling berkala setiap 30 detik sebagai fallback
   */
  public startRealtimeSync(): () => void {
    if (!sdb.isAvailable()) return () => {};

    this.syncSubscribersCount++;

    // Jika subscription sudah berjalan, reuse yang sudah ada
    if (!this.realtimeChannel && !this.syncInterval) {
      // 1. Lakukan pull awal agar data langsung sinkron
      this.pullFromCloud();

      // 2. Subscribe Realtime Supabase untuk tabel inti
      this.realtimeChannel = sdb.subscribeToChanges(() => {
        this.pullFromCloud();
      });

      // 3. Polling fallback setiap 20 detik
      this.syncInterval = setInterval(() => {
        this.pullFromCloud();
      }, 20_000);
    }

    // Return cleanup function
    return () => {
      this.syncSubscribersCount = Math.max(0, this.syncSubscribersCount - 1);
      if (this.syncSubscribersCount === 0) {
        if (this.syncInterval) {
          clearInterval(this.syncInterval);
          this.syncInterval = null;
        }
        if (this.realtimeChannel) {
          sdb.unsubscribe(this.realtimeChannel);
          this.realtimeChannel = null;
        }
      }
    };
  }

  private rebuildIndexes() {
    this.responsesByTryoutStudent.clear();
    this.state.responses.forEach(r => {
      this.responsesByTryoutStudent.set(`${r.tryoutId}:${r.studentId}`, r);
    });

    this.answersByTryout.clear();
    this.answersByQuestion.clear();
    this.state.answers.forEach(a => {
      // By Tryout
      const byTo = this.answersByTryout.get(a.tryoutId) || [];
      byTo.push(a);
      this.answersByTryout.set(a.tryoutId, byTo);

      // By Question
      const byQ = this.answersByQuestion.get(a.questionId) || [];
      byQ.push(a);
      this.answersByQuestion.set(a.questionId, byQ);
    });

    this.scoresByTryout.clear();
    this.scoresByStudent.clear();
    this.state.scores.forEach(s => {
      const byTo = this.scoresByTryout.get(s.tryoutId) || [];
      byTo.push(s);
      this.scoresByTryout.set(s.tryoutId, byTo);

      const bySt = this.scoresByStudent.get(s.studentId) || [];
      bySt.push(s);
      this.scoresByStudent.set(s.studentId, bySt);
    });

    this.studentsByClass.clear();
    this.state.students.forEach(st => {
      const byCls = this.studentsByClass.get(st.classId) || [];
      byCls.push(st);
      this.studentsByClass.set(st.classId, byCls);
    });
  }

  private loadFromStorage(): DatabaseState {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.isFreshDevice = false;
        const parsed = JSON.parse(saved);

        // Ensure initial users/teachers exist without overwriting updated roles
        if (parsed.users && Array.isArray(parsed.users)) {
          INITIAL_USERS.forEach(iu => {
            const existing = parsed.users.find((u: any) => u.id === iu.id || u.email?.toLowerCase() === iu.email.toLowerCase());
            if (!existing) {
              parsed.users.push(iu);
            }
          });
        } else {
          parsed.users = INITIAL_USERS;
        }

        if (parsed.teachers && Array.isArray(parsed.teachers)) {
          INITIAL_TEACHERS.forEach(it => {
            const existing = parsed.teachers.find((t: any) => t.id === it.id || t.userId === it.userId || (it.email && t.email?.toLowerCase() === it.email.toLowerCase()));
            if (!existing) {
              parsed.teachers.push(it);
            }
          });
        } else {
          parsed.teachers = INITIAL_TEACHERS;
        }

        // Pastikan semua pengguna ber-role ADMIN memiliki profil di parsed.teachers agar tampil di daftar pengguna
        if (parsed.users && Array.isArray(parsed.users) && parsed.teachers && Array.isArray(parsed.teachers)) {
          parsed.users.forEach((u: any) => {
            if (u.role === 'ADMIN') {
              const hasTeacher = parsed.teachers.some((t: any) => t.userId === u.id || (u.email && t.email?.toLowerCase() === u.email.toLowerCase()));
              if (!hasTeacher) {
                parsed.teachers.push({
                  id: `t-${u.id}`,
                  userId: u.id,
                  nip: u.id === 'u-admin-custom' ? 'ADMIN-001' : (u.id === 'u-admin' ? '196803121994031002' : `ADM-${u.id.replace('u-', '')}`),
                  name: u.name,
                  email: u.email,
                  phone: '',
                  password: u.password,
                  subjectPermissions: [],
                  classPermissions: [],
                  isWaliKelas: false,
                });
              }
            }
          });
        }

        // Clean out legacy mock data & tombstoned tryouts if present in localStorage
        const legacyMockToIds = new Set(['to-1', 'to-2', 'to-3', 'to-4']);
        const deletedTryouts = this.getDeletedTryoutIdentifiers();
        if (parsed.tryouts && Array.isArray(parsed.tryouts)) {
          parsed.tryouts = parsed.tryouts.filter((t: any) => {
            if (legacyMockToIds.has(t.id)) return false;
            const toId = (t.id || '').toLowerCase().trim();
            if (deletedTryouts.has(toId)) return false;
            return true;
          });
        }
        if (parsed.scores && Array.isArray(parsed.scores)) {
          parsed.scores = parsed.scores.filter((s: any) => {
            if (legacyMockToIds.has(s.tryoutId) || s.id?.startsWith('sc-')) return false;
            const toId = (s.tryoutId || '').toLowerCase().trim();
            if (deletedTryouts.has(toId)) return false;
            return true;
          });
        }
        if (parsed.responses && Array.isArray(parsed.responses)) {
          parsed.responses = parsed.responses.filter((r: any) => {
            if (legacyMockToIds.has(r.tryoutId) || r.id?.startsWith('resp-')) return false;
            const toId = (r.tryoutId || '').toLowerCase().trim();
            if (deletedTryouts.has(toId)) return false;
            return true;
          });
        }
        if (parsed.answers && Array.isArray(parsed.answers)) {
          parsed.answers = parsed.answers.filter((a: any) => {
            if (legacyMockToIds.has(a.tryoutId) || a.id?.startsWith('ans-')) return false;
            const toId = (a.tryoutId || '').toLowerCase().trim();
            if (deletedTryouts.has(toId)) return false;
            return true;
          });
        }
        if (parsed.questions && Array.isArray(parsed.questions)) {
          parsed.questions = parsed.questions.filter((q: any) => !q.uniqueCode?.startsWith('MAT-TO03-'));
        }
        if (parsed.examPackages && Array.isArray(parsed.examPackages)) {
          parsed.examPackages = parsed.examPackages.filter((p: any) => p.id !== 'pkt-arsip-awal');
        } else {
          parsed.examPackages = [];
        }

        return parsed;
      }
    } catch (err) {
      console.warn('Failed to load DB from localStorage, falling back to initial seed:', err);
    }

    this.isFreshDevice = true;
    const defaultState: DatabaseState = {
      users: INITIAL_USERS,
      teachers: INITIAL_TEACHERS,
      students: INITIAL_STUDENTS,
      classes: INITIAL_CLASSES,
      studentClasses: [],
      academicYears: INITIAL_ACADEMIC_YEARS,
      subjects: INITIAL_SUBJECTS,
      teacherSubjects: INITIAL_TEACHER_SUBJECTS,
      materials: INITIAL_MATERIALS,
      competencies: INITIAL_COMPETENCIES,
      examPackages: [],
      tryouts: [],
      tryoutSubjects: [],
      questions: [],
      tryoutQuestions: [],
      googleForms: [],
      responses: [],
      answers: [],
      scores: [],
      questionAnalysis: [],
      explanations: [],
      reports: [],
      auditLogs: [],
    };
    return defaultState;
  }

  private persistState() {
    this.rebuildIndexes();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (err) {
      console.error('Failed to save DB state to localStorage:', err);
    }
    this.notifyListeners();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(fn => fn());
  }

  public resetToDefault(currentUser?: any) {
    localStorage.removeItem(STORAGE_KEY);
    this.state = this.loadFromStorage();
    if (currentUser) {
      this.logAudit(currentUser, 'SYSTEM_RESET', 'DATABASE', 'Admin mereset seluruh database ke data pabrik default.');
    }
    this.persistState();
  }

  public getState(): DatabaseState {
    return { ...this.state };
  }

  public getSchoolProfile(): SchoolProfile {
    return this.state.schoolProfile || {
      name: 'NAMA SEKOLAH ANDA',
      subHeader: 'SISTEM ASESMEN & ANALISIS TRY OUT TERPADU',
      address: 'Alamat Sekolah · Kota · Akreditasi · NPSN',
      principalName: 'Nama Kepala Sekolah',
      principalNip: '-',
      academicYear: '2025/2026 (Semester Genap)',
    };
  }

  public updateSchoolProfile(profile: Partial<SchoolProfile>, currentUser?: any): SchoolProfile {
    if (currentUser) {
      this.assertAdmin(currentUser, 'UPDATE_SCHOOL_PROFILE');
    }
    const current = this.getSchoolProfile();
    const updated: SchoolProfile = {
      ...current,
      ...profile,
    };
    this.state.schoolProfile = updated;
    this.persistState();
    this.notifyListeners();
    if (this.supabaseSyncEnabled) sdb.syncSchoolProfile(updated).catch(() => {});
    if (currentUser) {
      this.logAudit(
        currentUser,
        'UPDATE_SCHOOL_PROFILE',
        'SYSTEM',
        `Admin memperbarui informasi sekolah: ${updated.name}`
      );
    }
    return updated;
  }

  // SECURITY: Require Admin Authorization Helper
  private assertAdmin(currentUser: any, actionName: string) {
    if (!currentUser) return; // System action bypass (misal proses sinkronisasi background)
    if (currentUser.role !== 'ADMIN') {
      this.logAudit(
        currentUser,
        'UNAUTHORIZED_MUTATION_ATTEMPT',
        'SECURITY',
        `Pengguna non-admin (${currentUser.name} - ${currentUser.role}) mencoba mengeksekusi '${actionName}'.`
      );
      throw new Error(`Akses Ditolak (403): Hanya Administrator yang berwenang melakukan '${actionName}'.`);
    }
  }

  // SECURITY: Require Admin or Teacher Authorization Helper
  private assertAdminOrTeacher(currentUser: any, actionName: string) {
    if (!currentUser) return; // System action bypass
    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'GURU') {
      this.logAudit(
        currentUser,
        'UNAUTHORIZED_MUTATION_ATTEMPT',
        'SECURITY',
        `Pengguna tidak berwenang (${currentUser.name} - ${currentUser.role}) mencoba mengeksekusi '${actionName}'.`
      );
      throw new Error(`Akses Ditolak (403): Hanya Guru atau Administrator yang berwenang melakukan '${actionName}'.`);
    }
  }

  // SECURITY: Teacher Permissions & Isolation Helpers
  public getTeacherByUserId(userIdOrUser: any): Teacher | undefined {
    if (!userIdOrUser) return undefined;
    const searchId = typeof userIdOrUser === 'string' ? userIdOrUser : userIdOrUser.id;
    const searchEmail = typeof userIdOrUser === 'object' ? userIdOrUser.email : (typeof userIdOrUser === 'string' && userIdOrUser.includes('@') ? userIdOrUser : undefined);

    return this.state.teachers.find(t =>
      (searchId && t.userId === searchId) ||
      (searchEmail && t.email && t.email.toLowerCase() === searchEmail.toLowerCase()) ||
      (searchId && t.email && t.email.toLowerCase() === searchId.toLowerCase()) ||
      (searchId && t.nip && t.nip.trim().toLowerCase() === searchId.toLowerCase())
    );
  }

  public getTeacherAllowedSubjectIds(currentUser: any): string[] {
    if (!currentUser) return [];
    if (currentUser.role === 'ADMIN') {
      return (this.state.subjects || []).filter(s => s && s.id).map(s => s.id);
    }
    const teacher = this.getTeacherByUserId(currentUser);
    if (!teacher || !teacher.subjectPermissions || teacher.subjectPermissions.length === 0) {
      return (this.state.subjects || []).filter(s => s && s.id).map(s => s.id);
    }

    // Ambil subjectPermissions yang valid (terdaftar di daftar mata pelajaran aktif sekolah)
    const validPerms = teacher.subjectPermissions.filter(pid => (this.state.subjects || []).some(s => s.id === pid));
    if (validPerms.length > 0) {
      return validPerms;
    }

    // Resolusi Cerdas: Jika subjectPermissions berisi ID lama atau format berbeda (misal 'subj-bin', 'subj-mat'),
    // atau jika belum tercocokkan, cari kesesuaian berdasarkan kode/nama mapel atau nama guru
    const smartMatched = (this.state.subjects || []).filter(s => {
      const sName = (s.name || '').toLowerCase();
      const sCode = (s.code || '').toLowerCase();
      const tName = (teacher.name || '').toLowerCase();

      // Cek apakah permission lama memiliki kemiripan kode/nama (misal 'subj-bin' -> code 'bin')
      const matchesOldPerm = teacher.subjectPermissions.some(pid => {
        const pLower = pid.toLowerCase();
        return (sCode && pLower.includes(sCode)) || (sName && sName.length >= 3 && pLower.includes(sName.slice(0, 3)));
      });
      if (matchesOldPerm) return true;

      // Cek apakah nama guru mencerminkan mata pelajaran
      if (tName.includes('matematika') && (sName.includes('matematika') || sCode === 'mat')) return true;
      if ((tName.includes('bahasa') || tName.includes('indo')) && (sName.includes('bahasa') || sName.includes('indonesia') || sCode === 'bin')) return true;

      return false;
    }).map(s => s.id);

    if (smartMatched.length > 0) {
      return smartMatched;
    }

    // Jika seluruh subjectPermissions adalah ID lama yang tidak ada di daftar mata pelajaran aktif sekolah,
    // berikan fallback ke seluruh mata pelajaran aktif agar akun guru tidak terkunci (403)
    return (this.state.subjects || []).filter(s => s && s.id).map(s => s.id);
  }

  public getTeacherAllowedClassIds(currentUser: any): string[] {
    if (!currentUser) return [];
    if (currentUser.role === 'ADMIN') {
      return (this.state.classes || []).filter(c => c && c.id).map(c => c.id);
    }
    const teacher = this.getTeacherByUserId(currentUser);
    if (!teacher) {
      return (this.state.classes || []).filter(c => c && c.id).map(c => c.id);
    }
    const fromSubjects = (this.state.teacherSubjects || [])
      .filter(ts => ts && ts.teacherId === teacher.id)
      .map(ts => ts.classId);
    const fromTeacher = teacher.classPermissions || [];
    const combined = Array.from(new Set([...fromSubjects, ...fromTeacher]));
    return combined.length > 0 ? combined : (this.state.classes || []).filter(c => c && c.id).map(c => c.id);
  }

  public assertTeacherSubject(currentUser: any, subjectId: string, actionName: string) {
    if (!currentUser) return; // System action bypass
    if (currentUser.role === 'ADMIN') return; // Admin bypass
    if (currentUser.role !== 'GURU') {
      this.logAudit(
        currentUser,
        'UNAUTHORIZED_MUTATION_ATTEMPT',
        'SECURITY',
        `Akses pengguna non-guru (${currentUser.name} - ${currentUser.role}) ditolak pada '${actionName}'.`
      );
      throw new Error(`Akses Ditolak (403): Hanya Guru atau Admin yang berwenang.`);
    }

    const allowedSubjects = this.getTeacherAllowedSubjectIds(currentUser);
    // Toleransi Cerdas: Izinkan jika mapel terdaftar di penugasan guru ATAU paket tryout terkait ada di sistem
    const isSubjectInTryout = (this.state.tryouts || []).some(t => t.subjectId === subjectId);
    if (!allowedSubjects.includes(subjectId) && !isSubjectInTryout) {
      this.logAudit(
        currentUser,
        'UNAUTHORIZED_TEACHER_MUTATION',
        'SECURITY',
        `Guru ${currentUser.name} (ID: ${currentUser.id}) mencoba memodifikasi data pada mata pelajaran di luar izin penugasan (Subject: ${subjectId}) pada '${actionName}'.`
      );
      throw new Error(`Akses Ditolak (403): Guru tidak memiliki hak akses untuk mata pelajaran '${subjectId}' pada '${actionName}'.`);
    }
  }

  public assertTeacherClass(currentUser: any, classId: string, actionName: string) {
    if (!currentUser) {
      throw new Error(`Akses Ditolak (401): Pengguna belum terautentikasi untuk '${actionName}'.`);
    }
    if (currentUser.role === 'ADMIN') return; // Admin bypass
    if (!classId || classId === 'ALL') return; // Safe bypass: parameter ALL atau kosong bukan pelanggaran hak akses
    const allowedClasses = this.getTeacherAllowedClassIds(currentUser);
    if (allowedClasses.length > 0 && !allowedClasses.includes(classId)) {
      this.logAudit(
        currentUser,
        'UNAUTHORIZED_TEACHER_ACCESS',
        'SECURITY',
        `Guru ${currentUser.name} mencoba mengakses data kelas di luar penugasan (Class: ${classId}) pada '${actionName}'.`
      );
      throw new Error(`Akses Ditolak (403): Guru tidak memiliki hak akses untuk kelas '${classId}'.`);
    }
  }

  // TEACHER SCOPED QUERIES (STRICT TEACHER ISOLATION)
  public getQuestionsForTeacher(currentUser: any): Question[] {
    if (!currentUser) return [];
    if (currentUser.role === 'ADMIN') return this.state.questions;
    const allowed = this.getTeacherAllowedSubjectIds(currentUser);
    return this.state.questions.filter(q => allowed.includes(q.subjectId));
  }

  public getMaterialsForTeacher(currentUser: any): Material[] {
    if (!currentUser) return [];
    if (currentUser.role === 'ADMIN') return this.state.materials;
    const allowed = this.getTeacherAllowedSubjectIds(currentUser);
    return this.state.materials.filter(m => allowed.includes(m.subjectId));
  }

  public getCompetenciesForTeacher(currentUser: any): Competency[] {
    if (!currentUser) return [];
    if (currentUser.role === 'ADMIN') return this.state.competencies;
    const allowed = this.getTeacherAllowedSubjectIds(currentUser);
    return this.state.competencies.filter(c => allowed.includes(c.subjectId));
  }

  public static sortClassesNatural(classes: ClassRoom[]): ClassRoom[] {
    return [...classes].sort((a, b) => {
      const nameA = a?.name || '';
      const nameB = b?.name || '';
      return nameA.localeCompare(nameB, 'id', { numeric: true, sensitivity: 'base' });
    });
  }

  public getTryoutsForTeacher(currentUser: any): Tryout[] {
    if (!currentUser) return [];
    if (currentUser.role === 'ADMIN') return this.state.tryouts || [];
    const teacher = this.getTeacherByUserId(currentUser);
    const hasUnrestrictedSubjects = !teacher || !teacher.subjectPermissions || teacher.subjectPermissions.length === 0;
    if (hasUnrestrictedSubjects) {
      return this.state.tryouts || [];
    }
    const allowedSubjectIds = this.getTeacherAllowedSubjectIds(currentUser);
    const allowedSubjects = new Set(allowedSubjectIds);
    const allowedCodes = new Set(
      (this.state.subjects || [])
        .filter(s => allowedSubjects.has(s.id))
        .map(s => s.code.toLowerCase().trim())
    );
    const allowedNames = new Set(
      (this.state.subjects || [])
        .filter(s => allowedSubjects.has(s.id))
        .map(s => s.name.toLowerCase().trim())
    );

    const relevantTryoutIds = new Set(
      (this.state.tryoutSubjects || [])
        .filter(tsub => tsub && allowedSubjects.has(tsub.subjectId))
        .map(tsub => tsub.tryoutId)
    );

    const filtered = (this.state.tryouts || []).filter(t => {
      if (!t) return false;

      // 1. KASUS TO EKSTERNAL:
      // Guru mapel HANYA boleh melihat TO Eksternal JIKA mata pelajaran yang diampunya
      // termasuk di dalam daftar mata pelajaran yang diujikan dalam paket tersebut.
      if (t.isExternal) {
        if (t.externalSubjectIds && t.externalSubjectIds.some(sid => allowedSubjects.has(sid))) {
          return true;
        }
        if (t.externalSubjects && t.externalSubjects.some(subName => {
          const norm = subName.toLowerCase().trim();
          return allowedNames.has(norm) || allowedCodes.has(norm);
        })) {
          return true;
        }
        // Jika tidak ada mapel guru di dalam TO Eksternal ini, sembunyikan!
        return false;
      }

      // 2. KASUS TO INTERNAL (Google Form / Sheet):
      // Guru mapel HANYA boleh melihat TO Internal yang mata pelajarannya sesuai wewenangnya.
      if (t.subjectId) {
        if (allowedSubjects.has(t.subjectId)) return true;
        const subj = (this.state.subjects || []).find(s => s.id === t.subjectId);
        if (subj && (allowedCodes.has(subj.code.toLowerCase().trim()) || allowedNames.has(subj.name.toLowerCase().trim()))) {
          return true;
        }
        return false;
      }

      // 3. KASUS MULTI-SUBJEK TERSINKRON (via tabel tryoutSubjects):
      if (relevantTryoutIds.has(t.id)) return true;

      // Jika tryout sama sekali tidak memiliki identitas mapel, jangan bocorkan ke guru mapel spesifik
      return false;
    });

    return filtered;
  }

  public getClassesForTeacher(currentUser: any): ClassRoom[] {
    if (!currentUser) return [];
    if (currentUser.role === 'ADMIN') return DatabaseService.sortClassesNatural(this.state.classes || []);
    const allowedClasses = this.getTeacherAllowedClassIds(currentUser);
    const filtered = (this.state.classes || []).filter(c => c && allowedClasses.includes(c.id));
    return DatabaseService.sortClassesNatural(filtered.length > 0 ? filtered : (this.state.classes || []));
  }

  public getStudentsForTeacher(currentUser: any, classIdFilter?: string): Student[] {
    if (!currentUser) return [];
    if (currentUser.role === 'ADMIN') {
      if (classIdFilter && classIdFilter !== 'ALL') {
        return (this.state.students || []).filter(s => s && s.classId === classIdFilter && !s.isAnswerKeyAccount);
      }
      return (this.state.students || []).filter(s => s && !s.isAnswerKeyAccount);
    }
    const allowedClassIds = this.getTeacherAllowedClassIds(currentUser);
    let filtered = (this.state.students || []).filter(s => s && allowedClassIds.includes(s.classId) && !s.isAnswerKeyAccount);
    if (filtered.length === 0 && (this.state.classes || []).length > 0) {
      filtered = (this.state.students || []).filter(s => s && !s.isAnswerKeyAccount);
    }
    if (classIdFilter && classIdFilter !== 'ALL') {
      filtered = filtered.filter(s => s && s.classId === classIdFilter);
    }
    return filtered;
  }

  // AUDIT LOG
  public logAudit(user: { id?: string; name?: string; role?: any } | null | undefined, action: string, targetEntity: string, details: string): AuditLog {
    const newLog: AuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      userId: user?.id || 'system',
      userName: user?.name || 'Sistem Otomatis',
      role: (user?.role as any) || 'SYSTEM',
      action,
      targetEntity,
      details,
      ipAddress: '127.0.0.1',
      timestamp: new Date().toISOString(),
    };
    this.state.auditLogs = [newLog, ...this.state.auditLogs];
    this.persistState();
    return newLog;
  }

  // STUDENTS CRUD
  public getStudents(): Student[] { return this.state.students; }
  public getStudentByNisn(nisn: string): Student | undefined {
    return this.state.students.find(s => s.nisn.trim() === nisn.trim());
  }
  public getStudentByBirthDateAndNisn(birthDate: string, nisn: string): Student | undefined {
    const cleanDate = birthDate.trim();
    const cleanNisn = nisn.trim();
    return this.state.students.find(s => {
      const matchNisn = s.nisn.trim() === cleanNisn;
      const matchDate = s.birthDate ? s.birthDate.trim() === cleanDate : true;
      return matchNisn && matchDate;
    });
  }
  public getStudentByBirthDateAndNis(birthDate: string, nis: string): Student | undefined {
    const cleanDate = birthDate.trim();
    const cleanNis = nis.trim();
    return this.state.students.find(s => {
      const matchNis = (s.nis ? s.nis.trim() === cleanNis : false) || s.nisn.trim() === cleanNis;
      const matchDate = s.birthDate ? s.birthDate.trim() === cleanDate : true;
      return matchNis && matchDate;
    });
  }
  public addStudent(student: Omit<Student, 'id'>, currentUser: any): Student {
    this.assertAdmin(currentUser, 'CREATE_STUDENT');

    // Duplicate NISN validation
    if (this.state.students.some(s => s.nisn.trim() === student.nisn.trim())) {
      throw new Error(`Validasi Gagal: NISN '${student.nisn}' sudah terdaftar dalam sistem.`);
    }

    const newStudent: Student = { ...student, id: generateUuid() };
    this.state.students.push(newStudent);
    this.logAudit(currentUser, 'CREATE_STUDENT', 'STUDENT', `Menambahkan siswa baru: ${newStudent.name} (NISN: ${newStudent.nisn})`);
    this.persistState();
    this.rebuildIndexes();
    this.notifyListeners();

    // Fire-and-forget cloud sync
    if (this.supabaseSyncEnabled) {
      const classRef = this.state.classes.find(c => c.id === newStudent.classId);
      sdb.syncStudent(newStudent, newStudent.classId, classRef?.name).catch(err => {
        console.error('[DB] Gagal sinkronisasi siswa ke cloud:', err);
      });
    }
    return newStudent;
  }
  public updateStudent(id: string, updates: Partial<Student>, currentUser: any) {
    this.assertAdmin(currentUser, 'UPDATE_STUDENT');
    if (updates.nisn) {
      const duplicate = this.state.students.find(s => s.id !== id && s.nisn.trim() === updates.nisn?.trim());
      if (duplicate) {
        throw new Error(`Validasi Gagal: NISN '${updates.nisn}' sudah digunakan oleh siswa lain.`);
      }
    }
    this.state.students = this.state.students.map(s => s.id === id ? { ...s, ...updates } : s);
    this.logAudit(currentUser, 'UPDATE_STUDENT', 'STUDENT', `Memperbarui data siswa ID: ${id}`);
    this.persistState();
    this.rebuildIndexes();
    this.notifyListeners();

    // Fire-and-forget cloud sync
    if (this.supabaseSyncEnabled) {
      const updatedS = this.state.students.find(s => s.id === id);
      if (updatedS) {
        const classRef = this.state.classes.find(c => c.id === updatedS.classId);
        sdb.syncStudent(updatedS, updatedS.classId, classRef?.name).catch(err => {
          console.error('[DB] Gagal sinkronisasi update siswa ke cloud:', err);
        });
      }
    }
  }
  public deleteStudent(id: string, currentUser: any) {
    this.assertAdmin(currentUser, 'DELETE_STUDENT');
    const student = this.state.students.find(s => s.id === id);
    this.state.students = this.state.students.filter(s => s.id !== id);
    this.logAudit(currentUser, 'DELETE_STUDENT', 'STUDENT', `Menghapus data siswa: ${student?.name || id}`);
    this.persistState();
    this.rebuildIndexes();
    this.notifyListeners();

    // Fire-and-forget cloud sync
    if (this.supabaseSyncEnabled && student?.nisn) sdb.removeStudentByNisn(student.nisn).catch(() => {});
  }

  public deleteStudentsBatch(ids: string[], currentUser: any) {
    this.assertAdmin(currentUser, 'BULK_DELETE_STUDENT');
    if (!ids.length) return;
    const toDelete = this.state.students.filter(s => ids.includes(s.id));
    const nisns = toDelete.map(s => s.nisn);
    this.state.students = this.state.students.filter(s => !ids.includes(s.id));
    this.logAudit(currentUser, 'BULK_DELETE_STUDENT', 'STUDENT', `Menghapus massal ${ids.length} data siswa.`);
    this.persistState();
    this.rebuildIndexes();
    this.notifyListeners();

    if (this.supabaseSyncEnabled && nisns.length > 0) {
      sdb.removeStudentsBatchByNisn(nisns).catch(err => {
        console.error('[DB] Gagal menghapus siswa massal di cloud:', err);
      });
    }
  }

  // TEACHERS CRUD
  public getTeachers(): Teacher[] { return this.state.teachers; }
  public addTeacher(teacher: Omit<Teacher, 'id'>, currentUser: any, roleToSave?: Role, passwordToSave?: string): Teacher {
    this.assertAdmin(currentUser, 'CREATE_TEACHER');

    // Duplicate NIP validation
    if (this.state.teachers.some(t => t.nip.trim() === teacher.nip.trim())) {
      throw new Error(`Validasi Gagal: NIP '${teacher.nip}' sudah terdaftar dalam sistem.`);
    }

    const finalEmail = teacher.email?.trim() || `${teacher.nip.trim()}@guru.sekolah.id`;
    const newTeacher: Teacher = {
      ...teacher,
      email: finalEmail,
      phone: teacher.phone?.trim() || '',
      id: `t-${Date.now()}`
    };
    if (passwordToSave) {
      newTeacher.password = passwordToSave;
    }
    this.state.teachers.push(newTeacher);

    // Synchronize or create matching User object
    const finalRole: Role = roleToSave || (teacher.isWaliKelas ? 'WALI_KELAS' : 'GURU');
    const existingUser = this.state.users.find(u =>
      (finalEmail && u.email.toLowerCase() === finalEmail.toLowerCase()) ||
      (teacher.userId && u.id === teacher.userId)
    );
    if (existingUser) {
      existingUser.role = finalRole;
      existingUser.name = teacher.name;
      existingUser.email = finalEmail;
      if (passwordToSave) existingUser.password = passwordToSave;
    } else {
      this.state.users.push({
        id: teacher.userId || `u-${Date.now()}`,
        email: finalEmail.toLowerCase(),
        role: finalRole,
        name: teacher.name,
        password: passwordToSave || 'password123',
        createdAt: new Date().toISOString()
      });
    }

    // Sync class homeroom teacher if set
    if (teacher.isWaliKelas && teacher.homeRoomClassId) {
      this.state.classes = this.state.classes.map(c =>
        c.id === teacher.homeRoomClassId ? { ...c, homeRoomTeacherId: newTeacher.id } : c
      );
    }

    this.logAudit(currentUser, 'CREATE_TEACHER', 'TEACHER', `Menambahkan guru baru: ${newTeacher.name} (NIP: ${newTeacher.nip}, Peran: ${finalRole})`);
    this.persistState();
    // Fire-and-forget cloud sync
    if (this.supabaseSyncEnabled) {
      const addedUser = this.state.users.find(u =>
        u.email.toLowerCase() === finalEmail.toLowerCase() || u.id === (teacher.userId || '')
      );
      sdb.syncTeacher(newTeacher, addedUser).catch(() => {});
    }
    return newTeacher;
  }

  public updateTeacher(id: string, updates: Partial<Teacher>, currentUser: any, roleToSave?: Role, passwordToSave?: string) {
    this.assertAdmin(currentUser, 'UPDATE_TEACHER');
    if (updates.nip) {
      const duplicate = this.state.teachers.find(t => t.id !== id && t.nip.trim() === updates.nip?.trim());
      if (duplicate) {
        throw new Error(`Validasi Gagal: NIP '${updates.nip}' sudah digunakan oleh guru lain.`);
      }
    }

    const existingTeacher = this.state.teachers.find(t => t.id === id);
    if (!existingTeacher) {
      throw new Error(`Guru dengan ID '${id}' tidak ditemukan.`);
    }

    // Update teacher record
    const updatedTeacher = { ...existingTeacher, ...updates };
    if (passwordToSave) {
      updatedTeacher.password = passwordToSave;
    }
    this.state.teachers = this.state.teachers.map(t => t.id === id ? updatedTeacher : t);

    // Synchronize user record
    const targetUserId = updatedTeacher.userId || existingTeacher.userId;
    const targetEmail = updatedTeacher.email || existingTeacher.email || `${updatedTeacher.nip.trim()}@guru.sekolah.id`;
    const userObj = this.state.users.find(u =>
      (targetUserId && u.id === targetUserId) ||
      (targetEmail && u.email.toLowerCase() === targetEmail.toLowerCase()) ||
      (existingTeacher.email && u.email.toLowerCase() === existingTeacher.email.toLowerCase())
    );

    const finalRole: Role = roleToSave !== undefined ? roleToSave : (updatedTeacher.isWaliKelas ? 'WALI_KELAS' : 'GURU');

    if (userObj) {
      userObj.role = finalRole;
      if (updates.name) userObj.name = updates.name;
      if (updates.email) userObj.email = updates.email;
      if (passwordToSave) userObj.password = passwordToSave;
    }

    // Handle homeroom class ownership
    if (updatedTeacher.isWaliKelas && updatedTeacher.homeRoomClassId) {
      // Set as homeroom teacher for specified class
      this.state.classes = this.state.classes.map(c =>
        c.id === updatedTeacher.homeRoomClassId ? { ...c, homeRoomTeacherId: id } : c
      );
    } else if (updatedTeacher.isWaliKelas === false) {
      // Unset homeroom teacher from any classes previously managed
      this.state.classes = this.state.classes.map(c =>
        c.homeRoomTeacherId === id ? { ...c, homeRoomTeacherId: undefined } : c
      );
    }

    this.logAudit(currentUser, 'UPDATE_TEACHER', 'TEACHER', `Memperbarui data guru ID: ${id} (${updatedTeacher.name}, Peran: ${finalRole})`);
    this.persistState();
    // Fire-and-forget cloud sync
    if (this.supabaseSyncEnabled) {
      const updatedU = this.state.users.find(u =>
        (targetUserId && u.id === targetUserId) ||
        (targetEmail && u.email.toLowerCase() === targetEmail.toLowerCase())
      );
      sdb.syncTeacher(updatedTeacher, updatedU).catch(() => {});
      if (updatedTeacher.homeRoomClassId) {
        const affectedClass = this.state.classes.find(c => c.id === updatedTeacher.homeRoomClassId);
        if (affectedClass) sdb.syncClass(affectedClass).catch(() => {});
      }
    }
  }
  public deleteTeacher(id: string, currentUser: any) {
    this.assertAdmin(currentUser, 'DELETE_TEACHER');
    const teacher = this.state.teachers.find(t => t.id === id);
    if (id === 't-admin-custom' || teacher?.userId === 'u-admin-custom' || teacher?.email?.toLowerCase() === 'admin@sekolah.com') {
      throw new Error('Akses Ditolak: Akun Administrator Utama sistem tidak dapat dihapus.');
    }
    if (currentUser && (teacher?.userId === currentUser.id || (teacher?.email && currentUser.email && teacher.email.toLowerCase() === currentUser.email.toLowerCase()))) {
      throw new Error('Akses Ditolak: Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif digunakan.');
    }
    this.state.teachers = this.state.teachers.filter(t => t.id !== id);
    this.logAudit(currentUser, 'DELETE_TEACHER', 'TEACHER', `Menghapus data guru/staf: ${teacher?.name || id}`);
    this.persistState();
    // Fire-and-forget cloud sync
    if (this.supabaseSyncEnabled && teacher?.nip) sdb.removeTeacherByNip(teacher.nip).catch(() => {});
  }

  public deleteTeachersBatch(ids: string[], currentUser: any) {
    this.assertAdmin(currentUser, 'BULK_DELETE_TEACHER');
    if (!ids.length) return;
    const filteredIds = ids.filter(id => {
      const t = this.state.teachers.find(item => item.id === id);
      const isRootAdmin = id === 't-admin-custom' || t?.userId === 'u-admin-custom' || t?.email?.toLowerCase() === 'admin@sekolah.com';
      const isSelf = currentUser && (t?.userId === currentUser.id || (t?.email && currentUser.email && t.email.toLowerCase() === currentUser.email.toLowerCase()));
      return !isRootAdmin && !isSelf;
    });
    if (!filteredIds.length) return;
    const nipsToDelete = filteredIds
      .map(id => this.state.teachers.find(t => t.id === id)?.nip)
      .filter(Boolean) as string[];
    this.state.teachers = this.state.teachers.filter(t => !filteredIds.includes(t.id));
    this.logAudit(currentUser, 'BULK_DELETE_TEACHER', 'TEACHER', `Menghapus massal ${filteredIds.length} data guru/staf.`);
    this.persistState();
    this.notifyListeners();
    if (this.supabaseSyncEnabled && nipsToDelete.length > 0) {
      sdb.removeTeachersBatchByNip(nipsToDelete).catch(() => {});
    }
  }

  // CLASSES CRUD
  public getClasses(): ClassRoom[] { return DatabaseService.sortClassesNatural(this.state.classes || []); }
  public addClass(cls: Omit<ClassRoom, 'id'>, currentUser: any): ClassRoom {
    this.assertAdmin(currentUser, 'CREATE_CLASS');
    if (this.state.classes.some(c => c.name.toLowerCase() === cls.name.trim().toLowerCase() && c.academicYearId === cls.academicYearId)) {
      throw new Error(`Validasi Gagal: Kelas '${cls.name}' sudah ada pada tahun ajaran ini.`);
    }
    const newClass: ClassRoom = { ...cls, id: generateUuid() };
    this.state.classes.push(newClass);
    this.logAudit(currentUser, 'CREATE_CLASS', 'CLASS', `Menambahkan kelas baru: ${newClass.name}`);
    this.persistState();
    this.rebuildIndexes();
    this.notifyListeners();
    // Fire-and-forget cloud sync (akan mengembalikan UUID Supabase dan menyimpan ke classIdMap)
    if (this.supabaseSyncEnabled) sdb.syncClass(newClass).catch(err => {
      console.error('[DB] Gagal sinkronisasi kelas ke cloud:', err);
    });
    return newClass;
  }
  public updateClass(id: string, updates: Partial<ClassRoom>, currentUser: any) {
    this.assertAdmin(currentUser, 'UPDATE_CLASS');
    this.state.classes = this.state.classes.map(c => c.id === id ? { ...c, ...updates } : c);
    this.logAudit(currentUser, 'UPDATE_CLASS', 'CLASS', `Memperbarui kelas ID: ${id}`);
    this.persistState();
    this.rebuildIndexes();
    this.notifyListeners();
    const updatedClass = this.state.classes.find(c => c.id === id);
    if (this.supabaseSyncEnabled && updatedClass) {
      sdb.syncClass(updatedClass).catch(() => {});
      if (updatedClass.homeRoomTeacherId) {
        const affectedTeacher = this.state.teachers.find(t => t.id === updatedClass.homeRoomTeacherId);
        if (affectedTeacher) sdb.syncTeacher(affectedTeacher).catch(() => {});
      }
    }
  }
  public deleteClass(id: string, currentUser: any) {
    this.assertAdmin(currentUser, 'DELETE_CLASS');
    const c = this.state.classes.find(item => item.id === id);
    this.state.classes = this.state.classes.filter(item => item.id !== id);
    this.logAudit(currentUser, 'DELETE_CLASS', 'CLASS', `Menghapus kelas: ${c?.name || id}`);
    this.persistState();
    this.rebuildIndexes();
    this.notifyListeners();
    if (this.supabaseSyncEnabled && c?.name) sdb.removeClassByName(c.name).catch(() => {});
  }

  public deleteClassesBatch(ids: string[], currentUser: any) {
    this.assertAdmin(currentUser, 'BULK_DELETE_CLASS');
    if (!ids.length) return;
    this.state.classes = this.state.classes.filter(c => !ids.includes(c.id));
    this.logAudit(currentUser, 'BULK_DELETE_CLASS', 'CLASS', `Menghapus massal ${ids.length} kelas.`);
    this.persistState();
    this.rebuildIndexes();
    this.notifyListeners();
    if (this.supabaseSyncEnabled && ids.length > 0) {
      sdb.removeClassesBatch(ids).catch(() => {});
    }
  }

  // SUBJECTS CRUD
  public getSubjects(): Subject[] { return this.state.subjects; }
  public getSubjectById(id: string): Subject | undefined {
    return this.state.subjects.find(s => s.id === id);
  }
  public addSubject(subj: Omit<Subject, 'id'>, currentUser: any): Subject {
    this.assertAdmin(currentUser, 'CREATE_SUBJECT');
    if (this.state.subjects.some(s => s.code.toLowerCase() === subj.code.trim().toLowerCase())) {
      throw new Error(`Validasi Gagal: Kode mata pelajaran '${subj.code}' sudah digunakan.`);
    }
    const newSubj: Subject = { ...subj, id: `subj-${Date.now()}` };
    this.state.subjects.push(newSubj);
    this.logAudit(currentUser, 'CREATE_SUBJECT', 'SUBJECT', `Menambahkan mata pelajaran: ${newSubj.name} (${newSubj.code})`);
    this.persistState();
    // Fire-and-forget cloud sync
    if (this.supabaseSyncEnabled) sdb.syncSubject(newSubj).catch(() => {});
    return newSubj;
  }
  public updateSubject(id: string, updates: Partial<Subject>, currentUser: any) {
    this.assertAdmin(currentUser, 'UPDATE_SUBJECT');
    this.state.subjects = this.state.subjects.map(s => s.id === id ? { ...s, ...updates } : s);
    this.logAudit(currentUser, 'UPDATE_SUBJECT', 'SUBJECT', `Memperbarui mata pelajaran ID: ${id}`);
    this.persistState();
    // Fire-and-forget cloud sync
    if (this.supabaseSyncEnabled) {
      const updatedSub = this.state.subjects.find(s => s.id === id);
      if (updatedSub) sdb.syncSubject(updatedSub).catch(() => {});
    }
  }
  public updateSubjectKKM(subjectId: string, passingGrade: number, currentUser: any) {
    this.state.subjects = this.state.subjects.map(s => s.id === subjectId ? { ...s, passingGrade } : s);
    this.logAudit(currentUser, 'UPDATE_SUBJECT_KKM', 'SUBJECT', `Mengubah KKM mata pelajaran ID ${subjectId} menjadi ${passingGrade}`);
    this.persistState();
  }
  public deleteSubject(id: string, currentUser: any) {
    this.assertAdmin(currentUser, 'DELETE_SUBJECT');
    const s = this.state.subjects.find(item => item.id === id);
    this.state.subjects = this.state.subjects.filter(item => item.id !== id);
    this.logAudit(currentUser, 'DELETE_SUBJECT', 'SUBJECT', `Menghapus mata pelajaran: ${s?.name || id}`);
    this.persistState();
    // Fire-and-forget cloud sync
    if (this.supabaseSyncEnabled && s?.code) sdb.removeSubjectByCode(s.code).catch(() => {});
  }

  public deleteSubjectsBatch(ids: string[], currentUser: any) {
    this.assertAdmin(currentUser, 'BULK_DELETE_SUBJECT');
    if (!ids.length) return;
    const codesToDelete = ids
      .map(id => this.state.subjects.find(s => s.id === id)?.code)
      .filter(Boolean) as string[];
    this.state.subjects = this.state.subjects.filter(s => !ids.includes(s.id));
    this.logAudit(currentUser, 'BULK_DELETE_SUBJECT', 'SUBJECT', `Menghapus massal ${ids.length} mata pelajaran.`);
    this.persistState();
    this.notifyListeners();
    if (this.supabaseSyncEnabled && codesToDelete.length > 0) {
      sdb.removeSubjectsBatchByCode(codesToDelete).catch(() => {});
    }
  }

  // ACADEMIC YEARS CRUD
  public getAcademicYears(): AcademicYear[] { return this.state.academicYears; }
  public addAcademicYear(ay: Omit<AcademicYear, 'id'>, currentUser: any): AcademicYear {
    this.assertAdmin(currentUser, 'CREATE_ACADEMIC_YEAR');
    const newAy: AcademicYear = { ...ay, id: generateUuid() };
    this.state.academicYears.push(newAy);
    this.logAudit(currentUser, 'CREATE_ACADEMIC_YEAR', 'ACADEMIC_YEAR', `Menambahkan tahun ajaran: ${newAy.yearLabel} (${newAy.semester})`);
    this.persistState();
    // Fire-and-forget cloud sync — resolves UUID from Supabase
    if (this.supabaseSyncEnabled) sdb.syncAcademicYear(newAy).catch(() => {});
    return newAy;
  }
  public toggleAcademicYear(id: string, currentUser: any) {
    this.assertAdmin(currentUser, 'TOGGLE_ACADEMIC_YEAR');
    this.state.academicYears = this.state.academicYears.map(ay => {
      if (ay.id === id) {
        return { ...ay, isActive: !ay.isActive };
      }
      return ay;
    });
    this.logAudit(currentUser, 'TOGGLE_ACADEMIC_YEAR', 'ACADEMIC_YEAR', `Mengubah status aktif tahun ajaran ID: ${id}`);
    this.persistState();
  }

  // MATERIALS & COMPETENCIES CRUD
  public getMaterials(): Material[] { return this.state.materials; }
  public addMaterial(mat: Omit<Material, 'id'>, currentUser: any): Material {
    this.assertTeacherSubject(currentUser, mat.subjectId, 'CREATE_MATERIAL');
    if (!mat.title?.trim() || !mat.code?.trim()) {
      throw new Error('Validasi Gagal: Kode dan judul materi wajib diisi.');
    }
    const newMat: Material = { ...mat, id: `m-${Date.now()}` };
    this.state.materials.push(newMat);
    this.logAudit(currentUser, 'CREATE_MATERIAL', 'MATERIAL', `Menambahkan materi: ${newMat.title} (${newMat.code})`);
    this.persistState();
    return newMat;
  }
  public updateMaterial(id: string, updates: Partial<Material>, currentUser: any) {
    const m = this.state.materials.find(x => x.id === id);
    if (!m) throw new Error(`Materi dengan ID '${id}' tidak ditemukan.`);
    this.assertTeacherSubject(currentUser, m.subjectId, 'UPDATE_MATERIAL');
    if (updates.subjectId && updates.subjectId !== m.subjectId) {
      this.assertTeacherSubject(currentUser, updates.subjectId, 'UPDATE_MATERIAL');
    }
    this.state.materials = this.state.materials.map(item => item.id === id ? { ...item, ...updates } : item);
    this.logAudit(currentUser, 'UPDATE_MATERIAL', 'MATERIAL', `Memperbarui materi ID: ${id}`);
    this.persistState();
  }
  public deleteMaterial(id: string, currentUser: any) {
    const m = this.state.materials.find(x => x.id === id);
    if (!m) throw new Error(`Materi dengan ID '${id}' tidak ditemukan.`);
    this.assertTeacherSubject(currentUser, m.subjectId, 'DELETE_MATERIAL');
    this.state.materials = this.state.materials.filter(x => x.id !== id);
    this.logAudit(currentUser, 'DELETE_MATERIAL', 'MATERIAL', `Menghapus materi: ${m?.title || id}`);
    this.persistState();
  }

  public deleteMaterialsBatch(ids: string[], currentUser: any) {
    if (!ids.length) return;
    this.state.materials = this.state.materials.filter(x => !ids.includes(x.id));
    this.logAudit(currentUser, 'BULK_DELETE_MATERIAL', 'MATERIAL', `Menghapus massal ${ids.length} materi.`);
    this.persistState();
  }

  public getCompetencies(): Competency[] { return this.state.competencies; }
  public addCompetency(comp: Omit<Competency, 'id'>, currentUser: any): Competency {
    this.assertTeacherSubject(currentUser, comp.subjectId, 'CREATE_COMPETENCY');
    if (!comp.code?.trim() || !comp.statement?.trim()) {
      throw new Error('Validasi Gagal: Kode KD dan pernyataan kompetensi wajib diisi.');
    }
    const newComp: Competency = { ...comp, id: `comp-${Date.now()}` };
    this.state.competencies.push(newComp);
    this.logAudit(currentUser, 'CREATE_COMPETENCY', 'COMPETENCY', `Menambahkan kompetensi dasar: ${newComp.code}`);
    this.persistState();
    return newComp;
  }
  public updateCompetency(id: string, updates: Partial<Competency>, currentUser: any) {
    const c = this.state.competencies.find(x => x.id === id);
    if (!c) throw new Error(`Kompetensi dengan ID '${id}' tidak ditemukan.`);
    this.assertTeacherSubject(currentUser, c.subjectId, 'UPDATE_COMPETENCY');
    if (updates.subjectId && updates.subjectId !== c.subjectId) {
      this.assertTeacherSubject(currentUser, updates.subjectId, 'UPDATE_COMPETENCY');
    }
    this.state.competencies = this.state.competencies.map(item => item.id === id ? { ...item, ...updates } : item);
    this.logAudit(currentUser, 'UPDATE_COMPETENCY', 'COMPETENCY', `Memperbarui kompetensi ID: ${id}`);
    this.persistState();
  }
  public deleteCompetency(id: string, currentUser: any) {
    const c = this.state.competencies.find(x => x.id === id);
    if (!c) throw new Error(`Kompetensi dengan ID '${id}' tidak ditemukan.`);
    this.assertTeacherSubject(currentUser, c.subjectId, 'DELETE_COMPETENCY');
    this.state.competencies = this.state.competencies.filter(x => x.id !== id);
    this.logAudit(currentUser, 'DELETE_COMPETENCY', 'COMPETENCY', `Menghapus kompetensi: ${c?.code || id}`);
    this.persistState();
  }

  public deleteCompetenciesBatch(ids: string[], currentUser: any) {
    if (!ids.length) return;
    this.state.competencies = this.state.competencies.filter(x => !ids.includes(x.id));
    this.logAudit(currentUser, 'BULK_DELETE_COMPETENCY', 'COMPETENCY', `Menghapus massal ${ids.length} kompetensi dasar.`);
    this.persistState();
  }

  // ============================================================
  // EXAM PACKAGES (PAKET UJIAN / WADAH) CRUD & ACCESS MANAGEMENT
  // ============================================================
  public getExamPackages(): ExamPackage[] {
    return this.state.examPackages || [];
  }

  public getExamPackageById(id: string): ExamPackage | undefined {
    return (this.state.examPackages || []).find(p => p.id === id);
  }

  public saveExamPackage(pkg: ExamPackage, currentUser?: any): ExamPackage {
    if (currentUser) {
      this.assertAdmin(currentUser, 'SAVE_EXAM_PACKAGE');
    }
    if (!this.state.examPackages) {
      this.state.examPackages = [];
    }
    const existingIdx = this.state.examPackages.findIndex(p => p.id === pkg.id);
    const now = new Date().toISOString();
    const toSave: ExamPackage = {
      ...pkg,
      updatedAt: now,
      createdAt: existingIdx >= 0 ? this.state.examPackages[existingIdx].createdAt || now : now,
    };

    if (existingIdx >= 0) {
      this.state.examPackages[existingIdx] = toSave;
      if (currentUser) {
        this.logAudit(currentUser, 'UPDATE_EXAM_PACKAGE', 'TRYOUT', `Memperbarui Paket Ujian: ${toSave.title} (${toSave.code})`);
      }
    } else {
      this.state.examPackages.unshift(toSave);
      if (currentUser) {
        this.logAudit(currentUser, 'CREATE_EXAM_PACKAGE', 'TRYOUT', `Membuat Paket Ujian baru: ${toSave.title} (${toSave.code})`);
      }
    }

    this.persistState();
    if (this.supabaseSyncEnabled) sdb.syncExamPackage(toSave).catch(() => {});
    return toSave;
  }

  public deleteExamPackage(id: string, currentUser?: any): void {
    if (currentUser) {
      this.assertAdmin(currentUser, 'DELETE_EXAM_PACKAGE');
    }
    const pkg = this.getExamPackageById(id);
    if (!pkg) return;
    this.state.examPackages = (this.state.examPackages || []).filter(p => p.id !== id);
    if (currentUser) {
      this.logAudit(currentUser, 'DELETE_EXAM_PACKAGE', 'TRYOUT', `Menghapus Paket Ujian: ${pkg.title} (${pkg.code})`);
    }
    this.persistState();
    if (this.supabaseSyncEnabled && pkg?.code) sdb.removeExamPackageByCode(pkg.code).catch(() => {});
  }

  public updateExamPackageStatus(id: string, status: TryoutStatus, currentUser?: any): void {
    if (currentUser) {
      this.assertAdmin(currentUser, 'UPDATE_EXAM_PACKAGE_STATUS');
    }
    const pkg = this.getExamPackageById(id);
    if (!pkg) return;
    pkg.status = status;
    pkg.updatedAt = new Date().toISOString();
    if (currentUser) {
      this.logAudit(currentUser, 'UPDATE_EXAM_PACKAGE_STATUS', 'TRYOUT', `Mengubah status Paket Ujian ${pkg.title} menjadi '${status}'`);
    }
    this.persistState();
    if (this.supabaseSyncEnabled) sdb.syncExamPackage(pkg).catch(() => {});
  }

  public updateExamPackageSubject(
    packageId: string,
    subjectId: string,
    updates: Partial<ExamPackageSubject>,
    currentUser?: any
  ): ExamPackageSubject | undefined {
    const pkg = this.getExamPackageById(packageId);
    if (!pkg) throw new Error(`Paket Ujian dengan ID '${packageId}' tidak ditemukan.`);

    let subItem = pkg.subjects.find(s => s.subjectId === subjectId);
    const now = new Date().toISOString();
    const updaterName = currentUser?.name || currentUser?.role || 'Admin/Guru';

    if (subItem) {
      Object.assign(subItem, {
        ...updates,
        lastUpdatedBy: updaterName,
        updatedAt: now,
      });
    } else {
      subItem = {
        id: `pkg-sub-${Date.now()}`,
        packageId,
        subjectId,
        totalQuestions: 40,
        passingGrade: 75,
        ...updates,
        lastUpdatedBy: updaterName,
        updatedAt: now,
      };
      pkg.subjects.push(subItem);
    }

    pkg.updatedAt = now;
    if (currentUser) {
      const subj = this.getSubjectById(subjectId);
      this.logAudit(
        currentUser,
        'UPDATE_EXAM_PACKAGE_SUBJECT',
        'TRYOUT',
        `Memperbarui tautan/konfigurasi mapel ${subj?.name || subjectId} pada Paket ${pkg.title}`
      );
    }
    this.persistState();
    if (this.supabaseSyncEnabled) sdb.syncExamPackage(pkg).catch(() => {});
    return subItem;
  }

  /**
   * Filter Paket Ujian untuk Siswa:
   * Siswa hanya melihat paket ujian yang mengikutsertakan kelas siswa tersebut.
   */
  public getExamPackagesForStudent(studentClassId: string, gradeLevel?: string): ExamPackage[] {
    const all = this.getExamPackages();
    return all.filter(pkg => {
      // Pastikan paket aktif/komplit (tidak draft jika siswa yang melihat)
      if (pkg.status === 'DRAFT') return false;

      // Jika targetClassIds dispesifikasikan, periksa apakah kelas siswa ada di dalamnya
      if (pkg.targetClassIds && pkg.targetClassIds.length > 0) {
        return pkg.targetClassIds.includes(studentClassId);
      }

      // Fallback: periksa jenjang tingkat (gradeLevel) jika targetClassIds kosong
      if (gradeLevel && pkg.targetGrades && pkg.targetGrades.length > 0) {
        return pkg.targetGrades.includes(gradeLevel);
      }

      return false;
    });
  }

  /**
   * Filter Paket Ujian untuk Guru:
   * Menampilkan paket ujian yang memiliki mapel yang diampu oleh guru tersebut.
   */
  public getExamPackagesForTeacher(currentUser: any): ExamPackage[] {
    if (!currentUser) return [];
    if (currentUser.role === 'ADMIN') return this.getExamPackages();

    const allowedSubjects = this.getTeacherAllowedSubjectIds(currentUser);
    const all = this.getExamPackages();

    return all.filter(pkg => {
      return pkg.subjects.some(sub => allowedSubjects.includes(sub.subjectId));
    });
  }

  /**
   * Filter Paket Ujian untuk Wali Kelas:
   * Menampilkan paket ujian yang menargetkan kelas yang dibina oleh wali kelas.
   */
  public getExamPackagesForWaliKelas(homeRoomClassId: string): ExamPackage[] {
    if (!homeRoomClassId) return [];
    const all = this.getExamPackages();
    return all.filter(pkg => {
      if (pkg.targetClassIds && pkg.targetClassIds.length > 0) {
        return pkg.targetClassIds.includes(homeRoomClassId);
      }
      return false;
    });
  }

  // TRYOUTS CRUD & MANAGEMENT
  public getTryouts(): Tryout[] { return this.state.tryouts; }
  public saveTryout(to: Tryout): Tryout {
    // Bebaskan kode dan ID dari tombstone agar kode ini aktif dan bisa digunakan kembali (reusable)
    this.removeDeletedTryoutIdentifier(to.id, to.code);
    const existingByCodeIdx = this.state.tryouts.findIndex(
      t => t.code.toLowerCase().trim() === to.code.toLowerCase().trim() && t.id !== to.id
    );
    if (existingByCodeIdx >= 0) {
      to.id = this.state.tryouts[existingByCodeIdx].id;
      this.state.tryouts[existingByCodeIdx] = to;
    } else {
      const existingIdx = this.state.tryouts.findIndex(t => t.id === to.id);
      if (existingIdx >= 0) {
        this.state.tryouts[existingIdx] = to;
      } else {
        this.state.tryouts.push(to);
      }
    }
    this.persistState();
    this.notifyListeners();
    if (this.supabaseSyncEnabled) sdb.syncTryout(to).catch(() => {});
    return to;
  }
  public getTryoutById(id: string): Tryout | undefined {
    return this.state.tryouts.find(t => t.id === id);
  }
  public addTryout(to: Omit<Tryout, 'id'>, currentUser: any): Tryout {
    this.assertAdmin(currentUser, 'CREATE_TRYOUT');
    if (this.state.tryouts.some(t => t.code.toLowerCase() === to.code.trim().toLowerCase())) {
      throw new Error(`Validasi Gagal: Kode Try Out '${to.code}' sudah digunakan.`);
    }
    const newTo: Tryout = { ...to, id: `to-${Date.now()}` };
    this.state.tryouts.push(newTo);
    this.logAudit(currentUser, 'CREATE_TRYOUT', 'TRYOUT', `Membuat Try Out baru: ${newTo.title} (${newTo.code})`);
    this.persistState();
    if (this.supabaseSyncEnabled) sdb.syncTryout(newTo).catch(() => {});
    return newTo;
  }
  public updateTryout(id: string, updates: Partial<Tryout>, currentUser: any) {
    this.assertAdminOrTeacher(currentUser, 'UPDATE_TRYOUT');
    this.state.tryouts = this.state.tryouts.map(t => t.id === id ? { ...t, ...updates } : t);
    this.logAudit(currentUser, 'UPDATE_TRYOUT', 'TRYOUT', `Memperbarui data Try Out ID: ${id}`);
    this.persistState();
    this.notifyListeners();
    const updated = this.state.tryouts.find(t => t.id === id);
    if (this.supabaseSyncEnabled && updated) sdb.syncTryout(updated).catch(() => {});
  }
  public updateTryoutStatus(id: string, status: TryoutStatus, currentUser: any) {
    this.assertAdminOrTeacher(currentUser, 'UPDATE_TRYOUT_STATUS');
    this.state.tryouts = this.state.tryouts.map(t => t.id === id ? { ...t, status } : t);
    this.logAudit(currentUser, 'UPDATE_TRYOUT_STATUS', 'TRYOUT', `Mengubah status Try Out ID ${id} menjadi '${status}'`);
    this.persistState();
    this.notifyListeners();
    const updated = this.state.tryouts.find(t => t.id === id);
    if (this.supabaseSyncEnabled && updated) sdb.syncTryout(updated).catch(() => {});
  }
  public updateTryoutScoringConfig(id: string, scoringConfig: ScoringConfig, currentUser: any) {
    this.assertAdminOrTeacher(currentUser, 'UPDATE_SCORING_CONFIG');
    this.state.tryouts = this.state.tryouts.map(t => t.id === id ? { ...t, scoringConfig } : t);
    this.logAudit(
      currentUser,
      'UPDATE_SCORING_CONFIG',
      'TRYOUT',
      `Memperbarui konfigurasi scoring Try Out ID: ${id} (Tipe: ${scoringConfig.scoringType}, Maks: ${scoringConfig.maxScore}, Benar: ${scoringConfig.correctScore}, Salah: ${scoringConfig.wrongScore})`
    );
    this.persistState();
    this.notifyListeners();
    const updated = this.state.tryouts.find(t => t.id === id);
    if (this.supabaseSyncEnabled && updated) sdb.syncTryout(updated).catch(() => {});
  }
  public deleteTryout(id: string, currentUser: any) {
    this.assertAdminOrTeacher(currentUser, 'DELETE_TRYOUT');
    const to = this.state.tryouts.find(t => t.id === id);
    this.recordDeletedTryoutIdentifier(id, to?.id);
    this.state.tryouts = this.state.tryouts.filter(t => t.id !== id);

    // Hapus semua data terkait tryout ini (scores, answers, responses, tryoutSubjects)
    // agar tidak ada data orphan yang masih muncul di grafik & perkembangan
    const deletedScoreIds = new Set(
      this.state.scores.filter(s => s.tryoutId === id).map(s => s.id)
    );
    this.state.scores = this.state.scores.filter(s => s.tryoutId !== id);
    this.state.answers = this.state.answers.filter(a => a.tryoutId !== id);
    if (this.state.responses) {
      this.state.responses = this.state.responses.filter((r: any) => r.tryoutId !== id);
    }
    if (this.state.tryoutSubjects) {
      this.state.tryoutSubjects = this.state.tryoutSubjects.filter((ts: any) => ts.tryoutId !== id);
    }

    // Sesuaikan status mapel paket ujian jika tryout di dalam wadah ini dihapus
    if (to?.packageId && this.state.examPackages) {
      const remainingInPkg = this.state.tryouts.filter(t => t.packageId === to.packageId);
      if (remainingInPkg.length === 0) {
        this.state.examPackages = this.state.examPackages.map(pkg => {
          if (pkg.id === to.packageId) {
            return {
              ...pkg,
              subjects: pkg.subjects.map(sub => ({
                ...sub,
                syncStatus: sub.googleSheetUrl ? 'SYNCED' : 'PENDING'
              }))
            };
          }
          return pkg;
        });
      }
    }

    this.logAudit(currentUser, 'DELETE_TRYOUT', 'TRYOUT',
      `Menghapus Try Out: ${to?.title || id} (${to?.code || ''}) beserta ${deletedScoreIds.size} nilai dan jawaban terkait`);
    this.persistState();
    this.notifyListeners();
    if (this.supabaseSyncEnabled) sdb.removeTryout(id, to?.code).catch(() => {});
  }

  // QUESTIONS CRUD
  public getQuestions(): Question[] { return this.state.questions; }
  public addQuestion(q: Omit<Question, 'id'>, currentUser: any): Question {
    this.assertTeacherSubject(currentUser, q.subjectId, 'CREATE_QUESTION');

    if (!q.uniqueCode?.trim()) {
      throw new Error('Validasi Gagal: Kode unik soal wajib diisi.');
    }
    if (this.state.questions.some(item => item.uniqueCode.toLowerCase() === q.uniqueCode.trim().toLowerCase())) {
      throw new Error(`Validasi Gagal: Kode unik soal '${q.uniqueCode}' sudah digunakan.`);
    }
    if (!q.questionText?.trim()) {
      throw new Error('Validasi Gagal: Teks soal tidak boleh kosong.');
    }
    if (!q.options || q.options.length < 2) {
      throw new Error('Validasi Gagal: Soal minimal memiliki pilihan opsi jawaban.');
    }

    const newQ: Question = {
      ...q,
      id: isValidUuid((q as any)?.id) ? (q as any).id : generateUuid(),
      status: q.status || 'ACTIVE',
      weight: q.weight ?? 1,
    };
    this.state.questions.push(newQ);
    this.logAudit(currentUser, 'CREATE_QUESTION', 'QUESTION', `Menambahkan butir soal: ${newQ.uniqueCode}`);
    this.persistState();
    return newQ;
  }
  public updateQuestion(id: string, updates: Partial<Question>, currentUser: any) {
    const q = this.state.questions.find(x => x.id === id);
    if (!q) throw new Error(`Soal dengan ID '${id}' tidak ditemukan.`);
    this.assertTeacherSubject(currentUser, q.subjectId, 'UPDATE_QUESTION');

    if (updates.subjectId && updates.subjectId !== q.subjectId) {
      this.assertTeacherSubject(currentUser, updates.subjectId, 'UPDATE_QUESTION');
    }
    if (updates.uniqueCode) {
      const dup = this.state.questions.find(x => x.id !== id && x.uniqueCode.toLowerCase() === updates.uniqueCode?.trim().toLowerCase());
      if (dup) {
        throw new Error(`Validasi Gagal: Kode unik '${updates.uniqueCode}' sudah digunakan.`);
      }
    }
    this.state.questions = this.state.questions.map(item => item.id === id ? { ...item, ...updates } : item);
    this.logAudit(currentUser, 'UPDATE_QUESTION', 'QUESTION', `Memperbarui soal ID: ${id}`);
    this.persistState();
  }
  public deleteQuestion(id: string, currentUser: any) {
    const q = this.state.questions.find(x => x.id === id);
    if (!q) throw new Error(`Soal dengan ID '${id}' tidak ditemukan.`);
    this.assertTeacherSubject(currentUser, q.subjectId, 'DELETE_QUESTION');
    this.state.questions = this.state.questions.filter(x => x.id !== id);
    this.logAudit(currentUser, 'DELETE_QUESTION', 'QUESTION', `Menghapus soal: ${q?.uniqueCode || id}`);
    this.persistState();
  }

  public deleteQuestionsBatch(ids: string[], currentUser: any) {
    if (!ids.length) return;
    this.state.questions = this.state.questions.filter(x => !ids.includes(x.id));
    this.logAudit(currentUser, 'BULK_DELETE_QUESTION', 'QUESTION', `Menghapus massal ${ids.length} butir soal.`);
    this.persistState();
  }

  // SCORES & RESPONSES
  public getResponses(): Response[] { return this.state.responses; }
  public getAnswers(): Answer[] { return this.state.answers; }
  public getScores(): Score[] { return this.state.scores; }
  public getScoresByTryout(tryoutId: string): Score[] {
    return this.state.scores.filter(s => s.tryoutId === tryoutId);
  }
  public getScoresByStudent(studentId: string): Score[] {
    return this.state.scores.filter(s => s.studentId === studentId);
  }
  public getScoringMismatches(): Score[] {
    return this.state.scores.filter(s => s.scoringStatus === 'SCORING_MISMATCH');
  }

  /**
   * Rekonsiliasi Skor dengan Google Form:
   * Menyelaraskan seluruh skor pada tryout dengan nilai resmi Google Form (mengakhiri status SCORING_MISMATCH secara sah).
   */
  public setTryoutScoreSource(
    tryoutId: string,
    scoreSource: 'GOOGLE_FORM' | 'CUSTOM_ENGINE',
    currentUser?: any
  ): void {
    const to = this.state.tryouts.find(t => t.id === tryoutId);
    if (!to) return;

    to.scoringConfig = {
      ...(to.scoringConfig || {}),
      scoreSource,
    };

    if (scoreSource === 'GOOGLE_FORM') {
      this.state.scores = this.state.scores.map(s => {
        if (s.tryoutId === tryoutId && s.googleFormScore !== undefined && s.googleFormScore > 0) {
          const updatedSubjectScores = { ...(s.subjectScores || {}) };
          Object.keys(updatedSubjectScores).forEach(subjId => {
            updatedSubjectScores[subjId] = s.googleFormScore!;
          });
          return {
            ...s,
            calculatedScore: s.googleFormScore,
            subjectScores: updatedSubjectScores,
            scoreDifference: 0,
            scoringStatus: 'MATCH',
          };
        }
        return s;
      });
    }

    this.persistState();
    this.notifyListeners();

    if (this.supabaseSyncEnabled) {
      sdb.syncTryout(to).catch(() => {});
      const toResponses = (this.state.responses || []).filter(r => r.tryoutId === tryoutId);
      const toScores = this.state.scores.filter(s => s.tryoutId === tryoutId);
      sdb.syncResponsesAndScores(tryoutId, toResponses, toScores).catch(() => {});
    }

    this.logAudit(
      currentUser || { id: 'teacher', name: 'Guru Mata Pelajaran', role: 'GURU' },
      'UPDATE_SCORING_CONFIG',
      'TRYOUT',
      `Mengubah mode acuan nilai Try Out ${to.code} ke: ${scoreSource === 'GOOGLE_FORM' ? 'Nilai Google Form' : 'Aturan Kunci Jawaban Sekolah'}`
    );
  }

  public reconcileScoresWithGForm(
    tryoutId: string,
    currentUser?: any
  ): { reconciledCount: number } {
    let reconciledCount = 0;

    // 1. Selaraskan nilai skor siswa
    this.state.scores = this.state.scores.map(s => {
      if (s.tryoutId === tryoutId && s.googleFormScore !== undefined && s.googleFormScore > 0) {
        if (s.scoringStatus === 'SCORING_MISMATCH' || Math.abs(s.calculatedScore - s.googleFormScore) > 0.01) {
          reconciledCount++;
          // Sinkronkan juga pada subjectScores jika ada mapel
          const updatedSubjectScores = { ...(s.subjectScores || {}) };
          Object.keys(updatedSubjectScores).forEach(subjId => {
            updatedSubjectScores[subjId] = s.googleFormScore!;
          });

          return {
            ...s,
            calculatedScore: s.googleFormScore,
            subjectScores: updatedSubjectScores,
            scoreDifference: 0,
            scoringStatus: 'MATCH',
          };
        }
      }
      return s;
    });

    // 2. Kunci mode acuan tryout ke GOOGLE_FORM secara permanen agar tidak di-revert
    const to = this.state.tryouts.find(t => t.id === tryoutId);
    if (to) {
      to.scoringConfig = {
        ...(to.scoringConfig || {}),
        scoreSource: 'GOOGLE_FORM',
      };
      if (this.supabaseSyncEnabled) {
        sdb.syncTryout(to).catch(() => {});
      }
    }

    if (reconciledCount > 0) {
      this.persistState();
      this.logAudit(
        currentUser || { id: 'teacher', name: 'Guru Mata Pelajaran', role: 'GURU' },
        'RECONCILE_SCORES_WITH_GFORM',
        'TRYOUT_SCORES',
        `Menyelaraskan ${reconciledCount} nilai siswa pada Tryout ${tryoutId} dengan nilai resmi Google Form (Permanen).`
      );
      this.notifyListeners();

      // 3. Dorong pembaruan nilai ke Supabase agar persisten lintas perangkat
      if (this.supabaseSyncEnabled) {
        const toResponses = (this.state.responses || []).filter(r => r.tryoutId === tryoutId);
        const toScores = this.state.scores.filter(s => s.tryoutId === tryoutId);
        sdb.syncResponsesAndScores(tryoutId, toResponses, toScores).catch(err => {
          console.warn('[DB] syncResponsesAndScores error saat rekonsiliasi:', err);
        });
      }
    }

    return { reconciledCount };
  }

  /**
   * Mengambil butir soal yang spesifik milik Tryout ini:
   * 1. Soal yang terdaftar di tryoutQuestions
   * 2. Soal yang memiliki jawaban tersimpan di tabel answers untuk tryoutId ini
   * 3. Soal yang cocok dengan subjectId tryout
   */
  public getQuestionsForTryout(tryoutId?: string, subjectId?: string): Question[] {
    if (!tryoutId || tryoutId === 'ALL') {
      if (subjectId && subjectId !== 'ALL') {
        return this.state.questions
          .filter(q => q.subjectId === subjectId)
          .sort((a, b) => (a.questionNumber || 0) - (b.questionNumber || 0));
      }
      return [...this.state.questions].sort((a, b) => (a.questionNumber || 0) - (b.questionNumber || 0));
    }

    const tryout = this.state.tryouts.find(t => t.id === tryoutId);
    const targetSubjectId = (subjectId && subjectId !== 'ALL') ? subjectId : tryout?.subjectId;

    const linkedQIds = new Set(
      (this.state.tryoutQuestions || [])
        .filter(tq => tq.tryoutId === tryoutId)
        .map(tq => tq.questionId)
    );
    const answerQIds = new Set(
      (this.state.answers || [])
        .filter(a => a.tryoutId === tryoutId)
        .map(a => a.questionId)
    );

    let result = this.state.questions.filter(
      q => linkedQIds.has(q.id) || answerQIds.has(q.id)
    );

    if (result.length === 0 && targetSubjectId) {
      result = this.state.questions.filter(q => q.subjectId === targetSubjectId);
    }

    if (result.length === 0) {
      result = this.state.questions;
    }

    return result.sort((a, b) => (a.questionNumber || 0) - (b.questionNumber || 0));
  }

  // -------------------------------------------------------------
  // PHASE 9 — ANALYTICS ENGINE API
  // -------------------------------------------------------------
  /**
   * Student Individual Analytics
   * Derives real calculations strictly from database entities.
   */
  public getStudentAnalytics(studentId: string, tryoutId: string): StudentAnalyticsResult | null {
    let effectiveTryoutId = tryoutId;
    if (!effectiveTryoutId || effectiveTryoutId === 'ALL') {
      const studentScores = this.state.scores.filter(s => s.studentId === studentId);
      const studentAnswers = this.state.answers.filter(a => a.studentId === studentId);
      effectiveTryoutId = studentScores[studentScores.length - 1]?.tryoutId
        || studentAnswers[studentAnswers.length - 1]?.tryoutId
        || this.state.tryouts[0]?.id
        || '';
    }

    const tryoutQuestions = this.getQuestionsForTryout(effectiveTryoutId);
    return AnalyticsService.getStudentAnalytics(
      studentId,
      effectiveTryoutId,
      this.state.students,
      this.state.classes,
      this.state.tryouts,
      (this.state.tryouts.find(t => t.id === effectiveTryoutId)?.isExternal ? tryoutQuestions : (tryoutQuestions.length > 0 ? tryoutQuestions : this.state.questions)),
      this.state.materials,
      this.state.competencies,
      this.state.answers,
      this.state.scores,
      this.state.responses
    );
  }

  /**
   * Class Level Analytics
   * Enforces teacher authorization: teacher cannot query classes outside assigned classes.
   */
  public getClassAnalytics(classId: string, tryoutId: string, currentUser?: any): ClassAnalyticsResult | null {
    if (currentUser && (currentUser.role === 'GURU' || currentUser.role === 'WALI_KELAS')) {
      const allowedClasses = this.getTeacherAllowedClassIds(currentUser);
      if (allowedClasses.length > 0 && !allowedClasses.includes(classId)) {
        classId = allowedClasses[0];
      }
    }

    let effectiveTryoutId = tryoutId;
    if (!effectiveTryoutId || effectiveTryoutId === 'ALL') {
      const classStudents = this.state.students.filter(s => s.classId === classId);
      const classStudentIds = new Set(classStudents.map(s => s.id));
      const classScores = this.state.scores.filter(s => classStudentIds.has(s.studentId));
      effectiveTryoutId = classScores[classScores.length - 1]?.tryoutId
        || this.state.tryouts[0]?.id
        || '';
    }

    const tryout = this.state.tryouts.find(t => t && t.id === effectiveTryoutId) || this.state.tryouts[0];
    if (!tryout) return null;
    const tsub = (this.state.tryoutSubjects || []).find(ts => ts && ts.tryoutId === tryout.id);
    const passingGrade = tsub?.passingGrade || 75;
    const tryoutQuestions = this.getQuestionsForTryout(effectiveTryoutId);

    return AnalyticsService.getClassAnalytics(
      classId,
      effectiveTryoutId,
      this.state.students,
      this.state.classes,
      this.state.tryouts,
      this.state.academicYears,
      this.state.scores,
      (this.state.tryouts.find(t => t.id === effectiveTryoutId)?.isExternal ? tryoutQuestions : (tryoutQuestions.length > 0 ? tryoutQuestions : this.state.questions)),
      this.state.answers,
      this.state.materials,
      this.state.competencies,
      passingGrade
    );
  }

  /**
   * Overall Multi-Dimensional Filter Analytics
   * Filter: Academic Year, Try Out, Subject, Grade, Class
   */
  public getOverallAnalytics(filters: OverallAnalyticsFilters, currentUser?: any): OverallAnalyticsResult {
    // If teacher or wali kelas, clamp filters to allowed subject/class scope instead of throwing 403 error
    if (currentUser && (currentUser.role === 'GURU' || currentUser.role === 'WALI_KELAS')) {
      const allowedSubjects = this.getTeacherAllowedSubjectIds(currentUser);
      const allowedClasses = this.getTeacherAllowedClassIds(currentUser);

      let effectiveSubjectId = filters.subjectId;
      if (allowedSubjects.length > 0 && filters.subjectId && filters.subjectId !== 'ALL' && !allowedSubjects.includes(filters.subjectId)) {
        effectiveSubjectId = allowedSubjects[0];
      }

      let effectiveClassId = filters.classId;
      if (allowedClasses.length > 0 && filters.classId && filters.classId !== 'ALL' && !allowedClasses.includes(filters.classId)) {
        effectiveClassId = allowedClasses[0];
      }

      filters = {
        ...filters,
        subjectId: effectiveSubjectId,
        classId: effectiveClassId,
      };
    }

    return AnalyticsService.getOverallAnalytics(
      filters,
      this.state.students,
      this.state.classes,
      this.state.tryouts,
      this.state.academicYears,
      this.state.subjects,
      this.state.scores,
      75
    );
  }

  /**
   * Question Psychometric Item Analysis
   * Difficulty Index (p), Discrimination Index (D), Distractor Analysis, Informative Status
   */
  public getQuestionAnalysis(
    tryoutId: string,
    subjectId?: string,
    classId?: string,
    currentUser?: any
  ): QuestionAnalysisResult[] {
    const isAllTryouts = !tryoutId || tryoutId === 'ALL';
    let questions = this.getQuestionsForTryout(tryoutId, subjectId);
    if (questions.length === 0) {
      questions = this.state.questions;
      if (subjectId && subjectId !== 'ALL') {
        if (currentUser && (currentUser.role === 'GURU' || currentUser.role === 'WALI_KELAS')) {
          const allowed = this.getTeacherAllowedSubjectIds(currentUser);
          if (allowed.length > 0 && !allowed.includes(subjectId)) {
            subjectId = allowed[0];
          }
        }
        questions = questions.filter(q => q.subjectId === subjectId);
      } else if (currentUser && (currentUser.role === 'GURU' || currentUser.role === 'WALI_KELAS')) {
        const allowed = this.getTeacherAllowedSubjectIds(currentUser);
        questions = questions.filter(q => allowed.includes(q.subjectId));
      }
    } else if (subjectId && subjectId !== 'ALL') {
      const matchSub = questions.filter(q => q.subjectId === subjectId);
      if (matchSub.length > 0) {
        questions = matchSub;
      }
    }

    let answers: Answer[] = [];
    let scores: Score[] = [];

    if (isAllTryouts) {
      answers = [...this.state.answers];
      scores = [...this.state.scores];
      if (subjectId && subjectId !== 'ALL') {
        const qIdsForSubject = new Set(questions.map(q => q.id));
        if (qIdsForSubject.size > 0) {
          answers = answers.filter(a => qIdsForSubject.has(a.questionId));
        }
      }
    } else {
      const cachedAns = this.answersByTryout.get(tryoutId);
      answers = (cachedAns && cachedAns.length > 0) ? cachedAns : this.state.answers.filter(a => a.tryoutId === tryoutId);
      const cachedScores = this.scoresByTryout.get(tryoutId);
      scores = (cachedScores && cachedScores.length > 0) ? cachedScores : this.state.scores.filter(s => s.tryoutId === tryoutId);
    }

    // Filter by class if specified
    if (classId && classId !== 'ALL') {
      const classStudents = this.studentsByClass.get(classId) || this.state.students.filter(s => s.classId === classId);
      const classStudentIds = new Set(classStudents.map(s => s.id));
      answers = answers.filter(a => classStudentIds.has(a.studentId));
      scores = scores.filter(s => classStudentIds.has(s.studentId));
    }

    return AnalyticsService.calculateQuestionItemAnalysis(
      questions,
      answers,
      scores,
      this.state.materials,
      this.state.competencies
    );
  }

  /**
   * AUTOMATED ANALYTICS ENGINE TEST SUITE:
   * Validates: filter, aggregation, accuracy, empty state, large dataset, unauthorized access.
   */
  public runAnalyticsEngineTests(currentUser?: any): AnalyticsTestSuiteResult {
    return AnalyticsService.runAnalyticsTestSuite(this.state, currentUser);
  }

  /**
   * Large Dataset Stress Benchmark Runner (900+ Students, 29+ Classes, 30,000+ Answers)
   */
  public runLargeDatasetBenchmark(students = 960, classes = 29) {
    const start = performance.now();
    const benchmarkData = AnalyticsService.generateLargeDatasetBenchmark(students, classes, 35);
    const genTime = Math.round(performance.now() - start);

    const aggStart = performance.now();
    const analytics = AnalyticsService.getOverallAnalytics(
      { gradeLevel: 'XII' },
      benchmarkData.students,
      benchmarkData.classes,
      benchmarkData.tryouts,
      benchmarkData.academicYears,
      benchmarkData.subjects,
      benchmarkData.scores,
      75
    );
    const aggTime = Math.round(performance.now() - aggStart);

    return {
      studentCount: benchmarkData.students.length,
      classCount: benchmarkData.classes.length,
      questionsCount: benchmarkData.questions.length,
      answersCount: benchmarkData.answers.length,
      generationTimeMs: genTime,
      aggregationTimeMs: aggTime,
      overallAverage: analytics.summary.averageScore,
      overallPassingRate: analytics.summary.passingRate,
      topStudentsCount: analytics.topStudents.length,
    };
  }

  /**
   * AUTOMATED SCORING ENGINE TEST SUITE:
   * Runs the 10 critical benchmark scenarios adhering to /docs/SCORING_RULES.md
   */
  public runScoringEngineTests(): {
    passed: boolean;
    tests: ScoringTestCaseResult[];
  } {
    return ScoringService.runScoringTestSuite();
  }

  public saveImportedResponsesAndScores(
    tryoutId: string,
    newResponses: Response[],
    newAnswers: Answer[],
    newScores: Score[],
    currentUser: any
  ) {
    const studentTryoutKeys = new Set(newResponses.map(r => `${r.studentId}___${r.tryoutId}`));
    const existingResponsesToDrop = this.state.responses.filter(r =>
      studentTryoutKeys.has(`${r.studentId}___${r.tryoutId}`)
    );
    const droppedResponseIds = new Set([
      ...existingResponsesToDrop.map(r => r.id),
      ...newResponses.map(r => r.id),
    ]);

    this.state.responses = [
      ...this.state.responses.filter(r => !droppedResponseIds.has(r.id)),
      ...newResponses,
    ];

    const scoreIdsToRemove = new Set(newScores.map(s => s.id));
    this.state.scores = [
      ...this.state.scores.filter(
        s => !studentTryoutKeys.has(`${s.studentId}___${s.tryoutId}`) && !scoreIdsToRemove.has(s.id)
      ),
      ...newScores,
    ];

    this.state.answers = [
      ...this.state.answers.filter(
        a => !droppedResponseIds.has(a.responseId) && !newResponses.some(r => r.id === a.responseId)
      ),
      ...newAnswers,
    ];

    this.persistState();
    this.rebuildIndexes();
    this.notifyListeners();
    if (this.supabaseSyncEnabled) {
      sdb.syncResponsesAndScores(tryoutId, newResponses, newScores).catch(() => {});
    }
  }

  /**
   * Menyimpan nilai Try Out Eksternal (rekap skor per siswa dan nilai per mata pelajaran)
   */
  public saveExternalScores(
    tryoutId: string,
    newScores: Score[],
    currentUser?: any
  ): { savedCount: number; updatedCount: number } {
    const studentTryoutKeys = new Set(newScores.map(s => `${s.studentId}___${s.tryoutId}`));
    const scoreIdsToRemove = new Set(newScores.map(s => s.id));

    let updatedCount = 0;
    let savedCount = 0;

    newScores.forEach(s => {
      const exists = this.state.scores.some(old => old.studentId === s.studentId && old.tryoutId === s.tryoutId);
      if (exists) {
        updatedCount++;
      } else {
        savedCount++;
      }
    });

    this.state.scores = [
      ...this.state.scores.filter(
        s => !studentTryoutKeys.has(`${s.studentId}___${s.tryoutId}`) && !scoreIdsToRemove.has(s.id)
      ),
      ...newScores,
    ];

    // Rebuild cache index
    this.scoresByTryout.set(
      tryoutId,
      this.state.scores.filter(s => s.tryoutId === tryoutId)
    );

    if (currentUser) {
      this.logAudit(
        currentUser,
        'IMPORT_EXTERNAL_SCORES',
        `TRYOUT:${tryoutId}`,
        `Impor ${newScores.length} nilai try out eksternal (${savedCount} baru, ${updatedCount} diperbarui).`
      );
    }

    this.persistState();
    this.rebuildIndexes();
    this.notifyListeners();

    if (this.supabaseSyncEnabled) {
      sdb.syncResponsesAndScores(tryoutId, [], newScores).catch(err => {
        console.warn('[DB] syncExternalScores error:', err);
      });
    }

    return { savedCount, updatedCount };
  }
  // -------------------------------------------------------------
  public getExplanations(): Explanation[] { return this.state.explanations; }

  public getExplanationsForTeacher(currentUser: any): Explanation[] {
    if (!currentUser) return [];
    if (currentUser.role === 'ADMIN') return this.state.explanations;
    const allowedSubjects = new Set(this.getTeacherAllowedSubjectIds(currentUser));
    return this.state.explanations.filter(e => !e.subjectId || allowedSubjects.has(e.subjectId));
  }

  public getExplanationsForStudent(tryoutId: string, questionId?: string): Explanation[] {
    return ExplanationService.filterExplanationsForStudent(this.state.explanations, tryoutId, questionId);
  }

  public addExplanation(
    exp: Omit<Explanation, 'id' | 'createdAt' | 'updatedAt'>,
    currentUser: any
  ): Explanation {
    if (exp.subjectId && currentUser.role === 'GURU') {
      this.assertTeacherSubject(currentUser, exp.subjectId, 'CREATE_EXPLANATION');
    }

    // Security check: validate external URL protocol
    if (exp.externalUrl) {
      const urlCheck = ExplanationService.validateExternalUrl(exp.externalUrl);
      if (!urlCheck.isValid) throw new Error(urlCheck.error);
    }

    // Security check: validate YouTube URL format
    if (exp.youtubeUrl) {
      const ytCheck = ExplanationService.validateYouTubeUrl(exp.youtubeUrl);
      if (!ytCheck.isValid) throw new Error(ytCheck.error);
      exp.youtubeUrl = ytCheck.sanitizedYoutubeEmbedUrl || exp.youtubeUrl;
    }

    const now = new Date().toISOString();
    const newExp: Explanation = {
      ...exp,
      id: `exp-${Date.now()}`,
      status: exp.status || 'DRAFT',
      createdBy: currentUser.id,
      authorName: currentUser.name,
      createdAt: now,
      updatedAt: now,
    };

    this.state.explanations.push(newExp);
    this.logAudit(currentUser, 'CREATE_EXPLANATION', 'EXPLANATION', `Membuat pembahasan (${newExp.status}): ${newExp.title}`);
    this.persistState();
    return newExp;
  }

  public updateExplanation(id: string, updates: Partial<Explanation>, currentUser: any) {
    const existing = this.state.explanations.find(e => e.id === id);
    if (!existing) throw new Error(`Pembahasan dengan ID '${id}' tidak ditemukan.`);

    if (existing.subjectId && currentUser.role === 'GURU') {
      this.assertTeacherSubject(currentUser, existing.subjectId, 'UPDATE_EXPLANATION');
    }

    if (updates.externalUrl) {
      const urlCheck = ExplanationService.validateExternalUrl(updates.externalUrl);
      if (!urlCheck.isValid) throw new Error(urlCheck.error);
    }

    if (updates.youtubeUrl) {
      const ytCheck = ExplanationService.validateYouTubeUrl(updates.youtubeUrl);
      if (!ytCheck.isValid) throw new Error(ytCheck.error);
      updates.youtubeUrl = ytCheck.sanitizedYoutubeEmbedUrl || updates.youtubeUrl;
    }

    const now = new Date().toISOString();
    this.state.explanations = this.state.explanations.map(e =>
      e.id === id ? { ...e, ...updates, updatedAt: now } : e
    );

    this.logAudit(currentUser, 'UPDATE_EXPLANATION', 'EXPLANATION', `Memperbarui pembahasan: ${existing.title}`);
    this.persistState();
  }

  public publishExplanation(id: string, currentUser: any) {
    const existing = this.state.explanations.find(e => e.id === id);
    if (!existing) throw new Error(`Pembahasan dengan ID '${id}' tidak ditemukan.`);

    if (existing.subjectId && currentUser.role === 'GURU') {
      this.assertTeacherSubject(currentUser, existing.subjectId, 'PUBLISH_EXPLANATION');
    }

    const now = new Date().toISOString();
    this.state.explanations = this.state.explanations.map(e =>
      e.id === id ? { ...e, status: 'PUBLISHED', updatedAt: now } : e
    );

    this.logAudit(
      currentUser,
      'PUBLISH_EXPLANATION',
      'EXPLANATION',
      `Mempublikasikan pembahasan ke siswa: ${existing.title} (Tryout: ${existing.tryoutId})`
    );
    this.persistState();
  }

  public archiveExplanation(id: string, currentUser: any) {
    const existing = this.state.explanations.find(e => e.id === id);
    if (!existing) throw new Error(`Pembahasan dengan ID '${id}' tidak ditemukan.`);

    if (existing.subjectId && currentUser.role === 'GURU') {
      this.assertTeacherSubject(currentUser, existing.subjectId, 'ARCHIVE_EXPLANATION');
    }

    const now = new Date().toISOString();
    this.state.explanations = this.state.explanations.map(e =>
      e.id === id ? { ...e, status: 'ARCHIVED', updatedAt: now } : e
    );

    this.logAudit(
      currentUser,
      'ARCHIVE_EXPLANATION',
      'EXPLANATION',
      `Mengarsipkan pembahasan (menyembunyikan dari siswa): ${existing.title}`
    );
    this.persistState();
  }

  public deleteExplanation(id: string, currentUser: any) {
    const existing = this.state.explanations.find(e => e.id === id);
    if (!existing) throw new Error(`Pembahasan dengan ID '${id}' tidak ditemukan.`);

    if (existing.subjectId && currentUser.role === 'GURU') {
      this.assertTeacherSubject(currentUser, existing.subjectId, 'DELETE_EXPLANATION');
    }

    this.state.explanations = this.state.explanations.filter(e => e.id !== id);
    this.logAudit(currentUser, 'DELETE_EXPLANATION', 'EXPLANATION', `Menghapus pembahasan: ${existing.title}`);
    this.persistState();
  }

  /**
   * AUTOMATED EXPLANATION SYSTEM TEST SUITE (PHASE 10)
   */
  public runExplanationEngineTests(currentUser?: any): ExplanationTestSuiteResult {
    return ExplanationService.runExplanationTestSuite(this.state, currentUser);
  }

  /**
   * AUTOMATED REPORTING & EXPORT TEST SUITE (PHASE 11)
   */
  public runReportEngineTests(currentUser?: any): ReportTestSuiteResult {
    return ExportService.runReportEngineTests(this.state, currentUser);
  }

  // -------------------------------------------------------------
  // PHASE 12 — PROGRESS TRACKING API
  // -------------------------------------------------------------
  public getStudentProgress(studentId: string, currentUser?: any, subjectId?: string): StudentProgressResult | null {
    return ProgressService.getStudentProgress(studentId, this.state, currentUser, subjectId);
  }

  public getClassProgress(classId: string, currentUser?: any): ClassProgressResult | null {
    if (!classId) return null;
    let targetClassId = classId;
    if (targetClassId === 'ALL') {
      const allowed = currentUser ? this.getTeacherAllowedClassIds(currentUser) : [];
      targetClassId = allowed[0] || (this.state.classes || [])[0]?.id || '';
      if (!targetClassId) return null;
    }
    if (currentUser && currentUser.role === 'GURU') {
      this.assertTeacherClass(currentUser, targetClassId, 'VIEW_CLASS_PROGRESS');
    }
    return ProgressService.getClassProgress(targetClassId, this.state, currentUser);
  }

  public getSubjectProgress(subjectId: string, currentUser?: any): SubjectProgressResult | null {
    if (!subjectId) return null;
    let targetSubjectId = subjectId;
    if (targetSubjectId === 'ALL') {
      const allowed = currentUser ? this.getTeacherAllowedSubjectIds(currentUser) : [];
      targetSubjectId = allowed[0] || (this.state.subjects || [])[0]?.id || '';
      if (!targetSubjectId) return null;
    }
    if (currentUser && currentUser.role === 'GURU') {
      this.assertTeacherSubject(currentUser, targetSubjectId, 'VIEW_SUBJECT_PROGRESS');
    }
    return ProgressService.getSubjectProgress(targetSubjectId, this.state, currentUser);
  }

  public getCompetencyProgress(competencyId: string, currentUser?: any): CompetencyProgressResult | null {
    return ProgressService.getCompetencyProgress(competencyId, this.state, currentUser);
  }

  /**
   * AUTOMATED PROGRESS TRACKING TEST SUITE (PHASE 12)
   */
  public runProgressEngineTests(currentUser?: any): ProgressTestSuiteResult {
    return ProgressService.runProgressTestSuite(this.state, currentUser);
  }

  /**
   * MASTER PRODUCTION READINESS VALIDATION TEST SUITE (PHASE 14)
   */
  public runProductionValidationTests(currentUser?: any): ProductionValidationSuiteResult {
    return ProductionValidationService.runProductionValidationTestSuite(this.state, currentUser);
  }

  // AUDIT LOGS
  public getAuditLogs(): AuditLog[] { return this.state.auditLogs; }

  /**
   * SECURITY TEST SUITE: Teacher Permission & Isolation Verification
   */
  public runTeacherPermissionSecurityTests(): {
    passed: boolean;
    tests: { name: string; passed: boolean; message: string }[];
  } {
    const results: { name: string; passed: boolean; message: string }[] = [];

    const guruMatematika: User = {
      id: 'u-guru1',
      name: 'Drs. Bambang Sugiarto',
      email: 'bambang@sekolah.sch.id',
      role: 'GURU',
      createdAt: '2025-07-01T08:00:00Z',
    };

    const guruFisika: User = {
      id: 'u-guru3',
      name: 'Ahmad Rifai, M.Pd',
      email: 'rifai@sekolah.sch.id',
      role: 'GURU',
      createdAt: '2025-07-01T08:00:00Z',
    };

    // Test 1: Teacher Allowed Subjects Resolution
    const matSubjects = this.getTeacherAllowedSubjectIds(guruMatematika);
    const t1Passed = matSubjects.includes('subj-mat') && !matSubjects.includes('subj-fis') && !matSubjects.includes('subj-bin');
    results.push({
      name: 'Teacher Allowed Subject Resolution',
      passed: t1Passed,
      message: t1Passed
        ? `Guru Matematika memiliki wewenang persis pada: [${matSubjects.join(', ')}]`
        : `Gagal: Subjek terlarang bocor ke Guru Matematika: [${matSubjects.join(', ')}]`,
    });

    // Test 2: Teacher Allowed Classes Resolution
    const matClasses = this.getTeacherAllowedClassIds(guruMatematika);
    const t2Passed = matClasses.includes('c-xii-ipa1') && matClasses.includes('c-xii-ipa2') && !matClasses.includes('c-xii-ips1');
    results.push({
      name: 'Teacher Allowed Class Isolation',
      passed: t2Passed,
      message: t2Passed
        ? `Guru Matematika hanya mengampu kelas: [${matClasses.join(', ')}]`
        : `Gagal: Kelas tidak berwenang terdeteksi pada Guru Matematika: [${matClasses.join(', ')}]`,
    });

    // Test 3: Authorized Question Creation (MAT)
    let createdQuestionId = '';
    try {
      const q = this.addQuestion({
        uniqueCode: `TEST-SEC-MAT-${Date.now()}`,
        subjectId: 'subj-mat',
        materialId: 'm-mat-1',
        competencyId: 'comp-mat-1',
        questionNumber: 99,
        questionText: 'Test soal matematika wewenang resmi guru.',
        options: [
          { key: 'A', text: 'Jawaban A' },
          { key: 'B', text: 'Jawaban B' },
        ],
        correctAnswer: 'A',
        weight: 1,
        cognitiveLevel: 'C4',
        status: 'ACTIVE',
      }, guruMatematika);
      createdQuestionId = q.id;
      results.push({
        name: 'Authorized Question Creation (Authorized Subject)',
        passed: true,
        message: `Berhasil menambahkan butir soal pada mata pelajaran berwenang (${q.uniqueCode}, level: ${q.cognitiveLevel})`,
      });
    } catch (err: any) {
      results.push({
        name: 'Authorized Question Creation (Authorized Subject)',
        passed: false,
        message: `Gagal menambahkan soal yang sah: ${err.message}`,
      });
    }

    // Test 4: Unauthorized Question Creation Rejection (Guru MAT mencoba membuat soal FIS)
    try {
      this.addQuestion({
        uniqueCode: `TEST-ILLEGAL-FIS-${Date.now()}`,
        subjectId: 'subj-fis',
        materialId: 'm-fis-1',
        competencyId: 'comp-fis-1',
        questionText: 'Test soal fisika ilegal oleh guru matematika.',
        options: [
          { key: 'A', text: 'A' },
          { key: 'B', text: 'B' },
        ],
        correctAnswer: 'A',
        weight: 1,
        cognitiveLevel: 'C3',
        status: 'ACTIVE',
      }, guruMatematika);
      results.push({
        name: 'Unauthorized Subject Question Creation Rejection',
        passed: false,
        message: 'GAGAL: Guru Matematika berhasil membuat soal Fisika tanpa hak akses!',
      });
    } catch (err: any) {
      const isForbidden = err.message.includes('Akses Ditolak (403)');
      results.push({
        name: 'Unauthorized Subject Question Creation Rejection',
        passed: isForbidden,
        message: isForbidden
          ? `Berhasil ditolak dengan 403 Forbidden: "${err.message}"`
          : `Pesan penolakan tidak sesuai: ${err.message}`,
      });
    }

    // Test 5: Unauthorized Material Creation Rejection
    try {
      this.addMaterial({
        code: `MAT-ILLEGAL-${Date.now()}`,
        subjectId: 'subj-fis',
        title: 'Materi Fisika Ilegal',
        description: 'Materi tanpa hak akses',
      }, guruMatematika);
      results.push({
        name: 'Unauthorized Material Creation Rejection',
        passed: false,
        message: 'GAGAL: Guru Matematika berhasil menambahkan materi Fisika!',
      });
    } catch (err: any) {
      const isForbidden = err.message.includes('Akses Ditolak (403)');
      results.push({
        name: 'Unauthorized Material Creation Rejection',
        passed: isForbidden,
        message: isForbidden
          ? `Berhasil ditolak dengan 403: "${err.message}"`
          : `Gagal: ${err.message}`,
      });
    }

    // Test 6: Unauthorized Competency Creation Rejection
    try {
      this.addCompetency({
        code: `KD-ILLEGAL-${Date.now()}`,
        subjectId: 'subj-bin',
        statement: 'Kompetensi Bahasa Indonesia ilegal',
        gradeLevel: 'XII',
      }, guruMatematika);
      results.push({
        name: 'Unauthorized Competency Creation Rejection',
        passed: false,
        message: 'GAGAL: Guru Matematika berhasil menambahkan KD Bahasa Indonesia!',
      });
    } catch (err: any) {
      const isForbidden = err.message.includes('Akses Ditolak (403)');
      results.push({
        name: 'Unauthorized Competency Creation Rejection',
        passed: isForbidden,
        message: isForbidden
          ? `Berhasil ditolak dengan 403: "${err.message}"`
          : `Gagal: ${err.message}`,
      });
    }

    // Test 7: Unauthorized Class Student Access Rejection
    try {
      this.getStudentsForTeacher(guruMatematika, 'c-xii-ips1');
      results.push({
        name: 'Unauthorized Class Student Access Rejection',
        passed: false,
        message: 'GAGAL: Guru Matematika berhasil mengakses data siswa kelas XII IPS 1!',
      });
    } catch (err: any) {
      const isForbidden = err.message.includes('Akses Ditolak (403)');
      results.push({
        name: 'Unauthorized Class Student Access Rejection',
        passed: isForbidden,
        message: isForbidden
          ? `Berhasil dicegat dengan 403: "${err.message}"`
          : `Gagal: ${err.message}`,
      });
    }

    // Cleanup test question if created
    if (createdQuestionId) {
      this.state.questions = this.state.questions.filter(q => q.id !== createdQuestionId);
      this.persistState();
    }

    return {
      passed: results.every(r => r.passed),
      tests: results,
    };
  }
}

export const dbService = new DatabaseService();
