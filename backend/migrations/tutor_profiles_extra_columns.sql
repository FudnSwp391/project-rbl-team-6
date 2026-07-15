-- Bổ sung các cột thông tin cá nhân / nghề nghiệp cho tutor_profiles
-- (chuyển từ run_migration.js sang SQL thuần — idempotent)

ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS birthday DATE;
ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS education TEXT;
ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS language TEXT;
ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(10,2);
ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS teaching_style TEXT;
ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS qualifications TEXT;
ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;
