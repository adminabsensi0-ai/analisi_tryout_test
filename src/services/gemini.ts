import { GoogleGenAI } from '@google/genai';

export class GeminiDiagnosticService {
  /**
   * Generate AI Learning Diagnostic for a Student based on their performance
   */
  public static async generateStudentDiagnostic(
    studentName: string,
    score: number,
    targetScore: number,
    correctCount: number,
    incorrectCount: number,
    weakMaterials: string[]
  ): Promise<string> {
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return `Rekomendasi Diagnostik untuk ${studentName}:\n- Pertahankan konsistensi latihan soal pada topik ${weakMaterials.join(', ') || 'Kalkulus & Turunan'}.\n- Perbanyak pemahaman konsep dasar dan pengerjaan soal tipe HOTS secara bertahap.\n- Target ${targetScore} poin dapat dicapai dengan meningkatkan akurasi pengerjaan soal medium.`;
      }

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Anda adalah Konsultan Diagnostik Akademik Sekolah.
Berikan analisis ringkas 3 paragraf dan 3 poin aksi konkret dalam bahasa Indonesia untuk siswa bernama ${studentName}.
Data Siswa:
- Skor Akhir: ${score} (Target: ${targetScore})
- Jumlah Soal Benar: ${correctCount}, Salah: ${incorrectCount}
- Materi Perlu Perbaikan: ${weakMaterials.join(', ') || 'Semua Materi'}

Format jawaban:
1. Ringkasan Diagnostik
2. Penyebab Potensial Kekurangan
3. 3 Langkah Aksi Latihan Terarah`,
      });

      return response.text || 'Gagal menghasilkan diagnosa AI.';
    } catch (err) {
      console.warn('Gemini API call warning:', err);
      return `Rekomendasi Diagnostik Akademik:\n1. Siswa perlu meningkatkan latihan pada materi ${weakMaterials.join(', ') || 'dasar'}.\n2. Lakukan evaluasi mandiri pada soal-soal yang salah.\n3. Pertahankan manajemen waktu saat mengerjakan Try Out berikutnya.`;
    }
  }
}
