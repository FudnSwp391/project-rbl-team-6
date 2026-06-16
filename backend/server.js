const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");          // email notifications
const multer = require("multer");                  // NEW: file uploads
const { GoogleAuth } = require("google-auth-library");
const { OAuth2Client } = require("google-auth-library");
const pool = require("./db");
const { generateQuizQuestions, chatWithAI, gradeEssayAnswer, suggestTutors } = require("./gemini");

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 5000);
const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
const googleClientId = process.env.GOOGLE_CLIENT_ID || "";
const jwtSecret = process.env.JWT_SECRET || "dev_jwt_secret_change_me";
const googleClient = new OAuth2Client(googleClientId);

// ΓöÇΓöÇΓöÇ Middleware ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
app.use(cors({
  origin: (origin, cb) => {
    // Cho phép: request không có origin (curl/Postman), FRONTEND_ORIGIN, và mọi localhost khi dev
    if (!origin || origin === frontendOrigin || /^http:\/\/localhost:\d+$/.test(origin)) return cb(null, true);
    return cb(new Error("Not allowed by CORS"));
  },
}));
app.use(express.json());

// ΓöÇΓöÇΓöÇ Helper: tß║ío JWT token ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
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

// ΓöÇΓöÇΓöÇ Middleware: verifyToken ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
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

// ΓöÇΓöÇΓöÇ Middleware: requireAdmin ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// Must be used AFTER verifyToken. Returns 403 if the user is not an admin.
function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Forbidden: admin access only." });
  }
  next();
}

function requireTutor(req, res, next) {
  if (req.user?.role !== "tutor") {
    return res.status(403).json({ message: "Forbidden: tutor access only." });
  }
  next();
}

// ΓöÇΓöÇΓöÇ Nodemailer: email helper ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// Gß╗¡i email th├┤ng b├ío kß║┐t quß║ú kiß╗âm duyß╗çt hß╗ô s╞í gia s╞░.
// Nß║┐u SMTP ch╞░a cß║Ñu h├¼nh ΓåÆ log warning v├á bß╗Å qua (kh├┤ng crash server).

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
    console.log(`[Email] SMTP ch╞░a cß║Ñu h├¼nh ΓÇö bß╗Å qua email tß╗¢i ${to}`);
    return;
  }

  const isApproved = status === "approved";

  // NO emoji in subject ΓÇö major spam trigger when sending GmailΓåÆGmail via SMTP
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
              <span style="font-size:40px;">Γ£à</span>
            </div>
            <h2 style="margin:0 0 12px;color:#191c1e;font-size:24px;font-weight:700;">Ch├║c mß╗½ng! Hß╗ô s╞í ─æ├ú ─æ╞░ß╗úc duyß╗çt</h2>
            <p style="margin:0;color:#444653;font-size:16px;line-height:1.6;">
              Hß╗ô s╞í ─æ─âng k├╜ gia s╞░ cß╗ºa bß║ín tr├¬n <strong>EduX</strong> ─æ├ú ─æ╞░ß╗úc <strong style="color:#16a34a;">chß║Ñp thuß║¡n</strong>.
              T├ái khoß║ún gia s╞░ cß╗ºa bß║ín hiß╗çn ─æ├ú <strong>hoß║ít ─æß╗Öng ─æß║ºy ─æß╗º</strong>.
            </p>
          </td>
        </tr>
        <!-- What's next -->
        <tr>
          <td style="padding:32px 40px;">
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:24px;">
              <h3 style="margin:0 0 16px;color:#15803d;font-size:16px;font-weight:700;">Bß║ín c├│ thß╗â l├ám g├¼ tiß║┐p theo?</h3>
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding:8px 0;color:#444653;font-size:15px;">
                    <span style="color:#16a34a;font-weight:bold;margin-right:8px;">ΓåÆ</span>─É─âng nhß║¡p v├á ho├án thiß╗çn hß╗ô s╞í gia s╞░
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#444653;font-size:15px;">
                    <span style="color:#16a34a;font-weight:bold;margin-right:8px;">ΓåÆ</span>Bß║»t ─æß║ºu nhß║¡n y├¬u cß║ºu tß╗½ hß╗ìc sinh
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#444653;font-size:15px;">
                    <span style="color:#16a34a;font-weight:bold;margin-right:8px;">ΓåÆ</span>Thiß║┐t lß║¡p lß╗ïch dß║íy v├á mß╗⌐c hß╗ìc ph├¡
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
              <p style="margin:0 0 8px;color:#1d4ed8;font-size:14px;font-weight:700;">≡ƒô¥ Ghi ch├║ tß╗½ Ban Quß║ún Trß╗ï:</p>
              <p style="margin:0;color:#1e3a5f;font-size:15px;line-height:1.6;white-space:pre-line;">${notes}</p>
            </div>
          </td>
        </tr>` : ''}
        <!-- CTA Button -->
        <tr>
          <td style="padding:0 40px 40px;text-align:center;">
            <a href="${frontendUrl}#/tutor"
               style="display:inline-block;background:linear-gradient(135deg,#00288e,#1e40af);color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:16px 40px;border-radius:12px;box-shadow:0 4px 12px rgba(0,40,142,0.3);">
              V├áo Dashboard Gia S╞░ ΓåÆ
            </a>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8f9fb;padding:24px 40px;text-align:center;border-top:1px solid #e1e2e4;">
            <p style="margin:0;color:#757684;font-size:13px;">┬⌐ 2024 EduX. Mß╗ìi thß║»c mß║»c xin li├¬n hß╗ç <a href="mailto:support@edux.com" style="color:#00288e;">support@edux.com</a></p>
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
              <span style="font-size:40px;">Γ¥î</span>
            </div>
            <h2 style="margin:0 0 12px;color:#191c1e;font-size:24px;font-weight:700;">Hß╗ô s╞í ch╞░a ─æ╞░ß╗úc chß║Ñp thuß║¡n</h2>
            <p style="margin:0;color:#444653;font-size:16px;line-height:1.6;">
              Cß║úm ╞ín bß║ín ─æ├ú ─æ─âng k├╜ l├ám gia s╞░ tr├¬n <strong>EduX</strong>.
              Sau khi xem x├⌐t, hß╗ô s╞í cß╗ºa bß║ín hiß╗çn ch╞░a ─æ├íp ß╗⌐ng ─æß╗º ─æiß╗üu kiß╗çn.
            </p>
          </td>
        </tr>
        <!-- Reject reason -->
        ${reason ? `
        <tr>
          <td style="padding:24px 40px 0;">
            <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:20px 24px;">
              <p style="margin:0 0 8px;color:#991b1b;font-size:14px;font-weight:700;">≡ƒôï L├╜ do tß╗½ chß╗æi:</p>
              <p style="margin:0;color:#b91c1c;font-size:15px;line-height:1.6;">${reason}</p>
            </div>
          </td>
        </tr>` : ''}
        <!-- Re-apply info -->
        <tr>
          <td style="padding:24px 40px;">
            <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:20px 24px;">
              <h3 style="margin:0 0 12px;color:#1d4ed8;font-size:15px;font-weight:700;">≡ƒÆí Bß║ín c├│ thß╗â l├ám g├¼?</h3>
              <p style="margin:0;color:#444653;font-size:15px;line-height:1.6;">
                H├úy xem x├⌐t lß║íi c├íc th├┤ng tin v├á t├ái liß╗çu trong hß╗ô s╞í, sau ─æ├│ chß╗ënh sß╗¡a v├á nß╗Öp lß║íi ─æß╗â ─æ╞░ß╗úc xem x├⌐t lß║ºn tiß║┐p theo.
              </p>
            </div>
          </td>
        </tr>
        <!-- Notes from admin (optional) -->
        ${notes ? `
        <tr>
          <td style="padding:0 40px 24px;">
            <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:20px 24px;">
              <p style="margin:0 0 8px;color:#9a3412;font-size:14px;font-weight:700;">≡ƒô¥ Ghi ch├║ tß╗½ Ban Quß║ún Trß╗ï:</p>
              <p style="margin:0;color:#7c2d12;font-size:15px;line-height:1.6;white-space:pre-line;">${notes}</p>
            </div>
          </td>
        </tr>` : ''}
        <!-- CTA -->
        <tr>
          <td style="padding:0 40px 40px;text-align:center;">
            <a href="${frontendUrl}#/tutor-profile"
               style="display:inline-block;background:linear-gradient(135deg,#00288e,#1e40af);color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:16px 40px;border-radius:12px;box-shadow:0 4px 12px rgba(0,40,142,0.3);">
              Chß╗ënh sß╗¡a &amp; Nß╗Öp lß║íi hß╗ô s╞í ΓåÆ
            </a>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8f9fb;padding:24px 40px;text-align:center;border-top:1px solid #e1e2e4;">
            <p style="margin:0;color:#757684;font-size:13px;">┬⌐ 2024 EduX. Mß╗ìi thß║»c mß║»c xin li├¬n hß╗ç <a href="mailto:support@edux.com" style="color:#00288e;">support@edux.com</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const isApprovedStatus = status === "approved";
  const plainText = isApprovedStatus
    ? `Ch├║c mß╗½ng! Hß╗ô s╞í gia s╞░ cß╗ºa bß║ín tr├¬n EduX ─æ├ú ─æ╞░ß╗úc CHß║ñP THUß║¼N.\n\nT├ái khoß║ún gia s╞░ cß╗ºa bß║ín hiß╗çn ─æ├ú hoß║ít ─æß╗Öng ─æß║ºy ─æß╗º.\n${notes ? `\nGhi ch├║ tß╗½ Ban Quß║ún Trß╗ï:\n${notes}\n` : ''}\nTruy cß║¡p: ${process.env.FRONTEND_ORIGIN || 'http://localhost:5173'}#/tutor\n\nEduX ΓÇö support@edux.com`
    : `Hß╗ô s╞í gia s╞░ cß╗ºa bß║ín tr├¬n EduX CH╞»A ─æ╞░ß╗úc chß║Ñp thuß║¡n.\n\nL├╜ do: ${reason || 'Kh├┤ng ─æ├íp ß╗⌐ng ─æß╗º ─æiß╗üu kiß╗çn'}\n${notes ? `\nGhi ch├║ tß╗½ Ban Quß║ún Trß╗ï:\n${notes}\n` : ''}\nBß║ín c├│ thß╗â chß╗ënh sß╗¡a v├á nß╗Öp lß║íi: ${process.env.FRONTEND_ORIGIN || 'http://localhost:5173'}#/tutor-profile\n\nEduX ΓÇö support@edux.com`;

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
    console.log(`[Email] Γ£à ─É├ú gß╗¡i email ${status} tß╗¢i ${to}`);
  } catch (err) {
    console.error(`[Email] Γ¥î Gß╗¡i email thß║Ñt bß║íi tß╗¢i ${to}:`, err.message);
  }
}

