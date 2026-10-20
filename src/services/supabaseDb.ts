/**
 * supabaseDb.ts — Supabase Cloud Sync Service
 *
 * Layer sinkronisasi data antara localStorage (state lokal) dan Supabase PostgreSQL.
 * Berjalan secara asinkron di background — tidak memblokir UI.
 *
 * Strategi:
 * - Write-through: setiap mutasi lokal juga dikirim ke Supabase
 * - Read-on-empty: jika localStorage kosong, load dari Supabase (fresh device)
 * - Natural key upsert: gunakan email/nip/nisn untuk menghindari duplikat
 */
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  User, Teacher, Student, ClassRoom, AcademicYear, Subject, ExamPackage, ExamPackageSubject, Tryout
} from '../types/database';

// ============================================================
// TYPE MAPPINGS (Supabase snake_case ↔ TypeScript camelCase)
// ============================================================

function toSupabaseUser(u: User): Record<string, unknown> {
  return {
    email: u.email.toLowerCase(),
    role: u.role,
    name: u.name,
    avatar_url: u.avatarUrl || null,
  };
}

function fromSupabaseUser(row: Record<string, unknown>): User {
  return {
    id: String(row.id),
    email: String(row.email),
    role: (row.role as User['role']) || 'GURU',
    name: String(row.name),
    avatarUrl: row.avatar_url ? String(row.avatar_url) : undefined,
    createdAt: String(row.created_at || new Date().toISOString()),
  };
}

function toSupabaseTeacher(t: Teacher, supabaseUserId: string): Record<string, unknown> {
  return {
    user_id: supabaseUserId,
    nip: t.nip.trim(),
    name: t.name,
    email: t.email || `${t.nip.trim()}@guru.sekolah.id`,
    phone: t.phone || null,
    subject_permissions: t.subjectPermissions || [],
    class_permissions: t.classPermissions || [],
    is_wali_kelas: t.isWaliKelas || false,
    // password_hint: plain password for demo-mode fallback login (optional)
    password_hint: t.password || null,
  };
}

function fromSupabaseTeacher(
  row: Record<string, unknown>,
  supabaseUserIdToLocalId: Map<string, string>
): Teacher {
  const supabaseUserId = String(row.user_id);
  const localUserId = supabaseUserIdToLocalId.get(supabaseUserId) || supabaseUserId;
  return {
    id: String(row.id),
    userId: localUserId,
    nip: String(row.nip),
    name: String(row.name),
    email: row.email ? String(row.email) : undefined,
    phone: row.phone ? String(row.phone) : undefined,
    password: row.password_hint ? String(row.password_hint) : 'password123',
    subjectPermissions: Array.isArray(row.subject_permissions)
      ? (row.subject_permissions as string[])
      : [],
    classPermissions: Array.isArray(row.class_permissions)
      ? (row.class_permissions as string[])
      : [],
    isWaliKelas: Boolean(row.is_wali_kelas),
    homeRoomClassId: row.home_room_class_id ? String(row.home_room_class_id) : undefined,
  };
}

function toSupabaseStudent(s: Student, supabaseClassId: string): Record<string, unknown> {
  return {
    nisn: s.nisn,
    nis: s.nis || s.nisn,
    name: s.name,
    gender: s.gender,
    class_id: supabaseClassId,
    email: s.email || null,
    phone: s.phone || null,
    birth_date: s.birthDate || null,
    target_score: s.targetScore || 80,
  };
}

function fromSupabaseStudent(
  row: Record<string, unknown>,
  supabaseClassIdToLocalId: Map<string, string>
): Student {
  const supabaseClassId = String(row.class_id);
  const localClassId = supabaseClassIdToLocalId.get(supabaseClassId) || supabaseClassId;
  return {
    id: String(row.id),
    nisn: String(row.nisn),
    nis: row.nis ? String(row.nis) : undefined,
    name: String(row.name),
    gender: (row.gender as 'L' | 'P') || 'L',
    classId: localClassId,
    email: row.email ? String(row.email) : undefined,
    phone: row.phone ? String(row.phone) : undefined,
    birthDate: row.birth_date ? String(row.birth_date) : undefined,
    targetScore: row.target_score ? Number(row.target_score) : undefined,
  };
}

