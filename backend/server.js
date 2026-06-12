const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");          // email notifications
const multer = require("multer");                  // NEW: file uploads
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
// Gửi email thông báo kết quả kiểm duyệt hồ sơ gia sư.
// Nếu SMTP chưa cấu hình → log warning và bỏ qua (không crash server).

// Create transporter once (singleton)
const emailTransporter = (() => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
})();

async function sendTutorReviewEmail(to, status, reason, notes) {
  if (!emailTransporter) {
    console.log(`[Email] SMTP chưa cấu hình — bỏ qua email tới ${to}`);
    return;
  }

  const isApproved = status === "approved";

  // NO emoji in subject — major spam trigger when sending Gmail→Gmail via SMTP
  const subject = isApproved
    ? "[EduX] Ho so gia su cua ban da duoc chap thuan"
    : "[EduX] Thong bao ket qua xet duyet ho so gia su";

  const frontendUrl = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

  const html = isApproved
    ? `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f8f9fb;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fb;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#00288e 0%,#1e40af 100%);padding:40px 40px 32px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">EduX</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">Nen tang ket noi gia su chuyen nghiep</p>
          </td>
        </tr>
        <!-- Spam notice -->
        <tr>
          <td style="padding:12px 40px;background:#fffbeb;border-bottom:1px solid #fde68a;text-align:center;">
            <p style="margin:0;color:#92400e;font-size:12px;line-height:1.5;">
              <strong>Neu email nay nam trong thu rac (Spam),</strong> vui long nhan <strong>"Khong phai thu rac"</strong> de nhan duoc thong bao tiep theo.<br/>
              If this email is in your Spam folder, please click <strong>"Not spam"</strong> to receive future notifications.
            </p>
          </td>
        </tr>
        <!-- Success icon -->
        <tr>
          <td style="padding:40px 40px 0;text-align:center;">
            <div style="width:80px;height:80px;background:#dcfce7;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:24px;">
              <span style="font-size:40px;">✅</span>
            </div>
            <h2 style="margin:0 0 12px;color:#191c1e;font-size:24px;font-weight:700;">Chúc mừng! Hồ sơ đã được duyệt</h2>
            <p style="margin:0;color:#444653;font-size:16px;line-height:1.6;">
              Hồ sơ đăng ký gia sư của bạn trên <strong>EduX</strong> đã được <strong style="color:#16a34a;">chấp thuận</strong>.
              Tài khoản gia sư của bạn hiện đã <strong>hoạt động đầy đủ</strong>.
            </p>
          </td>
        </tr>
        <!-- What's next -->
        <tr>
          <td style="padding:32px 40px;">
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:24px;">
              <h3 style="margin:0 0 16px;color:#15803d;font-size:16px;font-weight:700;">Bạn có thể làm gì tiếp theo?</h3>
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding:8px 0;color:#444653;font-size:15px;">
                    <span style="color:#16a34a;font-weight:bold;margin-right:8px;">→</span>Đăng nhập và hoàn thiện hồ sơ gia sư
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#444653;font-size:15px;">
                    <span style="color:#16a34a;font-weight:bold;margin-right:8px;">→</span>Bắt đầu nhận yêu cầu từ học sinh
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#444653;font-size:15px;">
                    <span style="color:#16a34a;font-weight:bold;margin-right:8px;">→</span>Thiết lập lịch dạy và mức học phí
                  </td>
                </tr>
              </table>
            </div>
          </td>
        </tr>
        <!-- Notes from admin (optional) -->
        ${notes ? `
        <tr>
          <td style="padding:0 40px 24px;">
            <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:20px 24px;">
              <p style="margin:0 0 8px;color:#1d4ed8;font-size:14px;font-weight:700;">📝 Ghi chú từ Ban Quản Trị:</p>
              <p style="margin:0;color:#1e3a5f;font-size:15px;line-height:1.6;white-space:pre-line;">${notes}</p>
            </div>
          </td>
        </tr>` : ''}
        <!-- CTA Button -->
        <tr>
          <td style="padding:0 40px 40px;text-align:center;">
            <a href="${frontendUrl}#/tutor"
               style="display:inline-block;background:linear-gradient(135deg,#00288e,#1e40af);color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:16px 40px;border-radius:12px;box-shadow:0 4px 12px rgba(0,40,142,0.3);">
              Vào Dashboard Gia Sư →
            </a>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8f9fb;padding:24px 40px;text-align:center;border-top:1px solid #e1e2e4;">
            <p style="margin:0;color:#757684;font-size:13px;">© 2024 EduX. Mọi thắc mắc xin liên hệ <a href="mailto:support@edux.com" style="color:#00288e;">support@edux.com</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
    : `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f8f9fb;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fb;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#00288e 0%,#1e40af 100%);padding:40px 40px 32px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">EduX</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">Nen tang ket noi gia su chuyen nghiep</p>
          </td>
        </tr>
        <!-- Spam notice -->
        <tr>
          <td style="padding:12px 40px;background:#fffbeb;border-bottom:1px solid #fde68a;text-align:center;">
            <p style="margin:0;color:#92400e;font-size:12px;line-height:1.5;">
              <strong>Neu email nay nam trong thu rac (Spam),</strong> vui long nhan <strong>"Khong phai thu rac"</strong> de nhan duoc thong bao tiep theo.<br/>
              If this email is in your Spam folder, please click <strong>"Not spam"</strong> to receive future notifications.
            </p>
          </td>
        </tr>
        <!-- Icon -->

        <tr>
          <td style="padding:40px 40px 0;text-align:center;">
            <div style="width:80px;height:80px;background:#fef2f2;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:24px;">
              <span style="font-size:40px;">❌</span>
            </div>
            <h2 style="margin:0 0 12px;color:#191c1e;font-size:24px;font-weight:700;">Hồ sơ chưa được chấp thuận</h2>
            <p style="margin:0;color:#444653;font-size:16px;line-height:1.6;">
              Cảm ơn bạn đã đăng ký làm gia sư trên <strong>EduX</strong>.
              Sau khi xem xét, hồ sơ của bạn hiện chưa đáp ứng đủ điều kiện.
            </p>
          </td>
        </tr>
        <!-- Reject reason -->
        ${reason ? `
        <tr>
          <td style="padding:24px 40px 0;">
            <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:20px 24px;">
              <p style="margin:0 0 8px;color:#991b1b;font-size:14px;font-weight:700;">📋 Lý do từ chối:</p>
              <p style="margin:0;color:#b91c1c;font-size:15px;line-height:1.6;">${reason}</p>
            </div>
          </td>
        </tr>` : ''}
        <!-- Re-apply info -->
        <tr>
          <td style="padding:24px 40px;">
            <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:20px 24px;">
              <h3 style="margin:0 0 12px;color:#1d4ed8;font-size:15px;font-weight:700;">💡 Bạn có thể làm gì?</h3>
              <p style="margin:0;color:#444653;font-size:15px;line-height:1.6;">
                Hãy xem xét lại các thông tin và tài liệu trong hồ sơ, sau đó chỉnh sửa và nộp lại để được xem xét lần tiếp theo.
              </p>
            </div>
          </td>
        </tr>
        <!-- Notes from admin (optional) -->
        ${notes ? `
        <tr>
          <td style="padding:0 40px 24px;">
            <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:20px 24px;">
              <p style="margin:0 0 8px;color:#9a3412;font-size:14px;font-weight:700;">📝 Ghi chú từ Ban Quản Trị:</p>
              <p style="margin:0;color:#7c2d12;font-size:15px;line-height:1.6;white-space:pre-line;">${notes}</p>
            </div>
          </td>
        </tr>` : ''}
        <!-- CTA -->
        <tr>
          <td style="padding:0 40px 40px;text-align:center;">
            <a href="${frontendUrl}#/tutor-profile"
               style="display:inline-block;background:linear-gradient(135deg,#00288e,#1e40af);color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:16px 40px;border-radius:12px;box-shadow:0 4px 12px rgba(0,40,142,0.3);">
              Chỉnh sửa &amp; Nộp lại hồ sơ →
            </a>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8f9fb;padding:24px 40px;text-align:center;border-top:1px solid #e1e2e4;">
            <p style="margin:0;color:#757684;font-size:13px;">© 2024 EduX. Mọi thắc mắc xin liên hệ <a href="mailto:support@edux.com" style="color:#00288e;">support@edux.com</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const isApprovedStatus = status === "approved";
  const plainText = isApprovedStatus
    ? `Chúc mừng! Hồ sơ gia sư của bạn trên EduX đã được CHẤP THUẬN.\n\nTài khoản gia sư của bạn hiện đã hoạt động đầy đủ.\n${notes ? `\nGhi chú từ Ban Quản Trị:\n${notes}\n` : ''}\nTruy cập: ${process.env.FRONTEND_ORIGIN || 'http://localhost:5173'}#/tutor\n\nEduX — support@edux.com`
    : `Hồ sơ gia sư của bạn trên EduX CHƯA được chấp thuận.\n\nLý do: ${reason || 'Không đáp ứng đủ điều kiện'}\n${notes ? `\nGhi chú từ Ban Quản Trị:\n${notes}\n` : ''}\nBạn có thể chỉnh sửa và nộp lại: ${process.env.FRONTEND_ORIGIN || 'http://localhost:5173'}#/tutor-profile\n\nEduX — support@edux.com`;

  try {
    await emailTransporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      replyTo: process.env.SMTP_FROM || process.env.SMTP_USER,
      subject,
      text: plainText,   // plain-text fallback helps avoid spam filters
      html,
      headers: {
        'X-Mailer': 'EduX Notification System',
        'X-Priority': '1',
        'Importance': 'high',
      },
    });
    console.log(`[Email] ✅ Đã gửi email ${status} tới ${to}`);
  } catch (err) {
    console.error(`[Email] ❌ Gửi email thất bại tới ${to}:`, err.message);
  }
}