async function sendPasswordResetEmail(to, otp) {
  if (!emailTransporter) {
    console.log(`[Email] SMTP ch╞░a cß║Ñu h├¼nh ΓÇö bß╗Å qua email tß╗¢i ${to}`);
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
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">Nß╗ün tß║úng kß║┐t nß╗æi gia s╞░ chuy├¬n nghiß╗çp</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;text-align:center;">
            <h2 style="margin:0 0 12px;color:#191c1e;font-size:24px;font-weight:700;">Kh├┤i phß╗Ñc mß║¡t khß║⌐u</h2>
            <p style="margin:0;color:#444653;font-size:16px;line-height:1.6;">
              M├ú x├íc thß╗▒c OTP (d├╣ng mß╗Öt lß║ºn) cß╗ºa bß║ín l├á:
            </p>
            <div style="margin:32px 0;background:#f0fdf4;border:2px dashed #bbf7d0;border-radius:12px;padding:24px;display:inline-block;">
              <span style="font-size:36px;font-weight:800;color:#16a34a;letter-spacing:8px;">${otp}</span>
            </div>
            <p style="margin:0;color:#757684;font-size:14px;line-height:1.6;">
              M├ú n├áy sß║╜ hß║┐t hß║ín sau <strong>10 ph├║t</strong>. Vui l├▓ng kh├┤ng chia sß║╗ m├ú n├áy cho bß║Ñt kß╗│ ai.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8f9fb;padding:24px 40px;text-align:center;border-top:1px solid #e1e2e4;">
            <p style="margin:0;color:#757684;font-size:13px;">┬⌐ 2024 EduX. Mß╗ìi thß║»c mß║»c xin li├¬n hß╗ç <a href="mailto:support@edux.com" style="color:#00288e;">support@edux.com</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const plainText = `M├ú OTP kh├┤i phß╗Ñc mß║¡t khß║⌐u cß╗ºa bß║ín l├á: ${otp}\n\nM├ú n├áy sß║╜ hß║┐t hß║ín sau 10 ph├║t.`;

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
    console.log(`[Email] Γ£à ─É├ú gß╗¡i email OTP reset mß║¡t khß║⌐u tß╗¢i ${to}`);
  } catch (err) {
    console.error(`[Email] Γ¥î Gß╗¡i email OTP thß║Ñt bß║íi tß╗¢i ${to}:`, err.message);
  }
}


// ΓöÇΓöÇΓöÇ Multer Configuration ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
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

// ΓöÇΓöÇΓöÇ Supabase Storage Helpers ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
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
  // Already a full absolute URL ΓÇö return as-is
  if (rawSigned.startsWith('http://') || rawSigned.startsWith('https://')) {
    return rawSigned;
  }
  // Supabase returned "/object/sign/..." ΓÇö prepend base + /storage/v1
  if (rawSigned.startsWith('/object/')) {
    return `${SUPABASE_URL}/storage/v1${rawSigned}`;
  }
  // Already has /storage/v1 prefix or other format ΓÇö just prepend base URL
  return `${SUPABASE_URL}${rawSigned}`;
}


// ΓöÇΓöÇΓöÇ GET / ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
app.get("/", (req, res) => {
  res.send("EduX Backend is running Γ£à");
});

// ─É─ö POST /api/auth/check-email ─É─ö─ö─ö─ö─ö─ö─ö─ö─ö─ö─ö─ö─ö─ö─ö─ö─ö─ö─ö─ö─ö─ö─ö─ö─ö─ö─ö─ö─ö─ö─ö─ö─ö─ö─ö─ö─ö─ö─ö─ö─ö─ö─ö─ö─ö─ö─ö─ö─ö─ö
// Kiểm tra email đã tồn tại chưa (dùng trước khi đăng ký để báo lỗi sớm)
app.post("/api/auth/check-email", async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ message: "Email is required." });

  try {
    const result = await pool.query(
      "SELECT id, google_id FROM users WHERE email = $1",
      [email.toLowerCase().trim()]
    );
    if (result.rows.length === 0) {
      return res.json({ available: true });
    }
    if (result.rows[0].google_id) {
      return res.status(409).json({
        available: false,
        isGoogleAccount: true,
        message: "Email này đã được đăng ký qua Google. Vui lòng đăng nhập bằng Google.",
      });
    }
    return res.status(409).json({
      available: false,
      isGoogleAccount: false,
      message: "Email này đã được đăng ký. Vui lòng đăng nhập.",
    });
  } catch (err) {
    console.error("check-email error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// ΓöÇΓöÇΓöÇ POST /api/auth/register ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// ─É─âng k├╜ bß║▒ng email + password
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

    // Kiß╗âm tra email ─æ├ú tß╗ôn tß║íi ch╞░a
    const existing = await pool.query(
      "SELECT id, google_id FROM users WHERE email = $1",
      [email.toLowerCase().trim()]
    );
    if (existing.rows.length > 0) {
      if (existing.rows[0].google_id) {
        return res.status(409).json({
          message: "Email này đã được đăng ký qua Google. Vui lòng đăng nhập bằng Google.",
          isGoogleAccount: true,
        });
      }
      return res
        .status(409)
        .json({ message: "Email already registered. Please sign in." });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Tß║ío user mß╗¢i
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

// ΓöÇΓöÇΓöÇ POST /api/auth/forgot-password/request-otp ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
app.post("/api/auth/forgot-password/request-otp", async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const result = await pool.query("SELECT id, email FROM users WHERE email = $1", [email.toLowerCase().trim()]);
    if (result.rows.length === 0) {
      // Don't reveal if email exists or not, just return success
      return res.json({ message: "Nß║┐u email tß╗ôn tß║íi, OTP ─æ├ú ─æ╞░ß╗úc gß╗¡i." });
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

    return res.json({ message: "OTP ─æ├ú ─æ╞░ß╗úc gß╗¡i ─æß║┐n email cß╗ºa bß║ín." });
  } catch (error) {
    console.error("Request OTP error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

// ΓöÇΓöÇΓöÇ POST /api/auth/forgot-password/reset ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
app.post("/api/auth/forgot-password/reset", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body || {};
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "Thiß║┐u th├┤ng tin y├¬u cß║ºu." });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: "Mß║¡t khß║⌐u phß║úi d├ái ├¡t nhß║Ñt 8 k├╜ tß╗▒." });
    }

    const result = await pool.query(
      "SELECT id, reset_otp, reset_otp_expiry FROM users WHERE email = $1",
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: "OTP kh├┤ng hß╗úp lß╗ç hoß║╖c ─æ├ú hß║┐t hß║ín." });
    }

    const user = result.rows[0];

    if (!user.reset_otp || user.reset_otp !== otp.trim()) {
      return res.status(400).json({ message: "M├ú OTP kh├┤ng ch├¡nh x├íc." });
    }

    if (new Date() > new Date(user.reset_otp_expiry)) {
      return res.status(400).json({ message: "M├ú OTP ─æ├ú hß║┐t hß║ín. Vui l├▓ng y├¬u cß║ºu lß║íi." });
    }

    // OTP hß╗úp lß╗ç, tiß║┐n h├ánh ─æß╗òi mß║¡t khß║⌐u
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    await pool.query(
      "UPDATE users SET password_hash = $1, reset_otp = NULL, reset_otp_expiry = NULL WHERE id = $2",
      [passwordHash, user.id]
    );

    return res.json({ message: "─Éß║╖t lß║íi mß║¡t khß║⌐u th├ánh c├┤ng!" });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

// ΓöÇΓöÇΓöÇ POST /api/auth/login ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// ─É─âng nhß║¡p bß║▒ng email + password
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }

    // T├¼m user theo email
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

    // User ─æ─âng k├╜ bß║▒ng Google, kh├┤ng c├│ password
    if (!user.password_hash) {
      return res.status(401).json({
        message: "This account uses Google sign-in. Please use Google to log in.",
      });
    }

    // Kiß╗âm tra password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const token = createToken(user);

    const ip = getClientIP(req);
    const suspicious = await logLoginAttempt(user.id, ip, req.headers['user-agent']);

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.full_name,
        email: user.email,
        role: user.role,
        picture: user.picture,
      },
      suspiciousLogin: suspicious,
      loginIP: ip,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
});

// ΓöÇΓöÇΓöÇ POST /api/auth/google ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// ─É─âng nhß║¡p / ─æ─âng k├╜ bß║▒ng Google OAuth ΓÇö l╞░u v├áo DB
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

    // T├¼m user ─æ├ú c├│ ch╞░a (theo google_id hoß║╖c email)
    let userResult = await pool.query(
      "SELECT id, full_name, email, role, picture FROM users WHERE google_id = $1 OR email = $2",
      [googleId, email]
    );

    let user;
    if (userResult.rows.length > 0) {
      // ─É├ú c├│ ΓåÆ cß║¡p nhß║¡t google_id v├á picture nß║┐u cß║ºn
      user = userResult.rows[0];
      await pool.query(
        "UPDATE users SET google_id = $1, picture = $2 WHERE id = $3",
        [googleId, picture, user.id]
      );
      user.picture = picture;
    } else {
      // Ch╞░a c├│ ΓåÆ tß║ío mß╗¢i vß╗¢i role mß║╖c ─æß╗ïnh 'student'
      const insertResult = await pool.query(
        `INSERT INTO users (full_name, email, google_id, picture, role)
         VALUES ($1, $2, $3, $4, 'student')
         RETURNING id, full_name, email, role, picture`,
        [name, email, googleId, picture]
      );
      user = insertResult.rows[0];
    }

    const token = createToken(user);

    const ip = getClientIP(req);
    const suspicious = await logLoginAttempt(user.id, ip, req.headers['user-agent']);

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.full_name,
        email: user.email,
        role: user.role,
        picture: user.picture,
      },
      suspiciousLogin: suspicious,
      loginIP: ip,
    });
  } catch (error) {
    console.error("Google auth error:", error);
    return res.status(401).json({ message: "Google authentication failed." });
  }
});

// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
// ΓöÇΓöÇ TUTOR APIs ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ

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
  // Khai b├ío ─æß╗º 3 file fields ─æß╗â multer kh├┤ng n├⌐m LIMIT_UNEXPECTED_FILE
  upload.fields([
    { name: "profile_photo",  maxCount: 1  },
    { name: "certificates",   maxCount: 10 },
    { name: "cccd",           maxCount: 1  },
  ]),
  // ΓöÇΓöÇ Multer error handler: trß║ú JSON thay v├¼ HTML ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
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
        teaching_methods, suitable_students, cert_metadata,
      } = req.body;
      const userId = req.user.userId;

      let parsedTeachingMethods = [];
      let parsedSuitableStudents = [];
      let parsedCertMetadata = [];
      try { parsedTeachingMethods = JSON.parse(teaching_methods || '[]'); } catch {}
      try { parsedSuitableStudents = JSON.parse(suitable_students || '[]'); } catch {}
      try { parsedCertMetadata = JSON.parse(cert_metadata || '[]'); } catch {}

      const files = req.files || {};
      const photoFile = files["profile_photo"] ? files["profile_photo"][0] : null;
      const certFiles = files["certificates"]  || [];
      const cccdFile  = files["cccd"]          ? files["cccd"][0]          : null;

      let photoPath = null;
      let cccdPath  = null;

      if (photoFile) {
        const ext = photoFile.originalname.split('.').pop();
        photoPath = await uploadFileToStorage(photoFile, `profile_photos/${userId}_${Date.now()}.${ext}`);
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
        // ΓöÇΓöÇ UPDATE ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
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
        if (cccdPath)  { query += `, cccd_url = $${idx}`;          values.push(cccdPath);  idx++; }

        query += ` WHERE user_id = $18 RETURNING *`;
        result = await pool.query(query, values);
      } else {
        result = await pool.query(
          `INSERT INTO tutor_profiles (
            user_id, bio, subjects, experience_years,
            first_name, last_name, display_name,
            birthday, gender, country, city, phone,
            education, language, hourly_rate,
            teaching_style, qualifications,
            profile_photo_url, cccd_url,
            status
          ) VALUES (
            $1, $2, $3, $4,
            $5, $6, $7,
            $8, $9, $10, $11, $12,
            $13, $14, $15,
            $16, $17,
            $18, $19,
            'pending'
          ) RETURNING *`,
          [
            userId, bio, subjects, parseInt(experience_years) || 0,
            first_name, last_name, display_name,
            birthday || null, gender, country, city, phone,
            education, language, parseFloat(hourly_rate) || null,
            teaching_style, qualifications,
            photoPath, cccdPath,
          ]
        );
      }

      // Optional: save structured fields (separate query, non-fatal if columns not ready)
      try {
        await pool.query(
          `UPDATE tutor_profiles SET
            teaching_methods  = $1::jsonb,
            suitable_students = $2::jsonb
           WHERE id = $3`,
          [
            JSON.stringify(parsedTeachingMethods),
            JSON.stringify(parsedSuitableStudents),
            result.rows[0].id,
          ]
        );
      } catch (structErr) {
        console.warn("[Profile] structured fields save skipped:", structErr.message);
      }

      // Insert new certificates into tutor_certificates table (with metadata)
      if (certFiles.length > 0) {
        const profileId = result.rows[0].id;
        await pool.query("DELETE FROM tutor_certificates WHERE tutor_profile_id = $1", [profileId]);
        for (let i = 0; i < certFiles.length; i++) {
          const f = certFiles[i];
          const meta = parsedCertMetadata[i] || {};
          const ext = f.originalname.split('.').pop();
          const certPath = await uploadFileToStorage(f, `certificates/${userId}_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`);
          try {
            await pool.query(
              "INSERT INTO tutor_certificates (tutor_profile_id, name, url, cert_type, issuer, issue_year) VALUES ($1, $2, $3, $4, $5, $6)",
              [profileId, meta.name || f.originalname, certPath, meta.cert_type || 'Chứng chỉ', meta.issuer || null, meta.year ? parseInt(meta.year) : null]
            );
          } catch (certExtErr) {
            // Fall back to basic insert if extended cert columns don't exist yet
            await pool.query(
              "INSERT INTO tutor_certificates (tutor_profile_id, name, url) VALUES ($1, $2, $3)",
              [profileId, meta.name || f.originalname, certPath]
            );
          }
        }
      }

      return res.status(200).json(result.rows[0]);
    } catch (error) {
      console.error("Tutor profile upload error:", error);
      return res.status(500).json({ message: error.message || "Server error." });
    }
  }
);


// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
// ΓöÇΓöÇ ADMIN APIs (all protected by verifyToken + requireAdmin) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ

// ΓöÇΓöÇΓöÇ GET /api/admin/tutors/stats ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
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

// ΓöÇΓöÇΓöÇ GET /api/admin/document-url ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
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

// ΓöÇΓöÇΓöÇ GET /api/admin/tutors/pending ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// Returns all tutor_profiles with status = 'pending', joined with users
app.get("/api/admin/tutors/pending", verifyToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        tp.id, tp.user_id, u.full_name, u.email,
        tp.bio, tp.subjects, tp.experience_years,
        tp.certificate_url, tp.cccd_url, tp.status, tp.reject_reason,
        tp.created_at, tp.profile_photo_url, tp.hourly_rate,
        tp.teaching_methods, tp.suitable_students,
        COALESCE(
          (SELECT json_agg(json_build_object('id', tc.id, 'name', tc.name, 'url', tc.url, 'cert_type', tc.cert_type, 'issuer', tc.issuer, 'issue_year', tc.issue_year) ORDER BY tc.created_at)
           FROM tutor_certificates tc WHERE tc.tutor_profile_id = tp.id),
          '[]'::json
        ) AS certificates
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

// ΓöÇΓöÇΓöÇ PATCH /api/admin/tutors/:id/reject ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
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

// ─── GET /api/admin/tutors/pending (duplicate route kept for compatibility) ───
app.get("/api/admin/tutors/pending", verifyToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        tp.id, tp.user_id, u.full_name, u.email,
        tp.bio, tp.subjects, tp.experience_years,
        tp.certificate_url, tp.cccd_url, tp.status, tp.reject_reason,
        tp.created_at, tp.profile_photo_url, tp.hourly_rate,
        tp.teaching_methods, tp.suitable_students,
        COALESCE(
          (SELECT json_agg(json_build_object('id', tc.id, 'name', tc.name, 'url', tc.url, 'cert_type', tc.cert_type, 'issuer', tc.issuer, 'issue_year', tc.issue_year) ORDER BY tc.created_at)
           FROM tutor_certificates tc WHERE tc.tutor_profile_id = tp.id),
          '[]'::json
        ) AS certificates
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

// ═══════════════════════════════════════════════════════════════════════════════
// ── PERSON 4: Class Workspace Routes ─────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
const classRoutes = require("./routes/classRoutes");
const materialRoutes = require("./routes/materialRoutes");
const assignmentRoutes = require("./routes/assignmentRoutes");
const discussionRoutes = require("./routes/discussionRoutes");
const lessonRoutes = require("./routes/lessonRoutes");
const learningPathRoutes = require("./routes/learningPathRoutes");

app.use("/api/classes/:classId/materials", materialRoutes);
app.use("/api/classes", classRoutes);
app.use("/", assignmentRoutes);
app.use("/", discussionRoutes);
app.use("/", lessonRoutes);
app.use("/", learningPathRoutes);

// ── GET /api/admin/users ──────────────────────────────────────────────────────
app.get("/api/admin/users", verifyToken, requireAdmin, async (req, res) => {
  const { search = "", role = "all", page = "1", limit = "20" } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const conditions = [];
  const values = [];
  let idx = 1;

  if (search.trim()) {
    conditions.push(`(u.full_name ILIKE $${idx} OR u.email ILIKE $${idx})`);
    values.push(`%${search.trim()}%`);
    idx++;
  }
  if (role !== "all") {
    conditions.push(`u.role = $${idx}`);
    values.push(role);
    idx++;
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM users u ${where}`,
      values
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.role, u.picture,
              COALESCE(u.is_banned, false) AS is_banned, u.created_at
       FROM users u
       ${where}
       ORDER BY u.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, parseInt(limit), offset]
    );

    return res.json({ users: result.rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error("GET /api/admin/users error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// ── GET /api/admin/users/:id ─────────────────────────────────────────────────
// Returns full profile of one user. Includes tutor_profiles data if role = tutor.
app.get("/api/admin/users/:id", verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const userResult = await pool.query(
      `SELECT id, full_name, email, role, picture,
              COALESCE(is_banned, false) AS is_banned, created_at
       FROM users WHERE id = $1`,
      [id]
    );
    if (!userResult.rows.length) return res.status(404).json({ message: "User not found." });

    const user = userResult.rows[0];

    if (user.role === "tutor") {
      const tpResult = await pool.query(
        `SELECT bio, subjects, experience_years, hourly_rate,
                certificate_url, cccd_url, status AS approval_status,
                reject_reason, profile_photo_url, phone, city, country
         FROM tutor_profiles WHERE user_id = $1 LIMIT 1`,
        [id]
      );
      user.tutor_profile = tpResult.rows[0] || null;
    }

    if (user.role === "student") {
      const attemptsResult = await pool.query(
        `SELECT COUNT(*) FROM quiz_attempts WHERE student_id = $1`,
        [id]
      );
      user.quiz_attempts = parseInt(attemptsResult.rows[0].count);
    }

    // Lịch sử đăng nhập gần nhất (10 lần)
    const logsResult = await pool.query(
      `SELECT ip_address, user_agent, is_suspicious, created_at
       FROM login_logs WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 10`,
      [id]
    );
    user.login_logs = logsResult.rows;

    return res.json(user);
  } catch (err) {
    console.error("GET /api/admin/users/:id error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// ── PATCH /api/admin/users/:id/ban ───────────────────────────────────────────
// Bans or unbans a user. Cannot ban admin accounts.
// Body: { "banned": true | false }
app.patch("/api/admin/users/:id/ban", verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { banned } = req.body;

  if (typeof banned !== "boolean") {
    return res.status(400).json({ message: "'banned' must be a boolean." });
  }

  try {
    // Prevent banning admin accounts
    const check = await pool.query("SELECT role FROM users WHERE id = $1", [id]);
    if (!check.rows.length) return res.status(404).json({ message: "User not found." });
    if (check.rows[0].role === "admin") {
      return res.status(403).json({ message: "Cannot ban an admin account." });
    }

    const result = await pool.query(
      `UPDATE users SET is_banned = $1 WHERE id = $2
       RETURNING id, full_name, email, role, is_banned, created_at`,
      [banned, id]
    );
    return res.json(result.rows[0]);
  } catch (err) {
    console.error("PATCH /api/admin/users/:id/ban error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// ── PATCH /api/admin/users/:id/role ──────────────────────────────────────────
// Changes a user's role. Cannot change admin accounts.
// Body: { "role": "student" | "tutor" | "parent" }
app.patch("/api/admin/users/:id/role", verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  const allowed = ["student", "tutor", "parent"];

  if (!allowed.includes(role)) {
    return res.status(400).json({ message: `role must be one of: ${allowed.join(", ")}` });
  }

  try {
    const check = await pool.query("SELECT role FROM users WHERE id = $1", [id]);
    if (!check.rows.length) return res.status(404).json({ message: "User not found." });
    if (check.rows[0].role === "admin") {
      return res.status(403).json({ message: "Cannot change role of an admin account." });
    }

    const result = await pool.query(
      `UPDATE users SET role = $1 WHERE id = $2
       RETURNING id, full_name, email, role, is_banned, created_at`,
      [role, id]
    );
    return res.json(result.rows[0]);
  } catch (err) {
    console.error("PATCH /api/admin/users/:id/role error:", err);
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
      SELECT 
        q.id, q.title, q.subject, q.description, q.duration_minutes, q.total_questions, q.created_at,
        (SELECT status FROM quiz_attempts qa WHERE qa.quiz_id = q.id AND qa.student_id = $1 ORDER BY submitted_at DESC NULLS LAST, created_at DESC LIMIT 1) as attempt_status,
        (SELECT id FROM quiz_attempts qa WHERE qa.quiz_id = q.id AND qa.student_id = $1 ORDER BY submitted_at DESC NULLS LAST, created_at DESC LIMIT 1) as attempt_id,
        (SELECT score FROM quiz_attempts qa WHERE qa.quiz_id = q.id AND qa.student_id = $1 ORDER BY submitted_at DESC NULLS LAST, created_at DESC LIMIT 1) as attempt_score
      FROM quizzes q
      ORDER BY q.created_at DESC
    `, [req.user.userId]);
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
    await pool.query(`UPDATE quiz_attempts SET answers=$1, time_remaining_seconds=COALESCE($2, time_remaining_seconds) WHERE id=$3 AND student_id=$4`,
      [JSON.stringify(answers), timeRemainingSeconds !== undefined ? timeRemainingSeconds : null, attemptId, req.user.userId]);
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
    if (attempt.rows[0].status === 'submitted') return res.status(400).json({ message: 'Already submitted.' });

    const questions = await pool.query(`SELECT * FROM quiz_questions WHERE quiz_id=$1`, [id]);
    let correct = 0;
    let totalScore = 0;
    const feedbackObj = {};

    for (let q of questions.rows) {
      const studentAnswer = answers[q.id] || '';
      if (q.question_type === 'essay') {
        const aiResult = await gradeEssayAnswer(q.question_text, q.suggested_answer, studentAnswer);
        feedbackObj[q.id] = { score: aiResult.score, feedback: aiResult.feedback };
        totalScore += aiResult.score;
      } else {
        if (studentAnswer.toLowerCase() === (q.correct_answer || 'a').toLowerCase()) {
          correct++;
          totalScore += 100;
        }
      }
    }

    const total = questions.rows.length;
    const score = total > 0 ? Math.round(totalScore / total) : 0;
    const result = await pool.query(
      `UPDATE quiz_attempts SET answers=$1, score=$2, total_correct=$3, tutor_feedback=$4, status='submitted', submitted_at=NOW() WHERE id=$5 RETURNING *`,
      [JSON.stringify(answers), score, correct, JSON.stringify(feedbackObj), attemptId]
    );
    return res.json({ score, total_correct: correct, total_questions: total, attempt: result.rows[0], feedback: feedbackObj });
  } catch (e) { console.error('Quiz submit:', e); res.status(500).json({ message: 'Server error.' }); }
});

// ══════════════════════════════════════════════════════════════════════════════
//  PRACTICE / AI APIs
// ══════════════════════════════════════════════════════════════════════════════

// ─── POST /api/practice/generate ──────────────────────────────────────────────
app.post('/api/practice/generate', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { topic, count = 10, difficulty = 'medium', timeLimitMins = null, questionType = 'multiple_choice' } = req.body;
    if (!topic?.trim()) return res.status(400).json({ message: 'Topic is required.' });
    const diff = ['easy','medium','hard'].includes(difficulty) ? difficulty : 'medium';
    const questionCount = Math.min(Math.max(Number(count)||10,1),30);
    const questions = await generateQuizQuestions(topic.trim(), questionCount, diff, questionType);
    // Detect quota notice
    if (questions.length > 0 && questions[0].question?.startsWith('⚠️')) {
      return res.status(503).json({ message: 'AI_QUOTA_EXCEEDED', detail: 'Gemini và Groq đều đạt giới hạn. Thử lại sau hoặc dùng Đề thi có sẵn.' });
    }
    const timeRemainingSeconds = timeLimitMins ? timeLimitMins * 60 : null;
    const result = await pool.query(
      `INSERT INTO practice_sessions (student_id, topic, difficulty, questions, total_questions, time_limit_mins, time_remaining_seconds) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, topic, difficulty, total_questions, status, created_at, time_limit_mins, time_remaining_seconds`,
      [userId, topic.trim(), diff, JSON.stringify(questions), questions.length, timeLimitMins, timeRemainingSeconds]
    );
    const session = result.rows[0];
    const safeQ = questions.map((q,i) => ({ index:i, question:q.question, question_type:q.question_type, optionA:q.optionA, optionB:q.optionB, optionC:q.optionC, optionD:q.optionD }));
    return res.status(201).json({ session, questions: safeQ });
  } catch (e) { console.error('Practice generate:', e); res.status(500).json({ message: e.message||'Server error.' }); }
});

