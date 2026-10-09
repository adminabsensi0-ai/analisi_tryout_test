# CHANGE LOG

## [2.2.0] - 2026-10-01
### Phase 14 — Final Testing & Production Readiness
- **Production Readiness Master Suite (`src/services/productionValidation.ts`)**:
  - Implemented Master End-to-End Production Validation Test Suite (`runProductionValidationTestSuite`) verifying complete lifecycle flow from Admin creation to Student Result Portal & Progress Tracking.
  - End-to-End Scenario: Admin student/class/subject/tryout creation & scoring setup &rarr; Teacher question bank & Google Form/Sheets import &rarr; Student response submission & Google Sheets integration &rarr; Validation, preview, confirm, scoring &rarr; Analytics calculation & explanation publishing &rarr; Student result portal (/hasil) scorecard view & PDF download &rarr; Longitudinal progress tracking update.
  - Verification across 6 core audit dimensions: End-to-End Flow, Core Functional Entities Integrity, Security & Isolation Isolation, Data Edge-Case Resilience & Mismatch Protection, UI/UX Discipline & Zero-Emoji Rules, Large Dataset Performance SLA (<200ms).
  - Updated all system documentation files (`/docs/*.md`) to reflect final implementation state and verified production readiness.

## [2.1.0] - 2026-10-01
### Phase 13 — Security & Performance Hardening
- **Security & Performance Hardening Service (`src/services/securityHardening.ts`)**:
  - Implemented comprehensive security audit & attack scenario test suite (`runPhase13HardeningTestSuite`) covering 10 critical security and performance scenarios.
  - Hardened student isolation, teacher isolation, secret management (`SUPABASE_SERVICE_ROLE_KEY` leak guard), input sanitization (XSS mitigation), rate limiting throttling, storage metadata access, import idempotency, security audit logging, query performance stress testing (<200ms SLA for 900+ students, 29 classes, 30,000+ answers), and direct URL parameter tampering guards.
  - Interactive test runner added to Teacher App, Admin App, and Student Portal.

## [2.0.0] - 2026-10-01
### Phase 12 — Progress Tracking
- **Progress Tracking Engine (`src/services/progress.ts`)**:
  - Longitudinal progress comparison across Try Out sequences (TO1 &rarr; TO2 &rarr; TO3 &rarr; TO4).
  - Student Progress Tracking: Score trends, target attainment progression, competency mastery shifts, strong areas ($\ge 75\%$), and weak areas ($< 70\%$).
  - Class Progress Tracking: Average progression, median score progression, passing rate progression, target attainment progression, and class competency shifts.
  - Subject Progress Tracking: Subject performance evolution across Try Outs.
  - Competency Progress Tracking: Detailed mastery shift per competency statement across Try Out sequence.
  - Visualizations: Clean, high-data-density progress charts.
  - Automated 7-Scenario Test Suite (`runProgressTestSuite`): Single TO, multiple TO sequence, missing TO gap handling, metric calculations, class progression, competency shift, and student data access isolation.

## [1.9.0] - 2026-09-30
### Phase 11 — PDF & Excel Reporting
- **PDF & Excel Reporting Engine (`src/services/export.ts`)**:
  - Student PDF Report: Official scorecard including student identity, class, Try Out performance, subject breakdowns, target attainment %, competency mastery, progress trends, weak areas, and published explanation links.
  - Teacher/Class/Try Out PDF Report: Comprehensive report containing Try Out executive summary, class average & median analysis, student score table, competency analysis, item psychometrics ($p$, $D$, distractors), and overall progress metrics.
  - Excel Report Generator: 7-sheet workbook (`Summary`, `Student Scores`, `Answers`, `Question Analysis`, `Competency Analysis`, `Class Analysis`, `Progress`) using `xlsx`.
  - Automated 7-Scenario Test Suite (`runReportEngineTests`): Student report, teacher report, class report, tryout report, Excel 7-sheet structure, large dataset stress test (900+ students, 29 classes), student isolation authorization, formatting accuracy, and download SLA (<300ms).

## [1.8.0] - 2026-09-30
### Phase 10 — Explanation System
- **Explanation System (`src/services/explanation.ts`)**:
  - Explanation formats supported: Multi-line structured text, PDF metadata (`pdfStoragePath`, `pdfFileName`, `pdfFileSize`), YouTube video embed resolution, and external web resource links.
  - Scopes: General Try Out explanation or Question-Specific explanation (linked to unique question ID).
  - Lifecycle & Status: `DRAFT`, `PUBLISHED`, `ARCHIVED` status management.
  - Security & Authorization: Strictly filters published explanations for student portal while reserving draft/archived items for teachers/admins.
  - Automated 11-Scenario Test Suite (`runExplanationTestSuite`).

