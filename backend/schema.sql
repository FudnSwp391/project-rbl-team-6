-- ================================================================
-- EduX Database Schema
-- Chạy file này trong Supabase:
--   Project → SQL Editor → New Query → Paste → Run
-- ================================================================

-- ── Bảng users (giữ nguyên) ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name     TEXT,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT,          -- NULL nếu đăng nhập bằng Google
  role          TEXT NOT NULL DEFAULT 'student'
                CHECK (role IN ('student', 'parent', 'tutor', 'admin')),
  google_id     TEXT UNIQUE,   -- NULL nếu đăng ký bằng email/password
  picture       TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Index tìm nhanh theo email và google_id
CREATE INDEX IF NOT EXISTS idx_users_email     ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- Tự động cập nhật updated_at khi UPDATE
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ── Bảng tutor_profiles (NEW) ────────────────────────────────────────────────
-- Lưu hồ sơ đăng ký gia sư, gồm thông tin cá nhân, chứng chỉ và trạng thái duyệt
CREATE TABLE IF NOT EXISTS tutor_profiles (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bio              TEXT,                    -- Giới thiệu bản thân
  subjects         TEXT,                    -- Môn dạy (có thể là chuỗi CSV hoặc JSON)
  experience_years INT DEFAULT 0,           -- Số năm kinh nghiệm
  certificate_url  TEXT,                   -- Link ảnh/file chứng chỉ
  cccd_url         TEXT,                   -- Link ảnh CCCD/ID card
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'approved', 'rejected')),
  reject_reason    TEXT,                   -- Lý do từ chối (nếu có)
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Index để query nhanh theo status và user_id
CREATE INDEX IF NOT EXISTS idx_tutor_profiles_status  ON tutor_profiles(status);
CREATE INDEX IF NOT EXISTS idx_tutor_profiles_user_id ON tutor_profiles(user_id);

-- Trigger tự động cập nhật updated_at cho tutor_profiles
CREATE OR REPLACE TRIGGER set_tutor_updated_at
BEFORE UPDATE ON tutor_profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
-- Note: reuses the update_updated_at() function defined above


-- ═══════════════════════════════════════════════════════════════════════════════
-- ── PERSON 4: Class Workspace & AI Learning Path ─────────────────────────────
-- ═══════════════════════════════════════════════════════════════════════════════


