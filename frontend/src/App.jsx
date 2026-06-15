/**
 * App.jsx
 * Main application shell — handles hash-based routing and renders the correct page.
 */
import { useEffect, useState, useRef } from 'react'
import './App.css'
import SignIn from './SignIn'
import SignUp from './SignUp'
import AdminDashboard from './AdminDashboard'
import StudentDashboard from './StudentDashboard'
import TutorDashboard from './TutorDashboard'
import ParentDashboard from './ParentDashboard'
import MyCourses from './pages/MyCourses'
import CourseDetail from './pages/CourseDetail'
import QuizTaking from './QuizTaking'
import QuizResult from './QuizResult'
import TutorProfileForm from './TutorProfileForm'
import FindTutorsPage from './FindTutorsPage'
import SubjectsPage from './SubjectsPage'
import BecomeTutorPage from './BecomeTutorPage'
import TutorProfile from './pages/TutorProfile'
import { useAuth } from './AuthContext'

const subjects = [
  { name: 'Toán Học', icon: 'calculate' },
  { name: 'Khoa Học', icon: 'science' },
  { name: 'Ngôn Ngữ', icon: 'translate' },
  { name: 'Âm Nhạc', icon: 'music_note' },
  { name: 'Nghệ Thuật', icon: 'palette' },
  { name: 'Lập Trình', icon: 'code' },
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
  platform: [
    { label: 'Tìm Gia Sư', href: '#/find-tutors' },
    { label: 'Trở Thành Gia Sư', href: '#/become-tutor' },
    { label: 'Môn Học', href: '#/subjects' }
  ],
  company: [
    { label: 'Về Chúng Tôi', href: '#' },
    { label: 'Hỗ Trợ', href: '#' },
    { label: 'Chính Sách Bảo Mật', href: '#' }
  ],
}