## [1.7.0] - 2026-09-30
### Phase 9 — Analytics Engine & Psychometrics
- **Analytics Engine Core (`src/services/analytics.ts`)**:
  - Implemented multi-dimensional analytics derived strictly from database entities (`responses`, `answers`, `scores`, `students`, `questions`, `materials`, `competencies`) without hardcoded values.
  - **Student Analytics (`getStudentAnalytics`)**: Calculates calculated vs Google Form score, score difference, MATCH/MISMATCH status, correct/incorrect/unanswered counts, target score, attainment percentage & status, gap, strong materials ($\ge 75\%$), weak materials ($< 70\%$), competency mastery breakdown, question performance detail, and longitudinal progress trend.
  - **Class Analytics (`getClassAnalytics`)**: Calculates student count, mean average, mathematical median (for even & odd sample sizes), highest, lowest, passing count & percentage, target attainment count & percentage, score distribution histogram buckets (0-50, 51-70, 71-85, 86-100), class competency mastery averages, item error rates, and paginated student rankings.
  - **Overall Analytics (`getOverallAnalytics`)**: Supports multi-dimensional filtering across Academic Year, Try Out, Subject, Grade Level (X, XI, XII), and Class. Generates overall KPI metrics, grade comparison, class comparison, top performers, and at-risk students needing intervention.
  - **Question Psychometric & Distractor Analysis (`calculateQuestionItemAnalysis`)**: Computes difficulty index ($p$-value), discrimination index ($D$-value with upper/lower 27% tails), distractor analysis (counts and percentages for choices A, B, C, D, E, Kosong), correct %, incorrect %, and unanswered %.
  - **Informative Question Statuses**: Assigns difficulty label (`Easy`, `Medium`, `Difficult`), discrimination label (`Good Discrimination`, `Moderate Discrimination`, `Low Discrimination`), and recommendation (`Needs Review`, `Good / Valid Question`). Automatically detects misleading distractors (wrong option chosen more than answer key).
  - **Enforced Pedagogical Rule & Disclaimer**: Includes the explicit note in UI and objects: *"Status tersebut adalah informasi analitik, bukan keputusan otomatis untuk menghapus atau mengganti soal. Teacher/Admin tetap mengambil keputusan."*
  - **Performance & Scalability**: Implemented in-memory indexes in `DatabaseService` (`responsesByTryoutStudent`, `answersByTryout`, `answersByQuestion`, `scoresByTryout`, `scoresByStudent`, `studentsByClass`) for $O(1)$ lookups. Built synthetic dataset benchmark generator for 900+ students, 29 classes, 1,200+ questions, and 30,000+ answers executing in $< 250\text{ms}$.
  - **Automated 6-Scenario Test Suite (`runAnalyticsTestSuite`)**:
    1. Multi-Dimensional Filter Test
    2. Mathematical Aggregation Test (Mean & Median)
    3. Psychometric Accuracy Test ($p$, $D$, Distractor %)
    4. Empty State Resilience Test (Zero responses)
    5. Large Dataset Benchmark Test (900+ Students, 29 Classes, 30,000+ Answers)
    6. Analytics Authorization & Teacher Isolation Test
- **Teacher Application Analytics Hub (`src/pages/GuruAppPage.tsx`)**:
  - Transformed Tab 8 (`ANALYTICS`) into interactive 5-subtab hub: Ringkasan & Multi-Filter, Analisis Kelas, Analisis Siswa, Psikometri Soal, and Verifikasi & Benchmark.
  - Added live benchmark runner for 900+ students and 29 classes with latency timer (ms) and query speed indicators.
- **Student Result Portal Integration (`src/pages/StudentPortalPage.tsx`)**:
  - Connected verified student portal directly to database `getStudentAnalytics`, rendering real database answers, competency mastery, weak materials, and longitudinal progress.