async function sendPasswordResetEmail(to, otp) {
  if (!emailTransporter) {
    console.log(`[Email] SMTP chưa cấu hình — bỏ qua email tới ${to}`);
    return;
  }

  const subject = "[EduX] Ma OTP khoi phuc mat khau";
  const html = `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f8f9fb;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fb;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#00288e 0%,#1e40af 100%);padding:40px 40px 32px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">EduX</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">Nền tảng kết nối gia sư chuyên nghiệp</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;text-align:center;">
            <h2 style="margin:0 0 12px;color:#191c1e;font-size:24px;font-weight:700;">Khôi phục mật khẩu</h2>
            <p style="margin:0;color:#444653;font-size:16px;line-height:1.6;">
              Mã xác thực OTP (dùng một lần) của bạn là:
            </p>
            <div style="margin:32px 0;background:#f0fdf4;border:2px dashed #bbf7d0;border-radius:12px;padding:24px;display:inline-block;">
              <span style="font-size:36px;font-weight:800;color:#16a34a;letter-spacing:8px;">${otp}</span>
            </div>
            <p style="margin:0;color:#757684;font-size:14px;line-height:1.6;">
              Mã này sẽ hết hạn sau <strong>10 phút</strong>. Vui lòng không chia sẻ mã này cho bất kỳ ai.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8f9fb;padding:24px 40px;text-align:center;border-top:1px solid #e1e2e4;">
            <p style="margin:0;color:#757684;font-size:13px;">© 2024 EduX. Mọi thắc mắc xin liên hệ <a href="mailto:support@edux.com" style="color:#00288e;">support@edux.com</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const plainText = `Mã OTP khôi phục mật khẩu của bạn là: ${otp}\n\nMã này sẽ hết hạn sau 10 phút.`;

  try {
    await emailTransporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      replyTo: process.env.SMTP_FROM || process.env.SMTP_USER,
      subject,
      text: plainText,
      html,
      headers: {
        'X-Mailer': 'EduX Notification System',
        'X-Priority': '1',
        'Importance': 'high',
      },
    });
    console.log(`[Email] ✅ Đã gửi email OTP reset mật khẩu tới ${to}`);
  } catch (err) {
    console.error(`[Email] ❌ Gửi email OTP thất bại tới ${to}:`, err.message);
  }
}


// ─── Multer Configuration ─────────────────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"), false);
    }
  },
});

// ─── Supabase Storage Helpers ─────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "";

async function uploadFileToStorage(file, path) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error("Supabase Storage credentials missing in backend.");
  }
  const url = `${SUPABASE_URL}/storage/v1/object/tutor-documents/${path}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": file.mimetype,
    },
    body: file.buffer,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to upload file to Supabase.");
  return path; // Return the path within the bucket
}

