const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");          // NEW: email notifications
const { OAuth2Client } = require("google-auth-library");
const pool = require("./db");

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 5000);
const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
const googleClientId = process.env.GOOGLE_CLIENT_ID || "";
const jwtSecret = process.env.JWT_SECRET || "dev_jwt_secret_change_me";
const googleClient = new OAuth2Client(googleClientId);

// ─── Middleware ───────────────────────────────────────────────────────────────
const allowedOrigins = frontendOrigin.split(",").map((o) => o.trim());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.some((o) => origin.startsWith(o)) || /^http:\/\/localhost:\d+$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
}));
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

// ─── Middleware: resolveTutorProfile ──────────────────────────────────────────
// Must be used AFTER verifyToken. Tìm hồ sơ gia sư (tutor_profiles) của user
// đang đăng nhập và gắn vào req.tutorProfile. Chỉ cho phép gia sư đã được duyệt
// (status='approved') thao tác với khóa học của mình.
async function resolveTutorProfile(req, res, next) {
  try {
    const r = await pool.query(
      `SELECT id, status FROM tutor_profiles WHERE user_id = $1`,
      [req.user.userId]
    );
    if (r.rowCount === 0) {
      return res.status(403).json({ message: "Bạn chưa có hồ sơ gia sư." });
    }
    if (r.rows[0].status !== "approved") {
      return res.status(403).json({ message: "Hồ sơ gia sư của bạn chưa được duyệt." });
    }
    req.tutorProfile = r.rows[0];
    next();
  } catch (e) {
    console.error("[resolveTutorProfile] error:", e);
    return res.status(500).json({ message: "Server error." });
  }
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
      "SELECT id, full_name, email, password_hash, role, picture, is_active FROM users WHERE email = $1",
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return res
        .status(401)
        .json({ message: "Invalid email or password." });
    }

    const user = result.rows[0];

    // Tài khoản bị khóa (is_active = false)
    if (user.is_active === false) {
      return res.status(403).json({ message: "Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên." });
    }

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

    // Ghi nhật ký duyệt (audit) — không chặn flow nếu lỗi
    pool.query(
      `INSERT INTO tutor_approvals (tutor_id, status, reviewed_by) VALUES ($1, 'approved', $2)`,
      [profile.id, req.user.userId]
    ).catch((e) => console.warn("[tutor_approvals] log failed:", e.message));

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

    // Ghi nhật ký từ chối (audit)
    pool.query(
      `INSERT INTO tutor_approvals (tutor_id, status, note, reviewed_by) VALUES ($1, 'rejected', $2, $3)`,
      [profile.id, reason.trim(), req.user.userId]
    ).catch((e) => console.warn("[tutor_approvals] log failed:", e.message));

    return res.json(profile);
  } catch (error) {
    console.error("Reject error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// ─── PHASE 1 APIs: Gia sư + Khóa học + Môn học (public) ─────────────────────
// ════════════════════════════════════════════════════════════════════════════

// GET /api/subjects — danh sách môn học
app.get("/api/subjects", async (req, res) => {
  try {
    const r = await pool.query(`SELECT id, name, category FROM subjects WHERE is_active=TRUE ORDER BY name`);
    return res.json(r.rows);
  } catch (e) {
    console.error("[subjects] error:", e);
    return res.status(500).json({ message: "Server error." });
  }
});

// GET /api/tutors — danh sách gia sư approved + filter
// Query: ?subject=Toán&level=Cấp 3&min_price=100000&max_price=300000&method=online&q=text&sort=rating|price_asc|price_desc|newest
app.get("/api/tutors", async (req, res) => {
  try {
    const { subject, level, min_price, max_price, method, q, sort } = req.query;
    const params = [];
    const where = [`tp.status = 'approved'`];

    // Subject + level qua tutor_subjects
    let subjectJoin = "";
    if (subject || level) {
      subjectJoin = `
        LEFT JOIN tutor_subjects ts ON ts.tutor_id = tp.id
        LEFT JOIN subjects s ON s.id = ts.subject_id
      `;
      if (subject) { params.push(`%${subject}%`); where.push(`s.name ILIKE $${params.length}`); }
      if (level)   { params.push(level);          where.push(`ts.level = $${params.length}`); }
    }

    if (min_price) { params.push(Number(min_price)); where.push(`tp.hourly_rate >= $${params.length}`); }
    if (max_price) { params.push(Number(max_price)); where.push(`tp.hourly_rate <= $${params.length}`); }
    if (method)    { params.push(method);            where.push(`$${params.length} = ANY(tp.teaching_methods)`); }
    if (q)         { params.push(`%${q}%`);          where.push(`u.full_name ILIKE $${params.length}`); }

    const orderBy = {
      price_asc:  `tp.hourly_rate ASC NULLS LAST`,
      price_desc: `tp.hourly_rate DESC NULLS LAST`,
      newest:     `tp.approved_at DESC NULLS LAST`,
      rating:     `tp.avg_rating DESC, tp.review_count DESC`,
    }[sort] || `tp.avg_rating DESC, tp.review_count DESC`;

    const sql = `
      SELECT DISTINCT
        tp.id, u.full_name, u.email,
        COALESCE(tp.profile_photo_url, u.picture) AS picture,
        tp.bio, tp.experience_years, tp.education, tp.hourly_rate,
        tp.location, tp.teaching_methods, tp.avg_rating, tp.review_count
      FROM tutor_profiles tp
      JOIN users u ON u.id = tp.user_id
      ${subjectJoin}
      WHERE ${where.join(" AND ")}
      ORDER BY ${orderBy}
      LIMIT 50
    `;
    const r = await pool.query(sql, params);
    return res.json(r.rows);
  } catch (e) {
    console.error("[tutors] error:", e);
    return res.status(500).json({ message: "Server error.", detail: e.message });
  }
});

// GET /api/tutors/approved — alias backward-compatible (cho BookingSection cũ)
app.get("/api/tutors/approved", async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT u.id, u.full_name, u.email,
             COALESCE(tp.profile_photo_url, u.picture) AS picture,
             tp.bio, tp.subjects, tp.experience_years
      FROM tutor_profiles tp
      JOIN users u ON u.id = tp.user_id
      WHERE tp.status = 'approved'
      ORDER BY tp.created_at DESC
    `);
    return res.json(r.rows);
  } catch (e) {
    console.error("[tutors/approved] error:", e);
    return res.status(500).json({ message: "Server error." });
  }
});

// GET /api/tutors/:id — chi tiết 1 gia sư
app.get("/api/tutors/:id", async (req, res) => {
  try {
    const t = await pool.query(`
      SELECT tp.id, u.id AS user_id, u.full_name, u.email,
             COALESCE(tp.profile_photo_url, u.picture) AS picture,
             tp.bio, tp.experience_years, tp.education, tp.hourly_rate,
             tp.location, tp.teaching_methods, tp.avg_rating, tp.review_count,
             tp.teaching_style, tp.qualifications, tp.headline, tp.demo_video_url
      FROM tutor_profiles tp
      JOIN users u ON u.id = tp.user_id
      WHERE tp.id = $1 AND tp.status = 'approved'
    `, [req.params.id]);

    if (t.rows.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy gia sư." });
    }

    // Lấy môn dạy
    const subj = await pool.query(`
      SELECT s.name AS subject, ts.level, ts.price_per_hour
      FROM tutor_subjects ts
      JOIN subjects s ON s.id = ts.subject_id
      WHERE ts.tutor_id = $1
    `, [req.params.id]);

    // Lấy reviews
    const rv = await pool.query(`
      SELECT r.id, r.rating, r.comment, r.created_at,
             u.full_name AS reviewer_name, u.picture AS reviewer_picture
      FROM reviews r
      JOIN users u ON u.id = r.user_id
      WHERE r.tutor_id = $1 AND r.is_visible = TRUE
      ORDER BY r.created_at DESC
    `, [req.params.id]);

    return res.json({ ...t.rows[0], subjects: subj.rows, reviews: rv.rows });
  } catch (e) {
    console.error("[tutor detail] error:", e);
    return res.status(500).json({ message: "Server error." });
  }
});

// GET /api/courses — danh sách khóa học published + filter
// Query: ?subject=&level=&min_price=&max_price=&q=
app.get("/api/courses", async (req, res) => {
  try {
    const { subject, level, min_price, max_price, q, sort } = req.query;
    const params = [];
    const where = [`c.status = 'published'`];
    if (subject)   { params.push(subject);          where.push(`c.subject = $${params.length}`); }
    if (level)     { params.push(level);            where.push(`c.level = $${params.length}`); }
    if (min_price) { params.push(Number(min_price)); where.push(`c.price >= $${params.length}`); }
    if (max_price) { params.push(Number(max_price)); where.push(`c.price <= $${params.length}`); }
    if (q)         { params.push(`%${q}%`);          where.push(`c.title ILIKE $${params.length}`); }

    const orderBy = {
      price_asc:  `c.price ASC`,
      price_desc: `c.price DESC`,
      newest:     `c.published_at DESC NULLS LAST`,
      rating:     `c.avg_rating DESC, c.review_count DESC`,
    }[sort] || `c.published_at DESC NULLS LAST`;

    const r = await pool.query(`
      SELECT c.id, c.title, c.description, c.subject, c.level, c.thumbnail_url,
             c.price, c.original_price, c.total_lessons, c.duration_hours,
             c.avg_rating, c.review_count, c.enrollment_count,
             u.full_name AS tutor_name, tp.id AS tutor_id
      FROM courses c
      JOIN tutor_profiles tp ON tp.id = c.tutor_id
      JOIN users u ON u.id = tp.user_id
      WHERE ${where.join(" AND ")}
      ORDER BY ${orderBy}
      LIMIT 50
    `, params);
    return res.json(r.rows);
  } catch (e) {
    console.error("[courses] error:", e);
    return res.status(500).json({ message: "Server error.", detail: e.message });
  }
});

// GET /api/courses/:id — chi tiết khóa học
app.get("/api/courses/:id", async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT c.*,
             u.full_name AS tutor_name,
             COALESCE(tp.profile_photo_url, u.picture) AS tutor_picture,
             tp.bio AS tutor_bio
      FROM courses c
      JOIN tutor_profiles tp ON tp.id = c.tutor_id
      JOIN users u ON u.id = tp.user_id
      WHERE c.id = $1 AND c.status = 'published'
    `, [req.params.id]);
    if (r.rows.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy khóa học." });
    }
    return res.json(r.rows[0]);
  } catch (e) {
    console.error("[course detail] error:", e);
    return res.status(500).json({ message: "Server error." });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// ─── PHASE 2 APIs: Tutor quản lý khóa học (cần đăng nhập + hồ sơ approved) ───
// ════════════════════════════════════════════════════════════════════════════

// Chuẩn hóa + validate payload khóa học gửi từ client.
// Trả { values } nếu hợp lệ, hoặc { error } nếu sai.
function sanitizeCoursePayload(body) {
  const b = body || {};
  const title = (b.title || "").trim();
  if (!title) return { error: "Tiêu đề khóa học là bắt buộc." };
  if (title.length > 255) return { error: "Tiêu đề tối đa 255 ký tự." };

  const toIntOrNull = (v) => {
    if (v === "" || v == null) return null;
    const n = Math.trunc(Number(v));
    return Number.isFinite(n) ? n : null;
  };
  const toNumOrNull = (v) => {
    if (v === "" || v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const price = toIntOrNull(b.price) ?? 0;
  const originalPrice = toIntOrNull(b.original_price);
  if (price < 0) return { error: "Giá không hợp lệ." };
  if (originalPrice != null && originalPrice < 0) return { error: "Giá gốc không hợp lệ." };

  return {
    values: {
      title,
      description: (b.description || "").trim() || null,
      subject: (b.subject || "").trim() || null,
      level: (b.level || "").trim() || null,
      thumbnail_url: (b.thumbnail_url || "").trim() || null,
      price,
      original_price: originalPrice,
      total_lessons: toIntOrNull(b.total_lessons) ?? 0,
      duration_hours: toNumOrNull(b.duration_hours),
    },
  };
}

// GET /api/tutor/courses — danh sách TẤT CẢ khóa học của gia sư đang đăng nhập
// (gồm cả draft / archived), kèm bộ đếm để hiển thị dashboard.
app.get("/api/tutor/courses", verifyToken, resolveTutorProfile, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, title, description, subject, level, thumbnail_url,
              price, original_price, total_lessons, duration_hours,
              avg_rating, review_count, enrollment_count,
              status, published_at, created_at
       FROM courses
       WHERE tutor_id = $1
       ORDER BY created_at DESC`,
      [req.tutorProfile.id]
    );
    return res.json(r.rows);
  } catch (e) {
    console.error("[tutor/courses GET] error:", e);
    return res.status(500).json({ message: "Server error." });
  }
});

// POST /api/tutor/courses — tạo khóa học mới (mặc định status='draft')
app.post("/api/tutor/courses", verifyToken, resolveTutorProfile, async (req, res) => {
  try {
    const { values, error } = sanitizeCoursePayload(req.body);
    if (error) return res.status(400).json({ message: error });

    // Cho phép publish ngay khi tạo nếu client yêu cầu
    const publishNow = req.body?.status === "published";

    const r = await pool.query(
      `INSERT INTO courses
         (tutor_id, title, description, subject, level, thumbnail_url,
          price, original_price, total_lessons, duration_hours,
          status, published_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING id, title, description, subject, level, thumbnail_url,
                 price, original_price, total_lessons, duration_hours,
                 avg_rating, review_count, enrollment_count,
                 status, published_at, created_at`,
      [
        req.tutorProfile.id,
        values.title, values.description, values.subject, values.level,
        values.thumbnail_url, values.price, values.original_price,
        values.total_lessons, values.duration_hours,
        publishNow ? "published" : "draft",
        publishNow ? new Date() : null,
      ]
    );
    return res.status(201).json(r.rows[0]);
  } catch (e) {
    console.error("[tutor/courses POST] error:", e.code, e.message);
    return res.status(500).json({ message: "Server error.", detail: e.message });
  }
});

// PUT /api/tutor/courses/:id — cập nhật khóa học (chỉ chủ sở hữu)
app.put("/api/tutor/courses/:id", verifyToken, resolveTutorProfile, async (req, res) => {
  try {
    const { values, error } = sanitizeCoursePayload(req.body);
    if (error) return res.status(400).json({ message: error });

    const r = await pool.query(
      `UPDATE courses SET
         title = $1, description = $2, subject = $3, level = $4,
         thumbnail_url = $5, price = $6, original_price = $7,
         total_lessons = $8, duration_hours = $9
       WHERE id = $10 AND tutor_id = $11
       RETURNING id, title, description, subject, level, thumbnail_url,
                 price, original_price, total_lessons, duration_hours,
                 avg_rating, review_count, enrollment_count,
                 status, published_at, created_at`,
      [
        values.title, values.description, values.subject, values.level,
        values.thumbnail_url, values.price, values.original_price,
        values.total_lessons, values.duration_hours,
        req.params.id, req.tutorProfile.id,
      ]
    );
    if (r.rowCount === 0) {
      return res.status(404).json({ message: "Không tìm thấy khóa học hoặc bạn không có quyền sửa." });
    }
    return res.json(r.rows[0]);
  } catch (e) {
    console.error("[tutor/courses PUT] error:", e.code, e.message);
    return res.status(500).json({ message: "Server error.", detail: e.message });
  }
});

// PATCH /api/tutor/courses/:id/status — đổi trạng thái publish/draft/archive
app.patch("/api/tutor/courses/:id/status", verifyToken, resolveTutorProfile, async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!["draft", "published", "archived"].includes(status)) {
      return res.status(400).json({ message: "status phải là draft, published hoặc archived." });
    }
    // Khi publish lần đầu thì set published_at; các trạng thái khác giữ nguyên mốc cũ.
    const r = await pool.query(
      `UPDATE courses SET
         status = $1::text,
         published_at = CASE
           WHEN $1::text = 'published' AND published_at IS NULL THEN NOW()
           ELSE published_at
         END
       WHERE id = $2 AND tutor_id = $3
       RETURNING id, status, published_at`,
      [status, req.params.id, req.tutorProfile.id]
    );
    if (r.rowCount === 0) {
      return res.status(404).json({ message: "Không tìm thấy khóa học hoặc bạn không có quyền." });
    }
    return res.json(r.rows[0]);
  } catch (e) {
    console.error("[tutor/courses status] error:", e);
    return res.status(500).json({ message: "Server error." });
  }
});

// DELETE /api/tutor/courses/:id — xóa khóa học (chỉ chủ sở hữu)
app.delete("/api/tutor/courses/:id", verifyToken, resolveTutorProfile, async (req, res) => {
  try {
    const r = await pool.query(
      `DELETE FROM courses WHERE id = $1 AND tutor_id = $2 RETURNING id`,
      [req.params.id, req.tutorProfile.id]
    );
    if (r.rowCount === 0) {
      return res.status(404).json({ message: "Không tìm thấy khóa học hoặc bạn không có quyền xóa." });
    }
    return res.json({ message: "Đã xóa khóa học.", id: r.rows[0].id });
  } catch (e) {
    console.error("[tutor/courses DELETE] error:", e);
    return res.status(500).json({ message: "Server error." });
  }
});

// GET /api/tutor/stats — số liệu tổng quan cho dashboard gia sư (dữ liệu thật)
app.get("/api/tutor/stats", verifyToken, resolveTutorProfile, async (req, res) => {
  try {
    const userId = req.user.userId;        // bookings.tutor_id tham chiếu users.id
    const profileId = req.tutorProfile.id; // courses.tutor_id tham chiếu tutor_profiles.id

    const [bookingsAgg, coursesAgg, revenueAgg] = await Promise.all([
      pool.query(
        `SELECT COUNT(*)::int AS lessons,
                COUNT(DISTINCT student_id)::int AS students
         FROM bookings WHERE tutor_id = $1 AND status = 'confirmed'`,
        [userId]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE status = 'published')::int AS published,
                COALESCE(SUM(enrollment_count), 0)::int AS enrollments
         FROM courses WHERE tutor_id = $1`,
        [profileId]
      ),
      pool.query(
        `SELECT COALESCE(SUM(e.paid_amount), 0)::bigint AS revenue
         FROM enrollments e JOIN courses c ON c.id = e.course_id
         WHERE c.tutor_id = $1`,
        [profileId]
      ),
    ]);

    return res.json({
      students:         bookingsAgg.rows[0].students,
      lessons:          bookingsAgg.rows[0].lessons,
      totalCourses:     coursesAgg.rows[0].total,
      publishedCourses: coursesAgg.rows[0].published,
      enrollments:      coursesAgg.rows[0].enrollments,
      revenue:          Number(revenueAgg.rows[0].revenue),
    });
  } catch (e) {
    console.error("[tutor/stats] error:", e);
    return res.status(500).json({ message: "Server error." });
  }
});

