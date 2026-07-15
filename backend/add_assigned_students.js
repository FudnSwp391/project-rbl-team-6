const pool = require('./db');

async function main() {
  try {
    await pool.query(`ALTER TABLE exam_papers ADD COLUMN IF NOT EXISTS assigned_students JSONB DEFAULT '[]'::jsonb;`);
    console.log('Column assigned_students added to exam_papers successfully.');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}
main();
