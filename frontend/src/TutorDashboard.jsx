/**
 * TutorDashboard.jsx
 * Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬
 * Dashboard dÄ‚Â nh cho gia sĂ†Â° (role: tutor).
 * HiĂ¡Â»Æ’n thĂ¡Â»â€¹: thu nhĂ¡ÂºÂ­p, giĂ¡Â»Â  dĂ¡ÂºÂ¡y, hĂ¡Â»Â c sinh, yÄ‚Âªu cĂ¡ÂºÂ§u chĂ¡Â»Â  duyĂ¡Â»â€¡t, lĂ¡Â»â€¹ch hÄ‚Â´m nay.
 */
import { useState, useEffect, useRef } from 'react'
import { useAuth } from './AuthContext'
import AIChatBox from './AIChatBox'
import TutorFeedbackModal from './components/MicroFeedback/TutorFeedbackModal'
import { getBookings, updateBookingStatus,
         getTutorProfile, updateTutorBio, updateTutorAvatar, updateTutorCv, submitTutorProfile,
         addTutorCredential, deleteTutorCredential,
         updateTutorAvailability, getUnreadCount, getTutorStudents, markBookingAttendance, getTutorEarnings } from './services/api'
import ProofUploader from './components/ProofUploader'
import TutorCoursesTab from './components/TutorCourses'
import { uploadAvatarFile, uploadDemoVideo } from './services/upload'
import MessagesSection from './components/MessagesSection'
import TutorAssessmentManager from './components/TutorAssessmentManager'
import TutorGradingDashboard from './components/TutorGradingDashboard'
import WalletWidget from './components/WalletWidget'
import NotificationDropdown from './components/NotificationDropdown'

const NAV_ITEMS = [
  { icon: 'dashboard', label: 'Overview' },
  { icon: 'calendar_today', label: 'My Schedule' },
  { icon: 'group', label: 'Students' },
  { icon: 'video_library', label: 'Courses' },
  { icon: 'description', label: 'Assessments' },
  { icon: 'fact_check', label: 'Review & Grade' },
  { icon: 'payments', label: 'Earnings' },
  { icon: 'chat', label: 'Messages' },
  { icon: 'account_circle', label: 'My Profile' },
]

