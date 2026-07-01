import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'
import NotificationDropdown from './components/NotificationDropdown'

// ─── Transaction Management Modules ──────────────────────────────────────────
import FinancialOverview     from './admin/transactions/FinancialOverview'
import LessonPayments        from './admin/transactions/LessonPayments'
import CourseTransactions    from './admin/transactions/CourseTransactions'
import TutorWithdrawals      from './admin/transactions/TutorWithdrawals'
import RefundManagement      from './admin/transactions/RefundManagement'
import DisputeManagement     from './admin/transactions/DisputeManagement'
import FailedTransactions    from './admin/transactions/FailedTransactions'
import PaymentGateways       from './admin/transactions/PaymentGateways'
import CommissionManagement  from './admin/transactions/CommissionManagement'
import PlatformRevenue       from './admin/transactions/PlatformRevenue'
import SystemWallet          from './admin/transactions/SystemWallet'
import PromotionTransactions from './admin/transactions/PromotionTransactions'
import FinancialReports      from './admin/transactions/FinancialReports'
import Reconciliation        from './admin/transactions/Reconciliation'
import FraudAlerts           from './admin/transactions/FraudAlerts'
import NotificationCenter    from './admin/transactions/NotificationCenter'
import AuditLogs             from './admin/transactions/AuditLogs'

import { DISPUTES } from './admin/transactions/mockData'
import { COMPLAINTS, REPORTED_REVIEWS } from './admin/services/mockData'
import Complaints from './admin/services/Complaints'
import Reviews from './admin/services/Reviews'
import Violations from './admin/services/Violations'
import Moderation from './admin/services/Moderation'

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

const TX_SUB_ITEMS = [
  { id: 'tx-overview',     label: 'Tổng Quan Tài Chính',    icon: 'bar_chart' },
  { id: 'tx-lessons',      label: 'Thanh Toán Buổi Học',       icon: 'receipt_long' },
  { id: 'tx-courses',      label: 'Giao Dịch Khóa Học',   icon: 'school' },
  { id: 'tx-withdrawals',  label: 'Gia Sư Rút Tiền',     icon: 'account_balance' },
  { id: 'tx-refunds',      label: 'Quản Lý Hoàn Tiền',     icon: 'undo' },
  { id: 'tx-disputes',     label: 'Quản Lý Tranh Chấp',    icon: 'gavel' },
  { id: 'tx-failed',       label: 'Giao Dịch Thất Bại',   icon: 'error' },
  { id: 'tx-gateways',     label: 'Cổng Thanh Toán',      icon: 'credit_card' },
  { id: 'tx-commissions',  label: 'Quản Lý Hoa Hồng',       icon: 'percent' },
  { id: 'tx-platform-revenue', label: 'Doanh Thu Nền Tảng',  icon: 'trending_up' },
  { id: 'tx-system-wallet', label: 'Ví Hệ Thống',        icon: 'savings' },
  { id: 'tx-promotions',   label: 'Khuyến Mãi',            icon: 'local_offer' },
  { id: 'tx-reports',      label: 'Báo Cáo Tài Chính',     icon: 'assessment' },
  { id: 'tx-reconciliation', label: 'Đối Soát',      icon: 'compare_arrows' },
  { id: 'tx-fraud',        label: 'Cảnh Báo Gian Lận',          icon: 'warning' },
  { id: 'tx-notifications', label: 'Trung Tâm Thông Báo',  icon: 'notifications' },
  { id: 'tx-audit',        label: 'Nhật Ký Admin',            icon: 'history_edu' },
]

const TX_VIEW_IDS = new Set(TX_SUB_ITEMS.map(i => i.id))

const SM_SUB_ITEMS = [
  { id: 'sm-complaints',   label: 'Khiếu nại',             icon: 'report_problem' },
  { id: 'sm-reviews',      label: 'Đánh giá',              icon: 'reviews' },
  { id: 'sm-violations',   label: 'Báo cáo vi phạm',       icon: 'gavel' },
  { id: 'sm-moderation',   label: 'Kiểm duyệt nội dung',   icon: 'policy' },
]
const SM_VIEW_IDS = new Set(SM_SUB_ITEMS.map(i => i.id))

