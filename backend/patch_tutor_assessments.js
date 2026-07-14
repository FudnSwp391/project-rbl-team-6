const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, 'server.js');
let content = fs.readFileSync(serverFile, 'utf8');

const apiCode = `
// ============================================================================
// NEW TUTOR ASSESSMENTS APIs (tutor_exams & tutor_homework)
// ============================================================================

// 1. GET /api/tutor/assessments/exams
app.get('/api/tutor/assessments/exams', verifyToken, requireTutor, async (req, res) => {
  try {
    const exams = await pool.query(
      \`SELECT * FROM tutor_exams WHERE tutor_id = $1 ORDER BY created_at DESC\`,
      [req.user.userId]
    );
    // get question count
    for (let e of exams.rows) {
      const qRes = await pool.query(\`SELECT COUNT(*) FROM tutor_exam_questions WHERE exam_id=$1\`, [e.id]);
      e.question_count = parseInt(qRes.rows[0].count);
    }
    res.json(exams.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// 2. POST /api/tutor/assessments/exams
app.post('/api/tutor/assessments/exams', verifyToken, requireTutor, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { title, course, duration_minutes, total_score, status, questions } = req.body;
    
    const insertExam = await client.query(
      \`INSERT INTO tutor_exams (tutor_id, title, course, duration_minutes, total_score, status)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *\`,
      [req.user.userId, title, course, duration_minutes, total_score, status || 'Draft']
    );
    const exam = insertExam.rows[0];

    if (questions && questions.length > 0) {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        await client.query(
          \`INSERT INTO tutor_exam_questions (exam_id, question_type, question_text, options, correct_answer, max_point, grading_note, question_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)\`,
          [exam.id, q.question_type, q.question_text, JSON.stringify(q.options || []), q.correct_answer, q.max_point, q.grading_note, i]
        );
      }
    }
    await client.query('COMMIT');
    res.status(201).json(exam);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  } finally {
    client.release();
  }
});

// 3. GET /api/tutor/assessments/exams/:id
app.get('/api/tutor/assessments/exams/:id', verifyToken, requireTutor, async (req, res) => {
  try {
    const { id } = req.params;
    const examRes = await pool.query(\`SELECT * FROM tutor_exams WHERE id=$1 AND tutor_id=$2\`, [id, req.user.userId]);
    if (examRes.rows.length === 0) return res.status(404).json({ message: 'Exam not found' });
    const exam = examRes.rows[0];
    const qRes = await pool.query(\`SELECT * FROM tutor_exam_questions WHERE exam_id=$1 ORDER BY question_order ASC\`, [id]);
    exam.questions = qRes.rows;
    res.json(exam);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// 4. PUT /api/tutor/assessments/exams/:id
app.put('/api/tutor/assessments/exams/:id', verifyToken, requireTutor, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { title, course, duration_minutes, total_score, status, questions } = req.body;
    
    const updateExam = await client.query(
      \`UPDATE tutor_exams SET title=$1, course=$2, duration_minutes=$3, total_score=$4, status=$5, updated_at=NOW()
       WHERE id=$6 AND tutor_id=$7 RETURNING *\`,
      [title, course, duration_minutes, total_score, status, id, req.user.userId]
    );
    if (updateExam.rows.length === 0) throw new Error('Exam not found or unauthorized');

    await client.query(\`DELETE FROM tutor_exam_questions WHERE exam_id=$1\`, [id]);

    if (questions && questions.length > 0) {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        await client.query(
          \`INSERT INTO tutor_exam_questions (exam_id, question_type, question_text, options, correct_answer, max_point, grading_note, question_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)\`,
          [id, q.question_type, q.question_text, JSON.stringify(q.options || []), q.correct_answer, q.max_point, q.grading_note, i]
        );
      }
    }
    await client.query('COMMIT');
    res.json(updateExam.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: err.message || 'Server Error' });
  } finally {
    client.release();
  }
});

// 5. PATCH /api/tutor/assessments/exams/:id/status
app.patch('/api/tutor/assessments/exams/:id/status', verifyToken, requireTutor, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const updateRes = await pool.query(
      \`UPDATE tutor_exams SET status=$1, updated_at=NOW() WHERE id=$2 AND tutor_id=$3 RETURNING *\`,
      [status, id, req.user.userId]
    );
    if (updateRes.rows.length === 0) return res.status(404).json({ message: 'Not found' });
    res.json(updateRes.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// 6. POST /api/tutor/assessments/exams/:id/duplicate
app.post('/api/tutor/assessments/exams/:id/duplicate', verifyToken, requireTutor, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const examRes = await pool.query(\`SELECT * FROM tutor_exams WHERE id=$1 AND tutor_id=$2\`, [id, req.user.userId]);
    if (examRes.rows.length === 0) throw new Error('Exam not found');
    const exam = examRes.rows[0];

    const insertExam = await client.query(
      \`INSERT INTO tutor_exams (tutor_id, title, course, duration_minutes, total_score, status)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *\`,
      [req.user.userId, exam.title + ' (Copy)', exam.course, exam.duration_minutes, exam.total_score, 'Draft']
    );
    const newExamId = insertExam.rows[0].id;

    const qRes = await pool.query(\`SELECT * FROM tutor_exam_questions WHERE exam_id=$1 ORDER BY question_order ASC\`, [id]);
    for (let q of qRes.rows) {
      await client.query(
        \`INSERT INTO tutor_exam_questions (exam_id, question_type, question_text, options, correct_answer, max_point, grading_note, question_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)\`,
        [newExamId, q.question_type, q.question_text, JSON.stringify(q.options), q.correct_answer, q.max_point, q.grading_note, q.question_order]
      );
    }
    await client.query('COMMIT');
    res.status(201).json(insertExam.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: err.message || 'Server Error' });
  } finally {
    client.release();
  }
});

// 7. DELETE /api/tutor/assessments/exams/:id
app.delete('/api/tutor/assessments/exams/:id', verifyToken, requireTutor, async (req, res) => {
  try {
    const { id } = req.params;
    const deleteRes = await pool.query(\`DELETE FROM tutor_exams WHERE id=$1 AND tutor_id=$2 RETURNING *\`, [id, req.user.userId]);
    if (deleteRes.rows.length === 0) return res.status(404).json({ message: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// --- HOMEWORK APIs ---

// 1. GET /api/tutor/assessments/homework
app.get('/api/tutor/assessments/homework', verifyToken, requireTutor, async (req, res) => {
  try {
    const hwRes = await pool.query(
      \`SELECT * FROM tutor_homework WHERE tutor_id = $1 ORDER BY created_at DESC\`,
      [req.user.userId]
    );
    for (let h of hwRes.rows) {
      const subRes = await pool.query(\`SELECT COUNT(*) FROM tutor_homework_submissions WHERE homework_id=$1\`, [h.id]);
      h.submission_count = parseInt(subRes.rows[0].count);
    }
    res.json(hwRes.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// 2. POST /api/tutor/assessments/homework
app.post('/api/tutor/assessments/homework', verifyToken, requireTutor, async (req, res) => {
  try {
    const { title, course, instructions, file_url, file_type, deadline, max_score, allow_late, status } = req.body;
    let finalDeadline = null;
    if (deadline && deadline.trim() !== '') {
      finalDeadline = deadline;
    }
    const insertRes = await pool.query(
      \`INSERT INTO tutor_homework (tutor_id, title, course, instructions, file_url, file_type, deadline, max_score, allow_late, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *\`,
      [req.user.userId, title, course, instructions, file_url, file_type, finalDeadline, max_score, allow_late, status || 'Open']
    );
    res.status(201).json(insertRes.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// 3. GET /api/tutor/assessments/homework/:id
app.get('/api/tutor/assessments/homework/:id', verifyToken, requireTutor, async (req, res) => {
  try {
    const { id } = req.params;
    const hwRes = await pool.query(\`SELECT * FROM tutor_homework WHERE id=$1 AND tutor_id=$2\`, [id, req.user.userId]);
    if (hwRes.rows.length === 0) return res.status(404).json({ message: 'Not found' });
    res.json(hwRes.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// 4. PUT /api/tutor/assessments/homework/:id
app.put('/api/tutor/assessments/homework/:id', verifyToken, requireTutor, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, course, instructions, file_url, file_type, deadline, max_score, allow_late, status } = req.body;
    let finalDeadline = null;
    if (deadline && deadline.trim() !== '') {
      finalDeadline = deadline;
    }
    const updateRes = await pool.query(
      \`UPDATE tutor_homework SET title=$1, course=$2, instructions=$3, file_url=$4, file_type=$5, deadline=$6, max_score=$7, allow_late=$8, status=$9, updated_at=NOW()
       WHERE id=$10 AND tutor_id=$11 RETURNING *\`,
      [title, course, instructions, file_url, file_type, finalDeadline, max_score, allow_late, status, id, req.user.userId]
    );
    if (updateRes.rows.length === 0) return res.status(404).json({ message: 'Not found' });
    res.json(updateRes.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// 5. PATCH /api/tutor/assessments/homework/:id/status
app.patch('/api/tutor/assessments/homework/:id/status', verifyToken, requireTutor, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const updateRes = await pool.query(
      \`UPDATE tutor_homework SET status=$1, updated_at=NOW() WHERE id=$2 AND tutor_id=$3 RETURNING *\`,
      [status, id, req.user.userId]
    );
    if (updateRes.rows.length === 0) return res.status(404).json({ message: 'Not found' });
    res.json(updateRes.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// 6. DELETE /api/tutor/assessments/homework/:id
app.delete('/api/tutor/assessments/homework/:id', verifyToken, requireTutor, async (req, res) => {
  try {
    const { id } = req.params;
    const deleteRes = await pool.query(\`DELETE FROM tutor_homework WHERE id=$1 AND tutor_id=$2 RETURNING *\`, [id, req.user.userId]);
    if (deleteRes.rows.length === 0) return res.status(404).json({ message: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

`;

const marker = "app.listen(port, () => {";
if (content.includes(marker)) {
  content = content.replace(marker, apiCode + marker);
  fs.writeFileSync(serverFile, content, 'utf8');
  console.log("Successfully patched server.js with Tutor Assessments APIs.");
} else {
  console.error("Marker not found in server.js!");
}
