import React, { useState, useRef } from 'react';
import {
  X, Upload, Download, FileSpreadsheet, CheckCircle2, AlertTriangle,
  Users, Check, HelpCircle
} from 'lucide-react';
import { Tryout, Student, ClassRoom, Subject, User } from '../../types/database';
import { DatabaseService } from '../../services/database';
import { ExternalTryoutService, ExternalParseResult, ExternalScorePreviewItem } from '../../services/externalTryout';

interface ExternalTryoutUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  tryout: Tryout;
  allStudents: Student[];
  allClasses: ClassRoom[];
  allSubjects: Subject[];
  dbService: DatabaseService;
  currentUser: User;
  onSuccess: () => void;
  onToast: (msg: string) => void;
}

export const ExternalTryoutUploadModal: React.FC<ExternalTryoutUploadModalProps> = ({
  isOpen,
  onClose,
  tryout,
  allStudents,
  allClasses,
  allSubjects,
  dbService,
  currentUser,
  onSuccess,
  onToast,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ExternalParseResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [filterWarningOnly, setFilterWarningOnly] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDownloadTemplate = () => {
    try {
      ExternalTryoutService.downloadTemplate(tryout, allClasses, allStudents, allSubjects);
      onToast(`Template Excel untuk ${tryout.code} berhasil diunduh.`);
    } catch (err: any) {
      onToast(`Gagal mengunduh template: ${err.message}`);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsParsing(true);
    setParseError(null);
    setParseResult(null);

    try {
      const buffer = await file.arrayBuffer();
      const result = ExternalTryoutService.parseExcelFile(
        buffer,
        tryout,
        allStudents,
        allClasses,
        allSubjects
      );
      setParseResult(result);
    } catch (err: any) {
      setParseError(err.message || 'Gagal membaca file Excel.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsParsing(true);
    setParseError(null);
    setParseResult(null);

    try {
      const buffer = await file.arrayBuffer();
      const result = ExternalTryoutService.parseExcelFile(
        buffer,
        tryout,
        allStudents,
        allClasses,
        allSubjects
      );
      setParseResult(result);
    } catch (err: any) {
      setParseError(err.message || 'Gagal membaca file Excel.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleSaveScores = () => {
    if (!parseResult) return;

    const validItems = parseResult.items.filter(
      item => item.status === 'VALID' || item.status === 'WARNING_NO_SCORES'
    );

    if (validItems.length === 0) {
      setParseError('Tidak ada baris siswa valid yang dapat disimpan.');
      return;
    }

    setIsSaving(true);
    try {
      const res = ExternalTryoutService.commitScores(
        tryout.id,
        validItems,
        dbService,
        currentUser
      );

      onToast(
        `Sukses! Berhasil menyimpan ${res.savedCount + res.updatedCount} nilai siswa (${res.savedCount} baru, ${res.updatedCount} diperbarui).`
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      setParseError(err.message || 'Gagal menyimpan nilai ke database.');
    } finally {
      setIsSaving(false);
    }
  };

  const displayedItems = parseResult
    ? filterWarningOnly
      ? parseResult.items.filter(i => i.status !== 'VALID')
      : parseResult.items
    : [];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4 shrink-0 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-lg">
                  {tryout.code}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 px-2 py-0.5 rounded-full">
                  Try Out Eksternal
                </span>
              </div>
              <h2 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base leading-tight mt-0.5">
                Upload &amp; Rekap Nilai: {tryout.title}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1 min-h-0 p-6 pb-10 space-y-5 text-xs">
          {/* Step 1: Download Template */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border border-indigo-200 dark:border-indigo-800/60 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <h3 className="font-bold text-indigo-950 dark:text-indigo-100 text-xs flex items-center gap-1.5">
                <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Langkah 1: Unduh Format Template Excel</span>
              </h3>
              <p className="text-[11px] text-indigo-800/80 dark:text-indigo-300/80 leading-relaxed max-w-xl">
                Template sudah otomatis berisi daftar <strong>NISN, Nama Siswa, dan Kelas</strong> dari database sekolah beserta kolom mata pelajaran. Anda cukup menyalin nilai siswa dari laporan lembaga luar.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 cursor-pointer transition-colors shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>Download Template Excel (.xlsx)</span>
            </button>
          </div>

          {/* Step 2: Upload Dropzone */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>Langkah 2: Unggah File Rekap Nilai (.xlsx / .xls)</span>
              </label>
              {selectedFile && (
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </span>
              )}
            </div>

            <div
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-2xl p-6 text-center cursor-pointer bg-slate-50/50 dark:bg-slate-950/30 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 transition-all flex flex-col items-center justify-center space-y-2"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-slate-700 dark:text-slate-200 text-xs">
                  Seret file Excel ke sini atau <span className="text-indigo-600 dark:text-indigo-400 underline">pilih dari komputer</span>
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Mendukung format Microsoft Excel (.xlsx, .xls) dan CSV
                </p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {parseError && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-start gap-2.5 text-rose-700 dark:text-rose-300">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <strong>Error Pengunggahan:</strong> {parseError}
              </div>
            </div>
          )}

          {/* Parsing Spinner */}
          {isParsing && (
            <div className="p-8 text-center text-slate-500 space-y-2">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-semibold">Sedang membaca dan memvalidasi file Excel...</p>
            </div>
          )}

          {/* Preview Results */}
          {parseResult && (
            <div className="space-y-4 pt-2">
              {/* Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Baris Siswa</span>
                  <span className="text-lg font-bold text-slate-800 dark:text-slate-100 font-mono">
                    {parseResult.summary.totalRows}
                  </span>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-bold block">Siap Disimpan</span>
                  <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300 font-mono">
                    {parseResult.summary.validCount}
                  </span>
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800">
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 uppercase font-bold block">Siswa Luar / Tak Dikenal</span>
                  <span className="text-lg font-bold text-amber-700 dark:text-amber-300 font-mono">
                    {parseResult.summary.notFoundCount}
                  </span>
                </div>
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800">
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 uppercase font-bold block">Rata-rata Nilai</span>
                  <span className="text-lg font-bold text-indigo-700 dark:text-indigo-300 font-mono">
                    {parseResult.summary.averageScore}
                  </span>
                </div>
              </div>

              {/* Table Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-slate-500" />
                    <span>Pratinjau Data Nilai Siswa ({displayedItems.length} baris)</span>
                  </h4>
                  {parseResult.detectedSubjects.length > 0 && (
                    <span className="text-[10px] text-slate-400">
                      Mapel: {parseResult.detectedSubjects.join(', ')}
                    </span>
                  )}
                </div>

                {parseResult.summary.notFoundCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilterWarningOnly(!filterWarningOnly)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-colors cursor-pointer ${
                      filterWarningOnly
                        ? 'bg-amber-500 text-white border-amber-600'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {filterWarningOnly ? 'Tampilkan Semua Data' : `Hanya Baris Bermasalah (${parseResult.summary.notFoundCount})`}
                  </button>
                )}
              </div>

              {/* Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-bold sticky top-0 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2 px-3">No</th>
                      <th className="py-2 px-3">NISN</th>
                      <th className="py-2 px-3">Nama Siswa</th>
                      <th className="py-2 px-3">Kelas</th>
                      {parseResult.detectedSubjects.map((s, idx) => (
                        <th key={idx} className="py-2 px-3 text-right">{s}</th>
                      ))}
                      <th className="py-2 px-3 text-right">Rata-rata</th>
                      <th className="py-2 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {displayedItems.map((item: ExternalScorePreviewItem, idx: number) => {
                      const isValid = item.status === 'VALID';
                      return (
                        <tr
                          key={idx}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                            !isValid ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''
                          }`}
                        >
                          <td className="py-2 px-3 font-mono text-slate-400">{item.rowNumber}</td>
                          <td className="py-2 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                            {item.nisn}
                          </td>
                          <td className="py-2 px-3 font-semibold text-slate-900 dark:text-slate-100">
                            {item.name}
                          </td>
                          <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                            {item.className}
                          </td>
                          {parseResult.detectedSubjects.map((subjName, sIdx) => {
                            const matchedKey = Object.keys(item.subjectScores).find(
                              k => k.toLowerCase() === subjName.toLowerCase()
                            );
                            const val = matchedKey !== undefined ? item.subjectScores[matchedKey] : '-';
                            return (
                              <td key={sIdx} className="py-2 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                                {val !== '-' ? val : '-'}
                              </td>
                            );
                          })}
                          <td className="py-2 px-3 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {item.calculatedScore}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {isValid ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                                <Check className="w-3 h-3" /> Valid
                              </span>
                            ) : (
                              <span
                                title={item.note}
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800"
                              >
                                <AlertTriangle className="w-3 h-3" /> Tak Cocok
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {parseResult && parseResult.summary.validCount > 0 ? (
              <span>
                Siap mengimpor <strong>{parseResult.summary.validCount}</strong> nilai siswa ke database.
              </span>
            ) : (
              <span>Pilih file Excel hasil try out eksternal untuk diproses.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSaveScores}
              disabled={!parseResult || parseResult.summary.validCount === 0 || isSaving}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSaving ? 'Menyimpan Nilai...' : 'Simpan Nilai ke Sistem'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
