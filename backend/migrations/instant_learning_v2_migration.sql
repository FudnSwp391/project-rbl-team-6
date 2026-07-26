-- instant_learning_v2_migration.sql

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS meeting_link TEXT,
ADD COLUMN IF NOT EXISTS student_joined_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS tutor_joined_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS late_minutes_student INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS late_minutes_tutor INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS refund_amount NUMERIC DEFAULT 0;

-- Link Meet/Zoom mặc định của gia sư, tự điền sẵn ở bước chấp nhận yêu cầu Học Ngay lần sau
ALTER TABLE tutor_profiles
ADD COLUMN IF NOT EXISTS default_meet_link TEXT;

-- Lưu ý: khiếu nại buổi Học Ngay dùng chung bảng `disputes` đã có sẵn (xem
-- POST /api/instant-booking/review-dispute) để hiển thị được ở Admin > Tranh Chấp,
-- KHÔNG dùng bảng booking_disputes riêng (không có route admin nào đọc/xử lý bảng đó).

-- bookings.status có CHECK constraint cũ chỉ cho phép:
-- Pending, Approved, Declined, Rejected, Cancelled, Timeout, InProgress, Completed
-- → thiếu 'Accepted' (gia sư đã xác nhận, đang chuẩn bị phòng — bước trung gian trước
-- InProgress) và 'Disputed' (kết thúc buổi Học Ngay nhưng đang bị khiếu nại), khiến
-- UPDATE bookings SET status='Accepted' bị Postgres chặn với lỗi
-- "new row for relation bookings violates check constraint bookings_status_check".
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
  CHECK (status = ANY (ARRAY[
    'Pending'::text, 'Approved'::text, 'Accepted'::text, 'Declined'::text, 'Rejected'::text,
    'Cancelled'::text, 'Timeout'::text, 'InProgress'::text, 'Completed'::text, 'Disputed'::text
  ]));
