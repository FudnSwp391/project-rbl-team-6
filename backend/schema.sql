-- ================================================================
-- EduX Database Schema
-- Chạy file này trong Supabase:
--   Project → SQL Editor → New Query → Paste → Run
-- ================================================================

-- ── Bảng users (giữ nguyên) ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name     TEXT,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  role          TEXT NOT NULL DEFAULT 'student'
                CHECK (role IN ('student', 'parent', 'tutor', 'admin')),
  google_id     TEXT UNIQUE,
  picture       TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email     ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ── Bảng tutor_profiles ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tutor_profiles (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bio              TEXT,
  bio_status       TEXT NOT NULL DEFAULT 'approved'
                   CHECK (bio_status IN ('pending', 'approved', 'rejected')),
  bio_pending      TEXT,                   -- Nội dung bio đang chờ duyệt
  subjects         TEXT,
  headline         TEXT,
  phone            TEXT,
  location         TEXT,
  teaching_style   TEXT,
  demo_video_url   TEXT,
  experience_years INT DEFAULT 0,
  certificate_url  TEXT,
  cccd_url         TEXT,
  hourly_rate      INT DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
  reject_reason    TEXT,
  approved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tutor_profiles_status  ON tutor_profiles(status);
CREATE INDEX IF NOT EXISTS idx_tutor_profiles_user_id ON tutor_profiles(user_id);

ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS headline TEXT;
ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS teaching_style TEXT;
ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS demo_video_url TEXT;
ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS hourly_rate INT DEFAULT 0;
ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS bio_status TEXT DEFAULT 'approved';
ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS bio_pending TEXT;
ALTER TABLE tutor_profiles ALTER COLUMN status SET DEFAULT 'draft';

DO $$
BEGIN
  ALTER TABLE tutor_profiles DROP CONSTRAINT IF EXISTS tutor_profiles_status_check;
  ALTER TABLE tutor_profiles
    ADD CONSTRAINT tutor_profiles_status_check
    CHECK (status IN ('draft', 'pending', 'approved', 'rejected'));
END $$;

CREATE OR REPLACE TRIGGER set_tutor_updated_at
BEFORE UPDATE ON tutor_profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ── Bảng tutor_credentials (bằng cấp, chứng chỉ, kinh nghiệm — cần duyệt) ───
-- Mỗi row là 1 mục (1 tấm bằng, 1 chứng chỉ, 1 vị trí kinh nghiệm)
-- Kèm ảnh/file minh chứng để admin xác nhận
CREATE TABLE IF NOT EXISTS tutor_credentials (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id      UUID NOT NULL REFERENCES tutor_profiles(id) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (type IN ('education', 'certificate', 'experience')),
  title         TEXT NOT NULL,             -- VD: "Ph.D. in Mathematics - Stanford"
  description   TEXT,                     -- Mô tả thêm (tuỳ chọn)
  proof_url     TEXT,                     -- URL ảnh/file minh chứng (bắt buộc với education/certificate)
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'approved', 'rejected')),
  reject_reason TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credentials_tutor_id ON tutor_credentials(tutor_id);
CREATE INDEX IF NOT EXISTS idx_credentials_status   ON tutor_credentials(status);
CREATE INDEX IF NOT EXISTS idx_credentials_type     ON tutor_credentials(type);

CREATE OR REPLACE TRIGGER set_credentials_updated_at
BEFORE UPDATE ON tutor_credentials
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Bảng bookings (đặt lịch học giữa student/parent và tutor) ───────────────
CREATE TABLE IF NOT EXISTS bookings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tutor_name   TEXT,
  student_name TEXT,
  child_name   TEXT,
  subject      TEXT,
    lesson_date  DATE NOT NULL,
    time_slot    TEXT NOT NULL,
    note         TEXT,
    booking_type TEXT NOT NULL DEFAULT 'regular'
                 CHECK (booking_type IN ('regular', 'trial')),
    status       TEXT NOT NULL DEFAULT 'Pending'
                 CHECK (status IN ('Pending', 'Approved', 'Declined')),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_tutor_id   ON bookings(tutor_id);
