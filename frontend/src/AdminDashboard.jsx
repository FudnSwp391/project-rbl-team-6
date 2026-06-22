import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

async function authFetch(url, token, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`)
  return data
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('vi-VN', { day: 'numeric', month: 'short', year: 'numeric' })
}

const NAV_ITEMS = [
  { id: 'dashboard',       label: 'Tổng quan',             icon: 'dashboard' },
  { id: 'tutor-approval',  label: 'Duyệt gia sư',          icon: 'how_to_reg' },
  { id: 'user-management', label: 'Quản lý người dùng',    icon: 'group' },
  { id: 'subjects',        label: 'Môn học',               icon: 'subject' },
  { id: 'lessons',         label: 'Bài học',               icon: 'menu_book' },
  { id: 'transactions',    label: 'Giao dịch',             icon: 'payments' },
  { id: 'complaints',      label: 'Khiếu nại',             icon: 'report_problem' },
  { id: 'reviews',         label: 'Đánh giá',              icon: 'reviews' },
  { id: 'reports',         label: 'Báo cáo',               icon: 'assessment' },
  { id: 'ai-insights',     label: 'AI Insights',           icon: 'psychology' },
  { id: 'audit-logs',      label: 'Nhật ký hệ thống',      icon: 'history_edu' },
  { id: 'settings',        label: 'Cài đặt',               icon: 'settings' },
]

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { user, token, logout } = useAuth()

  const [activeView, setActiveView]   = useState('dashboard')

  // ── Tutor data ──
  const [stats,   setStats]   = useState({ pending: 0, approved: 0, rejected: 0, total: 0 })
  const [tutors,  setTutors]  = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [toast,   setToast]   = useState(null)

  // ── Review panel ──
  const [selectedTutor,  setSelectedTutor]  = useState(null)
  const [reviewNotes,    setReviewNotes]    = useState('')
  const [actionLoading,  setActionLoading]  = useState(false)

  // ── Reject modal ──
  const [rejectTarget,  setRejectTarget]  = useState(null)
  const [rejectReason,  setRejectReason]  = useState('')

  // ── Image preview modal ──
  const [previewUrl,     setPreviewUrl]     = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError,   setPreviewError]   = useState(null)

  // ── Fetch data ────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [statsData, tutorsData] = await Promise.all([
        authFetch(`${API}/api/admin/tutors/stats`, token),
        authFetch(`${API}/api/admin/tutors/pending`, token),
      ])
      setStats(statsData)
      setTutors(tutorsData)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  // ── Approve ───────────────────────────────────────────────────────────────
  const handleApprove = async (tutorId) => {
    setActionLoading(true)
    try {
      await authFetch(`${API}/api/admin/tutors/${tutorId}/approve`, token, {
        method: 'PATCH',
        body: JSON.stringify({ notes: reviewNotes.trim() }),
      })
      setTutors(prev => prev.filter(t => t.id !== tutorId))
      setStats(prev => ({ ...prev, pending: Math.max(0, prev.pending - 1), approved: prev.approved + 1 }))
      setSelectedTutor(null); setReviewNotes('')
      setToast({ msg: 'Đã duyệt gia sư! Email thông báo đã được gửi.', type: 'success' })
    } catch (err) {
      setToast({ msg: `Duyệt thất bại: ${err.message}`, type: 'error' })
    } finally { setActionLoading(false) }
  }

  // ── Reject ────────────────────────────────────────────────────────────────
  const openRejectModal = (tutor) => {
    setRejectTarget(tutor)
    setRejectReason(reviewNotes.trim())
  }

  const handleRejectConfirm = async () => {
    if (!rejectReason.trim()) { setToast({ msg: 'Vui lòng nhập lý do từ chối.', type: 'error' }); return }
    setActionLoading(true)
    try {
      await authFetch(`${API}/api/admin/tutors/${rejectTarget.id}/reject`, token, {
        method: 'PATCH',
        body: JSON.stringify({ reason: rejectReason, notes: reviewNotes.trim() }),
      })
      setTutors(prev => prev.filter(t => t.id !== rejectTarget.id))
      setStats(prev => ({ ...prev, pending: Math.max(0, prev.pending - 1), rejected: prev.rejected + 1 }))
      setRejectTarget(null); setSelectedTutor(null); setReviewNotes('')
      setToast({ msg: 'Đã từ chối hồ sơ. Email đã gửi cho ứng viên.', type: 'success' })
    } catch (err) {
      setToast({ msg: `Từ chối thất bại: ${err.message}`, type: 'error' })
    } finally { setActionLoading(false) }
  }

  // ── Document preview ──────────────────────────────────────────────────────
  const handleViewDoc = async (path) => {
    if (!path) return
    setPreviewUrl(null); setPreviewError(null); setPreviewLoading(true)
    try {
      const data = await authFetch(`${API}/api/admin/document-url?path=${encodeURIComponent(path)}`, token)
      if (!data.signedUrl) throw new Error('No signed URL returned.')
      setPreviewUrl(data.signedUrl)
    } catch (err) {
      setPreviewError(err.message)
      setToast({ msg: `Không thể tải tài liệu: ${err.message}`, type: 'error' })
    } finally { setPreviewLoading(false) }
  }

  const displayName = user?.name || user?.email?.split('@')[0] || 'Admin'
  const initials    = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="bg-background text-on-surface min-h-screen flex antialiased">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[999] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold transition-all ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          <span className="material-symbols-outlined text-[18px]">{toast.type === 'success' ? 'check_circle' : 'error'}</span>
          {toast.msg}
        </div>
      )}

      {/* ══ SIDEBAR ══ */}
      <aside className="w-64 h-screen fixed left-0 top-0 bg-white shadow-sm z-20 flex flex-col py-6 px-2">
        <a href="#/" className="block px-3 pb-8 pt-1 no-underline cursor-pointer">
          <h1 className="text-2xl font-bold text-primary">EduX</h1>
          <p className="text-xs text-on-surface-variant mt-0.5">Bảng điều khiển Admin</p>
        </a>

        <nav className="flex-1 overflow-y-auto space-y-0.5 pr-1">
          {NAV_ITEMS.map(item => {
            const active = activeView === item.id
            return (
              <a
                key={item.id}
                href="#"
                onClick={e => { e.preventDefault(); setActiveView(item.id) }}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all cursor-pointer select-none active:scale-95 ${
                  active
                    ? 'text-primary font-bold border-r-4 border-primary bg-blue-50'
                    : 'text-on-surface-variant hover:text-primary hover:bg-gray-50'
                }`}
              >
                <span
                  className="material-symbols-outlined text-[20px]"
                  style={active ? { fontVariationSettings: "'FILL' 1" } : {}}
                >
                  {item.icon}
                </span>
                <span className="text-sm font-semibold">{item.label}</span>
              </a>
            )
          })}
        </nav>

        <div className="mt-auto pt-4 border-t border-gray-100 px-3">
          <div className="flex items-center gap-3">
            {user?.picture ? (
              <img src={user.picture} alt={displayName} className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xs">
                {initials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-on-surface truncate">{displayName}</p>
              <p className="text-xs text-on-surface-variant truncate">{user?.email}</p>
            </div>
            <button onClick={logout} title="Logout" className="p-1 text-on-surface-variant hover:text-error transition-colors rounded-full">
              <span className="material-symbols-outlined text-[20px]">logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ══ MAIN ══ */}
      <main className="flex-1 ml-64 min-h-screen flex flex-col overflow-x-hidden">

        {/* Top bar */}
        <header className="h-16 fixed top-0 right-0 left-64 z-10 bg-white shadow-sm flex justify-between items-center px-10">
          <div className="relative w-96">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
            <input
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-outline-variant bg-gray-50 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
              placeholder="Tìm kiếm gia sư, môn học, người dùng..."
              type="text"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-gray-100 hover:text-primary transition-colors" onClick={fetchData} title="Làm mới">
              <span className="material-symbols-outlined">refresh</span>
            </button>
            <button className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-gray-100 hover:text-primary transition-colors relative">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full" />
            </button>
            <button className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-gray-100 hover:text-primary transition-colors">
              <span className="material-symbols-outlined">help</span>
            </button>
            <div className="h-6 w-px bg-outline-variant mx-1" />
            {user?.picture ? (
              <img src={user.picture} alt={displayName} className="w-8 h-8 rounded-full object-cover border-2 border-transparent hover:border-primary transition-colors" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xs">
                {initials}
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <div className="pt-16">
          {activeView === 'dashboard' && (
            <DashboardView stats={stats} loading={loading} onNavigate={setActiveView} />
          )}
          {activeView === 'tutor-approval' && (
            <TutorApprovalView
              tutors={tutors}
              loading={loading}
              error={error}
              selectedTutor={selectedTutor}
              actionLoading={actionLoading}
              reviewNotes={reviewNotes}
              onSelectTutor={t => { setSelectedTutor(t); setReviewNotes('') }}
              onApprove={handleApprove}
              onReject={openRejectModal}
              onViewDoc={handleViewDoc}
              onRefresh={fetchData}
              setReviewNotes={setReviewNotes}
            />
          )}
          {activeView === 'user-management' && <UserManagementView />}
          {activeView === 'subjects'         && <SubjectsView />}
          {activeView === 'lessons'          && <LessonsView />}
          {activeView === 'transactions'     && <TransactionsView />}
          {activeView === 'complaints'       && <ComplaintsView />}
          {activeView === 'reviews'          && <ReviewsView />}
          {activeView === 'reports'          && <ReportsView />}
          {activeView === 'ai-insights'      && <AIInsightsView />}
          {activeView === 'audit-logs'       && <AuditLogsView />}
          {activeView === 'settings'         && <SettingsView />}
        </div>
      </main>

      {/* ══ REJECT MODAL ══ */}
      {rejectTarget && (
        <ModalOverlay onClose={() => !actionLoading && setRejectTarget(null)}>
          <div className="w-full max-w-md p-8 rounded-2xl shadow-2xl bg-white" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 text-error mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <span className="material-symbols-outlined text-3xl">warning</span>
              </div>
              <h3 className="text-xl font-bold">Từ chối hồ sơ</h3>
            </div>
            <p className="text-sm text-on-surface-variant mb-6">
              Nhập lý do từ chối hồ sơ của <strong>{rejectTarget.full_name}</strong>. Nội dung này sẽ được gửi qua email cho ứng viên.
            </p>
            <div className="mb-6">
              <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">Lý do từ chối</label>
              <textarea
                className="w-full h-32 p-3 rounded-xl border border-outline-variant focus:ring-2 focus:ring-error/20 focus:border-error transition-all resize-none text-sm outline-none"
                placeholder="Ví dụ: Thiếu chứng chỉ chuyên môn, ảnh CCCD không rõ ràng..."
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                disabled={actionLoading}
              />
            </div>
            <div className="flex flex-col gap-3">
              <button
                className="w-full py-3 bg-error text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                onClick={handleRejectConfirm}
                disabled={actionLoading || !rejectReason.trim()}
              >
                {actionLoading ? 'Đang từ chối...' : 'Xác nhận từ chối'}
              </button>
              <button
                className="w-full py-3 text-sm font-bold text-on-surface-variant hover:bg-gray-50 rounded-xl transition-colors disabled:opacity-50"
                onClick={() => setRejectTarget(null)}
                disabled={actionLoading}
              >
                Hủy
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* ══ IMAGE PREVIEW MODAL ══ */}
      {(previewLoading || previewUrl || previewError) && (
        <ModalOverlay onClose={() => { setPreviewUrl(null); setPreviewError(null); setPreviewLoading(false) }}>
          <div className="relative max-w-3xl w-full" onClick={e => e.stopPropagation()}>
            <button
              className="absolute top-2 right-2 z-10 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
              onClick={() => { setPreviewUrl(null); setPreviewError(null); setPreviewLoading(false) }}
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            {previewLoading && (
              <div className="bg-white rounded-2xl shadow-2xl flex flex-col items-center justify-center gap-4 p-12 min-h-[300px]">
                <span className="material-symbols-outlined text-5xl text-primary animate-spin">progress_activity</span>
                <p className="text-sm text-on-surface-variant">Đang tải tài liệu bảo mật...</p>
              </div>
            )}
            {!previewLoading && previewError && (
              <div className="bg-white rounded-2xl shadow-2xl flex flex-col items-center justify-center gap-4 p-12 min-h-[300px]">
                <span className="material-symbols-outlined text-5xl text-error">broken_image</span>
                <p className="text-sm font-bold text-error">Không thể tải tài liệu</p>
                <p className="text-xs text-on-surface-variant text-center">{previewError}</p>
              </div>
            )}
            {!previewLoading && previewUrl && !previewError && (
              <DocImageViewer src={previewUrl} onOpenNewTab={() => window.open(previewUrl, '_blank')} />
            )}
          </div>
        </ModalOverlay>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes growUp { from { transform: scaleY(0); } to { transform: scaleY(1); } }
        .bar-grow { transform-origin: bottom; animation: growUp 1.2s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
      `}</style>
    </div>
  )
}

// ─── Dashboard View ───────────────────────────────────────────────────────────
const BAR_DATA = [
  { month: 'Th1', h: 42 }, { month: 'Th2', h: 52 }, { month: 'Th3', h: 47 },
  { month: 'Th4', h: 68 }, { month: 'Th5', h: 80 }, { month: 'Th6', h: 95 },
]

function DashboardView({ stats, loading, onNavigate }) {
  return (
    <div className="p-10 max-w-[1280px] mx-auto w-full">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-on-background">Tổng quan hệ thống</h2>
        <p className="text-sm text-on-surface-variant mt-1">Phân tích và tóm tắt hoạt động nền tảng.</p>
      </div>

      {/* AI Platform Summary */}
      <div className="bg-white rounded-xl p-6 border-l-4 border-primary shadow-sm mb-6 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <span className="material-symbols-outlined text-[28px]">psychology</span>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-on-background mb-3">Tóm tắt AI nền tảng</h3>
            <div className="flex flex-wrap gap-x-8 gap-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                <span className="text-sm text-on-surface-variant"><strong className="text-on-background">5</strong> hồ sơ thiếu tài liệu</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                <span className="text-sm text-on-surface-variant"><strong className="text-on-background">3</strong> khiếu nại khẩn cấp</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                <span className="text-sm text-on-surface-variant"><strong className="text-on-background">2</strong> giao dịch đáng ngờ</span>
              </div>
            </div>
          </div>
          <button
            className="shrink-0 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors"
            onClick={() => onNavigate('tutor-approval')}
          >
            Xem cảnh báo
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-6 mb-6">
        <OverviewCard icon="group"       iconBg="bg-gray-100"    iconColor="text-on-surface-variant" label="Tổng người dùng"     value="24,592"  trend="+12%" trendUp />
        <OverviewCard icon="school"      iconBg="bg-blue-50"     iconColor="text-blue-700"           label="Học sinh đang học"   value="18,204"  trend="+8%"  trendUp />
        <OverviewCard icon="history_edu" iconBg="bg-indigo-50"   iconColor="text-indigo-700"         label="Gia sư đang hoạt động" value="6,388" trend="+4%"  trendUp />
        <OverviewCard icon="how_to_reg"  iconBg="bg-amber-50"    iconColor="text-amber-700"          label="Hồ sơ chờ duyệt"    value={loading ? '…' : String(stats.pending)} trend="+18%" trendUp={false} />
        <OverviewCard icon="payments"    iconBg="bg-emerald-50"  iconColor="text-emerald-700"        label="Doanh thu tháng"     value="$124.5k" trend="+22%" trendUp />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-12 gap-6">
        {/* Bar Chart */}
        <div className="col-span-8 bg-white rounded-xl p-6 shadow-sm flex flex-col h-[380px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-on-background">Xu hướng tăng trưởng người dùng</h3>
            <select className="bg-gray-50 border border-outline-variant rounded-lg text-xs text-on-surface-variant py-2 pl-3 pr-6 outline-none">
              <option>6 tháng gần đây</option>
              <option>Năm nay</option>
            </select>
          </div>

          <div className="flex-1 flex items-end gap-2 relative">
            {/* Y-axis */}
            <div className="absolute left-0 top-0 bottom-6 w-10 flex flex-col justify-between text-xs text-on-surface-variant text-right pr-1">
              <span>25k</span><span>20k</span><span>15k</span><span>10k</span><span>5k</span>
            </div>
            {/* Grid lines */}
            <div className="absolute left-11 right-0 top-2 bottom-6 flex flex-col justify-between pointer-events-none">
              {[0,1,2,3,4].map(i => <div key={i} className="w-full border-t border-dashed border-gray-100" />)}
            </div>
            {/* Bars */}
            <div className="ml-12 flex-1 flex justify-around items-end h-full pb-6 z-10 gap-1">
              {BAR_DATA.map((d, i) => (
                <div key={i} className="flex flex-col items-center gap-1 flex-1">
                  <div className="w-full flex items-end justify-center" style={{ height: '200px' }}>
                    <div
                      className="w-10 bg-primary rounded-t-sm bar-grow"
                      style={{ height: `${d.h}%`, animationDelay: `${i * 100}ms` }}
                    />
                  </div>
                  <span className="text-[11px] text-on-surface-variant">{d.month}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4 mt-1">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-primary rounded-sm" />
              <span className="text-xs text-on-surface-variant">Người dùng mới</span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="col-span-4 bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-on-background mb-5">Hoạt động gần đây</h3>
          <div className="space-y-4">
            {[
              { icon: 'how_to_reg',   color: 'text-blue-600',    bg: 'bg-blue-50',    text: '12 hồ sơ gia sư mới',         sub: '2 giờ trước' },
              { icon: 'payments',     color: 'text-emerald-600', bg: 'bg-emerald-50', text: 'Doanh thu tăng 22% tháng này', sub: 'Hôm nay' },
              { icon: 'report_problem', color: 'text-amber-600', bg: 'bg-amber-50',  text: '3 khiếu nại cần xử lý',       sub: '5 giờ trước' },
              { icon: 'school',       color: 'text-indigo-600',  bg: 'bg-indigo-50',  text: '150 học sinh mới đăng ký',     sub: 'Hôm qua' },
              { icon: 'verified_user',color: 'text-green-600',   bg: 'bg-green-50',   text: '8 gia sư được duyệt hôm nay', sub: 'Hôm nay' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full ${item.bg} flex items-center justify-center flex-shrink-0 ${item.color}`}>
                  <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-on-surface">{item.text}</p>
                  <p className="text-xs text-on-surface-variant">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick access row */}
      <div className="grid grid-cols-3 gap-6 mt-6">
        {[
          { id: 'tutor-approval',  icon: 'how_to_reg',  label: 'Duyệt gia sư',      desc: 'Xem xét hồ sơ chờ duyệt', count: null, accent: 'border-blue-500' },
          { id: 'complaints',      icon: 'report_problem', label: 'Khiếu nại',    desc: '3 mục khẩn cấp cần xử lý', count: 3, accent: 'border-amber-500' },
          { id: 'transactions',    icon: 'payments',    label: 'Giao dịch',        desc: 'Theo dõi hoạt động thanh toán', count: null, accent: 'border-emerald-500' },
        ].map(item => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`bg-white rounded-xl p-5 shadow-sm border-l-4 ${item.accent} text-left hover:shadow-md transition-shadow group`}
          >
            <div className="flex items-start justify-between mb-3">
              <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors text-[28px]">{item.icon}</span>
              {item.count !== null && (
                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">{item.count}</span>
              )}
            </div>
            <p className="text-sm font-bold text-on-surface">{item.label}</p>
            <p className="text-xs text-on-surface-variant mt-0.5">{item.desc}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Overview Card ────────────────────────────────────────────────────────────
function OverviewCard({ icon, iconBg, iconColor, label, value, trend, trendUp }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center ${iconColor}`}>
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <span className={`flex items-center text-xs font-semibold ${trendUp ? 'text-emerald-600' : 'text-red-600'}`}>
          <span className="material-symbols-outlined text-[15px]">{trendUp ? 'trending_up' : 'trending_down'}</span>
          {trend}
        </span>
      </div>
      <p className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">{label}</p>
      <h4 className="text-2xl font-bold text-on-background">{value}</h4>
    </div>
  )
}

// ─── Tutor Approval View ──────────────────────────────────────────────────────
function TutorApprovalView({ tutors, loading, error, selectedTutor, actionLoading, reviewNotes, onSelectTutor, onApprove, onReject, onViewDoc, onRefresh, setReviewNotes }) {
  const completeness = (() => {
    if (!selectedTutor) return 0
    const hasCert = (selectedTutor.certificates && selectedTutor.certificates.length > 0) || !!selectedTutor.certificate_url
    const fields = [selectedTutor.bio, selectedTutor.subjects, hasCert || null, selectedTutor.cccd_url]
    return Math.round((fields.filter(Boolean).length / fields.length) * 100)
  })()

  const risk = (() => {
    if (!selectedTutor) return {}
    const hasCert = (selectedTutor.certificates && selectedTutor.certificates.length > 0) || !!selectedTutor.certificate_url
    const hasCccd = !!selectedTutor.cccd_url
    if (hasCert && hasCccd) return { level: 'Thấp',       color: 'text-green-600',  bgClass: 'bg-green-50 text-green-700 border-green-200',  icon: 'verified_user', note: 'Không có cảnh báo về tài liệu.' }
    if (hasCert || hasCccd) return { level: 'Trung bình', color: 'text-amber-600',  bgClass: 'bg-amber-50 text-amber-700 border-amber-200',   icon: 'warning',       note: 'Thiếu một tài liệu xác minh.' }
    return                         { level: 'Cao',        color: 'text-red-600',    bgClass: 'bg-red-50 text-red-700 border-red-200',          icon: 'gpp_bad',       note: 'Chưa nộp tài liệu nào.' }
  })()

  return (
    <div className="p-lg flex gap-gutter max-w-[1600px] mx-auto w-full items-start overflow-hidden">

      {/* ── Left Column ── */}
      <div className="flex-[2] flex flex-col gap-md min-w-0">

        {!selectedTutor ? (
          /* ────── DANH SÁCH ────── */
          <>
            {/* Security Notice */}
            <div className="bg-red-50 rounded-xl p-md flex items-start gap-sm border border-red-200">
              <span className="material-symbols-outlined text-red-600 mt-0.5 shrink-0">gpp_bad</span>
              <div>
                <h3 className="text-label-md font-label-md text-red-900 mb-0.5">Thông báo bảo mật</h3>
                <p className="text-label-sm font-label-sm text-red-700">Chỉ quản trị viên mới có thể xem các tài liệu nhạy cảm như chứng chỉ và CCCD / giấy tờ tùy thân.</p>
              </div>
            </div>

            {/* Header */}
            <div className="flex justify-between items-end flex-wrap gap-sm">
              <div>
                <h2 className="text-headline-lg font-headline-lg text-on-surface">Hồ sơ chờ duyệt</h2>
                <p className="text-body-md font-body-md text-on-surface-variant mt-xs">Xem xét và quản lý hồ sơ gia sư mới đăng ký.</p>
              </div>
              <div className="flex gap-2">
                <button className="px-sm py-xs border border-outline-variant rounded-lg text-label-md font-label-md text-on-surface hover:bg-surface-container transition-colors flex items-center gap-1">
                  <span className="material-symbols-outlined text-[18px]">filter_list</span>Lọc
                </button>
                <button onClick={onRefresh} className="px-sm py-xs border border-outline-variant rounded-lg text-label-md font-label-md text-on-surface hover:bg-surface-container transition-colors flex items-center gap-1">
                  <span className="material-symbols-outlined text-[18px]">refresh</span>Làm mới
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="bg-surface-container-lowest rounded-xl shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),0_2px_4px_-2px_rgba(0,0,0,0.05)] border border-surface-variant overflow-hidden">
              {loading && (
                <div className="flex flex-col items-center justify-center gap-md py-16 text-on-surface-variant">
                  <span className="material-symbols-outlined text-5xl animate-spin">progress_activity</span>
                  <p className="text-body-md font-body-md">Đang tải hồ sơ...</p>
                </div>
              )}
              {!loading && error && (
                <div className="flex flex-col items-center justify-center gap-md py-16 text-error">
                  <span className="material-symbols-outlined text-5xl">error_outline</span>
                  <p className="text-body-md font-body-md">{error}</p>
                  <button onClick={onRefresh} className="px-md py-sm bg-primary text-on-primary rounded-lg text-label-md font-label-md hover:opacity-90">Thử lại</button>
                </div>
              )}
              {!loading && !error && tutors.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-md py-16 text-on-surface-variant">
                  <span className="material-symbols-outlined text-5xl" style={{ color: '#166534' }}>task_alt</span>
                  <p className="text-body-md font-body-md">Không có hồ sơ nào đang chờ duyệt. Tuyệt vời!</p>
                </div>
              )}
              {!loading && !error && tutors.length > 0 && (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-surface-container border-b border-surface-variant">
                    <tr>
                      <th className="py-3 px-6 text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wide">Ứng viên</th>
                      <th className="py-3 px-6 text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wide">Môn học</th>
                      <th className="py-3 px-6 text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wide">Kinh nghiệm</th>
                      <th className="py-3 px-6 text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wide text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-variant">
                    {tutors.map(tutor => (
                      <tr
                        key={tutor.id}
                        onClick={() => onSelectTutor(tutor)}
                        className="transition-colors group cursor-pointer hover:bg-surface-container-low"
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-sm">
                            {tutor.profile_photo_url && !tutor.profile_photo_url.startsWith('http://randomuser') ? (
                              <img src={tutor.profile_photo_url} alt={tutor.full_name} className="w-10 h-10 rounded-full object-cover border border-surface-variant" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary text-label-md font-label-md font-bold">
                                {(tutor.full_name || '?').charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-label-md font-label-md text-on-surface truncate max-w-[200px]">{tutor.full_name}</p>
                              <p className="text-label-sm font-label-sm text-on-surface-variant truncate max-w-[200px]">{tutor.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex gap-1 flex-wrap">
                            {(tutor.subjects || 'N/A').split(',').slice(0, 2).map((s, i) => (
                              <span key={i} className="px-2 py-0.5 bg-tertiary-fixed-dim/20 text-primary text-label-sm font-label-sm rounded border border-tertiary-fixed">
                                {s.trim()}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <p className="text-body-md font-body-md text-on-surface">
                            {tutor.experience_years != null ? `${tutor.experience_years} năm` : '—'}
                          </p>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex justify-end items-center gap-xs opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              className="p-1.5 text-primary hover:bg-primary-fixed rounded-full transition-colors disabled:opacity-30"
                              title="Xem chứng chỉ"
                              onClick={e => { e.stopPropagation(); onViewDoc(tutor.certificate_url) }}
                              disabled={!tutor.certificate_url}
                            >
                              <span className="material-symbols-outlined text-[20px]">workspace_premium</span>
                            </button>
                            <button
                              className="p-1.5 text-primary hover:bg-primary-fixed rounded-full transition-colors disabled:opacity-30"
                              title="Xem CCCD"
                              onClick={e => { e.stopPropagation(); onViewDoc(tutor.cccd_url) }}
                              disabled={!tutor.cccd_url}
                            >
                              <span className="material-symbols-outlined text-[20px]">badge</span>
                            </button>
                            <button
                              className="px-sm py-xs rounded-lg text-label-sm font-label-sm border border-primary text-primary hover:bg-primary-fixed transition-colors"
                              onClick={e => { e.stopPropagation(); onSelectTutor(tutor) }}
                            >
                              Xem xét
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {!loading && !error && tutors.length > 0 && (
                <div className="px-6 py-3 bg-surface-container border-t border-surface-variant">
                  <p className="text-label-sm font-label-sm text-on-surface-variant">{tutors.length} hồ sơ đang chờ duyệt</p>
                </div>
              )}
            </div>
          </>
        ) : (
          /* ────── CHI TIẾT HỒ SƠ ────── */
          <>
            {/* Back button */}
            <button
              onClick={() => onSelectTutor(null)}
              className="flex items-center gap-xs text-label-md font-label-md text-primary hover:text-primary/80 transition-colors self-start"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              Quay lại danh sách
            </button>

            {/* Profile Header Card */}
            <div className="bg-surface-container-lowest rounded-xl p-md shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),0_2px_4px_-2px_rgba(0,0,0,0.05)] border border-surface-variant flex items-start gap-md relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-primary-fixed to-tertiary-fixed opacity-50 z-0" />
              <div className="w-32 h-32 rounded-xl bg-surface-container border-4 border-surface-container-lowest overflow-hidden z-10 shadow-sm shrink-0">
                {selectedTutor.profile_photo_url && !selectedTutor.profile_photo_url.startsWith('http://randomuser') ? (
                  <img src={selectedTutor.profile_photo_url} alt={selectedTutor.full_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-primary-fixed flex items-center justify-center text-primary text-4xl font-bold">
                    {(selectedTutor.full_name || '?').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 z-10 pt-md overflow-hidden">
                <div className="flex justify-between items-start gap-sm flex-wrap">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-headline-lg font-headline-lg text-on-surface truncate">{selectedTutor.full_name}</h2>
                    <p className="text-body-lg font-body-lg text-primary mt-xs font-medium line-clamp-2 break-all">
                      {selectedTutor.bio ? selectedTutor.bio.slice(0, 90) + (selectedTutor.bio.length > 90 ? '…' : '') : 'Chưa có thông tin học vị'}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-surface-container-low text-on-surface-variant rounded-full text-label-sm font-label-sm border border-outline-variant shrink-0">
                    <span className="material-symbols-outlined text-[16px]">pending_actions</span>
                    Chờ duyệt
                  </span>
                </div>
                <div className="flex gap-2 mt-md flex-wrap">
                  {(selectedTutor.subjects || 'N/A').split(',').slice(0, 5).map((s, i) => (
                    <span key={i} className="px-3 py-1 bg-tertiary-fixed-dim/20 text-primary rounded border border-tertiary-fixed text-label-sm font-label-sm">
                      {s.trim()}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Professional Summary */}
            {selectedTutor.bio && (
              <div className="bg-surface-container-lowest rounded-xl p-md shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),0_2px_4px_-2px_rgba(0,0,0,0.05)] border border-surface-variant">
                <h3 className="text-headline-md font-headline-md text-on-surface mb-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">person</span>
                  Giới thiệu bản thân
                </h3>
                <p className="text-body-md font-body-md text-on-surface-variant leading-relaxed break-words overflow-hidden">{selectedTutor.bio}</p>
              </div>
            )}

            {/* Teaching Methods */}
            {selectedTutor.teaching_methods && selectedTutor.teaching_methods.length > 0 && (
              <div className="bg-surface-container-lowest rounded-xl p-md shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),0_2px_4px_-2px_rgba(0,0,0,0.05)] border border-surface-variant">
                <h3 className="text-headline-md font-headline-md text-on-surface mb-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">psychology</span>
                  Phương pháp giảng dạy
                </h3>
                <ol className="flex flex-col gap-sm">
                  {selectedTutor.teaching_methods.map((method, i) => (
                    <li key={i} className="flex items-start gap-sm">
                      <span className="flex items-center justify-center w-6 h-6 mt-0.5 rounded-full bg-primary text-white text-xs font-bold shrink-0">{i + 1}</span>
                      <p className="text-body-md font-body-md text-on-surface leading-relaxed">{method}</p>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Suitable Students */}
            {selectedTutor.suitable_students && selectedTutor.suitable_students.length > 0 && (
              <div className="bg-surface-container-lowest rounded-xl p-md shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),0_2px_4px_-2px_rgba(0,0,0,0.05)] border border-surface-variant">
                <h3 className="text-headline-md font-headline-md text-on-surface mb-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">group</span>
                  Đối tượng học sinh phù hợp
                </h3>
                <div className="flex flex-wrap gap-xs">
                  {selectedTutor.suitable_students.map((s, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-label-sm font-label-sm border border-primary/20">
                      <span className="material-symbols-outlined text-[13px]">check_circle</span>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Professional Info */}
            <div className="bg-surface-container-lowest rounded-xl p-md shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),0_2px_4px_-2px_rgba(0,0,0,0.05)] border border-surface-variant">
              <h3 className="text-headline-md font-headline-md text-on-surface mb-md flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">school</span>
                Thông tin chuyên môn
              </h3>
              <div className="flex flex-col gap-sm">
                {[
                  {
                    icon: 'work', bgClass: 'bg-primary-fixed', iconClass: 'text-primary',
                    label: 'Kinh nghiệm giảng dạy',
                    value: selectedTutor.experience_years != null ? `${selectedTutor.experience_years} năm` : 'Chưa cập nhật',
                    verified: selectedTutor.experience_years != null,
                  },
                  {
                    icon: 'payments', bgClass: 'bg-surface-container-highest', iconClass: 'text-on-surface',
                    label: 'Mức học phí',
                    value: selectedTutor.hourly_rate ? `${Number(selectedTutor.hourly_rate).toLocaleString('vi-VN')}đ / giờ` : 'Thỏa thuận',
                    verified: !!selectedTutor.hourly_rate,
                  },
                  {
                    icon: 'mail', bgClass: 'bg-surface-container-highest', iconClass: 'text-on-surface',
                    label: 'Địa chỉ liên hệ',
                    value: selectedTutor.email,
                    verified: true,
                  },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-md p-md rounded-lg bg-surface hover:bg-surface-container-low transition-colors border border-outline-variant/30">
                    <div className={`w-12 h-12 rounded-full ${item.bgClass} flex items-center justify-center shrink-0`}>
                      <span className={`material-symbols-outlined ${item.iconClass}`}>{item.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <h4 className="text-label-md font-label-md text-on-surface">{item.label}</h4>
                      <p className="text-body-md font-body-md text-on-surface-variant truncate break-all">{item.value}</p>
                    </div>
                    {item.verified && (
                      <span className="material-symbols-outlined" style={{ color: '#166534' }} title="Đã xác minh">verified</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Verification Documents */}
            <div className="bg-surface-container-lowest rounded-xl p-md shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),0_2px_4px_-2px_rgba(0,0,0,0.05)] border border-surface-variant flex flex-col gap-md">
              <h3 className="text-headline-md font-headline-md text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">folder_shared</span>
                Tài liệu xác minh
              </h3>

              {/* ── CCCD row ── */}
              <div>
                <p className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wide mb-xs">Giấy tờ tùy thân</p>
                <button
                  className="w-full flex items-center gap-md p-md border rounded-xl transition-all bg-surface text-left disabled:opacity-40 disabled:cursor-not-allowed
                    border-outline-variant hover:border-primary/50 hover:shadow-sm"
                  onClick={() => onViewDoc(selectedTutor.cccd_url)}
                  disabled={!selectedTutor.cccd_url}
                >
                  <div className="w-11 h-11 rounded-xl bg-primary-fixed/30 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary text-2xl">badge</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-label-md font-label-md text-on-surface">CCCD / Giấy tờ tùy thân</p>
                    <p className="text-label-sm font-label-sm text-on-surface-variant mt-0.5">
                      {selectedTutor.cccd_url ? 'Đã tải lên — Nhấn để xem' : 'Chưa nộp'}
                    </p>
                  </div>
                  {selectedTutor.cccd_url && (
                    <span className="material-symbols-outlined text-primary text-[20px] shrink-0">open_in_new</span>
                  )}
                </button>
              </div>

              {/* ── Certificates grid ── */}
              {(() => {
                const certs = (selectedTutor.certificates && selectedTutor.certificates.length > 0)
                  ? selectedTutor.certificates
                  : selectedTutor.certificate_url
                    ? [{ id: 'legacy', name: 'Chứng chỉ', url: selectedTutor.certificate_url }]
                    : []
                return (
                  <div>
                    <p className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wide mb-xs">
                      Chứng chỉ / Bằng cấp
                      {certs.length > 0 && <span className="ml-1 px-1.5 py-0.5 bg-primary/10 text-primary rounded-full">{certs.length}</span>}
                    </p>
                    {certs.length === 0 ? (
                      <div className="flex items-center gap-md p-md border border-dashed border-outline-variant rounded-xl bg-surface opacity-50">
                        <div className="w-11 h-11 rounded-xl bg-surface-container flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-on-surface-variant text-2xl">workspace_premium</span>
                        </div>
                        <div>
                          <p className="text-label-md font-label-md text-on-surface">Chứng chỉ / Bằng cấp</p>
                          <p className="text-label-sm font-label-sm text-on-surface-variant">Chưa nộp tài liệu</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-xs">
                        {certs.map((cert, i) => (
                          <button
                            key={cert.id || i}
                            className="w-full flex items-center gap-md p-md border border-outline-variant rounded-xl hover:border-primary/50 hover:shadow-sm transition-all bg-surface text-left"
                            onClick={() => onViewDoc(cert.url)}
                          >
                            <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                              <span className="material-symbols-outlined text-amber-600 text-2xl">workspace_premium</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-label-md font-label-md text-on-surface truncate">
                                {cert.name && cert.name !== 'Chứng chỉ' ? cert.name : `Chứng chỉ ${i + 1}`}
                              </p>
                              <p className="text-label-sm font-label-sm text-on-surface-variant mt-0.5">
                                {[cert.issuer, cert.issue_year].filter(Boolean).join(' · ') || 'Nhấn để xem'}
                              </p>
                            </div>
                            <span className="material-symbols-outlined text-primary text-[20px] shrink-0">open_in_new</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          </>
        )}
      </div>

      {/* ── Right Column: AI Review Assistant ── */}
      <div className="w-[360px] shrink-0 flex flex-col gap-md sticky top-[88px]">

        {/* AI Header glassmorphism */}
        <div className="bg-surface-container-lowest/80 backdrop-blur-md rounded-xl p-md shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),0_2px_4px_-2px_rgba(0,0,0,0.05)] border border-primary-fixed/50 relative overflow-hidden" style={{ borderTopWidth: '4px', borderTopColor: 'var(--tw-color-primary, #00288e)' }}>
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary-fixed rounded-full blur-2xl opacity-50 pointer-events-none" />
          <h3 className="text-headline-md font-headline-md text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">psychology</span>
            Trợ lý AI xem xét
          </h3>
          <p className="text-label-sm font-label-sm text-on-surface-variant mt-xs">Phân tích sơ bộ tự động</p>
        </div>

        {!selectedTutor ? (
          <div className="bg-surface-container-lowest rounded-xl p-md shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] border border-surface-variant flex flex-col items-center justify-center gap-sm py-16 text-center">
            <span className="material-symbols-outlined text-5xl text-outline">person_search</span>
            <p className="text-body-md font-body-md text-on-surface-variant">Chọn một gia sư từ danh sách để bắt đầu xem xét hồ sơ.</p>
          </div>
        ) : (
          <>
            {/* Verification Status */}
            <div className="bg-surface-container-lowest rounded-xl p-md shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] border border-surface-variant">
              <h4 className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider mb-sm">Trạng thái xác minh</h4>
              <ul className="flex flex-col gap-sm">
                {[
                  { label: 'Kiểm tra danh tính (CCCD)',  icon: 'badge',   ok: !!selectedTutor.cccd_url },
                  { label: 'Xác minh bằng cấp / chứng chỉ', icon: 'school', ok: (selectedTutor.certificates && selectedTutor.certificates.length > 0) || !!selectedTutor.certificate_url },
                  { label: 'Kiểm tra lý lịch',            icon: 'policy',  ok: risk.level === 'Thấp' },
                ].map(item => (
                  <li key={item.label} className="flex items-center justify-between text-body-md font-body-md">
                    <span className="flex items-center gap-2 text-on-surface">
                      <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '18px' }}>{item.icon}</span>
                      {item.label}
                    </span>
                    <span className="material-symbols-outlined" style={{ color: item.ok ? '#166534' : '#ba1a1a' }}>
                      {item.ok ? 'check_circle' : 'cancel'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Sentiment & Match Score */}
            <div className="bg-surface-container-lowest rounded-xl p-md shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] border border-surface-variant">
              <div className="mb-md">
                <h4 className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider mb-2">Đánh giá hồ sơ</h4>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-3 py-1 rounded-full text-label-md font-label-md border ${risk.bgClass}`}>
                    Rủi ro {risk.level}
                  </span>
                  {completeness >= 75 && (
                    <span className="px-3 py-1 bg-surface-container-high rounded-full text-label-md font-label-md text-on-surface border border-outline-variant">
                      Hồ sơ đầy đủ
                    </span>
                  )}
                </div>
              </div>
              <div>
                <h4 className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider mb-2 flex justify-between items-center">
                  <span>Độ phù hợp nền tảng</span>
                  <span className="text-primary font-bold text-label-md font-label-md">{completeness}%</span>
                </h4>
                <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${completeness}%` }} />
                </div>
                <p className="text-label-sm font-label-sm text-on-surface-variant mt-2">
                  {completeness >= 75 ? 'Hồ sơ đáp ứng tốt yêu cầu của nền tảng.' : 'Hồ sơ cần bổ sung thêm thông tin.'}
                </p>
              </div>
            </div>

            {/* Review Notes */}
            <div className="bg-surface-container-lowest rounded-xl p-md shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] border border-surface-variant">
              <label className="block text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider mb-2">
                Ghi chú xem xét <span className="font-normal normal-case">(đính kèm trong email)</span>
              </label>
              <textarea
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-sm text-body-md font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                placeholder="Thêm ghi chú hoặc nhận xét cho ứng viên..."
                rows={3}
                value={reviewNotes}
                onChange={e => setReviewNotes(e.target.value)}
              />
            </div>

            {/* Final Decision */}
            <div className="bg-surface-container-lowest rounded-xl p-md shadow-[0_10px_15px_-3px_rgba(0,0,0,0.08)] border border-primary-fixed">
              <h4 className="text-label-md font-label-md text-on-surface mb-sm">Quyết định cuối cùng</h4>
              <div className="flex flex-col gap-sm">
                <button
                  className="w-full min-h-[48px] bg-primary text-on-primary rounded-lg text-label-md font-label-md hover:bg-primary-container transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
                  onClick={() => onApprove(selectedTutor.id)}
                  disabled={actionLoading}
                >
                  <span className="material-symbols-outlined">check</span>
                  {actionLoading ? 'Đang xử lý...' : 'Duyệt gia sư'}
                </button>
                <button
                  className="w-full min-h-[48px] bg-surface-container text-on-surface rounded-lg text-label-md font-label-md hover:bg-surface-container-high transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 border border-outline-variant flex items-center justify-center gap-2 disabled:opacity-40"
                  onClick={() => onViewDoc((selectedTutor.certificates && selectedTutor.certificates[0]?.url) || selectedTutor.certificate_url || selectedTutor.cccd_url)}
                  disabled={!(selectedTutor.certificates && selectedTutor.certificates.length > 0) && !selectedTutor.certificate_url && !selectedTutor.cccd_url}
                >
                  <span className="material-symbols-outlined">info</span>
                  Yêu cầu bổ sung thông tin
                </button>
                <button
                  className="w-full min-h-[48px] bg-transparent text-error rounded-lg text-label-md font-label-md hover:bg-error-container/20 transition-colors focus:outline-none focus:ring-2 focus:ring-error focus:ring-offset-2 flex items-center justify-center gap-2 disabled:opacity-50"
                  onClick={() => onReject(selectedTutor)}
                  disabled={actionLoading}
                >
                  <span className="material-symbols-outlined">close</span>
                  Từ chối đơn ứng tuyển
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── User Detail Panel ────────────────────────────────────────────────────────
function UserDetailPanel({ user, detail, loading, onBan, actionId }) {
  const roleColor  = r => ({ admin:'bg-purple-100 text-purple-700', tutor:'bg-indigo-100 text-indigo-700', student:'bg-blue-100 text-blue-700', parent:'bg-green-100 text-green-700' }[r] ?? 'bg-gray-100 text-gray-600')
  const statusColor = b => b ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'
  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—'
  const fmtCurrency = v => v != null ? `${Number(v).toLocaleString('vi-VN')} ₫/hr` : '—'

  if (!user) return (
    <div className="bg-white rounded-xl shadow-sm border border-outline-variant p-8 flex flex-col items-center justify-center gap-3 text-center min-h-[320px]">
      <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
        <span className="material-symbols-outlined text-3xl text-on-surface-variant">person_search</span>
      </div>
      <p className="text-sm font-semibold text-on-surface">Chọn người dùng</p>
      <p className="text-xs text-on-surface-variant">Nhấp vào một hàng để xem thông tin hồ sơ.</p>
    </div>
  )

  return (
    <div className="bg-white rounded-xl shadow-sm border border-outline-variant overflow-hidden">
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 px-5 pt-6 pb-5 flex flex-col items-center gap-2 text-center border-b border-outline-variant">
        {detail?.picture ? (
          <img src={detail.picture} alt={detail.full_name} className="w-16 h-16 rounded-full object-cover ring-4 ring-white shadow-sm" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-2xl ring-4 ring-white shadow-sm">
            {(user.full_name || user.email || '?').charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <p className="text-base font-bold text-on-surface">{user.full_name || '—'}</p>
          <p className="text-xs text-on-surface-variant mt-0.5">{user.email}</p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${roleColor(user.role)}`}>{user.role}</span>
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor(user.is_banned)}`}>
            {user.is_banned ? 'Bị khóa' : 'Hoạt động'}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-on-surface-variant text-sm">
          <span className="material-symbols-outlined text-xl animate-spin">progress_activity</span> Đang tải…
        </div>
      ) : detail ? (
        <div className="px-5 py-4 space-y-4 text-sm">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Thông tin cơ bản</p>
            <InfoRow icon="badge" label="Mã người dùng" value={`#${detail.id}`} />
            <InfoRow icon="calendar_today" label="Ngày tham gia" value={fmtDate(detail.created_at)} />
            {detail.google_id && <InfoRow icon="account_circle" label="Xác thực" value="Google OAuth" />}
            {detail.login_logs?.[0] && (
              <div className="flex items-start gap-2">
                <span className={`material-symbols-outlined text-[15px] mt-0.5 ${detail.login_logs[0].is_suspicious ? 'text-orange-500' : 'text-on-surface-variant'}`}>
                  {detail.login_logs[0].is_suspicious ? 'gpp_maybe' : 'router'}
                </span>
                <span className="text-xs text-on-surface-variant min-w-[80px]">IP gần nhất</span>
                <div className="flex-1 text-right">
                  <span className={`text-xs font-mono font-semibold ${detail.login_logs[0].is_suspicious ? 'text-orange-600' : 'text-on-surface'}`}>
                    {detail.login_logs[0].ip_address}
                  </span>
                  {detail.login_logs[0].is_suspicious && (
                    <span className="ml-1 text-[10px] font-bold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded">IP mới</span>
                  )}
                  <p className="text-[10px] text-on-surface-variant mt-0.5">
                    {new Date(detail.login_logs[0].created_at).toLocaleString('vi-VN')}
                  </p>
                </div>
              </div>
            )}
            {!detail.login_logs?.length && (
              <InfoRow icon="router" label="IP gần nhất" value="Chưa có dữ liệu" />
            )}
          </div>

          {detail.role === 'tutor' && detail.tutor_profile && (
            <div className="space-y-2 pt-2 border-t border-outline-variant">
              <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Hồ sơ gia sư</p>
              <InfoRow icon="menu_book" label="Môn học" value={detail.tutor_profile.subjects?.join(', ') || '—'} />
              <InfoRow icon="work" label="Kinh nghiệm" value={detail.tutor_profile.experience_years != null ? `${detail.tutor_profile.experience_years} năm` : '—'} />
              <InfoRow icon="payments" label="Học phí" value={fmtCurrency(detail.tutor_profile.hourly_rate)} />
              <InfoRow icon="verified_user" label="Trạng thái duyệt" value={detail.tutor_profile.status || '—'} />
              {detail.tutor_profile.reject_reason && (
                <InfoRow icon="cancel" label="Lý do từ chối" value={detail.tutor_profile.reject_reason} />
              )}
              {detail.tutor_profile.bio && (
                <div>
                  <p className="text-xs text-on-surface-variant mb-1 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px]">description</span>Giới thiệu
                  </p>
                  <p className="text-xs text-on-surface bg-gray-50 rounded-lg p-2.5 leading-relaxed">{detail.tutor_profile.bio}</p>
                </div>
              )}
            </div>
          )}

          {detail.role === 'tutor' && !detail.tutor_profile && (
            <div className="pt-2 border-t border-outline-variant">
              <p className="text-xs text-on-surface-variant italic">Chưa có hồ sơ gia sư nào được nộp.</p>
            </div>
          )}

          {detail.role === 'student' && (
            <div className="space-y-2 pt-2 border-t border-outline-variant">
              <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Thống kê học tập</p>
              <InfoRow icon="quiz" label="Số lần làm bài" value={detail.quiz_attempts ?? 0} />
            </div>
          )}

          {detail.login_logs?.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-outline-variant">
              <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">history</span>
                Lịch sử đăng nhập
              </p>
              <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
                {detail.login_logs.map((log, i) => (
                  <div key={i} className={`flex items-start gap-2 p-2 rounded-lg text-xs ${log.is_suspicious ? 'bg-orange-50 border border-orange-200' : 'bg-surface-container-low'}`}>
                    <span className={`material-symbols-outlined text-[14px] mt-0.5 shrink-0 ${log.is_suspicious ? 'text-orange-500' : 'text-on-surface-variant'}`}>
                      {log.is_suspicious ? 'gpp_maybe' : 'check_circle'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-on-surface truncate">{log.ip_address}</p>
                      <p className="text-on-surface-variant truncate">{new Date(log.created_at).toLocaleString('vi-VN')}</p>
                    </div>
                    {log.is_suspicious && <span className="shrink-0 text-[10px] font-bold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded">IP mới</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {user.role !== 'admin' && (
            <div className="pt-3 border-t border-outline-variant">
              <button
                onClick={() => onBan(user)}
                disabled={actionId === user.id}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${user.is_banned ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {actionId === user.id ? 'progress_activity' : user.is_banned ? 'lock_open' : 'block'}
                </span>
                {user.is_banned ? 'Bỏ khóa tài khoản' : 'Khóa tài khoản'}
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-2">
      <span className="material-symbols-outlined text-[15px] text-on-surface-variant mt-0.5 flex-shrink-0">{icon}</span>
      <span className="text-xs text-on-surface-variant min-w-[80px]">{label}</span>
      <span className="text-xs text-on-surface font-medium flex-1 text-right">{String(value)}</span>
    </div>
  )
}

// ─── User Management View ─────────────────────────────────────────────────────
function UserManagementView() {
  const { token } = useAuth()

  const [users,         setUsers]         = useState([])
  const [total,         setTotal]         = useState(0)
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState(null)
  const [search,        setSearch]        = useState('')
  const [roleFilter,    setRoleFilter]    = useState('all')
  const [page,          setPage]          = useState(1)
  const [actionId,      setActionId]      = useState(null)
  const [toast,         setUMToast]       = useState(null)
  const [selectedUser,  setSelectedUser]  = useState(null)   // row clicked
  const [detail,        setDetail]        = useState(null)   // full profile from API
  const [detailLoading, setDetailLoading] = useState(false)

  const LIMIT = 20
  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  // Debounce search — fetch after 350ms idle
  useEffect(() => {
    const t = setTimeout(() => fetchUsers(1), 350)
    return () => clearTimeout(t)
  }, [search, roleFilter])        // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchUsers(page) }, [page])  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setUMToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  async function fetchUsers(p = 1) {
    setLoading(true); setError(null)
    try {
      const params = new URLSearchParams({ search, role: roleFilter, page: p, limit: LIMIT })
      const data = await authFetch(`${API}/api/admin/users?${params}`, token)
      setUsers(data.users)
      setTotal(data.total)
      setPage(p)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  async function fetchDetail(userId) {
    setDetailLoading(true)
    try {
      const data = await authFetch(`${API}/api/admin/users/${userId}`, token)
      setDetail(data)
    } catch (err) {
      setUMToast({ msg: `Không thể tải thông tin người dùng: ${err.message}`, type: 'error' })
    } finally { setDetailLoading(false) }
  }

  function handleSelectUser(u) {
    setSelectedUser(u)
    setDetail(null)
    fetchDetail(u.id)
  }

  async function handleBan(u) {
    setActionId(u.id)
    try {
      const updated = await authFetch(`${API}/api/admin/users/${u.id}/ban`, token, {
        method: 'PATCH',
        body: JSON.stringify({ banned: !u.is_banned }),
      })
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_banned: updated.is_banned } : x))
      // sync detail panel if this user is open
      if (selectedUser?.id === u.id) setDetail(prev => prev ? { ...prev, is_banned: updated.is_banned } : prev)
      setUMToast({ msg: updated.is_banned ? `${u.full_name} đã bị khóa tài khoản.` : `${u.full_name} đã được bỏ khóa.`, type: 'success' })
    } catch (err) {
      setUMToast({ msg: `Thao tác thất bại: ${err.message}`, type: 'error' })
    } finally { setActionId(null) }
  }

  async function handleRoleChange(u, newRole) {
    setActionId(u.id)
    try {
      const updated = await authFetch(`${API}/api/admin/users/${u.id}/role`, token, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      })
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, role: updated.role } : x))
      if (selectedUser?.id === u.id) setDetail(prev => prev ? { ...prev, role: updated.role } : prev)
      setUMToast({ msg: `Đã thay đổi vai trò của ${u.full_name} thành ${newRole}.`, type: 'success' })
    } catch (err) {
      setUMToast({ msg: `Thay đổi vai trò thất bại: ${err.message}`, type: 'error' })
    } finally { setActionId(null) }
  }

  const statusColor = isBanned => isBanned ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
  const roleColor   = r => r === 'tutor' ? 'bg-indigo-100 text-indigo-700' : r === 'admin' ? 'bg-amber-100 text-amber-700' : r === 'parent' ? 'bg-purple-100 text-purple-700' : 'bg-blue-50 text-blue-700'

  const banned  = users.filter(u => u.is_banned).length
  const tutors  = users.filter(u => u.role === 'tutor').length
  const students = users.filter(u => u.role === 'student').length

  return (
    <div className="p-10 max-w-[1600px] mx-auto">

      {toast && (
        <div className={`fixed top-4 right-4 z-[999] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          <span className="material-symbols-outlined text-[18px]">{toast.type === 'success' ? 'check_circle' : 'error'}</span>
          {toast.msg}
        </div>
      )}

      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-bold text-on-background">Quản lý người dùng</h2>
          <p className="text-sm text-on-surface-variant mt-1">Quản lý người dùng nền tảng — học sinh, gia sư và phụ huynh.</p>
        </div>
        <button onClick={() => fetchUsers(page)} className="px-4 py-2 border border-outline-variant rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-gray-50 transition-colors">
          <span className="material-symbols-outlined text-[18px]">refresh</span> Làm mới
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Tổng người dùng',    value: total,    icon: 'group',       bg: 'bg-gray-100',  color: 'text-on-surface-variant' },
          { label: 'Học sinh',          value: students, icon: 'school',      bg: 'bg-blue-50',   color: 'text-blue-700' },
          { label: 'Gia sư',            value: tutors,   icon: 'history_edu', bg: 'bg-indigo-50', color: 'text-indigo-700' },
          { label: 'Bị khóa',           value: banned,   icon: 'block',       bg: 'bg-red-50',    color: 'text-red-600' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl p-5 shadow-sm border border-outline-variant">
            <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center ${c.color} mb-3`}>
              <span className="material-symbols-outlined">{c.icon}</span>
            </div>
            <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1">{c.label}</p>
            <p className="text-2xl font-bold text-on-background">{loading ? '…' : c.value}</p>
          </div>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="flex gap-6 items-start">

        {/* Left: table */}
        <div className="flex-1 min-w-0 bg-white rounded-xl shadow-sm border border-outline-variant overflow-hidden">
          {/* Filters */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-outline-variant flex-wrap">
            <div className="relative flex-1 max-w-xs">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
              <input
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-outline-variant rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                placeholder="Tìm theo tên hoặc email..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
              />
            </div>
            {[['all','Tất cả'], ['student','Học sinh'], ['tutor','Gia sư'], ['parent','Phụ huynh']].map(([val, label]) => (
              <button key={val} onClick={() => { setRoleFilter(val); setPage(1) }}
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${roleFilter === val ? 'bg-primary text-white' : 'bg-gray-100 text-on-surface-variant hover:bg-gray-200'}`}>
                {label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-on-surface-variant">
              <span className="material-symbols-outlined text-5xl animate-spin">progress_activity</span>
              <p className="text-sm">Đang tải người dùng...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-error">
              <span className="material-symbols-outlined text-5xl">error_outline</span>
              <p className="text-sm">{error}</p>
              <button onClick={() => fetchUsers(page)} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold">Thử lại</button>
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-on-surface-variant">
              <span className="material-symbols-outlined text-5xl">manage_search</span>
              <p className="text-sm">Không tìm thấy người dùng.</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-outline-variant">
                <tr>
                  <th className="py-3 px-5 text-xs font-semibold text-on-surface-variant uppercase">Người dùng</th>
                  <th className="py-3 px-5 text-xs font-semibold text-on-surface-variant uppercase">Vai trò</th>
                  <th className="py-3 px-5 text-xs font-semibold text-on-surface-variant uppercase">Trạng thái</th>
                  <th className="py-3 px-5 text-xs font-semibold text-on-surface-variant uppercase">Ngày tham gia</th>
                  <th className="py-3 px-5 text-xs font-semibold text-on-surface-variant uppercase text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {users.map(u => {
                  const isSelected = selectedUser?.id === u.id
                  return (
                    <tr
                      key={u.id}
                      onClick={() => handleSelectUser(u)}
                      className={`transition-colors group cursor-pointer ${isSelected ? 'bg-blue-50' : u.is_banned ? 'opacity-60 hover:bg-gray-50' : 'hover:bg-gray-50'}`}
                    >
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          {u.picture ? (
                            <img src={u.picture} alt={u.full_name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                              {(u.full_name || u.email || '?').charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-on-surface truncate">{u.full_name || '—'}</p>
                            <p className="text-xs text-on-surface-variant truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-5">
                        {u.role === 'admin' ? (
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${roleColor(u.role)}`}>{u.role}</span>
                        ) : (
                          <select
                            value={u.role}
                            disabled={!!actionId}
                            onClick={e => e.stopPropagation()}
                            onChange={e => { e.stopPropagation(); handleRoleChange(u, e.target.value) }}
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold border-0 outline-none cursor-pointer ${roleColor(u.role)}`}
                          >
                            <option value="student">học sinh</option>
                            <option value="tutor">gia sư</option>
                            <option value="parent">phụ huynh</option>
                          </select>
                        )}
                      </td>
                      <td className="py-3.5 px-5">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor(u.is_banned)}`}>
                          {u.is_banned ? 'Bị khóa' : 'Hoạt động'}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-xs text-on-surface-variant whitespace-nowrap">{fmtDate(u.created_at)}</td>
                      <td className="py-3.5 px-5 text-right">
                        {u.role !== 'admin' && (
                          <button
                            onClick={e => { e.stopPropagation(); handleBan(u) }}
                            disabled={actionId === u.id}
                            title={u.is_banned ? 'Bỏ khóa' : 'Khóa'}
                            className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 opacity-0 group-hover:opacity-100 ${u.is_banned ? 'hover:bg-green-50 text-green-600' : 'hover:bg-red-50 text-red-500'}`}
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {actionId === u.id ? 'progress_activity' : u.is_banned ? 'lock_open' : 'block'}
                            </span>
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}

          {/* Pagination */}
          {!loading && !error && total > 0 && (
            <div className="px-5 py-3 bg-gray-50 border-t border-outline-variant flex justify-between items-center">
              <p className="text-xs text-on-surface-variant">
                {total > LIMIT
                  ? `Hiển thị ${(page-1)*LIMIT+1}–${Math.min(page*LIMIT,total)} trong ${total}`
                  : `${total} người dùng`}
              </p>
              {total > LIMIT && (
                <div className="flex gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}
                    className="w-7 h-7 rounded-lg text-xs font-semibold bg-gray-100 text-on-surface-variant hover:bg-gray-200 disabled:opacity-40">‹</button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const p = Math.min(Math.max(page-2,1)+i, totalPages)
                    return (
                      <button key={p} onClick={() => setPage(p)}
                        className={`w-7 h-7 rounded-lg text-xs font-semibold ${p===page ? 'bg-primary text-white' : 'bg-gray-100 text-on-surface-variant hover:bg-gray-200'}`}>
                        {p}
                      </button>
                    )
                  })}
                  <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages}
                    className="w-7 h-7 rounded-lg text-xs font-semibold bg-gray-100 text-on-surface-variant hover:bg-gray-200 disabled:opacity-40">›</button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: user detail panel */}
        <div className="w-[340px] flex-shrink-0">
          <UserDetailPanel
            user={selectedUser}
            detail={detail}
            loading={detailLoading}
            onBan={handleBan}
            onRoleChange={handleRoleChange}
            actionId={actionId}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Subjects View ────────────────────────────────────────────────────────────
const MOCK_SUBJECTS = [
  { id: 1, name: 'Mathematics',     tutors: 142, students: 1840, icon: 'calculate',       color: 'bg-blue-100 text-blue-700' },
  { id: 2, name: 'Physics',         tutors: 98,  students: 1210, icon: 'science',          color: 'bg-indigo-100 text-indigo-700' },
  { id: 3, name: 'Chemistry',       tutors: 76,  students: 980,  icon: 'biotech',          color: 'bg-purple-100 text-purple-700' },
  { id: 4, name: 'English',         tutors: 220, students: 3400, icon: 'translate',        color: 'bg-green-100 text-green-700' },
  { id: 5, name: 'Computer Science',tutors: 185, students: 2750, icon: 'code',             color: 'bg-cyan-100 text-cyan-700' },
  { id: 6, name: 'History',         tutors: 54,  students: 720,  icon: 'history_edu',      color: 'bg-amber-100 text-amber-700' },
  { id: 7, name: 'Biology',         tutors: 67,  students: 890,  icon: 'grass',            color: 'bg-emerald-100 text-emerald-700' },
  { id: 8, name: 'Literature',      tutors: 88,  students: 1100, icon: 'auto_stories',     color: 'bg-rose-100 text-rose-700' },
  { id: 9, name: 'Economics',       tutors: 61,  students: 810,  icon: 'bar_chart',        color: 'bg-orange-100 text-orange-700' },
]

function SubjectsView() {
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')

  const filtered = MOCK_SUBJECTS.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="p-10 max-w-[1280px] mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-bold text-on-background">Môn học</h2>
          <p className="text-sm text-on-surface-variant mt-1">Quản lý các môn học trên nền tảng.</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-primary/90 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">add</span> Thêm môn học
        </button>
      </div>

      <div className="mb-6">
        <div className="relative max-w-sm">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
          <input
            className="w-full pl-9 pr-4 py-2 bg-white border border-outline-variant rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 shadow-sm"
            placeholder="Tìm kiếm môn học..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {filtered.map(s => (
          <div key={s.id} className="bg-white rounded-xl p-6 shadow-sm border border-outline-variant hover:shadow-md transition-shadow group">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${s.color}`}>
                <span className="material-symbols-outlined text-[24px]">{s.icon}</span>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-1.5 hover:bg-amber-50 rounded-lg text-amber-600 transition-colors">
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                </button>
                <button className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 transition-colors">
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            </div>
            <h3 className="text-base font-bold text-on-surface mb-3">{s.name}</h3>
            <div className="flex gap-4">
              <div>
                <p className="text-2xl font-bold text-primary">{s.tutors}</p>
                <p className="text-xs text-on-surface-variant">Gia sư</p>
              </div>
              <div className="w-px bg-outline-variant" />
              <div>
                <p className="text-2xl font-bold text-on-surface">{s.students.toLocaleString()}</p>
                <p className="text-xs text-on-surface-variant">Học sinh</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-outline-variant">
              <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-primary h-full rounded-full" style={{ width: `${Math.min(100, (s.tutors / 250) * 100)}%` }} />
              </div>
              <p className="text-xs text-on-surface-variant mt-1">{Math.round((s.tutors / 250) * 100)}% công suất gia sư</p>
            </div>
          </div>
        ))}
      </div>

      {showAdd && (
        <ModalOverlay onClose={() => setShowAdd(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-on-surface mb-4">Thêm môn học mới</h3>
            <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">Tên môn học</label>
            <input
              className="w-full px-4 py-2 border border-outline-variant rounded-lg text-sm focus:outline-none focus:border-primary mb-6"
              placeholder="Ví dụ: Vật lý nâng cao"
              value={newName}
              onChange={e => setNewName(e.target.value)}
            />
            <div className="flex gap-3">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 bg-primary text-white rounded-lg text-sm font-bold hover:opacity-90 transition-opacity">
                Thêm môn học
              </button>
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 bg-gray-100 text-on-surface-variant rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors">
                Hủy
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  )
}

// ─── Lessons View ─────────────────────────────────────────────────────────────
const MOCK_LESSONS = [
  { id: 'L001', title: 'Nhập môn Giải tích',            tutor: 'Trần Thị Bích',   subject: 'Toán học',     status: 'Hoạt động',  date: '2024-06-01', students: 24 },
  { id: 'L002', title: 'Các định luật Newton',          tutor: 'Phạm Quỳnh Anh',  subject: 'Vật lý',       status: 'Hoạt động',  date: '2024-06-03', students: 18 },
  { id: 'L003', title: 'Cơ sở Hóa học Hữu cơ',         tutor: 'Bùi Phương Thảo', subject: 'Hóa học',      status: 'Bản nháp',   date: '2024-06-05', students: 0  },
  { id: 'L004', title: 'Nắm vững Ngữ pháp tiếng Anh',  tutor: 'Trần Thị Bích',   subject: 'Tiếng Anh',    status: 'Hoạt động',  date: '2024-06-07', students: 51 },
  { id: 'L005', title: 'Cấu trúc dữ liệu & Thuật toán', tutor: 'Phạm Quỳnh Anh', subject: 'CNTT',         status: 'Hoạt động',  date: '2024-06-09', students: 37 },
  { id: 'L006', title: 'Lịch sử Chiến tranh Việt Nam',  tutor: 'Bùi Phương Thảo', subject: 'Lịch sử',     status: 'Lưu trữ',    date: '2024-05-20', students: 12 },
]

function LessonsView() {
  const [statusFilter, setStatusFilter] = useState('Tất cả')
  const statusColor = s => s === 'Hoạt động' ? 'bg-green-100 text-green-700' : s === 'Bản nháp' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
  const filtered = statusFilter === 'Tất cả' ? MOCK_LESSONS : MOCK_LESSONS.filter(l => l.status === statusFilter)

  return (
    <div className="p-10 max-w-[1280px] mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-bold text-on-background">Bài học</h2>
          <p className="text-sm text-on-surface-variant mt-1">Theo dõi tất cả nội dung bài học đã được đăng tải.</p>
        </div>
        <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-primary/90">
          <span className="material-symbols-outlined text-[18px]">download</span> Xuất
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-outline-variant overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-outline-variant">
          {['Tất cả','Hoạt động','Bản nháp','Lưu trữ'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${statusFilter === s ? 'bg-primary text-white' : 'bg-gray-100 text-on-surface-variant hover:bg-gray-200'}`}
            >
              {s}
            </button>
          ))}
          <div className="ml-auto relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
            <input className="pl-9 pr-4 py-2 bg-gray-50 border border-outline-variant rounded-lg text-sm focus:outline-none focus:border-primary w-56" placeholder="Tìm kiếm bài học..." />
          </div>
        </div>

        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-outline-variant">
            <tr>
              <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase">Bài học</th>
              <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase">Gia sư</th>
              <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase">Môn học</th>
              <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase">Học sinh</th>
              <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase">Trạng thái</th>
              <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase">Ngày tạo</th>
              <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {filtered.map(l => (
              <tr key={l.id} className="hover:bg-gray-50 transition-colors group">
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-[18px]">menu_book</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-on-surface">{l.title}</p>
                      <p className="text-xs text-on-surface-variant">#{l.id}</p>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-6 text-sm text-on-surface">{l.tutor}</td>
                <td className="py-4 px-6">
                  <span className="px-2.5 py-1 bg-blue-50 text-primary text-xs font-semibold rounded">{l.subject}</span>
                </td>
                <td className="py-4 px-6 text-sm text-on-surface">{l.students}</td>
                <td className="py-4 px-6">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor(l.status)}`}>{l.status}</span>
                </td>
                <td className="py-4 px-6 text-sm text-on-surface-variant">{fmtDate(l.date)}</td>
                <td className="py-4 px-6 text-right">
                  <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 hover:bg-blue-50 rounded-lg text-primary transition-colors">
                      <span className="material-symbols-outlined text-[18px]">visibility</span>
                    </button>
                    <button className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 transition-colors">
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Transactions View ────────────────────────────────────────────────────────
const MOCK_TXN = [
  { id: 'TXN-4821', user: 'Nguyễn Văn An',   tutor: 'Trần Thị Bích',   amount: 250000,  status: 'Hoàn thành',  date: '2024-06-10' },
  { id: 'TXN-4820', user: 'Hoàng Đức Mạnh',  tutor: 'Phạm Quỳnh Anh',  amount: 180000,  status: 'Hoàn thành',  date: '2024-06-10' },
  { id: 'TXN-4819', user: 'Đỗ Thanh Long',   tutor: 'Bùi Phương Thảo', amount: 320000,  status: 'Chờ xử lý',   date: '2024-06-09' },
  { id: 'TXN-4818', user: 'Lê Minh Cường',   tutor: 'Trần Thị Bích',   amount: 200000,  status: 'Đã hoàn tiền', date: '2024-06-08' },
  { id: 'TXN-4817', user: 'Phạm Quỳnh Anh',  tutor: 'Bùi Phương Thảo', amount: 150000,  status: 'Hoàn thành',  date: '2024-06-07' },
  { id: 'TXN-4816', user: 'Nguyễn Văn An',   tutor: 'Phạm Quỳnh Anh',  amount: 280000,  status: 'Thất bại',    date: '2024-06-06' },
  { id: 'TXN-4815', user: 'Đỗ Thanh Long',   tutor: 'Trần Thị Bích',   amount: 200000,  status: 'Hoàn thành',  date: '2024-06-05' },
]

function TransactionsView() {
  const [statusFilter, setStatusFilter] = useState('Tất cả')
  const statusColor = s => ({
    'Hoàn thành':  'bg-green-100 text-green-700',
    'Chờ xử lý':   'bg-amber-100 text-amber-700',
    'Đã hoàn tiền':'bg-blue-100 text-blue-700',
    'Thất bại':    'bg-red-100 text-red-600',
  }[s] || 'bg-gray-100 text-gray-600')
  const fmt = n => 'đ' + n.toLocaleString('vi-VN')
  const filtered = statusFilter === 'Tất cả' ? MOCK_TXN : MOCK_TXN.filter(t => t.status === statusFilter)

  const totalRev = MOCK_TXN.filter(t => t.status === 'Hoàn thành').reduce((a, t) => a + t.amount, 0)

  return (
    <div className="p-10 max-w-[1280px] mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-bold text-on-background">Giao dịch</h2>
          <p className="text-sm text-on-surface-variant mt-1">Theo dõi tất cả hoạt động thanh toán trên nền tảng.</p>
        </div>
        <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-primary/90">
          <span className="material-symbols-outlined text-[18px]">download</span> Xuất CSV
        </button>
      </div>

      <div className="grid grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Tổng doanh thu',     value: fmt(totalRev),    icon: 'payments',       bg: 'bg-emerald-50',  color: 'text-emerald-700' },
          { label: 'Hoàn thành',         value: MOCK_TXN.filter(t=>t.status==='Hoàn thành').length, icon: 'check_circle', bg: 'bg-green-50', color: 'text-green-700' },
          { label: 'Chờ xử lý',          value: MOCK_TXN.filter(t=>t.status==='Chờ xử lý').length,  icon: 'schedule',     bg: 'bg-amber-50', color: 'text-amber-700' },
          { label: 'Thất bại/Hoàn tiền', value: MOCK_TXN.filter(t=>['Thất bại','Đã hoàn tiền'].includes(t.status)).length, icon: 'cancel', bg: 'bg-red-50', color: 'text-red-600' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl p-5 shadow-sm">
            <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center ${c.color} mb-3`}>
              <span className="material-symbols-outlined">{c.icon}</span>
            </div>
            <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1">{c.label}</p>
            <p className="text-2xl font-bold text-on-background">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-outline-variant overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-outline-variant">
          {['Tất cả','Hoàn thành','Chờ xử lý','Đã hoàn tiền','Thất bại'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${statusFilter === s ? 'bg-primary text-white' : 'bg-gray-100 text-on-surface-variant hover:bg-gray-200'}`}>
              {s}
            </button>
          ))}
        </div>
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-outline-variant">
            <tr>
              <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase">Mã giao dịch</th>
              <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase">Học sinh</th>
              <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase">Gia sư</th>
              <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase">Số tiền</th>
              <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase">Trạng thái</th>
              <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase">Ngày</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {filtered.map(t => (
              <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                <td className="py-4 px-6 text-sm font-mono text-primary font-semibold">{t.id}</td>
                <td className="py-4 px-6 text-sm text-on-surface">{t.user}</td>
                <td className="py-4 px-6 text-sm text-on-surface">{t.tutor}</td>
                <td className="py-4 px-6 text-sm font-bold text-on-surface">{fmt(t.amount)}</td>
                <td className="py-4 px-6"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor(t.status)}`}>{t.status}</span></td>
                <td className="py-4 px-6 text-sm text-on-surface-variant">{fmtDate(t.date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Complaints View ──────────────────────────────────────────────────────────
const MOCK_COMPLAINTS = [
  { id: 'C-101', reporter: 'Nguyễn Văn An',  against: 'Trần Thị Bích',   issue: 'Gia sư không đến buổi học đã lên lịch',         priority: 'Cao',    status: 'Mở',          date: '2024-06-10' },
  { id: 'C-100', reporter: 'Đỗ Thanh Long',  against: 'Phạm Quỳnh Anh',  issue: 'Nội dung bài học sai lệch và không chính xác', priority: 'Trung bình', status: 'Đang xem xét', date: '2024-06-08' },
  { id: 'C-099', reporter: 'Hoàng Đức Mạnh', against: 'Bùi Phương Thảo', issue: 'Chưa hoàn tiền sau khi hủy',                   priority: 'Cao',    status: 'Mở',          date: '2024-06-07' },
  { id: 'C-098', reporter: 'Lê Minh Cường',  against: 'Trần Thị Bích',   issue: 'Ngôn ngữ không phù hợp trong buổi học',        priority: 'Cao',    status: 'Đã giải quyết', date: '2024-06-01' },
  { id: 'C-097', reporter: 'Bùi Phương Thảo',against: 'Nguyễn Văn An',   issue: 'Học sinh gây mất trật tự trong buổi học nhóm', priority: 'Thấp',   status: 'Đã giải quyết', date: '2024-05-28' },
]

function ComplaintsView() {
  const [statusFilter, setStatusFilter] = useState('Tất cả')
  const priorityColor = p => p === 'Cao' ? 'bg-red-100 text-red-700' : p === 'Trung bình' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
  const statusColor   = s => s === 'Mở' ? 'bg-red-50 text-red-700 border border-red-200' : s === 'Đang xem xét' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-green-50 text-green-700 border border-green-200'
  const filtered = statusFilter === 'Tất cả' ? MOCK_COMPLAINTS : MOCK_COMPLAINTS.filter(c => c.status === statusFilter)

  return (
    <div className="p-10 max-w-[1280px] mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-bold text-on-background">Khiếu nại</h2>
          <p className="text-sm text-on-surface-variant mt-1">Xem xét và giải quyết các vấn đề do người dùng báo cáo.</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {[
          { label: 'Đang mở',       count: MOCK_COMPLAINTS.filter(c=>c.status==='Mở').length,             color: 'border-red-400',   icon: 'report_problem', iconColor: 'text-red-600',   bg: 'bg-red-50' },
          { label: 'Đang xem xét', count: MOCK_COMPLAINTS.filter(c=>c.status==='Đang xem xét').length, color: 'border-amber-400', icon: 'rate_review',    iconColor: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Đã giải quyết',count: MOCK_COMPLAINTS.filter(c=>c.status==='Đã giải quyết').length,color: 'border-green-400', icon: 'check_circle',   iconColor: 'text-green-600', bg: 'bg-green-50' },
        ].map(c => (
          <div key={c.label} className={`bg-white rounded-xl p-5 shadow-sm border-l-4 ${c.color}`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center ${c.iconColor}`}>
                <span className="material-symbols-outlined">{c.icon}</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-on-surface-variant uppercase">{c.label}</p>
                <p className="text-2xl font-bold text-on-background">{c.count}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-outline-variant overflow-hidden">
        <div className="flex gap-3 px-6 py-4 border-b border-outline-variant">
          {['Tất cả','Mở','Đang xem xét','Đã giải quyết'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${statusFilter === s ? 'bg-primary text-white' : 'bg-gray-100 text-on-surface-variant hover:bg-gray-200'}`}>
              {s}
            </button>
          ))}
        </div>
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-outline-variant">
            <tr>
              <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase">Mã</th>
              <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase">Người báo cáo</th>
              <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase">Bị báo cáo</th>
              <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase">Vấn đề</th>
              <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase">Mức độ</th>
              <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase">Trạng thái</th>
              <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {filtered.map(c => (
              <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                <td className="py-4 px-6 text-sm font-mono text-primary font-semibold">{c.id}</td>
                <td className="py-4 px-6 text-sm text-on-surface">{c.reporter}</td>
                <td className="py-4 px-6 text-sm text-on-surface">{c.against}</td>
                <td className="py-4 px-6 text-sm text-on-surface-variant max-w-xs truncate">{c.issue}</td>
                <td className="py-4 px-6"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${priorityColor(c.priority)}`}>{c.priority}</span></td>
                <td className="py-4 px-6"><span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${statusColor(c.status)}`}>{c.status}</span></td>
                <td className="py-4 px-6 text-right">
                  <button className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity">
                    Xem xét
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Reviews View ─────────────────────────────────────────────────────────────
const MOCK_REVIEWS = [
  { id: 1, student: 'Nguyễn Văn An',   tutor: 'Trần Thị Bích',   rating: 5, comment: 'Gia sư xuất sắc! Rất kiên nhẫn và am hiểu.',            date: '2024-06-09', flag: false },
  { id: 2, student: 'Đỗ Thanh Long',   tutor: 'Phạm Quỳnh Anh',  rating: 4, comment: 'Buổi học tốt, cần cải thiện thêm về quản lý thời gian.', date: '2024-06-08', flag: false },
  { id: 3, student: 'Hoàng Đức Mạnh',  tutor: 'Bùi Phương Thảo', rating: 2, comment: 'Gia sư chưa chuẩn bị. Lãng phí thời gian của tôi.',     date: '2024-06-07', flag: true  },
  { id: 4, student: 'Lê Minh Cường',   tutor: 'Trần Thị Bích',   rating: 5, comment: 'Giúp tôi vượt qua kỳ thi! Rất khuyến khích.',          date: '2024-06-06', flag: false },
  { id: 5, student: 'Nguyễn Văn An',   tutor: 'Bùi Phương Thảo', rating: 1, comment: 'Hành vi hoàn toàn không phù hợp. Đã gửi báo cáo.',     date: '2024-06-05', flag: true  },
]

function ReviewsView() {
  const avg = (MOCK_REVIEWS.reduce((a, r) => a + r.rating, 0) / MOCK_REVIEWS.length).toFixed(1)
  const Stars = ({ n }) => (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <span key={i} className={`material-symbols-outlined text-[16px] ${i <= n ? 'text-amber-400' : 'text-gray-200'}`}
          style={{ fontVariationSettings: i <= n ? "'FILL' 1" : "'FILL' 0" }}>star</span>
      ))}
    </div>
  )
  const dist = [5,4,3,2,1].map(s => ({ star: s, count: MOCK_REVIEWS.filter(r => r.rating === s).length }))

  return (
    <div className="p-10 max-w-[1280px] mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-on-background">Đánh giá</h2>
        <p className="text-sm text-on-surface-variant mt-1">Theo dõi xếp hạng gia sư và phản hồi của học sinh.</p>
      </div>

      <div className="grid grid-cols-12 gap-6 mb-8">
        {/* Rating overview */}
        <div className="col-span-4 bg-white rounded-xl p-6 shadow-sm border border-outline-variant text-center">
          <p className="text-6xl font-bold text-primary mb-1">{avg}</p>
          <div className="flex justify-center mb-2">
            <Stars n={Math.round(Number(avg))} />
          </div>
          <p className="text-sm text-on-surface-variant">{MOCK_REVIEWS.length} đánh giá</p>
          <div className="mt-4 space-y-2">
            {dist.map(d => (
              <div key={d.star} className="flex items-center gap-2">
                <span className="text-xs text-on-surface-variant w-4 text-right">{d.star}</span>
                <span className="material-symbols-outlined text-amber-400 text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                <div className="flex-1 bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-400 h-full rounded-full" style={{ width: `${(d.count / MOCK_REVIEWS.length) * 100}%` }} />
                </div>
                <span className="text-xs text-on-surface-variant w-4">{d.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Flagged notice */}
        <div className="col-span-8 flex flex-col gap-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <span className="material-symbols-outlined text-red-600 mt-0.5">flag</span>
            <div>
              <p className="text-sm font-bold text-red-900">{MOCK_REVIEWS.filter(r => r.flag).length} đánh giá bị gắn cờ cần xử lý</p>
              <p className="text-xs text-red-700 mt-0.5">Các đánh giá này có thể chứa nội dung xúc phạm hoặc sai sự thật.</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 flex-1">
            {[
              { label: 'Đánh giá 5 sao', value: MOCK_REVIEWS.filter(r=>r.rating===5).length, icon: 'star', color: 'text-amber-500', bg: 'bg-amber-50' },
              { label: 'Bị gắn cờ',     value: MOCK_REVIEWS.filter(r=>r.flag).length,        icon: 'flag', color: 'text-red-600',   bg: 'bg-red-50' },
              { label: 'Tuần này',       value: MOCK_REVIEWS.length,                          icon: 'calendar_today', color: 'text-indigo-600', bg: 'bg-indigo-50' },
            ].map(c => (
              <div key={c.label} className="bg-white rounded-xl p-4 shadow-sm">
                <div className={`w-9 h-9 rounded-lg ${c.bg} flex items-center justify-center ${c.color} mb-3`}>
                  <span className="material-symbols-outlined text-[18px]">{c.icon}</span>
                </div>
                <p className="text-xs text-on-surface-variant">{c.label}</p>
                <p className="text-2xl font-bold text-on-background">{c.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-outline-variant overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between">
          <h3 className="text-base font-semibold text-on-surface">Tất cả đánh giá</h3>
          <button className="flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-[18px]">filter_list</span> Lọc
          </button>
        </div>
        <div className="divide-y divide-outline-variant">
          {MOCK_REVIEWS.map(r => (
            <div key={r.id} className={`p-6 hover:bg-gray-50 transition-colors ${r.flag ? 'bg-red-50/30' : ''}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold flex-shrink-0">
                    {r.student.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-semibold text-on-surface">{r.student}</p>
                      <span className="text-xs text-on-surface-variant">→</span>
                      <p className="text-sm text-primary font-semibold">{r.tutor}</p>
                      {r.flag && <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">Gắn cờ</span>}
                    </div>
                    <Stars n={r.rating} />
                    <p className="text-sm text-on-surface-variant mt-1">{r.comment}</p>
                    <p className="text-xs text-on-surface-variant mt-1">{fmtDate(r.date)}</p>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  {r.flag && (
                    <button className="p-1.5 hover:bg-green-50 rounded-lg text-green-600 transition-colors" title="Approve">
                      <span className="material-symbols-outlined text-[18px]">check</span>
                    </button>
                  )}
                  <button className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 transition-colors" title="Remove">
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Reports View ─────────────────────────────────────────────────────────────
const REPORT_CARDS = [
  { title: 'Báo cáo nền tảng tháng',      desc: 'Tăng trưởng người dùng, doanh thu và thống kê tương tác tháng này.', icon: 'bar_chart',      color: 'bg-blue-50 text-blue-700',    ready: true  },
  { title: 'Báo cáo hiệu suất gia sư',   desc: 'Xếp hạng, số buổi học và tỷ lệ duyệt theo từng gia sư.',    icon: 'history_edu',    color: 'bg-indigo-50 text-indigo-700', ready: true  },
  { title: 'Doanh thu & Giao dịch',       desc: 'Tổng hợp thanh toán, hoàn tiền và tóm tắt tài chính.',       icon: 'payments',       color: 'bg-emerald-50 text-emerald-700', ready: true },
  { title: 'Báo cáo tương tác học sinh',  desc: 'Tham gia buổi học, điểm bài kiểm tra và bản đồ hoạt động.', icon: 'school',         color: 'bg-cyan-50 text-cyan-700',    ready: true  },
  { title: 'Báo cáo khiếu nại & An toàn', desc: 'Người dùng bị gắn cờ, tranh chấp đã giải quyết và sự cố.', icon: 'report_problem', color: 'bg-amber-50 text-amber-700',  ready: false },
  { title: 'Báo cáo AI & Insights',       desc: 'Tóm tắt bất thường và dự báo do AI tạo ra.',                 icon: 'psychology',     color: 'bg-purple-50 text-purple-700', ready: false },
]

function ReportsView() {
  return (
    <div className="p-10 max-w-[1280px] mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-bold text-on-background">Báo cáo</h2>
          <p className="text-sm text-on-surface-variant mt-1">Tải xuống hoặc tạo báo cáo phân tích nền tảng.</p>
        </div>
        <div className="flex items-center gap-3 bg-white border border-outline-variant rounded-lg px-4 py-2 shadow-sm">
          <span className="material-symbols-outlined text-on-surface-variant text-[18px]">date_range</span>
          <span className="text-sm text-on-surface-variant">June 2024</span>
          <span className="material-symbols-outlined text-on-surface-variant text-[18px]">expand_more</span>
        </div>
      </div>

      {/* Snapshot stats */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {[
          { label: 'Tổng buổi học tháng này', value: '3,412',  change: '+14%', up: true  },
          { label: 'Doanh thu tháng này',    value: '$124.5k', change: '+22%', up: true  },
          { label: 'Đánh giá TB buổi học',   value: '4.6 ★',  change: '-0.1', up: false },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-6 shadow-sm border border-outline-variant">
            <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-2">{s.label}</p>
            <p className="text-3xl font-bold text-on-background mb-1">{s.value}</p>
            <p className={`text-sm font-semibold flex items-center gap-1 ${s.up ? 'text-green-600' : 'text-red-500'}`}>
              <span className="material-symbols-outlined text-[16px]">{s.up ? 'trending_up' : 'trending_down'}</span>
              {s.change} so với tháng trước
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {REPORT_CARDS.map(r => (
          <div key={r.title} className="bg-white rounded-xl p-6 shadow-sm border border-outline-variant flex items-start gap-4 hover:shadow-md transition-shadow">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${r.color}`}>
              <span className="material-symbols-outlined text-[24px]">{r.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="text-sm font-bold text-on-surface">{r.title}</h3>
                {!r.ready && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full whitespace-nowrap">Sắp ra mắt</span>}
              </div>
              <p className="text-xs text-on-surface-variant mb-4">{r.desc}</p>
              <div className="flex gap-2">
                <button
                  disabled={!r.ready}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[15px]">download</span> Tải PDF
                </button>
                <button
                  disabled={!r.ready}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-outline-variant text-on-surface-variant rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[15px]">table_chart</span> Xuất CSV
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── AI Insights View ─────────────────────────────────────────────────────────
const AI_FLAGS = [
  { type: 'Giao dịch đáng ngờ',    detail: 'TXN-4816: yêu cầu hoàn tiền lớn bất thường trong vòng 1 giờ sau khi thanh toán.', level: 'Cao',       icon: 'payments',       color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200' },
  { type: 'Tài liệu không khớp',   detail: '3 ứng viên đang chờ có ảnh CCCD không khớp với ảnh hồ sơ.',               level: 'Cao',       icon: 'badge',          color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200' },
  { type: 'Đăng nhập bất thường',  detail: 'Tài khoản vu.thi.lan@email.com đăng nhập từ 4 quốc gia khác nhau trong 24 giờ.', level: 'Trung bình', icon: 'travel_explore', color: 'text-amber-600', bg: 'bg-amber-50',  border: 'border-amber-200' },
  { type: 'Phát hiện đánh giá rác', detail: '8 đánh giá từ cùng một địa chỉ IP nhắm vào một gia sư.',                 level: 'Trung bình', icon: 'reviews',        color: 'text-amber-600', bg: 'bg-amber-50',  border: 'border-amber-200' },
  { type: 'Giảm tương tác',        detail: 'Tương tác của học sinh giảm 31% trong danh mục Vật lý tuần này.',         level: 'Thấp',      icon: 'trending_down',  color: 'text-blue-600',  bg: 'bg-blue-50',   border: 'border-blue-200' },
]

const AI_TRENDS = [
  { subject: 'Computer Science', growth: '+28%', icon: 'code',      color: 'text-cyan-700',   bg: 'bg-cyan-50' },
  { subject: 'English',          growth: '+19%', icon: 'translate', color: 'text-green-700',  bg: 'bg-green-50' },
  { subject: 'Mathematics',      growth: '+12%', icon: 'calculate', color: 'text-blue-700',   bg: 'bg-blue-50' },
  { subject: 'History',          growth: '-8%',  icon: 'history_edu', color: 'text-red-600',  bg: 'bg-red-50' },
]

function AIInsightsView() {
  return (
    <div className="p-10 max-w-[1280px] mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-on-background">AI Insights</h2>
        <p className="text-sm text-on-surface-variant mt-1">Phát hiện bất thường tự động, phân tích xu hướng và thông minh nền tảng.</p>
      </div>

      {/* Anomaly Alert Banner */}
      <div className="bg-white rounded-xl p-5 border-l-4 border-red-500 shadow-sm mb-8 flex items-start gap-4">
        <div className="w-11 h-11 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
          <span className="material-symbols-outlined text-[24px]">warning</span>
        </div>
        <div className="flex-1">
          <h3 className="text-base font-bold text-on-surface mb-1">AI phát hiện 2 bất thường ưu tiên cao cần xử lý ngay</h3>
          <p className="text-sm text-on-surface-variant">Phát hiện giao dịch đáng ngờ và tài liệu không khớp. Xem bên dưới.</p>
        </div>
        <button className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity shrink-0">
          Xem tất cả cảnh báo
        </button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Anomaly feed */}
        <div className="col-span-7 flex flex-col gap-4">
          <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">psychology</span>
            Bất thường phát hiện
          </h3>
          {AI_FLAGS.map((f, i) => (
            <div key={i} className={`bg-white rounded-xl p-5 border ${f.border} shadow-sm flex items-start gap-4`}>
              <div className={`w-10 h-10 rounded-lg ${f.bg} flex items-center justify-center ${f.color} shrink-0`}>
                <span className="material-symbols-outlined text-[20px]">{f.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-bold text-on-surface">{f.type}</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${f.level === 'Cao' ? 'bg-red-100 text-red-700' : f.level === 'Trung bình' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                    {f.level}
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant">{f.detail}</p>
              </div>
              <button className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold hover:opacity-90 shrink-0">
                Điều tra
              </button>
            </div>
          ))}
        </div>

        {/* Right panel */}
        <div className="col-span-5 flex flex-col gap-6">
          {/* Trending subjects */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-outline-variant">
            <h3 className="text-base font-bold text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">trending_up</span>
              Xu hướng nhu cầu môn học
            </h3>
            <div className="space-y-3">
              {AI_TRENDS.map(t => (
                <div key={t.subject} className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg ${t.bg} flex items-center justify-center ${t.color}`}>
                    <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-on-surface">{t.subject}</p>
                    <div className="w-full bg-gray-100 h-1.5 rounded-full mt-1 overflow-hidden">
                      <div className={`h-full rounded-full ${t.growth.startsWith('+') ? 'bg-green-400' : 'bg-red-400'}`}
                        style={{ width: `${Math.abs(parseInt(t.growth))}%` }} />
                    </div>
                  </div>
                  <span className={`text-sm font-bold ${t.growth.startsWith('+') ? 'text-green-600' : 'text-red-500'}`}>{t.growth}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Predictions */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-outline-variant">
            <h3 className="text-base font-bold text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">auto_awesome</span>
              Dự báo AI
            </h3>
            <div className="space-y-3">
              {[
                { text: 'Doanh thu dự kiến đạt $150k tháng tới', confidence: '87%', up: true },
                { text: 'Thiếu gia sư CNTT dự kiến trong 3 tuần', confidence: '73%', up: false },
                { text: 'Dự kiến 420 học sinh đăng ký mới tuần này', confidence: '91%', up: true },
              ].map((p, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-outline-variant">
                  <span className={`material-symbols-outlined text-[18px] mt-0.5 ${p.up ? 'text-green-600' : 'text-amber-600'}`}>
                    {p.up ? 'arrow_upward' : 'arrow_downward'}
                  </span>
                  <div className="flex-1">
                    <p className="text-xs text-on-surface">{p.text}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">Độ tin cậy: <strong className="text-primary">{p.confidence}</strong></p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Audit Logs View ──────────────────────────────────────────────────────────
const MOCK_LOGS = [
  { id: 'A-9041', actor: 'admin@academiaflow.com', action: 'APPROVE_TUTOR',   target: 'David Chen (ID: 241)',      ip: '192.168.1.10', time: '2024-06-10T14:32:00Z', level: 'Info'    },
  { id: 'A-9040', actor: 'admin@academiaflow.com', action: 'REJECT_TUTOR',    target: 'Lisa Park (ID: 238)',       ip: '192.168.1.10', time: '2024-06-10T14:10:00Z', level: 'Info'    },
  { id: 'A-9039', actor: 'admin@academiaflow.com', action: 'BAN_USER',        target: 'vu.thi.lan@email.com',      ip: '192.168.1.10', time: '2024-06-10T13:45:00Z', level: 'Warning' },
  { id: 'A-9038', actor: 'system',                 action: 'AUTO_FLAG_TXN',   target: 'TXN-4816 (suspicious)',     ip: 'system',       time: '2024-06-10T12:00:00Z', level: 'Warning' },
  { id: 'A-9037', actor: 'admin@academiaflow.com', action: 'VIEW_DOCUMENT',   target: 'CCCD of Marcus Robinson',   ip: '192.168.1.10', time: '2024-06-10T11:30:00Z', level: 'Info'    },
  { id: 'A-9036', actor: 'admin@academiaflow.com', action: 'DELETE_REVIEW',   target: 'Review #5 (spam detected)', ip: '192.168.1.10', time: '2024-06-10T10:52:00Z', level: 'Warning' },
  { id: 'A-9035', actor: 'system',                 action: 'BACKUP_COMPLETE', target: 'Daily DB snapshot',         ip: 'system',       time: '2024-06-10T03:00:00Z', level: 'Info'    },
  { id: 'A-9034', actor: 'admin@academiaflow.com', action: 'EXPORT_REPORT',   target: 'Monthly Revenue CSV',       ip: '192.168.1.10', time: '2024-06-09T17:20:00Z', level: 'Info'    },
  { id: 'A-9033', actor: 'system',                 action: 'AUTO_FLAG_USER',  target: 'Multiple login anomaly',    ip: 'system',       time: '2024-06-09T16:45:00Z', level: 'Critical'},
  { id: 'A-9032', actor: 'admin@academiaflow.com', action: 'ADD_SUBJECT',     target: 'New subject: Robotics',     ip: '192.168.1.10', time: '2024-06-09T15:10:00Z', level: 'Info'    },
]

function AuditLogsView() {
  const [levelFilter, setLevelFilter] = useState('Tất cả')
  const [search, setSearch]           = useState('')

  const levelColor = l => ({
    Info:     'bg-blue-100 text-blue-700',
    Warning:  'bg-amber-100 text-amber-700',
    Critical: 'bg-red-100 text-red-700',
  }[l] || 'bg-gray-100 text-gray-600')

  const actionIcon = a => ({
    APPROVE_TUTOR:   { icon: 'how_to_reg',    color: 'text-green-600 bg-green-50' },
    REJECT_TUTOR:    { icon: 'cancel',        color: 'text-red-500   bg-red-50'   },
    BAN_USER:        { icon: 'block',         color: 'text-red-600   bg-red-50'   },
    AUTO_FLAG_TXN:   { icon: 'flag',          color: 'text-amber-600 bg-amber-50' },
    VIEW_DOCUMENT:   { icon: 'visibility',    color: 'text-blue-600  bg-blue-50'  },
    DELETE_REVIEW:   { icon: 'delete',        color: 'text-red-500   bg-red-50'   },
    BACKUP_COMPLETE: { icon: 'cloud_done',    color: 'text-green-600 bg-green-50' },
    EXPORT_REPORT:   { icon: 'download',      color: 'text-blue-600  bg-blue-50'  },
    AUTO_FLAG_USER:  { icon: 'gpp_bad',       color: 'text-red-600   bg-red-50'   },
    ADD_SUBJECT:     { icon: 'add_circle',    color: 'text-indigo-600 bg-indigo-50'},
  }[a] || { icon: 'history', color: 'text-gray-500 bg-gray-100' })

  const filtered = MOCK_LOGS.filter(l => {
    const matchLevel  = levelFilter === 'Tất cả' || l.level === levelFilter
    const matchSearch = l.action.toLowerCase().includes(search.toLowerCase()) || l.actor.toLowerCase().includes(search.toLowerCase()) || l.target.toLowerCase().includes(search.toLowerCase())
    return matchLevel && matchSearch
  })

  const fmtTime = iso => {
    const d = new Date(iso)
    return d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' }) + ' · ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="p-10 max-w-[1280px] mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-bold text-on-background">Nhật ký hệ thống</h2>
          <p className="text-sm text-on-surface-variant mt-1">Toàn bộ lịch sử các hành động quản trị và sự kiện hệ thống.</p>
        </div>
        <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-primary/90">
          <span className="material-symbols-outlined text-[18px]">download</span> Xuất nhật ký
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Tổng sự kiện hôm nay', value: MOCK_LOGS.length,                               icon: 'history',      bg: 'bg-gray-100',   color: 'text-gray-600' },
          { label: 'Thông tin',          value: MOCK_LOGS.filter(l=>l.level==='Info').length,    icon: 'info',         bg: 'bg-blue-50',    color: 'text-blue-600' },
          { label: 'Cảnh báo',           value: MOCK_LOGS.filter(l=>l.level==='Warning').length, icon: 'warning',      bg: 'bg-amber-50',   color: 'text-amber-600' },
          { label: 'Nghiêm trọng',       value: MOCK_LOGS.filter(l=>l.level==='Critical').length,icon: 'error',        bg: 'bg-red-50',     color: 'text-red-600' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl p-5 shadow-sm border border-outline-variant">
            <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center ${c.color} mb-3`}>
              <span className="material-symbols-outlined">{c.icon}</span>
            </div>
            <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1">{c.label}</p>
            <p className="text-2xl font-bold text-on-background">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-outline-variant overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-outline-variant flex-wrap">
          {['Tất cả','Info','Warning','Critical'].map(l => (
            <button key={l} onClick={() => setLevelFilter(l)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${levelFilter === l ? 'bg-primary text-white' : 'bg-gray-100 text-on-surface-variant hover:bg-gray-200'}`}>
              {l}
            </button>
          ))}
          <div className="ml-auto relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
            <input
              className="pl-9 pr-4 py-2 bg-gray-50 border border-outline-variant rounded-lg text-sm focus:outline-none focus:border-primary w-60"
              placeholder="Tìm kiếm nhật ký..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-outline-variant">
            <tr>
              <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase">Sự kiện</th>
              <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase">Người thực hiện</th>
              <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase">Đối tượng</th>
              <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase">IP</th>
              <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase">Mức độ</th>
              <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase">Thời gian</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {filtered.map(log => {
              const ai = actionIcon(log.action)
              return (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3.5 px-6">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${ai.color}`}>
                        <span className="material-symbols-outlined text-[16px]">{ai.icon}</span>
                      </div>
                      <div>
                        <p className="text-sm font-mono font-semibold text-on-surface">{log.action}</p>
                        <p className="text-xs text-on-surface-variant">#{log.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-6">
                    <div className="flex items-center gap-2">
                      {log.actor === 'system' ? (
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full">system</span>
                      ) : (
                        <p className="text-sm text-on-surface">{log.actor}</p>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-6 text-sm text-on-surface-variant max-w-xs truncate">{log.target}</td>
                  <td className="py-3.5 px-6 text-xs font-mono text-on-surface-variant">{log.ip}</td>
                  <td className="py-3.5 px-6">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${levelColor(log.level)}`}>{log.level}</span>
                  </td>
                  <td className="py-3.5 px-6 text-xs text-on-surface-variant whitespace-nowrap">{fmtTime(log.time)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <div className="px-6 py-3 bg-gray-50 border-t border-outline-variant flex items-center justify-between">
          <p className="text-xs text-on-surface-variant">Hiển thị {filtered.length} trong {MOCK_LOGS.length} bản ghi</p>
          <p className="text-xs text-on-surface-variant">Nhật ký được lưu trữ trong 90 ngày</p>
        </div>
      </div>
    </div>
  )
}

// ─── Settings View ────────────────────────────────────────────────────────────
function SettingsView() {
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    siteName: 'EduX',
    supportEmail: 'support@academiaflow.com',
    maxPendingDays: '7',
    autoRejectDays: '30',
    minTutorRating: '3.5',
    commissionRate: '15',
    maintenanceMode: false,
    emailNotifications: true,
    aiAnomalyDetection: true,
    auditLogRetention: '90',
  })

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2500) }

  return (
    <div className="p-10 max-w-[900px] mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-on-background">Cài đặt</h2>
        <p className="text-sm text-on-surface-variant mt-1">Cấu hình cài đặt và chính sách toàn nền tảng.</p>
      </div>

      {saved && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-green-600">check_circle</span>
          <p className="text-sm font-semibold text-green-800">Đã lưu cài đặt thành công!</p>
        </div>
      )}

      <div className="space-y-6">
        {/* General */}
        <SettingsSection title="Chung" icon="settings">
          <SettingsField label="Tên nền tảng" sub="Hiển thị trên toàn bộ trang và trong email.">
            <input className="settings-input" value={form.siteName} onChange={e => setForm(f => ({ ...f, siteName: e.target.value }))} />
          </SettingsField>
          <SettingsField label="Email hỗ trợ" sub="Phản hồi email hệ thống sẽ được gửi đến đây.">
            <input className="settings-input" type="email" value={form.supportEmail} onChange={e => setForm(f => ({ ...f, supportEmail: e.target.value }))} />
          </SettingsField>
        </SettingsSection>

        {/* Tutor Approval */}
        <SettingsSection title="Chính sách duyệt gia sư" icon="how_to_reg">
          <SettingsField label="Số ngày chờ tối đa" sub="Hồ sơ quá ngày này sẽ được tô nổi để xem xét.">
            <input className="settings-input w-32" type="number" min="1" value={form.maxPendingDays} onChange={e => setForm(f => ({ ...f, maxPendingDays: e.target.value }))} />
          </SettingsField>
          <SettingsField label="Tự động từ chối sau (ngày)" sub="Tự động từ chối hồ sơ chưa hoàn thiện sau số ngày này.">
            <input className="settings-input w-32" type="number" min="1" value={form.autoRejectDays} onChange={e => setForm(f => ({ ...f, autoRejectDays: e.target.value }))} />
          </SettingsField>
          <SettingsField label="Xếp hạng gia sư tối thiểu" sub="Gia sư dưới mức này sẽ bị gắn cờ để xem xét.">
            <input className="settings-input w-32" type="number" min="1" max="5" step="0.1" value={form.minTutorRating} onChange={e => setForm(f => ({ ...f, minTutorRating: e.target.value }))} />
          </SettingsField>
        </SettingsSection>

        {/* Financial */}
        <SettingsSection title="Tài chính" icon="payments">
          <SettingsField label="Tỷ lệ hoa hồng nền tảng (%)" sub="Phần trăm trích từ mỗi khoản thanh toán cho gia sư.">
            <input className="settings-input w-32" type="number" min="0" max="100" value={form.commissionRate} onChange={e => setForm(f => ({ ...f, commissionRate: e.target.value }))} />
          </SettingsField>
        </SettingsSection>

        {/* System */}
        <SettingsSection title="Hệ thống" icon="manage_accounts">
          <SettingsField label="Chế độ bảo trì" sub="Tắt quyền truy cập cho người dùng không phải admin.">
            <Toggle checked={form.maintenanceMode} onChange={v => setForm(f => ({ ...f, maintenanceMode: v }))} />
          </SettingsField>
          <SettingsField label="Thông báo email" sub="Gửi cảnh báo hệ thống và email duyệt hồ sơ.">
            <Toggle checked={form.emailNotifications} onChange={v => setForm(f => ({ ...f, emailNotifications: v }))} />
          </SettingsField>
          <SettingsField label="Phát hiện bất thường AI" sub="Tự động gắn cờ các hoạt động đáng ngờ.">
            <Toggle checked={form.aiAnomalyDetection} onChange={v => setForm(f => ({ ...f, aiAnomalyDetection: v }))} />
          </SettingsField>
          <SettingsField label="Thời gian lưu nhật ký (ngày)" sub="Nhật ký cũ hơn số ngày này sẽ tự động bị xóa.">
            <input className="settings-input w-32" type="number" min="30" value={form.auditLogRetention} onChange={e => setForm(f => ({ ...f, auditLogRetention: e.target.value }))} />
          </SettingsField>
        </SettingsSection>
      </div>

      <div className="mt-8 flex gap-3">
        <button onClick={handleSave} className="px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors">
          Lưu thay đổi
        </button>
        <button className="px-6 py-2.5 bg-gray-100 text-on-surface-variant rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors">
          Hủy bỏ
        </button>
      </div>

      <style>{`.settings-input { width: 100%; padding: 8px 12px; border: 1px solid #c4c5d5; border-radius: 8px; font-size: 14px; background: #f9fafb; outline: none; transition: border-color .2s; } .settings-input:focus { border-color: #00288e; box-shadow: 0 0 0 2px rgba(0,40,142,.1); }`}</style>
    </div>
  )
}

function SettingsSection({ title, icon, children }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-outline-variant overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-outline-variant bg-gray-50">
        <span className="material-symbols-outlined text-primary text-[20px]">{icon}</span>
        <h3 className="text-sm font-bold text-on-surface">{title}</h3>
      </div>
      <div className="divide-y divide-outline-variant">{children}</div>
    </div>
  )
}

function SettingsField({ label, sub, children }) {
  return (
    <div className="flex items-center justify-between px-6 py-4 gap-8">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-on-surface">{label}</p>
        <p className="text-xs text-on-surface-variant mt-0.5">{sub}</p>
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-gray-300'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )
}

// ─── Document Image Viewer ────────────────────────────────────────────────────
function DocImageViewer({ src, onOpenNewTab }) {
  const [imgState, setImgState] = useState('loading')

  return (
    <div className="bg-black rounded-2xl shadow-2xl overflow-hidden min-h-[200px] flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 bg-black/80">
        <span className="text-white text-xs opacity-70">Xem tài liệu bảo mật</span>
        <button
          onClick={onOpenNewTab}
          className="flex items-center gap-1 text-white text-xs px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">open_in_new</span>
          Mở tab mới
        </button>
      </div>
      <div className="relative flex-1 flex items-center justify-center bg-gray-900 min-h-[300px]">
        {imgState === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
            <span className="material-symbols-outlined text-[40px] animate-spin">progress_activity</span>
            <p className="text-xs opacity-70">Đang tải hình ảnh...</p>
          </div>
        )}
        {imgState === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8">
            <span className="material-symbols-outlined text-5xl text-red-400">broken_image</span>
            <p className="text-white font-bold text-sm text-center">Không thể hiển thị tài liệu</p>
            <p className="text-white/60 text-xs text-center">Tài liệu có thể là PDF hoặc liên kết đã hết hạn.</p>
            <button
              onClick={onOpenNewTab}
              className="mt-2 flex items-center gap-2 text-white px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 transition-colors text-sm font-semibold"
            >
              <span className="material-symbols-outlined text-[18px]">open_in_new</span>
              Mở tài liệu trong tab mới
            </button>
          </div>
        )}
        <img
          src={src}
          alt="Document preview"
          className={`max-w-full max-h-[70vh] object-contain transition-opacity duration-300 ${imgState === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setImgState('loaded')}
          onError={() => setImgState('error')}
        />
      </div>
    </div>
  )
}

// ─── Modal Overlay ────────────────────────────────────────────────────────────
function ModalOverlay({ children, onClose }) {
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-6"
      onClick={onClose}
    >
      {children}
    </div>
  )
}
