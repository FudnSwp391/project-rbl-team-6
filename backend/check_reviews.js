const pool = require('./db');
pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'reviews'").then(r => {
  console.log(r.rows.map(x=>x.column_name));
  pool.end();
});
