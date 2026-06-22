const fs = require('fs');

// 1. Fix CourseMarketplace.jsx to link to `/course/` instead of `/courses/`
let cmPath = 'frontend/src/pages/CourseMarketplace.jsx';
let cm = fs.readFileSync(cmPath, 'utf8');
cm = cm.replace(/window\.location\.hash = `\/courses\/\${course\.id}`;/g, 'window.location.hash = `/course/${course.id}`;');
fs.writeFileSync(cmPath, cm);

// 2. Fix TutorProfile.jsx to link to `/booking/` instead of alerting
let tpPath = 'frontend/src/pages/TutorProfile.jsx';
let tp = fs.readFileSync(tpPath, 'utf8');
tp = tp.replace(/alert\('Tính năng đặt lịch sẽ được phát triển sau\.'\)/g, "window.location.hash = '/booking/' + id");
fs.writeFileSync(tpPath, tp);

// 3. Add BookingCalendar route to App.jsx
let appPath = 'frontend/src/App.jsx';
let app = fs.readFileSync(appPath, 'utf8');

if (!app.includes('import BookingCalendar')) {
  app = app.replace(
    "import CourseMarketplace from './pages/CourseMarketplace'",
    "import CourseMarketplace from './pages/CourseMarketplace'\nimport BookingCalendar from './pages/BookingCalendar'"
  );
}

// Add route matcher for booking
if (!app.includes('const bookingMatch = normalized.match(/^\\/booking\\/([^/]+)$/)')) {
  app = app.replace(
    "const tutorDetailMatch = normalized.match(/^\\/tutor-detail\\/([^/]+)$/)",
    "const tutorDetailMatch = normalized.match(/^\\/tutor-detail\\/([^/]+)$/)\n  const bookingMatch = normalized.match(/^\\/booking\\/([^/]+)$/)\n  if (bookingMatch) return { name: 'booking', id: bookingMatch[1] }"
  );
}

// Add component render for booking
if (!app.includes("if (routeName === 'booking')")) {
  app = app.replace(
    "if (routeName === 'tutor-detail') {",
    "if (routeName === 'booking') {\n    return <BookingCalendar tutorId={route.id} onGoHome={() => navigateTo('home')} />\n  }\n\n  if (routeName === 'tutor-detail') {"
  );
}

// Ensure CourseDetail is receiving courseId
if (app.includes('return <CourseDetail />')) {
  app = app.replace(
    "return <CourseDetail />",
    "return <CourseDetail courseId={route.id} />"
  );
}

fs.writeFileSync(appPath, app);
console.log('Successfully patched BookingCalendar and CourseMarketplace links!');
