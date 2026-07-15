require('dotenv').config();
const { pool } = require('./db');

pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'bookings'").then(res => {
  console.log(res.rows);
  pool.end();
}).catch(console.error);
