import { EmptyState } from '../components'

const fmtMoney = n => (n == null ? '—' : 'đ' + Number(n).toLocaleString('vi-VN'))
const fmtDateTime = iso => (iso ? new Date(iso).toLocaleString('vi-VN') : '—')
const short = id => (id ? String(id).slice(0, 8) : '—')

const HEADERS = ['Mã GD', 'Booking', 'Người dùng', 'Gia sư', 'Loại', 'Số tiền', 'Ví trước', 'Ví sau', 'Trạng thái', 'Tạo lúc']

export default function TransactionTraceTable({ transactions }) {
  const rows = transactions || []
  if (rows.length === 0) {
    return (
      <div className="p-5">
        <EmptyState icon="receipt_long" title="Không có giao dịch liên quan"
          description="Mục này không gắn với giao dịch cụ thể nào (ví dụ: một kiểm tra tổng hợp)." />
      </div>
    )
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            {HEADERS.map(h => (
              <th key={h} className="py-2.5 px-3 text-left text-xs font-bold text-gray-500 uppercase whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map(r => (
            <tr key={r.transaction_id} className="hover:bg-gray-50">
              <td className="py-2.5 px-3 font-mono text-xs text-gray-500">{short(r.transaction_id)}</td>
              <td className="py-2.5 px-3 font-mono text-xs text-gray-500">{short(r.booking_id)}</td>
              <td className="py-2.5 px-3 text-gray-700">{r.user || '—'}</td>
              <td className="py-2.5 px-3 text-gray-700">{r.tutor || '—'}</td>
              <td className="py-2.5 px-3 text-gray-700">{r.type}</td>
              <td className="py-2.5 px-3 font-semibold text-gray-900 whitespace-nowrap">{fmtMoney(r.amount)}</td>
              <td className="py-2.5 px-3 whitespace-nowrap text-gray-600">{fmtMoney(r.wallet_before)}</td>
              <td className="py-2.5 px-3 whitespace-nowrap text-gray-600">{fmtMoney(r.wallet_after)}</td>
              <td className="py-2.5 px-3 text-gray-700">{r.status}</td>
              <td className="py-2.5 px-3 whitespace-nowrap text-xs text-gray-500">{fmtDateTime(r.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
