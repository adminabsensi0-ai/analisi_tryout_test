import React from 'react';

interface SkeletonProps {
  className?: string;
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

/** Skeleton element dasar */
function Skeleton({ className = '', rounded = 'md' }: SkeletonProps) {
  const roundedClass = {
    sm: 'rounded',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    full: 'rounded-full',
  }[rounded];

  return (
    <div
      className={`animate-pulse bg-slate-200 dark:bg-slate-800 ${roundedClass} ${className}`}
      aria-hidden="true"
    />
  );
}

/** Skeleton untuk card statistik */
export function StatCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
      <div className="flex items-start justify-between mb-4">
        <Skeleton className="w-10 h-10" rounded="xl" />
        <Skeleton className="w-16 h-5" rounded="full" />
      </div>
      <Skeleton className="w-20 h-7 mb-1" />
      <Skeleton className="w-32 h-4" />
    </div>
  );
}

/** Skeleton untuk baris tabel */
export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className={`h-4 ${i === 0 ? 'w-8' : i === 1 ? 'w-32' : 'w-16'}`} />
        </td>
      ))}
    </tr>
  );
}

/** Skeleton untuk halaman secara keseluruhan */
export function PageSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="flex items-center gap-4">
        <Skeleton className="w-12 h-12" rounded="xl" />
        <div className="space-y-2">
          <Skeleton className="w-48 h-6" />
          <Skeleton className="w-32 h-4" />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <Skeleton className="w-40 h-5" />
        </div>
        <table className="w-full">
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRowSkeleton key={i} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export { Skeleton };
export default Skeleton;
