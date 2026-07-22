import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { useAuth } from './AuthContext'
import AdminNotificationBell from './components/AdminNotificationBell'
import AdminCopilot           from './admin/copilot/AdminCopilot'

// ─── Transaction Management Modules (lazy-loaded: only the active tab's code is fetched) ──
const FinancialOverview     = lazy(() => import('./admin/transactions/FinancialOverview'))
const LessonPayments        = lazy(() => import('./admin/transactions/LessonPayments'))
const CourseTransactions    = lazy(() => import('./admin/transactions/CourseTransactions'))
const RefundManagement      = lazy(() => import('./admin/transactions/RefundManagement'))
const FailedTransactions    = lazy(() => import('./admin/transactions/FailedTransactions'))
const PaymentGateways       = lazy(() => import('./admin/transactions/PaymentGateways'))
const CommissionManagement  = lazy(() => import('./admin/transactions/CommissionManagement'))
const PlatformRevenue       = lazy(() => import('./admin/transactions/PlatformRevenue'))
const SystemWallet          = lazy(() => import('./admin/transactions/SystemWallet'))
const PromotionTransactions = lazy(() => import('./admin/transactions/PromotionTransactions'))
const FinancialReports      = lazy(() => import('./admin/transactions/FinancialReports'))
const Reconciliation        = lazy(() => import('./admin/transactions/Reconciliation'))
const FraudAlerts           = lazy(() => import('./admin/transactions/FraudAlerts'))
const NotificationCenter    = lazy(() => import('./admin/transactions/NotificationCenter'))
const AuditLogs             = lazy(() => import('./admin/transactions/AuditLogs'))
const WalletLedger          = lazy(() => import('./admin/transactions/WalletLedger'))
const CommissionLogs        = lazy(() => import('./admin/transactions/CommissionLogs'))
const NotificationOutbox     = lazy(() => import('./admin/transactions/NotificationOutbox'))
const WithdrawalRequests     = lazy(() => import('./admin/transactions/WithdrawalRequests'))
const AICaseResolutions      = lazy(() => import('./admin/transactions/AICaseResolutions'))
const DataEntryView          = lazy(() => import('./admin/DataEntryView'))

const CourseComplaintsAdminView = lazy(() => import('./admin/services/CourseComplaints'))
const Violations = lazy(() => import('./admin/services/Violations'))
const Moderation = lazy(() => import('./admin/services/Moderation'))
const SemanticModeration = lazy(() => import('./admin/semantic/SemanticModeration'))
const FraudIntel = lazy(() => import('./admin/fraud/FraudIntel'))
const SafeAnalytics = lazy(() => import('./admin/analytics/SafeAnalytics'))
const SubjectsView = lazy(() => import('./admin/subjects/SubjectsView'))
import { subjectMeta as sharedSubjectMeta } from './admin/subjects/subjectMeta'
import { uploadCourseThumbnail } from './services/upload'
const ReportsView = lazy(() => import('./admin/reports/ReportsView'))

import { API_BASE_URL as API } from './config'

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
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.hash = '/signin'
      window.location.reload()
    }
    throw new Error(data?.message || `HTTP ${res.status}`)
  }
  return data
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('vi-VN', { day: 'numeric', month: 'short', year: 'numeric' })
}

const AdminWalletDashboard = lazy(() => import('./components/AdminWalletDashboard'))

const TX_SUB_ITEMS = [
  { id: 'tx-overview',     label: 'Tổng Quan Tài Chính',    icon: 'bar_chart' },
  { id: 'tx-lessons',      label: 'Thanh Toán Buổi Học',       icon: 'receipt_long' },
  { id: 'tx-courses',      label: 'Giao Dịch Khóa Học',   icon: 'school' },
  { id: 'tx-withdrawals',  label: 'Duyệt Rút Tiền',      icon: 'account_balance' },
  { id: 'tx-refunds',      label: 'Quản Lý Hoàn Tiền',     icon: 'undo' },
  { id: 'tx-disputes',     label: 'Quản Lý Tranh Chấp',    icon: 'gavel' },
  { id: 'tx-ai-cases',     label: 'Xử Lý AI Khiếu Nại',    icon: 'smart_toy' },
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
  { id: 'tx-wallet-ledger',    label: 'Sổ Cái Ví',            icon: 'account_balance_wallet' },
  { id: 'tx-commission-logs', label: 'Nhật Ký Hoa Hồng',    icon: 'receipt_long' },
  { id: 'notifications-outbox', label: 'Email / Hàng Đợi Thông Báo', icon: 'mark_email_read' },
  { id: 'tx-audit',        label: 'Nhật Ký Admin',            icon: 'history_edu' },
]

const TX_VIEW_IDS = new Set(TX_SUB_ITEMS.map(i => i.id))

const SM_SUB_ITEMS = [
  { id: 'sm-complaints',   label: 'Khiếu nại',             icon: 'report_problem' },
  { id: 'sm-reviews',      label: 'Đánh giá',              icon: 'reviews' },
  { id: 'sm-violations',   label: 'Báo cáo vi phạm',       icon: 'gavel' },
  { id: 'sm-moderation',   label: 'Kiểm duyệt nội dung',   icon: 'policy' },
  { id: 'sm-semantic',     label: 'AI Kiểm duyệt Nội dung', icon: 'smart_toy' },
  { id: 'sm-fraud',        label: 'AI Phát hiện Gian lận', icon: 'security' },
  { id: 'sm-analytics',    label: 'AI Phân tích Dữ liệu',  icon: 'query_stats' },
]
const SM_VIEW_IDS = new Set(SM_SUB_ITEMS.map(i => i.id))

const NAV_ITEMS = [
  { id: 'dashboard',       label: 'Tổng quan',             icon: 'dashboard',            section: 'Tổng quan' },
  { id: 'data-entry',      label: 'Nhập liệu',             icon: 'add_circle',           section: 'Tổng quan' },
  { id: 'tutor-approval',  label: 'Duyệt gia sư',          icon: 'how_to_reg',           section: 'Quản lý' },
  { id: 'user-management', label: 'Quản lý người dùng',    icon: 'group',                section: 'Quản lý' },
  { id: 'subjects',        label: 'Môn học',               icon: 'subject',              section: 'Học tập' },
  { id: 'lessons',         label: 'Khóa học',              icon: 'school',               section: 'Học tập' },
  { id: 'transactions',    label: 'Giao dịch',             icon: 'payments', hasSubmenu: true, section: 'Tài chính & Dịch vụ' },
  { id: 'services',        label: 'Quản lý dịch vụ',       icon: 'support_agent', hasSubmenu: true, section: 'Tài chính & Dịch vụ' },
  { id: 'wallet-management', label: 'Duyệt giao dịch Ví',  icon: 'account_balance_wallet', section: 'Tài chính & Dịch vụ' },
  { id: 'reports',         label: 'Báo cáo',               icon: 'assessment',           section: 'Hệ thống' },
  { id: 'ai-insights',     label: 'AI Insights',           icon: 'psychology',           section: 'Hệ thống' },
  { id: 'audit-logs',      label: 'Nhật ký hệ thống',      icon: 'history_edu',          section: 'Hệ thống' },
  { id: 'settings',        label: 'Cài đặt',               icon: 'settings',             section: 'Hệ thống' },
]