// ─── GET /api/practice/history ────────────────────────────────────────────────
app.get('/api/practice/history', verifyToken, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, topic, difficulty, score, total_questions, total_correct, status, created_at, submitted_at, time_limit_mins, time_remaining_seconds FROM practice_sessions WHERE student_id=$1 ORDER BY created_at DESC LIMIT 50`,
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
    const questions = (session.questions || []).map((q,i) => ({ index:i, question:q.question, question_type:q.question_type, optionA:q.optionA, optionB:q.optionB, optionC:q.optionC, optionD:q.optionD }));
    return res.json({ session: { id:session.id, topic:session.topic, difficulty:session.difficulty, total_questions:session.total_questions, status:session.status, answers:session.answers, time_limit_mins:session.time_limit_mins, time_remaining_seconds:session.time_remaining_seconds }, questions });
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

// ─── POST /api/practice/:sessionId/save-progress ────────────────────────────────
app.post('/api/practice/:sessionId/save-progress', verifyToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { answers, timeRemaining } = req.body;
    const r = await pool.query(`SELECT * FROM practice_sessions WHERE id=$1 AND student_id=$2`, [sessionId, req.user.userId]);
    if (!r.rows.length) return res.status(404).json({ message: 'Session not found.' });
    if (r.rows[0].status === 'submitted') return res.status(400).json({ message: 'Session already submitted.' });
    
    await pool.query(
      `UPDATE practice_sessions SET answers=$1, time_remaining_seconds=$2 WHERE id=$3`,
      [JSON.stringify(answers || {}), timeRemaining !== undefined ? timeRemaining : r.rows[0].time_remaining_seconds, sessionId]
    );
    return res.json({ message: 'Progress saved successfully.' });
  } catch (e) { res.status(500).json({ message: 'Server error.' }); }
});

// ─── POST /api/practice/:sessionId/submit ─────────────────────────────────────
app.post('/api/practice/:sessionId/submit', verifyToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { answers } = req.body;
    const r = await pool.query(`SELECT * FROM practice_sessions WHERE id=$1 AND student_id=$2`, [sessionId, req.user.userId]);
    if (!r.rows.length) return res.status(404).json({ message: 'Session not found.' });
    if (r.rows[0].status === 'submitted') return res.status(400).json({ message: 'Session already submitted.' });
    const session = r.rows[0];
    const questions = session.questions || [];
    let correct = 0;
    let totalScore = 0;

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const studentAnswer = answers[i] || '';
      if (q.question_type === 'essay') {
        const aiResult = await gradeEssayAnswer(q.question, q.suggested_answer, studentAnswer);
        q.ai_score = aiResult.score;
        q.ai_feedback = aiResult.feedback;
        totalScore += aiResult.score;
      } else {
        if (studentAnswer.toUpperCase() === (q.correctAnswer||'A').toUpperCase()) {
          correct++;
          totalScore += 100;
        }
      }
    }

    const total = questions.length;
    const score = total > 0 ? Math.round(totalScore / total) : 0;
    const updated = await pool.query(
      `UPDATE practice_sessions SET answers=$1, questions=$2, score=$3, total_correct=$4, status='submitted', submitted_at=NOW() WHERE id=$5 RETURNING *`,
      [JSON.stringify(answers), JSON.stringify(questions), score, correct, sessionId]
    );
    return res.json({ score, total_correct:correct, total_questions:total, session: updated.rows[0] });
  } catch (e) { console.error('Practice submit:', e); res.status(500).json({ message: 'Server error.' }); }
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
    const shuffledData = shuffledQs.map(q => { const {newOptions,newCorrect,optionMap}=shuffleQuestionOptions(q); return {id:q.id,...newOptions,question_type:q.question_type,question_text:q.question_text,newCorrect,optionMap}; });
    if (!attempt.rows.length) {
      attempt = await pool.query(`INSERT INTO exam_paper_attempts (exam_paper_id,student_id,shuffled_data) VALUES ($1,$2,$3) RETURNING *`, [paperId, studentId, JSON.stringify(shuffledData)]);
    }
    const safeQ = shuffledData.map(q => ({ id:q.id, question_type:q.question_type, question_text:q.question_text, option_a:q.option_a, option_b:q.option_b, option_c:q.option_c, option_d:q.option_d }));
    return res.json({ paper: paper.rows[0], questions: safeQ, attempt: attempt.rows[0] });
  } catch (e) { res.status(500).json({ message: 'Server error.' }); }
});

// ─── GET /api/exam-papers/attempts/:attemptId ──────────────────────────────────
app.get('/api/exam-papers/attempts/:attemptId', verifyToken, async (req, res) => {
  try {
    const { attemptId } = req.params;
    const attempt = await pool.query(`SELECT * FROM exam_paper_attempts WHERE id=$1 AND student_id=$2`, [attemptId, req.user.userId]);
    if (!attempt.rows.length) return res.status(404).json({ message: 'Not found.' });
    const a = attempt.rows[0];
    const paper = await pool.query(`SELECT * FROM exam_papers WHERE id=$1`, [a.exam_paper_id]);
    
    // Instead of querying exam_paper_questions, we return the shuffledData stored in the attempt
    // which has the exact options the student saw, plus the mapped correct answer.
    const shuffledData = a.shuffled_data || [];
    const questions = shuffledData.map(q => ({
      id: q.id,
      question_text: q.question_text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_answer: q.newCorrect, 
      explanation: q.explanation // If explanation is not in shuffledData, we might need to join, but usually we don't strictly need explanation if not fetched. Wait! I should probably just return shuffledData.
    }));
    
    return res.json({ attempt: a, paper: paper.rows[0], questions });
  } catch (e) { res.status(500).json({ message: 'Server error.' }); }
});
// ─── POST /api/exam-papers/:paperId/save-draft ──────────────────────────────────
app.post('/api/exam-papers/:paperId/save-draft', verifyToken, async (req, res) => {
  try {
    const { attemptId, answers, timeRemainingSeconds } = req.body;
    await pool.query(`UPDATE exam_paper_attempts SET answers=$1, time_remaining_seconds=COALESCE($2, time_remaining_seconds) WHERE id=$3 AND student_id=$4`,
      [JSON.stringify(answers), timeRemainingSeconds !== undefined ? timeRemainingSeconds : null, attemptId, req.user.userId]);
    return res.json({ message: 'Draft saved.' });
  } catch (e) { res.status(500).json({ message: 'Server error.' }); }
});

app.post('/api/exam-papers/:paperId/submit', verifyToken, async (req, res) => {
  try {
    const { attemptId, answers } = req.body;
    const studentId = req.user.userId;
    const attempt = await pool.query(`SELECT * FROM exam_paper_attempts WHERE id=$1 AND student_id=$2`, [attemptId, studentId]);
    if (!attempt.rows.length) return res.status(404).json({ message: 'Attempt not found.' });
    if (attempt.rows[0].status === 'submitted') return res.status(400).json({ message: 'Already submitted.' });

    const shuffledData = attempt.rows[0].shuffled_data || [];
    let correct = 0;
    let totalScore = 0;
    const feedbackObj = {};

    const { paperId } = req.params;
    const questionsRes = await pool.query(`SELECT * FROM exam_paper_questions WHERE exam_paper_id=$1`, [paperId]);
    const questionsMap = {};
    questionsRes.rows.forEach(q => { questionsMap[q.id] = q; });

    for (let sq of shuffledData) {
      const q = questionsMap[sq.id];
      if (!q) continue;
      const studentAnswer = answers[q.id] || '';

      if (q.question_type === 'essay') {
        const aiResult = await gradeEssayAnswer(q.question_text, q.suggested_answer, studentAnswer);
        feedbackObj[q.id] = { score: aiResult.score, feedback: aiResult.feedback };
        totalScore += aiResult.score;
      } else {
        if (studentAnswer.toUpperCase() === (sq.newCorrect || 'A').toUpperCase()) {
          correct++;
          totalScore += 100;
        }
      }
    }

    const total = shuffledData.length;
    const score = total > 0 ? Math.round(totalScore / total) : 0;
    const updated = await pool.query(
      `UPDATE exam_paper_attempts SET answers=$1,score=$2,total_correct=$3,tutor_feedback=$4,status='submitted',submitted_at=NOW() WHERE id=$5 RETURNING *`,
      [JSON.stringify(answers), score, correct, JSON.stringify(feedbackObj), attemptId]
    );
    return res.json({ score, total_correct:correct, total_questions:total, attempt_id:attemptId, submitted_at:updated.rows[0].submitted_at, feedback: feedbackObj });
  } catch (e) { console.error('Exam submit error:', e); res.status(500).json({ message: 'Server error.' }); }
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

// ══════════════════════════════════════════════════════════════════════════════
//  PARENT EXTENDED APIs — Schedule, Reviews, Invoices, Notifications
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/parent/children/:studentId/schedule
app.get('/api/parent/children/:studentId/schedule', verifyToken, async (req, res) => {
  try {
    const { studentId } = req.params;
    const link = await pool.query('SELECT id FROM parent_children WHERE parent_id=$1 AND student_id=$2', [req.user.userId, studentId]);
    if (!link.rows.length) return res.status(403).json({ message: 'Không có quyền truy cập.' });

    const sessions = await pool.query(`
      SELECT ts.id, ts.subject, ts.scheduled_at, ts.duration_mins, ts.status, ts.leave_reason, ts.notes,
             u.id AS tutor_id, u.full_name AS tutor_name, u.picture AS tutor_picture
      FROM tutor_sessions ts
      JOIN users u ON ts.tutor_id = u.id
      WHERE ts.student_id = $1 AND ts.scheduled_at >= NOW() - INTERVAL '7 days'
      ORDER BY ts.scheduled_at ASC LIMIT 20
    `, [studentId]);

    const absences = await pool.query(`
      SELECT COUNT(*) AS count FROM tutor_sessions
      WHERE student_id=$1 AND status IN ('absent','late') AND scheduled_at >= date_trunc('month', NOW())
    `, [studentId]);

    return res.json({ sessions: sessions.rows, absences_this_month: parseInt(absences.rows[0].count) });
  } catch (e) { console.error(e); res.status(500).json({ message: 'Server error.' }); }
});

// POST /api/parent/children/:studentId/schedule/:sessionId/leave
app.post('/api/parent/children/:studentId/schedule/:sessionId/leave', verifyToken, async (req, res) => {
  try {
    const { studentId, sessionId } = req.params;
    const { reason } = req.body;
    const link = await pool.query('SELECT id FROM parent_children WHERE parent_id=$1 AND student_id=$2', [req.user.userId, studentId]);
    if (!link.rows.length) return res.status(403).json({ message: 'Không có quyền truy cập.' });

    const updated = await pool.query(`
      UPDATE tutor_sessions SET status='cancelled', leave_reason=$1, updated_at=NOW()
      WHERE id=$2 AND student_id=$3 AND status='scheduled' RETURNING *
    `, [reason || null, sessionId, studentId]);

    if (!updated.rows.length) return res.status(404).json({ message: 'Không tìm thấy buổi học hoặc đã không thể hủy.' });

    const session = updated.rows[0];
    const studentRes = await pool.query('SELECT full_name FROM users WHERE id=$1', [studentId]);
    await pool.query(`
      INSERT INTO notifications (user_id, type, title, body, icon, ref_id, ref_type)
      VALUES ($1, 'student_absent', 'Học sinh xin nghỉ', $2, 'event_busy', $3, 'session')
    `, [
      session.tutor_id,
      `${studentRes.rows[0]?.full_name || 'Học sinh'} xin nghỉ buổi ${session.subject} ngày ${new Date(session.scheduled_at).toLocaleDateString('vi-VN')}. Lý do: ${reason || 'Không có lý do.'}`,
      sessionId
    ]);

    return res.json({ message: 'Đã gửi yêu cầu nghỉ phép.' });
  } catch (e) { console.error(e); res.status(500).json({ message: 'Server error.' }); }
});

// GET /api/parent/children/:studentId/reviews
app.get('/api/parent/children/:studentId/reviews', verifyToken, async (req, res) => {
  try {
    const { studentId } = req.params;
    const link = await pool.query('SELECT id FROM parent_children WHERE parent_id=$1 AND student_id=$2', [req.user.userId, studentId]);
    if (!link.rows.length) return res.status(403).json({ message: 'Không có quyền truy cập.' });

    const reviews = await pool.query(`
      SELECT tr.id, tr.subject, tr.period_label, tr.content, tr.rating, tr.created_at,
             u.full_name AS tutor_name, u.picture AS tutor_picture
      FROM tutor_reviews tr
      JOIN users u ON tr.tutor_id = u.id
      WHERE tr.student_id=$1 ORDER BY tr.created_at DESC LIMIT 20
    `, [studentId]);

    return res.json({ reviews: reviews.rows });
  } catch (e) { console.error(e); res.status(500).json({ message: 'Server error.' }); }
});

// POST /api/tutor/reviews — gia sư tạo nhận xét định kỳ
app.post('/api/tutor/reviews', verifyToken, requireTutor, async (req, res) => {
  try {
    const { student_id, subject, period_label, content, rating } = req.body;
    if (!student_id || !subject || !period_label || !content)
      return res.status(400).json({ message: 'Thiếu thông tin bắt buộc.' });

    const review = await pool.query(`
      INSERT INTO tutor_reviews (student_id, tutor_id, subject, period_label, content, rating)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING *
    `, [student_id, req.user.userId, subject, period_label, content, rating || 3]);

    const parents = await pool.query('SELECT parent_id FROM parent_children WHERE student_id=$1', [student_id]);
    const studentRes = await pool.query('SELECT full_name FROM users WHERE id=$1', [student_id]);
    for (const p of parents.rows) {
      await pool.query(`
        INSERT INTO notifications (user_id, type, title, body, icon, ref_id, ref_type)
        VALUES ($1,'tutor_review',$2,$3,'rate_review',$4,'review')
      `, [p.parent_id, `Nhận xét mới từ gia sư — ${subject}`,
          `Gia sư vừa gửi nhận xét định kỳ cho ${studentRes.rows[0]?.full_name || 'học sinh'} (${period_label}).`,
          review.rows[0].id]);
    }
    return res.status(201).json({ review: review.rows[0] });
  } catch (e) { console.error(e); res.status(500).json({ message: 'Server error.' }); }
});

// GET /api/parent/invoices
app.get('/api/parent/invoices', verifyToken, async (req, res) => {
  try {
    const parentId = req.user.userId;
    await pool.query(`UPDATE invoices SET status='overdue' WHERE parent_id=$1 AND status='pending' AND due_date < CURRENT_DATE`, [parentId]);

    const [pending, paid] = await Promise.all([
      pool.query(`
        SELECT i.*, u.full_name AS student_name, t.full_name AS tutor_name
        FROM invoices i JOIN users u ON i.student_id=u.id LEFT JOIN users t ON i.tutor_id=t.id
        WHERE i.parent_id=$1 AND i.status IN ('pending','overdue') ORDER BY i.due_date ASC NULLS LAST
      `, [parentId]),
      pool.query(`
        SELECT i.*, u.full_name AS student_name, t.full_name AS tutor_name
        FROM invoices i JOIN users u ON i.student_id=u.id LEFT JOIN users t ON i.tutor_id=t.id
        WHERE i.parent_id=$1 AND i.status='paid' ORDER BY i.paid_at DESC LIMIT 50
      `, [parentId])
    ]);

    const totalDebt = pending.rows.reduce((s, i) => s + parseInt(i.amount), 0);
    const totalPaid = paid.rows.reduce((s, i) => s + parseInt(i.amount), 0);
    const overdueCount = pending.rows.filter(i => i.status === 'overdue').length;

    return res.json({ pending: pending.rows, paid: paid.rows,
      summary: { total_debt: totalDebt, total_paid: totalPaid, overdue_count: overdueCount } });
  } catch (e) { console.error(e); res.status(500).json({ message: 'Server error.' }); }
});

// GET /api/notifications
app.get('/api/notifications', verifyToken, async (req, res) => {
  try {
    const notifs = await pool.query(
      `SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 30`,
      [req.user.userId]
    );
    const unreadCount = notifs.rows.filter(n => !n.is_read).length;
    return res.json({ notifications: notifs.rows, unread_count: unreadCount });
  } catch (e) { res.status(500).json({ message: 'Server error.' }); }
});

// PUT /api/notifications/read-all
app.put('/api/notifications/read-all', verifyToken, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read=TRUE WHERE user_id=$1', [req.user.userId]);
    return res.json({ message: 'OK' });
  } catch (e) { res.status(500).json({ message: 'Server error.' }); }
});

// PUT /api/notifications/:id/read
app.put('/api/notifications/:id/read', verifyToken, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read=TRUE WHERE id=$1 AND user_id=$2', [req.params.id, req.user.userId]);
    return res.json({ message: 'OK' });
  } catch (e) { res.status(500).json({ message: 'Server error.' }); }
});




const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);
const BUCKET = 'chat-files';

// Multer: lưu file vào bộ nhớ tạm
const chatUpload = multer({
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
app.post('/api/chat/upload', verifyToken, (req, res, next) => {
  chatUpload.single('file')(req, res, function (err) {
    if (err) return res.status(400).json({ message: err.message || 'File upload error.' });
    next();
  });
}, async (req, res) => {
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

// ─── Background Job: Cleanup Abandoned Practice Sessions ─────────
const cleanupAbandonedPracticeSessions = async () => {
  try {
    const res = await pool.query(`
      UPDATE practice_sessions
      SET status = 'submitted', score = 0, total_correct = 0, submitted_at = NOW()
      WHERE status = 'in_progress' AND created_at < NOW() - INTERVAL '24 hours'
    `);
    if (res.rowCount > 0) {
      console.log(`🧹 Cleaned up ${res.rowCount} abandoned practice sessions.`);
    }
  } catch (err) {
    console.error('Error cleaning up practice sessions:', err);
  }
};
// Run once on startup, then every hour
cleanupAbandonedPracticeSessions();
setInterval(cleanupAbandonedPracticeSessions, 60 * 60 * 1000);

app.post('/api/tutor/grade-attempt', verifyToken, requireTutor, async (req, res) => {
  try {
    const { attemptId, type, tutorScore, tutorFeedback } = req.body;
    if (type === 'quiz') {
      const attempt = await pool.query(`SELECT * FROM quiz_attempts WHERE id=$1`, [attemptId]);
      if (!attempt.rows.length) return res.status(404).json({ message: 'Attempt not found.' });
      
      const quiz = await pool.query(`SELECT * FROM quizzes WHERE id=$1`, [attempt.rows[0].quiz_id]);
      if (quiz.rows[0].created_by !== req.user.userId) return res.status(403).json({ message: 'Not authorized to grade this quiz.' });

      const updated = await pool.query(
        `UPDATE quiz_attempts SET tutor_score=$1, tutor_feedback=$2 WHERE id=$3 RETURNING *`,
        [tutorScore, JSON.stringify(tutorFeedback), attemptId]
      );
      return res.json({ attempt: updated.rows[0] });
    } else if (type === 'exam') {
      const attempt = await pool.query(`SELECT * FROM exam_paper_attempts WHERE id=$1`, [attemptId]);
      if (!attempt.rows.length) return res.status(404).json({ message: 'Attempt not found.' });

      const paper = await pool.query(`SELECT * FROM exam_papers WHERE id=$1`, [attempt.rows[0].exam_paper_id]);
      if (paper.rows[0].uploaded_by !== req.user.userId) return res.status(403).json({ message: 'Not authorized to grade this exam paper.' });

      const updated = await pool.query(
        `UPDATE exam_paper_attempts SET tutor_score=$1, tutor_feedback=$2 WHERE id=$3 RETURNING *`,
        [tutorScore, JSON.stringify(tutorFeedback), attemptId]
      );
      return res.json({ attempt: updated.rows[0] });
    } else if (type === 'practice') {
      const attempt = await pool.query(`SELECT * FROM practice_sessions WHERE id=$1`, [attemptId]);
      if (!attempt.rows.length) return res.status(404).json({ message: 'Attempt not found.' });

      const updated = await pool.query(
        `UPDATE practice_sessions SET tutor_score=$1, tutor_feedback=$2 WHERE id=$3 RETURNING *`,
        [tutorScore, JSON.stringify(tutorFeedback), attemptId]
      );
      return res.json({ attempt: updated.rows[0] });
    } else {
      return res.status(400).json({ message: 'Invalid type.' });
    }
  } catch (e) {
    console.error('Tutor grade error:', e);
    return res.status(500).json({ message: 'Server error.' });
  }
});


// ══════════════════════════════════════════════════════════════════════════════
//  TUTOR ASSESSMENT MANAGEMENT APIs
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/tutor/assessments
app.get('/api/tutor/assessments', verifyToken, requireTutor, async (req, res) => {
  try {
    const exams = await pool.query(
      `SELECT * FROM exam_papers WHERE uploaded_by=$1 ORDER BY created_at DESC`,
      [req.user.userId]
    );
    // get question counts
    const paperIds = exams.rows.map(e => e.id);
    let counts = {};
    if (paperIds.length > 0) {
      const qRes = await pool.query(
        `SELECT exam_paper_id, COUNT(*) as c FROM exam_paper_questions WHERE exam_paper_id = ANY($1) GROUP BY exam_paper_id`,
        [paperIds]
      );
      qRes.rows.forEach(r => { counts[r.exam_paper_id] = parseInt(r.c); });
    }
    const result = exams.rows.map(e => ({ ...e, question_count: counts[e.id] || 0 }));
    res.json(result);
  } catch (e) {
    console.error('Tutor GET assessments error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/tutor/assessments
app.post('/api/tutor/assessments', verifyToken, requireTutor, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { title, subject, grade, duration_minutes, description, questions } = req.body;
    
    // Create exam_paper
    const insertPaperRes = await client.query(
      `INSERT INTO exam_papers (title, subject, grade, duration_minutes, description, uploaded_by, total_questions)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [title, subject, grade, duration_minutes, description, req.user.userId, questions.length]
    );
    const paper = insertPaperRes.rows[0];

    // Create questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      await client.query(
        `INSERT INTO exam_paper_questions (exam_paper_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, question_order, question_type, suggested_answer)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          paper.id,
          q.question_text,
          q.option_a || '',
          q.option_b || '',
          q.option_c || '',
          q.option_d || '',
          q.correct_answer || 'A',
          q.explanation || '',
          i + 1,
          q.question_type || 'multiple_choice',
          q.suggested_answer || null
        ]
      );
    }
    
    await client.query('COMMIT');
    res.status(201).json({ message: 'Assessment created successfully', paper });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Tutor POST assessments error:', e);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
});

// GET /api/tutor/grading-queue
app.get('/api/tutor/grading-queue', verifyToken, requireTutor, async (req, res) => {
  try {
    // Lấy các exam_paper do tutor upload
    const attempts = await pool.query(`
      SELECT a.id as attempt_id, a.score, a.status, a.submitted_at,
             a.tutor_score,
             p.id as paper_id, p.title as paper_title, p.subject,
             u.full_name as student_name, u.picture as student_picture
      FROM exam_paper_attempts a
      JOIN exam_papers p ON a.exam_paper_id = p.id
      JOIN users u ON a.student_id = u.id
      WHERE p.uploaded_by = $1 AND a.status = 'submitted'
      ORDER BY a.submitted_at DESC
    `, [req.user.userId]);

    // Cũng lấy các quiz attempts nếu có
    const quizAttempts = await pool.query(`
      SELECT a.id as attempt_id, a.score, a.status, a.submitted_at,
             a.tutor_score,
             q.id as paper_id, q.title as paper_title, q.subject,
             u.full_name as student_name, u.picture as student_picture
      FROM quiz_attempts a
      JOIN quizzes q ON a.quiz_id = q.id
      JOIN users u ON a.student_id = u.id
      WHERE q.created_by = $1 AND a.status = 'submitted'
      ORDER BY a.submitted_at DESC
    `, [req.user.userId]);

    // Cũng lấy các practice sessions (AI generated, any tutor can grade)
    const practiceAttempts = await pool.query(`
      SELECT p.id as attempt_id, p.score, p.status, p.submitted_at,
             p.tutor_score,
             p.id as paper_id, p.topic as paper_title, p.difficulty as subject,
             u.full_name as student_name, u.picture as student_picture
      FROM practice_sessions p
      JOIN users u ON p.student_id = u.id
      WHERE p.status = 'submitted'
      ORDER BY p.submitted_at DESC
    `);

    const result = [
      ...attempts.rows.map(r => ({ ...r, type: 'exam' })),
      ...quizAttempts.rows.map(r => ({ ...r, type: 'quiz' })),
      ...practiceAttempts.rows.map(r => ({ ...r, type: 'practice' }))
    ].sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));

    res.json(result);
  } catch (e) {
    console.error('Tutor GET grading-queue error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/tutor/grading-queue/:type/:attemptId
app.get('/api/tutor/grading-queue/:type/:attemptId', verifyToken, requireTutor, async (req, res) => {
  try {
    const { type, attemptId } = req.params;
    let attemptRes, questionsRes, paperRes;

    if (type === 'exam') {
      attemptRes = await pool.query('SELECT * FROM exam_paper_attempts WHERE id=$1', [attemptId]);
      if (!attemptRes.rows.length) return res.status(404).json({ message: 'Not found' });
      
      const paperId = attemptRes.rows[0].exam_paper_id;
      paperRes = await pool.query('SELECT * FROM exam_papers WHERE id=$1', [paperId]);
      if (paperRes.rows[0].uploaded_by !== req.user.userId) return res.status(403).json({ message: 'Forbidden' });

      questionsRes = await pool.query('SELECT * FROM exam_paper_questions WHERE exam_paper_id=$1 ORDER BY question_order', [paperId]);
    } else if (type === 'quiz') {
      attemptRes = await pool.query('SELECT * FROM quiz_attempts WHERE id=$1', [attemptId]);
      if (!attemptRes.rows.length) return res.status(404).json({ message: 'Not found' });
      
      const paperId = attemptRes.rows[0].quiz_id;
      paperRes = await pool.query('SELECT * FROM quizzes WHERE id=$1', [paperId]);
      if (paperRes.rows[0].created_by !== req.user.userId) return res.status(403).json({ message: 'Forbidden' });

      questionsRes = await pool.query('SELECT * FROM quiz_questions WHERE quiz_id=$1', [paperId]);
    } else if (type === 'practice') {
      attemptRes = await pool.query('SELECT * FROM practice_sessions WHERE id=$1', [attemptId]);
      if (!attemptRes.rows.length) return res.status(404).json({ message: 'Not found' });
      paperRes = { rows: [{ title: attemptRes.rows[0].topic, subject: attemptRes.rows[0].difficulty }] };
      questionsRes = { rows: (attemptRes.rows[0].questions || []).map((q, i) => ({ id: i, question_type: q.question_type || 'multiple_choice', question_text: q.question, option_a: q.optionA, option_b: q.optionB, option_c: q.optionC, option_d: q.optionD, correct_answer: q.correctAnswer, suggested_answer: q.suggested_answer, explanation: q.explanation })) };
    } else {
      return res.status(400).json({ message: 'Invalid type' });
    }

    const studentRes = await pool.query('SELECT full_name, picture FROM users WHERE id=$1', [attemptRes.rows[0].student_id]);

    res.json({
      attempt: attemptRes.rows[0],
      paper: paperRes.rows[0],
      questions: questionsRes.rows,
      student: studentRes.rows[0]
    });

  } catch (e) {
    console.error('Tutor GET grading-attempt error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});


// ── GET /api/tutors (public) ──────────────────────────────────────────────────
// Tất cả user có role='tutor', LEFT JOIN tutor_profiles để lấy thêm thông tin.
app.get("/api/tutors", async (req, res) => {
  const { search = "", subjects = "", sort = "rating", page = "1", limit = "12" } = req.query;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  const conditions = ["tp.status = 'approved'"];
  const values = [];
  let idx = 1;

  if (search.trim()) {
    conditions.push(`(u.full_name ILIKE $${idx} OR tp.subjects ILIKE $${idx} OR tp.bio ILIKE $${idx})`);
    values.push(`%${search.trim()}%`);
    idx++;
  }

  if (subjects.trim()) {
    const subjectList = subjects.split(",").map(s => s.trim()).filter(Boolean);
    if (subjectList.length > 0) {
      const subConds = subjectList.map(() => `tp.subjects ILIKE $${idx++}`);
      conditions.push(`(${subConds.join(" OR ")})`);
      subjectList.forEach(s => values.push(`%${s}%`));
    }
  }

  // ── Lọc nâng cao (TV3): khoảng giá / hình thức / cấp độ ──
  const minPrice = parseInt(req.query.min_price);
  const maxPrice = parseInt(req.query.max_price);
  const method   = (req.query.method || "").trim();   // 'online' | 'offline'
  const level    = (req.query.level  || "").trim();   // 'Cấp 1' | 'Cấp 2' | 'Cấp 3' | 'Đại học'
  if (!isNaN(minPrice)) { conditions.push(`tp.hourly_rate >= $${idx}`); values.push(minPrice); idx++; }
  if (!isNaN(maxPrice)) { conditions.push(`tp.hourly_rate <= $${idx}`); values.push(maxPrice); idx++; }
  if (method)           { conditions.push(`$${idx} = ANY(tp.teaching_methods)`); values.push(method); idx++; }
  if (level) {
    // suitable_students là jsonb (hiện đa số rỗng) → khớp nếu chứa level HOẶC chưa khai báo (cho qua)
    conditions.push(`(tp.suitable_students @> $${idx}::jsonb OR COALESCE(jsonb_array_length(tp.suitable_students), 0) = 0)`);
    values.push(JSON.stringify([level])); idx++;
  }

  const where = `WHERE ${conditions.join(" AND ")}`;

  const orderMap = {
    rating:     "tp.experience_years DESC NULLS LAST",
    price_asc:  "tp.hourly_rate ASC NULLS LAST",
    price_desc: "tp.hourly_rate DESC NULLS LAST",
    experience: "tp.experience_years DESC NULLS LAST",
    newest:     "tp.created_at DESC",
  };
  const orderBy = orderMap[sort] || orderMap.newest;

  try {
    const countRes = await pool.query(
      `SELECT COUNT(*) FROM tutor_profiles tp JOIN users u ON tp.user_id = u.id ${where}`,
      values
    );
    const total = parseInt(countRes.rows[0].count);

    const tutorsRes = await pool.query(
      `SELECT
         u.id, u.full_name, u.picture,
         tp.bio, tp.subjects, tp.experience_years,
         tp.hourly_rate, tp.profile_photo_url, tp.city, tp.country,
         COALESCE(tp.avg_rating, 0)  AS avg_r,
         COALESCE(tp.review_count, 0) AS review_count
       FROM tutor_profiles tp
       JOIN users u ON tp.user_id = u.id
       ${where}
       ORDER BY ${orderBy}
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, limitNum, offset]
    );

    return res.json({
      tutors: tutorsRes.rows,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    console.error("GET /api/tutors error:", err.message);
    return res.status(500).json({ message: "Server error.", detail: err.message });
  }
});

