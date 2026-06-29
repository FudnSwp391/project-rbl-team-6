require('dotenv').config();
const express = require('express');

const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);



// GET /api/students/:studentId/schedule
router.get('/students/:studentId/schedule', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { weekStart, status, subject, tutor, search } = req.query;

    let query = supabase
      .from('schedule_sessions')
      .select('*')
      .eq('student_id', studentId)
      .order('start_time', { ascending: true });

    if (status && status !== 'All Status') {
      query = query.eq('status', status.toLowerCase());
    }
    if (subject && subject !== 'All Subjects') {
      query = query.eq('subject', subject);
    }
    if (tutor && tutor !== 'All Tutors') {
      query = query.ilike('tutor_name', `%${tutor}%`);
    }
    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    const { data: sessions, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ success: false, error: 'Database error' });
    }

    const now = new Date();
    
    // Compute summary
    const total_classes = sessions.length;
    const completed = sessions.filter(s => s.status === 'completed').length;
    const upcoming = sessions.filter(s => s.status === 'upcoming').length;
    const learning_hours = sessions.reduce((acc, s) => acc + (s.study_minutes || 0) / 60, 0);
    const xp_earned = sessions.reduce((acc, s) => acc + (s.xp_earned || 0), 0);
    
    // For today/up_next
    const todayStr = now.toISOString().split('T')[0];
    const todaySessions = sessions.filter(s => s.start_time.startsWith(todayStr));
    const up_next = sessions.filter(s => new Date(s.start_time) > now && s.status === 'upcoming').slice(0, 5);

    res.json({
      success: true,
      data: {
        sessions,
        summary: {
          total_classes,
          completed,
          upcoming,
          learning_hours: Math.round(learning_hours * 10) / 10,
          weekly_completed: completed,
          weekly_total: total_classes,
          weekly_goal_hours: 6,
          streak_days: 4, // hardcoded mock for streak
          xp_earned
        },
        today: todaySessions,
        up_next
      }
    });

  } catch (err) {
    console.error('Route error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/schedule/sessions
router.post('/schedule/sessions', async (req, res) => {
  try {
    const { student_id, title, start_time, end_time, subject, tutor_name, meeting_platform, meeting_url, notes } = req.body;
    if (!title || !start_time || !end_time) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    
    const { data, error } = await supabase
      .from('schedule_sessions')
      .insert([{
        student_id, title, start_time, end_time, subject, tutor_name, meeting_platform, meeting_url, notes, status: 'upcoming'
      }])
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    console.error('Error creating session:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/schedule/sessions/:sessionId/status
router.patch('/schedule/sessions/:sessionId/status', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { status, xp_earned, study_minutes } = req.body;

    const updates = { status, updated_at: new Date().toISOString() };
    if (xp_earned !== undefined) updates.xp_earned = xp_earned;
    if (study_minutes !== undefined) updates.study_minutes = study_minutes;

    const { data, error } = await supabase
      .from('schedule_sessions')
      .update(updates)
      .eq('id', sessionId)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    console.error('Error updating status:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/schedule/sessions/:sessionId
router.get('/schedule/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { data, error } = await supabase
      .from('schedule_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
      
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    console.error('Error fetching session:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
