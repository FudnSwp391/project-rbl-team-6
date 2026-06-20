const fs = require('fs');

// 1. App.jsx: Add CoursePlayer import and routing
let appPath = 'frontend/src/App.jsx';
let app = fs.readFileSync(appPath, 'utf8');

if (!app.includes('import CoursePlayer')) {
  app = app.replace(
    "import CourseDetail from './pages/CourseDetail'",
    "import CourseDetail from './pages/CourseDetail'\nimport CoursePlayer from './pages/CoursePlayer'"
  );
}

// Add route matcher for course player
if (!app.includes('const coursePlayerMatch = normalized.match(/^\\/course-player\\/([^/]+)$/)')) {
  app = app.replace(
    "const bookingMatch = normalized.match(/^\\/booking\\/([^/]+)$/)",
    "const bookingMatch = normalized.match(/^\\/booking\\/([^/]+)$/)\n  const coursePlayerMatch = normalized.match(/^\\/course-player\\/([^/]+)$/)\n  if (coursePlayerMatch) return { name: 'courseplayer', id: coursePlayerMatch[1] }"
  );
}

// Add component render for CoursePlayer
if (!app.includes("if (routeName === 'courseplayer')")) {
  app = app.replace(
    "if (routeName === 'coursedetail') {",
    "if (routeName === 'courseplayer') {\n    if (!user) return <AccessDenied isLoggedIn={false} onGoSignIn={() => navigateTo('signin')} />\n    return <CoursePlayer courseId={route.id} onGoHome={() => navigateTo('home')} />\n  }\n\n  if (routeName === 'coursedetail') {"
  );
}

fs.writeFileSync(appPath, app);

// 2. CourseDetail.jsx: Add onClick to Continue Learning
let cdPath = 'frontend/src/pages/CourseDetail.jsx';
let cd = fs.readFileSync(cdPath, 'utf8');

cd = cd.replace(
  '<button className="bg-primary text-on-primary font-label-md text-label-md px-8 py-3 rounded-xl flex items-center gap-2 hover:bg-primary/90 transition-all shadow-md active:scale-95">',
  '<button onClick={() => window.location.hash = `/course-player/${courseId}`} className="bg-primary text-on-primary font-label-md text-label-md px-8 py-3 rounded-xl flex items-center gap-2 hover:bg-primary/90 transition-all shadow-md active:scale-95">'
);

fs.writeFileSync(cdPath, cd);
console.log('Successfully added CoursePlayer integration');
