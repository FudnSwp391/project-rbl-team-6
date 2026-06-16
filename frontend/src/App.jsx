/**
 * App.jsx
 * Main application shell — handles hash-based routing and renders the correct page.
 * Routes: / (home)  #/signin  #/signup  #/admin
 */
import { useEffect, useState, Component } from 'react'
import './App.css'
import SignIn from './SignIn'
import SignUp from './SignUp'
import AdminDashboard from './AdminDashboard'
import StudentDashboard from './StudentDashboard'
import TutorDashboard from './TutorDashboard'
import ParentDashboard from './ParentDashboard'
import { useAuth } from './AuthContext'
import { tutors } from './tutorsData'
import { getPublishedCourses, getTutors } from './services/api'
import TutorProfile from './pages/TutorProfile'
import BookingCalendar from './pages/BookingCalendar'
import Messages from './pages/Messages'
import CoursePlayer from './pages/CoursePlayer'

const subjects = [
  { name: 'Mathematics', icon: 'calculate' },
  { name: 'Science', icon: 'science' },
  { name: 'Languages', icon: 'translate' },
  { name: 'Music', icon: 'music_note' },
  { name: 'Art', icon: 'palette' },
  { name: 'Coding', icon: 'code' },
]



const footerLinks = {
  platform: ['Find Tutors', 'Become a Tutor', 'Subjects'],
  company: ['About Us', 'Support', 'Privacy Policy'],
}

