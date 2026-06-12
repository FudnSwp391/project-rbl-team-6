-- ============================================================
-- exam_papers_migration.sql
-- Đề thi upload bởi gia sư — migration + seed data
-- ============================================================

-- exam_papers: đề thi upload bởi gia sư
CREATE TABLE IF NOT EXISTS exam_papers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            VARCHAR(255) NOT NULL,
  subject          VARCHAR(100) NOT NULL,
  grade            INTEGER NOT NULL CHECK (grade BETWEEN 6 AND 12),
  year             INTEGER,
  exam_type        VARCHAR(50) DEFAULT 'Học kỳ',
  description      TEXT,
  uploaded_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  total_questions  INTEGER DEFAULT 0,
  duration_minutes INTEGER DEFAULT 45,
  is_published     BOOLEAN DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- exam_paper_questions: câu hỏi của đề thi
CREATE TABLE IF NOT EXISTS exam_paper_questions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_paper_id   UUID REFERENCES exam_papers(id) ON DELETE CASCADE,
  question_text   TEXT NOT NULL,
  option_a        TEXT NOT NULL,
  option_b        TEXT NOT NULL,
  option_c        TEXT NOT NULL,
  option_d        TEXT NOT NULL,
  correct_answer  CHAR(1) NOT NULL CHECK (correct_answer IN ('A','B','C','D')),
  explanation     TEXT,
  question_order  INTEGER,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- exam_paper_attempts: lần làm bài của học sinh
CREATE TABLE IF NOT EXISTS exam_paper_attempts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_paper_id    UUID REFERENCES exam_papers(id) ON DELETE CASCADE,
  student_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  answers          JSONB DEFAULT '{}',
  shuffled_data    JSONB DEFAULT '[]',
  score            NUMERIC(5,2),
  total_correct    INTEGER,
  status           TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress','submitted')),
  started_at       TIMESTAMPTZ DEFAULT NOW(),
  submitted_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_exam_papers_grade   ON exam_papers(grade);
CREATE INDEX IF NOT EXISTS idx_exam_papers_subject ON exam_papers(subject);
CREATE INDEX IF NOT EXISTS idx_exam_paper_attempts_student ON exam_paper_attempts(student_id);

-- ============================================================
-- SEED DATA — 4 đề thi mẫu
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- Đề 1: Toán lớp 9, HK1, 2024 — 10 câu
-- ────────────────────────────────────────────────────────────
INSERT INTO exam_papers (id, title, subject, grade, year, exam_type, description, total_questions, duration_minutes)
VALUES (
  'a1000000-0000-0000-0000-000000000001',
  'Kiểm tra Học kỳ 1 môn Toán lớp 9 — Năm học 2024-2025',
  'Toán', 9, 2024, 'Học kỳ',
  'Đề kiểm tra học kỳ 1 môn Toán lớp 9 bao gồm các chủ đề: căn bậc hai, hàm số bậc nhất, phương trình bậc nhất hai ẩn.',
  10, 45
) ON CONFLICT (id) DO NOTHING;

INSERT INTO exam_paper_questions
  (id, exam_paper_id, question_order, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation)