## [1.6.0] - 2026-09-30
### Phase 8 — Scoring Engine & Verification
- **Scoring Engine Core (`src/services/scoring.ts`)**:
  - Implemented deterministic calculation engine based strictly on `/docs/SCORING_RULES.md`.
  - Flexible Weighting: Support for `EQUAL_WEIGHT` and `CUSTOM_WEIGHT` per question ($w(q)$).
  - Configurable Marking Parameters: Points for correct answers (`correctScore`), wrong answers (`wrongScore`), unanswered (`unansweredScore`), negative marking toggle (`allowNegativeMarking`), and customizable maximum score (`maxScore`).
  - Output Generation: Computes `raw_score`, `final_score`, `percentage`, `correct_count`, `incorrect_count`, and `unanswered_count`.
  - Google Form Score Comparison: Compares incoming `google_form_score` against `calculated_score`, generating `score_difference` and evaluating `scoring_status` (`MATCH` for difference $\le 0.01$, `SCORING_MISMATCH` for difference $> 0.01$).
  - **No Silent Overwrite Enforcement**: Raw student answers and original Google Form scores are preserved without mutation; differences are flagged with amber alerts and permanently recorded for auditing.
- **Automated 10-Scenario Benchmark Test Suite**:
  - Validates all 10 required test cases against manual step-by-step benchmark calculations:
    1. Semua Benar (All Correct: Raw 20/20, Final 100.0, 100%)
    2. Semua Salah (All Incorrect: Raw 0/20, Final 0.0, 0%)
    3. Semua Kosong (All Unanswered: Raw 0/20, Final 0.0, 0%)
    4. Kombinasi Benar/Salah/Kosong (Raw 12/20, Final 60.0, 60%)
    5. Negative Marking (Penalti Salah: Raw 10/20, Final 50.0, 50%)
    6. Equal Weighting (Raw 5.0/10.0, Final 5.0)
    7. Custom Weighting (Bobot [1, 2, 3]: Raw 4/6, Final 66.67, 66.67%)
    8. Max Score Kustom (Skala Standar 500: Raw 75/100, Final 375.0, 75.0%)
    9. Google Form Match (Selisih 0.00 -> MATCH)
    10. Google Form Mismatch (Selisih 25.00 -> SCORING_MISMATCH, No Silent Overwrite verified)
- **Teacher & Admin Scoring Engine Interfaces (`src/pages/GuruAppPage.tsx`, `src/pages/AdminAppPage.tsx`)**:
  - Added dedicated Scoring Engine tab on `/guru` with live interactive Simulator & Sandbox, active Try Out configuration summary, mathematical formula cards, and Real-time Mismatch Database Watcher.
  - Added one-click Scoring Engine 10-benchmark test runner on both Teacher Application and Admin Dashboard.

## [1.5.0] - 2026-09-30
### Phase 7 — Google Forms & Google Sheets Integration
- **Google Forms & Google Sheets Integration Pipeline (`src/services/googleIntegration.ts`)**:
  - Implemented the full 5-stage pipeline: Fetch/Input &rarr; Mapping &rarr; Validation &rarr; Preview &rarr; Confirm & Scoring.
  - Linked Google Form reference (Form ID, title, URL) and Google Sheet URL with live connection indicator.
  - Question Mapping bound strictly to **Unique Question ID** (e.g. `MAT-TO03-Q015`), never relying on column index as primary identity.
  - Comprehensive Validation: 10-digit NISN format, student existence against student roster, active Try Out status check, subject match, question ID match, answer options ('A'..'E' or blank), duplicate detection within the sheet, duplicate submission check in DB, malformed data, and scoring mismatch.
  - Deterministic Recalculation & Non-Overwrite Rule: Compares Google Form raw score with deterministic calculation; marks `MATCH` or `SCORING_MISMATCH` with score difference, preserving both scores without silent overwrite.
  - Strict Idempotency: Re-importing same sheet data updates existing response and score records without creating duplicate submissions in `responses` or `scores`.
  - Comprehensive Audit Logging: Records actor (ID, name, role), timestamp, source (Google Sheet URL, Google Form ref), Try Out, total rows, success count, failed count, mismatch count, and detailed error messages into `audit_logs`.
  - Automated Integration Test Suite covering all 9 required scenarios: valid import, invalid student, invalid Try Out, invalid question, duplicate, malformed answer, scoring mismatch, repeated import (idempotency), and partial failure.
- **Teacher Application Import UI (`src/pages/GuruAppPage.tsx`)**:
  - Upgraded Tab 11 into interactive 4-step wizard: Input Data with 6 Quick Test Presets &rarr; Column & Question Mapping &rarr; Validation & Preview Table with status badges &rarr; Confirmed Persistence & Idempotency.
  - Added dedicated Automated Integration Test Runner in UI with real-time pass/fail badges and validation logs.
