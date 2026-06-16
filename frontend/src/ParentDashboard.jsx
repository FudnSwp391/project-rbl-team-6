/**
 * ParentDashboard.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Dashboard dành cho phụ huynh (role: parent).
 * Hiển thị: tiến độ học của con, thanh toán sắp tới, phản hồi từ gia sư.
 */
import { useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { getBookings, getTutors } from './services/api'

// ─── Mock data ────────────────────────────────────────────────────────────────
const CHILDREN = [
  {
    id: 1,
    name: 'Alex Davis',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBuMktFHbA_xeGRdOLHAf7zcvZmmbyJMksBvQFmdyKGmu1XwAzxIi_xfpPDYhSTNp45C4iWTdaaD44Yk-StUo2pr0vRy_MPzgf0eBNNuXVQEQGRdeZVQbXPPQ3tnzGMzU-fe9t_A178n4kWoaVIxf6n0CHbveM9aGE1JZ7tx2nWH3dRa7FE4TKSfsDvBLtXTGPwxrw_87sSeARTCSPQqVSrJ1WWqCLjmh2dh9OMGGWN-T5oVI0l_9BQVPr_knNbn-6RqCkNANX0ro4',
  },
  {
    id: 2,
    name: 'Mia Davis',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCi2hMtGOQZD9DCJ6Yr6eFKurJ_-XYlSBrvnmGtrDa4WGzcFbHWCetheUwVLB9yO2wb4KrMa4_j0TD5zWPA7kcAqQKF-YYX_6Ik3J2OvwnBfPwR64hlrETT4fXFo5qxWROLxcwkG9MqCmTSLhKYi3KoX1kVzReNBEkto17lTSz-A0VqNMaDKUku--nQZi_uz3Xjdlqyg7q7pA6kx3QqODRCbuB2a4IV6PLV_t8EvlW4OuKTzhuRxlOVNbXnKWJg8uuMCfK982l6vR4',
  },
]

const PROGRESS_ITEMS = [
  {
    id: 1,
    subject: 'Advanced Mathematics',
    percent: 85,
    icon: 'check_circle',
    detail: 'Mastering Calculus Fundamentals',
  },
  {
    id: 2,
    subject: 'Physics',
    percent: 92,
    icon: 'emoji_events',
    detail: 'Top 10% in class this week',
  },
]

const FEEDBACKS = [
  {
    id: 1,
    initials: 'SW',
    name: 'Dr. Sarah Wilson',
    role: 'Mathematics Tutor',
    child: 'Alex',
    bg: 'bg-tertiary-fixed',
    text: '"Alex showed excellent problem-solving skills during our session on integrals today. Needs a bit more practice on word problems, but overall great progress."',
  },
  {
    id: 2,
    initials: 'PJ',
    name: 'Prof. James',
    role: 'Physics Tutor',
    child: 'Alex',
    bg: 'bg-secondary-fixed',
    text: '"Very engaged in the thermodynamics lab. Alex asked insightful questions regarding heat transfer mechanisms."',
  },
]

const NAV_ITEMS = [
  { icon: 'dashboard', label: 'Overview' },
  { icon: 'calendar_today', label: 'Schedule & Bookings' },
  { icon: 'analytics', label: "Children's Progress" },
  { icon: 'payments', label: 'Billing & Payments' },
  { icon: 'mail', label: 'Messages' },
  { icon: 'settings', label: 'Settings' },
]

export default function ParentDashboard() {
  const { user, logout } = useAuth()
  const [activeChild, setActiveChild] = useState(CHILDREN[0])
  const [childDropdown, setChildDropdown] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('Overview')
  const [bookings, setBookings] = useState([])
  const [bookingsLoading, setBookingsLoading] = useState(true)
  const [availableTutors, setAvailableTutors] = useState([])

  // Fetch bookings
  useEffect(() => {
    async function loadBookings() {
      try {
        const data = await getBookings()
        setBookings(data)
      } catch (err) {
        console.error("Error loading parent bookings:", err)
      } finally {
        setBookingsLoading(false)
      }
    }
    loadBookings()
  }, [])

  useEffect(() => {
    let active = true
    getTutors()
      .then((data) => {
        if (active && Array.isArray(data)) setAvailableTutors(data)
      })
      .catch(() => {})
    return () => { active = false }
  }, [])


  const displayName = user?.name || user?.email?.split('@')[0] || 'Parent'
  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex">

      {/* ── Mobile overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ══════════════════════════════════════════
          SIDEBAR
      ══════════════════════════════════════════ */}
      <nav
        className={`
          h-screen w-64 fixed left-0 top-0 bg-surface-container-low
          flex flex-col py-md px-sm z-50 shadow-sm
          transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
        `}
      >
        {/* Logo + parent avatar */}
        <div className="mb-lg px-sm">
          <div className="flex items-center gap-sm">
            {user?.picture ? (
              <img
                src={user.picture}
                alt={displayName}
                className="w-10 h-10 rounded-full object-cover border border-outline-variant"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold text-sm">
                {initials}
              </div>
            )}
            <div>
              <h1 className="font-headline-md text-headline-md font-bold text-primary leading-tight">
                EduX
              </h1>
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                Parent Portal
              </p>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <div className="flex flex-col gap-xs flex-grow">
          {NAV_ITEMS.map((item) => {
            const isActive = item.label === activeTab;
            return (
              <a
                key={item.label}
                href="#"
                onClick={(e) => { e.preventDefault(); setActiveTab(item.label); setSidebarOpen(false) }}
                className={`
                  flex items-center gap-sm px-sm py-sm rounded-lg
                  transition-colors duration-200
                  ${
                    isActive
                      ? 'text-primary font-bold border-r-4 border-primary bg-primary/5'
                      : 'text-on-secondary-fixed-variant hover:bg-secondary-container'
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

          {/* Logout */}
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); logout() }}
            className="flex items-center gap-sm px-sm py-sm rounded-lg text-on-secondary-fixed-variant hover:bg-secondary-container transition-colors duration-200 mt-2"
          >
            <span className="material-symbols-outlined">logout</span>
            <span className="font-label-md text-label-md">Logout</span>
          </a>
        </div>

        {/* CTA */}
        <div className="mt-auto px-sm pt-md">
          <button className="w-full h-12 bg-primary text-on-primary font-label-md text-label-md rounded-lg flex items-center justify-center gap-xs hover:bg-primary-container transition-colors duration-200 shadow-sm">
            <span className="material-symbols-outlined text-[20px]">add</span>
            Add Student
          </button>
        </div>
      </nav>

      {/* ══════════════════════════════════════════
          MAIN WRAPPER
      ══════════════════════════════════════════ */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">

        {/* ── Top Bar ── */}
        <header className="fixed top-0 right-0 w-full md:w-[calc(100%-16rem)] h-16 bg-surface-bright shadow-sm flex items-center justify-between px-md z-40">

          {/* Mobile hamburger */}
          <button
            className="md:hidden w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-primary rounded-full transition-colors mr-2"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>

          {/* Search */}
          <div className="flex items-center w-full max-w-md">
            <div className="relative w-full hidden sm:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
                search
              </span>
              <input
                className="w-full pl-10 pr-4 h-10 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface focus:border-primary focus:ring-2 focus:ring-tertiary-fixed-dim/50 focus:outline-none transition-all duration-200 font-body-md text-body-md placeholder:text-on-surface-variant"
                placeholder="Search courses, tutors..."
                type="text"
              />
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-md">
            <div className="flex items-center gap-xs">
              {/* Notifications */}
              <button className="p-2 text-on-surface-variant hover:text-primary transition-colors duration-200 rounded-full hover:bg-surface-container relative">
                <span className="material-symbols-outlined">notifications</span>
                <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full" />
              </button>
              {/* Help */}
              <button className="p-2 text-on-surface-variant hover:text-primary transition-colors duration-200 rounded-full hover:bg-surface-container">
                <span className="material-symbols-outlined">help</span>
              </button>
            </div>

            <div className="w-px h-8 bg-outline-variant opacity-50" />

            {/* Switch Child dropdown */}
            <div className="relative">
              <button
                className="flex items-center gap-sm cursor-pointer"
                onClick={() => setChildDropdown((v) => !v)}
              >
                <div className="flex flex-col items-end hidden sm:flex">
                  <span className="font-label-md text-label-md text-on-surface">
                    {activeChild.name}
                  </span>
                  <span className="font-label-sm text-label-sm text-primary">Switch Child</span>
                </div>
                <img
                  src={activeChild.avatar}
                  alt={activeChild.name}
                  className="w-10 h-10 rounded-full object-cover border border-outline-variant"
                />
                <span className="material-symbols-outlined text-on-surface-variant">
                  arrow_drop_down
                </span>
              </button>

              {/* Dropdown */}
              {childDropdown && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-lg z-50">
                  <div className="p-2 flex flex-col gap-1">
                    {CHILDREN.map((child) => (
                      <button
                        key={child.id}
                        className="flex items-center gap-sm p-2 hover:bg-surface-container rounded-md transition-colors w-full text-left"
                        onClick={() => {
                          setActiveChild(child)
                          setChildDropdown(false)
                        }}
                      >
                        <img
                          src={child.avatar}
                          alt={child.name}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                        <span className="font-label-md text-label-md text-on-surface">
                          {child.name}
                        </span>
                        {activeChild.id === child.id && (
                          <span className="material-symbols-outlined text-primary text-[16px] ml-auto">
                            check
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── Main content ── */}
        <main className="flex-grow pt-24 pb-lg px-gutter lg:px-lg max-w-container-max mx-auto w-full">

          {/* Welcome */}
          <div className="mb-lg">
            <h2 className="font-headline-lg text-headline-lg text-on-surface mb-xs">
              Good Morning, {displayName} 👋
            </h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              Here's what's happening with {activeChild.name} today.
            </p>
          </div>

          {activeTab === 'Overview' ? (
            /* ── Bento Grid ── */
            <div className="grid grid-cols-12 gap-gutter">

              {/* ── Child Progress (8 cols) ── */}
              <div className="col-span-12 lg:col-span-8 glass-card p-6 flex flex-col">
                <div className="flex justify-between items-center mb-md flex-wrap gap-2">
                  <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-sm">
                    <span className="material-symbols-outlined text-primary">trending_up</span>
                    {activeChild.name}'s Recent Progress
                  </h3>
                  <a
                    href="#"
                    className="text-primary font-label-md text-label-md hover:underline flex items-center gap-xs"
                  >
                    View Full Report
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </a>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-md mt-auto">
                  {PROGRESS_ITEMS.map((item) => (
                    <ProgressCard key={item.id} item={item} />
                  ))}
                </div>
              </div>

              {/* ── Upcoming Payment (4 cols) ── */}
              <div className="col-span-12 lg:col-span-4 glass-card p-6 flex flex-col justify-between">
                <div>
                  <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-sm mb-md">
                    <span className="material-symbols-outlined text-primary">account_balance_wallet</span>
                    Upcoming Payment
                  </h3>
                  <div className="bg-primary/5 p-md rounded-lg border border-primary/20 mb-md text-center">
                    <p className="font-label-sm text-label-sm text-on-surface-variant mb-xs uppercase tracking-wider">
                      Due Nov 15
                    </p>
                    <p className="text-[48px] leading-[56px] font-bold text-primary mb-sm tracking-tight">
                      $450.00
                    </p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">
                      Fall Semester Tutoring — {activeChild.name}
                    </p>
                  </div>
                </div>
                <button className="w-full h-12 bg-primary text-on-primary font-label-md text-label-md rounded-lg flex items-center justify-center gap-sm hover:bg-primary-container transition-colors duration-200 shadow-sm">
                  <span className="material-symbols-outlined">credit_card</span>
                  Pay Now
                </button>
              </div>

              {/* ── Tutor Feedback (full width) ── */}
              <div className="col-span-12 glass-card p-6">
                <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-sm mb-md">
                  <span className="material-symbols-outlined text-primary">forum</span>
                  Recent Tutor Feedback
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
                  {FEEDBACKS.map((fb) => (
                    <FeedbackCard key={fb.id} feedback={fb} />
                  ))}

                  {/* View all CTA */}
                  <div className="flex flex-col items-center justify-center gap-sm p-md rounded-lg border border-dashed border-outline-variant/50 hover:bg-surface-container-low transition-colors duration-200 cursor-pointer min-h-[140px]">
                    <span className="material-symbols-outlined text-outline text-[32px]">history</span>
                    <p className="font-label-md text-label-md text-on-surface-variant">
                      View all past feedback
                    </p>
                  </div>
                </div>
              </div>

            </div>
          ) : activeTab === 'Schedule & Bookings' ? (
            /* ── Bookings & Schedule View ── */
            <div className="space-y-6">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-sm">
                  <span className="material-symbols-outlined text-primary">calendar_today</span>
                  {activeChild.name}'s Tutoring Schedule
                </h3>
                <a 
                  href="#/"
                  className="h-11 px-4 bg-primary text-on-primary font-label-md text-label-md rounded-xl hover:bg-primary/95 transition-colors flex items-center gap-1 shadow-sm"
                >
                  <span className="material-symbols-outlined text-[18px]">person_search</span>
                  Find &amp; Book Tutor
                </a>
              </div>

              <div className="glass-card p-5 bg-white/70">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <h4 className="font-headline-md text-headline-md text-on-surface">Book a New Lesson</h4>
                    <p className="text-[13px] text-on-surface-variant">
                      Select a tutor, then use the calendar UI to choose a date and time for {activeChild.name}.
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-primary">calendar_month</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {availableTutors.slice(0, 6).map((tutor) => (
                    <ParentBookingTutorCard key={tutor.id} tutor={tutor} />
                  ))}
                </div>
              </div>

              {!bookingsLoading && bookings.filter(b => b.childName === activeChild.name).length > 0 && (
                <ParentAttendanceSummary bookings={bookings.filter(b => b.childName === activeChild.name)} childName={activeChild.name} />
              )}

              {bookingsLoading ? (
                <div className="glass-card p-12 text-center flex flex-col items-center justify-center space-y-3">
                  <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                  </svg>
                  <p className="font-label-md text-label-md text-on-surface-variant">Loading child's bookings...</p>
                </div>
              ) : bookings.filter(b => b.childName === activeChild.name).length === 0 ? (
                <div className="glass-card p-12 text-center flex flex-col items-center justify-center space-y-4 bg-white/50">
                  <div className="w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[40px] text-primary/50">event_busy</span>
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-headline-md text-headline-md text-on-surface">No Scheduled Lessons</h4>
                    <p className="font-body-md text-body-md text-on-surface-variant max-w-sm mx-auto">
                      No lessons scheduled for <strong>{activeChild.name}</strong> yet. Browse tutors and book a session.
                    </p>
                  </div>
                  <a
                    href="#/"
                    className="h-11 px-6 bg-primary text-on-primary font-label-md text-label-md rounded-xl hover:bg-primary/95 transition-colors flex items-center gap-2 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[18px]">search</span>
                    Browse Tutors
                  </a>
                </div>
              ) : (
                <div className="glass-card overflow-hidden shadow-md divide-y divide-outline-variant/10 bg-white/70">
                  {bookings
                    .filter(b => b.childName === activeChild.name)
                    .map((booking) => (
                      <div key={booking.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-surface-container-lowest/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <img src={booking.tutorAvatar} alt={booking.tutorName} className="w-14 h-14 rounded-full object-cover border-2 border-surface bg-surface-container-low shadow-sm" />
                          <div className="space-y-0.5">
                            <h4 className="font-label-md text-[17px] text-on-surface font-semibold">{booking.tutorName}</h4>
                            <p className="font-body-sm text-[14px] text-on-surface-variant flex items-center gap-1.5 flex-wrap">
                              <span className="px-2 py-0.5 rounded bg-primary/5 text-primary text-[11.5px] font-bold border border-primary/5">
                                {booking.subject}
                              </span>
                              {booking.bookingType === 'trial' && (
                                <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-[11px] font-bold border border-amber-200">
                                  Trial
                                </span>
                              )}
                              <span>•</span>
                              <span className="flex items-center gap-0.5">
                                <span className="material-symbols-outlined text-[15px]">calendar_today</span>
                                {booking.date}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-0.5">
                                <span className="material-symbols-outlined text-[15px]">schedule</span>
                                {booking.timeSlot}
                              </span>
                            </p>
                            {booking.notes && (
                              <p className="text-[13px] text-outline italic mt-1 truncate max-w-md">Topics to cover: "{booking.notes}"</p>
                            )}
                            {booking.attendanceStatus && (
                              <p className="text-[12px] text-on-surface-variant mt-1 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">fact_check</span>
                                Attendance: <strong>{booking.attendanceStatus}</strong>
                                {booking.attendanceNote ? ` - ${booking.attendanceNote}` : ''}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            booking.status === 'Approved'
                              ? 'bg-[#dcfce7] text-[#16a34a] border border-[#bbf7d0]'
                              : booking.status === 'Declined'
                              ? 'bg-error-container text-error border border-red-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {booking.status}
                          </span>
                          
                          {booking.status === 'Approved' ? (
                            booking.bookingType === 'trial' && booking.attendanceStatus === 'present' ? (
                              <a href={`#/tutor-profile/${booking.tutorId}`} className="h-10 px-4 bg-amber-500 text-white rounded-lg font-label-sm text-label-sm hover:bg-amber-600 transition-colors shadow-sm flex items-center gap-1">
                                <span className="material-symbols-outlined text-[16px]">rate_review</span>
                                Review Trial
                              </a>
                            ) : (
                              <button className="h-10 px-4 bg-primary text-on-primary rounded-lg font-label-sm text-label-sm hover:bg-primary/95 transition-colors shadow-sm flex items-center gap-1">
                                <span className="material-symbols-outlined text-[16px]">videocam</span>
                                Join Session
                              </button>
                            )
                          ) : (
                            <button className="h-10 px-4 border border-outline-variant text-on-surface-variant rounded-lg font-label-sm text-label-sm hover:bg-surface-container-high transition-colors">
                              Contact
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          ) : (
            /* ── Other tabs placeholder ── */
            <div className="glass-card p-12 text-center py-20 bg-white/50">
              <span className="material-symbols-outlined text-4xl text-outline mb-2">construction</span>
              <h3 className="font-headline-md text-headline-md text-on-surface">Tab "{activeTab}" Under Construction</h3>
              <p className="text-on-surface-variant mt-2">This view is currently under development.</p>
            </div>
          )}
        </main>
      </div>

      {/* Glassmorphism style injected inline for cross-component use */}
      <style>{`
        .glass-card {
          background-color: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.3);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04);
          border-radius: 1rem;
        }
      `}</style>
    </div>
  )
}

// ─── Progress Card ─────────────────────────────────────────────────────────────
function ProgressCard({ item }) {
  return (
    <div className="bg-surface-container-low p-md rounded-lg border border-outline-variant/30">
      <div className="flex justify-between items-center mb-sm">
        <span className="font-label-md text-label-md text-on-surface">{item.subject}</span>
        <span className="font-headline-md text-headline-md text-primary">{item.percent}%</span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-surface-container-highest rounded-full h-2 mb-sm overflow-hidden">
        <div
          className="bg-primary h-2 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${item.percent}%` }}
        />
      </div>

      <p className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-xs">
        <span className="material-symbols-outlined text-[16px] text-primary">{item.icon}</span>
        {item.detail}
      </p>
    </div>
  )
}

// ─── Feedback Card ─────────────────────────────────────────────────────────────
function FeedbackCard({ feedback }) {
  return (
    <div className="flex flex-col gap-sm p-md rounded-lg border border-outline-variant/30 hover:shadow-md transition-shadow duration-200 bg-surface-container-lowest">
      <div className="flex items-center gap-sm">
        <div
          className={`w-10 h-10 rounded-full ${feedback.bg} flex items-center justify-center font-bold font-label-md text-label-md text-on-surface flex-shrink-0`}
        >
          {feedback.initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-label-md text-label-md text-on-surface truncate">{feedback.name}</p>
          <p className="font-label-sm text-label-sm text-on-surface-variant truncate">{feedback.role}</p>
        </div>
        <span className="bg-tertiary-fixed-dim/20 text-primary font-label-sm text-label-sm px-2 py-1 rounded-md whitespace-nowrap flex-shrink-0">
          {feedback.child}
        </span>
      </div>
      <p className="font-body-md text-body-md text-on-surface-variant mt-xs leading-relaxed italic">
        {feedback.text}
      </p>
    </div>
  )
}

function ParentBookingTutorCard({ tutor }) {
  const subject = Array.isArray(tutor.subjects) ? tutor.subjects[0] : tutor.subject || 'General'
  const bookingTutorId = tutor.profile_id || tutor.profileId || tutor.id || tutor.user_id || tutor.userId || tutor.tutor_id || tutor.tutorId
  const handleTrialClick = () => {
    sessionStorage.setItem('edux_focus_trial_class', String(bookingTutorId))
  }
  return (
    <div className={`rounded-xl border bg-white/85 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${tutor.isNewTutor ? 'border-amber-200 ring-1 ring-amber-100' : 'border-outline-variant/20'}`}>
      <div className="flex items-center gap-3">
        {tutor.avatar ? (
          <img src={tutor.avatar} alt={tutor.name} className="w-12 h-12 rounded-full object-cover border border-outline-variant/30" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold">
            {(tutor.name || 'T').charAt(0)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h4 className="font-label-md text-label-md text-on-surface truncate flex items-center gap-1.5">
            <span className="truncate">{tutor.name}</span>
            {tutor.isNewTutor && <NewTutorBadge />}
          </h4>
          <p className="text-[12px] text-on-surface-variant truncate">{subject}</p>
          {tutor.isNewTutor && (
            <p className="mt-1 text-[11px] font-bold text-amber-700">
              Có lớp học thử miễn phí cho học sinh trước khi học dài hạn
            </p>
          )}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {tutor.isNewTutor && (
          <a
            onClick={handleTrialClick}
            href={`#/tutor-profile/${bookingTutorId}`}
            className="h-9 px-3 rounded-lg bg-amber-500 text-white font-label-sm text-[12px] flex items-center justify-center gap-1 hover:bg-amber-600 transition-colors"
          >
            <span className="material-symbols-outlined text-[15px]">workspace_premium</span>
            Học thử
          </a>
        )}
        <a href={`#/booking-calendar/${bookingTutorId}`} className="h-9 px-3 rounded-lg bg-primary text-on-primary font-label-sm text-[12px] flex items-center justify-center gap-1 hover:bg-primary/90 transition-colors">
          <span className="material-symbols-outlined text-[15px]">event_available</span>
          Book
        </a>
      </div>
    </div>
  )
}

function NewTutorBadge() {
  return (
    <span className="inline-flex flex-shrink-0 items-center rounded-full border border-amber-300 bg-amber-100 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-amber-700">
      New
    </span>
  )
}

function ParentAttendanceSummary({ bookings, childName }) {
  const approved = bookings.filter((booking) => booking.status === 'Approved')
  const marked = approved.filter((booking) => booking.attendanceStatus)
  const present = marked.filter((booking) => booking.attendanceStatus === 'present')
  const absent = marked.filter((booking) => booking.attendanceStatus === 'absent')
  const excused = marked.filter((booking) => booking.attendanceStatus === 'excused')
  const rate = marked.length ? Math.round((present.length / marked.length) * 100) : null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="glass-card p-5 bg-white/70 lg:col-span-2">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h4 className="font-headline-md text-headline-md text-on-surface">{childName}'s Attendance</h4>
            <p className="text-[13px] text-on-surface-variant">Attendance is updated by the tutor after each approved lesson.</p>
          </div>
          <span className="material-symbols-outlined text-primary">fact_check</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <ParentAttendanceMetric label="Rate" value={rate == null ? '--' : `${rate}%`} tone="primary" />
          <ParentAttendanceMetric label="Present" value={present.length} tone="green" />
          <ParentAttendanceMetric label="Absent" value={absent.length} tone="red" />
          <ParentAttendanceMetric label="Excused" value={excused.length} tone="amber" />
        </div>
      </div>
      <div className="glass-card p-5 bg-white/70">
        <h4 className="font-headline-sm text-headline-sm text-on-surface mb-3">Absent Lessons</h4>
        {absent.length === 0 ? (
          <p className="text-[13px] text-on-surface-variant italic">No absences recorded.</p>
        ) : (
          <div className="space-y-2 max-h-40 overflow-auto">
            {absent.map((booking) => (
              <div key={booking.id} className="rounded-xl bg-red-50 border border-red-200 p-3">
                <p className="text-[12px] font-bold text-red-700">{booking.date} - {booking.timeSlot}</p>
                <p className="text-[12px] text-red-600">{booking.subject}{booking.attendanceNote ? ` - ${booking.attendanceNote}` : ''}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ParentAttendanceMetric({ label, value, tone }) {
  const styles = {
    primary: 'bg-primary/5 text-primary border-primary/10',
    green: 'bg-[#dcfce7] text-[#16a34a] border-[#bbf7d0]',
    red: 'bg-red-50 text-red-600 border-red-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
  }
  return (
    <div className={`rounded-xl border p-3 ${styles[tone]}`}>
      <p className="text-[11px] font-bold uppercase opacity-80">{label}</p>
      <p className="text-2xl font-black">{value}</p>
    </div>
  )
}
