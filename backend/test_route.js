const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function test() {
  try {
    const resStud = await pool.query("SELECT student_id FROM bookings LIMIT 1");
    if(!resStud.rows.length) return console.log('no bookings');
    const studentId = resStud.rows[0].student_id;

    // -- EXACT LOGIC FROM server.js --
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
      
      const startStrToParse = `${row.lesson_date_str}T${sh}:${sm}:00+07:00`;
      const endStrToParse = `${row.lesson_date_str}T${eh}:${em}:00+07:00`;
      
      const startDate = new Date(startStrToParse);
      const endDate = new Date(endStrToParse);

      let status = row.status;
      if (status === 'accepted') {
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

    const search = '';
    const statusFilter = 'All Status';
    const subjectFilter = 'All Subjects';
    const tutorFilter = 'All Tutors';

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
    const up_next = sessions.filter(s => s.status === 'upcoming' || s.status === 'ongoing').slice(0, 3);

    console.log("SUCCESS!");

  } catch (e) {
    console.error('ERROR:', e);
  } finally {
    pool.end();
  }
}
test();
