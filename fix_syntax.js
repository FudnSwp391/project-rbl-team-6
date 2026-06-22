const fs = require('fs');
const lines = fs.readFileSync('frontend/src/App.jsx', 'utf8').split('\n');

const correctCode = `  // ── Route: Dashboard ──
  if (routeName === 'dashboard') {
    if (!user) return <AccessDenied isLoggedIn={false} onGoSignIn={() => navigateTo('signin')} />
    if (user.role === 'admin') return <AdminDashboard />
    if (user.role === 'tutor') return <TutorDashboard />
    if (user.role === 'parent') return <ParentDashboard />
    return <StudentDashboard />
  }`;

// Remove lines 580 to 594 (0-indexed, so 580 index corresponds to line 581, removing 15 lines)
lines.splice(580, 15, correctCode);

fs.writeFileSync('frontend/src/App.jsx', lines.join('\n'));
console.log('Successfully fixed syntax error in App.jsx');
