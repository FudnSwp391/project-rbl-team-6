require('dotenv').config();
const nodemailer = require('nodemailer');

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;

console.log('SMTP Config:');
console.log('  HOST:', SMTP_HOST);
console.log('  PORT:', SMTP_PORT);
console.log('  USER:', SMTP_USER);
console.log('  PASS:', SMTP_PASS ? '***' + SMTP_PASS.slice(-4) : 'MISSING');
console.log('  FROM:', SMTP_FROM);

async function testEmail() {
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  try {
    console.log('\n🔍 Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection OK!');

    console.log('\n📧 Sending test email...');
    const info = await transporter.sendMail({
      from: SMTP_FROM || SMTP_USER,
      to: SMTP_USER, // send to self for testing
      subject: '🧪 EduX - Email Test',
      html: `
        <div style="font-family:Arial,sans-serif;padding:20px;max-width:600px;">
          <h2 style="color:#00288e;">✅ Email Test Successful!</h2>
          <p>If you're reading this, the Nodemailer SMTP configuration is working correctly.</p>
          <p><strong>Sent at:</strong> ${new Date().toLocaleString('vi-VN')}</p>
        </div>
      `,
    });
    console.log('✅ Email sent! Message ID:', info.messageId);
    console.log('📬 Preview URL:', nodemailer.getTestMessageUrl(info) || 'N/A');
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error('Full error:', err);
  }
}

testEmail();
