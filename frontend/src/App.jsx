/**
 * App.jsx
 * Main application shell — handles hash-based routing and renders the correct page.
 */
import { useEffect, useState, useRef } from 'react'
import './App.css'
import { methodSupport } from './utils/teachingMethod'
import SignIn from './SignIn'
import SignUp from './SignUp'
import AdminDashboard from './AdminDashboard'
import StudentDashboard from './StudentDashboard'
import TutorDashboard from './TutorDashboard'
import ParentDashboard from './ParentDashboard'
import MyCourses from './pages/MyCourses'
import CourseDetail from './pages/CourseDetail'
import CoursePlayer from './pages/CoursePlayer'
import QuizTaking from './QuizTaking'
import QuizResult from './QuizResult'
import TutorProfileForm from './TutorProfileForm'
import FindTutorsPage from './FindTutorsPage'
import CoursesPage from './CoursesPage'
import SubjectsPage from './SubjectsPage'
import THPTSubjectsPage from './THPTSubjectsPage'
import TieuHocSubjectsPage from './TieuHocSubjectsPage'
import THCSSubjectsPage from './THCSSubjectsPage'
import BecomeTutorPage from './BecomeTutorPage'
import TutorProfile from './pages/TutorProfile'
import FindTutorRequest from './pages/FindTutorRequest'
import TutorMatchesPage from './pages/TutorMatchesPage'
import CourseMarketplace from './pages/CourseMarketplace'
import BookingCalendar from './pages/BookingCalendar'
import PaymentResult from './pages/PaymentResult'
import CartPage from './pages/CartPage'
import CompleteStudentProfile from './pages/CompleteStudentProfile'
import MyAiCases from './pages/MyAiCases'
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
    subjects: ['Toán học nâng cao', 'Vật lý'],
    rating: 4.9,
    reviews: 120,
    rate: 45,
    description:
      'Giáo sư đại học giàu kinh nghiệm, chuyên giúp sinh viên ở mọi trình độ tiếp cận các khái niệm toán học phức tạp một cách dễ hiểu.',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAei6flyccoubtUkB2-JJhNfR9B-0SJqPfzmsGbxbjo0bwiIVbwttMeDMBINgJ5UBkNdaUIYVbXBh1wlNtftafnZqAUsknNmqfA8lgHYXmRibrLQLDDswAcDKaWexFiCJ0F5lYIqta06gn9UkHf9Yo6UEX6YY0zrRfLCox5fQYJGFjFtxYkapQrfLw5EWLC5MzcrAxy7Y4f4YlIDMNhd-wcULt1NSUWpDYZIjFGp0eSYw54W6Gk7zh3ebHETXHFVRvZ1FMlOY8uTcI',
  },
  {
    id: 2,
    name: 'David Chen',
    subjects: ['Khoa học Máy tính', 'Python'],
    rating: 5.0,
    reviews: 89,
    rate: 50,
    description:
      'Cựu kỹ sư phần mềm trở thành nhà giáo dục đầy nhiệt huyết, giúp học sinh xây dựng kỹ năng lập trình thực tế.',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAqjwfwD85os_xcrUS6mBaT3L9cLxt_GyvK4DrMZMLL_ViTjYA5rM6aoXYoL153K1rXR10VvfnP00wQJRxBpqD8TtAgijnGQGepu7QT71lFgb-v8Mk9s7Zt0KvvSFlhluT9IML0DnyfosJYvm7BtNA6LhucaITW7Bsfpe13JhVa-0jbAy7f8B8UF7nNc8Vl8EyLjDJLmgkalntGMfzg8RN8YIzbxdlzDAHRB0kaNsi9K8_KvcbpfhL2gU_yw96vMEOsLznkPRny_Dk',
  },
  {
    id: 3,
    name: 'Elena Rodriguez',
    subjects: ['Tiếng Tây Ban Nha', 'Văn học'],
    rating: 4.8,
    reviews: 203,
    rate: 35,
    description:
      'Người bản xứ cung cấp các bài học ngôn ngữ sống động phù hợp với tốc độ và mục tiêu học tập cá nhân của bạn.',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCRPJ_nedKK76hx96Ioc925HajYJQrzRqKLk3-69yfy23Xp44nYiq2sidEe7r8Nc_XQitfR1vzCrnh9xpx05P_1zY2dgchQEncPRuiqThxZaV_qsRdGyL3NHOoTOBgsQM2wIO7EUWFuPmIQRIixXTJOXDPWyAbH50Hq9ljZxjUJLibVBmmhwTX4eSFXNwOjgXWJiK2DHUtYd0noMdDuglxTsYdwBnOKZUw2ti3RjsJTGH21zphbEicxrYLvzmsZETqsJYJs8BEDMgk',
  },
  {
    id: 4,
    name: 'James Wilson',
    subjects: ['Hóa học', 'Sinh học'],
    rating: 4.7,
    reviews: 92,
    rate: 40,
    description:
      'Gia sư khoa học tận tâm tập trung vào việc phát triển nền tảng hiểu biết vững chắc và tư duy phản biện.',
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
  if (normalized === '/complete-student-profile') return { name: 'complete-student-profile' }
  if (normalized === '/my-ai-cases') return { name: 'my-ai-cases' }
  if (normalized === '/cart')      return { name: 'cart' }

  const tutorDetailMatch = normalized.match(/^\/tutor-detail\/([^/]+)$/)
  const bookingMatch = normalized.match(/^\/booking\/([^/]+)$/)
  const coursePlayerMatch = normalized.match(/^\/course-player\/([^/]+)$/)
  if (coursePlayerMatch) return { name: 'courseplayer', id: coursePlayerMatch[1] }
  if (bookingMatch) return { name: 'booking', id: bookingMatch[1] }
  if (tutorDetailMatch) return { name: 'tutor-detail', id: tutorDetailMatch[1] }
  if (normalized === '/parent')    return { name: 'parent' }
  if (normalized === '/find-tutors') return { name: 'find-tutors' }
  if (normalized === '/subjects')  return { name: 'subjects' }
  if (normalized === '/subjects/thpt') return { name: 'thpt-subjects' }
  if (normalized === '/subjects/tieu-hoc') return { name: 'tieu-hoc-subjects' }
  if (normalized === '/subjects/thcs') return { name: 'thcs-subjects' }
  if (normalized === '/become-tutor') return { name: 'become-tutor' }
  if (normalized === '/courses') return { name: 'courses' }
  if (normalized === '/tutor-request') return { name: 'tutor-request' }
  if (normalized === '/tutor-matches') return { name: 'tutor-matches' }
  if (normalized.startsWith('/payment/result')) return { name: 'payment-result' }
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

  const tutorExamMatch = normalized.match(/^\/tutor-exam\/([^/]+)$/)
  if (tutorExamMatch) return { name: 'tutor-exam', id: tutorExamMatch[1] }

  const tutorResultMatch = normalized.match(/^\/tutor-exam-result\/([^/]+)$/)
  if (tutorResultMatch) return { name: 'tutor-exam-result', id: tutorResultMatch[1] }

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

// Giá/giờ: >=1000 coi là VND, <1000 là data test USD cũ, 0/null = thỏa thuận
function fmtHourlyRate(val) {
  const n = Number(val)
  if (!n) return 'Thỏa thuận'
  if (n >= 1000) return new Intl.NumberFormat('vi-VN').format(n) + 'đ'
  return `$${n}`
}

// Map 1 dòng gia sư từ /api/tutors → shape mà card "Gia Sư Nổi Bật" cần
function mapApiTutor(t) {
  return {
    id: t.id,
    name: t.full_name,
    subjects: t.subjects ? t.subjects.split(',').map(s => s.trim()).filter(Boolean).slice(0, 3) : [],
    rating: Number(t.avg_r || 0).toFixed(1),
    reviews: t.review_count || 0,
    rate: t.hourly_rate || 0,
    methods: Array.isArray(t.teaching_methods) ? t.teaching_methods : [],
    description: t.bio || '',
    avatar: t.profile_photo_url || t.picture
      || `https://ui-avatars.com/api/?name=${encodeURIComponent(t.full_name || 'Tutor')}&background=00288e&color=fff&size=128`,
    _raw: t,
  }
}

function HomePage({ onGoSignIn }) {
  const { user, logout } = useAuth()
  const [topic, setTopic] = useState('')
  const [place, setPlace] = useState('')
  const [liveReviews, setLiveReviews] = useState([])
  const [featuredTutors, setFeaturedTutors] = useState([])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    fetch(`${API_BASE}/api/reviews/featured?limit=12`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (Array.isArray(data) && data.length > 0) setLiveReviews(data) })
      .catch(() => {})
  }, [])

  // Gia sư nổi bật: lấy top theo đánh giá từ DB thật (TV3)
  useEffect(() => {
    fetch(`${API_BASE}/api/tutors?sort=rating&limit=4`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const rows = data && Array.isArray(data.tutors) ? data.tutors : []
        if (rows.length > 0) setFeaturedTutors(rows.map(mapApiTutor))
      })
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

  // Hiệu ứng xuất hiện khi cuộn tới (fade + slide up, stagger cho grid).
  // Dùng scroll + getBoundingClientRect thay vì IntersectionObserver để
  // chạy được cả trong webview/iframe không phát intersection event.
  useEffect(() => {
    const els = Array.from(document.querySelectorAll('.reveal'))
    if (els.length === 0) return
    // Check trực tiếp (không rAF — rAF bị throttle trong webview/tab nền)
    const check = () => {
      const vh = window.innerHeight
      els.forEach(el => {
        if (el.classList.contains('is-visible')) return
        if (el.getBoundingClientRect().top < vh - 60) el.classList.add('is-visible')
      })
    }
    check() // hiện ngay những phần đã nằm trong viewport khi tải trang
    // Check lại sau khi data async (gia sư nổi bật, review) về làm đổi layout
    const t1 = setTimeout(check, 600)
    const t2 = setTimeout(check, 1800)
    window.addEventListener('scroll', check, { passive: true })
    window.addEventListener('resize', check)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      window.removeEventListener('scroll', check)
      window.removeEventListener('resize', check)
    }
  }, [])

  const reviewsToShow = liveReviews.length > 0 ? liveReviews : feedbackData
  const displayFeedbackLive = [...reviewsToShow, ...reviewsToShow]
  const featuredToShow = featuredTutors.length > 0 ? featuredTutors : tutors

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
            <a href="#/courses">Khóa Học</a>
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
                  <a href="#/dashboard" style={{ padding: '12px 16px', color: 'var(--on-surface, #333)', textDecoration: 'none', borderBottom: '1px solid var(--surface-variant, #eee)' }}>Bảng điều khiển</a>
                  {user.role === 'student' && (
                    <a href="#/my-courses" style={{ padding: '12px 16px', color: 'var(--on-surface, #333)', textDecoration: 'none', borderBottom: '1px solid var(--surface-variant, #eee)' }}>Khóa học của tôi</a>
                  )}
                  {(user.role === 'student' || user.role === 'tutor' || user.role === 'parent') && (
                    <a href="#/my-ai-cases" style={{ padding: '12px 16px', color: 'var(--on-surface, #333)', textDecoration: 'none', borderBottom: '1px solid var(--surface-variant, #eee)' }}>Khiếu nại &amp; AI</a>
                  )}
                  <a href="#" onClick={(e) => e.preventDefault()} style={{ padding: '12px 16px', color: 'var(--on-surface, #333)', textDecoration: 'none', borderBottom: '1px solid var(--surface-variant, #eee)' }}>Cài đặt</a>
                  <button 
                    onClick={logout} 
                    style={{ padding: '12px 16px', color: 'var(--error, #d32f2f)', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', width: '100%', fontSize: 'inherit', fontFamily: 'inherit' }}
                  >
                    Đăng xuất
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
          <div className="hero-glow-ring" aria-hidden="true" />
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
          <div className="hero-shine" aria-hidden="true" />

          {/* Thẻ kính nổi — phong cách sàn khóa học */}
          <div className="hero-stat hero-stat-1" aria-hidden="true">
            <div className="hero-stat-ico"><span className="material-symbols-outlined" style={{ fontSize: 20 }}>menu_book</span></div>
            <div><div className="hero-stat-num">12K+</div><div className="hero-stat-label">Khóa học</div></div>
          </div>
          <div className="hero-stat hero-stat-2" aria-hidden="true">
            <div className="hero-stat-ico"><span className="material-symbols-outlined" style={{ fontSize: 20 }}>groups</span></div>
            <div><div className="hero-stat-num">500+</div><div className="hero-stat-label">Giảng viên</div></div>
          </div>
          <div className="hero-stat hero-stat-3" aria-hidden="true">
            <div className="hero-stat-ico"><span className="material-symbols-outlined icon-fill" style={{ fontSize: 20 }}>star</span></div>
            <div><div className="hero-stat-num">4.9★</div><div className="hero-stat-label">Đánh giá</div></div>
          </div>

          <div className="container hero-content">
            <div className="hero-badge"><span className="hero-badge-dot" />Cộng đồng học tập hàng đầu Việt Nam</div>
            <h1>Tìm <span className="hero-highlight">gia sư &amp; khóa học</span> hoàn hảo cho hành trình học tập của bạn</h1>
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
                <select
                  value={place}
                  onChange={(event) => setPlace(event.target.value)}
                >
                  <option value="">Hình thức học (Tất cả)</option>
                  <option value="online">Học trực tuyến (Online)</option>
                  <option value="offline">Tại địa điểm cụ thể (Offline)</option>
                </select>
              </label>
              <button 
                type="button" 
                className="btn btn-primary search-button"
                onClick={() => {
                  window.location.hash = `/find-tutors?search=${encodeURIComponent(topic)}&method=${encodeURIComponent(place)}`;
                }}
              >
                Tìm Kiếm
              </button>
            </div>
            {/* AI Matching flow CTA - Premium Style for Home Hero */}
            <div className="mt-4 flex items-center justify-center relative z-10 w-full max-w-[800px] mx-auto pb-6">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 px-6 py-3 rounded-full flex flex-col sm:flex-row items-center gap-3 sm:gap-4 hover:bg-white/20 hover:shadow-[0_0_25px_rgba(255,255,255,0.3)] transition-all duration-300 shadow-[0_0_15px_rgba(0,0,0,0.1)] cursor-pointer" onClick={() => window.location.hash = '/tutor-request'}>
                <div className="flex items-center gap-2 text-white/90 text-sm font-medium">
                  <span className="material-symbols-outlined text-[#ffd166] text-[20px] animate-pulse">auto_awesome</span>
                  <span>Muốn được gợi ý gia sư phù hợp nhất?</span>
                </div>
                <div className="hidden sm:block w-[1px] h-4 bg-white/30"></div>
                <button
                  className="text-white font-bold text-sm flex items-center gap-1 group transition-colors"
                >
                  Tạo yêu cầu AI
                  <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform text-[#ffd166]">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="section section-subjects">
          <div className="container">
            <div className="reveal">
              <p className="section-eyebrow">Khám phá</p>
              <h2>Môn Học Phổ Biến</h2>
            </div>
            <div className="subject-grid reveal reveal-stagger">
              {subjects.map((item) => (
                <a href="#" onClick={(e) => e.preventDefault()} className="subject-card" key={item.name}>
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
            <div className="section-head reveal">
              <div>
                <p className="section-eyebrow">Đội ngũ hàng đầu</p>
                <h2>Gia Sư Nổi Bật</h2>
              </div>
              <a href="#/find-tutors" className="see-all">
                Xem tất cả
                <span className="material-symbols-outlined">arrow_forward</span>
              </a>
            </div>

            <div className="tutor-grid reveal reveal-stagger">
              {featuredToShow.map((tutor) => (
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
                    {(() => {
                      const ms = methodSupport(tutor.methods)
                      if (!ms.declared) return null
                      return (
                        <>
                          {ms.online && <span className="chip" style={{ background: '#e0f2fe', color: '#0369a1' }}>Online</span>}
                          {ms.offline && <span className="chip" style={{ background: '#dcfce7', color: '#15803d' }}>Offline</span>}
                        </>
                      )
                    })()}
                  </div>

                  <p className="desc">{tutor.description}</p>
                  <div className="tutor-foot">
                    {(() => {
                      const rate = fmtHourlyRate(tutor.rate)
                      return (
                        <p className="price">
                          <strong>{rate}</strong>
                          {rate !== 'Thỏa thuận' && <span>/giờ</span>}
                        </p>
                      )
                    })()}
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => {
                        if (tutor._raw) {
                          sessionStorage.setItem('viewingTutor', JSON.stringify(tutor._raw))
                          window.location.hash = `/tutor-detail/${tutor.id}`
                        } else {
                          window.location.hash = '/find-tutors'
                        }
                      }}
                    >
                      Xem Hồ Sơ
                      <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
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
          <div className="max-w-[1280px] mx-auto px-6 mb-10 reveal">
            <p className="section-eyebrow">Phản hồi thật</p>
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

        {/* CTA cuối trang */}
        <section className="section cta-band">
          <div className="container">
            <div className="cta-inner reveal">
              <span className="cta-glow cta-glow-1" aria-hidden="true" />
              <span className="cta-glow cta-glow-2" aria-hidden="true" />
              <div className="cta-copy">
                <h2>Sẵn sàng chinh phục mục tiêu học tập?</h2>
                <p>
                  Hàng trăm gia sư đã được xác minh đang chờ đồng hành cùng bạn —
                  buổi học đầu tiên có thể bắt đầu ngay tuần này.
                </p>
              </div>
              <div className="cta-actions">
                <button type="button" className="btn cta-btn-light" onClick={() => { window.location.hash = '/find-tutors' }}>
                  Tìm gia sư ngay
                  <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
                </button>
                <button type="button" className="btn cta-btn-ghost" onClick={() => { window.location.hash = '/become-tutor' }}>
                  Trở thành gia sư
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container footer-grid">
          <div>
            <a href="#" onClick={(e) => e.preventDefault()} className="brand">
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

  // ── Route: Dashboard ──
  if (routeName === 'dashboard') {
    if (!user) return <AccessDenied isLoggedIn={false} onGoSignIn={() => navigateTo('signin')} />
    if (user.role === 'admin') return <AdminDashboard />
    if (user.role === 'tutor') {
      if (user.tutor_status === 'pending' || user.tutor_status === 'rejected' || !user.tutor_status) {
        window.location.hash = '/tutor';
        return null;
      }
      return <TutorDashboard />
    }
    if (user.role === 'parent') return <ParentDashboard />
    return <StudentDashboard />
  }

  // ── Route: Tutor Dashboard ──
  if (routeName === 'tutor') {
    if (!user) return <AccessDenied isLoggedIn={false} onGoSignIn={() => navigateTo('signin')} />
    
    // Gia sư đang chờ duyệt
    if (user.role === 'tutor' && user.tutor_status === 'pending') {
      return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f0f4ff 0%, #e8f0fe 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ maxWidth: 520, width: '100%', background: 'white', borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)', padding: '40px 32px', textAlign: 'center' }}>
              <div style={{ width: 80, height: 80, background: 'rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 36 }}>
                ⏳
              </div>
              <h1 style={{ color: 'white', fontSize: 24, fontWeight: 700, margin: 0 }}>Hồ Sơ Đang Chờ Duyệt</h1>
              <p style={{ color: 'rgba(255,255,255,0.85)', marginTop: 8, fontSize: 15 }}>
                Cảm ơn bạn đã đăng ký làm gia sư tại EduX!
              </p>
            </div>
            {/* Body */}
            <div style={{ padding: '32px' }}>
              <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 12, padding: '16px 20px', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>📋</span>
                  <div>
                    <p style={{ fontWeight: 600, color: '#0369a1', margin: '0 0 4px' }}>Trạng thái: Đang chờ xét duyệt</p>
                    <p style={{ color: '#0c4a6e', fontSize: 14, margin: 0, lineHeight: 1.6 }}>
                      Hồ sơ của bạn đã được ghi nhận và đang trong hàng đợi xem xét. Quản trị viên sẽ xét duyệt trong <strong>3–5 ngày làm việc</strong>.
                    </p>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
                {[
                  { icon: '✅', text: 'Hồ sơ đã được nộp thành công' },
                  { icon: '🔍', text: 'Quản trị viên đang xem xét tài liệu của bạn' },
                  { icon: '📧', text: 'Bạn sẽ nhận email thông báo kết quả duyệt' },
                  { icon: '🚀', text: 'Sau khi được duyệt, bạn có thể bắt đầu dạy học' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f8fafc', borderRadius: 8, padding: '10px 14px' }}>
                    <span style={{ fontSize: 18 }}>{item.icon}</span>
                    <span style={{ color: '#374151', fontSize: 14 }}>{item.text}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => { window.location.hash = '/tutor-profile' }}
                  style={{ flex: 1, padding: '12px', borderRadius: 10, border: '2px solid #1e40af', background: 'white', color: '#1e40af', fontWeight: 600, cursor: 'pointer', fontSize: 14, transition: 'all 0.2s' }}
                  onMouseEnter={e => e.target.style.background = '#eff6ff'}
                  onMouseLeave={e => e.target.style.background = 'white'}
                >
                  Cập Nhật Hồ Sơ
                </button>
                <button
                  onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); window.location.hash = '/' }}
                  style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: '#1e40af', color: 'white', fontWeight: 600, cursor: 'pointer', fontSize: 14, transition: 'all 0.2s' }}
                  onMouseEnter={e => e.target.style.background = '#1d4ed8'}
                  onMouseLeave={e => e.target.style.background = '#1e40af'}
                >
                  Về Trang Chủ
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    }

    // Gia sư bị từ chối
    if (user.role === 'tutor' && user.tutor_status === 'rejected') {
      return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ maxWidth: 520, width: '100%', background: 'white', borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)', padding: '40px 32px', textAlign: 'center' }}>
              <div style={{ width: 80, height: 80, background: 'rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 36 }}>
                ❌
              </div>
              <h1 style={{ color: 'white', fontSize: 24, fontWeight: 700, margin: 0 }}>Hồ Sơ Bị Từ Chối</h1>
              <p style={{ color: 'rgba(255,255,255,0.85)', marginTop: 8, fontSize: 15 }}>Rất tiếc, hồ sơ của bạn chưa đáp ứng yêu cầu lần này.</p>
            </div>
            <div style={{ padding: '32px' }}>
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '16px 20px', marginBottom: 24 }}>
                <p style={{ fontWeight: 600, color: '#dc2626', margin: '0 0 4px' }}>Lý do từ chối:</p>
                <p style={{ color: '#7f1d1d', fontSize: 14, margin: 0 }}>Vui lòng cập nhật lại hồ sơ và nộp lại để được xem xét.</p>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => { window.location.hash = '/tutor-profile' }}
                  style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: '#dc2626', color: 'white', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
                >
                  Nộp Lại Hồ Sơ
                </button>
                <button
                  onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); window.location.hash = '/' }}
                  style={{ flex: 1, padding: '12px', borderRadius: 10, border: '2px solid #dc2626', background: 'white', color: '#dc2626', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
                >
                  Về Trang Chủ
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    }

    if (user.role !== 'tutor' && user.role !== 'admin') {
      return <AccessDenied isLoggedIn={true} />
    }
    
    if (user.role === 'tutor' && !user.tutor_status) {
      window.location.hash = '/tutor-profile';
      return null;
    }

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

  // ── Route: Tutor Exam Taking ──
  if (routeName === 'tutor-exam') {
    if (!user) return <AccessDenied isLoggedIn={false} onGoSignIn={() => navigateTo('signin')} />
    return <QuizTaking
      isTutorExam={true}
      tutorExamId={route.id}
      token={token}
    />
  }

  // ── Route: Exam Paper Result ──
  if (routeName === 'exam-result') {
    if (!user) return <AccessDenied isLoggedIn={false} onGoSignIn={() => navigateTo('signin')} />
    return <QuizResult isExamPaper={true} attemptId={route.id} token={token} />
  }

  // ── Route: Tutor Exam Result ──
  if (routeName === 'tutor-exam-result') {
    if (!user) return <AccessDenied isLoggedIn={false} onGoSignIn={() => navigateTo('signin')} />
    return <QuizResult isTutorExam={true} tutorExamId={route.id} token={token} />
  }

  // ── Route: Tutor Profile (protected) ──
  if (routeName === 'tutor-profile') {
    if (!user) {
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
            {user && (
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
              <a className="text-xs text-on-secondary-container hover:text-primary transition-colors" href="#" onClick={(e) => e.preventDefault()}>Hỗ Trợ</a>
              <a className="text-xs text-on-secondary-container hover:text-primary transition-colors" href="#" onClick={(e) => e.preventDefault()}>Chính Sách Bảo Mật</a>
              <a className="text-xs text-on-secondary-container hover:text-primary transition-colors" href="#" onClick={(e) => e.preventDefault()}>Liên Hệ</a>
            </div>
          </div>
        </footer>
      </div>
    )
  }

  // ── Route: My AI Cases (protected — affected user appeal page) ──
  if (routeName === 'my-ai-cases') {
    if (!user) return <AccessDenied isLoggedIn={false} onGoSignIn={() => navigateTo('signin')} />
    return <MyAiCases onGoHome={() => navigateTo('home')} />
  }

  // ── Route: Complete Student Profile ──
  if (routeName === 'complete-student-profile') {
    const hasPendingReg = !!sessionStorage.getItem('pendingStudentReg')
    if (!user && !hasPendingReg) {
      return (
        <AccessDenied
          isLoggedIn={false}
          onGoSignIn={() => navigateTo('signin')}
        />
      )
    }
    return <CompleteStudentProfile onGoHome={() => navigateTo('home')} />
  }

  // ── Route: Public Pages ──
  if (routeName === 'payment-result') {
    return <PaymentResult />
  }
  if (routeName === 'cart') {
    return <CartPage onGoSignIn={() => navigateTo('signin')} user={user} />
  }
  if (routeName === 'find-tutors') {
    return <FindTutorsPage onGoSignIn={() => navigateTo('signin')} onGoSignUp={() => navigateTo('signup')} user={user} />
  }
  if (routeName === 'tutor-request') {
    return <FindTutorRequest user={user} onGoSignIn={() => navigateTo('signin')} onGoSignUp={() => navigateTo('signup')} />
  }
  if (routeName === 'tutor-matches') {
    return <TutorMatchesPage user={user} onGoSignIn={() => navigateTo('signin')} onGoSignUp={() => navigateTo('signup')} />
  }
  if (routeName === 'subjects') {
    return <SubjectsPage onGoSignIn={() => navigateTo('signin')} onGoSignUp={() => navigateTo('signup')} user={user} />
  }
  if (routeName === 'thpt-subjects') {
    return <THPTSubjectsPage onGoSignIn={() => navigateTo('signin')} onGoSignUp={() => navigateTo('signup')} user={user} />
  }
  if (routeName === 'tieu-hoc-subjects') {
    return <TieuHocSubjectsPage onGoSignIn={() => navigateTo('signin')} onGoSignUp={() => navigateTo('signup')} user={user} />
  }
  if (routeName === 'thcs-subjects') {
    return <THCSSubjectsPage onGoSignIn={() => navigateTo('signin')} onGoSignUp={() => navigateTo('signup')} user={user} />
  }
  if (routeName === 'become-tutor') {
    return <BecomeTutorPage onGoSignIn={() => navigateTo('signin')} onGoSignUp={() => navigateTo('signup')} user={user} />
  }

  // ── Route: Course Marketplace ──
  if (routeName === 'courses') {
    return <CourseMarketplace />;
  }

  if (routeName === 'booking') {
    return <BookingCalendar tutorId={route.id} onGoHome={() => navigateTo('home')} />
  }

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
  if (routeName === 'courseplayer') {
    if (!user) return <AccessDenied isLoggedIn={false} onGoSignIn={() => navigateTo('signin')} />
    return <CoursePlayer courseId={route.id} onGoHome={() => navigateTo('mycourses')} />
  }

  if (routeName === 'coursedetail') {
    return <CourseDetail courseId={route.id} />
  }

  // ── Route: Home ──
  return <HomePage onGoSignIn={() => navigateTo('signin')} />
}

export default App