// GET /api/tutor/profile — hồ sơ đầy đủ của gia sư đang đăng nhập (để sửa)
app.get("/api/tutor/profile", verifyToken, resolveTutorProfile, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT tp.id, tp.bio, tp.headline, tp.hourly_rate, tp.location,
              tp.teaching_style, tp.education, tp.qualifications,
              tp.experience_years, tp.teaching_methods, tp.profile_photo_url,
              tp.demo_video_url, tp.phone, tp.status,
              tp.avg_rating, tp.review_count,
              u.full_name, u.email, u.picture
       FROM tutor_profiles tp JOIN users u ON u.id = tp.user_id
       WHERE tp.id = $1`,
      [req.tutorProfile.id]
    );
    return res.json(r.rows[0]);
  } catch (e) {
    console.error("[tutor/profile GET] error:", e);
    return res.status(500).json({ message: "Server error." });
  }
});

// PUT /api/tutor/profile — cập nhật hồ sơ
app.put("/api/tutor/profile", verifyToken, resolveTutorProfile, async (req, res) => {
  try {
    const b = req.body || {};
    const txt = (v) => (typeof v === "string" && v.trim() ? v.trim() : null);
    const intOrNull = (v) => { const n = Math.trunc(Number(v)); return Number.isFinite(n) && v !== "" && v != null ? n : null; };
    // teaching_methods: chỉ chấp nhận online/offline
    let methods = Array.isArray(b.teaching_methods)
      ? b.teaching_methods.filter(m => ["online", "offline"].includes(m))
      : null;

    const r = await pool.query(
      `UPDATE tutor_profiles SET
         bio = $1, headline = $2, hourly_rate = $3, location = $4,
         teaching_style = $5, education = $6, qualifications = $7,
         experience_years = COALESCE($8, experience_years),
         teaching_methods = COALESCE($9, teaching_methods),
         profile_photo_url = $10, demo_video_url = $11, phone = $12,
         updated_at = NOW()
       WHERE id = $13
       RETURNING id`,
      [
        txt(b.bio), txt(b.headline), intOrNull(b.hourly_rate), txt(b.location),
        txt(b.teaching_style), txt(b.education), txt(b.qualifications),
        intOrNull(b.experience_years), methods,
        txt(b.profile_photo_url), txt(b.demo_video_url), txt(b.phone),
        req.tutorProfile.id,
      ]
    );
    return res.json({ message: "Đã lưu hồ sơ.", id: r.rows[0].id });
  } catch (e) {
    console.error("[tutor/profile PUT] error:", e.code, e.message);
    return res.status(500).json({ message: "Server error.", detail: e.message });
  }
});

// GET /api/tutor/subjects — các môn gia sư đang dạy
app.get("/api/tutor/subjects", verifyToken, resolveTutorProfile, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT ts.id, ts.subject_id, s.name AS subject, ts.level, ts.price_per_hour
       FROM tutor_subjects ts JOIN subjects s ON s.id = ts.subject_id
       WHERE ts.tutor_id = $1 ORDER BY s.name, ts.level`,
      [req.tutorProfile.id]
    );
    return res.json(r.rows);
  } catch (e) {
    console.error("[tutor/subjects GET] error:", e);
    return res.status(500).json({ message: "Server error." });
  }
});