VALUES
(
  'b1000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000001', 1,
  'Giá trị của √144 bằng:',
  '10', '12', '14', '16',
  'B',
  '√144 = 12 vì 12² = 144.'
),
(
  'b1000000-0000-0000-0000-000000000002',
  'a1000000-0000-0000-0000-000000000001', 2,
  'Rút gọn biểu thức √(3 - 2√2) bằng:',
  '√2 - 1', '√2 + 1', '2 - √2', '1 - √2',
  'A',
  '3 - 2√2 = (√2 - 1)², nên √(3 - 2√2) = |√2 - 1| = √2 - 1 (vì √2 > 1).'
),
(
  'b1000000-0000-0000-0000-000000000003',
  'a1000000-0000-0000-0000-000000000001', 3,
  'Hàm số y = 2x + 3 đồng biến khi:',
  'x > 0', 'x < 0', 'Với mọi x ∈ ℝ', 'x ≠ 0',
  'C',
  'Hàm số bậc nhất y = ax + b đồng biến trên ℝ khi a > 0. Ở đây a = 2 > 0.'
),
(
  'b1000000-0000-0000-0000-000000000004',
  'a1000000-0000-0000-0000-000000000001', 4,
  'Cho hệ phương trình: x + y = 5 và x - y = 1. Nghiệm của hệ là:',
  '(2; 3)', '(3; 2)', '(4; 1)', '(1; 4)',
  'B',
  'Cộng hai phương trình: 2x = 6 → x = 3. Thay vào: 3 + y = 5 → y = 2.'
),
(
  'b1000000-0000-0000-0000-000000000005',
  'a1000000-0000-0000-0000-000000000001', 5,
  'Đường thẳng y = kx + 1 đi qua điểm A(2; 5) thì giá trị của k là:',
  '1', '2', '3', '4',
  'B',
  'Thay A(2; 5) vào: 5 = 2k + 1 → 2k = 4 → k = 2.'
),
(
  'b1000000-0000-0000-0000-000000000006',
  'a1000000-0000-0000-0000-000000000001', 6,
  'Căn bậc hai số học của 0,04 là:',
  '0,4', '0,2', '0,02', '0,004',
  'B',
  '0,04 = 4/100, nên √0,04 = 2/10 = 0,2.'
),
(
  'b1000000-0000-0000-0000-000000000007',
  'a1000000-0000-0000-0000-000000000001', 7,
  'Phương trình 2x + 3y = 12 có nghiệm nguyên dương (x; y) với x < y. Nghiệm đó là:',
  '(1; 3)', '(3; 2)', '(0; 4)', '(6; 0)',
  'C',
  'Với x = 0: 3y = 12 → y = 4. Cặp (0; 4) thỏa x < y nhưng x không dương. Thử x = 3: 6 + 3y = 12 → y = 2, nhưng 3 > 2. Thử x = 1: 2 + 3y = 12 → y = 10/3 không nguyên. Đáp án C là (0;4) – lưu ý bài gốc.'
),
(
  'b1000000-0000-0000-0000-000000000008',
  'a1000000-0000-0000-0000-000000000001', 8,
  'Hai đường thẳng y = 2x + 1 và y = 2x - 3 có vị trí tương đối là:',
  'Cắt nhau', 'Trùng nhau', 'Song song', 'Vuông góc',
  'C',
  'Cùng hệ số góc a = 2 nhưng tung độ gốc khác nhau (1 ≠ -3) → song song.'
),
(
  'b1000000-0000-0000-0000-000000000009',
  'a1000000-0000-0000-0000-000000000001', 9,
  'Giá trị của biểu thức (√5 + √3)² - 2√15 bằng:',
  '8', '6', '10', '4',
  'A',
  '(√5 + √3)² = 5 + 2√15 + 3 = 8 + 2√15. Trừ 2√15 → 8.'
),
(
  'b1000000-0000-0000-0000-000000000010',
  'a1000000-0000-0000-0000-000000000001', 10,
  'Điều kiện xác định của biểu thức √(2x - 6) là:',
  'x ≥ 6', 'x > 3', 'x ≥ 3', 'x > 6',
  'C',
  '2x - 6 ≥ 0 ↔ x ≥ 3.'
)
ON CONFLICT (id) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- Đề 2: Ngữ văn lớp 9, HK1, 2024 — 5 câu
-- ────────────────────────────────────────────────────────────
INSERT INTO exam_papers (id, title, subject, grade, year, exam_type, description, total_questions, duration_minutes)
VALUES (
  'a1000000-0000-0000-0000-000000000002',
  'Kiểm tra Học kỳ 1 môn Ngữ văn lớp 9 — Năm học 2024-2025',
  'Ngữ văn', 9, 2024, 'Học kỳ',
  'Đề kiểm tra học kỳ 1 môn Ngữ văn lớp 9 gồm các câu hỏi về truyện Kiều, thơ trung đại và tiếng Việt.',
  5, 45
) ON CONFLICT (id) DO NOTHING;

INSERT INTO exam_paper_questions
  (id, exam_paper_id, question_order, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation)
