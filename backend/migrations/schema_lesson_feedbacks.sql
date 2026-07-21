-- Kích hoạt extension UUID nếu chưa có
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tạo bảng lesson_feedbacks
CREATE TABLE lesson_feedbacks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID NOT NULL, -- ID của buổi học (liên kết với bảng lessons/bookings)
    tutor_id UUID NOT NULL, -- ID của gia sư
    student_id UUID NOT NULL, -- ID của học sinh/phụ huynh
    subject_name VARCHAR(255),
    focus_rating SMALLINT NOT NULL CHECK (focus_rating >= 1 AND focus_rating <= 5),
    understanding_level VARCHAR(50) NOT NULL CHECK (understanding_level IN ('Tốt', 'Khá', 'Cần cố gắng')),
    homework_status VARCHAR(50) NOT NULL CHECK (homework_status IN ('Đã hoàn thành', 'Chưa hoàn thành', 'Không có bài tập')),
    tutor_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tạo Index để tối ưu truy vấn theo học sinh (cho ParentTimeline)
CREATE INDEX idx_lesson_feedbacks_student_id ON lesson_feedbacks(student_id);

-- ROW LEVEL SECURITY (RLS) POLICY 
-- (Đọc hướng dẫn chi tiết trong file README / Câu trả lời)
ALTER TABLE lesson_feedbacks ENABLE ROW LEVEL SECURITY;

-- 1. Policy cho Phụ huynh/Học sinh: Chỉ được SELECT (Xem) feedback của chính mình
CREATE POLICY "Parents/Students can view their own feedbacks"
ON lesson_feedbacks
FOR SELECT
USING (auth.uid() = student_id);

-- 2. Policy cho Gia sư: Chỉ được INSERT (Tạo) feedback và xem feedback do mình tạo
CREATE POLICY "Tutors can insert feedbacks"
ON lesson_feedbacks
FOR INSERT
WITH CHECK (auth.uid() = tutor_id);

CREATE POLICY "Tutors can view their own created feedbacks"
ON lesson_feedbacks
FOR SELECT
USING (auth.uid() = tutor_id);