// POST /api/tutor/subjects — thêm môn dạy { subject_id, level, price_per_hour }
app.post("/api/tutor/subjects", verifyToken, resolveTutorProfile, async (req, res) => {
  try {
    const { subject_id, level, price_per_hour } = req.body || {};
    if (!subject_id) return res.status(400).json({ message: "Thiếu subject_id." });
    const r = await pool.query(
      `INSERT INTO tutor_subjects (tutor_id, subject_id, level, price_per_hour)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [req.tutorProfile.id, subject_id, level || null, price_per_hour ? Math.trunc(Number(price_per_hour)) : null]
    );
    return res.status(201).json(r.rows[0]);
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ message: "Bạn đã thêm môn + cấp này rồi." });
    if (e.code === "23503") return res.status(400).json({ message: "Môn học không hợp lệ." });
    console.error("[tutor/subjects POST] error:", e.code, e.message);
    return res.status(500).json({ message: "Server error." });
  }
});

// DELETE /api/tutor/subjects/:id — xóa môn dạy
app.delete("/api/tutor/subjects/:id", verifyToken, resolveTutorProfile, async (req, res) => {
  try {
    const r = await pool.query(
      `DELETE FROM tutor_subjects WHERE id = $1 AND tutor_id = $2 RETURNING id`,
      [req.params.id, req.tutorProfile.id]
    );
    if (r.rowCount === 0) return res.status(404).json({ message: "Không tìm thấy môn dạy." });
    return res.json({ message: "Đã xóa môn dạy." });
  } catch (e) {
    console.error("[tutor/subjects DELETE] error:", e);
    return res.status(500).json({ message: "Server error." });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// ─── PHASE 4 APIs: Enrollments (học sinh đăng ký khóa học) ──────────────────
// ════════════════════════════════════════════════════════════════════════════

// GET /api/my/enrollments — danh sách khóa học mà user đang đăng nhập đã ghi danh
app.get("/api/my/enrollments", verifyToken, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT e.id AS enrollment_id, e.status, e.progress_percent,
              e.paid_amount, e.enrolled_at,
              c.id, c.title, c.subject, c.level, c.thumbnail_url, c.price,
              c.total_lessons, c.duration_hours, c.avg_rating, c.review_count,
              u.full_name AS tutor_name
       FROM enrollments e
       JOIN courses c ON c.id = e.course_id
       JOIN tutor_profiles tp ON tp.id = c.tutor_id
       JOIN users u ON u.id = tp.user_id
       WHERE e.user_id = $1
       ORDER BY e.enrolled_at DESC`,
      [req.user.userId]
    );
    return res.json(r.rows);
  } catch (e) {
    console.error("[my/enrollments] error:", e);
    return res.status(500).json({ message: "Server error." });
  }
});

