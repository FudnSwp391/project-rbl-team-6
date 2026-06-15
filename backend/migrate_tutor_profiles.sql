-- ================================================================
-- Migration: Thêm các cột còn thiếu vào bảng tutor_profiles
-- Chạy trong Supabase: Project → SQL Editor → Paste → Run
-- ================================================================

ALTER TABLE tutor_profiles
  ADD COLUMN IF NOT EXISTS first_name        TEXT,
  ADD COLUMN IF NOT EXISTS last_name         TEXT,
  ADD COLUMN IF NOT EXISTS display_name      TEXT,
  ADD COLUMN IF NOT EXISTS birthday          DATE,
  ADD COLUMN IF NOT EXISTS gender            TEXT,
  ADD COLUMN IF NOT EXISTS country           TEXT,
  ADD COLUMN IF NOT EXISTS city              TEXT,
  ADD COLUMN IF NOT EXISTS phone             TEXT,
  ADD COLUMN IF NOT EXISTS education         TEXT,
  ADD COLUMN IF NOT EXISTS language          TEXT,
  ADD COLUMN IF NOT EXISTS hourly_rate       NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS teaching_style    TEXT,
  ADD COLUMN IF NOT EXISTS qualifications    TEXT,
  ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;
