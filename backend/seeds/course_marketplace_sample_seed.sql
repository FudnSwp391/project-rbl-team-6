-- ================================================================
-- EduX Course Marketplace Sample Seed
-- Run in Supabase SQL Editor after the main backend migrations.
--
-- This seed follows the current marketplace/tutor course schema used
-- by backend/server.js: courses + course_lessons + users.
-- It creates 6 sample courses for each frontend subject filter.
-- Safe to run multiple times because IDs are deterministic.
-- ================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT,
  level TEXT,
  price INT NOT NULL DEFAULT 0 CHECK (price >= 0),
  thumbnail_url TEXT,
  learning_outcomes JSONB NOT NULL DEFAULT '[]'::jsonb,
  requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending_review', 'published', 'rejected', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE courses ADD COLUMN IF NOT EXISTS tutor_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS instructor_name TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS level TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS price INT DEFAULT 0;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS learning_outcomes JSONB DEFAULT '[]'::jsonb;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS requirements JSONB DEFAULT '[]'::jsonb;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE courses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
UPDATE courses SET instructor_name = 'EduX Tutor' WHERE instructor_name IS NULL;
ALTER TABLE courses ALTER COLUMN instructor_name SET DEFAULT 'EduX Tutor';
ALTER TABLE courses ALTER COLUMN instructor_name DROP NOT NULL;

CREATE TABLE IF NOT EXISTS course_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  material_url TEXT,
  duration_label TEXT,
  is_preview BOOLEAN NOT NULL DEFAULT false,
  position INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE course_lessons ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE CASCADE;
ALTER TABLE course_lessons ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE course_lessons ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE course_lessons ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE course_lessons ADD COLUMN IF NOT EXISTS material_url TEXT;
ALTER TABLE course_lessons ADD COLUMN IF NOT EXISTS duration_label TEXT;
ALTER TABLE course_lessons ADD COLUMN IF NOT EXISTS is_preview BOOLEAN DEFAULT false;
ALTER TABLE course_lessons ADD COLUMN IF NOT EXISTS position INT DEFAULT 1;
ALTER TABLE course_lessons ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE course_lessons ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_courses_subject ON courses(subject);
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);
CREATE INDEX IF NOT EXISTS idx_courses_tutor_id ON courses(tutor_id);
CREATE INDEX IF NOT EXISTS idx_course_lessons_course_id ON course_lessons(course_id);

WITH tutors AS (
  SELECT * FROM (VALUES
    ('edux-toan-tutor'::text, '11111111-1111-4111-8111-111111111111'::uuid, 'Nguyen Minh Khang', 'sample.toan@edux.local'),
    ('edux-anh-tutor',        '22222222-2222-4222-8222-222222222222'::uuid, 'Tran Ha Linh',     'sample.anh@edux.local'),
    ('edux-code-tutor',       '33333333-3333-4333-8333-333333333333'::uuid, 'Le Quang Huy',     'sample.code@edux.local'),
    ('edux-van-tutor',        '44444444-4444-4444-8444-444444444444'::uuid, 'Pham Ngoc Mai',    'sample.van@edux.local'),
    ('edux-science-tutor',    '55555555-5555-4555-8555-555555555555'::uuid, 'Do Anh Tuan',      'sample.khoahoc@edux.local'),
    ('edux-art-tutor',        '66666666-6666-4666-8666-666666666666'::uuid, 'Bui Thao Vy',      'sample.nghethuat@edux.local')
  ) AS t(slug, id, full_name, email)
)
INSERT INTO users (id, full_name, email, password_hash, role, created_at, updated_at)
SELECT id, full_name, email, NULL, 'tutor', NOW(), NOW()
FROM tutors
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = 'tutor',
  updated_at = NOW();

