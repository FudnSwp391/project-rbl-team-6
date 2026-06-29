require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  try {
    const tableRes = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_name = 'tutor_requests'");
    console.log("=== KIỂM TRA 1 - BẢNG tutor_requests ===");
    console.log("Tồn tại:", tableRes.rows.length > 0);

    if (tableRes.rows.length > 0) {
      const colRes = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'tutor_requests' ORDER BY ordinal_position");
      console.log("Các cột:");
      colRes.rows.forEach(r => console.log(`  - ${r.column_name} (${r.data_type})`));
    }

    console.log("\n=== KIỂM TRA 2 - DỮ LIỆU THỰC TẾ ===");
    const dataRes = await pool.query("SELECT * FROM tutor_requests ORDER BY created_at DESC LIMIT 5");
    console.log("Số lượng record:", dataRes.rows.length);
    if (dataRes.rows.length > 0) {
      dataRes.rows.forEach((r, i) => {
        console.log(`[Record ${i + 1}] student_id: ${r.student_id}, source: ${r.request_source}, status: ${r.match_status}`);
      });
    } else {
      console.log("Chưa có record nào.");
    }
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();
