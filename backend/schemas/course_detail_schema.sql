-- ================================================================
-- EduX Course Detail Schema (Person 4)
-- Chạy file này trong Supabase:
--   Project → SQL Editor → New Query → Paste → Run
--
-- ⚠️  Chạy SAU schema.sql chính (cần bảng users + function update_updated_at)
-- ================================================================


-- ── 1. Bảng courses ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS courses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  description     TEXT,
  instructor_name TEXT NOT NULL,
  category        TEXT,
  image_url       TEXT,
  meet_link       TEXT,                -- Google Meet link
  start_date      DATE,
  end_date        DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category);

CREATE OR REPLACE TRIGGER set_courses_updated_at
BEFORE UPDATE ON courses
FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ── 2. Bảng lessons ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lessons (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id     UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  module_title  TEXT NOT NULL,           -- Tên module (VD: "Module 1: Visual Design")
  lesson_title  TEXT NOT NULL,           -- Tên bài học cụ thể
  lesson_order  INT NOT NULL DEFAULT 0,  -- Thứ tự sắp xếp trong module
  duration      TEXT,                    -- VD: "15:00", "45:00"
  status        TEXT NOT NULL DEFAULT 'locked'
                CHECK (status IN ('completed', 'in_progress', 'locked')),
  video_url     TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_order     ON lessons(course_id, lesson_order);

CREATE OR REPLACE TRIGGER set_lessons_updated_at
BEFORE UPDATE ON lessons
FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ── 3. Bảng assignments ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assignments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  due_date    DATE,
  points      INT NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'locked'
              CHECK (status IN ('pending', 'submitted', 'graded', 'locked')),
  score       INT,                       -- Điểm đã chấm (NULL nếu chưa chấm)
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assignments_course_id ON assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status    ON assignments(status);

CREATE OR REPLACE TRIGGER set_assignments_updated_at
BEFORE UPDATE ON assignments
FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ── 4. Bảng materials ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS materials (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  file_url    TEXT,                       -- Link file trên Supabase Storage
  file_type   TEXT,                       -- VD: "pdf", "sketch", "figma", "doc"
  file_size   TEXT,                       -- VD: "2.4 MB"
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_materials_course_id ON materials(course_id);

CREATE OR REPLACE TRIGGER set_materials_updated_at
BEFORE UPDATE ON materials
FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ── 5. Bảng course_progress ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS course_progress (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id         UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  completed_lessons INT NOT NULL DEFAULT 0,
  total_lessons     INT NOT NULL DEFAULT 0,
  progress_percent  NUMERIC(5,2) NOT NULL DEFAULT 0.00,  -- VD: 45.00
  xp_points         INT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),

  -- Mỗi student chỉ có 1 record tiến độ cho mỗi course
  UNIQUE(course_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_progress_course_id  ON course_progress(course_id);
CREATE INDEX IF NOT EXISTS idx_progress_student_id ON course_progress(student_id);

CREATE OR REPLACE TRIGGER set_progress_updated_at
BEFORE UPDATE ON course_progress
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
