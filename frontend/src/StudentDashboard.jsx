/**
 * StudentDashboard.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Dashboard dành cho học sinh (role: student / parent / tutor).
 * Hiện thị: khóa học đang học, bài tập, giờ học, gia sư hiện tại.
 */
import { useState, useEffect, useRef } from 'react'
import { useAuth } from './AuthContext'
import AssessmentsWrapper from './components/AssessmentsWrapper'
import MyComplaints from './pages/MyComplaints'
import PracticeMode from './PracticeMode'
import MessagesSection from './components/MessagesSection'
import WalletWidget from './components/WalletWidget'
import NotificationDropdown from './components/NotificationDropdown'
import MessageIcon from './components/MessageIcon'
import SchedulePage from './components/SchedulePage'
import { getStudentBookings, confirmLessonComplete, reportTutor } from './services/api'

import StudentSidebar from './components/StudentSidebar'
import { API_BASE_URL } from './config';

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

  // ── Dữ liệu thật cho Dashboard Home (khóa học, giờ học, bài tập, hoạt động gần đây) ──
  const [dashboardCourses, setDashboardCourses] = useState([])
  const [courseStats, setCourseStats] = useState({ totalCourses: 0, completedCourses: 0, inProgressCourses: 0 })
  const [scheduleSummary, setScheduleSummary] = useState(null)
  const [scheduleSessions, setScheduleSessions] = useState([])
  const [examPapers, setExamPapers] = useState([])
  const [recentNotifications, setRecentNotifications] = useState([])
  const [dashboardLoading, setDashboardLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    const API = API_BASE_URL
    const authHeader = { Authorization: `Bearer ${token}` }
    Promise.all([
      fetch(`${API}/api/student/my-courses`, { headers: authHeader }).then(r => r.json()).catch(() => null),
      fetch(`${API}/api/student/schedule`, { headers: authHeader }).then(r => r.json()).catch(() => null),
      fetch(`${API}/api/exam-papers`, { headers: authHeader }).then(r => r.json()).catch(() => null),
      fetch(`${API}/api/notifications`, { headers: authHeader }).then(r => r.json()).catch(() => null),
    ]).then(([coursesRes, scheduleRes, examRes, notifRes]) => {
      if (coursesRes?.success) {
        setDashboardCourses(coursesRes.data.courses || [])
        setCourseStats(coursesRes.data.stats || { totalCourses: 0, completedCourses: 0, inProgressCourses: 0 })
      }
      if (scheduleRes?.success) {
        setScheduleSummary(scheduleRes.data.summary || null)
        setScheduleSessions(scheduleRes.data.sessions || [])
      }
      if (Array.isArray(examRes?.papers)) setExamPapers(examRes.papers)
      if (Array.isArray(notifRes?.notifications)) setRecentNotifications(notifRes.notifications)
    }).finally(() => setDashboardLoading(false))
  }, [token])

  // Gia sư hiện tại: gộp từ khóa học đã đăng ký VÀ từ lịch đặt 1-kèm-1 (bookings), bỏ trùng theo tutor_id.
  // Chỉ lấy tutor_id/tutor_name từ courses/bookings — không có thì bỏ qua học sinh chưa gắn gia sư nào.
  const myTutors = Object.values(
    [
      ...dashboardCourses.map(c => ({ tutor_id: c.tutor_id, name: c.tutor_name, subject: c.subject, avatar: c.tutor_avatar })),
      ...scheduleSessions.map(s => ({ tutor_id: s.tutor_id, name: s.tutor_name, subject: s.subject, avatar: null })),
    ].reduce((acc, t) => {
      if (!t.tutor_id) return acc
      if (!acc[t.tutor_id]) {
        acc[t.tutor_id] = { id: t.tutor_id, name: t.name || 'Gia sư', subject: t.subject || '', avatar: t.avatar }
      } else if (!acc[t.tutor_id].avatar && t.avatar) {
        acc[t.tutor_id].avatar = t.avatar
      }
      return acc
    }, {})
  )

  // Bài tập/đề thi chưa hoàn thành: attempt_status null (chưa làm) hoặc in_progress (làm dở)
  const allPendingExamPapers = examPapers.filter(p => !p.attempt_status || p.attempt_status === 'in_progress')
  const pendingExamPapers = allPendingExamPapers.slice(0, 5)

  // Giờ học tuần này (Thứ 2 → Chủ nhật hiện tại), tính từ chính các session đã hoàn thành
  const weeklyHoursStudied = (() => {
    const now = new Date()
    const day = now.getDay()
    const monday = new Date(now); monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1)); monday.setHours(0, 0, 0, 0)
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6); sunday.setHours(23, 59, 59, 999)
    const hours = scheduleSessions
      .filter(s => s.status === 'completed' && new Date(s.start_time) >= monday && new Date(s.start_time) <= sunday)
      .reduce((sum, s) => sum + (new Date(s.end_time) - new Date(s.start_time)) / 3600000, 0)
    return Math.round(hours * 10) / 10
  })()

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
                placeholder="Tìm kiếm khóa học... (nhấn Enter)"
                type="text"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const q = e.currentTarget.value.trim()
                    // CourseMarketplace tự đọc từ khóa qua ?q= trên hash và lọc sẵn.
                    window.location.hash = q ? `#/courses?q=${encodeURIComponent(q)}` : '#/courses'
                  }
                }}
              />
            </div>

            <div className="flex items-center gap-sm lg:gap-md">
              {/* Messages & Notifications */}
              <MessageIcon token={token} />
              <NotificationDropdown token={token} />

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

            {/* ── Complaints Section ── */}
            {activeSection === 'complaints' && (
              <MyComplaints token={token} />
            )}

            {/* ── Assessments Section (Gộp Bài tập & Đề thi) ── */}
            {activeSection === 'assessments' && (
              <AssessmentsWrapper token={token} />
            )}


            {/* ── AI Practice Section ── */}
            {activeSection === 'practice' && (
              <PracticeMode token={token} />
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
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">

                {/* ── Left column ── */}
                <div className="lg:col-span-8 flex flex-col gap-gutter">

                  {/* ── Welcome Hero ── */}
                  <div className="relative overflow-hidden rounded-xl bg-surface-container-lowest/70 backdrop-blur-md border border-surface-container-lowest/30 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] p-lg flex flex-col md:flex-row items-center gap-lg">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
                    <div className="flex-1 z-10">
                      {scheduleSummary && (
                        <div className="flex items-center gap-sm mb-xs flex-wrap">
                          <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded uppercase tracking-wider">
                            {scheduleSummary.weekly_completed}/{scheduleSummary.weekly_total} Buổi Tuần Này
                          </span>
                          <span className="font-label-sm text-label-sm text-on-surface-variant">• {weeklyHoursStudied}/{scheduleSummary.weekly_goal_hours}h Mục Tiêu Tuần</span>
                        </div>
                      )}
                      <h2 className="font-headline-lg text-headline-lg text-on-surface mb-xs">
                        Chào mừng trở lại, {displayName} 👋
                      </h2>
                      <p className="font-body-md text-body-md text-on-surface-variant mb-md max-w-md">
                        {scheduleSummary
                          ? `Bạn đã hoàn thành ${scheduleSummary.weekly_completed} buổi học trong tuần này. Tiếp tục duy trì để đạt mục tiêu.`
                          : 'Đây là tổng quan học tập của bạn hôm nay.'}
                      </p>
                      <div className="flex flex-wrap gap-sm">
                        <a
                          href="#/dashboard/courses"
                          className="h-11 px-lg flex items-center bg-primary text-on-primary font-label-md text-label-md rounded-lg hover:bg-surface-tint transition-all shadow-md hover:-translate-y-0.5 duration-200"
                        >
                          Tiếp Tục Học
                        </a>
                        <a
                          href="#/dashboard/schedule"
                          className="h-11 px-lg flex items-center bg-surface-container-lowest border border-outline-variant/50 text-on-surface font-label-md text-label-md rounded-lg hover:bg-surface-container-low transition-all hover:-translate-y-0.5 duration-200"
                        >
                          Xem Lịch Học
                        </a>
                      </div>
                    </div>
                    {user?.picture && (
                      <div className="w-40 h-40 flex-shrink-0 z-10 hidden md:block">
                        <img
                          src={user.picture}
                          alt={displayName}
                          className="w-full h-full object-cover rounded-full border-4 border-surface shadow-md"
                        />
                      </div>
                    )}
                  </div>

                  {/* ── Stats Grid ── */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-md lg:gap-gutter">
                    <StatCard
                      icon="library_books"
                      label="Khóa Học Đang Học"
                      value={dashboardLoading ? '—' : String(courseStats.totalCourses)}
                    />
                    <StatCard
                      icon="assignment_late"
                      label="Bài Tập Chưa Hoàn Thành"
                      value={dashboardLoading ? '—' : String(allPendingExamPapers.length)}
                    />
                    <StatCard
                      icon="timer"
                      label="Số Giờ Đã Học"
                      value={dashboardLoading ? '—' : <>{scheduleSummary?.learning_hours ?? 0}<span className="font-headline-md text-headline-md text-on-surface-variant">giờ</span></>}
                    />
                  </div>

                  {/* ── Active Courses ── */}
                  <div>
                    <div className="flex justify-between items-center mb-md">
                      <h3 className="font-headline-md text-headline-md text-on-surface">Khóa Học Đang Học</h3>
                      <a
                        href="#/courses"
                        className="font-label-md text-label-md text-primary hover:text-surface-tint rounded px-2 py-1 transition-colors"
                      >
                        Xem Tất Cả
                      </a>
                    </div>
                    {dashboardCourses.length === 0 ? (
                      <div className="bg-surface-container-lowest/70 border border-surface-container-lowest/30 rounded-xl p-lg text-center text-on-surface-variant font-body-md text-body-md">
                        {dashboardLoading ? 'Đang tải khóa học...' : 'Bạn chưa đăng ký khóa học nào.'}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                        {dashboardCourses.map((course) => (
                          <CourseCard key={course.enrollment_id} course={course} />
                        ))}
                      </div>
                    )}
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
                      {myTutors.map((tutor) => (
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

                  {/* ── Pending Assignments ── */}
                  <div className="bg-surface-container-lowest/70 backdrop-blur-md border border-surface-container-lowest/30 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] rounded-xl p-lg">
                    <div className="flex justify-between items-center mb-md">
                      <h3 className="font-headline-md text-headline-md text-on-surface">Bài Tập Chưa Hoàn Thành</h3>
                      <a
                        href="#/dashboard/assessments"
                        className="font-label-md text-label-md text-primary hover:text-surface-tint rounded px-2 py-1 transition-colors"
                      >
                        Xem Tất Cả
                      </a>
                    </div>
                    {pendingExamPapers.length === 0 ? (
                      <p className="text-center text-on-surface-variant font-body-md text-body-md py-md">
                        {dashboardLoading ? 'Đang tải bài tập...' : 'Bạn đã hoàn thành hết bài tập/đề thi.'}
                      </p>
                    ) : (
                      <div className="flex flex-col gap-sm">
                        {pendingExamPapers.map((a) => (
                          <a
                            key={a.id}
                            href="#/dashboard/assessments"
                            className="flex items-center justify-between p-md rounded-lg border border-outline-variant/30 hover:bg-surface-container-lowest transition-colors group cursor-pointer"
                          >
                            <div className="flex items-center gap-md">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${a.attempt_status === 'in_progress' ? 'bg-surface-tint/10 text-surface-tint' : 'bg-error-container/20 text-error'}`}>
                                <span className="material-symbols-outlined">quiz</span>
                              </div>
                              <div>
                                <h4 className="font-body-md text-body-md font-bold group-hover:text-primary transition-colors">{a.title}</h4>
                                <p className="font-label-sm text-label-sm text-on-surface-variant">{a.subject}{a.grade ? ` • Lớp ${a.grade}` : ''}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-md">
                              <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${a.attempt_status === 'in_progress' ? 'bg-surface-variant text-on-surface-variant' : 'bg-error-container text-on-error-container'}`}>
                                {a.attempt_status === 'in_progress' ? 'Đang Làm Dở' : 'Chưa Làm'}
                              </span>
                              {a.duration_minutes && (
                                <span className="font-label-sm text-label-sm text-on-surface-variant">{a.duration_minutes} phút</span>
                              )}
                            </div>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                </div>

                {/* ── Right column: widgets ── */}
                <div className="lg:col-span-4 flex flex-col gap-gutter">

                  {/* ── AI Assistant widget ── */}
                  <div className="bg-primary text-on-primary rounded-xl p-lg shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl translate-x-1/2 -translate-y-1/2" />
                    <div className="relative z-10">
                      <div className="flex items-center gap-sm mb-md">
                        <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-md">
                          <span className="material-symbols-outlined text-[24px]">psychology_alt</span>
                        </div>
                        <h3 className="font-headline-md text-headline-md font-bold">Trợ Lý EduAI</h3>
                      </div>
                      <p className="font-label-md text-label-md text-on-primary/80 mb-md">
                        Cần hỗ trợ học tập? Mình có thể giải thích khái niệm hoặc tóm tắt bài học.
                      </p>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => window.dispatchEvent(new CustomEvent('navigate-section', { detail: 'practice' }))}
                          className="w-full h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center px-md transition-colors font-label-md font-bold"
                        >
                          Đặt Câu Hỏi
                        </button>
                        <button
                          onClick={() => window.dispatchEvent(new CustomEvent('navigate-section', { detail: 'assessments' }))}
                          className="w-full h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center px-md transition-colors font-label-md font-bold"
                        >
                          Xem Bài Tập
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ── Learning Goals widget ── */}
                  <div className="bg-surface-container-lowest/70 backdrop-blur-md border border-surface-container-lowest/30 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] rounded-xl p-lg">
                    <h3 className="font-label-md text-label-md font-bold mb-md uppercase tracking-widest text-on-surface-variant">Mục Tiêu Học Tập</h3>
                    <div className="flex flex-col gap-md">
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between font-label-sm text-label-sm">
                          <span>Giờ Học Trong Tuần</span>
                          <span className="font-bold">{weeklyHoursStudied}/{scheduleSummary?.weekly_goal_hours ?? 10}h</span>
                        </div>
                        <div className="w-full bg-surface-container rounded-full h-1.5">
                          <div
                            className="bg-primary h-1.5 rounded-full"
                            style={{ width: `${Math.min(100, Math.round((weeklyHoursStudied / (scheduleSummary?.weekly_goal_hours || 10)) * 100))}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between font-label-sm text-label-sm">
                          <span>Hoàn Thành Khóa Học</span>
                          <span className="font-bold">{courseStats.completedCourses}/{courseStats.totalCourses}</span>
                        </div>
                        <div className="w-full bg-surface-container rounded-full h-1.5">
                          <div
                            className="bg-tertiary h-1.5 rounded-full"
                            style={{ width: `${courseStats.totalCourses ? Math.round((courseStats.completedCourses / courseStats.totalCourses) * 100) : 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Recent Activity widget ── */}
                  <div className="bg-surface-container-lowest/70 backdrop-blur-md border border-surface-container-lowest/30 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] rounded-xl p-lg flex-1">
                    <h3 className="font-headline-md text-headline-md font-bold mb-md">Hoạt Động Gần Đây</h3>
                    {recentNotifications.length === 0 ? (
                      <p className="text-center text-on-surface-variant font-body-md text-body-md py-md">
                        {dashboardLoading ? 'Đang tải...' : 'Chưa có hoạt động nào gần đây.'}
                      </p>
                    ) : (
                      <div className="relative border-l border-outline-variant/30 ml-2 py-1 flex flex-col gap-md">
                        {recentNotifications.slice(0, 5).map((item) => (
                          <div key={item.id} className="relative pl-md">
                            <div className="absolute left-[-4.5px] top-1.5 w-2 h-2 rounded-full bg-primary" />
                            <p className="text-[11px] text-on-surface-variant mb-0.5">
                              {new Date(item.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <p className="font-label-md text-label-md font-bold">{item.title}</p>
                            <p className="text-[11px] text-on-surface-variant line-clamp-2">{item.body}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
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

// ─── Course Card component ──────────────────────────────────────────────────────
function CourseCard({ course }) {
  const progress = course.progress_percent || 0
  return (
    <div className="bg-surface-container-lowest/70 backdrop-blur-md border border-surface-container-lowest/30 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] rounded-xl p-md flex flex-col gap-md hover:-translate-y-1 transition-transform duration-300 group">
      <div className="h-36 rounded-lg bg-surface-container-highest overflow-hidden relative flex items-center justify-center">
        {course.thumbnail_url ? (
          <img
            src={course.thumbnail_url}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <span className="material-symbols-outlined text-[40px] text-on-surface-variant/40">school</span>
        )}
      </div>
      <div>
        <h4 className="font-body-lg text-body-lg font-bold mb-0.5">{course.title}</h4>
        <p className="font-label-sm text-label-sm text-on-surface-variant mb-md">{course.tutor_name || 'Gia sư'}</p>
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[11px] font-bold text-primary">{progress}% Hoàn Thành</span>
          <span className="text-[11px] text-on-surface-variant">{course.completed_lessons}/{course.total_lessons} Bài</span>
        </div>
        <div className="w-full bg-surface-container-high rounded-full h-1.5 mb-md">
          <div className="bg-primary h-1.5 rounded-full" style={{ width: `${progress}%` }} />
        </div>
        <a
          href={`#/course/${course.course_id}`}
          className="w-full h-10 flex items-center justify-center bg-surface-container-low border border-outline-variant/30 text-on-surface font-label-md text-label-md rounded-lg hover:bg-surface-container-high transition-all"
        >
          Tiếp Tục
        </a>
      </div>
    </div>
  )
}

// ─── Tutor Card component ──────────────────────────────────────────────────────
function TutorCard({ tutor }) {
  return (
    <div className="bg-surface-container-lowest/70 backdrop-blur-md border border-surface-container-lowest/30 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] rounded-xl p-md flex flex-col items-center text-center hover:shadow-md transition-shadow duration-300">
      <a href={`#/tutor-detail/${tutor.id}`} className="flex flex-col items-center w-full">
        {tutor.avatar ? (
          <img
            src={tutor.avatar}
            alt={tutor.name}
            className="w-20 h-20 rounded-full object-cover mb-sm border-2 border-surface bg-surface-container-lowest shadow-sm"
            loading="lazy"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-sm border-2 border-surface shadow-sm text-headline-md font-bold">
            {(tutor.name || '?').charAt(0).toUpperCase()}
          </div>
        )}
        <h4 className="font-label-md text-label-md text-on-surface mb-xs hover:text-primary transition-colors">{tutor.name}</h4>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm mb-md">
          {tutor.subject}
        </span>
      </a>
      <div className="w-full flex flex-col gap-2">
        <a
          href={`#/tutor-detail/${tutor.id}`}
          className="w-full h-10 flex items-center justify-center bg-primary/10 text-primary font-label-sm text-label-sm rounded-lg hover:bg-primary/20 transition-colors"
        >
          Xem Hồ Sơ
        </a>
        <button className="w-full h-10 border border-outline-variant text-on-surface font-label-sm text-label-sm rounded-lg hover:bg-surface-container hover:text-primary transition-colors">
          Nhắn Tin
        </button>
      </div>
    </div>
  )
}

// ─── Parent Link Section ──────────────────────────────────────────────────────
function ParentLinkSection({ token }) {
  const [code, setCode] = useState(null)
  const [parents, setParents] = useState([])
  const [loading, setLoading] = useState(true)

  const [errorMsg, setErrorMsg] = useState(null)

  useEffect(() => {
    // Lấy mã chia sẻ
    fetch(`${API_BASE_URL}/api/student/link-code`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => {
        if (!r.ok) throw new Error('API error')
        return r.json()
      })
      .then(d => {
        if (d.code) setCode(d.code)
      })
      .catch(e => {
        console.error('Failed to load link code:', e)
        setErrorMsg('Không thể tải mã. Có thể server chưa cập nhật (Hãy khởi động lại backend).')
      })

    // Lấy danh sách phụ huynh
    fetch(`${API_BASE_URL}/api/student/parents`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => {
        if (!r.ok) throw new Error('API error')
        return r.json()
      })
      .then(d => { setParents(d.parents || []); setLoading(false) })
      .catch(e => {
        console.error('Failed to load parents:', e)
        setLoading(false)
      })
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
            {errorMsg ? (
              <div className="text-error font-medium">{errorMsg}</div>
            ) : (
              <>
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest text-on-surface-variant mb-1">Mã của bạn</p>
                  <p className="font-mono text-3xl font-black text-primary tracking-[0.2em]">{code || '--------'}</p>
                </div>
                <button 
                  onClick={() => {
                    if(!code) return;
                    navigator.clipboard.writeText(code)
                    alert('Đã sao chép mã!')
                  }}
                  className="w-12 h-12 flex items-center justify-center bg-primary/10 text-primary hover:bg-primary/20 rounded-xl transition-colors disabled:opacity-50"
                  disabled={!code}
                  title="Sao chép"
                >
                  <span className="material-symbols-outlined text-[24px]">content_copy</span>
                </button>
              </>
            )}
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
