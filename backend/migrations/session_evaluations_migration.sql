-- ============================================================
-- session_evaluations_migration.sql
-- Đánh giá học sinh sau buổi học (dành cho gia sư)
-- Chạy trong Supabase: Project → SQL Editor → Paste → Run
-- ============================================================

CREATE TABLE IF NOT EXISTS session_evaluations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id            UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  tutor_id              UUID NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  student_id            UUID NOT NULL REFERENCES users(id)    ON DELETE CASCADE,

  -- Tiêu chí đánh giá (1–5)
  score_attendance      SMALLINT CHECK (score_attendance  BETWEEN 1 AND 5),
  score_attitude        SMALLINT CHECK (score_attitude    BETWEEN 1 AND 5),
  score_comprehension   SMALLINT CHECK (score_comprehension BETWEEN 1 AND 5),
  score_focus           SMALLINT CHECK (score_focus       BETWEEN 1 AND 5),
  score_homework        SMALLINT CHECK (score_homework    BETWEEN 1 AND 5),

  -- Nhận xét và đề xuất
  comments              TEXT,
  parent_recommendation TEXT,

  -- Trạng thái: draft / submitted / locked
  status                TEXT NOT NULL DEFAULT 'submitted'
                        CHECK (status IN ('draft', 'submitted', 'locked')),

  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),

  -- Mỗi buổi học chỉ có 1 đánh giá
  UNIQUE (booking_id)
);

CREATE INDEX IF NOT EXISTS idx_session_evals_booking  ON session_evaluations(booking_id);
CREATE INDEX IF NOT EXISTS idx_session_evals_tutor    ON session_evaluations(tutor_id);
CREATE INDEX IF NOT EXISTS idx_session_evals_student  ON session_evaluations(student_id);

-- Trigger auto-update updated_at
CREATE OR REPLACE TRIGGER set_session_evals_updated_at
BEFORE UPDATE ON session_evaluations
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