// ─── Helper: parse the hash to get the current route ─────────────────────────
const getRouteFromHash = () => {

  let normalized = window.location.hash.replace(/^#/, '') || '/'
  normalized = normalized.split('?')[0]
  if (normalized === '/signin')    return { name: 'signin' }
  if (normalized === '/signup')    return { name: 'signup' }
  if (normalized === '/admin')     return { name: 'admin' }
  if (normalized.startsWith('/dashboard')) return { name: 'dashboard' }
  if (normalized === '/tutor')     return { name: 'tutor' }
  if (normalized === '/tutor-profile') return { name: 'tutor-profile' }

  const tutorDetailMatch = normalized.match(/^\/tutor-detail\/([^/]+)$/)
  if (tutorDetailMatch) return { name: 'tutor-detail', id: tutorDetailMatch[1] }
  if (normalized === '/parent')    return { name: 'parent' }
  if (normalized === '/find-tutors') return { name: 'find-tutors' }
  if (normalized === '/subjects')  return { name: 'subjects' }
  if (normalized === '/become-tutor') return { name: 'become-tutor' }
  if (normalized.startsWith('/my-courses')) return { name: 'mycourses' }
  if (normalized.startsWith('/course/')) return { name: 'coursedetail', id: normalized.replace('/course/', '') }

  const quizMatch = normalized.match(/^\/quiz\/([^/]+)$/)
  if (quizMatch) return { name: 'quiz', id: quizMatch[1] }

  const resultMatch = normalized.match(/^\/quiz-result\/([^/]+)$/)
  if (resultMatch) return { name: 'quiz-result', id: resultMatch[1] }

  const practiceQuizMatch = normalized.match(/^\/practice-quiz\/([^/]+)$/)
  if (practiceQuizMatch) return { name: 'practice-quiz', id: practiceQuizMatch[1] }

  const practiceResultMatch = normalized.match(/^\/practice-result\/([^/]+)$/)
  if (practiceResultMatch) return { name: 'practice-result', id: practiceResultMatch[1] }

  const examMatch = normalized.match(/^\/exam-quiz\/([^/]+)$/)
  if (examMatch) return { name: 'exam-quiz', id: examMatch[1] }

  const examResultMatch = normalized.match(/^\/exam-result\/([^/]+)$/)
  if (examResultMatch) return { name: 'exam-result', id: examResultMatch[1] }

  return { name: 'home' }
}

// ─── Access Denied page (shown to non-admin users who visit #/admin) ──────────
function AccessDenied({ isLoggedIn, onGoSignIn }) {
  return (
    <div className="academia-page">
      <div className="access-denied-wrap">
        <span className="material-symbols-outlined access-denied-icon">lock</span>
        <h1 className="access-denied-title">Truy Cập Bị Từ Chối</h1>
        {isLoggedIn ? (
          <p className="access-denied-msg">
            Bạn không có quyền quản trị viên để xem trang này.
          </p>
        ) : (
          <p className="access-denied-msg">
            Vui lòng đăng nhập với tư cách quản trị viên để truy cập trang này.
          </p>
        )}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="#/" className="btn btn-outline">← Quay Lại Trang Chủ</a>
          {!isLoggedIn && (
            <button className="btn btn-primary" onClick={onGoSignIn}>Đăng Nhập</button>
          )}
        </div>
      </div>
    </div>
  )
}

const feedbackData = [
  {
    id: 1,
    initials: 'LM', bgColor: 'bg-[#d4e3ff]', textColor: 'text-[#003564]',
    name: 'Liam Miller', role: 'Học Sinh', time: '2 phút trước', pulse: true,
    subject: 'Calculus II',
    content: `"Sarah thật sự là cứu tinh! Tôi đã gặp khó khăn với các phương pháp tích phân, nhưng cách hướng dẫn từng bước của cô ấy đã giúp mọi thứ trở nên rõ ràng. Rất khuyến khích!"`
  },
  {
    id: 2,
    initials: 'AP', bgColor: 'bg-[#e2e2e2]', textColor: 'text-[#5d5f5f]',
    name: 'Alice Porter', role: 'Phụ Huynh', time: '15 phút trước', pulse: false,
    subject: 'Luyện Thi SAT',
    content: `"Điểm số của con gái tôi đã tăng 200 điểm chỉ trong hai tháng. David rất chuyên nghiệp, nhiệt tình và am hiểu kiến thức."`
  },
  {
    id: 3,
    initials: 'JK', bgColor: 'bg-[#dde1ff]', textColor: 'text-[#00288e]',
    name: 'Julian Kim', role: 'Học Sinh', time: 'Vừa xong', pulse: true,
    subject: 'Python Cơ Bản',
    content: `"Các bài tập lập trình rất hay. Tôi đã đi từ con số không đến việc tự xây dựng web scraper đầu tiên trong 4 tuần. Đây là khoản đầu tư tốt nhất cho sự nghiệp của tôi!"`
  },
  {
    id: 4,
    initials: 'SB', bgColor: 'bg-[#a4c9ff]', textColor: 'text-[#003564]',
    name: 'Sonia Brown', role: 'Học Sinh', time: '1 giờ trước', pulse: false,
    subject: 'Tiếng Tây Ban Nha B1',
    content: `"Elena là một người nói chuyện tuyệt vời. Sự tự tin khi giao tiếp của tôi đã tăng vọt. ¡Muchas gracias!"`
  }
];
// ─── Home Page ────────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

function formatTimeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60)   return 'Vừa xong'
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`
  return `${Math.floor(diff / 86400)} ngày trước`
}

function HomePage({ onGoSignIn }) {
  const { user, logout } = useAuth()
  const [topic, setTopic] = useState('')
  const [place, setPlace] = useState('')
  const [liveReviews, setLiveReviews] = useState([])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    fetch(`${API_BASE}/api/reviews/featured?limit=12`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (Array.isArray(data) && data.length > 0) setLiveReviews(data) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const reviewsToShow = liveReviews.length > 0 ? liveReviews : feedbackData
  const displayFeedbackLive = [...reviewsToShow, ...reviewsToShow]

  return (
    <div className="academia-page">
      <header className="site-header">
        <div className="container header-inner">
          <a href="#/" className="brand">
            <span className="material-symbols-outlined icon-fill">school</span>
            <span className="brand-name">EduX</span>
          </a>

          <nav className="header-nav">
            <a href="#/find-tutors">Tìm Gia Sư</a>
            <a href="#/become-tutor">Trở Thành Gia Sư</a>
            <a href="#/subjects">Môn Học</a>
            {/* Show Admin link if user is admin */}
            {user?.role === 'admin' && (
              <a href="#/admin" style={{ color: 'var(--primary)', fontWeight: 700 }}>
                Quản Trị Viên
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
              Đăng Nhập
            </button>
          )}
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-overlay" />
          <div className="container hero-content">
            <h1>Tìm gia sư hoàn hảo cho hành trình học tập của bạn</h1>
            <p>
              Các nhà giáo dục chuyên nghiệp sẵn sàng giúp bạn nắm vững các môn học mới
              và đạt được mục tiêu học tập của bạn.
            </p>
            <div className="search-panel">
              <label className="search-field">
                <span className="material-symbols-outlined">search</span>
                <input
                  type="text"
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  placeholder="Bạn muốn học gì?"
                />
              </label>
              <label className="search-field">
                <span className="material-symbols-outlined">location_on</span>
                <input
                  type="text"
                  value={place}
                  onChange={(event) => setPlace(event.target.value)}
                  placeholder="Học trực tuyến hay tại địa điểm cụ thể?"
                />
              </label>
              <button type="button" className="btn btn-primary search-button">
                Tìm Kiếm
              </button>
            </div>
          </div>
        </section>

        <section className="section section-subjects">
          <div className="container">
            <h2>Môn Học Phổ Biến</h2>
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
              <h2>Gia Sư Nổi Bật</h2>
              <a href="#" className="see-all">
                Xem tất cả
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
                        <small>({tutor.reviews} nhận xét)</small>
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
                      <span>/giờ</span>
                    </p>
                    <button type="button" className="btn btn-outline">
                      Xem Hồ Sơ
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Feedback Section */}
        <section className="py-20 mt-10 bg-[#f8f9fb] relative overflow-hidden">
          <style>{`
            .shadow-level-2 { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.08); }
            .glass-card {
                background: rgba(255, 255, 255, 0.7);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                border: 1px solid rgba(255, 255, 255, 0.4);
            }
            @keyframes scroll {
                0% { transform: translateX(0); }
                100% { transform: translateX(calc(-380px * 4 - 24px * 4)); }
            }
            .scroll-container {
                display: flex;
                width: max-content;
                animation: scroll 40s linear infinite;
            }
            .scroll-container:hover {
                animation-play-state: paused;
            }
          `}</style>
          <div className="max-w-[1280px] mx-auto px-6 mb-10">
            <h2 className="text-3xl font-bold text-[#191c1e]">Cộng đồng chúng tôi nói gì</h2>
            <p className="text-[#444653] mt-2">Trải nghiệm thực tế từ học sinh và phụ huynh trên toàn thế giới.</p>
          </div>
          <div className="relative w-full overflow-hidden h-64 flex items-center">
            {/* Scroller Content */}
            <div className="scroll-container gap-6 px-6">
              {displayFeedbackLive.map((fb, idx) => {
                // Hỗ trợ cả format DB (reviewer_name) lẫn format mock cũ (name)
                const name    = fb.reviewer_name || fb.name || ''
                const role    = fb.reviewer_role || fb.role || 'student'
                const picture = fb.user_picture || fb.reviewer_picture || null
                const initials = fb.initials || name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
                const subject = fb.subject || ''
                const content = fb.content || ''
                const roleLabel = role === 'parent' ? 'Phụ Huynh' : role === 'tutor' ? 'Gia Sư' : 'Học Sinh'
                const timeLabel = fb.time || formatTimeAgo(fb.created_at)
                const avatarColors = [
                  ['bg-[#d4e3ff]','text-[#003564]'], ['bg-[#e2e2e2]','text-[#5d5f5f]'],
                  ['bg-[#dde1ff]','text-[#00288e]'], ['bg-[#a4c9ff]','text-[#003564]'],
                  ['bg-[#fce7f3]','text-[#7c3aed]'], ['bg-[#dcfce7]','text-[#15803d]'],
                ]
                const [bgColor, textColor] = avatarColors[idx % avatarColors.length]
                return (
                  <div key={`${fb.id || idx}-${idx}`} className="glass-card w-[380px] p-6 rounded-xl shadow-level-2 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {picture ? (
                          <img src={picture} alt={name} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className={`w-10 h-10 rounded-full ${bgColor} ${textColor} flex items-center justify-center font-bold text-sm`}>
                            {initials}
                          </div>
                        )}
                        <div>
                          <h4 className="font-semibold text-[#191c1e] leading-tight">{name}</h4>
                          <span className="text-xs font-medium text-[#444653]">{roleLabel}</span>
                        </div>
                      </div>
                      <span className="text-[11px] font-medium px-2 py-1 bg-[#c4c5d5]/30 text-[#444653] rounded-full">
                        {timeLabel}
                      </span>
                    </div>
                    <div>
                      {subject && <span className="text-xs font-bold uppercase tracking-wider text-[#00288e]">Phản hồi đã xác minh cho {subject}</span>}
                      <div className="flex mt-1">
                        {[1,2,3,4,5].map(i => <span key={i} className="material-symbols-outlined text-[16px] text-[#f59e0b]" style={{fontVariationSettings: "'FILL' 1"}}>star</span>)}
                      </div>
                    </div>
                    <p className="text-[#444653] text-sm line-clamp-3">{content}</p>
                  </div>
                )
              })}
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
              Bản quyền 2024 EduX. Nâng tầm tri thức toàn cầu.
            </p>
          </div>
          <div>
            <h4>Nền Tảng</h4>
            <ul>
              {footerLinks.platform.map((item) => (
                <li key={item.label}>
                  <a href={item.href}>{item.label}</a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4>Công Ty</h4>
            <ul>
              {footerLinks.company.map((item) => (
                <li key={item.label}>
                  <a href={item.href}>{item.label}</a>
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
  const { user, token } = useAuth()
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
    if (nextRoute === 'tutor-profile') { window.location.hash = '/tutor-profile'; return }
    if (nextRoute === 'tutor-detail') { window.location.hash = '/tutor-detail'; return }
    if (nextRoute === 'parent')    { window.location.hash = '/parent';    return }
    window.location.hash = '/'
  }

  const routeName = route.name || route   // backward compat

  // ── Route: Sign In ──
  if (routeName === 'signin') {
    return <SignIn onSwitchToSignUp={() => navigateTo('signup')} onGoHome={() => navigateTo('home')} />
  }

  // ── Route: Sign Up ──
  if (routeName === 'signup') {
    return <SignUp onSwitchToSignIn={() => navigateTo('signin')} onGoHome={() => navigateTo('home')} />
  }

  // ── Route: Admin Dashboard ──
  if (routeName === 'admin') {
    if (!user) return <AccessDenied isLoggedIn={false} onGoSignIn={() => navigateTo('signin')} />
    if (user.role !== 'admin') return <AccessDenied isLoggedIn={true} />
    return <AdminDashboard />
  }

  // ── Route: Student Dashboard ──
  if (routeName === 'dashboard') {
    if (!user) return <AccessDenied isLoggedIn={false} onGoSignIn={() => navigateTo('signin')} />
    return <StudentDashboard />
  }

  // ── Route: Tutor Dashboard ──
  if (routeName === 'tutor') {
    if (!user) return <AccessDenied isLoggedIn={false} onGoSignIn={() => navigateTo('signin')} />
    return <TutorDashboard />
  }

  // ── Route: Parent Dashboard ──
  if (routeName === 'parent') {
    if (!user) return <AccessDenied isLoggedIn={false} onGoSignIn={() => navigateTo('signin')} />
    return <ParentDashboard />
  }

  // ── Route: Quiz Taking (formal quiz) ──
  if (routeName === 'quiz') {
    if (!user) return <AccessDenied isLoggedIn={false} onGoSignIn={() => navigateTo('signin')} />
    return <QuizTaking quizId={route.id} token={token} isPractice={false} />
  }

  // ── Route: Practice Quiz Taking ──
  if (routeName === 'practice-quiz') {
    if (!user) return <AccessDenied isLoggedIn={false} onGoSignIn={() => navigateTo('signin')} />
    return <QuizTaking
      isPractice={true}
      practiceSessionId={route.id}
      token={token}
    />
  }

  // ── Route: Quiz Result (formal) ──
  if (routeName === 'quiz-result') {
    if (!user) return <AccessDenied isLoggedIn={false} onGoSignIn={() => navigateTo('signin')} />
    return <QuizResult attemptId={route.id} token={token} isPractice={false} />
  }

  // ── Route: Practice Result ──
  if (routeName === 'practice-result') {
    if (!user) return <AccessDenied isLoggedIn={false} onGoSignIn={() => navigateTo('signin')} />
    return <QuizResult isPractice={true} sessionId={route.id} token={token} />
  }

  // ── Route: Exam Paper Taking ──
  if (routeName === 'exam-quiz') {
    if (!user) return <AccessDenied isLoggedIn={false} onGoSignIn={() => navigateTo('signin')} />
    return <QuizTaking
      isExamPaper={true}
      examPaperId={route.id}
      token={token}
    />
  }

  // ── Route: Exam Paper Result ──
  if (routeName === 'exam-result') {
    if (!user) return <AccessDenied isLoggedIn={false} onGoSignIn={() => navigateTo('signin')} />
    return <QuizResult isExamPaper={true} attemptId={route.id} token={token} />
  }

  // ── Route: Tutor Profile (protected) ──
  if (routeName === 'tutor-profile') {
    const hasPendingReg = !!sessionStorage.getItem('pendingTutorReg')
    // Cho phép truy cập nếu: đã đăng nhập (tutor cũ) HOẶC đang trong luồng đăng ký mới
    if (!user && !hasPendingReg) {
      return (
        <AccessDenied
          isLoggedIn={false}
          onGoSignIn={() => navigateTo('signin')}
        />
      )
    }
    return (
      <div className="bg-background min-h-screen flex flex-col">
        <header className="bg-surface-container-lowest shadow-sm sticky top-0 z-50">
          <div className="flex justify-between items-center w-full px-6 md:px-10 max-w-[1280px] mx-auto h-16">
            <div className="font-bold text-2xl text-primary tracking-tight">EduX</div>
            {user && !hasPendingReg && (
              <button
                onClick={() => window.location.hash = '/tutor'}
                className="text-on-surface-variant font-semibold text-sm hover:bg-surface-container px-3 py-2 rounded-lg transition-all duration-200"
              >
                ← Quay Lại Bảng Điều Khiển
              </button>
            )}
          </div>
        </header>
        <TutorProfileForm />
        <footer className="bg-surface-container-lowest border-t border-outline-variant mt-auto">
          <div className="w-full py-6 px-10 flex flex-col md:flex-row justify-between items-center max-w-[1280px] mx-auto gap-4">
            <span className="text-xs text-on-secondary-container">© 2024 EduX. Hỗ Trợ Học Thuật Chuyên Nghiệp.</span>
            <div className="flex gap-6">
              <a className="text-xs text-on-secondary-container hover:text-primary transition-colors" href="#">Hỗ Trợ</a>
              <a className="text-xs text-on-secondary-container hover:text-primary transition-colors" href="#">Chính Sách Bảo Mật</a>
              <a className="text-xs text-on-secondary-container hover:text-primary transition-colors" href="#">Liên Hệ</a>
            </div>
          </div>
        </footer>
      </div>
    )
  }

  // ── Route: Public Pages ──
  if (routeName === 'find-tutors') {
    return <FindTutorsPage onGoSignIn={() => navigateTo('signin')} onGoSignUp={() => navigateTo('signup')} user={user} />
  }
  if (routeName === 'subjects') {
    return <SubjectsPage onGoSignIn={() => navigateTo('signin')} onGoSignUp={() => navigateTo('signup')} user={user} />
  }
  if (routeName === 'become-tutor') {
    return <BecomeTutorPage onGoSignIn={() => navigateTo('signin')} onGoSignUp={() => navigateTo('signup')} user={user} />
  }

  // ── Route: Tutor Detail Page ──
  if (routeName === 'tutor-detail') {
    return <TutorProfile tutorId={route.id} onGoSignIn={() => navigateTo('signin')} onGoSignUp={() => navigateTo('signup')} user={user} />
  }

  // ── Route: My Courses (protected) ──
  if (routeName === 'mycourses') {
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
  if (routeName === 'coursedetail') {
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