async function createSignedUrl(path) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null;
  const url = `${SUPABASE_URL}/storage/v1/object/sign/tutor-documents/${path}`;
  console.log(`[Storage] Creating signed URL for path: ${path}`);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ expiresIn: 3600 }), // 1 hour
  });
  const data = await response.json();
  console.log(`[Storage] Supabase sign response:`, JSON.stringify(data));
  if (!response.ok) throw new Error(data.message || data.error || "Failed to create signed URL.");
  // Supabase returns signedURL as a relative path.
  // Two observed formats:
  //   1. "/object/sign/tutor-documents/..." (missing /storage/v1)
  //   2. "/storage/v1/object/sign/tutor-documents/..."
  // We need a full absolute URL for the frontend.
  const rawSigned = data.signedURL || data.signedUrl || (data.data && data.data.signedUrl) || null;
  if (!rawSigned) return null;
  // Already a full absolute URL — return as-is
  if (rawSigned.startsWith('http://') || rawSigned.startsWith('https://')) {
    return rawSigned;
  }
  // Supabase returned "/object/sign/..." — prepend base + /storage/v1
  if (rawSigned.startsWith('/object/')) {
    return `${SUPABASE_URL}/storage/v1${rawSigned}`;
  }
  // Already has /storage/v1 prefix or other format — just prepend base URL
  return `${SUPABASE_URL}${rawSigned}`;
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

