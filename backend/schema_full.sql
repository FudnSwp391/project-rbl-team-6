-- ════════════════════════════════════════════════════════════════════
-- EduX — SCHEMA ĐẦY ĐỦ (file schema DUY NHẤT, tự sinh từ DB thật bằng gen-schema.js)
-- Dựng lại toàn bộ DB từ đầu: mọi bảng + constraint + index + trigger + seed.
-- Chạy 1 lần trên DB TRỐNG (Supabase SQL Editor). An toàn chạy lại (idempotent).
-- Sinh lúc: 2026-06-11T17:35:33.570Z
-- Tổng số bảng: 23
-- ════════════════════════════════════════════════════════════════════

-- ─── BẢNG ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bookings (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  student_id uuid NOT NULL,
  tutor_id uuid,
  tutor_name text NOT NULL,
  subject text,
  lesson_date date NOT NULL,
  time_slot text NOT NULL,
  note text,
  status text DEFAULT 'confirmed'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  child_name text,
  student_name text,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT bookings_pkey PRIMARY KEY (id),
  CONSTRAINT bookings_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'cancelled'::text, 'declined'::text])))
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  content text,
  msg_type character varying(20) DEFAULT 'text'::character varying,
  file_url text,
  file_name text,
  file_size bigint,
  file_mime text,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT chat_messages_pkey PRIMARY KEY (id),
  CONSTRAINT chat_messages_msg_type_check CHECK (((msg_type)::text = ANY ((ARRAY['text'::character varying, 'image'::character varying, 'video'::character varying, 'file'::character varying])::text[])))
);

CREATE TABLE IF NOT EXISTS conversations (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  student_id uuid NOT NULL,
  tutor_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT conversations_pkey PRIMARY KEY (id),
  CONSTRAINT conversations_student_id_tutor_id_key UNIQUE (student_id, tutor_id),
  CONSTRAINT conversations_check CHECK ((student_id <> tutor_id))
);

CREATE TABLE IF NOT EXISTS courses (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tutor_id uuid NOT NULL,
  title character varying(255) NOT NULL,
  description text,
  subject character varying(100),
  level character varying(50),
  thumbnail_url text,
  price integer DEFAULT 0,
  original_price integer,
  total_lessons integer DEFAULT 0,
  duration_hours numeric(5,1),
  avg_rating numeric(3,2) DEFAULT 0.00,
  review_count integer DEFAULT 0,
  enrollment_count integer DEFAULT 0,
  status character varying(20) DEFAULT 'draft'::character varying,
  published_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT courses_pkey PRIMARY KEY (id),
  CONSTRAINT courses_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'published'::character varying, 'archived'::character varying])::text[])))
);

CREATE TABLE IF NOT EXISTS enrollments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  course_id uuid NOT NULL,
  status character varying(20) DEFAULT 'active'::character varying,
  progress_percent integer DEFAULT 0,
  paid_amount integer,
  enrolled_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  CONSTRAINT enrollments_pkey PRIMARY KEY (id),
  CONSTRAINT enrollments_user_id_course_id_key UNIQUE (user_id, course_id),
  CONSTRAINT enrollments_progress_percent_check CHECK (((progress_percent >= 0) AND (progress_percent <= 100))),
  CONSTRAINT enrollments_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[])))
);

CREATE TABLE IF NOT EXISTS exam_paper_attempts (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  exam_paper_id uuid,
  student_id uuid,
  answers jsonb DEFAULT '{}'::jsonb,
  shuffled_data jsonb DEFAULT '[]'::jsonb,
  score numeric(5,2),
  total_correct integer,
  status text DEFAULT 'in_progress'::text,
  started_at timestamp with time zone DEFAULT now(),
  submitted_at timestamp with time zone,
  CONSTRAINT exam_paper_attempts_pkey PRIMARY KEY (id),
  CONSTRAINT exam_paper_attempts_status_check CHECK ((status = ANY (ARRAY['in_progress'::text, 'submitted'::text])))
);

