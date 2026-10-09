import {
  User, Teacher, Student, ClassRoom, StudentClass, AcademicYear, Subject,
  TeacherSubject, Material, Competency, Tryout, TryoutSubject, Question,
  TryoutQuestion, GoogleForm, Response, Answer, Score, QuestionAnalysis,
  Explanation, Report, AuditLog, TryoutStatus, ScoringConfig, Role
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

const STORAGE_KEY = 'school_tryout_analytics_db_v1';

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
}

class DatabaseService {
  private state: DatabaseState;
  private listeners: (() => void)[] = [];

  // Fast In-Memory Performance Indexes for O(1) Lookups
  private responsesByTryoutStudent = new Map<string, Response>();
  private answersByTryout = new Map<string, Answer[]>();
  private answersByQuestion = new Map<string, Answer[]>();
  private scoresByTryout = new Map<string, Score[]>();
  private scoresByStudent = new Map<string, Score[]>();
  private studentsByClass = new Map<string, Student[]>();

  constructor() {
    this.state = this.loadFromStorage();
    this.rebuildIndexes();
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
            const existing = parsed.teachers.find((t: any) => t.id === it.id || t.userId === it.userId);
            if (!existing) {
              parsed.teachers.push(it);
            }
          });
        } else {
          parsed.teachers = INITIAL_TEACHERS;
        }

        // Ensure answers and scores are hydrated if old storage is empty
        if (!parsed.answers || parsed.answers.length === 0) {
          parsed.answers = INITIAL_ANSWERS;
        }
        if (!parsed.scores || parsed.scores.length < INITIAL_SCORES.length) {
          parsed.scores = INITIAL_SCORES;
        }
        if (!parsed.responses || parsed.responses.length < INITIAL_RESPONSES.length) {
          parsed.responses = INITIAL_RESPONSES;
        }
        return parsed;
      }
    } catch (err) {
      console.warn('Failed to load DB from localStorage, falling back to initial seed:', err);
    }

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
      tryouts: INITIAL_TRYOUTS,
      tryoutSubjects: INITIAL_TRYOUT_SUBJECTS,
      questions: INITIAL_QUESTIONS,
      tryoutQuestions: INITIAL_TRYOUT_QUESTIONS,
      googleForms: [],
      responses: INITIAL_RESPONSES,
      answers: INITIAL_ANSWERS,
      scores: INITIAL_SCORES,
      questionAnalysis: [],
      explanations: INITIAL_EXPLANATIONS,
      reports: [],
      auditLogs: INITIAL_AUDIT_LOGS,
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

  // SECURITY: Require Admin Authorization Helper
  private assertAdmin(currentUser: any, actionName: string) {
    if (!currentUser || currentUser.role !== 'ADMIN') {
      if (currentUser) {
        this.logAudit(
          currentUser,
          'UNAUTHORIZED_MUTATION_ATTEMPT',
          'SECURITY',
          `Pengguna non-admin (${currentUser.name} - ${currentUser.role}) mencoba mengeksekusi '${actionName}'.`
        );
      }
      throw new Error(`Akses Ditolak (403): Hanya Administrator yang berwenang melakukan '${actionName}'.`);
    }
  }

  // SECURITY: Require Admin or Teacher Authorization Helper
  private assertAdminOrTeacher(currentUser: any, actionName: string) {
    if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'GURU')) {
      if (currentUser) {
        this.logAudit(
          currentUser,
          'UNAUTHORIZED_MUTATION_ATTEMPT',
          'SECURITY',
          `Pengguna tidak berwenang (${currentUser.name} - ${currentUser.role}) mencoba mengeksekusi '${actionName}'.`
        );
      }
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
      (searchId && t.email && t.email.toLowerCase() === searchId.toLowerCase())
    );
  }

  public getTeacherAllowedSubjectIds(currentUser: any): string[] {
    if (!currentUser) return [];
    if (currentUser.role === 'ADMIN') {
      return this.state.subjects.map(s => s.id);
    }
    const teacher = this.getTeacherByUserId(currentUser);
    if (!teacher || !teacher.subjectPermissions || teacher.subjectPermissions.length === 0) {
      return this.state.subjects.map(s => s.id);
    }
    return teacher.subjectPermissions;
  }

  public getTeacherAllowedClassIds(currentUser: any): string[] {
    if (!currentUser) return [];
    if (currentUser.role === 'ADMIN') {
      return this.state.classes.map(c => c.id);
    }
    const teacher = this.getTeacherByUserId(currentUser);
    if (!teacher) {
      return this.state.classes.map(c => c.id);
    }
    const fromSubjects = this.state.teacherSubjects
      .filter(ts => ts.teacherId === teacher.id)
      .map(ts => ts.classId);
    const fromTeacher = teacher.classPermissions || [];
    const combined = Array.from(new Set([...fromSubjects, ...fromTeacher]));
    return combined.length > 0 ? combined : this.state.classes.map(c => c.id);
  }

  public assertTeacherSubject(currentUser: any, subjectId: string, actionName: string) {
    if (!currentUser) {
      throw new Error(`Akses Ditolak (401): Pengguna belum terautentikasi untuk '${actionName}'.`);
    }
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
    if (!allowedSubjects.includes(subjectId)) {
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
    const allowedClasses = this.getTeacherAllowedClassIds(currentUser);
    if (!allowedClasses.includes(classId)) {
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

  public getTryoutsForTeacher(currentUser: any): Tryout[] {
    if (!currentUser) return [];
    if (currentUser.role === 'ADMIN') return this.state.tryouts;
    const allowedSubjects = this.getTeacherAllowedSubjectIds(currentUser);
    // Find tryout IDs that include any of the teacher's allowed subjects
    const relevantTryoutIds = new Set(
      this.state.tryoutSubjects
        .filter(tsub => allowedSubjects.includes(tsub.subjectId))
        .map(tsub => tsub.tryoutId)
    );
    return this.state.tryouts.filter(t => relevantTryoutIds.has(t.id));
  }

  public getClassesForTeacher(currentUser: any): ClassRoom[] {
    if (!currentUser) return [];
    if (currentUser.role === 'ADMIN') return this.state.classes;
    const allowedClasses = this.getTeacherAllowedClassIds(currentUser);
    return this.state.classes.filter(c => allowedClasses.includes(c.id));
  }

  public getStudentsForTeacher(currentUser: any, classIdFilter?: string): Student[] {
    if (!currentUser) return [];
    if (currentUser.role === 'ADMIN') {
      if (classIdFilter && classIdFilter !== 'ALL') {
        return this.state.students.filter(s => s.classId === classIdFilter);
      }
      return this.state.students;
    }
    const allowedClassIds = this.getTeacherAllowedClassIds(currentUser);
    let filtered = this.state.students.filter(s => allowedClassIds.includes(s.classId));
    if (classIdFilter && classIdFilter !== 'ALL') {
      if (!allowedClassIds.includes(classIdFilter)) {
        throw new Error(`Akses Ditolak (403): Anda tidak berwenang mengakses data siswa di kelas ini.`);
      }
      filtered = filtered.filter(s => s.classId === classIdFilter);
    }
    return filtered;
  }

  // AUDIT LOG
  public logAudit(user: { id: string; name: string; role: any }, action: string, targetEntity: string, details: string): AuditLog {
    const newLog: AuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      userId: user.id || 'anonymous',
      userName: user.name || 'Anonim',
      role: user.role || 'GUEST',
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

    const newStudent: Student = { ...student, id: `s-${Date.now()}` };
    this.state.students.push(newStudent);
    this.logAudit(currentUser, 'CREATE_STUDENT', 'STUDENT', `Menambahkan siswa baru: ${newStudent.name} (NISN: ${newStudent.nisn})`);
    this.persistState();
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
  }
  public deleteStudent(id: string, currentUser: any) {
    this.assertAdmin(currentUser, 'DELETE_STUDENT');
    const student = this.state.students.find(s => s.id === id);
    this.state.students = this.state.students.filter(s => s.id !== id);
    this.logAudit(currentUser, 'DELETE_STUDENT', 'STUDENT', `Menghapus data siswa: ${student?.name || id}`);
    this.persistState();
  }

  public deleteStudentsBatch(ids: string[], currentUser: any) {
    this.assertAdmin(currentUser, 'BULK_DELETE_STUDENT');
    if (!ids.length) return;
    this.state.students = this.state.students.filter(s => !ids.includes(s.id));
    this.logAudit(currentUser, 'BULK_DELETE_STUDENT', 'STUDENT', `Menghapus massal ${ids.length} data siswa.`);
    this.persistState();
  }

  // TEACHERS CRUD
  public getTeachers(): Teacher[] { return this.state.teachers; }
  public addTeacher(teacher: Omit<Teacher, 'id'>, currentUser: any, roleToSave?: Role, passwordToSave?: string): Teacher {
    this.assertAdmin(currentUser, 'CREATE_TEACHER');

    // Duplicate NIP validation
    if (this.state.teachers.some(t => t.nip.trim() === teacher.nip.trim())) {
      throw new Error(`Validasi Gagal: NIP '${teacher.nip}' sudah terdaftar dalam sistem.`);
    }

    const newTeacher: Teacher = { ...teacher, id: `t-${Date.now()}` };
    if (passwordToSave) {
      newTeacher.password = passwordToSave;
    }
    this.state.teachers.push(newTeacher);

    // Synchronize or create matching User object
    const finalRole: Role = roleToSave || (teacher.isWaliKelas ? 'WALI_KELAS' : 'GURU');
    const existingUser = this.state.users.find(u => u.email.toLowerCase() === teacher.email.toLowerCase() || u.id === teacher.userId);
    if (existingUser) {
      existingUser.role = finalRole;
      existingUser.name = teacher.name;
      existingUser.email = teacher.email;
      if (passwordToSave) existingUser.password = passwordToSave;
    } else {
      this.state.users.push({
        id: teacher.userId || `u-${Date.now()}`,
        email: teacher.email.toLowerCase(),
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
    const targetEmail = updatedTeacher.email || existingTeacher.email;
    const userObj = this.state.users.find(u => u.id === targetUserId || u.email.toLowerCase() === targetEmail.toLowerCase() || u.email.toLowerCase() === existingTeacher.email.toLowerCase());

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
  }
  public deleteTeacher(id: string, currentUser: any) {
    this.assertAdmin(currentUser, 'DELETE_TEACHER');
    const teacher = this.state.teachers.find(t => t.id === id);
    this.state.teachers = this.state.teachers.filter(t => t.id !== id);
    this.logAudit(currentUser, 'DELETE_TEACHER', 'TEACHER', `Menghapus data guru: ${teacher?.name || id}`);
    this.persistState();
  }

  public deleteTeachersBatch(ids: string[], currentUser: any) {
    this.assertAdmin(currentUser, 'BULK_DELETE_TEACHER');
    if (!ids.length) return;
    this.state.teachers = this.state.teachers.filter(t => !ids.includes(t.id));
    this.logAudit(currentUser, 'BULK_DELETE_TEACHER', 'TEACHER', `Menghapus massal ${ids.length} data guru/staf.`);
    this.persistState();
  }

  // CLASSES CRUD
  public getClasses(): ClassRoom[] { return this.state.classes; }
  public addClass(cls: Omit<ClassRoom, 'id'>, currentUser: any): ClassRoom {
    this.assertAdmin(currentUser, 'CREATE_CLASS');
    if (this.state.classes.some(c => c.name.toLowerCase() === cls.name.trim().toLowerCase() && c.academicYearId === cls.academicYearId)) {
      throw new Error(`Validasi Gagal: Kelas '${cls.name}' sudah ada pada tahun ajaran ini.`);
    }
    const newClass: ClassRoom = { ...cls, id: `c-${Date.now()}` };
    this.state.classes.push(newClass);
    this.logAudit(currentUser, 'CREATE_CLASS', 'CLASS', `Menambahkan kelas baru: ${newClass.name}`);
    this.persistState();
    return newClass;
  }
  public updateClass(id: string, updates: Partial<ClassRoom>, currentUser: any) {
    this.assertAdmin(currentUser, 'UPDATE_CLASS');
    this.state.classes = this.state.classes.map(c => c.id === id ? { ...c, ...updates } : c);
    this.logAudit(currentUser, 'UPDATE_CLASS', 'CLASS', `Memperbarui kelas ID: ${id}`);
    this.persistState();
  }
  public deleteClass(id: string, currentUser: any) {
    this.assertAdmin(currentUser, 'DELETE_CLASS');
    const c = this.state.classes.find(item => item.id === id);
    this.state.classes = this.state.classes.filter(item => item.id !== id);
    this.logAudit(currentUser, 'DELETE_CLASS', 'CLASS', `Menghapus kelas: ${c?.name || id}`);
    this.persistState();
  }

  public deleteClassesBatch(ids: string[], currentUser: any) {
    this.assertAdmin(currentUser, 'BULK_DELETE_CLASS');
    if (!ids.length) return;
    this.state.classes = this.state.classes.filter(c => !ids.includes(c.id));
    this.logAudit(currentUser, 'BULK_DELETE_CLASS', 'CLASS', `Menghapus massal ${ids.length} kelas.`);
    this.persistState();
  }

  // SUBJECTS CRUD
  public getSubjects(): Subject[] { return this.state.subjects; }
  public addSubject(subj: Omit<Subject, 'id'>, currentUser: any): Subject {
    this.assertAdmin(currentUser, 'CREATE_SUBJECT');
    if (this.state.subjects.some(s => s.code.toLowerCase() === subj.code.trim().toLowerCase())) {
      throw new Error(`Validasi Gagal: Kode mata pelajaran '${subj.code}' sudah digunakan.`);
    }
    const newSubj: Subject = { ...subj, id: `subj-${Date.now()}` };
    this.state.subjects.push(newSubj);
    this.logAudit(currentUser, 'CREATE_SUBJECT', 'SUBJECT', `Menambahkan mata pelajaran: ${newSubj.name} (${newSubj.code})`);
    this.persistState();
    return newSubj;
  }
  public updateSubject(id: string, updates: Partial<Subject>, currentUser: any) {
    this.assertAdmin(currentUser, 'UPDATE_SUBJECT');
    this.state.subjects = this.state.subjects.map(s => s.id === id ? { ...s, ...updates } : s);
    this.logAudit(currentUser, 'UPDATE_SUBJECT', 'SUBJECT', `Memperbarui mata pelajaran ID: ${id}`);
    this.persistState();
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
  }

  public deleteSubjectsBatch(ids: string[], currentUser: any) {
    this.assertAdmin(currentUser, 'BULK_DELETE_SUBJECT');
    if (!ids.length) return;
    this.state.subjects = this.state.subjects.filter(s => !ids.includes(s.id));
    this.logAudit(currentUser, 'BULK_DELETE_SUBJECT', 'SUBJECT', `Menghapus massal ${ids.length} mata pelajaran.`);
    this.persistState();
  }

  // ACADEMIC YEARS CRUD
  public getAcademicYears(): AcademicYear[] { return this.state.academicYears; }
  public addAcademicYear(ay: Omit<AcademicYear, 'id'>, currentUser: any): AcademicYear {
    this.assertAdmin(currentUser, 'CREATE_ACADEMIC_YEAR');
    const newAy: AcademicYear = { ...ay, id: `ay-${Date.now()}` };
    this.state.academicYears.push(newAy);
    this.logAudit(currentUser, 'CREATE_ACADEMIC_YEAR', 'ACADEMIC_YEAR', `Menambahkan tahun ajaran: ${newAy.yearLabel} (${newAy.semester})`);
    this.persistState();
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

  // TRYOUTS CRUD & MANAGEMENT
  public getTryouts(): Tryout[] { return this.state.tryouts; }
  public saveTryout(to: Tryout): Tryout {
    const existingIdx = this.state.tryouts.findIndex(t => t.id === to.id);
    if (existingIdx >= 0) {
      this.state.tryouts[existingIdx] = to;
    } else {
      this.state.tryouts.push(to);
    }
    this.persistState();
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
    return newTo;
  }
  public updateTryout(id: string, updates: Partial<Tryout>, currentUser: any) {
    this.assertAdmin(currentUser, 'UPDATE_TRYOUT');
    this.state.tryouts = this.state.tryouts.map(t => t.id === id ? { ...t, ...updates } : t);
    this.logAudit(currentUser, 'UPDATE_TRYOUT', 'TRYOUT', `Memperbarui data Try Out ID: ${id}`);
    this.persistState();
  }
  public updateTryoutStatus(id: string, status: TryoutStatus, currentUser: any) {
    this.assertAdmin(currentUser, 'UPDATE_TRYOUT_STATUS');
    this.state.tryouts = this.state.tryouts.map(t => t.id === id ? { ...t, status } : t);
    this.logAudit(currentUser, 'UPDATE_TRYOUT_STATUS', 'TRYOUT', `Mengubah status Try Out ID ${id} menjadi '${status}'`);
    this.persistState();
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
  }
  public deleteTryout(id: string, currentUser: any) {
    this.assertAdmin(currentUser, 'DELETE_TRYOUT');
    const to = this.state.tryouts.find(t => t.id === id);
    this.state.tryouts = this.state.tryouts.filter(t => t.id !== id);
    this.logAudit(currentUser, 'DELETE_TRYOUT', 'TRYOUT', `Menghapus Try Out: ${to?.title || id}`);
    this.persistState();
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
      id: `q-${Date.now()}`,
      cognitiveLevel: q.cognitiveLevel || 'C3',
      status: q.status || 'ACTIVE',
      weight: q.weight ?? 1,
    };
    this.state.questions.push(newQ);
    this.logAudit(currentUser, 'CREATE_QUESTION', 'QUESTION', `Menambahkan butir soal: ${newQ.uniqueCode} (${newQ.cognitiveLevel})`);
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

  // -------------------------------------------------------------
  // PHASE 9 — ANALYTICS ENGINE API
  // -------------------------------------------------------------
  /**
   * Student Individual Analytics
   * Derives real calculations strictly from database entities.
   */
  public getStudentAnalytics(studentId: string, tryoutId: string): StudentAnalyticsResult | null {
    return AnalyticsService.getStudentAnalytics(
      studentId,
      tryoutId,
      this.state.students,
      this.state.classes,
      this.state.tryouts,
      this.state.questions,
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

    const tryout = this.state.tryouts.find(t => t.id === tryoutId) || this.state.tryouts[0];
    const tsub = this.state.tryoutSubjects.find(ts => ts.tryoutId === tryout?.id);
    const passingGrade = tsub?.passingGrade || 75;

    return AnalyticsService.getClassAnalytics(
      classId,
      tryoutId,
      this.state.students,
      this.state.classes,
      this.state.tryouts,
      this.state.academicYears,
      this.state.scores,
      this.state.questions,
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
    let questions = this.state.questions;
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

    let answers = this.answersByTryout.get(tryoutId) || this.state.answers.filter(a => a.tryoutId === tryoutId);
    let scores = this.scoresByTryout.get(tryoutId) || this.state.scores.filter(s => s.tryoutId === tryoutId);

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
  }

  // -------------------------------------------------------------
  // PHASE 10 — EXPLANATION SYSTEM API
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
  public getStudentProgress(studentId: string): StudentProgressResult | null {
    return ProgressService.getStudentProgress(studentId, this.state);
  }

  public getClassProgress(classId: string, currentUser?: any): ClassProgressResult | null {
    if (currentUser && currentUser.role === 'GURU') {
      this.assertTeacherClass(currentUser, classId, 'VIEW_CLASS_PROGRESS');
    }
    return ProgressService.getClassProgress(classId, this.state, currentUser);
  }

  public getSubjectProgress(subjectId: string, currentUser?: any): SubjectProgressResult | null {
    if (currentUser && currentUser.role === 'GURU') {
      this.assertTeacherSubject(currentUser, subjectId, 'VIEW_SUBJECT_PROGRESS');
    }
    return ProgressService.getSubjectProgress(subjectId, this.state, currentUser);
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
