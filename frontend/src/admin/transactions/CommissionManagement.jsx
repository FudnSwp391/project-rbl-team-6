import { useState } from 'react'
import { StatusBadge, PageHeader, AvatarCell, ModalOverlay } from './components'
import { COMMISSIONS, fmtDateTime } from './mockData'

export default function CommissionManagement() {
  const [data, setData] = useState(COMMISSIONS)
  const [editTarget, setEditTarget] = useState(null)
  const [newRate, setNewRate] = useState('')
  const [reason, setReason] = useState('')
  const [historyTarget, setHistoryTarget] = useState(null)

  const handleSave = () => {
    const rate = Number(newRate)
    if (!rate || rate < 0 || rate > 100) { alert('Tỷ lệ phải từ 0-100%'); return }
    if (!reason.trim()) { alert('Vui lòng nhập lý do thay đổi'); return }
    setData(prev => prev.map(c => {
      if (c.id !== editTarget.id) return c
      return {
        ...c,
        commissionRate: rate,
        lastUpdated: new Date().toISOString(),
        updatedBy: 'Admin EduX',
        history: [...c.history, { rate, changedAt: new Date().toLocaleDateString('vi-VN'), changedBy: 'Admin EduX', reason }]
      }
    }))
    setEditTarget(null); setNewRate(''); setReason('')
  }

  const avgRate = (data.reduce((s, c) => s + c.commissionRate, 0) / data.length).toFixed(1)

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <PageHeader title="Quản Lý Hoa Hồng" subtitle="Quản lý tỷ lệ hoa hồng cho từng gia sư" />

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Tỷ lệ trung bình', value: `${avgRate}%`, icon: 'percent', color: 'bg-blue-50 text-blue-600' },
          { label: 'Gia sư tỷ lệ thấp (≤15%)', value: data.filter(c => c.commissionRate <= 15).length, icon: 'star', color: 'bg-amber-50 text-amber-600' },
          { label: 'Tổng gia sư', value: data.length, icon: 'group', color: 'bg-purple-50 text-purple-600' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className={`w-9 h-9 rounded-lg ${c.color} flex items-center justify-center mb-3`}>
              <span className="material-symbols-outlined text-[18px]">{c.icon}</span>
            </div>
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">{c.label}</p>
            <p className="text-xl font-bold text-gray-900">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-700 uppercase">Danh Sách Hoa Hồng Gia Sư</h3>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {['Gia Sư', 'Tỷ Lệ Hiện Tại', 'Ngày Hiệu Lực', 'Cập Nhật Lần Cuối', 'Cập Nhật Bởi', 'Thao Tác'].map(h => (
                <th key={h} className="py-3 px-6 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.map(cm => (
              <tr key={cm.id} className="hover:bg-gray-50 transition-colors">
                <td className="py-4 px-6"><AvatarCell name={cm.tutor.name} email={cm.tutor.email} avatar={cm.tutor.avatar} /></td>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${cm.commissionRate * 5}%` }} />
                    </div>
                    <span className={`text-lg font-extrabold ${cm.commissionRate <= 15 ? 'text-emerald-600' : cm.commissionRate >= 20 ? 'text-red-600' : 'text-amber-600'}`}>
                      {cm.commissionRate}%
                    </span>
                  </div>
                </td>
                <td className="py-4 px-6 text-sm text-gray-600">{fmtDateTime(cm.effectiveDate)}</td>
                <td className="py-4 px-6 text-sm text-gray-600">{fmtDateTime(cm.lastUpdated)}</td>
                <td className="py-4 px-6 text-sm text-gray-600">{cm.updatedBy}</td>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setEditTarget(cm); setNewRate(String(cm.commissionRate)); setReason('') }}
                      className="px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                    >
                      Chỉnh sửa
                    </button>
                    <button
                      onClick={() => setHistoryTarget(cm)}
                      className="px-3 py-1.5 bg-gray-50 text-gray-600 border border-gray-200 rounded-lg text-xs font-bold hover:bg-gray-100 transition-colors"
                    >
                      Lịch sử
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editTarget && (
        <ModalOverlay onClose={() => setEditTarget(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-[440px] p-8">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Cập Nhật Hoa Hồng</h3>
            <p className="text-sm text-gray-500 mb-5">{editTarget.tutor.name} — Hiện tại: <strong>{editTarget.commissionRate}%</strong></p>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Tỷ Lệ Mới (0-100%)</label>
              <div className="flex items-center gap-2">
                <input type="number" min="0" max="100" value={newRate} onChange={e => setNewRate(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-lg font-bold focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
                <span className="text-2xl font-bold text-gray-400">%</span>
              </div>
            </div>
            <div className="mb-5">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Lý Do Thay Đổi *</label>
              <textarea className="w-full h-24 p-3 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:border-blue-400" placeholder="Nhập lý do..." value={reason} onChange={e => setReason(e.target.value)} />
            </div>
            <div className="flex gap-3">
              <button onClick={handleSave} className="flex-1 py-3 bg-primary text-white rounded-xl font-bold hover:opacity-90">Lưu Thay Đổi</button>
              <button onClick={() => setEditTarget(null)} className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50">Hủy</button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* History Modal */}
      {historyTarget && (
        <ModalOverlay onClose={() => setHistoryTarget(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-[480px] p-8">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Lịch Sử Hoa Hồng</h3>
            <p className="text-sm text-gray-500 mb-5">{historyTarget.tutor.name}</p>
            <div className="space-y-3">
              {historyTarget.history.map((h, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-white border-2 border-blue-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-blue-600">{h.rate}%</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800">{h.reason}</p>
                    <p className="text-xs text-gray-400">{h.changedAt} — {h.changedBy}</p>
                  </div>
                  {i === historyTarget.history.length - 1 && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">Hiện tại</span>
                  )}
                </div>
              ))}
            </div>
            <button onClick={() => setHistoryTarget(null)} className="w-full mt-5 py-3 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50">Đóng</button>
          </div>
        </ModalOverlay>
      )}
    </div>
  )
}