export default function TutorDashboard() {
  const { user, token, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('Overview')
  const [requests, setRequests] = useState([])
  const [scheduleToday, setScheduleToday] = useState([])
  const [overviewStats, setOverviewStats] = useState({
    thisMonthEarned: 0,
    completedLessons: 0,
    activeStudents: 0,
  })
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)

  const displayName = user?.name || user?.email?.split('@')[0] || 'Tutor'
  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  useEffect(() => {
    getUnreadCount().then(setUnreadCount).catch(() => {})
    const timer = setInterval(() => {
      getUnreadCount().then(setUnreadCount).catch(() => {})
    }, 30000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    async function loadTutorData() {
      try {
        const [bookingsList, earningsData] = await Promise.all([
          getBookings(),
          getTutorEarnings().catch(() => null),
        ])

        const toInitials = (name = 'Student') =>
          name
            .split(' ')
            .filter(Boolean)
            .map(w => w[0])
            .join('')
            .slice(0, 2)
            .toUpperCase() || 'ST'

        const toStudentName = (booking) =>
          booking.childName || booking.studentName || 'Student'

        const toScheduleDate = (booking) => {
          const d = booking.lesson_date || booking.lessonDate || booking.date;
          const t = booking.time_slot || booking.timeSlot || booking.time;
          const dateStr = d ? String(d).slice(0, 10) : 'No date';
          const timeStr = t || 'No time';
          return `${dateStr} - ${timeStr}`;
        }

        const pendingBookings = bookingsList
          .filter(b => b.status === 'Pending')
          .map(b => ({
            id: b.id,
            initials: toInitials(toStudentName(b)),
            name: toStudentName(b),
            studentName: b.studentName,
            childName: b.childName,
            subject: b.subject || 'General lesson',
            date: toScheduleDate(b),
            bookingType: b.bookingType || b.booking_type || 'regular',
            note: b.notes || b.note || ''
          }))

        const approvedBookings = bookingsList
          .filter(b => b.status === 'Approved')
          .map(b => ({
            id: b.id,
            initials: toInitials(toStudentName(b)),
            name: toStudentName(b),
            studentName: b.studentName,
            childName: b.childName,
            subject: b.subject || 'General lesson',
            time: toScheduleDate(b),
            bookingType: b.bookingType || b.booking_type || 'regular',
            isNow: false
          }))

        setRequests(pendingBookings)
        setScheduleToday(approvedBookings)
        const activeStudentKeys = new Set(
          bookingsList
            .filter(b => b.status === 'Approved')
            .map(b => `${b.studentId || ''}:${b.childName || b.studentName || ''}`)
        )
        setOverviewStats({
          thisMonthEarned: earningsData?.summary?.thisMonthEarned || 0,
          completedLessons: earningsData?.summary?.completedLessons || 0,
          activeStudents: activeStudentKeys.size,
        })
      } catch (err) {
        console.error('Error loading tutor dashboard bookings:', err)
      } finally {
        setLoading(false)
      }
    }

    loadTutorData()
  }, [])

  const handleAccept = async (id) => {
    try {
      await updateBookingStatus(id, 'Approved')
      const accepted = requests.find(r => r.id === id)
      if (accepted) {
        setScheduleToday(prev => [
          {
            id: accepted.id,
            initials: accepted.initials,
            name: accepted.name,
            subject: accepted.subject,
            time: accepted.date,
            isNow: false
          },
          ...prev
        ])
      }
      setRequests((prev) => prev.filter((r) => r.id !== id))
    } catch (err) {
      console.error("Failed to approve booking:", err)
      alert(err.message || 'Failed to approve booking.')
    }
  }

  const handleDecline = async (id) => {
    try {
      await updateBookingStatus(id, 'Declined')
      setRequests((prev) => prev.filter((r) => r.id !== id))
    } catch (err) {
      console.error("Failed to decline booking:", err)
      alert(err.message || 'Failed to decline booking.')
    }
  }


  return (
    <div className="bg-background text-on-surface font-body-md text-body-md overflow-x-hidden min-h-screen flex h-screen">

      {/* Ă¢â€â‚¬Ă¢â€â‚¬ Mobile overlay Ă¢â€â‚¬Ă¢â€â‚¬ */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Ă¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢Â
          SIDEBAR
      Ă¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢Â */}
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
          <a href="#/" className="flex items-center gap-sm hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary">
              <span className="material-symbols-outlined text-[18px]">school</span>
            </div>
            <div>
              <h1 className="font-headline-md text-[20px] leading-tight font-black text-primary">
                EduX
              </h1>
              <p className="font-label-sm text-label-sm text-on-surface-variant">Tutor Portal</p>
            </div>
          </a>
        </div>

        {/* Nav items */}
        <div className="flex flex-col gap-2 px-sm flex-1 mt-4">
          {NAV_ITEMS.map((item) => {
            const isActive = item.label === activeTab
            const isMessages = item.label === 'Messages'
            return (
              <a
                key={item.label}
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  setActiveTab(item.label)
                  setSidebarOpen(false)
                }}
                className={`
                  flex items-center gap-sm px-md py-sm rounded-lg
                  transition-all duration-200 active:scale-95
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
            )
          })}
        </div>

        {/* Bottom */}
        <div className="px-md mt-auto pt-lg border-t border-surface-variant/50 flex flex-col gap-2">
          <a
            href="#" onClick={(e) => e.preventDefault()}
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

      {/* Ă¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢Â
          MAIN CONTENT
      Ă¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢Â */}
      <div className="flex-1 lg:ml-64 flex flex-col h-screen overflow-hidden">

        {/* Ă¢â€â‚¬Ă¢â€â‚¬ Top Bar Ă¢â€â‚¬Ă¢â€â‚¬ */}
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
              <NotificationDropdown token={token} />

              <WalletWidget token={token} />

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

        {/* Ă¢â€â‚¬Ă¢â€â‚¬ Scrollable main Ă¢â€â‚¬Ă¢â€â‚¬ */}
        <main className="flex-1 overflow-y-auto p-gutter lg:p-lg space-y-lg relative">

          {/* Decorative background glow */}
          <div className="fixed top-0 right-0 w-1/2 h-1/2 bg-gradient-to-bl from-primary-fixed-dim/20 to-transparent pointer-events-none -z-10 blur-3xl rounded-full" />

          {activeTab === 'Overview' && (
            <>
          {/* Ă¢â€â‚¬Ă¢â€â‚¬ Welcome Ă¢â€â‚¬Ă¢â€â‚¬ */}
          <div className="space-y-1">
            <h2 className="font-headline-lg text-headline-lg text-on-surface">
              Good Morning, {displayName}
            </h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              Here is your daily overview.
            </p>
          </div>

          {/* Ă¢â€â‚¬Ă¢â€â‚¬ Stats Grid Ă¢â€â‚¬Ă¢â€â‚¬ */}
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
                <p className="text-[36px] leading-[44px] font-bold text-on-surface">{formatMoney(overviewStats.thisMonthEarned)}</p>
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
                  Completed Lessons
                </p>
                <p className="text-[36px] leading-[44px] font-bold text-on-surface">{overviewStats.completedLessons}</p>
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
                <p className="text-[36px] leading-[44px] font-bold text-on-surface">{overviewStats.activeStudents}</p>
              </div>
            </div>
          </div>

          {/* Ă¢â€â‚¬Ă¢â€â‚¬ Two-column section Ă¢â€â‚¬Ă¢â€â‚¬ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">

            {/* Ă¢â€â‚¬Ă¢â€â‚¬ LEFT: Pending Requests Ă¢â€â‚¬Ă¢â€â‚¬ */}
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
                  <a href="#" onClick={(e) => e.preventDefault()} className="text-primary font-label-md hover:underline">
                    View all requests ({requests.length})
                  </a>
                </div>
              </div>
            </div>

            {/* Ă¢â€â‚¬Ă¢â€â‚¬ RIGHT: Today's Schedule Ă¢â€â‚¬Ă¢â€â‚¬ */}
            <div className="space-y-md">
              <h3 className="font-headline-md text-headline-md text-on-surface">
                Today's Schedule
              </h3>
              <div className="bg-white/70 backdrop-blur-md border border-white/30 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.08)] rounded-[1rem] p-md flex flex-col">
                <div className="relative border-l-2 border-surface-variant ml-3 space-y-6 flex-1">
                  {scheduleToday.length === 0 ? (
                    <div className="pl-6 py-8 text-center text-on-surface-variant">
                      <span className="material-symbols-outlined text-[40px] mb-2">event_available</span>
                      <p className="font-label-md text-label-md">No approved lessons yet.</p>
                    </div>
                  ) : (
                    scheduleToday.map((slot) => (
                      <ScheduleItem key={slot.id} slot={slot} />
                    ))
                  )}
                </div>
                <button
                  onClick={() => setActiveTab('My Schedule')}
                  className="mt-6 w-full h-10 border border-outline-variant rounded-lg font-label-md text-on-surface-variant hover:bg-surface-container-high transition-colors"
                >
                  Open Full Calendar
                </button>
              </div>
            </div>

          </div>
            </>
          )}

          {activeTab === 'My Profile' && (
            <TutorProfileTab user={user} displayName={displayName} initials={initials} />
          )}

          {activeTab === 'My Schedule' && (
            <MyScheduleTab />
          )}

          {activeTab === 'Students' && (
            <TutorStudentsTab />
          )}

          {activeTab === 'Courses' && (
            <TutorCoursesTab user={user} />
          )}

          {activeTab === 'Assessments' && (
            <TutorAssessmentManager token={token} />
          )}

          {activeTab === 'Review & Grade' && (
            <TutorGradingDashboard token={token} />
          )}

          {activeTab === 'Earnings' && (
            <TutorEarningsTab />
          )}

          {activeTab === 'Messages' && (
            <MessagesSection token={token} user={user} />
          )}

        </main>
      </div>
    </div>
  )
}

// Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬ Request Row Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬
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
            {request.bookingType === 'trial' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold">
                <span className="material-symbols-outlined text-[14px]">workspace_premium</span>
                Trial
              </span>
            )}
            <span className="inline-block px-2 py-0.5 rounded-full bg-tertiary-fixed-dim/20 text-primary font-label-sm">
              {request.subject}
            </span>
            <span>-</span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">calendar_today</span>
              {request.date}
            </span>
          </p>
          {request.note && (
            <p className="mt-1 text-[13px] text-on-surface-variant line-clamp-2">
              Note: {request.note}
            </p>
          )}
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

// Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬ Schedule Item Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬
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
              <p className="font-label-sm text-on-surface-variant flex items-center gap-1 flex-wrap">
                {slot.subject}
                {slot.bookingType === 'trial' && <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">Trial</span>}
              </p>
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
            <p className="font-label-sm text-on-surface-variant flex items-center gap-1 flex-wrap">
              {slot.subject}
              {slot.bookingType === 'trial' && <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">Trial</span>}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬ My Profile Tab Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬

function TutorEarningsTab() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadEarnings() {
      setLoading(true)
      setError('')
      try {
        const result = await getTutorEarnings()
        setData(result)
      } catch (e) {
        setError(e.message || 'Failed to load earnings.')
      } finally {
        setLoading(false)
      }
    }
    loadEarnings()
  }, [])

  if (loading) {
    return (
      <div className="bg-white/70 border border-outline-variant/20 rounded-2xl p-12 text-center text-on-surface-variant">
        Loading earnings...
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700">
        {error}
      </div>
    )
  }

  const summary = data?.summary || {}
  const transactions = data?.transactions || []
  const breakdown = data?.monthlyBreakdown || []
  const maxAmount = Math.max(...breakdown.map(item => item.amount), 1)

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Earnings</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Track real income from approved lessons and attendance records.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl border border-primary/15 bg-primary/5 px-4 py-2 text-primary font-label-md w-fit">
          <span className="material-symbols-outlined text-[18px]">payments</span>
          Rate: {formatMoney(data?.hourlyRate || 0)}/hour
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
        <EarningStatCard icon="account_balance_wallet" label="This Month" value={formatMoney(summary.thisMonthEarned || 0)} tone="primary" />
        <EarningStatCard icon="verified" label="Total Earned" value={formatMoney(summary.totalEarned || 0)} tone="success" />
        <EarningStatCard icon="hourglass_top" label="Waiting Attendance" value={formatMoney(summary.pendingAmount || 0)} tone="warning" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-lg">
        <div className="xl:col-span-2 bg-white/80 border border-outline-variant/20 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-headline-md text-headline-md text-on-surface">Last 6 Months</h3>
              <p className="text-[13px] text-on-surface-variant">Only lessons marked present are counted as earned.</p>
            </div>
          </div>
          <div className="h-64 flex items-end gap-3 border-b border-outline-variant/20 pt-6">
            {breakdown.map((item) => (
              <div key={item.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <div className="text-[11px] font-bold text-on-surface">{formatCompactMoney(item.amount)}</div>
                <div
                  className="w-full max-w-[56px] rounded-t-xl bg-primary/85 min-h-[8px] transition-all"
                  style={{ height: `${Math.max((item.amount / maxAmount) * 180, 8)}px` }}
                  title={`${item.label}: ${formatMoney(item.amount)}`}
                />
                <div className="text-[12px] text-on-surface-variant">{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/80 border border-outline-variant/20 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="font-headline-md text-headline-md text-on-surface">Lesson Status</h3>
          <EarningMiniStat label="Paid lessons" value={summary.completedLessons || 0} color="text-[#16a34a]" />
          <EarningMiniStat label="Need attendance" value={summary.pendingLessons || 0} color="text-amber-600" />
          <EarningMiniStat label="No charge" value={summary.noChargeLessons || 0} color="text-red-600" />
          <div className="rounded-xl bg-surface-container-low p-3 text-[12px] text-on-surface-variant">
            Tip: mark attendance in Students after each lesson. Present lessons become earned automatically.
          </div>
        </div>
      </div>

      <div className="bg-white/80 border border-outline-variant/20 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-outline-variant/20 flex items-center justify-between">
          <div>
            <h3 className="font-headline-md text-headline-md text-on-surface">Transactions</h3>
            <p className="text-[13px] text-on-surface-variant">Real lesson records from Supabase bookings.</p>
          </div>
        </div>
        {transactions.length === 0 ? (
          <div className="p-10 text-center text-on-surface-variant">
            No approved lessons yet.
          </div>
        ) : (
          <div className="divide-y divide-outline-variant/20">
            {transactions.map((item) => (
              <EarningTransactionRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function EarningStatCard({ icon, label, value, tone }) {
  const tones = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-[#dcfce7] text-[#16a34a]',
    warning: 'bg-amber-100 text-amber-700',
  }
  return (
    <div className="bg-white/80 border border-outline-variant/20 rounded-2xl p-5 shadow-sm">
      <div className={`w-11 h-11 rounded-full flex items-center justify-center mb-4 ${tones[tone] || tones.primary}`}>
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <p className="text-[13px] font-bold text-on-surface-variant uppercase">{label}</p>
      <p className="text-[30px] leading-[38px] font-black text-on-surface mt-1">{value}</p>
    </div>
  )
}

function EarningMiniStat({ label, value, color }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-outline-variant/20 p-3">
      <span className="text-[13px] text-on-surface-variant">{label}</span>
      <span className={`font-black ${color}`}>{value}</span>
    </div>
  )
}

function EarningTransactionRow({ item }) {
  const status = earningStatusConfig(item.paymentStatus)
  return (
    <div className="p-4 grid grid-cols-1 lg:grid-cols-[1.2fr_1fr_auto] gap-3 items-center">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold">
          {getInitials(item.studentName)}
        </div>
        <div>
          <p className="font-label-md text-label-md text-on-surface">{item.studentName}</p>
          <p className="text-[13px] text-on-surface-variant">{item.subject || 'General'} - {item.date} - {item.timeSlot}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <span className={`px-2 py-1 rounded-full border text-[11px] font-bold ${status.classes}`}>
          {status.label}
        </span>
        <span className="px-2 py-1 rounded-full border border-outline-variant/30 text-[11px] font-bold text-on-surface-variant">
          Attendance: {item.attendanceStatus}
        </span>
      </div>
      <div className="text-left lg:text-right">
        <p className={`font-black ${item.amount > 0 ? 'text-[#16a34a]' : 'text-on-surface-variant'}`}>
          {formatMoney(item.amount || 0)}
        </p>
      </div>
    </div>
  )
}

function earningStatusConfig(status) {
  if (status === 'earned') {
    return { label: 'Earned', classes: 'bg-[#dcfce7] text-[#16a34a] border-[#86efac]' }
  }
  if (status === 'pending_attendance') {
    return { label: 'Waiting attendance', classes: 'bg-amber-50 text-amber-700 border-amber-200' }
  }
  return { label: 'No charge', classes: 'bg-red-50 text-red-600 border-red-200' }
}

function formatMoney(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

function formatCompactMoney(value) {
  const amount = Number(value || 0)
  if (amount >= 1000000) return `${Math.round(amount / 100000) / 10}M`
  if (amount >= 1000) return `${Math.round(amount / 1000)}K`
  return String(amount)
}

function getInitials(name = 'Student') {
  return name.split(' ').filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase() || 'ST'
}
function TutorStudentsTab() {
  const [students, setStudents] = useState([])
  const [selectedKey, setSelectedKey] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingId, setSavingId] = useState('')
  const [attendanceNotes, setAttendanceNotes] = useState({})
  const [feedbackLesson, setFeedbackLesson] = useState(null)

  const loadStudents = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getTutorStudents()
      setStudents(Array.isArray(data) ? data : [])
      if (!selectedKey && data?.length) setSelectedKey(`${data[0].studentId}:${data[0].childName || ''}`)
    } catch (e) {
      setError(e.message || 'Failed to load students.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadStudents() }, [])

  const selectedStudent = students.find((student) => `${student.studentId}:${student.childName || ''}` === selectedKey) || students[0]
  const allLessons = students.flatMap((student) => student.lessons || [])
  const totalStudents = students.length
  const totalLessons = students.reduce((sum, student) => sum + (student.totalLessons || 0), 0)
  const totalAbsent = students.reduce((sum, student) => sum + (student.absentCount || 0), 0)
  const markedLessons = students.reduce((sum, student) => sum + (student.markedLessons || 0), 0)
  const presentLessons = students.reduce((sum, student) => sum + (student.presentCount || 0), 0)
  const attendanceRate = markedLessons ? Math.round((presentLessons / markedLessons) * 100) : 0

  const handleAttendance = async (lesson, status) => {
    setSavingId(lesson.bookingId)
    try {
      const note = attendanceNotes[lesson.bookingId] ?? lesson.attendanceNote ?? ''
      await markBookingAttendance(lesson.bookingId, status, note)
      await loadStudents()
    } catch (e) {
      alert(e.message || 'Failed to update attendance.')
    } finally {
      setSavingId('')
    }
  }

  const handleFeedbackSubmit = async (data) => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const payload = {
        lesson_id: feedbackLesson.bookingId,
        student_id: selectedStudent.studentId,
        subject_name: feedbackLesson.subject || selectedStudent.subjects[0] || 'General',
        focus_rating: data.focusRating,
        understanding_level: data.understandingLevel,
        homework_status: data.homeworkStatus,
        tutor_note: data.tutorNote
      };

      const res = await fetch('/api/feedbacks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setFeedbackLesson(null);
        alert('Đã gửi đánh giá thành công!');
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Server error');
      }
    } catch (error) {
      console.error('Lỗi khi gửi feedback:', error);
      alert('Không thể gửi đánh giá: ' + error.message);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Students</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">Manage students, approved lessons, attendance, absences, and class notes.</p>
        </div>
        <button onClick={loadStudents} className="h-10 px-4 border border-outline-variant rounded-xl text-on-surface-variant font-label-md hover:bg-surface-container transition-colors flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">refresh</span>Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StudentStatCard icon="groups" label="Students" value={totalStudents} />
        <StudentStatCard icon="event_available" label="Lessons" value={totalLessons} />
        <StudentStatCard icon="person_off" label="Absences" value={totalAbsent} />
        <StudentStatCard icon="fact_check" label="Attendance" value={markedLessons ? `${attendanceRate}%` : '--'} />
      </div>

      {error && <p className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}

      {loading ? (
        <div className="bg-white/80 border border-outline-variant/20 rounded-2xl p-12 text-center text-on-surface-variant">Loading students...</div>
      ) : students.length === 0 ? (
        <div className="bg-white/80 border border-outline-variant/20 rounded-2xl p-12 text-center">
          <span className="material-symbols-outlined text-[48px] text-outline">group_off</span>
          <h3 className="font-headline-md text-headline-md text-on-surface mt-2">No students yet</h3>
          <p className="text-on-surface-variant mt-1">Students will appear here after you approve booking requests.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="bg-white/80 border border-outline-variant/20 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-outline-variant/20">
              <h3 className="font-headline-md text-headline-md text-on-surface">Student List</h3>
              <p className="text-[12px] text-on-surface-variant">Select a student to view lesson records.</p>
            </div>
            <div className="divide-y divide-outline-variant/10 max-h-[620px] overflow-auto">
              {students.map((student) => {
                const key = `${student.studentId}:${student.childName || ''}`
                const active = key === selectedKey
                return (
                  <button key={key} onClick={() => setSelectedKey(key)} className={`w-full text-left p-4 flex gap-3 hover:bg-surface-container-low transition-colors ${active ? 'bg-primary/5' : ''}`}>
                    {student.studentAvatar ? <img src={student.studentAvatar} alt={student.studentName} className="w-12 h-12 rounded-full object-cover" /> : <div className="w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold">{(student.childName || student.studentName || 'S').charAt(0)}</div>}
                    <div className="min-w-0 flex-1">
                      <p className="font-label-md text-label-md text-on-surface truncate">{student.childName || student.studentName}</p>
                      {student.childName && <p className="text-[12px] text-on-surface-variant truncate">Parent: {student.studentName}</p>}
                      <p className="text-[12px] text-primary truncate">{student.subjects.join(', ') || 'General'}</p>
                      <div className="flex gap-2 mt-2 text-[11px]"><span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant">{student.totalLessons} lessons</span><span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600">{student.absentCount} absent</span></div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="xl:col-span-2 space-y-5">
            <StudentDetailCard student={selectedStudent} />
            <div className="bg-white/80 border border-outline-variant/20 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-outline-variant/20 flex items-center justify-between gap-3">
                <div><h3 className="font-headline-md text-headline-md text-on-surface">Lesson Attendance</h3><p className="text-[12px] text-on-surface-variant">Mark attendance for approved lessons. Pending requests cannot be marked yet.</p></div>
                <span className="text-[12px] font-bold text-on-surface-variant">{selectedStudent?.lessons?.length || 0} records</span>
              </div>
              <div className="divide-y divide-outline-variant/10">
                {(selectedStudent?.lessons || []).map((lesson) => <AttendanceRow key={lesson.bookingId} lesson={lesson} saving={savingId === lesson.bookingId} note={attendanceNotes[lesson.bookingId] ?? lesson.attendanceNote ?? ''} onNoteChange={(value) => setAttendanceNotes((prev) => ({ ...prev, [lesson.bookingId]: value }))} onMark={(status) => handleAttendance(lesson, status)} onFeedback={() => setFeedbackLesson(lesson)} />)}
              </div>
            </div>
            <AbsenceTimeline lessons={selectedStudent?.lessons || allLessons} />
          </div>
        </div>
      )}

      {feedbackLesson && (
        <TutorFeedbackModal
          isOpen={!!feedbackLesson}
          onClose={() => setFeedbackLesson(null)}
          lessonData={{ studentName: selectedStudent?.childName || selectedStudent?.studentName, datetime: `${feedbackLesson.date} ${feedbackLesson.timeSlot}` }}
          onSubmit={handleFeedbackSubmit}
        />
      )}
    </div>
  )
}

function StudentStatCard({ icon, label, value }) {
  return <div className="bg-white/80 border border-outline-variant/20 rounded-2xl p-4 shadow-sm flex items-center gap-3"><div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><span className="material-symbols-outlined">{icon}</span></div><div><p className="text-[12px] uppercase font-bold text-outline">{label}</p><p className="font-headline-sm text-headline-sm text-on-surface">{value}</p></div></div>
}

function StudentDetailCard({ student }) {
  if (!student) return null
  return <div className="bg-white/80 border border-outline-variant/20 rounded-2xl p-5 shadow-sm"><div className="flex flex-col md:flex-row md:items-center justify-between gap-4"><div><p className="text-[12px] uppercase font-bold text-outline">Selected student</p><h3 className="font-headline-md text-headline-md text-on-surface">{student.childName || student.studentName}</h3><p className="text-[13px] text-on-surface-variant">{student.studentEmail || 'No email'}</p></div><div className="grid grid-cols-3 gap-3 text-center"><div className="rounded-xl bg-surface-container-low p-3"><p className="font-bold text-on-surface">{student.totalLessons}</p><p className="text-[11px] text-outline">Lessons</p></div><div className="rounded-xl bg-red-50 p-3"><p className="font-bold text-red-600">{student.absentCount}</p><p className="text-[11px] text-red-500">Absent</p></div><div className="rounded-xl bg-primary/5 p-3"><p className="font-bold text-primary">{student.attendanceRate ?? '--'}{student.attendanceRate != null ? '%' : ''}</p><p className="text-[11px] text-primary">Rate</p></div></div></div>{student.nextLesson && <div className="mt-4 rounded-xl border border-primary/15 bg-primary/5 p-3 text-[13px] text-on-surface-variant">Next lesson: <strong>{student.nextLesson.date}</strong> at <strong>{student.nextLesson.timeSlot}</strong> - {student.nextLesson.subject}</div>}</div>
}

function AttendanceRow({ lesson, saving, note, onNoteChange, onMark, onFeedback }) {
  const approved = lesson.bookingStatus === 'Approved'
  const statusConfig = { present: 'bg-[#dcfce7] text-[#16a34a] border-[#bbf7d0]', absent: 'bg-red-50 text-red-600 border-red-200', excused: 'bg-amber-50 text-amber-700 border-amber-200' }
  return <div className="p-4 grid grid-cols-1 lg:grid-cols-[1.3fr_1fr_auto] gap-3 items-center"><div><p className="font-label-md text-label-md text-on-surface">{lesson.subject || 'General'}</p><p className="text-[13px] text-on-surface-variant">{lesson.date} - {lesson.timeSlot}</p><span className={`inline-flex mt-2 px-2 py-0.5 rounded-full border text-[11px] font-bold ${lesson.attendanceStatus ? statusConfig[lesson.attendanceStatus] : 'bg-surface-container text-on-surface-variant border-outline-variant/30'}`}>{lesson.attendanceStatus || lesson.bookingStatus}</span></div><input value={note} onChange={(e) => onNoteChange(e.target.value)} placeholder="Attendance note..." disabled={!approved || saving} className="h-10 px-3 rounded-xl border border-outline-variant text-[13px] outline-none focus:border-primary disabled:opacity-50" /><div className="flex flex-wrap gap-2 justify-start lg:justify-end"><button disabled={!approved || saving} onClick={() => onMark('present')} className="h-9 px-3 rounded-lg bg-[#16a34a] text-white text-[12px] font-bold disabled:opacity-40">Present</button><button disabled={!approved || saving} onClick={() => onMark('absent')} className="h-9 px-3 rounded-lg bg-red-600 text-white text-[12px] font-bold disabled:opacity-40">Absent</button><button disabled={!approved || saving} onClick={() => onMark('excused')} className="h-9 px-3 rounded-lg bg-amber-500 text-white text-[12px] font-bold disabled:opacity-40">Excused</button><button onClick={onFeedback} className="h-9 px-3 rounded-lg border border-blue-500 text-blue-600 text-[12px] font-bold hover:bg-blue-50 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">edit_note</span>Feedback</button></div></div>
}

function AbsenceTimeline({ lessons }) {
  const absences = lessons.filter((lesson) => lesson.attendanceStatus === 'absent')
  return <div className="bg-white/80 border border-outline-variant/20 rounded-2xl p-5 shadow-sm"><h3 className="font-headline-md text-headline-md text-on-surface mb-3">Absence History</h3>{absences.length === 0 ? <p className="text-[13px] text-on-surface-variant italic">No absences recorded.</p> : <div className="space-y-2">{absences.map((lesson) => <div key={lesson.bookingId} className="rounded-xl border border-red-200 bg-red-50 p-3"><p className="text-[13px] font-bold text-red-700">{lesson.date} - {lesson.timeSlot}</p><p className="text-[12px] text-red-600">{lesson.subject || 'General'}{lesson.attendanceNote ? ` - ${lesson.attendanceNote}` : ''}</p></div>)}</div>}</div>
}
function pad2(value) {
  return String(value).padStart(2, '0')
}

function toDateKey(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

function startOfWeek(date) {
  const next = new Date(date)
  const day = next.getDay()
  const diff = day === 0 ? -6 : 1 - day
  next.setDate(next.getDate() + diff)
  next.setHours(0, 0, 0, 0)
  return next
}

function addDays(date, days) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function addMonths(date, months) {
  const next = new Date(date)
  next.setMonth(next.getMonth() + months)
  return next
}

function monthDays(cursor) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const gridStart = startOfWeek(first)
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index))
}

function formatShortDate(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatMonthTitle(date) {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function getDayName(date) {
  return DAY_ORDER[(date.getDay() + 6) % 7]
}

function normalizeBookingDate(value) {
  if (!value) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? '' : toDateKey(parsed)
}

function MyScheduleTab() {
  const [view, setView] = useState('week')
  const [cursor, setCursor] = useState(new Date())
  const [profile, setProfile] = useState(null)
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function loadSchedule() {
      setLoading(true)
      setError('')
      try {
        const [profileData, bookingData] = await Promise.all([getTutorProfile(), getBookings()])
        if (!active) return
        setProfile(profileData)
        setBookings(Array.isArray(bookingData) ? bookingData : [])
      } catch (e) {
        if (!active) return
        setError(e.message || 'Failed to load schedule.')
      } finally {
        if (active) setLoading(false)
      }
    }
    loadSchedule()
    return () => { active = false }
  }, [])

  const availability = profile?.availability || {}
  const approvedBookings = bookings.filter((booking) => String(booking.status).toLowerCase() === 'approved')
  const weekStart = startOfWeek(cursor)
  const weekDates = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))
  const monthGrid = monthDays(cursor)
  const totalAvailable = DAY_ORDER.reduce((sum, day) => sum + (availability[day] || []).length, 0)
  const totalClasses = approvedBookings.length

  const eventsForDate = (date) => {
    const dayName = getDayName(date)
    const dateKey = toDateKey(date)
    const availableSlots = (availability[dayName] || []).map((time) => ({
      id: `available-${dateKey}-${time}`,
      type: 'available',
      time,
      title: 'Available for booking',
      meta: dayName,
    }))
    const bookedSlots = approvedBookings
      .filter((booking) => normalizeBookingDate(booking.lesson_date || booking.date) === dateKey)
      .map((booking) => ({
        id: `booking-${booking.id}`,
        type: 'booking',
        time: booking.time_slot || booking.timeSlot || booking.time || 'Scheduled',
        title: booking.subject || 'Class',
        meta: booking.childName || booking.studentName || 'Student',
      }))
    return [...bookedSlots, ...availableSlots].sort((a, b) => String(a.time).localeCompare(String(b.time)))
  }

  const goPrev = () => setCursor((current) => view === 'week' ? addDays(current, -7) : addMonths(current, -1))
  const goNext = () => setCursor((current) => view === 'week' ? addDays(current, 7) : addMonths(current, 1))
  const goToday = () => setCursor(new Date())

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">My Schedule</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">View your availability and approved classes by week or month.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex p-1 bg-surface-container-low rounded-xl border border-outline-variant/30">
            <button type="button" onClick={() => setView('week')} className={`h-9 px-4 rounded-lg font-label-md text-label-md transition-colors ${view === 'week' ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:text-primary'}`}>Week</button>
            <button type="button" onClick={() => setView('month')} className={`h-9 px-4 rounded-lg font-label-md text-label-md transition-colors ${view === 'month' ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:text-primary'}`}>Month</button>
          </div>
          <button onClick={goToday} className="h-10 px-4 border border-outline-variant rounded-xl text-on-surface-variant font-label-md hover:bg-surface-container transition-colors">Today</button>
          <button onClick={goPrev} className="w-10 h-10 border border-outline-variant rounded-xl text-on-surface-variant hover:bg-surface-container transition-colors"><span className="material-symbols-outlined text-[18px]">chevron_left</span></button>
          <button onClick={goNext} className="w-10 h-10 border border-outline-variant rounded-xl text-on-surface-variant hover:bg-surface-container transition-colors"><span className="material-symbols-outlined text-[18px]">chevron_right</span></button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ScheduleSummaryCard icon="event_available" label="Available Slots" value={totalAvailable} />
        <ScheduleSummaryCard icon="school" label="Approved Classes" value={totalClasses} />
        <ScheduleSummaryCard icon="calendar_month" label={view === 'week' ? 'Current Week' : 'Current Month'} value={view === 'week' ? `${formatShortDate(weekDates[0])} - ${formatShortDate(weekDates[6])}` : formatMonthTitle(cursor)} />
      </div>

      {error && <p className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}

      <div className="bg-white/80 backdrop-blur-md border border-outline-variant/20 shadow-sm rounded-2xl overflow-hidden">
        {loading ? (
          <div className="min-h-[320px] flex items-center justify-center text-on-surface-variant">Loading schedule...</div>
        ) : view === 'week' ? (
          <div className="grid grid-cols-1 lg:grid-cols-7 divide-y lg:divide-y-0 lg:divide-x divide-outline-variant/20">
            {weekDates.map((date) => <ScheduleDayColumn key={toDateKey(date)} date={date} events={eventsForDate(date)} />)}
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-7 border-b border-outline-variant/20 bg-surface-container-lowest">
              {DAY_ORDER.map((day) => <div key={day} className="px-3 py-2 text-[11px] font-bold uppercase text-outline">{day.slice(0, 3)}</div>)}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-7">
              {monthGrid.map((date) => <ScheduleMonthCell key={toDateKey(date)} date={date} events={eventsForDate(date)} isCurrentMonth={date.getMonth() === cursor.getMonth()} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ScheduleSummaryCard({ icon, label, value }) {
  return (
    <div className="bg-white/80 border border-outline-variant/20 rounded-2xl p-4 shadow-sm flex items-center gap-3">
      <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <div>
        <p className="text-[12px] uppercase font-bold text-outline">{label}</p>
        <p className="font-headline-sm text-headline-sm text-on-surface">{value}</p>
      </div>
    </div>
  )
}

function ScheduleDayColumn({ date, events }) {
  const isToday = toDateKey(date) === toDateKey(new Date())
  return (
    <div className={`min-h-[420px] p-4 ${isToday ? 'bg-primary/5' : 'bg-white/50'}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[12px] font-bold uppercase text-outline">{getDayName(date)}</p>
          <p className="font-headline-md text-headline-md text-on-surface">{formatShortDate(date)}</p>
        </div>
        {isToday && <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-primary text-on-primary">Today</span>}
      </div>
      {events.length === 0 ? <p className="text-[12px] text-outline italic">No slots</p> : <div className="space-y-2">{events.map((event) => <ScheduleEventPill key={event.id} event={event} />)}</div>}
    </div>
  )
}

function ScheduleMonthCell({ date, events, isCurrentMonth }) {
  const isToday = toDateKey(date) === toDateKey(new Date())
  return (
    <div className={`min-h-[120px] border-b sm:border-r border-outline-variant/20 p-3 ${isCurrentMonth ? 'bg-white' : 'bg-surface-container-low/40 opacity-60'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[12px] font-bold ${isToday ? 'bg-primary text-on-primary rounded-full w-7 h-7 flex items-center justify-center' : 'text-on-surface'}`}>{date.getDate()}</span>
        {events.length > 0 && <span className="text-[10px] text-primary font-bold">{events.length}</span>}
      </div>
      <div className="space-y-1">
        {events.slice(0, 3).map((event) => <div key={event.id} className={`truncate rounded-md px-2 py-1 text-[10px] font-semibold ${event.type === 'booking' ? 'bg-primary text-on-primary' : 'bg-primary/10 text-primary'}`}>{event.time}</div>)}
        {events.length > 3 && <p className="text-[10px] text-outline">+{events.length - 3} more</p>}
      </div>
    </div>
  )
}

function ScheduleEventPill({ event }) {
  const isBooking = event.type === 'booking'
  return (
    <div className={`rounded-xl border px-3 py-2 ${isBooking ? 'bg-primary text-on-primary border-primary' : 'bg-primary/5 text-primary border-primary/20'}`}>
      <p className="text-[12px] font-bold">{event.time}</p>
      <p className={`text-[12px] ${isBooking ? 'text-on-primary' : 'text-on-surface'}`}>{event.title}</p>
      <p className={`text-[11px] ${isBooking ? 'text-on-primary/80' : 'text-on-surface-variant'}`}>{event.meta}</p>
    </div>
  )
}

const DAY_ORDER = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
const TIME_SLOTS = [
  '07:00 AM','08:00 AM','09:00 AM','10:00 AM','10:30 AM','11:00 AM',
  '12:00 PM','01:00 PM','01:30 PM','02:00 PM','03:00 PM','03:30 PM',
  '04:00 PM','05:00 PM','06:00 PM','07:00 PM','08:00 PM',
]

// Badge hiĂ¡Â»Æ’n thĂ¡Â»â€¹ trĂ¡ÂºÂ¡ng thÄ‚Â¡i duyĂ¡Â»â€¡t
function StatusBadge({ status }) {
  if (status === 'approved') return (
    <span className="inline-flex items-center gap-1 bg-[#f0fdf4] text-[#16a34a] text-[11px] font-bold px-2 py-0.5 rounded-full border border-[#bbf7d0]">
      <span className="material-symbols-outlined icon-fill text-[13px]">check_circle</span>Approved
    </span>
  )
  if (status === 'rejected') return (
    <span className="inline-flex items-center gap-1 bg-red-50 text-red-600 text-[11px] font-bold px-2 py-0.5 rounded-full border border-red-200">
      <span className="material-symbols-outlined text-[13px]">cancel</span>Rejected
    </span>
  )
  if (status === 'draft') return (
    <span className="inline-flex items-center gap-1 bg-surface-container text-on-surface-variant text-[11px] font-bold px-2 py-0.5 rounded-full border border-outline-variant">
      <span className="material-symbols-outlined text-[13px]">edit_note</span>Draft
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-[11px] font-bold px-2 py-0.5 rounded-full border border-amber-200">
      <span className="material-symbols-outlined text-[13px]">pending</span>Pending review
    </span>
  )
}

function TutorProfileTab({ user, displayName, initials, updateUserContext }) {
  const { updateUser } = useAuth()

  // Profile state
  const [profile, setProfile]           = useState(null)
  const [profileLoading, setProfileLoading] = useState(true)

  // Bio edit
  const [bioEdit, setBioEdit]           = useState(false)
  const [bioValue, setBioValue]         = useState('')
  const [bioSaving, setBioSaving]       = useState(false)

  // Avatar
  const [avatarUrl, setAvatarUrl]       = useState(user?.picture || '')
  const [avatarEdit, setAvatarEdit]     = useState(false)
  const [avatarInput, setAvatarInput]   = useState('')
  const [avatarSaving, setAvatarSaving] = useState(false)
  const [avatarError, setAvatarError]   = useState('')

  // CV edit
  const [cvEdit, setCvEdit]             = useState(false)
  const [cvForm, setCvForm]             = useState({
    full_name: displayName,
    headline: '',
    phone: '',
    location: '',
    subjects: '',
    hourly_rate: '',
    experience_years: '',
    bio: '',
    teaching_style: '',
    demo_video_url: '',
  })
  const [cvSaving, setCvSaving]         = useState(false)
  const [videoUploading, setVideoUploading] = useState(false)
  const [cvError, setCvError]           = useState('')
  const [submitLoading, setSubmitLoading] = useState(false)
  const [submitError, setSubmitError]   = useState('')

  // Credential add modal
  const [credModal, setCredModal]       = useState(null) // 'education' | 'certificate' | 'experience' | null
  const [credForm, setCredForm]         = useState({ title: '', description: '', proof_url: '' })
  const [credSaving, setCredSaving]     = useState(false)
  const [credError, setCredError]       = useState('')

  // Availability edit
  const [availEdit, setAvailEdit]       = useState(false)
  const [availData, setAvailData]       = useState({})
  const [availSaving, setAvailSaving]   = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const data = await getTutorProfile()
        setProfile(data)
        setBioValue(data.bio_pending || data.bio || '')
        setAvailData(data.availability || {})
        setAvatarUrl(data.picture || user?.picture || '')
        setCvForm({
          full_name: data.full_name || displayName,
          headline: data.headline || '',
          phone: data.phone || '',
          location: data.location || '',
          subjects: data.subjects || '',
          hourly_rate: data.hourly_rate || '',
          experience_years: data.experience_years || '',
          bio: data.bio || '',
          teaching_style: data.teaching_style || '',
          demo_video_url: data.demo_video_url || '',
        })
      } catch (e) {
        setProfile({ bio: '', bio_status: 'approved', status: 'draft', credentials: [], availability: {} })
      } finally {
        setProfileLoading(false)
      }
    }
    load()
  }, [])

  // Ă¢â€â‚¬Ă¢â€â‚¬ Bio save Ă¢â‚¬â€ khÄ‚Â´ng cĂ¡ÂºÂ§n duyĂ¡Â»â€¡t, lĂ†Â°u thĂ¡ÂºÂ³ng Ă¢â€â‚¬Ă¢â€â‚¬
  const handleBioSave = async () => {
    setBioSaving(true)
    try {
      // GĂ¡Â»Âi API cĂ¡ÂºÂ­p nhĂ¡ÂºÂ­t bio trĂ¡Â»Â±c tiĂ¡ÂºÂ¿p (khÄ‚Â´ng qua pending)
      await updateTutorBio(bioValue)
      setProfile(p => ({ ...p, bio: bioValue, bio_pending: null, bio_status: 'approved' }))
      setBioEdit(false)
    } catch { /* ignore */ }
    finally { setBioSaving(false) }
  }

  // Ă¢â€â‚¬Ă¢â€â‚¬ Avatar save Ă¢â€â‚¬Ă¢â€â‚¬
  const handleAvatarSave = async () => {
    if (!avatarInput.trim()) return
    setAvatarSaving(true)
    try {
      await updateTutorAvatar(avatarInput.trim())
      setAvatarUrl(avatarInput.trim())
      updateUser({ picture: avatarInput.trim() })
      setAvatarEdit(false)
      setAvatarInput('')
    } catch { /* ignore */ }
    finally { setAvatarSaving(false) }
  }

  const handleAvatarFile = async (file) => {
    if (!file) return
    setAvatarError('')
    setAvatarSaving(true)
    try {
      const url = await uploadAvatarFile(file, user?.id)
      await updateTutorAvatar(url)
      setAvatarUrl(url)
      updateUser({ picture: url })
      setAvatarEdit(false)
    } catch (e) {
      setAvatarError(e.message || 'Upload avatar failed.')
    } finally {
      setAvatarSaving(false)
    }
  }

  const handleVideoFile = async (file) => {
    if (!file) return
    setCvError('')
    setVideoUploading(true)
    try {
      const url = await uploadDemoVideo(file, user?.id)
      setCvForm(f => ({ ...f, demo_video_url: url }))
    } catch (e) {
      setCvError(e.message || 'Upload video failed.')
    } finally {
      setVideoUploading(false)
    }
  }

  const handleCvSave = async () => {
    setCvError('')

    setCvSaving(true)
    try {
      const updated = await updateTutorCv(cvForm)
      setProfile(p => ({ ...p, ...updated }))
      setBioValue(cvForm.bio)
      updateUser({ name: cvForm.full_name })
      setCvEdit(false)
    } catch (e) {
      setCvError(e.message || 'Save CV failed.')
    } finally {
      setCvSaving(false)
    }
  }

  // Ă¢â€â‚¬Ă¢â€â‚¬ Add credential Ă¢â€â‚¬Ă¢â€â‚¬
  const handleSubmitProfile = async () => {
    setSubmitError('')
    setCvError('')
    const source = cvEdit ? cvForm : profile

    if (!source?.bio?.trim()) {
      setSubmitError('Vui long dien phan gioi thieu ban than truoc khi nop.')
      return
    }
    if (!source?.subjects?.trim()) {
      setSubmitError('Vui long dien mon day truoc khi nop.')
      return
    }

    setSubmitLoading(true)
    try {
      if (cvEdit) {
        const saved = await updateTutorCv(cvForm)
        setProfile(p => ({ ...p, ...saved }))
        setBioValue(cvForm.bio)
        updateUser({ name: cvForm.full_name })
        setCvEdit(false)
      }
      const updated = await submitTutorProfile()
      setProfile(p => ({ ...p, ...updated }))
      alert('Da nop ho so cho admin duyet.')
    } catch (e) {
      setSubmitError(e.message || 'Nop ho so that bai.')
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleAddCredential = async () => {
    setCredError('')
    if (!credForm.title.trim()) { setCredError('Title is required.'); return }
    if (credModal !== 'experience' && !credForm.proof_url.trim()) {
      setCredError('Proof image/document URL is required.'); return
    }
    setCredSaving(true)
    try {
      const newCred = await addTutorCredential({
        type: credModal,
        title: credForm.title,
        description: credForm.description,
        proof_url: credForm.proof_url,
      })
      setProfile(p => ({ ...p, credentials: [...(p.credentials || []), newCred] }))
      setCredModal(null)
      setCredForm({ title: '', description: '', proof_url: '' })
    } catch (e) { setCredError(e.message || 'Failed to add.') }
    finally { setCredSaving(false) }
  }

  // Ă¢â€â‚¬Ă¢â€â‚¬ Delete credential Ă¢â€â‚¬Ă¢â€â‚¬
  const handleDeleteCred = async (id, status) => {
    try {
      await deleteTutorCredential(id)
      setProfile(p => ({ ...p, credentials: p.credentials.filter(c => c.id !== id) }))
    } catch { /* ignore */ }
  }

  // Ă¢â€â‚¬Ă¢â€â‚¬ Availability toggle slot Ă¢â€â‚¬Ă¢â€â‚¬
  const toggleSlot = (day, slot) => {
    setAvailData(prev => {
      const current = prev[day] || []
      const next = current.includes(slot)
        ? current.filter(s => s !== slot)
        : [...current, slot].sort()
      return { ...prev, [day]: next }
    })
  }

  const handleAvailSave = async () => {
    setAvailSaving(true)
    try {
      await updateTutorAvailability(availData)
      setProfile(p => ({ ...p, availability: availData }))
      setAvailEdit(false)
    } catch { /* ignore */ }
    finally { setAvailSaving(false) }
  }

  if (profileLoading) return (
    <div className="flex items-center justify-center py-20">
      <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
      </svg>
    </div>
  )

  const credentials = profile?.credentials || []
  const education   = credentials.filter(c => c.type === 'education')
  const certs       = credentials.filter(c => c.type === 'certificate')
  const experience  = credentials.filter(c => c.type === 'experience')
  const isVerified  = profile?.status === 'approved'
  const profileStatus = profile?.status || 'draft'
  const approvedAtMs = profile?.approved_at ? new Date(profile.approved_at).getTime() : 0
  const fallbackApprovedAtMs = profile?.updated_at ? new Date(profile.updated_at).getTime() : 0
  const isNewTutor = isVerified && (
    profile?.isNewTutor ||
    profile?.is_new_tutor ||
    (approvedAtMs && approvedAtMs >= Date.now() - 30 * 24 * 60 * 60 * 1000) ||
    (!approvedAtMs && fallbackApprovedAtMs && fallbackApprovedAtMs >= Date.now() - 30 * 24 * 60 * 60 * 1000)
  )
  const isPending = profileStatus === 'pending'
  const isRejected = profileStatus === 'rejected'
  const submitButtonText = isPending
    ? 'Dang cho admin duyet'
    : isVerified
      ? 'Nop lai ho so sau khi chinh sua'
      : 'Nop ho so cho Admin duyet'
  const statusConfig = isVerified
    ? { icon: 'verified_user', title: 'Account Verified', box: 'bg-[#f0fdf4] border-[#bbf7d0]', iconColor: 'text-[#16a34a]', titleColor: 'text-[#16a34a]', textColor: 'text-[#166534]', text: 'Ho so da duoc admin duyet. Hoc sinh va phu huynh se thay tick xanh tren ten gia su.' }
    : isRejected
      ? { icon: 'cancel', title: 'Profile Rejected', box: 'bg-red-50 border-red-200', iconColor: 'text-red-600', titleColor: 'text-red-700', textColor: 'text-red-700', text: profile?.reject_reason ? `Ly do: ${profile.reject_reason}` : 'Ho so bi tu choi. Hay chinh sua thong tin va nop lai.' }
      : isPending
        ? { icon: 'pending', title: 'Verification Pending', box: 'bg-amber-50 border-amber-200', iconColor: 'text-amber-500', titleColor: 'text-amber-700', textColor: 'text-amber-700', text: 'Ho so dang cho admin duyet. Ban van co the chinh sua va nop lai neu can.' }
        : { icon: 'edit_note', title: 'Draft Profile', box: 'bg-surface-container-low border-outline-variant/40', iconColor: 'text-on-surface-variant', titleColor: 'text-on-surface', textColor: 'text-on-surface-variant', text: 'Day la ban nhap. Hay dien du thong tin, luu lai, roi bam nut nop o cuoi trang.' }
  const submitStatus = isVerified
    ? { icon: 'verified', text: 'Ho so da duoc admin xac nhan thanh cong.', classes: 'bg-[#f0fdf4] text-[#16a34a] border-[#bbf7d0]' }
    : isRejected
      ? { icon: 'cancel', text: 'Ho so cua ban khong duoc thong qua.', classes: 'bg-red-50 text-red-700 border-red-200' }
      : isPending
        ? { icon: 'pending', text: 'Pending - ho so dang cho admin duyet.', classes: 'bg-amber-50 text-amber-700 border-amber-200' }
        : { icon: 'edit_note', text: 'Chua nop ho so cho admin.', classes: 'bg-surface-container-low text-on-surface-variant border-outline-variant/40' }

  return (
    <div className="space-y-6 pb-10">

      {/* Ă¢â€â‚¬Ă¢â€â‚¬ Header Ă¢â€â‚¬Ă¢â€â‚¬ */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">My Profile</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Manage your public profile. Submit the completed profile for admin approval when ready.
          </p>
        </div>
        <a href="#/" className="h-10 px-4 border border-outline-variant text-on-surface-variant font-label-md text-label-md rounded-xl hover:bg-surface-container-high transition-colors flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px]">open_in_new</span>View Public Profile
        </a>
      </div>

      {/* Ă¢â€â‚¬Ă¢â€â‚¬ Hero: Avatar + name Ă¢â€â‚¬Ă¢â€â‚¬ */}
      <div className="bg-gradient-to-br from-[#eef1ff] to-[#eaf3ff] rounded-2xl p-6 border border-primary/10 shadow-sm flex flex-wrap gap-5 items-center">
        {/* Avatar with change button */}
        <div className="relative flex-shrink-0 group">
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName}
              className="w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-md" />
          ) : (
            <div className="w-24 h-24 rounded-2xl bg-primary flex items-center justify-center text-on-primary text-3xl font-bold border-4 border-white shadow-md">
              {initials}
            </div>
          )}
          {isVerified && (
            <span className="material-symbols-outlined icon-fill absolute -bottom-2 -right-2 text-[22px] bg-white rounded-full p-0.5 shadow" style={{ color: '#16a34a' }} title="Verified by EduX">verified</span>
          )}
          {/* Change avatar overlay */}
          <button
            onClick={() => setAvatarEdit(true)}
            className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            title="Change avatar"
          >
            <span className="material-symbols-outlined text-white text-[24px]">photo_camera</span>
          </button>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-headline-md text-headline-md text-on-surface font-bold">{displayName}</h3>
            {isNewTutor && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-amber-700">
                New
              </span>
            )}
            {isVerified
              ? <span className="inline-flex items-center gap-1 bg-[#f0fdf4] text-[#16a34a] text-[11px] font-bold px-2.5 py-1 rounded-full border border-[#bbf7d0]"><span className="material-symbols-outlined icon-fill text-[13px]">verified</span>Verified by EduX</span>
              : <StatusBadge status={profileStatus} />
            }
          </div>
          <p className="text-[13px] text-on-surface-variant">{user?.email}</p>
        </div>

        {/* Avatar change prompt */}
        <button onClick={() => setAvatarEdit(true)}
          className="h-9 px-4 bg-white border border-outline-variant text-on-surface-variant font-label-sm text-label-sm rounded-xl hover:bg-surface-container-high transition-colors flex items-center gap-1.5 shadow-sm">
          <span className="material-symbols-outlined text-[16px]">photo_camera</span>
          Change Photo
        </button>
      </div>

      {/* Ă¢â€â‚¬Ă¢â€â‚¬ Avatar URL dialog Ă¢â€â‚¬Ă¢â€â‚¬ */}
      {avatarEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl space-y-4">
            <h3 className="font-headline-md text-headline-md text-on-surface">Change Profile Photo</h3>
            <p className="text-[13px] text-on-surface-variant">Upload anh tu may len Supabase Storage.</p>
            <label className="border-2 border-dashed border-outline-variant/60 rounded-xl p-5 flex flex-col items-center gap-2 cursor-pointer hover:border-primary/50 hover:bg-surface-container-low/40 transition-colors">
              <span className="material-symbols-outlined text-[32px] text-primary">upload_file</span>
              <span className="text-[13px] font-semibold text-on-surface">Chon anh avatar</span>
              <span className="text-[11px] text-outline">JPG, PNG, WebP - toi da 5MB</span>
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                className="hidden"
                disabled={avatarSaving}
                onChange={e => handleAvatarFile(e.target.files?.[0])}
              />
            </label>
            <div className="flex items-center gap-2">
              <div className="h-px bg-outline-variant/40 flex-1" />
              <span className="text-[11px] text-outline">hoac dan URL</span>
              <div className="h-px bg-outline-variant/40 flex-1" />
            </div>
            <input
              className="w-full h-11 px-3 border border-outline-variant rounded-xl text-[14px] text-on-surface outline-none focus:border-primary"
              placeholder="https://example.com/photo.jpg"
              value={avatarInput}
              onChange={e => setAvatarInput(e.target.value)}
            />
            {avatarError && <p className="text-[12px] text-red-600">{avatarError}</p>}
            {avatarInput && (
              <img src={avatarInput} alt="preview" className="w-20 h-20 rounded-xl object-cover border border-outline-variant mx-auto" onError={e => e.target.style.display='none'} />
            )}
            <div className="flex gap-2">
              <button onClick={() => { setAvatarEdit(false); setAvatarInput('') }}
                className="flex-1 h-10 border border-outline-variant text-on-surface-variant rounded-xl font-label-md text-label-md hover:bg-surface-container transition-colors">
                Cancel
              </button>
              <button onClick={handleAvatarSave} disabled={avatarSaving || !avatarInput.trim()}
                className="flex-1 h-10 bg-primary text-on-primary rounded-xl font-label-md text-label-md hover:bg-primary/90 transition-colors disabled:opacity-50">
                {avatarSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">

          <div className="bg-white/70 backdrop-blur-md border border-white/30 shadow-sm rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4 gap-3">
              <div>
                <h4 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">badge</span>
                  Tutor CV
                </h4>
                <p className="text-[12px] text-on-surface-variant mt-1">Gia su tu dien CV, upload video demo va gui admin duyet.</p>
              </div>
              {!cvEdit && (
                <button onClick={() => setCvEdit(true)}
                  className="h-8 px-3 border border-outline-variant text-on-surface-variant font-label-sm text-[12px] rounded-lg hover:bg-surface-container transition-colors flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px]">edit</span>Edit CV
                </button>
              )}
            </div>

            {cvError && <p className="mb-3 text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{cvError}</p>}

            {cvEdit ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <CvInput label="Ho ten" value={cvForm.full_name} onChange={v => setCvForm(f => ({ ...f, full_name: v }))} />
                  <CvInput label="Tieu de nghe nghiep" value={cvForm.headline} onChange={v => setCvForm(f => ({ ...f, headline: v }))} placeholder="VD: Gia su Toan THPT" />
                  <CvInput label="So dien thoai" value={cvForm.phone} onChange={v => setCvForm(f => ({ ...f, phone: v }))} />
                  <CvInput label="Khu vuc" value={cvForm.location} onChange={v => setCvForm(f => ({ ...f, location: v }))} placeholder="Online / Ho Chi Minh" />
                  <CvInput label="Mon day" value={cvForm.subjects} onChange={v => setCvForm(f => ({ ...f, subjects: v }))} placeholder="Mathematics, Physics" />
                  <CvInput label="Hoc phi / gio" type="number" value={cvForm.hourly_rate} onChange={v => setCvForm(f => ({ ...f, hourly_rate: v }))} />
                  <CvInput label="So nam kinh nghiem" type="number" value={cvForm.experience_years} onChange={v => setCvForm(f => ({ ...f, experience_years: v }))} />
                </div>
                <CvTextarea label="Gioi thieu ban than" rows={4} value={cvForm.bio} onChange={v => setCvForm(f => ({ ...f, bio: v }))} />
                <CvTextarea label="Phong cach giang day" rows={3} value={cvForm.teaching_style} onChange={v => setCvForm(f => ({ ...f, teaching_style: v }))} />
                <div>
                  <label className="block text-[12px] font-semibold text-on-surface mb-1">Video demo giang day</label>
                  <label className="border-2 border-dashed border-outline-variant/60 rounded-xl p-4 flex flex-col items-center gap-1.5 cursor-pointer hover:border-primary/50 hover:bg-surface-container-low/40 transition-colors">
                    <span className="material-symbols-outlined text-[30px] text-primary">video_library</span>
                    <span className="text-[13px] font-semibold text-on-surface">{videoUploading ? 'Dang upload video...' : 'Chon video demo tu may'}</span>
                    <span className="text-[11px] text-outline">MP4, WebM, MOV - toi da 100MB</span>
                    <input type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" disabled={videoUploading} onChange={e => handleVideoFile(e.target.files?.[0])} />
                  </label>
                  <input className="mt-2 w-full h-10 px-3 border border-outline-variant rounded-xl text-[13px] outline-none focus:border-primary" placeholder="Hoac dan video URL" value={cvForm.demo_video_url} onChange={e => setCvForm(f => ({ ...f, demo_video_url: e.target.value }))} />
                  {cvForm.demo_video_url && <video className="mt-3 w-full max-h-64 rounded-xl bg-black" src={cvForm.demo_video_url} controls />}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setCvEdit(false)} className="h-10 px-4 border border-outline-variant text-on-surface-variant rounded-xl font-label-md text-label-md hover:bg-surface-container transition-colors">Cancel</button>
                  <button onClick={handleCvSave} disabled={cvSaving || videoUploading} className="h-10 px-5 bg-primary text-on-primary rounded-xl font-label-md text-label-md hover:bg-primary/90 transition-colors disabled:opacity-50">
                    {cvSaving ? 'Saving...' : 'Save Draft'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[13px]">
                <InfoItem label="Tieu de" value={profile?.headline} />
                <InfoItem label="Khu vuc" value={profile?.location} />
                <InfoItem label="Mon day" value={profile?.subjects} />
                <InfoItem label="Hoc phi" value={profile?.hourly_rate ? `${profile.hourly_rate}/hr` : ''} />
                <InfoItem label="Kinh nghiem" value={profile?.experience_years ? `${profile.experience_years} nam` : ''} />
                <InfoItem label="Dien thoai" value={profile?.phone} />
                <div className="md:col-span-2"><InfoItem label="Phong cach day" value={profile?.teaching_style} /></div>
                {profile?.demo_video_url && <div className="md:col-span-2"><p className="font-semibold text-on-surface mb-2">Video demo</p><video className="w-full max-h-72 rounded-xl bg-black" src={profile.demo_video_url} controls /></div>}
              </div>
            )}
          </div>

          {/* Ă¢â€â‚¬Ă¢â€â‚¬ About Me Ă¢â€â‚¬Ă¢â€â‚¬ */}
          <div className="bg-white/70 backdrop-blur-md border border-white/30 shadow-sm rounded-2xl p-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">person</span>
                About Me
              </h4>
              <div className="flex items-center gap-2">
                {!bioEdit && (
                  <button onClick={() => { setBioEdit(true); setBioValue(profile?.bio || '') }}
                    className="h-8 px-3 border border-outline-variant text-on-surface-variant font-label-sm text-[12px] rounded-lg hover:bg-surface-container transition-colors flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px]">edit</span>Edit
                  </button>
                )}
              </div>
            </div>

            {bioEdit ? (
              <div className="space-y-3">
                <textarea
                  rows={5}
                  className="w-full px-3 py-2 border border-outline-variant rounded-xl text-[14px] text-on-surface outline-none focus:border-primary resize-y"
                  value={bioValue}
                  onChange={e => setBioValue(e.target.value)}
                  placeholder="Tell students about yourself, your teaching style, and your experience..."
                />
                <div className="flex gap-2">
                  <button onClick={() => setBioEdit(false)}
                    className="h-9 px-4 border border-outline-variant text-on-surface-variant font-label-sm rounded-lg hover:bg-surface-container transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleBioSave} disabled={bioSaving}
                    className="h-9 px-4 bg-primary text-on-primary font-label-sm rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1">
                    {bioSaving ? 'Saving...' : <><span className="material-symbols-outlined text-[15px]">check</span>Save</>}
                  </button>
                </div>
              </div>
            ) : (
              <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                {profile?.bio || <span className="italic text-outline">No bio yet. Click Edit to add one.</span>}
              </p>
            )}
          </div>

          {/* Ă¢â€â‚¬Ă¢â€â‚¬ Education Ă¢â€â‚¬Ă¢â€â‚¬ */}
          <CredentialSection
            title="Education & Degrees"
            icon="school"
            items={education}
            type="education"
            onAdd={() => { setCredModal('education'); setCredForm({ title:'', description:'', proof_url:'' }) }}
            onDelete={handleDeleteCred}
            proofLabel="Degree Certificate / Transcript image URL"
          />

          {/* Ă¢â€â‚¬Ă¢â€â‚¬ Certificates Ă¢â€â‚¬Ă¢â€â‚¬ */}
          <CredentialSection
            title="Certificates & Qualifications"
            icon="workspace_premium"
            items={certs}
            type="certificate"
            onAdd={() => { setCredModal('certificate'); setCredForm({ title:'', description:'', proof_url:'' }) }}
            onDelete={handleDeleteCred}
            proofLabel="Certificate image URL"
          />

          {/* Ă¢â€â‚¬Ă¢â€â‚¬ Experience Ă¢â€â‚¬Ă¢â€â‚¬ */}
          <CredentialSection
            title="Teaching Experience"
            icon="work_history"
            items={experience}
            type="experience"
            onAdd={() => { setCredModal('experience'); setCredForm({ title:'', description:'', proof_url:'' }) }}
            onDelete={handleDeleteCred}
            noProof
          />
        </div>

        {/* Ă¢â€â‚¬Ă¢â€â‚¬ RIGHT: Availability Ă¢â€â‚¬Ă¢â€â‚¬ */}
        <div className="space-y-5">
          <div className="bg-white/70 backdrop-blur-md border border-white/30 shadow-sm rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">calendar_month</span>
                Weekly Schedule
              </h4>
              {!availEdit ? (
                <button onClick={() => { setAvailEdit(true); setAvailData(profile?.availability || {}) }}
                  className="h-8 px-3 border border-outline-variant text-on-surface-variant font-label-sm text-[12px] rounded-lg hover:bg-surface-container transition-colors flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px]">edit</span>Edit
                </button>
              ) : (
                <div className="flex gap-1">
                  <button onClick={() => setAvailEdit(false)}
                    className="h-8 px-2 border border-outline-variant text-on-surface-variant font-label-sm text-[12px] rounded-lg hover:bg-surface-container transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleAvailSave} disabled={availSaving}
                    className="h-8 px-3 bg-primary text-on-primary font-label-sm text-[12px] rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50">
                    {availSaving ? '...' : 'Save'}
                  </button>
                </div>
              )}
            </div>

            {availEdit ? (
              <div className="space-y-3">
                <p className="text-[12px] text-on-surface-variant">Click slots to toggle availability. No admin approval needed.</p>
                {DAY_ORDER.map(day => (
                  <div key={day}>
                    <p className="font-label-sm text-[12px] font-bold text-on-surface mb-1.5">{day}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {TIME_SLOTS.map(slot => {
                        const active = (availData[day] || []).includes(slot)
                        return (
                          <button key={slot} type="button"
                            onClick={() => toggleSlot(day, slot)}
                            className={`text-[11px] font-semibold px-2 py-1 rounded-md border transition-all ${active ? 'bg-primary text-on-primary border-primary' : 'bg-white text-on-surface-variant border-outline-variant/40 hover:border-primary/40'}`}>
                            {slot}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {DAY_ORDER.map(day => {
                  const slots = (profile?.availability || {})[day] || []
                  return (
                    <div key={day} className={`rounded-xl p-3 border ${slots.length > 0 ? 'bg-white border-outline-variant/20' : 'bg-surface-container-low/40 border-dashed border-outline-variant/30 opacity-60'}`}>
                      <p className={`font-label-md text-[12px] font-bold mb-1.5 ${slots.length > 0 ? 'text-on-surface' : 'text-outline'}`}>{day}</p>
                      {slots.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {slots.map(s => (
                            <span key={s} className="text-[10px] font-semibold px-2 py-0.5 rounded border text-primary border-primary/20" style={{ background: 'rgba(0,40,142,0.06)' }}>{s}</span>
                          ))}
                        </div>
                      ) : <span className="text-[11px] text-outline italic">Unavailable</span>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Verification status */}
          <div className={`rounded-2xl p-5 border ${statusConfig.box}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`material-symbols-outlined icon-fill text-[22px] ${statusConfig.iconColor}`}>
                {statusConfig.icon}
              </span>
              <h4 className={`font-label-md font-bold ${statusConfig.titleColor}`}>
                {statusConfig.title}
              </h4>
            </div>
            <p className={`text-[12px] leading-relaxed ${statusConfig.textColor}`}>
              {statusConfig.text}
            </p>
          </div>
        </div>
      </div>

      {/* Ă¢â€â‚¬Ă¢â€â‚¬ Add Credential Modal Ă¢â€â‚¬Ă¢â€â‚¬ */}
      <div className="bg-white/80 backdrop-blur-md border border-primary/15 shadow-sm rounded-2xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h4 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">approval_delegation</span>
            Nop ho so cho admin
          </h4>
          <p className="text-[13px] text-on-surface-variant mt-1">
            Sau khi luu day du CV, bang cap, chung chi, kinh nghiem va lich day, bam nut nay de admin duyet ho so.
          </p>
          <div className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[12px] font-semibold ${submitStatus.classes}`}>
            <span className="material-symbols-outlined icon-fill text-[15px]">{submitStatus.icon}</span>
            {submitStatus.text}
          </div>
          {submitError && <p className="mt-2 text-[12px] text-red-600">{submitError}</p>}
        </div>
        <button
          type="button"
          onClick={handleSubmitProfile}
          disabled={submitLoading || isPending}
          className="h-11 px-5 bg-primary text-on-primary rounded-xl font-label-md text-label-md hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">{isPending ? 'hourglass_top' : 'send'}</span>
          {submitLoading ? 'Dang nop...' : submitButtonText}
        </button>
      </div>

      {credModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4">
            <h3 className="font-headline-md text-headline-md text-on-surface capitalize">
              Add {credModal}
            </h3>

            {credError && (
              <p className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">error</span>{credError}
              </p>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-[12px] font-semibold text-on-surface mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  className="w-full h-10 px-3 border border-outline-variant rounded-xl text-[14px] outline-none focus:border-primary"
                  placeholder={credModal === 'education' ? 'e.g. Ph.D. in Mathematics - Stanford University (2020)' : credModal === 'certificate' ? 'e.g. AWS Certified Solutions Architect' : 'e.g. Senior Math Teacher at ABC School (2019-2023)'}
                  value={credForm.title}
                  onChange={e => setCredForm(f => ({ ...f, title: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-on-surface mb-1">Description (optional)</label>
                <textarea
                  rows={2}
                  className="w-full px-3 py-2 border border-outline-variant rounded-xl text-[14px] outline-none focus:border-primary resize-none"
                  placeholder="Additional details..."
                  value={credForm.description}
                  onChange={e => setCredForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>

              {credModal !== 'experience' && (
                <div>
                  <label className="block text-[12px] font-semibold text-on-surface mb-1">
                    Anh / File minh chung <span className="text-red-500">*</span>
                  </label>
                  <ProofUploader
                    value={credForm.proof_url}
                    onChange={url => setCredForm(f => ({ ...f, proof_url: url }))}
                    folder={credModal === 'education' ? 'education' : 'certificates'}
                    disabled={credSaving}
                  />
                  <p className="mt-1 text-[11px] text-on-surface-variant flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">info</span>
                    Admin se xem anh nay de xac minh thong tin cua ban.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={() => { setCredModal(null); setCredError('') }}
                className="flex-1 h-10 border border-outline-variant text-on-surface-variant font-label-md rounded-xl hover:bg-surface-container transition-colors">
                Cancel
              </button>
              <button onClick={handleAddCredential} disabled={credSaving}
                className="flex-1 h-10 bg-primary text-on-primary font-label-md rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-1">
                {credSaving ? 'Saving...' : <><span className="material-symbols-outlined text-[16px]">add_circle</span>Save to Profile</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CvInput({ label, value, onChange, placeholder = '', type = 'text' }) {
  return (
    <label className="block">
      <span className="block text-[12px] font-semibold text-on-surface mb-1">{label}</span>
      <input
        type={type}
        className="w-full h-10 px-3 border border-outline-variant rounded-xl text-[14px] text-on-surface outline-none focus:border-primary"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </label>
  )
}

function CvTextarea({ label, value, onChange, placeholder = '', rows = 3 }) {
  return (
    <label className="block">
      <span className="block text-[12px] font-semibold text-on-surface mb-1">{label}</span>
      <textarea
        rows={rows}
        className="w-full px-3 py-2 border border-outline-variant rounded-xl text-[14px] text-on-surface outline-none focus:border-primary resize-y"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </label>
  )
}

function InfoItem({ label, value }) {
  return (
    <div className="rounded-xl border border-outline-variant/20 bg-white/70 p-3">
      <p className="text-[11px] font-bold uppercase text-outline mb-1">{label}</p>
      <p className="text-[13px] text-on-surface-variant whitespace-pre-wrap">{value || 'Chua cap nhat'}</p>
    </div>
  )
}

// Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬ Credential Section sub-component Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬
function CredentialSection({ title, icon, items, type, onAdd, onDelete, noProof }) {
  const iconMap = { education: 'menu_book', certificate: 'workspace_premium', experience: 'history_edu' }
  const colorMap = { education: '#1d9bf0', certificate: '#16a34a', experience: '#7c3aed' }
  const bgMap   = { education: '#eff6ff', certificate: '#f0fdf4', experience: '#faf5ff' }
  const borderMap = { education: '#bfdbfe', certificate: '#bbf7d0', experience: '#ddd6fe' }

  return (
    <div className="bg-white/70 backdrop-blur-md border border-white/30 shadow-sm rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">{icon}</span>
          {title}
        </h4>
        <button onClick={onAdd}
          className="h-8 px-3 bg-primary text-on-primary font-label-sm text-[12px] rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-1 shadow-sm">
          <span className="material-symbols-outlined text-[15px]">add</span>Add
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-[13px] text-outline italic text-center py-4">No {type} added yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id}
              style={{ background: bgMap[type], borderColor: borderMap[type] }}
              className="rounded-xl border p-4 flex items-start gap-3">
              <span className="material-symbols-outlined text-[20px] flex-shrink-0 mt-0.5"
                style={{ color: colorMap[type] }}>
                {iconMap[type]}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <p className="font-label-md text-[14px] text-on-surface font-semibold">{item.title}</p>
                </div>
                {item.description && (
                  <p className="text-[12px] text-on-surface-variant mt-0.5">{item.description}</p>
                )}
                {item.proof_url && !noProof && (
                  <a href={item.proof_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline mt-1">
                    <span className="material-symbols-outlined text-[13px]">attachment</span>View proof
                  </a>
                )}
              </div>
              <button onClick={() => onDelete(item.id, item.status)}
                className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-outline hover:text-red-500 hover:bg-red-50 transition-colors">
                <span className="material-symbols-outlined text-[17px]">delete</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


