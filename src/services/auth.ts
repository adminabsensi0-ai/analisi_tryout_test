import { User, Role } from '../types/database';
import { dbService } from './database';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const AUTH_USER_KEY = 'school_analytics_auth_user';
const AUTH_SESSION_KEY = 'school_analytics_auth_session_id';

export interface AuthSession {
  user: User;
  sessionId: string;
}

export type AccessStatus =
  | { allowed: true }
  | { allowed: false; reason: 'UNAUTHENTICATED'; message: string; redirectPath: string }
  | { allowed: false; reason: 'FORBIDDEN'; message: string; redirectPath: string };

/**
 * AuthService — Layanan Autentikasi
 *
 * Mode Operasi:
 * 1. DEMO MODE (default): Tidak memerlukan Supabase. Autentikasi berbasis
 *    mockData tanpa menyimpan password di localStorage.
 * 2. PRODUCTION MODE: Menggunakan Supabase Auth untuk autentikasi aman.
 *
 * KEAMANAN:
 * - Password TIDAK PERNAH disimpan di localStorage
 * - User object yang disimpan TIDAK mengandung field password
 * - Token sesi di-generate secara kriptografis (DEMO) atau dari Supabase (PROD)
 * - Tidak ada master password / backdoor hardcoded
 */
class AuthService {
  private currentUser: User | null = null;
  private sessionId: string | null = null;
  private listeners: Array<(user: User | null) => void> = [];

  constructor() {
    this.restoreSession();
  }

  /** Restore sesi dari storage — TANPA menyimpan password */
  private restoreSession() {
    try {
      const storedUser = localStorage.getItem(AUTH_USER_KEY);
      const storedSessionId = localStorage.getItem(AUTH_SESSION_KEY);

      if (storedUser && storedSessionId) {
        const parsedUser: User = JSON.parse(storedUser);
        // Pastikan password TIDAK ada di objek yang di-restore
        const safeUser = this.sanitizeUser(parsedUser);
        this.currentUser = safeUser;
        this.sessionId = storedSessionId;
      }
    } catch (err) {
      console.warn('[Auth] Gagal restore sesi:', err);
      this.clearSession();
    }
  }

  /** Hapus field sensitif dari objek user sebelum disimpan */
  private sanitizeUser(user: User): User {
    const safeUser = { ...user };
    // Hapus field password — tidak boleh ada di localStorage
    delete safeUser.password;
    return safeUser;
  }

  /** Generate session ID yang tidak mudah diprediksi */
  private generateSessionId(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  private persistSession(user: User) {
    try {
      const safeUser = this.sanitizeUser(user);
      const sessionId = this.generateSessionId();

      // Simpan user tanpa password
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(safeUser));
      localStorage.setItem(AUTH_SESSION_KEY, sessionId);

      this.currentUser = safeUser;
      this.sessionId = sessionId;
      this.notifyListeners();
    } catch (err) {
      console.error('[Auth] Gagal menyimpan sesi:', err);
    }
  }

  private clearSession() {
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(AUTH_SESSION_KEY);
    this.currentUser = null;
    this.sessionId = null;
    this.notifyListeners();
  }

  public subscribe(listener: (user: User | null) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(fn => fn(this.currentUser));
  }

  public refreshSession(): void {
    if (this.currentUser) {
      const state = dbService.getState();
      const updatedUser = state.users.find(
        u => u.id === this.currentUser?.id ||
             u.email.toLowerCase() === this.currentUser?.email.toLowerCase()
      );
      if (updatedUser) {
        this.persistSession(updatedUser);
      }
    }
  }

  public getCurrentUser(): User | null {
    if (!this.currentUser) {
      this.restoreSession();
    }
    return this.currentUser;
  }

  public getSessionId(): string | null {
    return this.sessionId;
  }

  public isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  public hasRole(role: Role): boolean {
    return this.currentUser?.role === role;
  }

