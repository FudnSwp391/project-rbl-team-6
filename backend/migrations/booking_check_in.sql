-- Check-in của gia sư + cờ đã nhắc lịch trước buổi học
-- (chuyển từ migrate_check_in.js sang SQL thuần — idempotent)

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS tutor_check_in_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS notified_tutor_before_lesson BOOLEAN DEFAULT false;
