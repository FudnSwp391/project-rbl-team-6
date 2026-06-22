const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.qrdnebeulfdgfeermghj:cungnhauthukhoa@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true' });

async function test() {
    try {
        const dbRes = await pool.query("SELECT process_deposit('00000000-0000-0000-0000-000000000000', 10000, 'VNPAY', 'test1')");
        console.log(dbRes.rows);
    } catch(e) {
        console.error("DB Error:", e.message);
    } finally {
        pool.end();
    }
}
test();
