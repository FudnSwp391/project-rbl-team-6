/**
 * TutorDashboard.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Dashboard dành cho gia sư (role: tutor).
 * Hiển thị: thu nhập, giờ dạy, học sinh, yêu cầu chờ duyệt, lịch hôm nay.
 */
import { useState } from 'react'
import { useAuth } from './AuthContext'

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
  { icon: 'dashboard', label: 'Overview', active: true, href: '#' },
  { icon: 'calendar_today', label: 'My Schedule', href: '#' },
  { icon: 'group', label: 'Students', href: '#' },
  { icon: 'payments', label: 'Earnings', href: '#' },
  { icon: 'badge', label: 'My Profile', href: '#/tutor-profile' },
]

export default function TutorDashboard() {
  const { user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [requests, setRequests] = useState(PENDING_REQUESTS)

  // Tên hiển thị
  const displayName = user?.name || user?.email?.split('@')[0] || 'Tutor'
  // Chữ viết tắt làm avatar
  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  // Xử lý Accept / Decline request
  const handleAccept = (id) => {
    setRequests((prev) => prev.filter((r) => r.id !== id))
    // TODO: gọi API PATCH /api/tutor/requests/:id/accept
  }
  const handleDecline = (id) => {
    setRequests((prev) => prev.filter((r) => r.id !== id))
    // TODO: gọi API PATCH /api/tutor/requests/:id/decline
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
              <p className="font-label-sm text-label-sm text-on-surface-variant">Tutor Portal</p>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <div className="flex flex-col gap-2 px-sm flex-1 mt-4">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.label}
              href={item.href || '#'}
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
                  Total Earnings (This Month)
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
                  Total Hours Taught
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
                  Active Students
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
                  Pending Requests
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
                    <p className="font-label-md text-label-md">No pending requests. All clear!</p>
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
                    View all requests ({requests.length})
                  </a>
                </div>
              </div>
            </div>

            {/* ── RIGHT: Today's Schedule ── */}
            <div className="space-y-md">
              <h3 className="font-headline-md text-headline-md text-on-surface">
                Today's Schedule
              </h3>
              <div className="bg-white/70 backdrop-blur-md border border-white/30 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.08)] rounded-[1rem] p-md flex flex-col">
                <div className="relative border-l-2 border-surface-variant ml-3 space-y-6 flex-1">
                  {SCHEDULE_TODAY.map((slot) => (
                    <ScheduleItem key={slot.id} slot={slot} />
                  ))}
                </div>
                <button className="mt-6 w-full h-10 border border-outline-variant rounded-lg font-label-md text-on-surface-variant hover:bg-surface-container-high transition-colors">
                  Open Full Calendar
                </button>
              </div>
            </div>

          </div>
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
          Decline
        </button>
        <button
          className="flex-1 sm:flex-none px-4 h-10 rounded-lg bg-primary text-on-primary font-label-md hover:bg-primary/90 transition-colors shadow-sm"
          onClick={onAccept}
        >
          Accept
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
            {slot.time} <span className="ml-1 font-bold">(Now)</span>
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
            Start Meeting
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
