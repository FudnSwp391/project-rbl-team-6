import { useEffect, useState } from 'react'
import './App.css'
import SignIn from './pages/auth/SignIn'
import SignUp from './pages/auth/SignUp'
import AdminDashboard from './pages/dashboard/AdminDashboard'
import StudentDashboard from './pages/dashboard/StudentDashboard'
import TutorDashboard from './pages/dashboard/TutorDashboard'
import ParentDashboard from './pages/dashboard/ParentDashboard'
import TutorsPage from './pages/tutors/TutorsPage'
import TutorDetailPage from './pages/tutors/TutorDetailPage'
import CoursesPage from './pages/courses/CoursesPage'
import CourseDetailPage from './pages/courses/CourseDetailPage'
import AISuggestPage from './pages/ai/AISuggestPage'
import { useAuth } from './context/AuthContext'

const subjects = [
  { name: 'Toán học',    icon: 'calculate',  href: '#/tutors' },
  { name: 'Vật lý',      icon: 'bolt',       href: '#/tutors' },
  { name: 'Tiếng Anh',   icon: 'translate',  href: '#/tutors' },
  { name: 'Hóa học',     icon: 'science',    href: '#/tutors' },
  { name: 'Tin học',     icon: 'code',       href: '#/tutors' },
  { name: 'Ngữ văn',     icon: 'menu_book',  href: '#/tutors' },
]

const footerLinks = {
  platform: ['Tìm gia sư', 'Đăng ký dạy', 'Khóa học', 'AI Gợi ý'],
  company: ['Giới thiệu', 'Hỗ trợ', 'Chính sách bảo mật'],
}

// ─── Helper: chọn dashboard URL theo role ────────────────────────────────────
const getDashboardRoute = (role) => {
  if (role === 'admin')  return '/admin'
  if (role === 'tutor')  return '/tutor'
  if (role === 'parent') return '/parent'
  return '/dashboard'  // student là mặc định
}

