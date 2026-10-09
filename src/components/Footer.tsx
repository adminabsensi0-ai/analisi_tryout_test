import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white dark:bg-[#070e17] text-slate-600 dark:text-slate-400 text-xs border-t border-slate-200 dark:border-slate-800/80 py-4.5 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            &copy; {new Date().getFullYear()} SMA Negeri 1 Utama
          </span>
          <span className="text-slate-300 dark:text-slate-700">&middot;</span>
          <span className="text-slate-500 dark:text-slate-400">
            Platform Penilaian &amp; Analisis Belajar Siswa
          </span>
        </div>
        <div className="flex items-center gap-2.5 text-[11px] justify-center flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 font-mono text-[10px] text-slate-600 dark:text-slate-300 transition-colors">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Standar Penilaian Terpadu</span>
          </span>
          <span className="text-slate-300 dark:text-slate-700">&middot;</span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 font-mono text-[10px] text-slate-600 dark:text-slate-300 transition-colors">
            Analisis Butir Soal &amp; Daya Beda
          </span>
        </div>
      </div>
    </footer>
  );
};

