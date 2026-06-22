const dotenv = require("dotenv");
const { Pool } = require("pg");

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function ensurePolicy(name, sql) {
  const result = await pool.query(
    `SELECT 1
     FROM pg_policies
     WHERE schemaname = 'storage'
       AND tablename = 'objects'
       AND policyname = $1`,
    [name]
  );

  if (result.rows.length === 0) {
    await pool.query(sql);
  }
}

async function main() {
  await pool.query(`
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('edux-media', 'edux-media', true)
    ON CONFLICT (id) DO UPDATE SET public = true
  `);

  await ensurePolicy(
    "EduX media public read",
    `CREATE POLICY "EduX media public read"
     ON storage.objects
     FOR SELECT
     USING (bucket_id = 'edux-media')`
  );

  await ensurePolicy(
    "EduX media anon upload",
    `CREATE POLICY "EduX media anon upload"
     ON storage.objects
     FOR INSERT
     WITH CHECK (bucket_id = 'edux-media')`
  );

  const bucket = await pool.query(
    "SELECT id, name, public FROM storage.buckets WHERE id = 'edux-media'"
  );

  console.log("Storage ready:", bucket.rows[0]);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
