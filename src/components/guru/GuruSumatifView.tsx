import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell
} from 'recharts';
import {
  Award, CheckCircle2, AlertTriangle, HelpCircle, FileCheck, Users,
  BarChart3, CheckSquare, Search, Filter
} from 'lucide-react';
import { TeacherSumatifAnalytics } from '../../services/sumatifAnalytics';

interface GuruSumatifViewProps {
  analytics: TeacherSumatifAnalytics;
}

export const GuruSumatifView: React.FC<GuruSumatifViewProps> = ({ analytics }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── HEADER SUMMARY CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Rata-rata Kelas
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
              {analytics.averageScore}
            </span>
            <span className="text-xs text-slate-400">/ 100</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Batas KKTP: {analytics.passingGrade}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Tingkat Ketuntasan
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {analytics.passingRatePct}%
            </span>
            <span className="text-xs text-slate-400">({analytics.passingCount} siswa)</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-medium mt-1 block">
            Tuntas ≥ KKTP
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Siswa Perlu Remedial
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className={`text-2xl font-black ${analytics.remedialCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>
              {analytics.remedialCount}
            </span>
            <span className="text-xs text-slate-400">siswa</span>
          </div>
          <span className="text-[10px] text-rose-500 font-medium mt-1 block">
            Nilai &lt; KKTP ({analytics.passingGrade})
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Rentang Nilai
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold text-teal-600 dark:text-teal-400">
              {analytics.highestScore}
            </span>
            <span className="text-xs text-slate-400">s/d</span>
            <span className="text-xl font-bold text-amber-600 dark:text-amber-400">
              {analytics.lowestScore}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Tertinggi / Terendah
          </span>
        </div>
      </div>

      {/* ── GRAFIK TINGKAT KESUKARAN BUTIR SOAL PER NOMOR ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Distribusi Tingkat Ketercapaian per Nomor Soal
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Persentase siswa yang menjawab benar (P-Value) untuk setiap nomor soal. Batang merah menunjukkan soal yang paling sulit dijawab siswa (&lt; 40% benar).
          </p>
        </div>

        {analytics.questionStats.length > 0 ? (
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.questionStats} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                <XAxis
                  dataKey="questionNumber"
                  tick={{ fontSize: 11, fontWeight: 600 }}
                  label={{ value: 'Nomor Soal', position: 'bottom', offset: -5, fontSize: 10 }}
                />
                <YAxis domain={[0, 1]} tick={{ fontSize: 11 }} tickFormatter={(val) => `${Math.round(val * 100)}%`} />
                <Tooltip
                  formatter={(val: any, _name: any, props: any) => [
                    `${Math.round(Number(val) * 100)}% Benar (${props.payload.correctCount}/${props.payload.totalResponses} siswa)`,
                    `Soal No. ${props.payload.questionNumber} - ${props.payload.difficultyLabel}`
                  ]}
                />
                <ReferenceLine
                  y={0.4}
                  stroke="#ef4444"
                  strokeDasharray="3 3"
                  label={{ value: 'Batas Sulit (40%)', position: 'top', fill: '#ef4444', fontSize: 10 }}
                />
                <Bar dataKey="facilityValue" radius={[4, 4, 0, 0]}>
                  {analytics.questionStats.map((entry, idx) => (
                    <Cell
                      key={`cell-${idx}`}
                      fill={entry.facilityValue >= 0.6 ? '#10b981' : entry.facilityValue >= 0.4 ? '#f59e0b' : '#ef4444'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400 text-xs">
            Belum ada data butir soal yang diimpor dari Google Form.
          </div>
        )}
      </div>

      {/* ── TABEL ANALISIS BUTIR SOAL MURNI (PSIKOMETRI) ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Tabel Analisis Psikometri Butir Soal (Arsip Audit Bank Soal)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Evaluasi validitas soal semesteran: Tingkat Kesukaran (P-value) dan Daya Pembeda (D-value).
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider text-[10px]">
                <th className="py-2 px-3">No.</th>
                <th className="py-2 px-3">Jml Respon</th>
                <th className="py-2 px-3 text-center">Benar</th>
                <th className="py-2 px-3 text-center">Salah</th>
                <th className="py-2 px-3 text-center">Tingkat Kesukaran (P)</th>
                <th className="py-2 px-3 text-center">Kategori Kesukaran</th>
                <th className="py-2 px-3 text-center">Daya Beda (D)</th>
                <th className="py-2 px-3 text-center">Status Soal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {analytics.questionStats.map(q => (
                <tr key={q.questionNumber} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="py-2.5 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    #{q.questionNumber}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                    {q.totalResponses} siswa
                  </td>
                  <td className="py-2.5 px-3 text-center font-semibold text-emerald-600">
                    {q.correctCount}
                  </td>
                  <td className="py-2.5 px-3 text-center font-semibold text-rose-500">
                    {q.wrongCount}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono font-bold">
                    {q.facilityValue}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      q.difficultyLabel === 'Mudah' || q.difficultyLabel === 'Sangat Mudah'
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300'
                        : q.difficultyLabel === 'Sedang'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300'
                        : 'bg-rose-50 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300'
                    }`}>
                      {q.difficultyLabel}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono font-bold">
                    {q.discriminationIndex}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                      q.isReviewRecommended
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}>
                      {q.isReviewRecommended ? 'Perlu Ditinjau' : 'Layak Digunakan'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── DAFTAR NILAI SISWA PER KELAS ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          Daftar Nilai Siswa (Peringkat Kelas)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider text-[10px]">
                <th className="py-2 px-3 text-center">Rank</th>
                <th className="py-2 px-3">Nama Siswa</th>
                <th className="py-2 px-3">NISN</th>
                <th className="py-2 px-3">Kelas</th>
                <th className="py-2 px-3 text-center">Nilai Ujian</th>
                <th className="py-2 px-3 text-center">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {analytics.studentRankings.map(s => (
                <tr key={s.studentId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-500">
                    #{s.rank}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                    {s.studentName}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-500">
                    {s.nisn}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                    {s.className}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono font-bold text-sm">
                    <span className={s.isPassed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                      {s.score}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      s.isPassed
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                    }`}>
                      {s.isPassed ? 'Tuntas' : 'Remedial'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
