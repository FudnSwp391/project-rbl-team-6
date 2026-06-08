/**
 * ParentDashboard.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Dashboard dành cho phụ huynh (role: parent).
 * Hiển thị: tiến độ học của con, thanh toán sắp tới, phản hồi từ gia sư.
 */
import { useState } from 'react'
import { useAuth } from './AuthContext'

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
  { icon: 'dashboard', label: 'Overview', active: true },
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
          {NAV_ITEMS.map((item) => (
            <a
              key={item.label}
              href="#"
              className={`
                flex items-center gap-sm px-sm py-sm rounded-lg
                transition-colors duration-200
                ${
                  item.active
                    ? 'text-primary font-bold border-r-4 border-primary bg-primary/5'
                    : 'text-on-secondary-fixed-variant hover:bg-secondary-container'
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
              Here's what's happening with your children today.
            </p>
          </div>

          {/* ── Bento Grid ── */}
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
