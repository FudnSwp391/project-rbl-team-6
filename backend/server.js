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
const { generateQuizQuestions, chatWithAI, gradeEssayAnswer } = require("./gemini");

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 5000);
const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
const googleClientId = process.env.GOOGLE_CLIENT_ID || "";
const jwtSecret = process.env.JWT_SECRET || "dev_jwt_secret_change_me";
const googleClient = new OAuth2Client(googleClientId);

// Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡ Middleware Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡
app.use(cors({ origin: frontendOrigin }));
app.use(express.json());

// Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡ Helper: tÃŸâ•‘Ã­o JWT token Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡
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

// Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡ Middleware: verifyToken Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡
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

// Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡ Middleware: requireAdmin Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡
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

// Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡ Nodemailer: email helper Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡
// GÃŸâ•—Â¡i email thâ”œâ”¤ng bâ”œÃ­o kÃŸâ•‘â”t quÃŸâ•‘Ãº kiÃŸâ•—Ã¢m duyÃŸâ•—Ã§t hÃŸâ•—Ã´ sâ•žÃ­ gia sâ•žâ–‘.
// NÃŸâ•‘â”u SMTP châ•žâ–‘a cÃŸâ•‘Ã‘u hâ”œÂ¼nh Î“Ã¥Ã† log warning vâ”œÃ¡ bÃŸâ•—Ã… qua (khâ”œâ”¤ng crash server).

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
    console.log(`[Email] SMTP châ•žâ–‘a cÃŸâ•‘Ã‘u hâ”œÂ¼nh Î“Ã‡Ã¶ bÃŸâ•—Ã… qua email tÃŸâ•—Â¢i ${to}`);
    return;
  }

  const isApproved = status === "approved";

  // NO emoji in subject Î“Ã‡Ã¶ major spam trigger when sending GmailÎ“Ã¥Ã†Gmail via SMTP
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
              <span style="font-size:40px;">Î“Â£Ã </span>
            </div>
            <h2 style="margin:0 0 12px;color:#191c1e;font-size:24px;font-weight:700;">Châ”œâ•‘c mÃŸâ•—Â½ng! HÃŸâ•—Ã´ sâ•žÃ­ â”€Ã¦â”œÃº â”€Ã¦â•žâ–‘ÃŸâ•—Ãºc duyÃŸâ•—Ã§t</h2>
            <p style="margin:0;color:#444653;font-size:16px;line-height:1.6;">
              HÃŸâ•—Ã´ sâ•žÃ­ â”€Ã¦â”€Ã¢ng kâ”œâ•œ gia sâ•žâ–‘ cÃŸâ•—Âºa bÃŸâ•‘Ã­n trâ”œÂ¬n <strong>EduX</strong> â”€Ã¦â”œÃº â”€Ã¦â•žâ–‘ÃŸâ•—Ãºc <strong style="color:#16a34a;">chÃŸâ•‘Ã‘p thuÃŸâ•‘Â¡n</strong>.
              Tâ”œÃ¡i khoÃŸâ•‘Ãºn gia sâ•žâ–‘ cÃŸâ•—Âºa bÃŸâ•‘Ã­n hiÃŸâ•—Ã§n â”€Ã¦â”œÃº <strong>hoÃŸâ•‘Ã­t â”€Ã¦ÃŸâ•—Ã–ng â”€Ã¦ÃŸâ•‘Âºy â”€Ã¦ÃŸâ•—Âº</strong>.
            </p>
          </td>
        </tr>
        <!-- What's next -->
        <tr>
          <td style="padding:32px 40px;">
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:24px;">
              <h3 style="margin:0 0 16px;color:#15803d;font-size:16px;font-weight:700;">BÃŸâ•‘Ã­n câ”œâ”‚ thÃŸâ•—Ã¢ lâ”œÃ¡m gâ”œÂ¼ tiÃŸâ•‘â”p theo?</h3>
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding:8px 0;color:#444653;font-size:15px;">
                    <span style="color:#16a34a;font-weight:bold;margin-right:8px;">Î“Ã¥Ã†</span>â”€Ã‰â”€Ã¢ng nhÃŸâ•‘Â¡p vâ”œÃ¡ hoâ”œÃ¡n thiÃŸâ•—Ã§n hÃŸâ•—Ã´ sâ•žÃ­ gia sâ•žâ–‘
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#444653;font-size:15px;">
                    <span style="color:#16a34a;font-weight:bold;margin-right:8px;">Î“Ã¥Ã†</span>BÃŸâ•‘Â»t â”€Ã¦ÃŸâ•‘Âºu nhÃŸâ•‘Â¡n yâ”œÂ¬u cÃŸâ•‘Âºu tÃŸâ•—Â½ hÃŸâ•—Ã¬c sinh
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#444653;font-size:15px;">
                    <span style="color:#16a34a;font-weight:bold;margin-right:8px;">Î“Ã¥Ã†</span>ThiÃŸâ•‘â”t lÃŸâ•‘Â¡p lÃŸâ•—Ã¯ch dÃŸâ•‘Ã­y vâ”œÃ¡ mÃŸâ•—âŒc hÃŸâ•—Ã¬c phâ”œÂ¡
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
              <p style="margin:0 0 8px;color:#1d4ed8;font-size:14px;font-weight:700;">â‰¡Æ’Ã´Â¥ Ghi châ”œâ•‘ tÃŸâ•—Â½ Ban QuÃŸâ•‘Ãºn TrÃŸâ•—Ã¯:</p>
              <p style="margin:0;color:#1e3a5f;font-size:15px;line-height:1.6;white-space:pre-line;">${notes}</p>
            </div>
          </td>
        </tr>` : ''}
        <!-- CTA Button -->
        <tr>
          <td style="padding:0 40px 40px;text-align:center;">
            <a href="${frontendUrl}#/tutor"
               style="display:inline-block;background:linear-gradient(135deg,#00288e,#1e40af);color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:16px 40px;border-radius:12px;box-shadow:0 4px 12px rgba(0,40,142,0.3);">
              Vâ”œÃ¡o Dashboard Gia Sâ•žâ–‘ Î“Ã¥Ã†
            </a>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8f9fb;padding:24px 40px;text-align:center;border-top:1px solid #e1e2e4;">
            <p style="margin:0;color:#757684;font-size:13px;">â”¬âŒ 2024 EduX. MÃŸâ•—Ã¬i thÃŸâ•‘Â»c mÃŸâ•‘Â»c xin liâ”œÂ¬n hÃŸâ•—Ã§ <a href="mailto:support@edux.com" style="color:#00288e;">support@edux.com</a></p>
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
              <span style="font-size:40px;">Î“Â¥Ã®</span>
            </div>
            <h2 style="margin:0 0 12px;color:#191c1e;font-size:24px;font-weight:700;">HÃŸâ•—Ã´ sâ•žÃ­ châ•žâ–‘a â”€Ã¦â•žâ–‘ÃŸâ•—Ãºc chÃŸâ•‘Ã‘p thuÃŸâ•‘Â¡n</h2>
            <p style="margin:0;color:#444653;font-size:16px;line-height:1.6;">
              CÃŸâ•‘Ãºm â•žÃ­n bÃŸâ•‘Ã­n â”€Ã¦â”œÃº â”€Ã¦â”€Ã¢ng kâ”œâ•œ lâ”œÃ¡m gia sâ•žâ–‘ trâ”œÂ¬n <strong>EduX</strong>.
              Sau khi xem xâ”œâŒt, hÃŸâ•—Ã´ sâ•žÃ­ cÃŸâ•—Âºa bÃŸâ•‘Ã­n hiÃŸâ•—Ã§n châ•žâ–‘a â”€Ã¦â”œÃ­p ÃŸâ•—âŒng â”€Ã¦ÃŸâ•—Âº â”€Ã¦iÃŸâ•—Ã¼u kiÃŸâ•—Ã§n.
            </p>
          </td>
        </tr>
        <!-- Reject reason -->
        ${reason ? `
        <tr>
          <td style="padding:24px 40px 0;">
            <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:20px 24px;">
              <p style="margin:0 0 8px;color:#991b1b;font-size:14px;font-weight:700;">â‰¡Æ’Ã´Ã¯ Lâ”œâ•œ do tÃŸâ•—Â½ chÃŸâ•—Ã¦i:</p>
              <p style="margin:0;color:#b91c1c;font-size:15px;line-height:1.6;">${reason}</p>
            </div>
          </td>
        </tr>` : ''}
        <!-- Re-apply info -->
        <tr>
          <td style="padding:24px 40px;">
            <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:20px 24px;">
              <h3 style="margin:0 0 12px;color:#1d4ed8;font-size:15px;font-weight:700;">â‰¡Æ’Ã†Ã­ BÃŸâ•‘Ã­n câ”œâ”‚ thÃŸâ•—Ã¢ lâ”œÃ¡m gâ”œÂ¼?</h3>
              <p style="margin:0;color:#444653;font-size:15px;line-height:1.6;">
                Hâ”œÃºy xem xâ”œâŒt lÃŸâ•‘Ã­i câ”œÃ­c thâ”œâ”¤ng tin vâ”œÃ¡ tâ”œÃ¡i liÃŸâ•—Ã§u trong hÃŸâ•—Ã´ sâ•žÃ­, sau â”€Ã¦â”œâ”‚ chÃŸâ•—Ã«nh sÃŸâ•—Â¡a vâ”œÃ¡ nÃŸâ•—Ã–p lÃŸâ•‘Ã­i â”€Ã¦ÃŸâ•—Ã¢ â”€Ã¦â•žâ–‘ÃŸâ•—Ãºc xem xâ”œâŒt lÃŸâ•‘Âºn tiÃŸâ•‘â”p theo.
              </p>
            </div>
          </td>
        </tr>
        <!-- Notes from admin (optional) -->
        ${notes ? `
        <tr>
          <td style="padding:0 40px 24px;">
            <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:20px 24px;">
              <p style="margin:0 0 8px;color:#9a3412;font-size:14px;font-weight:700;">â‰¡Æ’Ã´Â¥ Ghi châ”œâ•‘ tÃŸâ•—Â½ Ban QuÃŸâ•‘Ãºn TrÃŸâ•—Ã¯:</p>
              <p style="margin:0;color:#7c2d12;font-size:15px;line-height:1.6;white-space:pre-line;">${notes}</p>
            </div>
          </td>
        </tr>` : ''}
        <!-- CTA -->
        <tr>
          <td style="padding:0 40px 40px;text-align:center;">
            <a href="${frontendUrl}#/tutor-profile"
               style="display:inline-block;background:linear-gradient(135deg,#00288e,#1e40af);color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:16px 40px;border-radius:12px;box-shadow:0 4px 12px rgba(0,40,142,0.3);">
              ChÃŸâ•—Ã«nh sÃŸâ•—Â¡a &amp; NÃŸâ•—Ã–p lÃŸâ•‘Ã­i hÃŸâ•—Ã´ sâ•žÃ­ Î“Ã¥Ã†
            </a>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8f9fb;padding:24px 40px;text-align:center;border-top:1px solid #e1e2e4;">
            <p style="margin:0;color:#757684;font-size:13px;">â”¬âŒ 2024 EduX. MÃŸâ•—Ã¬i thÃŸâ•‘Â»c mÃŸâ•‘Â»c xin liâ”œÂ¬n hÃŸâ•—Ã§ <a href="mailto:support@edux.com" style="color:#00288e;">support@edux.com</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const isApprovedStatus = status === "approved";
  const plainText = isApprovedStatus
    ? `Châ”œâ•‘c mÃŸâ•—Â½ng! HÃŸâ•—Ã´ sâ•žÃ­ gia sâ•žâ–‘ cÃŸâ•—Âºa bÃŸâ•‘Ã­n trâ”œÂ¬n EduX â”€Ã¦â”œÃº â”€Ã¦â•žâ–‘ÃŸâ•—Ãºc CHÃŸâ•‘Ã±P THUÃŸâ•‘Â¼N.\n\nTâ”œÃ¡i khoÃŸâ•‘Ãºn gia sâ•žâ–‘ cÃŸâ•—Âºa bÃŸâ•‘Ã­n hiÃŸâ•—Ã§n â”€Ã¦â”œÃº hoÃŸâ•‘Ã­t â”€Ã¦ÃŸâ•—Ã–ng â”€Ã¦ÃŸâ•‘Âºy â”€Ã¦ÃŸâ•—Âº.\n${notes ? `\nGhi châ”œâ•‘ tÃŸâ•—Â½ Ban QuÃŸâ•‘Ãºn TrÃŸâ•—Ã¯:\n${notes}\n` : ''}\nTruy cÃŸâ•‘Â¡p: ${process.env.FRONTEND_ORIGIN || 'http://localhost:5173'}#/tutor\n\nEduX Î“Ã‡Ã¶ support@edux.com`
    : `HÃŸâ•—Ã´ sâ•žÃ­ gia sâ•žâ–‘ cÃŸâ•—Âºa bÃŸâ•‘Ã­n trâ”œÂ¬n EduX CHâ•žÂ»A â”€Ã¦â•žâ–‘ÃŸâ•—Ãºc chÃŸâ•‘Ã‘p thuÃŸâ•‘Â¡n.\n\nLâ”œâ•œ do: ${reason || 'Khâ”œâ”¤ng â”€Ã¦â”œÃ­p ÃŸâ•—âŒng â”€Ã¦ÃŸâ•—Âº â”€Ã¦iÃŸâ•—Ã¼u kiÃŸâ•—Ã§n'}\n${notes ? `\nGhi châ”œâ•‘ tÃŸâ•—Â½ Ban QuÃŸâ•‘Ãºn TrÃŸâ•—Ã¯:\n${notes}\n` : ''}\nBÃŸâ•‘Ã­n câ”œâ”‚ thÃŸâ•—Ã¢ chÃŸâ•—Ã«nh sÃŸâ•—Â¡a vâ”œÃ¡ nÃŸâ•—Ã–p lÃŸâ•‘Ã­i: ${process.env.FRONTEND_ORIGIN || 'http://localhost:5173'}#/tutor-profile\n\nEduX Î“Ã‡Ã¶ support@edux.com`;

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
    console.log(`[Email] Î“Â£Ã  â”€Ã‰â”œÃº gÃŸâ•—Â¡i email ${status} tÃŸâ•—Â¢i ${to}`);
  } catch (err) {
    console.error(`[Email] Î“Â¥Ã® GÃŸâ•—Â¡i email thÃŸâ•‘Ã‘t bÃŸâ•‘Ã­i tÃŸâ•—Â¢i ${to}:`, err.message);
  }
}

