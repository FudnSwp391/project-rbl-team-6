const fs = require('fs');
let content = fs.readFileSync('frontend/src/App.jsx', 'utf8');

const target = `  // ── Route: Student Dashboard ──
  if (routeName === 'dashboard') {
    if (!user) return <AccessDenied isLoggedIn={false} onGoSignIn={() => navigateTo('signin')} />
    return <StudentDashboard />
  }`;

const replacement = `  // ── Route: Dashboard ──
  if (routeName === 'dashboard') {
    if (!user) return <AccessDenied isLoggedIn={false} onGoSignIn={() => navigateTo('signin')} />
    if (user.role === 'admin') return <AdminDashboard />
    if (user.role === 'tutor') return <TutorDashboard />
    if (user.role === 'parent') return <ParentDashboard />
    return <StudentDashboard />
  }`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('frontend/src/App.jsx', content);
  console.log('Successfully patched dashboard routing.');
} else {
  console.log('Target not found.');
}
