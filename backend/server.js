const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");          // NEW: email notifications
const { OAuth2Client } = require("google-auth-library");
const pool = require("./db");
const { generateQuizQuestions, chatWithAI } = require("./gemini");


dotenv.config({ override: true });

const app = express();
const port = Number(process.env.PORT || 5000);
const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
const googleClientId = process.env.GOOGLE_CLIENT_ID || "";
const jwtSecret = process.env.JWT_SECRET || "dev_jwt_secret_change_me";
const googleClient = new OAuth2Client(googleClientId);

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: frontendOrigin }));
app.use(express.json());

// ─── Helper: tạo JWT token ────────────────────────────────────────────────────
function createToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      name: user.full_name || "",
      picture: user.picture || "",
      role: user.role || "student",
    },
    jwtSecret,
    { expiresIn: "7d" }
  );
}

// ─── Middleware: verifyToken ──────────────────────────────────────────────────
// Reads the Authorization header, verifies the JWT, and attaches decoded
// user info to req.user. Returns 401 if the token is missing or invalid.
function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"] || "";
  // Expected format: "Bearer <token>"
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "No token provided. Please log in." });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded;   // { userId, email, name, picture, role }
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token. Please log in again." });
  }
}

// ─── Middleware: requireAdmin ─────────────────────────────────────────────────
// Must be used AFTER verifyToken. Returns 403 if the user is not an admin.
function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Forbidden: admin access only." });
  }
  next();
}

// ─── Nodemailer: email helper ─────────────────────────────────────────────────
// Sends a notification email to a tutor after their application is reviewed.
// If SMTP env variables are missing, it logs a warning and skips sending.
async function sendTutorReviewEmail(to, status, reason) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;

  // Skip gracefully if SMTP is not configured
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.log(`[Email] SMTP not configured — skipping email to ${to}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: Number(SMTP_PORT) === 465,   // true for port 465, false for others
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  const isApproved = status === "approved";
  const subject = isApproved
    ? "🎉 Your EduX tutor application has been approved!"
    : "Your EduX tutor application was not approved";

  const html = isApproved
    ? `<p>Congratulations! Your tutor application on <strong>EduX</strong> has been <strong style="color:green">approved</strong>. You can now start accepting students.</p>`
    : `<p>Thank you for applying to <strong>EduX</strong>. Unfortunately, your application was <strong style="color:red">rejected</strong>.</p>
       <p><strong>Reason:</strong> ${reason || "No specific reason provided."}</p>
       <p>You may re-apply after addressing the issues mentioned above.</p>`;

  try {
    await transporter.sendMail({
      from: SMTP_FROM || SMTP_USER,
      to,
      subject,
      html,
    });
    console.log(`[Email] Sent ${status} notification to ${to}`);
  } catch (err) {
    // Log the error but do NOT crash the server
    console.error(`[Email] Failed to send email to ${to}:`, err.message);
  }
}

// ─── GET / ────────────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.send("EduX Backend is running ✅");
});

// ─── POST /api/auth/register ──────────────────────────────────────────────────
// Đăng ký bằng email + password
app.post("/api/auth/register", async (req, res) => {
  try {
    const { fullName, email, password, role } = req.body || {};

    // Validate
    if (!fullName || !email || !password) {
      return res
        .status(400)
        .json({ message: "Full name, email and password are required." });
    }
    if (password.length < 8) {
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters." });
    }

    const allowedRoles = ["student", "parent", "tutor"];
    const userRole = allowedRoles.includes(role) ? role : "student";

    // Kiểm tra email đã tồn tại chưa
    const existing = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email.toLowerCase().trim()]
    );
    if (existing.rows.length > 0) {
      return res
        .status(409)
        .json({ message: "Email already registered. Please sign in." });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Tạo user mới
    const result = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, full_name, email, role, picture, created_at`,
      [fullName.trim(), email.toLowerCase().trim(), passwordHash, userRole]
    );

    const newUser = result.rows[0];
    const token = createToken(newUser);

    return res.status(201).json({
      token,
      user: {
        id: newUser.id,
        name: newUser.full_name,
        email: newUser.email,
        role: newUser.role,
        picture: newUser.picture,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
// Đăng nhập bằng email + password
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }

    // Tìm user theo email
    const result = await pool.query(
      "SELECT id, full_name, email, password_hash, role, picture FROM users WHERE email = $1",
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return res
        .status(401)
        .json({ message: "Invalid email or password." });
    }

    const user = result.rows[0];

    // User đăng ký bằng Google, không có password
    if (!user.password_hash) {
      return res.status(401).json({
        message: "This account uses Google sign-in. Please use Google to log in.",
      });
    }

    // Kiểm tra password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const token = createToken(user);

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.full_name,
        email: user.email,
        role: user.role,
        picture: user.picture,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
});

