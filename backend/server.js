const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");          // NEW: email notifications
const { OAuth2Client } = require("google-auth-library");
const pool = require("./db");

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 5000);
const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
const googleClientId = process.env.GOOGLE_CLIENT_ID || "";
const jwtSecret = process.env.JWT_SECRET || "dev_jwt_secret_change_me";
const googleClient = new OAuth2Client(googleClientId);

// â”€â”€â”€ Middleware â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.use(cors({ origin: frontendOrigin }));
app.use(express.json({ limit: "120mb" }));

// â”€â”€â”€ Helper: táº¡o JWT token â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function createToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      name: user.full_name || "",
      picture: user.picture || "",
      role: user.role || "student",
    },
    jwtSecret,
    { expiresIn: "7d" }
  );
}

// â”€â”€â”€ Middleware: verifyToken â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Reads the Authorization header, verifies the JWT, and attaches decoded
// user info to req.user. Returns 401 if the token is missing or invalid.
function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"] || "";
  // Expected format: "Bearer <token>"
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "No token provided. Please log in." });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded;   // { userId, email, name, picture, role }
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token. Please log in again." });
  }
}

// â”€â”€â”€ Middleware: requireAdmin â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Must be used AFTER verifyToken. Returns 403 if the user is not an admin.
function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Forbidden: admin access only." });
  }
  next();
}

function getSupabaseProjectUrl() {
  if (process.env.SUPABASE_URL) return process.env.SUPABASE_URL.replace(/\/$/, "");
  const match = (process.env.DATABASE_URL || "").match(/postgres\.([a-z0-9]+)@/i);
  return match ? `https://${match[1]}.supabase.co` : "";
}

function dataUrlToBuffer(dataUrl) {
  const match = /^data:([^;]+);base64,(.+)$/i.exec(dataUrl || "");
  if (!match) return null;
  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
}

function safeFileName(name) {
  return String(name || "file")
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function uploadToSupabaseStorage({ folder, fileName, mimeType, buffer }) {
  const supabaseUrl = getSupabaseProjectUrl();
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "edux-media";

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ANON_KEY in backend .env.");
  }

  const path = `${folder}/${Date.now()}-${safeFileName(fileName)}`;
  const endpoint = `${supabaseUrl}/storage/v1/object/${bucket}/${path}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": mimeType,
      "Cache-Control": "3600",
    },
    body: buffer,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Supabase upload failed with status ${response.status}`);
  }

  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}

async function ensureTutorProfile(userId) {
  await ensureTutorProfileSchema();

  const existing = await pool.query(
    "SELECT * FROM tutor_profiles WHERE user_id = $1 LIMIT 1",
    [userId]
  );

  if (existing.rows.length > 0) {
    return existing.rows[0];
  }

  const created = await pool.query(
    `INSERT INTO tutor_profiles (user_id, status)
     VALUES ($1, 'draft')
     RETURNING *`,
    [userId]
  );

  return created.rows[0];
}

async function ensureTutorProfileSchema() {
  await pool.query("ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS headline TEXT");
  await pool.query("ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS phone TEXT");
  await pool.query("ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS location TEXT");
  await pool.query("ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS teaching_style TEXT");
  await pool.query("ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS demo_video_url TEXT");
  await pool.query("ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS hourly_rate INT DEFAULT 0");
  await pool.query("ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS experience_years INT DEFAULT 0");
  await pool.query("ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS reject_reason TEXT");
  await pool.query("ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ");
  await pool.query("ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()");
  await pool.query(`
    UPDATE tutor_profiles
    SET approved_at = COALESCE(updated_at, created_at, NOW())
    WHERE status = 'approved'
      AND approved_at IS NULL
  `);
}

async function ensureBookingSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bookings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tutor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      tutor_name TEXT,
      student_name TEXT,
      child_name TEXT,
      subject TEXT,
      lesson_date DATE NOT NULL,
      time_slot TEXT NOT NULL,
      note TEXT,
      booking_type TEXT NOT NULL DEFAULT 'regular'
        CHECK (booking_type IN ('regular', 'trial')),
      status TEXT NOT NULL DEFAULT 'Pending'
        CHECK (status IN ('Pending', 'Approved', 'Declined')),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pool.query("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS tutor_name TEXT");
  await pool.query("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS student_name TEXT");
  await pool.query("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS child_name TEXT");
  await pool.query("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS note TEXT");
  await pool.query("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_type TEXT DEFAULT 'regular'");
  await pool.query("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()");
  await pool.query("UPDATE bookings SET booking_type = 'regular' WHERE booking_type IS NULL OR booking_type NOT IN ('regular', 'trial')");
  await pool.query(`
    DO $$
    DECLARE
      constraint_record RECORD;
    BEGIN
      FOR constraint_record IN
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
        WHERE rel.relname = 'bookings'
          AND con.contype = 'c'
          AND att.attname = 'booking_type'
      LOOP
        EXECUTE format('ALTER TABLE bookings DROP CONSTRAINT IF EXISTS %I', constraint_record.conname);
      END LOOP;
    END $$;
  `);
  await pool.query("ALTER TABLE bookings ALTER COLUMN booking_type SET DEFAULT 'regular'");
  await pool.query("ALTER TABLE bookings ALTER COLUMN booking_type SET NOT NULL");
  await pool.query(`
    ALTER TABLE bookings
    ADD CONSTRAINT bookings_booking_type_check
    CHECK (booking_type IN ('regular', 'trial'))
  `);
  await pool.query(`
    DO $$
    DECLARE
      constraint_record RECORD;
    BEGIN
      FOR constraint_record IN
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
        WHERE rel.relname = 'bookings'
          AND con.contype = 'c'
          AND att.attname = 'status'
      LOOP
        EXECUTE format('ALTER TABLE bookings DROP CONSTRAINT IF EXISTS %I', constraint_record.conname);
      END LOOP;
    END $$;
  `);
  await pool.query(`
    UPDATE bookings
    SET status = CASE LOWER(status)
      WHEN 'pending' THEN 'Pending'
      WHEN 'approved' THEN 'Approved'
      WHEN 'accepted' THEN 'Approved'
      WHEN 'confirmed' THEN 'Approved'
      WHEN 'declined' THEN 'Declined'
      WHEN 'rejected' THEN 'Declined'
      WHEN 'cancelled' THEN 'Declined'
      WHEN 'canceled' THEN 'Declined'
      ELSE 'Pending'
    END
  `);
  await pool.query("ALTER TABLE bookings ALTER COLUMN status SET DEFAULT 'Pending'");
  await pool.query(`
    ALTER TABLE bookings
    ADD CONSTRAINT bookings_status_check
    CHECK (status IN ('Pending', 'Approved', 'Declined'))
  `);
  await pool.query("CREATE INDEX IF NOT EXISTS idx_bookings_tutor_id ON bookings(tutor_id)");
  await pool.query("CREATE INDEX IF NOT EXISTS idx_bookings_student_id ON bookings(student_id)");
  await pool.query("CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status)");
  await pool.query("CREATE INDEX IF NOT EXISTS idx_bookings_lesson_date ON bookings(lesson_date)");
  try {
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_bookings_active_slot
      ON bookings(tutor_id, lesson_date, time_slot)
      WHERE status IN ('Pending', 'Approved')
    `);
  } catch (error) {
    console.warn("[Bookings] Could not create unique slot index. Existing duplicate active bookings may need cleanup.", error.message);
  }

  const hasNotesColumn = await pool.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_name = 'bookings'
       AND column_name = 'notes'
     LIMIT 1`
  );
  if (hasNotesColumn.rows.length > 0) {
    await pool.query("UPDATE bookings SET note = COALESCE(note, notes) WHERE note IS NULL");
  }
}

function optionalToken(req, _res, next) {
  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (token) {
    try {
      req.user = jwt.verify(token, jwtSecret);
    } catch {
      req.user = null;
    }
  }
  next();
}

