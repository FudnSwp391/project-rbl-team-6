const fs = require('fs');
['TutorDashboard.jsx', 'StudentDashboard.jsx', 'ParentDashboard.jsx', 'AdminDashboard.jsx'].forEach(f => {
  const c = fs.readFileSync('frontend/src/' + f, 'utf8');
  console.log(f, 'has anchor logo:', c.includes('<a href="#/"'));
});