// POST /api/courses/:id/enroll — đăng ký 1 khóa học (chỉ khóa đã published)
app.post("/api/courses/:id/enroll", verifyToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const c = await client.query(
      `SELECT id, price, status FROM courses WHERE id = $1 FOR UPDATE`,
      [req.params.id]
    );
    if (c.rows.length === 0 || c.rows[0].status !== "published") {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Khóa học không tồn tại hoặc chưa mở đăng ký." });
    }

    const e = await client.query(
      `INSERT INTO enrollments (user_id, course_id, paid_amount)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, course_id) DO NOTHING
       RETURNING id`,
      [req.user.userId, req.params.id, c.rows[0].price]
    );
    if (e.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ message: "Bạn đã đăng ký khóa học này rồi." });
    }

    await client.query(
      `UPDATE courses SET enrollment_count = enrollment_count + 1 WHERE id = $1`,
      [req.params.id]
    );

    await client.query("COMMIT");
    return res.status(201).json({ message: "Đăng ký thành công.", enrollmentId: e.rows[0].id });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[enroll] error:", err.code, err.message);
    return res.status(500).json({ message: "Server error.", detail: err.message });
  } finally {
    client.release();
  }
});

// DELETE /api/courses/:id/enroll — hủy đăng ký
app.delete("/api/courses/:id/enroll", verifyToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const d = await client.query(
      `DELETE FROM enrollments WHERE user_id = $1 AND course_id = $2 RETURNING id`,
      [req.user.userId, req.params.id]
    );
    if (d.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Bạn chưa đăng ký khóa học này." });
    }
    await client.query(
      `UPDATE courses SET enrollment_count = GREATEST(enrollment_count - 1, 0) WHERE id = $1`,
      [req.params.id]
    );
    await client.query("COMMIT");
    return res.json({ message: "Đã hủy đăng ký." });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[unenroll] error:", err);
    return res.status(500).json({ message: "Server error." });
  } finally {
    client.release();
  }
});

