-- Bảng buổi học trong thời khoá biểu (schedule_sessions)
-- (chuyển từ run_schedule_setup.js sang SQL thuần, bỏ phần seed dữ liệu demo — idempotent)

CREATE TABLE IF NOT EXISTS schedule_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID,
    student_id UUID,
    tutor_id UUID,
    title TEXT NOT NULL,
    subject TEXT,
    tutor_name TEXT,
    meeting_platform TEXT,
    meeting_url TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'upcoming',
    xp_earned INTEGER DEFAULT 0,
    study_minutes INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_schedule_sessions_student_id ON schedule_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_schedule_sessions_class_id ON schedule_sessions(class_id);
CREATE INDEX IF NOT EXISTS idx_schedule_sessions_start_time ON schedule_sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_schedule_sessions_status ON schedule_sessions(status);

-- FK tới classes: thêm nếu chưa có (bỏ qua nếu bảng classes chưa tồn tại/không tương thích)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_class'
  ) THEN
    ALTER TABLE schedule_sessions
      ADD CONSTRAINT fk_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Bỏ qua FK fk_class: %', SQLERRM;
END
$$;
