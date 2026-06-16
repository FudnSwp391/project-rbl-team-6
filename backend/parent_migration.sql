-- ══════════════════════════════════════════════════════════════════════════════
--  Parent-Student Linking System Migration
-- ══════════════════════════════════════════════════════════════════════════════

-- Bảng liên kết phụ huynh ↔ học sinh
CREATE TABLE IF NOT EXISTS parent_children (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nickname   VARCHAR(100),                    -- Tên phụ huynh đặt cho con (tuỳ chọn)
  linked_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parent_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_parent_children_parent  ON parent_children(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_children_student ON parent_children(student_id);

-- Bảng mã chia sẻ cố định — mỗi học sinh có 1 mã duy nhất, vĩnh viễn
-- Học sinh KHÔNG thể xóa/tạo lại mã (chỉ phụ huynh có quyền hủy liên kết)
CREATE TABLE IF NOT EXISTS student_link_codes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code       CHAR(8) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id),   -- 1 học sinh chỉ có 1 mã
  UNIQUE(code)          -- Mã phải duy nhất trong toàn hệ thống
);

CREATE INDEX IF NOT EXISTS idx_student_link_codes_code ON student_link_codes(code);
