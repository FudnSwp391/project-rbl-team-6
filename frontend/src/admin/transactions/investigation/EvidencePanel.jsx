import { SectionCard } from '../components'

const fmtMoney = n => (n == null ? '—' : 'đ' + Number(n).toLocaleString('vi-VN'))

const FIELD_LABELS = {
  booking_id: 'Booking ID',
  lesson_status: 'Trạng thái buổi học',
  escrow_status: 'Trạng thái Escrow',
  wallet_before: 'Ví trước',
  wallet_after: 'Ví sau',
  payment_status: 'Trạng thái thanh toán',
  last_api: 'API gần nhất',
  last_event: 'Sự kiện gần nhất',
  error_message: 'Thông báo lỗi',
}

export default function EvidencePanel({ evidence }) {
  if (!evidence) return null
  const fields = evidence.fields || {}
  return (
    <SectionCard title="Bằng Chứng" icon="fact_check">
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          {Object.entries(FIELD_LABELS).map(([key, label]) => (
            <div key={key}>
              <p className="text-xs text-gray-400 uppercase font-semibold mb-1">{label}</p>
              <p className="text-gray-800 font-medium break-words">
                {key.startsWith('wallet_') ? fmtMoney(fields[key]) : (fields[key] ?? '—')}
              </p>
            </div>
          ))}
        </div>

        {evidence.notes?.length > 0 && (
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold mb-2">Ghi nhận</p>
            <ul className="space-y-1.5">
              {evidence.notes.map((n, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="material-symbols-outlined text-[14px] text-gray-400 mt-0.5">info</span>
                  {n}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </SectionCard>
  )
}
