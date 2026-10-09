import React from 'react';
import { ShieldAlert, ArrowLeft, LogIn, LogOut, CheckCircle2 } from 'lucide-react';
import { User, Role } from '../types/database';
import { authService, AccessStatus } from '../services/auth';

interface ProtectedRouteProps {
  currentUser: User | null;
  targetPath: string;
  requiredRole?: Role | Role[];
  onNavigate: (path: string) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  currentUser,
  targetPath,
  requiredRole,
  onNavigate,
  onLogout,
  children,
}) => {
  const access: AccessStatus = authService.verifyRouteAccess(targetPath, currentUser);

  // If route is allowed
  if (access.allowed) {
    return <>{children}</>;
  }

  // If unauthenticated (no session)
  if (access.reason === 'UNAUTHENTICATED') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm text-center">
          <div className="w-14 h-14 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <LogIn className="w-7 h-7" />
          </div>

          <h2 className="text-lg font-bold text-slate-900 tracking-tight mb-2">
            Autentikasi Diperlukan
          </h2>

          <p className="text-xs text-slate-600 leading-relaxed mb-6">
            {access.message}
          </p>

          <div className="space-y-3">
            <button
              onClick={() => onNavigate(access.redirectPath)}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <LogIn className="w-4 h-4" />
              <span>Masuk ke Halaman Login</span>
            </button>

            <button
              onClick={() => onNavigate('/')}
              className="w-full py-2 px-4 bg-slate-50 hover:bg-slate-100 text-slate-600 font-semibold text-xs rounded-xl transition-colors"
            >
              Kembali ke Beranda
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If forbidden (role mismatch, e.g. GURU accessing /admin)
  if (access.reason === 'FORBIDDEN') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
        <div className="max-w-lg w-full bg-white rounded-2xl p-6 sm:p-8 border border-rose-200 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl flex items-center justify-center shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div className="flex-1">
              <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block mb-1">
                Akses Ditolak · 403 Forbidden
              </span>
              <h2 className="text-base font-bold text-slate-900 tracking-tight mb-2">
                Otorisasi Peran Tidak Mencukupi
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                {access.message}
              </p>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1 font-medium text-slate-700 mb-6">
                <div>
                  <span className="text-slate-500">Pengguna Aktif:</span> {currentUser?.name}
                </div>
                <div>
                  <span className="text-slate-500">Peran Akun:</span>{' '}
                  <span className="font-mono font-bold text-indigo-600">{currentUser?.role}</span>
                </div>
                <div>
                  <span className="text-slate-500">Target Halaman:</span>{' '}
                  <span className="font-mono text-slate-800">{targetPath}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => onNavigate(access.redirectPath)}
                  className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Beralih ke Portal {currentUser?.role === 'GURU' ? 'Aplikasi Guru' : 'Hasil Siswa'}</span>
                </button>

                <button
                  onClick={onLogout}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Ganti Akun</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
