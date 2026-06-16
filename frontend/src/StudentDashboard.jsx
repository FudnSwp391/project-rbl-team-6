/**
 * StudentDashboard.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Dashboard dành cho học sinh (role: student / parent / tutor).
 * Hiện thị: khóa học đang học, bài tập, giờ học, gia sư hiện tại.
 */
import { useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { getBookings, getUnreadCount, getOrCreateConversation, getTutors } from './services/api'

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
  { icon: 'dashboard', label: 'Dashboard', active: true },
  { icon: 'school', label: 'My Courses' },
  { icon: 'calendar_today', label: 'Schedule' },
  { icon: 'chat', label: 'Messages' },
]

export default function StudentDashboard() {
  const { user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('Dashboard')
  const [bookings, setBookings] = useState([])
  const [bookingsLoading, setBookingsLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [dashboardTutors, setDashboardTutors] = useState(MY_TUTORS)

  const displayName = user?.name || user?.email?.split('@')[0] || 'Student'
  const initials = displayName.charAt(0).toUpperCase()

  const openTutorChat = async (tutorId) => {
    try {
      const conv = await getOrCreateConversation(tutorId)
      window.location.hash = `/messages/${conv.id}`
    } catch {
      alert('Không thể mở chat. Gia sư này cần là tài khoản tutor thật trong Supabase.')
    }
  }

  useEffect(() => {
    getUnreadCount().then(setUnreadCount).catch(() => {})
    const timer = setInterval(() => {
      getUnreadCount().then(setUnreadCount).catch(() => {})
    }, 30000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    let active = true
    getTutors()
      .then((data) => {
        if (active && Array.isArray(data) && data.length > 0) {
          setDashboardTutors(data.map((tutor) => ({
            id: tutor.id,
            userId: tutor.user_id || tutor.userId || tutor.tutor_id || tutor.tutorId || tutor.id,
            profileId: tutor.profile_id || tutor.profileId || tutor.id,
            accountId: tutor.account_id || tutor.accountId || tutor.user_id || tutor.userId || tutor.id,
            tutorId: tutor.tutor_id || tutor.tutorId || tutor.user_id || tutor.userId || tutor.id,
            name: tutor.name,
            subject: (tutor.subjects || [])[0] || 'General',
            subjects: tutor.subjects || [],
            avatar: tutor.avatar,
            isNewTutor: tutor.isNewTutor,
          })))
        }
      })
      .catch(() => {})
    return () => { active = false }
  }, [])

  // Load bookings
  useEffect(() => {
    async function loadBookings() {
      try {
        const data = await getBookings()
        // Filter to only this student's bookings
        const userBookings = data.filter(b => b.studentId === user?.id || b.studentName === displayName)
        setBookings(userBookings)
      } catch (err) {
        console.error("Error loading student bookings:", err)
      } finally {
        setBookingsLoading(false)
      }
    }
    if (user) {
      loadBookings()
    }
  }, [user, displayName])

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
        <ul className="flex-1 flex flex-col gap-xs px-sm">
          {NAV_ITEMS.map((item) => {
            const isActive = item.label === activeTab;
            const isMessages = item.label === 'Messages';
            return (
              <li key={item.label}>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    if (isMessages) {
                      window.location.hash = '/messages'
                    } else {
                      setActiveTab(item.label)
                      setSidebarOpen(false)
                    }
                  }}
                  className={`
                    flex items-center gap-sm px-md py-sm rounded-lg
                    transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                    ${isActive
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
                  <span className="font-label-md text-label-md flex-1">{item.label}</span>
                  {isMessages && unreadCount > 0 && (
                    <span className="min-w-[18px] h-[18px] rounded-full bg-error text-on-error text-[10px] font-bold flex items-center justify-center px-1">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </a>
              </li>
            );
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

            {activeTab === 'Dashboard' ? (
              <>
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
                            Next Upcoming
                          </span>
                          <span className="font-label-sm text-label-sm text-error flex items-center gap-xs">
                            <span className="material-symbols-outlined text-[14px]">schedule</span>
                            Starts in 15m
                          </span>
                        </div>
                        <h3 className="font-headline-md text-headline-md text-on-surface mb-xs">
                          Advanced Mathematics
                        </h3>
                        <p className="font-body-md text-body-md text-on-surface-variant flex items-center gap-xs">
                          <span className="material-symbols-outlined text-[18px]">person</span>
                          Dr. Sarah Wilson • Today, 2:00 PM
                        </p>
                      </div>
                    </div>
                    <button className="w-full lg:w-auto h-12 px-xl bg-primary text-on-primary font-label-md text-label-md rounded-lg hover:bg-surface-tint hover:shadow-md transition-all duration-200 whitespace-nowrap">
                      Join Class
                    </button>
                  </div>
                </div>

                {/* ── Stats Grid ── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-md lg:gap-gutter">
                  <StatCard
                    icon="library_books"
                    label="Courses in Progress"
                    value="4"
                  />
                  <StatCard
                    icon="assignment_late"
                    label="Assignments Due"
                    value="2"
                  />
                  <StatCard
                    icon="timer"
                    label="Hours Studied"
                    value={<>28<span className="font-headline-md text-headline-md text-on-surface-variant">h</span></>}
                  />
                </div>

                {/* ── My Upcoming Bookings (Active bookings from Calendar) ── */}
                {bookings.length > 0 && (
                  <div className="space-y-md">
                    <div className="flex justify-between items-center">
                      <h3 className="font-headline-md text-headline-md text-on-surface">Pending & Approved Bookings</h3>
                      <button 
                        onClick={() => setActiveTab('Schedule')}
                        className="text-primary font-label-sm text-label-sm hover:underline"
                      >
                        View All
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                      {bookings.slice(0, 2).map((booking) => (
                        <div key={booking.id} className="bg-white/80 border border-outline-variant/30 rounded-xl p-4 flex gap-sm items-center shadow-sm relative overflow-hidden">
                          <div className={`absolute top-0 left-0 w-1.5 h-full ${
                            booking.status === 'Approved' ? 'bg-[#16a34a]' : booking.status === 'Declined' ? 'bg-error' : 'bg-amber-500'
                          }`} />
                          
                          <img src={booking.tutorAvatar} alt={booking.tutorName} className="w-12 h-12 rounded-full object-cover border border-outline-variant/30" />
                          <div className="flex-grow min-w-0 pl-1">
                            <h4 className="font-label-md text-label-md text-on-surface truncate">{booking.tutorName}</h4>
                            <p className="text-[13px] text-on-surface-variant truncate flex items-center gap-1">
                              {booking.subject}
                              {booking.bookingType === 'trial' && <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">Trial</span>}
                            </p>
                            <p className="text-[12px] text-outline mt-0.5 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                              {booking.date} • {booking.timeSlot}
                            </p>
                          </div>
                          
                          <span className={`text-[12px] font-bold px-2 py-0.5 rounded-full ${
                            booking.status === 'Approved' 
                              ? 'bg-[#dcfce7] text-[#16a34a]' 
                              : booking.status === 'Declined' 
                              ? 'bg-error-container text-error' 
                              : 'bg-amber-50 text-amber-600 border border-amber-100'
                          }`}>
                            {booking.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── My Tutors ── */}
                <div>
                  <div className="flex justify-between items-center mb-md">
                    <h3 className="font-headline-md text-headline-md text-on-surface">My Tutors</h3>
                    <a
                      href="#"
                      className="font-label-md text-label-md text-primary hover:text-surface-tint rounded px-2 py-1 transition-colors"
                    >
                      View All
                    </a>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
                    {/* Tutor cards */}
                    {dashboardTutors.map((tutor) => (
                      <TutorCard key={tutor.id} tutor={tutor} onMessage={openTutorChat} />
                    ))}

                    {/* Find New Tutor CTA */}
                    <a
                      href="#/"
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
              </>
            ) : activeTab === 'Schedule' ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <div>
                    <h2 className="font-headline-lg text-headline-lg text-on-surface">My Schedule</h2>
                    <p className="font-body-md text-body-md text-on-surface-variant">Review your booked tutoring sessions and approval status.</p>
                  </div>
                  
                  <a 
                    href="#/"
                    className="h-11 px-4 bg-primary text-on-primary font-label-md text-label-md rounded-xl hover:bg-primary/95 transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    Book New Session
                  </a>
                </div>

                <div className="bg-white/70 backdrop-blur-md border border-outline-variant/20 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div>
                      <h3 className="font-headline-md text-headline-md text-on-surface">Book with a Tutor</h3>
                      <p className="text-[13px] text-on-surface-variant">Choose a tutor and open the calendar to pick an available date and time.</p>
                    </div>
                    <span className="material-symbols-outlined text-primary">calendar_month</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {dashboardTutors.slice(0, 6).map((tutor) => (
                      <BookingTutorCard key={tutor.id} tutor={tutor} />
                    ))}
                  </div>
                </div>

                {!bookingsLoading && bookings.length > 0 && (
                  <StudentAttendanceSummary bookings={bookings} />
                )}

                {bookingsLoading ? (
                  <div className="bg-white/70 backdrop-blur-md border border-outline-variant/20 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-3">
                    <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                    </svg>
                    <p className="font-label-md text-label-md text-on-surface-variant">Loading schedule bookings...</p>
                  </div>
                ) : bookings.length === 0 ? (
                  <div className="bg-white/70 backdrop-blur-md border border-outline-variant/20 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4">
                    <div className="w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[40px] text-primary/50">calendar_today</span>
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-headline-md text-headline-md text-on-surface">No Sessions Yet</h3>
                      <p className="font-body-md text-body-md text-on-surface-variant max-w-sm mx-auto">
                        Browse tutors on the home page, pick a time slot, and your bookings will appear here.
                      </p>
                    </div>
                    <a
                      href="#/"
                      className="h-11 px-6 bg-primary text-on-primary font-label-md text-label-md rounded-xl hover:bg-primary/95 transition-colors flex items-center gap-2 shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[18px]">search</span>
                      Find a Tutor
                    </a>
                  </div>
                ) : (
                  <div className="bg-white/70 backdrop-blur-md border border-outline-variant/20 rounded-2xl overflow-hidden shadow-sm divide-y divide-outline-variant/10">
                    {bookings.map((booking) => (
                      <div key={booking.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-surface-container-lowest/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <img src={booking.tutorAvatar} alt={booking.tutorName} className="w-14 h-14 rounded-full object-cover border-2 border-surface bg-surface-container-low shadow-sm" />
                          <div className="space-y-0.5">
                            <h4 className="font-label-md text-[17px] text-on-surface font-semibold">{booking.tutorName}</h4>
                            <p className="font-body-sm text-[14px] text-on-surface-variant flex items-center gap-1.5 flex-wrap">
                              <span className="px-2 py-0.5 rounded bg-primary/5 text-primary text-[11px] font-bold border border-primary/5">
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
                              <p className="text-[13px] text-outline italic mt-1 truncate max-w-md">Notes: "{booking.notes}"</p>
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
                                Join Meeting
                              </button>
                            )
                          ) : (
                            <button
                              onClick={() => openTutorChat(booking.tutorId)}
                              className="h-10 px-4 border border-outline-variant text-on-surface-variant rounded-lg font-label-sm text-label-sm hover:bg-surface-container-high transition-colors"
                            >
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
              <div className="bg-white/70 backdrop-blur-md border border-outline-variant/30 rounded-2xl p-12 text-center py-20">
                <span className="material-symbols-outlined text-4xl text-outline mb-2">construction</span>
                <h3 className="font-headline-md text-headline-md text-on-surface">Tab "{activeTab}" Under Construction</h3>
                <p className="text-on-surface-variant mt-2">This view is currently under development.</p>
              </div>
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
function TutorCard({ tutor, onMessage }) {
  return (
    <div className="bg-surface-container-lowest/70 backdrop-blur-md border border-surface-container-lowest/30 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] rounded-xl p-md flex flex-col items-center text-center hover:shadow-md transition-shadow duration-300">
      <img
        src={tutor.avatar}
        alt={tutor.name}
        className="w-20 h-20 rounded-full object-cover mb-sm border-2 border-surface bg-surface-container-lowest shadow-sm"
        loading="lazy"
      />
      <h4 className="font-label-md text-label-md text-on-surface mb-xs flex items-center justify-center gap-1.5">
        <span>{tutor.name}</span>
        {tutor.isNewTutor && <NewTutorBadge />}
      </h4>
      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm mb-md">
        {tutor.subject}
      </span>
      <button
        onClick={() => onMessage(tutor.id)}
        className="w-full h-10 border border-outline-variant text-on-surface font-label-sm text-label-sm rounded-lg hover:bg-surface-container hover:text-primary transition-colors"
      >
        Message
      </button>
    </div>
  )
}

function BookingTutorCard({ tutor }) {
  const subject = tutor.subject || (Array.isArray(tutor.subjects) ? tutor.subjects[0] : '') || 'General'
  console.log('Schedule tutor object:', tutor)
  const bookingTutorId = tutor.profileId || tutor.profile_id || tutor.id || tutor.userId || tutor.user_id || tutor.tutorId || tutor.tutor_id
  const handleTrialClick = () => {
    sessionStorage.setItem('edux_focus_trial_class', String(bookingTutorId))
  }
  const handleBookClick = () => {
    console.log('Clicked tutor:', tutor)
    sessionStorage.setItem('edux_last_booking_tutor', JSON.stringify({
      ...tutor,
      id: bookingTutorId,
      profile_id: tutor.profileId || tutor.profile_id || bookingTutorId,
      user_id: tutor.userId || tutor.user_id || tutor.accountId || tutor.account_id || tutor.tutorId || tutor.tutor_id || tutor.id,
      tutor_id: tutor.tutorId || tutor.tutor_id || tutor.userId || tutor.user_id || tutor.id,
      subjects: tutor.subjects?.length ? tutor.subjects : [subject],
    }))
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
              Có lớp học thử miễn phí trước khi đặt lịch chính thức
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
        <a onClick={handleBookClick} href={`#/booking-calendar/${bookingTutorId}`} className="h-9 px-3 rounded-lg bg-primary text-on-primary font-label-sm text-[12px] flex items-center justify-center gap-1 hover:bg-primary/90 transition-colors">
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

function StudentAttendanceSummary({ bookings }) {
  const approved = bookings.filter((booking) => booking.status === 'Approved')
  const marked = approved.filter((booking) => booking.attendanceStatus)
  const present = marked.filter((booking) => booking.attendanceStatus === 'present')
  const absent = marked.filter((booking) => booking.attendanceStatus === 'absent')
  const excused = marked.filter((booking) => booking.attendanceStatus === 'excused')
  const rate = marked.length ? Math.round((present.length / marked.length) * 100) : null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="bg-white/70 backdrop-blur-md border border-outline-variant/20 rounded-2xl p-5 shadow-sm lg:col-span-2">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-headline-md text-headline-md text-on-surface">Attendance Overview</h3>
            <p className="text-[13px] text-on-surface-variant">Track attended, absent, and excused lessons after tutor marks attendance.</p>
          </div>
          <span className="material-symbols-outlined text-primary">fact_check</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <AttendanceMetric label="Attendance Rate" value={rate == null ? '--' : `${rate}%`} tone="primary" />
          <AttendanceMetric label="Present" value={present.length} tone="green" />
          <AttendanceMetric label="Absent" value={absent.length} tone="red" />
          <AttendanceMetric label="Excused" value={excused.length} tone="amber" />
        </div>
      </div>
      <div className="bg-white/70 backdrop-blur-md border border-outline-variant/20 rounded-2xl p-5 shadow-sm">
        <h3 className="font-headline-sm text-headline-sm text-on-surface mb-3">Absence History</h3>
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

function AttendanceMetric({ label, value, tone }) {
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
