-- student_assessments_migration.sql

CREATE TABLE IF NOT EXISTS tutor_exam_submissions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id          UUID REFERENCES tutor_exams(id) ON DELETE CASCADE,
  student_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  started_at       TIMESTAMPTZ DEFAULT NOW(),
  submitted_at     TIMESTAMPTZ,
  score            NUMERIC(5,2),
  status           VARCHAR(50) DEFAULT 'In Progress' -- In Progress, Submitted, Graded
);

CREATE TABLE IF NOT EXISTS tutor_exam_answers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id    UUID REFERENCES tutor_exam_submissions(id) ON DELETE CASCADE,
  question_id      UUID REFERENCES tutor_exam_questions(id) ON DELETE CASCADE,
  student_answer   TEXT,
  is_correct       BOOLEAN,
  awarded_points   NUMERIC(5,2) DEFAULT 0
);
