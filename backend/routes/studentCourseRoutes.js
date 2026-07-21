const express = require("express");
const pool = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// GET /api/student/my-courses
router.get("/api/student/my-courses", requireAuth, async (req, res) => {
  try {
    const studentId = req.user.userId;

    // Fetch enrolled courses
    const enrollmentsResult = await pool.query(
      `SELECT 
        ce.id as enrollment_id,
        ce.status,
        c.id as course_id,
        c.title,
        c.thumbnail_url,
        c.subject,
        c.total_lessons,
        COALESCE(u.full_name, c.instructor_name) as instructor_name
       FROM course_enrollments ce
       JOIN courses c ON ce.course_id = c.id
       LEFT JOIN users u ON c.tutor_id = u.id
       WHERE ce.student_id = $1 AND ce.status = 'active'
       ORDER BY ce.created_at DESC`,
      [studentId]
    );

    const enrollments = enrollmentsResult.rows;

    // Fetch progress for each enrollment
    // Calculate total completed lessons per enrollment
    const enrollmentIds = enrollments.map(e => e.enrollment_id);
    let progressMap = {};
    
    if (enrollmentIds.length > 0) {
      const progressResult = await pool.query(
        `SELECT enrollment_id, COUNT(*) as completed_count
         FROM course_progress
         WHERE is_completed = true AND enrollment_id = ANY($1::uuid[])
         GROUP BY enrollment_id`,
        [enrollmentIds]
      );
  
      progressResult.rows.forEach(row => {
        progressMap[row.enrollment_id] = parseInt(row.completed_count, 10);
      });
    }

    let completedCourses = 0;

    const courses = enrollments.map(enrollment => {
      const completed_lessons = progressMap[enrollment.enrollment_id] || 0;
      const total_lessons = enrollment.total_lessons || 1; // avoid division by zero
      const progress_percentage = Math.min(100, Math.round((completed_lessons / total_lessons) * 100));
      
      if (progress_percentage >= 100) {
        completedCourses++;
      }

      return {
        ...enrollment,
        completed_lessons,
        progress_percentage
      };
    });

    res.json({
      success: true,
      data: {
        stats: {
          totalCourses: courses.length,
          completedCourses: completedCourses,
          weeklyHours: 0 // Currently not tracked in database schema
        },
        courses: courses
      }
    });

  } catch (error) {
    console.error("[Student Courses] GET error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