CREATE TABLE IF NOT EXISTS exam_paper_questions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  exam_paper_id uuid,
  question_text text NOT NULL,
  option_a text NOT NULL,
  option_b text NOT NULL,
  option_c text NOT NULL,
  option_d text NOT NULL,
  correct_answer character(1) NOT NULL,
  explanation text,
  question_order integer,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT exam_paper_questions_pkey PRIMARY KEY (id),
  CONSTRAINT exam_paper_questions_correct_answer_check CHECK ((correct_answer = ANY (ARRAY['A'::bpchar, 'B'::bpchar, 'C'::bpchar, 'D'::bpchar])))
);

CREATE TABLE IF NOT EXISTS exam_papers (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  title character varying(255) NOT NULL,
  subject character varying(100) NOT NULL,
  grade integer NOT NULL,
  year integer,
  exam_type character varying(50) DEFAULT 'Học kỳ'::character varying,
  description text,
  uploaded_by uuid,
  total_questions integer DEFAULT 0,
  duration_minutes integer DEFAULT 45,
  is_published boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT exam_papers_pkey PRIMARY KEY (id),
  CONSTRAINT exam_papers_grade_check CHECK (((grade >= 6) AND (grade <= 12)))
);

CREATE TABLE IF NOT EXISTS messages (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  conversation_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  content text NOT NULL,
  is_read boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_content_check CHECK ((char_length(TRIM(BOTH FROM content)) > 0))
);

CREATE TABLE IF NOT EXISTS parent_children (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  parent_id uuid NOT NULL,
  student_id uuid NOT NULL,
  nickname character varying(100),
  linked_at timestamp with time zone DEFAULT now(),
  CONSTRAINT parent_children_pkey PRIMARY KEY (id),
  CONSTRAINT parent_children_parent_id_student_id_key UNIQUE (parent_id, student_id)
);

CREATE TABLE IF NOT EXISTS practice_sessions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  student_id uuid NOT NULL,
  topic text NOT NULL,
  difficulty text DEFAULT 'medium'::text,
  questions jsonb DEFAULT '[]'::jsonb NOT NULL,
  answers jsonb DEFAULT '{}'::jsonb,
  score integer,
  total_correct integer,
  total_questions integer DEFAULT 10 NOT NULL,
  status text DEFAULT 'in_progress'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  submitted_at timestamp with time zone,
  CONSTRAINT practice_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT practice_sessions_difficulty_check CHECK ((difficulty = ANY (ARRAY['easy'::text, 'medium'::text, 'hard'::text]))),
  CONSTRAINT practice_sessions_status_check CHECK ((status = ANY (ARRAY['in_progress'::text, 'submitted'::text])))
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  quiz_id uuid NOT NULL,
  student_id uuid NOT NULL,
  answers jsonb DEFAULT '{}'::jsonb,
  score integer,
  total_correct integer,
  status text DEFAULT 'in_progress'::text NOT NULL,
  started_at timestamp with time zone DEFAULT now(),
  submitted_at timestamp with time zone,
  time_remaining_seconds integer,
  CONSTRAINT quiz_attempts_pkey PRIMARY KEY (id),
  CONSTRAINT quiz_attempts_status_check CHECK ((status = ANY (ARRAY['in_progress'::text, 'submitted'::text])))
);

CREATE TABLE IF NOT EXISTS quiz_questions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  quiz_id uuid NOT NULL,
  question_text text NOT NULL,
  option_a text NOT NULL,
  option_b text NOT NULL,
  option_c text NOT NULL,
  option_d text NOT NULL,
  correct_answer character(1) NOT NULL,
  explanation text,
  question_order integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT quiz_questions_pkey PRIMARY KEY (id),
  CONSTRAINT quiz_questions_correct_answer_check CHECK ((correct_answer = ANY (ARRAY['A'::bpchar, 'B'::bpchar, 'C'::bpchar, 'D'::bpchar])))
);

