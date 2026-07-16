-- tutor_assessments_migration.sql

CREATE TABLE IF NOT EXISTS tutor_exams (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  title            VARCHAR(255) NOT NULL,
  course           VARCHAR(255),
  description      TEXT,
  duration_minutes INTEGER DEFAULT 60,
  deadline         TIMESTAMPTZ,
  total_score      INTEGER DEFAULT 100,
  status           VARCHAR(50) DEFAULT 'Draft', -- Draft, Published, Closed
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tutor_exam_questions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id         UUID REFERENCES tutor_exams(id) ON DELETE CASCADE,
  question_type   VARCHAR(50) DEFAULT 'MCQ', -- MCQ, Essay
  question_text   TEXT NOT NULL,
  options         JSONB, -- For MCQ: [{ text: "...", isCorrect: true }]
  correct_answer  TEXT,
  max_point       NUMERIC(5,2) DEFAULT 0,
  grading_note    TEXT,
  question_order  INTEGER,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tutor_homework (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  title            VARCHAR(255) NOT NULL,
  course           VARCHAR(255),
  instructions     TEXT,
  file_url         TEXT,
  file_type        VARCHAR(100),
  deadline         TIMESTAMPTZ,
  max_score        INTEGER DEFAULT 100,
  allow_late       BOOLEAN DEFAULT false,
  status           VARCHAR(50) DEFAULT 'Open', -- Draft, Open, Closed
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tutor_homework_submissions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homework_id      UUID REFERENCES tutor_homework(id) ON DELETE CASCADE,
  student_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  file_url         TEXT NOT NULL,
  submitted_at     TIMESTAMPTZ DEFAULT NOW(),
  score            NUMERIC(5,2),
  feedback         TEXT
);