// PATCH /api/my/enrollments/:courseId/progress — cập nhật tiến độ học
app.patch("/api/my/enrollments/:courseId/progress", verifyToken, async (req, res) => {
  try {
    let { progress_percent } = req.body || {};
    progress_percent = Math.trunc(Number(progress_percent));
    if (!Number.isFinite(progress_percent) || progress_percent < 0 || progress_percent > 100) {
      return res.status(400).json({ message: "progress_percent phải từ 0 đến 100." });
    }
    const completed = progress_percent >= 100;
    const r = await pool.query(
      `UPDATE enrollments SET
         progress_percent = $1,
         status = CASE WHEN $1 >= 100 THEN 'completed' ELSE 'active' END,
         completed_at = CASE WHEN $1 >= 100 THEN NOW() ELSE NULL END
       WHERE user_id = $2 AND course_id = $3
       RETURNING id, progress_percent, status, completed_at`,
      [progress_percent, req.user.userId, req.params.courseId]
    );
    if (r.rowCount === 0) {
      return res.status(404).json({ message: "Bạn chưa đăng ký khóa học này." });
    }
    return res.json(r.rows[0]);
  } catch (e) {
    console.error("[progress PATCH] error:", e);
    return res.status(500).json({ message: "Server error." });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// ─── PHASE 3 APIs: Reviews ──────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════

// GET /api/reviews?tutor_id=...  hoặc  ?course_id=...
app.get("/api/reviews", async (req, res) => {
  try {
    const { tutor_id, course_id } = req.query;
    if (!tutor_id && !course_id) {
      return res.status(400).json({ message: "Cần tham số tutor_id hoặc course_id." });
    }
    const col = tutor_id ? "tutor_id" : "course_id";
    const val = tutor_id || course_id;
    const r = await pool.query(`
      SELECT r.id, r.user_id, r.rating, r.comment, r.created_at,
             u.full_name AS reviewer_name, u.picture AS reviewer_picture
      FROM reviews r
      JOIN users u ON u.id = r.user_id
      WHERE r.${col} = $1 AND r.is_visible = TRUE
      ORDER BY r.created_at DESC
    `, [val]);
    return res.json(r.rows);
  } catch (e) {
    console.error("[reviews GET] error:", e);
    return res.status(500).json({ message: "Server error." });
  }
});

// POST /api/reviews — tạo review (cần đăng nhập)
app.post("/api/reviews", verifyToken, async (req, res) => {
  try {
    const { tutor_id, course_id, rating, comment, review_type } = req.body || {};
    if (!review_type || !["tutor","course"].includes(review_type)) {
      return res.status(400).json({ message: "review_type phải là 'tutor' hoặc 'course'." });
    }
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "rating phải từ 1 đến 5." });
    }
    if (review_type === "tutor" && !tutor_id) return res.status(400).json({ message: "Thiếu tutor_id." });
    if (review_type === "course" && !course_id) return res.status(400).json({ message: "Thiếu course_id." });

    // ── Gating: chỉ cho đánh giá khi đã thực sự dùng dịch vụ ──
    if (review_type === "course") {
      const enr = await pool.query(
        `SELECT 1 FROM enrollments WHERE user_id = $1 AND course_id = $2`,
        [req.user.userId, course_id]
      );
      if (enr.rowCount === 0) {
        return res.status(403).json({ message: "Bạn cần đăng ký khóa học này trước khi đánh giá." });
      }
    } else {
      // tutor review: phải từng đặt lịch với gia sư (tutor_id ở đây là tutor_profiles.id)
      const bk = await pool.query(
        `SELECT 1 FROM bookings b
         JOIN tutor_profiles tp ON tp.user_id = b.tutor_id
         WHERE b.student_id = $1 AND tp.id = $2`,
        [req.user.userId, tutor_id]
      );
      if (bk.rowCount === 0) {
        return res.status(403).json({ message: "Bạn cần đặt lịch với gia sư này trước khi đánh giá." });
      }
    }

    const r = await pool.query(`
      INSERT INTO reviews (user_id, tutor_id, course_id, rating, comment, review_type)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, rating, comment, created_at
    `, [
      req.user.userId,
      review_type === "tutor" ? tutor_id : null,
      review_type === "course" ? course_id : null,
      rating, comment || null, review_type
    ]);
    return res.status(201).json(r.rows[0]);
  } catch (e) {
    console.error("[reviews POST] error:", e.code, e.message);
    if (e.code === "23505") {
      return res.status(409).json({ message: "Bạn đã đánh giá rồi." });
    }
    return res.status(500).json({ message: "Server error.", detail: e.message });
  }
});