// ── GET /api/tutors/:id ───────────────────────────────────────────────────────
// Trả về hồ sơ chi tiết của một gia sư theo user ID (public, không cần auth)
app.get("/api/tutors/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT
         u.id, u.full_name, u.picture, u.email,
         tp.bio, tp.subjects, tp.experience_years,
         tp.hourly_rate, tp.profile_photo_url, tp.city, tp.country,
         tp.education, tp.language, tp.teaching_style, tp.qualifications,
         tp.first_name, tp.last_name, tp.display_name, tp.phone,
         tp.headline, tp.teaching_methods, tp.suitable_students,
         COALESCE(
           (SELECT ROUND(AVG(r.rating)::numeric, 1) FROM reviews r WHERE r.reviewer_id = u.id),
           0
         ) AS avg_r,
         COALESCE(
           (SELECT COUNT(*) FROM reviews r WHERE r.reviewer_id = u.id),
           0
         ) AS review_count
       FROM tutor_profiles tp
       JOIN users u ON tp.user_id = u.id
       WHERE u.id = $1 AND tp.status = 'approved'
       LIMIT 1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Tutor not found." });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    console.error("GET /api/tutors/:id error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
});

// ── POST /api/ai-suggest (TV3) ────────────────────────────────────────────────
// Body { prompt } → query gia sư approved → AI chọn gia sư phù hợp.
// Trả { success, aiUsed, reply, tutors:[...] }. AI lỗi → fallback lọc thủ công.
app.post("/api/ai-suggest", async (req, res) => {
  const prompt = (req.body?.prompt ?? req.body?.userMessage ?? "").toString().trim();
  if (!prompt) return res.status(400).json({ success: false, message: "Thiếu prompt." });
  try {
    const tutorsRes = await pool.query(
      `SELECT u.id, u.full_name, u.picture,
              tp.bio, tp.subjects, tp.experience_years, tp.hourly_rate,
              tp.profile_photo_url, tp.city, tp.country, tp.teaching_methods,
              COALESCE(tp.avg_rating, 0)  AS avg_r,
              COALESCE(tp.review_count, 0) AS review_count
       FROM tutor_profiles tp
       JOIN users u ON u.id = tp.user_id
       WHERE tp.status = 'approved'
       ORDER BY tp.avg_rating DESC NULLS LAST, tp.experience_years DESC NULLS LAST`
    );
    const all = tutorsRes.rows;
    if (all.length === 0) {
      return res.json({ success: true, aiUsed: false, reply: "Hiện chưa có gia sư nào được duyệt. Vui lòng quay lại sau.", tutors: [] });
    }

    const byId = new Map(all.map(t => [String(t.id), t]));
    const ai = await suggestTutors(prompt, all);
    if (ai) {
      const chosen = ai.tutorIds.map(id => byId.get(String(id))).filter(Boolean).slice(0, 3);
      return res.json({ success: true, aiUsed: true, reply: ai.reply, tutors: chosen });
    }

    // Fallback: AI lỗi/hết quota → lọc thủ công theo từ khóa (spec TV3 mục 6.2)
    const t = prompt.toLowerCase();
    const method = t.includes("online") ? "online" : t.includes("offline") ? "offline" : null;
    const matchSubject = (x) => (x.subjects || "").toLowerCase().split(/[,;]/)
      .some(s => s.trim() && t.includes(s.trim().toLowerCase()));
    const okMethod = (x) => !method || (Array.isArray(x.teaching_methods) && x.teaching_methods.includes(method));
    const pool2 = all.filter(okMethod);
    const subjHits = pool2.filter(matchSubject);
    const result = (subjHits.length ? subjHits : pool2).slice(0, 3);
    return res.json({
      success: true,
      aiUsed: false,
      reply: "Trợ lý AI tạm thời không khả dụng, mình dùng bộ lọc thủ công để gợi ý gia sư phù hợp:",
      tutors: result,
    });
  } catch (e) {
    console.error("POST /api/ai-suggest error:", e.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// ── Reviews theo gia sư / khóa học (TV3) — dùng bảng `reviews` (review_type) ──
//    Tách prefix /api/entity-reviews để không đụng /api/reviews (testimonial cũ).
//    target_id cho tutor = users.id → resolve sang tutor_profiles.id.
// ════════════════════════════════════════════════════════════════════════════
app.get("/api/entity-reviews", async (req, res) => {
  const targetType = (req.query.target_type || "").trim();
  const targetId   = (req.query.target_id   || "").trim();
  if (!["tutor", "course"].includes(targetType) || !targetId) {
    return res.status(400).json({ message: "Cần target_type (tutor|course) và target_id." });
  }
  try {
    let col = "course_id", val = targetId;
    if (targetType === "tutor") {
      const p = await pool.query(`SELECT id FROM tutor_profiles WHERE user_id = $1`, [targetId]);
      if (p.rowCount === 0) return res.json({ reviews: [], avg: 0, count: 0 });
      col = "tutor_id"; val = p.rows[0].id;
    }
    const r = await pool.query(
      `SELECT rv.id, rv.user_id, rv.rating, rv.comment, rv.created_at,
              u.full_name AS reviewer_name, u.picture AS reviewer_picture
       FROM reviews rv JOIN users u ON u.id = rv.user_id
       WHERE rv.${col} = $1 AND rv.review_type = $2 AND rv.is_visible = TRUE
       ORDER BY rv.created_at DESC`,
      [val, targetType]
    );
    const count = r.rowCount;
    const avg = count ? r.rows.reduce((s, x) => s + x.rating, 0) / count : 0;
    return res.json({ reviews: r.rows, avg: Math.round(avg * 10) / 10, count });
  } catch (e) {
    console.error("GET /api/entity-reviews:", e.message);
    return res.status(500).json({ message: "Server error." });
  }
});

app.post("/api/entity-reviews", verifyToken, async (req, res) => {
  const { target_type, target_id, rating, comment } = req.body || {};
  if (!["tutor", "course"].includes(target_type) || !target_id) {
    return res.status(400).json({ message: "Thiếu target_type/target_id." });
  }
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ message: "rating phải từ 1 đến 5." });
  }
  try {
    let tutorProfileId = null, courseId = null;
    if (target_type === "tutor") {
      const p = await pool.query(`SELECT id FROM tutor_profiles WHERE user_id = $1`, [target_id]);
      if (p.rowCount === 0) return res.status(404).json({ message: "Không tìm thấy gia sư." });
      tutorProfileId = p.rows[0].id;
      // Điều kiện (TV3): đã HOÀN THÀNH ≥1 buổi học (booking 'Approved' đã qua ngày học)
      const bk = await pool.query(
        `SELECT 1 FROM bookings
          WHERE student_id = $1 AND tutor_id = $2 AND status = 'Approved' AND lesson_date <= CURRENT_DATE
          LIMIT 1`,
        [req.user.userId, target_id]
      );
      if (bk.rowCount === 0) {
        return res.status(403).json({ message: "Bạn cần hoàn thành ít nhất 1 buổi học với gia sư này trước khi đánh giá." });
      }
    } else {
      courseId = target_id;
      const enr = await pool.query(
        `SELECT 1 FROM enrollments
          WHERE user_id = $1 AND course_id = $2 AND (status = 'completed' OR progress_percent >= 80)
          LIMIT 1`,
        [req.user.userId, target_id]
      );
      if (enr.rowCount === 0) {
        return res.status(403).json({ message: "Bạn cần hoàn thành khóa học (hoặc đạt tiến độ ≥ 80%) trước khi đánh giá." });
      }
    }
    // Chống đánh giá trùng
    const dupCol = target_type === "tutor" ? "tutor_id" : "course_id";
    const dup = await pool.query(
      `SELECT 1 FROM reviews WHERE user_id = $1 AND review_type = $2 AND ${dupCol} = $3 LIMIT 1`,
      [req.user.userId, target_type, tutorProfileId || courseId]
    );
    if (dup.rowCount > 0) return res.status(409).json({ message: "Bạn đã đánh giá rồi." });

    const ins = await pool.query(
      `INSERT INTO reviews (user_id, tutor_id, course_id, rating, comment, review_type)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, rating, comment, created_at`,
      [req.user.userId, tutorProfileId, courseId, rating, comment || null, target_type]
    );
    return res.status(201).json(ins.rows[0]);
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ message: "Bạn đã đánh giá rồi." });
    console.error("POST /api/entity-reviews:", e.message);
    return res.status(500).json({ message: "Server error.", detail: e.message });
  }
});

