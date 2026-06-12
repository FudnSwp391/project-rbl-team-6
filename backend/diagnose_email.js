require('dotenv').config();
const { Pool } = require('pg');
const nodemailer = require('nodemailer');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  try {
    // 1. Check pending tutors and their emails
    console.log('=== STEP 1: Check pending tutors ===');
    const res = await pool.query(`
      SELECT tp.id, u.email, u.full_name, tp.status
      FROM tutor_profiles tp
      JOIN users u ON u.id = tp.user_id
      WHERE tp.status = 'pending'
      LIMIT 5
    `);
    console.log('Pending tutors:', JSON.stringify(res.rows, null, 2));

    // 2. Check SMTP config
    console.log('\n=== STEP 2: Check SMTP config ===');
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
    console.log('SMTP_HOST:', SMTP_HOST || 'MISSING');
    console.log('SMTP_PORT:', SMTP_PORT || 'MISSING');
    console.log('SMTP_USER:', SMTP_USER || 'MISSING');
    console.log('SMTP_PASS:', SMTP_PASS ? '***set***' : 'MISSING');
    console.log('SMTP_FROM:', SMTP_FROM || 'MISSING');

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      console.error('\n❌ SMTP not configured properly!');
      return;
    }

    // 3. Test SMTP connection
    console.log('\n=== STEP 3: Test SMTP connection ===');
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT || 587),
      secure: Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    await transporter.verify();
    console.log('✅ SMTP connection OK');

    // 4. Send test approval email to the first pending tutor's email
    if (res.rows.length > 0) {
      const tutor = res.rows[0];
      console.log(`\n=== STEP 4: Send test email to ${tutor.email} ===`);
      const info = await transporter.sendMail({
        from: SMTP_FROM || SMTP_USER,
        to: tutor.email,
        subject: '🧪 [TEST] EduX - Email Delivery Test',
        html: `
          <div style="font-family:Arial,sans-serif;padding:24px;max-width:600px;">
            <h2 style="color:#00288e;">Email Delivery Test</h2>
            <p>Hello <strong>${tutor.full_name}</strong>,</p>
            <p>This is a test email to verify that the EduX notification system can reach your inbox.</p>
            <p style="color:#666;font-size:13px;">Sent at: ${new Date().toLocaleString('vi-VN')}</p>
          </div>
        `,
      });
      console.log('✅ Test email sent! Message ID:', info.messageId);
      console.log('📬 Sent to:', tutor.email);
    } else {
      console.log('\nNo pending tutors found. Sending test to SMTP_USER instead...');
      const info = await transporter.sendMail({
        from: SMTP_FROM || SMTP_USER,
        to: SMTP_USER,
        subject: '🧪 [TEST] EduX - Email Test',
        html: '<p>Test email from EduX. SMTP is working!</p>',
      });
      console.log('✅ Test email sent to self! Message ID:', info.messageId);
    }

  } catch (err) {
    console.error('\n❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

run();