  /**
   * Login dengan Email atau NIP
   *
   * PRODUCTION MODE: Menggunakan Supabase Auth
   * DEMO MODE: Verifikasi terhadap mockData — password field dari DB
   *            diverifikasi tanpa disimpan kembali ke localStorage.
   *
   * ⚠️ CATATAN DEVELOPER: Dalam demo mode, password disimpan di mockData.ts
   * BUKAN di localStorage. Untuk produksi, password harus di-hash di Supabase Auth.
   * Tidak ada master password atau backdoor.
   */
  public async login(emailOrNip: string, password: string): Promise<AuthSession> {
    const identifier = emailOrNip.trim().toLowerCase();

    if (!identifier) {
      throw new Error('Harap masukkan Email atau NIP kedinasan Anda.');
    }

    if (!password || password.length < 3) {
      throw new Error('Kata sandi harus diisi dengan minimal 3 karakter.');
    }

    // === PRODUCTION MODE: Supabase Auth ===
    if (isSupabaseConfigured() && supabase) {
      return this.loginWithSupabase(identifier, password);
    }

    // === DEMO MODE: Verifikasi terhadap mockData ===
    return this.loginWithMockData(identifier, password);
  }

  /** Login menggunakan Supabase Auth (Production) */
  private async loginWithSupabase(emailOrNip: string, password: string): Promise<AuthSession> {
    if (!supabase) throw new Error('Supabase tidak terkonfigurasi.');

    // Cari email dari NIP jika input bukan email
    let email = emailOrNip;
    if (!emailOrNip.includes('@')) {
      const state = dbService.getState();
      const teacherMatch = state.teachers.find(
        t => t.nip.trim().toLowerCase() === emailOrNip
      );
      if (teacherMatch) {
        const userMatch = state.users.find(u => u.id === teacherMatch.userId);
        if (userMatch) email = userMatch.email.toLowerCase();
      }
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      throw new Error(error?.message || 'Autentikasi Supabase gagal.');
    }

    // Ambil profil user dari database lokal
    const state = dbService.getState();
    const localUser = state.users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!localUser) {
      throw new Error('Akun tidak ditemukan dalam database sistem. Hubungi Admin.');
    }

    this.persistSession(localUser);

    dbService.logAudit(
      localUser,
      'LOGIN',
      'AUTH',
      `Autentikasi Supabase berhasil: ${localUser.name} (${localUser.role}).`
    );

