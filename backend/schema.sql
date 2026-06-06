-- ================================================================
-- EduX Database Schema
-- Chạy file này trong Supabase:
--   Project → SQL Editor → New Query → Paste → Run
-- ================================================================

-- Bảng users
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
