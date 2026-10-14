import React from 'react';
import { Search, ShieldAlert, AlertTriangle, ShieldCheck } from 'lucide-react';

interface StudentVerificationGateProps {
  birthDateInput: string;
  setBirthDateInput: (val: string) => void;
  nisnInput: string;
  setNisnInput: (val: string) => void;
  isLockedOut: boolean;
  lockoutTimer: number;
  failedAttempts: number;
  errorMessage: string;
  loading: boolean;
  onVerify: (e?: React.FormEvent, overrideBirthDate?: string, overrideNisn?: string) => void;
}

export const StudentVerificationGate: React.FC<StudentVerificationGateProps> = ({
  birthDateInput,
  setBirthDateInput,
  nisnInput,
  setNisnInput,
  isLockedOut,
  lockoutTimer,
  failedAttempts,
  errorMessage,
  loading,
  onVerify,
}) => {

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden transition-all">
        {/* Header Visual Bar */}
        <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-900 p-6 sm:p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-2.5 text-indigo-200 text-xs font-bold uppercase tracking-wider mb-2 font-mono">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Gerbang Pengumuman Resmi Siswa</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Verifikasi Identitas Siswa
          </h2>
          <p className="text-xs sm:text-sm text-indigo-100/90 mt-2 leading-relaxed">
            Silakan masukkan Tanggal Lahir dan Nomor Induk Siswa Nasional (NISN) Anda untuk mengakses laporan hasil ujian, grafik perkembangan belajar, lembar rekap butir soal, serta materi pembahasan resmi.
          </p>
        </div>

        {/* Verification Form Body */}
        <div className="p-6 sm:p-8 space-y-6">
          <form onSubmit={e => onVerify(e)} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                1. Tanggal Lahir Siswa <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={birthDateInput}
                onChange={e => setBirthDateInput(e.target.value)}
                disabled={isLockedOut}
                placeholder="YYYY-MM-DD"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium disabled:opacity-60 transition-all scheme-dark"
                required
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Masukkan tanggal lahir Anda sesuai data Dapodik sekolah.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                2. NISN Siswa (10 Digit) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={nisnInput}
                onChange={e => setNisnInput(e.target.value.replace(/\D/g, ''))}
                disabled={isLockedOut}
                maxLength={10}
                placeholder="Contoh: 0061234561"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-medium disabled:opacity-60 transition-all"
                required
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                10 digit angka Nomor Induk Siswa Nasional yang tercantum di kartu pelajar.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || isLockedOut || !birthDateInput.trim() || !nisnInput.trim()}
              className="w-full py-3.5 px-6 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg cursor-pointer transform active:scale-98"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Memverifikasi Identitas...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Lihat Pengumuman Hasil Try Out</span>
                </>
              )}
            </button>
          </form>

          {/* Rate Limiting Active Banner */}
          {isLockedOut && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs rounded-2xl flex items-center gap-3 animate-pulse">
              <ShieldAlert className="w-6 h-6 text-rose-600 dark:text-rose-400 shrink-0" />
              <div>
                <strong className="block font-bold">Akses Sementara Dikunci (Keamanan Sistem):</strong>
                <span>
                  Terlalu banyak percobaan gagal ({failedAttempts}x). Silakan tunggu{' '}
                  <strong className="font-mono text-rose-700 dark:text-rose-300 font-bold">{lockoutTimer} detik</strong> sebelum mencoba kembali.
                </span>
              </div>
            </div>
          )}

          {/* Error Notice */}
          {!isLockedOut && errorMessage && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-200 text-xs rounded-2xl flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" />
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
          )}

        </div>

        {/* Security Assurance Footer */}
        <div className="bg-slate-50 dark:bg-slate-950/60 px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Kerahasiaan Data Terlindungi — Student Isolation Active</span>
          </div>
          <span className="font-mono font-semibold">WIKAN System</span>
        </div>
      </div>
    </div>
  );
};
