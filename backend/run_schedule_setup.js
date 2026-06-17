require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  try {
    console.log('Creating table schedule_sessions...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schedule_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        class_id UUID, -- REFERENCES classes(id) ON DELETE CASCADE
        student_id UUID,
        tutor_id UUID,
        title TEXT NOT NULL,
        subject TEXT,
        tutor_name TEXT,
        meeting_platform TEXT,
        meeting_url TEXT,
        start_time TIMESTAMPTZ NOT NULL,
        end_time TIMESTAMPTZ NOT NULL,
        status TEXT DEFAULT 'upcoming',
        xp_earned INTEGER DEFAULT 0,
        study_minutes INTEGER,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_schedule_sessions_student_id ON schedule_sessions(student_id);
      CREATE INDEX IF NOT EXISTS idx_schedule_sessions_class_id ON schedule_sessions(class_id);
      CREATE INDEX IF NOT EXISTS idx_schedule_sessions_start_time ON schedule_sessions(start_time);
      CREATE INDEX IF NOT EXISTS idx_schedule_sessions_status ON schedule_sessions(status);
    `);
    
    // Check if we can add FK
    try {
        await pool.query('ALTER TABLE schedule_sessions ADD CONSTRAINT fk_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE');
    } catch(e) {
        console.log('FK constraint to classes already exists or classes table is missing/incompatible. Ignoring.');
    }

    console.log('Seeding schedule_sessions...');
    
    // Clear old data for test student
    await pool.query("DELETE FROM schedule_sessions WHERE student_id = '00000000-0000-0000-0000-000000000001'");

    // Make sure we have a fake class to reference
    try {
        await pool.query(`
          INSERT INTO classes (id, title, status)
          VALUES ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Dummy Class for Schedule', 'published')
          ON CONFLICT (id) DO NOTHING;
        `);
    } catch (e) {
        console.log('Could not insert dummy class (classes table might not exist or schema differs). Moving on without it.');
    }

    const today = new Date();
    // Monday this week
    const monday = new Date(today);
    monday.setDate(monday.getDate() - monday.getDay() + 1);
    
    // Helper to get time string
    const addDays = (date, days) => {
        const d = new Date(date);
        d.setDate(d.getDate() + days);
        return d;
    };

    const sessionData = [
      {
        title: 'Advanced Calculus',
        subject: 'Mathematics',
        tutor_name: 'Dr. Smith',
        status: 'completed',
        meeting_platform: 'Zoom',
        meeting_url: 'https://zoom.us/j/123',
        start_time: new Date(addDays(monday, 0).setHours(9, 0, 0, 0)),
        end_time: new Date(addDays(monday, 0).setHours(11, 0, 0, 0)),
        xp_earned: 80,
        study_minutes: 120
      },
      {
        title: 'Quantum Physics',
        subject: 'Physics',
        tutor_name: 'Prof. Johnson',
        status: 'upcoming',
        meeting_platform: 'G-Meet',
        meeting_url: 'https://meet.google.com/abc',
        start_time: new Date(addDays(monday, 1).setHours(14, 0, 0, 0)),
        end_time: new Date(addDays(monday, 1).setHours(15, 30, 0, 0)),
        xp_earned: 0,
        study_minutes: 0
      },
      {
        title: 'Modern European Lit',
        subject: 'Literature',
        tutor_name: 'Dr. Williams',
        status: 'upcoming',
        meeting_platform: 'Teams',
        meeting_url: '',
        start_time: new Date(addDays(monday, 3).setHours(16, 0, 0, 0)),
        end_time: new Date(addDays(monday, 3).setHours(17, 30, 0, 0)),
        xp_earned: 0,
        study_minutes: 0
      },
      {
        title: 'Algebra Review',
        subject: 'Mathematics',
        tutor_name: 'Dr. Smith',
        status: 'completed',
        meeting_platform: 'Zoom',
        meeting_url: 'https://zoom.us/j/123',
        start_time: new Date(addDays(monday, -2).setHours(10, 0, 0, 0)),
        end_time: new Date(addDays(monday, -2).setHours(11, 30, 0, 0)),
        xp_earned: 60,
        study_minutes: 90
      },
      {
        title: 'Physics Lab',
        subject: 'Physics',
        tutor_name: 'Prof. Johnson',
        status: 'ongoing',
        meeting_platform: 'Zoom',
        meeting_url: 'https://zoom.us/j/124',
        start_time: new Date(today.setHours(today.getHours() - 1, 0, 0, 0)),
        end_time: new Date(today.setHours(today.getHours() + 1, 0, 0, 0)),
        xp_earned: 0,
        study_minutes: 0
      }
    ];

    for (let s of sessionData) {
      await pool.query(`
        INSERT INTO schedule_sessions (
          class_id, student_id, title, subject, tutor_name, meeting_platform, meeting_url, start_time, end_time, status, xp_earned, study_minutes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        '00000000-0000-0000-0000-000000000001',
        s.title, s.subject, s.tutor_name, s.meeting_platform, s.meeting_url, s.start_time, s.end_time, s.status, s.xp_earned, s.study_minutes
      ]);
    }
    
    console.log('Done seeding!');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    pool.end();
  }
}

run();