async function ensureTutorReviewSchema() {
  await ensureBookingSchema();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tutor_reviews (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tutor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
      rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await pool.query("CREATE INDEX IF NOT EXISTS idx_tutor_reviews_tutor_id ON tutor_reviews(tutor_id)");
  await pool.query("CREATE INDEX IF NOT EXISTS idx_tutor_reviews_student_id ON tutor_reviews(student_id)");
}

async function ensureCourseSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS courses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tutor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      subject TEXT,
      level TEXT,
      price INT NOT NULL DEFAULT 0 CHECK (price >= 0),
      thumbnail_url TEXT,
      learning_outcomes JSONB NOT NULL DEFAULT '[]'::jsonb,
      requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
      status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'pending_review', 'published', 'rejected', 'archived')),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await pool.query("ALTER TABLE courses ADD COLUMN IF NOT EXISTS tutor_id UUID REFERENCES users(id) ON DELETE CASCADE");
  await pool.query("ALTER TABLE courses ADD COLUMN IF NOT EXISTS title TEXT");
  await pool.query("ALTER TABLE courses ADD COLUMN IF NOT EXISTS description TEXT");
  await pool.query("ALTER TABLE courses ADD COLUMN IF NOT EXISTS subject TEXT");
  await pool.query("ALTER TABLE courses ADD COLUMN IF NOT EXISTS level TEXT");
  await pool.query("ALTER TABLE courses ADD COLUMN IF NOT EXISTS price INT DEFAULT 0");
  await pool.query("ALTER TABLE courses ADD COLUMN IF NOT EXISTS thumbnail_url TEXT");
  await pool.query("ALTER TABLE courses ADD COLUMN IF NOT EXISTS learning_outcomes JSONB DEFAULT '[]'::jsonb");
  await pool.query("ALTER TABLE courses ADD COLUMN IF NOT EXISTS requirements JSONB DEFAULT '[]'::jsonb");
  await pool.query("ALTER TABLE courses ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft'");
  await pool.query("ALTER TABLE courses ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()");
  await pool.query("ALTER TABLE courses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()");
  await pool.query("UPDATE courses SET status = 'draft' WHERE status IS NULL OR status NOT IN ('draft', 'pending_review', 'published', 'rejected', 'archived')");
  await pool.query("UPDATE courses SET price = 0 WHERE price IS NULL OR price < 0");
  await pool.query("UPDATE courses SET learning_outcomes = '[]'::jsonb WHERE learning_outcomes IS NULL");
  await pool.query("UPDATE courses SET requirements = '[]'::jsonb WHERE requirements IS NULL");
  await pool.query(`
    DO $$
    DECLARE constraint_record RECORD;
    BEGIN
      FOR constraint_record IN
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
        WHERE rel.relname = 'courses'
          AND con.contype = 'c'
          AND att.attname IN ('status', 'price')
      LOOP
        EXECUTE format('ALTER TABLE courses DROP CONSTRAINT IF EXISTS %I', constraint_record.conname);
      END LOOP;
    END $$;
  `);
  await pool.query("ALTER TABLE courses ALTER COLUMN status SET DEFAULT 'draft'");
  await pool.query("ALTER TABLE courses ALTER COLUMN price SET DEFAULT 0");
  await pool.query("ALTER TABLE courses ADD CONSTRAINT courses_status_check CHECK (status IN ('draft', 'pending_review', 'published', 'rejected', 'archived'))");
  await pool.query("ALTER TABLE courses ADD CONSTRAINT courses_price_check CHECK (price >= 0)");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS course_lessons (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      video_url TEXT,
      material_url TEXT,
      duration_label TEXT,
      is_preview BOOLEAN NOT NULL DEFAULT false,
      position INT NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await pool.query("ALTER TABLE course_lessons ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE CASCADE");
  await pool.query("ALTER TABLE course_lessons ADD COLUMN IF NOT EXISTS title TEXT");
  await pool.query("ALTER TABLE course_lessons ADD COLUMN IF NOT EXISTS description TEXT");
  await pool.query("ALTER TABLE course_lessons ADD COLUMN IF NOT EXISTS video_url TEXT");
  await pool.query("ALTER TABLE course_lessons ADD COLUMN IF NOT EXISTS material_url TEXT");
  await pool.query("ALTER TABLE course_lessons ADD COLUMN IF NOT EXISTS duration_label TEXT");
  await pool.query("ALTER TABLE course_lessons ADD COLUMN IF NOT EXISTS is_preview BOOLEAN DEFAULT false");
  await pool.query("ALTER TABLE course_lessons ADD COLUMN IF NOT EXISTS position INT DEFAULT 1");
  await pool.query("ALTER TABLE course_lessons ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()");
  await pool.query("ALTER TABLE course_lessons ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS course_enrollments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      student_name TEXT,
      child_name TEXT,
      status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'refunded', 'cancelled')),
      purchased_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(course_id, student_id)
    );
  `);
  await pool.query("ALTER TABLE course_enrollments ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE CASCADE");
  await pool.query("ALTER TABLE course_enrollments ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES users(id) ON DELETE CASCADE");
  await pool.query("ALTER TABLE course_enrollments ADD COLUMN IF NOT EXISTS student_name TEXT");
  await pool.query("ALTER TABLE course_enrollments ADD COLUMN IF NOT EXISTS child_name TEXT");
  await pool.query("ALTER TABLE course_enrollments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'");
  await pool.query("ALTER TABLE course_enrollments ADD COLUMN IF NOT EXISTS purchased_at TIMESTAMPTZ DEFAULT NOW()");
  await pool.query("ALTER TABLE course_enrollments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()");
  await pool.query("ALTER TABLE course_enrollments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()");
  await pool.query("UPDATE course_enrollments SET status = 'active' WHERE status IS NULL OR status NOT IN ('active', 'refunded', 'cancelled')");
  await pool.query(`
    DO $$
    DECLARE constraint_record RECORD;
    BEGIN
      FOR constraint_record IN
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
        WHERE rel.relname = 'course_enrollments'
          AND con.contype = 'c'
          AND att.attname = 'status'
      LOOP
        EXECUTE format('ALTER TABLE course_enrollments DROP CONSTRAINT IF EXISTS %I', constraint_record.conname);
      END LOOP;
    END $$;
  `);
  await pool.query("ALTER TABLE course_enrollments ALTER COLUMN status SET DEFAULT 'active'");
  await pool.query("ALTER TABLE course_enrollments ADD CONSTRAINT course_enrollments_status_check CHECK (status IN ('active', 'refunded', 'cancelled'))");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS course_progress (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      enrollment_id UUID NOT NULL REFERENCES course_enrollments(id) ON DELETE CASCADE,
      lesson_id UUID NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
      watched_seconds INT NOT NULL DEFAULT 0,
      is_completed BOOLEAN NOT NULL DEFAULT false,
      completed_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(enrollment_id, lesson_id)
    );
  `);
  await pool.query("ALTER TABLE course_progress ADD COLUMN IF NOT EXISTS enrollment_id UUID REFERENCES course_enrollments(id) ON DELETE CASCADE");
  await pool.query("ALTER TABLE course_progress ADD COLUMN IF NOT EXISTS lesson_id UUID REFERENCES course_lessons(id) ON DELETE CASCADE");
  await pool.query("ALTER TABLE course_progress ADD COLUMN IF NOT EXISTS watched_seconds INT DEFAULT 0");
  await pool.query("ALTER TABLE course_progress ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT false");
  await pool.query("ALTER TABLE course_progress ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ");
  await pool.query("ALTER TABLE course_progress ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()");
  await pool.query("CREATE INDEX IF NOT EXISTS idx_courses_tutor_id ON courses(tutor_id)");
  await pool.query("CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status)");
  await pool.query("CREATE INDEX IF NOT EXISTS idx_course_lessons_course_id ON course_lessons(course_id)");
  await pool.query("CREATE INDEX IF NOT EXISTS idx_course_enrollments_student_id ON course_enrollments(student_id)");
  try {
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_course_enrollments_course_student
      ON course_enrollments(course_id, student_id)
    `);
  } catch (error) {
    console.warn("[Courses] Could not create unique enrollment index. Existing duplicate enrollments may need cleanup.", error.message);
  }
  try {
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_course_progress_enrollment_lesson
      ON course_progress(enrollment_id, lesson_id)
    `);
  } catch (error) {
    console.warn("[Courses] Could not create unique progress index. Existing duplicate progress rows may need cleanup.", error.message);
  }
}

// â”€â”€â”€ Nodemailer: email helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Sends a notification email to a tutor after their application is reviewed.
// If SMTP env variables are missing, it logs a warning and skips sending.
async function sendTutorReviewEmail(to, status, reason) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;

  // Skip gracefully if SMTP is not configured
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.log(`[Email] SMTP not configured â€” skipping email to ${to}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: Number(SMTP_PORT) === 465,   // true for port 465, false for others
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  const isApproved = status === "approved";
  const subject = isApproved
    ? "đŸ‰ Your EduX tutor application has been approved!"
    : "Your EduX tutor application was not approved";

  const html = isApproved
    ? `<p>Congratulations! Your tutor application on <strong>EduX</strong> has been <strong style="color:green">approved</strong>. You can now start accepting students.</p>`
    : `<p>Thank you for applying to <strong>EduX</strong>. Unfortunately, your application was <strong style="color:red">rejected</strong>.</p>
       <p><strong>Reason:</strong> ${reason || "No specific reason provided."}</p>
       <p>You may re-apply after addressing the issues mentioned above.</p>`;

  try {
    await transporter.sendMail({
      from: SMTP_FROM || SMTP_USER,
      to,
      subject,
      html,
    });
    console.log(`[Email] Sent ${status} notification to ${to}`);
  } catch (err) {
    // Log the error but do NOT crash the server
    console.error(`[Email] Failed to send email to ${to}:`, err.message);
  }
}

// â”€â”€â”€ GET / â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.get("/", (req, res) => {
  res.send("EduX Backend is running âœ…");
});

app.post("/api/uploads", verifyToken, async (req, res) => {
  try {
    const { fileName, mimeType, dataUrl, folder = "general" } = req.body || {};
    const parsed = dataUrlToBuffer(dataUrl);

    if (!fileName || !parsed) {
      return res.status(400).json({ message: "A valid base64 dataUrl and fileName are required." });
    }

    const finalMimeType = mimeType || parsed.mimeType;
    const allowed = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "application/pdf",
      "video/mp4",
      "video/webm",
      "video/quicktime",
    ];

    if (!allowed.includes(finalMimeType)) {
      return res.status(400).json({ message: "Unsupported file type." });
    }

    const maxBytes = finalMimeType.startsWith("video/") ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
    if (parsed.buffer.length > maxBytes) {
      return res.status(400).json({ message: "File is too large." });
    }

    const publicUrl = await uploadToSupabaseStorage({
      folder: `${folder}/${req.user.userId}`,
      fileName,
      mimeType: finalMimeType,
      buffer: parsed.buffer,
    });

    return res.status(201).json({ url: publicUrl });
  } catch (error) {
    console.error("Upload error:", error.message);
    return res.status(500).json({ message: error.message || "Upload failed." });
  }
});

// â”€â”€â”€ POST /api/auth/register â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ÄÄƒng kĂ½ báº±ng email + password
app.post("/api/auth/register", async (req, res) => {
  try {
    const { fullName, email, password, role } = req.body || {};

    // Validate
    if (!fullName || !email || !password) {
      return res
        .status(400)
        .json({ message: "Full name, email and password are required." });
    }
    if (password.length < 8) {
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters." });
    }

    const allowedRoles = ["student", "parent", "tutor"];
    const userRole = allowedRoles.includes(role) ? role : "student";

    // Kiá»ƒm tra email Ä‘Ă£ tá»“n táº¡i chÆ°a
    const existing = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email.toLowerCase().trim()]
    );
    if (existing.rows.length > 0) {
      return res
        .status(409)
        .json({ message: "Email already registered. Please sign in." });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Táº¡o user má»›i
    const result = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, full_name, email, role, picture, created_at`,
      [fullName.trim(), email.toLowerCase().trim(), passwordHash, userRole]
    );

    const newUser = result.rows[0];
    const token = createToken(newUser);

    return res.status(201).json({
      token,
      user: {
        id: newUser.id,
        name: newUser.full_name,
        email: newUser.email,
        role: newUser.role,
        picture: newUser.picture,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
});

// â”€â”€â”€ POST /api/auth/login â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ÄÄƒng nháº­p báº±ng email + password
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }

    // TĂ¬m user theo email
    const result = await pool.query(
      "SELECT id, full_name, email, password_hash, google_id, role, picture FROM users WHERE email = $1",
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return res
        .status(401)
        .json({ message: "Invalid email or password." });
    }

    const user = result.rows[0];

    // User Ä‘Äƒng kĂ½ báº±ng Google, khĂ´ng cĂ³ password
    if (!user.password_hash) {
      if (user.google_id) {
        return res.status(401).json({
          message: "This account uses Google sign-in. Please use Google to log in.",
        });
      }

      return res.status(401).json({
        message: "This account does not have a password yet. Please reset or set a password.",
      });
    }
    // Kiá»ƒm tra password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const token = createToken(user);

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.full_name,
        email: user.email,
        role: user.role,
        picture: user.picture,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
});

