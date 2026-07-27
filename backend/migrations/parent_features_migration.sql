-- ══════════════════════════════════════════════════════════════════════════════
--  Parent Features Migration
--  Tables: tutor_sessions, tutor_reviews, invoices, notifications
-- ══════════════════════════════════════════════════════════════════════════════

-- ── Lịch học / buổi dạy ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tutor_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tutor_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject       TEXT NOT NULL,
  scheduled_at  TIMESTAMPTZ NOT NULL,
  duration_mins INT NOT NULL DEFAULT 120,
  status        TEXT NOT NULL DEFAULT 'scheduled'
                CHECK (status IN ('scheduled','completed','cancelled','absent','late')),
  notes         TEXT,
  leave_reason  TEXT,      -- Lý do xin nghỉ (do phụ huynh gửi)
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tutor_sessions_student  ON tutor_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_tutor_sessions_tutor    ON tutor_sessions(tutor_id);
CREATE INDEX IF NOT EXISTS idx_tutor_sessions_schedule ON tutor_sessions(scheduled_at);

-- ── Nhận xét định kỳ của gia sư ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tutor_reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tutor_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject     TEXT NOT NULL,
  period_label TEXT NOT NULL,   -- VD: "Tuần 2 – Tháng 7/2025"
  content     TEXT NOT NULL,
  rating      INT NOT NULL DEFAULT 3 CHECK (rating BETWEEN 1 AND 5),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tutor_reviews_student ON tutor_reviews(student_id);
CREATE INDEX IF NOT EXISTS idx_tutor_reviews_tutor   ON tutor_reviews(tutor_id);

-- ── Hóa đơn học phí ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tutor_id    UUID REFERENCES users(id),
  invoice_no  TEXT NOT NULL UNIQUE,   -- VD: INV-0028
  subject     TEXT,
  period      TEXT,                   -- VD: "Tháng 7/2025"
  amount      BIGINT NOT NULL,        -- VNĐ
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending','paid','overdue','cancelled')),
  due_date    DATE,
  paid_at     TIMESTAMPTZ,
  pay_method  TEXT,                   -- VD: "Chuyển khoản", "Tiền mặt"
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_parent  ON invoices(parent_id);
CREATE INDEX IF NOT EXISTS idx_invoices_student ON invoices(student_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status  ON invoices(status);

-- ── Thông báo ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,      -- 'payment' | 'tutor_absent' | 'quiz_result' | 'practice_report' | 'system'
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  icon        TEXT DEFAULT 'notifications',
  is_read     BOOLEAN DEFAULT FALSE,
  ref_id      UUID,               -- ID liên kết (invoice id, session id, attempt id...)
  ref_type    TEXT,               -- 'invoice' | 'session' | 'quiz_attempt' | ...
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user   ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);
