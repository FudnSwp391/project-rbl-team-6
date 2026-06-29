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
const crypto = require("crypto");
const moment = require("moment");
const querystring = require("qs");

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 5000);
const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
const googleClientId = process.env.GOOGLE_CLIENT_ID || "";
const jwtSecret = process.env.JWT_SECRET || "dev_jwt_secret_change_me";
const googleClient = new OAuth2Client(googleClientId);

// ─── Middleware ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
app.use(cors({ origin: frontendOrigin }));
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));

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

const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

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
      `SELECT u.id, u.full_name, u.email, u.password_hash, u.role, u.picture,
              tp.status AS tutor_status
       FROM users u
       LEFT JOIN tutor_profiles tp ON tp.user_id = u.id
       WHERE u.email = $1`,
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
        tutor_status: user.role === 'tutor' ? (user.tutor_status || null) : undefined,
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

// PUT /api/tutor/availability
app.put("/api/tutor/availability", verifyToken, async (req, res) => {
  try {
    const { availability } = req.body;
    await pool.query(
      "UPDATE tutor_profiles SET availability = $1 WHERE user_id = $2",
      [availability, req.user.userId]
    );
    return res.json({ message: "Availability updated successfully." });
  } catch (error) {
    console.error("PUT /api/tutor/availability error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});


// GET /api/tutors/:id/availability — public endpoint for BookingCalendar
app.get("/api/tutors/:id/availability", async (req, res) => {
  try {
    const tutorId = req.params.id;
    const { from, to } = req.query; // date range: YYYY-MM-DD

    // Get availability from tutor_profiles (try both user_id and profile id)
    let result = await pool.query(
      "SELECT availability FROM tutor_profiles WHERE user_id = $1 LIMIT 1",
      [tutorId]
    );
    if (!result.rows.length) {
      result = await pool.query(
        "SELECT availability FROM tutor_profiles WHERE id::text = $1 LIMIT 1",
        [tutorId]
      );
    }

    const availability = result.rows.length ? (result.rows[0].availability || {}) : {};

    // Get booked slots for the date range
    let bookedSlots = {};
    if (from && to) {
      const bookingsResult = await pool.query(
        `SELECT lesson_date, time_slot, status
         FROM bookings
         WHERE tutor_id = $1
           AND lesson_date >= $2::date
           AND lesson_date <= $3::date
           AND LOWER(status) NOT IN ('cancelled', 'declined')
         ORDER BY lesson_date, time_slot`,
        [tutorId, from, to]
      );
      for (const row of bookingsResult.rows) {
        const dateKey = String(row.lesson_date).slice(0, 10);
        if (!bookedSlots[dateKey]) bookedSlots[dateKey] = [];
        bookedSlots[dateKey].push({ timeSlot: row.time_slot, status: row.status });
      }
    }

    return res.json({ availability, bookedSlots });
  } catch (error) {
    console.error("GET /api/tutors/:id/availability error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

// POST /api/tutor/presigned-url
app.post("/api/tutor/presigned-url", verifyToken, async (req, res) => {
  try {
    const { filename, bucket } = req.body;
    if (!filename) return res.status(400).json({ message: "filename is required." });
    
    const targetBucket = bucket || 'tutor-documents';
    const ext = filename.split('.').pop();
    const safePath = `${req.user.userId}_${Date.now()}.${ext}`;

    const { data, error } = await supabaseAdmin.storage
      .from(targetBucket)
      .createSignedUploadUrl(safePath);

    if (error) {
      console.error("Supabase sign error:", error);
      return res.status(500).json({ message: "Lỗi cấu hình Storage." });
    }
    
    return res.json({ 
      signedUrl: data.signedUrl, 
      path: data.path,
      publicUrl: `${SUPABASE_URL}/storage/v1/object/public/${targetBucket}/${data.path}`
    });
  } catch (error) {
    console.error("Presigned URL error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

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

// Upload profile data (JSON based)
app.post(
  "/api/tutor/profile",
  verifyToken,
  async (req, res) => {
    try {
      const {
        bio, subjects, experience_years,
        first_name, last_name, display_name,
        birthday, gender, country, city, phone,
        education, language, hourly_rate,
        teaching_style, qualifications,
        teaching_methods, suitable_students, cert_metadata,
        certificate_urls,
        profile_photo_url, cccd_url, cccd_front_url, cccd_back_url
      } = req.body;
      const userId = req.user.userId;

      let parsedTeachingMethods = [];
      let parsedSuitableStudents = [];
      let parsedCertMetadata = [];
      let parsedCertUrls = [];
      try { parsedTeachingMethods = JSON.parse(teaching_methods || '[]'); } catch {}
      try { parsedSuitableStudents = JSON.parse(suitable_students || '[]'); } catch {}
      try { parsedCertMetadata = JSON.parse(cert_metadata || '[]'); } catch {}
      try { parsedCertUrls = JSON.parse(certificate_urls || '[]'); } catch {}

      let photoPath    = profile_photo_url || null;
      // cccd_front_url ưu tiên hơn cccd_url (legacy 1-ảnh)
      let cccdPath     = cccd_front_url || cccd_url || null;
      let cccdBackPath = cccd_back_url  || null;

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
        if (photoPath)   { query += `, profile_photo_url = $${idx}`; values.push(photoPath);   idx++; }
        if (cccdPath)    { query += `, cccd_url = $${idx}`;          values.push(cccdPath);    idx++; }
        if (cccdBackPath){ query += `, cccd_back_url = $${idx}`;     values.push(cccdBackPath); idx++; }

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
            profile_photo_url, cccd_url, cccd_back_url,
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
            photoPath, cccdPath, cccdBackPath,
          ]
        );
      }

      // Update user role to tutor if they are student or parent
      try {
        await pool.query(
          "UPDATE users SET role = 'tutor' WHERE id = $1 AND role != 'admin'",
          [userId]
        );
      } catch (roleErr) {
        console.warn("[Profile] role update skipped:", roleErr.message);
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

      // Insert certificates — dùng certificate_urls (URLs đã upload sẵn từ frontend)
      if (parsedCertUrls.length > 0) {
        const profileId = result.rows[0].id;
        try {
          await pool.query("DELETE FROM tutor_certificates WHERE tutor_profile_id = $1", [profileId]);
        } catch (delErr) {
          console.warn("[Profile] delete old certs skipped:", delErr.message);
        }
        for (let i = 0; i < parsedCertUrls.length; i++) {
          const certUrl = parsedCertUrls[i];
          const meta = parsedCertMetadata[i] || {};
          try {
            await pool.query(
              "INSERT INTO tutor_certificates (tutor_profile_id, name, url, cert_type, issuer, issue_year) VALUES ($1, $2, $3, $4, $5, $6)",
              [
                profileId,
                meta.name || `Chứng chỉ ${i + 1}`,
                certUrl,
                meta.cert_type || 'Chứng chỉ',
                meta.issuer || null,
                meta.year ? parseInt(meta.year) : null
              ]
            );
          } catch (certExtErr) {
            // Fallback: insert tối giản nếu các cột mở rộng chưa tồn tại
            try {
              await pool.query(
                "INSERT INTO tutor_certificates (tutor_profile_id, name, url) VALUES ($1, $2, $3)",
                [profileId, meta.name || `Chứng chỉ ${i + 1}`, certUrl]
              );
            } catch (fallbackErr) {
              console.warn("[Profile] cert insert fallback also failed:", fallbackErr.message);
            }
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
    
    // Extract filename if path is a full public URL
    let cleanPath = path;
    if (path.startsWith('http://') || path.startsWith('https://')) {
      const parts = path.split('/');
      cleanPath = parts[parts.length - 1];
    }
    
    // Convert path to signed URL via Supabase Storage REST API
    const signedUrl = await createSignedUrl(cleanPath);
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
        tp.certificate_url, tp.cccd_url, tp.cccd_back_url, tp.status, tp.reject_reason,
        tp.created_at, tp.profile_photo_url, tp.hourly_rate,
        tp.teaching_methods, tp.suitable_students,
        tp.first_name, tp.last_name, tp.display_name,
        tp.birthday, tp.gender, tp.country, tp.city, tp.phone,
        tp.education, tp.language, tp.teaching_style, tp.qualifications,
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

// POST /api/admin/tutors/:id/release-hold — Admin thủ công nhả cọc cho gia sư
app.post("/api/admin/tutors/:id/release-hold", verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // id này có thể là profile id hoặc user_id, ta check cả hai
    const profileRes = await client.query('SELECT user_id FROM tutor_profiles WHERE id=$1 OR user_id=$1 LIMIT 1', [id]);
    if (!profileRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: "Không tìm thấy gia sư." });
    }
    const userId = profileRes.rows[0].user_id;

    const walletRes = await client.query('SELECT id, held_balance FROM wallets WHERE user_id=$1', [userId]);
    if (!walletRes.rows.length || Number(walletRes.rows[0].held_balance) === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: "Gia sư không có tiền trong ví cọc ảo." });
    }

    const heldAmount = Number(walletRes.rows[0].held_balance);
    await client.query('UPDATE wallets SET balance = balance + held_balance, held_balance = 0 WHERE id=$1', [walletRes.rows[0].id]);
    
    await client.query(`
      INSERT INTO notifications (user_id, type, title, body, icon, ref_id, ref_type)
      VALUES ($1,'hold_released','Admin đã nhả cọc',$2,'verified_user',$1,'system')
    `, [userId, `Admin đã thủ công nhả ${heldAmount.toLocaleString('vi-VN')}đ tiền cọc vào số dư khả dụng của bạn.`]);

    await client.query('COMMIT');
    return res.json({ success: true, message: "Đã nhả cọc thành công." });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Release hold error:", err);
    return res.status(500).json({ message: "Server error." });
  } finally {
    client.release();
  }
});

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
        tp.certificate_url, tp.cccd_url, tp.cccd_back_url, tp.status, tp.reject_reason,
        tp.created_at, tp.profile_photo_url, tp.hourly_rate,
        tp.teaching_methods, tp.suitable_students,
        tp.first_name, tp.last_name, tp.display_name,
        tp.birthday, tp.gender, tp.country, tp.city, tp.phone,
        tp.education, tp.language, tp.teaching_style, tp.qualifications,
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

    const walletRes = await pool.query(
      `SELECT balance, held_balance FROM wallets WHERE user_id = $1 LIMIT 1`,
      [id]
    );
    user.wallet = walletRes.rows[0] || { balance: 0, held_balance: 0 };

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
    const userId = req.user.userId;
    let result;

    if (role === 'student') {
      result = await pool.query(`
        SELECT DISTINCT u.id, u.full_name, u.email, u.picture, u.role,
               tp.headline, tp.subjects, tp.hourly_rate
        FROM users u
        LEFT JOIN tutor_profiles tp ON tp.user_id = u.id
        WHERE 
          (u.role = 'tutor' AND tp.status = 'approved' AND u.id IN (
            SELECT c.tutor_id FROM classes c JOIN class_members cm ON c.id = cm.class_id WHERE cm.student_id = $1
            UNION
            SELECT crs.tutor_id FROM courses crs JOIN course_enrollments ce ON crs.id = ce.course_id WHERE ce.student_id = $1
          ))
          OR
          (u.role = 'parent' AND u.id IN (
            SELECT parent_id FROM parent_children WHERE student_id = $1
          ))
        ORDER BY u.full_name
      `, [userId]);
    } else if (role === 'parent') {
      result = await pool.query(`
        SELECT DISTINCT u.id, u.full_name, u.email, u.picture, u.role,
               tp.headline, tp.subjects, tp.hourly_rate
        FROM users u
        LEFT JOIN tutor_profiles tp ON tp.user_id = u.id
        WHERE 
          (u.role = 'student' AND u.id IN (
            SELECT student_id FROM parent_children WHERE parent_id = $1
          ))
          OR
          (u.role = 'tutor' AND tp.status = 'approved' AND u.id IN (
            SELECT c.tutor_id FROM classes c 
            JOIN class_members cm ON c.id = cm.class_id 
            JOIN parent_children pc ON cm.student_id = pc.student_id 
            WHERE pc.parent_id = $1
            UNION
            SELECT crs.tutor_id FROM courses crs JOIN course_enrollments ce ON crs.id = ce.course_id JOIN parent_children pc ON ce.student_id = pc.student_id WHERE pc.parent_id = $1
          ))
        ORDER BY u.full_name
      `, [userId]);
    } else if (role === 'tutor') {
      result = await pool.query(`
        SELECT DISTINCT u.id, u.full_name, u.email, u.picture, u.role
        FROM users u
        WHERE 
          (u.role = 'student' AND u.id IN (
            SELECT cm.student_id FROM class_members cm JOIN classes c ON c.id = cm.class_id WHERE c.tutor_id = $1
            UNION
            SELECT ce.student_id FROM course_enrollments ce JOIN courses crs ON ce.course_id = crs.id WHERE crs.tutor_id = $1
          ))
          OR
          (u.role = 'parent' AND u.id IN (
            SELECT pc.parent_id FROM parent_children pc 
            JOIN class_members cm ON pc.student_id = cm.student_id
            JOIN classes c ON c.id = cm.class_id
            WHERE c.tutor_id = $1
            UNION
            SELECT pc.parent_id FROM parent_children pc JOIN course_enrollments ce ON pc.student_id = ce.student_id JOIN courses crs ON ce.course_id = crs.id WHERE crs.tutor_id = $1
          ))
        ORDER BY u.full_name
      `, [userId]);
    } else {
      result = { rows: [] };
    }
    return res.json({ contacts: result.rows });
  } catch (e) { console.error(e); res.status(500).json({ message: 'Server error.' }); }
});

async function checkChatPermission(userId, userRole, otherId) {
  if (userRole === 'admin') return true; // admin can chat with anyone
  // For simplicity, we just check if otherId is in the allowed contacts list.
  // This isn't the most efficient (fetches full list) but it's safe and DRY enough for now.
  let allowed = false;
  if (userRole === 'student') {
    const res = await pool.query(`
      SELECT 1 FROM users u WHERE u.id = $2 AND (
        (u.role = 'tutor' AND u.id IN (
           SELECT c.tutor_id FROM classes c JOIN class_members cm ON c.id = cm.class_id WHERE cm.student_id = $1
           UNION
           SELECT crs.tutor_id FROM courses crs JOIN course_enrollments ce ON crs.id = ce.course_id WHERE ce.student_id = $1
        ))
        OR
        (u.role = 'parent' AND u.id IN (SELECT parent_id FROM parent_children WHERE student_id = $1))
      )
    `, [userId, otherId]);
    allowed = res.rowCount > 0;
  } else if (userRole === 'parent') {
    const res = await pool.query(`
      SELECT 1 FROM users u WHERE u.id = $2 AND (
        (u.role = 'student' AND u.id IN (SELECT student_id FROM parent_children WHERE parent_id = $1))
        OR
        (u.role = 'tutor' AND u.id IN (
           SELECT c.tutor_id FROM classes c JOIN class_members cm ON c.id = cm.class_id JOIN parent_children pc ON cm.student_id = pc.student_id WHERE pc.parent_id = $1
           UNION
           SELECT crs.tutor_id FROM courses crs JOIN course_enrollments ce ON crs.id = ce.course_id JOIN parent_children pc ON ce.student_id = pc.student_id WHERE pc.parent_id = $1
        ))
      )
    `, [userId, otherId]);
    allowed = res.rowCount > 0;
  } else if (userRole === 'tutor') {
    const res = await pool.query(`
      SELECT 1 FROM users u WHERE u.id = $2 AND (
        (u.role = 'student' AND u.id IN (
           SELECT cm.student_id FROM class_members cm JOIN classes c ON c.id = cm.class_id WHERE c.tutor_id = $1
           UNION
           SELECT ce.student_id FROM course_enrollments ce JOIN courses crs ON ce.course_id = crs.id WHERE crs.tutor_id = $1
        ))
        OR
        (u.role = 'parent' AND u.id IN (
           SELECT pc.parent_id FROM parent_children pc JOIN class_members cm ON pc.student_id = cm.student_id JOIN classes c ON c.id = cm.class_id WHERE c.tutor_id = $1
           UNION
           SELECT pc.parent_id FROM parent_children pc JOIN course_enrollments ce ON pc.student_id = ce.student_id JOIN courses crs ON ce.course_id = crs.id WHERE crs.tutor_id = $1
        ))
      )
    `, [userId, otherId]);
    allowed = res.rowCount > 0;
  }
  return allowed;
}

// GET /api/chat/:otherId — lịch sử tin nhắn + đánh dấu đã đọc
app.get('/api/chat/:otherId', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    const { otherId } = req.params;

    const allowed = await checkChatPermission(userId, userRole, otherId);
    if (!allowed) {
      return res.status(403).json({ message: 'Bạn không có quyền nhắn tin với người dùng này.' });
    }

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
    
    const userRole = req.user.role;
    const allowed = await checkChatPermission(senderId, userRole, receiver_id);
    if (!allowed) {
      return res.status(403).json({ message: 'Bạn không có quyền nhắn tin với người dùng này.' });
    }

    const receiver = await pool.query(`SELECT id FROM users WHERE id=$1`, [receiver_id]);
    if (!receiver.rows.length) return res.status(404).json({ message: 'Người nhận không tồn tại.' });
    const msg = await pool.query(
      `INSERT INTO chat_messages (sender_id, receiver_id, content, msg_type)
       VALUES ($1,$2,$3,'text') RETURNING *`,
      [senderId, receiver_id, content.trim()]
    );

    // Thêm thông báo cho người nhận
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, body, icon, ref_id, ref_type)
       VALUES ($1, 'new_message', $2, $3, 'chat', $4, 'chat')`,
      [receiver_id, `Tin nhắn mới từ ${req.user.name || 'một người dùng'}`, content.trim(), senderId]
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

    const userRole = req.user.role;
    const allowed = await checkChatPermission(senderId, userRole, receiver_id);
    if (!allowed) {
      return res.status(403).json({ message: 'Bạn không có quyền nhắn tin với người dùng này.' });
    }

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

    // Thêm thông báo cho người nhận
    let bodyText = 'Đã gửi một tệp đính kèm';
    if (msgType === 'image') bodyText = 'Đã gửi một hình ảnh';
    if (msgType === 'video') bodyText = 'Đã gửi một video';

    await pool.query(
      `INSERT INTO notifications (user_id, type, title, body, icon, ref_id, ref_type)
       VALUES ($1, 'new_message', $2, $3, 'chat', $4, 'chat')`,
      [receiver_id, `Tin nhắn mới từ ${req.user.name || 'một người dùng'}`, bodyText, senderId]
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
    if (err.code !== 'ENOTFOUND' && err.code !== 'EAI_AGAIN') {
      console.error('Error cleaning up practice sessions:', err.message || err);
    }
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

// GET /api/reviews/featured
app.get("/api/reviews/featured", async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 12, 30);
  try {
    const result = await pool.query(
      `SELECT r.id, r.rating, r.comment AS content, r.review_type, r.created_at,
              u.full_name AS reviewer_name, u.role AS reviewer_role, u.picture AS reviewer_picture,
              u.picture AS user_picture
       FROM reviews r
       LEFT JOIN users u ON u.id = r.user_id
       WHERE r.rating = 5 AND r.is_visible = true
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



// ── GET /api/courses ──────────────────────────────────────────────────────────
// Lấy danh sách khóa học cho marketplace
app.get("/api/courses", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, u.full_name AS tutor_name, u.picture AS tutor_picture 
       FROM courses c
       JOIN users u ON c.tutor_id = u.id
       WHERE c.status = 'approved' OR c.status = 'published' OR c.status = 'active'
       ORDER BY c.created_at DESC`
    );
    return res.json(result.rows);
  } catch (err) {
    console.error("GET /api/courses error:", err);
    return res.status(500).json({ message: "Server error." });
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
         tp.headline, tp.teaching_methods, tp.suitable_students, tp.availability,
         COALESCE(tp.total_students, 0) AS total_students,
         COALESCE(
           (SELECT ROUND(AVG(r.rating)::numeric, 1) FROM reviews r WHERE r.tutor_id = u.id),
           0
         ) AS avg_r,
         COALESCE(
           (SELECT COUNT(*) FROM reviews r WHERE r.tutor_id = u.id),
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

// ── GET /api/courses (TV3) — danh sách khóa học published + lọc ──────────────
app.get("/api/courses", async (req, res) => {
  const { search = "", subject = "", level = "", sort = "newest", min_rating = "" } = req.query;
  const cond = ["c.status = 'published'"]; const vals = []; let i = 1;
  if (search.trim())  { cond.push(`(c.title ILIKE $${i} OR c.description ILIKE $${i} OR c.subject ILIKE $${i})`); vals.push(`%${search.trim()}%`); i++; }
  if (subject.trim()) { cond.push(`c.subject ILIKE $${i}`); vals.push(`%${subject.trim()}%`); i++; }
  if (level.trim())   { cond.push(`c.level ILIKE $${i}`);   vals.push(`%${level.trim()}%`); i++; }
  if (min_rating && !isNaN(min_rating)) { cond.push(`c.avg_rating >= $${i}`); vals.push(Number(min_rating)); i++; }
  const order = { price_asc: "c.price ASC", price_desc: "c.price DESC", rating: "c.avg_rating DESC NULLS LAST", newest: "c.created_at DESC" }[sort] || "c.created_at DESC";
  try {
    const r = await pool.query(
      `SELECT c.id, c.title, c.description, c.subject, c.level, c.thumbnail_url,
              c.price, c.original_price, c.avg_rating, c.review_count, c.total_lessons, c.created_at
       FROM courses c WHERE ${cond.join(" AND ")} ORDER BY ${order} LIMIT 60`,
      vals
    );
    return res.json({ courses: r.rows, total: r.rowCount });
  } catch (e) {
    console.error("GET /api/courses:", e.message);
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

    // Fallback (khi chưa cấu hình AI key): xử lý theo từ khóa NHƯNG tự nhiên như chatbot
    const t = prompt.toLowerCase().trim();
    const greetRe  = /^(hi|hello|hey+|chào|xin chào|alo+|hế ?lô|helo|yo)\b|bạn là ai|bạn tên|khoẻ không|khỏe không|cảm ơn|cám ơn|thanks|thank you/i;
    const searchRe = /(gia sư|giáo viên|tìm|dạy|học|môn|lớp|cấp|toán|lý|vật lý|hoá|hóa|văn|ngữ văn|anh|tiếng|ielts|toeic|sinh|sử|địa|tin|lập trình|python|java|online|offline|ôn thi|luyện thi|gia sư)/i;

    // 1) Chào hỏi / trò chuyện → trả lời thân thiện, KHÔNG đổ danh sách gia sư
    if (greetRe.test(t) && !searchRe.test(t)) {
      return res.json({
        success: true, aiUsed: false,
        reply: "Xin chào! 👋 Mình là trợ lý EduX. Bạn cần tìm gia sư môn gì, cấp lớp nào, học online hay offline? Mô tả giúp mình nhé!",
        tutors: [],
      });
    }
    // 2) Không rõ nhu cầu tìm gia sư → hỏi lại, KHÔNG đổ danh sách
    if (!searchRe.test(t)) {
      return res.json({
        success: true, aiUsed: false,
        reply: 'Bạn mô tả nhu cầu học giúp mình nhé — ví dụ: "Gia sư Toán lớp 10 dạy online" — mình sẽ gợi ý gia sư phù hợp.',
        tutors: [],
      });
    }

    // 3) Có nhu cầu tìm gia sư → lọc theo từ khóa
    const method = t.includes("online") ? "online" : t.includes("offline") ? "offline" : null;
    const matchSubject = (x) => (x.subjects || "").toLowerCase().split(/[,;]/)
      .some(s => s.trim() && t.includes(s.trim().toLowerCase()));
    const okMethod = (x) => !method || (Array.isArray(x.teaching_methods) && x.teaching_methods.includes(method));
    const pool2 = all.filter(okMethod);
    const subjHits = pool2.filter(matchSubject);
    const result = (subjHits.length ? subjHits : pool2).slice(0, 3);

    if (result.length === 0) {
      return res.json({
        success: true, aiUsed: false,
        reply: "Mình chưa tìm thấy gia sư khớp tiêu chí. Bạn thử nới điều kiện (giá, hình thức, môn học) xem nhé.",
        tutors: [],
      });
    }
    return res.json({
      success: true, aiUsed: false,
      reply: "Dưới đây là một số gia sư phù hợp với nhu cầu của bạn:",
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

// ════════════════════════════════════════════════════════════════════════════
// ── Đặt lịch học với gia sư (TV3) ────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════
// POST /api/bookings — học sinh tạo yêu cầu đặt lịch (status mặc định 'Pending')
app.post("/api/bookings", verifyToken, async (req, res) => {
  const { tutor_id, tutor_name, subject, lesson_date, time_slot, note } = req.body || {};
  if (!tutor_id || !lesson_date || !time_slot) {
    return res.status(400).json({ message: "Cần chọn gia sư, ngày học và khung giờ." });
  }
  try {
    const t = await pool.query(`SELECT 1 FROM tutor_profiles WHERE user_id = $1 AND status = 'approved'`, [tutor_id]);
    if (t.rowCount === 0) return res.status(400).json({ message: "Gia sư không hợp lệ hoặc chưa được duyệt." });

    const r = await pool.query(
      `INSERT INTO bookings (student_id, tutor_id, tutor_name, subject, lesson_date, time_slot, note, status, booking_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'Pending', 'regular')
       RETURNING id, lesson_date, time_slot, status`,
      [req.user.userId, tutor_id, tutor_name || null, subject || null, lesson_date, time_slot, note || null]
    );
    return res.status(201).json(r.rows[0]);
  } catch (e) {
    console.error("POST /api/bookings:", e.message);
    return res.status(500).json({ message: "Server error.", detail: e.message });
  }
});

// GET /api/bookings — danh sách lịch học của học sinh đang đăng nhập
app.get("/api/bookings", verifyToken, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT b.id, b.tutor_id, b.tutor_name, b.subject, b.lesson_date, b.time_slot,
              b.note, b.status, b.created_at, u.full_name AS tutor_full_name
       FROM bookings b LEFT JOIN users u ON u.id = b.tutor_id
       WHERE b.student_id = $1
       ORDER BY b.lesson_date DESC NULLS LAST, b.created_at DESC`,
      [req.user.userId]
    );
    return res.json(r.rows);
  } catch (e) {
    console.error("GET /api/bookings:", e.message);
    return res.status(500).json({ message: "Server error." });
  }
});

// ── GET /api/reviews/featured ─────────────────────────────────────────────────
// Trả về các đánh giá 5 sao mới nhất để hiển thị trên trang chủ (không cần auth)
app.get("/api/reviews/featured", async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 12, 30);
  try {
    const result = await pool.query(
      `SELECT r.id,
              u.full_name AS reviewer_name,
              u.role      AS reviewer_role,
              u.picture   AS reviewer_picture,
              u.picture   AS user_picture,
              u.full_name AS user_full_name,
              r.rating,
              COALESCE(tu.full_name, c.title) AS subject,
              r.comment   AS content,
              r.created_at
       FROM reviews r
       LEFT JOIN users u           ON u.id  = r.user_id
       LEFT JOIN tutor_profiles tp ON tp.id = r.tutor_id
       LEFT JOIN users tu          ON tu.id = tp.user_id
       LEFT JOIN courses c         ON c.id  = r.course_id
       WHERE r.rating = 5 AND r.is_visible = TRUE AND COALESCE(TRIM(r.comment), '') <> ''
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
  const { rating, content, tutor_id, course_id } = req.body || {};
  if (!rating || !content) {
    return res.status(400).json({ message: "rating và content là bắt buộc." });
  }
  if (rating < 1 || rating > 5) {
    return res.status(400).json({ message: "rating phải từ 1 đến 5." });
  }
  try {
    const result = await pool.query(
      `INSERT INTO reviews (user_id, tutor_id, course_id, rating, comment, review_type, is_visible)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING *`,
      [req.user.userId, tutor_id || null, course_id || null, rating, content, tutor_id ? 'tutor' : 'course']
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

  async function ensureCourseSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS courses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tutor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      subject TEXT,
      level TEXT,
      price INT NOT NULL DEFAULT 0 CHECK (price >= 0),
      thumbnail_url TEXT,
      learning_outcomes JSONB NOT NULL DEFAULT '[]'::jsonb,
      requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
      status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'pending_review', 'published', 'rejected', 'archived')),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await pool.query("ALTER TABLE courses ADD COLUMN IF NOT EXISTS tutor_id UUID REFERENCES users(id) ON DELETE CASCADE");
  await pool.query("ALTER TABLE courses ADD COLUMN IF NOT EXISTS title TEXT");
  await pool.query("ALTER TABLE courses ADD COLUMN IF NOT EXISTS description TEXT");
  await pool.query("ALTER TABLE courses ADD COLUMN IF NOT EXISTS subject TEXT");
  await pool.query("ALTER TABLE courses ADD COLUMN IF NOT EXISTS level TEXT");
  await pool.query("ALTER TABLE courses ADD COLUMN IF NOT EXISTS price INT DEFAULT 0");
  await pool.query("ALTER TABLE courses ADD COLUMN IF NOT EXISTS thumbnail_url TEXT");
  await pool.query("ALTER TABLE courses ADD COLUMN IF NOT EXISTS learning_outcomes JSONB DEFAULT '[]'::jsonb");
  await pool.query("ALTER TABLE courses ADD COLUMN IF NOT EXISTS requirements JSONB DEFAULT '[]'::jsonb");
  await pool.query("ALTER TABLE courses ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft'");
  await pool.query("ALTER TABLE courses ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()");
  await pool.query("ALTER TABLE courses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()");
  await pool.query("UPDATE courses SET status = 'draft' WHERE status IS NULL OR status NOT IN ('draft', 'pending_review', 'published', 'rejected', 'archived')");
  await pool.query("UPDATE courses SET price = 0 WHERE price IS NULL OR price < 0");
  await pool.query("UPDATE courses SET learning_outcomes = '[]'::jsonb WHERE learning_outcomes IS NULL");
  await pool.query("UPDATE courses SET requirements = '[]'::jsonb WHERE requirements IS NULL");
  await pool.query(`
    DO $$
    DECLARE constraint_record RECORD;
    BEGIN
      FOR constraint_record IN
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
        WHERE rel.relname = 'courses'
          AND con.contype = 'c'
          AND att.attname IN ('status', 'price')
      LOOP
        EXECUTE format('ALTER TABLE courses DROP CONSTRAINT IF EXISTS %I', constraint_record.conname);
      END LOOP;
    END $$;
  `);
  await pool.query("ALTER TABLE courses ALTER COLUMN status SET DEFAULT 'draft'");
  await pool.query("ALTER TABLE courses ALTER COLUMN price SET DEFAULT 0");
  await pool.query("ALTER TABLE courses ADD CONSTRAINT courses_status_check CHECK (status IN ('draft', 'pending_review', 'published', 'rejected', 'archived'))");
  await pool.query("ALTER TABLE courses ADD CONSTRAINT courses_price_check CHECK (price >= 0)");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS course_lessons (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      video_url TEXT,
      material_url TEXT,
      duration_label TEXT,
      is_preview BOOLEAN NOT NULL DEFAULT false,
      position INT NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await pool.query("ALTER TABLE course_lessons ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE CASCADE");
  await pool.query("ALTER TABLE course_lessons ADD COLUMN IF NOT EXISTS title TEXT");
  await pool.query("ALTER TABLE course_lessons ADD COLUMN IF NOT EXISTS description TEXT");
  await pool.query("ALTER TABLE course_lessons ADD COLUMN IF NOT EXISTS video_url TEXT");
  await pool.query("ALTER TABLE course_lessons ADD COLUMN IF NOT EXISTS material_url TEXT");
  await pool.query("ALTER TABLE course_lessons ADD COLUMN IF NOT EXISTS duration_label TEXT");
  await pool.query("ALTER TABLE course_lessons ADD COLUMN IF NOT EXISTS is_preview BOOLEAN DEFAULT false");
  await pool.query("ALTER TABLE course_lessons ADD COLUMN IF NOT EXISTS position INT DEFAULT 1");
  await pool.query("ALTER TABLE course_lessons ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()");
  await pool.query("ALTER TABLE course_lessons ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS course_enrollments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      student_name TEXT,
      child_name TEXT,
      status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'refunded', 'cancelled')),
      purchased_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(course_id, student_id)
    );
  `);
  await pool.query("ALTER TABLE course_enrollments ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE CASCADE");
  await pool.query("ALTER TABLE course_enrollments ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES users(id) ON DELETE CASCADE");
  await pool.query("ALTER TABLE course_enrollments ADD COLUMN IF NOT EXISTS student_name TEXT");
  await pool.query("ALTER TABLE course_enrollments ADD COLUMN IF NOT EXISTS child_name TEXT");
  await pool.query("ALTER TABLE course_enrollments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'");
  await pool.query("ALTER TABLE course_enrollments ADD COLUMN IF NOT EXISTS purchased_at TIMESTAMPTZ DEFAULT NOW()");
  await pool.query("ALTER TABLE course_enrollments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()");
  await pool.query("ALTER TABLE course_enrollments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()");
  await pool.query("UPDATE course_enrollments SET status = 'active' WHERE status IS NULL OR status NOT IN ('active', 'refunded', 'cancelled')");
  await pool.query(`
    DO $$
    DECLARE constraint_record RECORD;
    BEGIN
      FOR constraint_record IN
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
        WHERE rel.relname = 'course_enrollments'
          AND con.contype = 'c'
          AND att.attname = 'status'
      LOOP
        EXECUTE format('ALTER TABLE course_enrollments DROP CONSTRAINT IF EXISTS %I', constraint_record.conname);
      END LOOP;
    END $$;
  `);
  await pool.query("ALTER TABLE course_enrollments ALTER COLUMN status SET DEFAULT 'active'");
  await pool.query("ALTER TABLE course_enrollments ADD CONSTRAINT course_enrollments_status_check CHECK (status IN ('active', 'refunded', 'cancelled'))");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS course_progress (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      enrollment_id UUID NOT NULL REFERENCES course_enrollments(id) ON DELETE CASCADE,
      lesson_id UUID NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
      watched_seconds INT NOT NULL DEFAULT 0,
      is_completed BOOLEAN NOT NULL DEFAULT false,
      completed_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(enrollment_id, lesson_id)
    );
  `);
  await pool.query("ALTER TABLE course_progress ADD COLUMN IF NOT EXISTS enrollment_id UUID REFERENCES course_enrollments(id) ON DELETE CASCADE");
  await pool.query("ALTER TABLE course_progress ADD COLUMN IF NOT EXISTS lesson_id UUID REFERENCES course_lessons(id) ON DELETE CASCADE");
  await pool.query("ALTER TABLE course_progress ADD COLUMN IF NOT EXISTS watched_seconds INT DEFAULT 0");
  await pool.query("ALTER TABLE course_progress ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT false");
  await pool.query("ALTER TABLE course_progress ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ");
  await pool.query("ALTER TABLE course_progress ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()");
  await pool.query("CREATE INDEX IF NOT EXISTS idx_courses_tutor_id ON courses(tutor_id)");
  await pool.query("CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status)");
  await pool.query("CREATE INDEX IF NOT EXISTS idx_course_lessons_course_id ON course_lessons(course_id)");
  await pool.query("CREATE INDEX IF NOT EXISTS idx_course_enrollments_student_id ON course_enrollments(student_id)");
  try {
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_course_enrollments_course_student
      ON course_enrollments(course_id, student_id)
    `);
  } catch (error) {
    console.warn("[Courses] Could not create unique enrollment index. Existing duplicate enrollments may need cleanup.", error.message);
  }
  try {
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_course_progress_enrollment_lesson
      ON course_progress(enrollment_id, lesson_id)
    `);
  } catch (error) {
    console.warn("[Courses] Could not create unique progress index. Existing duplicate progress rows may need cleanup.", error.message);
  }
}


app.get("/api/tutor/courses", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "tutor") return res.status(403).json({ message: "Tutor access only." });
    await ensureCourseSchema();
    const courses = await pool.query(
      `SELECT c.*,
              COUNT(DISTINCT l.id)::int AS "lessonCount",
              COUNT(DISTINCT e.id)::int AS "enrollmentCount",
              COALESCE(COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'active') * c.price, 0)::int AS revenue
       FROM courses c
       LEFT JOIN course_lessons l ON l.course_id = c.id
       LEFT JOIN course_enrollments e ON e.course_id = c.id
       WHERE c.tutor_id = $1
       GROUP BY c.id
       ORDER BY c.updated_at DESC, c.created_at DESC`,
      [req.user.userId]
    );
    const ids = courses.rows.map((course) => course.id);
    const lessons = ids.length
      ? await pool.query(
          `SELECT *
           FROM course_lessons
           WHERE course_id = ANY($1::uuid[])
           ORDER BY course_id, position ASC, created_at ASC`,
          [ids]
        )
      : { rows: [] };
    const lessonMap = lessons.rows.reduce((map, lesson) => {
      if (!map[lesson.course_id]) map[lesson.course_id] = [];
      map[lesson.course_id].push({
        id: lesson.id,
        title: lesson.title,
        description: lesson.description || "",
        videoUrl: lesson.video_url || "",
        materialUrl: lesson.material_url || "",
        durationLabel: lesson.duration_label || "",
        isPreview: lesson.is_preview,
        position: lesson.position,
      });
      return map;
    }, {});

    return res.json(courses.rows.map((course) => ({
      id: course.id,
      title: course.title,
      description: course.description || "",
      subject: course.subject || "",
      level: course.level || "",
      price: course.price || 0,
      thumbnailUrl: course.thumbnail_url || "",
      learningOutcomes: Array.isArray(course.learning_outcomes) ? course.learning_outcomes : [],
      requirements: Array.isArray(course.requirements) ? course.requirements : [],
      status: course.status,
      lessonCount: course.lessonCount,
      enrollmentCount: course.enrollmentCount,
      revenue: course.revenue || 0,
      lessons: lessonMap[course.id] || [],
      createdAt: course.created_at,
      updatedAt: course.updated_at,
    })));
  } catch (error) {
    console.error("Get tutor courses error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

async function saveCourseLessons(client, courseId, lessons = []) {
  await client.query("DELETE FROM course_lessons WHERE course_id = $1", [courseId]);
  const cleanLessons = Array.isArray(lessons)
    ? lessons
        .map((lesson, index) => ({
          title: String(lesson.title || "").trim(),
          description: String(lesson.description || "").trim(),
          videoUrl: String(lesson.videoUrl || lesson.video_url || "").trim(),
          materialUrl: String(lesson.materialUrl || lesson.material_url || "").trim(),
          durationLabel: String(lesson.durationLabel || lesson.duration_label || "").trim(),
          isPreview: Boolean(lesson.isPreview || lesson.is_preview),
          position: Number(lesson.position || index + 1),
        }))
        .filter((lesson) => lesson.title)
    : [];

  for (const lesson of cleanLessons) {
    await client.query(
      `INSERT INTO course_lessons
         (course_id, title, description, video_url, material_url, duration_label, is_preview, position)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [courseId, lesson.title, lesson.description || null, lesson.videoUrl || null, lesson.materialUrl || null, lesson.durationLabel || null, lesson.isPreview, lesson.position]
    );
  }
}

