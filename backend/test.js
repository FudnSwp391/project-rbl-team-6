const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres.qrdnebeulfdgfeermghj:cungnhauthukhoa@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres'
});
const q = `SELECT rr.*,
              b.subject, b.lesson_fee,
              u_student.full_name AS student_name_full, u_student.picture AS student_picture
       FROM reschedule_requests rr
       JOIN bookings b         ON b.id   = rr.booking_id
       JOIN users   u_student  ON u_student.id = rr.student_id
       WHERE rr.tutor_id = $1
         AND ($2 = 'ALL' OR rr.status = $2)
       ORDER BY rr.created_at DESC`;
pool.query(q, ['3d7bde33-e164-4977-8465-22c288a4090d', 'PENDING']).then(res => { console.log(res.rows); pool.end(); }).catch(console.error);
