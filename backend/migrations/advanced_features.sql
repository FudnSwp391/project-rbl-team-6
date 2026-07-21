-- Advanced Features: lesson_feedbacks, milestones, evidences, parent_feedbacks,
-- disputes và cờ KYC cho tutor_profiles
-- (chuyển từ migrate_advanced_features.js sang SQL thuần — idempotent)

-- 1. Nhật ký buổi học (gia sư ghi nhận sau mỗi buổi)
CREATE TABLE IF NOT EXISTS lesson_feedbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL,
    tutor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_name VARCHAR(255),
    focus_rating SMALLINT NOT NULL CHECK (focus_rating >= 1 AND focus_rating <= 5),
    understanding_level VARCHAR(50) NOT NULL CHECK (understanding_level IN ('Tốt', 'Tạm', 'Kém')),
    homework_status VARCHAR(50) NOT NULL CHECK (homework_status IN ('Có', 'Làm một nửa', 'Không', 'Không có bài tập')),
    tutor_note TEXT,
    milestone_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Cột mốc học tập của lớp
CREATE TABLE IF NOT EXISTS milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    tutor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    target_date DATE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'done')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE lesson_feedbacks
DROP CONSTRAINT IF EXISTS fk_lesson_feedbacks_milestone;

ALTER TABLE lesson_feedbacks
ADD CONSTRAINT fk_lesson_feedbacks_milestone
FOREIGN KEY (milestone_id) REFERENCES milestones(id) ON DELETE SET NULL;

-- 3. Minh chứng cho cột mốc
CREATE TABLE IF NOT EXISTS evidences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    milestone_id UUID NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_type TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Đánh giá của phụ huynh
CREATE TABLE IF NOT EXISTS parent_feedbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tutor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID,
    evaluation VARCHAR(50) NOT NULL CHECK (evaluation IN ('Có', 'Không đổi', 'Kém đi')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Khiếu nại buổi học (phụ huynh báo cáo sự cố)
CREATE TABLE IF NOT EXISTS disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID,
    parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
    held_amount NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- 6. Cờ KYC cho gia sư
ALTER TABLE tutor_profiles
ADD COLUMN IF NOT EXISTS is_identity_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_degree_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS test_passed BOOLEAN DEFAULT false;