// ─── POST /api/auth/google ────────────────────────────────────────────────────
// Đăng nhập / đăng ký bằng Google OAuth — lưu vào DB
app.post("/api/auth/google", async (req, res) => {
  try {
    const { credential } = req.body || {};

    if (!googleClientId) {
      return res
        .status(500)
        .json({ message: "GOOGLE_CLIENT_ID is not configured on the server." });
    }
    if (!credential) {
      return res.status(400).json({ message: "Missing Google credential." });
    }

    // Verify Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: googleClientId,
    });

    const payload = ticket.getPayload();
    if (!payload?.email || !payload?.sub) {
      return res.status(401).json({ message: "Invalid Google token payload." });
    }

    const googleId = payload.sub;
    const email = payload.email.toLowerCase().trim();
    const name = payload.name || "";
    const picture = payload.picture || "";

    // Tìm user đã có chưa (theo google_id hoặc email)
    let userResult = await pool.query(
      "SELECT id, full_name, email, role, picture FROM users WHERE google_id = $1 OR email = $2",
      [googleId, email]
    );

    let user;
    if (userResult.rows.length > 0) {
      // Đã có → cập nhật google_id và picture nếu cần
      user = userResult.rows[0];
      await pool.query(
        "UPDATE users SET google_id = $1, picture = $2 WHERE id = $3",
        [googleId, picture, user.id]
      );
      user.picture = picture;
    } else {
      // Chưa có → tạo mới với role mặc định 'student'
      const insertResult = await pool.query(
        `INSERT INTO users (full_name, email, google_id, picture, role)
         VALUES ($1, $2, $3, $4, 'student')
         RETURNING id, full_name, email, role, picture`,
        [name, email, googleId, picture]
      );
      user = insertResult.rows[0];
    }

    const token = createToken(user);

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.full_name,
        email: user.email,
        role: user.role,
        picture: user.picture,
      },
    });
  } catch (error) {
    console.error("Google auth error:", error);
    return res.status(401).json({ message: "Google authentication failed." });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── ADMIN APIs (all protected by verifyToken + requireAdmin) ──────────────────
// ═══════════════════════════════════════════════════════════════════════════════

// ─── GET /api/admin/tutors/stats ──────────────────────────────────────────────
// Returns count of pending / approved / rejected tutor profiles
app.get("/api/admin/tutors/stats", verifyToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending')  AS pending,
        COUNT(*) FILTER (WHERE status = 'approved') AS approved,
        COUNT(*) FILTER (WHERE status = 'rejected') AS rejected
      FROM tutor_profiles
    `);
    const row = result.rows[0];
    return res.json({
      pending:  Number(row.pending),
      approved: Number(row.approved),
      rejected: Number(row.rejected),
    });
  } catch (error) {
    console.error("Stats error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

// ─── GET /api/admin/tutors/pending ────────────────────────────────────────────
// Returns all tutor_profiles with status = 'pending', joined with users
app.get("/api/admin/tutors/pending", verifyToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        tp.id,
        tp.user_id,
        u.full_name,
        u.email,
        tp.bio,
        tp.subjects,
        tp.experience_years,
        tp.certificate_url,
        tp.cccd_url,
        tp.status,
        tp.reject_reason,
        tp.created_at
      FROM tutor_profiles tp
      JOIN users u ON u.id = tp.user_id
      WHERE tp.status = 'pending'
      ORDER BY tp.created_at ASC
    `);
    return res.json(result.rows);
  } catch (error) {
    console.error("Pending tutors error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

// ─── PATCH /api/admin/tutors/:id/approve ─────────────────────────────────────
// Approves a tutor application and optionally sends them an email
app.patch("/api/admin/tutors/:id/approve", verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `UPDATE tutor_profiles
       SET status = 'approved', reject_reason = NULL
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Tutor profile not found." });
    }

    const profile = result.rows[0];

    // Also update the user's role to 'tutor' (if not already)
    await pool.query(
      `UPDATE users SET role = 'tutor' WHERE id = $1 AND role != 'admin'`,
      [profile.user_id]
    );

    // Fetch user email to send notification
    const userResult = await pool.query(
      "SELECT email FROM users WHERE id = $1",
      [profile.user_id]
    );
    if (userResult.rows.length > 0) {
      sendTutorReviewEmail(userResult.rows[0].email, "approved", null);
    }

    return res.json(profile);
  } catch (error) {
    console.error("Approve error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

// ─── PATCH /api/admin/tutors/:id/reject ──────────────────────────────────────
// Rejects a tutor application with a reason and optionally sends them an email
app.patch("/api/admin/tutors/:id/reject", verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body || {};

  if (!reason || !reason.trim()) {
    return res.status(400).json({ message: "Reject reason is required." });
  }

  try {
    const result = await pool.query(
      `UPDATE tutor_profiles
       SET status = 'rejected', reject_reason = $1
       WHERE id = $2
       RETURNING *`,
      [reason.trim(), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Tutor profile not found." });
    }

    const profile = result.rows[0];

    // Fetch user email to send notification
    const userResult = await pool.query(
      "SELECT email FROM users WHERE id = $1",
      [profile.user_id]
    );
    if (userResult.rows.length > 0) {
      sendTutorReviewEmail(userResult.rows[0].email, "rejected", reason);
    }

    return res.json(profile);
  } catch (error) {
    console.error("Reject error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  QUIZ APIs
// ══════════════════════════════════════════════════════════════════════════════

// ─── GET /api/quizzes ─────────────────────────────────────────────────────────
app.get('/api/quizzes', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, title, subject, description, duration_minutes, total_questions, created_at
      FROM quizzes ORDER BY created_at DESC
    `);
    return res.json({ quizzes: result.rows });
  } catch (e) { res.status(500).json({ message: 'Server error.' }); }
});

// ─── GET /api/subjects ────────────────────────────────────────────────────────
app.get('/api/subjects', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`SELECT DISTINCT subject FROM quizzes ORDER BY subject`);
    return res.json({ subjects: result.rows.map(r => r.subject) });
  } catch (e) { res.status(500).json({ message: 'Server error.' }); }
});

// ─── GET /api/quizzes/attempts/:attemptId ─────────────────────────────────────
app.get('/api/quizzes/attempts/:attemptId', verifyToken, async (req, res) => {
  try {
    const { attemptId } = req.params;
    const attempt = await pool.query(`SELECT * FROM quiz_attempts WHERE id=$1 AND student_id=$2`, [attemptId, req.user.userId]);
    if (!attempt.rows.length) return res.status(404).json({ message: 'Not found.' });
    const a = attempt.rows[0];
    const quiz = await pool.query(`SELECT * FROM quizzes WHERE id=$1`, [a.quiz_id]);
    const questions = await pool.query(`SELECT * FROM quiz_questions WHERE quiz_id=$1 ORDER BY question_order`, [a.quiz_id]);
    return res.json({ attempt: a, quiz: quiz.rows[0], questions: questions.rows });
  } catch (e) { res.status(500).json({ message: 'Server error.' }); }
});

// ─── GET /api/quizzes/:id/start ───────────────────────────────────────────────
app.get('/api/quizzes/:id/start', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = req.user.userId;
    const quiz = await pool.query(`SELECT * FROM quizzes WHERE id=$1`, [id]);
    if (!quiz.rows.length) return res.status(404).json({ message: 'Quiz not found.' });
    // Reuse in_progress attempt
    let attempt = await pool.query(`SELECT * FROM quiz_attempts WHERE quiz_id=$1 AND student_id=$2 AND status='in_progress' LIMIT 1`, [id, studentId]);
    if (!attempt.rows.length) {
      attempt = await pool.query(`INSERT INTO quiz_attempts (quiz_id, student_id, status) VALUES ($1,$2,'in_progress') RETURNING *`, [id, studentId]);
    }
    const questions = await pool.query(`SELECT id, question_text, option_a, option_b, option_c, option_d, question_order FROM quiz_questions WHERE quiz_id=$1 ORDER BY question_order`, [id]);
    return res.json({ quiz: quiz.rows[0], questions: questions.rows, attempt: attempt.rows[0] });
  } catch (e) { res.status(500).json({ message: 'Server error.' }); }
});

