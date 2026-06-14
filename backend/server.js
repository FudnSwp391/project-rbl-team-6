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
const { generateQuizQuestions, chatWithAI } = require("./gemini");

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 5000);
const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
const googleClientId = process.env.GOOGLE_CLIENT_ID || "";
const jwtSecret = process.env.JWT_SECRET || "dev_jwt_secret_change_me";
const googleClient = new OAuth2Client(googleClientId);

// ΓöÇΓöÇΓöÇ Middleware ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
app.use(cors({ origin: frontendOrigin }));
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

// ΓöÇΓöÇΓöÇ Middleware: verifyToken ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
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
    { name: "profile_photo", maxCount: 1 },
    { name: "certificate",   maxCount: 1 },
    { name: "cccd",          maxCount: 1 },
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
        if (certPath)  { query += `, certificate_url = $${idx}`;   values.push(certPath);  idx++; }
        if (cccdPath)  { query += `, cccd_url = $${idx}`;          values.push(cccdPath);  idx++; }

        query += ` WHERE user_id = $18 RETURNING *`;
        result = await pool.query(query, values);
      } else {
        // ΓöÇΓöÇ INSERT ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
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

// ΓöÇΓöÇΓöÇ PATCH /api/admin/tutors/:id/approve ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
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

// ── GET /api/admin/users ──────────────────────────────────────────────────────
// Returns all users with optional search and role filter. Supports pagination.
// Query params: search, role, page (default 1), limit (default 20)
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
    const { topic, count = 10, difficulty = 'medium', timeLimitMins = null } = req.body;
    if (!topic?.trim()) return res.status(400).json({ message: 'Topic is required.' });
    const diff = ['easy','medium','hard'].includes(difficulty) ? difficulty : 'medium';
    const questionCount = Math.min(Math.max(Number(count)||10,1),30);
    const questions = await generateQuizQuestions(topic.trim(), questionCount, diff);
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
    const safeQ = questions.map((q,i) => ({ index:i, question:q.question, optionA:q.optionA, optionB:q.optionB, optionC:q.optionC, optionD:q.optionD }));
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
    const questions = (session.questions || []).map((q,i) => ({ index:i, question:q.question, optionA:q.optionA, optionB:q.optionB, optionC:q.optionC, optionD:q.optionD }));
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

app.listen(port, () => {
  console.log(`🚀 Server is running on http://localhost:${port}`);
});
