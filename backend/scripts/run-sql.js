/**
 * run-sql.js — chạy một file SQL bất kỳ trên database cấu hình trong backend/.env
 *
 * Cách dùng (từ thư mục backend/):
 *   node scripts/run-sql.js migrations/schema.sql
 *   node scripts/run-sql.js migrations/payment_migration.sql
 *
 * Thay thế cho các script run_*_migration.js cũ (mỗi file một script).
 * Mọi file trong migrations/ đều idempotent nên chạy lại không gây hại.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function main() {
  const relPath = process.argv[2];
  if (!relPath) {
    console.error('Cách dùng: node scripts/run-sql.js <đường-dẫn-file-sql>');
    console.error('Ví dụ:     node scripts/run-sql.js migrations/schema.sql');
    process.exit(1);
  }

  const sqlPath = path.resolve(__dirname, '..', relPath);
  if (!fs.existsSync(sqlPath)) {
    console.error(`Không tìm thấy file: ${sqlPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log(`Đang chạy ${path.relative(path.resolve(__dirname, '..'), sqlPath)}...`);
    await pool.query(sql);
    console.log('✅ Hoàn tất.');
  } catch (err) {
    console.error('❌ Lỗi:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
