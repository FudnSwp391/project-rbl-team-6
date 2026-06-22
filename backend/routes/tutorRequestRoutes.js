const express = require("express");
const pool = require("../db");
const jwt = require("jsonwebtoken");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "your_super_secret_key_change_in_production";

// Middleware để xác thực tuỳ chọn (cho phép cả Guest và User đăng nhập)
const optionalAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (token) {
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (!err) req.user = decoded;
      next();
    });
  } else {
    next();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/tutor-requests
// Tạo mới một yêu cầu tìm gia sư
// ─────────────────────────────────────────────────────────────────────────────
router.post("/api/tutor-requests", optionalAuth, async (req, res) => {
  try {
    const data = req.body;
    let student_id = null;
    let request_source = 'guest';

    // 5. Backend tự lấy student_id từ JWT nếu user đã đăng nhập
    if (req.user && req.user.userId) {
      student_id = req.user.userId;
      request_source = req.user.role === 'parent' ? 'parent' : 'student';
    }

    // Prepare JSON fields safely
    const topics = data.topics ? JSON.stringify(data.topics) : null;
    const learning_difficulties = data.difficulties ? JSON.stringify(data.difficulties) : null;
    const learning_goals = data.learningGoals ? JSON.stringify(data.learningGoals) : null;
    
    // Convert preferred_schedule from frontend arrays to JSON
    const preferred_schedule = JSON.stringify({
      availableTimes: data.availableTimes || [],
      sessionsPerWeek: data.sessionsPerWeek,
      durationPerSession: data.durationPerSession,
      startTimePreference: data.startTimePreference,
      scheduleFlexibility: data.scheduleFlexibility
    });

    const budget = JSON.stringify({
      budgetMin: data.budgetMin,
      budgetMax: data.budgetMax,
      canIncreaseBudget: data.canIncreaseBudget
    });

    const query = `
      INSERT INTO tutor_requests (
        student_id, grade_level, education_program, textbook, subject, topics, description,
        current_level, current_score, recent_test_score, learning_difficulties, self_learning_ability, learning_speed,
        learning_goals, current_target_score, desired_target_score, deadline_months, urgency_level,
        learning_style, preferred_schedule, budget,
        match_status, matched_tutor_count, request_source, contact_name, contact_phone, contact_email
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18,
        $19, $20, $21,
        'pending', 0, $22, $23, $24, $25
      ) RETURNING *;
    `;

    const values = [
      student_id,
      data.grade || null,
      data.educationLevel || data.curriculum || null,
      data.textbook || null,
      data.subject || null,
      topics,
      data.subjectDescription || null,
      data.currentLevel || null,
      data.recentAverageScore || null,
      data.recentTestScore || null,
      learning_difficulties,
      data.selfStudyAbility || null,
      data.learningSpeed || null,
      learning_goals,
      data.targetScore || null, // mapping targetScore to current target or desired
      data.targetScore || null,
      data.deadline_months || null,
      data.goalNote || null, // map goal note to urgency level for now
      data.teachingStyle || null,
      preferred_schedule,
      budget,
      request_source,
      data.contact_name || null,
      data.contact_phone || null,
      data.contact_email || null
    ];

    const result = await pool.query(query, values);
    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("[TutorRequests] POST error:", error.message);
    return res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/tutor-requests/:id
// Chi tiết request
// ─────────────────────────────────────────────────────────────────────────────
router.get("/api/tutor-requests/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`SELECT * FROM tutor_requests WHERE id = $1`, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }
    return res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("[TutorRequests] GET error:", error.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/tutor-requests/student/:studentId
// Danh sách request của một học sinh
// ─────────────────────────────────────────────────────────────────────────────
router.get("/api/tutor-requests/student/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;
    const result = await pool.query(`SELECT * FROM tutor_requests WHERE student_id = $1 ORDER BY created_at DESC`, [studentId]);
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("[TutorRequests] GET by student error:", error.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/tutor-matches/:requestId
// Lấy danh sách gia sư phù hợp cho một request
// ─────────────────────────────────────────────────────────────────────────────
router.get("/api/tutor-matches/:requestId", async (req, res) => {
  try {
    const { requestId } = req.params;
    
    // 1. Get the request
    const requestRes = await pool.query(`SELECT * FROM tutor_requests WHERE id = $1`, [requestId]);
    if (requestRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }
    const tutorReq = requestRes.rows[0];

    // 2. Get all approved tutors
    const tutorsRes = await pool.query(`
      SELECT 
        tp.*, 
        u.id as user_uuid,
        COALESCE(
          NULLIF(TRIM(COALESCE(tp.display_name, '')), ''),
          NULLIF(TRIM(COALESCE(tp.first_name,'') || ' ' || COALESCE(tp.last_name,'')), ''),
          u.full_name
        ) AS name,
        COALESCE(tp.profile_photo_url, u.picture) AS avatar_url
      FROM tutor_profiles tp
      JOIN users u ON tp.user_id = u.id
      WHERE tp.status = 'approved'
    `);
    
    let matchedTutors = [];

    // Lấy thông tin từ request
    const reqSubject = (tutorReq.subject || "").toLowerCase();
    const reqGrade = (tutorReq.grade_level || "").toLowerCase();
    const reqTopics = Array.isArray(tutorReq.topics) ? tutorReq.topics : [];
    const reqGoals = Array.isArray(tutorReq.learning_goals) ? tutorReq.learning_goals : [];
    const reqBudget = tutorReq.budget || {};
    const reqLearningStyle = (tutorReq.learning_style || "").toLowerCase();
    
    // Xử lý preferred_schedule
    let reqAvailableTimes = [];
    if (tutorReq.preferred_schedule && tutorReq.preferred_schedule.availableTimes) {
      reqAvailableTimes = tutorReq.preferred_schedule.availableTimes;
    }

    tutorsRes.rows.forEach(tutor => {
      let score = 0;
      let reasons = [];

      // Dữ liệu tutor
      const tSubjects = (tutor.subjects || "").toLowerCase();
      const tSuitableStudents = Array.isArray(tutor.suitable_students) ? tutor.suitable_students.map(s => String(s).toLowerCase()) : [];
      const tTeachingMethods = Array.isArray(tutor.teaching_methods) ? tutor.teaching_methods.map(m => String(m).toLowerCase()) : [];
      const tBio = (tutor.bio || "").toLowerCase();
      const tHeadline = (tutor.headline || "").toLowerCase();
      const textToScan = tBio + " " + tHeadline;

      // 1. Subject Match (30%)
      // Ưu tiên dữ liệu cấu trúc
      if (reqSubject && tSubjects.includes(reqSubject)) {
        score += 30;
        reasons.push(`Dạy đúng môn ${tutorReq.subject}`);
      }

      // 2. Grade Level Match (20%)
      // Ưu tiên cấu trúc suitable_students, nếu không thì scan text
      if (reqGrade) {
        let gradeMatched = false;
        if (tSuitableStudents.length > 0) {
          if (tSuitableStudents.some(s => s.includes(reqGrade))) {
            gradeMatched = true;
          }
        } else if (textToScan.includes(reqGrade) || textToScan.includes(`lớp ${reqGrade}`) || textToScan.includes("cấp 3")) {
          gradeMatched = true;
        }
        
        if (gradeMatched) {
          score += 20;
          reasons.push(`Có kinh nghiệm dạy Lớp ${tutorReq.grade_level}`);
        }
      }

      // 3. Topic Match (15%)
      const tSpecializations = Array.isArray(tutor.specializations) ? tutor.specializations.map(s => String(s).toLowerCase()) : [];
      if (reqTopics.length > 0) {
        let matchedTopics = [];
        reqTopics.forEach(topic => {
          if (tSpecializations.length > 0 && tSpecializations.some(s => s.includes(topic.toLowerCase()))) {
            matchedTopics.push(topic);
          } else if (textToScan.includes(topic.toLowerCase()) || tSubjects.includes(topic.toLowerCase())) {
            matchedTopics.push(topic);
          }
        });
        if (matchedTopics.length > 0) {
          score += 15;
          reasons.push(`Dạy chuyên đề: ${matchedTopics.join(", ")}`);
        }
      }

      // 4. Learning Goal Match (10%)
      const tExamPrep = Array.isArray(tutor.exam_preparation) ? tutor.exam_preparation.map(s => String(s).toLowerCase()) : [];
      const tTeachingFocus = Array.isArray(tutor.teaching_focus) ? tutor.teaching_focus.map(s => String(s).toLowerCase()) : [];
      if (reqGoals.length > 0) {
        let matchedGoals = [];
        reqGoals.forEach(goal => {
          if (tExamPrep.length > 0 && tExamPrep.some(e => e.includes(goal.toLowerCase()))) {
            matchedGoals.push(goal);
          } else if (tTeachingFocus.length > 0 && tTeachingFocus.some(f => f.includes(goal.toLowerCase()))) {
            matchedGoals.push(goal);
          } else if (textToScan.includes(goal.toLowerCase())) {
            matchedGoals.push(goal);
          }
        });
        if (matchedGoals.length > 0) {
          score += 10;
          reasons.push(`Phù hợp mục tiêu: ${matchedGoals.join(", ")}`);
        }
      }

      // 5. Schedule Match (10%)
      if (reqAvailableTimes.length > 0) {
        let scheduleMatched = false;
        // Ưu tiên cấu trúc availability
        let tAvailability = tutor.availability || {};
        if (Object.keys(tAvailability).length > 0) {
          // Logic so khớp schedule đơn giản
          scheduleMatched = true; // Giả sử có khớp nếu tutor có nhập lịch
        } else {
          // Mặc định cho một nửa điểm nếu tutor chưa nhập lịch để không bị loại quá gắt
          scheduleMatched = true;
          score += 5; 
        }

        if (scheduleMatched && score % 10 !== 5) {
          score += 10;
          reasons.push("Phù hợp lịch học");
        } else if (scheduleMatched) {
          reasons.push("Chưa cập nhật chi tiết lịch (Có thể sắp xếp)");
        }
      }

      // 6. Budget Match (5%)
      if (tutor.hourly_rate) {
        let budgetMatched = false;
        const rate = parseFloat(tutor.hourly_rate);
        const bMin = parseFloat(reqBudget.budgetMin);
        const bMax = parseFloat(reqBudget.budgetMax);

        if (!isNaN(bMin) && !isNaN(bMax)) {
          if (rate >= bMin && rate <= bMax) budgetMatched = true;
        } else if (!isNaN(bMax) && rate <= bMax) {
          budgetMatched = true;
        } else if (!isNaN(bMin) && rate >= bMin) {
          budgetMatched = true;
        }

        if (budgetMatched) {
          score += 5;
          reasons.push("Nằm trong ngân sách");
        }
      }

      // 7. Teaching Mode Match (5%)
      if (tTeachingMethods.length > 0) {
        if (tTeachingMethods.includes(reqLearningStyle) || tTeachingMethods.includes("both")) {
          score += 5;
          reasons.push(`Hỗ trợ dạy ${tutorReq.learning_style === 'online' ? 'Trực tuyến' : 'Trực tiếp'}`);
        }
      }

      // 8. Experience Match (3%)
      const exp = parseInt(tutor.experience_years) || 0;
      if (exp > 0) {
        const expScore = Math.min(exp, 3);
        score += expScore;
        reasons.push(`Có ${exp} năm kinh nghiệm`);
      }

      // 9. Rating Match (2%)
      const rating = parseFloat(tutor.avg_rating) || 0;
      if (rating > 0) {
        const ratingScore = (rating / 5) * 2;
        score += Math.round(ratingScore);
        if (rating >= 4.0) reasons.push(`Được đánh giá cao (${rating} sao)`);
      }

      // Phân loại Match Tier
      let matchTier = "";
      if (score >= 70) matchTier = "Excellent Match";
      else if (score >= 50) matchTier = "Good Match";
      else if (score >= 30) matchTier = "Partial Match";
      else matchTier = "Low Match";

      if (score >= 30) {
        matchedTutors.push({
          id: tutor.user_id, // Gửi user_id để link vào detail
          name: tutor.name,
          avatarUrl: tutor.avatar_url,
          pricePerSession: parseFloat(tutor.hourly_rate) || null,
          experienceYears: tutor.experience_years,
          rating: parseFloat(tutor.avg_rating) || 0,
          reviewCount: parseInt(tutor.review_count) || 0,
          teachingFormats: tTeachingMethods,
          location: tutor.city,
          matchScore: score,
          matchTier: matchTier,
          reasons: reasons.length > 0 ? reasons : ["Gia sư phù hợp trong hệ thống"]
        });
      }
    });

    matchedTutors.sort((a, b) => b.matchScore - a.matchScore);

    // Lưu lại số lượng tutor match được và upsert vào tutor_request_matches
    await pool.query(`UPDATE tutor_requests SET matched_tutor_count = $1 WHERE id = $2`, [matchedTutors.length, requestId]);

    for (let tutor of matchedTutors) {
      const upsertQuery = `
        INSERT INTO tutor_request_matches (request_id, tutor_id, match_score, match_tier)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (request_id, tutor_id) 
        DO UPDATE SET match_score = EXCLUDED.match_score, match_tier = EXCLUDED.match_tier
        RETURNING is_interested, is_selected, status
      `;
      const upRes = await pool.query(upsertQuery, [requestId, tutor.id, tutor.matchScore, tutor.matchTier]);
      tutor.is_interested = upRes.rows[0].is_interested;
      tutor.is_selected = upRes.rows[0].is_selected;
      tutor.status = upRes.rows[0].status;
    }

    return res.json({
      success: true,
      data: {
        requestId,
        totalMatches: matchedTutors.length,
        tutors: matchedTutors
      }
    });

  } catch (error) {
    console.error("[TutorMatches] GET error:", error.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
});

// ─── HẠNG MỤC 4: CHỌN GIA SƯ & QUAN TÂM ──────────────────────────────────

// POST /api/tutor-requests/:requestId/select
router.post("/api/tutor-requests/:requestId/select", async (req, res) => {
  const { requestId } = req.params;
  const { tutorId } = req.body;
  try {
    // 1. Kiểm tra giới hạn 3 người
    const countRes = await pool.query(`SELECT COUNT(*) FROM tutor_request_matches WHERE request_id = $1 AND is_selected = true`, [requestId]);
    if (parseInt(countRes.rows[0].count) >= 3) {
      return res.status(400).json({ success: false, message: "Bạn chỉ có thể gửi yêu cầu tới tối đa 3 gia sư." });
    }

    // 2. Cập nhật record đã tồn tại
    const updateRes = await pool.query(`
      UPDATE tutor_request_matches 
      SET is_selected = true, status = 'pending', selected_at = NOW() 
      WHERE request_id = $1 AND tutor_id = $2
      RETURNING *
    `, [requestId, tutorId]);

    if (updateRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Match record not found." });
    }

    // 3. Cập nhật trạng thái của request thành waiting_tutor_response
    await pool.query(`UPDATE tutor_requests SET match_status = 'waiting_tutor_response' WHERE id = $1`, [requestId]);

    return res.json({ success: true, message: "Đã gửi yêu cầu thành công." });
  } catch (error) {
    console.error("[SelectTutor] POST error:", error.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
});

// POST /api/tutor-requests/:requestId/interest
router.post("/api/tutor-requests/:requestId/interest", async (req, res) => {
  const { requestId } = req.params;
  const { tutorId } = req.body;
  try {
    await pool.query(`
      UPDATE tutor_request_matches 
      SET is_interested = NOT is_interested 
      WHERE request_id = $1 AND tutor_id = $2
    `, [requestId, tutorId]);
    return res.json({ success: true, message: "Đã cập nhật trạng thái quan tâm." });
  } catch (error) {
    console.error("[InterestTutor] POST error:", error.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
});

// POST /api/tutor-requests/matches/:matchId/accept
router.post("/api/tutor-requests/matches/:matchId/accept", async (req, res) => {
  const { matchId } = req.params;
  try {
    // 1. Chấp nhận
    const matchRes = await pool.query(`
      UPDATE tutor_request_matches 
      SET status = 'tutor_accepted', responded_at = NOW() 
      WHERE id = $1 RETURNING request_id
    `, [matchId]);

    if (matchRes.rowCount === 0) return res.status(404).json({ success: false, message: "Match not found." });
    const requestId = matchRes.rows[0].request_id;

    // 2. Cập nhật request
    await pool.query(`UPDATE tutor_requests SET match_status = 'matched' WHERE id = $1`, [requestId]);

    // 3. Cancel toàn bộ các lựa chọn còn lại (để độc quyền)
    await pool.query(`
      UPDATE tutor_request_matches 
      SET status = 'cancelled' 
      WHERE request_id = $1 AND id != $2 AND status = 'pending'
    `, [requestId, matchId]);

    return res.json({ success: true, message: "Đã chấp nhận yêu cầu." });
  } catch (error) {
    console.error("[AcceptRequest] POST error:", error.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
});

// POST /api/tutor-requests/matches/:matchId/reject
router.post("/api/tutor-requests/matches/:matchId/reject", async (req, res) => {
  const { matchId } = req.params;
  try {
    const matchRes = await pool.query(`
      UPDATE tutor_request_matches 
      SET status = 'tutor_rejected', responded_at = NOW() 
      WHERE id = $1 RETURNING request_id
    `, [matchId]);

    if (matchRes.rowCount === 0) return res.status(404).json({ success: false, message: "Match not found." });
    const requestId = matchRes.rows[0].request_id;

    // Kiểm tra xem còn pending nào không
    const pendingRes = await pool.query(`SELECT COUNT(*) FROM tutor_request_matches WHERE request_id = $1 AND status = 'pending'`, [requestId]);
    if (parseInt(pendingRes.rows[0].count) === 0) {
      await pool.query(`UPDATE tutor_requests SET match_status = 'matching' WHERE id = $1`, [requestId]);
    }

    return res.json({ success: true, message: "Đã từ chối yêu cầu." });
  } catch (error) {
    console.error("[RejectRequest] POST error:", error.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
});

// ─── HẠNG MỤC 5: LỊCH SỬ TÌM GIA SƯ ───────────────────────────────────────

// Middleware bắt buộc đăng nhập (dùng cho API cần xác thực)
const requireAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ success: false, message: "Vui lòng đăng nhập." });
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ success: false, message: "Token không hợp lệ." });
    req.user = decoded;
    next();
  });
};

// GET /api/my-tutor-requests
// Lấy danh sách request của student hiện tại
router.get("/api/my-tutor-requests", requireAuth, async (req, res) => {
  try {
    const studentId = req.user.userId;
    const result = await pool.query(`
      SELECT 
        tr.id,
        tr.subject,
        tr.grade_level,
        tr.match_status,
        tr.matched_tutor_count,
        tr.created_at,
        tr.description,
        tr.current_level,
        tr.learning_style,
        (SELECT COUNT(*) FROM tutor_request_matches trm WHERE trm.request_id = tr.id AND trm.is_selected = true) AS selected_count,
        (SELECT COUNT(*) FROM tutor_request_matches trm WHERE trm.request_id = tr.id AND trm.status = 'tutor_accepted') AS accepted_count
      FROM tutor_requests tr
      WHERE tr.student_id = $1
      ORDER BY tr.created_at DESC
    `, [studentId]);

    return res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("[MyTutorRequests] GET error:", error.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
});

// GET /api/my-tutor-requests/:id
// Lấy chi tiết request + danh sách matches + accepted tutor
router.get("/api/my-tutor-requests/:id", requireAuth, async (req, res) => {
  try {
    const studentId = req.user.userId;
    const { id } = req.params;

    // 1. Lấy request
    const reqResult = await pool.query(
      `SELECT * FROM tutor_requests WHERE id = $1 AND student_id = $2`, 
      [id, studentId]
    );
    if (reqResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy yêu cầu." });
    }
    const request = reqResult.rows[0];

    // 2. Lấy tất cả matches với thông tin tutor
    const matchesResult = await pool.query(`
      SELECT 
        trm.id AS match_id,
        trm.tutor_id,
        trm.match_score,
        trm.match_tier,
        trm.is_selected,
        trm.is_interested,
        trm.status,
        trm.selected_at,
        trm.responded_at,
        COALESCE(
          NULLIF(TRIM(COALESCE(tp.display_name, '')), ''),
          NULLIF(TRIM(COALESCE(tp.first_name,'') || ' ' || COALESCE(tp.last_name,'')), ''),
          u.full_name
        ) AS tutor_name,
        COALESCE(tp.profile_photo_url, u.picture) AS tutor_avatar,
        tp.experience_years,
        tp.hourly_rate,
        COALESCE(
          (SELECT ROUND(AVG(r.rating)::numeric, 1) FROM reviews r WHERE r.tutor_id = tp.id),
          0
        ) AS tutor_rating,
        COALESCE(
          (SELECT COUNT(*) FROM reviews r WHERE r.tutor_id = tp.id),
          0
        ) AS tutor_review_count
      FROM tutor_request_matches trm
      JOIN users u ON trm.tutor_id = u.id
      LEFT JOIN tutor_profiles tp ON tp.user_id = u.id
      WHERE trm.request_id = $1
      ORDER BY trm.match_score DESC
    `, [id]);

    // 3. Tìm accepted tutor (nếu có)
    const acceptedTutor = matchesResult.rows.find(m => m.status === 'tutor_accepted') || null;

    return res.json({
      success: true,
      data: {
        request,
        matches: matchesResult.rows,
        acceptedTutor
      }
    });
  } catch (error) {
    console.error("[MyTutorRequests] GET detail error:", error.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
});

// POST /api/tutor-requests/:requestId/cancel
// Student hủy request
router.post("/api/tutor-requests/:requestId/cancel", requireAuth, async (req, res) => {
  try {
    const studentId = req.user.userId;
    const { requestId } = req.params;

    // 1. Kiểm tra request thuộc về student này
    const reqResult = await pool.query(
      `SELECT id, match_status FROM tutor_requests WHERE id = $1 AND student_id = $2`,
      [requestId, studentId]
    );
    if (reqResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy yêu cầu." });
    }

    const currentStatus = reqResult.rows[0].match_status;
    if (currentStatus === 'closed' || currentStatus === 'matched') {
      return res.status(400).json({ success: false, message: "Yêu cầu đã hoàn tất, không thể hủy." });
    }

    // 2. Đóng request
    await pool.query(`UPDATE tutor_requests SET match_status = 'closed' WHERE id = $1`, [requestId]);

    // 3. Cancel toàn bộ match đang pending
    await pool.query(`
      UPDATE tutor_request_matches 
      SET status = 'cancelled' 
      WHERE request_id = $1 AND status = 'pending'
    `, [requestId]);

    return res.json({ success: true, message: "Đã hủy yêu cầu tìm gia sư." });
  } catch (error) {
    console.error("[CancelRequest] POST error:", error.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
});

// ─── HẠNG MỤC 6: GIA SƯ CỦA TÔI (MY TUTORS) ─────────────────────────────────

// GET /api/student/my-tutors
// Lấy danh sách gia sư đã kết nối thành công của học sinh
router.get("/api/student/my-tutors", requireAuth, async (req, res) => {
  try {
    const studentId = req.user.userId;
    
    const result = await pool.query(`
      SELECT 
        trm.id AS match_id,
        trm.tutor_id,
        trm.responded_at AS connected_at,
        tr.subject AS connected_subject,
        tr.grade_level,
        COALESCE(
          NULLIF(TRIM(COALESCE(tp.display_name, '')), ''),
          NULLIF(TRIM(COALESCE(tp.first_name,'') || ' ' || COALESCE(tp.last_name,'')), ''),
          u.full_name
        ) AS tutor_name,
        COALESCE(tp.profile_photo_url, u.picture) AS tutor_avatar,
        tp.experience_years,
        COALESCE(
          (SELECT ROUND(AVG(r.rating)::numeric, 1) FROM reviews r WHERE r.tutor_id = tp.id),
          0
        ) AS tutor_rating,
        COALESCE(
          (SELECT COUNT(*) FROM reviews r WHERE r.tutor_id = tp.id),
          0
        ) AS tutor_review_count
      FROM tutor_request_matches trm
      JOIN tutor_requests tr ON trm.request_id = tr.id
      JOIN users u ON trm.tutor_id = u.id
      LEFT JOIN tutor_profiles tp ON tp.user_id = u.id
      WHERE tr.student_id = $1 
        AND trm.status = 'tutor_accepted'
      ORDER BY trm.responded_at DESC
    `, [studentId]);

    return res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("[MyTutors] GET error:", error.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
});

module.exports = router;