// ─── Helper: parse the hash to get the current route ─────────────────────────
const getRouteFromHash = () => {
  // Bỏ query string (?subject=...&page=2) trước khi so khớp route
  const path = (window.location.hash.replace(/^#/, '') || '/').split('?')[0]
  if (path === '/signin')     return 'signin'
  if (path === '/signup')     return 'signup'
  if (path === '/admin')      return 'admin'
  if (path === '/dashboard')  return 'dashboard'
  if (path === '/tutor')      return 'tutor'
  if (path === '/parent')     return 'parent'
  if (path === '/tutors')     return 'tutors'
  if (path === '/courses')    return 'courses'
  if (path === '/ai-suggest') return 'ai-suggest'
  if (/^\/tutors\/[^/]+/.test(path))  return 'tutor-detail'
  if (/^\/courses\/[^/]+/.test(path)) return 'course-detail'
  return 'home'
}

const getHashId = () => {
  // ID có thể là UUID hoặc số — trả về chuỗi nguyên gốc
  const m = window.location.hash.replace(/^#/, '').match(/\/\w+\/([^/?]+)/)
  return m ? m[1] : null
}

// ─── Access Denied page (shown to non-admin users who visit #/admin) ──────────
function AccessDenied({ isLoggedIn, onGoSignIn }) {
  return (
    <div className="academia-page">
      <div className="access-denied-wrap">
        <span className="material-symbols-outlined access-denied-icon">lock</span>
        <h1 className="access-denied-title">Access Denied</h1>
        {isLoggedIn ? (
          <p className="access-denied-msg">
            You do not have admin privileges to view this page.
          </p>
        ) : (
          <p className="access-denied-msg">
            Please sign in as an admin to access this page.
          </p>
        )}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="#/" className="btn btn-outline">← Back to Home</a>
          {!isLoggedIn && (
            <button className="btn btn-primary" onClick={onGoSignIn}>Sign In</button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Home Page ────────────────────────────────────────────────────────────────
function HomePage({ onGoSignIn }) {
  const { user, logout } = useAuth()
  const [topic, setTopic] = useState('')
  const [place, setPlace] = useState('')
  const [featured, setFeatured] = useState([])

  // Gia sư nổi bật: lấy top theo đánh giá từ API (dữ liệu thật)
  useEffect(() => {
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
    fetch(`${base}/api/tutors?sort=rating`)
      .then(r => r.ok ? r.json() : [])
      .then(rows => setFeatured(Array.isArray(rows) ? rows.slice(0, 4) : []))
      .catch(() => setFeatured([]))
  }, [])

  return (
    <div className="academia-page">
      <header className="site-header">
        <div className="container header-inner">
          <a href="#/" className="brand">
            <span className="material-symbols-outlined icon-fill">school</span>
            <span className="brand-name">EduX</span>
          </a>

          <nav className="header-nav">
            {user?.role === 'admin' && (
              <a href="#/admin" style={{ color: 'var(--primary)', fontWeight: 700 }}>
                Admin
              </a>
            )}
          </nav>

          {/* Show user info + logout OR login button */}
          {user ? (
            <div className="header-user">
              <button
                type="button"
                className="btn btn-dashboard btn-ripple"
                onClick={() => { window.location.hash = getDashboardRoute(user.role) }}
                title="Đi đến trang thành viên"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>
                  dashboard
                </span>
                Trang thành viên
              </button>
              {user.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="header-avatar"
                />
              ) : (
                <span className="material-symbols-outlined">account_circle</span>
              )}
              <span className="header-username">{user.name || user.email}</span>
              <button type="button" className="btn btn-outline" onClick={logout}>
                Logout
              </button>
            </div>
          ) : (
            <button type="button" className="btn btn-primary" onClick={onGoSignIn}>
              Login
            </button>
          )}
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-overlay" />
          <div className="hero-glow-ring" aria-hidden="true" />

          {/* Animated background layers */}
          <div className="hero-bg-anim" aria-hidden="true">
            <span className="hero-blob hero-blob-1" />
            <span className="hero-blob hero-blob-2" />
            <span className="hero-blob hero-blob-3" />
            <span className="hero-grid" />
            <span className="hero-particle hero-particle-1" />
            <span className="hero-particle hero-particle-2" />
            <span className="hero-particle hero-particle-3" />
            <span className="hero-particle hero-particle-4" />
            <span className="hero-particle hero-particle-5" />
          </div>

          {/* Vệt sáng quét */}
          <div className="hero-shine" aria-hidden="true" />

          {/* Thẻ kính nổi bay lơ lửng */}
          <div className="hero-stat hero-stat-1" aria-hidden="true">
            <div className="hero-stat-ico"><span className="material-symbols-outlined" style={{ fontSize: 20 }}>groups</span></div>
            <div><div className="hero-stat-num">500+</div><div className="hero-stat-label">Gia sư</div></div>
          </div>
          <div className="hero-stat hero-stat-2" aria-hidden="true">
            <div className="hero-stat-ico"><span className="material-symbols-outlined" style={{ fontSize: 20 }}>school</span></div>
            <div><div className="hero-stat-num">10K+</div><div className="hero-stat-label">Học sinh</div></div>
          </div>
          <div className="hero-stat hero-stat-3" aria-hidden="true">
            <div className="hero-stat-ico"><span className="material-symbols-outlined" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>star</span></div>
            <div><div className="hero-stat-num">4.9★</div><div className="hero-stat-label">Đánh giá</div></div>
          </div>

          <div className="container hero-content">
            <div className="hero-welcome-badge">
              <span className="hero-welcome-emoji">👋</span>
              <span>
                Chào mừng thành viên
                {user?.name || user?.email ? (
                  <strong> {user.name || user.email.split('@')[0]}</strong>
                ) : null}
              </span>
            </div>
            <h1 className="hero-rise hero-rise-1">Kết nối với gia sư tốt nhất cho hành trình học tập của bạn</h1>
            <p className="hero-rise hero-rise-2">
              Hàng trăm gia sư chuyên nghiệp sẵn sàng giúp bạn chinh phục mọi môn học.
              Tìm gia sư, học online hoặc offline — hoàn toàn linh hoạt.
            </p>
            <div className="search-panel hero-rise hero-rise-3">
              <label className="search-field">
                <span className="material-symbols-outlined">search</span>
                <input
                  type="text"
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  placeholder="Bạn muốn học môn gì?"
                />
              </label>
              <label className="search-field">
                <span className="material-symbols-outlined">location_on</span>
                <input
                  type="text"
                  value={place}
                  onChange={(event) => setPlace(event.target.value)}
                  placeholder="Online hay tại khu vực?"
                />
              </label>
              <button
                type="button"
                className="btn btn-premium search-button"
                onClick={() => { window.location.hash = '/tutors' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>search</span>
                Tìm kiếm
              </button>
            </div>

            {/* Quick CTA row */}
            <div className="hero-rise hero-rise-4" style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20, flexWrap: 'wrap' }}>
              <a href="#/tutors"     style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 999, background: 'rgb(255 255 255 / 70%)', color: 'var(--primary)', fontSize: 13, fontWeight: 700, textDecoration: 'none', border: '1px solid rgb(0 40 142 / 15%)', backdropFilter: 'blur(8px)', transition: 'all 0.2s ease' }}
                onMouseOver={e => e.currentTarget.style.background = 'rgb(0 40 142 / 10%)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgb(255 255 255 / 70%)'}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>people</span>
                Tìm gia sư
              </a>
              <a href="#/courses"    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 999, background: 'rgb(255 255 255 / 70%)', color: 'var(--primary)', fontSize: 13, fontWeight: 700, textDecoration: 'none', border: '1px solid rgb(0 40 142 / 15%)', backdropFilter: 'blur(8px)', transition: 'all 0.2s ease' }}
                onMouseOver={e => e.currentTarget.style.background = 'rgb(0 40 142 / 10%)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgb(255 255 255 / 70%)'}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>play_lesson</span>
                Khóa học
              </a>
              <a href="#/ai-suggest" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 999, background: 'rgb(255 255 255 / 70%)', color: 'var(--primary)', fontSize: 13, fontWeight: 700, textDecoration: 'none', border: '1px solid rgb(0 40 142 / 15%)', backdropFilter: 'blur(8px)', transition: 'all 0.2s ease' }}
                onMouseOver={e => e.currentTarget.style.background = 'rgb(0 40 142 / 10%)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgb(255 255 255 / 70%)'}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>auto_awesome</span>
                AI Gợi ý
              </a>
            </div>

            {/* Dải chip môn học chạy ngang (marquee) */}
            <div className="hero-marquee hero-rise hero-rise-4" aria-hidden="true">
              <div className="hero-marquee-track">
                {[...subjects, ...subjects].map((s, i) => (
                  <span className="hero-chip-anim" key={i}>
                    <span className="material-symbols-outlined">{s.icon}</span>
                    {s.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="section section-subjects">
          <div className="container">
            <h2>Môn học phổ biến</h2>
            <div className="subject-grid">
              {subjects.map((item) => (
                <a href={item.href} className="subject-card" key={item.name}>
                  <span className="subject-icon material-symbols-outlined">
                    {item.icon}
                  </span>
                  <span>{item.name}</span>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="section section-tutors">
          <div className="container">
            <div className="section-head">
              <h2>Gia sư nổi bật</h2>
              <a href="#/tutors" className="see-all">
                Xem tất cả
                <span className="material-symbols-outlined">arrow_forward</span>
              </a>
            </div>

            <div className="tutor-grid">
              {featured.length === 0 ? (
                <p style={{ color: 'var(--outline)', gridColumn: '1 / -1', textAlign: 'center', padding: '20px 0' }}>
                  Đang tải gia sư nổi bật...
                </p>
              ) : featured.map((tutor) => (
                <article
                  className="tutor-card"
                  key={tutor.id}
                  style={{ cursor: 'pointer', transition: 'transform 0.3s ease, box-shadow 0.3s ease' }}
                  onClick={() => { window.location.hash = `/tutors/${tutor.id}` }}
                >
                  <div className="tutor-top">
                    {tutor.picture ? (
                      <img
                        src={tutor.picture}
                        alt={tutor.full_name}
                        style={{ width: 80, height: 80, borderRadius: 16, flexShrink: 0, objectFit: 'cover' }}
                        onError={e => { e.currentTarget.style.display = 'none' }}
                      />
                    ) : (
                      <div style={{
                        width: 80, height: 80, borderRadius: 16, flexShrink: 0,
                        background: 'linear-gradient(135deg, #00288e, #4c6ef5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: 28, fontWeight: 900,
                      }}>
                        {(tutor.full_name || '?').charAt(0)}
                      </div>
                    )}
                    <div>
                      <h3>{tutor.full_name}</h3>
                      <p className="rating">
                        <span className="material-symbols-outlined star icon-fill">star</span>
                        <span>{(Number(tutor.avg_rating) || 0).toFixed(1)}</span>
                        <small>({tutor.review_count || 0} đánh giá)</small>
                      </p>
                    </div>
                  </div>

                  <div className="chip-wrap">
                    {(tutor.teaching_methods || []).map((m) => (
                      <span key={m} className="chip">{m === 'online' ? 'Online' : 'Offline'}</span>
                    ))}
                    {tutor.location && <span className="chip">{tutor.location}</span>}
                  </div>

                  <p className="desc">{tutor.bio}</p>
                  <div className="tutor-foot">
                    <p className="price">
                      <strong>{new Intl.NumberFormat('vi-VN').format(tutor.hourly_rate || 0)}</strong>
                      <span>đ/giờ</span>
                    </p>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={e => { e.stopPropagation(); window.location.hash = `/tutors/${tutor.id}` }}
                    >
                      Xem hồ sơ
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container footer-grid">
          <div>
            <a href="#/" className="brand">
              <span className="material-symbols-outlined icon-fill">school</span>
              <span className="brand-name">EduX</span>
            </a>
            <p className="footer-copy">
              © 2025 EduX — Kết nối học sinh với gia sư tốt nhất Việt Nam.
            </p>
          </div>
          <div>
            <h4>Nền tảng</h4>
            <ul>
              {footerLinks.platform.map((item) => (
                <li key={item}><a href="#">{item}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <h4>Về chúng tôi</h4>
            <ul>
              {footerLinks.company.map((item) => (
                <li key={item}><a href="#">{item}</a></li>
              ))}
            </ul>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ─── Root App component ───────────────────────────────────────────────────────
function App() {
  const { user } = useAuth()
  const [route,   setRoute]   = useState(() => getRouteFromHash())
  const [hashId,  setHashId]  = useState(() => getHashId())

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(getRouteFromHash())
      setHashId(getHashId())
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const navigateTo = (nextRoute) => {
    if (nextRoute === 'signin')     { window.location.hash = '/signin';     return }
    if (nextRoute === 'signup')     { window.location.hash = '/signup';     return }
    if (nextRoute === 'admin')      { window.location.hash = '/admin';      return }
    if (nextRoute === 'dashboard')  { window.location.hash = '/dashboard';  return }
    if (nextRoute === 'tutor')      { window.location.hash = '/tutor';      return }
    if (nextRoute === 'parent')     { window.location.hash = '/parent';     return }
    if (nextRoute === 'tutors')     { window.location.hash = '/tutors';     return }
    if (nextRoute === 'courses')    { window.location.hash = '/courses';    return }
    if (nextRoute === 'ai-suggest') { window.location.hash = '/ai-suggest'; return }
    window.location.hash = '/'
  }

  // ── Route: Sign In ──
  if (route === 'signin') {
    return (
      <SignIn
        onSwitchToSignUp={() => navigateTo('signup')}
        onGoHome={() => navigateTo('home')}
      />
    )
  }

  // ── Route: Sign Up ──
  if (route === 'signup') {
    return (
      <SignUp
        onSwitchToSignIn={() => navigateTo('signin')}
        onGoHome={() => navigateTo('home')}
      />
    )
  }

  // ── Route: Admin Dashboard (protected) ──
  if (route === 'admin') {
    // Not logged in → guide to sign in
    if (!user) {
      return (
        <AccessDenied
          isLoggedIn={false}
          onGoSignIn={() => navigateTo('signin')}
        />
      )
    }
    // Logged in but not admin → access denied
    if (user.role !== 'admin') {
      return <AccessDenied isLoggedIn={true} />
    }
    // Admin → show dashboard
    return <AdminDashboard />
  }

  // ── Route: Student Dashboard (protected) ──
  if (route === 'dashboard') {
    if (!user) {
      return (
        <AccessDenied
          isLoggedIn={false}
          onGoSignIn={() => navigateTo('signin')}
        />
      )
    }
    return <StudentDashboard />
  }

  // ── Route: Tutor Dashboard (protected) ──
  if (route === 'tutor') {
    if (!user) {
      return (
        <AccessDenied
          isLoggedIn={false}
          onGoSignIn={() => navigateTo('signin')}
        />
      )
    }
    return <TutorDashboard />
  }

  // ── Route: Parent Dashboard (protected) ──
  if (route === 'parent') {
    if (!user) {
      return (
        <AccessDenied
          isLoggedIn={false}
          onGoSignIn={() => navigateTo('signin')}
        />
      )
    }
    return <ParentDashboard />
  }

  // ── Route: Tìm gia sư ──
  if (route === 'tutors') {
    return (
      <TutorsPage
        onViewTutor={id => { window.location.hash = `/tutors/${id}` }}
      />
    )
  }

  // ── Route: Chi tiết gia sư ──
  if (route === 'tutor-detail') {
    return (
      <TutorDetailPage
        tutorId={hashId}
        onBack={() => { window.location.hash = '/tutors' }}
      />
    )
  }

  // ── Route: Danh sách khóa học ──
  if (route === 'courses') {
    return (
      <CoursesPage
        onViewCourse={id => { window.location.hash = `/courses/${id}` }}
      />
    )
  }

  // ── Route: Chi tiết khóa học ──
  if (route === 'course-detail') {
    return (
      <CourseDetailPage
        courseId={hashId}
        onBack={() => { window.location.hash = '/courses' }}
      />
    )
  }

  // ── Route: AI Gợi ý ──
  if (route === 'ai-suggest') {
    return (
      <AISuggestPage
        onViewTutor={id => { window.location.hash = `/tutors/${id}` }}
      />
    )
  }

  // ── Route: Home ──
  return <HomePage onGoSignIn={() => navigateTo('signin')} />
}

export default App
