/**
 * useToast — Custom hook untuk sistem notifikasi toast global
 * Menggantikan browser alert() / confirm() dengan UI yang konsisten
 */

import { useState, useCallback, useRef } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number; // ms, default 4000. 0 = persistent
}

interface ToastState {
  toasts: Toast[];
}

let globalAddToast: ((toast: Omit<Toast, 'id'>) => void) | null = null;

/**
 * Hook untuk menggunakan toast dari komponen manapun
 * Gunakan bersama <ToastContainer /> di App.tsx
 */
export function useToast() {
  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    if (globalAddToast) {
      globalAddToast(toast);
    }
  }, []);

  const toast = {
    success: (title: string, message?: string, duration?: number) =>
      addToast({ type: 'success', title, message, duration }),

    error: (title: string, message?: string, duration?: number) =>
      addToast({ type: 'error', title, message, duration: duration ?? 6000 }),

    warning: (title: string, message?: string, duration?: number) =>
      addToast({ type: 'warning', title, message, duration }),

    info: (title: string, message?: string, duration?: number) =>
      addToast({ type: 'info', title, message, duration }),
  };

  return { toast };
}

/**
 * useToastStore — Internal state management untuk ToastContainer
 * Gunakan HANYA di komponen ToastContainer
 */
export function useToastStore() {
  const [state, setState] = useState<ToastState>({ toasts: [] });
  const counterRef = useRef(0);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    counterRef.current += 1;
    const id = `toast-${Date.now()}-${counterRef.current}`;
    const newToast: Toast = { duration: 4000, ...toast, id };

    setState(prev => ({
      toasts: [...prev.toasts, newToast],
    }));

    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        setState(prev => ({
          toasts: prev.toasts.filter(t => t.id !== id),
        }));
      }, newToast.duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setState(prev => ({
      toasts: prev.toasts.filter(t => t.id !== id),
    }));
  }, []);

  // Expose addToast globally agar bisa dipanggil dari hook useToast
  globalAddToast = addToast;

  return { toasts: state.toasts, addToast, removeToast };
}
