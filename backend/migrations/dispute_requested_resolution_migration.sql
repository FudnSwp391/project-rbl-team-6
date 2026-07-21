-- Thêm cột tuỳ chọn để học sinh nêu mong muốn hướng giải quyết (chỉ mang tính tham khảo cho admin).
-- Nullable, không ảnh hưởng tới các cột/route đã có.
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS student_requested_resolution TEXT;