WITH
sample_courses AS (
  SELECT * FROM (VALUES
    ('math-01', '11111111-1111-4111-8111-111111111111'::uuid, 'Toán học', 'Nền tảng Toán lớp 6-7', 'Mất gốc', 299000, 'Xây chắc số học, phân số, số thập phân và bài toán thực tế.', 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=1200&q=80'),
    ('math-02', '11111111-1111-4111-8111-111111111111'::uuid, 'Toán học', 'Đại số lớp 8-9 tăng tốc', 'Cơ bản', 349000, 'Hệ thống hằng đẳng thức, phương trình, hàm số và kỹ năng trình bày.', 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=1200&q=80'),
    ('math-03', '11111111-1111-4111-8111-111111111111'::uuid, 'Toán học', 'Hình học THCS qua sơ đồ tư duy', 'Cơ bản', 329000, 'Rèn cách đọc hình, chứng minh và dùng định lý qua bài tập chọn lọc.', 'https://images.unsplash.com/photo-1596495577886-d920f1fb7238?auto=format&fit=crop&w=1200&q=80'),
    ('math-04', '11111111-1111-4111-8111-111111111111'::uuid, 'Toán học', 'Luyện thi vào lớp 10 môn Toán', 'Luyện thi', 499000, 'Bám sát cấu trúc đề, luyện chuyên đề trọng tâm và chiến thuật làm bài.', 'https://images.unsplash.com/photo-1453733190371-0a9bedd82893?auto=format&fit=crop&w=1200&q=80'),
    ('math-05', '11111111-1111-4111-8111-111111111111'::uuid, 'Toán học', 'Toán THPT: Hàm số và đạo hàm', 'Nâng cao', 459000, 'Nắm bản chất hàm số, đạo hàm, cực trị và bài toán vận dụng.', 'https://images.unsplash.com/photo-1599687267812-35c05ff70ee7?auto=format&fit=crop&w=1200&q=80'),
    ('math-06', '11111111-1111-4111-8111-111111111111'::uuid, 'Toán học', 'Ôn thi THPT Quốc gia môn Toán', 'Luyện thi', 599000, 'Lộ trình 12 tuần bao phủ nhận biết, thông hiểu và vận dụng cao.', 'https://images.unsplash.com/photo-1509869175650-a1d97972541a?auto=format&fit=crop&w=1200&q=80'),

    ('english-01', '22222222-2222-4222-8222-222222222222'::uuid, 'Tiếng Anh', 'Phát âm tiếng Anh từ gốc', 'Mất gốc', 279000, 'Sửa âm phổ biến, luyện trọng âm và ngữ điệu cho giao tiếp rõ ràng.', 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&w=1200&q=80'),
    ('english-02', '22222222-2222-4222-8222-222222222222'::uuid, 'Tiếng Anh', 'Ngữ pháp căn bản cho học sinh', 'Cơ bản', 319000, 'Học thì, câu điều kiện, mệnh đề quan hệ bằng ví dụ dễ nhớ.', 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1200&q=80'),
    ('english-03', '22222222-2222-4222-8222-222222222222'::uuid, 'Tiếng Anh', 'Giao tiếp tiếng Anh hằng ngày', 'Cơ bản', 359000, 'Mẫu câu thực tế cho trường học, công việc, du lịch và phỏng vấn.', 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80'),
    ('english-04', '22222222-2222-4222-8222-222222222222'::uuid, 'Tiếng Anh', 'IELTS Reading & Listening 5.5+', 'Luyện thi', 499000, 'Chiến thuật đọc nhanh, bắt keyword và xử lý dạng câu hỏi thường gặp.', 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1200&q=80'),
    ('english-05', '22222222-2222-4222-8222-222222222222'::uuid, 'Tiếng Anh', 'IELTS Writing Task 1 & 2', 'Nâng cao', 549000, 'Xây khung bài, phát triển ý, dùng từ học thuật và chữa lỗi thường gặp.', 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=80'),
    ('english-06', '22222222-2222-4222-8222-222222222222'::uuid, 'Tiếng Anh', 'TOEIC cấp tốc 650+', 'Luyện thi', 459000, 'Ôn Part 1-7 theo lộ trình ngắn, tập trung mẹo và bài test mô phỏng.', 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80'),

    ('code-01', '33333333-3333-4333-8333-333333333333'::uuid, 'Lập trình', 'Python nhập môn cho người mới', 'Mất gốc', 399000, 'Làm quen biến, vòng lặp, hàm và tư duy giải quyết vấn đề.', 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?auto=format&fit=crop&w=1200&q=80'),
    ('code-02', '33333333-3333-4333-8333-333333333333'::uuid, 'Lập trình', 'JavaScript căn bản', 'Cơ bản', 429000, 'Nắm DOM, event, async và xây mini app chạy trên trình duyệt.', 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80'),
    ('code-03', '33333333-3333-4333-8333-333333333333'::uuid, 'Lập trình', 'React thực chiến với Vite', 'Cơ bản', 549000, 'Tạo component, quản lý state, gọi API và tổ chức project frontend.', 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=1200&q=80'),
    ('code-04', '33333333-3333-4333-8333-333333333333'::uuid, 'Lập trình', 'Node.js & Express API', 'Nâng cao', 559000, 'Thiết kế REST API, middleware, auth và kết nối PostgreSQL.', 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80'),
    ('code-05', '33333333-3333-4333-8333-333333333333'::uuid, 'Lập trình', 'Cấu trúc dữ liệu và giải thuật', 'Nâng cao', 599000, 'Ôn array, stack, queue, tree, graph và cách phân tích độ phức tạp.', 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=80'),
    ('code-06', '33333333-3333-4333-8333-333333333333'::uuid, 'Lập trình', 'SQL và thiết kế database', 'Cơ bản', 449000, 'Từ SELECT, JOIN đến chuẩn hóa bảng và viết truy vấn cho ứng dụng thật.', 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?auto=format&fit=crop&w=1200&q=80'),

    ('literature-01', '44444444-4444-4444-8444-444444444444'::uuid, 'Ngữ văn', 'Đọc hiểu Ngữ văn THCS', 'Cơ bản', 279000, 'Rèn kỹ năng tìm ý, phân tích câu hỏi và trả lời đúng trọng tâm.', 'https://images.unsplash.com/photo-1519682337058-a94d519337bc?auto=format&fit=crop&w=1200&q=80'),
    ('literature-02', '44444444-4444-4444-8444-444444444444'::uuid, 'Ngữ văn', 'Viết đoạn văn nghị luận xã hội', 'Cơ bản', 319000, 'Cách lập luận, dẫn chứng, mở rộng ý và tránh lỗi diễn đạt.', 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=80'),
    ('literature-03', '44444444-4444-4444-8444-444444444444'::uuid, 'Ngữ văn', 'Phân tích thơ hiện đại Việt Nam', 'Nâng cao', 399000, 'Đi từ hình ảnh, nhịp điệu, biện pháp tu từ đến thông điệp tác phẩm.', 'https://images.unsplash.com/photo-1476275466078-4007374efbbe?auto=format&fit=crop&w=1200&q=80'),
    ('literature-04', '44444444-4444-4444-8444-444444444444'::uuid, 'Ngữ văn', 'Văn xuôi lớp 12 trọng tâm', 'Luyện thi', 429000, 'Hệ thống tác phẩm, nhân vật, tình huống truyện và dạng đề thường gặp.', 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=1200&q=80'),
    ('literature-05', '44444444-4444-4444-8444-444444444444'::uuid, 'Ngữ văn', 'Luyện thi vào lớp 10 môn Văn', 'Luyện thi', 449000, 'Ôn đọc hiểu, nghị luận xã hội, nghị luận văn học theo ma trận đề.', 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=1200&q=80'),
    ('literature-06', '44444444-4444-4444-8444-444444444444'::uuid, 'Ngữ văn', 'Kỹ năng viết bài văn đạt điểm cao', 'Nâng cao', 389000, 'Xây bố cục, luận điểm, chuyển ý và phong cách diễn đạt sáng rõ.', 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80'),

    ('science-01', '55555555-5555-4555-8555-555555555555'::uuid, 'Khoa học', 'Vật lý THCS: Cơ học dễ hiểu', 'Cơ bản', 329000, 'Học lực, chuyển động, áp suất qua thí nghiệm và bài tập thực tế.', 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?auto=format&fit=crop&w=1200&q=80'),
    ('science-02', '55555555-5555-4555-8555-555555555555'::uuid, 'Khoa học', 'Hóa học nhập môn lớp 8-9', 'Mất gốc', 329000, 'Nắm nguyên tử, phân tử, phương trình hóa học và tính toán cơ bản.', 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1200&q=80'),
    ('science-03', '55555555-5555-4555-8555-555555555555'::uuid, 'Khoa học', 'Sinh học: Di truyền và biến dị', 'Cơ bản', 349000, 'Hiểu ADN, gen, lai một cặp tính trạng và bài tập phả hệ đơn giản.', 'https://images.unsplash.com/photo-1576086213369-97a306d36557?auto=format&fit=crop&w=1200&q=80'),
    ('science-04', '55555555-5555-4555-8555-555555555555'::uuid, 'Khoa học', 'Vật lý THPT: Điện xoay chiều', 'Nâng cao', 489000, 'Công thức, giản đồ vector, mạch RLC và bài tập vận dụng cao.', 'https://images.unsplash.com/photo-1517976487492-5750f3195933?auto=format&fit=crop&w=1200&q=80'),
    ('science-05', '55555555-5555-4555-8555-555555555555'::uuid, 'Khoa học', 'Hóa hữu cơ luyện thi THPT', 'Luyện thi', 529000, 'Hệ thống nhận biết, phản ứng, chuỗi chuyển hóa và bài tập đếm chất.', 'https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?auto=format&fit=crop&w=1200&q=80'),
    ('science-06', '55555555-5555-4555-8555-555555555555'::uuid, 'Khoa học', 'Khoa học tự nhiên qua dự án', 'Cơ bản', 379000, 'Học liên môn bằng dự án nhỏ: môi trường, năng lượng và cơ thể người.', 'https://images.unsplash.com/photo-1581093458791-9d42cc0309f0?auto=format&fit=crop&w=1200&q=80'),

    ('art-01', '66666666-6666-4666-8666-666666666666'::uuid, 'Nghệ thuật', 'Vẽ căn bản: Hình khối và ánh sáng', 'Mất gốc', 299000, 'Luyện quan sát, dựng hình, đánh bóng và bố cục tĩnh vật.', 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1200&q=80'),
    ('art-02', '66666666-6666-4666-8666-666666666666'::uuid, 'Nghệ thuật', 'Màu nước cho người mới bắt đầu', 'Cơ bản', 339000, 'Kỹ thuật loang màu, phối màu, tạo texture và hoàn thiện tranh nhỏ.', 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=1200&q=80'),
    ('art-03', '66666666-6666-4666-8666-666666666666'::uuid, 'Nghệ thuật', 'Digital Painting với Procreate', 'Cơ bản', 449000, 'Thiết lập brush, layer, ánh sáng và quy trình vẽ nhân vật đơn giản.', 'https://images.unsplash.com/photo-1580136579312-94651dfd596d?auto=format&fit=crop&w=1200&q=80'),
    ('art-04', '66666666-6666-4666-8666-666666666666'::uuid, 'Nghệ thuật', 'Thiết kế poster bằng Canva', 'Cơ bản', 259000, 'Nắm bố cục, chữ, màu sắc và tạo poster truyền thông học đường.', 'https://images.unsplash.com/photo-1497493292307-31c376b6e479?auto=format&fit=crop&w=1200&q=80'),
    ('art-05', '66666666-6666-4666-8666-666666666666'::uuid, 'Nghệ thuật', 'Nhiếp ảnh cơ bản bằng điện thoại', 'Cơ bản', 289000, 'Bố cục, ánh sáng, chỉnh màu và kể chuyện qua bộ ảnh cá nhân.', 'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?auto=format&fit=crop&w=1200&q=80'),
    ('art-06', '66666666-6666-4666-8666-666666666666'::uuid, 'Nghệ thuật', 'Sketch nhân vật anime', 'Nâng cao', 399000, 'Tỷ lệ cơ thể, biểu cảm, tóc, trang phục và hoàn thiện line art.', 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?auto=format&fit=crop&w=1200&q=80')
  ) AS c(slug, tutor_id, subject, title, level, price, description, thumbnail_url)
),
upsert_courses AS (
  INSERT INTO courses (
    id,
    tutor_id,
    instructor_name,
    title,
    description,
    subject,
    level,
    price,
    thumbnail_url,
    status,
    learning_outcomes,
    requirements,
    created_at,
    updated_at
  )
  SELECT
    (
      substr(md5('edux-sample-course-' || slug), 1, 8) || '-' ||
      substr(md5('edux-sample-course-' || slug), 9, 4) || '-4' ||
      substr(md5('edux-sample-course-' || slug), 14, 3) || '-8' ||
      substr(md5('edux-sample-course-' || slug), 18, 3) || '-' ||
      substr(md5('edux-sample-course-' || slug), 21, 12)
    )::uuid,
    tutor_id,
    (SELECT full_name FROM users WHERE users.id = sample_courses.tutor_id LIMIT 1),
    title,
    description,
    subject,
    level,
    price,
    thumbnail_url,
    'published',
    jsonb_build_array(
      'Nắm kiến thức trọng tâm của khóa học',
      'Luyện bài tập theo từng mức độ',
      'Biết cách tự học và ôn tập sau mỗi buổi'
    ),
    jsonb_build_array(
      'Có thiết bị học online ổn định',
      'Chuẩn bị vở ghi và làm bài luyện tập'
    ),
    NOW() - ((row_number() OVER (ORDER BY subject, slug))::text || ' days')::interval,
    NOW()
  FROM sample_courses
  ON CONFLICT (id) DO UPDATE SET
    tutor_id = EXCLUDED.tutor_id,
    instructor_name = EXCLUDED.instructor_name,
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    subject = EXCLUDED.subject,
    level = EXCLUDED.level,
    price = EXCLUDED.price,
    thumbnail_url = EXCLUDED.thumbnail_url,
    status = 'published',
    learning_outcomes = EXCLUDED.learning_outcomes,
    requirements = EXCLUDED.requirements,
    updated_at = NOW()
  RETURNING id, title, subject
),
delete_old_lessons AS (
  DELETE FROM course_lessons
  WHERE course_id IN (SELECT id FROM upsert_courses)
),
lesson_templates AS (
  SELECT * FROM (VALUES
    (1, 'Tổng quan lộ trình', 'Xác định mục tiêu học tập, cách học và tiêu chí hoàn thành.', true, '18 phút'),
    (2, 'Kiến thức nền tảng', 'Ôn lại phần cốt lõi cần dùng cho toàn khóa.', false, '32 phút'),
    (3, 'Bài tập mẫu có hướng dẫn', 'Giải từng bước các dạng bài phổ biến.', false, '40 phút'),
    (4, 'Luyện tập tự đánh giá', 'Làm bài theo checklist và tự kiểm tra lỗi thường gặp.', false, '35 phút'),
    (5, 'Dự án hoặc đề luyện tập cuối khóa', 'Vận dụng kiến thức để hoàn thành sản phẩm hoặc đề tổng hợp.', false, '45 phút')
  ) AS l(position, title, description, is_preview, duration_label)
)
INSERT INTO course_lessons (
  course_id,
  title,
  description,
  video_url,
  material_url,
  duration_label,
  is_preview,
  position
)
SELECT
  c.id,
  l.title,
  l.description,
  'https://example.com/sample-course-video/' || c.id || '/' || l.position,
  'https://example.com/sample-course-material/' || c.id || '/' || l.position || '.pdf',
  l.duration_label,
  l.is_preview,
  l.position
FROM upsert_courses c
CROSS JOIN lesson_templates l;

-- Quick check:
-- SELECT subject, COUNT(*) FROM courses WHERE status = 'published' GROUP BY subject ORDER BY subject;
