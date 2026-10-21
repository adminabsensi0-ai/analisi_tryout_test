import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * ErrorBoundary — Menangkap runtime errors di subtree komponen React
 * Menampilkan UI fallback yang informatif alih-alih layar putih kosong
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ error, errorInfo });
    // Log error ke console (di produksi, kirim ke Sentry/LogRocket)
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4 py-12">
          <div className="max-w-lg w-full bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-rose-200 dark:border-rose-900 overflow-hidden">
            {/* Header */}
            <div className="bg-rose-50 dark:bg-rose-950/50 border-b border-rose-200 dark:border-rose-800 p-6 flex items-start gap-4">
              <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900 rounded-xl flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                  Terjadi Kesalahan Aplikasi
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Komponen mengalami error yang tidak terduga. Data Anda aman —
                  ini adalah masalah tampilan, bukan data.
                </p>
              </div>
            </div>

            {/* Error Details */}
            <div className="p-6 space-y-4">
              {this.state.error && (
                <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Detail Error
                  </p>
                  <p className="text-xs font-mono text-rose-700 dark:text-rose-300 break-all font-bold">
                    {this.state.error.message}
                  </p>
                  {this.state.error.stack && (
                    <div className="mt-2 text-left">
                      <p className="text-[10px] font-mono text-slate-400 mb-1">Stack Trace:</p>
                      <pre className="text-[10px] font-mono text-rose-600 dark:text-rose-400 p-2 bg-rose-50/50 dark:bg-rose-950/30 rounded border border-rose-200 dark:border-rose-900/40 overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap">
                        {this.state.error.stack}
                      </pre>
                    </div>
                  )}
                  {this.state.errorInfo?.componentStack && (
                    <div className="mt-2 text-left">
                      <p className="text-[10px] font-mono text-slate-400 mb-1">Component Stack:</p>
                      <pre className="text-[10px] font-mono text-slate-500 p-2 bg-slate-100 dark:bg-slate-900 rounded overflow-x-auto max-h-36 overflow-y-auto whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={this.handleReset}
                  className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Coba Lagi</span>
                </button>

                <button
                  onClick={this.handleGoHome}
                  className="flex-1 py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Home className="w-4 h-4" />
                  <span>Kembali ke Beranda</span>
                </button>
              </div>

              <p className="text-[10px] text-slate-400 dark:text-slate-600 text-center leading-relaxed">
                Jika masalah berulang, hubungi administrator sistem atau bersihkan
                cache browser Anda (Ctrl+Shift+Delete).
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