CREATE TABLE IF NOT EXISTS quizzes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  title text NOT NULL,
  subject text NOT NULL,
  description text,
  duration_minutes integer DEFAULT 30 NOT NULL,
  total_questions integer DEFAULT 10 NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT quizzes_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS reviews (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  tutor_id uuid,
  course_id uuid,
  rating integer NOT NULL,
  comment text,
  review_type character varying(20) NOT NULL,
  is_visible boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT reviews_pkey PRIMARY KEY (id),
  CONSTRAINT reviews_check CHECK (((((review_type)::text = 'tutor'::text) AND (tutor_id IS NOT NULL) AND (course_id IS NULL)) OR (((review_type)::text = 'course'::text) AND (course_id IS NOT NULL) AND (tutor_id IS NULL)))),
  CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5))),
  CONSTRAINT reviews_review_type_check CHECK (((review_type)::text = ANY ((ARRAY['tutor'::character varying, 'course'::character varying])::text[])))
);

CREATE TABLE IF NOT EXISTS student_link_codes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  student_id uuid NOT NULL,
  code character(8) NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT student_link_codes_pkey PRIMARY KEY (id),
  CONSTRAINT student_link_codes_code_key UNIQUE (code),
  CONSTRAINT student_link_codes_student_id_key UNIQUE (student_id)
);

CREATE TABLE IF NOT EXISTS subjects (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name character varying(100) NOT NULL,
  category character varying(50),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT subjects_pkey PRIMARY KEY (id),
  CONSTRAINT subjects_name_key UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS tutor_approvals (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tutor_id uuid NOT NULL,
  status character varying(20) NOT NULL,
  note text,
  reviewed_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tutor_approvals_pkey PRIMARY KEY (id),
  CONSTRAINT tutor_approvals_status_check CHECK (((status)::text = ANY ((ARRAY['approved'::character varying, 'rejected'::character varying, 'suspended'::character varying])::text[])))
);

CREATE TABLE IF NOT EXISTS tutor_availability (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tutor_id uuid NOT NULL,
  day_of_week text NOT NULL,
  time_slot text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tutor_availability_pkey PRIMARY KEY (id),
  CONSTRAINT tutor_availability_day_of_week_check CHECK ((day_of_week = ANY (ARRAY['Monday'::text, 'Tuesday'::text, 'Wednesday'::text, 'Thursday'::text, 'Friday'::text, 'Saturday'::text, 'Sunday'::text])))
);

CREATE TABLE IF NOT EXISTS tutor_credentials (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tutor_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  description text,
  proof_url text,
  status text DEFAULT 'pending'::text NOT NULL,
  reject_reason text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tutor_credentials_pkey PRIMARY KEY (id),
  CONSTRAINT tutor_credentials_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))),
  CONSTRAINT tutor_credentials_type_check CHECK ((type = ANY (ARRAY['education'::text, 'certificate'::text, 'experience'::text])))
);

CREATE TABLE IF NOT EXISTS tutor_profiles (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  bio text,
  bio_status text DEFAULT 'approved'::text NOT NULL,
  bio_pending text,
  subjects text,
  experience_years integer DEFAULT 0,
  certificate_url text,
  cccd_url text,
  hourly_rate integer DEFAULT 0,
  status text DEFAULT 'draft'::text NOT NULL,
  reject_reason text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  headline text,
  phone text,
  location text,
  teaching_style text,
  demo_video_url text,
  first_name text,
  last_name text,
  display_name text,
  birthday date,
  gender text,
  country text,
  city text,
  education text,
  language text,
  qualifications text,
  profile_photo_url text,
  avg_rating numeric(3,2) DEFAULT 0.00,
  review_count integer DEFAULT 0,
  total_students integer DEFAULT 0,
  teaching_methods text[] DEFAULT '{}'::text[],
  approved_at timestamp with time zone,
  CONSTRAINT tutor_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT tutor_profiles_bio_status_check CHECK ((bio_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))),
  CONSTRAINT tutor_profiles_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'pending'::text, 'approved'::text, 'rejected'::text])))
);