// ─── POST /api/quizzes/:id/save-draft ─────────────────────────────────────────
app.post('/api/quizzes/:id/save-draft', verifyToken, async (req, res) => {
  try {
    const { attemptId, answers, timeRemainingSeconds } = req.body;
    await pool.query(`UPDATE quiz_attempts SET answers=$1, time_remaining_seconds=$2 WHERE id=$3 AND student_id=$4`,
      [JSON.stringify(answers), timeRemainingSeconds, attemptId, req.user.userId]);
    return res.json({ message: 'Draft saved.' });
  } catch (e) { res.status(500).json({ message: 'Server error.' }); }
});

// ─── POST /api/quizzes/:id/submit ─────────────────────────────────────────────
app.post('/api/quizzes/:id/submit', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { attemptId, answers } = req.body;
    const studentId = req.user.userId;
    const attempt = await pool.query(`SELECT * FROM quiz_attempts WHERE id=$1 AND student_id=$2`, [attemptId, studentId]);
    if (!attempt.rows.length) return res.status(404).json({ message: 'Attempt not found.' });
    const questions = await pool.query(`SELECT id, correct_answer FROM quiz_questions WHERE quiz_id=$1`, [id]);
    let correct = 0;
    questions.rows.forEach(q => { if ((answers[q.id] || '').toLowerCase() === q.correct_answer.toLowerCase()) correct++; });
    const total = questions.rows.length;
    const score = total > 0 ? Math.round((correct / total) * 100) : 0;
    const result = await pool.query(
      `UPDATE quiz_attempts SET answers=$1, score=$2, total_correct=$3, status='submitted', submitted_at=NOW() WHERE id=$4 RETURNING *`,
      [JSON.stringify(answers), score, correct, attemptId]
    );
    return res.json({ score, total_correct: correct, total_questions: total, attempt: result.rows[0] });
  } catch (e) { res.status(500).json({ message: 'Server error.' }); }
});

// ══════════════════════════════════════════════════════════════════════════════
//  PRACTICE / AI APIs
// ══════════════════════════════════════════════════════════════════════════════

// ─── POST /api/practice/generate ──────────────────────────────────────────────
app.post('/api/practice/generate', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { topic, count = 10, difficulty = 'medium' } = req.body;
    if (!topic?.trim()) return res.status(400).json({ message: 'Topic is required.' });
    const diff = ['easy','medium','hard'].includes(difficulty) ? difficulty : 'medium';
    const questionCount = Math.min(Math.max(Number(count)||10,1),30);
    const questions = await generateQuizQuestions(topic.trim(), questionCount, diff);
    // Detect quota notice
    if (questions.length > 0 && questions[0].question?.startsWith('⚠️')) {
      return res.status(503).json({ message: 'AI_QUOTA_EXCEEDED', detail: 'Gemini và Groq đều đạt giới hạn. Thử lại sau hoặc dùng Đề thi có sẵn.' });
    }
    const result = await pool.query(
      `INSERT INTO practice_sessions (student_id, topic, difficulty, questions, total_questions) VALUES ($1,$2,$3,$4,$5) RETURNING id, topic, difficulty, total_questions, status, created_at`,
      [userId, topic.trim(), diff, JSON.stringify(questions), questions.length]
    );
    const session = result.rows[0];
    const safeQ = questions.map((q,i) => ({ index:i, question:q.question, optionA:q.optionA, optionB:q.optionB, optionC:q.optionC, optionD:q.optionD }));
    return res.status(201).json({ session, questions: safeQ });
  } catch (e) { console.error('Practice generate:', e); res.status(500).json({ message: e.message||'Server error.' }); }
});