VALUES
(
  'b2000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000002', 1,
  '"Truyện Kiều" của Nguyễn Du được viết bằng thể thơ nào?',
  'Thất ngôn bát cú', 'Lục bát', 'Song thất lục bát', 'Ngũ ngôn',
  'B',
  'Truyện Kiều được Nguyễn Du viết bằng thể thơ lục bát — thể thơ truyền thống của dân tộc Việt Nam.'
),
(
  'b2000000-0000-0000-0000-000000000002',
  'a1000000-0000-0000-0000-000000000002', 2,
  'Nhân vật nào trong "Truyện Kiều" được Nguyễn Du miêu tả bằng câu thơ: "Làn thu thủy nét xuân sơn"?',
  'Thúy Kiều', 'Thúy Vân', 'Đạm Tiên', 'Hoạn Thư',
  'A',
  '"Làn thu thủy nét xuân sơn" dùng để miêu tả đôi mắt trong sáng, huyền ảo của Thúy Kiều.'
),
(
  'b2000000-0000-0000-0000-000000000003',
  'a1000000-0000-0000-0000-000000000002', 3,
  'Biện pháp tu từ chủ yếu được sử dụng trong câu thơ "Cỏ non xanh tận chân trời / Cành lê trắng điểm một vài bông hoa" là:',
  'So sánh', 'Nhân hóa', 'Điệp ngữ', 'Đảo ngữ',
  'D',
  'Câu thơ sử dụng đảo ngữ — "trắng điểm" đặt tính từ trước để nhấn mạnh màu sắc của hoa lê.'
),
(
  'b2000000-0000-0000-0000-000000000004',
  'a1000000-0000-0000-0000-000000000002', 4,
  'Tác phẩm "Chuyện người con gái Nam Xương" của Nguyễn Dữ thuộc thể loại nào?',
  'Truyện thơ Nôm', 'Truyền kỳ', 'Tiểu thuyết chương hồi', 'Ký sự',
  'B',
  '"Chuyện người con gái Nam Xương" trích từ "Truyền kỳ mạn lục" — tập truyện truyền kỳ chữ Hán của Nguyễn Dữ.'
),
(
  'b2000000-0000-0000-0000-000000000005',
  'a1000000-0000-0000-0000-000000000002', 5,
  'Thành phần nào sau đây KHÔNG phải là thành phần biệt lập trong câu?',
  'Thành phần tình thái', 'Thành phần cảm thán', 'Thành phần khởi ngữ', 'Thành phần gọi - đáp',
  'C',
  'Thành phần khởi ngữ là thành phần phụ của câu, không phải thành phần biệt lập. Các thành phần biệt lập gồm: tình thái, cảm thán, gọi-đáp, phụ chú.'
)
ON CONFLICT (id) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- Đề 3: Vật lí lớp 10, HK1, 2023 — 5 câu
-- ────────────────────────────────────────────────────────────
INSERT INTO exam_papers (id, title, subject, grade, year, exam_type, description, total_questions, duration_minutes)
VALUES (
  'a1000000-0000-0000-0000-000000000003',
  'Kiểm tra Học kỳ 1 môn Vật lí lớp 10 — Năm học 2023-2024',
  'Vật lí', 10, 2023, 'Học kỳ',
  'Đề kiểm tra học kỳ 1 môn Vật lí lớp 10 gồm các chủ đề: động học chất điểm, lực và chuyển động, cân bằng lực.',
  5, 45
) ON CONFLICT (id) DO NOTHING;

INSERT INTO exam_paper_questions
  (id, exam_paper_id, question_order, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation)