async function upsertTutorCourse(req, res, courseId = null) {
  if (req.user.role !== "tutor") return res.status(403).json({ message: "Tutor access only." });
  await ensureCourseSchema();
  const { title, description, subject, level, price, thumbnailUrl, status, lessons, learningOutcomes, requirements } = req.body || {};
  const cleanTitle = String(title || "").trim();
  const cleanStatus = ["draft", "pending_review", "published", "rejected", "archived"].includes(status) ? status : "draft";
  const cleanLessons = Array.isArray(lessons) ? lessons.filter((lesson) => String(lesson.title || "").trim()) : [];
  const cleanOutcomes = Array.isArray(learningOutcomes) ? learningOutcomes.map((item) => String(item || "").trim()).filter(Boolean) : [];
  const cleanRequirements = Array.isArray(requirements) ? requirements.map((item) => String(item || "").trim()).filter(Boolean) : [];
  if (!cleanTitle) return res.status(400).json({ message: "Course title is required." });
  if (cleanStatus === "published" && cleanLessons.length === 0) {
    return res.status(400).json({ message: "Add at least one lesson before publishing." });
  }

  if (courseId) {
    const owner = await pool.query("SELECT id FROM courses WHERE id = $1 AND tutor_id = $2", [courseId, req.user.userId]);
    if (owner.rows.length === 0) return res.status(404).json({ message: "Course not found." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    let id = courseId;
    if (id) {
      await client.query(
        `UPDATE courses
         SET title = $1, description = $2, subject = $3, level = $4, price = $5,
             thumbnail_url = $6, status = $7, learning_outcomes = $8, requirements = $9, updated_at = NOW()
         WHERE id = $10 AND tutor_id = $11`,
        [cleanTitle, String(description || "").trim() || null, String(subject || "").trim() || null, String(level || "").trim() || null, Math.max(Number(price || 0), 0), String(thumbnailUrl || "").trim() || null, cleanStatus, JSON.stringify(cleanOutcomes), JSON.stringify(cleanRequirements), id, req.user.userId]
      );
    } else {
      const created = await client.query(
        `INSERT INTO courses (tutor_id, title, description, subject, level, price, thumbnail_url, status, learning_outcomes, requirements)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id`,
        [req.user.userId, cleanTitle, String(description || "").trim() || null, String(subject || "").trim() || null, String(level || "").trim() || null, Math.max(Number(price || 0), 0), String(thumbnailUrl || "").trim() || null, cleanStatus, JSON.stringify(cleanOutcomes), JSON.stringify(cleanRequirements)]
      );
      id = created.rows[0].id;
    }
    await saveCourseLessons(client, id, cleanLessons);
    await client.query("COMMIT");
    return res.status(courseId ? 200 : 201).json({ message: "Course saved.", id });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

app.post("/api/tutor/courses", verifyToken, async (req, res) => {
  try {
    return await upsertTutorCourse(req, res);
  } catch (error) {
    console.error("Create course error:", error);
    return res.status(500).json({ message: error.message || "Server error." });
  }
});

app.patch("/api/tutor/courses/:id", verifyToken, async (req, res) => {
  try {
    return await upsertTutorCourse(req, res, req.params.id);
  } catch (error) {
    console.error("Update course error:", error);
    return res.status(500).json({ message: error.message || "Server error." });
  }
});

app.delete("/api/tutor/courses/:id", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "tutor") return res.status(403).json({ message: "Tutor access only." });
    await ensureCourseSchema();
    const result = await pool.query(
      "UPDATE courses SET status = 'archived', updated_at = NOW() WHERE id = $1 AND tutor_id = $2 RETURNING id",
      [req.params.id, req.user.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Course not found." });
    return res.json({ message: "Course archived." });
  } catch (error) {
    console.error("Archive course error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

app.get("/api/tutor/students", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "tutor") {
      return res.status(403).json({ message: "Tutor access only." });
    }

    const tutorId = req.user.userId;
    const result = await pool.query(
      `SELECT
         b.id AS "bookingId",
         b.student_id AS "studentId",
         COALESCE(b.child_name, b.student_name, s.full_name, 'Student') AS "studentName",
         s.email AS "studentEmail",
         s.picture AS "studentAvatar",
         b.child_name AS "childName",
         b.subject,
         to_char(b.lesson_date, 'YYYY-MM-DD') AS date,
         b.time_slot AS "timeSlot",
         b.note AS notes,
         b.booking_type AS "bookingType",
         b.status AS "bookingStatus",
         a.status AS "attendanceStatus",
         a.note AS "attendanceNote",
         a.marked_at AS "markedAt"
       FROM bookings b
       LEFT JOIN users s ON s.id = b.student_id
       LEFT JOIN attendance a ON a.booking_id = b.id
       WHERE b.tutor_id = $1
         AND b.status IN ('Approved', 'Pending')
       ORDER BY b.lesson_date DESC, b.time_slot DESC`,
      [tutorId]
    );

    const grouped = new Map();
    for (const row of result.rows) {
      const key = `${row.studentId}:${row.childName || ''}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          studentId: row.studentId,
          studentName: row.studentName,
          studentEmail: row.studentEmail,
          studentAvatar: row.studentAvatar,
          childName: row.childName,
          subjects: new Set(),
          lessons: [],
        });
      }
      const student = grouped.get(key);
      if (row.subject) student.subjects.add(row.subject);
      student.lessons.push(row);
    }

    const students = Array.from(grouped.values()).map((student) => {
      const approvedLessons = student.lessons.filter((lesson) => lesson.bookingStatus === 'Approved');
      const marked = approvedLessons.filter((lesson) => lesson.attendanceStatus);
      const absences = approvedLessons.filter((lesson) => lesson.attendanceStatus === 'absent');
      const present = approvedLessons.filter((lesson) => lesson.attendanceStatus === 'present');
      const upcoming = approvedLessons
        .filter((lesson) => new Date(`${lesson.date}T00:00:00`) >= new Date(new Date().toDateString()))
        .sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.timeSlot).localeCompare(String(b.timeSlot)))[0] || null;

      return {
        ...student,
        subjects: Array.from(student.subjects),
        totalLessons: approvedLessons.length,
        pendingRequests: student.lessons.filter((lesson) => lesson.bookingStatus === 'Pending').length,
        markedLessons: marked.length,
        absentCount: absences.length,
        presentCount: present.length,
        attendanceRate: marked.length ? Math.round((present.length / marked.length) * 100) : null,
        nextLesson: upcoming,
      };
    });

    return res.json(students);
  } catch (error) {
    console.error("Get tutor students error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

// GET /api/bookings — danh sách lịch học của user hiện tại
app.get("/api/bookings", verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.id, b.tutor_id, b.tutor_name, b.student_id, b.subject, b.lesson_date,
              b.time_slot, b.note, b.child_name, b.status, b.created_at,
              b.lesson_fee, b.escrow_tx_id, b.escrow_released_at, b.auto_release_at,
              u_tutor.picture AS tutor_picture,
              u_student.picture AS student_picture, u_student.full_name AS "studentName",
              a.status AS attendance_status,
              EXISTS(SELECT 1 FROM disputes d WHERE d.booking_id=b.id AND d.status='OPEN') AS has_open_dispute
       FROM bookings b
       LEFT JOIN users u_tutor ON u_tutor.id = b.tutor_id
       LEFT JOIN users u_student ON u_student.id = b.student_id
       LEFT JOIN attendance a ON a.booking_id = b.id
       WHERE (b.student_id = $1 OR b.tutor_id = $1)
         AND b.status IN ('Pending', 'Approved', 'Declined', 'Rejected', 'Cancelled', 'pending', 'confirmed', 'declined')
       ORDER BY b.lesson_date ASC, b.time_slot ASC`,
      [req.user.userId]
    );
    return res.json(result.rows);
  } catch (error) {
    console.error("[bookings] GET error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});


// GET /api/student/schedule — lịch học dashboard
app.get("/api/student/schedule", verifyToken, async (req, res) => {
  try {
    const studentId = req.user.userId;
    // filters
    const search = req.query.search || '';
    const statusFilter = req.query.status || 'All Status';
    const subjectFilter = req.query.subject || 'All Subjects';
    const tutorFilter = req.query.tutor || 'All Tutors';

    const result = await pool.query(
      `SELECT b.id, b.tutor_id, b.tutor_name, b.subject, to_char(b.lesson_date, 'YYYY-MM-DD') AS lesson_date_str, b.time_slot, b.status
       FROM bookings b
       WHERE b.student_id = $1`,
       [studentId]
    );

    let sessions = [];
    let completedCount = 0;
    let upcomingCount = 0;
    let learningHours = 0;
    const now = new Date();
    const todayStr = now.toDateString();
    
    const currentDay = now.getDay();
    const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - distanceToMonday);
    monday.setHours(0,0,0,0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23,59,59,999);

    let weeklyCompleted = 0;
    let weeklyTotal = 0;

    result.rows.forEach(row => {
      const timeParts = (row.time_slot || '').split('-').map(t => t.trim());
      
      let startMatch = timeParts[0] ? timeParts[0].match(/(\d+):(\d+)\s*(AM|PM|am|pm)?/) : null;
      let endMatch = timeParts[1] ? timeParts[1].match(/(\d+):(\d+)\s*(AM|PM|am|pm)?/) : null;

      let sh = 0, sm = 0, eh = 1, em = 0;
      if (startMatch) {
         sh = parseInt(startMatch[1], 10);
         sm = parseInt(startMatch[2], 10);
         if (startMatch[3] && startMatch[3].toUpperCase() === 'PM' && sh !== 12) sh += 12;
         if (startMatch[3] && startMatch[3].toUpperCase() === 'AM' && sh === 12) sh = 0;
      }
      if (endMatch) {
         eh = parseInt(endMatch[1], 10);
         em = parseInt(endMatch[2], 10);
         if (endMatch[3] && endMatch[3].toUpperCase() === 'PM' && eh !== 12) eh += 12;
         if (endMatch[3] && endMatch[3].toUpperCase() === 'AM' && eh === 12) eh = 0;
      }

      sh = sh.toString().padStart(2, '0');
      sm = sm.toString().padStart(2, '0');
      eh = eh.toString().padStart(2, '0');
      em = em.toString().padStart(2, '0');
      
      const startDate = new Date(`${row.lesson_date_str}T${sh}:${sm}:00+07:00`);
      const endDate = new Date(`${row.lesson_date_str}T${eh}:${em}:00+07:00`);

      let status = row.status ? row.status.toLowerCase() : 'pending';
      if (status === 'accepted' || status === 'approved') {
         if (now > endDate) status = 'completed';
         else if (now >= startDate && now <= endDate) status = 'ongoing';
         else status = 'upcoming';
      }

      if (status === 'completed') {
         completedCount++;
         learningHours += (endDate - startDate) / 3600000;
      }
      if (status === 'upcoming' || status === 'accepted' || status === 'pending') {
         upcomingCount++;
      }

      if (startDate >= monday && startDate <= sunday) {
         weeklyTotal++;
         if (status === 'completed') weeklyCompleted++;
      }

      sessions.push({
        id: row.id,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        status: status,
        title: `Buổi học ${row.subject}`,
        tutor_name: row.tutor_name || 'Gia sư',
        xp_earned: status === 'completed' ? 80 : 0,
        meeting_platform: 'Google Meet',
        meeting_url: '',
        subject: row.subject || 'Khác'
      });
    });

    if (search) {
      sessions = sessions.filter(s => s.title.toLowerCase().includes(search.toLowerCase()) || s.subject.toLowerCase().includes(search.toLowerCase()));
    }
    if (statusFilter !== 'All Status') {
      sessions = sessions.filter(s => s.status === statusFilter);
    }
    if (subjectFilter !== 'All Subjects') {
      sessions = sessions.filter(s => s.subject === subjectFilter);
    }
    if (tutorFilter !== 'All Tutors') {
      sessions = sessions.filter(s => s.tutor_name === tutorFilter);
    }

    sessions.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

    const today = sessions.filter(s => new Date(s.start_time).toDateString() === todayStr);
    const up_next = sessions.filter(s => s.status === 'upcoming' || s.status === 'ongoing' || s.status === 'pending').slice(0, 3);

    return res.json({
      success: true,
      data: {
        summary: {
          weekly_completed: weeklyCompleted,
          weekly_total: weeklyTotal,
          weekly_goal_hours: 10,
          completed: completedCount,
          learning_hours: Math.round(learningHours),
          streak_days: 3,
          xp_earned: completedCount * 80,
          total_classes: result.rows.length,
          upcoming: upcomingCount
        },
        sessions,
        today,
        up_next
      }
    });

  } catch (error) {
    console.error("[student/schedule] GET error:", error);
    return res.status(500).json({ success: false, error: "Server error." });
  }
});

// GET /api/student/bookings — bookings đầy đủ cho học sinh (bao gồm escrow status)
app.get("/api/student/bookings", verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.id, b.tutor_id, b.tutor_name, b.subject,
              to_char(b.lesson_date, 'YYYY-MM-DD') AS lesson_date,
              b.time_slot, b.note, b.child_name, b.status, b.created_at,
              b.lesson_fee, b.escrow_tx_id, b.escrow_released_at, b.auto_release_at,
              u_tutor.full_name AS tutor_full_name,
              u_tutor.picture AS tutor_picture,
              tp.reputation_score, tp.subjects AS tutor_subjects,
              a.status AS attendance_status,
              EXISTS(SELECT 1 FROM disputes d WHERE d.booking_id=b.id AND d.status='OPEN') AS has_open_dispute
       FROM bookings b
       LEFT JOIN users u_tutor ON u_tutor.id = b.tutor_id
       LEFT JOIN tutor_profiles tp ON tp.user_id = b.tutor_id
       LEFT JOIN attendance a ON a.booking_id = b.id
       WHERE b.student_id = $1
       ORDER BY b.lesson_date DESC, b.time_slot DESC
       LIMIT 50`,
      [req.user.userId]
    );
    return res.json({ bookings: result.rows });
  } catch (error) {
    console.error("[student/bookings] GET error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

// GET /api/admin/disputes — Lấy tất cả disputes cho admin
app.get("/api/admin/disputes", verifyToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  try {
    const result = await pool.query(`
      SELECT d.id, d.reason, d.status, d.admin_note, d.created_at, d.resolved_at,
             d.booking_id,
             b.subject, to_char(b.lesson_date,'YYYY-MM-DD') AS lesson_date,
             b.lesson_fee, b.tutor_name,
             u_reporter.full_name AS reporter_name, u_reporter.email AS reporter_email,
             u_tutor.full_name AS tutor_full_name, u_tutor.email AS tutor_email,
             u_student.full_name AS student_name
      FROM disputes d
      JOIN bookings b ON b.id = d.booking_id
      JOIN users u_reporter ON u_reporter.id = d.raised_by
      LEFT JOIN users u_tutor ON u_tutor.id = b.tutor_id
      LEFT JOIN users u_student ON u_student.id = b.student_id
      ORDER BY
        CASE d.status WHEN 'OPEN' THEN 0 ELSE 1 END,
        d.created_at DESC
      LIMIT 100
    `);
    return res.json({ disputes: result.rows });
  } catch (e) {
    console.error("Admin disputes error:", e);
    return res.status(500).json({ message: "Server error." });
  }
});

// POST /api/bookings — tạo lịch học mới
// Hỗ trợ cả định dạng cũ (lessonDate, timeSlot, tutorName) và mới (sessions, notes, childName)
app.post("/api/bookings", verifyToken, async (req, res) => {
  try {
    const { tutorId, tutorName, subject, lessonDate, timeSlot, note, sessions, date, notes, childName } = req.body || {};

    const bookingSessions = sessions && sessions.length > 0 
      ? sessions 
      : [{ date: lessonDate || date, timeSlot }];

    if (!bookingSessions[0] || !bookingSessions[0].date || !bookingSessions[0].timeSlot) {
      return res.status(400).json({ message: "Thiếu thông tin: cần lessonDate, timeSlot (hoặc mảng sessions)." });
    }

    let finalTutorName = tutorName;

    // Nếu có tutorId, kiểm tra gia sư đó đã được duyệt và lấy tên nếu chưa truyền
    if (tutorId) {
      const tutorCheck = await pool.query(
        `SELECT u.full_name FROM tutor_profiles tp 
         JOIN users u ON tp.user_id = u.id 
         WHERE tp.user_id = $1 AND tp.status = 'approved'`,
        [tutorId]
      );
      if (tutorCheck.rowCount === 0) {
        return res.status(400).json({ message: "Gia sư không tồn tại hoặc chưa được duyệt." });
      }
      if (!finalTutorName) {
        finalTutorName = tutorCheck.rows[0].full_name;
      }
    }

    if (!finalTutorName) {
        finalTutorName = "Gia sư"; // Fallback nếu vẫn không có
    }

    const initialStatus = tutorId ? "Pending" : "Approved";
    const finalNote = notes || note || null;
    const createdBookings = [];

    // Lấy hourly_rate của gia sư để set lesson_fee ngay từ đầu
    let lessonFeeForBooking = 0;
    if (tutorId) {
      const rateRes = await pool.query('SELECT hourly_rate FROM tutor_profiles WHERE user_id=$1 LIMIT 1', [tutorId]);
      lessonFeeForBooking = Number(rateRes.rows[0]?.hourly_rate || 0);
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      
      // Chèn từng session
      for (const session of bookingSessions) {
        const sessionDate = session.date || session.lessonDate;
        const sessionTimeSlot = session.timeSlot;

        if (!sessionDate || !sessionTimeSlot) continue;

        // Check for double booking
        if (tutorId) {
          const overlapCheck = await client.query(
            `SELECT id FROM bookings
             WHERE tutor_id = $1
               AND lesson_date = $2::date
               AND time_slot = $3
               AND LOWER(status) NOT IN ('cancelled', 'declined')`,
            [tutorId, sessionDate, sessionTimeSlot]
          );
          if (overlapCheck.rowCount > 0) {
            await client.query("ROLLBACK");
            return res.status(409).json({ message: `Lịch học ${sessionTimeSlot} ngày ${sessionDate} đã có người đặt. Vui lòng chọn lịch khác.` });
          }
        }

        const result = await client.query(
          `INSERT INTO bookings (student_id, tutor_id, tutor_name, subject, lesson_date, time_slot, note, child_name, status, lesson_fee)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING id, tutor_id, tutor_name, subject, lesson_date, time_slot, note, child_name, status, lesson_fee, created_at`,
          [req.user.userId, tutorId || null, finalTutorName, subject || null, sessionDate, sessionTimeSlot, finalNote, childName || null, initialStatus, lessonFeeForBooking]
        );
        createdBookings.push(result.rows[0]);
      }
      
      await client.query("COMMIT");
    } catch (dbErr) {
      await client.query("ROLLBACK");
      throw dbErr;
    } finally {
      client.release();
    }

    if (createdBookings.length === 0) {
      return res.status(400).json({ message: "Không thể tạo lịch hẹn." });
    }

    return res.status(201).json({ 
      message: "Đặt lịch thành công.", 
      bookings: createdBookings,
      // Trả về bản ghi đầu tiên để tương thích ngược với API cũ
      ...createdBookings[0] 
    });
  } catch (error) {
    console.error("[bookings] POST error:", error.code, error.message, error.detail || "");
    // Trả lỗi cụ thể cho client để dev dễ debug
    if (error.code === "23505" && error.constraint === "uq_bookings_active_slot") {
      return res.status(400).json({ message: "Một hoặc nhiều buổi học bạn chọn đã có người đặt trước. Vui lòng tải lại trang và chọn lịch khác." });
    }
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

// PATCH /api/bookings/:id — cập nhật trạng thái lịch học (duyệt, từ chối, hủy)
// Logic escrow:
//   Approved  → hold_money_for_lesson (trừ balance, cộng held_balance)
//   Declined/Rejected → hoàn tiền nếu đã hold
//   Cancelled → hoàn tiền theo policy: trước 24h = 100%, trong 24h = 50% (phạt hủy trễ)
app.patch("/api/bookings/:id", verifyToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { status } = req.body || {};
    if (!["Approved", "Declined", "Cancelled", "Rejected"].includes(status)) {
      return res.status(400).json({ message: "status phải là 'Approved', 'Declined', 'Cancelled', hoặc 'Rejected'." });
    }

    // Lấy booking kèm thông tin cần thiết
    const bookingRes = await client.query(`
      SELECT b.*, tp.hourly_rate,
             w_payer.id AS payer_wallet_id_val
      FROM bookings b
      LEFT JOIN tutor_profiles tp ON tp.user_id = b.tutor_id
      LEFT JOIN wallets w_payer ON w_payer.user_id = b.student_id
      WHERE b.id = $1 AND (b.tutor_id = $2 OR b.student_id = $2)
    `, [req.params.id, req.user.userId]);

    if (!bookingRes.rows.length) {
      return res.status(404).json({ message: "Không tìm thấy lịch học của bạn." });
    }
    const booking = bookingRes.rows[0];
    const hourlyRate = Number(booking.hourly_rate || 0);
    const lessonFee = booking.lesson_fee > 0 ? Number(booking.lesson_fee) : hourlyRate;

    await client.query('BEGIN');

    // ── APPROVE: hold escrow ──────────────────────────────────────────────────
    if (status === 'Approved' && booking.status === 'Pending') {
      // Chỉ gia sư mới được approve
      if (req.user.userId !== booking.tutor_id) {
        await client.query('ROLLBACK');
        return res.status(403).json({ message: 'Chỉ gia sư mới có thể duyệt lịch học.' });
      }

      // Hold tiền nếu có ví và có lesson_fee
      if (lessonFee > 0 && booking.payer_wallet_id_val) {
        try {
          const holdRes = await client.query(
            'SELECT hold_money_for_lesson($1, $2, $3) AS tx_id',
            [booking.payer_wallet_id_val, lessonFee, booking.id]
          );
          const txId = holdRes.rows[0].tx_id;

          // Lưu tx_id vào booking để dùng khi release/refund
          await client.query(`
            UPDATE bookings
            SET status=$1, escrow_tx_id=$2, payer_wallet_id=$3, lesson_fee=$4,
                auto_release_at = NULL
            WHERE id=$5
          `, [status, txId, booking.payer_wallet_id_val, lessonFee, booking.id]);

          // Notify học sinh: tiền đã bị hold
          await client.query(`
            INSERT INTO notifications (user_id, type, title, body, icon, ref_id, ref_type)
            VALUES ($1,'escrow_hold','Lịch học đã được xác nhận — Tiền tạm giữ',$2,'lock',$3,'booking')
          `, [booking.student_id,
              `Gia sư đã duyệt lịch học. ${lessonFee.toLocaleString('vi-VN')}đ đã được tạm giữ và sẽ giải ngân sau khi buổi học hoàn thành.`,
              booking.id]);
        } catch (escrowErr) {
          await client.query('ROLLBACK');
          return res.status(400).json({ message: 'Số dư ví không đủ để xác nhận lịch học. Vui lòng nạp thêm tiền.' });
        }
      } else {
        // Không có ví hoặc fee = 0: approve bình thường
        await client.query(`UPDATE bookings SET status=$1 WHERE id=$2`, [status, booking.id]);
      }
    }

    // ── DECLINED/REJECTED: hoàn tiền toàn bộ ────────────────────────────────
    else if (['Declined', 'Rejected'].includes(status) && booking.escrow_tx_id) {
      // Chỉ gia sư mới được từ chối
      if (req.user.userId !== booking.tutor_id) {
        await client.query('ROLLBACK');
        return res.status(403).json({ message: 'Chỉ gia sư mới có thể từ chối lịch học.' });
      }
      await client.query('SELECT refund_escrow($1,$2,$3)', [
        booking.escrow_tx_id, booking.payer_wallet_id, lessonFee
      ]);
      await client.query(`UPDATE bookings SET status=$1, escrow_released_at=NOW() WHERE id=$2`, [status, booking.id]);

      await client.query(`
        INSERT INTO notifications (user_id, type, title, body, icon, ref_id, ref_type)
        VALUES ($1,'refund','Hoàn tiền lịch học bị từ chối',$2,'undo',$3,'booking')
      `, [booking.student_id,
          `Gia sư đã từ chối lịch học. ${lessonFee.toLocaleString('vi-VN')}đ đã được hoàn lại vào ví của bạn.`,
          booking.id]);
    }

    // ── CANCELLED: policy hoàn tiền theo thời gian ───────────────────────────
    else if (status === 'Cancelled') {
      let refundUpdate = `UPDATE bookings SET status='Cancelled'`;

      if (booking.escrow_tx_id && lessonFee > 0) {
        // Tính thời gian còn lại đến buổi học
        const lessonDateTime = new Date(`${String(booking.lesson_date).slice(0,10)}T${booking.time_slot || '00:00'}:00`);
        const hoursUntilLesson = (lessonDateTime - new Date()) / (1000 * 60 * 60);

        let refundAmount = lessonFee;
        let penaltyAmount = 0;
        let refundMsg = '';

        if (hoursUntilLesson > 24) {
          // Hủy sớm: hoàn 100%
          refundAmount = lessonFee;
          refundMsg = `Hủy trước 24h — hoàn toàn bộ ${lessonFee.toLocaleString('vi-VN')}đ.`;
        } else if (hoursUntilLesson > 0) {
          // Hủy trễ (trong 24h): hoàn 50%, gia sư nhận 50% nếu đã được approve
          refundAmount = Math.floor(lessonFee * 0.5);
          penaltyAmount = lessonFee - refundAmount;
          refundMsg = `Hủy trong 24h trước giờ học — hoàn 50% (${refundAmount.toLocaleString('vi-VN')}đ). Phí hủy trễ: ${penaltyAmount.toLocaleString('vi-VN')}đ.`;
        } else {
          // Đã qua giờ học: không hoàn tiền
          refundAmount = 0;
          penaltyAmount = lessonFee;
          refundMsg = `Buổi học đã qua — không hoàn tiền.`;
        }

        if (refundAmount > 0) {
          // Hoàn phần refundAmount về học sinh
          await client.query(`
            UPDATE wallets SET held_balance=held_balance-$1, balance=balance+$2 WHERE id=$3
          `, [lessonFee, refundAmount, booking.payer_wallet_id]);

          // Phần penalty (nếu có): chuyển cho gia sư (50%) + admin (50% của penalty)
          if (penaltyAmount > 0 && booking.tutor_id) {
            const tw = await client.query('SELECT id FROM wallets WHERE user_id=$1', [booking.tutor_id]);
            if (tw.rows.length) {
              const tutorShare = Math.floor(penaltyAmount * 0.5);
              const adminShare = penaltyAmount - tutorShare;

              await client.query('UPDATE wallets SET balance=balance+$1 WHERE id=$2', [tutorShare, tw.rows[0].id]);

              // Admin
              let adminWalletId = process.env.ADMIN_WALLET_ID;
              if (!adminWalletId) {
                const aw = await client.query("SELECT w.id FROM wallets w JOIN users u ON w.user_id=u.id WHERE u.role='admin' LIMIT 1");
                if (aw.rows.length) adminWalletId = aw.rows[0].id;
              }
              if (adminWalletId) {
                await client.query('UPDATE wallets SET balance=balance+$1 WHERE id=$2', [adminShare, adminWalletId]);
              }

              // Thông báo gia sư nhận phí hủy
              await client.query(`
                INSERT INTO notifications (user_id, type, title, body, icon, ref_id, ref_type)
                VALUES ($1,'cancellation_fee','Nhận phí hủy lịch học',$2,'payments',$3,'booking')
              `, [booking.tutor_id,
                  `Học sinh đã hủy muộn. Bạn nhận được phí hủy ${tutorShare.toLocaleString('vi-VN')}đ.`,
                  booking.id]);
            }
          }

          // Log transaction hoàn tiền
          await client.query(`
            INSERT INTO transactions (wallet_id, amount, type, status, gateway, reference_id, description)
            VALUES ($1,$2,'REFUND','SUCCESS','SYSTEM',$3,$4)
          `, [booking.payer_wallet_id, refundAmount, booking.id, `Hoàn tiền hủy lịch học: ${refundMsg}`]);

          // Cập nhật transaction gốc (nếu có)
          if (booking.escrow_tx_id) {
            await client.query(`UPDATE transactions SET status='REFUNDED', updated_at=NOW() WHERE id=$1`, [booking.escrow_tx_id]);
          }
        } else {
          // Không hoàn — chỉ release held_balance
          await client.query(`
            UPDATE wallets SET held_balance=held_balance-$1 WHERE id=$2
          `, [lessonFee, booking.payer_wallet_id]);
          if (booking.escrow_tx_id) {
            await client.query(`UPDATE transactions SET status='REFUNDED', updated_at=NOW() WHERE id=$1`, [booking.escrow_tx_id]);
          }
        }

        await client.query(`UPDATE bookings SET status='Cancelled', escrow_released_at=NOW() WHERE id=$1`, [booking.id]);

        // Notify học sinh
        await client.query(`
          INSERT INTO notifications (user_id, type, title, body, icon, ref_id, ref_type)
          VALUES ($1,'cancellation','Lịch học đã bị hủy',$2,'cancel',$3,'booking')
        `, [booking.student_id, refundMsg, booking.id]);

        if (booking.tutor_id && req.user.userId !== booking.tutor_id) {
          await client.query(`
            INSERT INTO notifications (user_id, type, title, body, icon, ref_id, ref_type)
            VALUES ($1,'cancellation','Học sinh đã hủy lịch học',$2,'event_busy',$3,'booking')
          `, [booking.tutor_id, `Học sinh đã hủy buổi học. ${refundMsg}`, booking.id]);
        }
      } else {
        // Không có escrow: hủy bình thường
        await client.query(`UPDATE bookings SET status='Cancelled' WHERE id=$1`, [booking.id]);
      }
    }

    // ── Status khác: cập nhật đơn giản ───────────────────────────────────────
    else {
      await client.query(`UPDATE bookings SET status=$1 WHERE id=$2`, [status, booking.id]);
    }

    await client.query('COMMIT');

    const updated = await pool.query('SELECT id, status FROM bookings WHERE id=$1', [booking.id]);
    return res.json(updated.rows[0]);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error("[bookings PATCH] error:", e);
    return res.status(500).json({ message: "Server error." });
  } finally {
    client.release();
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


app.patch("/api/bookings/:id/attendance", verifyToken, async (req, res) => {
  const client = await pool.connect();
  try {
    if (req.user.role !== "tutor") {
      return res.status(403).json({ message: "Tutor access only." });
    }

    const tutorId = req.user.userId;
    const { id } = req.params;
    const { status, note } = req.body || {};
    const allowed = ["present", "absent", "excused"];

    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid attendance status." });
    }

    const bookingResult = await client.query(
      `SELECT b.id, b.tutor_id, b.student_id, b.escrow_tx_id,
              b.payer_wallet_id, b.lesson_fee, b.subject, b.lesson_date
       FROM bookings b
       WHERE b.id = $1 AND b.tutor_id = $2 AND b.status = 'Approved'
       LIMIT 1`,
      [id, tutorId]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ message: "Approved booking not found." });
    }
    const booking = bookingResult.rows[0];
    const lessonFee = Number(booking.lesson_fee || 0);

    await client.query('BEGIN');

    // Ghi attendance
    const attendanceResult = await client.query(
      `INSERT INTO attendance (booking_id, tutor_id, student_id, status, note, marked_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (booking_id)
       DO UPDATE SET status=EXCLUDED.status, note=EXCLUDED.note, marked_at=NOW(), updated_at=NOW()
       RETURNING id, booking_id AS "bookingId", status, note, marked_at AS "markedAt"`,
      [booking.id, booking.tutor_id, booking.student_id, status, note?.trim() || null]
    );

    // ── PRESENT: Set auto-release timer (24h window cho student khiếu nại) ──
    if (status === 'present' && booking.escrow_tx_id && lessonFee > 0) {
      await client.query(`
        UPDATE bookings SET auto_release_at = NOW() + INTERVAL '24 hours'
        WHERE id = $1 AND escrow_released_at IS NULL
      `, [booking.id]);

      // Notify học sinh: có 24h để khiếu nại
      await client.query(`
        INSERT INTO notifications (user_id, type, title, body, icon, ref_id, ref_type)
        VALUES ($1,'lesson_completed','Buổi học đã hoàn thành',$2,'task_alt',$3,'booking')
      `, [booking.student_id,
          `Gia sư đã xác nhận hoàn thành buổi học ${booking.subject || ''}. Tiền sẽ tự động giải ngân sau 24h nếu bạn không có khiếu nại.`,
          booking.id]);

      // Notify gia sư
      await client.query(`
        INSERT INTO notifications (user_id, type, title, body, icon, ref_id, ref_type)
        VALUES ($1,'lesson_completed','Đã ghi nhận hoàn thành buổi học',$2,'how_to_reg',$3,'booking')
      `, [booking.tutor_id,
          `Buổi học ${booking.subject || ''} đã được ghi nhận hoàn thành. Tiền sẽ được giải ngân vào ví sau 24h.`,
          booking.id]);
    }

    // ── ABSENT / EXCUSED: Hoàn tiền cho học sinh ─────────────────────────────
    if (['absent', 'excused'].includes(status) && booking.escrow_tx_id && lessonFee > 0) {
      const tw = await client.query('SELECT id FROM wallets WHERE user_id=$1', [booking.tutor_id]);
      const tutorWalletId = tw.rows.length ? tw.rows[0].id : null;

      if (status === 'absent') {
        // Gia sư vắng hoặc học sinh vắng do gia sư báo: hoàn toàn bộ về học sinh
        await client.query('SELECT refund_escrow($1,$2,$3)', [
          booking.escrow_tx_id, booking.payer_wallet_id, lessonFee
        ]);
        await client.query(`UPDATE bookings SET escrow_released_at=NOW(), auto_release_at=NULL WHERE id=$1`, [booking.id]);

        await client.query(`
          INSERT INTO notifications (user_id, type, title, body, icon, ref_id, ref_type)
          VALUES ($1,'refund','Hoàn tiền — buổi học vắng mặt',$2,'undo',$3,'booking')
        `, [booking.student_id,
            `Buổi học bị đánh dấu vắng mặt. ${lessonFee.toLocaleString('vi-VN')}đ đã được hoàn lại vào ví bạn.`,
            booking.id]);
      } else if (status === 'excused') {
        // Vắng có phép (học sinh xin nghỉ): hoàn 100% nếu báo trước 24h
        await client.query('SELECT refund_escrow($1,$2,$3)', [
          booking.escrow_tx_id, booking.payer_wallet_id, lessonFee
        ]);
        await client.query(`UPDATE bookings SET escrow_released_at=NOW(), auto_release_at=NULL WHERE id=$1`, [booking.id]);

        await client.query(`
          INSERT INTO notifications (user_id, type, title, body, icon, ref_id, ref_type)
          VALUES ($1,'refund','Hoàn tiền — nghỉ có phép',$2,'undo',$3,'booking')
        `, [booking.student_id,
            `Buổi học được ghi nhận nghỉ có phép. ${lessonFee.toLocaleString('vi-VN')}đ đã được hoàn lại.`,
            booking.id]);
      }
    }

    await client.query('COMMIT');
    return res.json(attendanceResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Update attendance error:", error);
    return res.status(500).json({ message: "Server error." });
  } finally {
    client.release();
  }
});

app.get("/api/tutor/earnings", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "tutor") {
      return res.status(403).json({ message: "Tutor access only." });
    }

    const tutorId = req.user.userId;
    const [profileResult, walletResult] = await Promise.all([
      pool.query(`SELECT hourly_rate, reputation_score, completed_lessons_count FROM tutor_profiles WHERE user_id=$1 LIMIT 1`, [tutorId]),
      pool.query(`SELECT w.id, w.balance, w.held_balance FROM wallets w WHERE w.user_id=$1`, [tutorId])
    ]);

    const hourlyRate = Number(profileResult.rows[0]?.hourly_rate || 0);
    const wallet = walletResult.rows[0] || { balance: 0, held_balance: 0 };

    // Lấy lessons với lesson_fee thực tế từ booking
    const lessonResult = await pool.query(
      `SELECT
         b.id, b.student_id AS "studentId",
         COALESCE(b.child_name, b.student_name, s.full_name, 'Student') AS "studentName",
         b.child_name AS "childName", b.subject,
         to_char(b.lesson_date, 'YYYY-MM-DD') AS date,
         b.time_slot AS "timeSlot",
         b.status AS "bookingStatus",
         COALESCE(b.lesson_fee, $2) AS "lessonFee",
         b.escrow_released_at AS "escrowReleasedAt",
         b.auto_release_at AS "autoReleaseAt",
         a.status AS "attendanceStatus",
         a.note AS "attendanceNote",
         a.marked_at AS "markedAt",
         EXISTS(SELECT 1 FROM disputes d WHERE d.booking_id=b.id AND d.status='OPEN') AS "hasOpenDispute"
       FROM bookings b
       LEFT JOIN users s ON s.id = b.student_id
       LEFT JOIN attendance a ON a.booking_id = b.id
       WHERE b.tutor_id = $1 AND b.status = 'Approved'
       ORDER BY b.lesson_date DESC, b.time_slot DESC`,
      [tutorId, hourlyRate]
    );

    const lessons = lessonResult.rows.map((lesson) => {
      const attendance = lesson.attendanceStatus || "awaiting_attendance";
      const fee = Number(lesson.lessonFee || 0);
      const tutorShare = Math.floor(fee * 0.9); // 90% sau khi trừ 10% hoa hồng

      let paymentStatus;
      if (lesson.escrowReleasedAt) {
        paymentStatus = "released";
      } else if (attendance === "present" && lesson.autoReleaseAt) {
        paymentStatus = lesson.hasOpenDispute ? "disputed" : "pending_release";
      } else if (attendance === "present") {
        paymentStatus = "pending_release";
      } else if (attendance === "awaiting_attendance") {
        paymentStatus = "pending_attendance";
      } else {
        paymentStatus = "no_charge"; // absent/excused
      }

      return {
        ...lesson,
        attendanceStatus: attendance,
        paymentStatus,
        amount: paymentStatus === "released" ? tutorShare : paymentStatus === "pending_release" ? tutorShare : 0,
        rawFee: fee,
        tutorShare,
      };
    });

    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthOf = (value) => {
      const d = new Date(value);
      if (isNaN(d.getTime())) return "";
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    };

    const releasedLessons = lessons.filter(l => l.paymentStatus === "released");
    const pendingReleaseLessons = lessons.filter(l => l.paymentStatus === "pending_release");
    const pendingAttendanceLessons = lessons.filter(l => l.paymentStatus === "pending_attendance");
    const disputedLessons = lessons.filter(l => l.paymentStatus === "disputed");
    const monthLessons = releasedLessons.filter(l => monthOf(l.date) === monthKey);

    const monthlyBreakdown = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const items = releasedLessons.filter(l => monthOf(l.date) === key);
      monthlyBreakdown.push({
        month: key,
        label: date.toLocaleString("en-US", { month: "short" }),
        amount: items.reduce((s, l) => s + l.tutorShare, 0),
        lessons: items.length,
      });
    }

    return res.json({
      hourlyRate,
      reputationScore: profileResult.rows[0]?.reputation_score ?? 100,
      completedLessonsCount: profileResult.rows[0]?.completed_lessons_count ?? 0,
      currency: "VND",
      wallet: {
        balance: Number(wallet.balance),
        heldBalance: Number(wallet.held_balance),
      },
      summary: {
        thisMonthEarned: monthLessons.reduce((s, l) => s + l.tutorShare, 0),
        totalEarned: releasedLessons.reduce((s, l) => s + l.tutorShare, 0),
        pendingReleaseAmount: pendingReleaseLessons.reduce((s, l) => s + l.tutorShare, 0),
        pendingAttendanceAmount: pendingAttendanceLessons.length * Math.floor(hourlyRate * 0.9),
        disputedAmount: disputedLessons.reduce((s, l) => s + l.tutorShare, 0),
        completedLessons: releasedLessons.length,
        pendingReleaseLessons: pendingReleaseLessons.length,
        pendingAttendanceLessons: pendingAttendanceLessons.length,
        noChargeLessons: lessons.filter(l => l.paymentStatus === "no_charge").length,
        disputedLessons: disputedLessons.length,
      },
      monthlyBreakdown,
      transactions: lessons,
    });
  } catch (error) {
    console.error("Get tutor earnings error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});


// =========================================================================
// ==================== PAYMENT & ESCROW ROUTES ============================
// =========================================================================

// 1. Lấy th?�ng tin V?�
app.get('/api/payment/wallet', verifyToken, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM wallets WHERE user_id = $1', [req.user.userId]);
    if (rows.length === 0) return res.status(404).json({ message: 'V?� kh?�ng tồn tại' });
    res.json({ wallet: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// 2. Tạo URL Nạp Tiền VNPAY
app.post('/api/payment/create-url', verifyToken, async (req, res) => {
  try {
      const { amount, returnUrl } = req.body;
      const walletRes = await pool.query('SELECT id FROM wallets WHERE user_id = $1', [req.user.userId]);
      if (walletRes.rowCount === 0) return res.status(404).json({ success: false, message: 'V?� kh?�ng tồn tại' });
      const wId = walletRes.rows[0].id;

      const tmnCode = process.env.VNPAY_TMN_CODE || 'DEMO1234';
      const secretKey = process.env.VNPAY_SECRET_KEY || 'DEMOSECRETKEY1234567890';
      let vnpUrl = process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
      
      const ipAddr = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress || '127.0.0.1';

      let date = new Date();
      let createDate = moment(date).format('YYYYMMDDHHmmss');
      let orderId = moment(date).format('DDHHmmss'); 

      let vnp_Params = {
          'vnp_Version': '2.1.0',
          'vnp_Command': 'pay',
          'vnp_TmnCode': tmnCode,
          'vnp_Locale': 'vn',
          'vnp_CurrCode': 'VND',
          'vnp_TxnRef': orderId,
          'vnp_OrderInfo': wId, 
          'vnp_OrderType': 'topup',
          'vnp_Amount': amount * 100, 
          'vnp_ReturnUrl': returnUrl,
          'vnp_IpAddr': ipAddr,
          'vnp_CreateDate': createDate
      };

      function sortObject(obj) {
          let sorted = {};
          let str = [];
          let key;
          for (key in obj){
              if (Object.prototype.hasOwnProperty.call(obj, key)) { str.push(encodeURIComponent(key)); }
          }
          str.sort();
          for (key = 0; key < str.length; key++) {
              sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
          }
          return sorted;
      }

      vnp_Params = sortObject(vnp_Params);
      const signData = querystring.stringify(vnp_Params, { encode: false });
      const hmac = crypto.createHmac("sha512", secretKey);
      const signed = hmac.update(new Buffer.from(signData, 'utf-8')).digest("hex"); 
      
      vnp_Params['vnp_SecureHash'] = signed;
      vnpUrl += '?' + querystring.stringify(vnp_Params, { encode: false });

      res.json({ success: true, url: vnpUrl });
  } catch (e) {
      console.error('Create VNPAY URL Error:', e);
      res.status(500).json({ success: false, message: 'Server error' });
  }
});

// 3. VNPAY IPN Webhook
app.get('/api/payment/vnpay-ipn', async (req, res) => {
  try {
      let vnp_Params = req.query;
      const secureHash = vnp_Params['vnp_SecureHash'];
      const amount = vnp_Params['vnp_Amount'] / 100;
      const orderId = vnp_Params['vnp_TxnRef'];
      const responseCode = vnp_Params['vnp_ResponseCode'];
      const walletId = vnp_Params['vnp_OrderInfo']; 

      delete vnp_Params['vnp_SecureHash'];
      delete vnp_Params['vnp_SecureHashType'];

      function sortObject(obj) {
          let sorted = {};
          let str = [];
          let key;
          for (key in obj){ if (Object.prototype.hasOwnProperty.call(obj, key)) { str.push(encodeURIComponent(key)); } }
          str.sort();
          for (key = 0; key < str.length; key++) { sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+"); }
          return sorted;
      }

      vnp_Params = sortObject(vnp_Params);
      const secretKey = process.env.VNPAY_SECRET_KEY || 'DEMOSECRETKEY1234567890';
      const signData = querystring.stringify(vnp_Params, { encode: false });
      const hmac = crypto.createHmac("sha512", secretKey);
      const signed = hmac.update(new Buffer.from(signData, 'utf-8')).digest("hex");     

      if (secureHash !== signed) {
          return res.status(200).json({ RspCode: '97', Message: 'Checksum failed' });
      }

      if (responseCode !== '00') {
           return res.status(200).json({ RspCode: '00', Message: 'Success processing failed transaction' });
      }

      // Call RPC process_deposit
      const dbRes = await pool.query('SELECT process_deposit($1, $2, $3, $4) AS success', [walletId, amount, 'VNPAY', orderId]);
      const isSuccess = dbRes.rows[0].success;

      if (!isSuccess) {
           return res.status(200).json({ RspCode: '02', Message: 'Order already confirmed' });
      }

      res.status(200).json({ RspCode: '00', Message: 'Confirm Success' });
  } catch (err) {
      console.error('IPN Error:', err);
      res.status(200).json({ RspCode: '99', Message: 'Unknown error' });
  }
});

// 4. Hold Money (Book Lesson)
app.post('/api/escrow/hold', verifyToken, async (req, res) => {
  const { amount, lessonId } = req.body;
  try {
      const walletRes = await pool.query('SELECT id FROM wallets WHERE user_id = $1', [req.user.userId]);
      if (walletRes.rowCount === 0) return res.status(404).json({ success: false, message: 'V?� kh?�ng tồn tại' });
      const payerWalletId = walletRes.rows[0].id;

      const { rows } = await pool.query('SELECT hold_money_for_lesson($1, $2, $3) AS tx_id', [payerWalletId, amount, lessonId]);
      
      res.json({ success: true, transactionId: rows[0].tx_id });
  } catch (err) {
      // Trigger error from CHECK (balance >= amount)
      res.status(400).json({ success: false, message: 'Số dư kh?�ng đủ để thanh to?�n hoặc lỗi hệ thống.' });
  }
});

// 5. Release Escrow (Giải ng?�n cho Gia sư)
app.post('/api/escrow/release', verifyToken, async (req, res) => {
    const { transactionId, payerWalletId, tutorWalletId, amount } = req.body;
    // Lấy admin_wallet_id từ m?�i trường hoặc truy vấn user admin đầu ti?�n
    try {
        let adminWalletId = process.env.ADMIN_WALLET_ID;
        if (!adminWalletId) {
            const { rows } = await pool.query("SELECT w.id FROM wallets w JOIN users u ON w.user_id = u.id WHERE u.role='admin' LIMIT 1");
            if (rows.length > 0) adminWalletId = rows[0].id;
            else return res.status(500).json({ success: false, message: 'Lỗi hệ thống: Chưa cấu h?�nh v?� Admin.' });
        }

        const commissionRate = 0.1; // 10%
        const { error } = await pool.query('SELECT release_escrow($1, $2, $3, $4, $5, $6)', [
            transactionId, payerWalletId, tutorWalletId, adminWalletId, amount, commissionRate
        ]);
        res.json({ success: true, message: 'Đ?� giải ng?�n cho Gia sư' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 6. Resolve Dispute (Xử l?� khiếu nại - Admin)
app.post('/api/escrow/resolve-dispute', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    
    const { disputeId, transactionId, payerWalletId, tutorWalletId, amount, decision, adminNote } = req.body;
    
    try {
        if (decision === 'REFUND_TO_STUDENT') {
            await pool.query('SELECT refund_escrow($1, $2, $3)', [transactionId, payerWalletId, amount]);
            await pool.query("UPDATE disputes SET status = 'RESOLVED_REFUND', admin_note = $1, resolved_at = NOW() WHERE id = $2", [adminNote, disputeId]);
        } 
        else if (decision === 'RELEASE_TO_TUTOR') {
            let adminWalletId = process.env.ADMIN_WALLET_ID;
            if (!adminWalletId) {
                const { rows } = await pool.query("SELECT w.id FROM wallets w JOIN users u ON w.user_id = u.id WHERE u.role='admin' LIMIT 1");
                adminWalletId = rows[0].id;
            }
            await pool.query('SELECT release_escrow($1, $2, $3, $4, $5, $6)', [transactionId, payerWalletId, tutorWalletId, adminWalletId, amount, 0.1]);
            await pool.query("UPDATE disputes SET status = 'RESOLVED_RELEASE', admin_note = $1, resolved_at = NOW() WHERE id = $2", [adminNote, disputeId]);
        }
        res.json({ success: true, message: 'Đ?� xử l?� khiếu nại th?�nh c?�ng' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ══════════════════════════════════════════════════════════════════════════════
//  ESCROW EXTENDED — Report, Manual Release, Wallet History
// ══════════════════════════════════════════════════════════════════════════════

// POST /api/bookings/:id/report — Học sinh báo cáo vi phạm gia sư
app.post('/api/bookings/:id/report', verifyToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { reason } = req.body;
    if (!reason?.trim()) return res.status(400).json({ message: 'Vui lòng cung cấp lý do báo cáo.' });

    const bookingRes = await client.query(
      `SELECT b.* FROM bookings b WHERE b.id=$1 AND b.student_id=$2`,
      [req.params.id, req.user.userId]
    );
    if (!bookingRes.rows.length) return res.status(404).json({ message: 'Không tìm thấy lịch học.' });
    const booking = bookingRes.rows[0];
    if (!booking.escrow_tx_id) return res.status(400).json({ message: 'Lịch học này không có giao dịch escrow để khiếu nại.' });

    const existingDispute = await client.query(
      "SELECT id FROM disputes WHERE booking_id=$1 AND status='OPEN'", [booking.id]
    );
    if (existingDispute.rows.length) return res.status(409).json({ message: 'Bạn đã gửi khiếu nại cho buổi học này rồi.' });

    await client.query('BEGIN');

    const dispute = await client.query(`
      INSERT INTO disputes (transaction_id, raised_by, reason, status, booking_id)
      VALUES ($1,$2,$3,'OPEN',$4) RETURNING id
    `, [booking.escrow_tx_id, req.user.userId, reason.trim(), booking.id]);

    // Pause auto-release
    await client.query(`UPDATE bookings SET auto_release_at=NULL WHERE id=$1`, [booking.id]);

    const admins = await client.query("SELECT id FROM users WHERE role='admin'");
    for (const admin of admins.rows) {
      await client.query(`
        INSERT INTO notifications (user_id,type,title,body,icon,ref_id,ref_type)
        VALUES ($1,'dispute_opened','Khiếu nại mới cần xử lý',$2,'gavel',$3,'dispute')
      `, [admin.id, `Học sinh báo cáo vi phạm buổi học ID: ${booking.id}. Lý do: ${reason}`, dispute.rows[0].id]);
    }
    if (booking.tutor_id) {
      await client.query(`
        INSERT INTO notifications (user_id,type,title,body,icon,ref_id,ref_type)
        VALUES ($1,'dispute_opened','Bạn đang bị khiếu nại',$2,'report',$3,'dispute')
      `, [booking.tutor_id, `Học sinh gửi khiếu nại. Admin sẽ xem xét và phán quyết.`, dispute.rows[0].id]);
    }

    await client.query('COMMIT');
    return res.status(201).json({ message: 'Đã gửi báo cáo. Admin sẽ xem xét trong 24-48h.', disputeId: dispute.rows[0].id });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Report error:', e);
    return res.status(500).json({ message: 'Server error.' });
  } finally {
    client.release();
  }
});

// POST /api/escrow/resolve-dispute-v2 — Admin xử lý khiếu nại
app.post('/api/escrow/resolve-dispute-v2', verifyToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  const client = await pool.connect();
  try {
    const { disputeId, decision, adminNote } = req.body;
    const disputeRes = await client.query(
      `SELECT d.*, b.escrow_tx_id, b.payer_wallet_id, b.tutor_id, b.student_id, b.lesson_fee, b.id AS booking_id
       FROM disputes d JOIN bookings b ON b.id=d.booking_id WHERE d.id=$1`,
      [disputeId]
    );
    if (!disputeRes.rows.length) return res.status(404).json({ message: 'Không tìm thấy khiếu nại.' });
    const dispute = disputeRes.rows[0];
    const lessonFee = Number(dispute.lesson_fee || 0);

    const tw = await client.query('SELECT id FROM wallets WHERE user_id=$1', [dispute.tutor_id]);
    const tutorWalletId = tw.rows.length ? tw.rows[0].id : null;
    let adminWalletId = process.env.ADMIN_WALLET_ID;
    if (!adminWalletId) {
      const aw = await client.query("SELECT w.id FROM wallets w JOIN users u ON w.user_id=u.id WHERE u.role='admin' LIMIT 1");
      if (aw.rows.length) adminWalletId = aw.rows[0].id;
    }

    await client.query('BEGIN');

    if (decision === 'REFUND_TO_STUDENT') {
      // Kịch bản B: gia sư vi phạm → hoàn 100% + phạt reputation -10
      await client.query('SELECT refund_escrow($1,$2,$3)', [dispute.escrow_tx_id, dispute.payer_wallet_id, lessonFee]);
      await client.query("UPDATE disputes SET status='RESOLVED_REFUND', admin_note=$1, resolved_at=NOW() WHERE id=$2", [adminNote, disputeId]);
      await client.query("UPDATE bookings SET escrow_released_at=NOW(), auto_release_at=NULL WHERE id=$1", [dispute.booking_id]);
      await client.query(`UPDATE tutor_profiles SET reputation_score=GREATEST(0,reputation_score-10) WHERE user_id=$1`, [dispute.tutor_id]);

      await client.query(`INSERT INTO notifications (user_id,type,title,body,icon,ref_id,ref_type) VALUES ($1,'dispute_resolved','Khiếu nại: Đã hoàn tiền',$2,'check_circle',$3,'dispute')`,
        [dispute.student_id, `Admin phán quyết: Hoàn ${lessonFee.toLocaleString('vi-VN')}đ vào ví bạn.`, disputeId]);
      if (dispute.tutor_id) {
        await client.query(`INSERT INTO notifications (user_id,type,title,body,icon,ref_id,ref_type) VALUES ($1,'dispute_resolved','Khiếu nại: Phán quyết chống lại bạn',$2,'gavel',$3,'dispute')`,
          [dispute.tutor_id, `Admin hoàn tiền cho học sinh. Điểm uy tín bị trừ 10.`, disputeId]);
      }
    } else if (decision === 'RELEASE_TO_TUTOR') {
      // Học sinh khiếu nại không có cơ sở
      if (!tutorWalletId || !adminWalletId) { await client.query('ROLLBACK'); return res.status(500).json({ message: 'Thiếu ví.' }); }
      await client.query('SELECT release_escrow($1,$2,$3,$4,$5,$6)', [dispute.escrow_tx_id, dispute.payer_wallet_id, tutorWalletId, adminWalletId, lessonFee, 0.1]);
      await client.query("UPDATE disputes SET status='RESOLVED_RELEASE', admin_note=$1, resolved_at=NOW() WHERE id=$2", [adminNote, disputeId]);
      await client.query("UPDATE bookings SET escrow_released_at=NOW(), auto_release_at=NULL WHERE id=$1", [dispute.booking_id]);

      await client.query(`INSERT INTO notifications (user_id,type,title,body,icon,ref_id,ref_type) VALUES ($1,'dispute_resolved','Khiếu nại không được chấp nhận',$2,'gavel',$3,'dispute')`,
        [dispute.student_id, `Admin xem xét và giải ngân cho gia sư vì khiếu nại không có cơ sở.`, disputeId]);
    }

    await client.query('COMMIT');
    return res.json({ success: true, message: 'Đã xử lý khiếu nại.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Resolve dispute v2 error:', err);
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// POST /api/escrow/manual-release/:bookingId — Học sinh xác nhận hoàn thành sớm (không chờ 24h)
app.post('/api/escrow/manual-release/:bookingId', verifyToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const bookingRes = await client.query(
      `SELECT b.* FROM bookings b JOIN attendance a ON a.booking_id=b.id
       WHERE b.id=$1 AND b.student_id=$2 AND a.status='present'
         AND b.escrow_released_at IS NULL AND b.escrow_tx_id IS NOT NULL`,
      [req.params.bookingId, req.user.userId]
    );
    if (!bookingRes.rows.length) return res.status(404).json({ message: 'Không tìm thấy buổi học hợp lệ để xác nhận.' });
    const booking = bookingRes.rows[0];
    const lessonFee = Number(booking.lesson_fee || 0);

    const openDispute = await client.query("SELECT id FROM disputes WHERE booking_id=$1 AND status='OPEN'", [booking.id]);
    if (openDispute.rows.length) return res.status(400).json({ message: 'Đang có khiếu nại mở, không thể xác nhận.' });

    const tw = await client.query('SELECT id FROM wallets WHERE user_id=$1', [booking.tutor_id]);
    if (!tw.rows.length) return res.status(404).json({ message: 'Không tìm thấy ví gia sư.' });

    let adminWalletId = process.env.ADMIN_WALLET_ID;
    if (!adminWalletId) {
      const aw = await client.query("SELECT w.id FROM wallets w JOIN users u ON w.user_id=u.id WHERE u.role='admin' LIMIT 1");
      if (aw.rows.length) adminWalletId = aw.rows[0].id;
    }

    await client.query('BEGIN');

    // Logic cọc ảo: 2 buổi đầu → held_balance gia sư, buổi 3+ → balance thẳng
    const completedRes = await client.query('SELECT completed_lessons_count FROM tutor_profiles WHERE user_id=$1', [booking.tutor_id]);
    const completedCount = completedRes.rows[0]?.completed_lessons_count || 0;
    const tutorAmount = Math.floor(lessonFee * 0.9);
    const adminAmount = lessonFee - tutorAmount;

    if (completedCount < 2) {
      // Cọc ảo: cộng vào held_balance gia sư
      await client.query('UPDATE wallets SET held_balance=held_balance-$1 WHERE id=$2', [lessonFee, booking.payer_wallet_id]);
      await client.query('UPDATE wallets SET held_balance=held_balance+$1 WHERE id=$2', [tutorAmount, tw.rows[0].id]);
      if (adminWalletId) await client.query('UPDATE wallets SET balance=balance+$1 WHERE id=$2', [adminAmount, adminWalletId]);
      await client.query('UPDATE transactions SET status=\'RELEASED\', updated_at=NOW() WHERE id=$1', [booking.escrow_tx_id]);
      await client.query(`INSERT INTO notifications (user_id,type,title,body,icon,ref_id,ref_type) VALUES ($1,'escrow_released','Tiền giữ trong quỹ đảm bảo',$2,'lock',$3,'booking')`,
        [booking.tutor_id, `${tutorAmount.toLocaleString('vi-VN')}đ trong quỹ đảm bảo. Sẽ rút được sau buổi thứ 3.`, booking.id]);
    } else {
      // Buổi 3+: giải ngân thẳng vào balance
      await client.query('SELECT release_escrow($1,$2,$3,$4,$5,$6)', [
        booking.escrow_tx_id, booking.payer_wallet_id, tw.rows[0].id, adminWalletId, lessonFee, 0.1
      ]);
      await client.query(`INSERT INTO notifications (user_id,type,title,body,icon,ref_id,ref_type) VALUES ($1,'escrow_released','Tiền học phí đã vào ví',$2,'payments',$3,'booking')`,
        [booking.tutor_id, `${tutorAmount.toLocaleString('vi-VN')}đ đã vào ví (sau 10% hoa hồng).`, booking.id]);
    }

    await client.query('UPDATE tutor_profiles SET completed_lessons_count=completed_lessons_count+1 WHERE user_id=$1', [booking.tutor_id]);
    await client.query('UPDATE bookings SET escrow_released_at=NOW(), auto_release_at=NULL WHERE id=$1', [booking.id]);

    await client.query('COMMIT');
    return res.json({ success: true, message: 'Đã xác nhận hoàn thành và giải ngân.' });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Manual release error:', e);
    return res.status(500).json({ success: false, message: 'Server error.' });
  } finally {
    client.release();
  }
});

// GET /api/payment/transactions — Lịch sử giao dịch ví
app.get('/api/payment/transactions', verifyToken, async (req, res) => {
  try {
    const walletRes = await pool.query('SELECT id FROM wallets WHERE user_id=$1', [req.user.userId]);
    if (!walletRes.rows.length) return res.status(404).json({ message: 'Ví không tồn tại.' });
    const transactions = await pool.query(`
      SELECT t.id, t.amount, t.type, t.status, t.gateway, t.description, t.created_at,
             b.subject, to_char(b.lesson_date,'YYYY-MM-DD') AS lesson_date
      FROM transactions t
      LEFT JOIN bookings b ON b.id=t.reference_id
      WHERE t.wallet_id=$1
      ORDER BY t.created_at DESC LIMIT 50
    `, [walletRes.rows[0].id]);
    return res.json({ transactions: transactions.rows });
  } catch (e) {
    console.error('Transactions error:', e);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// GET /api/payment/wallet/full — Thông tin ví đầy đủ
app.get('/api/payment/wallet/full', verifyToken, async (req, res) => {
  try {
    const walletRes = await pool.query('SELECT w.* FROM wallets w WHERE w.user_id=$1', [req.user.userId]);
    if (!walletRes.rows.length) return res.status(404).json({ message: 'Ví không tồn tại.' });
    const wallet = walletRes.rows[0];
    const [deposited, earned] = await Promise.all([
      pool.query("SELECT COALESCE(SUM(amount),0) AS total FROM transactions WHERE wallet_id=$1 AND type='DEPOSIT' AND status='SUCCESS'", [wallet.id]),
      pool.query("SELECT COALESCE(SUM(amount),0) AS total FROM transactions WHERE wallet_id=$1 AND type='PAYMENT' AND status='SUCCESS'", [wallet.id])
    ]);
    return res.json({ wallet: { ...wallet, total_deposited: Number(deposited.rows[0].total), total_earned: Number(earned.rows[0].total) } });
  } catch (e) {
    res.status(500).json({ message: 'Server error.' });
  }
});
  try {
    // bookings: thêm escrow_tx_id (link tới transaction đang hold)
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS escrow_tx_id UUID REFERENCES transactions(id)`);
    // bookings: thêm payer_wallet_id (ai đã hold tiền)
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payer_wallet_id UUID REFERENCES wallets(id)`);
    // bookings: thêm lesson_fee (giá trị thực tế của buổi học)
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS lesson_fee NUMERIC(15,2) DEFAULT 0`);
    // bookings: thêm escrow_released_at (thời điểm giải ngân)
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS escrow_released_at TIMESTAMPTZ`);
    // bookings: thêm auto_release_at (thời điểm tự động giải ngân nếu không khiếu nại)
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS auto_release_at TIMESTAMPTZ`);
    // tutor_profiles: reputation_score
    await pool.query(`ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS reputation_score INT NOT NULL DEFAULT 100`);
    // tutor_profiles: completed_lessons_count (cho logic cọc ảo)
    await pool.query(`ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS completed_lessons_count INT NOT NULL DEFAULT 0`);
    // disputes: thêm booking_id để dễ query
    await pool.query(`ALTER TABLE disputes ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES bookings(id)`);
    console.log('✅ DB migration: escrow & reputation columns ready');
  } catch (err) {
    console.error('⚠️  DB migration (escrow cols) warning:', err.message);
  }

  // ── Auto-migrate: parent feature tables ────────────────────────────────────
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tutor_sessions (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tutor_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        subject       TEXT NOT NULL,
        scheduled_at  TIMESTAMPTZ NOT NULL,
        duration_mins INT NOT NULL DEFAULT 120,
        status        TEXT NOT NULL DEFAULT 'scheduled'
                      CHECK (status IN ('scheduled','completed','cancelled','absent','late')),
        notes         TEXT,
        leave_reason  TEXT,
        created_at    TIMESTAMPTZ DEFAULT NOW(),
        updated_at    TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_tutor_sessions_student  ON tutor_sessions(student_id);
      CREATE INDEX IF NOT EXISTS idx_tutor_sessions_tutor    ON tutor_sessions(tutor_id);
      CREATE INDEX IF NOT EXISTS idx_tutor_sessions_schedule ON tutor_sessions(scheduled_at);

      CREATE TABLE IF NOT EXISTS tutor_reviews (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tutor_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        subject      TEXT NOT NULL,
        period_label TEXT NOT NULL,
        content      TEXT NOT NULL,
        rating       INT NOT NULL DEFAULT 3 CHECK (rating BETWEEN 1 AND 5),
        created_at   TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_tutor_reviews_student ON tutor_reviews(student_id);

      CREATE TABLE IF NOT EXISTS invoices (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        parent_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        student_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tutor_id    UUID REFERENCES users(id),
        invoice_no  TEXT NOT NULL UNIQUE,
        subject     TEXT,
        period      TEXT,
        amount      BIGINT NOT NULL,
        status      TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','paid','overdue','cancelled')),
        due_date    DATE,
        paid_at     TIMESTAMPTZ,
        pay_method  TEXT,
        notes       TEXT,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_invoices_parent  ON invoices(parent_id);
      CREATE INDEX IF NOT EXISTS idx_invoices_student ON invoices(student_id);

      CREATE TABLE IF NOT EXISTS notifications (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type        TEXT NOT NULL,
        title       TEXT NOT NULL,
        body        TEXT NOT NULL,
        icon        TEXT DEFAULT 'notifications',
        is_read     BOOLEAN DEFAULT FALSE,
        ref_id      UUID,
        ref_type    TEXT,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_notifications_user   ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);
    `);
    console.log('✅ DB migration: parent feature tables ready');
  } catch (err) {
    console.error('⚠️  DB migration (parent features) warning:', err.message);
  }

  // ── Cron: Auto-release escrow sau 24h nếu không có khiếu nại ───────────────
  setInterval(async () => {
    try {
      // Lấy các booking đã mark present, đã qua auto_release_at, chưa giải ngân
      const due = await pool.query(`
        SELECT b.id, b.escrow_tx_id, b.payer_wallet_id, b.lesson_fee, b.tutor_id
        FROM bookings b
        JOIN attendance a ON a.booking_id = b.id
        WHERE b.status = 'Approved'
          AND a.status = 'present'
          AND b.escrow_released_at IS NULL
          AND b.escrow_tx_id IS NOT NULL
          AND b.auto_release_at IS NOT NULL
          AND b.auto_release_at <= NOW()
          AND NOT EXISTS (
            SELECT 1 FROM disputes d WHERE d.booking_id = b.id AND d.status = 'OPEN'
          )
      `);

      for (const row of due.rows) {
        try {
          // Lấy tutor wallet
          const tw = await pool.query('SELECT id FROM wallets WHERE user_id=$1', [row.tutor_id]);
          if (!tw.rows.length) continue;
          const tutorWalletId = tw.rows[0].id;

          // Lấy admin wallet
          let adminWalletId = process.env.ADMIN_WALLET_ID;
          if (!adminWalletId) {
            const aw = await pool.query("SELECT w.id FROM wallets w JOIN users u ON w.user_id=u.id WHERE u.role='admin' LIMIT 1");
            if (!aw.rows.length) continue;
            adminWalletId = aw.rows[0].id;
          }

          await pool.query('SELECT release_escrow($1,$2,$3,$4,$5,$6)', [
            row.escrow_tx_id, row.payer_wallet_id, tutorWalletId, adminWalletId, row.lesson_fee, 0.1
          ]);

          await pool.query(`UPDATE bookings SET escrow_released_at=NOW() WHERE id=$1`, [row.id]);

          // Cộng completed_lessons_count cho gia sư
          await pool.query(`
            UPDATE tutor_profiles SET completed_lessons_count = completed_lessons_count + 1
            WHERE user_id = $1
          `, [row.tutor_id]);

          // Thông báo cho gia sư
          await pool.query(`
            INSERT INTO notifications (user_id, type, title, body, icon, ref_id, ref_type)
            VALUES ($1,'escrow_released','Tiền học phí đã được giải ngân',$2,'payments',$3,'booking')
          `, [row.tutor_id, `Học phí buổi học đã được chuyển vào ví của bạn (sau 24h xác nhận).`, row.id]);

          console.log(`✅ Auto-released escrow for booking ${row.id}`);
        } catch (innerErr) {
          console.error(`❌ Auto-release failed for booking ${row.id}:`, innerErr.message);
        }
      }
    } catch (err) {
      if (err.code !== 'ENOTFOUND' && err.code !== 'EAI_AGAIN') {
        console.error('❌ Cron auto-release error:', err.message);
      }
    }
  }, 5 * 60 * 1000); // chạy mỗi 5 phút


  // ── Cron: Tự động hủy lịch nếu Gia sư không duyệt sau 24h ───────────────
  setInterval(async () => {
    try {
      // Tìm bookings Pending > 24h
      const dueBookings = await pool.query(`
        SELECT b.id, b.student_id, b.tutor_id, b.escrow_tx_id, b.payer_wallet_id, b.lesson_fee
        FROM bookings b
        WHERE b.status = 'Pending'
          AND b.created_at <= NOW() - INTERVAL '24 hours'
      `);

      for (const row of dueBookings.rows) {
        try {
          if (row.escrow_tx_id && Number(row.lesson_fee) > 0) {
            // Hoàn tiền cho học sinh
            await pool.query('SELECT refund_escrow($1,$2,$3)', [
              row.escrow_tx_id, row.payer_wallet_id, row.lesson_fee
            ]);
            await pool.query(`UPDATE bookings SET status='Cancelled', escrow_released_at=NOW() WHERE id=$1`, [row.id]);
          } else {
            // Hủy không hoàn tiền
            await pool.query(`UPDATE bookings SET status='Cancelled' WHERE id=$1`, [row.id]);
          }

          // Thông báo cho Học sinh
          await pool.query(`
            INSERT INTO notifications (user_id, type, title, body, icon, ref_id, ref_type)
            VALUES ($1,'refund','Lịch học đã bị hủy do gia sư không phản hồi',$2,'undo',$3,'booking')
          `, [row.student_id, `Hệ thống đã hủy lịch học và hoàn lại ${Number(row.lesson_fee||0).toLocaleString('vi-VN')}đ vì gia sư không duyệt trong 24h.`, row.id]);

          // Thông báo cho Gia sư
          await pool.query(`
            INSERT INTO notifications (user_id, type, title, body, icon, ref_id, ref_type)
            VALUES ($1,'cancellation','Lịch học bị hủy tự động',$2,'event_busy',$3,'booking')
          `, [row.tutor_id, `Một lịch học đã bị hủy vì bạn không phản hồi trong 24h.`, row.id]);

          console.log(`✅ Auto-cancelled unapproved booking ${row.id}`);
        } catch (innerErr) {
          console.error(`❌ Auto-cancel failed for booking ${row.id}:`, innerErr.message);
        }
      }
    } catch (err) {
      if (err.code !== 'ENOTFOUND' && err.code !== 'EAI_AGAIN') {
        console.error('❌ Cron auto-cancel error:', err.message);
      }
    }
  }, 10 * 60 * 1000); // chạy mỗi 10 phút

  app.listen(port, () => {
    console.log(`🚀 Server is running on http://localhost:${port}`);
  });
}

startServer();

