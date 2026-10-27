import * as XLSX from 'xlsx';
import { Tryout, Student, ClassRoom, Subject, Score, User } from '../types/database';
import { DatabaseService } from './database';

export interface ExternalScorePreviewItem {
  rowNumber: number;
  nisn: string;
  name: string;
  className: string;
  studentId?: string;
  subjectScores: Record<string, number>;
  calculatedScore: number;
  status: 'VALID' | 'WARNING_STUDENT_NOT_FOUND' | 'WARNING_NO_SCORES';
  note?: string;
}

export interface ExternalParseResult {
  items: ExternalScorePreviewItem[];
  detectedSubjects: string[];
  summary: {
    totalRows: number;
    validCount: number;
    notFoundCount: number;
    invalidScoreCount: number;
    averageScore: number;
    highestScore: number;
    lowestScore: number;
  };
}

export class ExternalTryoutService {
  /**
   * Menghasilkan file template Excel (.xlsx) dengan data siswa dan kolom mapel yang sudah terisi otomatis
   */
  public static downloadTemplate(
    tryout: Tryout,
    targetClasses: ClassRoom[],
    allStudents: Student[],
    allSubjects: Subject[]
  ): void {
    // 1. Tentukan daftar siswa yang menjadi target tryout
    const allowedClassIdSet = new Set(
      tryout.targetClassIds && tryout.targetClassIds.length > 0
        ? tryout.targetClassIds
        : targetClasses.map(c => c.id)
    );

    const relevantStudents = allStudents
      .filter(s => !s.isAnswerKeyAccount && (allowedClassIdSet.size === 0 || allowedClassIdSet.has(s.classId)))
      .sort((a, b) => {
        const classA = targetClasses.find(c => c.id === a.classId)?.name || '';
        const classB = targetClasses.find(c => c.id === b.classId)?.name || '';
        if (classA !== classB) return classA.localeCompare(classB);
        return a.name.localeCompare(b.name);
      });

    // 2. Tentukan daftar mata pelajaran
    let subjectNames: string[] = [];
    if (tryout.externalSubjectIds && tryout.externalSubjectIds.length > 0) {
      subjectNames = tryout.externalSubjectIds
        .map(id => allSubjects.find(s => s.id === id)?.name)
        .filter(Boolean) as string[];
    }
    if (subjectNames.length === 0 && tryout.externalSubjects && tryout.externalSubjects.length > 0) {
      subjectNames = tryout.externalSubjects;
    }
    if (subjectNames.length === 0) {
      // Default: ambil nama-nama mapel aktif di sekolah
      subjectNames = allSubjects.slice(0, 5).map(s => s.name);
      if (subjectNames.length === 0) {
        subjectNames = ['Matematika', 'Bahasa Indonesia', 'Bahasa Inggris'];
      }
    }

    // 3. Susun Header
    const headers = ['No', 'NISN', 'Nama Siswa', 'Kelas', ...subjectNames, 'Nilai Akhir (Opsional)'];

    // 4. Susun Baris Data
    const dataRows: any[][] = [];

    // Jika ada siswa terdaftar, masukkan nama dan NISN mereka
    if (relevantStudents.length > 0) {
      relevantStudents.forEach((student, index) => {
        const studentClass = targetClasses.find(c => c.id === student.classId)?.name || '-';
        const row = [
          index + 1,
          student.nisn || '',
          student.name,
          studentClass,
          ...subjectNames.map(() => ''), // Kolom nilai mapel kosong siap diisi
          '', // Nilai akhir kosong (akan otomatis dihitung jika dibiarkan)
        ];
        dataRows.push(row);
      });
    } else {
      // Fallback contoh jika belum ada siswa
      dataRows.push([1, '0061234567', 'Contoh Siswa 1', 'XII-A', ...subjectNames.map(() => 80), 80]);
    }

    // 5. Buat Workbook
    const sheetData = [headers, ...dataRows];
    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

    // Format kolom NISN sebagai tipe string ('s') agar awalan nol tidak hilang
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
    for (let r = 1; r <= range.e.r; r++) {
      const nisnCellAddress = XLSX.utils.encode_cell({ r, c: 1 });
      if (worksheet[nisnCellAddress]) {
        worksheet[nisnCellAddress].t = 's';
        worksheet[nisnCellAddress].z = '@';
      }
    }

    // Atur lebar kolom agar rapi
    worksheet['!cols'] = [
      { wch: 6 },  // No
      { wch: 16 }, // NISN
      { wch: 32 }, // Nama Siswa
      { wch: 14 }, // Kelas
      ...subjectNames.map(() => ({ wch: 18 })), // Kolom Mapel
      { wch: 22 }, // Nilai Akhir
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Nilai');

    const cleanCode = (tryout.code || 'TO-EKSTERNAL').replace(/[^a-zA-Z0-9-_]/g, '_');
    const fileName = `Template_Nilai_${cleanCode}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  }

  /**
   * Melakukan parsing file Excel nilai tryout eksternal
   */
  public static parseExcelFile(
    fileBuffer: ArrayBuffer,
    tryout: Tryout,
    allStudents: Student[],
    allClasses: ClassRoom[],
    allSubjects: Subject[]
  ): ExternalParseResult {
    const workbook = XLSX.read(fileBuffer, { type: 'array', cellDates: false });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new Error('File Excel tidak memiliki sheet yang valid.');

    const worksheet = workbook.Sheets[sheetName];
    const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    if (rawRows.length < 2) {
      throw new Error('File Excel kosong atau hanya berisi judul.');
    }

    // 1. Cari baris header (baris yang memuat kata 'NISN' atau 'Nama')
    let headerRowIdx = -1;
    for (let i = 0; i < Math.min(10, rawRows.length); i++) {
      const row = rawRows[i].map(c => String(c).toLowerCase().trim());
      if (row.some(c => c.includes('nisn') || c.includes('nama'))) {
        headerRowIdx = i;
        break;
      }
    }

    if (headerRowIdx === -1) {
      throw new Error("Format tidak dikenali: Kolom 'NISN' atau 'Nama Siswa' tidak ditemukan pada file Excel.");
    }

    const headers = rawRows[headerRowIdx].map(c => String(c).trim());

    // 2. Petakan indeks kolom
    let nisnColIdx = -1;
    let nameColIdx = -1;
    let classColIdx = -1;
    let finalScoreColIdx = -1;
    const subjectCols: { colIdx: number; name: string; subjectId?: string }[] = [];

    const nonSubjectKeywords = ['no', 'nomor', 'nisn', 'nis', 'nama', 'nama siswa', 'kelas', 'rombel', 'nilai akhir', 'total', 'rata', 'rata-rata', 'keterangan'];

    headers.forEach((h, idx) => {
      const lower = h.toLowerCase().trim();
      if (!lower) return;

      if (lower === 'nisn' || lower.includes('nisn')) {
        if (nisnColIdx === -1) nisnColIdx = idx;
      } else if (lower.includes('nama')) {
        if (nameColIdx === -1) nameColIdx = idx;
      } else if (lower.includes('kelas') || lower.includes('rombel')) {
        if (classColIdx === -1) classColIdx = idx;
      } else if (lower.includes('nilai akhir') || lower === 'rata-rata' || lower === 'total') {
        if (finalScoreColIdx === -1) finalScoreColIdx = idx;
      } else if (!nonSubjectKeywords.includes(lower)) {
        // Cocokkan dengan master mata pelajaran sekolah jika ada
        const matchedSubj = allSubjects.find(
          s => s.name.toLowerCase().trim() === lower || s.code.toLowerCase().trim() === lower
        );
        subjectCols.push({
          colIdx: idx,
          name: h,
          subjectId: matchedSubj?.id,
        });
      }
    });

    if (nameColIdx === -1 && nisnColIdx === -1) {
      throw new Error("File harus memuat kolom 'NISN' atau 'Nama Siswa'.");
    }

    // 3. Iterasi setiap baris data
    const items: ExternalScorePreviewItem[] = [];
    let validCount = 0;
    let notFoundCount = 0;
    let invalidScoreCount = 0;
    const validScores: number[] = [];

    // Map helper untuk lookup siswa cepat
    const studentByNisn = new Map<string, Student>();
    const studentByName = new Map<string, Student>();

    allStudents.forEach(s => {
      if (s.nisn) {
        studentByNisn.set(s.nisn.trim(), s);
        // Tangani kemungkinan awalan '0' terpotong
        studentByNisn.set(s.nisn.trim().replace(/^0+/, ''), s);
      }
      studentByName.set(s.name.toLowerCase().trim(), s);
    });

    for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.every((c: any) => String(c).trim() === '')) {
        continue; // Lewati baris kosong
      }

      const rawNisn = nisnColIdx !== -1 ? String(row[nisnColIdx] || '').trim() : '';
      const rawName = nameColIdx !== -1 ? String(row[nameColIdx] || '').trim() : '';
      const rawClass = classColIdx !== -1 ? String(row[classColIdx] || '').trim() : '';

      if (!rawNisn && !rawName) continue;

      // Cari kecocokan siswa di database
      let matchedStudent: Student | undefined;

      if (rawNisn) {
        // Coba cocokan langsung dengan NISN
        matchedStudent = studentByNisn.get(rawNisn) || studentByNisn.get(rawNisn.replace(/^0+/, ''));
        if (!matchedStudent && /^\d+$/.test(rawNisn) && rawNisn.length < 10) {
          // Coba pad zero hingga 10 digit
          const padded = rawNisn.padStart(10, '0');
          matchedStudent = studentByNisn.get(padded);
        }
      }

      // Fallback ke nama jika NISN tidak cocok
      if (!matchedStudent && rawName) {
        matchedStudent = studentByName.get(rawName.toLowerCase().trim());
      }

      // Ambil nilai per mapel
      const subjectScores: Record<string, number> = {};
      const scoresList: number[] = [];

      subjectCols.forEach(col => {
        const val = row[col.colIdx];
        if (val !== undefined && val !== null && val !== '') {
          const num = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
          if (!isNaN(num)) {
            // Simpan dengan key subjectId jika ada, atau nama mapel
            const key = col.subjectId || col.name;
            subjectScores[key] = Math.round(num * 100) / 100;
            scoresList.push(num);
          }
        }
      });

      // Hitung skor akhir
      let calculatedScore = 0;
      if (finalScoreColIdx !== -1 && row[finalScoreColIdx] !== '') {
        const manualFinal = parseFloat(String(row[finalScoreColIdx]).replace(',', '.'));
        if (!isNaN(manualFinal)) {
          calculatedScore = Math.round(manualFinal * 100) / 100;
        }
      }

      if (calculatedScore === 0 && scoresList.length > 0) {
        // Otomatis hitung rata-rata jika kolom nilai akhir kosong
        const sum = scoresList.reduce((acc, curr) => acc + curr, 0);
        calculatedScore = Math.round((sum / scoresList.length) * 100) / 100;
      }

      // Tentukan status baris
      let status: 'VALID' | 'WARNING_STUDENT_NOT_FOUND' | 'WARNING_NO_SCORES' = 'VALID';
      let note: string | undefined;

      if (!matchedStudent) {
        status = 'WARNING_STUDENT_NOT_FOUND';
        note = 'Siswa tidak ditemukan dalam database sekolah.';
        notFoundCount++;
      } else if (scoresList.length === 0 && calculatedScore === 0) {
        status = 'WARNING_NO_SCORES';
        note = 'Nilai mapel tidak ditemukan atau bernilai 0.';
        invalidScoreCount++;
      } else {
        validCount++;
        validScores.push(calculatedScore);
      }

      const resolvedClassName = matchedStudent
        ? allClasses.find(c => c.id === matchedStudent!.classId)?.name || rawClass || '-'
        : rawClass || '-';

      items.push({
        rowNumber: r + 1,
        nisn: rawNisn || matchedStudent?.nisn || '-',
        name: rawName || matchedStudent?.name || '-',
        className: resolvedClassName,
        studentId: matchedStudent?.id,
        subjectScores,
        calculatedScore,
        status,
        note,
      });
    }

    const avg = validScores.length > 0
      ? Math.round((validScores.reduce((a, b) => a + b, 0) / validScores.length) * 10) / 10
      : 0;
    const max = validScores.length > 0 ? Math.max(...validScores) : 0;
    const min = validScores.length > 0 ? Math.min(...validScores) : 0;

    return {
      items,
      detectedSubjects: subjectCols.map(s => s.name),
      summary: {
        totalRows: items.length,
        validCount,
        notFoundCount,
        invalidScoreCount,
        averageScore: avg,
        highestScore: max,
        lowestScore: min,
      },
    };
  }

  /**
   * Menyimpan hasil parsing skor eksternal yang valid ke database
   */
  public static commitScores(
    tryoutId: string,
    validItems: ExternalScorePreviewItem[],
    dbService: DatabaseService,
    currentUser: User
  ): { savedCount: number; updatedCount: number } {
    const now = new Date().toISOString();
    const existingScores = dbService.getScoresByTryout(tryoutId);

    const scoresToSave: Score[] = validItems
      .filter(item => (item.status === 'VALID' || item.status === 'WARNING_NO_SCORES') && item.studentId)
      .map(item => {
        const studentId = item.studentId!;
        const existing = existingScores.find(s => s.studentId === studentId);
        const scoreId = existing?.id || `score-ext-${tryoutId}-${studentId}`;

        return {
          id: scoreId,
          responseId: `ext-resp-${tryoutId}-${studentId}`,
          studentId,
          tryoutId,
          subjectScores: item.subjectScores,
          googleFormScore: item.calculatedScore,
          calculatedScore: item.calculatedScore,
          scoreDifference: 0,
          scoringStatus: 'MATCH',
          totalCorrect: 0,
          totalIncorrect: 0,
          totalUnanswered: 0,
          createdAt: existing?.createdAt || now,
        };
      });

    return dbService.saveExternalScores(tryoutId, scoresToSave, currentUser);
  }
}