const NAV_ITEMS = [
  { id: 'dashboard',       label: 'Tổng quan',             icon: 'dashboard' },
  { id: 'tutor-approval',  label: 'Duyệt gia sư',          icon: 'how_to_reg' },
  { id: 'user-management', label: 'Quản lý người dùng',    icon: 'group' },
  { id: 'subjects',        label: 'Môn học',               icon: 'subject' },
  { id: 'lessons',         label: 'Khóa học',              icon: 'school' },
  { id: 'transactions',    label: 'Giao dịch',             icon: 'payments', hasSubmenu: true },
  { id: 'services',        label: 'Quản lý dịch vụ',       icon: 'support_agent', hasSubmenu: true },
  { id: 'reports',         label: 'Báo cáo',               icon: 'assessment' },
  { id: 'ai-insights',     label: 'AI Insights',           icon: 'psychology' },
  { id: 'audit-logs',      label: 'Nhật ký hệ thống',      icon: 'history_edu' },
  { id: 'settings',        label: 'Cài đặt',               icon: 'settings' },
]

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { user, token, logout } = useAuth()

  const [activeView, setActiveView]   = useState('dashboard')
  const [txMenuOpen, setTxMenuOpen]   = useState(false)
  const [smMenuOpen, setSmMenuOpen]   = useState(false)

  // ── Global Service/Transaction States ──
  const [globalDisputes, setGlobalDisputes] = useState(DISPUTES)
  const [globalComplaints, setGlobalComplaints] = useState(COMPLAINTS)
  const [globalReviews, setGlobalReviews] = useState(REPORTED_REVIEWS)

  const handleAddDispute = (dispute) => setGlobalDisputes(prev => [dispute, ...prev])
  const handleUpdateComplaint = (id, updates) => setGlobalComplaints(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c))
  const handleUpdateDispute = (updatedDispute) => setGlobalDisputes(prev => prev.map(d => d.id === updatedDispute.id ? updatedDispute : d))

  // ── Tutor data ──
  const [stats,   setStats]   = useState({ pending: 0, approved: 0, rejected: 0, total: 0 })
  const [tutors,  setTutors]  = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [toast,   setToast]   = useState(null)

  // ── CAP-1.1: Live platform KPI stats ──
  const [kpiStats, setKpiStats] = useState({
    total_users: 0, active_students: 0, active_tutors: 0,
    pending_tutors: 0, monthly_revenue: 0, open_disputes: 0,
  })
  const [kpiLoading, setKpiLoading] = useState(true)
  const [kpiError,   setKpiError]   = useState(null)

  // ── CAP-1.2: Growth chart state ──
  const [chartRange,   setChartRange]   = useState('30d')
  const [chartData,    setChartData]    = useState({
    range: null, series: [], today: { new_users: 0, new_tutors: 0 }, generated_at: null,
  })
  const [chartLoading, setChartLoading] = useState(true)
  const [chartError,   setChartError]   = useState(null)

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

  // ── CAP-1.1: Fetch live KPI stats, auto-refresh every 30 s ────────────────
  const fetchKpiStats = useCallback(async () => {
    setKpiLoading(true); setKpiError(null)
    try {
      const data = await authFetch(`${API}/api/admin/analytics/dashboard/stats`, token)
      setKpiStats(data)
    } catch (err) {
      setKpiError(err.message)
    } finally {
      setKpiLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchKpiStats()
    const interval = setInterval(fetchKpiStats, 30000)
    return () => clearInterval(interval)
  }, [fetchKpiStats])

  // ── CAP-1.2: Fetch growth chart data; re-fetches whenever chartRange changes ──
  const fetchChartData = useCallback(async () => {
    setChartLoading(true)
    setChartError(null)
    try {
      const data = await authFetch(
        `${API}/api/admin/analytics/dashboard/growth?range=${chartRange}`,
        token
      )
      setChartData(data)
    } catch (err) {
      setChartError(err.message)
    } finally {
      setChartLoading(false)
    }
  }, [token, chartRange])

  useEffect(() => {
    fetchChartData()
  }, [fetchChartData])

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
            const isTxParent = item.id === 'transactions'
            const isSmParent = item.id === 'services'
            const hasSub = item.hasSubmenu
            
            const isTxActive = TX_VIEW_IDS.has(activeView)
            const isSmActive = SM_VIEW_IDS.has(activeView)
            
            const active = activeView === item.id || (isTxParent && isTxActive) || (isSmParent && isSmActive)

            if (hasSub) {
              const isOpen = isTxParent ? txMenuOpen : smMenuOpen
              const setOpen = isTxParent ? () => setTxMenuOpen(!txMenuOpen) : () => setSmMenuOpen(!smMenuOpen)
              const subItems = isTxParent ? TX_SUB_ITEMS : SM_SUB_ITEMS
              const isActiveGrp = isTxParent ? isTxActive : isSmActive

              return (
                <div key={item.id}>
                  <a
                    href="#"
                    onClick={e => { e.preventDefault(); setOpen() }}
                    className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all cursor-pointer select-none active:scale-95 ${
                      isActiveGrp
                        ? 'text-primary font-bold bg-blue-50'
                        : 'text-on-surface-variant hover:text-primary hover:bg-gray-50'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]" style={isActiveGrp ? { fontVariationSettings: "'FILL' 1" } : {}}>{item.icon}</span>
                    <span className="text-sm font-semibold flex-1">{item.label}</span>
                    <span className="material-symbols-outlined text-[18px] transition-transform" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>expand_more</span>
                  </a>
                  {isOpen && (
                    <div className="ml-3 mt-0.5 space-y-0.5 border-l-2 border-blue-100 pl-2">
                      {subItems.map(sub => {
                        const subActive = activeView === sub.id
                        return (
                          <a
                            key={sub.id}
                            href="#"
                            onClick={e => { e.preventDefault(); setActiveView(sub.id) }}
                            className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all cursor-pointer text-xs ${
                              subActive
                                ? 'text-primary font-bold bg-blue-50'
                                : 'text-on-surface-variant hover:text-primary hover:bg-gray-50'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[15px]" style={subActive ? { fontVariationSettings: "'FILL' 1" } : {}}>{sub.icon}</span>
                            <span className="font-semibold">{sub.label}</span>
                          </a>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            }

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
            <button className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-gray-100 hover:text-primary transition-colors" onClick={() => { fetchData(); fetchKpiStats(); fetchChartData() }} title="Làm mới">
              <span className="material-symbols-outlined">refresh</span>
            </button>
            <NotificationDropdown token={token} />
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
            <DashboardView
              stats={stats}
              loading={loading}
              onNavigate={setActiveView}
              kpiStats={kpiStats}
              kpiLoading={kpiLoading}
              kpiError={kpiError}
              onRefreshKpi={fetchKpiStats}
              chartData={chartData}
              chartLoading={chartLoading}
              chartError={chartError}
              chartRange={chartRange}
              onRangeChange={setChartRange}
              onRefreshChart={fetchChartData}
            />
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
          {activeView === 'subjects'         && <SubjectsView token={token} />}
          {activeView === 'lessons'          && <CourseManagementView token={token} />}
          {activeView === 'transactions'     && <TransactionsView token={token} />}
          {/* ── Transaction Management Module ── */}
          {activeView === 'tx-overview'      && <FinancialOverview onNavigate={setActiveView} token={token} />}
          {activeView === 'tx-lessons'       && <LessonPayments token={token} />}
          {activeView === 'tx-courses'       && <CourseTransactions token={token} />}
          {activeView === 'tx-withdrawals'   && <TutorWithdrawals token={token} />}
          {activeView === 'tx-refunds'       && <RefundManagement token={token} />}
          {activeView === 'tx-disputes'      && <ComplaintsView token={token} />}
          {activeView === 'tx-failed'        && <FailedTransactions token={token} />}
          {activeView === 'tx-gateways'      && <PaymentGateways token={token} />}
          {activeView === 'tx-commissions'   && <CommissionManagement token={token} />}
          {activeView === 'tx-platform-revenue' && <PlatformRevenue token={token} />}
          {activeView === 'tx-system-wallet' && <SystemWallet token={token} />}
          {activeView === 'tx-promotions'    && <PromotionTransactions token={token} />}
          {activeView === 'tx-reports'       && <FinancialReports />}
          {activeView === 'tx-reconciliation' && <Reconciliation />}
          {activeView === 'tx-fraud'         && <FraudAlerts token={token} />}
          {activeView === 'tx-notifications' && <NotificationCenter />}
          {activeView === 'tx-audit'         && <AuditLogs token={token} />}
          
          {/* ── Service Management Module ── */}
          {activeView === 'sm-complaints'    && <ComplaintsView token={token} />}
          {activeView === 'sm-reviews'       && <ReviewsView token={token} />}
          {activeView === 'sm-violations'    && <Violations token={token} />}
          {activeView === 'sm-moderation'    && <Moderation token={token} />}

          {activeView === 'reports'          && <ReportsView />}
          {activeView === 'ai-insights'      && <AIInsightsView token={token} />}
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
// CAP-1.1 formatting helpers
const fmtCount      = (n) => (n ?? 0).toLocaleString('vi-VN')
const fmtKpiRevenue = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n ?? 0)

function DashboardView({
  stats, loading, onNavigate,
  kpiStats, kpiLoading, kpiError, onRefreshKpi,
  chartData, chartLoading, chartError, chartRange, onRangeChange, onRefreshChart,
}) {
  const K = kpiStats  // shorthand
  const kv = (raw, isCurrency = false) => {
    if (kpiLoading) return '…'
    return isCurrency ? fmtKpiRevenue(raw) : fmtCount(raw)
  }

  // ── CAP-1.2: chart computations ──────────────────────────────────────────
  const series   = chartData.series || []
  const maxVal   = Math.max(...series.map(d => d.new_users), 1)
  const bars     = series.map((d, i) => ({
    label:    d.label,
    h:        Math.round((d.new_users / maxVal) * 100),
    animDelay: i * 50,
  }))
  const yLabels = [maxVal, Math.round(maxVal * 0.75), Math.round(maxVal * 0.5), Math.round(maxVal * 0.25), 0]
    .map(n => n.toLocaleString('vi-VN'))
  const skeletonCount = chartRange === '30d' ? 30 : chartRange === '6m' ? 6 : new Date().getMonth() + 1
  const rangeLabel    = chartRange === '30d' ? '30 ngày gần đây' : chartRange === '6m' ? '6 tháng gần đây' : 'Năm nay'

  return (
    <div className="p-10 max-w-[1280px] mx-auto w-full">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold text-on-background">Tổng quan hệ thống</h2>
          <p className="text-sm text-on-surface-variant mt-1">Phân tích và tóm tắt hoạt động nền tảng.</p>
        </div>
        {/* KPI refresh status row */}
        <div className="flex items-center gap-3 text-xs text-on-surface-variant mt-1">
          {kpiError ? (
            <span className="flex items-center gap-1 text-red-500">
              <span className="material-symbols-outlined text-[15px]">error_outline</span>
              Lỗi tải KPI —{' '}
              <button onClick={onRefreshKpi} className="underline hover:text-red-700">Thử lại</button>
            </span>
          ) : (
            <span className="flex items-center gap-1">
              {kpiLoading && <span className="material-symbols-outlined text-[15px] animate-spin">progress_activity</span>}
              {!kpiLoading && K.generated_at && (
                <>
                  <span className="material-symbols-outlined text-[15px]">schedule</span>
                  Cập nhật lúc {new Date(K.generated_at).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
                </>
              )}
            </span>
          )}
          <button
            onClick={onRefreshKpi}
            disabled={kpiLoading}
            title="Làm mới KPI"
            className="flex items-center gap-1 px-2 py-1 rounded-lg border border-outline-variant hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            <span className={`material-symbols-outlined text-[15px] ${kpiLoading ? 'animate-spin' : ''}`}>refresh</span>
            Làm mới
          </button>
        </div>
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
                <span className="text-sm text-on-surface-variant">
                  <strong className="text-on-background">{kv(K.pending_tutors)}</strong> hồ sơ chờ duyệt
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                <span className="text-sm text-on-surface-variant">
                  <strong className="text-on-background">{kv(K.open_disputes)}</strong> tranh chấp đang mở
                </span>
              </div>
            </div>
          </div>
          <button
            className="shrink-0 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors"
            onClick={() => onNavigate('tutor-approval')}
          >
            Xem hồ sơ
          </button>
        </div>
      </div>

      {/* ── CAP-1.1: Live KPI Cards (3 × 2 grid) ── */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        <OverviewCard
          icon="group"       iconBg="bg-gray-100"   iconColor="text-on-surface-variant"
          label="Tổng người dùng"
          value={kv(K.total_users)}
          loading={kpiLoading}
        />
        <OverviewCard
          icon="school"      iconBg="bg-blue-50"    iconColor="text-blue-700"
          label="Học sinh đang học"
          value={kv(K.active_students)}
          loading={kpiLoading}
        />
        <OverviewCard
          icon="workspace_premium" iconBg="bg-indigo-50" iconColor="text-indigo-700"
          label="Gia sư đang hoạt động"
          value={kv(K.active_tutors)}
          loading={kpiLoading}
        />
        <OverviewCard
          icon="pending"     iconBg="bg-amber-50"   iconColor="text-amber-700"
          label="Hồ sơ chờ duyệt"
          value={kv(K.pending_tutors)}
          loading={kpiLoading}
        />
        <OverviewCard
          icon="payments"    iconBg="bg-emerald-50" iconColor="text-emerald-700"
          label="Doanh thu tháng (VND)"
          value={kv(K.monthly_revenue, true)}
          loading={kpiLoading}
        />
        <OverviewCard
          icon="gavel"       iconBg="bg-red-50"     iconColor="text-red-700"
          label="Tranh chấp đang mở"
          value={kv(K.open_disputes)}
          loading={kpiLoading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-12 gap-6">
        {/* Bar Chart — CAP-1.2: live data, dynamic Y-axis, range selector */}
        <div className="col-span-8 bg-white rounded-xl p-6 shadow-sm flex flex-col h-[380px]">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-semibold text-on-background">Xu hướng tăng trưởng người dùng</h3>
              <p className="text-xs text-on-surface-variant mt-0.5">{rangeLabel}</p>
            </div>
            <select
              value={chartRange}
              onChange={e => onRangeChange(e.target.value)}
              disabled={chartLoading}
              className="bg-gray-50 border border-outline-variant rounded-lg text-xs text-on-surface-variant py-2 pl-3 pr-6 outline-none disabled:opacity-50"
            >
              <option value="30d">30 ngày gần đây</option>
              <option value="6m">6 tháng gần đây</option>
              <option value="ytd">Năm nay</option>
            </select>
          </div>

          {chartError ? (
            /* Error state */
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
              <span className="material-symbols-outlined text-red-400 text-[40px]">bar_chart_off</span>
              <p className="text-sm text-on-surface-variant">Không thể tải dữ liệu biểu đồ</p>
              <button
                onClick={onRefreshChart}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-outline-variant text-xs text-on-surface-variant hover:bg-gray-50 transition-colors"
              >
                <span className="material-symbols-outlined text-[15px]">refresh</span>
                Thử lại
              </button>
            </div>
          ) : chartLoading ? (
            /* Loading skeleton */
            <div className="flex-1 flex items-end gap-2 relative">
              <div className="absolute left-0 top-0 bottom-6 w-10 flex flex-col justify-between pointer-events-none">
                {[0,1,2,3,4].map(i => <div key={i} className="h-2 bg-gray-200 rounded animate-pulse w-8 ml-auto" />)}
              </div>
              <div className="ml-12 flex-1 flex justify-around items-end h-full pb-6 z-10 gap-1">
                {Array.from({ length: skeletonCount }).map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-1 flex-1">
                    <div className="w-full flex items-end justify-center" style={{ height: '200px' }}>
                      <div
                        className="w-10 bg-gray-200 rounded-t-sm animate-pulse"
                        style={{ height: `${20 + (i % 5) * 15}%` }}
                      />
                    </div>
                    <div className="h-2 w-6 bg-gray-200 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Live bars */
            <div className="flex-1 flex items-end gap-2 relative">
              {/* Dynamic Y-axis */}
              <div className="absolute left-0 top-0 bottom-6 w-10 flex flex-col justify-between text-xs text-on-surface-variant text-right pr-1">
                {yLabels.map((lbl, i) => <span key={i}>{lbl}</span>)}
              </div>
              {/* Grid lines */}
              <div className="absolute left-11 right-0 top-2 bottom-6 flex flex-col justify-between pointer-events-none">
                {[0,1,2,3,4].map(i => <div key={i} className="w-full border-t border-dashed border-gray-100" />)}
              </div>
              {/* Bars */}
              <div className="ml-12 flex-1 flex justify-around items-end h-full pb-6 z-10 gap-1">
                {bars.map((b, i) => (
                  <div key={i} className="flex flex-col items-center gap-1 flex-1">
                    <div className="w-full flex items-end justify-center" style={{ height: '200px' }}>
                      <div
                        className="w-10 bg-primary rounded-t-sm bar-grow"
                        style={{ height: `${b.h}%`, animationDelay: `${b.animDelay}ms` }}
                      />
                    </div>
                    <span className="text-[11px] text-on-surface-variant">{b.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 mt-1">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-primary rounded-sm" />
              <span className="text-xs text-on-surface-variant">Người dùng mới</span>
            </div>
          </div>
        </div>

        {/* Recent Activity — CAP-1.2: live data from chart endpoint + KPI stats */}
        <div className="col-span-4 bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-on-background mb-5">Hoạt động gần đây</h3>
          <div className="space-y-4">
            {/* Item 1: new tutor profiles today (chartData.today) */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 text-blue-600">
                <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
              </div>
              <div>
                {chartLoading
                  ? <div className="h-4 bg-gray-200 rounded animate-pulse w-40 mb-1" />
                  : <p className="text-sm font-medium text-on-surface">{fmtCount(chartData.today.new_tutors)} hồ sơ gia sư mới hôm nay</p>}
                <p className="text-xs text-on-surface-variant">Hôm nay</p>
              </div>
            </div>
            {/* Item 2: new users today (chartData.today) */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0 text-indigo-600">
                <span className="material-symbols-outlined text-[18px]">group</span>
              </div>
              <div>
                {chartLoading
                  ? <div className="h-4 bg-gray-200 rounded animate-pulse w-40 mb-1" />
                  : <p className="text-sm font-medium text-on-surface">{fmtCount(chartData.today.new_users)} người dùng mới đăng ký hôm nay</p>}
                <p className="text-xs text-on-surface-variant">Hôm nay</p>
              </div>
            </div>
            {/* Item 3: pending tutors (kpiStats — no extra fetch) */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0 text-amber-600">
                <span className="material-symbols-outlined text-[18px]">pending</span>
              </div>
              <div>
                {kpiLoading
                  ? <div className="h-4 bg-gray-200 rounded animate-pulse w-40 mb-1" />
                  : <p className="text-sm font-medium text-on-surface">{fmtCount(K.pending_tutors)} hồ sơ chờ duyệt</p>}
                <p className="text-xs text-on-surface-variant">Hiện tại</p>
              </div>
            </div>
            {/* Item 4: open disputes (kpiStats — no extra fetch) */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0 text-red-600">
                <span className="material-symbols-outlined text-[18px]">gavel</span>
              </div>
              <div>
                {kpiLoading
                  ? <div className="h-4 bg-gray-200 rounded animate-pulse w-40 mb-1" />
                  : <p className="text-sm font-medium text-on-surface">{fmtCount(K.open_disputes)} tranh chấp đang mở</p>}
                <p className="text-xs text-on-surface-variant">Hiện tại</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick access row */}
      <div className="grid grid-cols-3 gap-6 mt-6">
        {[
          { id: 'tutor-approval',  icon: 'how_to_reg',  label: 'Duyệt gia sư',      desc: 'Xem xét hồ sơ chờ duyệt', count: null, accent: 'border-blue-500' },
          { id: 'sm-complaints',   icon: 'report_problem', label: 'Khiếu nại',    desc: 'Xem và xử lý khiếu nại tranh chấp', count: null, accent: 'border-amber-500' },
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
// OverviewCard: supports optional `loading` prop for skeleton state.
// The `trend` / `trendUp` props are still accepted for backwards compatibility
// with any callers that pass them, but CAP-1.1 KPI cards omit them.
function OverviewCard({ icon, iconBg, iconColor, label, value, trend, trendUp, loading = false }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center ${iconColor}`}>
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        {trend != null && (
          <span className={`flex items-center text-xs font-semibold ${trendUp ? 'text-emerald-600' : 'text-red-600'}`}>
            <span className="material-symbols-outlined text-[15px]">{trendUp ? 'trending_up' : 'trending_down'}</span>
            {trend}
          </span>
        )}
      </div>
      <p className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">{label}</p>
      {loading ? (
        <div className="h-8 bg-gray-200 rounded animate-pulse w-3/4" />
      ) : (
        <h4 className="text-2xl font-bold text-on-background">{value}</h4>
      )}
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
function UserDetailPanel({ user, detail, loading, onBan, actionId, onReleaseHold }) {
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

  
  async function handleReleaseHold(userId) {
    if (!confirm('Bạn có chắc chắn muốn nhả toàn bộ tiền cọc của gia sư này không?')) return;
    try {
      const res = await authFetch(`${API}/api/admin/tutors/${userId}/release-hold`, token, { method: 'POST' });
      setUMToast({ msg: res.message || 'Đã nhả cọc thành công.', type: 'success' });
      // reload detail
      fetchDetail(userId);
    } catch (err) {
      setUMToast({ msg: `Lỗi nhả cọc: ${err.message}`, type: 'error' });
    }
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
// Canonical Vietnamese tutoring subjects for Grade 1–12.
// Icons and colors keyed to exact canonical names returned by the backend.
const SUBJECT_META_MAP = {
  'Toán':       { icon: 'calculate',    color: 'bg-blue-100 text-blue-700'     },
  'Tiếng Việt': { icon: 'menu_book',    color: 'bg-rose-100 text-rose-700'     },
  'Ngữ văn':    { icon: 'auto_stories', color: 'bg-pink-100 text-pink-700'     },
  'Tiếng Anh':  { icon: 'translate',    color: 'bg-green-100 text-green-700'   },
  'Vật lý':     { icon: 'bolt',         color: 'bg-cyan-100 text-cyan-700'     },
  'Hóa học':    { icon: 'biotech',      color: 'bg-purple-100 text-purple-700' },
  'Sinh học':   { icon: 'grass',        color: 'bg-emerald-100 text-emerald-700'},
  'Lịch sử':    { icon: 'history_edu',  color: 'bg-amber-100 text-amber-700'   },
  'Địa lý':     { icon: 'public',       color: 'bg-teal-100 text-teal-700'     },
  'Tin học':    { icon: 'code',         color: 'bg-indigo-100 text-indigo-700' },
}
const SUBJECT_DEFAULT = { icon: 'school', color: 'bg-gray-100 text-gray-600' }

function SubjectsView({ token }) {
  const [subjects, setSubjects] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [search,   setSearch]   = useState('')
  const [tick,     setTick]     = useState(0)

  useEffect(() => {
    setLoading(true)
    setError(null)
    authFetch(`${API}/api/admin/subjects`, token)
      .then(data => { setSubjects(data.subjects || []); setLoading(false) })
      .catch(err  => { setError(err.message); setLoading(false) })
  }, [token, tick])

  const filtered = subjects.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-10 max-w-[1280px] mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-bold text-on-background">Môn học</h2>
          <p className="text-sm text-on-surface-variant mt-1">Quản lý các môn học phổ biến từ cấp 1 đến cấp 3.</p>
        </div>
        <button
          disabled
          className="px-4 py-2 bg-gray-200 text-gray-400 rounded-lg text-sm font-semibold flex items-center gap-2 cursor-not-allowed"
          title="Thêm môn học — chưa khả dụng"
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

      {loading && (
        <div className="flex items-center justify-center h-48 text-on-surface-variant">
          <span className="material-symbols-outlined text-[32px] mr-3" style={{ animation: 'spin 1s linear infinite' }}>progress_activity</span>
          Đang tải...
        </div>
      )}
      {error && !loading && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <span className="material-symbols-outlined">error</span>
          {error}
          <button onClick={() => setTick(t => t + 1)} className="ml-auto text-xs underline">Thử lại</button>
        </div>
      )}
      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-16 text-on-surface-variant">
          <span className="material-symbols-outlined text-[48px] mb-3 block">school</span>
          Chưa có môn học phù hợp
        </div>
      )}
      {!loading && !error && filtered.length > 0 && (
        <div className="grid grid-cols-3 gap-6">
          {filtered.map(s => {
            const meta = SUBJECT_META_MAP[s.name] || SUBJECT_DEFAULT
            return (
              <div key={s.name} className="bg-white rounded-xl p-6 shadow-sm border border-outline-variant hover:shadow-md transition-shadow">
                <div className="flex items-start mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${meta.color}`}>
                    <span className="material-symbols-outlined text-[24px]">{meta.icon}</span>
                  </div>
                </div>
                <h3 className="text-base font-bold text-on-surface mb-3">{s.name}</h3>
                <div className="flex gap-4">
                  <div>
                    <p className="text-2xl font-bold text-primary">{s.tutor_count}</p>
                    <p className="text-xs text-on-surface-variant">Gia sư</p>
                  </div>
                  <div className="w-px bg-outline-variant" />
                  <div>
                    <p className="text-2xl font-bold text-on-surface">{s.quiz_count}</p>
                    <p className="text-xs text-on-surface-variant">Bài kiểm tra</p>
                  </div>
                  {s.course_count > 0 && (
                    <>
                      <div className="w-px bg-outline-variant" />
                      <div>
                        <p className="text-2xl font-bold text-on-surface">{s.course_count}</p>
                        <p className="text-xs text-on-surface-variant">Khóa học</p>
                      </div>
                    </>
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

// ─── Course Management View ───────────────────────────────────────────────────
const SUBJECT_META = {
  'Toán học':   { tag: 'bg-blue-50 text-blue-700',     grad: 'from-blue-500 to-indigo-700',   icon: 'functions' },
  'Lập trình':  { tag: 'bg-violet-50 text-violet-700', grad: 'from-violet-500 to-indigo-700',  icon: 'code' },
  'Tiếng Anh':  { tag: 'bg-rose-50 text-rose-700',     grad: 'from-rose-500 to-pink-700',     icon: 'translate' },
  'Vật lý':     { tag: 'bg-cyan-50 text-cyan-700',     grad: 'from-cyan-500 to-sky-700',      icon: 'rocket_launch' },
  'Hóa học':    { tag: 'bg-emerald-50 text-emerald-700', grad: 'from-emerald-500 to-teal-700', icon: 'science' },
  'Văn học':    { tag: 'bg-amber-50 text-amber-700',   grad: 'from-amber-500 to-orange-600',  icon: 'menu_book' },
  'Lịch sử':    { tag: 'bg-orange-50 text-orange-700', grad: 'from-orange-500 to-red-600',    icon: 'history_edu' },
  'Sinh học':   { tag: 'bg-teal-50 text-teal-700',     grad: 'from-teal-500 to-emerald-700',  icon: 'biotech' },
}
const subjMeta = s => SUBJECT_META[s] || { tag: 'bg-gray-100 text-gray-600', grad: 'from-gray-400 to-gray-600', icon: 'school' }

const C_STATUS_META = {
  'Hoạt động':  { badge: 'bg-green-100 text-green-700',  dot: 'bg-green-500',  icon: 'check_circle' },
  'Bản nháp':   { badge: 'bg-gray-100 text-gray-600',    dot: 'bg-gray-400',   icon: 'edit_note' },
  'Đã lưu trữ': { badge: 'bg-slate-100 text-slate-600',  dot: 'bg-slate-400',  icon: 'inventory_2' },
  'Bị báo cáo': { badge: 'bg-red-100 text-red-700',      dot: 'bg-red-500',    icon: 'flag' },
}
const cStatusMeta = s => C_STATUS_META[s] || C_STATUS_META['Bản nháp']

const AVATAR_COLORS = ['bg-blue-600','bg-violet-600','bg-rose-600','bg-emerald-600','bg-orange-600','bg-cyan-600']
const initialsOf = name => name.split(' ').filter(Boolean).slice(-2).map(w => w[0]).join('').toUpperCase()

const MOCK_COURSES = [
  { id: 'C-1001', title: 'Luyện thi THPT Quốc gia môn Toán 2026', tutor: 'Trần Thị Bích',  subject: 'Toán học',  students: 1204, lessons: 24, rating: 4.9, reviews: 312, price: 599000,  premium: true,  status: 'Hoạt động', created: '2025-09-12', updated: '2026-06-24', revenue: 245000000, completion: 78, desc: 'Hệ thống hóa toàn bộ kiến thức Toán THPT, bám sát cấu trúc đề thi 2026 với hơn 600 bài tập tự luận và trắc nghiệm có lời giải chi tiết.' },
  { id: 'C-1002', title: 'Lập trình Web Full-Stack với React & Node', tutor: 'Phạm Quỳnh Anh', subject: 'Lập trình', students: 2860, lessons: 58, rating: 4.8, reviews: 740, price: 899000,  premium: true,  status: 'Hoạt động', created: '2025-05-03', updated: '2026-06-20', revenue: 1280000000, completion: 64, desc: 'Xây dựng ứng dụng web hoàn chỉnh từ giao diện đến backend: React, Node.js, Express, PostgreSQL và triển khai thực tế lên cloud.' },
  { id: 'C-1003', title: 'Tiếng Anh giao tiếp cấp tốc 30 ngày', tutor: 'Nguyễn Hải Đăng', subject: 'Tiếng Anh', students: 540,  lessons: 32, rating: 4.7, reviews: 188, price: 0,       premium: false, status: 'Hoạt động', created: '2025-11-20', updated: '2026-06-18', revenue: 0,         completion: 71, desc: 'Lộ trình luyện phản xạ giao tiếp theo chủ đề thực tế, tập trung phát âm và nghe hiểu cho người đi làm bận rộn.' },
  { id: 'C-1004', title: 'Hóa học Hữu cơ chuyên sâu lớp 12', tutor: 'Bùi Phương Thảo', subject: 'Hóa học',  students: 0,    lessons: 18, rating: 0,   reviews: 0,   price: 499000,  premium: false, status: 'Bản nháp',  created: '2026-06-22', updated: '2026-06-22', revenue: 0,         completion: 0,  desc: 'Phân tích chuyên sâu các chuỗi phản ứng hữu cơ, cơ chế và bài toán nhận biết — đang soạn thảo, chưa xuất bản.' },
  { id: 'C-1005', title: 'Vật lý 12 — Dao động & Sóng cơ', tutor: 'Lê Minh Tuấn',  subject: 'Vật lý',    students: 312,  lessons: 21, rating: 4.6, reviews: 96,  price: 399000,  premium: false, status: 'Hoạt động', created: '2026-06-15', updated: '2026-06-21', revenue: 124000000, completion: 58, desc: 'Trọng tâm chuyên đề Dao động và Sóng cơ với phương pháp giải nhanh, kèm hệ thống bài tập phân hóa theo mức độ.' },
  { id: 'C-1006', title: 'Python cho người mới bắt đầu', tutor: 'Phạm Quỳnh Anh', subject: 'Lập trình', students: 4120, lessons: 40, rating: 4.9, reviews: 1530, price: 0,      premium: false, status: 'Hoạt động', created: '2025-03-01', updated: '2026-06-15', revenue: 0,         completion: 82, desc: 'Khởi đầu hành trình lập trình với Python: cú pháp, cấu trúc dữ liệu, hàm và 12 dự án nhỏ thực hành.' },
  { id: 'C-1007', title: 'Ngữ pháp tiếng Anh từ A đến Z', tutor: 'Nguyễn Hải Đăng', subject: 'Tiếng Anh', students: 96,   lessons: 16, rating: 4.4, reviews: 41,  price: 299000,  premium: false, status: 'Bản nháp',  created: '2026-06-08', updated: '2026-06-10', revenue: 0,         completion: 0,  desc: 'Tổng hợp toàn bộ điểm ngữ pháp cốt lõi, đang trong giai đoạn soạn thảo và chưa xuất bản.' },
  { id: 'C-1008', title: 'Lịch sử Việt Nam hiện đại', tutor: 'Đỗ Quang Huy',   subject: 'Lịch sử',   students: 88,   lessons: 14, rating: 4.2, reviews: 33,  price: 0,       premium: false, status: 'Đã lưu trữ', created: '2024-09-10', updated: '2026-03-02', revenue: 0,         completion: 55, desc: 'Khóa học đã được lưu trữ — nội dung về giai đoạn lịch sử Việt Nam từ 1945 đến nay.' },
  { id: 'C-1009', title: 'Luyện viết IELTS Writing 7.0+', tutor: 'Nguyễn Hải Đăng', subject: 'Tiếng Anh', students: 760,  lessons: 28, rating: 4.8, reviews: 410, price: 1290000, premium: true,  status: 'Hoạt động', created: '2025-07-19', updated: '2026-06-23', revenue: 615000000, completion: 69, desc: 'Phương pháp viết Task 1 & Task 2 theo band điểm, chữa bài chi tiết và ngân hàng mẫu câu học thuật.' },
  { id: 'C-1010', title: 'Cấu trúc dữ liệu & Giải thuật', tutor: 'Lê Minh Tuấn',  subject: 'Lập trình', students: 1530, lessons: 46, rating: 3.9, reviews: 220, price: 799000,  premium: true,  status: 'Bị báo cáo', created: '2025-08-05', updated: '2026-06-19', revenue: 712000000, completion: 48, desc: 'Khóa học bị báo cáo về vấn đề bản quyền tài liệu — cần kiểm duyệt lại trước khi tiếp tục phân phối.' },
  { id: 'C-1011', title: 'Sinh học phân tử nâng cao', tutor: 'Bùi Phương Thảo', subject: 'Sinh học',  students: 210,  lessons: 22, rating: 4.5, reviews: 64,  price: 549000,  premium: false, status: 'Hoạt động', created: '2025-10-02', updated: '2026-06-12', revenue: 92000000,  completion: 60, desc: 'Đi sâu vào cơ chế di truyền cấp phân tử, công nghệ gen và ứng dụng trong y sinh hiện đại.' },
  { id: 'C-1012', title: 'Văn học Việt Nam lớp 12', tutor: 'Đỗ Quang Huy',   subject: 'Văn học',   students: 980,  lessons: 20, rating: 4.6, reviews: 158, price: 349000,  premium: false, status: 'Hoạt động', created: '2025-06-14', updated: '2026-06-08', revenue: 188000000, completion: 73, desc: 'Phân tích các tác phẩm trọng tâm trong chương trình, kỹ năng làm văn nghị luận và mở bài ấn tượng.' },
]

const AI_COURSE_INSIGHTS = [
  { icon: 'trending_down', tone: 'text-amber-600', bg: 'bg-amber-50',  text: '42% học viên dừng lại ở Module 3 — nội dung có thể quá dài hoặc khó tiếp thu.' },
  { icon: 'content_cut',   tone: 'text-blue-600',  bg: 'bg-blue-50',   text: 'Đề xuất chia nhỏ video bài giảng dài hơn 20 phút để tăng tỷ lệ hoàn thành.' },
  { icon: 'quiz',          tone: 'text-violet-600', bg: 'bg-violet-50', text: 'Nên bổ sung Quiz sau Lesson 8 để củng cố kiến thức nền trước phần nâng cao.' },
  { icon: 'visibility_off',tone: 'text-rose-600',  bg: 'bg-rose-50',   text: 'Nội dung Chương 2 có tỷ lệ xem thấp nhất — cân nhắc làm lại phần mở đầu.' },
  { icon: 'star_half',     tone: 'text-red-600',   bg: 'bg-red-50',    text: 'Điểm đánh giá trung bình giảm 12% trong tháng này, chủ yếu ở khóa “CTDL & Giải thuật”.' },
]

const fmtVND = n => n === 0 ? 'Miễn phí' : n.toLocaleString('vi-VN') + 'đ'
const fmtCompactVND = n => {
  if (!n) return '—'
  if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + ' tỷ'
  if (n >= 1e6) return Math.round(n / 1e6) + ' triệu'
  if (n >= 1e3) return Math.round(n / 1e3) + 'K'
  return n.toLocaleString('vi-VN')
}
const fmtDMY = iso => {
  if (!iso) return '—'
  const d = new Date(iso), p = x => String(x).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`
}
const fmtInt = n => (n || 0).toLocaleString('vi-VN')

const C_CHIPS = [
  { key: 'Tất cả' },
  { key: 'Đang hoạt động', match: c => c.status === 'Hoạt động' },
  { key: 'Bản nháp',       match: c => c.status === 'Bản nháp' },
  { key: 'Lưu trữ',        match: c => c.status === 'Đã lưu trữ' },
  { key: 'Bị báo cáo',     match: c => c.status === 'Bị báo cáo' },
  { key: 'Miễn phí',       match: c => c.price === 0 },
  { key: 'Premium',        match: c => c.premium },
]

const MODULE_TITLES = ['Nhập môn & Nền tảng', 'Kiến thức trọng tâm', 'Luyện tập chuyên sâu', 'Tổng ôn & Thực chiến']
function buildModules(course) {
  const total = course.lessons || 0
  const count = Math.min(4, Math.max(2, Math.round(total / 8) || 2))
  const per = Math.ceil(total / count)
  let n = 0
  const mods = []
  for (let m = 0; m < count; m++) {
    const items = []
    for (let i = 0; i < per && n < total; i++, n++) {
      items.push({ type: 'lesson', title: `Bài ${n + 1}: ${course.subject} — chuyên đề ${n + 1}`, duration: `${10 + (n * 4) % 35} phút` })
    }
    items.push({ type: 'quiz', title: `Quiz kiểm tra Module ${m + 1}`, q: 8 + (m * 2) % 10 })
    mods.push({ title: `Module ${m + 1}: ${MODULE_TITLES[m] || 'Nội dung mở rộng'}`, items })
  }
  return mods
}

const REVIEW_AUTHORS = ['Ngọc Mai', 'Hoàng Long', 'Thu Hà', 'Đức Anh', 'Phương Linh', 'Gia Bảo']
const REVIEW_TEXTS = [
  'Khóa học rất chi tiết, giảng viên giải thích dễ hiểu và tận tâm.',
  'Nội dung bám sát thực tế, bài tập phong phú. Mình tiến bộ rõ rệt.',
  'Phần đầu hơi nhanh nhưng càng về sau càng cuốn, rất đáng tiền.',
  'Video chất lượng cao, có quiz củng cố sau mỗi chương rất hữu ích.',
  'Mong giảng viên cập nhật thêm ví dụ mới cho phần nâng cao.',
]
function buildReviews(course) {
  if (!course.reviews) return []
  const base = Math.round(course.rating)
  return REVIEW_AUTHORS.slice(0, 4).map((name, i) => ({
    name,
    score: Math.max(3, Math.min(5, base - (i % 2))),
    comment: REVIEW_TEXTS[i % REVIEW_TEXTS.length],
    date: fmtDMY(new Date(Date.now() - (i + 1) * 86400000 * 6).toISOString()),
  }))
}

// ── Course Thumbnail ──
function CourseThumb({ course, size = 'sm' }) {
  const m = subjMeta(course.subject)
  const dims = size === 'lg' ? 'w-full h-40 rounded-xl' : 'w-14 h-10 rounded-lg'
  const icon = size === 'lg' ? 'text-[56px]' : 'text-[20px]'
  return (
    <div className={`relative bg-gradient-to-br ${m.grad} ${dims} flex items-center justify-center overflow-hidden shrink-0`}>
      <span className={`material-symbols-outlined text-white/90 ${icon}`}>{m.icon}</span>
      {course.premium && size === 'lg' && (
        <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-amber-400 text-amber-900 text-[11px] font-bold flex items-center gap-1">
          <span className="material-symbols-outlined text-[13px]">workspace_premium</span> Premium
        </span>
      )}
    </div>
  )
}

// ── Tutor cell ──
function TutorBadge({ name, idx }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className={`w-7 h-7 rounded-full ${AVATAR_COLORS[idx % AVATAR_COLORS.length]} flex items-center justify-center text-white text-[11px] font-bold shrink-0`}>
        {initialsOf(name)}
      </div>
      <span className="text-sm text-on-surface truncate">{name}</span>
    </div>
  )
}

// ── AI Insights Card ──
function AICourseInsightsCard() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-outline-variant overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-outline-variant bg-gradient-to-r from-primary/5 to-transparent">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
          <span className="material-symbols-outlined">smart_toy</span>
        </div>
        <div>
          <h3 className="text-base font-bold text-on-background flex items-center gap-2">
            AI Insights
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wide">Beta</span>
          </h3>
          <p className="text-xs text-on-surface-variant">Phân tích tự động dựa trên hành vi học tập của học viên.</p>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-3 p-6">
        {AI_COURSE_INSIGHTS.map((ins, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
            <div className={`w-8 h-8 rounded-lg ${ins.bg} ${ins.tone} flex items-center justify-center shrink-0`}>
              <span className="material-symbols-outlined text-[18px]">{ins.icon}</span>
            </div>
            <p className="text-sm text-on-surface leading-snug">{ins.text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Course Detail Drawer ──
function DrawerDetail({ label, value }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide">{label}</p>
      <p className="text-sm text-on-surface font-medium mt-0.5">{value}</p>
    </div>
  )
}

function CourseDrawer({ course, show, tab, onTab, onClose }) {
  if (!course) return null
  const m = subjMeta(course.subject)
  const modules = buildModules(course)
  const reviews = buildReviews(course)
  const st = cStatusMeta(course.status)
  const hours = Math.max(1, Math.round((course.lessons * 16) / 60))
  const TABS = [
    { id: 'info',    label: 'Thông tin', icon: 'info' },
    { id: 'content', label: 'Nội dung',  icon: 'list_alt' },
    { id: 'stats',   label: 'Thống kê',  icon: 'insights' },
    { id: 'reviews', label: 'Đánh giá',  icon: 'reviews' },
  ]
  return (
    <div className={`fixed inset-0 z-[70] ${show ? '' : 'pointer-events-none'}`}>
      <div className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${show ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
      <aside className={`absolute top-0 right-0 h-full w-full max-w-[540px] bg-surface shadow-2xl flex flex-col transform transition-transform duration-300 ${show ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header */}
        <div className="p-6 bg-white border-b border-outline-variant">
          <div className="flex justify-between items-start mb-4">
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 ${st.badge}`}>
              <span className="material-symbols-outlined text-[14px]">{st.icon}</span>{course.status}
            </span>
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-gray-100 transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <CourseThumb course={course} size="lg" />
          <h2 className="text-xl font-bold text-on-background mt-4 leading-snug">{course.title}</h2>
          <div className="flex items-center gap-3 mt-2 text-sm text-on-surface-variant">
            <span className="font-mono text-xs">#{course.id}</span>
            <span className="w-1 h-1 rounded-full bg-outline-variant" />
            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${m.tag}`}>{course.subject}</span>
            <span className="w-1 h-1 rounded-full bg-outline-variant" />
            <span className="font-semibold text-on-surface">{fmtVND(course.price)}</span>
          </div>
        </div>
        {/* Tabs */}
        <div className="flex items-center gap-1 px-6 bg-white border-b border-outline-variant">
          {TABS.map(t => (
            <button key={t.id} onClick={() => onTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors ${tab === t.id ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}>
              <span className="material-symbols-outlined text-[18px]">{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'info' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-bold text-on-background mb-2">Mô tả khóa học</h4>
                <p className="text-sm text-on-surface-variant leading-relaxed">{course.desc}</p>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 p-4 rounded-xl bg-white border border-outline-variant">
                <DrawerDetail label="Gia sư" value={course.tutor} />
                <DrawerDetail label="Môn học" value={course.subject} />
                <DrawerDetail label="Giá bán" value={fmtVND(course.price)} />
                <DrawerDetail label="Số bài học" value={`${course.lessons} bài`} />
                <DrawerDetail label="Ngày tạo" value={fmtDMY(course.created)} />
                <DrawerDetail label="Cập nhật" value={fmtDMY(course.updated)} />
                <DrawerDetail label="Học viên" value={fmtInt(course.students)} />
                <DrawerDetail label="Đánh giá" value={course.rating ? `⭐ ${course.rating} (${course.reviews})` : 'Chưa có'} />
              </div>
            </div>
          )}
          {tab === 'content' && (
            <div className="space-y-4">
              {modules.map((mod, i) => (
                <div key={i} className="bg-white rounded-xl border border-outline-variant overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-outline-variant">
                    <p className="text-sm font-bold text-on-surface">{mod.title}</p>
                    <span className="text-xs text-on-surface-variant">{mod.items.length} mục</span>
                  </div>
                  <ul className="divide-y divide-outline-variant">
                    {mod.items.map((it, j) => (
                      <li key={j} className="flex items-center gap-3 px-4 py-2.5">
                        <span className={`material-symbols-outlined text-[18px] ${it.type === 'quiz' ? 'text-violet-600' : 'text-primary'}`}>
                          {it.type === 'quiz' ? 'quiz' : 'play_circle'}
                        </span>
                        <span className="text-sm text-on-surface flex-1 truncate">{it.title}</span>
                        <span className="text-xs text-on-surface-variant shrink-0">{it.type === 'quiz' ? `${it.q} câu` : it.duration}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
          {tab === 'stats' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Tổng học viên', value: fmtInt(course.students), icon: 'group', color: 'text-blue-600 bg-blue-50' },
                  { label: 'Tỷ lệ hoàn thành', value: `${course.completion}%`, icon: 'task_alt', color: 'text-emerald-600 bg-emerald-50' },
                  { label: 'Doanh thu', value: fmtCompactVND(course.revenue), icon: 'payments', color: 'text-violet-600 bg-violet-50' },
                  { label: 'Thời lượng', value: `${hours} giờ`, icon: 'schedule', color: 'text-amber-600 bg-amber-50' },
                ].map((s, i) => (
                  <div key={i} className="bg-white rounded-xl border border-outline-variant p-4">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.color} mb-3`}>
                      <span className="material-symbols-outlined text-[20px]">{s.icon}</span>
                    </div>
                    <p className="text-xl font-bold text-on-background">{s.value}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-xl border border-outline-variant p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-bold text-on-surface">Đánh giá trung bình</p>
                  <p className="text-sm font-bold text-amber-500">⭐ {course.rating || '—'}</p>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-400 h-full rounded-full" style={{ width: `${(course.rating / 5) * 100}%` }} />
                </div>
                <p className="text-xs text-on-surface-variant mt-2">Dựa trên {fmtInt(course.reviews)} lượt đánh giá</p>
              </div>
            </div>
          )}
          {tab === 'reviews' && (
            <div className="space-y-3">
              {reviews.length === 0 && (
                <div className="text-center py-12 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[48px] text-gray-300">reviews</span>
                  <p className="text-sm mt-2">Khóa học chưa có đánh giá nào.</p>
                </div>
              )}
              {reviews.map((r, i) => (
                <div key={i} className="bg-white rounded-xl border border-outline-variant p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center text-white text-xs font-bold`}>{initialsOf(r.name)}</div>
                      <div>
                        <p className="text-sm font-semibold text-on-surface">{r.name}</p>
                        <p className="text-[11px] text-on-surface-variant">{r.date}</p>
                      </div>
                    </div>
                    <span className="text-amber-500 text-sm font-bold">{'★'.repeat(r.score)}<span className="text-gray-300">{'★'.repeat(5 - r.score)}</span></span>
                  </div>
                  <p className="text-sm text-on-surface-variant leading-relaxed">{r.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}

function CourseManagementView({ token }) {
  const [courses, setCourses]         = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [tick, setTick]               = useState(0)
  const [statusFilter, setStatusFilter] = useState('Tất cả')
  const [search, setSearch]           = useState('')
  const [sort, setSort]               = useState({ key: 'updated', dir: 'desc' })
  const [selected, setSelected]       = useState(() => new Set())
  const [page, setPage]               = useState(1)
  const pageSize = 6
  const [drawer, setDrawer]           = useState(null)
  const [drawerShow, setDrawerShow]   = useState(false)
  const [drawerTab, setDrawerTab]     = useState('info')
  const [menu, setMenu]               = useState(null)   // { id, x, y }
  const [confirm, setConfirm]         = useState(null)   // { title, message, danger, confirmLabel, onConfirm }
  const [toast, setToast]             = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    authFetch(`${API}/api/admin/courses`, token)
      .then(data => { setCourses(data.courses || []); setLoading(false) })
      .catch(err  => { setError(err.message); setLoading(false) })
  }, [token, tick])
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2600); return () => clearTimeout(t) }, [toast])
  useEffect(() => { setPage(1) }, [statusFilter, search])

  const showToast = (msg, type = 'success') => setToast({ msg, type })

  // ── Derived rows ──
  const chip = C_CHIPS.find(c => c.key === statusFilter)
  const filtered = courses.filter(c => {
    if (chip && chip.match && !chip.match(c)) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      if (!(c.title.toLowerCase().includes(q) || c.id.toLowerCase().includes(q) || c.tutor.toLowerCase().includes(q))) return false
    }
    return true
  })
  const sorted = [...filtered].sort((a, b) => {
    const dir = sort.dir === 'asc' ? 1 : -1
    let av = a[sort.key], bv = b[sort.key]
    if (sort.key === 'updated' || sort.key === 'created') { av = new Date(av).getTime(); bv = new Date(bv).getTime() }
    if (sort.key === 'title' || sort.key === 'tutor' || sort.key === 'subject') { av = String(av).toLowerCase(); bv = String(bv).toLowerCase() }
    return av < bv ? -dir : av > bv ? dir : 0
  })
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const pageRows = sorted.slice((safePage - 1) * pageSize, safePage * pageSize)

  const toggleSort = key => setSort(s => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' })
  const pageIds = pageRows.map(c => c.id)
  const allPageSelected = pageIds.length > 0 && pageIds.every(id => selected.has(id))
  const somePageSelected = pageIds.some(id => selected.has(id))
  const togglePageAll = () => setSelected(prev => {
    const next = new Set(prev)
    if (allPageSelected) pageIds.forEach(id => next.delete(id))
    else pageIds.forEach(id => next.add(id))
    return next
  })
  const toggleOne = id => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const clearSelection = () => setSelected(new Set())

  // ── Mutations (disabled — read-only view) ──
  const doArchive  = _ids => showToast('Chức năng quản lý khóa học đang được phát triển.', 'error')
  const doHide     = _ids => showToast('Chức năng quản lý khóa học đang được phát triển.', 'error')
  const doDelete   = _ids => showToast('Chức năng quản lý khóa học đang được phát triển.', 'error')

  const openMenu = (e, id) => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); setMenu(menu && menu.id === id ? null : { id, x: r.right, y: r.bottom }) }
  const openDrawer = c => { setDrawer(c); setDrawerTab('info'); requestAnimationFrame(() => setDrawerShow(true)) }
  const closeDrawer = () => { setDrawerShow(false); setTimeout(() => setDrawer(null), 280) }

  const exportExcel = () => {
    const headers = ['ID', 'Khóa học', 'Gia sư', 'Môn học', 'Học viên', 'Số bài', 'Đánh giá', 'Giá', 'Trạng thái', 'Cập nhật', 'Doanh thu (đ)']
    const rows = sorted.map(c => [c.id, c.title, c.tutor, c.subject, c.students, c.lessons, c.rating, c.price === 0 ? 'Miễn phí' : c.price, c.status, fmtDMY(c.updated), c.revenue])
    const esc = v => `"${String(v).replace(/"/g, '""')}"`
    const csv = '﻿' + [headers, ...rows].map(r => r.map(esc).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `khoa-hoc-edux-${new Date().toISOString().slice(0, 10)}.csv`
    a.click(); URL.revokeObjectURL(url)
    showToast(`Đã xuất ${sorted.length} khóa học ra Excel.`)
  }

  const STATS = [
    { label: 'Tổng khóa học', value: '1,284', icon: 'school',      iconBg: 'bg-blue-50',    iconColor: 'text-blue-700',    trend: '+12%', up: true },
    { label: 'Đang hoạt động', value: '986',  icon: 'check_circle', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-700', trend: '+6%',  up: true },
    { label: 'Tổng học viên', value: '62.4K', icon: 'group',        iconBg: 'bg-amber-50',  iconColor: 'text-amber-700',   trend: '+18%', up: true },
    { label: 'Doanh thu',     value: '3.2 tỷ', icon: 'payments',    iconBg: 'bg-violet-50',  iconColor: 'text-violet-700',  trend: '+22%', up: true },
  ]

  const SortHead = ({ label, k, align = 'left' }) => (
    <th className={`py-3 px-4 text-xs font-semibold text-on-surface-variant uppercase whitespace-nowrap ${align === 'right' ? 'text-right' : ''}`}>
      <button onClick={() => toggleSort(k)} className={`inline-flex items-center gap-1 hover:text-primary transition-colors ${align === 'right' ? 'flex-row-reverse' : ''}`}>
        {label}
        <span className="material-symbols-outlined text-[15px]">{sort.key === k ? (sort.dir === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}</span>
      </button>
    </th>
  )

  return (
    <div className="p-6 lg:p-10 max-w-[1600px] mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold text-on-background">Quản lý khóa học</h2>
          <p className="text-sm text-on-surface-variant mt-1">Theo dõi, kiểm duyệt và quản lý toàn bộ khóa học trên hệ thống EduX.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={exportExcel} className="px-4 py-2.5 bg-white border border-outline-variant text-on-surface rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-gray-50 transition-colors shadow-sm">
            <span className="material-symbols-outlined text-[18px] text-emerald-600">file_download</span> Xuất Excel
          </button>
          <button onClick={() => showToast('Mở trình tạo khóa học mới.')} className="px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-sm">
            <span className="material-symbols-outlined text-[18px]">add</span> Tạo khóa học
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        {STATS.map((s, i) => (
          <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-outline-variant hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className={`w-10 h-10 rounded-lg ${s.iconBg} flex items-center justify-center ${s.iconColor}`}>
                <span className="material-symbols-outlined">{s.icon}</span>
              </div>
              <span className={`flex items-center text-xs font-semibold ${s.up ? 'text-emerald-600' : 'text-amber-600'}`}>
                <span className="material-symbols-outlined text-[15px]">{s.up ? 'trending_up' : 'trending_up'}</span>{s.trend}
              </span>
            </div>
            <p className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">{s.label}</p>
            <h4 className="text-2xl font-bold text-on-background">{s.value}</h4>
          </div>
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-6 flex items-center gap-3 px-5 py-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
          <span className="material-symbols-outlined text-[20px]">error</span>
          {error}
          <button onClick={() => setTick(t => t + 1)} className="ml-auto px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold transition-colors">Thử lại</button>
        </div>
      )}

      {/* Table card */}
      <div className="bg-white rounded-xl shadow-sm border border-outline-variant overflow-hidden mb-6">
        {/* Toolbar / bulk bar */}
        {selected.size > 0 ? (
          <div className="flex items-center gap-3 px-6 py-3 border-b border-outline-variant bg-primary/5">
            <span className="text-sm font-semibold text-primary">{selected.size} đã chọn</span>
            <div className="h-5 w-px bg-outline-variant" />
            <button onClick={() => doArchive([...selected])} className="px-3 py-1.5 rounded-lg text-sm font-semibold text-on-surface-variant hover:bg-gray-100 flex items-center gap-1.5 transition-colors">
              <span className="material-symbols-outlined text-[18px]">inventory_2</span> Lưu trữ
            </button>
            <button onClick={() => doDelete([...selected])} className="px-3 py-1.5 rounded-lg text-sm font-semibold text-red-600 hover:bg-red-50 flex items-center gap-1.5 transition-colors">
              <span className="material-symbols-outlined text-[18px]">delete</span> Xóa
            </button>
            <button onClick={clearSelection} className="ml-auto px-3 py-1.5 rounded-lg text-sm font-semibold text-on-surface-variant hover:bg-gray-100 transition-colors">Bỏ chọn</button>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row lg:items-center gap-3 px-6 py-4 border-b border-outline-variant">
            <div className="flex items-center gap-2 flex-wrap">
              {C_CHIPS.map(c => {
                const count = c.match ? courses.filter(c.match).length : courses.length
                const active = statusFilter === c.key
                return (
                  <button key={c.key} onClick={() => setStatusFilter(c.key)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${active ? 'bg-primary text-white' : 'bg-gray-100 text-on-surface-variant hover:bg-gray-200'}`}>
                    {c.key}
                    <span className={`text-[11px] px-1.5 rounded-full ${active ? 'bg-white/20' : 'bg-white'}`}>{count}</span>
                  </button>
                )
              })}
            </div>
            <div className="lg:ml-auto relative w-full lg:w-72 shrink-0">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
              <input value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-outline-variant rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                placeholder="Tìm theo tên khóa học, ID hoặc gia sư..." />
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[1180px]">
            <thead className="bg-gray-50 border-b border-outline-variant">
              <tr>
                <th className="py-3 pl-6 pr-2 w-10">
                  <input type="checkbox" checked={allPageSelected} ref={el => { if (el) el.indeterminate = !allPageSelected && somePageSelected }} onChange={togglePageAll}
                    className="rounded border-outline-variant text-primary focus:ring-primary/30 cursor-pointer" />
                </th>
                <th className="py-3 px-2 text-xs font-semibold text-on-surface-variant uppercase">Ảnh</th>
                <SortHead label="Khóa học" k="title" />
                <SortHead label="Gia sư" k="tutor" />
                <th className="py-3 px-4 text-xs font-semibold text-on-surface-variant uppercase">Môn học</th>
                <SortHead label="Học viên" k="students" />
                <SortHead label="Số bài" k="lessons" />
                <SortHead label="Đánh giá" k="rating" />
                <SortHead label="Giá" k="price" />
                <th className="py-3 px-4 text-xs font-semibold text-on-surface-variant uppercase">Trạng thái</th>
                <SortHead label="Cập nhật" k="updated" />
                <SortHead label="Doanh thu" k="revenue" align="right" />
                <th className="py-3 px-4 text-xs font-semibold text-on-surface-variant uppercase text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {loading && Array.from({ length: 6 }).map((_, i) => (
                <tr key={`sk-${i}`}>
                  <td className="py-4 pl-6 pr-2"><div className="w-4 h-4 rounded bg-gray-100 shimmer" /></td>
                  <td className="py-4 px-2"><div className="w-14 h-10 rounded-lg bg-gray-100 shimmer" /></td>
                  <td className="py-4 px-4"><div className="h-3 w-44 rounded bg-gray-100 shimmer mb-2" /><div className="h-2.5 w-16 rounded bg-gray-100 shimmer" /></td>
                  {Array.from({ length: 9 }).map((__, j) => <td key={j} className="py-4 px-4"><div className="h-3 w-16 rounded bg-gray-100 shimmer" /></td>)}
                </tr>
              ))}

              {!loading && pageRows.map((c, idx) => {
                const m = subjMeta(c.subject)
                const st = cStatusMeta(c.status)
                const isSel = selected.has(c.id)
                return (
                  <tr key={c.id} onClick={() => openDrawer(c)}
                    className={`group cursor-pointer transition-colors ${isSel ? 'bg-primary/5' : 'hover:bg-gray-50'}`}>
                    <td className="py-3 pl-6 pr-2" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={isSel} onChange={() => toggleOne(c.id)}
                        className="rounded border-outline-variant text-primary focus:ring-primary/30 cursor-pointer" />
                    </td>
                    <td className="py-3 px-2"><CourseThumb course={c} /></td>
                    <td className="py-3 px-4 max-w-[280px]">
                      <p className="text-sm font-semibold text-on-surface truncate flex items-center gap-1.5">
                        {c.title}
                        {c.premium && <span className="material-symbols-outlined text-[15px] text-amber-500" title="Premium">workspace_premium</span>}
                      </p>
                      <p className="text-xs text-on-surface-variant font-mono">#{c.id}</p>
                    </td>
                    <td className="py-3 px-4"><TutorBadge name={c.tutor} idx={idx} /></td>
                    <td className="py-3 px-4"><span className={`px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap ${m.tag}`}>{c.subject}</span></td>
                    <td className="py-3 px-4 text-sm text-on-surface font-medium">{fmtInt(c.students)}</td>
                    <td className="py-3 px-4 text-sm text-on-surface-variant whitespace-nowrap">{c.lessons} bài</td>
                    <td className="py-3 px-4 text-sm whitespace-nowrap">{c.rating ? <span className="font-semibold text-on-surface">⭐ {c.rating}</span> : <span className="text-on-surface-variant">—</span>}</td>
                    <td className="py-3 px-4 text-sm whitespace-nowrap">{c.price === 0 ? <span className="font-semibold text-emerald-600">Miễn phí</span> : <span className="font-semibold text-on-surface">{fmtVND(c.price)}</span>}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1 whitespace-nowrap ${st.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{c.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-on-surface-variant whitespace-nowrap">{fmtDMY(c.updated)}</td>
                    <td className="py-3 px-4 text-sm text-on-surface font-semibold text-right whitespace-nowrap">{fmtCompactVND(c.revenue)}</td>
                    <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-0.5">
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                          <button onClick={() => openDrawer(c)} title="Xem" className="p-1.5 rounded-lg text-on-surface-variant hover:bg-blue-50 hover:text-primary transition-colors"><span className="material-symbols-outlined text-[18px]">visibility</span></button>
                          <button onClick={() => showToast(`Chỉnh sửa ${c.id}`)} title="Chỉnh sửa" className="p-1.5 rounded-lg text-on-surface-variant hover:bg-amber-50 hover:text-amber-600 transition-colors"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                          <button onClick={() => { openDrawer(c); setDrawerTab('stats') }} title="Thống kê" className="p-1.5 rounded-lg text-on-surface-variant hover:bg-violet-50 hover:text-violet-600 transition-colors"><span className="material-symbols-outlined text-[18px]">bar_chart</span></button>
                          <button onClick={() => showToast(`${fmtInt(c.students)} học viên trong ${c.id}`)} title="Học viên" className="p-1.5 rounded-lg text-on-surface-variant hover:bg-emerald-50 hover:text-emerald-600 transition-colors"><span className="material-symbols-outlined text-[18px]">group</span></button>
                          <button onClick={() => doArchive([c.id])} title="Lưu trữ" className="p-1.5 rounded-lg text-on-surface-variant hover:bg-slate-100 hover:text-slate-600 transition-colors"><span className="material-symbols-outlined text-[18px]">inventory_2</span></button>
                        </div>
                        <button onClick={e => openMenu(e, c.id)} title="Thêm" className="p-1.5 rounded-lg text-on-surface-variant hover:bg-gray-100 transition-colors"><span className="material-symbols-outlined text-[18px]">more_vert</span></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Empty state */}
        {!loading && sorted.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-[36px] text-gray-300">search_off</span>
            </div>
            <h3 className="text-base font-bold text-on-surface">Không tìm thấy khóa học</h3>
            <p className="text-sm text-on-surface-variant mt-1 max-w-sm">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm để xem thêm kết quả.</p>
            <button onClick={() => { setStatusFilter('Tất cả'); setSearch('') }} className="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors">Xóa bộ lọc</button>
          </div>
        )}

        {/* Pagination */}
        {!loading && sorted.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-outline-variant">
            <p className="text-sm text-on-surface-variant">
              Hiển thị <span className="font-semibold text-on-surface">{(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, sorted.length)}</span> trong <span className="font-semibold text-on-surface">{sorted.length}</span> khóa học
            </p>
            <div className="flex items-center gap-1">
              <button disabled={safePage === 1} onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg text-sm font-semibold text-on-surface-variant hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors flex items-center gap-1">
                <span className="material-symbols-outlined text-[18px]">chevron_left</span> Trước
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button key={i} onClick={() => setPage(i + 1)}
                  className={`w-9 h-9 rounded-lg text-sm font-semibold transition-colors ${safePage === i + 1 ? 'bg-primary text-white' : 'text-on-surface-variant hover:bg-gray-100'}`}>{i + 1}</button>
              ))}
              <button disabled={safePage === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg text-sm font-semibold text-on-surface-variant hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors flex items-center gap-1">
                Sau <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* AI Insights */}
      <AICourseInsightsCard />

      {/* Drawer */}
      <CourseDrawer course={drawer} show={drawerShow} tab={drawerTab} onTab={setDrawerTab} onClose={closeDrawer} />

      {/* Row context menu */}
      {menu && (() => {
        const c = courses.find(x => x.id === menu.id)
        if (!c) return null
        const items = [
          { label: 'Xem chi tiết', icon: 'visibility', color: 'text-primary', show: true, fn: () => openDrawer(c) },
          { label: 'Ẩn khóa học', icon: 'visibility_off', color: 'text-on-surface', show: true, fn: () => doHide([c.id]) },
          { label: 'Lưu trữ', icon: 'inventory_2', color: 'text-on-surface', show: c.status !== 'Đã lưu trữ', fn: () => doArchive([c.id]) },
          { label: 'Xóa', icon: 'delete', color: 'text-red-600', show: true, danger: true, fn: () => doDelete([c.id]) },
        ].filter(i => i.show)
        return (
          <>
            <div className="fixed inset-0 z-[85]" onClick={() => setMenu(null)} />
            <div className="fixed z-[86] w-44 bg-white rounded-xl shadow-2xl border border-outline-variant py-1.5 animate-pop"
              style={{ top: menu.y + 6, left: Math.max(8, menu.x - 176) }}>
              {items.map((it, i) => (
                <button key={i} onClick={() => { setMenu(null); it.fn() }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium hover:bg-gray-50 transition-colors ${it.color} ${it.danger ? 'border-t border-outline-variant mt-1' : ''}`}>
                  <span className="material-symbols-outlined text-[18px]">{it.icon}</span>{it.label}
                </button>
              ))}
            </div>
          </>
        )
      })()}

      {/* Confirmation modal */}
      {confirm && (
        <ModalOverlay onClose={() => setConfirm(null)}>
          <div className="w-full max-w-md p-7 rounded-2xl shadow-2xl bg-white" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-3 rounded-full ${confirm.danger ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                <span className="material-symbols-outlined text-3xl">{confirm.danger ? 'warning' : 'help'}</span>
              </div>
              <h3 className="text-xl font-bold text-on-surface">{confirm.title}</h3>
            </div>
            <p className="text-sm text-on-surface-variant mb-6 leading-relaxed">{confirm.message}</p>
            <div className="flex gap-3">
              <button onClick={() => { const fn = confirm.onConfirm; setConfirm(null); fn && fn() }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90 ${confirm.danger ? 'bg-error' : 'bg-primary'}`}>
                {confirm.confirmLabel || 'Xác nhận'}
              </button>
              <button onClick={() => setConfirm(null)} className="flex-1 py-2.5 bg-gray-100 text-on-surface-variant rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors">Hủy</button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[999] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold animate-pop ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          <span className="material-symbols-outlined text-[18px]">{toast.type === 'success' ? 'check_circle' : 'error'}</span>
          {toast.msg}
        </div>
      )}

      <style>{`
        @keyframes shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
        .shimmer { background-image: linear-gradient(90deg, #f3f4f6 0px, #e9eaee 200px, #f3f4f6 400px); background-size: 800px 100%; animation: shimmer 1.4s infinite linear; }
        @keyframes pop { from { opacity: 0; transform: translateY(6px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .animate-pop { animation: pop 0.16s ease-out; }
      `}</style>
    </div>
  )
}

// ─── Transactions View ────────────────────────────────────────────────────────
function TransactionsView({ token }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('Tất cả');

  const fetchTransactions = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/admin/transactions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTransactions(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [token]);

  const statusColor = s => ({
    'SUCCESS':  'bg-green-100 text-green-700',
    'PENDING':   'bg-amber-100 text-amber-700',
    'REFUNDED':'bg-blue-100 text-blue-700',
    'FAILED':    'bg-red-100 text-red-600',
  }[s] || 'bg-gray-100 text-gray-600');
  
  const statusLabels = {
    'SUCCESS': 'Hoàn thành',
    'PENDING': 'Chờ xử lý',
    'REFUNDED': 'Đã hoàn tiền',
    'FAILED': 'Thất bại'
  };

  const fmt = n => 'đ' + Number(n).toLocaleString('vi-VN');
  
  const getFilterStatus = (filter) => {
    if (filter === 'Hoàn thành') return 'SUCCESS';
    if (filter === 'Chờ xử lý') return 'PENDING';
    if (filter === 'Đã hoàn tiền') return 'REFUNDED';
    if (filter === 'Thất bại') return 'FAILED';
    return null;
  };
  
  const dbFilter = getFilterStatus(statusFilter);
  const filtered = statusFilter === 'Tất cả' ? transactions : transactions.filter(t => t.status === dbFilter);

  const totalRev = transactions.filter(t => t.status === 'SUCCESS').reduce((a, t) => a + Number(t.amount), 0);

  if (loading) return <div className="p-10 flex justify-center"><span className="material-symbols-outlined animate-spin text-4xl text-primary">refresh</span></div>;

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
          { label: 'Hoàn thành',         value: transactions.filter(t=>t.status==='SUCCESS').length, icon: 'check_circle', bg: 'bg-green-50', color: 'text-green-700' },
          { label: 'Chờ xử lý',          value: transactions.filter(t=>t.status==='PENDING').length,  icon: 'schedule',     bg: 'bg-amber-50', color: 'text-amber-700' },
          { label: 'Thất bại/Hoàn tiền', value: transactions.filter(t=>['FAILED','REFUNDED'].includes(t.status)).length, icon: 'cancel', bg: 'bg-red-50', color: 'text-red-600' },
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
              <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase">Chủ thẻ/Người nhận</th>
              <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase">Cổng thanh toán</th>
              <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase">Số tiền</th>
              <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase">Trạng thái</th>
              <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase">Ngày</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {filtered.map(t => (
              <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                <td className="py-4 px-6 text-sm font-mono text-primary font-semibold truncate max-w-[150px]" title={t.id}>{t.id.substring(0,8)}...</td>
                <td className="py-4 px-6 text-sm text-on-surface">
                   <div className="font-medium">{t.user_name}</div>
                   <div className="text-xs text-on-surface-variant">{t.email}</div>
                </td>
                <td className="py-4 px-6 text-sm text-on-surface">
                   <span className="font-semibold text-gray-700">{t.gateway}</span>
                   {t.type && <div className="text-xs text-gray-500 mt-0.5">{t.type}</div>}
                </td>
                <td className="py-4 px-6 text-sm font-bold text-on-surface">
                  {t.type === 'WITHDRAW' ? '-' : '+'}{fmt(t.amount)}
                </td>
                <td className="py-4 px-6"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor(t.status)}`}>{statusLabels[t.status] || t.status}</span></td>
                <td className="py-4 px-6 text-sm text-on-surface-variant">{new Date(t.date).toLocaleDateString('vi-VN')}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan="6" className="py-12 text-center text-on-surface-variant">Không có giao dịch nào</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ComplaintsView({ token }) {
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
  const [disputes, setDisputes] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [resolveModal, setResolveModal] = useState(null)
  const [adminNote, setAdminNote] = useState('')
  const [penaltyType, setPenaltyType] = useState('NONE')
  const [resolving, setResolving] = useState(false)

  const fetchDisputes = async () => {
    setLoading(true)
    try {
      const res = await fetch(API_BASE + '/api/admin/disputes', {
        headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
      })
      const data = await res.json()
      setDisputes(data.disputes || [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  useEffect(() => { fetchDisputes() }, [])

  const handleResolve = async (decision) => {
    if (!resolveModal) return
    setResolving(true)
    try {
      const res = await fetch(API_BASE + '/api/escrow/resolve-dispute-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + localStorage.getItem('token') },
        body: JSON.stringify({ disputeId: resolveModal.id, decision, adminNote, penaltyType })
      })
      const data = await res.json()
      if (data.success) {
        alert('Đã xử lý: ' + (decision === 'REFUND_TO_STUDENT' ? 'Hoàn tiền cho học sinh' : 'Giải ngân cho gia sư'))
        setResolveModal(null); setAdminNote(''); setPenaltyType('NONE'); fetchDisputes()
      } else { alert(data.message || 'Có lỗi xảy ra.') }
    } catch { alert('Lỗi kết nối.') }
    setResolving(false)
  }

  const fmtMoney = (n) => Number(n || 0).toLocaleString('vi-VN') + 'đ'
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—'
  const statusLabel = { 'OPEN': 'Đang mở', 'RESOLVED_REFUND': 'Hoàn tiền', 'RESOLVED_RELEASE': 'Giải ngân' }
  const statusColor = {
    'OPEN': 'bg-red-50 text-red-700 border border-red-200',
    'RESOLVED_REFUND': 'bg-green-50 text-green-700 border border-green-200',
    'RESOLVED_RELEASE': 'bg-blue-50 text-blue-700 border border-blue-200'
  }
  const filtered = statusFilter === 'all' ? disputes
    : statusFilter === 'open' ? disputes.filter(d => d.status === 'OPEN')
    : disputes.filter(d => d.status !== 'OPEN')
  const openCount = disputes.filter(d => d.status === 'OPEN').length
  const resolvedCount = disputes.filter(d => d.status !== 'OPEN').length

  return (
    <div className="p-10 max-w-[1280px] mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-bold text-on-background">Khiếu nại & Tranh chấp</h2>
          <p className="text-sm text-on-surface-variant mt-1">Xem xét và phán quyết các khiếu nại liên quan đến học phí.</p>
        </div>
        <button onClick={fetchDisputes} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-outline-variant text-sm hover:bg-gray-50 transition-colors">
          <span className="material-symbols-outlined text-[18px]">refresh</span>Làm mới
        </button>
      </div>
      <div className="grid grid-cols-3 gap-6 mb-8">
        {[
          { label: 'Đang mở', count: openCount, color: 'border-red-400', icon: 'gavel', iconColor: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Đã xử lý', count: resolvedCount, color: 'border-green-400', icon: 'check_circle', iconColor: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Tổng cộng', count: disputes.length, color: 'border-blue-400', icon: 'report', iconColor: 'text-blue-600', bg: 'bg-blue-50' },
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
          {[{key:'all',label:'Tất cả'},{key:'open',label:`Đang mở (${openCount})`},{key:'closed',label:'Đã xử lý'}].map(f => (
            <button key={f.key} onClick={() => setStatusFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${statusFilter===f.key?'bg-primary text-white':'bg-gray-100 text-on-surface-variant hover:bg-gray-200'}`}>
              {f.label}
            </button>
          ))}
        </div>
        {loading ? (
          <div className="p-12 text-center"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-on-surface-variant">
            <span className="material-symbols-outlined text-[48px] block mb-2">check_circle</span>
            Không có khiếu nại nào
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-outline-variant">
              <tr>
                {['Người báo cáo','Gia sư','Môn / Ngày','Học phí','Lý do','Ngày gửi','Trạng thái','Thao tác'].map(h => (
                  <th key={h} className="py-3 px-4 text-xs font-semibold text-on-surface-variant uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {filtered.map(d => (
                <tr key={d.id} className={`hover:bg-gray-50 transition-colors ${d.status==='OPEN'?'bg-red-50/30':''}`}>
                  <td className="py-3 px-4 text-sm font-medium text-on-surface">{d.reporter_name} {d.raised_by_parent ? '(Phụ huynh)' : ''}</td>
                  <td className="py-3 px-4 text-sm text-on-surface">{d.tutor_full_name || d.tutor_name || d.d_tutor_id}</td>
                  <td className="py-3 px-4 text-sm">
                    {d.target_type === 'course' ? (
                      <p><span className="bg-primary/10 text-primary text-[10px] px-1 rounded uppercase mr-1">Khóa học</span>{d.course_title}</p>
                    ) : (
                      <><p>{d.subject}</p><p className="text-xs text-on-surface-variant">{fmtDate(d.lesson_date)}</p></>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm font-semibold text-primary">{fmtMoney(d.lesson_fee)}</td>
                  <td className="py-3 px-4 text-sm text-on-surface-variant max-w-[180px]">
                    <p className="truncate font-bold text-red-500 uppercase text-[10px] mb-1">{d.severity}</p>
                    <p className="truncate" title={d.reason}>{d.reason}</p>
                  </td>
                  <td className="py-3 px-4 text-sm text-on-surface-variant">{fmtDate(d.created_at)}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${statusColor[d.status]||'bg-gray-100 text-gray-600'}`}>{statusLabel[d.status]||d.status}</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {d.status === 'OPEN' ? (
                      <button onClick={() => { setResolveModal(d); setAdminNote('') }}
                        className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold hover:opacity-90 flex items-center gap-1 ml-auto">
                        <span className="material-symbols-outlined text-[14px]">gavel</span>Phán quyết
                      </button>
                    ) : <span className="text-xs text-on-surface-variant italic">Đã xử lý</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {resolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">gavel</span>Phán quyết khiếu nại
              </h3>
              <button onClick={() => setResolveModal(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-2">
                <div className="flex justify-between"><span className="text-on-surface-variant">Người báo cáo:</span><span className="font-medium">{resolveModal.reporter_name} {resolveModal.raised_by_parent ? '(Phụ huynh)' : ''}</span></div>
                <div className="flex justify-between"><span className="text-on-surface-variant">Gia sư bị khiếu nại:</span><span className="font-medium">{resolveModal.tutor_full_name || resolveModal.tutor_name || 'N/A'}</span></div>
                <div className="flex justify-between"><span className="text-on-surface-variant">{resolveModal.target_type === 'course' ? 'Khóa học:' : 'Môn học:'}</span><span className="font-medium">{resolveModal.target_type === 'course' ? resolveModal.course_title : `${resolveModal.subject} — ${fmtDate(resolveModal.lesson_date)}`}</span></div>
                <div className="flex justify-between"><span className="text-on-surface-variant">Số tiền:</span><span className="font-bold text-primary text-base">{fmtMoney(resolveModal.lesson_fee)}</span></div>
                <div className="flex justify-between"><span className="text-on-surface-variant">Mức độ:</span><span className="font-bold text-red-500 uppercase">{resolveModal.severity}</span></div>
                <div className="pt-2 border-t border-gray-200">
                  <span className="text-on-surface-variant">Lý do:</span>
                  <p className="text-on-surface mt-1 italic">"{resolveModal.reason}"</p>
                </div>
                {resolveModal.evidence_url && (
                  <div className="pt-2 border-t border-gray-200">
                    <span className="text-on-surface-variant">Bằng chứng:</span>
                    <a href={resolveModal.evidence_url} target="_blank" rel="noopener noreferrer" className="block mt-1 text-primary hover:underline">Xem đính kèm</a>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-on-surface-variant mb-1">Ghi chú phán quyết</label>
                  <textarea value={adminNote} onChange={e => setAdminNote(e.target.value)} rows={3}
                    placeholder="Lý do phán quyết..."
                    className="w-full p-3 rounded-xl border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary resize-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-on-surface-variant mb-1">Hình thức xử phạt gia sư</label>
                  <select value={penaltyType} onChange={e => setPenaltyType(e.target.value)} className="w-full p-3 rounded-xl border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary text-sm outline-none">
                    <option value="NONE">Không phạt (Chỉ nhắc nhở)</option>
                    <option value="WARNING">Cảnh cáo (Gửi thông báo)</option>
                    <option value="DEDUCT_REP">Trừ điểm uy tín (-10 điểm)</option>
                    <option value="SUSPEND_3_DAYS">Đình chỉ tạm thời (-20 điểm)</option>
                    <option value="BAN">Khóa tài khoản vĩnh viễn</option>
                  </select>
                  <p className="text-xs text-on-surface-variant mt-2">
                    * Lưu ý: Nếu điểm uy tín của gia sư rơi xuống dưới 30, hệ thống sẽ <strong>tự động khóa tài khoản</strong>.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button onClick={() => handleResolve('REFUND_TO_STUDENT')} disabled={resolving}
                  className="p-4 rounded-xl bg-red-50 border-2 border-red-300 hover:border-red-500 hover:bg-red-100 transition-all disabled:opacity-50 text-left relative overflow-hidden group">
                  <span className="material-symbols-outlined text-red-600 text-[22px] block mb-2">undo</span>
                  <p className="font-bold text-red-800 text-sm">Chấp nhận khiếu nại (Hoàn tiền)</p>
                  <p className="text-xs text-red-600 mt-1">Hoàn lại tiền cho học sinh và áp dụng hình thức xử phạt với gia sư.</p>
                  <p className="text-xs font-bold text-red-700 mt-2">→ {fmtMoney(resolveModal.lesson_fee)}</p>
                  <div className="absolute inset-0 bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </button>
                <button onClick={() => handleResolve('RELEASE_TO_TUTOR')} disabled={resolving}
                  className="p-4 rounded-xl bg-blue-50 border-2 border-blue-300 hover:border-blue-500 hover:bg-blue-100 transition-all disabled:opacity-50 text-left relative overflow-hidden group">
                  <span className="material-symbols-outlined text-blue-600 text-[22px] block mb-2">payments</span>
                  <p className="font-bold text-blue-800 text-sm">Bác bỏ khiếu nại (Giải ngân)</p>
                  <p className="text-xs text-blue-600 mt-1">Gia sư không có lỗi. Giữ nguyên doanh thu cho gia sư.</p>
                  <p className="text-xs font-bold text-blue-700 mt-2">→ {fmtMoney(Math.floor(Number(resolveModal.lesson_fee||0)*0.9))}</p>
                  <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </button>
              </div>
              {resolving && <div className="text-center text-sm text-on-surface-variant flex items-center justify-center gap-2"><div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"/>Đang xử lý...</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


// ─── Reviews View ─────────────────────────────────────────────────────────────
const Stars = ({ n }) => (
  <div className="flex gap-0.5">
    {[1,2,3,4,5].map(i => (
      <span key={i} className={`material-symbols-outlined text-[16px] ${i <= n ? 'text-amber-400' : 'text-gray-200'}`}
        style={{ fontVariationSettings: i <= n ? "'FILL' 1" : "'FILL' 0" }}>star</span>
    ))}
  </div>
)

function ReviewsView({ token }) {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [tick,    setTick]    = useState(0)

  useEffect(() => {
    setLoading(true)
    setError(null)
    authFetch(`${API}/api/admin/reviews`, token)
      .then(data => { setReviews(data); setLoading(false) })
      .catch(err  => { setError(err.message); setLoading(false) })
  }, [token, tick])

  const avg = reviews.length
    ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0'
  const dist = [5,4,3,2,1].map(s => ({ star: s, count: reviews.filter(r => r.rating === s).length }))

  return (
    <div className="p-10 max-w-[1280px] mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-bold text-on-background">Đánh giá</h2>
          <p className="text-sm text-on-surface-variant mt-1">Theo dõi phản hồi và xếp hạng từ người dùng.</p>
        </div>
        <button onClick={() => setTick(t => t + 1)} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-outline-variant rounded-lg text-sm text-on-surface-variant hover:text-primary transition-colors shadow-sm">
          <span className="material-symbols-outlined text-[18px]">refresh</span> Làm mới
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-48 text-on-surface-variant">
          <span className="material-symbols-outlined text-[32px] mr-3" style={{ animation: 'spin 1s linear infinite' }}>progress_activity</span>
          Đang tải...
        </div>
      )}
      {error && !loading && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm mb-6">
          <span className="material-symbols-outlined">error</span>
          {error}
          <button onClick={() => setTick(t => t + 1)} className="ml-auto text-xs underline">Thử lại</button>
        </div>
      )}

      {!loading && (
        <>
          <div className="grid grid-cols-12 gap-6 mb-8">
            <div className="col-span-4 bg-white rounded-xl p-6 shadow-sm border border-outline-variant text-center">
              <p className="text-6xl font-bold text-primary mb-1">{avg}</p>
              <div className="flex justify-center mb-2">
                <Stars n={Math.round(Number(avg))} />
              </div>
              <p className="text-sm text-on-surface-variant">{reviews.length} đánh giá</p>
              <div className="mt-4 space-y-2">
                {dist.map(d => (
                  <div key={d.star} className="flex items-center gap-2">
                    <span className="text-xs text-on-surface-variant w-4 text-right">{d.star}</span>
                    <span className="material-symbols-outlined text-amber-400 text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    <div className="flex-1 bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-amber-400 h-full rounded-full" style={{ width: reviews.length ? `${(d.count / reviews.length) * 100}%` : '0%' }} />
                    </div>
                    <span className="text-xs text-on-surface-variant w-4">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="col-span-8 grid grid-cols-3 gap-4 content-start">
              {[
                { label: 'Đánh giá 5 sao', value: reviews.filter(r => r.rating === 5).length, icon: 'star',          color: 'text-amber-500',  bg: 'bg-amber-50'  },
                { label: 'Đánh giá 1–2 sao', value: reviews.filter(r => r.rating <= 2).length, icon: 'thumb_down',   color: 'text-red-600',    bg: 'bg-red-50'    },
                { label: 'Tổng cộng',        value: reviews.length,                             icon: 'reviews',      color: 'text-indigo-600', bg: 'bg-indigo-50' },
              ].map(c => (
                <div key={c.label} className="bg-white rounded-xl p-4 shadow-sm border border-outline-variant">
                  <div className={`w-9 h-9 rounded-lg ${c.bg} flex items-center justify-center ${c.color} mb-3`}>
                    <span className="material-symbols-outlined text-[18px]">{c.icon}</span>
                  </div>
                  <p className="text-xs text-on-surface-variant">{c.label}</p>
                  <p className="text-2xl font-bold text-on-background">{c.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-outline-variant overflow-hidden">
            <div className="px-6 py-4 border-b border-outline-variant">
              <h3 className="text-base font-semibold text-on-surface">Tất cả đánh giá</h3>
            </div>
            {reviews.length === 0 ? (
              <div className="text-center py-16 text-on-surface-variant">
                <span className="material-symbols-outlined text-[48px] mb-3 block">reviews</span>
                Chưa có đánh giá nào.
              </div>
            ) : (
              <div className="divide-y divide-outline-variant">
                {reviews.map(r => (
                  <div key={r.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold flex-shrink-0">
                        {(r.reviewer_name || '?').charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="text-sm font-semibold text-on-surface">{r.reviewer_name}</p>
                          {r.reviewer_role && (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">{r.reviewer_role}</span>
                          )}
                          {r.subject && (
                            <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-full">{r.subject}</span>
                          )}
                        </div>
                        <Stars n={r.rating} />
                        <p className="text-sm text-on-surface-variant mt-1">{r.content}</p>
                        <p className="text-xs text-on-surface-variant mt-1">{fmtDate(r.created_at)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
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
function AIInsightsView({ token }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    setError(null)
    fetch(`${API}/api/admin/ai-insights`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(d  => { setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [token])

  const flags      = data?.flags          || []
  const trends     = data?.subject_trends || []
  const preds      = data?.predictions    || []
  const summary    = data?.summary        || { high_count: 0, medium_count: 0, low_count: 0 }

  return (
    <div className="p-10 max-w-[1280px] mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-on-background">AI Insights</h2>
        <p className="text-sm text-on-surface-variant mt-1">Phát hiện bất thường tự động, phân tích xu hướng và thông minh nền tảng — dựa trên dữ liệu thực.</p>
      </div>

      {loading && <div className="h-64 bg-gray-50 rounded-xl animate-pulse" />}

      {error && (
        <div className="flex items-center gap-3 px-5 py-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium mb-6">
          <span className="material-symbols-outlined text-[20px]">error</span>
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Anomaly Alert Banner */}
          {summary.high_count > 0 && (
            <div className="bg-white rounded-xl p-5 border-l-4 border-red-500 shadow-sm mb-8 flex items-start gap-4">
              <div className="w-11 h-11 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                <span className="material-symbols-outlined text-[24px]">warning</span>
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-on-surface mb-1">
                  Phát hiện {summary.high_count} bất thường ưu tiên cao cần xử lý ngay
                </h3>
                <p className="text-sm text-on-surface-variant">
                  {summary.medium_count} tín hiệu trung bình, {summary.low_count} tín hiệu thấp. Xem chi tiết bên dưới.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-12 gap-6">
            {/* Anomaly feed */}
            <div className="col-span-7 flex flex-col gap-4">
              <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">psychology</span>
                Bất thường phát hiện ({flags.length})
              </h3>
              {flags.length === 0 ? (
                <div className="bg-white rounded-xl p-8 border border-outline-variant text-center">
                  <span className="material-symbols-outlined text-[40px] text-emerald-500">check_circle</span>
                  <p className="text-sm font-semibold text-gray-600 mt-2">Không phát hiện bất thường</p>
                  <p className="text-xs text-gray-400 mt-1">Hệ thống hoạt động bình thường</p>
                </div>
              ) : flags.map((f, i) => (
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
                {trends.length === 0 ? (
                  <p className="text-xs text-gray-400">Chưa đủ dữ liệu xu hướng.</p>
                ) : (
                  <div className="space-y-3">
                    {trends.map(t => (
                      <div key={t.subject} className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg ${t.bg} flex items-center justify-center ${t.color}`}>
                          <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-on-surface">{t.subject}</p>
                          <div className="w-full bg-gray-100 h-1.5 rounded-full mt-1 overflow-hidden">
                            <div className={`h-full rounded-full ${t.growth_pct >= 0 ? 'bg-green-400' : 'bg-red-400'}`}
                              style={{ width: `${Math.min(100, Math.abs(t.growth_pct))}%` }} />
                          </div>
                        </div>
                        <span className={`text-sm font-bold ${t.growth_pct >= 0 ? 'text-green-600' : 'text-red-500'}`}>{t.growth_label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Predictions */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-outline-variant">
                <h3 className="text-base font-bold text-on-surface mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">auto_awesome</span>
                  Dự báo dựa trên dữ liệu
                </h3>
                {preds.length === 0 ? (
                  <p className="text-xs text-gray-400">Chưa đủ dữ liệu dự báo.</p>
                ) : (
                  <div className="space-y-3">
                    {preds.map((p, i) => (
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
                )}
              </div>
            </div>
          </div>
        </>
      )}
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