// ─── GET /api/practice/history ────────────────────────────────────────────────
app.get('/api/practice/history', verifyToken, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, topic, difficulty, score, total_questions, total_correct, status, created_at, submitted_at FROM practice_sessions WHERE student_id=$1 ORDER BY created_at DESC LIMIT 50`,
      [req.user.userId]
    );
    return res.json({ sessions: r.rows });
  } catch (e) { res.status(500).json({ message: 'Server error.' }); }
});

// ─── GET /api/practice/:sessionId/questions ───────────────────────────────────
app.get('/api/practice/:sessionId/questions', verifyToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const r = await pool.query(`SELECT * FROM practice_sessions WHERE id=$1 AND student_id=$2`, [sessionId, req.user.userId]);
    if (!r.rows.length) return res.status(404).json({ message: 'Session not found.' });
    const session = r.rows[0];
    const questions = (session.questions || []).map((q,i) => ({ index:i, question:q.question, optionA:q.optionA, optionB:q.optionB, optionC:q.optionC, optionD:q.optionD }));
    return res.json({ session: { id:session.id, topic:session.topic, difficulty:session.difficulty, total_questions:session.total_questions, status:session.status, answers:session.answers }, questions });
  } catch (e) { res.status(500).json({ message: 'Server error.' }); }
});

// ─── POST /api/practice/chat ──────────────────────────────────────────────────
app.post('/api/practice/chat', verifyToken, async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages?.length) return res.status(400).json({ message: 'Messages required.' });
    const result = await chatWithAI(messages);
    return res.json(result);
  } catch (e) { res.status(500).json({ message: 'Server error.' }); }
});

// ─── POST /api/practice/:sessionId/submit ─────────────────────────────────────
app.post('/api/practice/:sessionId/submit', verifyToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { answers } = req.body;
    const r = await pool.query(`SELECT * FROM practice_sessions WHERE id=$1 AND student_id=$2`, [sessionId, req.user.userId]);
    if (!r.rows.length) return res.status(404).json({ message: 'Session not found.' });
    const session = r.rows[0];
    const questions = session.questions || [];
    let correct = 0;
    questions.forEach((q,i) => { if ((answers[i]||'').toUpperCase() === (q.correctAnswer||'A').toUpperCase()) correct++; });
    const total = questions.length;
    const score = total > 0 ? Math.round((correct/total)*100) : 0;
    const updated = await pool.query(
      `UPDATE practice_sessions SET answers=$1, score=$2, total_correct=$3, status='submitted', submitted_at=NOW() WHERE id=$4 RETURNING *`,
      [JSON.stringify(answers), score, correct, sessionId]
    );
    return res.json({ score, total_correct:correct, total_questions:total, session: updated.rows[0] });
  } catch (e) { res.status(500).json({ message: 'Server error.' }); }
});

// ─── GET /api/practice/:sessionId/result ──────────────────────────────────────
app.get('/api/practice/:sessionId/result', verifyToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const r = await pool.query(`SELECT * FROM practice_sessions WHERE id=$1 AND student_id=$2`, [sessionId, req.user.userId]);
    if (!r.rows.length) return res.status(404).json({ message: 'Session not found.' });
    return res.json({ session: r.rows[0] });
  } catch (e) { res.status(500).json({ message: 'Server error.' }); }
});

// ─── DELETE /api/practice/:sessionId ──────────────────────────────────────────
app.delete('/api/practice/:sessionId', verifyToken, async (req, res) => {
  try {
    await pool.query(`DELETE FROM practice_sessions WHERE id=$1 AND student_id=$2`, [req.params.sessionId, req.user.userId]);
    return res.json({ message: 'Deleted.' });
  } catch (e) { res.status(500).json({ message: 'Server error.' }); }
});

// ══════════════════════════════════════════════════════════════════════════════
//  EXAM PAPERS APIs
// ══════════════════════════════════════════════════════════════════════════════

// ─── Shuffle helpers ──────────────────────────────────────────────────────────
function shuffleArray(arr) { const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a; }
function shuffleQuestionOptions(q) {
  const orig={A:q.option_a,B:q.option_b,C:q.option_c,D:q.option_d};
  const letters=shuffleArray(['A','B','C','D']);
  const newOpts={option_a:orig[letters[0]],option_b:orig[letters[1]],option_c:orig[letters[2]],option_d:orig[letters[3]]};
  const newCorrect=['A','B','C','D'][letters.indexOf(q.correct_answer)];
  return {newOptions:newOpts, newCorrect, optionMap:letters};
}

app.get('/api/exam-papers', verifyToken, async (req, res) => {
  try {
    const { grade, subject, year } = req.query;
    const studentId = req.user.userId;
    let q = `SELECT ep.*, epa.id AS attempt_id, epa.status AS attempt_status, epa.score AS attempt_score FROM exam_papers ep LEFT JOIN exam_paper_attempts epa ON ep.id=epa.exam_paper_id AND epa.student_id=$1 WHERE ep.is_published=true`;
    const params = [studentId]; let idx=2;
    if (grade) { q+=` AND ep.grade=$${idx++}`; params.push(parseInt(grade)); }
    if (subject) { q+=` AND ep.subject ILIKE $${idx++}`; params.push(`%${subject}%`); }
    if (year) { q+=` AND ep.year=$${idx++}`; params.push(parseInt(year)); }
    q += ' ORDER BY ep.created_at DESC';
    const r = await pool.query(q, params);
    return res.json({ papers: r.rows });
  } catch (e) { res.status(500).json({ message: 'Server error.' }); }
});

app.get('/api/exam-papers/attempts/:attemptId', verifyToken, async (req, res) => {
  try {
    const { attemptId } = req.params;
    const attempt = await pool.query(`SELECT * FROM exam_paper_attempts WHERE id=$1 AND student_id=$2`, [attemptId, req.user.userId]);
    if (!attempt.rows.length) return res.status(404).json({ message: 'Not found.' });
    const a = attempt.rows[0];
    const paper = await pool.query(`SELECT * FROM exam_papers WHERE id=$1`, [a.exam_paper_id]);
    const questions = await pool.query(`SELECT * FROM exam_paper_questions WHERE exam_paper_id=$1 ORDER BY question_order`, [a.exam_paper_id]);
    return res.json({ attempt: a, paper: paper.rows[0], questions: questions.rows, shuffled_data: a.shuffled_data });
  } catch (e) { res.status(500).json({ message: 'Server error.' }); }
});

app.get('/api/exam-papers/:paperId/start', verifyToken, async (req, res) => {
  try {
    const { paperId } = req.params;
    const studentId = req.user.userId;
    const paper = await pool.query(`SELECT * FROM exam_papers WHERE id=$1 AND is_published=true`, [paperId]);
    if (!paper.rows.length) return res.status(404).json({ message: 'Exam not found.' });
    let attempt = await pool.query(`SELECT * FROM exam_paper_attempts WHERE exam_paper_id=$1 AND student_id=$2 AND status='in_progress' LIMIT 1`, [paperId, studentId]);
    const questions = await pool.query(`SELECT * FROM exam_paper_questions WHERE exam_paper_id=$1 ORDER BY question_order`, [paperId]);
    const shuffledQs = shuffleArray(questions.rows);
    const shuffledData = shuffledQs.map(q => { const {newOptions,newCorrect,optionMap}=shuffleQuestionOptions(q); return {id:q.id,...newOptions,question_text:q.question_text,newCorrect,optionMap}; });
    if (!attempt.rows.length) {
      attempt = await pool.query(`INSERT INTO exam_paper_attempts (exam_paper_id,student_id,shuffled_data) VALUES ($1,$2,$3) RETURNING *`, [paperId, studentId, JSON.stringify(shuffledData)]);
    }
    const safeQ = shuffledData.map(q => ({ id:q.id, question_text:q.question_text, option_a:q.option_a, option_b:q.option_b, option_c:q.option_c, option_d:q.option_d }));
    return res.json({ paper: paper.rows[0], questions: safeQ, attempt_id: attempt.rows[0].id });
  } catch (e) { res.status(500).json({ message: 'Server error.' }); }
});

app.post('/api/exam-papers/:paperId/submit', verifyToken, async (req, res) => {
  try {
    const { attemptId, answers } = req.body;
    const studentId = req.user.userId;
    const attempt = await pool.query(`SELECT * FROM exam_paper_attempts WHERE id=$1 AND student_id=$2`, [attemptId, studentId]);
    if (!attempt.rows.length) return res.status(404).json({ message: 'Attempt not found.' });
    const shuffledData = attempt.rows[0].shuffled_data || [];
    let correct = 0;
    shuffledData.forEach(q => { if ((answers[q.id]||'').toUpperCase() === q.newCorrect.toUpperCase()) correct++; });
    const total = shuffledData.length;
    const score = total > 0 ? Math.round((correct/total)*100) : 0;
    const updated = await pool.query(
      `UPDATE exam_paper_attempts SET answers=$1,score=$2,total_correct=$3,status='submitted',submitted_at=NOW() WHERE id=$4 RETURNING *`,
      [JSON.stringify(answers), score, correct, attemptId]
    );
    return res.json({ score, total_correct:correct, total_questions:total, attempt_id:attemptId, submitted_at:updated.rows[0].submitted_at });
  } catch (e) { res.status(500).json({ message: 'Server error.' }); }
});

// ══════════════════════════════════════════════════════════════════════════════
//  PARENT DASHBOARD APIs
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/parent/overview
// Returns: stats, recent quiz attempts, available tutors, practice sessions
app.get("/api/parent/overview", verifyToken, async (req, res) => {
  try {
    // Total students in system
    const studentsRes = await pool.query(
      `SELECT COUNT(*) as count FROM users WHERE role='student'`
    );
    // Total quiz attempts (submitted)
    const attemptsRes = await pool.query(
      `SELECT COUNT(*) as count FROM quiz_attempts WHERE status='submitted'`
    );
    // Total practice sessions (submitted)
    const practiceRes = await pool.query(
      `SELECT COUNT(*) as count FROM practice_sessions WHERE status='submitted'`
    );
    // Approved tutors
    const tutorsRes = await pool.query(
      `SELECT COUNT(*) as count FROM tutor_profiles WHERE status='approved'`
    );

    // Recent quiz attempts with student & quiz info
    const recentAttemptsRes = await pool.query(`
      SELECT
        qa.id,
        qa.score,
        qa.status,
        qa.submitted_at,
        u.full_name  AS student_name,
        u.picture    AS student_picture,
        q.title      AS quiz_title,
        q.subject    AS quiz_subject,
        q.total_questions
      FROM quiz_attempts qa
      JOIN users u ON qa.student_id = u.id
      JOIN quizzes q ON qa.quiz_id = q.id
      WHERE qa.status = 'submitted'
      ORDER BY qa.submitted_at DESC
      LIMIT 10
    `);

    // Recent practice sessions
    const recentPracticeRes = await pool.query(`
      SELECT
        ps.id,
        ps.topic,
        ps.difficulty,
        ps.score,
        ps.total_questions,
        ps.total_correct,
        ps.status,
        ps.submitted_at,
        u.full_name AS student_name,
        u.picture   AS student_picture
      FROM practice_sessions ps
      JOIN users u ON ps.student_id = u.id
      WHERE ps.status = 'submitted'
      ORDER BY ps.submitted_at DESC
      LIMIT 10
    `);

    // Available tutors list
    const availableTutorsRes = await pool.query(`
      SELECT
        u.id,
        u.full_name,
        u.picture,
        u.email,
        tp.subjects,
        tp.hourly_rate,
        tp.headline,
        tp.bio,
        tp.experience_years,
        tp.location
      FROM tutor_profiles tp
      JOIN users u ON tp.user_id = u.id
      WHERE tp.status = 'approved'
      ORDER BY tp.created_at DESC
      LIMIT 20
    `);

    // Exam paper attempts
    const examAttemptsRes = await pool.query(`
      SELECT
        epa.id,
        epa.score,
        epa.status,
        epa.submitted_at,
        u.full_name  AS student_name,
        u.picture    AS student_picture,
        ep.title     AS exam_title,
        ep.subject   AS exam_subject,
        ep.grade,
        ep.year,
        ep.total_questions
      FROM exam_paper_attempts epa
      JOIN users u ON epa.student_id = u.id
      JOIN exam_papers ep ON epa.exam_paper_id = ep.id
      WHERE epa.status = 'submitted'
      ORDER BY epa.submitted_at DESC
      LIMIT 10
    `);

    return res.json({
      stats: {
        total_students: parseInt(studentsRes.rows[0].count),
        total_quiz_attempts: parseInt(attemptsRes.rows[0].count),
        total_practice_sessions: parseInt(practiceRes.rows[0].count),
        total_tutors: parseInt(tutorsRes.rows[0].count),
      },
      recent_quiz_attempts: recentAttemptsRes.rows,
      recent_practice_sessions: recentPracticeRes.rows,
      available_tutors: availableTutorsRes.rows,
      recent_exam_attempts: examAttemptsRes.rows,
    });
  } catch (error) {
    console.error("Parent overview error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

// GET /api/parent/students
// Returns list of all students with their quiz/practice stats
app.get("/api/parent/students", verifyToken, async (req, res) => {
  try {
    const studentsRes = await pool.query(`
      SELECT
        u.id,
        u.full_name,
        u.email,
        u.picture,
        u.created_at,
        (SELECT COUNT(*) FROM quiz_attempts qa WHERE qa.student_id=u.id AND qa.status='submitted') AS quiz_attempts_count,
        (SELECT COUNT(*) FROM practice_sessions ps WHERE ps.student_id=u.id AND ps.status='submitted') AS practice_count,
        (SELECT ROUND(AVG(qa.score),1) FROM quiz_attempts qa WHERE qa.student_id=u.id AND qa.status='submitted') AS avg_quiz_score,
        (SELECT ROUND(AVG(ps.score),1) FROM practice_sessions ps WHERE ps.student_id=u.id AND ps.status='submitted') AS avg_practice_score,
        (SELECT qa.submitted_at FROM quiz_attempts qa WHERE qa.student_id=u.id AND qa.status='submitted' ORDER BY qa.submitted_at DESC LIMIT 1) AS last_activity
      FROM users u
      WHERE u.role = 'student'
      ORDER BY last_activity DESC NULLS LAST
    `);
    return res.json({ students: studentsRes.rows });
  } catch (error) {
    console.error("Parent students error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

// GET /api/parent/tutors
// Returns all approved tutors with detailed profile
app.get("/api/parent/tutors", verifyToken, async (req, res) => {
  try {
    const res2 = await pool.query(`
      SELECT
        u.id,
        u.full_name,
        u.email,
        u.picture,
        tp.subjects,
        tp.hourly_rate,
        tp.headline,
        tp.bio,
        tp.experience_years,
        tp.location,
        tp.teaching_style,
        tp.status,
        tp.created_at
      FROM tutor_profiles tp
      JOIN users u ON tp.user_id = u.id
      WHERE tp.status = 'approved'
      ORDER BY tp.created_at DESC
    `);
    return res.json({ tutors: res2.rows });
  } catch (error) {
    console.error("Parent tutors error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

// GET /api/parent/activity
// Returns all quiz + practice + exam activity across all students
app.get("/api/parent/activity", verifyToken, async (req, res) => {
  try {
    const quizRes = await pool.query(`
      SELECT
        'quiz' AS type,
        qa.id,
        qa.score,
        qa.submitted_at AS timestamp,
        u.full_name  AS student_name,
        u.picture    AS student_picture,
        q.title      AS title,
        q.subject    AS subject,
        q.total_questions
      FROM quiz_attempts qa
      JOIN users u ON qa.student_id=u.id
      JOIN quizzes q ON qa.quiz_id=q.id
      WHERE qa.status='submitted'
      ORDER BY qa.submitted_at DESC
      LIMIT 50
    `);

    const practiceRes = await pool.query(`
      SELECT
        'practice' AS type,
        ps.id,
        ps.score,
        ps.submitted_at AS timestamp,
        u.full_name  AS student_name,
        u.picture    AS student_picture,
        ps.topic     AS title,
        ps.difficulty AS subject,
        ps.total_questions
      FROM practice_sessions ps
      JOIN users u ON ps.student_id=u.id
      WHERE ps.status='submitted'
      ORDER BY ps.submitted_at DESC
      LIMIT 50
    `);

    const examRes = await pool.query(`
      SELECT
        'exam' AS type,
        epa.id,
        epa.score,
        epa.submitted_at AS timestamp,
        u.full_name  AS student_name,
        u.picture    AS student_picture,
        ep.title     AS title,
        ep.subject   AS subject,
        ep.total_questions
      FROM exam_paper_attempts epa
      JOIN users u ON epa.student_id=u.id
      JOIN exam_papers ep ON epa.exam_paper_id=ep.id
      WHERE epa.status='submitted'
      ORDER BY epa.submitted_at DESC
      LIMIT 50
    `);

    // Merge and sort by timestamp
    const all = [
      ...quizRes.rows,
      ...practiceRes.rows,
      ...examRes.rows,
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return res.json({ activities: all.slice(0, 50) });
  } catch (error) {
    console.error("Parent activity error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  PARENT-STUDENT LINKING APIs
// ══════════════════════════════════════════════════════════════════════════════

function generateLinkCode() {
  const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code='';
  for(let i=0;i<8;i++) code+=chars[Math.floor(Math.random()*chars.length)];
  return code;
}

// Student: get permanent link code
app.get('/api/student/link-code', verifyToken, async (req, res) => {
  try {
    const studentId = req.user.userId;
    const existing = await pool.query('SELECT code, created_at FROM student_link_codes WHERE student_id=$1', [studentId]);
    if (existing.rows.length) return res.json(existing.rows[0]);
    let code, tries=0;
    do { code=generateLinkCode(); tries++; } while (tries<10 && (await pool.query('SELECT id FROM student_link_codes WHERE code=$1',[code])).rows.length>0);
    const r = await pool.query('INSERT INTO student_link_codes (student_id,code) VALUES ($1,$2) RETURNING code,created_at', [studentId,code]);
    return res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ message: 'Server error.' }); }
});

// Student: view parents monitoring them
app.get('/api/student/parents', verifyToken, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT pc.id,pc.linked_at,pc.nickname,u.full_name AS parent_name,u.email AS parent_email,u.picture AS parent_picture
       FROM parent_children pc JOIN users u ON pc.parent_id=u.id WHERE pc.student_id=$1 ORDER BY pc.linked_at DESC`,
      [req.user.userId]
    );
    return res.json({ parents: r.rows });
  } catch (e) { res.status(500).json({ message: 'Server error.' }); }
});

