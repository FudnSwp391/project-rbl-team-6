-- ================================================================
-- EduX Assessment Migration
-- Chạy file này trong Supabase:
--   Project → SQL Editor → New Query → Paste → Run
-- ================================================================

-- ── Bảng quizzes (đề thi chính thức) ──────────────────────────
CREATE TABLE IF NOT EXISTS quizzes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT NOT NULL,
  subject          TEXT NOT NULL,
  description      TEXT,
  duration_minutes INT NOT NULL DEFAULT 30,
  total_questions  INT NOT NULL DEFAULT 10,
  created_by       UUID REFERENCES users(id),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quizzes_subject ON quizzes(subject);

-- ── Bảng quiz_questions (câu hỏi trong đề) ────────────────────
CREATE TABLE IF NOT EXISTS quiz_questions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id        UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text  TEXT NOT NULL,
  option_a       TEXT NOT NULL,
  option_b       TEXT NOT NULL,
  option_c       TEXT NOT NULL,
  option_d       TEXT NOT NULL,
  correct_answer CHAR(1) NOT NULL CHECK (correct_answer IN ('A','B','C','D')),
  explanation    TEXT,
  question_order INT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id ON quiz_questions(quiz_id);

-- ── Bảng quiz_attempts (bài làm của học sinh) ─────────────────
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id                UUID NOT NULL REFERENCES quizzes(id),
  student_id             UUID NOT NULL REFERENCES users(id),
  answers                JSONB DEFAULT '{}',
  score                  INT,
  total_correct          INT,
  status                 TEXT NOT NULL DEFAULT 'in_progress'
                         CHECK (status IN ('in_progress','submitted')),
  started_at             TIMESTAMPTZ DEFAULT NOW(),
  submitted_at           TIMESTAMPTZ,
  time_remaining_seconds INT
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student ON quiz_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz    ON quiz_attempts(quiz_id);

-- ── Bảng practice_sessions (ôn tập AI) ────────────────────────
CREATE TABLE IF NOT EXISTS practice_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES users(id),
  topic           TEXT NOT NULL,
  difficulty      TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy','medium','hard')),
  questions       JSONB NOT NULL DEFAULT '[]',
  answers         JSONB DEFAULT '{}',
  score           INT,
  total_correct   INT,
  total_questions INT NOT NULL DEFAULT 10,
  status          TEXT NOT NULL DEFAULT 'in_progress'
                  CHECK (status IN ('in_progress','submitted')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  submitted_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_practice_sessions_student ON practice_sessions(student_id);

-- ================================================================
-- SEED DATA — 2 đề thi mẫu để test
-- ================================================================

-- Đề 1: Mathematics
WITH quiz1 AS (
  INSERT INTO quizzes (title, subject, description, duration_minutes, total_questions)
  VALUES (
    'Algebra Fundamentals',
    'Mathematics',
    'Test your understanding of basic algebra concepts including equations, inequalities, and functions.',
    20, 5
  )
  RETURNING id
)
INSERT INTO quiz_questions (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, question_order)
SELECT
  quiz1.id,
  q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_answer, q.explanation, q.question_order
FROM quiz1, (VALUES
  ('What is the value of x in the equation 2x + 6 = 14?',
   'x = 2', 'x = 4', 'x = 6', 'x = 8', 'B',
   'Subtract 6 from both sides: 2x = 8, then divide by 2: x = 4.', 1),
  ('Which of the following is the factored form of x² - 9?',
   '(x - 3)(x + 3)', '(x - 9)(x + 1)', '(x + 3)²', '(x - 3)²', 'A',
   'This is a difference of squares: a² - b² = (a-b)(a+b), so x² - 9 = (x-3)(x+3).', 2),
  ('If f(x) = 3x² - 2x + 1, what is f(2)?',
   '8', '9', '10', '13', 'B',
   'f(2) = 3(2²) - 2(2) + 1 = 12 - 4 + 1 = 9.', 3),
  ('Solve for x: |2x - 4| = 6',
   'x = 5 or x = -1', 'x = 5 only', 'x = -1 only', 'x = 1 or x = 5', 'A',
   '2x - 4 = 6 gives x = 5; 2x - 4 = -6 gives x = -1.', 4),
  ('What is the slope of the line passing through (1, 2) and (3, 8)?',
   '2', '3', '4', '6', 'B',
   'Slope = (y₂ - y₁)/(x₂ - x₁) = (8 - 2)/(3 - 1) = 6/2 = 3.', 5)
) AS q(question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, question_order);

-- Đề 2: Science
WITH quiz2 AS (
  INSERT INTO quizzes (title, subject, description, duration_minutes, total_questions)
  VALUES (
    'Biology Basics',
    'Science',
    'Explore fundamental concepts in biology: cells, genetics, and ecosystems.',
    20, 5
  )
  RETURNING id
)
INSERT INTO quiz_questions (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, question_order)
SELECT
  quiz2.id,
  q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_answer, q.explanation, q.question_order
FROM quiz2, (VALUES
  ('What is the powerhouse of the cell?',
   'Nucleus', 'Ribosome', 'Mitochondria', 'Golgi apparatus', 'C',
   'The mitochondria produce ATP through cellular respiration, earning the nickname "powerhouse of the cell".', 1),
  ('Which molecule carries genetic information in most organisms?',
   'RNA', 'DNA', 'Protein', 'ATP', 'B',
   'DNA (deoxyribonucleic acid) is the molecule that stores and transmits genetic information.', 2),
  ('What is the process by which plants make their own food?',
   'Respiration', 'Fermentation', 'Photosynthesis', 'Digestion', 'C',
   'Photosynthesis is the process where plants use sunlight, water, and CO₂ to produce glucose and oxygen.', 3),
  ('How many chromosomes do normal human body cells have?',
   '23', '44', '46', '48', 'C',
   'Human body cells (somatic cells) contain 46 chromosomes arranged in 23 pairs.', 4),
  ('Which of the following is NOT a characteristic of living organisms?',
   'Growth', 'Reproduction', 'Crystallization', 'Metabolism', 'C',
   'Crystallization is a physical/chemical process, not a characteristic of living organisms.', 5)
) AS q(question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, question_order);
