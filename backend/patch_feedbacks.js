const fs = require('fs');
const path = require('path');

const serverJsPath = path.join(__dirname, 'server.js');
let serverJsContent = fs.readFileSync(serverJsPath, 'utf8');

const feedbackRoutes = `
  // ==========================================
  // MICRO-FEEDBACK ROUTES
  // ==========================================

  // [POST] /api/feedbacks - Gia sư submit đánh giá
  app.post('/api/feedbacks', verifyToken, requireTutor, async (req, res) => {
    try {
      const tutorId = req.user.id;
      const { lesson_id, student_id, subject_name, focus_rating, understanding_level, homework_status, tutor_note } = req.body;

      // Validate data
      if (!student_id || !focus_rating || !understanding_level || !homework_status) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Insert feedback
      const { data, error } = await supabase
        .from('lesson_feedbacks')
        .insert([{
          lesson_id: lesson_id || null,
          tutor_id: tutorId,
          student_id,
          subject_name,
          focus_rating,
          understanding_level,
          homework_status,
          tutor_note
        }])
        .select()
        .single();

      if (error) throw error;

      res.status(201).json({ message: "Feedback submitted successfully", data });
    } catch (err) {
      console.error('Error submitting feedback:', err.message);
      res.status(500).json({ error: "Server error while submitting feedback", details: err.message });
    }
  });

  // [GET] /api/feedbacks/student/:studentId - Phụ huynh/Học sinh lấy danh sách đánh giá
  app.get('/api/feedbacks/student/:studentId', verifyToken, async (req, res) => {
    try {
      const { studentId } = req.params;
      
      // Ở mức DB, RLS đã kiểm tra auth.uid() = student_id nên nếu token hợp lệ và query đúng thì an toàn
      const { data, error } = await supabase
        .from('lesson_feedbacks')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      res.status(200).json({ data });
    } catch (err) {
      console.error('Error fetching feedbacks:', err.message);
      res.status(500).json({ error: "Server error while fetching feedbacks", details: err.message });
    }
  });

`;

if (!serverJsContent.includes('/api/feedbacks')) {
  // Find the exact text to replace
  const target = `app.listen(port, () => {`;
  
  if (serverJsContent.includes(target)) {
    serverJsContent = serverJsContent.replace(target, feedbackRoutes + '\n  ' + target);
    fs.writeFileSync(serverJsPath, serverJsContent, 'utf8');
    console.log('Successfully injected feedback routes into server.js');
  } else {
    console.log('Could not find app.listen to inject routes.');
  }
} else {
  console.log('Feedback routes already exist in server.js');
}