function toSupabaseClass(c: ClassRoom, supabaseAcademicYearId: string): Record<string, unknown> {
  return {
    name: c.name,
    grade_level: c.gradeLevel,
    academic_year_id: supabaseAcademicYearId,
  };
}

function fromSupabaseClass(
  row: Record<string, unknown>,
  supabaseAcademicYearIdToLocalId: Map<string, string>
): ClassRoom {
  const ayId = String(row.academic_year_id);
  const localAyId = supabaseAcademicYearIdToLocalId.get(ayId) || ayId;
  return {
    id: String(row.id),
    name: String(row.name),
    gradeLevel: String(row.grade_level),
    academicYearId: localAyId,
    homeRoomTeacherId: row.home_room_teacher_id ? String(row.home_room_teacher_id) : undefined,
  };
}

function toSupabaseAcademicYear(ay: AcademicYear): Record<string, unknown> {
  return {
    year_label: ay.yearLabel,
    semester: ay.semester,
    is_active: ay.isActive,
  };
}

function fromSupabaseAcademicYear(row: Record<string, unknown>): AcademicYear {
  return {
    id: String(row.id),
    yearLabel: String(row.year_label),
    semester: (row.semester as 'ODD' | 'EVEN') || 'ODD',
    isActive: Boolean(row.is_active),
  };
}

function toSupabaseSubject(s: Subject): Record<string, unknown> {
  return {
    code: s.code,
    name: s.name,
    category: s.category,
    passing_grade: s.passingGrade || 75,
  };
}

function fromSupabaseSubject(row: Record<string, unknown>): Subject {
  return {
    id: String(row.id),
    code: String(row.code),
    name: String(row.name),
    category: String(row.category) as Subject['category'],
    passingGrade: row.passing_grade ? Number(row.passing_grade) : 75,
  };
}

function toSupabaseExamPackage(pkg: ExamPackage, supabaseAcademicYearId?: string): Record<string, unknown> {
  return {
    code: pkg.code,
    title: pkg.title,
    assessment_type: pkg.assessmentType || 'TRYOUT',
    academic_year_id: supabaseAcademicYearId || pkg.academicYearId,
    target_grades: pkg.targetGrades || [],
    target_class_ids: pkg.targetClassIds || [],
    start_date: pkg.startDate || new Date().toISOString(),
    end_date: pkg.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: pkg.status || 'ACTIVE',
    description: pkg.description || null,
  };
}