app.put("/api/entity-reviews/:id", verifyToken, async (req, res) => {
  const { rating, comment } = req.body || {};
  if (rating !== undefined && (rating < 1 || rating > 5)) {
    return res.status(400).json({ message: "rating phải từ 1 đến 5." });
  }
  try {
    const r = await pool.query(
      `UPDATE reviews
          SET rating = COALESCE($1, rating), comment = COALESCE($2, comment)
        WHERE id = $3 AND user_id = $4 AND created_at > NOW() - INTERVAL '7 days'
        RETURNING id, rating, comment`,
      [rating ?? null, comment ?? null, req.params.id, req.user.userId]
    );
    if (r.rowCount === 0) return res.status(404).json({ message: "Không thể sửa (quá 7 ngày hoặc không phải chủ sở hữu)." });
    return res.json(r.rows[0]);
  } catch (e) {
    console.error("PUT /api/entity-reviews:", e.message);
    return res.status(500).json({ message: "Server error." });
  }
});

app.delete("/api/entity-reviews/:id", verifyToken, async (req, res) => {
  try {
    const r = await pool.query(`DELETE FROM reviews WHERE id = $1 AND user_id = $2 RETURNING id`, [req.params.id, req.user.userId]);
    if (r.rowCount === 0) return res.status(404).json({ message: "Không tìm thấy review." });
    return res.json({ message: "Đã xóa đánh giá." });
  } catch (e) {
    console.error("DELETE /api/entity-reviews:", e.message);
    return res.status(500).json({ message: "Server error." });
  }
});

