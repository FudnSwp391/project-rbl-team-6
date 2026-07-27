-- reschedule_requests_migration.sql
-- Mục đích: Tạo bảng reschedule_requests cho tính năng Đổi lịch học
-- Chạy trong Supabase: Project → SQL Editor → New Query → Paste → Run

-- ============================================================
-- BẢNG reschedule_requests
-- Lưu yêu cầu đổi lịch từ học sinh, gia sư sẽ accept/reject
-- ============================================================
CREATE TABLE IF NOT EXISTS reschedule_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tutor_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Lịch cũ (snapshot tại thời điểm tạo request)
  old_lesson_date DATE NOT NULL,
  old_time_slot   TEXT NOT NULL,
  -- Lịch mới muốn đổi đến
  new_lesson_date DATE NOT NULL,
  new_time_slot   TEXT NOT NULL,
  -- Lý do học sinh cung cấp (optional)
  reason          TEXT,
  -- Trạng thái: PENDING → ACCEPTED hoặc REJECTED hoặc CANCELLED
  status          TEXT NOT NULL DEFAULT 'PENDING'
                  CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED')),
  -- Lý do từ chối (nếu tutor reject, optional)
  reject_reason   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes để query nhanh
CREATE INDEX IF NOT EXISTS idx_reschedule_requests_booking_id
  ON reschedule_requests(booking_id);

CREATE INDEX IF NOT EXISTS idx_reschedule_requests_tutor_id_status
  ON reschedule_requests(tutor_id, status);

CREATE INDEX IF NOT EXISTS idx_reschedule_requests_student_id
  ON reschedule_requests(student_id);

-- Trigger tự động cập nhật updated_at (reuse hàm update_updated_at đã có)
CREATE OR REPLACE TRIGGER set_reschedule_requests_updated_at
BEFORE UPDATE ON reschedule_requests
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
