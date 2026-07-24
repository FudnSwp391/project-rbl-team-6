import { useState, useEffect } from 'react'
import { KpiCard, SkeletonCard, PageHeader, SectionCard } from './components'
import { fmtDateTime } from './mockData'

import { API_BASE_URL as API } from '../../config'

const fmtCompact = n => {
  if (!n) return 'đ0'
  const v = Math.abs(n)
  if (v >= 1e9) return 'đ' + (n / 1e9).toFixed(1).replace(/\.0$/, '') + ' tỷ'
  if (v >= 1e6) return 'đ' + Math.round(n / 1e6) + ' triệu'
  if (v >= 1e3) return 'đ' + Math.round(n / 1e3) + 'K'
  return 'đ' + n.toLocaleString('vi-VN')
}

function RecentActivityRow({ log }) {
  const iconMap = {
    APPROVE_WITHDRAWAL: { icon: 'check_circle', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    REJECT_WITHDRAWAL:  { icon: 'cancel',       color: 'text-red-600',     bg: 'bg-red-50' },
    RESOLVE_DISPUTE:    { icon: 'gavel',         color: 'text-blue-600',   bg: 'bg-blue-50' },
    RELEASE_ESCROW:     { icon: 'payments',      color: 'text-green-600',  bg: 'bg-green-50' },
    UPDATE_COMMISSION:  { icon: 'percent',       color: 'text-purple-600', bg: 'bg-purple-50' },
    FRAUD_DETECTION:    { icon: 'warning',       color: 'text-orange-600', bg: 'bg-orange-50' },
    APPROVE_REFUND:     { icon: 'undo',          color: 'text-sky-600',    bg: 'bg-sky-50' },
    REJECT_REFUND:      { icon: 'block',         color: 'text-red-600',    bg: 'bg-red-50' },
    PAYMENT_FAILED:     { icon: 'error',         color: 'text-red-600',    bg: 'bg-red-50' },
    VIEW_WITHDRAWAL:    { icon: 'visibility',    color: 'text-gray-600',   bg: 'bg-gray-50' },
  }
  const cfg = iconMap[log.action] || { icon: 'history', color: 'text-gray-600', bg: 'bg-gray-50' }
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
      <div className={`w-8 h-8 rounded-full ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
        <span className={`material-symbols-outlined text-[16px] ${cfg.color}`}>{cfg.icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800">{(log.action || '').replace(/_/g, ' ')}</p>
        <p className="text-xs text-gray-400 truncate">{log.actor_name || log.target}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-xs text-gray-400">{fmtDateTime(log.created_at)}</p>
        <span className={`text-xs font-semibold ${log.result === 'SUCCESS' ? 'text-emerald-600' : log.result === 'FAILED' ? 'text-red-500' : 'text-orange-500'}`}>
          {log.result}
        </span>
      </div>
    </div>
  )
}

export default function FinancialOverview({ onNavigate, token }) {
  const [overview, setOverview] = useState(null)
  const [series,   setSeries]   = useState([])
  const [auditLogs,   setAuditLogs]   = useState([])
  const [fraudAlerts, setFraudAlerts] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    setError(null)
    const authGet = url => fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    Promise.all([
      authGet(`${API}/api/admin/financial/overview`),
      authGet(`${API}/api/admin/financial/revenue-series?range=6m`),
      authGet(`${API}/api/admin/audit-logs`),
      authGet(`${API}/api/admin/fraud-alerts`),
    ])
      .then(([r1, r2, r3, r4]) => {
        if (!r1.ok) throw new Error(`overview HTTP ${r1.status}`)
        if (!r2.ok) throw new Error(`revenue-series HTTP ${r2.status}`)
        // audit-logs & fraud-alerts are secondary — tolerate their failure
        return Promise.all([
          r1.json(),
          r2.json(),
          r3.ok ? r3.json() : { logs: [] },
          r4.ok ? r4.json() : { alerts: [] },
        ])
      })
      .then(([ov, rev, audit, fraud]) => {
        setOverview(ov)
        setSeries(rev.series || [])
        setAuditLogs(audit.logs || [])
        setFraudAlerts(fraud.alerts || [])
        setLoading(false)
      })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [token])

  const ov = overview || {}
  const maxRev = series.length ? Math.max(...series.map(m => m.revenue), 1) : 1

  // Month-over-month growth from last two series items
  const momPrev = series.length >= 2 ? series[series.length - 2].revenue : 0
  const momCur  = series.length >= 1 ? series[series.length - 1].revenue : 0
  const momGrowth = momPrev > 0 ? (((momCur / momPrev) - 1) * 100).toFixed(1) : null

  const kpis = [
    { icon: 'payments',       label: 'Doanh Thu Tháng',  value: fmtCompact(ov.monthly_revenue || 0),              change: null, color: 'green',  nav: 'tx-platform-revenue', subtitle: 'vs. tháng trước' },
    { icon: 'lock',           label: 'Số Dư Escrow',     value: fmtCompact(ov.escrow_held || 0),                  change: null, color: 'sky',    nav: 'tx-system-wallet',    subtitle: 'Đang giữ trung gian' },
    { icon: 'send_money',     label: 'Chờ Giải Ngân',    value: `${ov.pending_payouts || 0} yêu cầu`,             change: null, color: 'amber',  nav: 'tx-withdrawals',      subtitle: 'Gia sư chờ rút tiền' },
    { icon: 'undo',           label: 'Hoàn Tiền Tháng',  value: fmtCompact(ov.total_refunds || 0),                change: null, color: 'blue',   nav: 'tx-refunds',          subtitle: 'vs. tháng trước' },
    { icon: 'percent',        label: 'Phí Nền Tảng',     value: fmtCompact(ov.platform_fees || 0),                change: null, color: 'purple', nav: 'tx-commissions',      subtitle: 'Hoa hồng đã thu' },
    { icon: 'gavel',          label: 'Tranh Chấp Mở',    value: `${ov.open_disputes ?? '—'} vụ`,                  change: null, color: 'red',    nav: 'tx-disputes',         subtitle: 'Cần xử lý' },
    { icon: 'account_balance',label: 'Rút Tiền Chờ',     value: `${ov.pending_withdrawals || 0} yêu cầu`,         change: null, color: 'orange', nav: 'tx-withdrawals',      subtitle: 'Đang xem xét' },
    { icon: 'warning',        label: 'Fraud Alerts',     value: `${fraudAlerts.length} cảnh báo`,                 change: null, color: 'red',    nav: 'tx-fraud',            subtitle: 'Cần kiểm tra' },
  ]

  const quickStats = [
    { label: 'Tổng thanh toán học sinh', value: fmtCompact(ov.total_payments || 0),       color: 'bg-blue-500' },
    { label: 'Đang giữ Escrow',          value: fmtCompact(ov.escrow_held || 0),           color: 'bg-amber-500' },
    { label: 'Đã giải ngân gia sư',      value: fmtCompact(ov.released_to_tutors || 0),   color: 'bg-emerald-500' },
    { label: 'Phí nền tảng thu được',    value: fmtCompact(ov.platform_fees || 0),        color: 'bg-purple-500' },
    { label: 'Tổng đã hoàn tiền',        value: fmtCompact(ov.total_refunds || 0),        color: 'bg-red-400' },
  ]

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <PageHeader title="Tổng Quan Tài Chính" subtitle="Tổng quan tài chính toàn hệ thống EduX Marketplace">      </PageHeader>

      {error && (
        <div className="mb-6 flex items-center gap-3 px-5 py-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
          <span className="material-symbols-outlined text-[20px]">error</span>
          {error}
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {loading
          ? Array(8).fill(0).map((_, i) => <SkeletonCard key={i} />)
          : kpis.map(k => (
            <KpiCard
              key={k.label}
              icon={k.icon}
              label={k.label}
              value={k.value}
              change={k.change}
              color={k.color}
              subtitle={k.subtitle}
              onClick={() => onNavigate(k.nav)}
            />
          ))
        }
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* Revenue Bar Chart */}
        <div className="col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-gray-900">Doanh Thu 6 Tháng Gần Nhất</h3>
              <p className="text-xs text-gray-400 mt-0.5">Tổng thanh toán thực nhận từ học sinh</p>
            </div>
            {!loading && momGrowth !== null && (
              <span className={`text-xs px-3 py-1 rounded-full font-semibold ${Number(momGrowth) >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                {Number(momGrowth) >= 0 ? '+' : ''}{momGrowth}% MoM
              </span>
            )}
          </div>
          {loading ? (
            <div className="h-48 bg-gray-50 rounded-lg animate-pulse" />
          ) : series.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm text-gray-400">Chưa có dữ liệu doanh thu.</div>
          ) : (
            <div className="flex items-end gap-2 h-48">
              {series.map(m => {
                const pctRev = maxRev > 0 ? (m.revenue / maxRev) * 100 : 0
                const pctRef = maxRev > 0 ? (m.refunds / maxRev) * 100 : 0
                return (
                  <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex flex-col-reverse" style={{ height: '160px' }}>
                      <div className="w-full bg-red-200 rounded-b" style={{ height: `${pctRef}%` }} title={`Hoàn tiền: ${fmtCompact(m.refunds)}`} />
                      <div className="w-full bg-blue-600 rounded-t hover:bg-blue-700 transition-colors cursor-pointer" style={{ height: `${Math.max(0, pctRev - pctRef)}%` }} title={`Doanh thu: ${fmtCompact(m.revenue)}`} />
                    </div>
                    <span className="text-xs text-gray-400 font-medium">{m.label}</span>
                  </div>
                )
              })}
            </div>
          )}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-50">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-blue-600" /><span className="text-xs text-gray-500">Doanh thu</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-red-200" /><span className="text-xs text-gray-500">Hoàn tiền</span></div>
          </div>
        </div>

        {/* Quick Stats — Dòng Tiền Hệ Thống */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-base font-bold text-gray-900 mb-4">Dòng Tiền Hệ Thống</h3>
          {loading
            ? Array(5).fill(0).map((_, i) => <div key={i} className="h-8 bg-gray-100 rounded mb-2 animate-pulse" />)
            : quickStats.map(r => (
              <div key={r.label} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${r.color}`} />
                  <span className="text-xs text-gray-600">{r.label}</span>
                </div>
                <span className="text-sm font-bold text-gray-900">{r.value}</span>
              </div>
            ))
          }
        </div>
      </div>

      {/* Bottom Row — real read-only data from audit-logs & fraud-alerts endpoints */}
      <div className="grid grid-cols-2 gap-6">
        <SectionCard title="Hoạt Động Gần Đây" icon="history">
          <div className="px-6 py-2">
            {loading ? (
              Array(5).fill(0).map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded mb-2 animate-pulse" />)
            ) : auditLogs.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">Chưa có nhật ký hoạt động.</p>
            ) : (
              auditLogs.slice(0, 7).map(log => (
                <RecentActivityRow key={log.id} log={log} />
              ))
            )}
          </div>
          <div className="px-6 py-3 border-t border-gray-50">
            <button onClick={() => onNavigate('audit-logs')} className="text-xs text-blue-600 font-semibold hover:underline">
              Xem tất cả nhật ký →
            </button>
          </div>
        </SectionCard>

        <SectionCard
          title="Fraud Alerts Gần Đây"
          icon="warning"
          action={<button onClick={() => onNavigate('tx-fraud')} className="text-xs text-blue-600 font-semibold hover:underline">Xem tất cả</button>}
        >
          <div className="px-6 py-2">
            {loading ? (
              Array(4).fill(0).map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded mb-2 animate-pulse" />)
            ) : fraudAlerts.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">Không có cảnh báo gian lận.</p>
            ) : (
              fraudAlerts.slice(0, 4).map(a => (
                <div key={a.id} className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${a.severity === 'HIGH' ? 'bg-red-500' : a.severity === 'MEDIUM' ? 'bg-amber-500' : 'bg-green-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{a.user_name || a.user_email || '—'}</p>
                    <p className="text-xs text-gray-400 truncate">{a.description}</p>
                  </div>
                  <span className={`text-xs font-bold flex-shrink-0 ${a.severity === 'HIGH' ? 'text-red-600' : a.severity === 'MEDIUM' ? 'text-amber-600' : 'text-green-600'}`}>
                    {a.severity === 'HIGH' ? '⚠ CAO' : a.severity === 'MEDIUM' ? '~ TRUNG' : '✓ THẤP'}
                  </span>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
