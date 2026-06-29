const express = require("express");
const pool = require("../db");
const jwt = require("jsonwebtoken");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "your_super_secret_key_change_in_production";

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

const requireAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ success: false, message: "Vui lòng đăng nhập." });
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ success: false, message: "Token không hợp lệ." });
    req.user = decoded;
    next();
  });
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
        learning_style, preferred_schedule, budget, learning_format, city, district,
        match_status, matched_tutor_count, request_source, contact_name, contact_phone, contact_email
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18,
        $19, $20, $21, $22, $23, $24,
        'pending', 0, $25, $26, $27, $28
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
      data.learningFormat || null,
      data.city || null,
      data.district || null,
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

    // --- XỬ LÝ DỮ LIỆU TỪ REQUEST ---
    const reqSubject = (tutorReq.subject || "").toLowerCase();
    const reqGrade = (tutorReq.grade_level || "").toLowerCase();
    const reqTopics = Array.isArray(tutorReq.topics) ? tutorReq.topics : [];
    const reqGoals = Array.isArray(tutorReq.learning_goals) ? tutorReq.learning_goals : [];
    const reqDifficulties = Array.isArray(tutorReq.learning_difficulties) ? tutorReq.learning_difficulties : [];
    const reqBudget = tutorReq.budget || {};
    const normalizeLocation = (str) => {
      if (!str) return "";
      let s = String(str).toLowerCase();
      s = s.replace(/(thành phố|tỉnh|quận|huyện|thị xã|phường|xã|thị trấn)\s+/g, '');
      // Chuẩn hóa một số tên viết tắt thường gặp nhưng không xóa dữ liệu quận
      s = s.replace(/hồ chí minh/g, 'hcm');
      s = s.replace(/tp\.hcm/g, 'hcm');
      s = s.replace(/tp hcm/g, 'hcm');
      s = s.replace(/hà nội/g, 'hn');
      s = s.replace(/đà nẵng/g, 'dn');
      return s.trim();
    };

    const reqLearningFormat = (tutorReq.learning_format || "").toLowerCase(); // online/offline/both
    const reqLearningStyle = (tutorReq.learning_style || "").toLowerCase();
    const reqCity = normalizeLocation(tutorReq.city);
    const reqDistrict = normalizeLocation(tutorReq.district);

    const isOfflineRequest = reqLearningFormat === "offline" || reqLearningFormat === "both";
    
    let reqAvailableTimes = [];
    if (tutorReq.preferred_schedule && Array.isArray(tutorReq.preferred_schedule.availableTimes)) {
      reqAvailableTimes = tutorReq.preferred_schedule.availableTimes;
    }

    tutorsRes.rows.forEach(tutor => {
      let score = 0;
      let reasonsObj = []; // { priority: number, text: string }
      let componentScores = {
        subject: 0,
        grade: 0,
        goal: 0,
        budget: 0,
        schedule: 0,
        teachingFormat: 0,
        experience: 0,
        rating: 0,
        location: 0
      };

      // --- DỮ LIỆU TUTOR ---
      const tSubjects = (tutor.subjects || "").toLowerCase();
      const tSuitableStudents = Array.isArray(tutor.suitable_students) ? tutor.suitable_students.map(s => String(s).toLowerCase()) : [];
      const tTeachingMethods = Array.isArray(tutor.teaching_methods) ? tutor.teaching_methods.map(m => String(m).toLowerCase()) : [];
      const tBio = (tutor.bio || "").toLowerCase();
      const tHeadline = (tutor.headline || "").toLowerCase();
      const tCity = normalizeLocation(tutor.city);
      const tLoc = normalizeLocation(tutor.location);
      const textToScan = tBio + " " + tHeadline;
      
      const exp = parseInt(tutor.experience_years) || 0;
      const rate = parseFloat(tutor.hourly_rate);
      const rating = parseFloat(tutor.avg_rating) || 0;
      const reviewCount = parseInt(tutor.review_count) || 0;

      if (isOfflineRequest && reqCity) {
        if (!tCity.includes(reqCity) && !tLoc.includes(reqCity)) {
          return; // Bắt buộc phải có tutor ở cùng thành phố
        }
      }

      // 0.5 Hard Filter for Teaching Format
      if (reqLearningFormat && reqLearningFormat !== 'both') {
        const hasOnline = tTeachingMethods.includes('online') || tTeachingMethods.includes('trực tuyến') || tTeachingMethods.includes('cả hai');
        const hasOffline = tTeachingMethods.includes('offline') || tTeachingMethods.includes('trực tiếp') || tTeachingMethods.includes('cả hai');
        
        if (reqLearningFormat === 'online' && !hasOnline) {
          return; // Require online tutor
        }
        if (reqLearningFormat === 'offline' && !hasOffline) {
          return; // Require offline tutor
        }
      }

      // 1. Subject Match (20 điểm)
      // FIX LOGIC: Bắt buộc tutor phải dạy đúng môn. Nếu không khớp môn, loại bỏ hoàn toàn.
      if (reqSubject) {
        if (tSubjects.includes(reqSubject) || textToScan.includes(reqSubject)) {
          score += 20;
          componentScores.subject += 20;
          reasonsObj.push({ priority: 1, text: `Dạy đúng môn ${tutorReq.subject}` });
        } else {
          return; // Loại bỏ khỏi top match
        }
      }

      // 2. Grade Match (15 điểm)
      // FIX LOGIC: Bắt buộc tutor phải dạy đúng khối lớp. Nếu không khớp, loại bỏ hoàn toàn.
      if (reqGrade) {
        let gradeMatched = false;
        const gradeStr = reqGrade.replace(/lớp/g, '').trim();
        const gradeNum = parseInt(gradeStr);
        
        let targetLevels = [reqGrade];
        if (!isNaN(gradeNum)) {
            targetLevels.push(gradeNum.toString());
            targetLevels.push(`lớp ${gradeNum}`);
            if (gradeNum >= 1 && gradeNum <= 5) targetLevels.push("cấp 1", "tiểu học");
            if (gradeNum >= 6 && gradeNum <= 9) targetLevels.push("cấp 2", "trung học cơ sở", "thcs");
            if (gradeNum >= 10 && gradeNum <= 12) targetLevels.push("cấp 3", "trung học phổ thông", "thpt", "đại học");
        } else {
            if (reqGrade.includes("đại học") || reqGrade.includes("sinh viên")) targetLevels.push("đại học", "sinh viên", "người đi làm");
        }

        if (tSuitableStudents.some(s => targetLevels.some(lvl => s.includes(lvl)))) {
          gradeMatched = true;
        } else if (targetLevels.some(lvl => textToScan.includes(lvl))) {
          gradeMatched = true;
        }
        
        if (gradeMatched) {
          score += 15;
          componentScores.grade += 15;
          reasonsObj.push({ priority: 2, text: `Có kinh nghiệm giảng dạy học sinh ${tutorReq.grade_level}` });
        } else {
          return; // Loại bỏ khỏi top match nếu không dạy cấp lớp này!
        }
      }

      // 3. Goal Match (10 điểm)
      let goalMatched = false;
      const tExamPrep = Array.isArray(tutor.exam_preparation) ? tutor.exam_preparation.map(s => String(s).toLowerCase()) : [];
      const tTeachingFocus = Array.isArray(tutor.teaching_focus) ? tutor.teaching_focus.map(s => String(s).toLowerCase()) : [];
      
      if (reqGoals.length > 0) {
        let matchedGoals = [];
        reqGoals.forEach(goal => {
          const gLower = goal.toLowerCase();
          if (tExamPrep.some(e => e.includes(gLower)) || tTeachingFocus.some(f => f.includes(gLower)) || textToScan.includes(gLower)) {
            matchedGoals.push(goal);
            goalMatched = true;
          }
        });
        if (matchedGoals.length > 0) {
          score += 10;
          componentScores.goal += 10;
          reasonsObj.push({ priority: 3, text: `Phù hợp với mục tiêu: ${matchedGoals.join(", ")}` });
        }
      } 
      
      if (!goalMatched && tutorReq.desired_target_score) {
         if (textToScan.includes("mất gốc") || textToScan.includes("nâng điểm") || textToScan.includes("luyện thi") || textToScan.includes("mục tiêu")) {
             score += 10;
             componentScores.goal += 10;
             let reasonText = `Phù hợp với mục tiêu nâng điểm lên ${tutorReq.desired_target_score}`;
             if (tutorReq.current_score) {
                 reasonText = `Phù hợp với mục tiêu nâng điểm từ ${tutorReq.current_score} lên ${tutorReq.desired_target_score}`;
             }
             reasonsObj.push({ priority: 3, text: reasonText });
             goalMatched = true;
         }
      }

      if (reqDifficulties.length > 0 && textToScan.includes("mất gốc")) {
          reasonsObj.push({ priority: 3, text: `Có kinh nghiệm hỗ trợ học sinh mất căn bản / gặp khó khăn` });
          if (!goalMatched) {
            score += 10; // Đảm bảo tối đa 10 điểm cho Goal Match
            componentScores.goal += 10;
          }
      }

      // 4. Budget Match (10 điểm)
      if (!isNaN(rate)) {
        let budgetMatched = false;
        const bMin = parseFloat(reqBudget.budgetMin);
        const bMax = parseFloat(reqBudget.budgetMax);

        if (!isNaN(bMin) && !isNaN(bMax) && rate >= bMin && rate <= bMax) {
          budgetMatched = true;
        } else if (!isNaN(bMax) && isNaN(bMin) && rate <= bMax) {
          budgetMatched = true;
        } else if (!isNaN(bMin) && isNaN(bMax) && rate >= bMin) {
          budgetMatched = true;
        }

        if (budgetMatched) {
          score += 10;
          componentScores.budget += 10;
          reasonsObj.push({ priority: 4, text: `Học phí ${rate.toLocaleString('vi-VN')}đ/buổi nằm trong ngân sách của bạn` });
        }
      }

      // 5. Schedule Match (15 điểm)
      // CHỈ CỘNG ĐIỂM NẾU CÓ DỮ LIỆU. KHÔNG cộng partial point, không sinh reason rác.
      if (reqAvailableTimes.length > 0 && tutor.availability) {
        try {
          const tAvailStr = JSON.stringify(tutor.availability).toLowerCase();
          const isNewFormat = typeof reqAvailableTimes[0] === 'object' && reqAvailableTimes[0] !== null;

          if (!isNewFormat) {
            // Backward compatibility for old string array format
            let matchedTimes = [];
            reqAvailableTimes.forEach(time => {
              if (tAvailStr.includes(String(time).toLowerCase())) {
                matchedTimes.push(time);
              }
            });
            if (matchedTimes.length > 0) {
              const scheduleScore = Math.round((matchedTimes.length / reqAvailableTimes.length) * 15);
              score += scheduleScore;
              componentScores.schedule += scheduleScore;
              
              const uniqueDays = [...new Set(matchedTimes.map(t => {
                 const tLow = String(t).toLowerCase();
                 if(tLow.includes("thứ 2") || tLow.includes("monday")) return "Thứ 2";
                 if(tLow.includes("thứ 3") || tLow.includes("tuesday")) return "Thứ 3";
                 if(tLow.includes("thứ 4") || tLow.includes("wednesday")) return "Thứ 4";
                 if(tLow.includes("thứ 5") || tLow.includes("thursday")) return "Thứ 5";
                 if(tLow.includes("thứ 6") || tLow.includes("friday")) return "Thứ 6";
                 if(tLow.includes("thứ 7") || tLow.includes("saturday")) return "Thứ 7";
                 if(tLow.includes("chủ nhật") || tLow.includes("sunday")) return "Chủ nhật";
                 return null;
              }))].filter(Boolean);
              
              if (uniqueDays.length > 0) {
                 reasonsObj.push({ priority: 5, text: `Có thể dạy vào các ngày ${uniqueDays.join(", ")}` });
              }
            }
          } else {
            // New logic: time intersection
            let totalRequestedMinutes = 0;
            let totalMatchedMinutes = 0;
            let matchedReasons = [];

            const parseTime = (timeStr) => {
              if (!timeStr) return 0;
              const [h, m] = timeStr.split(':').map(Number);
              return (h || 0) * 60 + (m || 0);
            };

            const dayLabels = {
              'monday': 'Thứ 2', 'tuesday': 'Thứ 3', 'wednesday': 'Thứ 4',
              'thursday': 'Thứ 5', 'friday': 'Thứ 6', 'saturday': 'Thứ 7', 'sunday': 'Chủ nhật'
            };

            reqAvailableTimes.forEach(reqSlot => {
              const reqStart = parseTime(reqSlot.start);
              const reqEnd = parseTime(reqSlot.end);
              if (reqEnd <= reqStart) return;

              const reqDuration = reqEnd - reqStart;
              totalRequestedMinutes += reqDuration;

              const tutorDaySlots = tutor.availability[reqSlot.day]; // ["18:00-19:30"]
              let slotMatchedMinutes = 0;

              if (Array.isArray(tutorDaySlots)) {
                tutorDaySlots.forEach(tSlot => {
                  const [tStrStart, tStrEnd] = String(tSlot).split('-');
                  const tStart = parseTime(tStrStart);
                  const tEnd = parseTime(tStrEnd);

                  const overlapStart = Math.max(reqStart, tStart);
                  const overlapEnd = Math.min(reqEnd, tEnd);
                  
                  if (overlapEnd > overlapStart) {
                    slotMatchedMinutes += (overlapEnd - overlapStart);
                  }
                });
              }

              if (slotMatchedMinutes > 0) {
                totalMatchedMinutes += Math.min(slotMatchedMinutes, reqDuration);
                matchedReasons.push(`${dayLabels[reqSlot.day] || reqSlot.day} (${reqSlot.start} - ${reqSlot.end})`);
              }
            });

            if (totalRequestedMinutes > 0 && totalMatchedMinutes > 0) {
              const scheduleScore = Math.round((totalMatchedMinutes / totalRequestedMinutes) * 15);
              score += scheduleScore;
              componentScores.schedule += scheduleScore;
              if (matchedReasons.length > 0) {
                reasonsObj.push({ priority: 5, text: `Có thể dạy vào: ${matchedReasons.join(', ')}` });
              }
            }
          }
        } catch (e) {
          console.error("Schedule Match Error", e);
        }
      }

      // 6. Teaching Format & Location Match (10 điểm + Bonus)
      if (tTeachingMethods.length > 0 && reqLearningFormat) {
        const hasOnline = tTeachingMethods.includes('online') || tTeachingMethods.includes('trực tuyến') || tTeachingMethods.includes('cả hai');
        const hasOffline = tTeachingMethods.includes('offline') || tTeachingMethods.includes('trực tiếp') || tTeachingMethods.includes('cả hai');

        let isMatch = false;
        if (reqLearningFormat === 'online' && hasOnline) isMatch = true;
        else if (reqLearningFormat === 'offline' && hasOffline) isMatch = true;
        else if (reqLearningFormat === 'both' && (hasOnline || hasOffline)) isMatch = true;

        if (isMatch) {
          score += 10;
          componentScores.teachingFormat += 10;
          const formatStr = reqLearningFormat === 'online' ? 'Trực tuyến' : (reqLearningFormat === 'offline' ? 'Trực tiếp' : 'Trực tuyến/Trực tiếp');
          reasonsObj.push({ priority: 6, text: `Hỗ trợ học ${formatStr} đúng theo nhu cầu của bạn` });
        }
      }

      if (isOfflineRequest && reqCity) {
        if (reqDistrict && (tCity.includes(reqDistrict) || tLoc.includes(reqDistrict))) {
          score += 5; // Reduced from 15 to make it a minor bonus
          componentScores.location += 5;
          reasonsObj.push({ priority: 4, text: `Ở gần bạn (cùng quận/huyện)` });
        } else {
          score += 1; // Minor bonus for same city
          componentScores.location += 1;
          reasonsObj.push({ priority: 4, text: `Dạy trực tiếp tại khu vực ${tutorReq.city}` });
        }
      }

      // 7. Experience Match (10 điểm)
      if (exp > 0) {
        let expScore = 0;
        if (exp >= 5) expScore = 10;
        else if (exp >= 3) expScore = 8;
        else if (exp >= 1) expScore = 5;
        else expScore = 2;

        score += expScore;
        componentScores.experience += expScore;
        if (exp >= 1) {
          reasonsObj.push({ priority: 7, text: `Có ${exp} năm kinh nghiệm giảng dạy` });
        }
      }

      // 8. Rating Match (10 điểm)
      // Tính cả avg_rating và review_count (độ tin cậy)
      if (rating > 0 && reviewCount > 0) {
        const reliability = Math.min(reviewCount, 10) / 10; // Đạt max tin cậy ở 10 reviews
        const ratingScore = Math.round((rating / 5) * 10 * reliability);
        score += ratingScore;
        componentScores.rating += ratingScore;
        
        if (rating >= 4.5 && reviewCount >= 3) {
          reasonsObj.push({ priority: 8, text: `Được học sinh đánh giá tích cực (${rating}/5 sao với ${reviewCount} lượt đánh giá)` });
        } else if (rating >= 4.0 && reviewCount > 0) {
          reasonsObj.push({ priority: 8, text: `Chất lượng giảng dạy tốt (${rating}/5 sao)` });
        }
      }

      // Đảm bảo score không vượt quá 100
      score = Math.min(score, 100);

      // Phân loại Match Tier
      let matchTier = "";
      if (score >= 80) matchTier = "Excellent Match";
      else if (score >= 60) matchTier = "Good Match";
      else if (score >= 40) matchTier = "Partial Match";
      else matchTier = "Low Match";

      // Lọc và sắp xếp Reasons
      reasonsObj.sort((a, b) => a.priority - b.priority);
      let finalReasons = reasonsObj.map(r => r.text);
      
      // Bổ sung thêm reasons nếu chưa đủ 4 (từ dữ liệu thực tế)
      if (finalReasons.length < 4) {
          const tSpecializations = Array.isArray(tutor.specializations) ? tutor.specializations : [];
          if (tSpecializations.length > 0) {
             finalReasons.push(`Có thế mạnh chuyên môn về: ${tSpecializations.slice(0,2).join(", ")}`);
          }
          const tCertificates = Array.isArray(tutor.certificates) ? tutor.certificates : [];
          if (tCertificates.length > 0) {
             finalReasons.push(`Sở hữu chứng chỉ chuyên môn liên quan`);
          }
      }
      
      // Giới hạn hiển thị (Tối đa 8 reasons)
      if (finalReasons.length > 8) {
        finalReasons = finalReasons.slice(0, 8);
      }
      
      if (score >= 5) {
        matchedTutors.push({
          id: tutor.user_id,
          name: tutor.name,
          avatarUrl: tutor.avatar_url,
          pricePerSession: parseFloat(tutor.hourly_rate) || null,
          experienceYears: tutor.experience_years,
          rating: parseFloat(tutor.avg_rating) || 0,
          reviewCount: parseInt(tutor.review_count) || 0,
          teachingFormats: tTeachingMethods,
          location: tutor.city,
          headline: tutor.headline,
          bio: tutor.bio,
          subjects: tutor.subjects ? tutor.subjects.split(',').map(s => s.trim()) : [],
          suitableStudents: Array.isArray(tutor.suitable_students) ? tutor.suitable_students : [],
          matchScore: score,
          matchTier: matchTier,
          reasons: finalReasons,
          componentScores: componentScores
        });
      }
    });

    matchedTutors.sort((a, b) => b.matchScore - a.matchScore);

    // Lưu lại số lượng tutor match được và upsert vào tutor_request_matches
    await pool.query(`UPDATE tutor_requests SET matched_tutor_count = $1 WHERE id = $2`, [matchedTutors.length, requestId]);

    // Cố gắng lưu matches, nhưng không để lỗi DB làm hỏng response
    try {
      for (let tutor of matchedTutors) {
        try {
          const upsertQuery = `
            INSERT INTO tutor_request_matches (request_id, tutor_id, match_score, match_tier)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (request_id, tutor_id) 
            DO UPDATE SET match_score = EXCLUDED.match_score, match_tier = EXCLUDED.match_tier
            RETURNING is_interested, is_selected, status
          `;
          const upRes = await pool.query(upsertQuery, [requestId, tutor.id, tutor.matchScore, tutor.matchTier]);
          if (upRes.rows.length > 0) {
            tutor.is_interested = upRes.rows[0].is_interested;
            tutor.is_selected = upRes.rows[0].is_selected;
            tutor.status = upRes.rows[0].status;
          }
        } catch (upsertErr) {
          // Không crash vì upsert fail, chỉ log warning
          console.warn('[TutorMatches] upsert match record failed (non-fatal):', upsertErr.message);
          tutor.is_interested = false;
          tutor.is_selected = false;
          tutor.status = 'pending';
        }
      }
    } catch (loopErr) {
      console.warn('[TutorMatches] loop error (non-fatal):', loopErr.message);
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
router.post("/api/tutor-requests/:requestId/select", requireAuth, async (req, res) => {
  const { requestId } = req.params;
  const { tutorId } = req.body;
  const studentId = req.user.userId;
  const client = await pool.connect();
  
  try {
    await client.query("BEGIN");
    
    // Verify ownership and lock the request row to prevent race conditions
    const reqRes = await client.query(`SELECT id, student_id FROM tutor_requests WHERE id = $1 FOR UPDATE`, [requestId]);
    if (reqRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "Request not found." });
    }
    if (reqRes.rows[0].student_id !== studentId) {
      await client.query("ROLLBACK");
      return res.status(403).json({ success: false, message: "Bạn không có quyền thao tác trên yêu cầu này." });
    }

    // 1. Kiểm tra giới hạn 3 người
    const countRes = await client.query(`SELECT COUNT(*) FROM tutor_request_matches WHERE request_id = $1 AND is_selected = true`, [requestId]);
    if (parseInt(countRes.rows[0].count) >= 3) {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, message: "Bạn chỉ có thể gửi yêu cầu tới tối đa 3 gia sư." });
    }

    // 2. Cập nhật record đã tồn tại
    const updateRes = await client.query(`
      UPDATE tutor_request_matches 
      SET is_selected = true, status = 'pending', selected_at = NOW() 
      WHERE request_id = $1 AND tutor_id = $2
      RETURNING *
    `, [requestId, tutorId]);

    if (updateRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "Match record not found." });
    }

    // 3. Cập nhật trạng thái của request thành waiting_tutor_response
    await client.query(`UPDATE tutor_requests SET match_status = 'waiting_tutor_response' WHERE id = $1`, [requestId]);

    await client.query("COMMIT");
    return res.json({ success: true, message: "Đã gửi yêu cầu thành công." });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("[SelectTutor] POST error:", error.message);
    return res.status(500).json({ success: false, message: "Server error." });
  } finally {
    client.release();
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
// (đã di chuyển lên trên cùng)

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
