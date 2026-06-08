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
