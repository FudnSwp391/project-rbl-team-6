require('dotenv').config();
const pool = require('./db');
pool.query("SELECT NOW(), ((CURRENT_DATE + '01:00 PM'::time) AT TIME ZONE 'Asia/Ho_Chi_Minh') as vn_time").then(r => {
  console.log("Timezone test:", r.rows);
  pool.end();
}).catch(console.error);