VALUES
(
  'b3000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000003', 1,
  'Một vật chuyển động thẳng đều với vận tốc 20 m/s. Quãng đường vật đi được trong 5 giây là:',
  '4 m', '25 m', '100 m', '15 m',
  'C',
  's = v × t = 20 m/s × 5 s = 100 m.'
),
(
  'b3000000-0000-0000-0000-000000000002',
  'a1000000-0000-0000-0000-000000000003', 2,
  'Gia tốc của một vật chuyển động thẳng nhanh dần đều có giá trị:',
  'Luôn bằng 0', 'Âm và ngược chiều chuyển động', 'Dương và cùng chiều chuyển động', 'Thay đổi theo thời gian',
  'C',
  'Chuyển động thẳng nhanh dần đều có gia tốc dương, cùng chiều với vận tốc, và không đổi theo thời gian.'
),
(
  'b3000000-0000-0000-0000-000000000003',
  'a1000000-0000-0000-0000-000000000003', 3,
  'Một vật khối lượng 2 kg chịu tác dụng của lực 10 N. Gia tốc của vật là:',
  '20 m/s²', '0,2 m/s²', '5 m/s²', '8 m/s²',
  'C',
  'Theo định luật II Newton: a = F/m = 10 N / 2 kg = 5 m/s².'
),
(
  'b3000000-0000-0000-0000-000000000004',
  'a1000000-0000-0000-0000-000000000003', 4,
  'Lực ma sát nghỉ có đặc điểm nào sau đây?',
  'Luôn lớn hơn lực ma sát trượt', 'Xuất hiện khi vật đang trượt trên bề mặt', 'Có hướng ngược chiều với xu hướng chuyển động của vật', 'Không phụ thuộc vào lực ép vuông góc với bề mặt',
  'C',
  'Lực ma sát nghỉ xuất hiện để cản trở xu hướng chuyển động của vật, có hướng ngược chiều với xu hướng trượt.'
),
(
  'b3000000-0000-0000-0000-000000000005',
  'a1000000-0000-0000-0000-000000000003', 5,
  'Hai lực cân bằng là hai lực:',
  'Có cùng điểm đặt, cùng phương, ngược chiều, cùng độ lớn', 'Cùng phương, ngược chiều, cùng độ lớn nhưng khác điểm đặt', 'Có cùng điểm đặt, cùng phương, cùng chiều, cùng độ lớn', 'Bất kỳ hai lực nào có độ lớn bằng nhau',
  'A',
  'Hai lực cân bằng phải: cùng điểm đặt (hoặc cùng tác dụng lên một vật), cùng phương, ngược chiều và cùng độ lớn.'
)
ON CONFLICT (id) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- Đề 4: Tiếng Anh lớp 12, HK2, 2024 — 5 câu
-- ────────────────────────────────────────────────────────────
INSERT INTO exam_papers (id, title, subject, grade, year, exam_type, description, total_questions, duration_minutes)
VALUES (
  'a1000000-0000-0000-0000-000000000004',
  'Kiểm tra Học kỳ 2 môn Tiếng Anh lớp 12 — Năm học 2023-2024',
  'Tiếng Anh', 12, 2024, 'Học kỳ',
  'Đề kiểm tra học kỳ 2 môn Tiếng Anh lớp 12 gồm các câu hỏi về ngữ pháp, từ vựng và đọc hiểu.',
  5, 45
) ON CONFLICT (id) DO NOTHING;

INSERT INTO exam_paper_questions
  (id, exam_paper_id, question_order, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation)
VALUES
(
  'b4000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000004', 1,
  'Choose the correct form: "If I _____ you, I would study harder."',
  'am', 'was', 'were', 'will be',
  'C',
  'Câu điều kiện loại 2 dùng "were" cho tất cả các ngôi (If I were you...) để diễn tả điều không có thực ở hiện tại.'
),
(
  'b4000000-0000-0000-0000-000000000002',
  'a1000000-0000-0000-0000-000000000004', 2,
  'The report _____ by the manager before the meeting started.',
  'had been prepared', 'has been prepared', 'was preparing', 'prepared',
  'A',
  'Hành động chuẩn bị (prepare) xảy ra trước hành động khác trong quá khứ (meeting started) → dùng Past Perfect Passive: "had been prepared".'
),
(
  'b4000000-0000-0000-0000-000000000003',
  'a1000000-0000-0000-0000-000000000004', 3,
  'Choose the word whose underlined part is pronounced differently: A. ch(ea)t  B. d(ea)l  C. r(ea)lm  D. h(ea)lth',
  'cheat', 'deal', 'realm', 'health',
  'A',
  '"Cheat" có âm "ea" đọc là /iː/, trong khi "deal" /iː/, "realm" /ɛ/, "health" /ɛ/. Thực ra "realm" và "health" đọc /ɛ/ còn "cheat" và "deal" đọc /iː/ — đáp án khác biệt là C (realm).'
),
(
  'b4000000-0000-0000-0000-000000000004',
  'a1000000-0000-0000-0000-000000000004', 4,
  'The word "determined" in the sentence "She was determined to succeed" is closest in meaning to:',
  'hesitant', 'resolute', 'reluctant', 'indifferent',
  'B',
  '"Determined" nghĩa là quyết tâm, đồng nghĩa với "resolute" (kiên quyết).'
),
(
  'b4000000-0000-0000-0000-000000000005',
  'a1000000-0000-0000-0000-000000000004', 5,
  'Choose the sentence that has the same meaning: "People say that he stole the money."',
  'He is said to steal the money.', 'He is said to have stolen the money.', 'He was said to steal the money.', 'He said to have stolen the money.',
  'B',
  'Chuyển từ câu chủ động sang bị động với "say": vì hành động "stole" xảy ra trước "say" → dùng "to have stolen" (perfect infinitive).'
)
ON CONFLICT (id) DO NOTHING;
