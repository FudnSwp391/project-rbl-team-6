/**
 * StudentDashboard.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Dashboard dành cho học sinh (role: student / parent / tutor).
 * Hiện thị: khóa học đang học, bài tập, giờ học, gia sư hiện tại.
 */
import { useState, useEffect, useRef } from 'react'
import { useAuth } from './AuthContext'
import QuizList from './QuizList'
import PracticeMode from './PracticeMode'
import ExamPapers from './ExamPapers'
import MessagesSection from './components/MessagesSection'
import WalletWidget from './components/WalletWidget'
import NotificationDropdown from './components/NotificationDropdown'
import SchedulePage from './components/SchedulePage'
import StudentProfilePage from './pages/StudentProfilePage'
import { getStudentBookings, confirmLessonComplete, reportTutor } from './services/api'

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

import StudentSidebar from './components/StudentSidebar'

export default function StudentDashboard() {
  const { user, token, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  const getSectionFromHash = () => {
    const parts = window.location.hash.split('/')
    return parts.length > 2 ? parts[2] : 'dashboard'
  }
  const [activeSection, setActiveSection] = useState(getSectionFromHash())

  useEffect(() => {
    const handleHash = () => setActiveSection(getSectionFromHash())
    window.addEventListener('hashchange', handleHash)
    return () => window.removeEventListener('hashchange', handleHash)
  }, [])

  // Listen for cross-component navigation events (e.g. from quota error banner)
  useEffect(() => {
    const handler = (e) => {
      setActiveSection(e.detail)
      window.location.hash = `/dashboard/${e.detail}`
    }
    window.addEventListener('navigate-section', handler)
    return () => window.removeEventListener('navigate-section', handler)
  }, [])

  // Lấy tên hiển thị: ưu tiên name, rồi email
  const displayName = user?.name || user?.email?.split('@')[0] || 'Student'
  // Lấy chữ cái đầu để làm avatar fallback
  const initials = displayName.charAt(0).toUpperCase()

  return (
    <div className={`bg-background text-on-background font-body-md text-body-md antialiased ${activeSection === 'schedule' ? 'block min-h-screen' : 'flex h-screen overflow-hidden'}`}>

      <StudentSidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        activeRoute={activeSection}
        logout={logout}
      />

      {/* ── Main content wrapper ── */}
      <div className={`lg:ml-64 ${activeSection === 'schedule' ? 'block min-h-screen' : 'flex-1 flex flex-col h-full overflow-hidden'}`}>

        {/* ── Top Bar ── */}
        <header className="w-full h-16 bg-surface/90 backdrop-blur-sm shadow-sm flex items-center z-30 shrink-0 sticky top-0 border-b border-surface-dim/30">
          <div className="flex justify-between items-center px-gutter w-full max-w-container-max mx-auto gap-md">

            {/* Mobile hamburger */}
            <button
              className="lg:hidden w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded-full transition-colors"
              onClick={() => setSidebarOpen(true)}
              aria-label="Mở menu"
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
                placeholder="Tìm kiếm khóa học, tài nguyên..."
                type="text"
              />
            </div>

            <div className="flex items-center gap-sm lg:gap-md">
              {/* Notification */}
              <NotificationDropdown token={token} />

              <button
                aria-label="Trợ giúp"
                className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors duration-200"
              >
                <span className="material-symbols-outlined">help</span>
              </button>

              <div className="w-px h-8 bg-outline-variant/30 mx-xs" />

              <WalletWidget token={token} />

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
        <main className={`overflow-x-hidden p-md lg:p-lg ${activeSection === 'schedule' ? 'block' : 'flex-1 overflow-y-auto'}`}>
          <div className={`max-w-container-max mx-auto flex flex-col gap-xl ${activeSection === 'schedule' ? 'pb-8' : 'pb-xl'}`}>

            {/* ── Assessments Section ── */}
            {activeSection === 'assessments' && (
              <QuizList token={token} />
            )}

            {/* ── Profile Section ── */}
            {activeSection === 'profile' && (
              <StudentProfilePage />
            )}

            {/* ── AI Practice Section ── */}
            {activeSection === 'practice' && (
              <PracticeMode token={token} />
            )}

            {/* ── Đề thi Section ── */}
            {activeSection === 'exam-papers' && (
              <ExamPapers token={token} />
            )}

            {/* ── Parent Link Section ── */}
            {activeSection === 'parent-link' && (
              <ParentLinkSection token={token} />
            )}

            {activeSection === 'messages' && (
              <MessagesSection token={token} user={user} />
            )}

            {/* ── Lịch học Section ── */}
            {activeSection === 'schedule' && (
              <SchedulePage />
            )}

            {/* ── Dashboard Home ── */}
            {(activeSection === 'dashboard' || activeSection === 'courses') && (
              <>

            {/* ── Welcome Header ── */}
            <div className="flex justify-between items-end flex-wrap gap-md">
              <div>
                <h2 className="font-headline-lg text-headline-lg text-on-surface mb-xs">
                  Chào mừng trở lại, {displayName} 👋
                </h2>
                <p className="font-body-lg text-body-lg text-on-surface-variant">
                  Đây là tổng quan học tập của bạn hôm nay.
                </p>
              </div>
              <button className="h-12 px-md bg-surface-container border border-outline-variant rounded-lg font-label-md text-label-md text-on-surface flex items-center gap-sm hover:bg-surface-container-highest transition-colors">
                <span className="material-symbols-outlined">tune</span>
                Tùy Chỉnh
              </button>
            </div>

            {/* ── Hero: Next Class ── */}
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/5 to-tertiary-container/5">
              {/* Decorative glow */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />

              <div className="relative z-10 bg-surface-container-lowest/70 backdrop-blur-md border border-surface-container-lowest/30 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] rounded-xl p-md flex flex-col lg:flex-row justify-between items-start lg:items-center gap-lg border-primary/10">
                <div className="flex gap-lg items-center w-full">
                  {/* Icon */}
                  <div className="w-16 h-16 rounded-xl bg-primary-container flex items-center justify-center text-on-primary-container shrink-0 shadow-sm">
                    <span className="material-symbols-outlined text-[32px]">functions</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-sm mb-xs flex-wrap">
                      <span className="inline-flex items-center px-2 py-1 rounded bg-on-tertiary-container/20 text-primary font-label-sm text-label-sm">
                        Sắp Diễn Ra
                      </span>
                      <span className="font-label-sm text-label-sm text-error flex items-center gap-xs">
                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                        Bắt đầu sau 15 phút
                      </span>
                    </div>
                    <h3 className="font-headline-md text-headline-md text-on-surface mb-xs">
                      Toán Học Nâng Cao
                    </h3>
                    <p className="font-body-md text-body-md text-on-surface-variant flex items-center gap-xs">
                      <span className="material-symbols-outlined text-[18px]">person</span>
                      Dr. Sarah Wilson • Hôm nay, 14:00
                    </p>
                  </div>
                </div>
                <button className="w-full lg:w-auto h-12 px-xl bg-primary text-on-primary font-label-md text-label-md rounded-lg hover:bg-surface-tint hover:shadow-md transition-all duration-200 whitespace-nowrap">
                  Vào Lớp Học
                </button>
              </div>
            </div>

            {/* ── Stats Grid ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-md lg:gap-gutter">
              <StatCard
                icon="library_books"
                label="Khóa Học Đang Học"
                value="4"
              />
              <StatCard
                icon="assignment_late"
                label="Bài Tập Sắp Hết Hạn"
                value="2"
              />
              <StatCard
                icon="timer"
                label="Số Giờ Đã Học"
                value={<>28<span className="font-headline-md text-headline-md text-on-surface-variant">giờ</span></>}
              />
            </div>

            {/* ── My Tutors ── */}
            <div>
              <div className="flex justify-between items-center mb-md">
                <h3 className="font-headline-md text-headline-md text-on-surface">Gia Sư Của Tôi</h3>
                <a
                  href="#/find-tutors"
                  className="font-label-md text-label-md text-primary hover:text-surface-tint rounded px-2 py-1 transition-colors"
                >
                  Xem Tất Cả
                </a>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
                {/* Tutor cards */}
                {MY_TUTORS.map((tutor) => (
                  <TutorCard key={tutor.id} tutor={tutor} />
                ))}

                {/* Find New Tutor CTA */}
                <a
                  href="#/tutor-request"
                  className="bg-white border-2 border-dashed border-[#c4c5d5] rounded-xl p-6 flex flex-col items-center justify-center text-center hover:border-primary hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer group min-h-[250px]"
                >
                  <div className="w-16 h-16 rounded-full bg-[#f3f4f6] flex items-center justify-center text-primary mb-4 group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                    <span className="material-symbols-outlined text-[28px]">person_search</span>
                  </div>
                  <h4 className="text-[16px] font-bold text-[#191c1e] mb-2">Tạo yêu cầu tìm gia sư</h4>
                  <p className="text-[14px] text-[#5d5f5f] mb-6 leading-relaxed px-2">
                    EduX sẽ gợi ý gia sư phù hợp với nhu cầu học tập của bạn.
                  </p>
                  <button className="bg-primary/10 text-primary font-semibold text-[14px] px-6 py-2.5 rounded-full group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                    Bắt đầu
                  </button>
                </a>
              </div>
            </div>

              </>
            )}

          </div>
        </main>
      </div>
    </div>
  )
}

// ─── Stat Card component ───────────────────────────────────────────────────────
function StatCard({ icon, label, value }) {
  return (
    <div className="bg-surface-container-lowest/70 backdrop-blur-md border border-surface-container-lowest/30 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] rounded-xl p-md flex items-center gap-md group hover:-translate-y-1 transition-transform duration-300 cursor-default">
      <div className="w-12 h-12 rounded-lg bg-surface-container-high flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors duration-300">
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <div>
        <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">
          {label}
        </p>
        <p className="font-headline-lg text-headline-lg text-on-surface">{value}</p>
      </div>
    </div>
  )
}

// ─── Tutor Card component ──────────────────────────────────────────────────────
function TutorCard({ tutor }) {
  return (
    <div className="bg-surface-container-lowest/70 backdrop-blur-md border border-surface-container-lowest/30 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] rounded-xl p-md flex flex-col items-center text-center hover:shadow-md transition-shadow duration-300">
      <img
        src={tutor.avatar}
        alt={tutor.name}
        className="w-20 h-20 rounded-full object-cover mb-sm border-2 border-surface bg-surface-container-lowest shadow-sm"
        loading="lazy"
      />
      <h4 className="font-label-md text-label-md text-on-surface mb-xs">{tutor.name}</h4>
      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm mb-md">
        {tutor.subject}
      </span>
      <button className="w-full h-10 border border-outline-variant text-on-surface font-label-sm text-label-sm rounded-lg hover:bg-surface-container hover:text-primary transition-colors">
        Nhắn Tin
      </button>
    </div>
  )
}

// ─── Parent Link Section ──────────────────────────────────────────────────────
function ParentLinkSection({ token }) {
  const [code, setCode] = useState(null)
  const [parents, setParents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Lấy mã chia sẻ
    fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/student/link-code`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => setCode(d.code))
      .catch(console.error)

    // Lấy danh sách phụ huynh
    fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/student/parents`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => { setParents(d.parents || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [token])

  if (loading) return <div className="text-center py-xl"><span className="material-symbols-outlined animate-spin text-primary text-[40px]">sync</span></div>

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-lg animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Code card */}
      <div className="bg-surface rounded-3xl border border-outline-variant/30 shadow-md p-lg flex flex-col md:flex-row gap-xl items-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-2 h-full bg-primary" />
        
        <div className="flex-1 space-y-4">
          <div>
            <h2 className="font-headline-md text-headline-md font-bold text-on-surface">Mã chia sẻ phụ huynh</h2>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">
              Đưa mã này cho phụ huynh của bạn. Phụ huynh sẽ dùng mã này trong "EduX Phụ huynh" để theo dõi quá trình học tập, bài tập, đề thi của bạn.
            </p>
          </div>

          <div className="bg-surface-container-low rounded-2xl border border-outline-variant/30 p-md flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-on-surface-variant mb-1">Mã của bạn</p>
              <p className="font-mono text-3xl font-black text-primary tracking-[0.2em]">{code || '--------'}</p>
            </div>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(code)
                alert('Đã sao chép mã!')
              }}
              className="w-12 h-12 flex items-center justify-center bg-primary/10 text-primary hover:bg-primary/20 rounded-xl transition-colors"
              title="Sao chép"
            >
              <span className="material-symbols-outlined text-[24px]">content_copy</span>
            </button>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200/50">
            <span className="material-symbols-outlined text-[20px]">info</span>
            <p>Mã này là cố định và không thay đổi. Bạn không thể tự hủy liên kết.</p>
          </div>
        </div>
      </div>

      {/* Connected parents list */}
      <div>
        <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface mb-md">Phụ huynh đang theo dõi ({parents.length})</h3>
        
        {parents.length === 0 ? (
          <div className="bg-surface-container-low border border-outline-variant/30 rounded-3xl p-xl flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-surface-container border border-outline-variant/50 rounded-full flex items-center justify-center mb-md">
              <span className="material-symbols-outlined text-[32px] text-on-surface-variant">family_history</span>
            </div>
            <p className="font-label-lg text-on-surface font-medium">Chưa có phụ huynh nào</p>
            <p className="font-body-sm text-on-surface-variant mt-1 max-w-sm">Chia sẻ mã phía trên cho phụ huynh của bạn để họ có thể theo dõi tiến độ học tập.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
            {parents.map(p => (
              <div key={p.id} className="bg-surface rounded-2xl border border-outline-variant/30 p-md flex gap-4 items-center hover:shadow-sm transition-shadow">
                {p.parent_picture ? (
                  <img src={p.parent_picture} alt={p.parent_name} className="w-14 h-14 rounded-full object-cover border border-outline-variant/30" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                    {p.parent_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-label-lg text-on-surface font-semibold">{p.nickname ? `${p.nickname} (${p.parent_name})` : p.parent_name}</p>
                  <p className="font-body-sm text-on-surface-variant">{p.parent_email}</p>
                  <p className="text-xs text-on-surface-variant mt-1 border-t border-outline-variant/20 pt-1">
                    Liên kết ngày: {new Date(p.linked_at).toLocaleDateString('vi-VN')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}

// ─── Student Bookings Section ─────────────────────────────────────────────────
function StudentBookingsSection({ token }) {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [actionLoading, setActionLoading] = useState(null)
  const [reportModal, setReportModal] = useState(null) // booking object
  const [reportReason, setReportReason] = useState('')

  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

  const fetchBookings = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/student/bookings`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setBookings(data.bookings || [])
    } catch (e) {
      console.error('Failed to load bookings', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchBookings() }, [token])

  const handleConfirmComplete = async (booking) => {
    if (!window.confirm(`Xác nhận buổi học "${booking.subject}" đã hoàn thành? Tiền sẽ được giải ngân cho gia sư ngay lập tức.`)) return
    setActionLoading(booking.id + '_confirm')
    try {
      const res = await fetch(`${API_BASE}/api/escrow/manual-release/${booking.id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        alert('✅ Xác nhận thành công! Tiền đã được giải ngân cho gia sư.')
        fetchBookings()
      } else {
        alert(data.message || 'Có lỗi xảy ra.')
      }
    } catch { alert('Lỗi kết nối.') }
    setActionLoading(null)
  }

  const handleReport = async () => {
    if (!reportReason.trim()) return alert('Vui lòng nhập lý do báo cáo.')
    setActionLoading(reportModal.id + '_report')
    try {
      const res = await fetch(`${API_BASE}/api/bookings/${reportModal.id}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: reportReason })
      })
      const data = await res.json()
      if (res.ok) {
        alert('✅ Đã gửi báo cáo. Admin sẽ xem xét trong 24-48h. Tiền tạm thời bị giữ lại.')
        setReportModal(null)
        setReportReason('')
        fetchBookings()
      } else {
        alert(data.message || 'Có lỗi xảy ra.')
      }
    } catch { alert('Lỗi kết nối.') }
    setActionLoading(null)
  }

  const fmtMoney = (n) => Number(n || 0).toLocaleString('vi-VN') + 'đ'
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

  const statusConfig = {
    'Pending':   { label: 'Chờ duyệt',    cls: 'bg-amber-100 text-amber-700',  icon: 'pending' },
    'Approved':  { label: 'Đã duyệt',     cls: 'bg-blue-100 text-blue-700',    icon: 'check_circle' },
    'Cancelled': { label: 'Đã hủy',       cls: 'bg-red-100 text-red-700',      icon: 'cancel' },
    'Declined':  { label: 'Bị từ chối',   cls: 'bg-red-100 text-red-700',      icon: 'block' },
    'Rejected':  { label: 'Bị từ chối',   cls: 'bg-red-100 text-red-700',      icon: 'block' },
  }

  const escrowConfig = (b) => {
    if (b.has_open_dispute) return { label: 'Đang khiếu nại', cls: 'bg-orange-100 text-orange-700', icon: 'gavel' }
    if (b.escrow_released_at) return { label: 'Đã giải ngân', cls: 'bg-green-100 text-green-700', icon: 'payments' }
    if (b.attendance_status === 'present' && b.auto_release_at) {
      const releaseAt = new Date(b.auto_release_at)
      const hoursLeft = Math.max(0, Math.round((releaseAt - Date.now()) / 3600000))
      return { label: `Giải ngân sau ${hoursLeft}h`, cls: 'bg-blue-100 text-blue-700', icon: 'hourglass_top' }
    }
    if (b.escrow_tx_id && !b.escrow_released_at) return { label: 'Tiền tạm giữ', cls: 'bg-amber-100 text-amber-700', icon: 'lock' }
    return null
  }

  const filtered = bookings.filter(b => {
    if (filter === 'active') return ['Pending', 'Approved'].includes(b.status)
    if (filter === 'completed') return b.escrow_released_at != null
    if (filter === 'cancelled') return ['Cancelled', 'Declined', 'Rejected'].includes(b.status)
    return true
  })

  const upcoming = bookings.filter(b => b.status === 'Approved' && !b.escrow_released_at)
  const pendingRelease = bookings.filter(b => b.attendance_status === 'present' && !b.escrow_released_at && !b.has_open_dispute)

  return (
    <div className="flex flex-col gap-lg max-w-5xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-md">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_month</span>
            Lịch học của tôi
          </h2>
          <p className="font-body-sm text-on-surface-variant">{bookings.length} buổi học tổng cộng</p>
        </div>
        <a href="#/tutor" className="h-10 px-4 bg-primary text-on-primary rounded-xl font-label-md flex items-center gap-1 hover:bg-primary/90 transition-colors">
          <span className="material-symbols-outlined text-[18px]">add</span>
          Đặt lịch mới
        </a>
      </div>

      {/* Pending release banner */}
      {pendingRelease.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-blue-600 text-[24px] shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
          <div className="flex-1">
            <p className="font-label-md text-blue-800 font-semibold">
              {pendingRelease.length} buổi học đang chờ xác nhận
            </p>
            <p className="font-body-sm text-blue-600 mt-0.5">
              Tiền sẽ tự động giải ngân sau 24h. Nếu hài lòng, bấm "Xác nhận hoàn thành" để giải ngân ngay và không cần đợi.
            </p>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex bg-surface-container-high/60 rounded-xl p-1 gap-1">
        {[
          { key: 'all', label: 'Tất cả' },
          { key: 'active', label: 'Đang học' },
          { key: 'completed', label: 'Đã hoàn thành' },
          { key: 'cancelled', label: 'Đã hủy' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`flex-1 h-9 rounded-lg font-label-sm transition-all ${filter === f.key ? 'bg-surface shadow-sm text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-xl">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-xl gap-md text-center bg-surface rounded-2xl border border-outline-variant/20">
          <span className="material-symbols-outlined text-[48px] text-on-surface-variant">event_available</span>
          <p className="font-body-md text-on-surface-variant">Chưa có buổi học nào</p>
          <a href="#/tutor" className="h-10 px-6 bg-primary text-on-primary rounded-xl font-label-md hover:bg-primary/90 transition-colors">
            Tìm gia sư ngay
          </a>
        </div>
      ) : (
        <div className="flex flex-col gap-md">
          {filtered.map(b => {
            const sc = statusConfig[b.status] || statusConfig['Pending']
            const ec = escrowConfig(b)
            const canConfirm = b.attendance_status === 'present' && !b.escrow_released_at && !b.has_open_dispute && b.escrow_tx_id
            const canReport = b.status === 'Approved' && !b.has_open_dispute && !b.escrow_released_at
            const canCancel = b.status === 'Pending' || (b.status === 'Approved' && !b.escrow_released_at)

            return (
              <div key={b.id} className="bg-surface rounded-2xl border border-outline-variant/20 shadow-sm p-md">
                <div className="flex items-start justify-between gap-md flex-wrap">
                  {/* Tutor info */}
                  <div className="flex items-center gap-3">
                    {b.tutor_picture
                      ? <img src={b.tutor_picture} alt={b.tutor_name} className="w-11 h-11 rounded-full object-cover border border-outline-variant/20" />
                      : <div className="w-11 h-11 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center">{(b.tutor_full_name || b.tutor_name || 'T')[0].toUpperCase()}</div>
                    }
                    <div>
                      <p className="font-label-md text-on-surface font-semibold">{b.tutor_full_name || b.tutor_name || 'Gia sư'}</p>
                      <p className="font-label-sm text-on-surface-variant">{b.subject}</p>
                      {b.child_name && <p className="text-xs text-on-surface-variant">Học sinh: {b.child_name}</p>}
                    </div>
                  </div>

                  {/* Date & time */}
                  <div className="text-right">
                    <p className="font-label-md text-on-surface">{fmtDate(b.lesson_date)}</p>
                    <p className="font-label-sm text-on-surface-variant">{b.time_slot}</p>
                    {b.lesson_fee > 0 && (
                      <p className="text-xs text-primary font-semibold mt-0.5">{fmtMoney(b.lesson_fee)}</p>
                    )}
                  </div>
                </div>

                {/* Status badges */}
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${sc.cls}`}>
                    <span className="material-symbols-outlined text-[13px]">{sc.icon}</span>
                    {sc.label}
                  </span>
                  {ec && (
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${ec.cls}`}>
                      <span className="material-symbols-outlined text-[13px]">{ec.icon}</span>
                      {ec.label}
                    </span>
                  )}
                  {b.attendance_status && (
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      b.attendance_status === 'present' ? 'bg-green-100 text-green-700' :
                      b.attendance_status === 'absent' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {b.attendance_status === 'present' ? '✓ Có mặt' : b.attendance_status === 'absent' ? '✗ Vắng' : '~ Có phép'}
                    </span>
                  )}
                </div>

                {/* Actions */}
                {(canConfirm || canReport || canCancel) && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {canConfirm && (
                      <button
                        onClick={() => handleConfirmComplete(b)}
                        disabled={actionLoading === b.id + '_confirm'}
                        className="h-8 px-3 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[14px]">done_all</span>
                        {actionLoading === b.id + '_confirm' ? 'Đang xử lý...' : 'Xác nhận hoàn thành'}
                      </button>
                    )}
                    {canReport && (
                      <button
                        onClick={() => { setReportModal(b); setReportReason('') }}
                        className="h-8 px-3 bg-red-50 border border-red-300 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[14px]">report</span>
                        Báo cáo vi phạm
                      </button>
                    )}
                    {canCancel && (
                      <button
                        onClick={async () => {
                          if (!window.confirm('Bạn có chắc muốn hủy buổi học này?')) return
                          setActionLoading(b.id + '_cancel')
                          try {
                            const res = await fetch(`${API_BASE}/api/bookings/${b.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                              body: JSON.stringify({ status: 'Cancelled' })
                            })
                            const data = await res.json()
                            if (res.ok) { fetchBookings() } else { alert(data.message) }
                          } catch { alert('Lỗi kết nối.') }
                          setActionLoading(null)
                        }}
                        disabled={actionLoading === b.id + '_cancel'}
                        className="h-8 px-3 bg-surface-container border border-outline-variant text-on-surface-variant rounded-lg text-xs font-semibold hover:bg-surface-container-high transition-colors disabled:opacity-50 flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[14px]">cancel</span>
                        Hủy lịch
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Report Modal */}
      {reportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-surface w-full max-w-sm rounded-3xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-outline-variant/20">
              <h3 className="font-headline-sm text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-red-500">report</span>
                Báo cáo vi phạm
              </h3>
              <button onClick={() => setReportModal(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="p-4 flex flex-col gap-4">
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm">
                <p className="font-medium text-red-800">{reportModal.subject} — {reportModal.tutor_full_name || reportModal.tutor_name}</p>
                <p className="text-red-600 text-xs mt-1">Tiền sẽ bị tạm giữ cho đến khi Admin giải quyết (24–48h).</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">Lý do báo cáo <span className="text-error">*</span></label>
                <textarea value={reportReason} onChange={e => setReportReason(e.target.value)} rows={4}
                  placeholder="Mô tả vấn đề bạn gặp phải (gia sư không đến, dạy sai nội dung, hành vi không phù hợp...)"
                  className="w-full p-3 rounded-xl border border-outline-variant bg-surface focus:border-primary focus:ring-1 focus:ring-primary resize-none text-sm"
                />
              </div>
              <button onClick={handleReport} disabled={!reportReason.trim() || actionLoading === reportModal.id + '_report'}
                className="h-11 w-full rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {actionLoading === reportModal.id + '_report' && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                Gửi báo cáo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