async function sendPasswordResetEmail(to, otp) {
  if (!emailTransporter) {
    console.log(`[Email] SMTP châ•žâ–‘a cÃŸâ•‘Ã‘u hâ”œÂ¼nh Î“Ã‡Ã¶ bÃŸâ•—Ã… qua email tÃŸâ•—Â¢i ${to}`);
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
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">NÃŸâ•—Ã¼n tÃŸâ•‘Ãºng kÃŸâ•‘â”t nÃŸâ•—Ã¦i gia sâ•žâ–‘ chuyâ”œÂ¬n nghiÃŸâ•—Ã§p</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;text-align:center;">
            <h2 style="margin:0 0 12px;color:#191c1e;font-size:24px;font-weight:700;">Khâ”œâ”¤i phÃŸâ•—Ã‘c mÃŸâ•‘Â¡t khÃŸâ•‘âŒu</h2>
            <p style="margin:0;color:#444653;font-size:16px;line-height:1.6;">
              Mâ”œÃº xâ”œÃ­c thÃŸâ•—â–’c OTP (dâ”œâ•£ng mÃŸâ•—Ã–t lÃŸâ•‘Âºn) cÃŸâ•—Âºa bÃŸâ•‘Ã­n lâ”œÃ¡:
            </p>
            <div style="margin:32px 0;background:#f0fdf4;border:2px dashed #bbf7d0;border-radius:12px;padding:24px;display:inline-block;">
              <span style="font-size:36px;font-weight:800;color:#16a34a;letter-spacing:8px;">${otp}</span>
            </div>
            <p style="margin:0;color:#757684;font-size:14px;line-height:1.6;">
              Mâ”œÃº nâ”œÃ¡y sÃŸâ•‘â•œ hÃŸâ•‘â”t hÃŸâ•‘Ã­n sau <strong>10 phâ”œâ•‘t</strong>. Vui lâ”œâ–“ng khâ”œâ”¤ng chia sÃŸâ•‘â•— mâ”œÃº nâ”œÃ¡y cho bÃŸâ•‘Ã‘t kÃŸâ•—â”‚ ai.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8f9fb;padding:24px 40px;text-align:center;border-top:1px solid #e1e2e4;">
            <p style="margin:0;color:#757684;font-size:13px;">â”¬âŒ 2024 EduX. MÃŸâ•—Ã¬i thÃŸâ•‘Â»c mÃŸâ•‘Â»c xin liâ”œÂ¬n hÃŸâ•—Ã§ <a href="mailto:support@edux.com" style="color:#00288e;">support@edux.com</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const plainText = `Mâ”œÃº OTP khâ”œâ”¤i phÃŸâ•—Ã‘c mÃŸâ•‘Â¡t khÃŸâ•‘âŒu cÃŸâ•—Âºa bÃŸâ•‘Ã­n lâ”œÃ¡: ${otp}\n\nMâ”œÃº nâ”œÃ¡y sÃŸâ•‘â•œ hÃŸâ•‘â”t hÃŸâ•‘Ã­n sau 10 phâ”œâ•‘t.`;

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
    console.log(`[Email] Î“Â£Ã  â”€Ã‰â”œÃº gÃŸâ•—Â¡i email OTP reset mÃŸâ•‘Â¡t khÃŸâ•‘âŒu tÃŸâ•—Â¢i ${to}`);
  } catch (err) {
    console.error(`[Email] Î“Â¥Ã® GÃŸâ•—Â¡i email OTP thÃŸâ•‘Ã‘t bÃŸâ•‘Ã­i tÃŸâ•—Â¢i ${to}:`, err.message);
  }
}


// Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡ Multer Configuration Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡
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

// Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡ Supabase Storage Helpers Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡
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
  // Already a full absolute URL Î“Ã‡Ã¶ return as-is
  if (rawSigned.startsWith('http://') || rawSigned.startsWith('https://')) {
    return rawSigned;
  }
  // Supabase returned "/object/sign/..." Î“Ã‡Ã¶ prepend base + /storage/v1
  if (rawSigned.startsWith('/object/')) {
    return `${SUPABASE_URL}/storage/v1${rawSigned}`;
  }
  // Already has /storage/v1 prefix or other format Î“Ã‡Ã¶ just prepend base URL
  return `${SUPABASE_URL}${rawSigned}`;
}


// Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡ GET / Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡
app.get("/", (req, res) => {
  res.send("EduX Backend is running Î“Â£Ã ");
});

// â”€Ã‰â”€Ã¶ POST /api/auth/check-email â”€Ã‰â”€Ã¶â”€Ã¶â”€Ã¶â”€Ã¶â”€Ã¶â”€Ã¶â”€Ã¶â”€Ã¶â”€Ã¶â”€Ã¶â”€Ã¶â”€Ã¶â”€Ã¶â”€Ã¶â”€Ã¶â”€Ã¶â”€Ã¶â”€Ã¶â”€Ã¶â”€Ã¶â”€Ã¶â”€Ã¶â”€Ã¶â”€Ã¶â”€Ã¶â”€Ã¶â”€Ã¶â”€Ã¶â”€Ã¶â”€Ã¶â”€Ã¶â”€Ã¶â”€Ã¶â”€Ã¶â”€Ã¶â”€Ã¶â”€Ã¶â”€Ã¶â”€Ã¶â”€Ã¶â”€Ã¶â”€Ã¶â”€Ã¶â”€Ã¶â”€Ã¶â”€Ã¶â”€Ã¶â”€Ã¶â”€Ã¶â”€Ã¶
// Kiá»ƒm tra email Ä‘Ã£ tá»“n táº¡i chÆ°a (dÃ¹ng trÆ°á»›c khi Ä‘Äƒng kÃ½ Ä‘á»ƒ bÃ¡o lá»—i sá»›m)
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
        message: "Email nÃ y Ä‘Ã£ Ä‘Æ°á»£c Ä‘Äƒng kÃ½ qua Google. Vui lÃ²ng Ä‘Äƒng nháº­p báº±ng Google.",
      });
    }
    return res.status(409).json({
      available: false,
      isGoogleAccount: false,
      message: "Email nÃ y Ä‘Ã£ Ä‘Æ°á»£c Ä‘Äƒng kÃ½. Vui lÃ²ng Ä‘Äƒng nháº­p.",
    });
  } catch (err) {
    console.error("check-email error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡ POST /api/auth/register Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡
// â”€Ã‰â”€Ã¢ng kâ”œâ•œ bÃŸâ•‘â–’ng email + password
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

    // KiÃŸâ•—Ã¢m tra email â”€Ã¦â”œÃº tÃŸâ•—Ã´n tÃŸâ•‘Ã­i châ•žâ–‘a
    const existing = await pool.query(
      "SELECT id, google_id FROM users WHERE email = $1",
      [email.toLowerCase().trim()]
    );
    if (existing.rows.length > 0) {
      if (existing.rows[0].google_id) {
        return res.status(409).json({
          message: "Email nÃ y Ä‘Ã£ Ä‘Æ°á»£c Ä‘Äƒng kÃ½ qua Google. Vui lÃ²ng Ä‘Äƒng nháº­p báº±ng Google.",
          isGoogleAccount: true,
        });
      }
      return res
        .status(409)
        .json({ message: "Email already registered. Please sign in." });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // TÃŸâ•‘Ã­o user mÃŸâ•—Â¢i
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

// Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡ POST /api/auth/forgot-password/request-otp Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡
app.post("/api/auth/forgot-password/request-otp", async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const result = await pool.query("SELECT id, email FROM users WHERE email = $1", [email.toLowerCase().trim()]);
    if (result.rows.length === 0) {
      // Don't reveal if email exists or not, just return success
      return res.json({ message: "NÃŸâ•‘â”u email tÃŸâ•—Ã´n tÃŸâ•‘Ã­i, OTP â”€Ã¦â”œÃº â”€Ã¦â•žâ–‘ÃŸâ•—Ãºc gÃŸâ•—Â¡i." });
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

    return res.json({ message: "OTP â”€Ã¦â”œÃº â”€Ã¦â•žâ–‘ÃŸâ•—Ãºc gÃŸâ•—Â¡i â”€Ã¦ÃŸâ•‘â”n email cÃŸâ•—Âºa bÃŸâ•‘Ã­n." });
  } catch (error) {
    console.error("Request OTP error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

// Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡ POST /api/auth/forgot-password/reset Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡
app.post("/api/auth/forgot-password/reset", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body || {};
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "ThiÃŸâ•‘â”u thâ”œâ”¤ng tin yâ”œÂ¬u cÃŸâ•‘Âºu." });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: "MÃŸâ•‘Â¡t khÃŸâ•‘âŒu phÃŸâ•‘Ãºi dâ”œÃ¡i â”œÂ¡t nhÃŸâ•‘Ã‘t 8 kâ”œâ•œ tÃŸâ•—â–’." });
    }

    const result = await pool.query(
      "SELECT id, reset_otp, reset_otp_expiry FROM users WHERE email = $1",
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: "OTP khâ”œâ”¤ng hÃŸâ•—Ãºp lÃŸâ•—Ã§ hoÃŸâ•‘â•–c â”€Ã¦â”œÃº hÃŸâ•‘â”t hÃŸâ•‘Ã­n." });
    }

    const user = result.rows[0];

    if (!user.reset_otp || user.reset_otp !== otp.trim()) {
      return res.status(400).json({ message: "Mâ”œÃº OTP khâ”œâ”¤ng châ”œÂ¡nh xâ”œÃ­c." });
    }

    if (new Date() > new Date(user.reset_otp_expiry)) {
      return res.status(400).json({ message: "Mâ”œÃº OTP â”€Ã¦â”œÃº hÃŸâ•‘â”t hÃŸâ•‘Ã­n. Vui lâ”œâ–“ng yâ”œÂ¬u cÃŸâ•‘Âºu lÃŸâ•‘Ã­i." });
    }

    // OTP hÃŸâ•—Ãºp lÃŸâ•—Ã§, tiÃŸâ•‘â”n hâ”œÃ¡nh â”€Ã¦ÃŸâ•—Ã²i mÃŸâ•‘Â¡t khÃŸâ•‘âŒu
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    await pool.query(
      "UPDATE users SET password_hash = $1, reset_otp = NULL, reset_otp_expiry = NULL WHERE id = $2",
      [passwordHash, user.id]
    );

    return res.json({ message: "â”€Ã‰ÃŸâ•‘â•–t lÃŸâ•‘Ã­i mÃŸâ•‘Â¡t khÃŸâ•‘âŒu thâ”œÃ¡nh câ”œâ”¤ng!" });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

// Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡ POST /api/auth/login Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡
// â”€Ã‰â”€Ã¢ng nhÃŸâ•‘Â¡p bÃŸâ•‘â–’ng email + password
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }

    // Tâ”œÂ¼m user theo email
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

    // User â”€Ã¦â”€Ã¢ng kâ”œâ•œ bÃŸâ•‘â–’ng Google, khâ”œâ”¤ng câ”œâ”‚ password
    if (!user.password_hash) {
      return res.status(401).json({
        message: "This account uses Google sign-in. Please use Google to log in.",
      });
    }

    // KiÃŸâ•—Ã¢m tra password
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

// Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡ POST /api/auth/google Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡
// â”€Ã‰â”€Ã¢ng nhÃŸâ•‘Â¡p / â”€Ã¦â”€Ã¢ng kâ”œâ•œ bÃŸâ•‘â–’ng Google OAuth Î“Ã‡Ã¶ lâ•žâ–‘u vâ”œÃ¡o DB
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

    // Tâ”œÂ¼m user â”€Ã¦â”œÃº câ”œâ”‚ châ•žâ–‘a (theo google_id hoÃŸâ•‘â•–c email)
    let userResult = await pool.query(
      "SELECT id, full_name, email, role, picture FROM users WHERE google_id = $1 OR email = $2",
      [googleId, email]
    );

    let user;
    if (userResult.rows.length > 0) {
      // â”€Ã‰â”œÃº câ”œâ”‚ Î“Ã¥Ã† cÃŸâ•‘Â¡p nhÃŸâ•‘Â¡t google_id vâ”œÃ¡ picture nÃŸâ•‘â”u cÃŸâ•‘Âºn
      user = userResult.rows[0];
      await pool.query(
        "UPDATE users SET google_id = $1, picture = $2 WHERE id = $3",
        [googleId, picture, user.id]
      );
      user.picture = picture;
    } else {
      // Châ•žâ–‘a câ”œâ”‚ Î“Ã¥Ã† tÃŸâ•‘Ã­o mÃŸâ•—Â¢i vÃŸâ•—Â¢i role mÃŸâ•‘â•–c â”€Ã¦ÃŸâ•—Ã¯nh 'student'
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

// Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰
// Î“Ã¶Ã‡Î“Ã¶Ã‡ TUTOR APIs Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡
// Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰

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
  // Khai bâ”œÃ­o â”€Ã¦ÃŸâ•—Âº 3 file fields â”€Ã¦ÃŸâ•—Ã¢ multer khâ”œâ”¤ng nâ”œâŒm LIMIT_UNEXPECTED_FILE
  upload.fields([
    { name: "profile_photo",  maxCount: 1  },
    { name: "certificates",   maxCount: 10 },
    { name: "cccd",           maxCount: 1  },
  ]),
  // Î“Ã¶Ã‡Î“Ã¶Ã‡ Multer error handler: trÃŸâ•‘Ãº JSON thay vâ”œÂ¼ HTML Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡
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
        // Î“Ã¶Ã‡Î“Ã¶Ã‡ UPDATE Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡
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
              [profileId, meta.name || f.originalname, certPath, meta.cert_type || 'Chá»©ng chá»‰', meta.issuer || null, meta.year ? parseInt(meta.year) : null]
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


// Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰
// Î“Ã¶Ã‡Î“Ã¶Ã‡ ADMIN APIs (all protected by verifyToken + requireAdmin) Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡
// Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰

// Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡ GET /api/admin/tutors/stats Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡
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

// Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡ GET /api/admin/document-url Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡
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

// Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡ GET /api/admin/tutors/pending Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡
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

// Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡ PATCH /api/admin/tutors/:id/reject Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡Î“Ã¶Ã‡
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


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// â”€â”€ ADMIN APIs (all protected by verifyToken + requireAdmin) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// â”€â”€â”€ GET /api/admin/tutors/stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ GET /api/admin/tutors/pending (duplicate route kept for compatibility) â”€â”€â”€
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

// â”€â”€â”€ PATCH /api/admin/tutors/:id/approve â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ PATCH /api/admin/tutors/:id/reject â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// â”€â”€ PERSON 4: Class Workspace Routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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

// â”€â”€ GET /api/admin/users â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€ GET /api/admin/users/:id â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

    // Lá»‹ch sá»­ Ä‘Äƒng nháº­p gáº§n nháº¥t (10 láº§n)
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

// â”€â”€ PATCH /api/admin/users/:id/ban â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€ PATCH /api/admin/users/:id/role â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  QUIZ APIs
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// â”€â”€â”€ GET /api/quizzes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ GET /api/subjects â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.get('/api/subjects', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`SELECT DISTINCT subject FROM quizzes ORDER BY subject`);
    return res.json({ subjects: result.rows.map(r => r.subject) });
  } catch (e) { res.status(500).json({ message: 'Server error.' }); }
});

// â”€â”€â”€ GET /api/quizzes/attempts/:attemptId â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ GET /api/quizzes/:id/start â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ POST /api/quizzes/:id/save-draft â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.post('/api/quizzes/:id/save-draft', verifyToken, async (req, res) => {
  try {
    const { attemptId, answers, timeRemainingSeconds } = req.body;
    await pool.query(`UPDATE quiz_attempts SET answers=$1, time_remaining_seconds=COALESCE($2, time_remaining_seconds) WHERE id=$3 AND student_id=$4`,
      [JSON.stringify(answers), timeRemainingSeconds !== undefined ? timeRemainingSeconds : null, attemptId, req.user.userId]);
    return res.json({ message: 'Draft saved.' });
  } catch (e) { res.status(500).json({ message: 'Server error.' }); }
});

// â”€â”€â”€ POST /api/quizzes/:id/submit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  PRACTICE / AI APIs
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// â”€â”€â”€ POST /api/practice/generate â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.post('/api/practice/generate', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { topic, count = 10, difficulty = 'medium', timeLimitMins = null, questionType = 'multiple_choice' } = req.body;
    if (!topic?.trim()) return res.status(400).json({ message: 'Topic is required.' });
    const diff = ['easy','medium','hard'].includes(difficulty) ? difficulty : 'medium';
    const questionCount = Math.min(Math.max(Number(count)||10,1),30);
    const questions = await generateQuizQuestions(topic.trim(), questionCount, diff, questionType);
    // Detect quota notice
    if (questions.length > 0 && questions[0].question?.startsWith('âš ï¸')) {
      return res.status(503).json({ message: 'AI_QUOTA_EXCEEDED', detail: 'Gemini vÃ  Groq Ä‘á»u Ä‘áº¡t giá»›i háº¡n. Thá»­ láº¡i sau hoáº·c dÃ¹ng Äá» thi cÃ³ sáºµn.' });
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

// â”€â”€â”€ GET /api/practice/history â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.get('/api/practice/history', verifyToken, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, topic, difficulty, score, total_questions, total_correct, status, created_at, submitted_at, time_limit_mins, time_remaining_seconds FROM practice_sessions WHERE student_id=$1 ORDER BY created_at DESC LIMIT 50`,
      [req.user.userId]
    );
    return res.json({ sessions: r.rows });
  } catch (e) { res.status(500).json({ message: 'Server error.' }); }
});

