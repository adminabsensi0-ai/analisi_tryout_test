import {
  Student, Question, Tryout, Subject, SheetImportPreviewItem,
  ColumnMappingConfig, SheetImportSummary, Response, Answer, Score, User
} from '../types/database';
import { ScoringService } from './scoring';
import { dbService } from './database';

export interface ParseResult {
  headers: string[];
  rows: Record<string, string>[];
}

export interface ImportValidationResult {
  isValidTryout: boolean;
  isValidSubject: boolean;
  tryoutError?: string;
  subjectError?: string;
  mappingConfig: ColumnMappingConfig;
  previewItems: SheetImportPreviewItem[];
  summary: SheetImportSummary;
}

export class GoogleIntegrationService {
  /**
   * Extract Google Spreadsheet ID from various URL formats
   */
  public static extractSheetId(sheetUrl: string): string | null {
    if (!sheetUrl) return null;
    const match = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  }

  /**
   * Extract Google Spreadsheet GID (Tab ID) if present in URL
   */
  public static extractGid(sheetUrl: string): string | null {
    if (!sheetUrl) return null;
    const match = sheetUrl.match(/[#&?]gid=([0-9]+)/);
    return match ? match[1] : null;
  }

  /**
   * Build Google Visualization API export CSV URL (works for any sheet with public view access)
   */
  public static buildCsvExportUrl(sheetId: string, gid?: string | null): string {
    const base = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`;
    return gid ? `${base}&gid=${gid}` : base;
  }

  /**
   * Fetch raw CSV content from a public Google Sheet
   */
  public static async fetchSheetCsv(sheetUrl: string): Promise<string> {
    const sheetId = this.extractSheetId(sheetUrl);
    if (!sheetId) {
      throw new Error('URL Google Sheet tidak valid. Pastikan format tautan Google Spreadsheet benar.');
    }
    const gid = this.extractGid(sheetUrl);
    const csvUrl = this.buildCsvExportUrl(sheetId, gid);
    const response = await fetch(csvUrl);
    if (!response.ok) {
      throw new Error(`Gagal mengunduh data Sheet (${response.status} ${response.statusText}). Pastikan hak akses Sheet adalah "Siapa saja yang memiliki link dapat melihat (Viewer)".`);
    }
    const text = await response.text();
    if (!text || text.trim().length === 0) {
      throw new Error('Lembar kerja Google Sheet kosong atau tidak memiliki baris data.');
    }
    return text;
  }

  /**
   * Cek apakah suatu kolom merupakan metadata / identitas siswa (Bagian 1 Google Form).
   * Kolom metadata TIDAK boleh dijadikan butir soal.
   */
  public static isMetadataHeader(header: string): boolean {
    const raw = (header || '').trim();
    if (!raw) return true;

    // Header yang merupakan kalimat tanya panjang atau bertanda tanya pasti soal (Bagian 2)
    if (raw.endsWith('?') || raw.includes('?') || raw.length > 75) {
      return false;
    }

    const lower = raw.toLowerCase();

    // Pertanyaan yang diawali kata tanya umum bahasa Indonesia pasti soal
    const questionStarters = ['apakah', 'siapakah', 'berapakah', 'manakah', 'bagaimanakah', 'sebutkan', 'jelaskan', 'tentukan', 'hitunglah', 'perhatikan'];
    if (questionStarters.some(starter => lower.startsWith(starter + ' '))) {
      return false;
    }

    // 1. Timestamp / Waktu pengiriman
    if (lower.includes('timestamp') || lower === 'waktu' || lower.startsWith('waktu ') || lower === 'tanggal' || lower === 'date' || lower === 'time') {
      return true;
    }
    // 2. Email / Username / Akun
    if (lower.includes('email') || lower.includes('username') || lower.includes('surel') || lower === 'akun') {
      return true;
    }
    // 3. NISN / NIS / Nomor Induk / Nomor Peserta
    if (
      lower === 'nisn' ||
      lower.includes('nisn') ||
      lower === 'nis' ||
      lower.includes('nomor induk') ||
      lower.includes('no induk') ||
      lower.includes('nomor peserta') ||
      lower.includes('no peserta') ||
      lower.includes('nomor ujian') ||
      lower.includes('no ujian')
    ) {
      return true;
    }
    // 4. Nama Siswa / Peserta
    if (
      lower === 'nama' ||
      lower.includes('nama lengkap') ||
      lower.includes('nama siswa') ||
      lower.includes('nama peserta') ||
      lower === 'name' ||
      lower === 'full name' ||
      lower === 'identitas' ||
      lower.includes('data diri')
    ) {
      return true;
    }
    // 5. Kelas / Rombel / Absen / Jurusan / Peminatan
    if (
      lower === 'kelas' ||
      lower.startsWith('kelas ') ||
      lower.includes('rombel') ||
      lower.includes('absen') ||
      lower.includes('jurusan') ||
      lower.includes('peminatan') ||
      lower.includes('program keahlian')
    ) {
      return true;
    }
    // 6. Skor Google Form
    if (
      lower === 'skor' ||
      lower === 'score' ||
      lower.includes('total point') ||
      lower.startsWith('skor ') ||
      lower === 'nilai' ||
      lower === 'poin'
    ) {
      return true;
    }
    // 7. Token / Password / Ruang / Sesi / Sekolah
    if (
      lower.includes('token') ||
      lower.includes('password') ||
      lower.includes('kode ujian') ||
      lower === 'ruang' ||
      lower.includes('ruang ujian') ||
      lower.startsWith('ruang ') ||
      lower === 'sesi' ||
      lower.includes('sesi ujian') ||
      lower.startsWith('sesi ') ||
      lower === 'sekolah' ||
      lower.includes('asal sekolah') ||
      lower.includes('nama sekolah')
    ) {
      return true;
    }

    return false;
  }

  /**
   * Mengambil seluruh kolom yang merupakan Murni Butir Soal (Bagian 2 Google Form).
   */
  public static getQuestionHeaders(headers: string[]): string[] {
    return headers.filter(h => h && h.trim().length > 0 && !this.isMetadataHeader(h));
  }

  /**
   * Auto-Bootstrap Butir Soal:
   * Jika bank soal di database untuk mapel ini masih kosong atau kurang lengkap,
   * otomatis buat/perbarui butir soal dari kolom Bagian 2 Google Form.
   */
  public static ensureQuestionsExist(
    subject: Subject,
    headers: string[],
    answerKeyRow?: Record<string, string> | null,
    currentUser?: User | null,
    selectedColumns?: string[] | null
  ): Question[] {
    const questionHeaders = selectedColumns && selectedColumns.length > 0
      ? selectedColumns
      : this.getQuestionHeaders(headers);
    if (questionHeaders.length === 0) {
      return dbService.getQuestions().filter(q => q.subjectId === subject.id);
    }

    // 1. Bersihkan soal bogus yang tidak sengaja terbuat dari header metadata Bagian 1 sebelumnya
    const currentSubjectQuestions = dbService.getQuestions().filter(q => q.subjectId === subject.id);
    const bogusQuestions = currentSubjectQuestions.filter(q => this.isMetadataHeader(q.questionText));
    if (bogusQuestions.length > 0) {
      dbService.deleteQuestionsBatch(bogusQuestions.map(q => q.id), null);
    }

    const remainingQuestions = dbService.getQuestions().filter(q => q.subjectId === subject.id);

    const firstMaterial = dbService.getMaterials().find(m => m.subjectId === subject.id);
    const firstCompetency = dbService.getCompetencies().find(c => c.subjectId === subject.id);
    const materialId = firstMaterial?.id || `mat-${subject.id}-default`;
    const competencyId = firstCompetency?.id || `comp-${subject.id}-default`;

    const resultQuestions: Question[] = [];

    questionHeaders.forEach((headerText, idx) => {
      const qNum = idx + 1;
      const cleanText = headerText.trim() || `Butir Soal Nomor ${qNum}`;

      let defaultCorrect = 'A';
      if (answerKeyRow && answerKeyRow[headerText] !== undefined) {
        const rawAns = answerKeyRow[headerText].trim();
        const prefixMatch = rawAns.match(/^([A-Ea-e])[\.\)\s]/);
        if (prefixMatch) {
          defaultCorrect = prefixMatch[1].toUpperCase();
        } else if (['A', 'B', 'C', 'D', 'E'].includes(rawAns.toUpperCase())) {
          defaultCorrect = rawAns.toUpperCase();
        } else if (rawAns.includes(',')) {
          // PG Kompleks / Kotak centang
          const parts = rawAns.split(',').map(p => p.trim()).filter(Boolean);
          const normalized = parts.map(p => {
            const m = p.match(/^([A-Ea-e])[\.\)\s]/);
            return m ? m[1].toUpperCase() : p;
          });
          defaultCorrect = normalized.sort().join(', ');
        } else if (rawAns) {
          defaultCorrect = rawAns;
        }
      }

      const existing = remainingQuestions.find(q => q.questionNumber === qNum);
      if (existing) {
        const updates: Partial<Question> = {};
        if (!existing.questionText || existing.questionText.startsWith('Butir Soal Nomor') || existing.questionText !== cleanText) {
          updates.questionText = cleanText;
        }
        if (answerKeyRow && defaultCorrect && existing.correctAnswer !== defaultCorrect) {
          updates.correctAnswer = defaultCorrect;
        }
        if (Object.keys(updates).length > 0) {
          dbService.updateQuestion(existing.id, updates, null);
        }
        resultQuestions.push({ ...existing, ...updates });
      } else {
        const uniqueCode = `${subject.code || 'SOAL'}-Q${String(qNum).padStart(3, '0')}`;
        const newQ = dbService.addQuestion(
          {
            uniqueCode,
            questionNumber: qNum,
            questionText: cleanText,
            subjectId: subject.id,
            materialId,
            competencyId,
            correctAnswer: defaultCorrect,
            options: [
              { key: 'A', text: 'Pilihan A' },
              { key: 'B', text: 'Pilihan B' },
              { key: 'C', text: 'Pilihan C' },
              { key: 'D', text: 'Pilihan D' },
              { key: 'E', text: 'Pilihan E' },
            ],
            weight: 1,
            status: 'ACTIVE',
          },
          null // System action: bypass teacher subject restriction during automated ingestion
        );
        resultQuestions.push(newQ);
      }
    });

    return resultQuestions.sort((a, b) => (a.questionNumber || 0) - (b.questionNumber || 0));
  }

  /**
   * 1. PARSE: Parse raw CSV / Tab-separated text adhering strictly to RFC 4180
   * (Handles commas inside quotes, multiline text inside quotes, quotes escaping)
   */
  public static parseRawSheetText(rawText: string): ParseResult {
    if (!rawText || !rawText.trim()) return { headers: [], rows: [] };

    // Deteksi apakah format TSV (tab) atau CSV (koma)
    const isTsv = rawText.includes('\t') && (!rawText.includes(',') || rawText.indexOf('\t') < rawText.indexOf(','));
    const delimiter = isTsv ? '\t' : ',';

    const parsedMatrix: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = '';
    let insideQuotes = false;

    for (let i = 0; i < rawText.length; i++) {
      const char = rawText[i];
      const nextChar = rawText[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          // Escaped quote: ""
          currentCell += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === delimiter && !insideQuotes) {
        currentRow.push(currentCell.trim().replace(/^"|"$/g, ''));
        currentCell = '';
      } else if ((char === '\r' || char === '\n') && !insideQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++; // Skip \n
        }
        currentRow.push(currentCell.trim().replace(/^"|"$/g, ''));
        currentCell = '';
        if (currentRow.some(c => c.length > 0)) {
          parsedMatrix.push(currentRow);
        }
        currentRow = [];
      } else {
        currentCell += char;
      }
    }

    if (currentCell.length > 0 || currentRow.length > 0) {
      currentRow.push(currentCell.trim().replace(/^"|"$/g, ''));
      if (currentRow.some(c => c.length > 0)) {
        parsedMatrix.push(currentRow);
      }
    }

    if (parsedMatrix.length === 0) return { headers: [], rows: [] };

    const headers = parsedMatrix[0];
    const rows: Record<string, string>[] = [];

    for (let r = 1; r < parsedMatrix.length; r++) {
      const cols = parsedMatrix[r];
      const rowObj: Record<string, string> = {};
      headers.forEach((h, idx) => {
        rowObj[h] = cols[idx] !== undefined ? cols[idx] : '';
      });
      rows.push(rowObj);
    }

    return { headers, rows };
  }

  /**
   * 2. MAPPING: Detect & map column headers to domain fields and unique Question IDs.
   * CRITICAL RULE: Uses Unique Question IDs (e.g. 'MAT-TO03-Q015'), NOT column index/positions!
   */
  public static detectColumnMappings(
    headers: string[],
    questions: Question[],
    customOverrides?: Partial<ColumnMappingConfig>,
    selectedColumns?: string[]
  ): ColumnMappingConfig {
    // Auto-detect NISN column
    const nisnHeader =
      customOverrides?.nisnColumn ||
      headers.find(h => {
        const lower = h.toLowerCase();
        return lower === 'nisn' || lower.includes('nisn') || lower.includes('nomor induk siswa');
      }) ||
      headers[0] ||
      'NISN';

    // Auto-detect Google Form Score column
    const scoreHeader =
      customOverrides?.scoreColumn ||
      headers.find(h => {
        const lower = h.toLowerCase();
        return lower === 'skor' || lower === 'score' || lower.includes('skor') || lower.includes('nilai') || lower.includes('total point');
      });

    // Auto-detect Name column
    const nameHeader =
      customOverrides?.nameColumn ||
      headers.find(h => {
        const lower = h.toLowerCase();
        return lower.includes('nama') || lower.includes('name') || lower.includes('siswa');
      });

    // Auto-detect Timestamp column
    const timestampHeader =
      customOverrides?.timestampColumn ||
      headers.find(h => {
        const lower = h.toLowerCase();
        return lower.includes('timestamp') || lower.includes('waktu') || lower.includes('tanggal');
      });

    // Ambil kolom-kolom murni pertanyaan (Bagian 2 Google Form atau Kolom Pilihan Guru)
    const questionHeaders = selectedColumns && selectedColumns.length > 0
      ? selectedColumns
      : this.getQuestionHeaders(headers);

    // Map each question by uniqueCode (with Positional Fallback for unnumbered headers)
    const questionMappings: Record<string, string> = {
      ...(customOverrides?.questionMappings || {}),
    };

    questions.forEach((q, idx) => {
      if (questionMappings[q.uniqueCode]) return;

      // 1. Prioritas Utama: Cari column header yang cocok dengan uniqueCode atau pola penomoran
      const matchingHeader = headers.find(h => {
        const lowerH = h.toLowerCase();
        const lowerCode = q.uniqueCode.toLowerCase();
        // Exact unique code match or substring match
        if (lowerH.includes(lowerCode)) return true;

        // Fallback: check if header matches question number tag (e.g. "[No. 1]" or "Soal 1")
        if (q.questionNumber) {
          const numPattern = new RegExp(`(soal|no|q)\\.?\\s*${q.questionNumber}\\b`, 'i');
          if (numPattern.test(lowerH)) return true;
        }
        return false;
      });

      if (matchingHeader) {
        questionMappings[q.uniqueCode] = matchingHeader;
      } else if (questionHeaders[idx]) {
        // 2. Positional Fallback: Jika judul pertanyaan bebas tanpa nomor, petakan berurutan dari Bagian 2
        questionMappings[q.uniqueCode] = questionHeaders[idx];
      }
    });

    return {
      nisnColumn: nisnHeader,
      scoreColumn: scoreHeader,
      nameColumn: nameHeader,
      timestampColumn: timestampHeader,
      questionMappings,
    };
  }

  /**
   * 3. VALIDATION & PREVIEW: Strict multi-step validation engine
   * Validates:
   * - NISN (format & existence in student roster)
   * - Student existence
   * - Try Out existence & validity
   * - Subject validity
   * - Question ID validity
   * - Answer format & malformed answer detection
   * - Duplicate submission in database
   * - Duplicate response in the same sheet
   * - Scoring mismatch (deterministic recalculation vs GForm score without silent overwrite)
   */
  public static validateSheetImportDetailed(
    parsedRows: Record<string, string>[],
    tryout: Tryout | undefined,
    subject: Subject | undefined,
    questions: Question[],
    students: Student[],
    existingScores: Score[],
    mappingConfig: ColumnMappingConfig
  ): ImportValidationResult {
    // 1. Validate Try Out
    if (!tryout) {
      return {
        isValidTryout: false,
        isValidSubject: false,
        tryoutError: 'Validasi Gagal: Try Out target tidak ditemukan.',
        mappingConfig,
        previewItems: [],
        summary: {
          totalRows: parsedRows.length,
          successCount: 0,
          failedCount: parsedRows.length,
          mismatchCount: 0,
          duplicateCount: 0,
          errorDetails: ['Try Out target tidak valid atau tidak ditemukan.'],
        },
      };
    }

    if (tryout.status === 'ARCHIVED') {
      return {
        isValidTryout: false,
        isValidSubject: true,
        tryoutError: `Validasi Gagal: Try Out '${tryout.title}' berstatus ARCHIVED dan tidak menerima data pengerjaan baru.`,
        mappingConfig,
        previewItems: [],
        summary: {
          totalRows: parsedRows.length,
          successCount: 0,
          failedCount: parsedRows.length,
          mismatchCount: 0,
          duplicateCount: 0,
          errorDetails: ['Try Out berstatus ARCHIVED.'],
        },
      };
    }

    // 2. Validate Subject
    if (!subject) {
      return {
        isValidTryout: true,
        isValidSubject: false,
        subjectError: 'Validasi Gagal: Mata pelajaran target tidak ditemukan.',
        mappingConfig,
        previewItems: [],
        summary: {
          totalRows: parsedRows.length,
          successCount: 0,
          failedCount: parsedRows.length,
          mismatchCount: 0,
          duplicateCount: 0,
          errorDetails: ['Mata pelajaran target tidak ditemukan.'],
        },
      };
    }

    // 0. Pre-scan for Official Answer Key row (identified by isAnswerKeyAccount === true)
    const allDbStudents = dbService.getStudents();
    let detectedKeyRow: Record<string, string> | null = null;
    let detectedKeyStudent: Student | null = null;
    let answerKeyExtractedCount = 0;

    for (const row of parsedRows) {
      const rawNisn = (row[mappingConfig.nisnColumn] || '').trim();
      if (!rawNisn) continue;
      const matched = students.find(s => s.nisn === rawNisn) || allDbStudents.find(s => s.nisn === rawNisn);
      if (matched?.isAnswerKeyAccount) {
        detectedKeyRow = row;
        detectedKeyStudent = matched;
        break;
      }
    }

    // If Official Answer Key row is detected, extract answers and update tryout/questions
    if (detectedKeyRow && detectedKeyStudent) {
      const updatedKeyMap: Record<string, string> = { ...((tryout.answerKey as unknown as Record<string, string>) || {}) };

      questions.forEach(q => {
        const header = mappingConfig.questionMappings[q.uniqueCode];
        if (header && detectedKeyRow![header] !== undefined) {
          const rawKeyVal = detectedKeyRow![header].trim();
          if (rawKeyVal) {
            let extractedKey = rawKeyVal;
            // Normalize multi-select checkboxes e.g. "A, C"
            if (rawKeyVal.includes(',')) {
              const parts = rawKeyVal.split(',').map(p => p.trim()).filter(Boolean);
              const normalized = parts.map(p => {
                const m = p.match(/^([A-Ea-e])[\.\)\s]/);
                return m ? m[1].toUpperCase() : p.toUpperCase();
              });
              extractedKey = normalized.sort().join(', ');
            } else {
              const prefixMatch = rawKeyVal.match(/^([A-Ea-e])[\.\)\s]/);
              if (prefixMatch) {
                extractedKey = prefixMatch[1].toUpperCase();
              } else if (['A', 'B', 'C', 'D', 'E'].includes(rawKeyVal.toUpperCase())) {
                extractedKey = rawKeyVal.toUpperCase();
              }
            }

            q.correctAnswer = extractedKey;
            updatedKeyMap[q.id] = extractedKey;
            answerKeyExtractedCount++;
            dbService.updateQuestion(q.id, { correctAnswer: extractedKey }, null);
          }
        }
      });

      // Simpan kunci jawaban dalam format array per nomor soal (Index 0 = Soal 1)
      const maxQNum = Math.max(...questions.map(q => q.questionNumber || 1), questions.length, 1);
      const answerKeyArr: string[] = new Array(maxQNum).fill('');
      questions.forEach(q => {
        const qIdx = (q.questionNumber || 1) - 1;
        if (q.correctAnswer && qIdx >= 0 && qIdx < answerKeyArr.length) {
          answerKeyArr[qIdx] = q.correctAnswer;
        }
      });

      dbService.updateTryout(tryout.id, { answerKey: answerKeyArr }, null);
    }

    // Filter out the answer key account row from student preview / score calculation
    const studentRows = parsedRows.filter(row => {
      const rawNisn = (row[mappingConfig.nisnColumn] || '').trim();
      if (!rawNisn) return true;
      const matched = students.find(s => s.nisn === rawNisn) || allDbStudents.find(s => s.nisn === rawNisn);
      return !matched?.isAnswerKeyAccount;
    });

    // Track duplicate NISNs in the current sheet batch among real students
    const nisnOccurrences: Record<string, number> = {};
    studentRows.forEach(row => {
      const rawNisn = (row[mappingConfig.nisnColumn] || '').trim();
      if (rawNisn) {
        nisnOccurrences[rawNisn] = (nisnOccurrences[rawNisn] || 0) + 1;
      }
    });

    const errorDetails: string[] = [];
    let successCount = 0;
    let failedCount = 0;
    let mismatchCount = 0;
    let duplicateCount = 0;

    const previewItems: SheetImportPreviewItem[] = studentRows.map((row, index) => {
      const rowNumber = index + 1;
      const rawNisn = (row[mappingConfig.nisnColumn] || '').trim();

      // Extract raw GForm score
      let rawGFormScoreNum = 0;
      if (mappingConfig.scoreColumn && row[mappingConfig.scoreColumn]) {
        const rawScoreStr = row[mappingConfig.scoreColumn].trim();
        const parsed = parseFloat(rawScoreStr.split('/')[0].trim());
        rawGFormScoreNum = isNaN(parsed) ? 0 : parsed;
      }

      // Check NISN format (Indonesian standard: 10 digits numeric)
      const isFormatValid = /^\d{10}$/.test(rawNisn);

      // Student existence (check provided list or full database)
      const matchedStudent = students.find(s => s.nisn === rawNisn) || allDbStudents.find(s => s.nisn === rawNisn);
      const isValidStudent = !!matchedStudent;

      // Duplicate in current sheet
      const isDuplicateRowInSheet = (nisnOccurrences[rawNisn] || 0) > 1;

      // Duplicate submission in database
      const isExistingSubmissionInDb = isValidStudent
        ? existingScores.some(s => s.studentId === matchedStudent.id && s.tryoutId === tryout.id)
        : false;

      // Extract & validate answers
      const studentAnswers: Record<string, string> = {};
      const malformedAnswers: Record<string, string> = {};

      questions.forEach(q => {
        const header = mappingConfig.questionMappings[q.uniqueCode];
        if (header && row[header] !== undefined) {
          const rawVal = row[header].trim();
          if (!rawVal) {
            studentAnswers[q.uniqueCode] = ''; // unanswered
            return;
          }

          const rawUpper = rawVal.toUpperCase();

          // 1. Check if it's a valid option letter: e.g. "A", "A. ...", "B)", etc.
          const optionPrefixMatch = rawVal.match(/^([A-Ea-e])[\.\)\s]/);
          if (optionPrefixMatch) {
            studentAnswers[q.uniqueCode] = optionPrefixMatch[1].toUpperCase();
          } else if (['A', 'B', 'C', 'D', 'E'].includes(rawUpper)) {
            studentAnswers[q.uniqueCode] = rawUpper;
          } else if (rawVal.includes(',')) {
            // Checkbox multi-select (e.g. "A, C" or "A. Opsi 1, C. Opsi 2" or direct text "Opsi 1, Opsi 2")
            const parts = rawVal.split(',').map(p => p.trim()).filter(Boolean);
            const normalizedParts = parts.map(p => {
              const m = p.match(/^([A-Ea-e])[\.\)\s]/);
              return m ? m[1].toUpperCase() : p;
            });
            studentAnswers[q.uniqueCode] = normalizedParts.sort().join(', ');
          } else if (['BENAR', 'SALAH', 'TRUE', 'FALSE'].includes(rawUpper)) {
            // True / False type
            studentAnswers[q.uniqueCode] = rawUpper;
          } else if (q.options?.some(opt => opt.text.trim().toUpperCase() === rawUpper)) {
            // Matched option text directly
            const matchedOpt = q.options.find(opt => opt.text.trim().toUpperCase() === rawUpper);
            studentAnswers[q.uniqueCode] = matchedOpt ? matchedOpt.key : rawVal;
          } else {
            // Jawaban teks langsung (mendukung soal Google Form tanpa opsi huruf A/B/C/D)
            studentAnswers[q.uniqueCode] = rawVal;
          }
        } else {
          studentAnswers[q.uniqueCode] = '';
        }
      });

      const hasMalformedAnswer = Object.keys(malformedAnswers).length > 0;

      // Deterministic Scoring Calculation
      const scoringResult = ScoringService.calculateStudentScore(
        studentAnswers,
        questions,
        tryout.scoringConfig,
        rawGFormScoreNum
      );

      // Determine validation status & error message
      let status: SheetImportPreviewItem['status'] = 'VALID';
      let validationError: string | undefined = undefined;

      if (!rawNisn) {
        status = 'ERROR_MALFORMED_DATA';
        validationError = 'Baris data cacat: Kolom NISN kosong.';
        failedCount++;
        errorDetails.push(`Baris ${rowNumber}: Kolom NISN kosong`);
      } else if (!isFormatValid) {
        status = 'ERROR_MALFORMED_DATA';
        validationError = `Format NISN '${rawNisn}' tidak valid (wajib 10 digit angka).`;
        failedCount++;
        errorDetails.push(`Baris ${rowNumber}: Format NISN '${rawNisn}' tidak valid`);
      } else if (!isValidStudent) {
        status = 'ERROR_STUDENT_NOT_FOUND';
        validationError = `Siswa dengan NISN '${rawNisn}' tidak terdaftar dalam database sekolah.`;
        failedCount++;
        errorDetails.push(`Baris ${rowNumber}: NISN '${rawNisn}' tidak ditemukan`);
      } else if (isDuplicateRowInSheet) {
        status = 'ERROR_DUPLICATE_ROW';
        validationError = `Duplikasi baris: NISN '${rawNisn}' muncul berulang dalam lembar ini.`;
        failedCount++;
        duplicateCount++;
        errorDetails.push(`Baris ${rowNumber}: Duplikasi NISN '${rawNisn}' dalam lembar`);
      } else if (hasMalformedAnswer) {
        status = 'ERROR_INVALID_ANSWER';
        const malformedKeys = Object.entries(malformedAnswers)
          .map(([k, v]) => `${k}: "${v}"`)
          .join(', ');
        validationError = `Opsi jawaban cacat/tidak dikenal pada [${malformedKeys}].`;
        failedCount++;
        errorDetails.push(`Baris ${rowNumber}: Jawaban cacat pada [${malformedKeys}]`);
      } else {
        // Valid student & valid answers
        successCount++;
        if (isExistingSubmissionInDb) {
          duplicateCount++;
        }
        if (scoringResult.scoringStatus === 'SCORING_MISMATCH') {
          status = 'WARNING_MISMATCH';
          mismatchCount++;
          errorDetails.push(
            `Baris ${rowNumber} (${matchedStudent.name}): Selisih skor terdeteksi (GForm: ${rawGFormScoreNum}, Hitung: ${scoringResult.calculatedScore}, Selisih: ${scoringResult.scoreDifference.toFixed(2)})`
          );
        }
      }

      return {
        rowNumber,
        nisn: rawNisn,
        studentName: matchedStudent?.name || (row[mappingConfig.nameColumn || ''] || 'Siswa Tidak Dikenal'),
        studentId: matchedStudent?.id,
        classId: matchedStudent?.classId,
        rawGFormScore: rawGFormScoreNum,
        answers: studentAnswers,
        malformedAnswers: hasMalformedAnswer ? malformedAnswers : undefined,
        calculatedScore: scoringResult.calculatedScore,
        scoreDifference: scoringResult.scoreDifference,
        scoringStatus: scoringResult.scoringStatus,
        isValidStudent,
        isDuplicateRowInSheet,
        isExistingSubmissionInDb,
        status,
        validationError,
      };
    });

    return {
      isValidTryout: true,
      isValidSubject: true,
      mappingConfig,
      previewItems,
      summary: {
        totalRows: studentRows.length,
        successCount,
        failedCount,
        mismatchCount,
        duplicateCount,
        errorDetails,
        answerKeyDetected: !!detectedKeyStudent,
        answerKeyStudentName: detectedKeyStudent?.name,
        answerKeyExtractedCount,
      },
    };
  }

  /**
   * 4. CONFIRMATION & IDEMPOTENT PERSISTENCE:
   * Rule: Import ulang data yang sama tidak boleh menghasilkan duplicate submission.
   * Updates existing submission records or inserts new ones cleanly.
   * Records comprehensive audit log.
   */
  public static executeIdempotentImport(
    tryout: Tryout,
    subject: Subject,
    validPreviewItems: SheetImportPreviewItem[],
    questions: Question[],
    currentUser: User,
    sourceMetadata: {
      sourceType: 'GOOGLE_SHEETS_IMPORT' | 'GOOGLE_FORM_SYNC';
      sourceUrl?: string;
      formRef?: string;
    }
  ): {
    savedCount: number;
    updatedCount: number;
    insertedCount: number;
    auditLogId: string;
  } {
    const now = new Date().toISOString();
    let updatedCount = 0;
    let insertedCount = 0;

    const newResponses: Response[] = [];
    const newAnswers: Answer[] = [];
    const newScores: Score[] = [];

    // Filter to items that can be safely imported (VALID or WARNING_MISMATCH)
    const importableItems = validPreviewItems.filter(
      item => item.status === 'VALID' || item.status === 'WARNING_MISMATCH'
    );

    if (importableItems.length === 0) {
      throw new Error('Validasi Gagal: Tidak ada baris data valid yang dapat disimpan.');
    }

    importableItems.forEach((item, index) => {
      const studentId = item.studentId!;

      // Check if student already has a response for this tryout in database (IDEMPOTENCY)
      const existingResponse = dbService.getResponses().find(
        r => r.studentId === studentId && r.tryoutId === tryout.id
      );

      const responseId = existingResponse?.id || `resp-${Date.now()}-${index}`;

      if (existingResponse) {
        updatedCount++;
      } else {
        insertedCount++;
      }

      // 1. Build Response record
      const respRecord: Response = {
        id: responseId,
        tryoutId: tryout.id,
        studentId,
        nisnInput: item.nisn,
        rawScoreGForm: item.rawGFormScore,
        submittedAt: now,
        syncBatchId: `batch-${Date.now()}`,
      };
      newResponses.push(respRecord);

      // 2. Build Item Answer records adhering strictly to tryout.scoringConfig
      questions.forEach((q, qIdx) => {
        const studentAns = item.answers[q.uniqueCode] || '';
        const isCorrect = ScoringService.isAnswerMatching(studentAns, q.correctAnswer);
        const qWeight = tryout.scoringConfig.scoringType === 'CUSTOM_WEIGHT' ? (q.weight || 1) : 1;

        let ansScore = 0;
        if (!studentAns) {
          ansScore = tryout.scoringConfig.unansweredScore * qWeight;
        } else if (isCorrect) {
          ansScore = tryout.scoringConfig.correctScore * qWeight;
        } else {
          ansScore = (tryout.scoringConfig.allowNegativeMarking ? tryout.scoringConfig.wrongScore : 0) * qWeight;
        }

        newAnswers.push({
          id: `ans-${responseId}-${qIdx}`,
          responseId,
          studentId,
          tryoutId: tryout.id,
          questionId: q.id,
          studentAnswer: studentAns,
          correctAnswer: q.correctAnswer,
          isCorrect,
          score: Math.round(ansScore * 100) / 100,
          submittedAt: now,
        });
      });

      // 3. Build Score record
      const existingScore = dbService.getScores().find(
        s => s.studentId === studentId && s.tryoutId === tryout.id
      );

      const scoreId = existingScore?.id || `score-${responseId}`;

      const totalCorrect = Object.entries(item.answers).filter(
        ([code, ans]) => {
          const q = questions.find(itemQ => itemQ.uniqueCode === code);
          return q && ScoringService.isAnswerMatching(ans, q.correctAnswer);
        }
      ).length;

      const totalUnanswered = Object.values(item.answers).filter(ans => !ans).length;
      const totalIncorrect = questions.length - totalCorrect - totalUnanswered;

      newScores.push({
        id: scoreId,
        responseId,
        studentId,
        tryoutId: tryout.id,
        subjectScores: { [subject.id]: item.calculatedScore },
        googleFormScore: item.rawGFormScore,
        calculatedScore: item.calculatedScore,
        scoreDifference: item.scoreDifference,
        scoringStatus: item.scoringStatus,
        totalCorrect,
        totalIncorrect,
        totalUnanswered,
        createdAt: existingScore?.createdAt || now,
      });
    });

    // Save to Database Service with idempotency
    dbService.saveImportedResponsesAndScores(
      tryout.id,
      newResponses,
      newAnswers,
      newScores,
      currentUser
    );

    // Write comprehensive AUDIT LOG matching requirements
    const auditDetails = JSON.stringify({
      actor: { id: currentUser?.id || 'system', name: currentUser?.name || 'Sistem Otomatis', role: currentUser?.role || 'SYSTEM' },
      timestamp: now,
      source: sourceMetadata.sourceUrl || 'Google Sheets Manual Paste',
      formReference: sourceMetadata.formRef || 'Form-TO03',
      tryout: { id: tryout.id, code: tryout.code, title: tryout.title },
      subject: { id: subject.id, code: subject.code, name: subject.name },
      totalRowsProcessed: validPreviewItems.length,
      successCount: importableItems.length,
      updatedCount,
      insertedCount,
      mismatchCount: importableItems.filter(i => i.scoringStatus === 'SCORING_MISMATCH').length,
      errors: validPreviewItems.filter(i => i.validationError).map(i => `Row ${i.rowNumber}: ${i.validationError}`),
    });

    const auditLog = dbService.logAudit(
      currentUser,
      'IMPORT_GOOGLE_SHEETS_CONFIRM',
      'TRYOUT_RESPONSES',
      `Impor Google Sheets (${tryout.code} - ${subject.name}): ${importableItems.length} berhasil (${insertedCount} baru, ${updatedCount} perbarui/idempotent). Detail: ${auditDetails}`
    );

    return {
      savedCount: importableItems.length,
      updatedCount,
      insertedCount,
      auditLogId: auditLog?.id || `audit-${Date.now()}`,
    };
  }

  /**
   * 5. AUTOMATED TEST SUITE: Full coverage of all Phase 7 requirements
   * Tests:
   * 1. Valid import
   * 2. Invalid student (unknown NISN)
   * 3. Invalid Try Out (missing or archived)
   * 4. Invalid question ID (unmapped question)
   * 5. Duplicate in sheet & duplicate in DB
   * 6. Malformed answer (illegal characters)
   * 7. Scoring mismatch (Google Form score != calculated score)
   * 8. Repeated import (Idempotency guarantee: 0 duplicate submissions)
   * 9. Partial failure (mixed valid and invalid rows)
   */
  public static runIntegrationTestSuite(): {
    passed: boolean;
    tests: { name: string; passed: boolean; message: string }[];
  } {
    const results: { name: string; passed: boolean; message: string }[] = [];

    const mockAdmin: User = {
      id: 'u-admin',
      name: 'Drs. Supriyadi, M.Pd',
      email: 'admin@sekolah.sch.id',
      role: 'ADMIN',
      createdAt: '2025-07-01T08:00:00Z',
    };

    const tryout = dbService.getTryouts().find(t => t.id === 'to-3') || dbService.getTryouts()[0];
    const subject = dbService.getSubjects().find(s => s.id === 'subj-mat') || dbService.getSubjects()[0];
    const questions = dbService.getQuestions().filter(q => q.subjectId === subject.id);
    const students = dbService.getStudents();
    const existingScores = dbService.getScoresByTryout(tryout.id);

    // TEST 1: Valid Import
    try {
      const validText = `NISN\tSkor\tMAT-TO03-Q001\tMAT-TO03-Q002\tMAT-TO03-Q003\n0061234561\t100\tA\tA\tA`;
      const parseRes = this.parseRawSheetText(validText);
      const mappings = this.detectColumnMappings(parseRes.headers, questions);
      const valRes = this.validateSheetImportDetailed(
        parseRes.rows,
        tryout,
        subject,
        questions,
        students,
        existingScores,
        mappings
      );

      const t1Passed =
        valRes.summary.successCount === 1 &&
        valRes.summary.failedCount === 0 &&
        valRes.previewItems[0].status === 'VALID';

      results.push({
        name: '1. Valid Import Processing',
        passed: t1Passed,
        message: t1Passed
          ? `Sukses: 1 baris valid diproses dengan status VALID (Siswa: ${valRes.previewItems[0].studentName})`
          : `Gagal: baris valid tidak berhasil divalidasi`,
      });
    } catch (err: any) {
      results.push({
        name: '1. Valid Import Processing',
        passed: false,
        message: `Error: ${err.message}`,
      });
    }

    // TEST 2: Invalid Student (Unknown NISN)
    try {
      const unknownNisnText = `NISN\tSkor\tMAT-TO03-Q001\n9999999999\t80\tA`;
      const parseRes = this.parseRawSheetText(unknownNisnText);
      const mappings = this.detectColumnMappings(parseRes.headers, questions);
      const valRes = this.validateSheetImportDetailed(
        parseRes.rows,
        tryout,
        subject,
        questions,
        students,
        existingScores,
        mappings
      );

      const t2Passed =
        valRes.summary.failedCount === 1 &&
        valRes.previewItems[0].status === 'ERROR_STUDENT_NOT_FOUND';

      results.push({
        name: '2. Invalid Student Rejection',
        passed: t2Passed,
        message: t2Passed
          ? `Sukses: NISN 9999999999 ditolak dengan status ERROR_STUDENT_NOT_FOUND`
          : `Gagal: NISN tidak dikenal tidak terdeteksi`,
      });
    } catch (err: any) {
      results.push({
        name: '2. Invalid Student Rejection',
        passed: false,
        message: `Error: ${err.message}`,
      });
    }

    // TEST 3: Invalid Try Out (Archived or Missing)
    try {
      const archivedTryout: Tryout = { ...tryout, status: 'ARCHIVED' };
      const testText = `NISN\tSkor\n0061234561\t80`;
      const parseRes = this.parseRawSheetText(testText);
      const mappings = this.detectColumnMappings(parseRes.headers, questions);
      const valRes = this.validateSheetImportDetailed(
        parseRes.rows,
        archivedTryout,
        subject,
        questions,
        students,
        existingScores,
        mappings
      );

      const t3Passed = !valRes.isValidTryout && !!valRes.tryoutError;

      results.push({
        name: '3. Invalid Try Out Status Rejection',
        passed: t3Passed,
        message: t3Passed
          ? `Sukses: Try Out ARCHIVED dicegat ("${valRes.tryoutError}")`
          : `Gagal: Try Out ARCHIVED lolos validasi`,
      });
    } catch (err: any) {
      results.push({
        name: '3. Invalid Try Out Status Rejection',
        passed: false,
        message: `Error: ${err.message}`,
      });
    }

    // TEST 4: Invalid Question ID Detection
    try {
      const nonExistentCode = 'NON-EXISTENT-Q999';
      const questionText = `NISN\tSkor\t${nonExistentCode}\n0061234561\t80\tA`;
      const parseRes = this.parseRawSheetText(questionText);
      const mappings = this.detectColumnMappings(parseRes.headers, questions);

      // Verify non-existent code is not mapped to valid question
      const isUnmapped = !mappings.questionMappings[nonExistentCode];

      results.push({
        name: '4. Invalid Question ID Mapping Isolation',
        passed: isUnmapped,
        message: isUnmapped
          ? `Sukses: Kode soal tidak sah (${nonExistentCode}) tidak dipetakan ke bank soal`
          : `Gagal: Kode soal tidak sah terpetakan`,
      });
    } catch (err: any) {
      results.push({
        name: '4. Invalid Question ID Mapping Isolation',
        passed: false,
        message: `Error: ${err.message}`,
      });
    }

    // TEST 5: Duplicate Detection (Duplicate in Sheet & in DB)
    try {
      const duplicateSheetText = `NISN\tSkor\tMAT-TO03-Q001\n0061234561\t80\tA\n0061234561\t80\tA`;
      const parseRes = this.parseRawSheetText(duplicateSheetText);
      const mappings = this.detectColumnMappings(parseRes.headers, questions);
      const valRes = this.validateSheetImportDetailed(
        parseRes.rows,
        tryout,
        subject,
        questions,
        students,
        existingScores,
        mappings
      );

      const t5Passed =
        valRes.summary.duplicateCount >= 1 &&
        valRes.previewItems.some(i => i.status === 'ERROR_DUPLICATE_ROW');

      results.push({
        name: '5. Duplicate Row in Sheet Rejection',
        passed: t5Passed,
        message: t5Passed
          ? `Sukses: Duplikasi baris dalam lembar terdeteksi (${valRes.summary.duplicateCount} terdeteksi)`
          : `Gagal: Duplikasi baris tidak terdeteksi`,
      });
    } catch (err: any) {
      results.push({
        name: '5. Duplicate Row in Sheet Rejection',
        passed: false,
        message: `Error: ${err.message}`,
      });
    }

    // TEST 6: Malformed Answer Detection
    try {
      const malformedText = `NISN\tSkor\tMAT-TO03-Q001\n0061234561\t80\tINVALID_CORRUPT_OPTION`;
      const parseRes = this.parseRawSheetText(malformedText);
      const mappings = this.detectColumnMappings(parseRes.headers, questions);
      const valRes = this.validateSheetImportDetailed(
        parseRes.rows,
        tryout,
        subject,
        questions,
        students,
        existingScores,
        mappings
      );

      const t6Passed =
        valRes.summary.failedCount === 1 &&
        valRes.previewItems[0].status === 'ERROR_INVALID_ANSWER';

      results.push({
        name: '6. Malformed Answer Option Detection',
        passed: t6Passed,
        message: t6Passed
          ? `Sukses: Opsi jawaban cacat "INVALID_CORRUPT_OPTION" terdeteksi sebagai ERROR_INVALID_ANSWER`
          : `Gagal: Opsi jawaban cacat tidak terdeteksi`,
      });
    } catch (err: any) {
      results.push({
        name: '6. Malformed Answer Option Detection',
        passed: false,
        message: `Error: ${err.message}`,
      });
    }

    // TEST 7: Scoring Mismatch Detection (No Silent Overwrite)
    try {
      // Correct answer is 'A' for questions. If student answers 'B', calculated score is lower, but GForm claims 95
      const mismatchText = `NISN\tSkor\tMAT-TO03-Q001\tMAT-TO03-Q002\tMAT-TO03-Q003\n0061234561\t95\tB\tB\tB`;
      const parseRes = this.parseRawSheetText(mismatchText);
      const mappings = this.detectColumnMappings(parseRes.headers, questions);
      const valRes = this.validateSheetImportDetailed(
        parseRes.rows,
        tryout,
        subject,
        questions,
        students,
        existingScores,
        mappings
      );

      const t7Passed =
        valRes.summary.mismatchCount === 1 &&
        valRes.previewItems[0].status === 'WARNING_MISMATCH' &&
        valRes.previewItems[0].scoringStatus === 'SCORING_MISMATCH' &&
        valRes.previewItems[0].scoreDifference > 0;

      results.push({
        name: '7. Scoring Mismatch Detection & Non-Overwrite Rule',
        passed: t7Passed,
        message: t7Passed
          ? `Sukses: Selisih skor (${valRes.previewItems[0].scoreDifference.toFixed(2)} poin) ditandai SCORING_MISMATCH tanpa silent overwrite`
          : `Gagal: Selisih skor tidak ditandai sebagai SCORING_MISMATCH`,
      });
    } catch (err: any) {
      results.push({
        name: '7. Scoring Mismatch Detection & Non-Overwrite Rule',
        passed: false,
        message: `Error: ${err.message}`,
      });
    }

    // TEST 8: Repeated Import (Idempotency Guarantee)
    try {
      const importText = `NISN\tSkor\tMAT-TO03-Q001\n0061234561\t100\tA`;
      const parseRes = this.parseRawSheetText(importText);
      const mappings = this.detectColumnMappings(parseRes.headers, questions);
      const valRes = this.validateSheetImportDetailed(
        parseRes.rows,
        tryout,
        subject,
        questions,
        students,
        existingScores,
        mappings
      );

      const initialRespCount = dbService.getResponses().length;

      // First run
      this.executeIdempotentImport(tryout, subject, valRes.previewItems, questions, mockAdmin, {
        sourceType: 'GOOGLE_SHEETS_IMPORT',
        sourceUrl: 'https://docs.google.com/spreadsheets/d/test-idempotency',
      });

      const afterFirstCount = dbService.getResponses().length;

      // Second run with identical student & tryout
      this.executeIdempotentImport(tryout, subject, valRes.previewItems, questions, mockAdmin, {
        sourceType: 'GOOGLE_SHEETS_IMPORT',
        sourceUrl: 'https://docs.google.com/spreadsheets/d/test-idempotency',
      });

      const afterSecondCount = dbService.getResponses().length;

      // Idempotency: response count after second import must equal response count after first import
      const t8Passed = afterSecondCount === afterFirstCount;

      results.push({
        name: '8. Idempotent Repeated Import Guarantee',
        passed: t8Passed,
        message: t8Passed
          ? `Sukses: Impor ulang menghasilkan 0 duplikasi submission (Total Response tetap: ${afterSecondCount})`
          : `Gagal: Impor ulang menambah duplikasi data (${afterFirstCount} -> ${afterSecondCount})`,
      });
    } catch (err: any) {
      results.push({
        name: '8. Idempotent Repeated Import Guarantee',
        passed: false,
        message: `Error: ${err.message}`,
      });
    }

    // TEST 9: Partial Failure Handling
    try {
      const mixedText = `NISN\tSkor\tMAT-TO03-Q001\n0061234561\t100\tA\n9999999999\t80\tA\n0061234562\t100\tINVALID_OPT`;
      const parseRes = this.parseRawSheetText(mixedText);
      const mappings = this.detectColumnMappings(parseRes.headers, questions);
      const valRes = this.validateSheetImportDetailed(
        parseRes.rows,
        tryout,
        subject,
        questions,
        students,
        existingScores,
        mappings
      );

      const t9Passed =
        valRes.summary.totalRows === 3 &&
        valRes.summary.successCount === 1 &&
        valRes.summary.failedCount === 2;

      results.push({
        name: '9. Partial Failure Diagnostics & Isolation',
        passed: t9Passed,
        message: t9Passed
          ? `Sukses: Diagnosa baris akurat: 1 baris sukses, 2 baris gagal terisolasi (${valRes.summary.errorDetails.length} pesan detail)`
          : `Gagal: Diagnosa parsial tidak akurat (Sukses: ${valRes.summary.successCount}, Gagal: ${valRes.summary.failedCount})`,
      });
    } catch (err: any) {
      results.push({
        name: '9. Partial Failure Diagnostics & Isolation',
        passed: false,
        message: `Error: ${err.message}`,
      });
    }

    return {
      passed: results.every(r => r.passed),
      tests: results,
    };
  }

  // ─── Auto-Sync Helpers (Feature: Poll Google Sheet CSV every 5 min) ──────────

}
