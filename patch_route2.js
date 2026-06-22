const fs = require('fs');
let c = fs.readFileSync('frontend/src/App.jsx', 'utf8');
const searchStr = "if (routeName === 'dashboard') {";
const start = c.indexOf(searchStr);
if (start !== -1) {
  const end = c.indexOf('}', start) + 1;
  const replacement = `if (routeName === 'dashboard') {
    if (!user) return <AccessDenied isLoggedIn={false} onGoSignIn={() => navigateTo('signin')} />
    if (user.role === 'admin') return <AdminDashboard />
    if (user.role === 'tutor') return <TutorDashboard />
    if (user.role === 'parent') return <ParentDashboard />
    return <StudentDashboard />
  }`;
  c = c.substring(0, start) + replacement + c.substring(end);
  fs.writeFileSync('frontend/src/App.jsx', c);
  console.log('App.jsx routing patched successfully');
} else {
  console.log('Could not find dashboard routing');
}