    return { user: this.currentUser!, sessionId: this.sessionId! };
  }

  /** Login menggunakan mockData (Demo Mode) */
  private async loginWithMockData(identifier: string, password: string): Promise<AuthSession> {
    const state = dbService.getState();
    const { users, teachers } = state;

    // Cari user berdasarkan email
    let user = users.find(u => u.email.toLowerCase() === identifier);

    // Jika tidak ketemu, cari berdasarkan NIP
    if (!user) {
      const teacherMatch = teachers.find(
        t => t.nip.trim().toLowerCase() === identifier ||
             (t.phone && t.phone.trim() === identifier)
      );
      if (teacherMatch) {
        user = users.find(
          u => u.id === teacherMatch.userId ||
               u.email.toLowerCase() === teacherMatch.email.toLowerCase()
        );
      }
    }

    if (!user) {
      throw new Error('Email atau NIP kedinasan tidak ditemukan dalam database sistem.');
    }

    // Verifikasi password dari DB user (bukan hardcoded)
    // Password disimpan di mockData untuk demo — di produksi gunakan Supabase Auth
    const storedPassword = user.password;
    if (!storedPassword) {
      throw new Error(
        'Akun ini belum memiliki kata sandi yang dikonfigurasi. Hubungi Administrator.'
      );
    }

    if (storedPassword !== password) {
      throw new Error('Kata sandi yang Anda masukkan salah. Periksa kembali kata sandi Anda.');
    }

    this.persistSession(user);

    dbService.logAudit(
      user,
      'LOGIN',
      'AUTH',
      `Autentikasi berhasil (demo mode): ${user.name} (${user.role}) masuk menggunakan ${identifier.includes('@') ? 'Email' : 'NIP'}.`
    );

    return { user: this.currentUser!, sessionId: this.sessionId! };
  }

  /** Logout dan bersihkan sesi */
  public async logout(): Promise<void> {
    const user = this.currentUser;
    if (user) {
      dbService.logAudit(
        user,
        'LOGOUT',
        'AUTH',
        `Pengguna ${user.name} (${user.role}) keluar dari sesi aplikasi.`
      );
    }

    // Logout dari Supabase jika production mode
    if (isSupabaseConfigured() && supabase) {
      await supabase.auth.signOut();
    }

    this.clearSession();
  }

  /** Verifikasi akses ke route terproteksi */
  public verifyRouteAccess(path: string, user: User | null = this.currentUser): AccessStatus {
    const normalizedPath = path.split('?')[0];

    // Public routes
    if (
      normalizedPath === '/' ||
      normalizedPath === '/hasil' ||
      normalizedPath === '/login'
    ) {
      return { allowed: true };
    }

    // Protected: /admin
    if (normalizedPath === '/admin' || normalizedPath.startsWith('/admin/')) {
      if (!user) {
        return {
          allowed: false,
          reason: 'UNAUTHENTICATED',
          message: 'Sesi kedaluwarsa atau belum masuk. Silakan login menggunakan akun Admin untuk mengakses Panel Admin.',
          redirectPath: `/login?returnTo=${encodeURIComponent(path)}`,
        };
      }
      if (user.role !== 'ADMIN') {
        dbService.logAudit(
          user,
          'UNAUTHORIZED_ACCESS_ATTEMPT',
          'SECURITY',
          `Akses ditolak (403): ${user.name} (${user.role}) mencoba mengakses ${path}.`
        );
        return {
          allowed: false,
          reason: 'FORBIDDEN',
          message: `Akses Ditolak (403 Forbidden): Akun Anda (${user.name}) memiliki peran '${user.role}' dan tidak memiliki hak akses untuk membuka Panel Admin (/admin).`,
          redirectPath: '/guru',
        };
      }
      return { allowed: true };
    }

    // Protected: /wali-kelas
    if (normalizedPath === '/wali-kelas' || normalizedPath.startsWith('/wali-kelas/')) {
      if (!user) {
        return {
          allowed: false,
          reason: 'UNAUTHENTICATED',
          message: 'Silakan login menggunakan akun Wali Kelas, Guru, atau Admin.',
          redirectPath: `/login?returnTo=${encodeURIComponent(path)}`,
        };
      }
      if (user.role !== 'WALI_KELAS' && user.role !== 'GURU' && user.role !== 'ADMIN') {
        dbService.logAudit(
          user,
          'UNAUTHORIZED_ACCESS_ATTEMPT',
          'SECURITY',
          `Akses ditolak (403): ${user.name} (${user.role}) mencoba mengakses ${path}.`
        );
        return {
          allowed: false,
          reason: 'FORBIDDEN',
          message: `Akses Ditolak (403 Forbidden): Akun Anda tidak memiliki hak akses untuk membuka Dashboard Wali Kelas (/wali-kelas).`,
          redirectPath: '/hasil',
        };
      }
      return { allowed: true };
    }

    // Protected: /guru
    if (normalizedPath === '/guru' || normalizedPath.startsWith('/guru/')) {
      if (!user) {
        return {
          allowed: false,
          reason: 'UNAUTHENTICATED',
          message: 'Silakan login menggunakan akun Guru atau Admin untuk mengakses Aplikasi Guru.',
          redirectPath: `/login?returnTo=${encodeURIComponent(path)}`,
        };
      }
      if (user.role !== 'GURU' && user.role !== 'ADMIN' && user.role !== 'WALI_KELAS') {
        dbService.logAudit(
          user,
          'UNAUTHORIZED_ACCESS_ATTEMPT',
          'SECURITY',
          `Akses ditolak (403): ${user.name} (${user.role}) mencoba mengakses ${path}.`
        );
        return {
          allowed: false,
          reason: 'FORBIDDEN',
          message: `Akses Ditolak (403 Forbidden): Akun Anda tidak memiliki hak akses pengajar untuk membuka Aplikasi Guru (/guru).`,
          redirectPath: '/hasil',
        };
      }
      return { allowed: true };
    }

    return { allowed: true };
  }
}

export const authService = new AuthService();
