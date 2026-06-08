/**
 * StudentDashboard.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Dashboard dành cho học sinh (role: student / parent / tutor).
 * Hiện thị: khóa học đang học, bài tập, giờ học, gia sư hiện tại.
 */
import { useState } from 'react'
import { useAuth } from './AuthContext'

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

  // Lấy tên hiển thị: ưu tiên name, rồi email
  const displayName = user?.name || user?.email?.split('@')[0] || 'Student'
  // Lấy chữ cái đầu để làm avatar fallback
  const initials = displayName.charAt(0).toUpperCase()

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
          {NAV_ITEMS.map((item) => (
            <li key={item.label}>
              <a
                href="#"
                className={`
                  flex items-center gap-sm px-md py-sm rounded-lg
                  transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
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
            </li>
          ))}
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
                {MY_TUTORS.map((tutor) => (
                  <TutorCard key={tutor.id} tutor={tutor} />
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
        Message
      </button>
    </div>
  )
}
