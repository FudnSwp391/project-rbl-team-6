const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.qrdnebeulfdgfeermghj:cungnhauthukhoa@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres' });
pool.query('SELECT * FROM tutor_certificates ORDER BY created_at DESC LIMIT 10').then(res => {
  console.log(res.rows);
  pool.end();
}).catch(console.error);
