const pool = require('./db');
pool.query("SELECT subjects, experience_years, hourly_rate, city, teaching_methods FROM tutor_profiles WHERE status='approved' LIMIT 2").then(r => {
  console.log(JSON.stringify(r.rows, null, 2));
  pool.end();
});
