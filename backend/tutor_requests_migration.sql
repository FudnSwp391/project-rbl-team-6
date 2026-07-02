-- ══════════════════════════════════════════════════════════════════════════════
--  Tutor Requests Migration
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS tutor_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Request info
  grade_level TEXT,
  education_program TEXT,
  textbook TEXT,
  subject TEXT,
  topics JSONB,
  description TEXT,
  
  -- Current status
  current_level TEXT,
  current_score TEXT,
  recent_test_score TEXT,
  learning_difficulties JSONB,
  self_learning_ability TEXT,
  learning_speed TEXT,
  
  -- Goals
  learning_goals JSONB,
  current_target_score TEXT,
  desired_target_score TEXT,
  deadline_months TEXT,
  urgency_level TEXT,
  
  -- Preferences
  learning_style TEXT,
  preferred_schedule JSONB,
  budget JSONB,
  
  -- Added fields
  match_status TEXT DEFAULT 'pending' CHECK (match_status IN ('pending', 'matching', 'matched', 'closed')),
  matched_tutor_count INTEGER DEFAULT 0,
  request_source TEXT, -- 'guest', 'student', 'parent'
  
  -- Contact info for Guest
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tutor_requests_student ON tutor_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_tutor_requests_status ON tutor_requests(match_status);
