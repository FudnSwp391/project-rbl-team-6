/**
 * App.jsx
 * Main application shell — handles hash-based routing and renders the correct page.
 * Routes: / (home)  #/signin  #/signup  #/admin
 */
import { useEffect, useState, useRef } from 'react'
import './App.css'
import SignIn from './SignIn'
import SignUp from './SignUp'
import AdminDashboard from './AdminDashboard'
import StudentDashboard from './StudentDashboard'
import TutorDashboard from './TutorDashboard'
import ParentDashboard from './ParentDashboard'    // ← NEW
import MyCourses from './pages/MyCourses'
import CourseDetail from './pages/CourseDetail'
import { useAuth } from './AuthContext'

const subjects = [
  { name: 'Mathematics', icon: 'calculate' },
  { name: 'Science', icon: 'science' },
  { name: 'Languages', icon: 'translate' },
  { name: 'Music', icon: 'music_note' },
  { name: 'Art', icon: 'palette' },
  { name: 'Coding', icon: 'code' },
]

const tutors = [
  {
    id: 1,
    name: 'Dr. Sarah Jenkins',
    subjects: ['Advanced Mathematics', 'Physics'],
    rating: 4.9,
    reviews: 120,
    rate: 45,
    description:
      'Experienced university professor specializing in making complex mathematical concepts accessible to all levels.',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAei6flyccoubtUkB2-JJhNfR9B-0SJqPfzmsGbxbjo0bwiIVbwttMeDMBINgJ5UBkNdaUIYVbXBh1wlNtftafnZqAUsknNmqfA8lgHYXmRibrLQLDDswAcDKaWexFiCJ0F5lYIqta06gn9UkHf9Yo6UEX6YY0zrRfLCox5fQYJGFjFtxYkapQrfLw5EWLC5MzcrAxy7Y4f4YlIDMNhd-wcULt1NSUWpDYZIjFGp0eSYw54W6Gk7zh3ebHETXHFVRvZ1FMlOY8uTcI',
  },
  {
    id: 2,
    name: 'David Chen',
    subjects: ['Computer Science', 'Python'],
    rating: 5.0,
    reviews: 89,
    rate: 50,
    description:
      'Former software engineer turned passionate educator, helping students build real-world coding skills.',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAqjwfwD85os_xcrUS6mBaT3L9cLxt_GyvK4DrMZMLL_ViTjYA5rM6aoXYoL153K1rXR10VvfnP00wQJRxBpqD8TtAgijnGQGepu7QT71lFgb-v8Mk9s7Zt0KvvSFlhluT9IML0DnyfosJYvm7BtNA6LhucaITW7Bsfpe13JhVa-0jbAy7f8B8UF7nNc8Vl8EyLjDJLmgkalntGMfzg8RN8YIzbxdlzDAHRB0kaNsi9K8_KvcbpfhL2gU_yw96vMEOsLznkPRny_Dk',
  },
  {
    id: 3,
    name: 'Elena Rodriguez',
    subjects: ['Spanish', 'Literature'],
    rating: 4.8,
    reviews: 203,
    rate: 35,
    description:
      'Native speaker offering immersive language lessons tailored to your individual learning pace and goals.',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCRPJ_nedKK76hx96Ioc925HajYJQrzRqKLk3-69yfy23Xp44nYiq2sidEe7r8Nc_XQitfR1vzCrnh9xpx05P_1zY2dgchQEncPRuiqThxZaV_qsRdGyL3NHOoTOBgsQM2wIO7EUWFuPmIQRIixXTJOXDPWyAbH50Hq9ljZxjUJLibVBmmhwTX4eSFXNwOjgXWJiK2DHUtYd0noMdDuglxTsYdwBnOKZUw2ti3RjsJTGH21zphbEicxrYLvzmsZETqsJYJs8BEDMgk',
  },
  {
    id: 4,
    name: 'James Wilson',
    subjects: ['Chemistry', 'Biology'],
    rating: 4.7,
    reviews: 92,
    rate: 40,
    description:
      'Dedicated science tutor focused on developing strong foundational understanding and critical thinking.',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDrbKTdRT8Kzgeb-fbmF1apykCqp-cDYVBmdeGP1NTKEm3OxFcXsoOeajBIr3osh_BwXPaW5vJSWueBaT866ZFbIJlaZy2-n3PE5ESBtwnzJu1cU-svmk7wSLbE8T1LVaX8q-DR0_VdCm1Y7lDn8hYECkyZ37CuP3RDScRP1JCiSLirfyS4LF-8i5zFX2-tE5kb0K7Z6zPzjzw88GBnmrEPUNAwZA75pgLwpqNxVFTbe6vCee5dkoPSyM4EY0wYMdZS9y_ELU2gV24',
  },
]

