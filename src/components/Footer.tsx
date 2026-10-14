import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white dark:bg-[#070e17] text-slate-600 dark:text-slate-400 text-xs border-t border-slate-200 dark:border-slate-800/80 py-4.5 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            WIKAN
          </span>
          <span className="text-slate-300 dark:text-slate-700">&middot;</span>
          <span className="text-slate-500 dark:text-slate-400 italic">
            &ldquo;Ubah Data Menjadi Tindakan Nyata&rdquo;
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] justify-center sm:justify-end flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium">
            Dikembangkan oleh <span className="font-bold text-indigo-600 dark:text-indigo-400">MIDStudio</span> &copy; 2026
          </span>
        </div>
      </div>
    </footer>
  );
};

