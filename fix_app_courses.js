const fs = require('fs');

let s = fs.readFileSync('frontend/src/App.jsx', 'utf8');

const target = `  if (routeName === 'courses') {
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
  }`;

s = s.replace(target, "  if (routeName === 'courses') {\n    return <CourseMarketplace />;\n  }");

fs.writeFileSync('frontend/src/App.jsx', s);
console.log('Fixed double header');
