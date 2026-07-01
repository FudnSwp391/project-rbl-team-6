import { useState } from 'react'
import { KpiCard, SkeletonCard, PageHeader, ExportButton, MiniBarChart, SectionCard } from './components'
import { KPI_SUMMARY, REVENUE_BY_MONTH, AUDIT_LOGS, FRAUD_ALERTS, fmtMoney, fmtDateTime } from './mockData'

const MINI_TREND = [1,2,3,4,5,6].map((v,i) => ({ value: REVENUE_BY_MONTH[i]?.net || 0, label: REVENUE_BY_MONTH[i]?.month }))

function RecentActivityRow({ log }) {
  const iconMap = {
    APPROVE_WITHDRAWAL: { icon: 'check_circle', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    REJECT_WITHDRAWAL:  { icon: 'cancel', color: 'text-red-600', bg: 'bg-red-50' },
    RESOLVE_DISPUTE:    { icon: 'gavel', color: 'text-blue-600', bg: 'bg-blue-50' },
    RELEASE_ESCROW:     { icon: 'payments', color: 'text-green-600', bg: 'bg-green-50' },
    UPDATE_COMMISSION:  { icon: 'percent', color: 'text-purple-600', bg: 'bg-purple-50' },
    FRAUD_DETECTION:    { icon: 'warning', color: 'text-orange-600', bg: 'bg-orange-50' },
    APPROVE_REFUND:     { icon: 'undo', color: 'text-sky-600', bg: 'bg-sky-50' },
    REJECT_REFUND:      { icon: 'block', color: 'text-red-600', bg: 'bg-red-50' },
    PAYMENT_FAILED:     { icon: 'error', color: 'text-red-600', bg: 'bg-red-50' },
    VIEW_WITHDRAWAL:    { icon: 'visibility', color: 'text-gray-600', bg: 'bg-gray-50' },
  }
  const cfg = iconMap[log.action] || { icon: 'history', color: 'text-gray-600', bg: 'bg-gray-50' }
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
      <div className={`w-8 h-8 rounded-full ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
        <span className={`material-symbols-outlined text-[16px] ${cfg.color}`}>{cfg.icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800">{log.action.replace(/_/g, ' ')}</p>
        <p className="text-xs text-gray-400 truncate">{log.target}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-xs text-gray-400">{fmtDateTime(log.timestamp)}</p>
        <span className={`text-xs font-semibold ${log.result === 'SUCCESS' ? 'text-emerald-600' : log.result === 'FAILED' ? 'text-red-500' : 'text-orange-500'}`}>
          {log.result}
        </span>
      </div>
    </div>
  )
}

export default function FinancialOverview({ onNavigate }) {
  const [loading] = useState(false)

  const kpis = [
    { icon: 'payments', label: 'Doanh Thu Tháng', value: fmtMoney(KPI_SUMMARY.monthlyRevenue), change: KPI_SUMMARY.monthlyRevenueChange, color: 'green', nav: 'tx-platform-revenue', subtitle: 'vs. tháng trước' },
    { icon: 'lock', label: 'Số Dư Escrow', value: fmtMoney(KPI_SUMMARY.escrowBalance), change: KPI_SUMMARY.escrowChange, color: 'sky', nav: 'tx-system-wallet', subtitle: 'Đang giữ trung gian' },
    { icon: 'send_money', label: 'Chờ Giải Ngân', value: `${KPI_SUMMARY.pendingPayouts} yêu cầu`, change: KPI_SUMMARY.pendingPayoutsChange, color: 'amber', nav: 'tx-withdrawals', subtitle: 'Gia sư chờ rút tiền' },
    { icon: 'undo', label: 'Hoàn Tiền Tháng', value: fmtMoney(KPI_SUMMARY.refundAmount), change: KPI_SUMMARY.refundChange, color: 'blue', nav: 'tx-refunds', subtitle: 'vs. tháng trước' },
    { icon: 'percent', label: 'Phí Nền Tảng', value: fmtMoney(KPI_SUMMARY.platformFees), change: KPI_SUMMARY.platformFeesChange, color: 'purple', nav: 'tx-commissions', subtitle: 'Hoa hồng đã thu' },
    { icon: 'gavel', label: 'Tranh Chấp Mở', value: `${KPI_SUMMARY.openDisputes} vụ`, change: KPI_SUMMARY.openDisputesChange, color: 'red', nav: 'tx-disputes', subtitle: 'Cần xử lý' },
    { icon: 'account_balance', label: 'Rút Tiền Chờ', value: `${KPI_SUMMARY.pendingWithdrawals} yêu cầu`, change: KPI_SUMMARY.pendingWithdrawalsChange, color: 'orange', nav: 'tx-withdrawals', subtitle: 'Đang xem xét' },
    { icon: 'warning', label: 'Fraud Alerts', value: `${KPI_SUMMARY.fraudAlerts} cảnh báo`, change: KPI_SUMMARY.fraudAlertsChange, color: 'red', nav: 'tx-fraud', subtitle: 'Cần kiểm tra' },
  ]

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <PageHeader
        title="Tổng Quan Tài Chính"
        subtitle="Tổng quan tài chính toàn hệ thống EduX Marketplace"
      >
        <ExportButton label="Xuất Báo Cáo" />
      </PageHeader>

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
        {/* Revenue Chart */}
        <div className="col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-gray-900">Doanh Thu 6 Tháng Gần Nhất</h3>
              <p className="text-xs text-gray-400 mt-0.5">Net revenue sau khi trừ hoàn tiền</p>
            </div>
            <span className="text-xs bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full font-semibold">+18.2% MoM</span>
          </div>
          <div className="flex items-end gap-2 h-48">
            {REVENUE_BY_MONTH.map((m, i) => {
              const max = Math.max(...REVENUE_BY_MONTH.map(r => r.revenue))
              const pctRev = (m.revenue / max) * 100
              const pctRef = (m.refunds / max) * 100
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col-reverse" style={{ height: '160px' }}>
                    <div className="w-full bg-red-200 rounded-b" style={{ height: `${pctRef}%` }} title={`Hoàn tiền: ${fmtMoney(m.refunds)}`} />
                    <div className="w-full bg-blue-600 rounded-t hover:bg-blue-700 transition-colors cursor-pointer" style={{ height: `${pctRev - pctRef}%` }} title={`Doanh thu: ${fmtMoney(m.revenue)}`} />
                  </div>
                  <span className="text-xs text-gray-400 font-medium">{m.month}</span>
                </div>
              )
            })}
          </div>
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-50">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-blue-600" /><span className="text-xs text-gray-500">Doanh thu</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-red-200" /><span className="text-xs text-gray-500">Hoàn tiền</span></div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-base font-bold text-gray-900 mb-4">Dòng Tiền Hệ Thống</h3>
          {[
            { label: 'Tổng thanh toán học sinh', value: 'đ368.5M', color: 'bg-blue-500' },
            { label: 'Đang giữ Escrow', value: 'đ48.25M', color: 'bg-amber-500' },
            { label: 'Đã giải ngân gia sư', value: 'đ228M', color: 'bg-emerald-500' },
            { label: 'Phí nền tảng thu được', value: 'đ57.8M', color: 'bg-purple-500' },
            { label: 'Tổng đã hoàn tiền', value: 'đ12.4M', color: 'bg-red-400' },
          ].map(r => (
            <div key={r.label} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${r.color}`} />
                <span className="text-xs text-gray-600">{r.label}</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{r.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-2 gap-6">
        {/* Recent Activity */}
        <SectionCard title="Hoạt Động Gần Đây" icon="history">
          <div className="px-6 py-2">
            {AUDIT_LOGS.slice(0, 7).map(log => (
              <RecentActivityRow key={log.id} log={log} />
            ))}
          </div>
          <div className="px-6 py-3 border-t border-gray-50">
            <button onClick={() => onNavigate('tx-audit')} className="text-xs text-blue-600 font-semibold hover:underline">
              Xem tất cả nhật ký →
            </button>
          </div>
        </SectionCard>

        {/* Fraud Alerts Preview */}
        <SectionCard
          title="Fraud Alerts Gần Đây"
          icon="warning"
          action={
            <button onClick={() => onNavigate('tx-fraud')} className="text-xs text-blue-600 font-semibold hover:underline">Xem tất cả</button>
          }
        >
          <div className="px-6 py-2">
            {FRAUD_ALERTS.slice(0, 4).map(a => (
              <div key={a.id} className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${a.riskLevel === 'HIGH' ? 'bg-red-500' : a.riskLevel === 'MEDIUM' ? 'bg-amber-500' : 'bg-green-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{a.user.name}</p>
                  <p className="text-xs text-gray-400 truncate">{a.reason}</p>
                </div>
                <span className={`text-xs font-bold flex-shrink-0 ${a.riskLevel === 'HIGH' ? 'text-red-600' : a.riskLevel === 'MEDIUM' ? 'text-amber-600' : 'text-green-600'}`}>
                  {a.riskLevel === 'HIGH' ? '⚠ CAO' : a.riskLevel === 'MEDIUM' ? '~ TRUNG' : '✓ THẤP'}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
