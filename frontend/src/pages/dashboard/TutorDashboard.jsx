/**
 * TutorDashboard.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Dashboard dành cho gia sư (role: tutor).
 * Hiển thị: thu nhập, giờ dạy, học sinh, yêu cầu chờ duyệt, lịch hôm nay.
 */
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../services/eduxApi'
import { toastSuccess, toastError } from '../../services/toast'
import TutorCoursesSection from './TutorCoursesSection'
import TutorProfileSection from './TutorProfileSection'

// ─── API helper ────────────────────────────────────────────────────────────────
const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const todayStr = () => new Date().toISOString().slice(0, 10)
const fmtMoney = (n) => new Intl.NumberFormat('vi-VN').format(Number(n) || 0)

const NAV_ITEMS = [
  { icon: 'dashboard', label: 'Overview', active: true },
  { icon: 'calendar_today', label: 'My Schedule' },
  { icon: 'group', label: 'Students' },
  { icon: 'payments', label: 'Earnings' },
]

export default function TutorDashboard() {
  const { user, token, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Số liệu tổng quan thật (doanh thu, học sinh, buổi học...)
  const [stats, setStats] = useState(null)

  // Lịch học sinh đã đặt với gia sư này
  const [studentBookings, setStudentBookings] = useState([])
  const [bookingsLoading, setBookingsLoading] = useState(true)
  const [bookingsErr, setBookingsErr] = useState(null)

  useEffect(() => {
    if (!token) return
    setBookingsLoading(true)
    fetch(`${API}/api/tutor/bookings`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        const data = await res.json().catch(() => [])
        if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`)
        return data
      })
      .then((rows) => setStudentBookings(rows))
      .catch((e) => {
        console.warn('[tutor bookings] load failed:', e.message)
        setBookingsErr('Không tải được lịch học sinh (kiểm tra backend đang chạy).')
      })
      .finally(() => setBookingsLoading(false))
  }, [token])

  // Tải số liệu tổng quan
  useEffect(() => {
    if (!token) return
    fetch(`${API}/api/tutor/stats`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        const data = await res.json().catch(() => null)
        if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`)
        return data
      })
      .then(setStats)
      .catch((e) => console.warn('[tutor stats] load failed:', e.message))
  }, [token])

  // Phân loại lịch theo hôm nay / sắp tới
  const today = todayStr()
  const confirmedBookings = studentBookings.filter(b => b.status === 'Approved')
  const pendingBookings = studentBookings.filter(b => b.status === 'Pending')
  const todayBookings = confirmedBookings.filter(b => (b.lesson_date || '').slice(0, 10) === today)
  const upcomingBookings = confirmedBookings.filter(b => (b.lesson_date || '').slice(0, 10) > today)

  // Gia sư duyệt / từ chối 1 yêu cầu lịch
  const [actingId, setActingId] = useState(null)
  const handleBookingAction = async (id, status) => {
    setActingId(id)
    try {
      await api.setBookingStatus(id, status)
      setStudentBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b))
      toastSuccess(status === 'Approved' ? 'Đã duyệt lịch học.' : 'Đã từ chối lịch học.')
    } catch (e) {
      toastError(e.message)
    } finally {
      setActingId(null)
    }
  }

  // Tên hiển thị
  const displayName = user?.name || user?.email?.split('@')[0] || 'Tutor'
  // Chữ viết tắt làm avatar
  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

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
              <p className="font-label-sm text-label-sm text-on-surface-variant">Tutor Portal</p>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <div className="flex flex-col gap-2 px-sm flex-1 mt-4">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.label}
              href="#"
              className={`
                flex items-center gap-sm px-md py-sm rounded-lg
                transition-all duration-200 active:scale-95
                ${
                  item.active
                    ? 'text-primary font-bold bg-secondary-container'
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                }
              `}
            >
              <span
                className="material-symbols-outlined"
                style={item.active ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                {item.icon}
              </span>
              <span className="font-label-md text-label-md">{item.label}</span>
            </a>
          ))}
        </div>

        {/* Bottom */}
        <div className="px-md mt-auto pt-lg border-t border-surface-variant/50 flex flex-col gap-2">
          <a
            href="#"
            className="text-on-surface-variant flex items-center gap-sm px-md py-sm hover:bg-surface-container-high rounded-lg transition-all duration-200"
          >
            <span className="material-symbols-outlined">settings</span>
            <span className="font-label-md text-label-md">Settings</span>
          </a>
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); logout() }}
            className="text-on-surface-variant flex items-center gap-sm px-md py-sm hover:bg-surface-container-high rounded-lg transition-all duration-200"
          >
            <span className="material-symbols-outlined">logout</span>
            <span className="font-label-md text-label-md">Logout</span>
          </a>
          <button className="mt-2 w-full h-12 bg-primary text-on-primary font-label-md text-label-md rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
            <span className="material-symbols-outlined">support_agent</span>
            Get Support
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
              aria-label="Open menu"
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
                  placeholder="Search students, classes, or subjects..."
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

          {/* ── Welcome ── */}
          <div className="space-y-1">
            <h2 className="font-headline-lg text-headline-lg text-on-surface">
              Good Morning, {displayName} 👋
            </h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              Here is your daily overview.
            </p>
          </div>

          {/* ── Stats Grid (dữ liệu thật từ /api/tutor/stats) ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
            <TutorStatCard
              icon="payments" tone="primary"
              label="Doanh thu khóa học"
              value={stats ? `${fmtMoney(stats.revenue)}đ` : '—'}
            />
            <TutorStatCard
              icon="groups" tone="secondary"
              label="Học sinh đang dạy"
              value={stats ? stats.students : '—'}
            />
            <TutorStatCard
              icon="event_available" tone="tertiary"
              label="Buổi học đã nhận"
              value={stats ? stats.lessons : '—'}
            />
          </div>

          {/* ── Yêu cầu chờ duyệt (Phase 2 — gia sư duyệt/từ chối lịch) ── */}
          {pendingBookings.length > 0 && (
            <div className="space-y-md">
              <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-sm">
                <span className="material-symbols-outlined text-[#b45309]" style={{ fontVariationSettings: "'FILL' 1" }}>pending_actions</span>
                Yêu cầu chờ duyệt
                <span className="bg-[#fef3c7] text-[#b45309] text-xs font-bold px-2.5 py-0.5 rounded-full">
                  {pendingBookings.length}
                </span>
              </h3>
              <div className="bg-white/70 backdrop-blur-md border border-[#fde68a] shadow-[0_10px_15px_-3px_rgba(0,0,0,0.08)] rounded-[1rem] overflow-hidden divide-y divide-surface-variant/50">
                {pendingBookings.map((b) => (
                  <PendingRequestRow
                    key={b.id}
                    booking={b}
                    busy={actingId === b.id}
                    onAccept={() => handleBookingAction(b.id, 'Approved')}
                    onDecline={() => handleBookingAction(b.id, 'Declined')}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Hồ sơ gia sư (Phase 2 — tự sửa hồ sơ + môn dạy) ── */}
          <TutorProfileSection />

          {/* ── Khóa học của tôi (Phase 2 — quản lý khóa học thật) ── */}
          <TutorCoursesSection />

          {/* ── Two-column section (dữ liệu thật) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">

            {/* ── LEFT: Buổi học sắp tới ── */}
            <div className="lg:col-span-2 space-y-md">
              <div className="flex items-center justify-between">
                <h3 className="font-headline-md text-headline-md text-on-surface">
                  Buổi học sắp tới
                </h3>
                {upcomingBookings.length > 0 && (
                  <span className="bg-primary text-on-primary text-xs font-bold px-2 py-0.5 rounded-full">
                    {upcomingBookings.length}
                  </span>
                )}
              </div>

              <div className="bg-white/70 backdrop-blur-md border border-white/30 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.08)] rounded-[1rem] overflow-hidden">
                {bookingsLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3 text-on-surface-variant">
                    <span className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    <p className="font-label-md text-label-md">Đang tải...</p>
                  </div>
                ) : upcomingBookings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[48px]">event_upcoming</span>
                    <p className="font-label-md text-label-md">Chưa có buổi học nào sắp tới.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-surface-variant/50">
                    {upcomingBookings.slice(0, 6).map((b) => (
                      <StudentBookingRow key={b.id} booking={b} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── RIGHT: Lịch hôm nay ── */}
            <div className="space-y-md">
              <h3 className="font-headline-md text-headline-md text-on-surface">
                Lịch hôm nay
              </h3>
              <div className="bg-white/70 backdrop-blur-md border border-white/30 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.08)] rounded-[1rem] p-md flex flex-col min-h-[200px]">
                {todayBookings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center flex-1 gap-3 text-on-surface-variant py-8">
                    <span className="material-symbols-outlined text-[40px]">free_cancellation</span>
                    <p className="font-label-md text-label-md text-center">Hôm nay không có buổi học nào.</p>
                  </div>
                ) : (
                  <div className="relative border-l-2 border-primary/20 ml-3 space-y-5 flex-1">
                    {todayBookings.map((b) => (
                      <TodayItem key={b.id} booking={b} />
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* ── Lịch học sinh đã đặt (từ database) ── */}
          <div className="space-y-md">
            <div className="flex items-center justify-between flex-wrap gap-sm">
              <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-sm">
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>event_note</span>
                Lịch đã xác nhận
              </h3>
              {confirmedBookings.length > 0 && (
                <span className="bg-primary text-on-primary text-xs font-bold px-2.5 py-0.5 rounded-full">
                  {confirmedBookings.length} lịch
                </span>
              )}
            </div>

            <div className="bg-white/70 backdrop-blur-md border border-white/30 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.08)] rounded-[1rem] overflow-hidden">
              {bookingsLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-on-surface-variant">
                  <span className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  <p className="font-label-md text-label-md">Đang tải lịch học sinh...</p>
                </div>
              ) : bookingsErr ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-error">
                  <span className="material-symbols-outlined text-[40px]" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
                  <p className="font-label-md text-label-md text-center px-4">{bookingsErr}</p>
                </div>
              ) : confirmedBookings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[48px]">event_busy</span>
                  <p className="font-label-md text-label-md">Chưa có lịch nào được xác nhận.</p>
                  <p className="font-label-sm text-label-sm text-center px-4 max-w-md opacity-80">
                    Khi bạn duyệt yêu cầu đặt lịch, buổi học sẽ xuất hiện ở đây.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-surface-variant/50">
                  {confirmedBookings.map((b) => (
                    <StudentBookingRow key={b.id} booking={b} />
                  ))}
                </div>
              )}
            </div>
          </div>

        </main>
      </div>
    </div>
  )
}

// ─── Student Booking Row (lịch học sinh đặt) ───────────────────────────────────
function StudentBookingRow({ booking }) {
  const fmtDate = (d) => {
    try {
      return new Date(d).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
    } catch { return d }
  }
  const studentName = booking.student_name || booking.student_email?.split('@')[0] || 'Học sinh'
  const initial = studentName.charAt(0).toUpperCase()

  return (
    <div className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-surface-container-lowest/50 transition-colors">
      <div className="flex items-center gap-4 min-w-0">
        {/* Avatar học sinh */}
        {booking.student_picture ? (
          <img
            src={booking.student_picture}
            alt={studentName}
            className="w-12 h-12 rounded-full object-cover flex-shrink-0 border border-surface"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-primary flex-shrink-0 flex items-center justify-center text-on-primary font-label-md font-bold">
            {initial}
          </div>
        )}
        <div className="min-w-0">
          <p className="font-label-md text-[16px] text-on-surface mb-0.5 truncate">{studentName}</p>
          <p className="font-body-md text-[14px] text-on-surface-variant flex items-center gap-2 flex-wrap">
            {booking.subject && (
              <span className="inline-block px-2 py-0.5 rounded-full bg-tertiary-fixed-dim/20 text-primary font-label-sm">
                {booking.subject}
              </span>
            )}
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">calendar_today</span>
              {fmtDate(booking.lesson_date)}
            </span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">schedule</span>
              {booking.time_slot}
            </span>
          </p>
          {booking.note && (
            <p className="font-body-md text-[13px] text-on-surface-variant/80 italic mt-1">
              “{booking.note}”
            </p>
          )}
        </div>
      </div>
      {booking.status === 'Pending' ? (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#fef3c7] text-[#b45309] font-label-sm text-label-sm shrink-0">
          <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>hourglass_top</span>
          Chờ duyệt
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#dcfce7] text-[#16a34a] font-label-sm text-label-sm shrink-0">
          <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          Đã xác nhận
        </span>
      )}
    </div>
  )
}

// ─── Pending Request Row (gia sư duyệt / từ chối) ──────────────────────────────
function PendingRequestRow({ booking, busy, onAccept, onDecline }) {
  const fmtDate = (d) => {
    try { return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) }
    catch { return d }
  }
  const studentName = booking.student_name || booking.student_email?.split('@')[0] || 'Học sinh'

  return (
    <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-surface-container-lowest/50 transition-colors">
      <div className="flex items-center gap-4 min-w-0">
        {booking.student_picture ? (
          <img src={booking.student_picture} alt={studentName} className="w-12 h-12 rounded-full object-cover flex-shrink-0 border border-surface" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-secondary-container flex-shrink-0 flex items-center justify-center text-on-secondary-container font-label-md font-bold">
            {studentName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="font-label-md text-[16px] text-on-surface mb-0.5 truncate">{studentName}</p>
          <p className="font-body-md text-[14px] text-on-surface-variant flex items-center gap-2 flex-wrap">
            {booking.subject && (
              <span className="inline-block px-2 py-0.5 rounded-full bg-tertiary-fixed-dim/20 text-primary font-label-sm">{booking.subject}</span>
            )}
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">calendar_today</span>{fmtDate(booking.lesson_date)}
            </span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">schedule</span>{booking.time_slot}
            </span>
          </p>
          {booking.note && <p className="font-body-md text-[13px] text-on-surface-variant/80 italic mt-1">“{booking.note}”</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
        <button
          onClick={onDecline} disabled={busy}
          className="flex-1 sm:flex-none px-4 h-10 rounded-lg border border-error/40 text-error font-label-md hover:bg-error/10 transition-colors disabled:opacity-50"
        >
          Từ chối
        </button>
        <button
          onClick={onAccept} disabled={busy}
          className="flex-1 sm:flex-none px-4 h-10 rounded-lg bg-[#16a34a] text-white font-label-md hover:bg-[#15803d] transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-1"
        >
          {busy ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <span className="material-symbols-outlined text-[18px]">check</span>}
          Duyệt
        </button>
      </div>
    </div>
  )
}

// ─── Stat Card (dữ liệu thật) ──────────────────────────────────────────────────
function TutorStatCard({ icon, label, value, tone = 'primary' }) {
  const grad = {
    primary:   'linear-gradient(135deg,#00288e,#3a6fe0)',
    secondary: 'linear-gradient(135deg,#00288e,#e0a82e)',
    tertiary:  'linear-gradient(135deg,#b7831b,#e0a82e)',
  }[tone] || 'linear-gradient(135deg,#00288e,#3a6fe0)'

  return (
    <div className="relative overflow-hidden bg-white/75 backdrop-blur-md border border-white/40 shadow-[0_14px_30px_-12px_rgba(0,40,142,0.22)] rounded-[1.25rem] p-md flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_24px_46px_-14px_rgba(0,40,142,0.34)]">
      <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full opacity-[0.13]" style={{ background: grad }} />
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg" style={{ background: grad }}>
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
        </div>
      </div>
      <div className="relative z-10">
        <p className="font-label-md text-label-md text-on-surface-variant mb-1">{label}</p>
        <p className="text-[34px] leading-[42px] font-extrabold text-on-surface">{value}</p>
      </div>
    </div>
  )
}

// ─── Today Item (1 buổi học hôm nay, trên timeline) ────────────────────────────
function TodayItem({ booking }) {
  const studentName = booking.student_name || booking.student_email?.split('@')[0] || 'Học sinh'
  return (
    <div className="relative pl-6">
      <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-primary ring-4 ring-white" />
      <div className="bg-primary/5 border border-primary/15 rounded-lg p-3">
        <p className="font-label-sm text-primary mb-2 flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">schedule</span>
          {booking.time_slot}
        </p>
        <div className="flex items-center gap-3">
          {booking.student_picture ? (
            <img src={booking.student_picture} alt={studentName} className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container font-label-sm font-bold">
              {studentName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-label-md text-on-surface truncate">{studentName}</p>
            {booking.subject && <p className="font-label-sm text-on-surface-variant truncate">{booking.subject}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
