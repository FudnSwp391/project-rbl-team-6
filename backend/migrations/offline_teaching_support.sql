-- Migration: Thêm các trường hỗ trợ dạy Offline cho Tutor Profile và Booking
-- Chạy trong Supabase: Project > SQL Editor > Paste > Run
-- ================================================================

-- 1. Bảng tutor_profiles
ALTER TABLE tutor_profiles
  ADD COLUMN IF NOT EXISTS teaching_mode VARCHAR(20) DEFAULT 'Online',
  ADD COLUMN IF NOT EXISTS offline_address TEXT,
  ADD COLUMN IF NOT EXISTS offline_latitude NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS offline_longitude NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS offline_radius_km NUMERIC(5, 2);

-- 2. Bảng bookings
-- Thêm các trường lưu snapshot địa điểm học tại thời điểm tạo booking
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS meeting_address TEXT,
  ADD COLUMN IF NOT EXISTS meeting_latitude NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS meeting_longitude NUMERIC(10, 7);