- **Teacher Application (`src/pages/GuruAppPage.tsx`)**:
  - Implemented all 10 core modules: Teacher Dashboard, Try Out, Question Bank, Materials, Competencies, Students, Classes, Analytics navigation, Explanation navigation, and Report navigation.
  - Implemented Teacher Switcher persona selector for real-time testing of strict teacher isolation between Math, Physics, Indonesian, and Biology teachers.
  - Question Bank with complete specifications: Question ID, Subject, Material, Competency, Question Number, Question Text, Options (A-E), Answer Key, Weight, Cognitive Level (C1-C6: Mengingat, Memahami, Menerapkan, Menganalisis, Mengevaluasi, Mencipta), Status (`ACTIVE`, `DRAFT`, `ARCHIVED`).
  - Full Question CRUD with validation, filtering by cognitive level and status, search, and answer key selection.
  - Materials & Competencies CRUD restricted strictly to teacher's permitted subjects.
  - Student data display filtered strictly to teacher's assigned classes with privacy guards.
  - Psychometric Item Analysis viewer (difficulty index $p$-value, discrimination index $D$, distractor count breakdown).
  - Explanation publisher (Draft vs Published status) and Class Report exporter (Excel and PDF).
- **Service-Level Teacher Authorization & Database Protection (`src/services/database.ts`)**:
  - Added `assertTeacherSubject` and `assertTeacherClass` security guards on all teacher-level mutations and queries.
  - Guru A cannot read or mutate data belonging to another teacher's subject or class (throws 403 Forbidden and logs security audit).
  - Added scoped queries: `getQuestionsForTeacher`, `getMaterialsForTeacher`, `getCompetenciesForTeacher`, `getTryoutsForTeacher`, `getClassesForTeacher`, `getStudentsForTeacher`.
  - Added automated security test suite `runTeacherPermissionSecurityTests()` verifying permission resolution, authorized creations, and 403 rejections on unauthorized subjects and classes.

## [1.3.0] - 2026-09-30
### Phase 5 — Admin Module
- **Admin Dashboard & Management Modules (`src/pages/AdminAppPage.tsx`)**:
  - Implemented 10 core administrative modules: Dashboard Overview, Try Out Manager, Teachers CRUD, Students CRUD, Classes CRUD, Subjects CRUD, Academic Years CRUD, Materials CRUD, Competencies CRUD, Audit Logs, and System Settings.
  - Full CRUD operations with validation for required fields, uniqueness, and format constraints.
  - Search and pagination implemented across Teachers, Students, and Audit Logs.
  - Try Out Status lifecycle management: `DRAFT`, `ACTIVE`, `CLOSED`, `PUBLISHED`, `ARCHIVED`.
  - Comprehensive Scoring Configuration manager per Try Out: Max Score, Equal vs Custom Weighting, Points for Correct/Wrong/Unanswered, and Negative Marking toggle.
- **Service-Level Authorization & Database Protection (`src/services/database.ts`)**:
  - Added `assertAdmin` security guard on all administrative mutation methods, preventing unauthorized mutations from non-admin roles even if invoked directly.
  - Added duplicate validation for NISN, NIP, Subject Code, and Tryout Code.
  - Added audit logging for all creation, update, deletion, status modification, scoring configuration, and system reset actions.
  - Added security test suite verifying unauthorized mutation rejection (403), duplicate NISN rejection, duplicate Tryout code rejection, search, and pagination.

## [1.2.0] - 2026-09-30
### Phase 4 — Landing Page & Student Result Portal
- Landing Page (`/`) with Hero, Feature Section, Dual CTAs, and Footer.
- Student Result Portal (`/hasil`) with Two-Factor Verification (NISN + NIS Sekolah).
- Rate Limiting and strict student isolation.

## [1.1.0] - 2026-09-30
### Phase 3 — Project Foundation & Authentication
- Authentication Service (`src/services/auth.ts`) with session management.
- Protected Routes (`/admin`, `/guru`) enforced via `ProtectedRoute`.
- 260px desktop sidebar layout and mobile drawer navigation.

## [1.0.0-INIT] - 2026-09-30
- Initialized School Try Out & Assessment Analytics System.
- Created `/docs` single source of truth architectural and business rule documentation.