CREATE TABLE IF NOT EXISTS tutor_subjects (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tutor_id uuid NOT NULL,
  subject_id uuid NOT NULL,
  level character varying(50),
  price_per_hour integer,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tutor_subjects_pkey PRIMARY KEY (id),
  CONSTRAINT tutor_subjects_tutor_id_subject_id_level_key UNIQUE (tutor_id, subject_id, level)
);

CREATE TABLE IF NOT EXISTS users (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  full_name text,
  email text NOT NULL,
  password_hash text,
  role text DEFAULT 'student'::text NOT NULL,
  google_id text,
  picture text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  phone text,
  is_active boolean DEFAULT true,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_email_key UNIQUE (email),
  CONSTRAINT users_google_id_key UNIQUE (google_id),
  CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['student'::text, 'parent'::text, 'tutor'::text, 'admin'::text])))
);

-- ─── KHÓA NGOẠI (FK) ────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='bookings_student_id_fkey' AND conrelid='bookings'::regclass) THEN
    ALTER TABLE bookings ADD CONSTRAINT bookings_student_id_fkey FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='bookings_tutor_id_fkey' AND conrelid='bookings'::regclass) THEN
    ALTER TABLE bookings ADD CONSTRAINT bookings_tutor_id_fkey FOREIGN KEY (tutor_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chat_messages_receiver_id_fkey' AND conrelid='chat_messages'::regclass) THEN
    ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chat_messages_sender_id_fkey' AND conrelid='chat_messages'::regclass) THEN
    ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='conversations_student_id_fkey' AND conrelid='conversations'::regclass) THEN
    ALTER TABLE conversations ADD CONSTRAINT conversations_student_id_fkey FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='conversations_tutor_id_fkey' AND conrelid='conversations'::regclass) THEN
    ALTER TABLE conversations ADD CONSTRAINT conversations_tutor_id_fkey FOREIGN KEY (tutor_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='courses_tutor_id_fkey' AND conrelid='courses'::regclass) THEN
    ALTER TABLE courses ADD CONSTRAINT courses_tutor_id_fkey FOREIGN KEY (tutor_id) REFERENCES tutor_profiles(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='enrollments_course_id_fkey' AND conrelid='enrollments'::regclass) THEN
    ALTER TABLE enrollments ADD CONSTRAINT enrollments_course_id_fkey FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='enrollments_user_id_fkey' AND conrelid='enrollments'::regclass) THEN
    ALTER TABLE enrollments ADD CONSTRAINT enrollments_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='exam_paper_attempts_exam_paper_id_fkey' AND conrelid='exam_paper_attempts'::regclass) THEN
    ALTER TABLE exam_paper_attempts ADD CONSTRAINT exam_paper_attempts_exam_paper_id_fkey FOREIGN KEY (exam_paper_id) REFERENCES exam_papers(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='exam_paper_attempts_student_id_fkey' AND conrelid='exam_paper_attempts'::regclass) THEN
    ALTER TABLE exam_paper_attempts ADD CONSTRAINT exam_paper_attempts_student_id_fkey FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='exam_paper_questions_exam_paper_id_fkey' AND conrelid='exam_paper_questions'::regclass) THEN
    ALTER TABLE exam_paper_questions ADD CONSTRAINT exam_paper_questions_exam_paper_id_fkey FOREIGN KEY (exam_paper_id) REFERENCES exam_papers(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='exam_papers_uploaded_by_fkey' AND conrelid='exam_papers'::regclass) THEN
    ALTER TABLE exam_papers ADD CONSTRAINT exam_papers_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='messages_conversation_id_fkey' AND conrelid='messages'::regclass) THEN
    ALTER TABLE messages ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='messages_receiver_id_fkey' AND conrelid='messages'::regclass) THEN
    ALTER TABLE messages ADD CONSTRAINT messages_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='messages_sender_id_fkey' AND conrelid='messages'::regclass) THEN
    ALTER TABLE messages ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='parent_children_parent_id_fkey' AND conrelid='parent_children'::regclass) THEN
    ALTER TABLE parent_children ADD CONSTRAINT parent_children_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='parent_children_student_id_fkey' AND conrelid='parent_children'::regclass) THEN
    ALTER TABLE parent_children ADD CONSTRAINT parent_children_student_id_fkey FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='practice_sessions_student_id_fkey' AND conrelid='practice_sessions'::regclass) THEN
    ALTER TABLE practice_sessions ADD CONSTRAINT practice_sessions_student_id_fkey FOREIGN KEY (student_id) REFERENCES users(id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='quiz_attempts_quiz_id_fkey' AND conrelid='quiz_attempts'::regclass) THEN
    ALTER TABLE quiz_attempts ADD CONSTRAINT quiz_attempts_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES quizzes(id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='quiz_attempts_student_id_fkey' AND conrelid='quiz_attempts'::regclass) THEN
    ALTER TABLE quiz_attempts ADD CONSTRAINT quiz_attempts_student_id_fkey FOREIGN KEY (student_id) REFERENCES users(id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='quiz_questions_quiz_id_fkey' AND conrelid='quiz_questions'::regclass) THEN
    ALTER TABLE quiz_questions ADD CONSTRAINT quiz_questions_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='quizzes_created_by_fkey' AND conrelid='quizzes'::regclass) THEN
    ALTER TABLE quizzes ADD CONSTRAINT quizzes_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='reviews_course_id_fkey' AND conrelid='reviews'::regclass) THEN
    ALTER TABLE reviews ADD CONSTRAINT reviews_course_id_fkey FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='reviews_tutor_id_fkey' AND conrelid='reviews'::regclass) THEN
    ALTER TABLE reviews ADD CONSTRAINT reviews_tutor_id_fkey FOREIGN KEY (tutor_id) REFERENCES tutor_profiles(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='reviews_user_id_fkey' AND conrelid='reviews'::regclass) THEN
    ALTER TABLE reviews ADD CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='student_link_codes_student_id_fkey' AND conrelid='student_link_codes'::regclass) THEN
    ALTER TABLE student_link_codes ADD CONSTRAINT student_link_codes_student_id_fkey FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='tutor_approvals_reviewed_by_fkey' AND conrelid='tutor_approvals'::regclass) THEN
    ALTER TABLE tutor_approvals ADD CONSTRAINT tutor_approvals_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES users(id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='tutor_approvals_tutor_id_fkey' AND conrelid='tutor_approvals'::regclass) THEN
    ALTER TABLE tutor_approvals ADD CONSTRAINT tutor_approvals_tutor_id_fkey FOREIGN KEY (tutor_id) REFERENCES tutor_profiles(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='tutor_availability_tutor_id_fkey' AND conrelid='tutor_availability'::regclass) THEN
    ALTER TABLE tutor_availability ADD CONSTRAINT tutor_availability_tutor_id_fkey FOREIGN KEY (tutor_id) REFERENCES tutor_profiles(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='tutor_credentials_tutor_id_fkey' AND conrelid='tutor_credentials'::regclass) THEN
    ALTER TABLE tutor_credentials ADD CONSTRAINT tutor_credentials_tutor_id_fkey FOREIGN KEY (tutor_id) REFERENCES tutor_profiles(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='tutor_profiles_user_id_fkey' AND conrelid='tutor_profiles'::regclass) THEN
    ALTER TABLE tutor_profiles ADD CONSTRAINT tutor_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='tutor_subjects_subject_id_fkey' AND conrelid='tutor_subjects'::regclass) THEN
    ALTER TABLE tutor_subjects ADD CONSTRAINT tutor_subjects_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES subjects(id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='tutor_subjects_tutor_id_fkey' AND conrelid='tutor_subjects'::regclass) THEN
    ALTER TABLE tutor_subjects ADD CONSTRAINT tutor_subjects_tutor_id_fkey FOREIGN KEY (tutor_id) REFERENCES tutor_profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─── INDEX ──────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_bookings_student ON public.bookings USING btree (student_id);