// ─── Error Boundary ───────────────────────────────────────────────────────────
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, fontFamily: 'Inter, sans-serif' }}>
          <span style={{ fontSize: 56 }}>⚠️</span>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Something went wrong</h2>
          <pre style={{ background: '#fee2e2', color: '#dc2626', padding: '12px 20px', borderRadius: 10, fontSize: 13, maxWidth: 600, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {this.state.error?.message}
          </pre>
          <button
            style={{ padding: '10px 24px', background: '#00288e', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            onClick={() => { localStorage.removeItem('edux_bookings'); window.location.reload() }}
          >
            Clear cache &amp; Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// ─── Helper: parse the hash to get the current route ─────────────────────────
const getRouteFromHash = () => {
  const normalized = window.location.hash.replace(/^#/, '') || '/'
  if (normalized === '/signin')    return 'signin'
  if (normalized === '/signup')    return 'signup'
  if (normalized === '/admin')     return 'admin'
  if (normalized === '/dashboard') return 'dashboard'
  if (normalized === '/tutor')     return 'tutor'
  if (normalized === '/parent')    return 'parent'
  if (normalized === '/messages')  return 'messages'
  if (normalized.startsWith('/messages/')) return 'messages'
  if (normalized.startsWith('/tutor-profile/'))    return 'tutor-profile'
  if (normalized.startsWith('/booking-calendar/')) return 'booking-calendar'
  if (normalized.startsWith('/course/')) return 'course'
  return 'home'
}

const getTutorIdFromHash = () => {
  const normalized = window.location.hash.replace(/^#/, '')
  const parts = normalized.split('/')
  return parts.length >= 3 ? parts[2] : null
}

const getConvIdFromHash = () => {
  const normalized = window.location.hash.replace(/^#/, '')
  if (normalized.startsWith('/messages/')) {
    return normalized.split('/')[2] || null
  }
  return null
}

const getDashboardHashForRole = (role) => {
  if (role === 'admin') return '/admin'
  if (role === 'tutor') return '/tutor'
  if (role === 'parent') return '/parent'
  return '/dashboard'
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
  const [featuredTutors, setFeaturedTutors] = useState(tutors)
  const [marketCourses, setMarketCourses] = useState([])
  const [coursesLoading, setCoursesLoading] = useState(true)

  useEffect(() => {
    let active = true
    getTutors()
      .then((data) => {
        if (active && Array.isArray(data) && data.length > 0) {
          setFeaturedTutors(data)
        }
      })
      .catch(() => {})
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    setCoursesLoading(true)
    getPublishedCourses(topic ? { q: topic } : {})
      .then((data) => {
        if (active) setMarketCourses(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (active) setMarketCourses([])
      })
      .finally(() => {
        if (active) setCoursesLoading(false)
      })
    return () => { active = false }
  }, [topic])

  const handleSearch = () => {
    document.getElementById('course-marketplace')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="academia-page">
      <header className="site-header">
        <div className="container header-inner">
          <a href="#/" className="brand">
            <span className="material-symbols-outlined icon-fill">school</span>
            <span className="brand-name">EduX</span>
          </a>

          <nav className="header-nav">
            <a href="#">Find Tutors</a>
            <a href="#">Become a Tutor</a>
            <a href="#">Subjects</a>
            {/* Show Admin link if user is admin */}
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
                className="header-profile-link"
                title="Go to dashboard"
                onClick={() => { window.location.hash = getDashboardHashForRole(user.role) }}
              >
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="header-avatar"
                  />
                ) : (
                  <span className="material-symbols-outlined header-avatar-icon">account_circle</span>
                )}
                <span className="header-username">{user.name || user.email}</span>
              </button>
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
          <div className="container hero-content">
            <h1>Find the perfect tutor for your learning journey</h1>
            <p>
              Expert educators ready to help you master new subjects and achieve
              your academic goals.
            </p>
            <div className="search-panel">
              <label className="search-field">
                <span className="material-symbols-outlined">search</span>
                <input
                  type="text"
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  placeholder="What do you want to learn?"
                />
              </label>
              <label className="search-field">
                <span className="material-symbols-outlined">location_on</span>
                <input
                  type="text"
                  value={place}
                  onChange={(event) => setPlace(event.target.value)}
                  placeholder="Online or specific location?"
                />
              </label>
              <button type="button" className="btn btn-primary search-button" onClick={handleSearch}>
                Search
              </button>
            </div>
          </div>
        </section>

        <section className="section section-subjects">
          <div className="container">
            <h2>Popular Subjects</h2>
            <div className="subject-grid">
              {subjects.map((item) => (
                <a href="#" className="subject-card" key={item.name}>
                  <span className="subject-icon material-symbols-outlined">
                    {item.icon}
                  </span>
                  <span>{item.name}</span>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section id="course-marketplace" className="section section-courses">
          <div className="container">
            <div className="section-head">
              <div>
                <span className="course-kicker">Video course marketplace</span>
                <h2>Khóa học video từ gia sư EduX</h2>
                <p className="section-subtitle">
                  Gia sư publish course thì học sinh/phụ huynh có thể tìm theo tên khóa học, môn học hoặc tên gia sư rồi mua để học ngay.
                </p>
              </div>
              <div className="course-search-chip">
                <span className="material-symbols-outlined">search</span>
                {topic ? `Search: ${topic}` : 'Search by course name'}
              </div>
            </div>

            {coursesLoading ? (
              <div className="course-empty">
                <span className="material-symbols-outlined">sync</span>
                Loading courses...
              </div>
            ) : marketCourses.length === 0 ? (
              <div className="course-empty">
                <span className="material-symbols-outlined">video_library</span>
                <strong>Chưa có khóa học phù hợp</strong>
                <p>Hãy thử tìm tên khóa học khác, hoặc chờ gia sư publish course mới.</p>
              </div>
            ) : (
              <div className="course-market-grid">
                {marketCourses.map((course) => (
                  <CourseMarketCard key={course.id} course={course} />
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="section section-tutors">
          <div className="container">
            <div className="section-head">
              <h2>Featured Tutors</h2>
              <a href="#" className="see-all">
                See all
                <span className="material-symbols-outlined">arrow_forward</span>
              </a>
            </div>

            <div className="tutor-grid">
              {featuredTutors.map((tutor) => (
                <article className="tutor-card" key={tutor.id}>
                  <div className="tutor-top">
                    <img src={tutor.avatar} alt={tutor.name} loading="lazy" />
                    <div>
                      <h3 style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {tutor.name}
                        {tutor.isNewTutor && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 800,
                              color: '#b45309',
                              background: '#fef3c7',
                              border: '1px solid #fcd34d',
                              borderRadius: 999,
                              padding: '2px 7px',
                              lineHeight: 1,
                              letterSpacing: '0.04em',
                            }}
                            title="New tutor on EduX"
                          >
                            NEW
                          </span>
                        )}
                        {tutor.verified && (
                          <span
                            className="material-symbols-outlined icon-fill"
                            style={{ fontSize: 18, color: '#1d9bf0' }}
                            title="Verified by EduX Admin"
                          >
                            verified
                          </span>
                        )}
                      </h3>
                      <p className="rating">
                        <span className="material-symbols-outlined star icon-fill">
                          star
                        </span>
                        <span>{tutor.rating}</span>
                        <small>({tutor.reviewsCount} reviews)</small>
                      </p>
                    </div>
                  </div>

                  <div className="chip-wrap">
                    {(tutor.subjects || []).map((subject) => (
                      <span key={subject} className="chip">
                        {subject}
                      </span>
                    ))}
                  </div>

                  <p className="desc">{tutor.description}</p>
                  <div className="tutor-foot">
                    <p className="price">
                      <strong>${tutor.rate}</strong>
                      <span>/hr</span>
                    </p>
                    {tutor.isNewTutor && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ background: '#f59e0b', borderColor: '#d97706' }}
                        onClick={() => {
                          sessionStorage.setItem('edux_focus_trial_class', String(tutor.id));
                          window.location.hash = `/tutor-profile/${tutor.id}`;
                        }}
                      >
                        Học thử free
                      </button>
                    )}
                    {user?.role === 'student' && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => { window.location.hash = `/tutor-profile/${tutor.id}` }}
                      >
                        Message
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => { window.location.hash = `/tutor-profile/${tutor.id}` }}
                    >
                      View Profile
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
            <a href="#" className="brand">
              <span className="material-symbols-outlined icon-fill">school</span>
              <span className="brand-name">EduX</span>
            </a>
            <p className="footer-copy">
              Copyright 2024 EduX. Empowering minds globally.
            </p>
          </div>
          <div>
            <h4>Platform</h4>
            <ul>
              {footerLinks.platform.map((item) => (
                <li key={item}>
                  <a href="#">{item}</a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4>Company</h4>
            <ul>
              {footerLinks.company.map((item) => (
                <li key={item}>
                  <a href="#">{item}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </footer>
    </div>
  )
}

function formatCoursePrice(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

function CourseMarketCard({ course }) {
  return (
    <article className="course-market-card">
      <div className="course-thumb">
        {course.thumbnailUrl ? (
          <img src={course.thumbnailUrl} alt={course.title} loading="lazy" />
        ) : (
          <span className="material-symbols-outlined">play_lesson</span>
        )}
        {course.previewLessonCount > 0 && <span className="preview-badge">Free preview</span>}
      </div>
      <div className="course-body">
        <div className="course-meta">
          {course.subject && <span>{course.subject}</span>}
          {course.level && <span>{course.level}</span>}
        </div>
        <h3>{course.title}</h3>
        <p className="course-desc">{course.description || 'Khóa học video do gia sư EduX biên soạn.'}</p>
        <div className="course-tutor">
          {course.tutorAvatar ? (
            <img src={course.tutorAvatar} alt={course.tutorName} />
          ) : (
            <div>{(course.tutorName || 'T').charAt(0)}</div>
          )}
          <span>{course.tutorName || 'EduX Tutor'}</span>
          {course.tutorVerified && <span className="material-symbols-outlined icon-fill verified-mini">verified</span>}
          {course.isNewTutor && <span className="new-mini">NEW</span>}
        </div>
        <div className="course-stats">
          <span><span className="material-symbols-outlined icon-fill">star</span>{course.rating || 4.8}</span>
          <span><span className="material-symbols-outlined">play_circle</span>{course.lessonCount || 0} lessons</span>
          <span><span className="material-symbols-outlined">groups</span>{course.studentsBought || 0}</span>
        </div>
      </div>
      <div className="course-buy-row">
        <strong>{formatCoursePrice(course.price)}</strong>
        <button type="button" className="btn btn-primary" onClick={() => { window.location.hash = `/course/${course.id}` }}>
          Xem & mua
        </button>
      </div>
    </article>
  )
}

// ─── Root App component ───────────────────────────────────────────────────────
function App() {
  const { user } = useAuth()
  const [route, setRoute] = useState(() => getRouteFromHash())

  useEffect(() => {
    const handleHashChange = () => setRoute(getRouteFromHash())
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [route])

  const navigateTo = (nextRoute) => {
    if (nextRoute === 'signin')    { window.location.hash = '/signin';    return }
    if (nextRoute === 'signup')    { window.location.hash = '/signup';    return }
    if (nextRoute === 'admin')     { window.location.hash = '/admin';     return }
    if (nextRoute === 'dashboard') { window.location.hash = '/dashboard'; return }
    if (nextRoute === 'tutor')     { window.location.hash = '/tutor';     return }
    if (nextRoute === 'parent')    { window.location.hash = '/parent';    return }
    if (nextRoute === 'messages')  { window.location.hash = '/messages';  return }
    window.location.hash = '/'
  }

  // ── Route: Messages ──
  if (route === 'messages') {
    if (!user) return <AccessDenied isLoggedIn={false} onGoSignIn={() => navigateTo('signin')} />
    const convId = getConvIdFromHash()
    return <Messages initialConvId={convId} />
  }

  // ── Route: Tutor Profile ──
  if (route === 'tutor-profile') {
    const tutorId = getTutorIdFromHash()
    return <TutorProfile tutorId={tutorId} onGoHome={() => navigateTo('home')} />
  }

  // ── Route: Booking Calendar ──
  if (route === 'booking-calendar') {
    const tutorId = getTutorIdFromHash()
    return <BookingCalendar tutorId={tutorId} onGoHome={() => navigateTo('home')} />
  }

  if (route === 'course') {
    const courseId = getTutorIdFromHash()
    return <CoursePlayer courseId={courseId} onGoHome={() => navigateTo('home')} />
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

  // ── Route: Home ──
  return <HomePage onGoSignIn={() => navigateTo('signin')} />
}

function AppRoot() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  )
}

export default AppRoot
