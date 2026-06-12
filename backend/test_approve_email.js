/**
 * Test sending the actual approval email template
 * Usage: node test_approve_email.js <target_email>
 */
require('dotenv').config();
const nodemailer = require('nodemailer');

const to = process.argv[2] || process.env.SMTP_USER;
const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, FRONTEND_ORIGIN } = process.env;

console.log(`📧 Sending approval email to: ${to}`);

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT || 587),
  secure: Number(SMTP_PORT) === 465,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

const frontendUrl = FRONTEND_ORIGIN || 'http://localhost:5173';

const html = `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f8f9fb;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fb;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#00288e 0%,#1e40af 100%);padding:40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;">EduX</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">Nền tảng kết nối gia sư chuyên nghiệp</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;text-align:center;">
            <div style="width:80px;height:80px;background:#dcfce7;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:24px;">
              <span style="font-size:40px;">✅</span>
            </div>
            <h2 style="margin:0 0 12px;color:#191c1e;font-size:24px;font-weight:700;">Chúc mừng! Hồ sơ đã được duyệt</h2>
            <p style="margin:0;color:#444653;font-size:16px;line-height:1.6;">
              Hồ sơ đăng ký gia sư của bạn trên <strong>EduX</strong> đã được <strong style="color:#16a34a;">chấp thuận</strong>.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 40px 40px;text-align:center;">
            <a href="${frontendUrl}#/tutor"
               style="display:inline-block;background:linear-gradient(135deg,#00288e,#1e40af);color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:16px 40px;border-radius:12px;">
              Vào Dashboard Gia Sư →
            </a>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

transporter.sendMail({
  from: SMTP_FROM || SMTP_USER,
  to,
  subject: '🎉 [TEST] Hồ sơ gia sư của bạn đã được chấp thuận — EduX',
  html,
}).then(info => {
  console.log('✅ Email gửi thành công! Message ID:', info.messageId);
  console.log('📬 Check hộp thư:', to);
}).catch(err => {
  console.error('❌ Lỗi gửi email:', err.message);
  console.error(err);
});
