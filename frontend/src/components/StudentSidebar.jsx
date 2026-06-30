import React from 'react'

const NAV_ITEMS = [
  { icon: 'dashboard', label: 'Dashboard', href: '#/dashboard', id: 'dashboard' },
  { icon: 'school', label: 'My Courses', href: '#/my-courses', id: 'my-courses' },
  { icon: 'calendar_today', label: 'Schedule', href: '#/dashboard/schedule', id: 'schedule' },
  { icon: 'chat', label: 'Messages', href: '#/dashboard/messages', id: 'messages' },
  { icon: 'quiz', label: 'Assessments', href: '#/dashboard/assessments', id: 'assessments' },
  { icon: 'psychology', label: 'AI Practice', href: '#/dashboard/practice', id: 'practice' },
  { icon: 'description', label: 'Äá» thi', href: '#/dashboard/exam-papers', id: 'exam-papers' },
  { icon: 'person', label: 'Há»“ sÆ¡ cÃ¡ nhÃ¢n', href: '#/dashboard/profile', id: 'profile' },
  { icon: 'family_restroom', label: 'MÃ£ chia sáº»', href: '#/dashboard/parent-link', id: 'parent-link' },
]

export default function StudentSidebar({ sidebarOpen, setSidebarOpen, activeRoute, logout }) {
  return (
    <>
      {/* â”€â”€ Mobile overlay â”€â”€ */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-[50] bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen && setSidebarOpen(false)}
        />
      )}

      {/* â”€â”€ Sidebar â”€â”€ */}
      <nav
        className={`
          fixed left-0 top-0 h-full z-[60] flex flex-col py-lg w-64
          bg-surface-container-low border-r border-outline-variant/20 shadow-sm
          transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        {/* Logo */}
        <div className="px-md mb-xl flex items-center gap-sm">
          <a href="#/" className="flex items-center gap-sm hover:opacity-80 transition-opacity no-underline">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary shrink-0">
              <span className="material-symbols-outlined text-[20px]">school</span>
            </div>
            <div>
              <h1 className="font-headline-md text-headline-md font-black text-primary leading-tight m-0">
                EduX
              </h1>
              <p className="font-label-sm text-label-sm text-on-surface-variant m-0">Student Portal</p>
            </div>
          </a>
        </div>

        {/* Nav items */}
        <ul className="flex-1 flex flex-col gap-xs px-sm">
          {NAV_ITEMS.map((item) => {
            const isActive = activeRoute === item.id
            return (
              <li key={item.id}>
                <a
                  href={item.href}
                  className={`
                    flex items-center gap-sm px-md py-sm rounded-lg
                    transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
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
              </li>
            )
          })}
        </ul>

        {/* Bottom actions */}
        <div className="px-sm mt-auto flex flex-col gap-xs">
          <a
            href="#" onClick={(e) => e.preventDefault()}
            className="text-on-surface-variant flex items-center gap-sm px-md py-sm hover:bg-surface-container-high rounded-lg transition-all duration-200"
          >
            <span className="material-symbols-outlined">settings</span>
            <span className="font-label-md text-label-md">Settings</span>
          </a>
          <a
            href="#" onClick={(e) => e.preventDefault()}
            className="text-on-surface-variant flex items-center gap-sm px-md py-sm hover:bg-surface-container-high rounded-lg transition-all duration-200"
            onClick={(e) => { e.preventDefault(); logout && logout() }}
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
    </>
  )
}

