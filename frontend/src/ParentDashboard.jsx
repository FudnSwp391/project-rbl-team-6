/**
 * ParentDashboard.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Dashboard phụ huynh — dữ liệu thật từ API.
 * Sections: Tổng quan | Học sinh | Gia sư | Lịch sử hoạt động | Tài chính | Cài đặt
 */
import { useState, useEffect, useRef } from 'react'
import { useAuth } from './AuthContext'
import MessagesSection from './components/MessagesSection'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

const NAV = [
  { key: 'overview',  icon: 'dashboard',       label: 'Tổng quan' },
  { key: 'students',  icon: 'group',            label: 'Học sinh' },
  { key: 'tutors',    icon: 'school',           label: 'Gia sư' },
  { key: 'messages',  icon: 'chat',             label: 'Tin nhắn' },
  { key: 'activity',  icon: 'analytics',        label: 'Hoạt động' },
  { key: 'finance',   icon: 'account_balance_wallet', label: 'Tài chính' },
  { key: 'settings',  icon: 'settings',         label: 'Cài đặt' },
]

// ─── helpers ──────────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function fmtTime(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}
function scoreColor(s) {
  if (s === null || s === undefined) return 'text-on-surface-variant'
  if (s >= 80) return 'text-green-600'
  if (s >= 60) return 'text-amber-600'
  return 'text-red-500'
}
function scoreBg(s) {
  if (s === null || s === undefined) return 'bg-surface-container'
  if (s >= 80) return 'bg-green-50 border-green-200'
  if (s >= 60) return 'bg-amber-50 border-amber-200'
  return 'bg-red-50 border-red-200'
}
function Avatar({ src, name, size = 10 }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  if (src) return <img src={src} alt={name} className={`w-${size} h-${size} rounded-full object-cover border border-outline-variant/30 shrink-0`} />
  return (
    <div className={`w-${size} h-${size} rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm shrink-0`}>
      {initials}
    </div>
  )
}
function TypeBadge({ type }) {
  const map = {
    quiz:     { label: 'Bài Kiểm Tra', cls: 'bg-blue-100 text-blue-700',   icon: 'quiz' },
    practice: { label: 'Luyện tập',  cls: 'bg-purple-100 text-purple-700', icon: 'psychology' },
    exam:     { label: 'Đề thi',     cls: 'bg-orange-100 text-orange-700', icon: 'description' },
  }
  const m = map[type] || map.quiz
  return (
    <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium ${m.cls}`}>
      <span className="material-symbols-outlined text-[12px]">{m.icon}</span>
      {m.label}
    </span>
  )
}

// ─── Notification Dropdown ─────────────────────────────────────────────────────
const MOCK_NOTIFICATIONS = [
  { id: 1, type: 'payment', icon: 'payments',       color: 'text-red-500',    bg: 'bg-red-50',    title: 'Nhắc đóng học phí', body: 'Học phí tháng 7 của Bé Minh chưa được thanh toán.', time: '2 giờ trước', unread: true },
  { id: 2, type: 'tutor',   icon: 'event_busy',     color: 'text-amber-600',  bg: 'bg-amber-50',  title: 'Gia sư báo nghỉ',   body: 'Thầy Nguyễn Văn A báo nghỉ buổi học Toán ngày 18/7.', time: '5 giờ trước', unread: true },
  { id: 3, type: 'result',  icon: 'grading',        color: 'text-blue-600',   bg: 'bg-blue-50',   title: 'Kết quả bài kiểm tra mới', body: 'Bé Lan vừa hoàn thành bài Ngữ văn lớp 11 — 82%.', time: 'Hôm qua', unread: true },
  { id: 4, type: 'payment', icon: 'check_circle',   color: 'text-green-600',  bg: 'bg-green-50',  title: 'Thanh toán thành công', body: 'Hóa đơn #INV-0023 đã được xác nhận.', time: '2 ngày trước', unread: false },
  { id: 5, type: 'result',  icon: 'psychology',     color: 'text-purple-600', bg: 'bg-purple-50', title: 'Báo cáo luyện tập AI', body: 'Bé Minh đã hoàn thành 5 phiên luyện tập tuần này.', time: '3 ngày trước', unread: false },
]

function NotificationDropdown() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS)
  const dropdownRef = useRef(null)
  const unreadCount = notifications.filter(n => n.unread).length

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, unread: false })))
  const markRead = (id) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n))

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(v => !v)}
        className="relative p-2 text-on-surface-variant hover:text-primary rounded-full hover:bg-surface-container transition-colors"
        aria-label="Thông báo"
      >
        <span className="material-symbols-outlined" style={unreadCount > 0 ? { fontVariationSettings: "'FILL' 1" } : {}}>
          notifications
        </span>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1 border-2 border-surface">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-surface rounded-2xl shadow-xl border border-outline-variant/20 overflow-hidden z-50 animate-[fadeIn_0.15s_ease-out]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/20">
            <h4 className="font-headline-sm text-on-surface">Thông báo</h4>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-primary hover:underline font-medium">
                Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-outline-variant/10">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-on-surface-variant text-sm">Không có thông báo nào</div>
            ) : (
              notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={`w-full text-left flex items-start gap-3 p-3 hover:bg-surface-container-low transition-colors ${n.unread ? 'bg-primary/5' : ''}`}
                >
                  <div className={`w-9 h-9 rounded-full ${n.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                    <span className={`material-symbols-outlined text-[18px] ${n.color}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                      {n.icon}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className={`font-label-md text-on-surface truncate ${n.unread ? 'font-semibold' : ''}`}>{n.title}</p>
                      {n.unread && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                    </div>
                    <p className="font-body-sm text-on-surface-variant text-xs leading-snug mt-0.5 line-clamp-2">{n.body}</p>
                    <p className="text-[11px] text-on-surface-variant/70 mt-1">{n.time}</p>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-outline-variant/20 text-center">
            <button className="text-xs text-primary hover:underline font-medium">Xem tất cả thông báo</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function ParentDashboard() {
  const { user, token, logout } = useAuth()
  const [section, setSection] = useState('overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const displayName = user?.name || user?.email?.split('@')[0] || 'Phụ huynh'
  const initials = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="bg-background text-on-background min-h-screen flex font-body-md">

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <nav className={`
        fixed left-0 top-0 h-screen w-64 bg-surface-container-low
        flex flex-col py-md px-sm z-50 shadow-lg transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
      `}>
        {/* Brand */}
        <div className="mb-lg px-sm flex items-center gap-sm">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-tertiary flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>family_restroom</span>
          </div>
          <div>
            <h1 className="font-headline-md text-headline-md font-bold text-primary leading-tight">EduX</h1>
            <p className="font-label-sm text-label-sm text-on-surface-variant">Phụ huynh</p>
          </div>
        </div>

        {/* Nav */}
        <div className="flex flex-col gap-xs flex-1">
          {NAV.map(item => (
            <button
              key={item.key}
              onClick={() => { setSection(item.key); setSidebarOpen(false) }}
              className={`flex items-center gap-sm px-sm py-[10px] rounded-xl transition-all duration-200 text-left w-full
                ${section === item.key
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
            >
              <span
                className="material-symbols-outlined text-[22px]"
                style={section === item.key ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                {item.icon}
              </span>
              <span className="font-label-md text-label-md">{item.label}</span>
              {section === item.key && (
                <span className="ml-auto w-1.5 h-5 rounded-full bg-primary" />
              )}
            </button>
          ))}
        </div>

        {/* User + logout */}
        <div className="mt-auto pt-md border-t border-outline-variant/30">
          <div className="flex items-center gap-sm px-sm py-sm mb-sm">
            {user?.picture
              ? <img src={user.picture} alt={displayName} className="w-9 h-9 rounded-full object-cover border border-outline-variant/30" />
              : <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold text-sm">{initials}</div>
            }
            <div className="flex-1 min-w-0">
              <p className="font-label-md text-label-md text-on-surface truncate">{displayName}</p>
              <p className="font-label-sm text-label-sm text-on-surface-variant truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-sm px-sm py-sm rounded-xl text-error hover:bg-error/10 transition-colors text-left"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            <span className="font-label-md text-label-md">Đăng xuất</span>
          </button>
        </div>
      </nav>

      {/* ── Main area ── */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        {/* Topbar */}
        <header className="sticky top-0 h-16 bg-surface/90 backdrop-blur border-b border-outline-variant/20 flex items-center px-md gap-md z-20">
          <button
            className="md:hidden w-9 h-9 flex items-center justify-center text-on-surface-variant hover:bg-surface-container rounded-full"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="material-symbols-outlined">menu</span>
          </button>

          <div className="flex-1">
            <h2 className="font-headline-sm text-headline-sm text-on-surface">
              {NAV.find(n => n.key === section)?.label || 'Tổng quan'}
            </h2>
            <p className="font-label-sm text-label-sm text-on-surface-variant">
              Chào buổi {new Date().getHours() < 12 ? 'sáng' : new Date().getHours() < 18 ? 'chiều' : 'tối'}, {displayName} 👋
            </p>
          </div>

          <NotificationDropdown />
        </header>

        {/* Content */}
        <main className={`flex-1 overflow-y-auto ${section === 'messages' ? 'p-0' : 'p-md lg:p-lg'}`}>
          {section === 'overview'  && <OverviewSection  token={token} />}
          {section === 'students'  && <StudentsSection  token={token} />}
          {section === 'tutors'    && <TutorsSection    token={token} />}
          {section === 'messages'  && <MessagesSection  token={token} user={user} />}
          {section === 'activity'  && <ActivitySection  token={token} />}
          {section === 'finance'   && <FinanceSection   token={token} />}
          {section === 'settings'  && <SettingsSection  user={user} displayName={displayName} />}
        </main>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SECTION: OVERVIEW
// ═══════════════════════════════════════════════════════════════════════════════
function OverviewSection({ token }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_BASE}/api/parent/overview`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [token])

  if (loading) return <LoadingSkeleton />

  const stats = data?.stats || {}

  return (
    <div className="flex flex-col gap-lg max-w-7xl mx-auto">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md">
        <StatCard icon="group" label="Học sinh" value={stats.total_students ?? 0} color="blue" />
        <StatCard icon="quiz" label="Bài quiz đã nộp" value={stats.total_quiz_attempts ?? 0} color="purple" />
        <StatCard icon="psychology" label="Luyện tập AI" value={stats.total_practice_sessions ?? 0} color="green" />
        <StatCard icon="school" label="Gia sư" value={stats.total_tutors ?? 0} color="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        {/* Recent quiz activity */}
        <div className="lg:col-span-2 bg-surface rounded-2xl border border-outline-variant/20 shadow-sm overflow-hidden">
          <div className="p-lg border-b border-outline-variant/10 flex items-center gap-sm">
            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>quiz</span>
            <h3 className="font-headline-sm text-headline-sm text-on-surface">Kết quả quiz gần đây</h3>
          </div>
          {data?.recent_quiz_attempts?.length > 0 ? (
            <div className="divide-y divide-outline-variant/10">
              {data.recent_quiz_attempts.map(a => (
                <div key={a.id} className="p-md flex items-center gap-md hover:bg-surface-container-low transition-colors">
                  <Avatar src={a.student_picture} name={a.student_name} size={10} />
                  <div className="flex-1 min-w-0">
                    <p className="font-label-md text-label-md text-on-surface truncate">{a.student_name}</p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant truncate">{a.quiz_title} • {a.quiz_subject}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`font-headline-sm text-headline-sm font-bold ${scoreColor(a.score)}`}>
                      {a.score !== null ? `${Math.round(a.score)}%` : '—'}
                    </p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">{fmtTime(a.submitted_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon="quiz" text="Chưa có kết quả quiz nào" />
          )}
        </div>

        {/* Tutors panel */}
        <div className="bg-surface rounded-2xl border border-outline-variant/20 shadow-sm overflow-hidden">
          <div className="p-lg border-b border-outline-variant/10 flex items-center gap-sm">
            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
            <h3 className="font-headline-sm text-headline-sm text-on-surface">Gia sư</h3>
          </div>
          {data?.available_tutors?.length > 0 ? (
            <div className="p-md flex flex-col gap-sm">
              {data.available_tutors.slice(0, 5).map(t => (
                <div key={t.id} className="flex items-center gap-sm p-sm rounded-xl hover:bg-surface-container-low transition-colors">
                  <Avatar src={t.picture} name={t.full_name} size={10} />
                  <div className="flex-1 min-w-0">
                    <p className="font-label-md text-label-md text-on-surface truncate">{t.full_name}</p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant truncate">
                      {t.headline || (t.subjects ? `Dạy: ${t.subjects}` : 'Gia sư')}
                    </p>
                  </div>
                  {t.hourly_rate > 0 && (
                    <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                      {t.hourly_rate.toLocaleString('vi-VN')}đ/h
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon="school" text="Chưa có gia sư nào được duyệt" />
          )}
        </div>
      </div>

      {/* Practice sessions */}
      {data?.recent_practice_sessions?.length > 0 && (
        <div className="bg-surface rounded-2xl border border-outline-variant/20 shadow-sm overflow-hidden">
          <div className="p-lg border-b border-outline-variant/10 flex items-center gap-sm">
            <span className="material-symbols-outlined text-purple-600" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
            <h3 className="font-headline-sm text-headline-sm text-on-surface">Luyện tập AI gần đây</h3>
          </div>
          <div className="p-md grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
            {data.recent_practice_sessions.map(ps => (
              <div key={ps.id} className={`rounded-xl border p-md ${scoreBg(ps.score)}`}>
                <div className="flex items-center gap-sm mb-sm">
                  <Avatar src={ps.student_picture} name={ps.student_name} size={8} />
                  <div className="flex-1 min-w-0">
                    <p className="font-label-md text-label-md text-on-surface truncate">{ps.student_name}</p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">{fmtDate(ps.submitted_at)}</p>
                  </div>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface font-medium truncate mb-xs">{ps.topic}</p>
                <div className="flex items-center justify-between">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                    ps.difficulty === 'hard' ? 'bg-red-100 text-red-700' :
                    ps.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>{ps.difficulty === 'easy' ? 'Dễ' : ps.difficulty === 'hard' ? 'Khó' : 'Trung bình'}</span>
                  <span className={`font-headline-sm text-headline-sm font-bold ${scoreColor(ps.score)}`}>
                    {ps.score !== null ? `${Math.round(ps.score)}%` : '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SECTION: STUDENTS (CHILDREN)
// ═══════════════════════════════════════════════════════════════════════════════
function StudentsSection({ token }) {
  const [children, setChildren] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState(null)

  const fetchChildren = () => {
    setLoading(true)
    fetch(`${API_BASE}/api/parent/children`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => { setChildren(d.children || []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { fetchChildren() }, [token])

  const handleUnlink = async (studentId, studentName) => {
    if (!window.confirm(`Bạn có chắc muốn hủy liên kết với học sinh ${studentName}?`)) return
    try {
      const res = await fetch(`${API_BASE}/api/parent/children/${studentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) fetchChildren()
      else alert('Lỗi khi hủy liên kết')
    } catch { alert('Lỗi kết nối') }
  }

  if (loading) return <LoadingSkeleton />

  // ── Detail view ──
  if (selectedStudent) {
    return (
      <StudentDetailView
        token={token}
        student={selectedStudent}
        onBack={() => setSelectedStudent(null)}
      />
    )
  }

  const filtered = children.filter(s =>
    s.student_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.student_email?.toLowerCase().includes(search.toLowerCase()) ||
    s.nickname?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-lg max-w-5xl mx-auto">
      {/* Header + search */}
      <div className="flex items-center justify-between gap-md flex-wrap">
        <div>
          <h3 className="font-headline-md text-headline-md text-on-surface">Học sinh của tôi</h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Bạn đang quản lý {children.length} học sinh</p>
        </div>
        <div className="flex items-center gap-sm">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm học sinh..."
              className="pl-9 pr-4 h-10 rounded-xl border border-outline-variant bg-surface text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-body-sm"
            />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="h-10 px-4 rounded-xl bg-primary text-on-primary font-label-md flex items-center gap-1 hover:bg-primary/90 transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[20px]">person_add</span>
            Thêm học sinh
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="family_history" text="Chưa có học sinh nào được liên kết. Bấm 'Thêm học sinh' để bắt đầu." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
          {filtered.map(s => (
            <div
              key={s.link_id}
              className="bg-surface rounded-2xl border border-outline-variant/30 shadow-sm p-md flex flex-col gap-md relative overflow-hidden group hover:border-primary/30 hover:shadow-md transition-all cursor-pointer"
              onClick={() => setSelectedStudent(s)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-sm">
                  <Avatar src={s.student_picture} name={s.student_name} size={12} />
                  <div>
                    <p className="font-headline-sm text-headline-sm text-on-surface font-semibold">{s.nickname || s.student_name}</p>
                    {s.nickname && <p className="font-label-sm text-label-sm text-on-surface-variant">{s.student_name} • {s.student_email}</p>}
                    {!s.nickname && <p className="font-label-sm text-label-sm text-on-surface-variant">{s.student_email}</p>}
                  </div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); handleUnlink(s.student_id, s.student_name) }}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-error opacity-0 group-hover:opacity-100 hover:bg-error/10 transition-all"
                  title="Hủy liên kết"
                >
                  <span className="material-symbols-outlined text-[20px]">link_off</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-sm bg-surface-container-low p-sm rounded-xl border border-outline-variant/20">
                <div className="text-center">
                  <p className="font-label-sm text-on-surface-variant mb-1">Bài Kiểm Tra</p>
                  <p className="font-headline-sm font-semibold text-primary">{s.quiz_count || 0}</p>
                  <p className={`text-xs mt-1 font-medium ${scoreColor(s.avg_quiz_score)}`}>{s.avg_quiz_score ? `${s.avg_quiz_score}% TB` : '—'}</p>
                </div>
                <div className="text-center border-x border-outline-variant/20">
                  <p className="font-label-sm text-on-surface-variant mb-1">Luyện tập</p>
                  <p className="font-headline-sm font-semibold text-purple-600">{s.practice_count || 0}</p>
                  <p className={`text-xs mt-1 font-medium ${scoreColor(s.avg_practice_score)}`}>{s.avg_practice_score ? `${s.avg_practice_score}% TB` : '—'}</p>
                </div>
                <div className="text-center">
                  <p className="font-label-sm text-on-surface-variant mb-1">Đề thi</p>
                  <p className="font-headline-sm font-semibold text-orange-600">{s.exam_count || 0}</p>
                  <p className="text-xs mt-1 font-medium text-on-surface-variant">—</p>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs text-on-surface-variant border-t border-outline-variant/20 pt-sm mt-auto">
                <span>Liên kết ngày: {fmtDate(s.linked_at)}</span>
                <span className="flex items-center gap-1 text-primary font-medium">
                  Xem chi tiết
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && <AddStudentModal token={token} onClose={() => setShowAddModal(false)} onAdded={fetchChildren} />}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  STUDENT DETAIL VIEW
// ═══════════════════════════════════════════════════════════════════════════════

// Mock data — replace with real API calls when backend endpoints are ready
const MOCK_SCHEDULE = [
  { id: 1, subject: 'Toán',     time: 'Thứ 2, 18/07 • 18:00 – 20:00', tutor: 'Nguyễn Văn A', tutorId: 'tutor-1' },
  { id: 2, subject: 'Ngữ văn',  time: 'Thứ 4, 20/07 • 17:00 – 19:00', tutor: 'Trần Thị B',   tutorId: 'tutor-2' },
  { id: 3, subject: 'Tiếng Anh',time: 'Thứ 6, 22/07 • 19:00 – 21:00', tutor: 'Lê Văn C',     tutorId: 'tutor-3' },
  { id: 4, subject: 'Vật lí',   time: 'Thứ 7, 23/07 • 08:00 – 10:00', tutor: 'Phạm Thị D',   tutorId: 'tutor-4' },
]

const MOCK_REVIEWS = [
  { id: 1, date: 'Tuần 2 – Tháng 7/2025', tutor: 'Nguyễn Văn A', subject: 'Toán', content: 'Em tiến bộ rõ rệt trong phần phương trình bậc 2. Cần ôn thêm phần bất phương trình. Thái độ học tập tốt, chăm chú nghe giảng.', rating: 4 },
  { id: 2, date: 'Tuần 1 – Tháng 7/2025', tutor: 'Trần Thị B',   subject: 'Ngữ văn', content: 'Bài làm văn nghị luận có chiều sâu hơn so với tuần trước. Tuy nhiên phần phân tích nhân vật còn sơ sài, cần đọc thêm tác phẩm.', rating: 3 },
  { id: 3, date: 'Tháng 6/2025',           tutor: 'Lê Văn C',     subject: 'Tiếng Anh', content: 'Kỹ năng nghe và đọc hiểu cải thiện tốt. Grammar cần luyện thêm thì hiện tại hoàn thành. Speaking tự tin hơn.', rating: 5 },
]

const SUBJECT_COLORS = {
  'Toán':      'bg-blue-100 text-blue-700 border-blue-200',
  'Ngữ văn':   'bg-purple-100 text-purple-700 border-purple-200',
  'Tiếng Anh': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Vật lí':    'bg-orange-100 text-orange-700 border-orange-200',
  'Hoá học':   'bg-red-100 text-red-700 border-red-200',
  'Sinh học':  'bg-green-100 text-green-700 border-green-200',
}
function subjectColor(s) { return SUBJECT_COLORS[s] || 'bg-surface-container text-on-surface-variant border-outline-variant/30' }

function StarRating({ value }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <span key={i} className={`material-symbols-outlined text-[16px] ${i <= value ? 'text-amber-400' : 'text-outline-variant'}`}
          style={{ fontVariationSettings: i <= value ? "'FILL' 1" : '' }}>
          star
        </span>
      ))}
    </div>
  )
}

