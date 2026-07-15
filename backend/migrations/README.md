# Database migrations

Thư mục này là **nguồn chân lý cho schema** khi dựng database mới.
Tất cả các file đều **idempotent** (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`) — chạy lại không gây hại.

## Cách chạy

Từ thư mục `backend/` (cần `.env` có `DATABASE_URL`):

```bash
node scripts/run-sql.js migrations/<tên-file>.sql
```

## Thứ tự khuyến nghị cho database mới

1. `schema.sql` — schema nền (users, tutor_profiles, bookings, wallets…)
2. `tutor_profiles_extra_columns.sql`
3. `payment_migration.sql` — ví, transactions, stored procedures tiền
4. `wallet_requests_migration.sql`
5. `parent_migration.sql` → `parent_features_migration.sql`
6. `advanced_features.sql` — lesson_feedbacks, milestones, disputes, KYC
7. `schema_lesson_feedbacks.sql`
8. `tutor_requests_migration.sql` → `tutor_request_matches.sql`
9. Các file còn lại (assessment, exam_papers, messages, instant_learning, dispute_*, session_evaluations, schedule_sessions, user_management, student/tutor_assessments…)
10. `rls_and_storage.sql` — RLS + storage bucket (Supabase)

## Lưu ý quan trọng

- `server.js` khi khởi động **cũng tự đảm bảo** một phần schema (các khối
  `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` runtime).
  Đây là lưới an toàn cho database của team đã tồn tại; với database dựng mới,
  hãy chạy migrations trong thư mục này trước để có schema đầy đủ và đúng thứ tự.
- Schema chi tiết cho course detail nằm ở `../schemas/course_detail_schema.sql`,
  seed mẫu ở `../seeds/`.