// â”€â”€â”€ GET /api/practice/:sessionId/questions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ POST /api/practice/chat â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.post('/api/practice/chat', verifyToken, async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages?.length) return res.status(400).json({ message: 'Messages required.' });
    const result = await chatWithAI(messages);
    return res.json(result);
  } catch (e) { res.status(500).json({ message: 'Server error.' }); }
});

// â”€â”€â”€ POST /api/practice/:sessionId/save-progress â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ POST /api/practice/:sessionId/submit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ GET /api/practice/:sessionId/result â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.get('/api/practice/:sessionId/result', verifyToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const r = await pool.query(`SELECT * FROM practice_sessions WHERE id=$1 AND student_id=$2`, [sessionId, req.user.userId]);
    if (!r.rows.length) return res.status(404).json({ message: 'Session not found.' });
    return res.json({ session: r.rows[0] });
  } catch (e) { res.status(500).json({ message: 'Server error.' }); }
});

// â”€â”€â”€ DELETE /api/practice/:sessionId â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.delete('/api/practice/:sessionId', verifyToken, async (req, res) => {
  try {
    await pool.query(`DELETE FROM practice_sessions WHERE id=$1 AND student_id=$2`, [req.params.sessionId, req.user.userId]);
    return res.json({ message: 'Deleted.' });
  } catch (e) { res.status(500).json({ message: 'Server error.' }); }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  EXAM PAPERS APIs
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// â”€â”€â”€ Shuffle helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ GET /api/exam-papers/attempts/:attemptId â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
// â”€â”€â”€ POST /api/exam-papers/:paperId/save-draft â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  PARENT DASHBOARD APIs
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  PARENT-STUDENT LINKING APIs
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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
    if (!code || code.trim().length!==8) return res.status(400).json({ message: 'MÃ£ liÃªn káº¿t pháº£i Ä‘Ãºng 8 kÃ½ tá»±.' });
    const codeRes = await pool.query('SELECT student_id FROM student_link_codes WHERE code=$1', [code.trim().toUpperCase()]);
    if (!codeRes.rows.length) return res.status(404).json({ message: 'MÃ£ liÃªn káº¿t khÃ´ng há»£p lá»‡.' });
    const studentId = codeRes.rows[0].student_id;
    if (studentId===parentId) return res.status(400).json({ message: 'Báº¡n khÃ´ng thá»ƒ liÃªn káº¿t vá»›i chÃ­nh mÃ¬nh.' });
    const dup = await pool.query('SELECT id FROM parent_children WHERE parent_id=$1 AND student_id=$2', [parentId,studentId]);
    if (dup.rows.length) return res.status(409).json({ message: 'Há»c sinh nÃ y Ä‘Ã£ Ä‘Æ°á»£c liÃªn káº¿t rá»“i.' });
    await pool.query('INSERT INTO parent_children (parent_id,student_id,nickname) VALUES ($1,$2,$3)', [parentId,studentId,nickname?.trim()||null]);
    const student = await pool.query('SELECT id,full_name,email,picture FROM users WHERE id=$1', [studentId]);
    return res.status(201).json({ message: 'LiÃªn káº¿t thÃ nh cÃ´ng!', student: student.rows[0] });
  } catch (e) { res.status(500).json({ message: 'Server error.' }); }
});

// Parent: create new student account + auto-link
app.post('/api/parent/create-child', verifyToken, async (req, res) => {
  try {
    const parentId = req.user.userId;
    const { full_name, email, password, nickname } = req.body;
    if (!full_name?.trim()||!email?.trim()||!password) return res.status(400).json({ message: 'Vui lÃ²ng Ä‘iá»n Ä‘áº§y Ä‘á»§ thÃ´ng tin.' });
    if (password.length<6) return res.status(400).json({ message: 'Máº­t kháº©u pháº£i Ã­t nháº¥t 6 kÃ½ tá»±.' });
    const exists = await pool.query('SELECT id FROM users WHERE email=$1', [email.trim().toLowerCase()]);
    if (exists.rows.length) return res.status(409).json({ message: 'Email Ä‘Ã£ tá»“n táº¡i. DÃ¹ng mÃ£ liÃªn káº¿t náº¿u Ä‘Ã¢y lÃ  con báº¡n.' });
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash(password, 10);
    const student = await pool.query(`INSERT INTO users (full_name,email,password_hash,role) VALUES ($1,$2,$3,'student') RETURNING id,full_name,email,role`, [full_name.trim(),email.trim().toLowerCase(),hash]);
    const s = student.rows[0];
    await pool.query('INSERT INTO parent_children (parent_id,student_id,nickname) VALUES ($1,$2,$3)', [parentId,s.id,nickname?.trim()||null]);
    let code, tries=0;
    do { code=generateLinkCode(); tries++; } while (tries<10 && (await pool.query('SELECT id FROM student_link_codes WHERE code=$1',[code])).rows.length>0);
    await pool.query('INSERT INTO student_link_codes (student_id,code) VALUES ($1,$2)', [s.id,code]);
    return res.status(201).json({ message: 'Táº¡o tÃ i khoáº£n thÃ nh cÃ´ng!', student: s });
  } catch (e) { res.status(500).json({ message: 'Server error.' }); }
});

// Parent: unlink
app.delete('/api/parent/children/:studentId', verifyToken, async (req, res) => {
  try {
    const r = await pool.query('DELETE FROM parent_children WHERE parent_id=$1 AND student_id=$2 RETURNING id', [req.user.userId, req.params.studentId]);
    if (!r.rows.length) return res.status(404).json({ message: 'KhÃ´ng tÃ¬m tháº¥y liÃªn káº¿t.' });
    return res.json({ message: 'ÄÃ£ há»§y liÃªn káº¿t.' });
  } catch (e) { res.status(500).json({ message: 'Server error.' }); }
});

