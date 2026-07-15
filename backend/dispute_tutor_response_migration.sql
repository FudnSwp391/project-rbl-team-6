-- Thêm cột để gia sư giải trình trước khi admin ra quyết định cuối cho 1 dispute
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS tutor_response TEXT;
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS tutor_response_at TIMESTAMPTZ;
