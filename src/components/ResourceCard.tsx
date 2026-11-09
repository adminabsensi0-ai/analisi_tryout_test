import React, { useState } from 'react';
import {
  FileText, Youtube, ExternalLink, Copy, Check, Play,
  Eye, Download, Edit, Trash2, CheckCircle2, Clock, BookOpen, Share2
} from 'lucide-react';

export type ResourceType = 'PDF' | 'YOUTUBE' | 'EXTERNAL';

export interface ResourceCardProps {
  id?: string;
  type: ResourceType;
  title: string;
  url: string;
  fileName?: string;
  fileSize?: number;
  subjectName?: string;
  subjectCode?: string;
  tryoutCode?: string;
  authorName?: string;
  updatedAt?: string;
  status?: 'PUBLISHED' | 'DRAFT' | 'ARCHIVED';
  description?: string;
  questionCode?: string;
  questionNumbers?: number[];
  onPreview?: (url: string, title: string) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleStatus?: () => void;
  isTeacherView?: boolean;
}

export const ResourceCard: React.FC<ResourceCardProps> = ({
  id,
  type,
  title,
  url,
  fileName,
  fileSize,
  subjectName,
  subjectCode,
  tryoutCode,
  authorName,
  updatedAt,
  status = 'PUBLISHED',
  description,
  questionCode,
  questionNumbers,
  onPreview,
  onEdit,
  onDelete,
  onToggleStatus,
  isTeacherView = false,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (url) {
      navigator.clipboard?.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Helper to extract YouTube video ID for thumbnail
  const getYouTubeThumbnail = (videoUrl: string): string | null => {
    if (!videoUrl) return null;
    try {
      let videoId: string | null = null;
      const matchEmbed = videoUrl.match(/embed\/([^?&#]+)/);
      if (matchEmbed && matchEmbed[1]) videoId = matchEmbed[1];
      const matchWatch = videoUrl.match(/[?&]v=([^&#]+)/);
      if (matchWatch && matchWatch[1]) videoId = matchWatch[1];
      const matchShort = videoUrl.match(/youtu\.be\/([^?&#]+)/);
      if (matchShort && matchShort[1]) videoId = matchShort[1];
      const matchShorts = videoUrl.match(/shorts\/([^?&#]+)/);
      if (matchShorts && matchShorts[1]) videoId = matchShorts[1];
      if (videoId) {
        return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      }
    } catch {
      // fallback
    }
    return null;
  };

  const ytThumb = type === 'YOUTUBE' ? getYouTubeThumbnail(url) : null;

  return (
    <div
      className={`relative rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-md ${
        type === 'YOUTUBE'
          ? 'bg-gradient-to-b from-red-50/30 to-white dark:from-red-950/20 dark:to-slate-900 border-red-200/80 dark:border-red-900/60 hover:border-red-300 dark:hover:border-red-700'
          : type === 'PDF'
          ? 'bg-gradient-to-b from-rose-50/30 to-white dark:from-rose-950/20 dark:to-slate-900 border-rose-200/80 dark:border-rose-900/60 hover:border-rose-300 dark:hover:border-rose-700'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
      }`}
    >
      <div className="p-4 space-y-3">
        {/* Top Badges Header */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Distinct Visual Icon for PDF vs YouTube */}
            {type === 'YOUTUBE' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-red-600 text-white shadow-2xs">
                <Youtube className="w-3.5 h-3.5 fill-white" />
                <span>YouTube Video</span>
              </span>
            ) : type === 'PDF' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-rose-600 text-white shadow-2xs">
                <FileText className="w-3.5 h-3.5" />
                <span>Dokumen PDF</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-700 text-white">
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Link Tautan</span>
              </span>
            )}

            {/* Preview Badge */}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              <Eye className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
              <span>Preview Badge</span>
            </span>

            {/* Tryout or Question Code */}
            {tryoutCode && (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {tryoutCode.toUpperCase()}
              </span>
            )}

            {questionCode && (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                Soal: {questionCode}
              </span>
            )}

            {questionNumbers && questionNumbers.length > 0 && (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                Soal No: {questionNumbers.join(', ')}
              </span>
            )}
          </div>

          {/* Status or Subject Badge */}
          <div className="flex items-center gap-1.5">
            {subjectName && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {subjectName} {subjectCode ? `(${subjectCode})` : ''}
              </span>
            )}

            {isTeacherView && (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                  status === 'PUBLISHED'
                    ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    : status === 'DRAFT'
                    ? 'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                }`}
              >
                {status}
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug line-clamp-2">
            {title}
          </h4>
          {fileName && (
            <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-1 truncate flex items-center gap-1">
              <FileText className="w-3 h-3 shrink-0 text-rose-500" />
              <span className="truncate">{fileName}</span>
              {fileSize && (
                <span className="text-slate-400 text-[10px] shrink-0">
                  ({Math.round(fileSize / 1024)} KB)
                </span>
              )}
            </p>
          )}
        </div>

        {/* Thumbnail Preview for YouTube */}
        {type === 'YOUTUBE' && ytThumb && (
          <div
            onClick={() => onPreview?.(url, title)}
            className="relative aspect-video rounded-xl overflow-hidden bg-slate-900 group cursor-pointer border border-red-200/80 dark:border-red-900/60 shadow-2xs"
            title="Klik untuk putar preview video"
          >
            <img
              src={ytThumb}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90 group-hover:opacity-100"
            />
            <div className="absolute inset-0 bg-black/25 flex items-center justify-center group-hover:bg-black/15 transition-colors">
              <div className="w-10 h-10 rounded-full bg-red-600 group-hover:bg-red-700 text-white flex items-center justify-center shadow-lg transition-transform group-hover:scale-110">
                <Play className="w-5 h-5 ml-0.5 fill-white" />
              </div>
            </div>
            <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-xs text-[10px] font-bold text-white flex items-center gap-1">
              <Eye className="w-3 h-3 text-red-400" />
              <span>Pratinjau Langsung</span>
            </div>
          </div>
        )}

        {/* PDF Document Visual Preview Card */}
        {type === 'PDF' && (
          <div className="p-3 bg-rose-50/60 dark:bg-rose-950/30 rounded-xl border border-rose-200/80 dark:border-rose-900/60 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                {fileName || 'Dokumen_Solusi_Resmi.pdf'}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Siap diunduh / dibuka siswa di portal</span>
              </div>
            </div>
          </div>
        )}

        {/* Text Description preview if available */}
        {description && (
          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
            {description}
          </p>
        )}
      </div>

      {/* Card Footer Actions */}
      <div className="px-4 py-3 bg-slate-50/70 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Primary Interaction Buttons */}
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          {type === 'YOUTUBE' ? (
            <>
              {onPreview ? (
                <button
                  type="button"
                  onClick={() => onPreview(url, title)}
                  className="flex-1 py-1.5 px-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Tonton Video</span>
                </button>
              ) : (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-1.5 px-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Tonton Video</span>
                </a>
              )}

              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 bg-red-100 hover:bg-red-200 dark:bg-red-950 dark:hover:bg-red-900 text-red-700 dark:text-red-300 rounded-xl transition-colors shrink-0"
                title="Buka langsung di YouTube"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </>
          ) : (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Buka Dokumen PDF</span>
              <ExternalLink className="w-3 h-3 ml-0.5" />
            </a>
          )}

          {/* Clipboard Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            className={`px-2.5 py-1.5 rounded-xl font-semibold flex items-center gap-1 transition-all shrink-0 cursor-pointer ${
              copied
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
            title="Salin link ke clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-[11px] font-bold text-emerald-600">Tersalin</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="text-[11px]">Salin</span>
              </>
            )}
          </button>
        </div>

        {/* Teacher View Management Actions */}
        {isTeacherView && (
          <div className="flex items-center gap-1.5 shrink-0 pt-1 sm:pt-0">
            {onToggleStatus && (
              <button
                type="button"
                onClick={onToggleStatus}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg cursor-pointer transition-colors ${
                  status === 'PUBLISHED'
                    ? 'bg-amber-100 hover:bg-amber-200 dark:bg-amber-950 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-300'
                    : 'bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-300'
                }`}
                title="Ubah status publikasi"
              >
                {status === 'PUBLISHED' ? 'Draf' : 'Terbitkan'}
              </button>
            )}

            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="p-1.5 text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Edit link pembahasan"
              >
                <Edit className="w-3.5 h-3.5" />
              </button>
            )}

            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                title="Hapus link pembahasan"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