CREATE INDEX IF NOT EXISTS idx_bookings_student_id ON bookings(student_id);
CREATE INDEX IF NOT EXISTS idx_bookings_lesson_date ON bookings(lesson_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status     ON bookings(status);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_type TEXT DEFAULT 'regular';
UPDATE bookings SET booking_type = 'regular' WHERE booking_type IS NULL OR booking_type NOT IN ('regular', 'trial');
CREATE UNIQUE INDEX IF NOT EXISTS uq_bookings_active_slot
  ON bookings(tutor_id, lesson_date, time_slot)
  WHERE status IN ('Pending', 'Approved');

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS tutor_name TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS student_name TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS child_name TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE OR REPLACE TRIGGER set_booking_updated_at
BEFORE UPDATE ON bookings
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Bảng attendance (điểm danh từng buổi học) ────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  tutor_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status      TEXT NOT NULL CHECK (status IN ('present', 'absent', 'excused')),
  note        TEXT,
  marked_at   TIMESTAMPTZ DEFAULT NOW(),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_tutor_id   ON attendance(tutor_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_status     ON attendance(status);

CREATE OR REPLACE TRIGGER set_attendance_updated_at
BEFORE UPDATE ON attendance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE IF NOT EXISTS tutor_reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  booking_id  UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  rating      INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tutor_reviews_tutor_id   ON tutor_reviews(tutor_id);
CREATE INDEX IF NOT EXISTS idx_tutor_reviews_student_id ON tutor_reviews(student_id);

CREATE OR REPLACE TRIGGER set_tutor_reviews_updated_at
BEFORE UPDATE ON tutor_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Course marketplace: tutors can sell self-paced video courses.
CREATE TABLE IF NOT EXISTS courses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  subject       TEXT,
  level         TEXT,
  price         INT NOT NULL DEFAULT 0 CHECK (price >= 0),
  thumbnail_url TEXT,
  learning_outcomes JSONB NOT NULL DEFAULT '[]'::jsonb,
  requirements      JSONB NOT NULL DEFAULT '[]'::jsonb,
  status        TEXT NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft', 'pending_review', 'published', 'rejected', 'archived')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_courses_tutor_id ON courses(tutor_id);
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);

ALTER TABLE courses ADD COLUMN IF NOT EXISTS learning_outcomes JSONB DEFAULT '[]'::jsonb;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS requirements JSONB DEFAULT '[]'::jsonb;

CREATE OR REPLACE TRIGGER set_courses_updated_at
BEFORE UPDATE ON courses
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE IF NOT EXISTS course_lessons (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id      UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  description    TEXT,
  video_url      TEXT,
  material_url   TEXT,
  duration_label TEXT,
  is_preview     BOOLEAN NOT NULL DEFAULT false,
  position       INT NOT NULL DEFAULT 1,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_course_lessons_course_id ON course_lessons(course_id);

CREATE OR REPLACE TRIGGER set_course_lessons_updated_at
BEFORE UPDATE ON course_lessons
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE IF NOT EXISTS course_enrollments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id    UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_name TEXT,
  child_name   TEXT,
  status       TEXT NOT NULL DEFAULT 'active'
               CHECK (status IN ('active', 'refunded', 'cancelled')),
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_course_enrollments_student_id ON course_enrollments(student_id);

CREATE OR REPLACE TRIGGER set_course_enrollments_updated_at
BEFORE UPDATE ON course_enrollments
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE IF NOT EXISTS course_progress (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id   UUID NOT NULL REFERENCES course_enrollments(id) ON DELETE CASCADE,
  lesson_id       UUID NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
  watched_seconds INT NOT NULL DEFAULT 0,
  is_completed    BOOLEAN NOT NULL DEFAULT false,
  completed_at    TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(enrollment_id, lesson_id)
);


-- ── Bảng tutor_availability (lịch dạy — không cần duyệt) ─────────────────────
-- Mỗi row là 1 khung giờ trong tuần
CREATE TABLE IF NOT EXISTS tutor_availability (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id   UUID NOT NULL REFERENCES tutor_profiles(id) ON DELETE CASCADE,
  day_of_week TEXT NOT NULL
              CHECK (day_of_week IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
  time_slot  TEXT NOT NULL,               -- VD: "09:00 AM", "02:30 PM"
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_availability_tutor_id ON tutor_availability(tutor_id);
-- Tránh trùng lặp slot
CREATE UNIQUE INDEX IF NOT EXISTS idx_availability_unique
  ON tutor_availability(tutor_id, day_of_week, time_slot);


-- ── Bảng conversations ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tutor_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  CHECK (student_id <> tutor_id),
  UNIQUE(student_id, tutor_id)
);

CREATE INDEX IF NOT EXISTS idx_conv_student ON conversations(student_id);
CREATE INDEX IF NOT EXISTS idx_conv_tutor   ON conversations(tutor_id);

CREATE OR REPLACE TRIGGER set_conv_updated_at
BEFORE UPDATE ON conversations
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Bảng messages ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content         TEXT NOT NULL CHECK (char_length(trim(content)) > 0),
  is_read         BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_msg_conv    ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_msg_sender  ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_msg_receiver_unread ON messages(receiver_id, is_read);
CREATE INDEX IF NOT EXISTS idx_msg_created ON messages(created_at);

-- Enable Realtime cho messages/conversations. Safe to run multiple times.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
  END IF;
END $$;

-- Supabase Storage bucket cho avatar, video demo và minh chứng CV.
-- Nếu project đang dùng policy riêng, có thể điều chỉnh lại theo nhu cầu bảo mật.
INSERT INTO storage.buckets (id, name, public)
VALUES ('edux-media', 'edux-media', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  CREATE POLICY "EduX media public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'edux-media');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "EduX media anon upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'edux-media');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
