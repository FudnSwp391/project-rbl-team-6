import { EmptyState } from '../components'

const fmtDateTime = iso => (iso ? new Date(iso).toLocaleString('vi-VN') : '—')
const fmtMoney = n => (n == null ? '—' : 'đ' + Number(n).toLocaleString('vi-VN'))

function LogGroup({ title, rows, renderRow }) {
  if (!rows || rows.length === 0) return null
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase font-semibold mb-2">{title} ({rows.length})</p>
      <div className="space-y-1.5">
        {rows.map((r, i) => (
          <div key={i} className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">{renderRow(r)}</div>
        ))}
      </div>
    </div>
  )
}

// Sourced from wallet_ledger / commission_logs / refund_logs — this repo has
// no generic app-log aggregator, so "system logs" here honestly means the
// real append-only financial log tables filtered to this finding's entities.
export default function SystemLogs({ logs }) {
  if (!logs) return null
  const total = (logs.wallet_ledger?.length || 0) + (logs.commission_logs?.length || 0) + (logs.refund_logs?.length || 0)
  if (total === 0) {
    return (
      <div className="p-5">
        <EmptyState icon="terminal" title="Không có nhật ký liên quan"
          description="Không tìm thấy bản ghi wallet_ledger, commission_logs hoặc refund_logs nào." />
      </div>
    )
  }
  return (
    <div className="p-5 space-y-4">
      <LogGroup title="Wallet Ledger" rows={logs.wallet_ledger} renderRow={l => (
        <span>{l.reason_code} · {l.direction} {fmtMoney(l.amount)} · nguồn: {l.source} · {fmtDateTime(l.created_at)}</span>
      )} />
      <LogGroup title="Commission Logs" rows={logs.commission_logs} renderRow={l => (
        <span>{l.event_type} · {l.reason_code} · hoa hồng {fmtMoney(l.commission_amount)} · {fmtDateTime(l.created_at)}</span>
      )} />
      <LogGroup title="Refund Logs" rows={logs.refund_logs} renderRow={l => (
        <span>{l.target_type} · {l.reason_code} · hoàn {fmtMoney(l.refund_amount)} · {fmtDateTime(l.created_at)}</span>
      )} />
    </div>
  )
}