const footerLinks = {
  platform: ['Find Tutors', 'Become a Tutor', 'Subjects'],
  company: ['About Us', 'Support', 'Privacy Policy'],
}

// ─── Helper: parse the hash to get the current route ─────────────────────────
const getRouteFromHash = () => {
  let normalized = window.location.hash.replace(/^#/, '') || '/'
  // remove trailing slash if exists
  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1)
  }
  if (normalized === '/signin')    return 'signin'
  if (normalized === '/signup')    return 'signup'
  if (normalized === '/admin')     return 'admin'
  if (normalized === '/dashboard') return 'dashboard'   // Student Dashboard
  if (normalized === '/tutor')     return 'tutor'       // Tutor Dashboard
  if (normalized === '/parent')    return 'parent'      // Parent Dashboard
  if (normalized === '/my-courses' || normalized.startsWith('/my-courses')) return 'mycourses'  // My Courses
  if (normalized.startsWith('/course/')) return 'coursedetail'  // Course Detail
  return 'home'
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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
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
            <div className="header-user" style={{ position: 'relative' }} ref={dropdownRef}>
              <div 
                style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '8px' }}
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
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
                <span style={{ fontSize: '0.8em' }}>▼</span>
              </div>
              
              {isDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '8px',
                  backgroundColor: 'var(--surface, #fff)',
                  border: '1px solid var(--outline-variant, #ccc)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  minWidth: '150px',
                  zIndex: 1000,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden'
                }}>
                  <a href="#/dashboard" style={{ padding: '12px 16px', color: 'var(--on-surface, #333)', textDecoration: 'none', borderBottom: '1px solid var(--surface-variant, #eee)' }}>Dashboard</a>
                  <a href="#/my-courses" style={{ padding: '12px 16px', color: 'var(--on-surface, #333)', textDecoration: 'none', borderBottom: '1px solid var(--surface-variant, #eee)' }}>My Courses</a>
                  <a href="#" style={{ padding: '12px 16px', color: 'var(--on-surface, #333)', textDecoration: 'none', borderBottom: '1px solid var(--surface-variant, #eee)' }}>Settings</a>
                  <button 
                    onClick={logout} 
                    style={{ padding: '12px 16px', color: 'var(--error, #d32f2f)', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', width: '100%', fontSize: 'inherit', fontFamily: 'inherit' }}
                  >
                    Logout
                  </button>
                </div>
              )}
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
              <button type="button" className="btn btn-primary search-button">
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
              {tutors.map((tutor) => (
                <article className="tutor-card" key={tutor.id}>
                  <div className="tutor-top">
                    <img src={tutor.avatar} alt={tutor.name} loading="lazy" />
                    <div>
                      <h3>{tutor.name}</h3>
                      <p className="rating">
                        <span className="material-symbols-outlined star icon-fill">
                          star
                        </span>
                        <span>{tutor.rating}</span>
                        <small>({tutor.reviews} reviews)</small>
                      </p>
                    </div>
                  </div>

                  <div className="chip-wrap">
                    {tutor.subjects.map((subject) => (
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
                    <button type="button" className="btn btn-outline">
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

// ─── Root App component ───────────────────────────────────────────────────────
function App() {
  const { user } = useAuth()
  const [route, setRoute] = useState(() => getRouteFromHash())

  useEffect(() => {
    const handleHashChange = () => setRoute(getRouteFromHash())
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const navigateTo = (nextRoute) => {
    if (nextRoute === 'signin')    { window.location.hash = '/signin';    return }
    if (nextRoute === 'signup')    { window.location.hash = '/signup';    return }
    if (nextRoute === 'admin')     { window.location.hash = '/admin';     return }
    if (nextRoute === 'dashboard') { window.location.hash = '/dashboard'; return }
    if (nextRoute === 'mycourses') { window.location.hash = '/my-courses'; return }
    if (nextRoute === 'coursedetail') { window.location.hash = '/course/1'; return }
    if (nextRoute === 'tutor')     { window.location.hash = '/tutor';     return }
    if (nextRoute === 'parent')    { window.location.hash = '/parent';    return }
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

  // ── Route: My Courses (protected) ──
  if (route === 'mycourses') {
    if (!user) {
      return (
        <AccessDenied
          isLoggedIn={false}
          onGoSignIn={() => navigateTo('signin')}
        />
      )
    }
    return <MyCourses />
  }

  // ── Route: Course Detail (protected) ──
  if (route === 'coursedetail') {
    if (!user) {
      return (
        <AccessDenied
          isLoggedIn={false}
          onGoSignIn={() => navigateTo('signin')}
        />
      )
    }
    return <CourseDetail />
  }

  // ── Route: Home ──
  return <HomePage onGoSignIn={() => navigateTo('signin')} />
}

export default App
