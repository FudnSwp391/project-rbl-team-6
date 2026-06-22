const fs = require('fs');
let s = fs.readFileSync('backend/server.js', 'utf8');

// The SQL query has r.reviewer_id = u.id
s = s.replace(/r\.reviewer_id = u\.id/g, 'r.tutor_id = u.id');

fs.writeFileSync('backend/server.js', s);
console.log('Fixed reviewer_id to tutor_id in SQL query.');
