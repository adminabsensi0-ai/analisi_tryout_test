import React, { useState } from 'react';
import {
  LogIn, Lock, Mail, ShieldAlert, GraduationCap, ArrowRight,
  CheckCircle2, RefreshCw, Award, Search, Calendar, UserCheck, Sparkles,
  Eye, EyeOff
} from 'lucide-react';
import { authService } from '../services/auth';
import { dbService } from '../services/database';
import { User } from '../types/database';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
  onNavigate?: (path: string) => void;
  returnTo?: string;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onNavigate, returnTo }) => {
  const [activeTab, setActiveTab] = useState<'STAFF_LOGIN' | 'STUDENT_LOOKUP'>('STAFF_LOGIN');
  
  // Staff Login State (Default empty for clean manual entry)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successNotice, setSuccessNotice] = useState('');

  // Student Quick Lookup State (Tanggal Lahir + NISN Siswa)
  const [birthDate, setBirthDate] = useState('');
  const [nisn, setNisn] = useState('');
  const [studentError, setStudentError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessNotice('');
    setLoading(true);

    try {
      const session = await authService.login(email, password);
      setSuccessNotice(`Autentikasi Berhasil! Mengalihkan ke panel ${session.user.role}...`);
      setTimeout(() => {
        onLoginSuccess(session.user);
      }, 350);
    } catch (err: any) {
      setError(err?.message || 'Gagal masuk. Periksa kembali email dan kata sandi Anda.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (targetEmail: string) => {
    setError('');
    setSuccessNotice('');
    setLoading(true);
    try {
      const session = await authService.login(targetEmail, 'password123');
      setSuccessNotice(`Demo login sebagai ${session.user.name} (${session.user.role}). Mengalihkan...`);
      setTimeout(() => {
        onLoginSuccess(session.user);
      }, 350);
    } catch (err: any) {
      setError(err?.message || 'Gagal memproses demo login.');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateInvalidLogin = async () => {
    setEmail('nonexistent@sekolah.sch.id');
    setPassword('wrongpassword');
    setError('');
    setLoading(true);
    setTimeout(() => {
      setError('Pengguna dengan email tersebut tidak ditemukan atau kata sandi tidak sesuai.');
      setLoading(false);
    }, 300);
  };

  const handleStudentLookup = (e: React.FormEvent) => {
    e.preventDefault();
    setStudentError('');

    if (!birthDate.trim() || !nisn.trim()) {
      setStudentError('Harap lengkapi Tanggal Lahir dan NISN Siswa.');
      return;
    }

    const verifiedStudent = dbService.getStudentByBirthDateAndNisn(birthDate.trim(), nisn.trim());
    if (verifiedStudent) {
      sessionStorage.setItem('verified_student_id', verifiedStudent.id);
      if (onNavigate) {
        onNavigate('/hasil');
      } else {
        window.location.href = '/hasil';
      }
    } else {
      setStudentError('Kombinasi Tanggal Lahir dan NISN Siswa tidak ditemukan.');
    }
  };

  const handleQuickStudentDemo = (demoDate: string, demoNisn: string) => {
    setBirthDate(demoDate);
    setNisn(demoNisn);
    setStudentError('');
    const verified = dbService.getStudentByBirthDateAndNisn(demoDate, demoNisn);
    if (verified) {
      sessionStorage.setItem('verified_student_id', verified.id);
      if (onNavigate) {
        onNavigate('/hasil');
      } else {
        window.location.href = '/hasil';
      }
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 dark:bg-slate-950 relative overflow-hidden flex items-center justify-center px-4 py-12 font-sans text-slate-900 dark:text-slate-100 transition-colors">
      {/* Ambient Background Glow Accent */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-md w-full bg-white dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-xl dark:shadow-2xl dark:shadow-indigo-950/50 overflow-hidden border border-slate-200 dark:border-slate-800 transition-colors">
        
        {/* Header Portal */}
        <div className="bg-slate-50 dark:bg-slate-950 p-6 text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 text-center transition-colors">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl mx-auto flex items-center justify-center text-white mb-3 shadow-md shadow-indigo-600/20">
            <GraduationCap className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Portal Assessment Terpadu</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            SMA Negeri 1 Utama — Assessment Analytics Portal
          </p>

          {returnTo && (
            <div className="mt-3 p-2 bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 rounded-lg text-[11px] text-indigo-700 dark:text-indigo-300">
              Akses tujuan: <span className="font-mono font-semibold">{returnTo}</span>. Silakan autentikasi terlebih dahulu.
            </div>
          )}

          {/* Unified Tab Switcher */}
          <div className="mt-5 p-1 bg-slate-200/80 dark:bg-slate-900 border border-slate-300/80 dark:border-slate-800 rounded-xl flex items-center text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('STAFF_LOGIN')}
              className={`flex-1 py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'STAFF_LOGIN'
                  ? 'bg-indigo-600 text-white shadow-sm font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-300/40 dark:hover:bg-slate-800/50'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Login Guru &amp; Admin</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('STUDENT_LOOKUP')}
              className={`flex-1 py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'STUDENT_LOOKUP'
                  ? 'bg-indigo-600 text-white shadow-sm font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-300/40 dark:hover:bg-slate-800/50'
              }`}
            >
              <Award className="w-3.5 h-3.5 text-amber-500 dark:text-amber-300" />
              <span>Portal Hasil Siswa</span>
            </button>
          </div>
        </div>

        {/* Tab Body */}
        <div className="p-6 space-y-5 bg-white dark:bg-slate-900">
          {activeTab === 'STAFF_LOGIN' ? (
            <div>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>Email, NIP, atau ID Akun</span>
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-normal">Admin: ketik <code className="bg-indigo-50 dark:bg-indigo-950 px-1 py-0.5 rounded font-bold font-mono">admin</code></span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="admin@sekolah.com atau ketik 'admin'"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                      required
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>Kata Sandi</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">Sandi Admin: <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono font-bold text-slate-700 dark:text-slate-300">admin123</code></span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Masukkan kata sandi (admin: admin123)..."
                      className="w-full pl-9 pr-10 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                      required
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                      title={showPassword ? 'Sembunyikan Kata Sandi' : 'Tampilkan Kata Sandi'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-200 text-xs rounded-xl flex items-start gap-2.5">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                    <span>{error}</span>
                  </div>
                )}

                {successNotice && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs rounded-xl flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>{successNotice}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-60 text-white font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer border border-indigo-400/30"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Memproses Autentikasi...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Masuk Sistem Staf</span>
                    </>
                  )}
                </button>
              </form>

              {/* Quick Demo Login Presets */}
              <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500 dark:text-amber-400" />
                    Akses Cepat (1-Klik)
                  </span>
                  <button
                    type="button"
                    onClick={handleSimulateInvalidLogin}
                    className="text-[10px] text-rose-600 dark:text-rose-400 hover:underline font-semibold"
                  >
                    Uji Invalid Login
                  </button>
                </div>

                <div className="space-y-2">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleQuickDemoLogin('admin@sekolah.com')}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950/80 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/50 border border-slate-200 dark:border-slate-800 rounded-xl text-left text-xs font-medium text-slate-900 dark:text-slate-100 flex items-center justify-between transition-all group cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          Login Admin Utama
                        </span>
                        <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-1.5 py-0.5 rounded font-mono font-bold">
                          ADMIN
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        admin@sekolah.com (sandi: admin123) &rarr; Panel Admin
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                  </button>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleQuickDemoLogin('bambang@sekolah.sch.id')}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950/80 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/50 border border-slate-200 dark:border-slate-800 rounded-xl text-left text-xs font-medium text-slate-900 dark:text-slate-100 flex items-center justify-between transition-all group cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          Demo Wali Kelas XII IPA 1
                        </span>
                        <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.5 rounded font-mono font-bold">
                          WALI KELAS
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        Drs. Bambang Sugiarto &rarr; Dashboard Utama Wali Kelas (Bisa Pindah Mode Guru Mapel)
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
                  </button>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleQuickDemoLogin('rifai@sekolah.sch.id')}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950/80 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/50 border border-slate-200 dark:border-slate-800 rounded-xl text-left text-xs font-medium text-slate-900 dark:text-slate-100 flex items-center justify-between transition-all group cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          Demo Guru Pengampu Fisika
                        </span>
                        <span className="text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-1.5 py-0.5 rounded font-mono font-bold">
                          GURU
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        Ahmad Rifai, M.Pd &rarr; Aplikasi Guru
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
                Masukkan Tanggal Lahir dan NISN Siswa Anda untuk memverifikasi identitas dan membuka Rapor Try Out Mandiri.
              </p>

              <form onSubmit={handleStudentLookup} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Tanggal Lahir Siswa
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={birthDate}
                      onChange={e => setBirthDate(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors scheme-dark"
                      required
                    />
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    NISN Siswa (Nomor Induk Siswa Nasional)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={nisn}
                      onChange={e => setNisn(e.target.value)}
                      placeholder="10 digit NISN, contoh: 0061234561"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                      required
                    />
                    <UserCheck className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>

                {studentError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-200 text-xs rounded-xl flex items-start gap-2.5">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                    <span>{studentError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer border border-indigo-400/30"
                >
                  <Search className="w-4 h-4" />
                  <span>Verifikasi &amp; Buka Hasil Siswa</span>
                </button>
              </form>

              {/* Quick Student Demo Button */}
              <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2.5 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500 dark:text-amber-400" />
                  Akses Cepat Siswa Demo (1-Klik)
                </span>
                <button
                  type="button"
                  onClick={() => handleQuickStudentDemo('2008-05-14', '0061234561')}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950/80 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/50 border border-slate-200 dark:border-slate-800 rounded-xl text-left text-xs font-medium text-slate-900 dark:text-slate-100 flex items-center justify-between transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <div>
                      <span className="font-bold text-slate-900 dark:text-slate-100 block group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        Aditya Pratama (Siswa)
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        Tgl Lahir: 14 Mei 2008 · NISN: 0061234561
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
