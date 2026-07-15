-- Cho phép học sinh rút đơn khiếu nại. status vẫn giữ nguyên 'OPEN' sau khi rút
-- (không đổi ENUM) — mọi nơi check status='OPEN' phải cộng thêm điều kiện
-- withdrawn_at IS NULL để có nghĩa "đang mở thật sự".
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS withdrawn_at TIMESTAMPTZ;