function StudentDetailView({ token, student, onBack }) {
  const [leaveModal, setLeaveModal] = useState(null) // { scheduleItem }
  const [messageModal, setMessageModal] = useState(null) // { tutorId, tutorName }

  // Derived stats from what we already have on the card
  const avgScore = ((student.avg_quiz_score || 0) + (student.avg_practice_score || 0)) / 2 || null
  const totalAttempts = (student.quiz_count || 0) + (student.practice_count || 0) + (student.exam_count || 0)
  const completionPct = totalAttempts > 0 ? Math.min(100, Math.round((totalAttempts / Math.max(totalAttempts, 10)) * 100)) : 0
  const absences = 2 // mock — replace with API

  return (
    <div className="flex flex-col gap-lg max-w-5xl mx-auto">

      {/* ── Back + Header ── */}
      <div className="flex items-center gap-md">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center transition-colors shrink-0"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="flex items-center gap-md flex-1">
          <Avatar src={student.student_picture} name={student.student_name} size={14} />
          <div>
            <h3 className="font-headline-md text-headline-md text-on-surface">{student.nickname || student.student_name}</h3>
            {student.nickname && <p className="font-body-sm text-on-surface-variant">{student.student_name} • {student.student_email}</p>}
            {!student.nickname && <p className="font-body-sm text-on-surface-variant">{student.student_email}</p>}
          </div>
        </div>
      </div>

      {/* ── 1. Mini Dashboard ── */}
      <div>
        <h4 className="font-headline-sm text-on-surface mb-md flex items-center gap-sm">
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>dashboard</span>
          Tổng quan
        </h4>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-md">
          {/* Điểm trung bình */}
          <div className="bg-surface rounded-2xl border border-outline-variant/20 p-md flex flex-col gap-sm shadow-sm">
            <div className="flex items-center justify-between">
              <span className="material-symbols-outlined text-[20px] text-blue-500" style={{ fontVariationSettings: "'FILL' 1" }}>grade</span>
              <span className="text-[11px] font-medium text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">Tổng hợp</span>
            </div>
            <p className={`font-display-sm text-display-sm font-black leading-none ${avgScore ? scoreColor(avgScore) : 'text-on-surface-variant'}`}>
              {avgScore ? `${Math.round(avgScore)}%` : '—'}
            </p>
            <p className="font-label-sm text-on-surface-variant">Điểm trung bình</p>
          </div>

          {/* Số buổi vắng/muộn */}
          <div className="bg-surface rounded-2xl border border-outline-variant/20 p-md flex flex-col gap-sm shadow-sm">
            <div className="flex items-center justify-between">
              <span className="material-symbols-outlined text-[20px] text-amber-500" style={{ fontVariationSettings: "'FILL' 1" }}>event_busy</span>
              <span className="text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Tháng này</span>
            </div>
            <p className={`font-display-sm text-display-sm font-black leading-none ${absences > 2 ? 'text-red-500' : absences > 0 ? 'text-amber-600' : 'text-green-600'}`}>
              {absences}
            </p>
            <p className="font-label-sm text-on-surface-variant">Buổi vắng / muộn</p>
          </div>

          {/* % Hoàn thành */}
          <div className="bg-surface rounded-2xl border border-outline-variant/20 p-md flex flex-col gap-sm shadow-sm col-span-2">
            <div className="flex items-center justify-between">
              <span className="material-symbols-outlined text-[20px] text-green-500" style={{ fontVariationSettings: "'FILL' 1" }}>task_alt</span>
              <span className="text-[11px] font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">{totalAttempts} bài</span>
            </div>
            <div className="flex items-end justify-between gap-md">
              <div>
                <p className="font-display-sm text-display-sm font-black leading-none text-green-600">{completionPct}%</p>
                <p className="font-label-sm text-on-surface-variant mt-1">Hoàn thành bài tập</p>
              </div>
              <div className="flex-1 max-w-[140px]">
                <div className="flex justify-between text-xs text-on-surface-variant mb-1">
                  <span>Quiz: {student.quiz_count || 0}</span>
                  <span>Practice: {student.practice_count || 0}</span>
                </div>
                <div className="h-2.5 bg-surface-container-high rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-700"
                    style={{ width: `${completionPct}%` }}
                  />
                </div>
                <div className="h-2 bg-surface-container-high rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full rounded-full bg-purple-400 transition-all duration-700"
                    style={{ width: `${Math.min(100, ((student.practice_count || 0) / Math.max(totalAttempts, 1)) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Lịch học sắp tới ── */}
      <div>
        <h4 className="font-headline-sm text-on-surface mb-md flex items-center gap-sm">
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_month</span>
          Lịch học sắp tới
        </h4>
        <div className="bg-surface rounded-2xl border border-outline-variant/20 shadow-sm overflow-hidden">
          {MOCK_SCHEDULE.length === 0 ? (
            <EmptyState icon="event_available" text="Chưa có buổi học nào sắp tới" />
          ) : (
            <div className="divide-y divide-outline-variant/10">
              {MOCK_SCHEDULE.map(item => (
                <div key={item.id} className="flex items-center gap-md p-4 hover:bg-surface-container-low/50 transition-colors">
                  {/* Subject badge */}
                  <div className={`shrink-0 px-3 py-1.5 rounded-xl border text-sm font-semibold ${subjectColor(item.subject)}`}>
                    {item.subject}
                  </div>

                  {/* Time + Tutor */}
                  <div className="flex-1 min-w-0">
                    <p className="font-label-md text-on-surface flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px] text-on-surface-variant">schedule</span>
                      {item.time}
                    </p>
                    <p className="font-label-sm text-on-surface-variant flex items-center gap-1 mt-0.5">
                      <span className="material-symbols-outlined text-[14px]">person</span>
                      {item.tutor}
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setLeaveModal(item)}
                      className="h-8 px-3 rounded-lg border border-amber-300 bg-amber-50 text-amber-700 text-xs font-medium hover:bg-amber-100 transition-colors flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">event_busy</span>
                      Xin nghỉ
                    </button>
                    <button
                      onClick={() => setMessageModal({ tutorId: item.tutorId, tutorName: item.tutor })}
                      className="h-8 px-3 rounded-lg border border-primary/30 bg-primary/5 text-primary text-xs font-medium hover:bg-primary/10 transition-colors flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">chat</span>
                      Nhắn gia sư
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 3. Nhận xét định kỳ (Timeline) ── */}
      <div>
        <h4 className="font-headline-sm text-on-surface mb-md flex items-center gap-sm">
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>rate_review</span>
          Nhận xét định kỳ
        </h4>

        {MOCK_REVIEWS.length === 0 ? (
          <EmptyState icon="rate_review" text="Chưa có nhận xét nào từ gia sư" />
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-outline-variant/30" />

            <div className="flex flex-col gap-md">
              {MOCK_REVIEWS.map((review, idx) => (
                <div key={review.id} className="flex gap-md pl-2">
                  {/* Dot */}
                  <div className="relative shrink-0 flex flex-col items-center" style={{ width: 24 }}>
                    <div className={`w-4 h-4 rounded-full border-2 border-surface z-10 mt-1 ${idx === 0 ? 'bg-primary border-primary' : 'bg-surface-container-high border-outline-variant'}`} />
                  </div>

                  {/* Card */}
                  <div className="flex-1 bg-surface rounded-2xl border border-outline-variant/20 shadow-sm p-md mb-2">
                    <div className="flex items-start justify-between gap-md mb-3">
                      <div>
                        <p className="font-label-sm text-on-surface-variant text-xs">{review.date}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${subjectColor(review.subject)}`}>{review.subject}</span>
                          <span className="font-label-sm text-on-surface-variant text-xs flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px]">person</span>
                            {review.tutor}
                          </span>
                        </div>
                      </div>
                      <StarRating value={review.rating} />
                    </div>
                    <p className="font-body-sm text-on-surface leading-relaxed">{review.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Leave Modal ── */}
      {leaveModal && (
        <LeaveRequestModal
          scheduleItem={leaveModal}
          studentName={student.nickname || student.student_name}
          onClose={() => setLeaveModal(null)}
        />
      )}

      {/* ── Message Modal ── */}
      {messageModal && (
        <QuickMessageModal
          tutorName={messageModal.tutorName}
          onClose={() => setMessageModal(null)}
        />
      )}
    </div>
  )
}

function LeaveRequestModal({ scheduleItem, studentName, onClose }) {
  const [reason, setReason] = useState('')
  const [sent, setSent] = useState(false)

  const handleSend = () => {
    // TODO: call API to notify tutor
    setSent(true)
    setTimeout(onClose, 1500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-surface w-full max-w-sm rounded-3xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-outline-variant/20">
          <h3 className="font-headline-sm text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-500">event_busy</span>
            Xin nghỉ phép
          </h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        <div className="p-4 flex flex-col gap-4">
          {sent ? (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <span className="material-symbols-outlined text-green-500 text-[40px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              <p className="font-label-md text-on-surface">Đã gửi yêu cầu nghỉ phép!</p>
              <p className="font-body-sm text-on-surface-variant">Gia sư {scheduleItem.tutor} sẽ nhận được thông báo.</p>
            </div>
          ) : (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm">
                <p className="font-medium text-amber-800">{scheduleItem.subject} — {scheduleItem.time}</p>
                <p className="text-amber-600 text-xs mt-0.5">Gia sư: {scheduleItem.tutor}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">Lý do nghỉ (không bắt buộc)</label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  rows={3}
                  placeholder="VD: Bé bệnh, có việc gia đình..."
                  className="w-full p-3 rounded-xl border border-outline-variant bg-surface focus:border-primary focus:ring-1 focus:ring-primary resize-none text-sm"
                />
              </div>
              <button
                onClick={handleSend}
                className="h-11 w-full rounded-xl bg-amber-500 text-white font-medium hover:bg-amber-600 transition-colors"
              >
                Gửi yêu cầu nghỉ
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function QuickMessageModal({ tutorName, onClose }) {
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)

  const handleSend = () => {
    if (!message.trim()) return
    // TODO: call messages API
    setSent(true)
    setTimeout(onClose, 1500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-surface w-full max-w-sm rounded-3xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-outline-variant/20">
          <h3 className="font-headline-sm text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">chat</span>
            Nhắn gia sư {tutorName}
          </h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        <div className="p-4 flex flex-col gap-4">
          {sent ? (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <span className="material-symbols-outlined text-green-500 text-[40px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              <p className="font-label-md text-on-surface">Đã gửi tin nhắn!</p>
            </div>
          ) : (
            <>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={4}
                placeholder={`Nhắn cho ${tutorName}...`}
                className="w-full p-3 rounded-xl border border-outline-variant bg-surface focus:border-primary focus:ring-1 focus:ring-primary resize-none text-sm"
              />
              <button
                onClick={handleSend}
                disabled={!message.trim()}
                className="h-11 w-full rounded-xl bg-primary text-on-primary font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                Gửi tin nhắn
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function AddStudentModal({ token, onClose, onAdded }) {
  const [tab, setTab] = useState('link') // 'link' | 'create'
  
  // Link state
  const [code, setCode] = useState('')
  const [linkNickname, setLinkNickname] = useState('')
  const [linkError, setLinkError] = useState('')
  const [linking, setLinking] = useState(false)

  // Create state
  const [form, setForm] = useState({ full_name: '', email: '', password: '', nickname: '' })
  const [createError, setCreateError] = useState('')
  const [creating, setCreating] = useState(false)

  const handleLink = async (e) => {
    e.preventDefault()
    setLinkError(''); setLinking(true)
    try {
      const res = await fetch(`${API_BASE}/api/parent/link-child`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: code.toUpperCase(), nickname: linkNickname })
      })
      const data = await res.json()
      if (res.ok) { onAdded(); onClose() }
      else setLinkError(data.message || 'Lỗi liên kết')
    } catch(err) { setLinkError('Lỗi kết nối server') }
    setLinking(false)
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setCreateError(''); setCreating(true)
    try {
      const res = await fetch(`${API_BASE}/api/parent/create-child`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (res.ok) { onAdded(); onClose() }
      else setCreateError(data.message || 'Lỗi tạo tài khoản')
    } catch(err) { setCreateError('Lỗi kết nối server') }
    setCreating(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-surface w-full max-w-md rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-md border-b border-outline-variant/20">
          <h2 className="font-headline-sm text-on-surface">Thêm học sinh</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex border-b border-outline-variant/20">
          <button 
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${tab === 'link' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:bg-surface-container/50'}`}
            onClick={() => setTab('link')}
          >
            Liên kết bằng mã
          </button>
          <button 
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${tab === 'create' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:bg-surface-container/50'}`}
            onClick={() => setTab('create')}
          >
            Tạo tài khoản mới
          </button>
        </div>

        <div className="p-md overflow-y-auto">
          {tab === 'link' ? (
            <form onSubmit={handleLink} className="flex flex-col gap-4">
              <p className="text-sm text-on-surface-variant mb-2">Nhập mã liên kết 8 ký tự do học sinh cung cấp trong mục "Mã chia sẻ" của học sinh.</p>
              {linkError && <p className="text-sm text-error bg-error/10 p-2 rounded-lg">{linkError}</p>}
              
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">Mã liên kết <span className="text-error">*</span></label>
                <input required value={code} onChange={e=>setCode(e.target.value)} maxLength={8} placeholder="VD: A1B2C3D4" className="w-full h-12 px-4 rounded-xl border border-outline-variant bg-surface focus:border-primary focus:ring-1 focus:ring-primary uppercase tracking-widest text-center font-bold" />
              </div>
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">Tên gọi ở nhà (không bắt buộc)</label>
                <input value={linkNickname} onChange={e=>setLinkNickname(e.target.value)} placeholder="VD: Tí, Tèo..." className="w-full h-12 px-4 rounded-xl border border-outline-variant bg-surface focus:border-primary focus:ring-1 focus:ring-primary" />
              </div>

              <button disabled={linking || code.length !== 8} type="submit" className="mt-4 h-12 w-full rounded-xl bg-primary text-on-primary font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed">
                {linking ? 'Đang liên kết...' : 'Liên kết ngay'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <p className="text-sm text-on-surface-variant mb-2">Tạo tài khoản học sinh mới. Hệ thống sẽ tự động liên kết tài khoản này với bạn.</p>
              {createError && <p className="text-sm text-error bg-error/10 p-2 rounded-lg">{createError}</p>}
              
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">Họ và tên <span className="text-error">*</span></label>
                <input required value={form.full_name} onChange={e=>setForm({...form, full_name: e.target.value})} placeholder="Nguyễn Văn A" className="w-full h-11 px-4 rounded-xl border border-outline-variant bg-surface focus:border-primary focus:ring-1 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">Email <span className="text-error">*</span></label>
                <input required type="email" value={form.email} onChange={e=>setForm({...form, email: e.target.value})} placeholder="student@example.com" className="w-full h-11 px-4 rounded-xl border border-outline-variant bg-surface focus:border-primary focus:ring-1 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">Mật khẩu <span className="text-error">*</span></label>
                <input required type="password" minLength={6} value={form.password} onChange={e=>setForm({...form, password: e.target.value})} placeholder="Ít nhất 6 ký tự" className="w-full h-11 px-4 rounded-xl border border-outline-variant bg-surface focus:border-primary focus:ring-1 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">Tên gọi ở nhà (không bắt buộc)</label>
                <input value={form.nickname} onChange={e=>setForm({...form, nickname: e.target.value})} placeholder="VD: Tí, Tèo..." className="w-full h-11 px-4 rounded-xl border border-outline-variant bg-surface focus:border-primary focus:ring-1 focus:ring-primary" />
              </div>

              <button disabled={creating || !form.full_name || !form.email || form.password.length < 6} type="submit" className="mt-2 h-12 w-full rounded-xl bg-primary text-on-primary font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed">
                {creating ? 'Đang tạo...' : 'Tạo tài khoản & Liên kết'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════════════════════
//  SECTION: FINANCE
// ═══════════════════════════════════════════════════════════════════════════════

const MOCK_PENDING_INVOICES = [
  { id: 'INV-0028', student: 'Bé Minh', subject: 'Toán + Lý', period: 'Tháng 7/2025', amount: 1800000, dueDate: '20/07/2025', overdue: false },
  { id: 'INV-0027', student: 'Bé Lan',  subject: 'Ngữ văn',   period: 'Tháng 7/2025', amount: 900000,  dueDate: '15/07/2025', overdue: true },
]

const MOCK_PAID_INVOICES = [
  { id: 'INV-0026', student: 'Bé Minh', subject: 'Toán + Lý', period: 'Tháng 6/2025', amount: 1800000, paidDate: '18/06/2025', method: 'Chuyển khoản' },
  { id: 'INV-0025', student: 'Bé Lan',  subject: 'Ngữ văn',   period: 'Tháng 6/2025', amount: 900000,  paidDate: '12/06/2025', method: 'Tiền mặt' },
  { id: 'INV-0024', student: 'Bé Minh', subject: 'Toán + Lý', period: 'Tháng 5/2025', amount: 1800000, paidDate: '20/05/2025', method: 'Chuyển khoản' },
  { id: 'INV-0023', student: 'Bé Lan',  subject: 'Ngữ văn',   period: 'Tháng 5/2025', amount: 900000,  paidDate: '14/05/2025', method: 'Tiền mặt' },
]

function fmtMoney(n) {
  return n.toLocaleString('vi-VN') + 'đ'
}

function FinanceSection() {
  const [tab, setTab] = useState('pending') // 'pending' | 'history'
  const totalDebt = MOCK_PENDING_INVOICES.reduce((s, i) => s + i.amount, 0)
  const overdueInvoices = MOCK_PENDING_INVOICES.filter(i => i.overdue)

  return (
    <div className="flex flex-col gap-lg max-w-4xl mx-auto">
      <div>
        <h3 className="font-headline-md text-headline-md text-on-surface">Quản lý Tài chính</h3>
        <p className="font-body-sm text-on-surface-variant">Theo dõi học phí và lịch sử thanh toán</p>
      </div>

      {/* ── Debt alert banner ── */}
      {overdueInvoices.length > 0 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-red-500 text-[28px] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
            warning
          </span>
          <div className="flex-1">
            <p className="font-headline-sm text-red-700 font-semibold">
              {overdueInvoices.length} hóa đơn đã quá hạn thanh toán!
            </p>
            <p className="font-body-sm text-red-600 mt-1">
              {overdueInvoices.map(i => `${i.id} (${i.student} — ${i.period})`).join(', ')}. Vui lòng thanh toán để tránh ảnh hưởng lịch học.
            </p>
          </div>
          <span className="font-headline-sm text-red-700 font-black shrink-0">{fmtMoney(overdueInvoices.reduce((s, i) => s + i.amount, 0))}</span>
        </div>
      )}

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-md">
        <div className="bg-surface rounded-2xl border border-outline-variant/20 p-md shadow-sm flex flex-col gap-1">
          <span className="material-symbols-outlined text-[22px] text-amber-500" style={{ fontVariationSettings: "'FILL' 1" }}>pending_actions</span>
          <p className="font-headline-sm font-black text-amber-600">{fmtMoney(totalDebt)}</p>
          <p className="font-label-sm text-on-surface-variant">Tổng chờ thanh toán</p>
        </div>
        <div className="bg-surface rounded-2xl border border-outline-variant/20 p-md shadow-sm flex flex-col gap-1">
          <span className="material-symbols-outlined text-[22px] text-green-500" style={{ fontVariationSettings: "'FILL' 1" }}>payments</span>
          <p className="font-headline-sm font-black text-green-600">{fmtMoney(MOCK_PAID_INVOICES.reduce((s, i) => s + i.amount, 0))}</p>
          <p className="font-label-sm text-on-surface-variant">Đã thanh toán (năm nay)</p>
        </div>
        <div className="bg-surface rounded-2xl border border-outline-variant/20 p-md shadow-sm flex flex-col gap-1 col-span-2 lg:col-span-1">
          <span className="material-symbols-outlined text-[22px] text-red-500" style={{ fontVariationSettings: "'FILL' 1" }}>receipt_long</span>
          <p className="font-headline-sm font-black text-red-500">{overdueInvoices.length}</p>
          <p className="font-label-sm text-on-surface-variant">Hóa đơn quá hạn</p>
        </div>
      </div>

      {/* ── Tab switcher ── */}
      <div className="flex bg-surface-container-high/60 rounded-xl p-1 gap-1">
        {[
          { key: 'pending', label: 'Chờ thanh toán', icon: 'pending_actions' },
          { key: 'history', label: 'Lịch sử đã đóng', icon: 'receipt_long' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-lg font-label-md transition-all ${
              tab === t.key
                ? 'bg-surface shadow-sm text-primary'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]" style={tab === t.key ? { fontVariationSettings: "'FILL' 1" } : {}}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Pending invoices ── */}
      {tab === 'pending' && (
        <div className="bg-surface rounded-2xl border border-outline-variant/20 shadow-sm overflow-hidden">
          {MOCK_PENDING_INVOICES.length === 0 ? (
            <EmptyState icon="check_circle" text="Không có hóa đơn nào đang chờ thanh toán 🎉" />
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant/20">
                  <th className="p-4 font-label-md text-on-surface-variant text-sm">Mã hóa đơn</th>
                  <th className="p-4 font-label-md text-on-surface-variant text-sm">Học sinh</th>
                  <th className="p-4 font-label-md text-on-surface-variant text-sm hidden md:table-cell">Môn / Kỳ</th>
                  <th className="p-4 font-label-md text-on-surface-variant text-sm">Số tiền</th>
                  <th className="p-4 font-label-md text-on-surface-variant text-sm">Hạn TT</th>
                  <th className="p-4 font-label-md text-on-surface-variant text-sm text-right">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {MOCK_PENDING_INVOICES.map(inv => (
                  <tr key={inv.id} className={`hover:bg-surface-container-low/50 transition-colors ${inv.overdue ? 'bg-red-50/40' : ''}`}>
                    <td className="p-4 font-label-md text-on-surface font-mono text-sm">{inv.id}</td>
                    <td className="p-4 font-label-md text-on-surface">{inv.student}</td>
                    <td className="p-4 font-body-sm text-on-surface-variant hidden md:table-cell">
                      <p>{inv.subject}</p>
                      <p className="text-xs">{inv.period}</p>
                    </td>
                    <td className="p-4 font-label-md text-on-surface font-semibold">{fmtMoney(inv.amount)}</td>
                    <td className={`p-4 font-label-sm text-sm ${inv.overdue ? 'text-red-600 font-semibold' : 'text-on-surface-variant'}`}>
                      {inv.dueDate}
                    </td>
                    <td className="p-4 text-right">
                      {inv.overdue ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
                          <span className="material-symbols-outlined text-[12px]">error</span>
                          Quá hạn
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                          <span className="material-symbols-outlined text-[12px]">schedule</span>
                          Chờ TT
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Paid history ── */}
      {tab === 'history' && (
        <div className="bg-surface rounded-2xl border border-outline-variant/20 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant/20">
                <th className="p-4 font-label-md text-on-surface-variant text-sm">Mã hóa đơn</th>
                <th className="p-4 font-label-md text-on-surface-variant text-sm">Học sinh</th>
                <th className="p-4 font-label-md text-on-surface-variant text-sm hidden md:table-cell">Môn / Kỳ</th>
                <th className="p-4 font-label-md text-on-surface-variant text-sm">Số tiền</th>
                <th className="p-4 font-label-md text-on-surface-variant text-sm">Ngày TT</th>
                <th className="p-4 font-label-md text-on-surface-variant text-sm text-right hidden sm:table-cell">Hình thức</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {MOCK_PAID_INVOICES.map(inv => (
                <tr key={inv.id} className="hover:bg-surface-container-low/50 transition-colors">
                  <td className="p-4 font-label-md text-on-surface font-mono text-sm">{inv.id}</td>
                  <td className="p-4 font-label-md text-on-surface">{inv.student}</td>
                  <td className="p-4 font-body-sm text-on-surface-variant hidden md:table-cell">
                    <p>{inv.subject}</p>
                    <p className="text-xs">{inv.period}</p>
                  </td>
                  <td className="p-4 font-label-md text-on-surface font-semibold">{fmtMoney(inv.amount)}</td>
                  <td className="p-4 font-label-sm text-green-600">{inv.paidDate}</td>
                  <td className="p-4 text-right hidden sm:table-cell">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                      <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      {inv.method}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SECTION: TUTORS
// ═══════════════════════════════════════════════════════════════════════════════
function TutorsSection({ token }) {
  const [tutors, setTutors] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch(`${API_BASE}/api/parent/tutors`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => { setTutors(d.tutors || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [token])

  if (loading) return <LoadingSkeleton />

  const filtered = tutors.filter(t =>
    t.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.subjects?.toLowerCase().includes(search.toLowerCase()) ||
    t.headline?.toLowerCase().includes(search.toLowerCase())
  )

  const subjectColors = {
    'Toán': 'bg-blue-100 text-blue-700',
    'Vật lí': 'bg-orange-100 text-orange-700',
    'Hoá học': 'bg-red-100 text-red-700',
    'Sinh học': 'bg-green-100 text-green-700',
    'Tiếng Anh': 'bg-emerald-100 text-emerald-700',
    'Ngữ văn': 'bg-purple-100 text-purple-700',
    'Lịch sử': 'bg-amber-100 text-amber-700',
    'Địa lí': 'bg-teal-100 text-teal-700',
  }

  return (
    <div className="flex flex-col gap-lg max-w-5xl mx-auto">
      <div className="flex items-center gap-md flex-wrap">
        <div className="flex-1">
          <h3 className="font-headline-md text-headline-md text-on-surface">Gia sư đã được duyệt</h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant">{filtered.length} gia sư trong hệ thống</p>
        </div>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm gia sư, môn học..."
            className="pl-9 pr-4 h-10 rounded-xl border border-outline-variant bg-surface text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-body-sm"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="school" text="Chưa có gia sư nào được duyệt" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-md">
          {filtered.map(t => {
            const subjects = t.subjects ? t.subjects.split(',').map(s => s.trim()).filter(Boolean) : []
            return (
              <div key={t.id} className="bg-surface rounded-2xl border border-outline-variant/20 shadow-sm p-lg flex flex-col gap-md hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                <div className="flex items-start gap-md">
                  <Avatar src={t.picture} name={t.full_name} size={12} />
                  <div className="flex-1 min-w-0">
                    <p className="font-headline-sm text-headline-sm text-on-surface">{t.full_name}</p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
                      {t.headline || 'Gia sư tại EduX'}
                    </p>
                    {t.location && (
                      <p className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-xs mt-xs">
                        <span className="material-symbols-outlined text-[14px]">location_on</span>
                        {t.location}
                      </p>
                    )}
                  </div>
                </div>

                {t.bio && (
                  <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2">{t.bio}</p>
                )}

                {subjects.length > 0 && (
                  <div className="flex flex-wrap gap-xs">
                    {subjects.map(s => (
                      <span key={s} className={`text-xs px-2 py-0.5 rounded-full font-medium ${subjectColors[s] || 'bg-surface-container text-on-surface-variant'}`}>
                        {s}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-sm border-t border-outline-variant/20">
                  {t.experience_years > 0 && (
                    <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-xs">
                      <span className="material-symbols-outlined text-[14px]">work</span>
                      {t.experience_years} năm KN
                    </span>
                  )}
                  {t.hourly_rate > 0 ? (
                    <span className="font-label-md text-label-md text-primary font-semibold ml-auto">
                      {t.hourly_rate.toLocaleString('vi-VN')}đ/giờ
                    </span>
                  ) : (
                    <span className="font-label-sm text-label-sm text-on-surface-variant ml-auto">Liên hệ để biết giá</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SECTION: ACTIVITY
// ═══════════════════════════════════════════════════════════════════════════════
function ActivitySection({ token }) {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetch(`${API_BASE}/api/parent/activity`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => { setActivities(d.activities || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [token])

  if (loading) return <LoadingSkeleton />

  const filtered = filter === 'all' ? activities : activities.filter(a => a.type === filter)

  return (
    <div className="flex flex-col gap-lg max-w-4xl mx-auto">
      <div className="flex items-center gap-md flex-wrap">
        <div className="flex-1">
          <h3 className="font-headline-md text-headline-md text-on-surface">Lịch sử hoạt động</h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant">{filtered.length} hoạt động</p>
        </div>
        {/* Filter chips */}
        <div className="flex gap-xs">
          {[
            { key: 'all',      label: 'Tất cả' },
            { key: 'quiz',     label: 'Bài Kiểm Tra' },
            { key: 'practice', label: 'Luyện tập' },
            { key: 'exam',     label: 'Đề thi' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-full font-label-sm text-label-sm transition-all ${
                filter === f.key
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="analytics" text="Chưa có hoạt động nào" />
      ) : (
        <div className="bg-surface rounded-2xl border border-outline-variant/20 shadow-sm overflow-hidden">
          <div className="divide-y divide-outline-variant/10">
            {filtered.map((a, idx) => (
              <div key={`${a.type}-${a.id}-${idx}`} className="p-md flex items-center gap-md hover:bg-surface-container-low/50 transition-colors">
                <Avatar src={a.student_picture} name={a.student_name} size={10} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-xs mb-0.5 flex-wrap">
                    <p className="font-label-md text-label-md text-on-surface">{a.student_name}</p>
                    <TypeBadge type={a.type} />
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
                    {a.title}
                    {a.subject && a.subject !== a.title && ` • ${a.subject}`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`font-headline-sm text-headline-sm font-bold ${scoreColor(a.score)}`}>
                    {a.score !== null ? `${Math.round(a.score)}%` : '—'}
                  </p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">{fmtTime(a.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SECTION: SETTINGS
// ═══════════════════════════════════════════════════════════════════════════════
function SettingsSection({ user, displayName }) {
  const [notif, setNotif] = useState({ quiz: true, practice: true, tutor: false })

  return (
    <div className="flex flex-col gap-lg max-w-2xl mx-auto">
      <h3 className="font-headline-md text-headline-md text-on-surface">Cài đặt tài khoản</h3>

      {/* Profile info */}
      <div className="bg-surface rounded-2xl border border-outline-variant/20 shadow-sm p-lg flex flex-col gap-md">
        <h4 className="font-title-md text-title-md text-on-surface flex items-center gap-sm">
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
          Thông tin cá nhân
        </h4>
        <div className="flex items-center gap-md">
          {user?.picture
            ? <img src={user.picture} alt={displayName} className="w-16 h-16 rounded-full object-cover border-2 border-primary/30" />
            : <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold text-xl">
                {displayName.charAt(0).toUpperCase()}
              </div>
          }
          <div>
            <p className="font-headline-sm text-headline-sm text-on-surface">{displayName}</p>
            <p className="font-body-sm text-body-sm text-on-surface-variant">{user?.email}</p>
            <span className="inline-block mt-xs px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">Phụ huynh</span>
          </div>
        </div>
      </div>

      {/* Notification settings */}
      <div className="bg-surface rounded-2xl border border-outline-variant/20 shadow-sm p-lg flex flex-col gap-md">
        <h4 className="font-title-md text-title-md text-on-surface flex items-center gap-sm">
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>notifications</span>
          Thông báo
        </h4>
        {[
          { key: 'quiz',     label: 'Khi học sinh nộp quiz', desc: 'Nhận thông báo mỗi khi học sinh hoàn thành bài quiz' },
          { key: 'practice', label: 'Khi học sinh luyện tập', desc: 'Nhận thông báo khi có phiên luyện tập AI mới' },
          { key: 'tutor',    label: 'Cập nhật từ gia sư', desc: 'Nhận thông báo khi có gia sư mới được duyệt' },
        ].map(n => (
          <div key={n.key} className="flex items-center justify-between gap-md">
            <div>
              <p className="font-label-md text-label-md text-on-surface">{n.label}</p>
              <p className="font-label-sm text-label-sm text-on-surface-variant">{n.desc}</p>
            </div>
            <button
              onClick={() => setNotif(prev => ({ ...prev, [n.key]: !prev[n.key] }))}
              className={`relative flex-shrink-0 w-12 h-6 rounded-full transition-colors duration-200 ${notif[n.key] ? 'bg-primary' : 'bg-surface-container-highest'}`}
            >
              <span className={`absolute top-[3px] left-[3px] w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-transform duration-200 ${notif[n.key] ? 'translate-x-[21px]' : 'translate-x-0'}`} />
            </button>
          </div>
        ))}
      </div>

      {/* Platform info */}
      <div className="bg-surface-container-low rounded-2xl border border-outline-variant/20 p-lg">
        <p className="font-label-sm text-label-sm text-on-surface-variant text-center">
          EduX Cổng Phụ Huynh • Phiên bản 1.0 • Chương trình GDPT 2018
        </p>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, color }) {
  const colors = {
    blue:   { bg: 'bg-blue-50',   icon: 'text-blue-600',   border: 'border-blue-100' },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-600', border: 'border-purple-100' },
    green:  { bg: 'bg-green-50',  icon: 'text-green-600',  border: 'border-green-100' },
    orange: { bg: 'bg-orange-50', icon: 'text-orange-600', border: 'border-orange-100' },
  }
  const c = colors[color] || colors.blue
  return (
    <div className={`rounded-2xl border ${c.border} ${c.bg} p-lg flex flex-col gap-sm`}>
      <span className={`material-symbols-outlined text-[28px] ${c.icon}`} style={{ fontVariationSettings: "'FILL' 1" }}>
        {icon}
      </span>
      <p className="font-display-sm text-display-sm text-on-surface font-bold leading-none">{value}</p>
      <p className="font-label-sm text-label-sm text-on-surface-variant">{label}</p>
    </div>
  )
}

function EmptyState({ icon, text }) {
  return (
    <div className="flex flex-col items-center justify-center py-xl gap-md text-center">
      <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center">
        <span className="material-symbols-outlined text-[32px] text-on-surface-variant">{icon}</span>
      </div>
      <p className="font-body-md text-body-md text-on-surface-variant">{text}</p>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-md animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-surface-container rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-md">
        <div className="lg:col-span-2 h-64 bg-surface-container rounded-2xl" />
        <div className="h-64 bg-surface-container rounded-2xl" />
      </div>
    </div>
  )
}
