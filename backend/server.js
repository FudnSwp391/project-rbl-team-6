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

// ─── Start server ─────────────────────────────────────────────────────────────
app.listen(port, () => {
  console.log(`🚀 Server is running on http://localhost:${port}`);
});
