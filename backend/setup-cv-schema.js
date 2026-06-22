const dotenv = require("dotenv");
const { Pool } = require("pg");

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const statements = [
    "ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS headline TEXT",
    "ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS phone TEXT",
    "ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS location TEXT",
    "ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS teaching_style TEXT",
    "ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS demo_video_url TEXT",
    "ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS hourly_rate INT DEFAULT 0",
    "ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS bio_status TEXT DEFAULT 'approved'",
    "ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS bio_pending TEXT",
  ];

  for (const sql of statements) {
    await pool.query(sql);
  }

  const result = await pool.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'tutor_profiles'
      AND column_name IN (
        'headline',
        'phone',
        'location',
        'teaching_style',
        'demo_video_url',
        'hourly_rate',
        'bio_status',
        'bio_pending'
      )
    ORDER BY column_name
  `);

  console.log("CV schema ready:", result.rows.map((row) => row.column_name).join(", "));
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