// PUT /api/reviews/:id — sửa review (chỉ trong 7 ngày, chỉ chủ sở hữu)
app.put("/api/reviews/:id", verifyToken, async (req, res) => {
  try {
    const { rating, comment } = req.body || {};
    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return res.status(400).json({ message: "rating phải từ 1 đến 5." });
    }
    const r = await pool.query(`
      UPDATE reviews
         SET rating = COALESCE($1, rating),
             comment = COALESCE($2, comment)
       WHERE id = $3 AND user_id = $4
         AND created_at > NOW() - INTERVAL '7 days'
      RETURNING id, rating, comment
    `, [rating || null, comment || null, req.params.id, req.user.userId]);
    if (r.rows.length === 0) {
      return res.status(404).json({ message: "Không thể sửa (quá 7 ngày hoặc không phải chủ)." });
    }
    return res.json(r.rows[0]);
  } catch (e) {
    console.error("[reviews PUT] error:", e);
    return res.status(500).json({ message: "Server error." });
  }
});

// DELETE /api/reviews/:id — xóa review (chỉ chủ sở hữu)
app.delete("/api/reviews/:id", verifyToken, async (req, res) => {
  try {
    const r = await pool.query(`
      DELETE FROM reviews WHERE id = $1 AND user_id = $2 RETURNING id
    `, [req.params.id, req.user.userId]);
    if (r.rowCount === 0) {
      return res.status(404).json({ message: "Không tìm thấy review." });
    }
    return res.json({ message: "Đã xóa review." });
  } catch (e) {
    console.error("[reviews DELETE] error:", e);
    return res.status(500).json({ message: "Server error." });
  }
});

// ─── Bookings: Đặt lịch học ───────────────────────────────────────────────────
// Tất cả route yêu cầu đăng nhập (verifyToken). student_id lấy từ JWT.