// Parent: list linked children + stats
app.get('/api/parent/children', verifyToken, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT pc.id AS link_id,pc.linked_at,pc.nickname,u.id AS student_id,u.full_name AS student_name,u.email AS student_email,u.picture AS student_picture,
       (SELECT COUNT(*) FROM quiz_attempts qa WHERE qa.student_id=u.id AND qa.status='submitted') AS quiz_count,
       (SELECT COUNT(*) FROM practice_sessions ps WHERE ps.student_id=u.id AND ps.status='submitted') AS practice_count,
       (SELECT COUNT(*) FROM exam_paper_attempts epa WHERE epa.student_id=u.id AND epa.status='submitted') AS exam_count,
       (SELECT ROUND(AVG(qa.score),1) FROM quiz_attempts qa WHERE qa.student_id=u.id AND qa.status='submitted') AS avg_quiz_score,
       (SELECT ROUND(AVG(ps.score),1) FROM practice_sessions ps WHERE ps.student_id=u.id AND ps.status='submitted') AS avg_practice_score,
       (SELECT qa.submitted_at FROM quiz_attempts qa WHERE qa.student_id=u.id AND qa.status='submitted' ORDER BY qa.submitted_at DESC LIMIT 1) AS last_quiz_at
       FROM parent_children pc JOIN users u ON pc.student_id=u.id WHERE pc.parent_id=$1 ORDER BY pc.linked_at DESC`,
      [req.user.userId]
    );
    return res.json({ children: r.rows });
  } catch (e) { res.status(500).json({ message: 'Server error.' }); }
});

// Parent: link via code
app.post('/api/parent/link-child', verifyToken, async (req, res) => {
  try {
    const parentId = req.user.userId;
    const { code, nickname } = req.body;
    if (!code || code.trim().length!==8) return res.status(400).json({ message: 'Mã liên kết phải đúng 8 ký tự.' });
    const codeRes = await pool.query('SELECT student_id FROM student_link_codes WHERE code=$1', [code.trim().toUpperCase()]);
    if (!codeRes.rows.length) return res.status(404).json({ message: 'Mã liên kết không hợp lệ.' });
    const studentId = codeRes.rows[0].student_id;
    if (studentId===parentId) return res.status(400).json({ message: 'Bạn không thể liên kết với chính mình.' });
    const dup = await pool.query('SELECT id FROM parent_children WHERE parent_id=$1 AND student_id=$2', [parentId,studentId]);
    if (dup.rows.length) return res.status(409).json({ message: 'Học sinh này đã được liên kết rồi.' });
    await pool.query('INSERT INTO parent_children (parent_id,student_id,nickname) VALUES ($1,$2,$3)', [parentId,studentId,nickname?.trim()||null]);
    const student = await pool.query('SELECT id,full_name,email,picture FROM users WHERE id=$1', [studentId]);
    return res.status(201).json({ message: 'Liên kết thành công!', student: student.rows[0] });
  } catch (e) { res.status(500).json({ message: 'Server error.' }); }
});

// Parent: create new student account + auto-link
app.post('/api/parent/create-child', verifyToken, async (req, res) => {
  try {
    const parentId = req.user.userId;
    const { full_name, email, password, nickname } = req.body;
    if (!full_name?.trim()||!email?.trim()||!password) return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin.' });
    if (password.length<6) return res.status(400).json({ message: 'Mật khẩu phải ít nhất 6 ký tự.' });
    const exists = await pool.query('SELECT id FROM users WHERE email=$1', [email.trim().toLowerCase()]);
    if (exists.rows.length) return res.status(409).json({ message: 'Email đã tồn tại. Dùng mã liên kết nếu đây là con bạn.' });
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash(password, 10);
    const student = await pool.query(`INSERT INTO users (full_name,email,password_hash,role) VALUES ($1,$2,$3,'student') RETURNING id,full_name,email,role`, [full_name.trim(),email.trim().toLowerCase(),hash]);
    const s = student.rows[0];
    await pool.query('INSERT INTO parent_children (parent_id,student_id,nickname) VALUES ($1,$2,$3)', [parentId,s.id,nickname?.trim()||null]);
    let code, tries=0;
    do { code=generateLinkCode(); tries++; } while (tries<10 && (await pool.query('SELECT id FROM student_link_codes WHERE code=$1',[code])).rows.length>0);
    await pool.query('INSERT INTO student_link_codes (student_id,code) VALUES ($1,$2)', [s.id,code]);
    return res.status(201).json({ message: 'Tạo tài khoản thành công!', student: s });
  } catch (e) { res.status(500).json({ message: 'Server error.' }); }
});

// Parent: unlink
app.delete('/api/parent/children/:studentId', verifyToken, async (req, res) => {
  try {
    const r = await pool.query('DELETE FROM parent_children WHERE parent_id=$1 AND student_id=$2 RETURNING id', [req.user.userId, req.params.studentId]);
    if (!r.rows.length) return res.status(404).json({ message: 'Không tìm thấy liên kết.' });
    return res.json({ message: 'Đã hủy liên kết.' });
  } catch (e) { res.status(500).json({ message: 'Server error.' }); }
});

// Parent: get child's detailed progress
app.get('/api/parent/children/:studentId/progress', verifyToken, async (req, res) => {
  try {
    const parentId = req.user.userId;
    const { studentId } = req.params;
    const link = await pool.query('SELECT id FROM parent_children WHERE parent_id=$1 AND student_id=$2', [parentId,studentId]);
    if (!link.rows.length) return res.status(403).json({ message: 'Bạn không có quyền xem học sinh này.' });
    const [quiz, practice, exam] = await Promise.all([
      pool.query(`SELECT qa.id,qa.score,qa.submitted_at,q.title,q.subject,q.total_questions,qa.total_correct FROM quiz_attempts qa JOIN quizzes q ON qa.quiz_id=q.id WHERE qa.student_id=$1 AND qa.status='submitted' ORDER BY qa.submitted_at DESC LIMIT 20`, [studentId]),
      pool.query(`SELECT id,topic,difficulty,score,total_questions,total_correct,submitted_at FROM practice_sessions WHERE student_id=$1 AND status='submitted' ORDER BY submitted_at DESC LIMIT 20`, [studentId]),
      pool.query(`SELECT epa.id,epa.score,epa.submitted_at,epa.total_correct,ep.title,ep.subject,ep.grade,ep.year,ep.total_questions FROM exam_paper_attempts epa JOIN exam_papers ep ON epa.exam_paper_id=ep.id WHERE epa.student_id=$1 AND epa.status='submitted' ORDER BY epa.submitted_at DESC LIMIT 20`, [studentId])
    ]);
    return res.json({ quiz_attempts:quiz.rows, practice_sessions:practice.rows, exam_attempts:exam.rows });
  } catch (e) { res.status(500).json({ message: 'Server error.' }); }
});



const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);
const BUCKET = 'chat-files';

// Multer: lưu file vào bộ nhớ tạm
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/', 'video/', 'audio/',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument',
      'application/zip', 'application/x-zip',
      'text/plain',
    ];
    const ok = allowed.some(t => file.mimetype.startsWith(t));
    if (!ok) return cb(new Error('Loại file không được hỗ trợ'));
    cb(null, true);
  }
});

// ── chat_messages table ──
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sender_id    UUID NOT NULL REFERENCES users(id),
        receiver_id  UUID NOT NULL REFERENCES users(id),
        content      TEXT,
        msg_type     VARCHAR(20) DEFAULT 'text',
        file_url     TEXT,
        file_name    TEXT,
        file_size    INTEGER,
        file_mime    TEXT,
        is_read      BOOLEAN DEFAULT false,
        created_at   TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('✅ chat_messages table ready');
  } catch (e) { console.error('chat_messages table error:', e.message); }
})();

// GET /api/chat/conversations — danh sách hội thoại
app.get('/api/chat/conversations', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await pool.query(`
      SELECT DISTINCT ON (other_id)
        other_id, other_name, other_email, other_picture, other_role,
        last_message, last_msg_type, last_message_at, unread_count
      FROM (
        SELECT
          CASE WHEN m.sender_id=$1 THEN m.receiver_id ELSE m.sender_id END AS other_id,
          CASE WHEN m.sender_id=$1 THEN ru.full_name  ELSE su.full_name  END AS other_name,
          CASE WHEN m.sender_id=$1 THEN ru.email      ELSE su.email      END AS other_email,
          CASE WHEN m.sender_id=$1 THEN ru.picture    ELSE su.picture    END AS other_picture,
          CASE WHEN m.sender_id=$1 THEN ru.role       ELSE su.role       END AS other_role,
          COALESCE(m.content, m.file_name, '[File]')  AS last_message,
          m.msg_type                                   AS last_msg_type,
          m.created_at                                 AS last_message_at,
          (SELECT COUNT(*) FROM chat_messages um
           WHERE um.sender_id != $1 AND um.receiver_id=$1 AND um.is_read=false
             AND um.sender_id = CASE WHEN m.sender_id=$1 THEN m.receiver_id ELSE m.sender_id END
          ) AS unread_count
        FROM chat_messages m
        JOIN users su ON su.id=m.sender_id
        JOIN users ru ON ru.id=m.receiver_id
        WHERE m.sender_id=$1 OR m.receiver_id=$1
        ORDER BY m.created_at DESC
      ) sub
      ORDER BY other_id, last_message_at DESC
    `, [userId]);
    return res.json({ conversations: result.rows });
  } catch (e) { console.error(e); res.status(500).json({ message: 'Server error.' }); }
});

// GET /api/chat/contacts — danh sách liên hệ để nhắn tin (dựa theo role)
// ⚠️ MUST be before /api/chat/:otherId to avoid wildcard match
app.get('/api/chat/contacts', verifyToken, async (req, res) => {
  try {
    const role = req.user.role;
    let result;
    if (role === 'parent' || role === 'student') {
      result = await pool.query(`
        SELECT u.id, u.full_name, u.email, u.picture, u.role,
               tp.headline, tp.subjects, tp.hourly_rate
        FROM users u
        JOIN tutor_profiles tp ON tp.user_id=u.id
        WHERE u.role='tutor' AND tp.status='approved'
        ORDER BY u.full_name
      `);
    } else if (role === 'tutor') {
      result = await pool.query(`
        SELECT id, full_name, email, picture, role
        FROM users
        WHERE role IN ('parent', 'student')
        ORDER BY full_name
      `);
    } else {
      result = { rows: [] };
    }
    return res.json({ contacts: result.rows });
  } catch (e) { console.error(e); res.status(500).json({ message: 'Server error.' }); }
});

// GET /api/chat/:otherId — lịch sử tin nhắn + đánh dấu đã đọc
app.get('/api/chat/:otherId', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { otherId } = req.params;
    await pool.query(
      `UPDATE chat_messages SET is_read=true WHERE sender_id=$1 AND receiver_id=$2 AND is_read=false`,
      [otherId, userId]
    );
    const result = await pool.query(`
      SELECT m.*, u.full_name AS sender_name, u.picture AS sender_picture
      FROM chat_messages m
      JOIN users u ON u.id=m.sender_id
      WHERE (m.sender_id=$1 AND m.receiver_id=$2)
         OR (m.sender_id=$2 AND m.receiver_id=$1)
      ORDER BY m.created_at ASC
      LIMIT 300
    `, [userId, otherId]);
    const other = await pool.query(
      `SELECT id, full_name, email, picture, role FROM users WHERE id=$1`, [otherId]
    );
    return res.json({ messages: result.rows, other: other.rows[0] || null });
  } catch (e) { console.error(e); res.status(500).json({ message: 'Server error.' }); }
});

// POST /api/chat — gửi tin nhắn text
app.post('/api/chat', verifyToken, async (req, res) => {
  try {
    const senderId = req.user.userId;
    const { receiver_id, content } = req.body;
    if (!receiver_id || !content?.trim())
      return res.status(400).json({ message: 'receiver_id và content là bắt buộc.' });
    const receiver = await pool.query(`SELECT id FROM users WHERE id=$1`, [receiver_id]);
    if (!receiver.rows.length) return res.status(404).json({ message: 'Người nhận không tồn tại.' });
    const msg = await pool.query(
      `INSERT INTO chat_messages (sender_id, receiver_id, content, msg_type)
       VALUES ($1,$2,$3,'text') RETURNING *`,
      [senderId, receiver_id, content.trim()]
    );
    return res.status(201).json({ message: msg.rows[0] });
  } catch (e) { console.error(e); res.status(500).json({ message: 'Server error.' }); }
});

// POST /api/chat/upload — upload file (ảnh/video/tệp) lên Supabase Storage
app.post('/api/chat/upload', verifyToken, upload.single('file'), async (req, res) => {
  try {
    const senderId = req.user.userId;
    const { receiver_id } = req.body;
    if (!receiver_id) return res.status(400).json({ message: 'receiver_id là bắt buộc.' });
    if (!req.file) return res.status(400).json({ message: 'Không có file được gửi lên.' });

    const { originalname, mimetype, size, buffer } = req.file;
    const ext = originalname.includes('.') ? '.' + originalname.split('.').pop() : '';
    const safeName = `${Date.now()}_${Math.random().toString(36).slice(2,8)}${ext}`;
    const storagePath = `${senderId}/${safeName}`;

    // Xác định msg_type
    let msgType = 'file';
    if (mimetype.startsWith('image/')) msgType = 'image';
    else if (mimetype.startsWith('video/')) msgType = 'video';

    // Upload lên Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin
      .storage.from(BUCKET)
      .upload(storagePath, buffer, { contentType: mimetype, upsert: false });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return res.status(500).json({ message: 'Lỗi upload file: ' + uploadError.message });
    }

    // Lấy public URL
    const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(storagePath);
    const fileUrl = urlData?.publicUrl || '';

    // Lưu tin nhắn vào DB
    const msg = await pool.query(
      `INSERT INTO chat_messages
         (sender_id, receiver_id, msg_type, file_url, file_name, file_size, file_mime, content)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [senderId, receiver_id, msgType, fileUrl, originalname, size, mimetype, null]
    );
    return res.status(201).json({ message: msg.rows[0] });
  } catch (e) { console.error(e); res.status(500).json({ message: 'Server error: ' + e.message }); }
});

app.listen(port, () => {
  console.log(`🚀 Server is running on http://localhost:${port}`);
});