function fromSupabaseExamPackage(row: Record<string, unknown>, subjects: ExamPackageSubject[] = []): ExamPackage {
  return {
    id: String(row.id),
    code: String(row.code),
    title: String(row.title),
    assessmentType: (row.assessment_type as ExamPackage['assessmentType']) || 'TRYOUT',
    academicYearId: String(row.academic_year_id),
    targetGrades: Array.isArray(row.target_grades) ? (row.target_grades as string[]) : [],
    targetClassIds: Array.isArray(row.target_class_ids) ? (row.target_class_ids as string[]) : [],
    startDate: String(row.start_date || new Date().toISOString()),
    endDate: String(row.end_date || new Date().toISOString()),
    status: (row.status as ExamPackage['status']) || 'ACTIVE',
    description: row.description ? String(row.description) : undefined,
    subjects: subjects,
    createdAt: row.created_at ? String(row.created_at) : undefined,
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
}

function toSupabaseTryout(to: Tryout, supabaseAcademicYearId?: string): Record<string, unknown> {
  return {
    code: to.code,
    title: to.title,
    assessment_type: to.assessmentType || 'TRYOUT',
    academic_year_id: supabaseAcademicYearId || to.academicYearId,
    start_date: to.startDate || new Date().toISOString(),
    end_date: to.endDate || new Date().toISOString(),
    scoring_config: to.scoringConfig || {},
    status: to.status || 'DRAFT',
    description: to.description || null,
    google_form_url: to.googleFormUrl || null,
    google_sheet_url: to.googleSheetUrl || null,
    package_id: to.packageId || null,
    target_class_ids: to.targetClassIds || [],
  };
}

function fromSupabaseTryout(row: Record<string, unknown>): Tryout {
  return {
    id: String(row.id),
    code: String(row.code),
    title: String(row.title),
    assessmentType: (row.assessment_type as Tryout['assessmentType']) || 'TRYOUT',
    academicYearId: String(row.academic_year_id),
    startDate: String(row.start_date || new Date().toISOString()),
    endDate: String(row.end_date || new Date().toISOString()),
    scoringConfig: (row.scoring_config as any) || { scoringType: 'ROUND_DOWN', maxScore: 100, correctScore: 1, wrongScore: 0, emptyScore: 0 },
    status: (row.status as Tryout['status']) || 'ACTIVE',
    description: row.description ? String(row.description) : undefined,
    googleFormUrl: row.google_form_url ? String(row.google_form_url) : undefined,
    googleSheetUrl: row.google_sheet_url ? String(row.google_sheet_url) : undefined,
    packageId: row.package_id ? String(row.package_id) : undefined,
    targetClassIds: Array.isArray(row.target_class_ids) ? (row.target_class_ids as string[]) : [],
  };
}

// ============================================================
// CORE SYNC SERVICE
// ============================================================

export interface SupabaseCoreState {
  users: User[];
  teachers: Teacher[];
  students: Student[];
  classes: ClassRoom[];
  academicYears: AcademicYear[];
  subjects: Subject[];
  examPackages?: ExamPackage[];
  tryouts?: Tryout[];
}

class SupabaseDbService {
  private log(msg: string, level: 'info' | 'warn' | 'error' = 'info') {
    const prefix = '[SupabaseDB]';
    if (level === 'error') console.error(prefix, msg);
    else if (level === 'warn') console.warn(prefix, msg);
    else console.info(prefix, msg);
  }

  public isAvailable(): boolean {
    return isSupabaseConfigured() && !!supabase;
  }

  // ----------------------------------------------------------
  // FETCH: Load all core state from Supabase
  // Used on fresh devices and background cloud sync
  // ----------------------------------------------------------
  public async fetchCoreState(): Promise<SupabaseCoreState | null> {
    if (!this.isAvailable() || !supabase) return null;

    try {
      // Fetch semua data secara paralel
      const [ayRes, classRes, subjectRes, userRes, teacherRes, studentRes, pkgRes, pkgSubRes, toRes] = await Promise.all([
        supabase.from('academic_years').select('*'),
        supabase.from('classes').select('*'),
        supabase.from('subjects').select('*'),
        supabase.from('users').select('*'),
        supabase.from('teachers').select('*'),
        supabase.from('students').select('*'),
        supabase.from('exam_packages').select('*'),
        supabase.from('exam_package_subjects').select('*'),
        supabase.from('tryouts').select('*'),
      ]);

      if (ayRes.error) throw new Error('academic_years: ' + ayRes.error.message);
      if (classRes.error) throw new Error('classes: ' + classRes.error.message);
      if (subjectRes.error) throw new Error('subjects: ' + subjectRes.error.message);
      if (userRes.error) throw new Error('users: ' + userRes.error.message);
      if (teacherRes.error) throw new Error('teachers: ' + teacherRes.error.message);
      if (studentRes.error) throw new Error('students: ' + studentRes.error.message);

      // Build mapping: Supabase UUID → local data
      const academicYears: AcademicYear[] = (ayRes.data || []).map(fromSupabaseAcademicYear);
      const supabaseAyIdToLocalId = new Map<string, string>();
      academicYears.forEach(ay => supabaseAyIdToLocalId.set(ay.id, ay.id));

      const classes: ClassRoom[] = (classRes.data || []).map(
        (row: Record<string, unknown>) => fromSupabaseClass(row, supabaseAyIdToLocalId)
      );
      const supabaseClassIdToLocalId = new Map<string, string>();
      classes.forEach(c => supabaseClassIdToLocalId.set(c.id, c.id));

      const subjects: Subject[] = (subjectRes.data || []).map(fromSupabaseSubject);

      const users: User[] = (userRes.data || []).map(fromSupabaseUser);
      const supabaseUserIdToLocalId = new Map<string, string>();
      users.forEach(u => supabaseUserIdToLocalId.set(u.id, u.id));

      const teachers: Teacher[] = (teacherRes.data || []).map(
        (row: Record<string, unknown>) => fromSupabaseTeacher(row, supabaseUserIdToLocalId)
      );

      const students: Student[] = (studentRes.data || []).map(
        (row: Record<string, unknown>) => fromSupabaseStudent(row, supabaseClassIdToLocalId)
      );

      // Exam packages & Tryouts
      const examPackagesData = pkgRes?.data || [];
      const examPackageSubjectsData = pkgSubRes?.data || [];
      const tryoutsData = toRes?.data || [];

      const subjectsByPkg = new Map<string, ExamPackageSubject[]>();
      examPackageSubjectsData.forEach((row: any) => {
        const pkgId = String(row.package_id);
        const list = subjectsByPkg.get(pkgId) || [];
        list.push({
          id: String(row.id),
          packageId: pkgId,
          subjectId: String(row.subject_id),
          teacherId: row.teacher_id ? String(row.teacher_id) : undefined,
          googleFormUrl: row.google_form_url ? String(row.google_form_url) : undefined,
          googleSheetUrl: row.google_sheet_url ? String(row.google_sheet_url) : undefined,
          answerKey: Array.isArray(row.answer_key) ? row.answer_key : [],
          totalQuestions: Number(row.total_questions) || 40,
          durationMinutes: Number(row.duration_minutes) || 60,
          passingGrade: Number(row.passing_grade) || 75,
          syncStatus: row.sync_status || 'SYNCED',
          lastUpdatedBy: row.last_updated_by ? String(row.last_updated_by) : undefined,
          updatedAt: row.updated_at ? String(row.updated_at) : undefined,
        });
        subjectsByPkg.set(pkgId, list);
      });

      const examPackages: ExamPackage[] = examPackagesData.map((row: any) =>
        fromSupabaseExamPackage(row, subjectsByPkg.get(String(row.id)) || [])
      );

      const tryouts: Tryout[] = tryoutsData.map((row: any) => fromSupabaseTryout(row));

      this.log(`Loaded from Supabase: ${users.length} users, ${teachers.length} teachers, ${students.length} students, ${classes.length} classes, ${examPackages.length} packages, ${tryouts.length} tryouts`);

      return { users, teachers, students, classes, academicYears, subjects, examPackages, tryouts };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.log('fetchCoreState failed: ' + msg, 'warn');
      return null;
    }
  }

  // ----------------------------------------------------------
  // UPSERT METHODS: Sync individual entities to Supabase
  // All fire-and-forget safe (catch errors internally)
  // ----------------------------------------------------------

  public async syncUser(user: User): Promise<void> {
    if (!this.isAvailable() || !supabase) return;
    try {
      const { error } = await supabase
        .from('users')
        .upsert(toSupabaseUser(user), { onConflict: 'email' });
      if (error) this.log('syncUser error: ' + error.message, 'warn');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.log('syncUser exception: ' + msg, 'warn');
    }
  }

  public async syncTeacher(teacher: Teacher, user?: User): Promise<void> {
    if (!this.isAvailable() || !supabase) return;
    try {
      // 1. Upsert user record first
      let supabaseUserId: string | null = null;
      const targetEmail = (teacher.email || `${teacher.nip.trim()}@guru.sekolah.id`).toLowerCase();

      if (user) {
        const { data: uData, error: uErr } = await supabase
          .from('users')
          .upsert(toSupabaseUser({ ...user, email: targetEmail }), { onConflict: 'email' })
          .select('id')
          .single();
        if (!uErr && uData) supabaseUserId = (uData as Record<string, unknown>).id as string;
      }

      if (!supabaseUserId) {
        // Try to find existing user
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', targetEmail)
          .single();
        supabaseUserId = existingUser ? (existingUser as Record<string, unknown>).id as string : null;
      }

      if (!supabaseUserId) {
        this.log('syncTeacher: cannot find or create user for ' + targetEmail, 'warn');
        return;
      }

      // 2. Upsert teacher record
      const { error } = await supabase
        .from('teachers')
        .upsert(toSupabaseTeacher(teacher, supabaseUserId), { onConflict: 'nip' });
      if (error) this.log('syncTeacher error: ' + error.message, 'warn');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.log('syncTeacher exception: ' + msg, 'warn');
    }
  }

  public async syncStudent(student: Student, supabaseClassId?: string): Promise<void> {
    if (!this.isAvailable() || !supabase) return;
    try {
      // Resolve class ID in Supabase
      let classId = supabaseClassId;
      if (!classId) {
        // Try to find class by local ID in Supabase (the UUID should match if synced)
        classId = student.classId; // Use as-is (may be UUID already)
      }

      if (!classId) {
        this.log('syncStudent: no class ID for student ' + student.nisn, 'warn');
        return;
      }

      const { error } = await supabase
        .from('students')
        .upsert(toSupabaseStudent(student, classId), { onConflict: 'nisn' });
      if (error) this.log('syncStudent error: ' + error.message, 'warn');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.log('syncStudent exception: ' + msg, 'warn');
    }
  }

  public async syncClass(cls: ClassRoom, supabaseAcademicYearId?: string): Promise<void> {
    if (!this.isAvailable() || !supabase) return;
    try {
      const ayId = supabaseAcademicYearId || cls.academicYearId;
      const { data: existing } = await supabase
        .from('classes')
        .select('id')
        .eq('name', cls.name)
        .maybeSingle();

      const payload = toSupabaseClass(cls, ayId);
      if (existing?.id) {
        const { error } = await supabase.from('classes').update(payload).eq('id', existing.id);
        if (error) this.log('syncClass update error: ' + error.message, 'warn');
      } else {
        const { error } = await supabase.from('classes').insert(payload);
        if (error) this.log('syncClass insert error: ' + error.message, 'warn');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.log('syncClass exception: ' + msg, 'warn');
    }
  }

  public async syncAcademicYear(ay: AcademicYear): Promise<void> {
    if (!this.isAvailable() || !supabase) return;
    try {
      const { error } = await supabase
        .from('academic_years')
        .upsert(toSupabaseAcademicYear(ay), { onConflict: 'year_label,semester' });
      if (error) this.log('syncAcademicYear error: ' + error.message, 'warn');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.log('syncAcademicYear exception: ' + msg, 'warn');
    }
  }

  public async syncSubject(subject: Subject): Promise<void> {
    if (!this.isAvailable() || !supabase) return;
    try {
      const { error } = await supabase
        .from('subjects')
        .upsert(toSupabaseSubject(subject), { onConflict: 'code' });
      if (error) this.log('syncSubject error: ' + error.message, 'warn');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.log('syncSubject exception: ' + msg, 'warn');
    }
  }

  public async syncExamPackage(pkg: ExamPackage, supabaseAcademicYearId?: string): Promise<void> {
    if (!this.isAvailable() || !supabase) return;
    try {
      const ayId = supabaseAcademicYearId || pkg.academicYearId;
      const { data: existing } = await supabase
        .from('exam_packages')
        .select('id')
        .eq('code', pkg.code)
        .maybeSingle();

      const payload = toSupabaseExamPackage(pkg, ayId);
      let pkgId: string | null = null;

      if (existing?.id) {
        pkgId = String(existing.id);
        const { error } = await supabase.from('exam_packages').update(payload).eq('id', pkgId);
        if (error) this.log('syncExamPackage update error: ' + error.message, 'warn');
      } else {
        const { data: inserted, error } = await supabase.from('exam_packages').insert(payload).select('id').single();
        if (error) {
          this.log('syncExamPackage insert error: ' + error.message, 'warn');
        } else if (inserted) {
          pkgId = String((inserted as any).id);
        }
      }

      // Sync slot mapel exam_package_subjects jika pkgId tersedia
      if (pkgId && Array.isArray(pkg.subjects) && pkg.subjects.length > 0) {
        for (const sub of pkg.subjects) {
          const subPayload = {
            package_id: pkgId,
            subject_id: sub.subjectId,
            teacher_id: sub.teacherId || null,
            google_form_url: sub.googleFormUrl || null,
            google_sheet_url: sub.googleSheetUrl || null,
            answer_key: sub.answerKey || [],
            total_questions: sub.totalQuestions || 40,
            duration_minutes: sub.durationMinutes || 60,
            passing_grade: sub.passingGrade || 75,
            sync_status: sub.syncStatus || 'SYNCED',
            last_updated_by: sub.lastUpdatedBy || null,
          };
          await supabase.from('exam_package_subjects').upsert(subPayload, { onConflict: 'package_id,subject_id' });
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.log('syncExamPackage exception: ' + msg, 'warn');
    }
  }

  public async removeExamPackageByCode(code: string): Promise<void> {
    if (!this.isAvailable() || !supabase) return;
    try {
      const { error } = await supabase.from('exam_packages').delete().eq('code', code.trim());
      if (error) this.log('removeExamPackageByCode error: ' + error.message, 'warn');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.log('removeExamPackageByCode exception: ' + msg, 'warn');
    }
  }

  public async syncTryout(to: Tryout, supabaseAcademicYearId?: string): Promise<void> {
    if (!this.isAvailable() || !supabase) return;
    try {
      const ayId = supabaseAcademicYearId || to.academicYearId;
      const { data: existing } = await supabase
        .from('tryouts')
        .select('id')
        .eq('code', to.code)
        .maybeSingle();

      const payload = toSupabaseTryout(to, ayId);
      if (existing?.id) {
        const { error } = await supabase.from('tryouts').update(payload).eq('id', existing.id);
        if (error) this.log('syncTryout update error: ' + error.message, 'warn');
      } else {
        const { error } = await supabase.from('tryouts').insert(payload);
        if (error) this.log('syncTryout insert error: ' + error.message, 'warn');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.log('syncTryout exception: ' + msg, 'warn');
    }
  }

  public async removeTryoutByCode(code: string): Promise<void> {
    if (!this.isAvailable() || !supabase) return;
    try {
      const { error } = await supabase.from('tryouts').delete().eq('code', code.trim());
      if (error) this.log('removeTryoutByCode error: ' + error.message, 'warn');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.log('removeTryoutByCode exception: ' + msg, 'warn');
    }
  }

  // ----------------------------------------------------------
  // DELETE METHODS
  // ----------------------------------------------------------

  public async removeTeacherByNip(nip: string): Promise<void> {
    if (!this.isAvailable() || !supabase) return;
    try {
      const { error } = await supabase
        .from('teachers')
        .delete()
        .eq('nip', nip.trim());
      if (error) this.log('removeTeacherByNip error: ' + error.message, 'warn');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.log('removeTeacherByNip exception: ' + msg, 'warn');
    }
  }

  public async removeStudentByNisn(nisn: string): Promise<void> {
    if (!this.isAvailable() || !supabase) return;
    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('nisn', nisn.trim());
      if (error) this.log('removeStudentByNisn error: ' + error.message, 'warn');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.log('removeStudentByNisn exception: ' + msg, 'warn');
    }
  }

  public async removeSubjectByCode(code: string): Promise<void> {
    if (!this.isAvailable() || !supabase) return;
    try {
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('code', code.trim());
      if (error) this.log('removeSubjectByCode error: ' + error.message, 'warn');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.log('removeSubjectByCode exception: ' + msg, 'warn');
    }
  }

  // ----------------------------------------------------------
  // REALTIME: Subscribe to changes from other devices
  // ----------------------------------------------------------

  /**
   * Subscribe ke Supabase Realtime untuk tabel-tabel inti.
   * Callback `onchange` dipanggil saat ada INSERT/UPDATE/DELETE dari perangkat lain.
   * @returns channel object (gunakan di unsubscribe() saat cleanup)
   */
  public subscribeToChanges(onchange: () => void): unknown {
    if (!this.isAvailable() || !supabase) return null;

    const TABLES = [
      'teachers', 'students', 'classes', 'subjects', 'academic_years', 'users',
      'exam_packages', 'exam_package_subjects', 'tryouts', 'scores'
    ];
    const channel = (supabase as any).channel('db-realtime-sync');

    TABLES.forEach((table: string) => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        (_payload: unknown) => { onchange(); }
      );
    });

    channel.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        console.info('[SupabaseDB] Realtime aktif — perubahan dari perangkat lain disinkronkan otomatis.');
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn('[SupabaseDB] Realtime error/timeout, fallback ke polling 30s.');
      }
    });

    return channel;
  }

  /**
   * Unsubscribe dari Realtime channel untuk cleanup.
   */
  public unsubscribe(channel: unknown): void {
    if (channel && supabase) {
      (supabase as any).removeChannel(channel).catch(() => {});
    }
  }

  // ----------------------------------------------------------
  // BULK EXPORT: Push all local state to Supabase
  // Called from Settings panel "Sync to Cloud" button
  // ----------------------------------------------------------
  public async exportAllToSupabase(state: {
    users: User[];
    teachers: Teacher[];
    students: Student[];
    classes: ClassRoom[];
    academicYears: AcademicYear[];
    subjects: Subject[];
    examPackages?: ExamPackage[];
    tryouts?: Tryout[];
  }): Promise<{ success: number; failed: number; errors: string[] }> {
    if (!this.isAvailable() || !supabase) {
      return { success: 0, failed: 0, errors: ['Supabase tidak terkonfigurasi.'] };
    }

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    const attempt = async (label: string, fn: () => Promise<void>) => {
      try {
        await fn();
        success++;
      } catch (err: unknown) {
        failed++;
        errors.push(`${label}: ${err instanceof Error ? err.message : String(err)}`);
      }
    };

    // 1. Academic Years
    for (const ay of state.academicYears) {
      await attempt(`AcademicYear ${ay.yearLabel}`, () => this.syncAcademicYear(ay));
    }

    // 2. Subjects
    for (const s of state.subjects) {
      await attempt(`Subject ${s.code}`, () => this.syncSubject(s));
    }

    // 3. Classes
    for (const c of state.classes) {
      await attempt(`Class ${c.name}`, () => this.syncClass(c));
    }

    // 4. Users + Teachers (paired)
    for (const t of state.teachers) {
      const user = state.users.find(u => u.id === t.userId || u.email.toLowerCase() === (t.email || '').toLowerCase());
      await attempt(`Teacher ${t.nip}`, () => this.syncTeacher(t, user));
    }

    // 5. Students
    for (const s of state.students) {
      await attempt(`Student ${s.nisn}`, () => this.syncStudent(s, s.classId));
    }

    // 6. Exam Packages (jika ada)
    if (state.examPackages && state.examPackages.length > 0) {
      for (const pkg of state.examPackages) {
        await attempt(`ExamPackage ${pkg.code}`, () => this.syncExamPackage(pkg));
      }
    }

    // 7. Tryouts (jika ada)
    if (state.tryouts && state.tryouts.length > 0) {
      for (const to of state.tryouts) {
        await attempt(`Tryout ${to.code}`, () => this.syncTryout(to));
      }
    }

    console.info(`[SupabaseDB] Export done: ${success} synced, ${failed} failed`);
    return { success, failed, errors };
  }
}

export const sdb = new SupabaseDbService();