// GET /api/bookings — danh sách lịch học của user hiện tại
app.get("/api/bookings", verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.id, b.tutor_id, b.tutor_name, b.subject, b.lesson_date,
              b.time_slot, b.note, b.status, b.created_at,
              u.picture AS tutor_picture
       FROM bookings b
       LEFT JOIN users u ON u.id = b.tutor_id
       WHERE b.student_id = $1 AND b.status IN ('pending', 'confirmed', 'declined')
       ORDER BY b.lesson_date ASC, b.time_slot ASC`,
      [req.user.userId]
    );
    return res.json(result.rows);
  } catch (error) {
    console.error("[bookings] GET error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

// POST /api/bookings — tạo lịch học mới
// Ưu tiên dùng tutorId (gia sư thật trong DB); tutorName là snapshot tại thời điểm đặt.
app.post("/api/bookings", verifyToken, async (req, res) => {
  try {
    const { tutorId, tutorName, subject, lessonDate, timeSlot, note } = req.body || {};

    if (!tutorName || !lessonDate || !timeSlot) {
      return res.status(400).json({ message: "Thiếu thông tin: cần tutorName, lessonDate, timeSlot." });
    }

    // Nếu có tutorId, kiểm tra gia sư đó đã được duyệt
    if (tutorId) {
      const check = await pool.query(
        `SELECT 1 FROM tutor_profiles WHERE user_id = $1 AND status = 'approved'`,
        [tutorId]
      );
      if (check.rowCount === 0) {
        return res.status(400).json({ message: "Gia sư không tồn tại hoặc chưa được duyệt." });
      }
    }

    // Có gia sư thật → chờ gia sư duyệt (pending). Không có (mock) → confirmed luôn.
    const initialStatus = tutorId ? "pending" : "confirmed";

    const result = await pool.query(
      `INSERT INTO bookings (student_id, tutor_id, tutor_name, subject, lesson_date, time_slot, note, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, tutor_id, tutor_name, subject, lesson_date, time_slot, note, status, created_at`,
      [req.user.userId, tutorId || null, tutorName, subject || null, lessonDate, timeSlot, note || null, initialStatus]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("[bookings] POST error:", error.code, error.message, error.detail || "");
    // Trả lỗi cụ thể cho client để dev dễ debug
    if (error.code === "42P01") {
      return res.status(500).json({ message: "Bảng 'bookings' chưa tồn tại trong database. Hãy chạy SQL migration trong Supabase." });
    }
    if (error.code === "42703") {
      return res.status(500).json({ message: `Cột bị thiếu trong bảng bookings: ${error.message}. Hãy chạy ALTER TABLE migration.` });
    }
    if (error.code === "23503") {
      return res.status(400).json({ message: "Foreign key không hợp lệ (gia sư hoặc học sinh không tồn tại)." });
    }
    return res.status(500).json({ message: `DB error [${error.code || "?"}]: ${error.message}` });
  }
});

// GET /api/tutor/bookings — lịch học sinh đặt với gia sư đang đăng nhập.
// Khớp CHÍNH XÁC theo tutor_id (= user.id của gia sư trong JWT).
app.get("/api/tutor/bookings", verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.id, b.subject, b.lesson_date, b.time_slot, b.note, b.status, b.created_at,
              u.full_name AS student_name, u.email AS student_email, u.picture AS student_picture
       FROM bookings b
       JOIN users u ON u.id = b.student_id
       WHERE b.tutor_id = $1 AND b.status IN ('pending', 'confirmed')
       ORDER BY (b.status = 'pending') DESC, b.lesson_date ASC, b.time_slot ASC`,
      [req.user.userId]
    );
    return res.json(result.rows);
  } catch (error) {
    console.error("[tutor/bookings] GET error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

// PATCH /api/tutor/bookings/:id/status — gia sư duyệt / từ chối lịch (chỉ lịch của mình)
app.patch("/api/tutor/bookings/:id/status", verifyToken, async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!["confirmed", "declined"].includes(status)) {
      return res.status(400).json({ message: "status phải là 'confirmed' hoặc 'declined'." });
    }
    const r = await pool.query(
      `UPDATE bookings SET status = $1
       WHERE id = $2 AND tutor_id = $3 AND status = 'pending'
       RETURNING id, status`,
      [status, req.params.id, req.user.userId]
    );
    if (r.rowCount === 0) {
      return res.status(404).json({ message: "Không tìm thấy lịch chờ duyệt của bạn." });
    }
    return res.json(r.rows[0]);
  } catch (e) {
    console.error("[tutor/bookings PATCH] error:", e);
    return res.status(500).json({ message: "Server error." });
  }
});

// DELETE /api/bookings/:id — hủy lịch (chỉ chủ sở hữu mới hủy được)
app.delete("/api/bookings/:id", verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM bookings WHERE id = $1 AND student_id = $2 RETURNING id`,
      [req.params.id, req.user.userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Không tìm thấy lịch học hoặc bạn không có quyền hủy." });
    }

    return res.json({ message: "Đã hủy lịch học.", id: result.rows[0].id });
  } catch (error) {
    console.error("[bookings] DELETE error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

// ─── Google Gemini AI: gợi ý gia sư ──────────────────────────────────────────
// Frontend POST { userMessage } → backend TỰ query DB (chỉ gia sư status='approved')
// → gọi Gemini → trả { reply, tutorIds }. API key giữ kín ở backend.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

// Danh sách model thử lần lượt: nếu model đầu hết quota (429) hoặc quá tải (503),
// tự động fallback sang model tiếp theo. Mỗi model free tier có quota riêng,
// nên thử nhiều model giúp tăng tổng số request dùng được mỗi ngày.
const GEMINI_MODELS = [
  process.env.GEMINI_MODEL || "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash",
  "gemini-flash-latest",
].filter((m, i, arr) => arr.indexOf(m) === i); // loại trùng

// Gọi 1 model Gemini. Trả { ok, data?, status?, errText? }
async function callGeminiModel(model, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          topP: 0.9,
          // Để budget rộng: model 2.5 có "thinking" ngốn token, cần dư chỗ cho JSON output
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
        },
      }),
    });
    if (!res.ok) {
      return { ok: false, status: res.status, errText: await res.text() };
    }
    return { ok: true, data: await res.json() };
  } catch (err) {
    return { ok: false, status: 0, errText: err.message };
  }
}

const askAiHandler = async (req, res) => {
  try {
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY chưa được cấu hình trong .env" });
    }

    const { userMessage } = req.body || {};
    if (!userMessage || typeof userMessage !== "string") {
      return res.status(400).json({ error: "Thiếu trường userMessage" });
    }

    // ⚠️ QUAN TRỌNG (theo spec TV3): chỉ lấy gia sư status='approved' từ DB
    const tutorsFromDB = await pool.query(`
      SELECT tp.id, u.full_name AS name,
             tp.bio, tp.experience_years AS experience,
             tp.hourly_rate AS price_per_hour,
             tp.location, tp.teaching_methods AS methods,
             tp.avg_rating AS rating, tp.review_count AS reviews,
             ARRAY_AGG(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL) AS subjects,
             ARRAY_AGG(DISTINCT ts.level) FILTER (WHERE ts.level IS NOT NULL) AS levels
      FROM tutor_profiles tp
      JOIN users u ON u.id = tp.user_id
      LEFT JOIN tutor_subjects ts ON ts.tutor_id = tp.id
      LEFT JOIN subjects s ON s.id = ts.subject_id
      WHERE tp.status = 'approved'
      GROUP BY tp.id, u.full_name, tp.bio, tp.experience_years, tp.hourly_rate,
               tp.location, tp.teaching_methods, tp.avg_rating, tp.review_count
      ORDER BY tp.avg_rating DESC NULLS LAST, tp.review_count DESC
    `);

    // Rút gọn tutors để tiết kiệm token gửi Gemini
    const tutorSummary = tutorsFromDB.rows.map((t) => ({
      id: t.id,
      name: t.name,
      subjects: t.subjects || [],
      levels: t.levels || [],
      rating: t.rating,
      pricePerHour: t.price_per_hour,
      methods: t.methods || [],
      location: t.location,
      experience: t.experience,
      bio: t.bio,
    }));

    if (tutorSummary.length === 0) {
      return res.json({
        reply: "Hiện tại chưa có gia sư nào được duyệt trong hệ thống. Vui lòng quay lại sau.",
        tutorIds: [],
      });
    }

    const systemPrompt = `Bạn là trợ lý AI thân thiện của EduX — nền tảng kết nối gia sư tại Việt Nam.

Cách phản hồi tuỳ theo loại tin nhắn:

A) NẾU người dùng CHÀO HỎI hoặc TRÒ CHUYỆN PHIẾM (vd: "hello", "xin chào", "hi", "chào bạn", "bạn khoẻ không", "bạn là ai", "cảm ơn", "EduX là gì"):
   → Trả lời tự nhiên, ấm áp như một người bạn (2-3 câu).
   → Tự giới thiệu nếu user chào lần đầu, gợi ý họ mô tả nhu cầu học.
   → tutorIds = [] (mảng rỗng, KHÔNG đề xuất gia sư).