// Bản đồ nhãn dùng cho breadcrumb ở thanh trên cùng
const VIEW_LABELS = Object.fromEntries(
  [...NAV_ITEMS, ...TX_SUB_ITEMS, ...SM_SUB_ITEMS].map(i => [i.id, i.label])
)

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { user, token, logout } = useAuth()

  const [activeView, setActiveView]   = useState('dashboard')
  const [txMenuOpen, setTxMenuOpen]   = useState(false)
  const [smMenuOpen, setSmMenuOpen]   = useState(false)
  const [topbarSearch, setTopbarSearch] = useState('')
  const [userMgmtSearch, setUserMgmtSearch] = useState('')

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
    <div className="bg-background text-on-surface min-h-screen flex antialiased overflow-x-hidden">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[999] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold transition-all ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          <span className="material-symbols-outlined text-[18px]">{toast.type === 'success' ? 'check_circle' : 'error'}</span>
          {toast.msg}
        </div>
      )}

      {/* ══ SIDEBAR ══ */}
      <aside className="w-64 h-screen fixed left-0 top-0 bg-white shadow-sm z-20 flex flex-col">
        <a href="#/" className="block px-5 pt-6 pb-5 no-underline cursor-pointer border-b border-gray-100">
          <h1 className="text-2xl font-bold text-primary tracking-tight">EduX</h1>
          <p className="text-[10px] uppercase tracking-[0.15em] text-on-surface-variant mt-1">Bảng điều khiển Admin</p>
        </a>

        <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-0.5">
          {NAV_ITEMS.map((item, idx, arr) => {
            const isTxParent = item.id === 'transactions'
            const isSmParent = item.id === 'services'
            const hasSub = item.hasSubmenu

            const isTxActive = TX_VIEW_IDS.has(activeView)
            const isSmActive = SM_VIEW_IDS.has(activeView)

            const active = activeView === item.id || (isTxParent && isTxActive) || (isSmParent && isSmActive)
            const showSection = item.section && item.section !== arr[idx - 1]?.section
            const badge = item.id === 'tutor-approval' && kpiStats.pending_tutors > 0 ? kpiStats.pending_tutors : null

            const sectionHeader = showSection && (
              <p key={`${item.id}-sec`} className="px-3 pt-4 pb-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-on-surface-variant/60 select-none">
                {item.section}
              </p>
            )

            if (hasSub) {
              const isOpen = isTxParent ? txMenuOpen : smMenuOpen
              const setOpen = isTxParent ? () => setTxMenuOpen(!txMenuOpen) : () => setSmMenuOpen(!smMenuOpen)
              const subItems = isTxParent ? TX_SUB_ITEMS : SM_SUB_ITEMS
              const isActiveGrp = isTxParent ? isTxActive : isSmActive

              return (
                <div key={item.id}>
                  {sectionHeader}
                  <a
                    href="#"
                    onClick={e => { e.preventDefault(); setOpen() }}
                    className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer select-none ${
                      isActiveGrp
                        ? 'text-primary font-bold bg-blue-50'
                        : 'text-on-surface-variant hover:text-primary hover:bg-gray-50'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]" style={isActiveGrp ? { fontVariationSettings: "'FILL' 1" } : {}}>{item.icon}</span>
                    <span className="text-[13px] font-semibold flex-1">{item.label}</span>
                    <span className="material-symbols-outlined text-[18px] transition-transform" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>expand_more</span>
                  </a>
                  {isOpen && (
                    <div className="ml-4 mt-0.5 space-y-0.5 border-l-2 border-blue-100 pl-2">
                      {subItems.map(sub => {
                        const subActive = activeView === sub.id
                        return (
                          <a
                            key={sub.id}
                            href="#"
                            onClick={e => { e.preventDefault(); setActiveView(sub.id) }}
                            className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer text-xs ${
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
              <div key={item.id}>
                {sectionHeader}
                <a
                  href="#"
                  onClick={e => { e.preventDefault(); setActiveView(item.id) }}
                  className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer select-none ${
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
                  <span className="text-[13px] font-semibold flex-1">{item.label}</span>
                  {badge && (
                    <span className="min-w-[18px] h-[18px] px-1.5 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
                      {badge}
                    </span>
                  )}
                </a>
              </div>
            )
          })}
        </nav>

        <div className="mt-auto p-3 border-t border-gray-100">
          <div className="flex items-center gap-3 rounded-lg p-2 hover:bg-gray-50 transition-colors">
            {user?.picture ? (
              <img src={user.picture} alt={displayName} className="w-9 h-9 rounded-full object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xs shrink-0">
                {initials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-on-surface truncate">{displayName}</p>
              <p className="text-[11px] text-on-surface-variant truncate">{user?.email}</p>
            </div>
            <button onClick={logout} title="Đăng xuất" className="p-1.5 text-on-surface-variant hover:text-error hover:bg-gray-100 transition-colors rounded-lg shrink-0">
              <span className="material-symbols-outlined text-[20px]">logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ══ MAIN ══ */}
      <main className="ml-64 w-[calc(100%-16rem)] max-w-[calc(100vw-16rem)] min-w-0 min-h-screen flex flex-col overflow-x-hidden">

        {/* Top bar */}
        <header className="h-16 fixed top-0 right-0 left-64 z-10 bg-white/80 backdrop-blur-xl border-b border-black/5 flex justify-between items-center gap-4 px-6 lg:px-8 min-w-0">
          {/* Breadcrumb */}
          <div className="hidden md:flex items-center gap-1.5 text-sm shrink-0 min-w-0">
            <span className="text-on-surface-variant/70 font-medium">EduX Admin</span>
            <span className="material-symbols-outlined text-[16px] text-on-surface-variant/40">chevron_right</span>
            <span className="font-bold text-on-surface truncate">{VIEW_LABELS[activeView] || 'Tổng quan'}</span>
          </div>
          {/* Search */}
          <div className="relative flex-1 max-w-sm min-w-0">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
            <input
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-outline-variant bg-gray-50/80 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 focus:bg-white transition-all"
              placeholder="Tìm kiếm người dùng..."
              type="text"
              value={topbarSearch}
              onChange={e => setTopbarSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && topbarSearch.trim()) {
                  setUserMgmtSearch(topbarSearch.trim())
                  setActiveView('user-management')
                  setTopbarSearch('')
                }
              }}
            />
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button className="w-10 h-10 rounded-xl flex items-center justify-center text-on-surface-variant hover:bg-gray-100 hover:text-primary transition-colors" onClick={() => { fetchData(); fetchKpiStats(); fetchChartData() }} title="Làm mới">
              <span className="material-symbols-outlined">refresh</span>
            </button>
            <AdminNotificationBell token={token} onNavigate={setActiveView} />
            <button className="w-10 h-10 rounded-xl flex items-center justify-center text-on-surface-variant hover:bg-gray-100 hover:text-primary transition-colors" title="Trợ giúp">
              <span className="material-symbols-outlined">help</span>
            </button>
            <div className="h-6 w-px bg-outline-variant mx-1" />
            <div className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full border border-outline-variant hover:bg-gray-50 transition-colors cursor-pointer">
              {user?.picture ? (
                <img src={user.picture} alt={displayName} className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white font-bold text-[10px]">
                  {initials}
                </div>
              )}
              <span className="text-sm font-semibold text-on-surface hidden lg:block max-w-[100px] truncate">{displayName}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="pt-16">
        <Suspense fallback={(
          <div className="flex items-center justify-center py-24 text-gray-400">
            <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
            Đang tải...
          </div>
        )}>
          {activeView === 'dashboard' && (
            <DashboardView
              stats={stats}
              loading={loading}
              onNavigate={setActiveView}
              displayName={displayName}
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
          {activeView === 'wallet-management' && (
            <AdminWalletDashboard />
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
          {activeView === 'data-entry'      && <DataEntryView />}
          {activeView === 'user-management' && <UserManagementView initialSearch={userMgmtSearch} onSearchConsumed={() => setUserMgmtSearch('')} />}
          {activeView === 'subjects'         && <SubjectsView token={token} />}
          {activeView === 'lessons'          && <CourseManagementView token={token} />}
          {activeView === 'transactions'     && <TransactionsView token={token} />}
          {/* ── Transaction Management Module ── */}
          {activeView === 'tx-overview'      && <FinancialOverview onNavigate={setActiveView} token={token} />}
          {activeView === 'tx-lessons'       && <LessonPayments token={token} />}
          {activeView === 'tx-courses'       && <CourseTransactions token={token} />}
          {activeView === 'tx-withdrawals'   && <WithdrawalRequests token={token} />}
          {activeView === 'tx-refunds'       && <RefundManagement token={token} />}
          {activeView === 'tx-disputes'      && <ComplaintsView token={token} />}
          {activeView === 'tx-ai-cases'      && <AICaseResolutions token={token} />}
          {activeView === 'tx-failed'        && <FailedTransactions token={token} />}
          {activeView === 'tx-gateways'      && <PaymentGateways token={token} />}
          {activeView === 'tx-commissions'   && <CommissionManagement token={token} />}
          {activeView === 'tx-platform-revenue' && <PlatformRevenue token={token} />}
          {activeView === 'tx-system-wallet' && <SystemWallet token={token} />}
          {activeView === 'tx-promotions'    && <PromotionTransactions token={token} />}
          {activeView === 'tx-reports'       && <FinancialReports token={token} />}
          {activeView === 'tx-reconciliation' && <Reconciliation token={token} />}
          {activeView === 'tx-fraud'         && <FraudAlerts token={token} onNavigate={setActiveView} />}
          {activeView === 'tx-notifications' && <NotificationCenter token={token} />}
          {activeView === 'tx-wallet-ledger'    && <WalletLedger token={token} />}
          {activeView === 'tx-commission-logs' && <CommissionLogs token={token} />}
          {activeView === 'notifications-outbox' && <NotificationOutbox token={token} />}
          {activeView === 'tx-audit'         && <AuditLogs token={token} />}
          
          {/* ── Service Management Module ── */}
          {activeView === 'sm-complaints'    && <CourseComplaintsAdminView token={token} />}
          {activeView === 'sm-reviews'       && <ReviewsView token={token} />}
          {activeView === 'sm-violations'    && <Violations token={token} />}
          {activeView === 'sm-moderation'    && <Moderation token={token} />}
          {activeView === 'sm-semantic'      && <SemanticModeration token={token} />}
          {activeView === 'sm-fraud'         && <FraudIntel token={token} />}
          {activeView === 'sm-analytics'     && <SafeAnalytics token={token} />}

          {activeView === 'reports'          && <ReportsView token={token} />}
          {activeView === 'ai-insights'      && <AIInsightsView token={token} />}
          {activeView === 'audit-logs'       && <AuditLogs token={token} />}
          {activeView === 'settings'         && <SettingsView />}
        </Suspense>
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

      {/* ══ AI COPILOT (Batch 26 — advisory only) ══ */}
      <AdminCopilot token={token} pageKey={activeView} onNavigate={setActiveView} />
    </div>
  )
}

// ─── Dashboard View ───────────────────────────────────────────────────────────
// CAP-1.1 formatting helpers
const fmtCount      = (n) => (n ?? 0).toLocaleString('vi-VN')
const fmtKpiRevenue = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n ?? 0)

// Lời chào theo thời điểm trong ngày
const greetByHour = () => {
  const h = new Date().getHours()
  if (h < 11) return 'Chào buổi sáng'
  if (h < 14) return 'Chào buổi trưa'
  if (h < 18) return 'Chào buổi chiều'
  return 'Chào buổi tối'
}
const todayLong = () => new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

// Rút gọn số lớn cho thẻ KPI (1.234.000 → 1,2 Tr)
const fmtCompact = (n) => {
  const v = n ?? 0
  if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + ' Tỷ'
  if (v >= 1_000_000)     return (v / 1_000_000).toFixed(1).replace(/\.0$/, '') + ' Tr'
  if (v >= 1_000)         return (v / 1_000).toFixed(0) + 'K'
  return fmtCount(v)
}

function DashboardView({
  stats, loading, onNavigate, displayName = 'Admin',
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
  const yLabels = [maxVal, Math.round(maxVal * 0.75), Math.round(maxVal * 0.5), Math.round(maxVal * 0.25), 0]
    .map(n => n.toLocaleString('vi-VN'))
  const skeletonCount = chartRange === '30d' ? 30 : chartRange === '6m' ? 6 : new Date().getMonth() + 1
  const rangeLabel    = chartRange === '30d' ? '30 ngày gần đây' : chartRange === '6m' ? '6 tháng gần đây' : 'Năm nay'
  const totalNew = series.reduce((s, d) => s + (d.new_users || 0), 0)
  // Nhãn trục X: 30d hiển thị thưa để tránh chật, còn lại hiện tất cả
  const xLabelEvery = chartRange === '30d' ? Math.ceil(series.length / 6) : 1

  return (
    <div className="p-6 lg:p-10 max-w-[1280px] mx-auto w-full min-w-0">
      <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">{greetByHour()}, {displayName} 👋</p>
          <h2 className="text-[26px] leading-tight font-extrabold text-on-background tracking-tight">Tổng quan hệ thống</h2>
          <p className="text-sm text-on-surface-variant mt-1 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">calendar_today</span>
            <span className="capitalize">{todayLong()}</span>
            <span className="text-on-surface-variant/40">·</span>
            Tự động cập nhật mỗi 30 giây
          </p>
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
      <div className="bg-white rounded-2xl p-6 mb-6 border-l-4 border-primary shadow-sm relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center gap-4 flex-wrap relative z-10">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <span className="material-symbols-outlined text-[26px]">psychology</span>
          </div>
          <div className="flex-1 min-w-[180px]">
            <h3 className="text-lg font-bold text-on-background">Tóm tắt AI nền tảng</h3>
            <p className="text-sm text-on-surface-variant mt-0.5">Những mục cần bạn chú ý xử lý hôm nay</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-2xl font-extrabold text-on-background">{kv(K.pending_tutors)}</div>
              <div className="text-[11px] text-on-surface-variant font-medium">Hồ sơ chờ duyệt</div>
            </div>
            <div className="w-px h-10 bg-outline-variant" />
            <div className="text-center">
              <div className="text-2xl font-extrabold text-on-background">{kv(K.open_disputes)}</div>
              <div className="text-[11px] text-on-surface-variant font-medium">Tranh chấp mở</div>
            </div>
          </div>
          <button
            className="shrink-0 px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 transition-colors flex items-center gap-1.5"
            onClick={() => onNavigate('tutor-approval')}
          >
            Xem hồ sơ
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div>
      </div>

      {/* ── CAP-1.1: Live KPI Cards (3 × 2 grid) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 mb-6">
        <KpiCard
          variant="blue"   icon="group"    label="Tổng người dùng"
          value={kv(K.total_users)} loading={kpiLoading}
          delta={chartData.today.new_users} deltaLabel="hôm nay"
        />
        <KpiCard
          variant="violet" icon="school"   label="Học sinh đang học"
          value={kv(K.active_students)} loading={kpiLoading}
        />
        <KpiCard
          variant="cyan"   icon="workspace_premium" label="Gia sư đang hoạt động"
          value={kv(K.active_tutors)} loading={kpiLoading}
          delta={chartData.today.new_tutors} deltaLabel="hồ sơ mới"
        />
        <KpiCard
          variant="amber"  icon="pending"  label="Hồ sơ chờ duyệt"
          value={kv(K.pending_tutors)} loading={kpiLoading}
          hint={kpiLoading ? '' : (K.pending_tutors > 0 ? 'Cần xử lý' : 'Đã xử lý hết')}
        />
        <KpiCard
          variant="green"  icon="payments" label="Doanh thu tháng"
          value={kpiLoading ? '…' : `${fmtCompact(K.monthly_revenue)} ₫`} loading={kpiLoading}
          hint="Tháng này"
        />
        <KpiCard
          variant="rose"   icon="gavel"    label="Tranh chấp đang mở"
          value={kv(K.open_disputes)} loading={kpiLoading}
          hint={kpiLoading ? '' : (K.open_disputes > 0 ? 'Cần chú ý' : 'An toàn')}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Area/Bar Chart — CAP-1.2: live data, dynamic Y-axis, range selector */}
        <div className="xl:col-span-8 bg-white rounded-2xl p-6 shadow-sm border border-black/5 flex flex-col h-[380px] overflow-hidden min-w-0">
          <div className="flex justify-between items-start mb-5 gap-3 flex-wrap">
            <div>
              <h3 className="text-base font-bold text-on-background">Xu hướng tăng trưởng người dùng</h3>
              <p className="text-xs text-on-surface-variant mt-0.5">{rangeLabel} · {fmtCount(totalNew)} người dùng mới</p>
            </div>
            <div className="inline-flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
              {[
                { v: '30d', l: '30 ngày' },
                { v: '6m',  l: '6 tháng' },
                { v: 'ytd', l: 'Năm nay' },
              ].map(opt => (
                <button
                  key={opt.v}
                  onClick={() => onRangeChange(opt.v)}
                  disabled={chartLoading}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all disabled:opacity-50 ${
                    chartRange === opt.v
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {opt.l}
                </button>
              ))}
            </div>
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
                        className="w-full bg-gray-200 rounded-t-sm animate-pulse"
                        style={{ height: `${20 + (i % 5) * 15}%` }}
                      />
                    </div>
                    <div className="h-2 w-6 bg-gray-200 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Live bar chart */
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 flex gap-2 min-h-0">
                {/* Y-axis */}
                <div className="w-9 flex flex-col justify-between text-[10px] text-on-surface-variant text-right py-0.5 shrink-0">
                  {yLabels.map((lbl, i) => <span key={i}>{lbl}</span>)}
                </div>
                {/* Plot area */}
                <div className="relative flex-1 min-w-0">
                  {/* Grid lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                    {[0,1,2,3,4].map(i => <div key={i} className="w-full border-t border-dashed border-gray-100" />)}
                  </div>
                  {/* Bars */}
                  <div className="absolute inset-0 flex items-end justify-between gap-px">
                    {series.map((d, i) => {
                      const pct = (d.new_users / maxVal) * 100
                      const h = d.new_users > 0 ? Math.max(pct, 1.5) : 0
                      return (
                        <div
                          key={i}
                          className="group flex-1 h-full flex items-end justify-center"
                          title={`${d.label}: ${fmtCount(d.new_users)} người dùng mới`}
                        >
                          <div
                            className="w-full max-w-[14px] rounded-t-sm bg-primary/80 group-hover:bg-primary transition-colors"
                            style={{ height: `${h}%` }}
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
              {/* X-axis labels (hiện đầy đủ, không cắt) */}
              <div className="flex gap-2 mt-1.5">
                <div className="w-9 shrink-0" />
                <div className="flex-1 flex min-w-0">
                  {series.map((d, i) => (
                    <span key={i} className="flex-1 text-center text-[10px] text-on-surface-variant whitespace-nowrap">
                      {(i % xLabelEvery === 0 || i === series.length - 1) ? d.label : ''}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-primary" />
              <span className="text-xs text-on-surface-variant font-medium">Người dùng mới</span>
            </div>
            <div className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant">
              <span className="material-symbols-outlined text-[16px]">today</span>
              Hôm nay: <span className="text-primary">{fmtCount(chartData.today.new_users)}</span>
            </div>
          </div>
        </div>

        {/* Recent Activity — CAP-1.2: live data from chart endpoint + KPI stats */}
        <div className="xl:col-span-4 bg-white rounded-2xl p-6 shadow-sm border border-black/5 flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-on-background">Hoạt động gần đây</h3>
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Trực tiếp
            </span>
          </div>
          <div className="relative">
            {[
              { icon: 'how_to_reg', avatar: 'bg-blue-50 text-blue-600',     loading: chartLoading, text: `${fmtCount(chartData.today.new_tutors)} hồ sơ gia sư mới`,     when: 'Hôm nay',  badge: 'Mới',   badgeCls: 'bg-blue-50 text-blue-700' },
              { icon: 'group',      avatar: 'bg-indigo-50 text-indigo-600', loading: chartLoading, text: `${fmtCount(chartData.today.new_users)} người dùng mới đăng ký`, when: 'Hôm nay',  badge: `+${fmtCount(chartData.today.new_users)}`, badgeCls: 'bg-indigo-50 text-indigo-700' },
              { icon: 'pending',    avatar: 'bg-amber-50 text-amber-600',   loading: kpiLoading,   text: `${fmtCount(K.pending_tutors)} hồ sơ chờ duyệt`,             when: 'Hiện tại', badge: K.pending_tutors > 0 ? 'Chờ' : 'Xong', badgeCls: K.pending_tutors > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700' },
              { icon: 'gavel',      avatar: 'bg-red-50 text-red-600',       loading: kpiLoading,   text: `${fmtCount(K.open_disputes)} tranh chấp đang mở`,           when: 'Hiện tại', badge: K.open_disputes > 0 ? 'Chú ý' : 'OK',   badgeCls: K.open_disputes > 0 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700' },
            ].map((it, i, arr) => (
              <div key={i} className="flex gap-3 relative pb-5 last:pb-0">
                {i < arr.length - 1 && <span className="absolute left-[15px] top-8 bottom-0 w-px bg-gray-100" />}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 z-10 ${it.avatar}`}>
                  <span className="material-symbols-outlined text-[18px]">{it.icon}</span>
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  {it.loading
                    ? <div className="h-4 bg-gray-200 rounded animate-pulse w-36 mb-1" />
                    : <p className="text-[13px] font-semibold text-on-surface leading-snug">{it.text}</p>}
                  <p className="text-xs text-on-surface-variant mt-0.5">{it.when}</p>
                </div>
                {!it.loading && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full h-fit shrink-0 ${it.badgeCls}`}>{it.badge}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick access row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6">
        {[
          { id: 'tutor-approval', icon: 'how_to_reg',     label: 'Duyệt gia sư', desc: 'Xem xét hồ sơ chờ duyệt',          tile: 'bg-blue-50 text-blue-600',       count: kpiLoading ? null : (K.pending_tutors || null) },
          { id: 'sm-complaints',  icon: 'report_problem', label: 'Khiếu nại',    desc: 'Xem và xử lý khiếu nại tranh chấp', tile: 'bg-amber-50 text-amber-600',     count: null },
          { id: 'transactions',   icon: 'payments',       label: 'Giao dịch',    desc: 'Theo dõi hoạt động thanh toán',     tile: 'bg-emerald-50 text-emerald-600', count: null },
        ].map(item => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className="group bg-white rounded-2xl p-5 shadow-sm border border-black/5 text-left hover:border-primary/30 hover:shadow-lg hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${item.tile}`}>
                <span className="material-symbols-outlined text-[24px]">{item.icon}</span>
              </div>
              {item.count != null && (
                <span className="px-2.5 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">{fmtCount(item.count)}</span>
              )}
            </div>
            <div className="flex items-end justify-between">
              <div className="min-w-0">
                <p className="text-sm font-bold text-on-surface">{item.label}</p>
                <p className="text-xs text-on-surface-variant mt-0.5">{item.desc}</p>
              </div>
              <span className="material-symbols-outlined text-gray-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0">arrow_forward</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
// Thẻ trắng với icon tile màu nhạt (giữ bảng màu gốc). `delta` là số thực (vd
// người dùng mới hôm nay) — chỉ hiển thị khi > 0; `hint` là nhãn ngữ cảnh tĩnh.
const KPI_VARIANTS = {
  blue:   'bg-blue-50 text-blue-700',
  violet: 'bg-indigo-50 text-indigo-700',
  cyan:   'bg-cyan-50 text-cyan-700',
  amber:  'bg-amber-50 text-amber-700',
  green:  'bg-emerald-50 text-emerald-700',
  rose:   'bg-red-50 text-red-700',
}

function KpiCard({ variant = 'blue', icon, label, value, loading = false, delta, deltaLabel, hint }) {
  const tile = KPI_VARIANTS[variant] || KPI_VARIANTS.blue
  const hasDelta = delta != null && delta > 0
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-black/5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tile}`}>
          <span className="material-symbols-outlined text-[22px]">{icon}</span>
        </div>
        {hasDelta ? (
          <span className="flex items-center gap-0.5 text-xs font-bold text-emerald-600">
            <span className="material-symbols-outlined text-[15px]">trending_up</span>
            {fmtCount(delta)} {deltaLabel || ''}
          </span>
        ) : hint ? (
          <span className="text-[11px] font-semibold text-on-surface-variant">{hint}</span>
        ) : null}
      </div>
      <p className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">{label}</p>
      {loading ? (
        <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
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
                      <th className="py-3 px-4 text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wide">User ID</th>
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
                        {/* User ID + copy */}
                        <td className="py-4 px-4" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <code className="text-[11px] text-on-surface-variant bg-gray-100 px-1.5 py-0.5 rounded font-mono truncate max-w-[90px]" title={tutor.user_id}>
                              {tutor.user_id ? tutor.user_id.slice(0, 8) + '…' : '—'}
                            </code>
                            <button
                              title="Copy user ID"
                              className="p-0.5 text-on-surface-variant hover:text-primary transition-colors"
                              onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(tutor.user_id || '') }}
                            >
                              <span className="material-symbols-outlined text-[14px]">content_copy</span>
                            </button>
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
                              onClick={e => { e.stopPropagation(); onViewDoc((tutor.certificates && tutor.certificates.length > 0) ? tutor.certificates[0].url : tutor.certificate_url) }}
                              disabled={!(tutor.certificates && tutor.certificates.length > 0) && !tutor.certificate_url}
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
                              title="Phân tích AI Copilot"
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                              onClick={e => {
                                e.stopPropagation()
                                window.dispatchEvent(new CustomEvent('admin-copilot:analyze', {
                                  detail: { entityType: 'TUTOR', entityId: tutor.user_id }
                                }))
                              }}
                            >
                              <span className="material-symbols-outlined text-[20px]">psychology</span>
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
                    {/* User ID row */}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[11px] text-on-surface-variant font-medium">User ID:</span>
                      <code className="text-[11px] font-mono bg-gray-100 px-2 py-0.5 rounded text-on-surface select-all">{selectedTutor.user_id || '—'}</code>
                      <button
                        title="Copy"
                        className="text-on-surface-variant hover:text-primary transition-colors"
                        onClick={() => navigator.clipboard.writeText(selectedTutor.user_id || '')}
                      >
                        <span className="material-symbols-outlined text-[14px]">content_copy</span>
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-surface-container-low text-on-surface-variant rounded-full text-label-sm font-label-sm border border-outline-variant">
                      <span className="material-symbols-outlined text-[16px]">pending_actions</span>
                      Chờ duyệt
                    </span>
                    <button
                      onClick={() => window.dispatchEvent(new CustomEvent('admin-copilot:analyze', {
                        detail: { entityType: 'TUTOR', entityId: selectedTutor.user_id }
                      }))}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-label-sm font-label-sm hover:bg-indigo-100 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">psychology</span>
                      Phân tích AI Copilot
                    </button>
                  </div>
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
                    icon: 'history_edu', bgClass: 'bg-surface-container-highest', iconClass: 'text-on-surface',
                    label: 'Học vấn',
                    value: selectedTutor.education || 'Chưa cập nhật',
                    verified: !!selectedTutor.education,
                  },
                  {
                    icon: 'phone', bgClass: 'bg-surface-container-highest', iconClass: 'text-on-surface',
                    label: 'Số điện thoại',
                    value: selectedTutor.phone || 'Chưa cập nhật',
                    verified: !!selectedTutor.phone,
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
                <div className="flex flex-col gap-sm">
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
                      <p className="text-label-md font-label-md text-on-surface">CCCD / Giấy tờ tùy thân (Mặt trước)</p>
                      <p className="text-label-sm font-label-sm text-on-surface-variant mt-0.5">
                        {selectedTutor.cccd_url ? 'Đã tải lên — Nhấn để xem' : 'Chưa nộp'}
                      </p>
                    </div>
                    {selectedTutor.cccd_url && (
                      <span className="material-symbols-outlined text-primary text-[20px] shrink-0">open_in_new</span>
                    )}
                  </button>

                  <button
                    className="w-full flex items-center gap-md p-md border rounded-xl transition-all bg-surface text-left disabled:opacity-40 disabled:cursor-not-allowed
                      border-outline-variant hover:border-primary/50 hover:shadow-sm"
                    onClick={() => onViewDoc(selectedTutor.cccd_back_url)}
                    disabled={!selectedTutor.cccd_back_url}
                  >
                    <div className="w-11 h-11 rounded-xl bg-primary-fixed/30 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-primary text-2xl">badge</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-label-md font-label-md text-on-surface">CCCD / Giấy tờ tùy thân (Mặt sau)</p>
                      <p className="text-label-sm font-label-sm text-on-surface-variant mt-0.5">
                        {selectedTutor.cccd_back_url ? 'Đã tải lên — Nhấn để xem' : 'Chưa nộp'}
                      </p>
                    </div>
                    {selectedTutor.cccd_back_url && (
                      <span className="material-symbols-outlined text-primary text-[20px] shrink-0">open_in_new</span>
                    )}
                  </button>
                </div>
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
function UserManagementView({ initialSearch = '', onSearchConsumed }) {
  const { token } = useAuth()

  const [users,         setUsers]         = useState([])
  const [total,         setTotal]         = useState(0)
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState(null)
  const [search,        setSearch]        = useState(initialSearch)
  const [roleFilter,    setRoleFilter]    = useState('all')
  const [page,          setPage]          = useState(1)
  const [actionId,      setActionId]      = useState(null)
  const [toast,         setUMToast]       = useState(null)
  const [selectedUser,  setSelectedUser]  = useState(null)   // row clicked
  const [detail,        setDetail]        = useState(null)   // full profile from API
  const [detailLoading, setDetailLoading] = useState(false)

  const LIMIT = 20
  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  // Nhận search từ topbar
  useEffect(() => {
    if (initialSearch) { setSearch(initialSearch); onSearchConsumed?.() }
  }, [initialSearch]) // eslint-disable-line react-hooks/exhaustive-deps

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

// ─── Course Management View ───────────────────────────────────────────────────
// Icon/colour/gradient now come from admin/subjects/subjectMeta.js (single
// source of truth) instead of a second local table that had drifted out of
// sync with it (same subject, different colours in each view).
const subjMeta = s => {
  const m = sharedSubjectMeta(s)
  return { tag: m.color, grad: m.grad, icon: m.icon }
}

const C_STATUS_META = {
  'Hoạt động':  { badge: 'bg-green-100 text-green-700',  dot: 'bg-green-500',  icon: 'check_circle' },
  'Bản nháp':   { badge: 'bg-gray-100 text-gray-600',    dot: 'bg-gray-400',   icon: 'edit_note' },
  'Đã lưu trữ': { badge: 'bg-slate-100 text-slate-600',  dot: 'bg-slate-400',  icon: 'inventory_2' },
  'Bị báo cáo': { badge: 'bg-red-100 text-red-700',      dot: 'bg-red-500',    icon: 'flag' },
}
const cStatusMeta = s => C_STATUS_META[s] || C_STATUS_META['Bản nháp']

const AVATAR_COLORS = ['bg-blue-600','bg-violet-600','bg-rose-600','bg-emerald-600','bg-orange-600','bg-cyan-600']
const initialsOf = name => name.split(' ').filter(Boolean).slice(-2).map(w => w[0]).join('').toUpperCase()

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

// ── Course Thumbnail ──
function CourseThumb({ course, size = 'sm' }) {
  const m = subjMeta(course.subject)
  const dims = size === 'lg' ? 'w-full h-40 rounded-xl' : 'w-14 h-10 rounded-lg'
  const icon = size === 'lg' ? 'text-[56px]' : 'text-[20px]'
  return (
    <div className={`relative bg-gradient-to-br ${m.grad} ${dims} flex items-center justify-center overflow-hidden shrink-0`}>
      {course.thumbnail_url
        ? <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
        : <span className={`material-symbols-outlined text-white/90 ${icon}`}>{m.icon}</span>}
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

const emptyCouponForm = { code: '', discount_type: 'percent', discount_value: '', max_discount: '' }

function CourseDrawer({ course, show, tab, onTab, onClose, token, onChanged }) {
  const [lessons, setLessons]           = useState(null)
  const [reviews, setReviews]           = useState(null)
  const [auditLog, setAuditLog]         = useState(null)
  const [coupons, setCoupons]           = useState(null)
  const [analytics, setAnalytics]       = useState(null)
  const [contentError, setContentError] = useState(null)

  const [editingLessons, setEditingLessons] = useState(false)
  const [draftLessons, setDraftLessons]     = useState([])
  const [lessonsSaving, setLessonsSaving]   = useState(false)

  const [couponForm, setCouponForm]     = useState(emptyCouponForm)
  const [couponSaving, setCouponSaving] = useState(false)
  const [couponError, setCouponError]   = useState(null)

  const load = useCallback(() => {
    if (!course || !token) return
    setLessons(null); setReviews(null); setAuditLog(null); setCoupons(null); setAnalytics(null); setContentError(null)
    Promise.all([
      authFetch(`${API}/api/admin/courses/${course.id}/lessons`, token),
      authFetch(`${API}/api/admin/courses/${course.id}/reviews`, token),
      authFetch(`${API}/api/admin/courses/${course.id}/audit-log`, token),
      authFetch(`${API}/api/admin/courses/${course.id}/coupons`, token),
      authFetch(`${API}/api/admin/courses/${course.id}/analytics`, token),
    ])
      .then(([l, r, a, c, an]) => {
        setLessons(l.lessons || []); setReviews(r.reviews || []); setAuditLog(a.logs || [])
        setCoupons(c.coupons || []); setAnalytics(an)
      })
      .catch(err => setContentError(err.message))
  }, [course?.id, token])

  useEffect(() => {
    load()
    setEditingLessons(false)
    setCouponForm(emptyCouponForm); setCouponError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course?.id, token])

  if (!course) return null
  const m = subjMeta(course.subject)
  const st = cStatusMeta(course.status)
  const hours = Math.max(1, Math.round((course.lessons * 16) / 60))
  const TABS = [
    { id: 'info',    label: 'Thông tin', icon: 'info' },
    { id: 'content', label: 'Nội dung',  icon: 'list_alt' },
    { id: 'stats',   label: 'Thống kê',  icon: 'insights' },
    { id: 'reviews', label: 'Đánh giá',  icon: 'reviews' },
    { id: 'coupons', label: 'Mã giảm giá', icon: 'sell' },
    { id: 'audit',   label: 'Nhật ký',   icon: 'history_edu' },
  ]

  const startEditingLessons = () => { setDraftLessons((lessons || []).map(l => ({ ...l }))); setEditingLessons(true) }
  const addDraftLesson = () => setDraftLessons(d => [...d, { title: '', duration_label: '', is_preview: false }])
  const removeDraftLesson = i => setDraftLessons(d => d.filter((_, idx) => idx !== i))
  const moveDraftLesson = (i, dir) => setDraftLessons(d => {
    const j = i + dir
    if (j < 0 || j >= d.length) return d
    const n = [...d];[n[i], n[j]] = [n[j], n[i]]
    return n
  })
  const updateDraftLesson = (i, field, value) => setDraftLessons(d => d.map((l, idx) => idx === i ? { ...l, [field]: value } : l))

  const saveLessons = async () => {
    const clean = draftLessons.filter(l => l.title.trim())
    setLessonsSaving(true)
    try {
      const res = await authFetch(`${API}/api/admin/courses/${course.id}/lessons`, token, {
        method: 'PUT', body: JSON.stringify({ lessons: clean.map((l, i) => ({ ...l, position: i + 1 })) }),
      })
      setLessons(res.lessons || [])
      setEditingLessons(false)
      onChanged?.()
    } catch (err) {
      window.alert(`Lưu nội dung thất bại: ${err.message}`)
    } finally {
      setLessonsSaving(false)
    }
  }

  const submitCoupon = async () => {
    setCouponError(null)
    if (!couponForm.code.trim()) { setCouponError('Mã không được để trống.'); return }
    if (!Number(couponForm.discount_value)) { setCouponError('Giá trị giảm không hợp lệ.'); return }
    setCouponSaving(true)
    try {
      await authFetch(`${API}/api/admin/courses/${course.id}/coupons`, token, { method: 'POST', body: JSON.stringify(couponForm) })
      setCouponForm(emptyCouponForm)
      const c = await authFetch(`${API}/api/admin/courses/${course.id}/coupons`, token)
      setCoupons(c.coupons || [])
    } catch (err) {
      setCouponError(err.message)
    } finally {
      setCouponSaving(false)
    }
  }

  const toggleCouponActive = async coupon => {
    try {
      await authFetch(`${API}/api/admin/courses/${course.id}/coupons/${coupon.id}`, token, { method: 'PATCH', body: JSON.stringify({ active: !coupon.active }) })
      setCoupons(cs => cs.map(c => c.id === coupon.id ? { ...c, active: !c.active } : c))
    } catch (err) { window.alert(err.message) }
  }

  const deleteCoupon = async coupon => {
    if (!window.confirm(`Xóa mã "${coupon.code}"?`)) return
    try {
      await authFetch(`${API}/api/admin/courses/${course.id}/coupons/${coupon.id}`, token, { method: 'DELETE' })
      setCoupons(cs => cs.filter(c => c.id !== coupon.id))
    } catch (err) { window.alert(err.message) }
  }

  const fmtWatched = sec => sec >= 60 ? `${Math.floor(sec / 60)} phút ${sec % 60}s` : `${sec}s`
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
            <div className="space-y-3">
              <div className="flex justify-end">
                {editingLessons ? (
                  <div className="flex gap-2">
                    <button onClick={() => setEditingLessons(false)} disabled={lessonsSaving} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-on-surface-variant hover:bg-gray-100">Hủy</button>
                    <button onClick={saveLessons} disabled={lessonsSaving} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-white hover:bg-primary/90 disabled:opacity-50">
                      {lessonsSaving ? 'Đang lưu...' : 'Lưu nội dung'}
                    </button>
                  </div>
                ) : lessons !== null && (
                  <button onClick={startEditingLessons} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-600 hover:bg-amber-50">
                    <span className="material-symbols-outlined text-[15px]">edit</span> Chỉnh sửa bài học
                  </button>
                )}
              </div>

              {contentError ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{contentError}</div>
              ) : lessons === null ? (
                <div className="flex justify-center py-10 text-on-surface-variant"><span className="material-symbols-outlined animate-spin">progress_activity</span></div>
              ) : editingLessons ? (
                <div className="space-y-2">
                  {draftLessons.map((l, i) => (
                    <div key={i} className="bg-white rounded-xl border border-outline-variant p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <input value={l.title} onChange={e => updateDraftLesson(i, 'title', e.target.value)} placeholder={`Bài ${i + 1}: tên bài học...`}
                          className="flex-1 px-2.5 py-1.5 border border-outline-variant rounded-lg text-sm focus:outline-none focus:border-primary" />
                        <button onClick={() => moveDraftLesson(i, -1)} disabled={i === 0} className="p-1 text-on-surface-variant hover:text-on-surface disabled:opacity-30"><span className="material-symbols-outlined text-[18px]">arrow_upward</span></button>
                        <button onClick={() => moveDraftLesson(i, 1)} disabled={i === draftLessons.length - 1} className="p-1 text-on-surface-variant hover:text-on-surface disabled:opacity-30"><span className="material-symbols-outlined text-[18px]">arrow_downward</span></button>
                        <button onClick={() => removeDraftLesson(i)} className="p-1 text-red-500 hover:text-red-700"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                      </div>
                      <div className="flex items-center gap-2">
                        <input value={l.duration_label || ''} onChange={e => updateDraftLesson(i, 'duration_label', e.target.value)} placeholder="Thời lượng (vd: 30 phút)"
                          className="flex-1 px-2.5 py-1.5 border border-outline-variant rounded-lg text-xs focus:outline-none focus:border-primary" />
                        <label className="flex items-center gap-1.5 text-xs text-on-surface-variant whitespace-nowrap">
                          <input type="checkbox" checked={!!l.is_preview} onChange={e => updateDraftLesson(i, 'is_preview', e.target.checked)} className="rounded border-outline-variant" />
                          Xem trước
                        </label>
                      </div>
                    </div>
                  ))}
                  <button onClick={addDraftLesson} className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-outline-variant text-sm text-on-surface-variant hover:bg-gray-50">
                    <span className="material-symbols-outlined text-[18px]">add</span> Thêm bài học
                  </button>
                </div>
              ) : lessons.length === 0 ? (
                <div className="text-center py-12 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[48px] text-gray-300">list_alt</span>
                  <p className="text-sm mt-2">Khóa học chưa có bài học nào.</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-outline-variant overflow-hidden">
                  <ul className="divide-y divide-outline-variant">
                    {lessons.map((l, j) => (
                      <li key={l.id} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="material-symbols-outlined text-[18px] text-primary">play_circle</span>
                        <span className="text-sm text-on-surface flex-1 truncate">{j + 1}. {l.title}</span>
                        {l.is_preview && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 shrink-0">Xem trước</span>}
                        <span className="text-xs text-on-surface-variant shrink-0">{l.duration_label || '—'}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
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

              {/* Per-lesson drop-off (Batch 41) */}
              <div className="bg-white rounded-xl border border-outline-variant p-4">
                <p className="text-sm font-bold text-on-surface mb-1">Tỷ lệ hoàn thành theo bài học</p>
                <p className="text-xs text-on-surface-variant mb-3">{analytics ? `Trên ${fmtInt(analytics.total_enrolled)} học viên đang học` : ''}</p>
                {analytics === null ? (
                  <div className="flex justify-center py-6 text-on-surface-variant"><span className="material-symbols-outlined animate-spin">progress_activity</span></div>
                ) : analytics.lessons.length === 0 ? (
                  <p className="text-xs text-on-surface-variant text-center py-4">Chưa có bài học nào để phân tích.</p>
                ) : (
                  <div className="space-y-3">
                    {analytics.lessons.map((l, i) => (
                      <div key={l.lesson_id}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-on-surface font-medium truncate flex-1">{i + 1}. {l.title}</span>
                          <span className="text-on-surface-variant shrink-0 ml-2">{l.completion_pct}% · TB {fmtWatched(l.avg_watched_seconds)}</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${l.completion_pct >= 70 ? 'bg-emerald-400' : l.completion_pct >= 30 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${l.completion_pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          {tab === 'reviews' && (
            <div className="space-y-3">
              {contentError ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{contentError}</div>
              ) : reviews === null ? (
                <div className="flex justify-center py-10 text-on-surface-variant"><span className="material-symbols-outlined animate-spin">progress_activity</span></div>
              ) : reviews.length === 0 ? (
                <div className="text-center py-12 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[48px] text-gray-300">reviews</span>
                  <p className="text-sm mt-2">Khóa học chưa có đánh giá nào.</p>
                </div>
              ) : reviews.map((r, i) => (
                <div key={r.id} className="bg-white rounded-xl border border-outline-variant p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center text-white text-xs font-bold`}>{initialsOf(r.reviewer_name)}</div>
                      <div>
                        <p className="text-sm font-semibold text-on-surface">{r.reviewer_name}</p>
                        <p className="text-[11px] text-on-surface-variant">{fmtDMY(r.created_at)}</p>
                      </div>
                    </div>
                    <span className="text-amber-500 text-sm font-bold">{'★'.repeat(r.rating)}<span className="text-gray-300">{'★'.repeat(5 - r.rating)}</span></span>
                  </div>
                  <p className="text-sm text-on-surface-variant leading-relaxed">{r.comment}</p>
                </div>
              ))}
            </div>
          )}
          {tab === 'coupons' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-outline-variant p-4 space-y-2.5">
                <p className="text-sm font-bold text-on-surface">Tạo mã giảm giá cho khóa học này</p>
                {couponError && <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">{couponError}</div>}
                <div className="flex gap-2">
                  <input value={couponForm.code} onChange={e => setCouponForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="MÃ CODE"
                    className="flex-1 px-2.5 py-1.5 border border-outline-variant rounded-lg text-sm focus:outline-none focus:border-primary" />
                  <select value={couponForm.discount_type} onChange={e => setCouponForm(f => ({ ...f, discount_type: e.target.value }))}
                    className="px-2.5 py-1.5 border border-outline-variant rounded-lg text-sm focus:outline-none">
                    <option value="percent">%</option>
                    <option value="fixed">đ</option>
                  </select>
                  <input type="number" min="0" value={couponForm.discount_value} onChange={e => setCouponForm(f => ({ ...f, discount_value: e.target.value }))} placeholder="Giá trị"
                    className="w-24 px-2.5 py-1.5 border border-outline-variant rounded-lg text-sm focus:outline-none focus:border-primary" />
                </div>
                {couponForm.discount_type === 'percent' && (
                  <input type="number" min="0" value={couponForm.max_discount} onChange={e => setCouponForm(f => ({ ...f, max_discount: e.target.value }))} placeholder="Giảm tối đa (đ, không bắt buộc)"
                    className="w-full px-2.5 py-1.5 border border-outline-variant rounded-lg text-sm focus:outline-none focus:border-primary" />
                )}
                <button onClick={submitCoupon} disabled={couponSaving} className="w-full py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary/90 disabled:opacity-50">
                  {couponSaving ? 'Đang tạo...' : 'Tạo mã'}
                </button>
              </div>

              {coupons === null ? (
                <div className="flex justify-center py-6 text-on-surface-variant"><span className="material-symbols-outlined animate-spin">progress_activity</span></div>
              ) : coupons.length === 0 ? (
                <div className="text-center py-8 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[40px] text-gray-300">sell</span>
                  <p className="text-sm mt-2">Chưa có mã giảm giá riêng cho khóa học này.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {coupons.map(c => (
                    <div key={c.id} className="bg-white rounded-xl border border-outline-variant p-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-on-surface">{c.code}</span>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${c.active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{c.active ? 'Đang bật' : 'Đã tắt'}</span>
                        </div>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                          Giảm {c.discount_type === 'percent' ? `${c.discount_value}%` : fmtVND(c.discount_value)}
                          {c.max_discount ? ` (tối đa ${fmtVND(c.max_discount)})` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => toggleCouponActive(c)} className="text-xs font-semibold px-2 py-1 rounded-lg text-on-surface-variant hover:bg-gray-100">
                          {c.active ? 'Tắt' : 'Bật'}
                        </button>
                        <button onClick={() => deleteCoupon(c)} className="p-1.5 text-red-500 hover:text-red-700"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {tab === 'audit' && (
            <div className="space-y-2">
              {auditLog === null ? (
                <div className="flex justify-center py-10 text-on-surface-variant"><span className="material-symbols-outlined animate-spin">progress_activity</span></div>
              ) : auditLog.length === 0 ? (
                <div className="text-center py-12 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[48px] text-gray-300">history_edu</span>
                  <p className="text-sm mt-2">Chưa có hành động nào được ghi nhận.</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-outline-variant divide-y divide-outline-variant">
                  {auditLog.map(l => (
                    <div key={l.id} className="px-4 py-2.5 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-on-surface">{l.action}</span>
                        <span className="text-xs text-on-surface-variant whitespace-nowrap">{fmtDMY(l.created_at)}</span>
                      </div>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        {l.admin_name || 'Admin'}
                        {l.previous_status && l.new_status ? ` · ${l.previous_status} → ${l.new_status}` : ''}
                        {l.reason ? ` · ${l.reason}` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}

const COURSE_STATUS_OPTIONS = [
  ['draft', 'Bản nháp'], ['pending_review', 'Chờ duyệt'], ['published', 'Hoạt động'],
  ['rejected', 'Bị báo cáo'], ['archived', 'Đã lưu trữ'],
]

// Admin creates courses on a tutor's behalf, so the form needs a tutor picker.
// Reuses the existing public /api/tutors search (already backs the student-
// facing "Find Tutors" page) instead of adding a new endpoint.
function CourseCreateModal({ token, onClose, onCreated, onError }) {
  const [title, setTitle]         = useState('')
  const [desc, setDesc]           = useState('')
  const [subject, setSubject]     = useState('')
  const [price, setPrice]         = useState('0')
  const [tutorQuery, setTutorQuery] = useState('')
  const [tutorOptions, setTutorOptions] = useState([])
  const [tutor, setTutor]         = useState(null)
  const [saving, setSaving]       = useState(false)

  useEffect(() => {
    if (!tutorQuery.trim()) { setTutorOptions([]); return }
    const t = setTimeout(() => {
      fetch(`${API}/api/tutors?search=${encodeURIComponent(tutorQuery)}&limit=8`)
        .then(r => r.ok ? r.json() : Promise.reject(r.status))
        .then(d => setTutorOptions(d.tutors || []))
        .catch(() => setTutorOptions([]))
    }, 300)
    return () => clearTimeout(t)
  }, [tutorQuery])

  const create = async () => {
    if (!title.trim()) { onError('Tên khóa học không được để trống.'); return }
    if (!tutor) { onError('Vui lòng chọn gia sư phụ trách.'); return }
    const p = Number(price)
    if (!Number.isFinite(p) || p < 0) { onError('Giá không hợp lệ.'); return }
    setSaving(true)
    try {
      await authFetch(`${API}/api/admin/courses`, token, {
        method: 'POST',
        body: JSON.stringify({ title: title.trim(), description: desc, subject: subject.trim(), price: p, tutor_id: tutor.id }),
      })
      onCreated()
    } catch (err) {
      onError(`Tạo khóa học thất bại: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div className="w-full max-w-lg p-7 rounded-2xl shadow-2xl bg-white max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xl font-bold text-on-surface">Tạo khóa học mới</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-gray-100"><span className="material-symbols-outlined">close</span></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-on-surface-variant uppercase mb-1 block">Gia sư phụ trách</label>
            {tutor ? (
              <div className="flex items-center justify-between px-3 py-2 border border-primary/30 bg-primary/5 rounded-lg text-sm">
                <span className="font-semibold text-on-surface">{tutor.full_name}</span>
                <button onClick={() => { setTutor(null); setTutorQuery('') }} className="text-on-surface-variant hover:text-on-surface"><span className="material-symbols-outlined text-[16px]">close</span></button>
              </div>
            ) : (
              <div className="relative">
                <input value={tutorQuery} onChange={e => setTutorQuery(e.target.value)} placeholder="Tìm tên gia sư..."
                  className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm focus:outline-none focus:border-primary" />
                {tutorOptions.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-outline-variant rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {tutorOptions.map(t => (
                      <button key={t.id} onClick={() => { setTutor(t); setTutorOptions([]) }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
                        <span className="font-medium text-on-surface">{t.full_name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold text-on-surface-variant uppercase mb-1 block">Tên khóa học</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="text-xs font-semibold text-on-surface-variant uppercase mb-1 block">Mô tả</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm resize-none focus:outline-none focus:border-primary" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-on-surface-variant uppercase mb-1 block">Môn học</label>
              <input value={subject} onChange={e => setSubject(e.target.value)} className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-xs font-semibold text-on-surface-variant uppercase mb-1 block">Giá (đ)</label>
              <input type="number" min="0" value={price} onChange={e => setPrice(e.target.value)} className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm focus:outline-none focus:border-primary" />
            </div>
          </div>
          <p className="text-xs text-on-surface-variant">Khóa học mới luôn bắt đầu ở trạng thái <b>Bản nháp</b> — dùng "Chỉnh sửa" sau khi tạo để đổi trạng thái.</p>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={create} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-primary hover:opacity-90 disabled:opacity-50 transition-opacity">
            {saving ? 'Đang tạo...' : 'Tạo khóa học'}
          </button>
          <button onClick={onClose} className="flex-1 py-2.5 bg-gray-100 text-on-surface-variant rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors">Hủy</button>
        </div>
      </div>
    </ModalOverlay>
  )
}

function CourseEditModal({ course, token, onClose, onSaved, onError }) {
  const [title, setTitle]     = useState(course.title || '')
  const [desc, setDesc]       = useState(course.desc || '')
  const [subject, setSubject] = useState(course.subject || '')
  const [price, setPrice]     = useState(String(course.price ?? 0))
  const [status, setStatus]   = useState(course.status_raw || 'draft')
  const [thumbnailUrl, setThumbnailUrl] = useState(course.thumbnail_url || '')
  const [uploading, setUploading]       = useState(false)
  const [saving, setSaving]   = useState(false)

  const pickThumbnail = async e => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    try {
      const uploaded = await uploadCourseThumbnail(file, course.id)
      setThumbnailUrl(uploaded.previewUrl || uploaded.url || '')
    } catch (err) {
      onError(`Tải ảnh thất bại: ${err.message}`)
    } finally {
      setUploading(false)
    }
  }

  const save = async () => {
    if (!title.trim()) { onError('Tên khóa học không được để trống.'); return }
    const p = Number(price)
    if (!Number.isFinite(p) || p < 0) { onError('Giá không hợp lệ.'); return }
    setSaving(true)
    try {
      await authFetch(`${API}/api/admin/courses/${course.id}`, token, {
        method: 'PATCH',
        body: JSON.stringify({ title: title.trim(), description: desc, subject: subject.trim(), price: p, status, thumbnail_url: thumbnailUrl }),
      })
      onSaved()
    } catch (err) {
      onError(`Lưu thất bại: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div className="w-full max-w-lg p-7 rounded-2xl shadow-2xl bg-white max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xl font-bold text-on-surface">Chỉnh sửa khóa học</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-gray-100"><span className="material-symbols-outlined">close</span></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-on-surface-variant uppercase mb-1 block">Ảnh đại diện</label>
            <div className="flex items-center gap-3">
              <div className="w-24 h-16 rounded-lg overflow-hidden bg-gray-100 border border-outline-variant shrink-0 flex items-center justify-center">
                {thumbnailUrl ? <img src={thumbnailUrl} alt="" className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-gray-300">image</span>}
              </div>
              <label className="px-3 py-2 rounded-lg border border-outline-variant text-sm font-semibold text-on-surface-variant hover:bg-gray-50 cursor-pointer">
                {uploading ? 'Đang tải...' : 'Chọn ảnh'}
                <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={pickThumbnail} disabled={uploading} className="hidden" />
              </label>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-on-surface-variant uppercase mb-1 block">Tên khóa học</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="text-xs font-semibold text-on-surface-variant uppercase mb-1 block">Mô tả</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm resize-none focus:outline-none focus:border-primary" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-on-surface-variant uppercase mb-1 block">Môn học</label>
              <input value={subject} onChange={e => setSubject(e.target.value)} className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-xs font-semibold text-on-surface-variant uppercase mb-1 block">Giá (đ)</label>
              <input type="number" min="0" value={price} onChange={e => setPrice(e.target.value)} className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm focus:outline-none focus:border-primary" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-on-surface-variant uppercase mb-1 block">Trạng thái</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm focus:outline-none focus:border-primary">
              {COURSE_STATUS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={save} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-primary hover:opacity-90 disabled:opacity-50 transition-opacity">
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
          <button onClick={onClose} className="flex-1 py-2.5 bg-gray-100 text-on-surface-variant rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors">Hủy</button>
        </div>
      </div>
    </ModalOverlay>
  )
}

function CourseStudentsModal({ course, token, onClose }) {
  const [students, setStudents] = useState(null)
  const [error, setError]       = useState(null)

  useEffect(() => {
    if (!token) return
    authFetch(`${API}/api/admin/courses/${course.id}/students`, token)
      .then(data => setStudents(data.students || []))
      .catch(err => setError(err.message))
  }, [course.id, token])

  return (
    <ModalOverlay onClose={onClose}>
      <div className="w-full max-w-lg p-7 rounded-2xl shadow-2xl bg-white max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xl font-bold text-on-surface">Học viên đã đăng ký</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-gray-100"><span className="material-symbols-outlined">close</span></button>
        </div>
        <p className="text-sm text-on-surface-variant mb-5 truncate">{course.title}</p>
        {error ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
        ) : students === null ? (
          <div className="flex justify-center py-10 text-on-surface-variant"><span className="material-symbols-outlined animate-spin">progress_activity</span></div>
        ) : students.length === 0 ? (
          <div className="text-center py-10 text-on-surface-variant">
            <span className="material-symbols-outlined text-[40px] text-gray-300">group_off</span>
            <p className="text-sm mt-2">Chưa có học viên nào đăng ký khóa học này.</p>
          </div>
        ) : (
          <div className="divide-y divide-outline-variant">
            {students.map(s => (
              <div key={s.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-on-surface truncate">{s.name}{s.child_name ? ` (${s.child_name})` : ''}</p>
                  <p className="text-xs text-on-surface-variant truncate">{s.email || '—'}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.status === 'active' ? 'bg-emerald-50 text-emerald-700' : s.status === 'refunded' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                    {s.status === 'active' ? 'Đang học' : s.status === 'refunded' ? 'Đã hoàn tiền' : 'Đã hủy'}
                  </span>
                  <p className="text-[11px] text-on-surface-variant mt-1">{fmtDMY(s.purchased_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ModalOverlay>
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
  const [editModal, setEditModal]     = useState(null)   // course being edited, or null
  const [studentsModal, setStudentsModal] = useState(null) // course whose students are shown, or null
  const [createModal, setCreateModal] = useState(false)
  const [stats, setStats]             = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    authFetch(`${API}/api/admin/courses`, token)
      .then(data => { setCourses(data.courses || []); setStats(data.stats || null); setLoading(false) })
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

  // ── Mutations ──
  // Archive/Hide are reversible status changes on the courses table (same
  // vocabulary the tutor-facing endpoints already use), so they run immediately.
  // Delete is guarded server-side (refused if the course has enrollments), so
  // it always goes through the confirm modal first.
  const patchCourseStatus = async (ids, status, successMsg) => {
    try {
      await Promise.all(ids.map(id => authFetch(`${API}/api/admin/courses/${id}`, token, {
        method: 'PATCH', body: JSON.stringify({ status }),
      })))
      showToast(successMsg)
      clearSelection()
      setTick(t => t + 1)
    } catch (err) {
      showToast(`Thất bại: ${err.message}`, 'error')
    }
  }
  const doArchive = ids => patchCourseStatus(ids, 'archived', `Đã lưu trữ ${ids.length} khóa học.`)
  const doHide    = ids => patchCourseStatus(ids, 'draft', `Đã ẩn ${ids.length} khóa học khỏi marketplace.`)
  const doDelete  = ids => setConfirm({
    title: 'Xóa khóa học',
    message: `Xóa vĩnh viễn ${ids.length} khóa học đã chọn? Chỉ xóa được khóa học chưa có học viên đăng ký — nếu đã có học viên, hệ thống sẽ từ chối và bạn nên dùng "Lưu trữ" thay thế.`,
    danger: true,
    confirmLabel: 'Xóa',
    onConfirm: async () => {
      const results = await Promise.allSettled(ids.map(id => authFetch(`${API}/api/admin/courses/${id}`, token, { method: 'DELETE' })))
      const failed = results.filter(r => r.status === 'rejected')
      if (failed.length) showToast(failed[0].reason?.message || 'Một số khóa học không thể xóa.', 'error')
      else showToast(`Đã xóa ${ids.length} khóa học.`)
      clearSelection()
      setTick(t => t + 1)
    },
  })

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

  // Real aggregates from the API (stats block on GET /api/admin/courses).
  // Trend is null (no badge shown) whenever there's no prior-period baseline
  // to compare against — see server.js pctChange(), never a fabricated %.
  const trendBadge = pct => pct == null ? null : { trend: `${pct >= 0 ? '+' : ''}${pct}%`, up: pct >= 0 }
  const STATS = stats ? [
    { label: 'Tổng khóa học',   value: fmtInt(stats.total_courses),      icon: 'school',       iconBg: 'bg-blue-50',    iconColor: 'text-blue-700',    ...trendBadge(stats.courses_trend) },
    { label: 'Đang hoạt động',  value: fmtInt(stats.active_courses),     icon: 'check_circle', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-700', ...trendBadge(stats.active_trend) },
    { label: 'Tổng học viên',   value: fmtInt(stats.total_students),     icon: 'group',         iconBg: 'bg-amber-50',   iconColor: 'text-amber-700',   ...trendBadge(stats.students_trend) },
    { label: 'Doanh thu',       value: fmtCompactVND(stats.total_revenue), icon: 'payments',    iconBg: 'bg-violet-50', iconColor: 'text-violet-700',  ...trendBadge(stats.revenue_trend) },
  ] : []

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
          <button onClick={() => setCreateModal(true)} className="px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-sm">
            <span className="material-symbols-outlined text-[18px]">add</span> Tạo khóa học
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        {(stats ? STATS : Array.from({ length: 4 })).map((s, i) => (
          <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-outline-variant hover:shadow-md transition-shadow">
            {s ? (
              <>
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-10 h-10 rounded-lg ${s.iconBg} flex items-center justify-center ${s.iconColor}`}>
                    <span className="material-symbols-outlined">{s.icon}</span>
                  </div>
                  {s.trend && (
                    <span className={`flex items-center text-xs font-semibold ${s.up ? 'text-emerald-600' : 'text-red-500'}`}>
                      <span className="material-symbols-outlined text-[15px]">{s.up ? 'trending_up' : 'trending_down'}</span>{s.trend}
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">{s.label}</p>
                <h4 className="text-2xl font-bold text-on-background">{s.value}</h4>
              </>
            ) : (
              <div className="h-16 shimmer rounded-lg" />
            )}
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
                          <button onClick={() => setEditModal(c)} title="Chỉnh sửa" className="p-1.5 rounded-lg text-on-surface-variant hover:bg-amber-50 hover:text-amber-600 transition-colors"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                          <button onClick={() => { openDrawer(c); setDrawerTab('stats') }} title="Thống kê" className="p-1.5 rounded-lg text-on-surface-variant hover:bg-violet-50 hover:text-violet-600 transition-colors"><span className="material-symbols-outlined text-[18px]">bar_chart</span></button>
                          <button onClick={() => setStudentsModal(c)} title="Học viên" className="p-1.5 rounded-lg text-on-surface-variant hover:bg-emerald-50 hover:text-emerald-600 transition-colors"><span className="material-symbols-outlined text-[18px]">group</span></button>
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
      <CourseDrawer course={drawer} show={drawerShow} tab={drawerTab} onTab={setDrawerTab} onClose={closeDrawer} token={token} onChanged={() => setTick(t => t + 1)} />

      {/* Create modal */}
      {createModal && (
        <CourseCreateModal
          token={token}
          onClose={() => setCreateModal(false)}
          onCreated={() => { setCreateModal(false); showToast('Đã tạo khóa học mới (bản nháp).'); setTick(t => t + 1) }}
          onError={msg => showToast(msg, 'error')}
        />
      )}

      {/* Edit modal */}
      {editModal && (
        <CourseEditModal
          course={editModal}
          token={token}
          onClose={() => setEditModal(null)}
          onSaved={() => { setEditModal(null); showToast('Đã lưu thay đổi khóa học.'); setTick(t => t + 1) }}
          onError={msg => showToast(msg, 'error')}
        />
      )}

      {/* Students modal */}
      {studentsModal && (
        <CourseStudentsModal course={studentsModal} token={studentsModal ? token : null} onClose={() => setStudentsModal(null)} />
      )}

      {/* Row context menu */}
      {menu && (() => {
        const c = courses.find(x => x.id === menu.id)
        if (!c) return null
        const items = [
          { label: 'Xem chi tiết', icon: 'visibility', color: 'text-primary', show: true, fn: () => openDrawer(c) },
          { label: 'Chỉnh sửa', icon: 'edit', color: 'text-amber-600', show: true, fn: () => setEditModal(c) },
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
      const res = await fetch(`${API}/api/admin/transactions`, {
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
  const API_BASE = API
  const [disputes, setDisputes] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [resolveModal, setResolveModal] = useState(null)
  const [adminNote, setAdminNote] = useState('')
  const [penaltyType, setPenaltyType] = useState('NONE')
  const [refundRate, setRefundRate] = useState(1)
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
        body: JSON.stringify({ disputeId: resolveModal.id, decision, adminNote, penaltyType,
          ...(decision === 'REFUND_TO_STUDENT' ? { refundRate } : {}) })
      })
      const data = await res.json()
      if (data.success) {
        alert('Đã xử lý: ' + (decision === 'REFUND_TO_STUDENT' ? 'Hoàn tiền cho học sinh' : 'Giải ngân cho gia sư'))
        setResolveModal(null); setAdminNote(''); setPenaltyType('NONE'); setRefundRate(1); fetchDisputes()
      } else { alert(data.message || 'Có lỗi xảy ra.') }
    } catch { alert('Lỗi kết nối.') }
    setResolving(false)
  }

  const fmtMoney = (n) => Number(n || 0).toLocaleString('vi-VN') + 'đ'
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—'
  const statusLabel = { 'OPEN': 'Đang mở', 'RESOLVED_REFUND': 'Hoàn tiền', 'RESOLVED_RELEASE': 'Giải ngân', 'WITHDRAWN': 'Đã rút' }
  const statusColor = {
    'OPEN': 'bg-red-50 text-red-700 border border-red-200',
    'RESOLVED_REFUND': 'bg-green-50 text-green-700 border border-green-200',
    'RESOLVED_RELEASE': 'bg-blue-50 text-blue-700 border border-blue-200',
    'WITHDRAWN': 'bg-gray-100 text-gray-600 border border-gray-300'
  }
  // status='OPEN' vẫn giữ nguyên khi rút (không đổi ENUM) — "đang mở thật sự" phải kiểm tra thêm !withdrawn_at.
  const isReallyOpen = (d) => d.status === 'OPEN' && !d.withdrawn_at
  const effectiveStatus = (d) => d.withdrawn_at ? 'WITHDRAWN' : d.status
  const filtered = statusFilter === 'all' ? disputes
    : statusFilter === 'open' ? disputes.filter(isReallyOpen)
    : disputes.filter(d => !isReallyOpen(d))
  const openCount = disputes.filter(isReallyOpen).length
  const resolvedCount = disputes.filter(d => !isReallyOpen(d)).length

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
                <tr key={d.id} className={`hover:bg-gray-50 transition-colors ${isReallyOpen(d)?'bg-red-50/30':''}`}>
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
                    <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${statusColor[effectiveStatus(d)]||'bg-gray-100 text-gray-600'}`}>{statusLabel[effectiveStatus(d)]||d.status}</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => window.dispatchEvent(new CustomEvent('admin-copilot:analyze', { detail: { entityType: 'DISPUTE', entityId: d.id } }))}
                        title="Phân tích bằng AI Copilot"
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-blue-200 text-blue-600 hover:bg-blue-50 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">smart_toy</span>AI
                      </button>
                      {isReallyOpen(d) ? (
                        <button onClick={() => { setResolveModal(d); setAdminNote(''); setRefundRate(1) }}
                          className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold hover:opacity-90 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">gavel</span>Phán quyết
                        </button>
                      ) : <span className="text-xs text-on-surface-variant italic">{d.withdrawn_at ? 'Đã rút' : 'Đã xử lý'}</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {resolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b shrink-0">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">gavel</span>Phán quyết khiếu nại
              </h3>
              <button onClick={() => setResolveModal(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto">
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
                {resolveModal.withdrawn_at && (
                  <div className="pt-2 border-t border-gray-200">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold text-orange-700 bg-orange-100">
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>undo</span>
                      Học sinh đã rút khiếu nại này
                    </span>
                    <p className="text-xs text-on-surface-variant mt-1">Rút lúc: {fmtDate(resolveModal.withdrawn_at)}</p>
                  </div>
                )}
                <div className="pt-2 border-t border-gray-200">
                  <span className="text-on-surface-variant">Bằng chứng:</span>
                  {Array.isArray(resolveModal.evidence_urls) && resolveModal.evidence_urls.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {resolveModal.evidence_urls.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          Xem đính kèm #{i + 1}
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-on-surface-variant italic mt-1">Không có bằng chứng đính kèm</p>
                  )}
                </div>
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
              <div>
                <label className="block text-sm font-semibold text-on-surface-variant mb-1">Tỷ lệ hoàn tiền (chỉ áp dụng khi Hoàn tiền)</label>
                <select value={refundRate} onChange={e => setRefundRate(Number(e.target.value))}
                  className="w-full p-3 rounded-xl border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary text-sm outline-none">
                  <option value={1}>Hoàn 100% (mặc định)</option>
                  <option value={0.7}>Hoàn 70%</option>
                  <option value={0.5}>Hoàn 50%</option>
                  <option value={0.25}>Hoàn 25%</option>
                  <option value={0}>Không hoàn (0%) — giải ngân cho gia sư</option>
                </select>
                <p className="text-xs text-on-surface-variant mt-1">
                  Phần không hoàn được chia cho gia sư (90%) và nền tảng (10%). Theo {`REFUND_POLICY_V2_1`}.
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-sm">
                <span className="text-on-surface-variant">Mong muốn của học sinh:</span>
                {resolveModal.student_requested_resolution ? (
                  <p className="text-on-surface mt-1 italic">"{resolveModal.student_requested_resolution}"</p>
                ) : (
                  <p className="text-on-surface-variant italic mt-1">Học sinh không nêu yêu cầu cụ thể</p>
                )}
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-sm">
                <span className="text-on-surface-variant">Giải trình của gia sư:</span>
                {resolveModal.tutor_response ? (
                  <>
                    <p className="text-on-surface mt-1 italic">"{resolveModal.tutor_response}"</p>
                    {resolveModal.tutor_response_at && (
                      <p className="text-xs text-on-surface-variant mt-1">Phản hồi lúc: {fmtDate(resolveModal.tutor_response_at)}</p>
                    )}
                  </>
                ) : (
                  <p className="text-on-surface-variant italic mt-1">Gia sư chưa phản hồi</p>
                )}
              </div>
            </div>
            <div className="p-5 pt-4 border-t shrink-0 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => handleResolve('REFUND_TO_STUDENT')} disabled={resolving || !!resolveModal.withdrawn_at}
                  className="p-4 rounded-xl bg-red-50 border-2 border-red-300 hover:border-red-500 hover:bg-red-100 transition-all disabled:opacity-50 text-left relative overflow-hidden group">
                  <span className="material-symbols-outlined text-red-600 text-[22px] block mb-2">undo</span>
                  <p className="font-bold text-red-800 text-sm">Chấp nhận khiếu nại (Hoàn tiền)</p>
                  <p className="text-xs text-red-600 mt-1">Hoàn lại tiền cho học sinh và áp dụng hình thức xử phạt với gia sư.</p>
                  <p className="text-xs font-bold text-red-700 mt-2">→ {fmtMoney(Math.round(Number(resolveModal.lesson_fee || 0) * refundRate))} ({Math.round(refundRate * 100)}%)</p>
                  <div className="absolute inset-0 bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </button>
                <button onClick={() => handleResolve('RELEASE_TO_TUTOR')} disabled={resolving || !!resolveModal.withdrawn_at}
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

// ─── Settings View ────────────────────────────────────────────────────────────
function SettingsView() {
  // Read-only: no settings store exists in the DB, so values are display-only
  // defaults and cannot be persisted. No mutation is performed here.
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

  return (
    <div className="p-10 max-w-[900px] mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-on-background">Cài đặt</h2>
        <p className="text-sm text-on-surface-variant mt-1">Cấu hình cài đặt và chính sách toàn nền tảng.</p>
      </div>

      <div className="mb-6 bg-sky-50 border border-sky-200 rounded-xl p-4 flex items-start gap-3">
        <span className="material-symbols-outlined text-sky-600 mt-0.5">visibility</span>
        <div>
          <p className="text-sm font-semibold text-sky-800">Chế độ chỉ xem</p>
          <p className="text-sm text-sky-700">Các giá trị dưới đây là mặc định hiển thị và chưa được kết nối với kho lưu trữ cấu hình thực — không thể chỉnh sửa hoặc lưu tại đây.</p>
        </div>
      </div>

      <fieldset disabled className="space-y-6 border-0 p-0 m-0 min-w-0">
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
      </fieldset>

      <style>{`.settings-input { width: 100%; padding: 8px 12px; border: 1px solid #c4c5d5; border-radius: 8px; font-size: 14px; background: #f9fafb; outline: none; transition: border-color .2s; } .settings-input:focus { border-color: #00288e; box-shadow: 0 0 0 2px rgba(0,40,142,.1); } fieldset[disabled] .settings-input { background: #f3f4f6; color: #6b7280; cursor: not-allowed; }`}</style>
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