// â”€â”€â”€ POST /api/auth/google â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ÄÄƒng nháº­p / Ä‘Äƒng kĂ½ báº±ng Google OAuth â€” lÆ°u vĂ o DB
app.post("/api/auth/google", async (req, res) => {
  try {
    const { credential } = req.body || {};

    if (!googleClientId) {
      return res
        .status(500)
        .json({ message: "GOOGLE_CLIENT_ID is not configured on the server." });
    }
    if (!credential) {
      return res.status(400).json({ message: "Missing Google credential." });
    }

    // Verify Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: googleClientId,
    });

    const payload = ticket.getPayload();
    if (!payload?.email || !payload?.sub) {
      return res.status(401).json({ message: "Invalid Google token payload." });
    }

    const googleId = payload.sub;
    const email = payload.email.toLowerCase().trim();
    const name = payload.name || "";
    const picture = payload.picture || "";

    // TĂ¬m user Ä‘Ă£ cĂ³ chÆ°a (theo google_id hoáº·c email)
    let userResult = await pool.query(
      "SELECT id, full_name, email, role, picture FROM users WHERE google_id = $1 OR email = $2",
      [googleId, email]
    );

    let user;
    if (userResult.rows.length > 0) {
      // ÄĂ£ cĂ³ â†’ cáº­p nháº­t google_id vĂ  picture náº¿u cáº§n
      user = userResult.rows[0];
      await pool.query(
        "UPDATE users SET google_id = $1, picture = $2 WHERE id = $3",
        [googleId, picture, user.id]
      );
      user.picture = picture;
    } else {
      // ChÆ°a cĂ³ â†’ táº¡o má»›i vá»›i role máº·c Ä‘á»‹nh 'student'
      const insertResult = await pool.query(
        `INSERT INTO users (full_name, email, google_id, picture, role)
         VALUES ($1, $2, $3, $4, 'student')
         RETURNING id, full_name, email, role, picture`,
        [name, email, googleId, picture]
      );
      user = insertResult.rows[0];
    }

    const token = createToken(user);

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.full_name,
        email: user.email,
        role: user.role,
        picture: user.picture,
      },
    });
  } catch (error) {
    console.error("Google auth error:", error);
    return res.status(401).json({ message: "Google authentication failed." });
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// â”€â”€ ADMIN APIs (all protected by verifyToken + requireAdmin) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// â”€â”€â”€ GET /api/admin/tutors/stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Returns count of pending / approved / rejected tutor profiles
// Public tutor list used by the home/search flow.
app.get("/api/tutors", async (req, res) => {
  try {
    await ensureTutorProfileSchema();
    await ensureTutorReviewSchema();

    const result = await pool.query(
      `SELECT
         u.id AS id,
         u.id AS user_id,
         tp.id AS profile_id,
         u.id AS account_id,
         u.full_name AS name,
         u.picture AS avatar,
         tp.bio AS description,
         tp.subjects,
         tp.headline,
         tp.location,
         tp.teaching_style,
         tp.demo_video_url,
         tp.experience_years,
         tp.hourly_rate AS rate,
         tp.approved_at,
         tp.status,
         COALESCE(review_stats.avg_rating, 5) AS rating,
         COALESCE(review_stats.review_count, 0) AS reviews_count,
         COALESCE(tp.status = 'approved', false) AS verified,
         COALESCE(tp.status = 'approved' AND COALESCE(tp.approved_at, tp.updated_at, tp.created_at) >= NOW() - INTERVAL '30 days', false) AS is_new_tutor
       FROM tutor_profiles tp
       JOIN users u ON u.id = tp.user_id
       LEFT JOIN LATERAL (
         SELECT ROUND(AVG(rating)::numeric, 1) AS avg_rating, COUNT(*)::int AS review_count
         FROM tutor_reviews
         WHERE tutor_id = u.id
       ) review_stats ON true
       WHERE u.role = 'tutor'
         AND tp.status = 'approved'
       ORDER BY tp.updated_at DESC, tp.created_at DESC`
    );

    return res.json(result.rows.map((row) => ({
      ...row,
      avatar: row.avatar || "",
      subjects: row.subjects
        ? row.subjects.split(",").map((subject) => subject.trim()).filter(Boolean)
        : [],
      level: `${row.experience_years || 0}+ years experience`,
      rating: Number(row.rating) || 5,
      reviewsCount: Number(row.reviews_count) || 0,
      description: row.description || row.headline || "EduX verified tutor.",
      rate: row.rate || 0,
      isNewTutor: row.is_new_tutor,
    })));
  } catch (error) {
    console.error("Get tutors error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

// Public tutor profile used by TutorProfile page. The id may be tutor_profiles.id
// or users.id; returned id is always the tutor user's id for chat/booking flows.
app.get("/api/tutors/:id", async (req, res) => {
  try {
    await ensureTutorProfileSchema();
    await ensureTutorReviewSchema();

    const { id } = req.params;

    const profileResult = await pool.query(
      `SELECT
         u.id AS id,
         u.id AS user_id,
         tp.id AS profile_id,
         u.id AS account_id,
         u.full_name AS name,
         u.picture AS avatar,
         tp.bio,
         tp.subjects,
         tp.headline,
         tp.phone,
         tp.location,
         tp.teaching_style,
         tp.demo_video_url,
         tp.experience_years,
         tp.hourly_rate AS rate,
         tp.approved_at,
         tp.status,
         COALESCE(tp.status = 'approved', false) AS verified,
         COALESCE(tp.status = 'approved' AND COALESCE(tp.approved_at, tp.updated_at, tp.created_at) >= NOW() - INTERVAL '30 days', false) AS is_new_tutor
       FROM tutor_profiles tp
       JOIN users u ON u.id = tp.user_id
       WHERE (tp.id::text = $1 OR u.id::text = $1)
         AND u.role = 'tutor'
         AND tp.status = 'approved'
       LIMIT 1`,
      [id]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ message: "Tutor not found." });
    }

    const profile = profileResult.rows[0];

    const credResult = await pool.query(
      `SELECT type, title
       FROM tutor_credentials
       WHERE tutor_id = (
         SELECT id FROM tutor_profiles WHERE user_id = $1 LIMIT 1
       )
         AND status = 'approved'
       ORDER BY created_at ASC`,
      [profile.user_id]
    );

    const availResult = await pool.query(
      `SELECT day_of_week, time_slot
       FROM tutor_availability
       WHERE tutor_id = (
         SELECT id FROM tutor_profiles WHERE user_id = $1 LIMIT 1
       )
       ORDER BY day_of_week, time_slot`,
      [profile.user_id]
    );

    const availability = {};
    for (const row of availResult.rows) {
      if (!availability[row.day_of_week]) availability[row.day_of_week] = [];
      availability[row.day_of_week].push(row.time_slot);
    }

    const reviewResult = await pool.query(
      `SELECT
         r.id,
         r.rating,
         r.comment,
         to_char(r.created_at, 'YYYY-MM-DD') AS date,
         COALESCE(u.full_name, 'Student') AS "studentName"
       FROM tutor_reviews r
       LEFT JOIN users u ON u.id = r.student_id
       WHERE r.tutor_id = $1
       ORDER BY r.created_at DESC`,
      [profile.user_id]
    );
    const reviews = reviewResult.rows;
    const rating = reviews.length
      ? Number((reviews.reduce((sum, item) => sum + Number(item.rating || 0), 0) / reviews.length).toFixed(1))
      : 5;

    let courses = [];
    try {
      await ensureCourseSchema();
      const courseResult = await pool.query(
        `SELECT
           c.id,
           c.title,
           c.description,
           c.subject,
           c.level,
           c.price,
           c.thumbnail_url AS "thumbnailUrl",
           c.learning_outcomes AS "learningOutcomes",
           c.requirements,
           c.status,
           COUNT(l.id)::int AS "lessonCount",
           COUNT(e.id)::int AS "enrollmentCount"
         FROM courses c
         LEFT JOIN course_lessons l ON l.course_id = c.id
         LEFT JOIN course_enrollments e ON e.course_id = c.id AND e.status = 'active'
         WHERE c.tutor_id = $1
           AND c.status = 'published'
         GROUP BY c.id
         ORDER BY c.updated_at DESC, c.created_at DESC`,
        [profile.user_id]
      );
      courses = courseResult.rows;
    } catch (courseError) {
      console.warn("[Tutor detail] Course data skipped:", courseError.message);
    }

    return res.json({
      ...profile,
      avatar: profile.avatar || "",
      subjects: profile.subjects
        ? profile.subjects.split(",").map((subject) => subject.trim()).filter(Boolean)
        : [],
      rating,
      reviewsCount: reviews.length,
      level: `${profile.experience_years || 0}+ years experience`,
      description: profile.bio || profile.headline || "EduX verified tutor.",
      isNewTutor: profile.is_new_tutor,
      education: credResult.rows.filter((item) => item.type === "education").map((item) => item.title),
      certificates: credResult.rows.filter((item) => item.type === "certificate").map((item) => item.title),
      experience: credResult.rows.filter((item) => item.type === "experience").map((item) => item.title),
      availability,
      reviews,
      courses,
    });
  } catch (error) {
    console.error("Get tutor detail error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

app.get("/api/tutors/:id/availability", async (req, res) => {
  try {
    await ensureBookingSchema();
    const { id } = req.params;
    const from = req.query.from || new Date().toISOString().slice(0, 10);
    const to = req.query.to || null;

    const profileResult = await pool.query(
      `SELECT tp.id, u.id AS user_id
       FROM tutor_profiles tp
       JOIN users u ON u.id = tp.user_id
       WHERE (tp.id::text = $1 OR u.id::text = $1)
         AND u.role = 'tutor'
         AND tp.status = 'approved'
       LIMIT 1`,
      [id]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ message: "Tutor not found." });
    }

    const availResult = await pool.query(
      `SELECT day_of_week, time_slot
       FROM tutor_availability
       WHERE tutor_id = $1
       ORDER BY day_of_week, time_slot`,
      [profileResult.rows[0].id]
    );

    const availability = {};
    for (const row of availResult.rows) {
      if (!availability[row.day_of_week]) availability[row.day_of_week] = [];
      availability[row.day_of_week].push(row.time_slot);
    }

    const params = [profileResult.rows[0].user_id, from];
    let dateFilter = "b.lesson_date >= $2";
    if (to) {
      params.push(to);
      dateFilter += " AND b.lesson_date <= $3";
    }

    const bookingResult = await pool.query(
      `SELECT to_char(b.lesson_date, 'YYYY-MM-DD') AS date, b.time_slot AS "timeSlot", b.status
       FROM bookings b
       WHERE b.tutor_id = $1
         AND ${dateFilter}
         AND b.status IN ('Pending', 'Approved')
       ORDER BY b.lesson_date ASC, b.time_slot ASC`,
      params
    );

    const bookedSlots = {};
    for (const row of bookingResult.rows) {
      const dateKey = row.date;
      if (!bookedSlots[dateKey]) bookedSlots[dateKey] = [];
      bookedSlots[dateKey].push({
        timeSlot: row.timeSlot,
        status: row.status,
      });
    }

    return res.json({ availability, bookedSlots });
  } catch (error) {
    console.error("Get tutor availability error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

app.get("/api/admin/tutors/stats", verifyToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending')  AS pending,
        COUNT(*) FILTER (WHERE status = 'approved') AS approved,
        COUNT(*) FILTER (WHERE status = 'rejected') AS rejected
      FROM tutor_profiles
    `);
    const row = result.rows[0];
    return res.json({
      pending:  Number(row.pending),
      approved: Number(row.approved),
      rejected: Number(row.rejected),
    });
  } catch (error) {
    console.error("Stats error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

// â”€â”€â”€ GET /api/admin/tutors/pending â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Returns all tutor_profiles with status = 'pending', joined with users
app.get("/api/admin/tutors/pending", verifyToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        tp.id,
        tp.user_id,
        u.full_name,
        u.email,
        tp.bio,
        tp.subjects,
        tp.headline,
        tp.phone,
        tp.location,
        tp.teaching_style,
        tp.demo_video_url,
        tp.experience_years,
        tp.hourly_rate,
        tp.certificate_url,
        tp.cccd_url,
        tp.status,
        tp.reject_reason,
        tp.created_at
      FROM tutor_profiles tp
      JOIN users u ON u.id = tp.user_id
      WHERE tp.status = 'pending'
      ORDER BY tp.created_at ASC
    `);
    return res.json(result.rows);
  } catch (error) {
    console.error("Pending tutors error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

// â”€â”€â”€ PATCH /api/admin/tutors/:id/approve â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Approves a tutor application and optionally sends them an email
app.patch("/api/admin/tutors/:id/approve", verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await ensureTutorProfileSchema();

    const result = await pool.query(
      `UPDATE tutor_profiles
       SET status = 'approved',
           approved_at = CASE
             WHEN status IS DISTINCT FROM 'approved' THEN NOW()
             ELSE COALESCE(approved_at, NOW())
           END,
           reject_reason = NULL,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Tutor profile not found." });
    }

    const profile = result.rows[0];

    // Also update the user's role to 'tutor' (if not already)
    await pool.query(
      `UPDATE users SET role = 'tutor' WHERE id = $1 AND role != 'admin'`,
      [profile.user_id]
    );

    // Fetch user email to send notification
    const userResult = await pool.query(
      "SELECT email FROM users WHERE id = $1",
      [profile.user_id]
    );
    if (userResult.rows.length > 0) {
      sendTutorReviewEmail(userResult.rows[0].email, "approved", null);
    }

    return res.json(profile);
  } catch (error) {
    console.error("Approve error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

// â”€â”€â”€ PATCH /api/admin/tutors/:id/reject â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Rejects a tutor application with a reason and optionally sends them an email
app.patch("/api/admin/tutors/:id/reject", verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body || {};

  if (!reason || !reason.trim()) {
    return res.status(400).json({ message: "Reject reason is required." });
  }

  try {
    const result = await pool.query(
      `UPDATE tutor_profiles
       SET status = 'rejected', reject_reason = $1
       WHERE id = $2
       RETURNING *`,
      [reason.trim(), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Tutor profile not found." });
    }

    const profile = result.rows[0];

    // Fetch user email to send notification
    const userResult = await pool.query(
      "SELECT email FROM users WHERE id = $1",
      [profile.user_id]
    );
    if (userResult.rows.length > 0) {
      sendTutorReviewEmail(userResult.rows[0].email, "rejected", reason);
    }

    return res.json(profile);
  } catch (error) {
    console.error("Reject error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// â”€â”€ TUTOR PROFILE APIs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// â”€â”€â”€ GET /api/tutor/profile â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Láº¥y profile Ä‘áº§y Ä‘á»§ cá»§a gia sÆ° hiá»‡n táº¡i (bao gá»“m credentials + availability)
app.get("/api/tutor/profile", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Láº¥y tutor_profile
    const profileResult = await pool.query(
      `SELECT tp.*, u.full_name, u.email, u.picture
       FROM tutor_profiles tp
       JOIN users u ON u.id = tp.user_id
       WHERE tp.user_id = $1`,
      [userId]
    );

    let profile = profileResult.rows[0];
    if (!profile) {
      const created = await pool.query(
        `INSERT INTO tutor_profiles (user_id, status)
         VALUES ($1, 'draft')
         RETURNING *`,
        [userId]
      );
      const userResult = await pool.query(
        "SELECT full_name, email, picture FROM users WHERE id = $1",
        [userId]
      );
      profile = { ...created.rows[0], ...(userResult.rows[0] || {}) };
    }

    // Láº¥y credentials
    const credResult = await pool.query(
      `SELECT * FROM tutor_credentials WHERE tutor_id = $1 ORDER BY created_at ASC`,
      [profile.id]
    );

    // Láº¥y availability
    const availResult = await pool.query(
      `SELECT day_of_week, time_slot FROM tutor_availability WHERE tutor_id = $1 ORDER BY day_of_week, time_slot`,
      [profile.id]
    );

    // Group availability theo ngĂ y
    const availability = {};
    for (const row of availResult.rows) {
      if (!availability[row.day_of_week]) availability[row.day_of_week] = [];
      availability[row.day_of_week].push(row.time_slot);
    }

    const isNewTutor =
      profile.status === "approved" &&
      new Date(profile.approved_at || profile.updated_at || profile.created_at || 0).getTime() >= Date.now() - 30 * 24 * 60 * 60 * 1000;

    return res.json({
      ...profile,
      isNewTutor,
      is_new_tutor: isNewTutor,
      credentials: credResult.rows,
      availability,
    });
  } catch (error) {
    console.error("Get tutor profile error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

// â”€â”€â”€ PATCH /api/tutor/profile/bio â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Gia sÆ° cáº­p nháº­t bio trá»±c tiáº¿p â€” khĂ´ng cáº§n admin duyá»‡t
app.patch("/api/tutor/profile/bio", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { bio } = req.body || {};

    if (!bio || !bio.trim()) {
      return res.status(400).json({ message: "Bio content is required." });
    }

    await ensureTutorProfile(userId);

    const result = await pool.query(
      `UPDATE tutor_profiles
       SET bio = $1, bio_pending = NULL, bio_status = 'approved', updated_at = NOW()
       WHERE user_id = $2
       RETURNING id, bio, bio_status`,
      [bio.trim(), userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Tutor profile not found." });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error("Update bio error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

// â”€â”€â”€ PATCH /api/tutor/profile/avatar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Gia sÆ° cáº­p nháº­t avatar URL (khĂ´ng cáº§n duyá»‡t)
app.patch("/api/tutor/profile/cv", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      full_name,
      bio,
      subjects,
      headline,
      phone,
      location,
      teaching_style,
      demo_video_url,
      hourly_rate,
      experience_years,
    } = req.body || {};

    if (full_name?.trim()) {
      await pool.query(
        "UPDATE users SET full_name = $1, updated_at = NOW() WHERE id = $2",
        [full_name.trim(), userId]
      );
    }

    await ensureTutorProfile(userId);

    const result = await pool.query(
      `UPDATE tutor_profiles
       SET bio = $1,
           subjects = $2,
           headline = $3,
           phone = $4,
           location = $5,
           teaching_style = $6,
           demo_video_url = $7,
           hourly_rate = $8,
           experience_years = $9,
           status = 'draft',
           reject_reason = NULL,
           updated_at = NOW()
       WHERE user_id = $10
       RETURNING *`,
      [
        bio?.trim() || null,
        subjects?.trim() || null,
        headline?.trim() || null,
        phone?.trim() || null,
        location?.trim() || null,
        teaching_style?.trim() || null,
        demo_video_url?.trim() || null,
        Number(hourly_rate) || 0,
        Number(experience_years) || 0,
        userId,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Tutor profile not found." });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error("Update tutor CV error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

app.patch("/api/tutor/profile/submit", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const profile = await ensureTutorProfile(userId);

    await pool.query(
      `UPDATE tutor_credentials
       SET status = 'approved',
           reject_reason = NULL,
           updated_at = NOW()
       WHERE tutor_id = $1`,
      [profile.id]
    );

    const result = await pool.query(
      `UPDATE tutor_profiles
       SET status = 'pending',
           reject_reason = NULL,
           updated_at = NOW()
       WHERE id = $1
         AND NULLIF(TRIM(COALESCE(bio, '')), '') IS NOT NULL
         AND NULLIF(TRIM(COALESCE(subjects, '')), '') IS NOT NULL
       RETURNING *`,
      [profile.id]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: "Please complete your bio and subjects before submitting." });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error("Submit tutor profile error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

app.patch("/api/tutor/profile/avatar", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { picture } = req.body || {};

    if (!picture || !picture.trim()) {
      return res.status(400).json({ message: "Picture URL is required." });
    }

    const result = await pool.query(
      `UPDATE users SET picture = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, full_name, email, role, picture`,
      [picture.trim(), userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error("Update avatar error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

// â”€â”€â”€ POST /api/tutor/credentials â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ThĂªm 1 credential má»›i (education/certificate/experience) â€” status = pending
// proof_url báº¯t buá»™c vá»›i education vĂ  certificate
app.post("/api/tutor/credentials", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { type, title, description, proof_url } = req.body || {};

    if (!type || !title) {
      return res.status(400).json({ message: "type and title are required." });
    }
    if (!["education", "certificate", "experience"].includes(type)) {
      return res.status(400).json({ message: "Invalid credential type." });
    }
    if (type !== "experience" && !proof_url) {
      return res.status(400).json({ message: "proof_url (image/file) is required for education and certificate." });
    }

    // Láº¥y tutor_profile id
    const profile = await ensureTutorProfile(userId);

    const result = await pool.query(
      `INSERT INTO tutor_credentials (tutor_id, type, title, description, proof_url, status)
       VALUES ($1, $2, $3, $4, $5, 'approved')
       RETURNING *`,
      [profile.id, type, title.trim(), description?.trim() || null, proof_url?.trim() || null]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Add credential error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

// â”€â”€â”€ DELETE /api/tutor/credentials/:id â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// XoĂ¡ 1 credential (chá»‰ Ä‘Æ°á»£c xoĂ¡ náº¿u chÆ°a approved)
app.delete("/api/tutor/credentials/:id", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    // Kiá»ƒm tra ownership
    const result = await pool.query(
      `DELETE FROM tutor_credentials tc
       USING tutor_profiles tp
       WHERE tc.id = $1 AND tp.id = tc.tutor_id AND tp.user_id = $2
       RETURNING tc.id`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Credential not found or not authorized." });
    }

    return res.json({ message: "Deleted successfully." });
  } catch (error) {
    console.error("Delete credential error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

// â”€â”€â”€ PUT /api/tutor/availability â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Cáº­p nháº­t toĂ n bá»™ lá»‹ch ráº£nh (replace all) â€” khĂ´ng cáº§n duyá»‡t
app.put("/api/tutor/availability", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { availability } = req.body || {};
    // availability = { Monday: ['09:00 AM', '10:30 AM'], Tuesday: [...], ... }

    if (!availability || typeof availability !== "object") {
      return res.status(400).json({ message: "availability object is required." });
    }

    const profile = await ensureTutorProfile(userId);
    const tutorId = profile.id;

    // XoĂ¡ táº¥t cáº£ slot cÅ© rá»“i insert láº¡i
    await pool.query("DELETE FROM tutor_availability WHERE tutor_id = $1", [tutorId]);

    const validDays = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
    const inserts = [];
    for (const day of validDays) {
      const slots = availability[day] || [];
      for (const slot of slots) {
        if (typeof slot === "string" && slot.trim()) {
          inserts.push({ day, slot: slot.trim() });
        }
      }
    }

    if (inserts.length > 0) {
      const values = inserts.map((_, i) => `($1, $${i * 2 + 2}, $${i * 2 + 3})`).join(", ");
      const params = [tutorId, ...inserts.flatMap(r => [r.day, r.slot])];
      await pool.query(
        `INSERT INTO tutor_availability (tutor_id, day_of_week, time_slot) VALUES ${values}
         ON CONFLICT DO NOTHING`,
        params
      );
    }

    return res.json({ message: "Availability updated.", slots: inserts.length });
  } catch (error) {
    console.error("Update availability error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// â”€â”€ ADMIN: duyá»‡t credentials + bio â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// â”€â”€â”€ GET /api/admin/credentials/pending â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Láº¥y táº¥t cáº£ credentials Ä‘ang chá» duyá»‡t
app.get("/api/admin/credentials/pending", verifyToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT tc.*, u.full_name, u.email
      FROM tutor_credentials tc
      JOIN tutor_profiles tp ON tp.id = tc.tutor_id
      JOIN users u ON u.id = tp.user_id
      WHERE tc.status = 'pending'
      ORDER BY tc.created_at ASC
    `);
    return res.json(result.rows);
  } catch (error) {
    console.error("Get pending credentials error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

// â”€â”€â”€ PATCH /api/admin/credentials/:id/approve â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.patch("/api/admin/credentials/:id/approve", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE tutor_credentials SET status = 'approved', reject_reason = NULL, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Not found." });
    return res.json(result.rows[0]);
  } catch (error) {
    console.error("Approve credential error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

// â”€â”€â”€ PATCH /api/admin/credentials/:id/reject â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.patch("/api/admin/credentials/:id/reject", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};
    if (!reason?.trim()) return res.status(400).json({ message: "Reason is required." });
    const result = await pool.query(
      `UPDATE tutor_credentials SET status = 'rejected', reject_reason = $1, updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [reason.trim(), id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Not found." });
    return res.json(result.rows[0]);
  } catch (error) {
    console.error("Reject credential error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

// â”€â”€â”€ GET /api/admin/bio/pending â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Láº¥y táº¥t cáº£ bio Ä‘ang chá» duyá»‡t
app.get("/api/admin/bio/pending", verifyToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT tp.id, tp.bio, tp.bio_pending, tp.bio_status, u.full_name, u.email, u.picture
      FROM tutor_profiles tp
      JOIN users u ON u.id = tp.user_id
      WHERE tp.bio_status = 'pending'
      ORDER BY tp.updated_at ASC
    `);
    return res.json(result.rows);
  } catch (error) {
    console.error("Get pending bio error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

// â”€â”€â”€ PATCH /api/admin/bio/:id/approve â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.patch("/api/admin/bio/:id/approve", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE tutor_profiles
       SET bio = bio_pending, bio_pending = NULL, bio_status = 'approved', updated_at = NOW()
       WHERE id = $1 RETURNING id, bio, bio_status`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Not found." });
    return res.json(result.rows[0]);
  } catch (error) {
    console.error("Approve bio error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

// â”€â”€â”€ PATCH /api/admin/bio/:id/reject â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.patch("/api/admin/bio/:id/reject", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE tutor_profiles
       SET bio_pending = NULL, bio_status = 'rejected', updated_at = NOW()
       WHERE id = $1 RETURNING id, bio, bio_status`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Not found." });
    return res.json(result.rows[0]);
  } catch (error) {
    console.error("Reject bio error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

app.get("/api/tutors/:id/review-eligibility", verifyToken, async (req, res) => {
  try {
    await ensureTutorReviewSchema();
    const { id } = req.params;
    const studentId = req.user.userId;

    const tutorResult = await pool.query(
      `SELECT u.id AS user_id
       FROM tutor_profiles tp
       JOIN users u ON u.id = tp.user_id
       WHERE (tp.id::text = $1 OR u.id::text = $1)
         AND u.role = 'tutor'
         AND tp.status = 'approved'
       LIMIT 1`,
      [id]
    );

    if (tutorResult.rows.length === 0) {
      return res.status(404).json({ message: "Tutor not found." });
    }

    const tutorId = tutorResult.rows[0].user_id;
    const result = await pool.query(
      `SELECT
         b.id,
         to_char(b.lesson_date, 'YYYY-MM-DD') AS date,
         b.time_slot AS "timeSlot",
         b.subject
       FROM bookings b
       JOIN attendance a ON a.booking_id = b.id
       LEFT JOIN tutor_reviews r ON r.booking_id = b.id
       WHERE b.tutor_id = $1
         AND b.student_id = $2
         AND b.booking_type = 'trial'
         AND b.status = 'Approved'
         AND a.status = 'present'
         AND r.id IS NULL
       ORDER BY b.lesson_date DESC, b.time_slot DESC
       LIMIT 1`,
      [tutorId, studentId]
    );

    return res.json({
      canReview: result.rows.length > 0,
      booking: result.rows[0] || null,
    });
  } catch (error) {
    console.error("Review eligibility error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

app.post("/api/tutors/:id/reviews", verifyToken, async (req, res) => {
  try {
    await ensureTutorReviewSchema();
    const { id } = req.params;
    const studentId = req.user.userId;
    const { bookingId, rating, comment } = req.body || {};
    const cleanRating = Number(rating);
    const cleanComment = String(comment || "").trim();

    if (!bookingId || !Number.isInteger(cleanRating) || cleanRating < 1 || cleanRating > 5 || !cleanComment) {
      return res.status(400).json({ message: "Booking, rating from 1 to 5, and comment are required." });
    }

    const tutorResult = await pool.query(
      `SELECT u.id AS user_id
       FROM tutor_profiles tp
       JOIN users u ON u.id = tp.user_id
       WHERE (tp.id::text = $1 OR u.id::text = $1)
         AND u.role = 'tutor'
         AND tp.status = 'approved'
       LIMIT 1`,
      [id]
    );

    if (tutorResult.rows.length === 0) {
      return res.status(404).json({ message: "Tutor not found." });
    }

    const tutorId = tutorResult.rows[0].user_id;
    const eligibleResult = await pool.query(
      `SELECT b.id
       FROM bookings b
       JOIN attendance a ON a.booking_id = b.id
       WHERE b.id = $1
         AND b.tutor_id = $2
         AND b.student_id = $3
         AND b.booking_type = 'trial'
         AND b.status = 'Approved'
         AND a.status = 'present'
       LIMIT 1`,
      [bookingId, tutorId, studentId]
    );

    if (eligibleResult.rows.length === 0) {
      return res.status(403).json({ message: "Only students who attended a trial class can review this tutor." });
    }

    const result = await pool.query(
      `INSERT INTO tutor_reviews (tutor_id, student_id, booking_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, rating, comment, to_char(created_at, 'YYYY-MM-DD') AS date`,
      [tutorId, studentId, bookingId, cleanRating, cleanComment]
    );

    return res.status(201).json({
      ...result.rows[0],
      studentName: req.user.name || req.user.email?.split("@")[0] || "Student",
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ message: "This trial class has already been reviewed." });
    }
    console.error("Create tutor review error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// â”€â”€ CHAT APIs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// â”€â”€â”€ GET /api/conversations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Láº¥y danh sĂ¡ch conversations cá»§a user hiá»‡n táº¡i (kĂ¨m tin nháº¯n cuá»‘i + unread count)
// BOOKINGS APIs
// COURSE APIs
app.get("/api/tutor/courses", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "tutor") return res.status(403).json({ message: "Tutor access only." });
    await ensureCourseSchema();
    const courses = await pool.query(
      `SELECT c.*,
              COUNT(DISTINCT l.id)::int AS "lessonCount",
              COUNT(DISTINCT e.id)::int AS "enrollmentCount",
              COALESCE(COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'active') * c.price, 0)::int AS revenue
       FROM courses c
       LEFT JOIN course_lessons l ON l.course_id = c.id
       LEFT JOIN course_enrollments e ON e.course_id = c.id
       WHERE c.tutor_id = $1
       GROUP BY c.id
       ORDER BY c.updated_at DESC, c.created_at DESC`,
      [req.user.userId]
    );
    const ids = courses.rows.map((course) => course.id);
    const lessons = ids.length
      ? await pool.query(
          `SELECT *
           FROM course_lessons
           WHERE course_id = ANY($1::uuid[])
           ORDER BY course_id, position ASC, created_at ASC`,
          [ids]
        )
      : { rows: [] };
    const lessonMap = lessons.rows.reduce((map, lesson) => {
      if (!map[lesson.course_id]) map[lesson.course_id] = [];
      map[lesson.course_id].push({
        id: lesson.id,
        title: lesson.title,
        description: lesson.description || "",
        videoUrl: lesson.video_url || "",
        materialUrl: lesson.material_url || "",
        durationLabel: lesson.duration_label || "",
        isPreview: lesson.is_preview,
        position: lesson.position,
      });
      return map;
    }, {});

    return res.json(courses.rows.map((course) => ({
      id: course.id,
      title: course.title,
      description: course.description || "",
      subject: course.subject || "",
      level: course.level || "",
      price: course.price || 0,
      thumbnailUrl: course.thumbnail_url || "",
      learningOutcomes: Array.isArray(course.learning_outcomes) ? course.learning_outcomes : [],
      requirements: Array.isArray(course.requirements) ? course.requirements : [],
      status: course.status,
      lessonCount: course.lessonCount,
      enrollmentCount: course.enrollmentCount,
      revenue: course.revenue || 0,
      lessons: lessonMap[course.id] || [],
      createdAt: course.created_at,
      updatedAt: course.updated_at,
    })));
  } catch (error) {
    console.error("Get tutor courses error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

async function saveCourseLessons(client, courseId, lessons = []) {
  await client.query("DELETE FROM course_lessons WHERE course_id = $1", [courseId]);
  const cleanLessons = Array.isArray(lessons)
    ? lessons
        .map((lesson, index) => ({
          title: String(lesson.title || "").trim(),
          description: String(lesson.description || "").trim(),
          videoUrl: String(lesson.videoUrl || lesson.video_url || "").trim(),
          materialUrl: String(lesson.materialUrl || lesson.material_url || "").trim(),
          durationLabel: String(lesson.durationLabel || lesson.duration_label || "").trim(),
          isPreview: Boolean(lesson.isPreview || lesson.is_preview),
          position: Number(lesson.position || index + 1),
        }))
        .filter((lesson) => lesson.title)
    : [];

  for (const lesson of cleanLessons) {
    await client.query(
      `INSERT INTO course_lessons
         (course_id, title, description, video_url, material_url, duration_label, is_preview, position)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [courseId, lesson.title, lesson.description || null, lesson.videoUrl || null, lesson.materialUrl || null, lesson.durationLabel || null, lesson.isPreview, lesson.position]
    );
  }
}

async function upsertTutorCourse(req, res, courseId = null) {
  if (req.user.role !== "tutor") return res.status(403).json({ message: "Tutor access only." });
  await ensureCourseSchema();
  const { title, description, subject, level, price, thumbnailUrl, status, lessons, learningOutcomes, requirements } = req.body || {};
  const cleanTitle = String(title || "").trim();
  const cleanStatus = ["draft", "pending_review", "published", "rejected", "archived"].includes(status) ? status : "draft";
  const cleanLessons = Array.isArray(lessons) ? lessons.filter((lesson) => String(lesson.title || "").trim()) : [];
  const cleanOutcomes = Array.isArray(learningOutcomes) ? learningOutcomes.map((item) => String(item || "").trim()).filter(Boolean) : [];
  const cleanRequirements = Array.isArray(requirements) ? requirements.map((item) => String(item || "").trim()).filter(Boolean) : [];
  if (!cleanTitle) return res.status(400).json({ message: "Course title is required." });
  if (cleanStatus === "published" && cleanLessons.length === 0) {
    return res.status(400).json({ message: "Add at least one lesson before publishing." });
  }

  if (courseId) {
    const owner = await pool.query("SELECT id FROM courses WHERE id = $1 AND tutor_id = $2", [courseId, req.user.userId]);
    if (owner.rows.length === 0) return res.status(404).json({ message: "Course not found." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    let id = courseId;
    if (id) {
      await client.query(
        `UPDATE courses
         SET title = $1, description = $2, subject = $3, level = $4, price = $5,
             thumbnail_url = $6, status = $7, learning_outcomes = $8, requirements = $9, updated_at = NOW()
         WHERE id = $10 AND tutor_id = $11`,
        [cleanTitle, String(description || "").trim() || null, String(subject || "").trim() || null, String(level || "").trim() || null, Math.max(Number(price || 0), 0), String(thumbnailUrl || "").trim() || null, cleanStatus, JSON.stringify(cleanOutcomes), JSON.stringify(cleanRequirements), id, req.user.userId]
      );
    } else {
      const created = await client.query(
        `INSERT INTO courses (tutor_id, title, description, subject, level, price, thumbnail_url, status, learning_outcomes, requirements)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id`,
        [req.user.userId, cleanTitle, String(description || "").trim() || null, String(subject || "").trim() || null, String(level || "").trim() || null, Math.max(Number(price || 0), 0), String(thumbnailUrl || "").trim() || null, cleanStatus, JSON.stringify(cleanOutcomes), JSON.stringify(cleanRequirements)]
      );
      id = created.rows[0].id;
    }
    await saveCourseLessons(client, id, cleanLessons);
    await client.query("COMMIT");
    return res.status(courseId ? 200 : 201).json({ message: "Course saved.", id });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

app.post("/api/tutor/courses", verifyToken, async (req, res) => {
  try {
    return await upsertTutorCourse(req, res);
  } catch (error) {
    console.error("Create course error:", error);
    return res.status(500).json({ message: error.message || "Server error." });
  }
});

app.patch("/api/tutor/courses/:id", verifyToken, async (req, res) => {
  try {
    return await upsertTutorCourse(req, res, req.params.id);
  } catch (error) {
    console.error("Update course error:", error);
    return res.status(500).json({ message: error.message || "Server error." });
  }
});

app.delete("/api/tutor/courses/:id", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "tutor") return res.status(403).json({ message: "Tutor access only." });
    await ensureCourseSchema();
    const result = await pool.query(
      "UPDATE courses SET status = 'archived', updated_at = NOW() WHERE id = $1 AND tutor_id = $2 RETURNING id",
      [req.params.id, req.user.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Course not found." });
    return res.json({ message: "Course archived." });
  } catch (error) {
    console.error("Archive course error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

app.get("/api/courses", optionalToken, async (req, res) => {
  try {
    await ensureCourseSchema();
    const q = String(req.query.q || "").trim();
    const subject = String(req.query.subject || "").trim();
    const params = [];
    const where = ["c.status = 'published'"];

    if (q) {
      params.push(`%${q}%`);
      where.push(`(
        c.title ILIKE $${params.length}
        OR c.description ILIKE $${params.length}
        OR c.subject ILIKE $${params.length}
        OR c.level ILIKE $${params.length}
        OR u.full_name ILIKE $${params.length}
      )`);
    }

    if (subject) {
      params.push(`%${subject}%`);
      where.push(`c.subject ILIKE $${params.length}`);
    }

    const result = await pool.query(
      `SELECT c.id,
              c.title,
              c.description,
              c.subject,
              c.level,
              c.price,
              c.thumbnail_url AS "thumbnailUrl",
              c.learning_outcomes AS "learningOutcomes",
              c.requirements,
              c.created_at AS "createdAt",
              c.updated_at AS "updatedAt",
              u.id AS "tutorId",
              u.full_name AS "tutorName",
              u.picture AS "tutorAvatar",
              COALESCE(tp.status = 'approved', false) AS "tutorVerified",
              COALESCE(tp.status = 'approved' AND COALESCE(tp.approved_at, tp.updated_at, tp.created_at) >= NOW() - INTERVAL '30 days', false) AS "isNewTutor",
              COUNT(DISTINCT l.id)::int AS "lessonCount",
              COUNT(DISTINCT l.id) FILTER (WHERE l.is_preview = true)::int AS "previewLessonCount",
              COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'active')::int AS "studentsBought",
              COALESCE(COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'active') * c.price, 0)::int AS revenue
       FROM courses c
       JOIN users u ON u.id = c.tutor_id
       LEFT JOIN tutor_profiles tp ON tp.user_id = u.id
       LEFT JOIN course_lessons l ON l.course_id = c.id
       LEFT JOIN course_enrollments e ON e.course_id = c.id
       WHERE ${where.join(" AND ")}
       GROUP BY c.id, u.id, tp.id
       ORDER BY c.updated_at DESC, c.created_at DESC
       LIMIT 60`,
      params
    );

    return res.json(result.rows.map((course) => ({
      ...course,
      price: course.price || 0,
      description: course.description || "",
      subject: course.subject || "",
      level: course.level || "",
      thumbnailUrl: course.thumbnailUrl || "",
      learningOutcomes: Array.isArray(course.learningOutcomes) ? course.learningOutcomes : [],
      requirements: Array.isArray(course.requirements) ? course.requirements : [],
      rating: 4.8,
    })));
  } catch (error) {
    console.error("Get public courses error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

app.get("/api/courses/:id", optionalToken, async (req, res) => {
  try {
    await ensureCourseSchema();
    const courseResult = await pool.query(
      `SELECT c.*,
              u.full_name AS "tutorName",
              u.picture AS "tutorAvatar",
              COALESCE(tp.approved_at >= NOW() - INTERVAL '30 days', false) AS "isNewTutor"
       FROM courses c
       JOIN users u ON u.id = c.tutor_id
       LEFT JOIN tutor_profiles tp ON tp.user_id = u.id
       WHERE c.id = $1 AND c.status <> 'archived'
       LIMIT 1`,
      [req.params.id]
    );
    if (courseResult.rows.length === 0) return res.status(404).json({ message: "Course not found." });

    const course = courseResult.rows[0];
    const isOwner = req.user?.userId === course.tutor_id;
    if (course.status !== "published" && !isOwner) {
      return res.status(404).json({ message: "Course not found." });
    }
    let enrollment = null;
    if (req.user?.userId && !isOwner) {
      const enrollmentResult = await pool.query(
        "SELECT * FROM course_enrollments WHERE course_id = $1 AND student_id = $2 AND status = 'active' LIMIT 1",
        [course.id, req.user.userId]
      );
      enrollment = enrollmentResult.rows[0] || null;
    }
    const canAccess = isOwner || Boolean(enrollment);
    const lessonResult = await pool.query(
      `SELECT l.*, cp.is_completed, cp.watched_seconds
       FROM course_lessons l
       LEFT JOIN course_progress cp ON cp.lesson_id = l.id AND cp.enrollment_id = $2
       WHERE l.course_id = $1
       ORDER BY l.position ASC, l.created_at ASC`,
      [course.id, enrollment?.id || null]
    );

    return res.json({
      id: course.id,
      tutorId: course.tutor_id,
      tutorName: course.tutorName,
      tutorAvatar: course.tutorAvatar || "",
      title: course.title,
      description: course.description || "",
      subject: course.subject || "",
      level: course.level || "",
      price: course.price || 0,
      thumbnailUrl: course.thumbnail_url || "",
      learningOutcomes: Array.isArray(course.learning_outcomes) ? course.learning_outcomes : [],
      requirements: Array.isArray(course.requirements) ? course.requirements : [],
      status: course.status,
      isNewTutor: course.isNewTutor,
      isOwner,
      isEnrolled: canAccess,
      enrollmentId: enrollment?.id || null,
      lessons: lessonResult.rows.map((lesson) => {
        const lessonAccessible = canAccess || lesson.is_preview;
        return {
          id: lesson.id,
          title: lesson.title,
          description: lesson.description || "",
          videoUrl: lessonAccessible ? (lesson.video_url || "") : "",
          materialUrl: lessonAccessible ? (lesson.material_url || "") : "",
          durationLabel: lesson.duration_label || "",
          isPreview: lesson.is_preview,
          isLocked: !lessonAccessible,
          isCompleted: Boolean(lesson.is_completed),
          watchedSeconds: lesson.watched_seconds || 0,
          position: lesson.position,
        };
      }),
    });
  } catch (error) {
    console.error("Get course detail error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

app.post("/api/courses/:id/enroll", verifyToken, async (req, res) => {
  try {
    if (req.user.role === "tutor" || req.user.role === "admin") {
      return res.status(403).json({ message: "Only students or parents can buy courses." });
    }
    await ensureCourseSchema();
    const course = await pool.query("SELECT id FROM courses WHERE id = $1 AND status = 'published' LIMIT 1", [req.params.id]);
    if (course.rows.length === 0) return res.status(404).json({ message: "Course not found or not published." });
    const { childName, studentName } = req.body || {};
    const userResult = await pool.query("SELECT full_name FROM users WHERE id = $1", [req.user.userId]);
    const finalStudentName = String(studentName || userResult.rows[0]?.full_name || req.user.email?.split("@")[0] || "Student").trim();
    const result = await pool.query(
      `INSERT INTO course_enrollments (course_id, student_id, student_name, child_name, status)
       VALUES ($1, $2, $3, $4, 'active')
       ON CONFLICT (course_id, student_id)
       DO UPDATE SET status = 'active', child_name = EXCLUDED.child_name, updated_at = NOW()
       RETURNING *`,
      [req.params.id, req.user.userId, finalStudentName, String(childName || "").trim() || null]
    );
    return res.status(201).json({ message: "Course purchased.", enrollment: result.rows[0] });
  } catch (error) {
    console.error("Enroll course error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

app.get("/api/my/courses", verifyToken, async (req, res) => {
  try {
    await ensureCourseSchema();
    const result = await pool.query(
      `SELECT e.id AS "enrollmentId",
              e.purchased_at AS "purchasedAt",
              c.id, c.title, c.subject, c.level, c.price,
              c.thumbnail_url AS "thumbnailUrl",
              u.full_name AS "tutorName",
              COUNT(l.id)::int AS "lessonCount",
              COUNT(cp.id) FILTER (WHERE cp.is_completed)::int AS "completedLessons"
       FROM course_enrollments e
       JOIN courses c ON c.id = e.course_id
       JOIN users u ON u.id = c.tutor_id
       LEFT JOIN course_lessons l ON l.course_id = c.id
       LEFT JOIN course_progress cp ON cp.enrollment_id = e.id AND cp.lesson_id = l.id
       WHERE e.student_id = $1 AND e.status = 'active'
       GROUP BY e.id, c.id, u.id
       ORDER BY e.purchased_at DESC`,
      [req.user.userId]
    );
    return res.json(result.rows);
  } catch (error) {
    console.error("Get my courses error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

app.patch("/api/courses/:courseId/lessons/:lessonId/progress", verifyToken, async (req, res) => {
  try {
    await ensureCourseSchema();
    const { courseId, lessonId } = req.params;
    const { watchedSeconds, isCompleted } = req.body || {};
    const enrollmentResult = await pool.query(
      `SELECT id FROM course_enrollments
       WHERE course_id = $1 AND student_id = $2 AND status = 'active'
       LIMIT 1`,
      [courseId, req.user.userId]
    );
    if (enrollmentResult.rows.length === 0) {
      return res.status(403).json({ message: "Buy this course before tracking progress." });
    }
    const lessonResult = await pool.query("SELECT id FROM course_lessons WHERE id = $1 AND course_id = $2", [lessonId, courseId]);
    if (lessonResult.rows.length === 0) return res.status(404).json({ message: "Lesson not found." });
    const result = await pool.query(
      `INSERT INTO course_progress (enrollment_id, lesson_id, watched_seconds, is_completed, completed_at, updated_at)
       VALUES ($1, $2, $3, $4, CASE WHEN $4 THEN NOW() ELSE NULL END, NOW())
       ON CONFLICT (enrollment_id, lesson_id)
       DO UPDATE SET watched_seconds = GREATEST(course_progress.watched_seconds, EXCLUDED.watched_seconds),
                     is_completed = EXCLUDED.is_completed,
                     completed_at = CASE WHEN EXCLUDED.is_completed THEN COALESCE(course_progress.completed_at, NOW()) ELSE NULL END,
                     updated_at = NOW()
       RETURNING *`,
      [enrollmentResult.rows[0].id, lessonId, Math.max(Number(watchedSeconds || 0), 0), Boolean(isCompleted)]
    );
    return res.json(result.rows[0]);
  } catch (error) {
    console.error("Update course progress error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

app.get("/api/bookings", verifyToken, async (req, res) => {
  try {
    await ensureBookingSchema();
    const userId = req.user.userId;
    const role = req.user.role;
    const filter = role === "tutor" ? "b.tutor_id = $1" : "b.student_id = $1";

    const result = await pool.query(
      `SELECT
         b.id,
         b.student_id AS "studentId",
         COALESCE(b.student_name, s.full_name) AS "studentName",
         b.child_name AS "childName",
         b.tutor_id AS "tutorId",
         COALESCE(t.full_name, b.tutor_name) AS "tutorName",
         t.picture AS "tutorAvatar",
         b.subject,
         to_char(b.lesson_date, 'YYYY-MM-DD') AS date,
         b.time_slot AS "timeSlot",
         b.note AS notes,
         b.booking_type AS "bookingType",
         b.status,
         a.status AS "attendanceStatus",
         a.note AS "attendanceNote",
         a.marked_at AS "attendanceMarkedAt",
         b.created_at AS "createdAt"
       FROM bookings b
       LEFT JOIN users s ON s.id = b.student_id
       LEFT JOIN users t ON t.id = b.tutor_id
       LEFT JOIN attendance a ON a.booking_id = b.id
       WHERE ${filter}
       ORDER BY b.lesson_date ASC, b.time_slot ASC, b.created_at DESC`,
      [userId]
    );

    return res.json(result.rows);
  } catch (error) {
    console.error("Get bookings error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

app.post("/api/bookings", verifyToken, async (req, res) => {
  try {
    await ensureBookingSchema();
    const userId = req.user.userId;
    const { tutorId, date, timeSlot, sessions, subject, notes, childName, studentName, bookingType } = req.body || {};
    const normalizedBookingType = bookingType === "trial" ? "trial" : "regular";

    const requestedSessions = Array.isArray(sessions) && sessions.length > 0
      ? sessions
      : [{ date, timeSlot }];
    const cleanSessions = [];
    const seenSessions = new Set();

    for (const session of requestedSessions) {
      const sessionDate = String(session?.date || "").trim();
      const sessionTime = String(session?.timeSlot || "").trim();
      const key = `${sessionDate}|${sessionTime}`;
      if (!sessionDate || !sessionTime || seenSessions.has(key)) continue;
      seenSessions.add(key);
      cleanSessions.push({ date: sessionDate, timeSlot: sessionTime });
    }

    if (!tutorId || cleanSessions.length === 0) {
      return res.status(400).json({ message: "Tutor, date, and time slot are required." });
    }

    if (normalizedBookingType === "trial" && cleanSessions.length > 1) {
      return res.status(400).json({ message: "A trial class can only include one session." });
    }

    const tutorResult = await pool.query(
      `SELECT
         u.id,
         u.full_name,
         u.picture,
         tp.id AS profile_id,
         COALESCE(tp.approved_at >= NOW() - INTERVAL '30 days', false) AS is_new_tutor
       FROM users u
       LEFT JOIN tutor_profiles tp ON tp.user_id = u.id
       WHERE (u.id::text = $1 OR tp.id::text = $1)
         AND u.role = 'tutor'
         AND COALESCE(tp.status = 'approved', true)
       LIMIT 1`,
      [String(tutorId)]
    );

    if (tutorResult.rows.length === 0) {
      return res.status(404).json({ message: "Tutor not found." });
    }

    const tutor = tutorResult.rows[0];
    if (!tutor.profile_id) {
      return res.status(400).json({ message: "This tutor has not completed an approved teaching profile yet." });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const availabilityResult = await pool.query(
      `SELECT day_of_week, time_slot
       FROM tutor_availability
       WHERE tutor_id = $1`,
      [tutor.profile_id]
    );
    const availableSlotSet = new Set(
      availabilityResult.rows.map((row) => `${row.day_of_week}|${row.time_slot}`)
    );

    for (const session of cleanSessions) {
      const sessionDate = new Date(`${session.date}T00:00:00`);
      if (Number.isNaN(sessionDate.getTime())) {
        return res.status(400).json({ message: "Invalid lesson date." });
      }
      if (sessionDate < today) {
        return res.status(400).json({ message: "Cannot book a past date." });
      }
      const dayName = dayNames[sessionDate.getDay()];
      if (!availableSlotSet.has(`${dayName}|${session.timeSlot}`)) {
        return res.status(400).json({ message: `The tutor is not available on ${session.date} at ${session.timeSlot}.` });
      }
    }

    if (normalizedBookingType === "trial" && !tutor.is_new_tutor) {
      return res.status(400).json({ message: "Trial classes are only available for new tutors." });
    }

    if (normalizedBookingType === "trial") {
      const existingTrial = await pool.query(
        `SELECT id
         FROM bookings
         WHERE tutor_id = $1
           AND student_id = $2
           AND booking_type = 'trial'
           AND status IN ('Pending', 'Approved')
         LIMIT 1`,
        [tutor.id, userId]
      );
      if (existingTrial.rows.length > 0) {
        return res.status(409).json({ message: "You already have an active trial class request with this tutor." });
      }
    }

    const studentResult = await pool.query("SELECT full_name FROM users WHERE id = $1", [userId]);
    const finalStudentName =
      studentName?.trim() ||
      studentResult.rows[0]?.full_name ||
      req.user.email?.split("@")[0] ||
      "Student";

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      for (const session of cleanSessions) {
        const existingSlot = await client.query(
          `SELECT id, status
           FROM bookings
           WHERE tutor_id = $1
             AND lesson_date = $2
             AND time_slot = $3
             AND status IN ('Pending', 'Approved')
           LIMIT 1`,
          [tutor.id, session.date, session.timeSlot]
        );

        if (existingSlot.rows.length > 0) {
          await client.query("ROLLBACK");
          return res.status(409).json({
            message: `The slot ${session.date} at ${session.timeSlot} has already been booked. Please choose another slot.`,
          });
        }
      }

      const createdBookings = [];
      for (const session of cleanSessions) {
        const result = await client.query(
          `INSERT INTO bookings
             (student_id, tutor_id, tutor_name, subject, lesson_date, time_slot, note, booking_type, status, child_name, student_name)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Pending', $9, $10)
           RETURNING id, student_id AS "studentId", tutor_id AS "tutorId",
                     tutor_name AS "tutorName", subject, to_char(lesson_date, 'YYYY-MM-DD') AS date,
                     time_slot AS "timeSlot", note AS notes, booking_type AS "bookingType", status,
                     child_name AS "childName", student_name AS "studentName",
                     created_at AS "createdAt"`,
          [
            userId,
            tutor.id,
            tutor.full_name,
            subject?.trim() || "General",
            session.date,
            session.timeSlot,
            notes?.trim() || null,
            normalizedBookingType,
            childName?.trim() || null,
            finalStudentName,
          ]
        );
        createdBookings.push({
          ...result.rows[0],
          tutorAvatar: tutor.picture || "",
        });
      }

      await client.query("COMMIT");

      return res.status(201).json({
        ...createdBookings[0],
        bookings: createdBookings,
        count: createdBookings.length,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ message: "This time slot has already been booked. Please choose another slot." });
    }
    console.error("Create booking error:", error);
    return res.status(500).json({ message: error.message || "Server error." });
  }
});

app.patch("/api/bookings/:id", verifyToken, async (req, res) => {
  try {
    await ensureBookingSchema();
    const userId = req.user.userId;
    const { id } = req.params;
    const { status } = req.body || {};
    const valid = ["Pending", "Approved", "Declined"];

    if (!valid.includes(status)) {
      return res.status(400).json({ message: "Invalid booking status." });
    }

    const result = await pool.query(
      `UPDATE bookings
       SET status = $1, updated_at = NOW()
       WHERE id = $2 AND tutor_id = $3
       RETURNING id, student_id AS "studentId", tutor_id AS "tutorId",
                 tutor_name AS "tutorName", subject, to_char(lesson_date, 'YYYY-MM-DD') AS date,
                 time_slot AS "timeSlot", note AS notes, booking_type AS "bookingType", status,
                 child_name AS "childName", student_name AS "studentName",
                 created_at AS "createdAt"`,
      [status, id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Booking not found or not authorized." });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error("Update booking error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});
// TUTOR STUDENT MANAGEMENT APIs
app.get("/api/tutor/students", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "tutor") {
      return res.status(403).json({ message: "Tutor access only." });
    }

    const tutorId = req.user.userId;
    const result = await pool.query(
      `SELECT
         b.id AS "bookingId",
         b.student_id AS "studentId",
         COALESCE(b.child_name, b.student_name, s.full_name, 'Student') AS "studentName",
         s.email AS "studentEmail",
         s.picture AS "studentAvatar",
         b.child_name AS "childName",
         b.subject,
         to_char(b.lesson_date, 'YYYY-MM-DD') AS date,
         b.time_slot AS "timeSlot",
         b.note AS notes,
         b.booking_type AS "bookingType",
         b.status AS "bookingStatus",
         a.status AS "attendanceStatus",
         a.note AS "attendanceNote",
         a.marked_at AS "markedAt"
       FROM bookings b
       LEFT JOIN users s ON s.id = b.student_id
       LEFT JOIN attendance a ON a.booking_id = b.id
       WHERE b.tutor_id = $1
         AND b.status IN ('Approved', 'Pending')
       ORDER BY b.lesson_date DESC, b.time_slot DESC`,
      [tutorId]
    );

    const grouped = new Map();
    for (const row of result.rows) {
      const key = `${row.studentId}:${row.childName || ''}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          studentId: row.studentId,
          studentName: row.studentName,
          studentEmail: row.studentEmail,
          studentAvatar: row.studentAvatar,
          childName: row.childName,
          subjects: new Set(),
          lessons: [],
        });
      }
      const student = grouped.get(key);
      if (row.subject) student.subjects.add(row.subject);
      student.lessons.push(row);
    }

    const students = Array.from(grouped.values()).map((student) => {
      const approvedLessons = student.lessons.filter((lesson) => lesson.bookingStatus === 'Approved');
      const marked = approvedLessons.filter((lesson) => lesson.attendanceStatus);
      const absences = approvedLessons.filter((lesson) => lesson.attendanceStatus === 'absent');
      const present = approvedLessons.filter((lesson) => lesson.attendanceStatus === 'present');
      const upcoming = approvedLessons
        .filter((lesson) => new Date(`${lesson.date}T00:00:00`) >= new Date(new Date().toDateString()))
        .sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.timeSlot).localeCompare(String(b.timeSlot)))[0] || null;

      return {
        ...student,
        subjects: Array.from(student.subjects),
        totalLessons: approvedLessons.length,
        pendingRequests: student.lessons.filter((lesson) => lesson.bookingStatus === 'Pending').length,
        markedLessons: marked.length,
        absentCount: absences.length,
        presentCount: present.length,
        attendanceRate: marked.length ? Math.round((present.length / marked.length) * 100) : null,
        nextLesson: upcoming,
      };
    });

    return res.json(students);
  } catch (error) {
    console.error("Get tutor students error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

app.patch("/api/bookings/:id/attendance", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "tutor") {
      return res.status(403).json({ message: "Tutor access only." });
    }

    const tutorId = req.user.userId;
    const { id } = req.params;
    const { status, note } = req.body || {};
    const allowed = ["present", "absent", "excused"];

    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid attendance status." });
    }

    const bookingResult = await pool.query(
      `SELECT id, tutor_id, student_id
       FROM bookings
       WHERE id = $1 AND tutor_id = $2 AND status = 'Approved'
       LIMIT 1`,
      [id, tutorId]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ message: "Approved booking not found." });
    }

    const booking = bookingResult.rows[0];
    const result = await pool.query(
      `INSERT INTO attendance (booking_id, tutor_id, student_id, status, note, marked_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (booking_id)
       DO UPDATE SET status = EXCLUDED.status,
                     note = EXCLUDED.note,
                     marked_at = NOW(),
                     updated_at = NOW()
       RETURNING id, booking_id AS "bookingId", status, note, marked_at AS "markedAt"`,
      [booking.id, booking.tutor_id, booking.student_id, status, note?.trim() || null]
    );

    return res.json(result.rows[0]);
  } catch (error) {
    console.error("Update attendance error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

app.get("/api/tutor/earnings", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "tutor") {
      return res.status(403).json({ message: "Tutor access only." });
    }

    const tutorId = req.user.userId;
    const profileResult = await pool.query(
      `SELECT hourly_rate
       FROM tutor_profiles
       WHERE user_id = $1
       LIMIT 1`,
      [tutorId]
    );

    const hourlyRate = Number(profileResult.rows[0]?.hourly_rate || 0);
    const lessonResult = await pool.query(
      `SELECT
         b.id,
         b.student_id AS "studentId",
         COALESCE(b.child_name, b.student_name, s.full_name, 'Student') AS "studentName",
         b.child_name AS "childName",
         b.subject,
         to_char(b.lesson_date, 'YYYY-MM-DD') AS date,
         b.time_slot AS "timeSlot",
         b.status AS "bookingStatus",
         a.status AS "attendanceStatus",
         a.note AS "attendanceNote",
         a.marked_at AS "markedAt"
       FROM bookings b
       LEFT JOIN users s ON s.id = b.student_id
       LEFT JOIN attendance a ON a.booking_id = b.id
       WHERE b.tutor_id = $1
         AND b.status = 'Approved'
       ORDER BY b.lesson_date DESC, b.time_slot DESC`,
      [tutorId]
    );

    const lessons = lessonResult.rows.map((lesson) => {
      const attendance = lesson.attendanceStatus || "awaiting_attendance";
      const isPayable = attendance === "present";
      const isPending = attendance === "awaiting_attendance";
      const amount = isPayable ? hourlyRate : 0;

      return {
        ...lesson,
        attendanceStatus: attendance,
        paymentStatus: isPayable ? "earned" : isPending ? "pending_attendance" : "no_charge",
        amount,
      };
    });

    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthOf = (value) => {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "";
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    };

    const earnedLessons = lessons.filter((lesson) => lesson.paymentStatus === "earned");
    const pendingLessons = lessons.filter((lesson) => lesson.paymentStatus === "pending_attendance");
    const noChargeLessons = lessons.filter((lesson) => lesson.paymentStatus === "no_charge");
    const monthLessons = earnedLessons.filter((lesson) => monthOf(lesson.date) === monthKey);

    const monthlyBreakdown = [];
    for (let i = 5; i >= 0; i -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const items = earnedLessons.filter((lesson) => monthOf(lesson.date) === key);
      monthlyBreakdown.push({
        month: key,
        label: date.toLocaleString("en-US", { month: "short" }),
        amount: items.reduce((sum, lesson) => sum + lesson.amount, 0),
        lessons: items.length,
      });
    }

    const totalEarned = earnedLessons.reduce((sum, lesson) => sum + lesson.amount, 0);
    const thisMonthEarned = monthLessons.reduce((sum, lesson) => sum + lesson.amount, 0);
    const pendingAmount = pendingLessons.length * hourlyRate;

    return res.json({
      hourlyRate,
      currency: "VND",
      summary: {
        thisMonthEarned,
        totalEarned,
        pendingAmount,
        completedLessons: earnedLessons.length,
        pendingLessons: pendingLessons.length,
        noChargeLessons: noChargeLessons.length,
      },
      monthlyBreakdown,
      transactions: lessons,
    });
  } catch (error) {
    console.error("Get tutor earnings error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});
app.get("/api/conversations", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await pool.query(`
      SELECT
        c.id,
        c.student_id,
        c.tutor_id,
        c.updated_at,
        -- ThĂ´ng tin student
        s.full_name  AS student_name,
        s.picture    AS student_picture,
        -- ThĂ´ng tin tutor
        t.full_name  AS tutor_name,
        t.picture    AS tutor_picture,
        -- Tin nháº¯n cuá»‘i
        last_msg.content      AS last_message,
        last_msg.created_at   AS last_message_at,
        last_msg.sender_id    AS last_sender_id,
        -- Sá»‘ tin chÆ°a Ä‘á»c
        (
          SELECT COUNT(*) FROM messages m2
          WHERE m2.conversation_id = c.id
            AND m2.receiver_id = $1
            AND m2.is_read = false
        ) AS unread_count
      FROM conversations c
      JOIN users s ON s.id = c.student_id
      JOIN users t ON t.id = c.tutor_id
      LEFT JOIN LATERAL (
        SELECT content, created_at, sender_id
        FROM messages
        WHERE conversation_id = c.id
        ORDER BY created_at DESC
        LIMIT 1
      ) last_msg ON true
      WHERE c.student_id = $1 OR c.tutor_id = $1
      ORDER BY COALESCE(last_msg.created_at, c.created_at) DESC
    `, [userId]);
    return res.json(result.rows);
  } catch (error) {
    console.error("Get conversations error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

// â”€â”€â”€ POST /api/conversations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Táº¡o hoáº·c láº¥y conversation giá»¯a student vĂ  tutor
app.post("/api/conversations", verifyToken, async (req, res) => {
  try {
    const { tutor_id } = req.body || {};
    const student_id   = req.user.userId;

    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Only students can start a tutor conversation." });
    }

    if (!tutor_id) {
      return res.status(400).json({ message: "tutor_id is required." });
    }

    if (tutor_id === student_id) {
      return res.status(400).json({ message: "Cannot create a conversation with yourself." });
    }

    const tutorCheck = await pool.query(
      "SELECT id FROM users WHERE id = $1 AND role = 'tutor'",
      [tutor_id]
    );
    if (tutorCheck.rows.length === 0) {
      return res.status(404).json({ message: "Tutor not found." });
    }

    // Upsert â€” táº¡o má»›i náº¿u chÆ°a cĂ³, tráº£ vá» existing náº¿u Ä‘Ă£ cĂ³
    const result = await pool.query(`
      INSERT INTO conversations (student_id, tutor_id)
      VALUES ($1, $2)
      ON CONFLICT (student_id, tutor_id) DO UPDATE SET updated_at = NOW()
      RETURNING *
    `, [student_id, tutor_id]);

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Create conversation error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

// â”€â”€â”€ GET /api/conversations/:id/messages â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Láº¥y tin nháº¯n cá»§a 1 conversation (chá»‰ participants má»›i Ä‘Æ°á»£c xem)
app.get("/api/conversations/:id/messages", verifyToken, async (req, res) => {
  try {
    const { id }  = req.params;
    const userId  = req.user.userId;

    // Kiá»ƒm tra user cĂ³ trong conversation khĂ´ng
    const check = await pool.query(
      "SELECT id FROM conversations WHERE id = $1 AND (student_id = $2 OR tutor_id = $2)",
      [id, userId]
    );
    if (check.rows.length === 0) {
      return res.status(403).json({ message: "Access denied." });
    }

    const result = await pool.query(`
      SELECT m.*, u.full_name AS sender_name, u.picture AS sender_picture
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      WHERE m.conversation_id = $1
      ORDER BY m.created_at ASC
    `, [id]);

    return res.json(result.rows);
  } catch (error) {
    console.error("Get messages error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

// â”€â”€â”€ POST /api/conversations/:id/messages â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Gá»­i tin nháº¯n má»›i
app.post("/api/conversations/:id/messages", verifyToken, async (req, res) => {
  try {
    const { id }     = req.params;
    const senderId   = req.user.userId;
    const { content } = req.body || {};

    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Message content cannot be empty." });
    }

    // Kiá»ƒm tra & láº¥y receiver_id
    const conv = await pool.query(
      "SELECT student_id, tutor_id FROM conversations WHERE id = $1 AND (student_id = $2 OR tutor_id = $2)",
      [id, senderId]
    );
    if (conv.rows.length === 0) {
      return res.status(403).json({ message: "Access denied." });
    }

    const { student_id, tutor_id } = conv.rows[0];
    const receiverId = senderId === student_id ? tutor_id : student_id;

    // Insert message
    const msgResult = await pool.query(`
      INSERT INTO messages (conversation_id, sender_id, receiver_id, content)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [id, senderId, receiverId, content.trim()]);

    // Update conversation updated_at
    await pool.query(
      "UPDATE conversations SET updated_at = NOW() WHERE id = $1",
      [id]
    );

    // KĂ¨m sender info
    const senderResult = await pool.query(
      "SELECT full_name, picture FROM users WHERE id = $1",
      [senderId]
    );
    const sender = senderResult.rows[0] || {};

    return res.status(201).json({
      ...msgResult.rows[0],
      sender_name:    sender.full_name,
      sender_picture: sender.picture,
    });
  } catch (error) {
    console.error("Send message error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

// â”€â”€â”€ PATCH /api/conversations/:id/read â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ÄĂ¡nh dáº¥u táº¥t cáº£ tin nháº¯n lĂ  Ä‘Ă£ Ä‘á»c
app.patch("/api/conversations/:id/read", verifyToken, async (req, res) => {
  try {
    const { id }  = req.params;
    const userId  = req.user.userId;

    const check = await pool.query(
      "SELECT id FROM conversations WHERE id = $1 AND (student_id = $2 OR tutor_id = $2)",
      [id, userId]
    );
    if (check.rows.length === 0) {
      return res.status(403).json({ message: "Access denied." });
    }

    await pool.query(
      "UPDATE messages SET is_read = true WHERE conversation_id = $1 AND receiver_id = $2 AND is_read = false",
      [id, userId]
    );

    return res.json({ message: "Marked as read." });
  } catch (error) {
    console.error("Mark read error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

// â”€â”€â”€ GET /api/messages/unread-count â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Láº¥y tá»•ng sá»‘ tin nháº¯n chÆ°a Ä‘á»c cá»§a user
app.get("/api/messages/unread-count", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await pool.query(
      "SELECT COUNT(*) AS count FROM messages WHERE receiver_id = $1 AND is_read = false",
      [userId]
    );
    return res.json({ count: Number(result.rows[0].count) });
  } catch (error) {
    console.error("Unread count error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

// â”€â”€â”€ Start server â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ensureBookingSchema()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to prepare database schema:", error);
    process.exit(1);
  });