// ─── POST /api/auth/forgot-password/request-otp ──────────────────────────────
app.post("/api/auth/forgot-password/request-otp", async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const result = await pool.query("SELECT id, email FROM users WHERE email = $1", [email.toLowerCase().trim()]);
    if (result.rows.length === 0) {
      // Don't reveal if email exists or not, just return success
      return res.json({ message: "Nếu email tồn tại, OTP đã được gửi." });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await pool.query(
      "UPDATE users SET reset_otp = $1, reset_otp_expiry = $2 WHERE email = $3",
      [otp, expiry, result.rows[0].email]
    );

    // Send email without blocking
    sendPasswordResetEmail(result.rows[0].email, otp).catch(console.error);

    return res.json({ message: "OTP đã được gửi đến email của bạn." });
  } catch (error) {
    console.error("Request OTP error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

// ─── POST /api/auth/forgot-password/reset ─────────────────────────────────────
app.post("/api/auth/forgot-password/reset", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body || {};
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "Thiếu thông tin yêu cầu." });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: "Mật khẩu phải dài ít nhất 8 ký tự." });
    }

    const result = await pool.query(
      "SELECT id, reset_otp, reset_otp_expiry FROM users WHERE email = $1",
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: "OTP không hợp lệ hoặc đã hết hạn." });
    }

    const user = result.rows[0];

    if (!user.reset_otp || user.reset_otp !== otp.trim()) {
      return res.status(400).json({ message: "Mã OTP không chính xác." });
    }

    if (new Date() > new Date(user.reset_otp_expiry)) {
      return res.status(400).json({ message: "Mã OTP đã hết hạn. Vui lòng yêu cầu lại." });
    }

    // OTP hợp lệ, tiến hành đổi mật khẩu
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    await pool.query(
      "UPDATE users SET password_hash = $1, reset_otp = NULL, reset_otp_expiry = NULL WHERE id = $2",
      [passwordHash, user.id]
    );

    return res.json({ message: "Đặt lại mật khẩu thành công!" });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({ message: "Server error." });
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
// ── TUTOR APIs ────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

