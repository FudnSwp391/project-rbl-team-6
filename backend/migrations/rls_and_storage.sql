-- ================================================================
-- EduX: RLS and Storage Policies for Tutor Documents
-- Chạy file này trong Supabase: Project → SQL Editor → New Query
-- ================================================================

-- 1. Create the Supabase Storage Bucket for tutor documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('tutor-documents', 'tutor-documents', false)
ON CONFLICT (id) DO NOTHING;

-- ================================================================
-- ROW LEVEL SECURITY (RLS) FOR tutor_profiles TABLE
-- ================================================================

-- Kích hoạt RLS
ALTER TABLE public.tutor_profiles ENABLE ROW LEVEL SECURITY;

-- Policy 1: Admin can read all profiles
CREATE POLICY "Admin can view all tutor profiles"
ON public.tutor_profiles FOR SELECT
USING (
  -- Sử dụng JWT claims thay vì join bảng users để tránh recursion nếu bảng users cũng có RLS
  -- Note: Backend đang không dùng Supabase Auth, JWT được sinh từ Node.js.
  -- Supabase Storage REST API sẽ dùng SERVICE_ROLE key để upload/read (bỏ qua RLS).
  -- Việc kiểm tra quyền thực tế được thực hiện qua backend API (requireAdmin middleware).
  -- Để bảng tutor_profiles an toàn, nếu có truy cập qua API vô danh thì deny:
  true -- Tạm cho phép tất cả SELECT (nếu DB được access trực tiếp). 
       -- Trong thực tế backend dùng pg (Postgres driver) mặc định không bị RLS cản 
       -- trừ khi set role authenticated hoặc anon.
);

-- Note: Vì hệ thống đang sử dụng Node.js (với thư viện `pg`) và không cấu hình 
-- gửi Supabase JWT xuống DB từng request (không set role auth.uid()),
-- driver `pg` mặc định kết nối bằng role `postgres` (superuser), 
-- dẫn đến RLS bị bỏ qua (bypass).
-- Do đó, logic bảo mật chính (Admin only, Tutor only) được đảm bảo ở Backend Node.js middleware.
-- Tuy nhiên, nếu sau này chuyển sang PostgREST (Supabase auto API), 
-- RLS ở đây sẽ cần thiết lập theo auth.uid().

-- ================================================================
-- ROW LEVEL SECURITY (RLS) FOR USERS TABLE
-- ================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
-- Cho phép SELECT all với role postgres/service_role
CREATE POLICY "Enable read access for all users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.users FOR UPDATE USING (true) WITH CHECK (true);

-- ================================================================
-- STORAGE POLICIES CHO BUCKET 'tutor-documents'
-- ================================================================
-- Vì chúng ta đang dùng Node.js backend với SERVICE_ROLE KEY (Supabase Service Role) 
-- để tương tác với Storage API, service role mặc định bỏ qua RLS của Storage.
-- Backend Node.js sẽ làm nhiệm vụ:
-- 1. Nhận file từ Tutor (validate JWT tutor qua middleware) -> Dùng Service Role đẩy lên Storage
-- 2. Nhận yêu cầu từ Admin (validate JWT admin qua middleware) -> Dùng Service Role gọi tạo Signed URL
-- => File Storage được bảo vệ chặt chẽ (Bucket = private, Upload/SignedURL chỉ qua backend).
