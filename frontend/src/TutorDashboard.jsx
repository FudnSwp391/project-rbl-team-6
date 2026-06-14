/**
 * TutorDashboard.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Dashboard dành cho gia sư (role: tutor).
 * Hiển thị tuỳ theo trạng thái duyệt hồ sơ:
 *   no_profile → redirect sang onboarding
 *   pending    → màn chờ admin kiểm duyệt
 *   rejected   → màn bị từ chối + lý do
 *   approved   → dashboard đầy đủ
 */
import { useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import MessagesSection from './components/MessagesSection'
import TutorAssessmentManager from './components/TutorAssessmentManager'
import TutorGradingDashboard from './components/TutorGradingDashboard'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

// ─── Mock data ────────────────────────────────────────────────────────────────
const PENDING_REQUESTS = [
  {
    id: 1,
    initials: 'SA',
    name: 'Sarah Anderson',
    subject: 'Advanced Calculus',
    date: 'Oct 24, 2:00 PM',
  },
  {
    id: 2,
    initials: 'MC',
    name: 'Michael Chen',
    subject: 'AP Physics',
    date: 'Oct 25, 4:30 PM',
  },
  {
    id: 3,
    initials: 'LT',
    name: 'Lisa Thompson',
    subject: 'Linear Algebra',
    date: 'Oct 26, 10:00 AM',
  },
]

const SCHEDULE_TODAY = [
  {
    id: 1,
    initials: 'EL',
    name: 'Emma Larson',
    subject: 'Linear Algebra',
    time: '10:00 AM - 11:00 AM',
    isNow: true,
  },
  {
    id: 2,
    initials: 'JD',
    name: 'James Doe',
    subject: 'Statistics 101',
    time: '1:00 PM - 2:00 PM',
    isNow: false,
  },
  {
    id: 3,
    initials: 'AK',
    name: 'Aisha Khan',
    subject: 'Discrete Math',
    time: '3:30 PM - 4:30 PM',
    isNow: false,
  },
]

const NAV_ITEMS = [

  { id: 'overview', icon: 'dashboard', label: 'Overview' },
  { id: 'schedule', icon: 'calendar_today', label: 'My Schedule' },
  { id: 'students', icon: 'group', label: 'Students' },
  { id: 'assessments', icon: 'description', label: 'Assessments' },
  { id: 'grading', icon: 'fact_check', label: 'Review & Grade' },
  { id: 'earnings', icon: 'payments', label: 'Earnings' },
  { id: 'messages', icon: 'chat', label: 'Messages' },
  { id: 'tutor-profile', icon: 'badge', label: 'My Profile' },

]

// ─── Màn chờ duyệt ────────────────────────────────────────────────────────────
function PendingScreen({ displayName, email, onLogout }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e0e7ff] via-[#f8f9fb] to-[#e0f2fe] flex flex-col items-center justify-center px-4 py-16">
      {/* Header */}
      <div className="w-full max-w-2xl mb-8 flex items-center justify-between">
        <div className="font-bold text-2xl text-primary tracking-tight">EduX</div>
        <button
          onClick={onLogout}
          className="text-on-surface-variant text-sm font-semibold hover:bg-white/60 px-3 py-1.5 rounded-lg transition-all"
        >
          Đăng xuất
        </button>
      </div>

      {/* Card */}
      <div className="bg-white/80 backdrop-blur-md border border-white/40 shadow-2xl rounded-3xl p-10 w-full max-w-2xl text-center">
        {/* Animated icon */}
        <div className="relative w-24 h-24 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full bg-amber-100 animate-ping opacity-40" />
          <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center shadow-lg">
            <span className="material-symbols-outlined text-white text-[44px]">pending_actions</span>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-on-surface mb-2">
          Hồ sơ đang chờ kiểm duyệt
        </h1>
        <p className="text-on-surface-variant text-base mb-6 leading-relaxed">
          Xin chào <strong>{displayName}</strong>! Hồ sơ đăng ký gia sư của bạn đã được gửi thành công.
          <br />Chúng tôi sẽ xem xét và gửi kết quả về email <strong>{email}</strong>.
        </p>

        {/* Steps */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          {[
            { icon: 'task_alt', label: 'Đã nộp hồ sơ', done: true },
            { icon: 'manage_search', label: 'Admin kiểm duyệt', done: false, active: true },
            { icon: 'mark_email_read', label: 'Nhận email kết quả', done: false },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`flex flex-col items-center gap-1`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  s.done
                    ? 'bg-green-500 text-white'
                    : s.active
                    ? 'bg-amber-400 text-white animate-pulse'
                    : 'bg-surface-container text-on-surface-variant'
                }`}>
                  <span className="material-symbols-outlined text-[20px]">{s.icon}</span>
                </div>
                <span className={`text-xs font-medium whitespace-nowrap ${
                  s.done ? 'text-green-600' : s.active ? 'text-amber-600' : 'text-on-surface-variant'
                }`}>{s.label}</span>
              </div>
              {i < 2 && (
                <div className="hidden sm:block w-8 h-[2px] bg-outline-variant -mt-5" />
              )}
            </div>
          ))}
        </div>

        {/* Info box */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left flex gap-3">
          <span className="material-symbols-outlined text-amber-500 flex-shrink-0 mt-0.5">info</span>
          <div>
            <p className="text-sm font-semibold text-amber-800 mb-1">Thời gian xét duyệt</p>
            <p className="text-sm text-amber-700">
              Thông thường từ <strong>1–3 ngày làm việc</strong>. Sau khi được duyệt, tài khoản gia sư của bạn sẽ được kích hoạt và bạn sẽ nhận được email thông báo.
            </p>
          </div>
        </div>
      </div>

      <p className="mt-6 text-sm text-on-surface-variant text-center">
        Cần hỗ trợ? Liên hệ{' '}
        <a href="mailto:support@academiaflow.com" className="text-primary hover:underline">
          support@academiaflow.com
        </a>
      </p>
    </div>
  )
}

// ─── Màn bị từ chối ───────────────────────────────────────────────────────────
function RejectedScreen({ displayName, rejectReason, onLogout }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#ffe4e6] via-[#f8f9fb] to-[#fce7f3] flex flex-col items-center justify-center px-4 py-16">
      {/* Header */}
      <div className="w-full max-w-2xl mb-8 flex items-center justify-between">
        <div className="font-bold text-2xl text-primary tracking-tight">EduX</div>
        <button
          onClick={onLogout}
          className="text-on-surface-variant text-sm font-semibold hover:bg-white/60 px-3 py-1.5 rounded-lg transition-all"
        >
          Đăng xuất
        </button>
      </div>

      {/* Card */}
      <div className="bg-white/80 backdrop-blur-md border border-white/40 shadow-2xl rounded-3xl p-10 w-full max-w-2xl text-center">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center shadow-lg">
          <span className="material-symbols-outlined text-white text-[44px]">cancel</span>
        </div>

        <h1 className="text-2xl font-bold text-on-surface mb-2">
          Hồ sơ chưa được chấp thuận
        </h1>
        <p className="text-on-surface-variant text-base mb-6">
          Xin chào <strong>{displayName}</strong>! Hồ sơ của bạn đã được xem xét nhưng chưa đáp ứng đủ điều kiện.
        </p>

        {/* Reject reason */}
        {rejectReason && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-left mb-6 flex gap-3">
            <span className="material-symbols-outlined text-red-500 flex-shrink-0 mt-0.5">error</span>
            <div>
              <p className="text-sm font-semibold text-red-800 mb-1">Lý do từ chối</p>
              <p className="text-sm text-red-700">{rejectReason}</p>
            </div>
          </div>
        )}

        {/* Re-apply CTA */}
        <div className="bg-surface-container-low rounded-xl p-4 text-left mb-6 flex gap-3">
          <span className="material-symbols-outlined text-primary flex-shrink-0 mt-0.5">lightbulb</span>
          <p className="text-sm text-on-surface-variant">
            Bạn có thể chỉnh sửa lại hồ sơ và nộp lại để được xem xét lần tiếp theo.
          </p>
        </div>

        <a
          href="#/tutor-profile"
          className="inline-flex items-center gap-2 px-8 py-3 bg-primary text-white font-semibold rounded-xl hover:brightness-110 active:scale-95 transition-all duration-200 shadow-md"
        >
          <span className="material-symbols-outlined text-[20px]">edit_document</span>
          Chỉnh sửa & Nộp lại hồ sơ
        </a>
      </div>

      <p className="mt-6 text-sm text-on-surface-variant text-center">
        Cần hỗ trợ? Liên hệ{' '}
        <a href="mailto:support@academiaflow.com" className="text-primary hover:underline">
          support@academiaflow.com
        </a>
      </p>
    </div>
  )
}

// ─── Loading screen ───────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-on-surface-variant">
        <span className="material-symbols-outlined text-[48px] text-primary animate-spin">progress_activity</span>
        <p className="font-label-md text-label-md">Đang tải thông tin...</p>
      </div>
    </div>
  )
}

export default function TutorDashboard() {
  const { user, token, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('overview')
  const [requests, setRequests] = useState(PENDING_REQUESTS)

  // ── Kiểm tra trạng thái hồ sơ ─────────────────────────────────────────────
  const [profileStatus, setProfileStatus] = useState(null) // null = loading
  const [rejectReason, setRejectReason] = useState('')

  useEffect(() => {
    const checkProfile = async () => {
      if (!token) { setProfileStatus('no_profile'); return }
      try {
        const res = await fetch(`${API}/api/tutor/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.status === 404) {
          setProfileStatus('no_profile')
        } else if (res.ok) {
          const data = await res.json()
          setProfileStatus(data.status || 'pending')
          setRejectReason(data.reject_reason || '')
        } else {
          setProfileStatus('error')
        }
      } catch {
        setProfileStatus('error')
      }
    }
    checkProfile()
  }, [token])

  const displayName = user?.name || user?.email?.split('@')[0] || 'Tutor'
  const initials = displayName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

  // ── Status gates ──────────────────────────────────────────────────────────
  if (profileStatus === null) return <LoadingScreen />

  if (profileStatus === 'no_profile') {
    // Chưa có hồ sơ → về trang onboarding
    window.location.hash = '/tutor-profile'
    return null
  }

  if (profileStatus === 'pending') {
    return <PendingScreen displayName={displayName} email={user?.email} onLogout={logout} />
  }

  if (profileStatus === 'rejected') {
    return <RejectedScreen displayName={displayName} rejectReason={rejectReason} onLogout={logout} />
  }

  if (profileStatus === 'error') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center text-on-surface-variant">
          <span className="material-symbols-outlined text-[48px] text-error block mb-2">cloud_off</span>
          <p>Không thể kết nối. Vui lòng thử lại sau.</p>
        </div>
      </div>
    )
  }

  // ── profileStatus === 'approved' → hiện dashboard đầy đủ ─────────────────
  // Xử lý Accept / Decline request
  const handleAccept = (id) => {
    setRequests((prev) => prev.filter((r) => r.id !== id))
  }
  const handleDecline = (id) => {
    setRequests((prev) => prev.filter((r) => r.id !== id))
  }

  return (
    <div className="bg-background text-on-surface font-body-md text-body-md overflow-x-hidden min-h-screen flex h-screen">

      {/* ── Mobile overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ══════════════════════════════════════════════
          SIDEBAR
      ══════════════════════════════════════════════ */}
      <nav
        className={`
          fixed left-0 top-0 h-full z-40 flex flex-col py-lg w-64
          bg-surface-container-low border-r border-surface-variant/50
          transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        {/* Logo */}
        <div className="px-md mb-lg">
          <div className="flex items-center gap-sm">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary">
              <span className="material-symbols-outlined text-[18px]">school</span>
            </div>
            <div>
              <h1 className="font-headline-md text-[20px] leading-tight font-black text-primary">
                EduX
              </h1>
              <p className="font-label-sm text-label-sm text-on-surface-variant">Cổng Gia Sư</p>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <div className="flex flex-col gap-2 px-sm flex-1 mt-4">

          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <a
                key={item.id}
                href="#"
                onClick={(e) => { 
                  e.preventDefault(); 
                  if (item.id === 'tutor-profile') {
                    window.location.hash = '/tutor-profile';
                  } else {
                    setActiveSection(item.id); 
                  }
                  setSidebarOpen(false); 
                }}
                className={`
                  flex items-center gap-sm px-md py-sm rounded-lg
                  transition-all duration-200 active:scale-95
                  ${
                    isActive
                      ? 'text-primary font-bold bg-secondary-container'
                      : 'text-on-surface-variant hover:bg-surface-container-high'
                  }
                `}
              >
                <span
                  className="material-symbols-outlined"
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                >
                  {item.icon}
                </span>
                <span className="font-label-md text-label-md">{item.label}</span>
              </a>
            );
          })}
        </div>

        {/* Bottom */}
        <div className="px-md mt-auto pt-lg border-t border-surface-variant/50 flex flex-col gap-2">
          <a
            href="#"
            className="text-on-surface-variant flex items-center gap-sm px-md py-sm hover:bg-surface-container-high rounded-lg transition-all duration-200"
          >
            <span className="material-symbols-outlined">settings</span>
            <span className="font-label-md text-label-md">Cài Đặt</span>
          </a>
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); logout() }}
            className="text-on-surface-variant flex items-center gap-sm px-md py-sm hover:bg-surface-container-high rounded-lg transition-all duration-200"
          >
            <span className="material-symbols-outlined">logout</span>
            <span className="font-label-md text-label-md">Đăng Xuất</span>
          </a>
          <button className="mt-2 w-full h-12 bg-primary text-on-primary font-label-md text-label-md rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
            <span className="material-symbols-outlined">support_agent</span>
            Hỗ Trợ
          </button>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════
          MAIN CONTENT
      ══════════════════════════════════════════════ */}
      <div className="flex-1 lg:ml-64 flex flex-col h-screen overflow-hidden">

        {/* ── Top Bar ── */}
        <header className="w-full h-16 bg-surface/80 backdrop-blur-sm z-30 sticky top-0 border-b border-surface-variant/30">
          <div className="flex justify-between items-center px-gutter w-full h-full gap-md">

            {/* Mobile hamburger */}
            <button
              className="lg:hidden w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-primary rounded-full transition-colors"
              onClick={() => setSidebarOpen(true)}
              aria-label="Mở menu"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>

            {/* Search */}
            <div className="flex-1 flex items-center">
              <div className="relative w-full max-w-md hidden md:block">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
                  search
                </span>
                <input
                  className="w-full h-10 pl-10 pr-4 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-body-md text-body-md outline-none"
                  placeholder="Tìm kiếm học sinh, lớp học hoặc môn học..."
                  type="text"
                />
              </div>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-md">
              {/* Notification bell */}
              <button className="relative p-2 text-on-surface-variant hover:text-primary transition-colors duration-200">
                <span className="material-symbols-outlined">notifications</span>
                <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full" />
              </button>

              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-primary overflow-hidden flex items-center justify-center text-on-primary font-label-md font-bold cursor-pointer border-2 border-surface select-none">
                {user?.picture ? (
                  <img src={user.picture} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  initials
                )}
              </div>
            </div>
          </div>
        </header>

        {/* ── Scrollable main ── */}
        <main className="flex-1 overflow-y-auto p-gutter lg:p-lg space-y-lg relative">

          {/* Decorative background glow */}
          <div className="fixed top-0 right-0 w-1/2 h-1/2 bg-gradient-to-bl from-primary-fixed-dim/20 to-transparent pointer-events-none -z-10 blur-3xl rounded-full" />

          {/* ── Messages ── */}
          {activeSection === 'messages' && <MessagesSection token={token} user={user} />}

          {/* ── Assessments ── */}
          {activeSection === 'assessments' && <TutorAssessmentManager token={token} />}

          {/* ── Grading ── */}
          {activeSection === 'grading' && <TutorGradingDashboard token={token} />}

          {/* ── Welcome (Overview) ── */}
          {activeSection === 'overview' && (
            <>
              <div className="space-y-1">
                <h2 className="font-headline-lg text-headline-lg text-on-surface">
              Chào buổi sáng, {displayName} 👋
            </h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              Đây là tổng quan hàng ngày của bạn.
            </p>
          </div>

          {/* ── Stats Grid ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
            {/* Earnings */}
            <div className="bg-white/70 backdrop-blur-md border border-white/30 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.08)] rounded-[1rem] p-md flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined">payments</span>
                </div>
                <span className="inline-flex items-center gap-1 text-[14px] font-semibold text-[#16a34a] bg-[#dcfce7] px-2 py-1 rounded-full">
                  <span className="material-symbols-outlined text-[16px]">trending_up</span>
                  +12%
                </span>
              </div>
              <div>
                <p className="font-label-md text-label-md text-on-surface-variant mb-1">
                  Tổng Thu Nhập (Tháng Này)
                </p>
                <p className="text-[36px] leading-[44px] font-bold text-on-surface">$3,240</p>
              </div>
            </div>

            {/* Hours */}
            <div className="bg-white/70 backdrop-blur-md border border-white/30 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.08)] rounded-[1rem] p-md flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-full bg-tertiary-fixed flex items-center justify-center text-tertiary">
                  <span className="material-symbols-outlined">schedule</span>
                </div>
              </div>
              <div>
                <p className="font-label-md text-label-md text-on-surface-variant mb-1">
                  Tổng Số Giờ Dạy
                </p>
                <p className="text-[36px] leading-[44px] font-bold text-on-surface">84.5</p>
              </div>
            </div>

            {/* Students */}
            <div className="bg-white/70 backdrop-blur-md border border-white/30 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.08)] rounded-[1rem] p-md flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-full bg-secondary-fixed flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined">groups</span>
                </div>
              </div>
              <div>
                <p className="font-label-md text-label-md text-on-surface-variant mb-1">
                  Học Sinh Đang Hoạt Động
                </p>
                <p className="text-[36px] leading-[44px] font-bold text-on-surface">28</p>
              </div>
            </div>
          </div>

          {/* ── Two-column section ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">

            {/* ── LEFT: Pending Requests ── */}
            <div className="lg:col-span-2 space-y-md">
              <div className="flex items-center justify-between">
                <h3 className="font-headline-md text-headline-md text-on-surface">
                  Yêu Cầu Đang Chờ
                </h3>
                {requests.length > 0 && (
                  <span className="bg-error text-on-error text-xs font-bold px-2 py-0.5 rounded-full">
                    {requests.length}
                  </span>
                )}
              </div>

              <div className="bg-white/70 backdrop-blur-md border border-white/30 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.08)] rounded-[1rem] overflow-hidden">
                {requests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[48px]">task_alt</span>
                    <p className="font-label-md text-label-md">Không có yêu cầu nào đang chờ. Mọi thứ đều ổn!</p>
                  </div>
                ) : (
                  <div className="divide-y divide-surface-variant/50">
                    {requests.map((req) => (
                      <RequestRow
                        key={req.id}
                        request={req}
                        onAccept={() => handleAccept(req.id)}
                        onDecline={() => handleDecline(req.id)}
                      />
                    ))}
                  </div>
                )}

                <div className="p-4 bg-surface-container-lowest/30 border-t border-surface-variant/50 text-center">
                  <a href="#" className="text-primary font-label-md hover:underline">
                    Xem tất cả yêu cầu ({requests.length})
                  </a>
                </div>
              </div>
            </div>

            {/* ── RIGHT: Today's Schedule ── */}
            <div className="space-y-md">
              <h3 className="font-headline-md text-headline-md text-on-surface">
                Lịch Hôm Nay
              </h3>
              <div className="bg-white/70 backdrop-blur-md border border-white/30 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.08)] rounded-[1rem] p-md flex flex-col">
                <div className="relative border-l-2 border-surface-variant ml-3 space-y-6 flex-1">
                  {SCHEDULE_TODAY.map((slot) => (
                    <ScheduleItem key={slot.id} slot={slot} />
                  ))}
                </div>
                <button className="mt-6 w-full h-10 border border-outline-variant rounded-lg font-label-md text-on-surface-variant hover:bg-surface-container-high transition-colors">
                  Mở Lịch Đầy Đủ
                </button>
              </div>
            </div>
          </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}

// ─── Request Row ──────────────────────────────────────────────────────────────
function RequestRow({ request, onAccept, onDecline }) {
  return (
    <div className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-surface-container-lowest/50 transition-colors">
      <div className="flex items-center gap-4">
        {/* Avatar initials */}
        <div className="w-12 h-12 rounded-full bg-secondary-container flex-shrink-0 flex items-center justify-center text-on-secondary-container font-label-md font-bold">
          {request.initials}
        </div>
        <div>
          <p className="font-label-md text-[16px] text-on-surface mb-0.5">{request.name}</p>
          <p className="font-body-md text-[14px] text-on-surface-variant flex items-center gap-2 flex-wrap">
            <span className="inline-block px-2 py-0.5 rounded-full bg-tertiary-fixed-dim/20 text-primary font-label-sm">
              {request.subject}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">calendar_today</span>
              {request.date}
            </span>
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <button
          className="flex-1 sm:flex-none px-4 h-10 rounded-lg border border-outline-variant text-on-surface-variant font-label-md hover:bg-surface-container-high transition-colors"
          onClick={onDecline}
        >
          Từ Chối
        </button>
        <button
          className="flex-1 sm:flex-none px-4 h-10 rounded-lg bg-primary text-on-primary font-label-md hover:bg-primary/90 transition-colors shadow-sm"
          onClick={onAccept}
        >
          Chấp Nhận
        </button>
      </div>
    </div>
  )
}

// ─── Schedule Item ────────────────────────────────────────────────────────────
function ScheduleItem({ slot }) {
  if (slot.isNow) {
    return (
      <div className="relative pl-6">
        {/* Active dot */}
        <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-primary ring-4 ring-white" />
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <p className="font-label-sm text-primary mb-2 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">schedule</span>
            {slot.time} <span className="ml-1 font-bold">(Ngay Bây Giờ)</span>
          </p>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container font-label-sm font-bold">
              {slot.initials}
            </div>
            <div>
              <p className="font-label-md text-on-surface">{slot.name}</p>
              <p className="font-label-sm text-on-surface-variant">{slot.subject}</p>
            </div>
          </div>
          <button className="w-full h-10 bg-primary text-on-primary rounded-lg font-label-md hover:bg-primary/90 transition-colors shadow-md flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[18px]">videocam</span>
            Bắt Đầu Cuộc Họp
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative pl-6 opacity-70 hover:opacity-100 transition-opacity">
      {/* Inactive dot */}
      <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-surface-variant ring-4 ring-white" />
      <div>
        <p className="font-label-sm text-on-surface-variant mb-1">{slot.time}</p>
        <div className="flex items-center gap-3 bg-surface-container-lowest/50 p-3 rounded-lg border border-outline-variant/30">
          <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container font-label-sm font-bold">
            {slot.initials}
          </div>
          <div>
            <p className="font-label-md text-on-surface">{slot.name}</p>
            <p className="font-label-sm text-on-surface-variant">{slot.subject}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
