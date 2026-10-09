import React from 'react';
import { AlertTriangle, Trash2, X, CheckCircle2 } from 'lucide-react';

export type ConfirmDialogVariant = 'danger' | 'warning' | 'info';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmDialogVariant;
  onConfirm: () => void;
  onCancel: () => void;
}

const VARIANT_STYLES = {
  danger: {
    icon: <Trash2 className="w-6 h-6 text-rose-600 dark:text-rose-400" />,
    iconBg: 'bg-rose-100 dark:bg-rose-900/50',
    confirmBtn: 'bg-rose-600 hover:bg-rose-500 active:bg-rose-700',
    border: 'border-rose-200 dark:border-rose-800',
  },
  warning: {
    icon: <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />,
    iconBg: 'bg-amber-100 dark:bg-amber-900/50',
    confirmBtn: 'bg-amber-600 hover:bg-amber-500 active:bg-amber-700',
    border: 'border-amber-200 dark:border-amber-800',
  },
  info: {
    icon: <CheckCircle2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />,
    iconBg: 'bg-indigo-100 dark:bg-indigo-900/50',
    confirmBtn: 'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700',
    border: 'border-indigo-200 dark:border-indigo-800',
  },
};

/**
 * ConfirmDialog — Modal konfirmasi yang menggantikan browser confirm()
 * Gunakan untuk aksi destruktif (hapus, reset) atau konfirmasi penting
 */
export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Konfirmasi',
  cancelText = 'Batal',
  variant = 'warning',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const styles = VARIANT_STYLES[variant];

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      {/* Dialog box */}
      <div
        className={`
          bg-white dark:bg-slate-900 rounded-2xl shadow-2xl
          border ${styles.border}
          max-w-md w-full overflow-hidden
          animate-in zoom-in-95 duration-200
        `}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 pb-4 flex items-start gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${styles.iconBg}`}>
            {styles.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3
              id="confirm-dialog-title"
              className="text-sm font-bold text-slate-900 dark:text-white mb-1 leading-snug"
            >
              {title}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {message}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="shrink-0 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Tutup dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex flex-col sm:flex-row gap-2.5 sm:justify-end">
          <button
            onClick={onCancel}
            className="py-2.5 px-5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onCancel();
            }}
            className={`py-2.5 px-5 text-white font-semibold text-xs rounded-xl transition-colors shadow-sm ${styles.confirmBtn}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
