-- ================================================================
-- EduX Course Detail — Sample Seed Data (Person 4)
-- Chạy file này TRONG Supabase SQL Editor SAU khi chạy course_detail_schema.sql
--
-- ⚠️  Chỉ dùng cho development/testing — xóa trước khi deploy production
-- ================================================================

-- ── 1. Course ────────────────────────────────────────────────────────────────
INSERT INTO courses (id, title, description, instructor_name, category, image_url, meet_link, start_date, end_date)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'UI/UX Advanced Mobile App Design',
  'This advanced course covers the essential principles and modern techniques of UI/UX design for mobile applications. You will learn to create intuitive user interfaces, design effective user flows, build interactive prototypes in Figma, and conduct usability testing to validate your designs.',
  'Jane Doe',
  'Design',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuD_KcMsAP377EF8EhDYTzr9aMGjZgUW8nCwtack2L40Hz5elV_HtLynBqX4pHE3CiLo3wWJF4rW2fiO6XsOpY8Ez3OYmQMNWuMI-Tlny058n1-Begw-zE2pUTHb93o3kJFIIsxiPHDMlRfJowhb1PP1zRF6TKs2N5mqs7qpaC8mMhx13GAK-rz77NleW-hIM3EQMFMu_gW3UfksgkVQhBG_6UMw7BvWwKIrTX2RDJwSaCMlb9MJAeK1osk_XL2Tf763botyHD1A9fQI',
  'https://meet.google.com/abc-defg-hij',
  '2026-01-15',
  '2026-05-20'
)
ON CONFLICT (id) DO NOTHING;


-- ── 2. Lessons ───────────────────────────────────────────────────────────────
-- Module 1: Visual Design Foundations
INSERT INTO lessons (course_id, module_title, lesson_title, lesson_order, duration, status, video_url) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Module 1: Visual Design Foundations', '1.1 Intro to UI/UX Design',        1, '30:00', 'completed',   'https://example.com/videos/1-1'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Module 1: Visual Design Foundations', '1.2 Design Principles',             2, '45:00', 'in_progress', 'https://example.com/videos/1-2'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Module 1: Visual Design Foundations', '1.3 Color Theory',                  3, '30:00', 'locked',       NULL),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Module 1: Visual Design Foundations', '1.4 Iconography Best Practices',    4, '45:00', 'locked',       NULL);

-- Module 2: Prototyping in Figma
INSERT INTO lessons (course_id, module_title, lesson_title, lesson_order, duration, status, video_url) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Module 2: Prototyping in Figma', '2.1 Getting Started with Figma',     1, '40:00', 'locked', NULL),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Module 2: Prototyping in Figma', '2.2 Components & Auto Layout',       2, '35:00', 'locked', NULL),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Module 2: Prototyping in Figma', '2.3 Interactive Prototypes',          3, '30:00', 'locked', NULL),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Module 2: Prototyping in Figma', '2.4 Animations & Transitions',       4, '50:00', 'locked', NULL),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Module 2: Prototyping in Figma', '2.5 Design System in Figma',          5, '45:00', 'locked', NULL),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Module 2: Prototyping in Figma', '2.6 Module Project',                  6, '45:00', 'locked', NULL);

-- Module 3: Mobile-First Responsive Design
INSERT INTO lessons (course_id, module_title, lesson_title, lesson_order, duration, status, video_url) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Module 3: Mobile-First Responsive Design', '3.1 Responsive Layout Patterns',   1, '45:00', 'locked', NULL),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Module 3: Mobile-First Responsive Design', '3.2 Adaptive Components',           2, '35:00', 'locked', NULL),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Module 3: Mobile-First Responsive Design', '3.3 Touch Targets & Gestures',      3, '30:00', 'locked', NULL),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Module 3: Mobile-First Responsive Design', '3.4 Performance Optimization',      4, '40:00', 'locked', NULL),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Module 3: Mobile-First Responsive Design', '3.5 Final Capstone Project',        5, '30:00', 'locked', NULL);


-- ── 3. Assignments ───────────────────────────────────────────────────────────
INSERT INTO assignments (course_id, title, description, due_date, points, status, score) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Low-Fi Wireframing',             'Create low-fidelity wireframes for the Eco-Tracker app.',                     '2026-10-15', 100, 'pending',   NULL),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'User Persona Research',          'Research and document 3 user personas for the target audience.',               '2026-10-20',  80, 'submitted', NULL),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Mobile UI Prototype',            'Build a high-fidelity interactive prototype in Figma.',                        '2026-10-25', 100, 'graded',     90),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Design System Documentation',    'Document the complete design system including tokens, components, and usage.',  '2026-11-01', 100, 'locked',    NULL),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Heuristic Evaluation Report',    'Conduct a heuristic evaluation of a competitor mobile app.',                   '2026-11-08',  80, 'locked',    NULL),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Interaction Design Patterns',    'Analyze and document 5 common mobile interaction design patterns.',            '2026-11-12',  60, 'submitted', NULL),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Accessibility Audit',            'Perform a WCAG 2.1 accessibility audit on the prototype.',                    '2026-11-18',  80, 'graded',     85),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Final Capstone Presentation',    'Present final mobile app design with full documentation.',                     '2026-11-25', 150, 'pending',   NULL);


-- ── 4. Materials ─────────────────────────────────────────────────────────────
INSERT INTO materials (course_id, title, file_url, file_type, file_size) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Course Syllabus.pdf',        'https://example.com/files/syllabus.pdf',    'pdf',    '2.4 MB'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Mobile UI Kit v2.sketch',    'https://example.com/files/ui-kit.sketch',   'sketch', '45.8 MB'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Figma Component Library',    'https://figma.com/file/example',            'figma',  'Online'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Design Principles Slides',   'https://example.com/files/slides.pdf',      'pdf',    '8.2 MB'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Color Palette Reference',    'https://example.com/files/colors.pdf',      'pdf',    '1.1 MB');


-- ── 5. Course Progress (cần user_id thật từ bảng users) ──────────────────────
-- ⚠️ Thay '<your_student_uuid>' bằng UUID thật của student trong bảng users
-- INSERT INTO course_progress (course_id, student_id, completed_lessons, total_lessons, progress_percent, xp_points)
-- VALUES (
--   'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
--   '<your_student_uuid>',
--   12,
--   24,
--   45.00,
--   850
-- );
-- ================================================================
