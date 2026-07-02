async function testItem4() {
  const API_BASE = 'http://localhost:5000';
  let requestId = null;

  try {
    const { Pool } = require('pg');
    require('dotenv').config();
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    const reqQuery = await pool.query(`SELECT id FROM tutor_requests LIMIT 1`);
    requestId = reqQuery.rows[0].id;
    console.log("Using request:", requestId);

    // 1. Chạy Match Engine để Upsert
    console.log("\n=== BƯỚC 1: CHẠY MATCHING (Tự động Upsert) ===");
    const matchRes = await fetch(`${API_BASE}/api/tutor-matches/${requestId}`);
    const matchData = await matchRes.json();
    console.log(`Tìm thấy ${matchData.data.totalMatches} gia sư`);
    
    const tutors = matchData.data.tutors;
    if (tutors.length < 4) {
      console.log("Không đủ 4 gia sư để test limit 3. Đang test với " + tutors.length + " gia sư.");
    }
    
    // In trạng thái upsert
    console.log("Tutor 0 - selected:", tutors[0].is_selected);

    // Xóa match hiện tại để test sạch
    await pool.query('UPDATE tutor_request_matches SET is_selected = false, status = \'pending\' WHERE request_id = $1', [requestId]);

    // 2. Bấm chọn gia sư (tối đa 3)
    console.log("\n=== BƯỚC 2: CHỌN GIA SƯ ===");
    for (let i = 0; i < Math.min(3, tutors.length); i++) {
      const selRes = await fetch(`${API_BASE}/api/tutor-requests/${requestId}/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tutorId: tutors[i].id })
      });
      const selData = await selRes.json();
      console.log(`Chọn Tutor ${i+1} (${tutors[i].id}):`, selData.message);
    }

    // 3. Bấm chọn gia sư thứ 4 để lấy lỗi Limit
    if (tutors.length >= 4) {
      console.log("\n=== BƯỚC 3: TEST GIỚI HẠN 3 NGƯỜI (Chọn người thứ 4) ===");
      const selRes4 = await fetch(`${API_BASE}/api/tutor-requests/${requestId}/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tutorId: tutors[3].id })
      });
      const selData4 = await selRes4.json();
      console.log("Kết quả mong đợi (bị chặn):", selData4.message);
    }

    // Lấy Match ID của Tutor 1 để Accept
    const matchQuery = await pool.query(`SELECT id, status FROM tutor_request_matches WHERE request_id = $1 AND tutor_id = $2`, [requestId, tutors[0].id]);
    const matchId = matchQuery.rows[0].id;

    // 4. Accept
    console.log("\n=== BƯỚC 4: GIA SƯ 1 ACCEPT ===");
    const accRes = await fetch(`${API_BASE}/api/tutor-requests/matches/${matchId}/accept`, {
      method: 'POST'
    });
    const accData = await accRes.json();
    console.log("Accept result:", accData.message);

    // 5. Kiểm tra Auto Cancel các match còn lại
    console.log("\n=== BƯỚC 5: AUTO CANCEL ===");
    const checkRes = await pool.query(`SELECT tutor_id, status FROM tutor_request_matches WHERE request_id = $1`, [requestId]);
    console.log("Trạng thái hiện tại của tất cả Matches:");
    console.table(checkRes.rows);

    const reqStatusRes = await pool.query(`SELECT match_status FROM tutor_requests WHERE id = $1`, [requestId]);
    console.log("Trạng thái Request gốc:", reqStatusRes.rows[0].match_status);

    pool.end();
  } catch (err) {
    console.error("Test error:", err);
  }
}

testItem4();
