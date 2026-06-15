import React from 'react'

const NAV_ITEMS = [
  { icon: 'dashboard', label: 'Dashboard', href: '#/dashboard', id: 'dashboard' },
  { icon: 'school', label: 'My Courses', href: '#/my-courses', id: 'my-courses' },
  { icon: 'calendar_today', label: 'Schedule', href: '#', id: 'schedule' },
  { icon: 'chat', label: 'Messages', href: '#', id: 'messages' },
]

export default function StudentSidebar({ sidebarOpen, setSidebarOpen, activeRoute, logout }) {
  return (
    <>
      {/* ── Mobile overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-[50] bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen && setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
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
            href="#"
            className="text-on-surface-variant flex items-center gap-sm px-md py-sm hover:bg-surface-container-high rounded-lg transition-all duration-200"
          >
            <span className="material-symbols-outlined">settings</span>
            <span className="font-label-md text-label-md">Settings</span>
          </a>
          <a
            href="#"
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