-- ── Bảng classes ─────────────────────────────────────────────────────────────
-- Lớp học do tutor tạo, chứa link Google Meet, ngày bắt đầu/kết thúc
CREATE TABLE IF NOT EXISTS classes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  tutor_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  meet_link   TEXT,                          -- Google Meet link
  start_date  DATE,
  end_date    DATE,
  status      TEXT NOT NULL DEFAULT 'active'
              CHECK (status IN ('active', 'archived', 'draft')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_classes_tutor_id ON classes(tutor_id);
CREATE INDEX IF NOT EXISTS idx_classes_status   ON classes(status);

CREATE OR REPLACE TRIGGER set_classes_updated_at
BEFORE UPDATE ON classes
FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ── Bảng class_members ──────────────────────────────────────────────────────
-- Quan hệ N-N giữa classes và students
-- Mỗi student chỉ join 1 lần vào mỗi class (UNIQUE constraint)
CREATE TABLE IF NOT EXISTS class_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id   UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  joined_at  TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(class_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_class_members_class_id   ON class_members(class_id);
CREATE INDEX IF NOT EXISTS idx_class_members_student_id ON class_members(student_id);


-- ── Bảng materials ──────────────────────────────────────────────────────────
-- Tài liệu học tập: PDF, PPT, DOCX, Video, Links
-- file_url sẽ trỏ tới Supabase Storage khi tích hợp upload
CREATE TABLE IF NOT EXISTS materials (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id    UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  file_url    TEXT,                           -- Link file trên Supabase Storage
  file_type   TEXT,                           -- VD: 'pdf', 'ppt', 'docx', 'video', 'link'
  file_size   TEXT,                           -- VD: '2.4 MB'
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_materials_class_id    ON materials(class_id);
CREATE INDEX IF NOT EXISTS idx_materials_uploaded_by ON materials(uploaded_by);

CREATE OR REPLACE TRIGGER set_materials_updated_at
BEFORE UPDATE ON materials
FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ── Bảng assignments ────────────────────────────────────────────────────────
-- Bài tập do tutor giao cho lớp
CREATE TABLE IF NOT EXISTS assignments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id    UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  due_date    DATE,
  created_by  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assignments_class_id   ON assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date   ON assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_assignments_created_by ON assignments(created_by);

CREATE OR REPLACE TRIGGER set_assignments_updated_at
BEFORE UPDATE ON assignments
FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ── Bảng discussions ────────────────────────────────────────────────────────
-- Bài đăng thảo luận trong lớp: câu hỏi, thông báo, thảo luận chung
CREATE TABLE IF NOT EXISTS discussions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id        UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  title           TEXT NOT NULL,
  content         TEXT,
  discussion_type TEXT NOT NULL DEFAULT 'discussion'
                  CHECK (discussion_type IN ('question', 'announcement', 'discussion')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discussions_class_id ON discussions(class_id);
CREATE INDEX IF NOT EXISTS idx_discussions_user_id  ON discussions(user_id);
CREATE INDEX IF NOT EXISTS idx_discussions_type     ON discussions(discussion_type);

CREATE OR REPLACE TRIGGER set_discussions_updated_at
BEFORE UPDATE ON discussions
FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ── Bảng discussion_replies ─────────────────────────────────────────────────
-- Phản hồi cho mỗi bài thảo luận
CREATE TABLE IF NOT EXISTS discussion_replies (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id UUID NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id)       ON DELETE CASCADE,
  content       TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_replies_discussion_id ON discussion_replies(discussion_id);
CREATE INDEX IF NOT EXISTS idx_replies_user_id       ON discussion_replies(user_id);

CREATE OR REPLACE TRIGGER set_replies_updated_at
BEFORE UPDATE ON discussion_replies
FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ================================================================
-- SEED DATA (chỉ dùng để test — xóa trước khi deploy production)
-- ================================================================
-- Bước 1: Tạo user test với role 'tutor'
-- INSERT INTO users (full_name, email, password_hash, role)
-- VALUES ('Nguyen Van Test', 'testtutor@example.com', 'hashed_pw_placeholder', 'tutor')
-- RETURNING id;
--
-- Bước 2: Chép UUID trả về ở trên vào <user_uuid> bên dưới, rồi chạy:
-- INSERT INTO tutor_profiles
--   (user_id, bio, subjects, experience_years, certificate_url, cccd_url, status)
-- VALUES
--   (
--     '<user_uuid>',
--     'I am a passionate mathematics tutor with 5 years of teaching experience.',
--     'Mathematics, Physics',
--     5,
--     'https://example.com/certificates/cert.pdf',
--     'https://example.com/cccd/cccd.jpg',
--     'pending'
--   );
--
-- Hoặc tạo admin để test login:
-- INSERT INTO users (full_name, email, password_hash, role)
-- VALUES ('Admin EduX', 'admin@edux.com', '<bcrypt_hash>', 'admin');
-- ================================================================

-- ── Bảng lessons (NEW) ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lessons (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id          UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  description       TEXT,
  lesson_order      INTEGER,
  duration_minutes  INTEGER,
  video_url         TEXT,
  material_id       UUID REFERENCES materials(id) ON DELETE SET NULL,
  status            TEXT NOT NULL DEFAULT 'published',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lessons_class_id ON lessons(class_id);
CREATE INDEX IF NOT EXISTS idx_lessons_lesson_order ON lessons(lesson_order);

CREATE OR REPLACE TRIGGER set_lessons_updated_at
BEFORE UPDATE ON lessons
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Bảng learning_paths (NEW) ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS learning_paths (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id        UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  current_level   TEXT,
  target_level    TEXT,
  goal            TEXT,
  duration_weeks  INTEGER DEFAULT 8,
  generated_plan  JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(class_id, student_id)
);

-- Bảng learning_path_steps (NEW) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS learning_path_steps (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learning_path_id  UUID NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
  lesson_id         UUID REFERENCES lessons(id) ON DELETE SET NULL,
  step_order        INTEGER,
  title             TEXT NOT NULL,
  description       TEXT,
  estimated_week    INTEGER,
  status            TEXT NOT NULL DEFAULT 'pending',
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_learning_paths_class_student ON learning_paths(class_id, student_id);
CREATE INDEX IF NOT EXISTS idx_learning_path_steps_path ON learning_path_steps(learning_path_id);

CREATE OR REPLACE TRIGGER set_learning_paths_updated_at
BEFORE UPDATE ON learning_paths
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

