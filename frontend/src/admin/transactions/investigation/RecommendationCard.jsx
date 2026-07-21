import { SectionCard } from '../components'

const ACTION_ICONS = {
  'Retry Escrow Release': 'restart_alt',
  'Retry Withdrawal': 'restart_alt',
  'Review Booking': 'menu_book',
  'Open Transaction': 'receipt_long',
  'View Wallet': 'account_balance_wallet',
  'Create Incident': 'report',
  'Mark Reviewed': 'task_alt',
  'Run Reconciliation Again': 'refresh',
  'Manual Investigation Required': 'search',
}

// Module 9: suggestions only — this system never modifies balances or
// retries anything automatically. Buttons here are informational; the real
// state-changing actions (mark reviewed / reopen) live in the Summary
// section's status buttons, wired to PATCH .../status.
export default function RecommendationCard({ recommendation }) {
  if (!recommendation || recommendation.length === 0) return null
  return (
    <SectionCard title="Đề Xuất Hành Động" icon="lightbulb">
      <div className="p-5 flex flex-wrap gap-2">
        {recommendation.map((r, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium border border-blue-100">
            <span className="material-symbols-outlined text-[16px]">{ACTION_ICONS[r] || 'arrow_forward'}</span>
            {r}
          </span>
        ))}
      </div>
      <p className="px-5 pb-4 text-xs text-gray-400">Đây chỉ là gợi ý — hệ thống không tự động thực hiện các hành động này.</p>
    </SectionCard>
  )
}
