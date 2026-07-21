require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_me';

const ADMIN_ID   = '00000000-0000-0000-0000-000000000001';
const TUTOR_ID   = '00000000-0000-0000-0000-000000000002';
const STUDENT_ID = '00000000-0000-0000-0000-000000000003';

function makeToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

const adminToken   = makeToken({ userId: ADMIN_ID,   email: 'admin@edux.local',   role: 'admin',   name: 'Admin' });
const tutorToken   = makeToken({ userId: TUTOR_ID,   email: 'tutor@edux.local',   role: 'tutor',   name: 'Tutor' });
const studentToken = makeToken({ userId: STUDENT_ID, email: 'student@edux.local', role: 'student', name: 'Student' });

module.exports = { adminToken, tutorToken, studentToken, makeToken, ADMIN_ID, TUTOR_ID, STUDENT_ID };
