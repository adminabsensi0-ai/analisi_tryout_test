# SCORING RULES & DATA MODEL SPECIFICATION

## 1. Scoring Data Model Representation
Model data scoring dirancang untuk merepresentasikan konfigurasi penilaian Google Form dan kalkulasi ulang otomatis di database Supabase/PostgreSQL.

### A. Raw Answers & Items Persistence (`answers`)
Setiap jawaban butir soal menyimpan:
- `student_id` (UUID): ID siswa yang mengerjakan.
- `tryout_id` (UUID): ID pelaksanaan Try Out.
- `question_id` (UUID): ID unik soal (`questions`).
- `student_answer` (CHAR(1)): Pilihan jawaban siswa ('A', 'B', 'C', 'D', 'E' atau '' jika kosong).
- `correct_answer` (CHAR(1)): Kunci jawaban sah pada saat pengerjaan.
- `is_correct` (BOOLEAN): Evaluasi kebenaran (`student_answer == correct_answer`).
- `score` (NUMERIC): Skor poin per butir soal berdasarkan bobot.

### B. Try Out Scoring Configuration (`tryouts.scoring_config`)
Dukungan konfigurasi fleksibel per Try Out dalam format JSONB:
```json
{
  "scoringType": "EQUAL_WEIGHT", // "EQUAL_WEIGHT" | "CUSTOM_WEIGHT"
  "maxScore": 100.0,
  "correctScore": 5.0,
  "wrongScore": 0.0,
  "unansweredScore": 0.0,
  "allowNegativeMarking": false
}
```

### C. Score Verification & Comparison Model (`scores`)
Menyimpan hasil agregasi dan verifikasi keselarasan:
- `google_form_score` (NUMERIC): Skor mentah yang dikirim oleh Google Form.
- `calculated_score` (NUMERIC): Hasil kalkulasi deterministik oleh database engine.
- `score_difference` (NUMERIC): Selisih absolut $|\text{google\_form\_score} - \text{calculated\_score}|$.
- `scoring_status` (VARCHAR):
  - `MATCH`: jika `score_difference` $\le 0.01$.
  - `SCORING_MISMATCH`: jika `score_difference` $> 0.01$.

---

## 2. Calculation Formula & Rules

### A. Item Score Calculation
For each question $q \in Q$:
$$\text{ItemScore}(q) = \begin{cases} 
w(q) \times \text{correctScore} & \text{jika } \text{is\_correct} = \text{true} \\
w(q) \times \text{wrongScore} & \text{jika } \text{is\_correct} = \text{false} \land \text{allowNegativeMarking} = \text{true} \\
0 & \text{jika } \text{is\_correct} = \text{false} \land \text{allowNegativeMarking} = \text{false} \\
w(q) \times \text{unansweredScore} & \text{jika jawaban kosong}
\end{cases}$$

di mana $w(q)$ adalah bobot butir soal (`questions.weight`) jika `scoringType == 'CUSTOM_WEIGHT'`, atau $1.0$ jika `EQUAL_WEIGHT`.

### B. Normalization to Scale 0–100
$$\text{Calculated Score} = \min\left(100.0, \max\left(0.0, \frac{\sum_{q \in Q} \text{ItemScore}(q)}{\text{Max Possible Raw}} \times \text{maxScore}\right)\right)$$

### C. No Silent Overwrite Rule
Bila `scoring_status == 'SCORING_MISMATCH'`:
1. Sistem mempertahankan `google_form_score` dan `calculated_score` dalam basis data.
2. Badge peringatan warna Amber ditampilkan pada panel Guru dan Admin.
3. Aktivitas mismatch dicatat secara otomatis dalam `audit_logs`.
4. Perubahan skor hanya dapat dikonfirmasi oleh Guru/Admin yang berwenang.