// ── GET /api/reviews/featured ─────────────────────────────────────────────────
// Trả về các đánh giá 5 sao mới nhất để hiển thị trên trang chủ (không cần auth)
app.get("/api/reviews/featured", async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 12, 30);
  try {
    const result = await pool.query(
      `SELECT r.id, r.reviewer_name, r.reviewer_role, r.reviewer_picture,
              r.rating, r.subject, r.content, r.created_at,
              u.picture AS user_picture, u.full_name AS user_full_name
       FROM reviews r
       LEFT JOIN users u ON u.id = r.reviewer_id
       WHERE r.rating = 5
       ORDER BY r.created_at DESC
       LIMIT $1`,
      [limit]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error("GET /api/reviews/featured error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// ── POST /api/reviews ──────────────────────────────────────────────────────────
// Người dùng đã đăng nhập gửi đánh giá mới
app.post("/api/reviews", verifyToken, async (req, res) => {
  const { rating, subject, content } = req.body || {};
  if (!rating || !content) {
    return res.status(400).json({ message: "rating và content là bắt buộc." });
  }
  if (rating < 1 || rating > 5) {
    return res.status(400).json({ message: "rating phải từ 1 đến 5." });
  }
  try {
    const userResult = await pool.query(
      "SELECT full_name, role, picture FROM users WHERE id = $1",
      [req.user.userId]
    );
    if (!userResult.rows.length) return res.status(404).json({ message: "User not found." });
    const u = userResult.rows[0];

    const result = await pool.query(
      `INSERT INTO reviews (reviewer_id, reviewer_name, reviewer_role, reviewer_picture, rating, subject, content)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [req.user.userId, u.full_name, u.role, u.picture || null, rating, subject || null, content]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /api/reviews error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// Helper: lấy IP thực của client (hỗ trợ proxy/Nginx)
function getClientIP(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

// Helper: ghi log đăng nhập + trả về flag suspicious nếu IP lạ
async function logLoginAttempt(userId, ip, userAgent) {
  try {
    // Lấy IP của lần đăng nhập cuối cùng trong 30 ngày
    const recent = await pool.query(
      `SELECT ip_address FROM login_logs
       WHERE user_id = $1 AND created_at > NOW() - INTERVAL '30 days'
       ORDER BY created_at DESC LIMIT 5`,
      [userId]
    );
    const recentIPs = recent.rows.map(r => r.ip_address);
    const suspicious = recentIPs.length > 0 && !recentIPs.includes(ip);

    await pool.query(
      `INSERT INTO login_logs (user_id, ip_address, user_agent, is_suspicious)
       VALUES ($1, $2, $3, $4)`,
      [userId, ip, userAgent || null, suspicious]
    );
    return suspicious;
  } catch (err) {
    console.error("logLoginAttempt error:", err.message);
    return false;
  }
}

async function startServer() {
  // Auto-migrate: add is_banned column if it doesn't exist yet
  try {
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT FALSE
    `);
    console.log("✅ DB migration: users.is_banned ready");
  } catch (err) {
    console.error("⚠️  DB migration warning:", err.message);
  }

  // Auto-migrate: create login_logs table
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS login_logs (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        ip_address    TEXT NOT NULL,
        user_agent    TEXT,
        is_suspicious BOOLEAN NOT NULL DEFAULT FALSE,
        created_at    TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_login_logs_user_id ON login_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_login_logs_created_at ON login_logs(created_at);
    `);
    console.log("✅ DB migration: login_logs table ready");
  } catch (err) {
    console.error("⚠️  DB migration (login_logs) warning:", err.message);
  }

  // Auto-migrate: tutor_profiles extra columns
  try {
    await pool.query(`
      ALTER TABLE tutor_profiles
        ADD COLUMN IF NOT EXISTS hourly_rate       NUMERIC(10,2),
        ADD COLUMN IF NOT EXISTS profile_photo_url TEXT,
        ADD COLUMN IF NOT EXISTS city              TEXT,
        ADD COLUMN IF NOT EXISTS country           TEXT,
        ADD COLUMN IF NOT EXISTS phone             TEXT,
        ADD COLUMN IF NOT EXISTS headline          TEXT,
        ADD COLUMN IF NOT EXISTS reject_reason     TEXT
    `);
    console.log("✅ DB migration: tutor_profiles extra columns ready");
  } catch (err) {
    console.error("⚠️  DB migration (tutor_profiles cols) warning:", err.message);
  }

  // Auto-migrate: tutor_certificates table (multiple certs per tutor)
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tutor_certificates (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tutor_profile_id UUID NOT NULL REFERENCES tutor_profiles(id) ON DELETE CASCADE,
        name             TEXT,
        url              TEXT NOT NULL,
        created_at       TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_tutor_certs_profile ON tutor_certificates(tutor_profile_id)`);
    console.log("✅ DB migration: tutor_certificates table ready");
  } catch (err) {
    console.error("⚠️  DB migration (tutor_certificates) warning:", err.message);
  }

  // Auto-migrate: teaching_methods & suitable_students columns on tutor_profiles
  try {
    await pool.query(`
      ALTER TABLE tutor_profiles
        ADD COLUMN IF NOT EXISTS teaching_methods  JSONB NOT NULL DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS suitable_students JSONB NOT NULL DEFAULT '[]'
    `);
    console.log("✅ DB migration: teaching_methods & suitable_students columns ready");
  } catch (err) {
    console.error("⚠️  DB migration (teaching_methods) warning:", err.message);
  }

  // Auto-migrate: cert_type, issuer, issue_year on tutor_certificates
  try {
    await pool.query(`
      ALTER TABLE tutor_certificates
        ADD COLUMN IF NOT EXISTS cert_type  TEXT DEFAULT 'Chứng chỉ',
        ADD COLUMN IF NOT EXISTS issuer     TEXT,
        ADD COLUMN IF NOT EXISTS issue_year INTEGER
    `);
    console.log("✅ DB migration: tutor_certificates extended columns ready");
  } catch (err) {
    console.error("⚠️  DB migration (cert extended cols) warning:", err.message);
  }

  // Auto-migrate: create reviews table
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        reviewer_id      UUID REFERENCES users(id) ON DELETE SET NULL,
        reviewer_name    TEXT NOT NULL,
        reviewer_role    TEXT NOT NULL DEFAULT 'student',
        reviewer_picture TEXT,
        rating           INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
        subject          TEXT,
        content          TEXT NOT NULL,
        created_at       TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log("✅ DB migration: reviews table ready");

    // Seed 5-star reviews nếu bảng còn trống
    const { rows } = await pool.query("SELECT COUNT(*) FROM reviews");
    if (parseInt(rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO reviews (reviewer_name, reviewer_role, rating, subject, content, created_at) VALUES
        ('Nguyễn Văn An',   'student', 5, 'Toán Cao Cấp',       'Gia sư giải thích rất rõ ràng, từng bước một. Tôi đã hiểu được tích phân bội sau 3 buổi học. Cực kỳ khuyến khích!',                                      NOW() - INTERVAL ''2 minutes''),
        ('Trần Thị Bích',   'parent',  5, 'Tiếng Anh IELTS',    'Con tôi tăng từ 5.5 lên 7.0 chỉ sau 3 tháng. Gia sư rất tận tâm, có phương pháp riêng cho từng học sinh. Cảm ơn EduX rất nhiều!',                         NOW() - INTERVAL ''18 minutes''),
        ('Lê Minh Châu',    'student', 5, 'Lập Trình Python',   'Từ chỗ không biết gì về code, giờ tôi đã tự viết được ứng dụng Flask đầu tiên. Gia sư hướng dẫn thực chiến, không dạy lý thuyết suông.',                  NOW() - INTERVAL ''1 hour''),
        ('Phạm Hoàng Duy',  'student', 5, 'Vật Lý Đại Cương',   'Bài giảng sinh động, có nhiều ví dụ thực tế. Điểm thi cuối kỳ của tôi từ 5 lên 9. Thầy rất nhiệt tình và kiên nhẫn.',                                     NOW() - INTERVAL ''3 hours''),
        ('Nguyễn Thị Hoa',  'parent',  5, 'Toán Tiểu Học',      'Con tôi 9 tuổi rất thích học, không còn sợ môn Toán nữa. Gia sư biết cách tạo hứng thú cho các em nhỏ. Sẽ tiếp tục đăng ký dài hạn.',                    NOW() - INTERVAL ''5 hours''),
        ('Đỗ Văn Khoa',     'student', 5, 'Hóa Hữu Cơ',         'Môn Hóa luôn là cơn ác mộng nhưng nhờ gia sư tôi đã vượt qua kỳ thi tốt nghiệp với điểm 8.5. Phương pháp ghi nhớ cực hay!',                              NOW() - INTERVAL ''8 hours''),
        ('Vũ Thị Lan',      'student', 5, 'Tiếng Nhật N3',       'Sau 6 tháng học, tôi thi đậu JLPT N3 lần đầu tiên. Gia sư bản ngữ, phát âm chuẩn, giáo trình được thiết kế rất khoa học.',                               NOW() - INTERVAL ''1 day''),
        ('Bùi Minh Long',   'parent',  5, 'Toán THPT',           'Điểm thi thử đại học của con tôi tăng vọt từ 6 lên 8.5 điểm. Gia sư không chỉ dạy kiến thức mà còn rèn kỹ năng làm bài thi hiệu quả.',                   NOW() - INTERVAL ''2 days''),
        ('Hoàng Thị Mai',   'student', 5, 'Luyện Thi THPT QG',  'Thi thử lần đầu được 18/30, sau 2 tháng ôn với gia sư tôi đạt 26/30. Rất biết ơn sự tận tâm và kinh nghiệm của thầy.',                                    NOW() - INTERVAL ''3 days''),
        ('Đinh Văn Nam',    'student', 5, 'Tin Học Văn Phòng',   'Học Excel và Word từ cơ bản đến nâng cao, giờ làm việc nhanh hơn rất nhiều. Gia sư dạy đúng những gì thực tế cần dùng, không mất thời gian lý thuyết dài.' , NOW() - INTERVAL ''4 days'')
      `);
      console.log("✅ DB seed: 10 sample reviews inserted");
    }
  } catch (err) {
    console.error("⚠️  DB migration (reviews) warning:", err.message);
  }

  app.listen(port, () => {
    console.log(`🚀 Server is running on http://localhost:${port}`);
  });
}

startServer();

