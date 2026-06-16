/**
 * StudentDashboard.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Dashboard dành cho học sinh (role: student / parent / tutor).
 * Hiện thị: khóa học đang học, bài tập, giờ học, gia sư hiện tại.
 */
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../services/eduxApi'
import StudentCoursesSection from './StudentCoursesSection'

// ─── API helper ────────────────────────────────────────────────────────────────
const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

async function authFetch(url, token, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`)
  return data
}

// ─── Mock data (sẽ thay bằng API call thực sau) ───────────────────────────────
const MY_TUTORS = [
  {
    id: 1,
    name: 'Dr. Sarah Wilson',
    subject: 'Mathematics',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDVYO71mJBASGfG1vF2_6Trsov2ilKMsn_A3OU-3uzp89l0QkjyIgb_Dpg63y-jkeQlVukPMmmzu_zAJDeS61qwmxPFD7wuA351p1UJf7cRD8LX2jypOd4VncoK7LwXmiPuzqmSGGab4NAsmRLMzTf2MSXh-BYPgkdp-oNWgD3kBNzHBo5TYDWS08mB1x-Vbh5lCxW7hKVSvO9cL3vLfhZmbHpGEHS4nDpBXDH-6OsaGsna5U03XCwgUXoqjOoAywHQ94ekYH9ryns',
  },
  {
    id: 2,
    name: 'Prof. James',
    subject: 'Physics',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAIGco9G7B1c6ZsIhphXIBXcWDXHkVFZFV907MyzCj2D9cREJvEcZNjHjlCAMA64icYKvJbCv2d8jvYuYPwpQc0sPCGOen0e0SooGAV9Q1a-tZP3mqDe2F5aXiT9859rJhd9OUKrLZd4o184cEOIcaLb9ZMRgKcKPwaqsehOyyPOOdjkMZh0x6Df8cGzEJZo8Du8MpGlzlwEP7s3mtXMSF9PqwE0gtwY7cvuIrl7PJEAGFJSlQ5UZ254NjyJlQOgy3WMqlgFC-js0E',
  },
  {
    id: 3,
    name: 'Ms. Emily',
    subject: 'English Lit',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAR19xJ0-KvBFubfrm4NfrN666UMMtCuzeBE2Hl3qEC9UuwQaJE7MsC3gpV0IjEtUohP-6shEdUYgU9EbVuNw8U1wIuwg5uklk8imiM-huafUQMcim7Uo1nmTJEih4x2lhWhv_vVr986D2LqB0gI_iwFVdlqIg7ZP58DAS9AkFoT1eu57K3pSna0f9t_8cFTWczJSgw7vcWLn0iS_BqDoH3cfpGqPbpTRr6vg2TK95lxlqSdctD8i91SsmMNljG6J6nb31C46CCZOQ',
  },
]

const NAV_ITEMS = [
  { icon: 'dashboard',       label: 'Dashboard',  href: '#/dashboard' },
  { icon: 'school',          label: 'My Courses', href: '#/dashboard' },
  { icon: 'calendar_today',  label: 'Schedule',   href: '#/dashboard' },
  { icon: 'chat',            label: 'Messages',   href: '#/dashboard' },
  { icon: 'person_search',   label: 'Tìm gia sư', href: '#/tutors',     section: 'explore' },
  { icon: 'play_lesson',     label: 'Khóa học',   href: '#/courses',    section: 'explore' },
  { icon: 'auto_awesome',    label: 'AI Gợi ý',   href: '#/ai-suggest', section: 'explore' },
]

export default function StudentDashboard() {
  const { user, token, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [currentHash, setCurrentHash] = useState(window.location.hash || '#/dashboard')

  // Theo dõi hash để biết item nào đang active
  useEffect(() => {
    const onHash = () => setCurrentHash(window.location.hash || '#/dashboard')
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // Dữ liệu thật để suy ra hero / stats / gia sư của tôi
  const [enrollments, setEnrollments] = useState([])
  const [myBookings, setMyBookings] = useState([])

  useEffect(() => {
    if (!token) return
    api.getMyEnrollments().then(setEnrollments).catch(() => {})
    fetch(`${API}/api/bookings`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(rows => Array.isArray(rows) && setMyBookings(rows))
      .catch(() => {})
  }, [token])

  // Suy ra số liệu
  const today = new Date().toISOString().slice(0, 10)
  const confirmed = myBookings.filter(b => b.status === 'Approved')
  const upcoming = confirmed
    .filter(b => (b.lesson_date || '').slice(0, 10) >= today)
    .sort((a, b) => (a.lesson_date + a.time_slot).localeCompare(b.lesson_date + b.time_slot))
  const nextClass = upcoming[0] || null
  const activeCourses = enrollments.filter(e => e.status !== 'completed').length
  const completedCourses = enrollments.filter(e => e.status === 'completed').length
  // Gia sư của tôi: duy nhất theo từng gia sư đã đặt lịch (confirmed)
  const myTutors = Object.values(confirmed.reduce((acc, b) => {
    const key = b.tutor_id || b.tutor_name
    if (key && !acc[key]) acc[key] = { id: key, name: b.tutor_name, avatar: b.tutor_picture, subject: b.subject }
    return acc
  }, {}))

  // Lấy tên hiển thị: ưu tiên name, rồi email
  const displayName = user?.name || user?.email?.split('@')[0] || 'Student'
  // Lấy chữ cái đầu để làm avatar fallback
  const initials = displayName.charAt(0).toUpperCase()

  const isActive = (item) => {
    if (item.label === 'Dashboard' && (currentHash === '#/dashboard' || currentHash === '' || currentHash === '#')) return true
    return currentHash === item.href
  }

  return (
    <div className="bg-background text-on-background font-body-md text-body-md antialiased flex h-screen overflow-hidden">

      {/* ── Mobile overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <nav
        className={`
          fixed left-0 top-0 h-full z-40 flex flex-col py-lg w-64
          bg-surface-container-low border-r border-outline-variant/20 shadow-sm
          transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        {/* Logo */}
        <div className="px-md mb-xl flex items-center gap-sm">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary">
            <span className="material-symbols-outlined text-[20px]">school</span>
          </div>
          <div>
            <h1 className="font-headline-md text-headline-md font-black text-primary leading-tight">
              EduX
            </h1>
            <p className="font-label-sm text-label-sm text-on-surface-variant">Student Portal</p>
          </div>
        </div>

        {/* Nav items */}
        <ul className="flex-1 flex flex-col gap-xs px-sm overflow-y-auto">
          {NAV_ITEMS.map((item, i) => {
            const active = isActive(item)
            const prevSection = i > 0 ? NAV_ITEMS[i - 1].section : undefined
            const showDivider = item.section === 'explore' && prevSection !== 'explore'
            return (
              <li key={item.label}>
                {showDivider && (
                  <div className="mt-md mb-xs px-md">
                    <div className="flex items-center gap-xs">
                      <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-bold">
                        Khám phá
                      </span>
                      <span className="flex-1 h-px bg-outline-variant/30" />
                    </div>
                  </div>
                )}
                <a
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-sm px-md py-sm rounded-lg
                    transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                    ${
                      active
                        ? 'text-primary font-bold bg-secondary-container'
                        : 'text-on-surface-variant hover:bg-surface-container-high'
                    }
                  `}
                >
                  <span
                    className="material-symbols-outlined"
                    style={active ? { fontVariationSettings: "'FILL' 1" } : {}}
                  >
                    {item.icon}
                  </span>
                  <span className="font-label-md text-label-md">{item.label}</span>
                  {item.section === 'explore' && !active && (
                    <span className="ml-auto material-symbols-outlined text-[16px] opacity-50">arrow_outward</span>
                  )}
                </a>
              </li>
            )
          })}
        </ul>

        {/* Bottom actions */}
        <div className="px-sm mt-auto flex flex-col gap-xs">
          <a
            href="#"
            className="text-on-surface-variant flex items-center gap-sm px-md py-sm hover:bg-surface-container-high rounded-lg transition-all duration-200"
          >
            <span className="material-symbols-outlined">settings</span>
            <span className="font-label-md text-label-md">Settings</span>
          </a>
          <a
            href="#"
            className="text-on-surface-variant flex items-center gap-sm px-md py-sm hover:bg-surface-container-high rounded-lg transition-all duration-200"
            onClick={(e) => { e.preventDefault(); logout() }}
          >
            <span className="material-symbols-outlined">logout</span>
            <span className="font-label-md text-label-md">Logout</span>
          </a>
          <div className="mt-md px-xs">
            <button className="w-full bg-surface-container border border-outline-variant text-on-surface font-label-md text-label-md h-12 rounded-lg flex items-center justify-center gap-sm hover:bg-surface-container-highest transition-colors duration-200">
              <span className="material-symbols-outlined text-[18px]">help_center</span>
              Get Support
            </button>
          </div>
        </div>
      </nav>

      {/* ── Main content wrapper ── */}
      <div className="flex-1 flex flex-col lg:ml-64 h-full overflow-hidden">

        {/* ── Top Bar ── */}
        <header className="w-full h-16 bg-surface/90 backdrop-blur-sm shadow-sm flex items-center z-30 shrink-0 sticky top-0 border-b border-surface-dim/30">
          <div className="flex justify-between items-center px-gutter w-full max-w-container-max mx-auto gap-md">

            {/* Mobile hamburger */}
            <button
              className="lg:hidden w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded-full transition-colors"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>

            {/* Search */}
            <div className="flex-1 max-w-md relative group hidden sm:block">
              <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">
                search
              </span>
              <input
                className="w-full h-10 pl-10 pr-sm bg-surface-container-low border border-outline-variant/50 rounded-lg font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/70 focus:border-primary focus:ring-2 focus:ring-on-tertiary-container/30 focus:outline-none transition-all duration-200"
                placeholder="Search courses, resources..."
                type="text"
              />
            </div>

            <div className="flex items-center gap-sm lg:gap-md">
              {/* Notification */}
              <button
                aria-label="Notifications"
                className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors duration-200"
              >
                <span className="material-symbols-outlined">notifications</span>
              </button>

              <button
                aria-label="Help"
                className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors duration-200"
              >
                <span className="material-symbols-outlined">help</span>
              </button>

              <div className="w-px h-8 bg-outline-variant/30 mx-xs" />

              {/* Avatar */}
              <div className="flex items-center gap-xs rounded-full px-xs py-xs hover:bg-surface-container-high transition-colors cursor-pointer">
                {user?.picture ? (
                  <img
                    src={user.picture}
                    alt={displayName}
                    className="w-8 h-8 rounded-full object-cover border border-outline-variant/30"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary text-sm font-bold">
                    {initials}
                  </div>
                )}
                <span className="material-symbols-outlined text-on-surface-variant text-[20px]">
                  expand_more
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* ── Main canvas ── */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-md lg:p-lg">
          <div className="max-w-container-max mx-auto flex flex-col gap-xl pb-xl">

            {/* ── Welcome Header ── */}
            <div className="flex justify-between items-end flex-wrap gap-md">
              <div>
                <h2 className="font-headline-lg text-headline-lg text-on-surface mb-xs">
                  Welcome back, {displayName} 👋
                </h2>
                <p className="font-body-lg text-body-lg text-on-surface-variant">
                  Here is your academic overview for today.
                </p>
              </div>
              <button className="h-12 px-md bg-surface-container border border-outline-variant rounded-lg font-label-md text-label-md text-on-surface flex items-center gap-sm hover:bg-surface-container-highest transition-colors">
                <span className="material-symbols-outlined">tune</span>
                Customize
              </button>
            </div>

            {/* ── Đặt lịch học (ở đầu trang) ── */}
            <BookingSection tutors={MY_TUTORS} token={token} />

            {/* ── Khóa học đã đăng ký (Phase 4 — dữ liệu thật) ── */}
            <StudentCoursesSection />

            {/* ── Hero: Buổi học sắp tới (dữ liệu thật) ── */}
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/5 to-tertiary-container/5">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />

              <div className="relative z-10 bg-surface-container-lowest/70 backdrop-blur-md border border-surface-container-lowest/30 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] rounded-xl p-md flex flex-col lg:flex-row justify-between items-start lg:items-center gap-lg border-primary/10">
                {nextClass ? (
                  <>
                    <div className="flex gap-lg items-center w-full">
                      <div className="w-16 h-16 rounded-xl bg-primary-container flex items-center justify-center text-on-primary-container shrink-0 shadow-sm overflow-hidden">
                        {nextClass.tutor_picture ? (
                          <img src={nextClass.tutor_picture} alt={nextClass.tutor_name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="material-symbols-outlined text-[32px]">event_available</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="inline-flex items-center px-2 py-1 rounded bg-on-tertiary-container/20 text-primary font-label-sm text-label-sm mb-xs">
                          Buổi học sắp tới
                        </span>
                        <h3 className="font-headline-md text-headline-md text-on-surface mb-xs truncate">
                          {nextClass.subject || 'Buổi học'}
                        </h3>
                        <p className="font-body-md text-body-md text-on-surface-variant flex items-center gap-xs flex-wrap">
                          <span className="material-symbols-outlined text-[18px]">person</span>
                          {nextClass.tutor_name}
                          <span className="mx-1">•</span>
                          <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                          {new Date(nextClass.lesson_date).toLocaleDateString('vi-VN')} · {nextClass.time_slot}
                        </p>
                      </div>
                    </div>
                    <span className="w-full lg:w-auto h-12 px-xl bg-primary/10 text-primary font-label-md text-label-md rounded-lg flex items-center justify-center gap-2 whitespace-nowrap">
                      <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      Đã xác nhận
                    </span>
                  </>
                ) : (
                  <div className="flex gap-lg items-center w-full">
                    <div className="w-16 h-16 rounded-xl bg-surface-container flex items-center justify-center text-on-surface-variant shrink-0">
                      <span className="material-symbols-outlined text-[32px]">event_busy</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-headline-md text-headline-md text-on-surface mb-xs">Chưa có buổi học nào sắp tới</h3>
                      <p className="font-body-md text-body-md text-on-surface-variant">
                        Đặt lịch với gia sư bên dưới để bắt đầu hành trình học tập.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Stats Grid (dữ liệu thật) ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-md lg:gap-gutter">
              <StatCard icon="library_books" label="Khóa đang học" value={activeCourses} tone="primary" />
              <StatCard icon="task_alt" label="Khóa đã hoàn thành" value={completedCourses} tone="gold" />
              <StatCard icon="event_upcoming" label="Buổi học sắp tới" value={upcoming.length} tone="mix" />
            </div>

            {/* ── Gia sư của tôi (từ lịch đã đặt) ── */}
            <div>
              <div className="flex justify-between items-center mb-md">
                <h3 className="font-headline-md text-headline-md text-on-surface">Gia sư của tôi</h3>
                <a
                  href="#/tutors"
                  className="font-label-md text-label-md text-primary hover:text-surface-tint rounded px-2 py-1 transition-colors"
                >
                  Xem tất cả
                </a>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
                {/* Tutor cards (gia sư đã đặt lịch) */}
                {myTutors.map((tutor) => (
                  <TutorCard key={tutor.id} tutor={tutor} />
                ))}

                {/* Find New Tutor CTA */}
                <a
                  href="#/tutors"
                  className="bg-surface-container-lowest/70 backdrop-blur-md border-2 border-dashed border-outline-variant/50 rounded-xl p-md flex flex-col items-center justify-center text-center bg-transparent hover:bg-surface-container-lowest/50 hover:border-primary/50 transition-all duration-300 cursor-pointer group"
                >
                  <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant mb-sm group-hover:bg-primary-container group-hover:text-on-primary-container transition-colors duration-300">
                    <span className="material-symbols-outlined text-[28px]">person_add</span>
                  </div>
                  <h4 className="font-label-md text-label-md text-on-surface mb-xs">Find a Tutor</h4>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">
                    Browse available experts
                  </p>
                </a>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  )
}

// ─── Stat Card component ───────────────────────────────────────────────────────
function StatCard({ icon, label, value, tone = 'primary' }) {
  const grad = {
    primary:   'linear-gradient(135deg,#00288e,#3a6fe0)',
    gold:      'linear-gradient(135deg,#b7831b,#e0a82e)',
    mix:       'linear-gradient(135deg,#00288e,#e0a82e)',
  }[tone] || 'linear-gradient(135deg,#00288e,#3a6fe0)'
  return (
    <div className="relative overflow-hidden bg-surface-container-lowest/75 backdrop-blur-md border border-white/40 shadow-[0_12px_28px_-12px_rgba(0,40,142,0.22)] rounded-2xl p-md flex items-center gap-md transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_22px_44px_-14px_rgba(0,40,142,0.32)] cursor-default">
      <div className="absolute -top-9 -right-9 w-24 h-24 rounded-full opacity-[0.12]" style={{ background: grad }} />
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg relative z-10" style={{ background: grad }}>
        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
      </div>
      <div className="relative z-10">
        <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">
          {label}
        </p>
        <p className="font-headline-lg text-headline-lg text-on-surface font-extrabold">{value}</p>
      </div>
    </div>
  )
}

// ─── Booking Section: Đặt lịch học ─────────────────────────────────────────────
const TIME_SLOTS = ['08:00', '09:30', '14:00', '15:30', '17:00', '19:00', '20:30']

function BookingSection({ tutors: mockTutors, token }) {
  const [open, setOpen]       = useState(true)
  const [date, setDate]       = useState('')
  const [slot, setSlot]       = useState('')
  const [note, setNote]       = useState('')
  const [booking, setBooking] = useState(false)
  const [bookings, setBookings] = useState([])
  const [err, setErr]         = useState(null)

  // ── Danh sách gia sư thật từ DB ──
  // Mỗi item: { id (uuid), full_name, picture, subjects, bio, experience_years }
  const [dbTutors, setDbTutors]   = useState([])
  const [tutorsLoading, setTL]    = useState(true)
  const [usingMock, setUsingMock] = useState(false)
  const [tutorId, setTutorId]     = useState('')   // UUID hoặc rỗng

  // Ngày tối thiểu = hôm nay
  const today = new Date().toISOString().split('T')[0]
  const canBook = tutorId && date && slot && !booking

  // Tải danh sách gia sư đã duyệt (public API, không cần token)
  useEffect(() => {
    setTL(true)
    fetch(`${API}/api/tutors/approved`)
      .then(async r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(rows => {
        if (Array.isArray(rows) && rows.length > 0) {
          setDbTutors(rows)
          setTutorId(rows[0].id)
          setUsingMock(false)
        } else {
          // Không có gia sư duyệt nào → dùng mock để demo
          setUsingMock(true)
          setTutorId(String(mockTutors[0]?.id ?? ''))
        }
      })
      .catch(e => {
        console.warn('[tutors] load failed:', e.message)
        setUsingMock(true)
        setTutorId(String(mockTutors[0]?.id ?? ''))
      })
      .finally(() => setTL(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Lấy info gia sư đang chọn (từ DB hoặc mock)
  const getCurrentTutor = () => {
    if (usingMock) {
      const m = mockTutors.find(t => String(t.id) === String(tutorId))
      return m ? {
        id: null,            // mock → không có UUID trong DB
        name: m.name,
        subject: m.subject,
        avatar: m.avatar,
      } : null
    }
    const t = dbTutors.find(x => x.id === tutorId)
    return t ? {
      id: t.id,
      name: t.full_name || t.email?.split('@')[0] || 'Gia sư',
      subject: t.subjects || '',
      avatar: t.picture,
    } : null
  }

  // Chuẩn hóa 1 row booking từ DB → format hiển thị
  const normalize = (row) => ({
    id: row.id,
    tutorId: row.tutor_id,
    tutorName: row.tutor_name,
    subject: row.subject,
    avatar: row.tutor_picture
      || dbTutors.find(t => t.id === row.tutor_id)?.picture
      || mockTutors.find(m => m.name === row.tutor_name)?.avatar
      || null,
    date: row.lesson_date,
    slot: row.time_slot,
    note: row.note,
    status: row.status,
  })

  // Tải lịch học đã đặt
  useEffect(() => {
    if (!token) return
    authFetch(`${API}/api/bookings`, token)
      .then(rows => setBookings(rows.map(normalize)))
      .catch(e => {
        console.warn('[bookings] load failed:', e.message)
        setErr('Không tải được lịch học đã đặt (kiểm tra backend đang chạy).')
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, dbTutors])

  const handleBook = async () => {
    if (!canBook) return
    const tutor = getCurrentTutor()
    if (!tutor) return
    setBooking(true)
    setErr(null)
    try {
      const row = await authFetch(`${API}/api/bookings`, token, {
        method: 'POST',
        body: JSON.stringify({
          tutorId: tutor.id,           // UUID nếu là gia sư thật, null nếu mock
          tutorName: tutor.name,
          subject: tutor.subject,
          lessonDate: date,
          timeSlot: slot,
          note: note.trim(),
        }),
      })
      setBookings(prev => [normalize(row), ...prev])
      setDate(''); setSlot(''); setNote('')
    } catch (e) {
      console.error('[bookings] create failed:', e.message)
      setErr('Đặt lịch thất bại: ' + e.message)
    } finally {
      setBooking(false)
    }
  }

  const cancelBooking = async (id) => {
    const prev = bookings
    setBookings(b => b.filter(x => x.id !== id))  // optimistic
    try {
      await authFetch(`${API}/api/bookings/${id}`, token, { method: 'DELETE' })
    } catch (e) {
      console.error('[bookings] cancel failed:', e.message)
      setBookings(prev)  // rollback nếu lỗi
      setErr('Hủy lịch thất bại: ' + e.message)
    }
  }

  const fmtDate = (d) => {
    try {
      return new Date(d).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
    } catch { return d }
  }

  return (
    <div className="space-y-4">
      {/* ── Banner navy động: hero "Đặt lịch học" (sao lấp lánh + sao băng + glow gold) ── */}
      <div className="booking-banner">
        <span className="booking-banner-stars" aria-hidden="true" />
        <span className="booking-banner-comet" aria-hidden="true" />
        <span className="booking-banner-shine" aria-hidden="true" />
        <div className="booking-banner-content flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="booking-banner-icon">
              <span className="material-symbols-outlined" style={{ fontSize: 28, fontVariationSettings: "'FILL' 1" }}>event_available</span>
            </div>
            <div>
              <h3 className="booking-banner-title">Đặt lịch học cùng <span className="grad-gold">Gia sư chuyên gia</span></h3>
              <p className="booking-banner-sub">Kết nối với giáo viên hàng đầu — chọn môn, ngày &amp; khung giờ chỉ trong vài giây.</p>
            </div>
          </div>
          <button onClick={() => setOpen(o => !o)} className="booking-toggle">
            <span className="material-symbols-outlined text-[18px]">{open ? 'expand_less' : 'expand_more'}</span>
            {open ? 'Thu gọn' : 'Mở rộng'}
          </button>
        </div>
      </div>

      {open && (
        <div className="bg-surface-container-lowest/80 backdrop-blur-md border border-surface-container-lowest/40 rounded-2xl p-md shadow-sm">
            {/* Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-md mb-md">
              {/* Gia sư */}
              <div>
                <label className="block font-label-sm text-label-sm text-on-surface-variant mb-xs font-bold uppercase tracking-wide flex items-center justify-between">
                  <span>Gia sư</span>
                  {usingMock && !tutorsLoading && (
                    <span className="text-[10px] font-normal normal-case text-on-surface-variant/70 italic">
                      (chưa có gia sư duyệt trong DB → dùng dữ liệu mẫu)
                    </span>
                  )}
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none">person</span>
                  <select
                    value={tutorId}
                    onChange={e => setTutorId(e.target.value)}
                    disabled={tutorsLoading}
                    className="w-full h-11 pl-10 pr-sm bg-surface-container-low border border-outline-variant/50 rounded-lg font-body-md text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all appearance-none cursor-pointer disabled:opacity-60"
                  >
                    {tutorsLoading ? (
                      <option>Đang tải danh sách gia sư...</option>
                    ) : usingMock ? (
                      mockTutors.map(t => (
                        <option key={t.id} value={t.id}>{t.name} — {t.subject}</option>
                      ))
                    ) : (
                      dbTutors.map(t => {
                        const name = t.full_name || t.email?.split('@')[0] || 'Gia sư'
                        const subj = t.subjects ? ` — ${t.subjects}` : ''
                        return <option key={t.id} value={t.id}>{name}{subj}</option>
                      })
                    )}
                  </select>
                </div>
              </div>

              {/* Ngày */}
              <div>
                <label className="block font-label-sm text-label-sm text-on-surface-variant mb-xs font-bold uppercase tracking-wide">Ngày học</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none">calendar_month</span>
                  <input
                    type="date"
                    min={today}
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full h-11 pl-10 pr-sm bg-surface-container-low border border-outline-variant/50 rounded-lg font-body-md text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Khung giờ */}
            <div className="mb-md">
              <label className="block font-label-sm text-label-sm text-on-surface-variant mb-xs font-bold uppercase tracking-wide">Khung giờ</label>
              <div className="flex flex-wrap gap-xs">
                {TIME_SLOTS.map(t => (
                  <button
                    key={t}
                    onClick={() => setSlot(t)}
                    className={`h-10 px-md rounded-lg font-label-md text-label-md border transition-all duration-200 ${
                      slot === t
                        ? 'bg-primary text-on-primary border-primary shadow-sm scale-105'
                        : 'bg-surface-container-low text-on-surface border-outline-variant/50 hover:border-primary hover:text-primary'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Ghi chú */}
            <div className="mb-md">
              <label className="block font-label-sm text-label-sm text-on-surface-variant mb-xs font-bold uppercase tracking-wide">Ghi chú (không bắt buộc)</label>
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Ví dụ: Cần ôn tập chương Hàm số, chuẩn bị thi giữa kỳ..."
                className="w-full h-11 px-sm bg-surface-container-low border border-outline-variant/50 rounded-lg font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
              />
            </div>

            {/* Thông báo lỗi */}
            {err && (
              <div className="mb-sm flex items-start gap-xs p-sm rounded-lg bg-error/8 border border-error/25 text-error font-label-sm text-label-sm">
                <span className="material-symbols-outlined text-[18px] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
                <span>{err}</span>
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleBook}
              disabled={!canBook}
              className={`w-full h-12 rounded-lg font-label-md text-label-md flex items-center justify-center gap-sm transition-all duration-200 ${
                canBook
                  ? 'bg-primary text-on-primary hover:shadow-md hover:-translate-y-0.5'
                  : 'bg-surface-container-high text-on-surface-variant cursor-not-allowed'
              }`}
            >
              {booking ? (
                <>
                  <span className="w-5 h-5 border-2 border-on-primary/40 border-t-on-primary rounded-full animate-spin" />
                  Đang đặt lịch...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">calendar_add_on</span>
                  Đặt lịch học
                </>
              )}
            </button>

            {/* Danh sách lịch đã đặt */}
            {bookings.length > 0 && (
              <div className="mt-lg">
                <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wide font-bold mb-sm flex items-center gap-xs">
                  <span className="material-symbols-outlined text-[18px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>task_alt</span>
                  Lịch học đã đặt ({bookings.length})
                </p>
                <div className="flex flex-col gap-sm">
                  {bookings.map(b => (
                    <div
                      key={b.id}
                      className="flex items-center gap-sm p-sm bg-surface-container-low border border-outline-variant/40 rounded-lg animate-[fadeIn_0.3s_ease]"
                    >
                      <img src={b.avatar} alt={b.tutorName} className="w-10 h-10 rounded-full object-cover border border-surface shrink-0" loading="lazy" />
                      <div className="flex-1 min-w-0">
                        <p className="font-label-md text-label-md text-on-surface truncate">
                          {b.tutorName} <span className="text-on-surface-variant text-sm">· {b.subject}</span>
                        </p>
                        <p className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-xs flex-wrap">
                          <span className="material-symbols-outlined text-[14px]">event</span>
                          {fmtDate(b.date)}
                          <span className="material-symbols-outlined text-[14px] ml-1">schedule</span>
                          {b.slot}
                          {b.note && <span className="italic opacity-80">— {b.note}</span>}
                        </p>
                      </div>
                      {b.status === 'Pending' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 font-label-sm text-label-sm shrink-0">
                          <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>hourglass_top</span>
                          Chờ duyệt
                        </span>
                      ) : b.status === 'Declined' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/15 text-red-700 font-label-sm text-label-sm shrink-0">
                          <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>cancel</span>
                          Bị từ chối
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-500/15 text-green-700 font-label-sm text-label-sm shrink-0">
                          Đã xác nhận
                        </span>
                      )}
                      <button
                        onClick={() => cancelBooking(b.id)}
                        title="Hủy lịch"
                        className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-error/10 hover:text-error transition-colors shrink-0"
                      >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
    </div>
  )
}

// ─── Tutor Card component ──────────────────────────────────────────────────────
function TutorCard({ tutor }) {
  const [imgErr, setImgErr] = useState(false)
  return (
    <div className="bg-surface-container-lowest/70 backdrop-blur-md border border-surface-container-lowest/30 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] rounded-xl p-md flex flex-col items-center text-center hover:shadow-md transition-shadow duration-300">
      {!imgErr && tutor.avatar ? (
        <img
          src={tutor.avatar}
          alt={tutor.name}
          className="w-20 h-20 rounded-full object-cover mb-sm border-2 border-surface bg-surface-container-lowest shadow-sm"
          loading="lazy"
          onError={() => setImgErr(true)}
        />
      ) : (
        <div className="w-20 h-20 rounded-full mb-sm border-2 border-surface bg-primary flex items-center justify-center text-on-primary text-2xl font-bold shadow-sm">
          {(tutor.name || '?').charAt(0).toUpperCase()}
        </div>
      )}
      <h4 className="font-label-md text-label-md text-on-surface mb-xs">{tutor.name}</h4>
      {tutor.subject && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm mb-md">
          {tutor.subject}
        </span>
      )}
      <a href="#/tutors" className="w-full h-10 border border-outline-variant text-on-surface font-label-sm text-label-sm rounded-lg hover:bg-surface-container hover:text-primary transition-colors flex items-center justify-center">
        Xem gia sư
      </a>
    </div>
  )
}
