import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useToastStore, Toast, ToastType } from '../hooks/useToast';

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
  error: <XCircle className="w-4 h-4 text-rose-500" />,
  warning: <AlertTriangle className="w-4 h-4 text-amber-500" />,
  info: <Info className="w-4 h-4 text-blue-500" />,
};

const STYLES: Record<ToastType, string> = {
  success:
    'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/80',
  error:
    'border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/80',
  warning:
    'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/80',
  info:
    'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/80',
};

const TEXT_STYLES: Record<ToastType, string> = {
  success: 'text-emerald-900 dark:text-emerald-100',
  error: 'text-rose-900 dark:text-rose-100',
  warning: 'text-amber-900 dark:text-amber-100',
  info: 'text-blue-900 dark:text-blue-100',
};

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  return (
    <div
      className={`
        flex items-start gap-3 p-3.5 rounded-xl border shadow-lg backdrop-blur-sm
        max-w-sm w-full pointer-events-auto
        animate-in slide-in-from-right-full duration-300
        ${STYLES[toast.type]}
      `}
      role="alert"
      aria-live="polite"
    >
      <div className="shrink-0 mt-0.5">{ICONS[toast.type]}</div>

      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold leading-snug ${TEXT_STYLES[toast.type]}`}>
          {toast.title}
        </p>
        {toast.message && (
          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
            {toast.message}
          </p>
        )}
      </div>

      <button
        onClick={() => onRemove(toast.id)}
        className="shrink-0 p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        aria-label="Tutup notifikasi"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

/**
 * ToastContainer — Render container untuk semua notifikasi toast
 * Tempatkan sekali di App.tsx atau layout utama.
 * Tidak perlu props — menggunakan global state dari useToastStore.
 */
export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
      aria-label="Notifikasi sistem"
    >
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
}

export default ToastContainer;