B) NẾU người dùng MÔ TẢ NHU CẦU TÌM GIA SƯ (vd: "Tìm gia sư Toán lớp 10", "Em cần học Tiếng Anh IELTS"):
   → Trả lời ngắn gọn xác nhận đã hiểu (1-2 câu).
   → Chọn TỐI ĐA 3 gia sư phù hợp nhất từ danh sách (dựa môn học, cấp lớp, giá, hình thức, địa điểm).
   → tutorIds là mảng id các gia sư đã chọn.

C) NẾU không có gia sư phù hợp với yêu cầu cụ thể:
   → tutorIds = [], giải thích nhẹ nhàng và gợi ý nới rộng tiêu chí.

D) NẾU câu hỏi KHÔNG liên quan đến học tập / gia sư (vd: "thời tiết hôm nay", "kể chuyện cười"):
   → Lịch sự từ chối, hướng người dùng quay về chủ đề tìm gia sư.
   → tutorIds = [].

LUÔN trả lời bằng tiếng Việt, ấm áp, ngắn gọn, KHÔNG dùng markdown.

QUAN TRỌNG: Chỉ trả về JSON thuần tuý theo format:
{"reply": "câu trả lời tự nhiên", "tutorIds": [1, 2, 3]}

DANH SÁCH GIA SƯ HIỆN CÓ:
${JSON.stringify(tutorSummary, null, 2)}

TIN NHẮN CỦA NGƯỜI DÙNG: "${userMessage}"`;

    // Thử lần lượt các model — fallback khi gặp 429 (hết quota) hoặc 503 (quá tải)
    let data = null;
    let lastErr = { status: 0, errText: "Không có model khả dụng" };
    let usedModel = null;

    for (const model of GEMINI_MODELS) {
      const result = await callGeminiModel(model, systemPrompt);
      if (result.ok) {
        data = result.data;
        usedModel = model;
        break;
      }
      lastErr = result;
      console.warn(`[Gemini] Model ${model} lỗi ${result.status} — thử model tiếp theo`);
      // Chỉ fallback khi lỗi tạm thời (quota/quá tải). Lỗi khác (400, 401) thì dừng luôn.
      if (result.status !== 429 && result.status !== 503 && result.status !== 0) break;
    }

    if (!data) {
      console.error("[Gemini] Tất cả model đều lỗi:", lastErr.status, lastErr.errText);
      return res.status(502).json({ error: "Lỗi từ Gemini API", detail: lastErr.errText });
    }

    console.log(`[Gemini] ✓ Trả lời bằng model: ${usedModel}`);

    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      console.error("[Gemini] Empty response", data);
      return res.status(502).json({ error: "Gemini trả phản hồi rỗng" });
    }

    // Bóc markdown nếu Gemini lỡ trả ```json ... ```
    let cleaned = rawText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      // Thử trích xuất object JSON đầu tiên { ... } trong chuỗi (phòng khi có text thừa)
      const firstBrace = cleaned.indexOf("{");
      const lastBrace = cleaned.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        try {
          parsed = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
        } catch (e2) {
          console.error("[Gemini] JSON parse error:", e2.message, "raw:", rawText);
          return res.status(502).json({ error: "Gemini trả JSON không hợp lệ" });
        }
      } else {
        console.error("[Gemini] JSON parse error:", e.message, "raw:", rawText);
        return res.status(502).json({ error: "Gemini trả JSON không hợp lệ" });
      }
    }

    if (typeof parsed.reply !== "string" || !Array.isArray(parsed.tutorIds)) {
      console.error("[Gemini] Invalid schema", parsed);
      return res.status(502).json({ error: "Gemini trả format không hợp lệ" });
    }

    return res.json(parsed);
  } catch (error) {
    console.error("[ask-ai] Server error:", error);
    return res.status(500).json({ error: "Server error", detail: error.message });
  }
};

// Đăng ký cả 2 đường dẫn cho cùng 1 handler:
//   /api/ai-suggest — tên theo spec Thành viên 3
//   /api/ask-ai     — tên cũ, giữ để không vỡ frontend hiện tại
app.post("/api/ai-suggest", askAiHandler);
app.post("/api/ask-ai", askAiHandler);

// ─── Start server ─────────────────────────────────────────────────────────────
app.listen(port, () => {
  console.log(`🚀 Server is running on http://localhost:${port}`);
});
