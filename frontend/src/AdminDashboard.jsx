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
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const NAV_ITEMS = [
  { id: 'dashboard',       label: 'Dashboard',       icon: 'dashboard' },
  { id: 'tutor-approval',  label: 'Tutor Approval',  icon: 'how_to_reg' },
  { id: 'user-management', label: 'User Management', icon: 'group' },
  { id: 'subjects',        label: 'Subjects',        icon: 'subject' },
  { id: 'lessons',         label: 'Lessons',         icon: 'menu_book' },
  { id: 'transactions',    label: 'Transactions',    icon: 'payments' },
  { id: 'complaints',      label: 'Complaints',      icon: 'report_problem' },
  { id: 'reviews',         label: 'Reviews',         icon: 'reviews' },
  { id: 'reports',         label: 'Reports',         icon: 'assessment' },
  { id: 'ai-insights',     label: 'AI Insights',     icon: 'psychology' },
  { id: 'audit-logs',      label: 'Audit Logs',      icon: 'history_edu' },
  { id: 'settings',        label: 'Settings',        icon: 'settings' },
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
      setToast({ msg: 'Tutor approved! Email notification sent.', type: 'success' })
    } catch (err) {
      setToast({ msg: `Approval failed: ${err.message}`, type: 'error' })
    } finally { setActionLoading(false) }
  }

  // ── Reject ────────────────────────────────────────────────────────────────
  const openRejectModal = (tutor) => {
    setRejectTarget(tutor)
    setRejectReason(reviewNotes.trim())
  }

  const handleRejectConfirm = async () => {
    if (!rejectReason.trim()) { setToast({ msg: 'Please enter a rejection reason.', type: 'error' }); return }
    setActionLoading(true)
    try {
      await authFetch(`${API}/api/admin/tutors/${rejectTarget.id}/reject`, token, {
        method: 'PATCH',
        body: JSON.stringify({ reason: rejectReason, notes: reviewNotes.trim() }),
      })
      setTutors(prev => prev.filter(t => t.id !== rejectTarget.id))
      setStats(prev => ({ ...prev, pending: Math.max(0, prev.pending - 1), rejected: prev.rejected + 1 }))
      setRejectTarget(null); setSelectedTutor(null); setReviewNotes('')
      setToast({ msg: 'Application rejected. Email sent to applicant.', type: 'success' })
    } catch (err) {
      setToast({ msg: `Rejection failed: ${err.message}`, type: 'error' })
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
      setToast({ msg: `Could not load document: ${err.message}`, type: 'error' })
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
        <div className="px-3 pb-8 pt-1">
          <h1 className="text-2xl font-bold text-primary">AcademiaFlow</h1>
          <p className="text-xs text-on-surface-variant mt-0.5">Admin Console</p>
        </div>

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
      <main className="flex-1 ml-64 min-h-screen flex flex-col">

        {/* Top bar */}
        <header className="h-16 fixed top-0 right-0 left-64 z-10 bg-white shadow-sm flex justify-between items-center px-10">
          <div className="relative w-96">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
            <input
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-outline-variant bg-gray-50 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
              placeholder="Search tutors, subjects, users..."
              type="text"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-gray-100 hover:text-primary transition-colors" onClick={fetchData} title="Refresh">
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
              <h3 className="text-xl font-bold">Reject Application</h3>
            </div>
            <p className="text-sm text-on-surface-variant mb-6">
              Provide a clear reason for rejecting <strong>{rejectTarget.full_name}</strong>. This will be emailed to the applicant.
            </p>
            <div className="mb-6">
              <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">Rejection Reason</label>
              <textarea
                className="w-full h-32 p-3 rounded-xl border border-outline-variant focus:ring-2 focus:ring-error/20 focus:border-error transition-all resize-none text-sm outline-none"
                placeholder="e.g., Missing professional certificate, ID photo is unclear..."
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
                {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
              <button
                className="w-full py-3 text-sm font-bold text-on-surface-variant hover:bg-gray-50 rounded-xl transition-colors disabled:opacity-50"
                onClick={() => setRejectTarget(null)}
                disabled={actionLoading}
              >
                Cancel
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
                <p className="text-sm text-on-surface-variant">Loading secure document...</p>
              </div>
            )}
            {!previewLoading && previewError && (
              <div className="bg-white rounded-2xl shadow-2xl flex flex-col items-center justify-center gap-4 p-12 min-h-[300px]">
                <span className="material-symbols-outlined text-5xl text-error">broken_image</span>
                <p className="text-sm font-bold text-error">Could not load document</p>
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
  { month: 'Jan', h: 42 }, { month: 'Feb', h: 52 }, { month: 'Mar', h: 47 },
  { month: 'Apr', h: 68 }, { month: 'May', h: 80 }, { month: 'Jun', h: 95 },
]

function DashboardView({ stats, loading, onNavigate }) {
  return (
    <div className="p-10 max-w-[1280px] mx-auto w-full">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-on-background">Dashboard Overview</h2>
        <p className="text-sm text-on-surface-variant mt-1">Platform analytics and operational summary.</p>
      </div>

      {/* AI Platform Summary */}
      <div className="bg-white rounded-xl p-6 border-l-4 border-primary shadow-sm mb-6 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <span className="material-symbols-outlined text-[28px]">psychology</span>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-on-background mb-3">AI Platform Summary</h3>
            <div className="flex flex-wrap gap-x-8 gap-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                <span className="text-sm text-on-surface-variant"><strong className="text-on-background">5</strong> applications missing documents</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                <span className="text-sm text-on-surface-variant"><strong className="text-on-background">3</strong> urgent complaints</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                <span className="text-sm text-on-surface-variant"><strong className="text-on-background">2</strong> suspicious transactions</span>
              </div>
            </div>
          </div>
          <button
            className="shrink-0 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors"
            onClick={() => onNavigate('tutor-approval')}
          >
            Review Flags
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-6 mb-6">
        <OverviewCard icon="group"       iconBg="bg-gray-100"    iconColor="text-on-surface-variant" label="Total Users"      value="24,592"  trend="+12%" trendUp />
        <OverviewCard icon="school"      iconBg="bg-blue-50"     iconColor="text-blue-700"           label="Active Students" value="18,204"  trend="+8%"  trendUp />
        <OverviewCard icon="history_edu" iconBg="bg-indigo-50"   iconColor="text-indigo-700"         label="Active Tutors"   value="6,388"   trend="+4%"  trendUp />
        <OverviewCard icon="how_to_reg"  iconBg="bg-amber-50"    iconColor="text-amber-700"          label="Pending Apps"    value={loading ? '…' : String(stats.pending)} trend="+18%" trendUp={false} />
        <OverviewCard icon="payments"    iconBg="bg-emerald-50"  iconColor="text-emerald-700"        label="Monthly Revenue" value="$124.5k" trend="+22%" trendUp />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-12 gap-6">
        {/* Bar Chart */}
        <div className="col-span-8 bg-white rounded-xl p-6 shadow-sm flex flex-col h-[380px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-on-background">User Growth Trends</h3>
            <select className="bg-gray-50 border border-outline-variant rounded-lg text-xs text-on-surface-variant py-2 pl-3 pr-6 outline-none">
              <option>Last 6 Months</option>
              <option>This Year</option>
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
              <span className="text-xs text-on-surface-variant">New Users</span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="col-span-4 bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-on-background mb-5">Recent Activity</h3>
          <div className="space-y-4">
            {[
              { icon: 'how_to_reg',   color: 'text-blue-600',    bg: 'bg-blue-50',    text: '12 new tutor applications',   sub: '2 hours ago' },
              { icon: 'payments',     color: 'text-emerald-600', bg: 'bg-emerald-50', text: 'Revenue up 22% this month',   sub: 'Today' },
              { icon: 'report_problem', color: 'text-amber-600', bg: 'bg-amber-50',  text: '3 complaints need review',    sub: '5 hours ago' },
              { icon: 'school',       color: 'text-indigo-600',  bg: 'bg-indigo-50',  text: '150 new students joined',     sub: 'Yesterday' },
              { icon: 'verified_user',color: 'text-green-600',   bg: 'bg-green-50',   text: '8 tutors approved today',     sub: 'Today' },
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
          { id: 'tutor-approval',  icon: 'how_to_reg',  label: 'Tutor Approval',  desc: 'Review pending applications', count: null, accent: 'border-blue-500' },
          { id: 'complaints',      icon: 'report_problem', label: 'Complaints',   desc: '3 urgent items need attention', count: 3, accent: 'border-amber-500' },
          { id: 'transactions',    icon: 'payments',    label: 'Transactions',    desc: 'Monitor payment activity', count: null, accent: 'border-emerald-500' },
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
    const fields = [selectedTutor.bio, selectedTutor.subjects, selectedTutor.certificate_url, selectedTutor.cccd_url]
    return Math.round((fields.filter(Boolean).length / fields.length) * 100)
  })()

  const risk = (() => {
    if (!selectedTutor) return {}
    const hasCert = !!selectedTutor.certificate_url
    const hasCccd = !!selectedTutor.cccd_url
    if (hasCert && hasCccd) return { level: 'Low',    color: 'text-green-600',  icon: 'verified_user', note: 'No flags detected.' }
    if (hasCert || hasCccd) return { level: 'Medium', color: 'text-amber-600',  icon: 'warning',       note: 'One document missing.' }
    return                         { level: 'High',   color: 'text-red-600',    icon: 'gpp_bad',       note: 'Documents not submitted.' }
  })()

  return (
    <div className="p-10 flex gap-8 max-w-[1600px] mx-auto w-full">

      {/* Left Column */}
      <div className="flex-1 flex flex-col gap-5 min-w-0">

        {/* Security Notice */}
        <div className="bg-red-50 rounded-lg p-4 flex items-start gap-3 border border-red-200">
          <span className="material-symbols-outlined text-red-600 mt-0.5">gpp_bad</span>
          <div>
            <h3 className="text-sm font-bold text-red-900 mb-0.5">Security Notice</h3>
            <p className="text-sm text-red-700">Only administrators can view sensitive tutor documents such as certificates and CCCD / ID cards.</p>
          </div>
        </div>

        {/* Header */}
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold text-on-surface">Pending Approvals</h2>
            <p className="text-sm text-on-surface-variant mt-1">Review and manage new tutor applications.</p>
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-2 border border-outline-variant rounded-lg text-sm font-semibold text-on-surface hover:bg-gray-50 transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-[18px]">filter_list</span> Filter
            </button>
            <button className="px-3 py-2 border border-outline-variant rounded-lg text-sm font-semibold text-on-surface hover:bg-gray-50 transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-[18px]">sort</span> Sort
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-outline-variant overflow-hidden">
          {loading && (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-on-surface-variant">
              <span className="material-symbols-outlined text-5xl animate-spin">progress_activity</span>
              <p className="text-sm">Loading applications...</p>
            </div>
          )}
          {!loading && error && (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-error">
              <span className="material-symbols-outlined text-5xl">error_outline</span>
              <p className="text-sm">{error}</p>
              <button onClick={onRefresh} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:opacity-90">Retry</button>
            </div>
          )}
          {!loading && !error && tutors.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-on-surface-variant">
              <span className="material-symbols-outlined text-5xl text-green-500">task_alt</span>
              <p className="text-sm">No pending applications. All caught up!</p>
            </div>
          )}
          {!loading && !error && tutors.length > 0 && (
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 border-b border-outline-variant">
                <tr>
                  <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Applicant</th>
                  <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Subjects</th>
                  <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Experience</th>
                  <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase tracking-wide text-right">Documents</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {tutors.map(tutor => {
                  const isSelected = selectedTutor?.id === tutor.id
                  return (
                    <tr
                      key={tutor.id}
                      onClick={() => onSelectTutor(tutor)}
                      className={`transition-colors group cursor-pointer ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          {tutor.profile_photo_url && !tutor.profile_photo_url.startsWith('http://randomuser') ? (
                            <img src={tutor.profile_photo_url} alt={tutor.full_name} className="w-10 h-10 rounded-full object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                              {(tutor.full_name || '?').charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-semibold text-on-surface">{tutor.full_name}</p>
                            <p className="text-xs text-on-surface-variant">{tutor.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex gap-1 flex-wrap">
                          {(tutor.subjects || 'N/A').split(',').slice(0, 2).map((s, i) => (
                            <span key={i} className="px-2 py-0.5 bg-blue-50 text-primary text-xs font-semibold rounded">
                              {s.trim()}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-sm text-on-surface">
                          {tutor.experience_years != null ? `${tutor.experience_years} Years` : '—'}
                        </p>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className={`flex justify-end items-center gap-1 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                          <button
                            className="p-1.5 text-primary hover:bg-primary/10 rounded-full transition-colors disabled:opacity-30"
                            title="View Certificate"
                            onClick={e => { e.stopPropagation(); onViewDoc(tutor.certificate_url) }}
                            disabled={!tutor.certificate_url}
                          >
                            <span className="material-symbols-outlined text-[20px]">workspace_premium</span>
                          </button>
                          <button
                            className="p-1.5 text-primary hover:bg-primary/10 rounded-full transition-colors disabled:opacity-30"
                            title="View ID Card"
                            onClick={e => { e.stopPropagation(); onViewDoc(tutor.cccd_url) }}
                            disabled={!tutor.cccd_url}
                          >
                            <span className="material-symbols-outlined text-[20px]">badge</span>
                          </button>
                          <button
                            className={`ml-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                              isSelected
                                ? 'bg-primary text-white'
                                : 'border border-primary text-primary hover:bg-primary/5'
                            }`}
                            onClick={e => { e.stopPropagation(); onSelectTutor(tutor) }}
                          >
                            Review
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
          {!loading && !error && tutors.length > 0 && (
            <div className="px-6 py-3 bg-gray-50 border-t border-outline-variant">
              <p className="text-xs text-on-surface-variant">{tutors.length} pending application{tutors.length !== 1 ? 's' : ''}</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: AI Review Assistant */}
      <aside className="w-[380px] flex-shrink-0">
        <div className="bg-white rounded-xl shadow-sm border border-outline-variant p-6 sticky top-[84px]">
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-outline-variant">
            <span className="material-symbols-outlined text-primary text-[28px]">psychology</span>
            <h3 className="text-lg font-semibold text-on-surface">AI Review Assistant</h3>
          </div>

          {!selectedTutor ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <span className="material-symbols-outlined text-5xl text-outline">person_search</span>
              <p className="text-sm text-on-surface-variant">Select a tutor from the table to start the review process.</p>
            </div>
          ) : (
            <>
              {/* Applicant summary */}
              <div className="flex items-center gap-4 mb-5">
                {selectedTutor.profile_photo_url && !selectedTutor.profile_photo_url.startsWith('http://randomuser') ? (
                  <img src={selectedTutor.profile_photo_url} alt={selectedTutor.full_name} className="w-16 h-16 rounded-full shadow-sm object-cover flex-shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold shadow-sm flex-shrink-0">
                    {(selectedTutor.full_name || '?').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-base font-bold text-on-surface truncate">{selectedTutor.full_name}</p>
                  <p className="text-sm text-on-surface-variant">Reviewing Application</p>
                  <p className="text-xs text-on-surface-variant mt-0.5 truncate">{selectedTutor.email}</p>
                </div>
              </div>

              {/* Score cards */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-gray-50 rounded-lg p-3 border border-outline-variant">
                  <p className="text-xs text-on-surface-variant mb-2">Profile Completeness</p>
                  <div className="flex items-end gap-1">
                    <span className="text-2xl font-bold text-primary">{completeness}%</span>
                    <span className={`material-symbols-outlined text-[18px] mb-0.5 ${completeness >= 75 ? 'text-green-600' : 'text-amber-600'}`}>
                      {completeness >= 75 ? 'check_circle' : 'warning'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 h-1 mt-2 rounded-full overflow-hidden">
                    <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${completeness}%` }} />
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-outline-variant">
                  <p className="text-xs text-on-surface-variant mb-2">Risk Assessment</p>
                  <div className="flex items-end gap-1">
                    <span className={`text-2xl font-bold ${risk.color}`}>{risk.level}</span>
                    <span className={`material-symbols-outlined text-[18px] mb-0.5 ${risk.color}`}>{risk.icon}</span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-2">{risk.note}</p>
                </div>
              </div>

              {/* Document analysis */}
              <h4 className="text-sm font-bold text-on-surface mb-3">Document Analysis</h4>
              <div className="space-y-2 mb-5">
                {[
                  { label: 'Certificate', icon: 'workspace_premium', url: selectedTutor.certificate_url, sub: selectedTutor.certificate_url ? 'Document uploaded' : 'Not submitted' },
                  { label: 'National ID / CCCD', icon: 'badge', url: selectedTutor.cccd_url, sub: selectedTutor.cccd_url ? 'Document uploaded' : 'Not submitted' },
                ].map(doc => (
                  <div key={doc.label} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-outline-variant">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary">{doc.icon}</span>
                      <div>
                        <p className="text-sm font-semibold text-on-surface">{doc.label}</p>
                        <p className="text-xs text-on-surface-variant">{doc.sub}</p>
                      </div>
                    </div>
                    <span className={`material-symbols-outlined ${doc.url ? 'text-green-600' : 'text-red-400'}`}>
                      {doc.url ? 'check' : 'close'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Review notes */}
              <div className="mb-4">
                <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">
                  Review Notes <span className="font-normal normal-case">(included in email)</span>
                </label>
                <textarea
                  className="w-full bg-gray-50 border border-outline-variant rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                  placeholder="Add notes for the applicant..."
                  rows={2}
                  value={reviewNotes}
                  onChange={e => setReviewNotes(e.target.value)}
                />
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-4 border-t border-outline-variant">
                <button
                  className="w-full h-12 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  onClick={() => onApprove(selectedTutor.id)}
                  disabled={actionLoading}
                >
                  <span className="material-symbols-outlined text-[20px]">thumb_up</span>
                  {actionLoading ? 'Processing...' : 'Approve Tutor'}
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    className="h-12 border border-outline-variant bg-gray-50 text-on-surface rounded-lg text-sm font-semibold hover:bg-gray-100 transition-colors flex items-center justify-center gap-1 disabled:opacity-40"
                    onClick={() => onViewDoc(selectedTutor.certificate_url || selectedTutor.cccd_url)}
                    disabled={!selectedTutor.certificate_url && !selectedTutor.cccd_url}
                  >
                    <span className="material-symbols-outlined text-[18px]">visibility</span>
                    View Docs
                  </button>
                  <button
                    className="h-12 border border-red-300 text-red-600 bg-red-50 rounded-lg text-sm font-semibold hover:bg-red-100 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                    onClick={() => onReject(selectedTutor)}
                    disabled={actionLoading}
                  >
                    <span className="material-symbols-outlined text-[18px]">thumb_down</span>
                    Reject
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  )
}

// ─── User Management View ─────────────────────────────────────────────────────
function UserManagementView() {
  const { token } = useAuth()

  const [users,      setUsers]      = useState([])
  const [total,      setTotal]      = useState(0)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [search,     setSearch]     = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [page,       setPage]       = useState(1)
  const [actionId,   setActionId]   = useState(null)   // id of user being acted on
  const [toast,      setUMToast]    = useState(null)

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

  async function handleBan(u) {
    setActionId(u.id)
    try {
      const updated = await authFetch(`${API}/api/admin/users/${u.id}/ban`, token, {
        method: 'PATCH',
        body: JSON.stringify({ banned: !u.is_banned }),
      })
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_banned: updated.is_banned } : x))
      setUMToast({ msg: updated.is_banned ? `${u.full_name} has been banned.` : `${u.full_name} has been unbanned.`, type: 'success' })
    } catch (err) {
      setUMToast({ msg: `Action failed: ${err.message}`, type: 'error' })
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
      setUMToast({ msg: `${u.full_name}'s role changed to ${newRole}.`, type: 'success' })
    } catch (err) {
      setUMToast({ msg: `Role change failed: ${err.message}`, type: 'error' })
    } finally { setActionId(null) }
  }

  const statusColor = isBanned => isBanned ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
  const roleColor   = r => r === 'tutor' ? 'bg-indigo-100 text-indigo-700' : r === 'admin' ? 'bg-amber-100 text-amber-700' : r === 'parent' ? 'bg-purple-100 text-purple-700' : 'bg-blue-50 text-blue-700'

  const banned  = users.filter(u => u.is_banned).length
  const tutors  = users.filter(u => u.role === 'tutor').length
  const students = users.filter(u => u.role === 'student').length

  return (
    <div className="p-10 max-w-[1280px] mx-auto">

      {/* Local toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[999] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          <span className="material-symbols-outlined text-[18px]">{toast.type === 'success' ? 'check_circle' : 'error'}</span>
          {toast.msg}
        </div>
      )}

      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-bold text-on-background">User Management</h2>
          <p className="text-sm text-on-surface-variant mt-1">Manage platform users — students, tutors, and parents.</p>
        </div>
        <button onClick={() => fetchUsers(page)} className="px-4 py-2 border border-outline-variant rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-gray-50 transition-colors">
          <span className="material-symbols-outlined text-[18px]">refresh</span> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Total (this page)', value: total,    icon: 'group',       bg: 'bg-gray-100',   color: 'text-on-surface-variant' },
          { label: 'Students',          value: students, icon: 'school',      bg: 'bg-blue-50',    color: 'text-blue-700' },
          { label: 'Tutors',            value: tutors,   icon: 'history_edu', bg: 'bg-indigo-50',  color: 'text-indigo-700' },
          { label: 'Banned (this page)',value: banned,   icon: 'block',       bg: 'bg-red-50',     color: 'text-red-600' },
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

      <div className="bg-white rounded-xl shadow-sm border border-outline-variant overflow-hidden">
        {/* Filters */}
        <div className="flex items-center gap-4 px-6 py-4 border-b border-outline-variant flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
            <input
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-outline-variant rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
              placeholder="Search by name or email..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          {[['all','All'], ['student','Students'], ['tutor','Tutors'], ['parent','Parents']].map(([val, label]) => (
            <button key={val} onClick={() => { setRoleFilter(val); setPage(1) }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${roleFilter === val ? 'bg-primary text-white' : 'bg-gray-100 text-on-surface-variant hover:bg-gray-200'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-on-surface-variant">
            <span className="material-symbols-outlined text-5xl animate-spin">progress_activity</span>
            <p className="text-sm">Loading users...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-error">
            <span className="material-symbols-outlined text-5xl">error_outline</span>
            <p className="text-sm">{error}</p>
            <button onClick={() => fetchUsers(page)} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold">Retry</button>
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-on-surface-variant">
            <span className="material-symbols-outlined text-5xl">manage_search</span>
            <p className="text-sm">No users found matching your filters.</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-outline-variant">
              <tr>
                <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase">User</th>
                <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase">Role</th>
                <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase">Status</th>
                <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase">Joined</th>
                <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {users.map(u => (
                <tr key={u.id} className={`hover:bg-gray-50 transition-colors group ${u.is_banned ? 'opacity-60' : ''}`}>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      {u.picture ? (
                        <img src={u.picture} alt={u.full_name} className="w-9 h-9 rounded-full object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                          {(u.full_name || u.email || '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-semibold text-on-surface">{u.full_name || '—'}</p>
                        <p className="text-xs text-on-surface-variant">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    {u.role === 'admin' ? (
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${roleColor(u.role)}`}>{u.role}</span>
                    ) : (
                      <select
                        value={u.role}
                        disabled={!!actionId}
                        onChange={e => handleRoleChange(u, e.target.value)}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold border-0 outline-none cursor-pointer ${roleColor(u.role)}`}
                      >
                        <option value="student">student</option>
                        <option value="tutor">tutor</option>
                        <option value="parent">parent</option>
                      </select>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor(u.is_banned)}`}>
                      {u.is_banned ? 'Banned' : 'Active'}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-sm text-on-surface-variant">{fmtDate(u.created_at)}</td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {u.role !== 'admin' && (
                        <button
                          onClick={() => handleBan(u)}
                          disabled={actionId === u.id}
                          title={u.is_banned ? 'Unban user' : 'Ban user'}
                          className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${u.is_banned ? 'hover:bg-green-50 text-green-600' : 'hover:bg-red-50 text-red-500'}`}
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {actionId === u.id ? 'progress_activity' : u.is_banned ? 'lock_open' : 'block'}
                          </span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {!loading && !error && total > LIMIT && (
          <div className="px-6 py-3 bg-gray-50 border-t border-outline-variant flex justify-between items-center">
            <p className="text-xs text-on-surface-variant">
              Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total} users
            </p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="w-8 h-8 rounded-lg text-xs font-semibold bg-gray-100 text-on-surface-variant hover:bg-gray-200 disabled:opacity-40">
                ‹
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.min(Math.max(page - 2, 1) + i, totalPages)
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-xs font-semibold ${p === page ? 'bg-primary text-white' : 'bg-gray-100 text-on-surface-variant hover:bg-gray-200'}`}>
                    {p}
                  </button>
                )
              })}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="w-8 h-8 rounded-lg text-xs font-semibold bg-gray-100 text-on-surface-variant hover:bg-gray-200 disabled:opacity-40">
                ›
              </button>
            </div>
          </div>
        )}
        {!loading && !error && users.length > 0 && total <= LIMIT && (
          <div className="px-6 py-3 bg-gray-50 border-t border-outline-variant">
            <p className="text-xs text-on-surface-variant">Showing {users.length} of {total} users</p>
          </div>
        )}
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
          <h2 className="text-3xl font-bold text-on-background">Subjects</h2>
          <p className="text-sm text-on-surface-variant mt-1">Manage academic subjects offered on the platform.</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-primary/90 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">add</span> Add Subject
        </button>
      </div>

      <div className="mb-6">
        <div className="relative max-w-sm">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
          <input
            className="w-full pl-9 pr-4 py-2 bg-white border border-outline-variant rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 shadow-sm"
            placeholder="Search subjects..."
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
                <p className="text-xs text-on-surface-variant">Tutors</p>
              </div>
              <div className="w-px bg-outline-variant" />
              <div>
                <p className="text-2xl font-bold text-on-surface">{s.students.toLocaleString()}</p>
                <p className="text-xs text-on-surface-variant">Students</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-outline-variant">
              <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-primary h-full rounded-full" style={{ width: `${Math.min(100, (s.tutors / 250) * 100)}%` }} />
              </div>
              <p className="text-xs text-on-surface-variant mt-1">{Math.round((s.tutors / 250) * 100)}% tutor capacity</p>
            </div>
          </div>
        ))}
      </div>

      {showAdd && (
        <ModalOverlay onClose={() => setShowAdd(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-on-surface mb-4">Add New Subject</h3>
            <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">Subject Name</label>
            <input
              className="w-full px-4 py-2 border border-outline-variant rounded-lg text-sm focus:outline-none focus:border-primary mb-6"
              placeholder="e.g. Advanced Physics"
              value={newName}
              onChange={e => setNewName(e.target.value)}
            />
            <div className="flex gap-3">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 bg-primary text-white rounded-lg text-sm font-bold hover:opacity-90 transition-opacity">
                Add Subject
              </button>
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 bg-gray-100 text-on-surface-variant rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors">
                Cancel
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
  { id: 'L001', title: 'Introduction to Calculus',      tutor: 'Tran Thi Bich',   subject: 'Mathematics',  status: 'Active',   date: '2024-06-01', students: 24 },
  { id: 'L002', title: 'Newton\'s Laws of Motion',      tutor: 'Pham Quynh Anh',  subject: 'Physics',      status: 'Active',   date: '2024-06-03', students: 18 },
  { id: 'L003', title: 'Organic Chemistry Basics',      tutor: 'Bui Phuong Thao', subject: 'Chemistry',    status: 'Draft',    date: '2024-06-05', students: 0  },
  { id: 'L004', title: 'English Grammar Mastery',       tutor: 'Tran Thi Bich',   subject: 'English',      status: 'Active',   date: '2024-06-07', students: 51 },
  { id: 'L005', title: 'Data Structures & Algorithms',  tutor: 'Pham Quynh Anh',  subject: 'CS',           status: 'Active',   date: '2024-06-09', students: 37 },
  { id: 'L006', title: 'Vietnam War Era Analysis',      tutor: 'Bui Phuong Thao', subject: 'History',      status: 'Archived', date: '2024-05-20', students: 12 },
]

function LessonsView() {
  const [statusFilter, setStatusFilter] = useState('All')
  const statusColor = s => s === 'Active' ? 'bg-green-100 text-green-700' : s === 'Draft' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
  const filtered = statusFilter === 'All' ? MOCK_LESSONS : MOCK_LESSONS.filter(l => l.status === statusFilter)

  return (
    <div className="p-10 max-w-[1280px] mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-bold text-on-background">Lessons</h2>
          <p className="text-sm text-on-surface-variant mt-1">Monitor all lesson content published on the platform.</p>
        </div>
        <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-primary/90">
          <span className="material-symbols-outlined text-[18px]">download</span> Export
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-outline-variant overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-outline-variant">
          {['All','Active','Draft','Archived'].map(s => (
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
            <input className="pl-9 pr-4 py-2 bg-gray-50 border border-outline-variant rounded-lg text-sm focus:outline-none focus:border-primary w-56" placeholder="Search lessons..." />
          </div>
        </div>

        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-outline-variant">
            <tr>
              <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase">Lesson</th>
              <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase">Tutor</th>
              <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase">Subject</th>
              <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase">Students</th>
              <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase">Status</th>
              <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase">Created</th>
              <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase text-right">Actions</th>
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
  { id: 'TXN-4821', user: 'Nguyen Van An',   tutor: 'Tran Thi Bich',   amount: 250000,  status: 'Completed', date: '2024-06-10' },
  { id: 'TXN-4820', user: 'Hoang Duc Manh',  tutor: 'Pham Quynh Anh',  amount: 180000,  status: 'Completed', date: '2024-06-10' },
  { id: 'TXN-4819', user: 'Do Thanh Long',   tutor: 'Bui Phuong Thao', amount: 320000,  status: 'Pending',   date: '2024-06-09' },
  { id: 'TXN-4818', user: 'Le Minh Cuong',   tutor: 'Tran Thi Bich',   amount: 200000,  status: 'Refunded',  date: '2024-06-08' },
  { id: 'TXN-4817', user: 'Pham Quynh Anh',  tutor: 'Bui Phuong Thao', amount: 150000,  status: 'Completed', date: '2024-06-07' },
  { id: 'TXN-4816', user: 'Nguyen Van An',   tutor: 'Pham Quynh Anh',  amount: 280000,  status: 'Failed',    date: '2024-06-06' },
  { id: 'TXN-4815', user: 'Do Thanh Long',   tutor: 'Tran Thi Bich',   amount: 200000,  status: 'Completed', date: '2024-06-05' },
]

function TransactionsView() {
  const [statusFilter, setStatusFilter] = useState('All')
  const statusColor = s => ({
    Completed: 'bg-green-100 text-green-700',
    Pending:   'bg-amber-100 text-amber-700',
    Refunded:  'bg-blue-100 text-blue-700',
    Failed:    'bg-red-100 text-red-600',
  }[s] || 'bg-gray-100 text-gray-600')
  const fmt = n => 'đ' + n.toLocaleString('vi-VN')
  const filtered = statusFilter === 'All' ? MOCK_TXN : MOCK_TXN.filter(t => t.status === statusFilter)

  const totalRev = MOCK_TXN.filter(t => t.status === 'Completed').reduce((a, t) => a + t.amount, 0)

  return (
    <div className="p-10 max-w-[1280px] mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-bold text-on-background">Transactions</h2>
          <p className="text-sm text-on-surface-variant mt-1">Monitor all payment activity on the platform.</p>
        </div>
        <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-primary/90">
          <span className="material-symbols-outlined text-[18px]">download</span> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Total Revenue',  value: fmt(totalRev),    icon: 'payments',       bg: 'bg-emerald-50',  color: 'text-emerald-700' },
          { label: 'Completed',      value: MOCK_TXN.filter(t=>t.status==='Completed').length, icon: 'check_circle', bg: 'bg-green-50', color: 'text-green-700' },
          { label: 'Pending',        value: MOCK_TXN.filter(t=>t.status==='Pending').length,   icon: 'schedule',     bg: 'bg-amber-50', color: 'text-amber-700' },
          { label: 'Failed/Refunded',value: MOCK_TXN.filter(t=>['Failed','Refunded'].includes(t.status)).length, icon: 'cancel', bg: 'bg-red-50', color: 'text-red-600' },
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
          {['All','Completed','Pending','Refunded','Failed'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${statusFilter === s ? 'bg-primary text-white' : 'bg-gray-100 text-on-surface-variant hover:bg-gray-200'}`}>
              {s}
            </button>
          ))}
        </div>
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-outline-variant">
            <tr>
              <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase">Transaction ID</th>
              <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase">Student</th>
              <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase">Tutor</th>
              <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase">Amount</th>
              <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase">Status</th>
              <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase">Date</th>
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
  { id: 'C-101', reporter: 'Nguyen Van An',  against: 'Tran Thi Bich',   issue: 'Tutor did not show up for scheduled session',  priority: 'High',   status: 'Open',        date: '2024-06-10' },
  { id: 'C-100', reporter: 'Do Thanh Long',  against: 'Pham Quynh Anh',  issue: 'Content was misleading and inaccurate',         priority: 'Medium', status: 'In Review',   date: '2024-06-08' },
  { id: 'C-099', reporter: 'Hoang Duc Manh', against: 'Bui Phuong Thao', issue: 'Refund not processed after cancellation',       priority: 'High',   status: 'Open',        date: '2024-06-07' },
  { id: 'C-098', reporter: 'Le Minh Cuong',  against: 'Tran Thi Bich',   issue: 'Inappropriate language during session',         priority: 'High',   status: 'Resolved',    date: '2024-06-01' },
  { id: 'C-097', reporter: 'Bui Phuong Thao',against: 'Nguyen Van An',   issue: 'Student was disruptive during group lesson',    priority: 'Low',    status: 'Resolved',    date: '2024-05-28' },
]

function ComplaintsView() {
  const [statusFilter, setStatusFilter] = useState('All')
  const priorityColor = p => p === 'High' ? 'bg-red-100 text-red-700' : p === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
  const statusColor   = s => s === 'Open' ? 'bg-red-50 text-red-700 border border-red-200' : s === 'In Review' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-green-50 text-green-700 border border-green-200'
  const filtered = statusFilter === 'All' ? MOCK_COMPLAINTS : MOCK_COMPLAINTS.filter(c => c.status === statusFilter)

  return (
    <div className="p-10 max-w-[1280px] mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-bold text-on-background">Complaints</h2>
          <p className="text-sm text-on-surface-variant mt-1">Review and resolve user-reported issues.</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {[
          { label: 'Open',      count: MOCK_COMPLAINTS.filter(c=>c.status==='Open').length,      color: 'border-red-400',   icon: 'report_problem', iconColor: 'text-red-600',   bg: 'bg-red-50' },
          { label: 'In Review', count: MOCK_COMPLAINTS.filter(c=>c.status==='In Review').length, color: 'border-amber-400', icon: 'rate_review',    iconColor: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Resolved',  count: MOCK_COMPLAINTS.filter(c=>c.status==='Resolved').length,  color: 'border-green-400', icon: 'check_circle',   iconColor: 'text-green-600', bg: 'bg-green-50' },
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
          {['All','Open','In Review','Resolved'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${statusFilter === s ? 'bg-primary text-white' : 'bg-gray-100 text-on-surface-variant hover:bg-gray-200'}`}>
              {s}
            </button>
          ))}
        </div>
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-outline-variant">
            <tr>
              <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase">ID</th>
              <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase">Reporter</th>
              <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase">Against</th>
              <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase">Issue</th>
              <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase">Priority</th>
              <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase">Status</th>
              <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase text-right">Action</th>
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
                    Review
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
  { id: 1, student: 'Nguyen Van An',   tutor: 'Tran Thi Bich',   rating: 5, comment: 'Excellent tutor! Very patient and knowledgeable.',      date: '2024-06-09', flag: false },
  { id: 2, student: 'Do Thanh Long',   tutor: 'Pham Quynh Anh',  rating: 4, comment: 'Good session overall, could improve time management.',  date: '2024-06-08', flag: false },
  { id: 3, student: 'Hoang Duc Manh',  tutor: 'Bui Phuong Thao', rating: 2, comment: 'Tutor was unprepared. Wasted my time.',                 date: '2024-06-07', flag: true  },
  { id: 4, student: 'Le Minh Cuong',   tutor: 'Tran Thi Bich',   rating: 5, comment: 'Helped me pass my exam! Highly recommend.',            date: '2024-06-06', flag: false },
  { id: 5, student: 'Nguyen Van An',   tutor: 'Bui Phuong Thao', rating: 1, comment: 'Completely inappropriate behavior. Report filed.',      date: '2024-06-05', flag: true  },
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
        <h2 className="text-3xl font-bold text-on-background">Reviews</h2>
        <p className="text-sm text-on-surface-variant mt-1">Monitor tutor ratings and student feedback.</p>
      </div>

      <div className="grid grid-cols-12 gap-6 mb-8">
        {/* Rating overview */}
        <div className="col-span-4 bg-white rounded-xl p-6 shadow-sm border border-outline-variant text-center">
          <p className="text-6xl font-bold text-primary mb-1">{avg}</p>
          <div className="flex justify-center mb-2">
            <Stars n={Math.round(Number(avg))} />
          </div>
          <p className="text-sm text-on-surface-variant">{MOCK_REVIEWS.length} total reviews</p>
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
              <p className="text-sm font-bold text-red-900">{MOCK_REVIEWS.filter(r => r.flag).length} flagged reviews require attention</p>
              <p className="text-xs text-red-700 mt-0.5">These reviews contain potentially abusive or false content.</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 flex-1">
            {[
              { label: '5-Star Reviews', value: MOCK_REVIEWS.filter(r=>r.rating===5).length, icon: 'star', color: 'text-amber-500', bg: 'bg-amber-50' },
              { label: 'Flagged',        value: MOCK_REVIEWS.filter(r=>r.flag).length,        icon: 'flag', color: 'text-red-600',   bg: 'bg-red-50' },
              { label: 'This Week',      value: MOCK_REVIEWS.length,                          icon: 'calendar_today', color: 'text-indigo-600', bg: 'bg-indigo-50' },
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
          <h3 className="text-base font-semibold text-on-surface">All Reviews</h3>
          <button className="flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-[18px]">filter_list</span> Filter
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
                      {r.flag && <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">Flagged</span>}
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
  { title: 'Monthly Platform Report',    desc: 'User growth, revenue, and engagement stats for this month.',    icon: 'bar_chart',      color: 'bg-blue-50 text-blue-700',    ready: true  },
  { title: 'Tutor Performance Report',   desc: 'Ratings, session counts, and approval rates per tutor.',       icon: 'history_edu',    color: 'bg-indigo-50 text-indigo-700', ready: true  },
  { title: 'Revenue & Transactions',     desc: 'Payment breakdown, refunds, and financial summary.',           icon: 'payments',       color: 'bg-emerald-50 text-emerald-700', ready: true },
  { title: 'Student Engagement Report',  desc: 'Session attendance, quiz scores, and activity heatmap.',       icon: 'school',         color: 'bg-cyan-50 text-cyan-700',    ready: true  },
  { title: 'Complaint & Safety Report',  desc: 'Flagged users, resolved disputes, and safety incidents.',      icon: 'report_problem', color: 'bg-amber-50 text-amber-700',  ready: false },
  { title: 'AI Audit & Insights Report', desc: 'AI-generated summaries of anomalies and predictions.',         icon: 'psychology',     color: 'bg-purple-50 text-purple-700', ready: false },
]

function ReportsView() {
  return (
    <div className="p-10 max-w-[1280px] mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-bold text-on-background">Reports</h2>
          <p className="text-sm text-on-surface-variant mt-1">Download or generate platform analytics reports.</p>
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
          { label: 'Total Sessions This Month', value: '3,412',  change: '+14%', up: true  },
          { label: 'Revenue This Month',        value: '$124.5k', change: '+22%', up: true  },
          { label: 'Avg. Session Rating',       value: '4.6 ★',  change: '-0.1', up: false },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-6 shadow-sm border border-outline-variant">
            <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-2">{s.label}</p>
            <p className="text-3xl font-bold text-on-background mb-1">{s.value}</p>
            <p className={`text-sm font-semibold flex items-center gap-1 ${s.up ? 'text-green-600' : 'text-red-500'}`}>
              <span className="material-symbols-outlined text-[16px]">{s.up ? 'trending_up' : 'trending_down'}</span>
              {s.change} vs last month
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
                {!r.ready && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full whitespace-nowrap">Coming soon</span>}
              </div>
              <p className="text-xs text-on-surface-variant mb-4">{r.desc}</p>
              <div className="flex gap-2">
                <button
                  disabled={!r.ready}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[15px]">download</span> Download PDF
                </button>
                <button
                  disabled={!r.ready}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-outline-variant text-on-surface-variant rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[15px]">table_chart</span> Export CSV
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
  { type: 'Suspicious Transaction', detail: 'TXN-4816: unusually large refund request within 1 hour of payment.', level: 'High',   icon: 'payments',       color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200' },
  { type: 'Document Mismatch',      detail: '3 pending applicants have ID photos that don\'t match profile images.', level: 'High', icon: 'badge',          color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200' },
  { type: 'Unusual Login Pattern',  detail: 'User vu.thi.lan@email.com logged in from 4 different countries in 24h.', level: 'Medium', icon: 'travel_explore', color: 'text-amber-600', bg: 'bg-amber-50',  border: 'border-amber-200' },
  { type: 'Review Spam Detected',   detail: '8 reviews from the same IP address targeting one tutor.', level: 'Medium', icon: 'reviews', color: 'text-amber-600', bg: 'bg-amber-50',  border: 'border-amber-200' },
  { type: 'Inactivity Drop',        detail: 'Student engagement dropped 31% in Physics category this week.', level: 'Low', icon: 'trending_down', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
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
        <p className="text-sm text-on-surface-variant mt-1">Automated anomaly detection, trend analysis, and platform intelligence.</p>
      </div>

      {/* Anomaly Alert Banner */}
      <div className="bg-white rounded-xl p-5 border-l-4 border-red-500 shadow-sm mb-8 flex items-start gap-4">
        <div className="w-11 h-11 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
          <span className="material-symbols-outlined text-[24px]">warning</span>
        </div>
        <div className="flex-1">
          <h3 className="text-base font-bold text-on-surface mb-1">AI detected 2 high-priority anomalies requiring immediate action</h3>
          <p className="text-sm text-on-surface-variant">Suspicious transaction pattern and document mismatch flagged. Review below.</p>
        </div>
        <button className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity shrink-0">
          View All Flags
        </button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Anomaly feed */}
        <div className="col-span-7 flex flex-col gap-4">
          <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">psychology</span>
            Detected Anomalies
          </h3>
          {AI_FLAGS.map((f, i) => (
            <div key={i} className={`bg-white rounded-xl p-5 border ${f.border} shadow-sm flex items-start gap-4`}>
              <div className={`w-10 h-10 rounded-lg ${f.bg} flex items-center justify-center ${f.color} shrink-0`}>
                <span className="material-symbols-outlined text-[20px]">{f.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-bold text-on-surface">{f.type}</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${f.level === 'High' ? 'bg-red-100 text-red-700' : f.level === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                    {f.level}
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant">{f.detail}</p>
              </div>
              <button className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold hover:opacity-90 shrink-0">
                Investigate
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
              Subject Demand Trends
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
              AI Predictions
            </h3>
            <div className="space-y-3">
              {[
                { text: 'Revenue projected to reach $150k next month', confidence: '87%', up: true },
                { text: 'CS tutor shortage expected in 3 weeks', confidence: '73%', up: false },
                { text: '420 new student registrations expected this week', confidence: '91%', up: true },
              ].map((p, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-outline-variant">
                  <span className={`material-symbols-outlined text-[18px] mt-0.5 ${p.up ? 'text-green-600' : 'text-amber-600'}`}>
                    {p.up ? 'arrow_upward' : 'arrow_downward'}
                  </span>
                  <div className="flex-1">
                    <p className="text-xs text-on-surface">{p.text}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">Confidence: <strong className="text-primary">{p.confidence}</strong></p>
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
  const [levelFilter, setLevelFilter] = useState('All')
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
    const matchLevel  = levelFilter === 'All' || l.level === levelFilter
    const matchSearch = l.action.toLowerCase().includes(search.toLowerCase()) || l.actor.toLowerCase().includes(search.toLowerCase()) || l.target.toLowerCase().includes(search.toLowerCase())
    return matchLevel && matchSearch
  })

  const fmtTime = iso => {
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' · ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="p-10 max-w-[1280px] mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-bold text-on-background">Audit Logs</h2>
          <p className="text-sm text-on-surface-variant mt-1">Complete record of all administrative actions and system events.</p>
        </div>
        <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-primary/90">
          <span className="material-symbols-outlined text-[18px]">download</span> Export Logs
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Total Events Today', value: MOCK_LOGS.length,                               icon: 'history',      bg: 'bg-gray-100',   color: 'text-gray-600' },
          { label: 'Info',               value: MOCK_LOGS.filter(l=>l.level==='Info').length,    icon: 'info',         bg: 'bg-blue-50',    color: 'text-blue-600' },
          { label: 'Warnings',           value: MOCK_LOGS.filter(l=>l.level==='Warning').length, icon: 'warning',      bg: 'bg-amber-50',   color: 'text-amber-600' },
          { label: 'Critical',           value: MOCK_LOGS.filter(l=>l.level==='Critical').length,icon: 'error',        bg: 'bg-red-50',     color: 'text-red-600' },
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
          {['All','Info','Warning','Critical'].map(l => (
            <button key={l} onClick={() => setLevelFilter(l)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${levelFilter === l ? 'bg-primary text-white' : 'bg-gray-100 text-on-surface-variant hover:bg-gray-200'}`}>
              {l}
            </button>
          ))}
          <div className="ml-auto relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
            <input
              className="pl-9 pr-4 py-2 bg-gray-50 border border-outline-variant rounded-lg text-sm focus:outline-none focus:border-primary w-60"
              placeholder="Search logs..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-outline-variant">
            <tr>
              <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase">Event</th>
              <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase">Actor</th>
              <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase">Target</th>
              <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase">IP</th>
              <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase">Level</th>
              <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase">Time</th>
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
          <p className="text-xs text-on-surface-variant">Showing {filtered.length} of {MOCK_LOGS.length} log entries</p>
          <p className="text-xs text-on-surface-variant">Logs are retained for 90 days</p>
        </div>
      </div>
    </div>
  )
}

// ─── Settings View ────────────────────────────────────────────────────────────
function SettingsView() {
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    siteName: 'AcademiaFlow',
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
        <h2 className="text-3xl font-bold text-on-background">Settings</h2>
        <p className="text-sm text-on-surface-variant mt-1">Configure platform-wide settings and policies.</p>
      </div>

      {saved && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-green-600">check_circle</span>
          <p className="text-sm font-semibold text-green-800">Settings saved successfully!</p>
        </div>
      )}

      <div className="space-y-6">
        {/* General */}
        <SettingsSection title="General" icon="settings">
          <SettingsField label="Platform Name" sub="Displayed across the site and in emails.">
            <input className="settings-input" value={form.siteName} onChange={e => setForm(f => ({ ...f, siteName: e.target.value }))} />
          </SettingsField>
          <SettingsField label="Support Email" sub="Replies to system emails are sent here.">
            <input className="settings-input" type="email" value={form.supportEmail} onChange={e => setForm(f => ({ ...f, supportEmail: e.target.value }))} />
          </SettingsField>
        </SettingsSection>

        {/* Tutor Approval */}
        <SettingsSection title="Tutor Approval Policy" icon="how_to_reg">
          <SettingsField label="Max Pending Days" sub="Applications older than this are highlighted for review.">
            <input className="settings-input w-32" type="number" min="1" value={form.maxPendingDays} onChange={e => setForm(f => ({ ...f, maxPendingDays: e.target.value }))} />
          </SettingsField>
          <SettingsField label="Auto-Reject After (days)" sub="Auto-reject incomplete applications after this many days.">
            <input className="settings-input w-32" type="number" min="1" value={form.autoRejectDays} onChange={e => setForm(f => ({ ...f, autoRejectDays: e.target.value }))} />
          </SettingsField>
          <SettingsField label="Minimum Tutor Rating" sub="Tutors below this rating are flagged for review.">
            <input className="settings-input w-32" type="number" min="1" max="5" step="0.1" value={form.minTutorRating} onChange={e => setForm(f => ({ ...f, minTutorRating: e.target.value }))} />
          </SettingsField>
        </SettingsSection>

        {/* Financial */}
        <SettingsSection title="Financial" icon="payments">
          <SettingsField label="Platform Commission Rate (%)" sub="Percentage taken from each tutor payment.">
            <input className="settings-input w-32" type="number" min="0" max="100" value={form.commissionRate} onChange={e => setForm(f => ({ ...f, commissionRate: e.target.value }))} />
          </SettingsField>
        </SettingsSection>

        {/* System */}
        <SettingsSection title="System" icon="manage_accounts">
          <SettingsField label="Maintenance Mode" sub="Disables access for non-admin users.">
            <Toggle checked={form.maintenanceMode} onChange={v => setForm(f => ({ ...f, maintenanceMode: v }))} />
          </SettingsField>
          <SettingsField label="Email Notifications" sub="Send system alerts and approval emails.">
            <Toggle checked={form.emailNotifications} onChange={v => setForm(f => ({ ...f, emailNotifications: v }))} />
          </SettingsField>
          <SettingsField label="AI Anomaly Detection" sub="Automatically flag suspicious activity.">
            <Toggle checked={form.aiAnomalyDetection} onChange={v => setForm(f => ({ ...f, aiAnomalyDetection: v }))} />
          </SettingsField>
          <SettingsField label="Audit Log Retention (days)" sub="Logs older than this are automatically purged.">
            <input className="settings-input w-32" type="number" min="30" value={form.auditLogRetention} onChange={e => setForm(f => ({ ...f, auditLogRetention: e.target.value }))} />
          </SettingsField>
        </SettingsSection>
      </div>

      <div className="mt-8 flex gap-3">
        <button onClick={handleSave} className="px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors">
          Save Changes
        </button>
        <button className="px-6 py-2.5 bg-gray-100 text-on-surface-variant rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors">
          Discard
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
        <span className="text-white text-xs opacity-70">Secure Document Viewer</span>
        <button
          onClick={onOpenNewTab}
          className="flex items-center gap-1 text-white text-xs px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">open_in_new</span>
          Open in new tab
        </button>
      </div>
      <div className="relative flex-1 flex items-center justify-center bg-gray-900 min-h-[300px]">
        {imgState === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
            <span className="material-symbols-outlined text-[40px] animate-spin">progress_activity</span>
            <p className="text-xs opacity-70">Rendering image...</p>
          </div>
        )}
        {imgState === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8">
            <span className="material-symbols-outlined text-5xl text-red-400">broken_image</span>
            <p className="text-white font-bold text-sm text-center">Cannot display this file inline</p>
            <p className="text-white/60 text-xs text-center">The document may be a PDF or the link has expired.</p>
            <button
              onClick={onOpenNewTab}
              className="mt-2 flex items-center gap-2 text-white px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 transition-colors text-sm font-semibold"
            >
              <span className="material-symbols-outlined text-[18px]">open_in_new</span>
              Open document in new tab
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