app.get("/api/tutor/profile", verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM tutor_profiles WHERE user_id = $1",
      [req.user.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Profile not found." });
    return res.json(result.rows[0]);
  } catch (error) {
    console.error("Get tutor profile error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

// Upload profile data along with images
app.post(
  "/api/tutor/profile",
  verifyToken,
  // Khai báo đủ 3 file fields để multer không ném LIMIT_UNEXPECTED_FILE
  upload.fields([
    { name: "profile_photo", maxCount: 1 },
    { name: "certificate",   maxCount: 1 },
    { name: "cccd",          maxCount: 1 },
  ]),
  // ── Multer error handler: trả JSON thay vì HTML ──────────────────────────
  (err, req, res, next) => {
    if (err) {
      return res.status(400).json({ message: err.message || "File upload error." });
    }
    next();
  },
  async (req, res) => {
    try {
      const {
        bio, subjects, experience_years,
        first_name, last_name, display_name,
        birthday, gender, country, city, phone,
        education, language, hourly_rate,
        teaching_style, qualifications,
      } = req.body;
      const userId = req.user.userId;

      const files = req.files || {};
      const photoFile = files["profile_photo"] ? files["profile_photo"][0] : null;
      const certFile  = files["certificate"]   ? files["certificate"][0]   : null;
      const cccdFile  = files["cccd"]          ? files["cccd"][0]          : null;

      let photoPath = null;
      let certPath  = null;
      let cccdPath  = null;

      if (photoFile) {
        const ext = photoFile.originalname.split('.').pop();
        photoPath = await uploadFileToStorage(photoFile, `profile_photos/${userId}_${Date.now()}.${ext}`);
      }
      if (certFile) {
        const ext = certFile.originalname.split('.').pop();
        certPath = await uploadFileToStorage(certFile, `certificates/${userId}_${Date.now()}.${ext}`);
      }
      if (cccdFile) {
        const ext = cccdFile.originalname.split('.').pop();
        cccdPath = await uploadFileToStorage(cccdFile, `cccds/${userId}_${Date.now()}.${ext}`);
      }

      const existing = await pool.query(
        "SELECT id FROM tutor_profiles WHERE user_id = $1",
        [userId]
      );

      let result;
      if (existing.rows.length > 0) {
        // ── UPDATE ──────────────────────────────────────────────────────────
        let values = [
          bio, subjects, parseInt(experience_years) || 0,
          first_name, last_name, display_name,
          birthday || null, gender, country, city, phone,
          education, language, parseFloat(hourly_rate) || null,
          teaching_style, qualifications,
          "pending", userId,
        ];
        let query = `UPDATE tutor_profiles SET
          bio = $1, subjects = $2, experience_years = $3,
          first_name = $4, last_name = $5, display_name = $6,
          birthday = $7, gender = $8, country = $9, city = $10, phone = $11,
          education = $12, language = $13, hourly_rate = $14,
          teaching_style = $15, qualifications = $16,
          status = $17, reject_reason = NULL`;

        let idx = 19; // $18 = userId
        if (photoPath) { query += `, profile_photo_url = $${idx}`; values.push(photoPath); idx++; }
        if (certPath)  { query += `, certificate_url = $${idx}`;   values.push(certPath);  idx++; }
        if (cccdPath)  { query += `, cccd_url = $${idx}`;          values.push(cccdPath);  idx++; }

        query += ` WHERE user_id = $18 RETURNING *`;
        result = await pool.query(query, values);
      } else {
        // ── INSERT ──────────────────────────────────────────────────────────
        result = await pool.query(
          `INSERT INTO tutor_profiles (
            user_id, bio, subjects, experience_years,
            first_name, last_name, display_name,
            birthday, gender, country, city, phone,
            education, language, hourly_rate,
            teaching_style, qualifications,
            profile_photo_url, certificate_url, cccd_url,
            status
          ) VALUES (
            $1, $2, $3, $4,
            $5, $6, $7,
            $8, $9, $10, $11, $12,
            $13, $14, $15,
            $16, $17,
            $18, $19, $20,
            'pending'
          ) RETURNING *`,
          [
            userId, bio, subjects, parseInt(experience_years) || 0,
            first_name, last_name, display_name,
            birthday || null, gender, country, city, phone,
            education, language, parseFloat(hourly_rate) || null,
            teaching_style, qualifications,
            photoPath, certPath, cccdPath,
          ]
        );
      }

      return res.status(200).json(result.rows[0]);
    } catch (error) {
      console.error("Tutor profile upload error:", error);
      return res.status(500).json({ message: error.message || "Server error." });
    }
  }
);


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

// ─── GET /api/admin/document-url ──────────────────────────────────────────────
// Generates a signed URL for a given storage path so admins can view documents
app.get("/api/admin/document-url", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { path } = req.query;
    if (!path) return res.status(400).json({ message: "Path is required." });
    
    // Convert path to signed URL via Supabase Storage REST API
    const signedUrl = await createSignedUrl(path);
    if (!signedUrl) return res.status(500).json({ message: "Failed to generate URL. Check Supabase config." });
    
    return res.json({ signedUrl });
  } catch (error) {
    console.error("Document URL error:", error);
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
  const { notes } = req.body || {};   // optional admin notes included in email
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
      // await so errors are visible in server logs
      try {
        await sendTutorReviewEmail(userResult.rows[0].email, "approved", null, notes || '');
      } catch (emailErr) {
        console.error("[Approve] Email error (non-fatal):", emailErr.message);
      }
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
  const { reason, notes } = req.body || {};   // notes = optional context for email

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
      try {
        await sendTutorReviewEmail(userResult.rows[0].email, "rejected", reason, notes || '');
      } catch (emailErr) {
        console.error("[Reject] Email error (non-fatal):", emailErr.message);
      }
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
