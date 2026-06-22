const fs = require('fs');
let content = fs.readFileSync('frontend/src/App.jsx', 'utf8');

// 1. Add import
if (!content.includes('import CourseMarketplace')) {
  content = content.replace(
    "import TutorProfile from './pages/TutorProfile'",
    "import TutorProfile from './pages/TutorProfile'\nimport CourseMarketplace from './pages/CourseMarketplace'"
  );
}

// 2. Add to Header navigation
if (!content.includes('<a href="#/courses">Khóa Học</a>')) {
  content = content.replace(
    '<a href="#/subjects">Môn Học</a>',
    '<a href="#/subjects">Môn Học</a>\n            <a href="#/courses">Khóa Học</a>'
  );
}

// 3. Add to routeName handler
if (!content.includes("routeName === 'courses'")) {
  const routeInject = `
  // ── Route: Course Marketplace ──
  if (routeName === 'courses') {
    return (
      <div className="min-h-screen bg-[#f8f9fb]">
        <header className="site-header" style={{ position: 'sticky', top: 0, zIndex: 50, background: 'white', borderBottom: '1px solid #e2e8f0' }}>
          <div className="container header-inner" style={{ height: '70px' }}>
            <a href="#/" className="brand">
              <span className="material-symbols-outlined icon-fill">school</span>
              <span className="brand-name">EduX</span>
            </a>
            <nav className="header-nav">
              <a href="#/courses" style={{ color: '#0d9488', fontWeight: 600 }}>Khóa Học</a>
            </nav>
            <div className="header-actions">
              <button className="btn btn-outline" onClick={() => window.location.hash = '#/'}>Trang chủ</button>
            </div>
          </div>
        </header>
        <main className="py-8">
          <CourseMarketplace />
        </main>
      </div>
    );
  }
`;
  content = content.replace(
    "if (routeName === 'tutor-detail') {",
    routeInject + "\n  if (routeName === 'tutor-detail') {"
  );
}

// 4. Add section to HomePage
if (!content.includes('<CourseMarketplace />') && !content.includes('section-courses')) {
  const sectionInject = `
        <section className="section section-courses bg-surface" style={{ padding: '60px 0' }}>
          <div className="container">
            <div className="section-head mb-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold">Khóa Học & Lộ Trình</h2>
              <a href="#/courses" className="see-all flex items-center gap-1 text-primary font-semibold hover:underline">
                Xem tất cả
                <span className="material-symbols-outlined">arrow_forward</span>
              </a>
            </div>
            <CourseMarketplace />
          </div>
        </section>
`;
  content = content.replace(
    '        <section className="section section-tutors">',
    sectionInject + '\n        <section className="section section-tutors">'
  );
}

fs.writeFileSync('frontend/src/App.jsx', content);
console.log('App.jsx patched with CourseMarketplace.');