// Parent: get child's detailed progress
app.get('/api/parent/children/:studentId/progress', verifyToken, async (req, res) => {
  try {
    const parentId = req.user.userId;
    const { studentId } = req.params;
    const link = await pool.query('SELECT id FROM parent_children WHERE parent_id=$1 AND student_id=$2', [parentId,studentId]);
    if (!link.rows.length) return res.status(403).json({ message: 'Báº¡n khÃ´ng cÃ³ quyá»n xem há»c sinh nÃ y.' });
    const [quiz, practice, exam] = await Promise.all([
      pool.query(`SELECT qa.id,qa.score,qa.submitted_at,q.title,q.subject,q.total_questions,qa.total_correct FROM quiz_attempts qa JOIN quizzes q ON qa.quiz_id=q.id WHERE qa.student_id=$1 AND qa.status='submitted' ORDER BY qa.submitted_at DESC LIMIT 20`, [studentId]),
      pool.query(`SELECT id,topic,difficulty,score,total_questions,total_correct,submitted_at FROM practice_sessions WHERE student_id=$1 AND status='submitted' ORDER BY submitted_at DESC LIMIT 20`, [studentId]),
      pool.query(`SELECT epa.id,epa.score,epa.submitted_at,epa.total_correct,ep.title,ep.subject,ep.grade,ep.year,ep.total_questions FROM exam_paper_attempts epa JOIN exam_papers ep ON epa.exam_paper_id=ep.id WHERE epa.student_id=$1 AND epa.status='submitted' ORDER BY epa.submitted_at DESC LIMIT 20`, [studentId])
    ]);
    return res.json({ quiz_attempts:quiz.rows, practice_sessions:practice.rows, exam_attempts:exam.rows });
  } catch (e) { res.status(500).json({ message: 'Server error.' }); }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  PARENT EXTENDED APIs â€” Schedule, Reviews, Invoices, Notifications
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// GET /api/parent/children/:studentId/schedule
app.get('/api/parent/children/:studentId/schedule', verifyToken, async (req, res) => {
  try {
    const { studentId } = req.params;
    const link = await pool.query('SELECT id FROM parent_children WHERE parent_id=$1 AND student_id=$2', [req.user.userId, studentId]);
    if (!link.rows.length) return res.status(403).json({ message: 'KhÃ´ng cÃ³ quyá»n truy cáº­p.' });

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
    if (!link.rows.length) return res.status(403).json({ message: 'KhÃ´ng cÃ³ quyá»n truy cáº­p.' });

    const updated = await pool.query(`
      UPDATE tutor_sessions SET status='cancelled', leave_reason=$1, updated_at=NOW()
      WHERE id=$2 AND student_id=$3 AND status='scheduled' RETURNING *
    `, [reason || null, sessionId, studentId]);

    if (!updated.rows.length) return res.status(404).json({ message: 'KhÃ´ng tÃ¬m tháº¥y buá»•i há»c hoáº·c Ä‘Ã£ khÃ´ng thá»ƒ há»§y.' });

    const session = updated.rows[0];
    const studentRes = await pool.query('SELECT full_name FROM users WHERE id=$1', [studentId]);
    await pool.query(`
      INSERT INTO notifications (user_id, type, title, body, icon, ref_id, ref_type)
      VALUES ($1, 'student_absent', 'Há»c sinh xin nghá»‰', $2, 'event_busy', $3, 'session')
    `, [
      session.tutor_id,
      `${studentRes.rows[0]?.full_name || 'Há»c sinh'} xin nghá»‰ buá»•i ${session.subject} ngÃ y ${new Date(session.scheduled_at).toLocaleDateString('vi-VN')}. LÃ½ do: ${reason || 'KhÃ´ng cÃ³ lÃ½ do.'}`,
      sessionId
    ]);

    return res.json({ message: 'ÄÃ£ gá»­i yÃªu cáº§u nghá»‰ phÃ©p.' });
  } catch (e) { console.error(e); res.status(500).json({ message: 'Server error.' }); }
});

// GET /api/parent/children/:studentId/reviews
app.get('/api/parent/children/:studentId/reviews', verifyToken, async (req, res) => {
  try {
    const { studentId } = req.params;
    const link = await pool.query('SELECT id FROM parent_children WHERE parent_id=$1 AND student_id=$2', [req.user.userId, studentId]);
    if (!link.rows.length) return res.status(403).json({ message: 'KhÃ´ng cÃ³ quyá»n truy cáº­p.' });

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

// POST /api/tutor/reviews â€” gia sÆ° táº¡o nháº­n xÃ©t Ä‘á»‹nh ká»³
app.post('/api/tutor/reviews', verifyToken, requireTutor, async (req, res) => {
  try {
    const { student_id, subject, period_label, content, rating } = req.body;
    if (!student_id || !subject || !period_label || !content)
      return res.status(400).json({ message: 'Thiáº¿u thÃ´ng tin báº¯t buá»™c.' });

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
      `, [p.parent_id, `Nháº­n xÃ©t má»›i tá»« gia sÆ° â€” ${subject}`,
          `Gia sÆ° vá»«a gá»­i nháº­n xÃ©t Ä‘á»‹nh ká»³ cho ${studentRes.rows[0]?.full_name || 'há»c sinh'} (${period_label}).`,
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

// Multer: lÆ°u file vÃ o bá»™ nhá»› táº¡m
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
    if (!ok) return cb(new Error('Loáº¡i file khÃ´ng Ä‘Æ°á»£c há»— trá»£'));
    cb(null, true);
  }
});

// â”€â”€ chat_messages table â”€â”€
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
    console.log('âœ… chat_messages table ready');
  } catch (e) { console.error('chat_messages table error:', e.message); }
})();

// GET /api/chat/conversations â€” danh sÃ¡ch há»™i thoáº¡i
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

// GET /api/chat/contacts â€” danh sÃ¡ch liÃªn há»‡ Ä‘á»ƒ nháº¯n tin (dá»±a theo role)
// âš ï¸ MUST be before /api/chat/:otherId to avoid wildcard match
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
          ))
          OR
          (u.role = 'parent' AND u.id IN (
            SELECT pc.parent_id FROM parent_children pc 
            JOIN class_members cm ON pc.student_id = cm.student_id
            JOIN classes c ON c.id = cm.class_id
            WHERE c.tutor_id = $1
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
        (u.role = 'tutor' AND u.id IN (SELECT c.tutor_id FROM classes c JOIN class_members cm ON c.id = cm.class_id WHERE cm.student_id = $1))
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
        (u.role = 'tutor' AND u.id IN (SELECT c.tutor_id FROM classes c JOIN class_members cm ON c.id = cm.class_id JOIN parent_children pc ON cm.student_id = pc.student_id WHERE pc.parent_id = $1))
      )
    `, [userId, otherId]);
    allowed = res.rowCount > 0;
  } else if (userRole === 'tutor') {
    const res = await pool.query(`
      SELECT 1 FROM users u WHERE u.id = $2 AND (
        (u.role = 'student' AND u.id IN (SELECT cm.student_id FROM class_members cm JOIN classes c ON c.id = cm.class_id WHERE c.tutor_id = $1))
        OR
        (u.role = 'parent' AND u.id IN (SELECT pc.parent_id FROM parent_children pc JOIN class_members cm ON pc.student_id = cm.student_id JOIN classes c ON c.id = cm.class_id WHERE c.tutor_id = $1))
      )
    `, [userId, otherId]);
    allowed = res.rowCount > 0;
  }
  return allowed;
}

// GET /api/chat/:otherId â€” lá»‹ch sá»­ tin nháº¯n + Ä‘Ã¡nh dáº¥u Ä‘Ã£ Ä‘á»c
app.get('/api/chat/:otherId', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    const { otherId } = req.params;

    const allowed = await checkChatPermission(userId, userRole, otherId);
    if (!allowed) {
      return res.status(403).json({ message: 'Báº¡n khÃ´ng cÃ³ quyá»n nháº¯n tin vá»›i ngÆ°á»i dÃ¹ng nÃ y.' });
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

// POST /api/chat â€” gá»­i tin nháº¯n text
app.post('/api/chat', verifyToken, async (req, res) => {
  try {
    const senderId = req.user.userId;
    const { receiver_id, content } = req.body;
    if (!receiver_id || !content?.trim())
      return res.status(400).json({ message: 'receiver_id vÃ  content lÃ  báº¯t buá»™c.' });
    
    const userRole = req.user.role;
    const allowed = await checkChatPermission(senderId, userRole, receiver_id);
    if (!allowed) {
      return res.status(403).json({ message: 'Báº¡n khÃ´ng cÃ³ quyá»n nháº¯n tin vá»›i ngÆ°á»i dÃ¹ng nÃ y.' });
    }

    const receiver = await pool.query(`SELECT id FROM users WHERE id=$1`, [receiver_id]);
    if (!receiver.rows.length) return res.status(404).json({ message: 'NgÆ°á»i nháº­n khÃ´ng tá»“n táº¡i.' });
    const msg = await pool.query(
      `INSERT INTO chat_messages (sender_id, receiver_id, content, msg_type)
       VALUES ($1,$2,$3,'text') RETURNING *`,
      [senderId, receiver_id, content.trim()]
    );
    return res.status(201).json({ message: msg.rows[0] });
  } catch (e) { console.error(e); res.status(500).json({ message: 'Server error.' }); }
});

// POST /api/chat/upload â€” upload file (áº£nh/video/tá»‡p) lÃªn Supabase Storage
app.post('/api/chat/upload', verifyToken, (req, res, next) => {
  chatUpload.single('file')(req, res, function (err) {
    if (err) return res.status(400).json({ message: err.message || 'File upload error.' });
    next();
  });
}, async (req, res) => {
  try {
    const senderId = req.user.userId;
    const { receiver_id } = req.body;
    if (!receiver_id) return res.status(400).json({ message: 'receiver_id lÃ  báº¯t buá»™c.' });
    if (!req.file) return res.status(400).json({ message: 'KhÃ´ng cÃ³ file Ä‘Æ°á»£c gá»­i lÃªn.' });

    const userRole = req.user.role;
    const allowed = await checkChatPermission(senderId, userRole, receiver_id);
    if (!allowed) {
      return res.status(403).json({ message: 'Báº¡n khÃ´ng cÃ³ quyá»n nháº¯n tin vá»›i ngÆ°á»i dÃ¹ng nÃ y.' });
    }

    const { originalname, mimetype, size, buffer } = req.file;
    const ext = originalname.includes('.') ? '.' + originalname.split('.').pop() : '';
    const safeName = `${Date.now()}_${Math.random().toString(36).slice(2,8)}${ext}`;
    const storagePath = `${senderId}/${safeName}`;

    // XÃ¡c Ä‘á»‹nh msg_type
    let msgType = 'file';
    if (mimetype.startsWith('image/')) msgType = 'image';
    else if (mimetype.startsWith('video/')) msgType = 'video';

    // Upload lÃªn Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin
      .storage.from(BUCKET)
      .upload(storagePath, buffer, { contentType: mimetype, upsert: false });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return res.status(500).json({ message: 'Lá»—i upload file: ' + uploadError.message });
    }

    // Láº¥y public URL
    const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(storagePath);
    const fileUrl = urlData?.publicUrl || '';

    // LÆ°u tin nháº¯n vÃ o DB
    const msg = await pool.query(
      `INSERT INTO chat_messages
         (sender_id, receiver_id, msg_type, file_url, file_name, file_size, file_mime, content)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [senderId, receiver_id, msgType, fileUrl, originalname, size, mimetype, null]
    );
    return res.status(201).json({ message: msg.rows[0] });
  } catch (e) { console.error(e); res.status(500).json({ message: 'Server error: ' + e.message }); }
});

// â”€â”€â”€ Background Job: Cleanup Abandoned Practice Sessions â”€â”€â”€â”€â”€â”€â”€â”€â”€
const cleanupAbandonedPracticeSessions = async () => {
  try {
    const res = await pool.query(`
      UPDATE practice_sessions
      SET status = 'submitted', score = 0, total_correct = 0, submitted_at = NOW()
      WHERE status = 'in_progress' AND created_at < NOW() - INTERVAL '24 hours'
    `);
    if (res.rowCount > 0) {
      console.log(`ðŸ§¹ Cleaned up ${res.rowCount} abandoned practice sessions.`);
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


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  TUTOR ASSESSMENT MANAGEMENT APIs
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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
    // Láº¥y cÃ¡c exam_paper do tutor upload
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

    // CÅ©ng láº¥y cÃ¡c quiz attempts náº¿u cÃ³
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

    // CÅ©ng láº¥y cÃ¡c practice sessions (AI generated, any tutor can grade)
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


// â”€â”€ GET /api/tutors (public) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Táº¥t cáº£ user cÃ³ role='tutor', LEFT JOIN tutor_profiles Ä‘á»ƒ láº¥y thÃªm thÃ´ng tin.
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
         0 AS avg_r,
         0 AS review_count
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

// â”€â”€ GET /api/tutors/:id â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Tráº£ vá» há»“ sÆ¡ chi tiáº¿t cá»§a má»™t gia sÆ° theo user ID (public, khÃ´ng cáº§n auth)
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

// â”€â”€ GET /api/reviews/featured â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Tráº£ vá» cÃ¡c Ä‘Ã¡nh giÃ¡ 5 sao má»›i nháº¥t Ä‘á»ƒ hiá»ƒn thá»‹ trÃªn trang chá»§ (khÃ´ng cáº§n auth)
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

// â”€â”€ POST /api/reviews â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// NgÆ°á»i dÃ¹ng Ä‘Ã£ Ä‘Äƒng nháº­p gá»­i Ä‘Ã¡nh giÃ¡ má»›i
app.post("/api/reviews", verifyToken, async (req, res) => {
  const { rating, subject, content } = req.body || {};
  if (!rating || !content) {
    return res.status(400).json({ message: "rating vÃ  content lÃ  báº¯t buá»™c." });
  }
  if (rating < 1 || rating > 5) {
    return res.status(400).json({ message: "rating pháº£i tá»« 1 Ä‘áº¿n 5." });
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

// Helper: láº¥y IP thá»±c cá»§a client (há»— trá»£ proxy/Nginx)
function getClientIP(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

// Helper: ghi log Ä‘Äƒng nháº­p + tráº£ vá» flag suspicious náº¿u IP láº¡
async function logLoginAttempt(userId, ip, userAgent) {
  try {
    // Láº¥y IP cá»§a láº§n Ä‘Äƒng nháº­p cuá»‘i cÃ¹ng trong 30 ngÃ y
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
    console.log("âœ… DB migration: users.is_banned ready");
  } catch (err) {
    console.error("âš ï¸  DB migration warning:", err.message);
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
    console.log("âœ… DB migration: login_logs table ready");
  } catch (err) {
    console.error("âš ï¸  DB migration (login_logs) warning:", err.message);
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
    console.log("âœ… DB migration: tutor_profiles extra columns ready");
  } catch (err) {
    console.error("âš ï¸  DB migration (tutor_profiles cols) warning:", err.message);
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
    console.log("âœ… DB migration: tutor_certificates table ready");
  } catch (err) {
    console.error("âš ï¸  DB migration (tutor_certificates) warning:", err.message);
  }

  // Auto-migrate: teaching_methods & suitable_students columns on tutor_profiles
  try {
    await pool.query(`
      ALTER TABLE tutor_profiles
        ADD COLUMN IF NOT EXISTS teaching_methods  JSONB NOT NULL DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS suitable_students JSONB NOT NULL DEFAULT '[]'
    `);
    console.log("âœ… DB migration: teaching_methods & suitable_students columns ready");
  } catch (err) {
    console.error("âš ï¸  DB migration (teaching_methods) warning:", err.message);
  }

  // Auto-migrate: cert_type, issuer, issue_year on tutor_certificates
  try {
    await pool.query(`
      ALTER TABLE tutor_certificates
        ADD COLUMN IF NOT EXISTS cert_type  TEXT DEFAULT 'Chá»©ng chá»‰',
        ADD COLUMN IF NOT EXISTS issuer     TEXT,
        ADD COLUMN IF NOT EXISTS issue_year INTEGER
    `);
    console.log("âœ… DB migration: tutor_certificates extended columns ready");
  } catch (err) {
    console.error("âš ï¸  DB migration (cert extended cols) warning:", err.message);
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
    console.log("âœ… DB migration: reviews table ready");

    // Seed 5-star reviews náº¿u báº£ng cÃ²n trá»‘ng
    const { rows } = await pool.query("SELECT COUNT(*) FROM reviews");
    if (parseInt(rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO reviews (reviewer_name, reviewer_role, rating, subject, content, created_at) VALUES
        ('Nguyá»…n VÄƒn An',   'student', 5, 'ToÃ¡n Cao Cáº¥p',       'Gia sÆ° giáº£i thÃ­ch ráº¥t rÃµ rÃ ng, tá»«ng bÆ°á»›c má»™t. TÃ´i Ä‘Ã£ hiá»ƒu Ä‘Æ°á»£c tÃ­ch phÃ¢n bá»™i sau 3 buá»•i há»c. Cá»±c ká»³ khuyáº¿n khÃ­ch!',                                      NOW() - INTERVAL ''2 minutes''),
        ('Tráº§n Thá»‹ BÃ­ch',   'parent',  5, 'Tiáº¿ng Anh IELTS',    'Con tÃ´i tÄƒng tá»« 5.5 lÃªn 7.0 chá»‰ sau 3 thÃ¡ng. Gia sÆ° ráº¥t táº­n tÃ¢m, cÃ³ phÆ°Æ¡ng phÃ¡p riÃªng cho tá»«ng há»c sinh. Cáº£m Æ¡n EduX ráº¥t nhiá»u!',                         NOW() - INTERVAL ''18 minutes''),
        ('LÃª Minh ChÃ¢u',    'student', 5, 'Láº­p TrÃ¬nh Python',   'Tá»« chá»— khÃ´ng biáº¿t gÃ¬ vá» code, giá» tÃ´i Ä‘Ã£ tá»± viáº¿t Ä‘Æ°á»£c á»©ng dá»¥ng Flask Ä‘áº§u tiÃªn. Gia sÆ° hÆ°á»›ng dáº«n thá»±c chiáº¿n, khÃ´ng dáº¡y lÃ½ thuyáº¿t suÃ´ng.',                  NOW() - INTERVAL ''1 hour''),
        ('Pháº¡m HoÃ ng Duy',  'student', 5, 'Váº­t LÃ½ Äáº¡i CÆ°Æ¡ng',   'BÃ i giáº£ng sinh Ä‘á»™ng, cÃ³ nhiá»u vÃ­ dá»¥ thá»±c táº¿. Äiá»ƒm thi cuá»‘i ká»³ cá»§a tÃ´i tá»« 5 lÃªn 9. Tháº§y ráº¥t nhiá»‡t tÃ¬nh vÃ  kiÃªn nháº«n.',                                     NOW() - INTERVAL ''3 hours''),
        ('Nguyá»…n Thá»‹ Hoa',  'parent',  5, 'ToÃ¡n Tiá»ƒu Há»c',      'Con tÃ´i 9 tuá»•i ráº¥t thÃ­ch há»c, khÃ´ng cÃ²n sá»£ mÃ´n ToÃ¡n ná»¯a. Gia sÆ° biáº¿t cÃ¡ch táº¡o há»©ng thÃº cho cÃ¡c em nhá». Sáº½ tiáº¿p tá»¥c Ä‘Äƒng kÃ½ dÃ i háº¡n.',                    NOW() - INTERVAL ''5 hours''),
        ('Äá»— VÄƒn Khoa',     'student', 5, 'HÃ³a Há»¯u CÆ¡',         'MÃ´n HÃ³a luÃ´n lÃ  cÆ¡n Ã¡c má»™ng nhÆ°ng nhá» gia sÆ° tÃ´i Ä‘Ã£ vÆ°á»£t qua ká»³ thi tá»‘t nghiá»‡p vá»›i Ä‘iá»ƒm 8.5. PhÆ°Æ¡ng phÃ¡p ghi nhá»› cá»±c hay!',                              NOW() - INTERVAL ''8 hours''),
        ('VÅ© Thá»‹ Lan',      'student', 5, 'Tiáº¿ng Nháº­t N3',       'Sau 6 thÃ¡ng há»c, tÃ´i thi Ä‘áº­u JLPT N3 láº§n Ä‘áº§u tiÃªn. Gia sÆ° báº£n ngá»¯, phÃ¡t Ã¢m chuáº©n, giÃ¡o trÃ¬nh Ä‘Æ°á»£c thiáº¿t káº¿ ráº¥t khoa há»c.',                               NOW() - INTERVAL ''1 day''),
        ('BÃ¹i Minh Long',   'parent',  5, 'ToÃ¡n THPT',           'Äiá»ƒm thi thá»­ Ä‘áº¡i há»c cá»§a con tÃ´i tÄƒng vá»t tá»« 6 lÃªn 8.5 Ä‘iá»ƒm. Gia sÆ° khÃ´ng chá»‰ dáº¡y kiáº¿n thá»©c mÃ  cÃ²n rÃ¨n ká»¹ nÄƒng lÃ m bÃ i thi hiá»‡u quáº£.',                   NOW() - INTERVAL ''2 days''),
        ('HoÃ ng Thá»‹ Mai',   'student', 5, 'Luyá»‡n Thi THPT QG',  'Thi thá»­ láº§n Ä‘áº§u Ä‘Æ°á»£c 18/30, sau 2 thÃ¡ng Ã´n vá»›i gia sÆ° tÃ´i Ä‘áº¡t 26/30. Ráº¥t biáº¿t Æ¡n sá»± táº­n tÃ¢m vÃ  kinh nghiá»‡m cá»§a tháº§y.',                                    NOW() - INTERVAL ''3 days''),
        ('Äinh VÄƒn Nam',    'student', 5, 'Tin Há»c VÄƒn PhÃ²ng',   'Há»c Excel vÃ  Word tá»« cÆ¡ báº£n Ä‘áº¿n nÃ¢ng cao, giá» lÃ m viá»‡c nhanh hÆ¡n ráº¥t nhiá»u. Gia sÆ° dáº¡y Ä‘Ãºng nhá»¯ng gÃ¬ thá»±c táº¿ cáº§n dÃ¹ng, khÃ´ng máº¥t thá»i gian lÃ½ thuyáº¿t dÃ i.' , NOW() - INTERVAL ''4 days'')
      `);
      console.log("âœ… DB seed: 10 sample reviews inserted");
    }
  } catch (err) {
    console.error("âš ï¸  DB migration (reviews) warning:", err.message);
  }

// =========================================================================
// ==================== PAYMENT & ESCROW ROUTES ============================
// =========================================================================
const crypto = require('crypto');
const moment = require('moment');
const querystring = require('qs');

// 1. Láº¥y thÃ´ng tin VÃ­
app.get('/api/payment/wallet', verifyToken, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM wallets WHERE user_id = $1', [req.user.userId]);
    if (rows.length === 0) return res.status(404).json({ message: 'VÃ­ khÃ´ng tá»“n táº¡i' });
    res.json({ wallet: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// 2. Táº¡o URL Náº¡p Tiá»n VNPAY
app.post('/api/payment/create-url', verifyToken, async (req, res) => {
  try {
      const { amount, returnUrl } = req.body;
      const walletRes = await pool.query('SELECT id FROM wallets WHERE user_id = $1', [req.user.userId]);
      if (walletRes.rowCount === 0) return res.status(404).json({ success: false, message: 'VÃ­ khÃ´ng tá»“n táº¡i' });
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
      if (walletRes.rowCount === 0) return res.status(404).json({ success: false, message: 'VÃ­ khÃ´ng tá»“n táº¡i' });
      const payerWalletId = walletRes.rows[0].id;

      const { rows } = await pool.query('SELECT hold_money_for_lesson($1, $2, $3) AS tx_id', [payerWalletId, amount, lessonId]);
      
      res.json({ success: true, transactionId: rows[0].tx_id });
  } catch (err) {
      // Trigger error from CHECK (balance >= amount)
      res.status(400).json({ success: false, message: 'Sá»‘ dÆ° khÃ´ng Ä‘á»§ Ä‘á»ƒ thanh toÃ¡n hoáº·c lá»—i há»‡ thá»‘ng.' });
  }
});

// 5. Release Escrow (Giáº£i ngÃ¢n cho Gia sÆ°)
app.post('/api/escrow/release', verifyToken, async (req, res) => {
    const { transactionId, payerWalletId, tutorWalletId, amount } = req.body;
    // Láº¥y admin_wallet_id tá»« mÃ´i trÆ°á»ng hoáº·c truy váº¥n user admin Ä‘áº§u tiÃªn
    try {
        let adminWalletId = process.env.ADMIN_WALLET_ID;
        if (!adminWalletId) {
            const { rows } = await pool.query("SELECT w.id FROM wallets w JOIN users u ON w.user_id = u.id WHERE u.role='admin' LIMIT 1");
            if (rows.length > 0) adminWalletId = rows[0].id;
            else return res.status(500).json({ success: false, message: 'Lá»—i há»‡ thá»‘ng: ChÆ°a cáº¥u hÃ¬nh vÃ­ Admin.' });
        }

        const commissionRate = 0.1; // 10%
        const { error } = await pool.query('SELECT release_escrow($1, $2, $3, $4, $5, $6)', [
            transactionId, payerWalletId, tutorWalletId, adminWalletId, amount, commissionRate
        ]);
        res.json({ success: true, message: 'ÄÃ£ giáº£i ngÃ¢n cho Gia sÆ°' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 6. Resolve Dispute (Xá»­ lÃ½ khiáº¿u náº¡i - Admin)
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
        res.json({ success: true, message: 'ÄÃ£ xá»­ lÃ½ khiáº¿u náº¡i thÃ nh cÃ´ng' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.listen(port, () => {
    console.log(`ðŸš€ Server is running on http://localhost:${port}`);
  });
}

startServer();