CREATE INDEX IF NOT EXISTS idx_bookings_tutor ON public.bookings USING btree (tutor_id);
CREATE INDEX IF NOT EXISTS idx_bookings_tutor_id ON public.bookings USING btree (tutor_id);
CREATE INDEX IF NOT EXISTS idx_bookings_student_id ON public.bookings USING btree (student_id);
CREATE INDEX IF NOT EXISTS idx_bookings_lesson_date ON public.bookings USING btree (lesson_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings USING btree (status);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON public.chat_messages USING btree (sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_receiver ON public.chat_messages USING btree (receiver_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON public.chat_messages USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conv_student ON public.conversations USING btree (student_id);
CREATE INDEX IF NOT EXISTS idx_conv_tutor ON public.conversations USING btree (tutor_id);
CREATE INDEX IF NOT EXISTS idx_courses_status ON public.courses USING btree (status);
CREATE INDEX IF NOT EXISTS idx_courses_subject ON public.courses USING btree (subject);
CREATE INDEX IF NOT EXISTS idx_courses_tutor ON public.courses USING btree (tutor_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user ON public.enrollments USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_exam_paper_attempts_student ON public.exam_paper_attempts USING btree (student_id);
CREATE INDEX IF NOT EXISTS idx_exam_papers_grade ON public.exam_papers USING btree (grade);
CREATE INDEX IF NOT EXISTS idx_exam_papers_subject ON public.exam_papers USING btree (subject);
CREATE INDEX IF NOT EXISTS idx_msg_conv ON public.messages USING btree (conversation_id);
CREATE INDEX IF NOT EXISTS idx_msg_sender ON public.messages USING btree (sender_id);
CREATE INDEX IF NOT EXISTS idx_msg_receiver_unread ON public.messages USING btree (receiver_id, is_read);
CREATE INDEX IF NOT EXISTS idx_msg_created ON public.messages USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages USING btree (sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON public.messages USING btree (receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_parent_children_parent ON public.parent_children USING btree (parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_children_student ON public.parent_children USING btree (student_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_student ON public.practice_sessions USING btree (student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student ON public.quiz_attempts USING btree (student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz ON public.quiz_attempts USING btree (quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id ON public.quiz_questions USING btree (quiz_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_subject ON public.quizzes USING btree (subject);
CREATE UNIQUE INDEX IF NOT EXISTS uq_reviews_user_tutor ON public.reviews USING btree (user_id, tutor_id) WHERE (tutor_id IS NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS uq_reviews_user_course ON public.reviews USING btree (user_id, course_id) WHERE (course_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_reviews_tutor ON public.reviews USING btree (tutor_id);
CREATE INDEX IF NOT EXISTS idx_reviews_course ON public.reviews USING btree (course_id);
CREATE INDEX IF NOT EXISTS idx_student_link_codes_code ON public.student_link_codes USING btree (code);
CREATE INDEX IF NOT EXISTS idx_availability_tutor_id ON public.tutor_availability USING btree (tutor_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_availability_unique ON public.tutor_availability USING btree (tutor_id, day_of_week, time_slot);
CREATE INDEX IF NOT EXISTS idx_credentials_tutor_id ON public.tutor_credentials USING btree (tutor_id);
CREATE INDEX IF NOT EXISTS idx_credentials_status ON public.tutor_credentials USING btree (status);
CREATE INDEX IF NOT EXISTS idx_credentials_type ON public.tutor_credentials USING btree (type);
CREATE INDEX IF NOT EXISTS idx_tutor_profiles_status ON public.tutor_profiles USING btree (status);
CREATE INDEX IF NOT EXISTS idx_tutor_profiles_user_id ON public.tutor_profiles USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_tutor_profiles_rating ON public.tutor_profiles USING btree (avg_rating DESC);
CREATE INDEX IF NOT EXISTS idx_tutor_subjects_tid ON public.tutor_subjects USING btree (tutor_id);
CREATE INDEX IF NOT EXISTS idx_tutor_subjects_sid ON public.tutor_subjects USING btree (subject_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users USING btree (email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON public.users USING btree (google_id);

-- ─── FUNCTIONS & TRIGGERS ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_course_avg_rating()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE courses SET
    avg_rating   = (SELECT COALESCE(ROUND(AVG(rating)::NUMERIC, 2), 0)
                    FROM reviews
                    WHERE course_id = COALESCE(NEW.course_id, OLD.course_id)
                      AND is_visible = TRUE),
    review_count = (SELECT COUNT(*) FROM reviews
                    WHERE course_id = COALESCE(NEW.course_id, OLD.course_id)
                      AND is_visible = TRUE)
  WHERE id = COALESCE(NEW.course_id, OLD.course_id);
  RETURN COALESCE(NEW, OLD);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_tutor_avg_rating()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE tutor_profiles SET
    avg_rating   = (SELECT COALESCE(ROUND(AVG(rating)::NUMERIC, 2), 0)
                    FROM reviews
                    WHERE tutor_id = COALESCE(NEW.tutor_id, OLD.tutor_id)
                      AND is_visible = TRUE),
    review_count = (SELECT COUNT(*) FROM reviews
                    WHERE tutor_id = COALESCE(NEW.tutor_id, OLD.tutor_id)
                      AND is_visible = TRUE),
    updated_at   = NOW()
  WHERE id = COALESCE(NEW.tutor_id, OLD.tutor_id);
  RETURN COALESCE(NEW, OLD);
END;
$function$
;

DROP TRIGGER IF EXISTS set_booking_updated_at ON bookings;
CREATE TRIGGER set_booking_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS set_conv_updated_at ON conversations;
CREATE TRIGGER set_conv_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_course_rating_iud ON reviews;
CREATE TRIGGER trg_course_rating_iud AFTER INSERT OR DELETE OR UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION update_course_avg_rating();
DROP TRIGGER IF EXISTS trg_tutor_rating_iud ON reviews;
CREATE TRIGGER trg_tutor_rating_iud AFTER INSERT OR DELETE OR UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION update_tutor_avg_rating();
DROP TRIGGER IF EXISTS set_credentials_updated_at ON tutor_credentials;
CREATE TRIGGER set_credentials_updated_at BEFORE UPDATE ON public.tutor_credentials FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS set_tutor_updated_at ON tutor_profiles;
CREATE TRIGGER set_tutor_updated_at BEFORE UPDATE ON public.tutor_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS set_updated_at ON users;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── SEED: môn học ──────────────────────────────────────────────────
INSERT INTO subjects (name, category) VALUES
  ('Địa lý', 'Xã hội'),
  ('Hóa học', 'Tự nhiên'),
  ('Lịch sử', 'Xã hội'),
  ('Ngữ văn', 'Xã hội'),
  ('Sinh học', 'Tự nhiên'),
  ('Tiếng Anh', 'Ngoại ngữ'),
  ('Tiếng Nhật', 'Ngoại ngữ'),
  ('Tin học', 'Tự nhiên'),
  ('Toán', 'Tự nhiên'),
  ('Vật lý', 'Tự nhiên')
ON CONFLICT (name) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════
-- HẾT SCHEMA
-- ════════════════════════════════════════════════════════════════════
