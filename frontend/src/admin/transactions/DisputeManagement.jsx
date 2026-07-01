import { useState } from 'react'
import { StatusBadge, PageHeader, EmptyState } from './components'
import { DISPUTES, fmtMoney, fmtDateTime } from './mockData'

function DisputeListItem({ dispute, active, onClick }) {
  const isOpen = dispute.status === 'OPEN'
  return (
    <div
      onClick={onClick}
      className={`p-4 cursor-pointer border-b border-gray-100 transition-all ${active ? 'bg-blue-50 border-l-4 border-l-primary' : 'hover:bg-gray-50 border-l-4 border-l-transparent'}`}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-mono font-bold text-blue-600">{dispute.id}</span>
        <StatusBadge status={dispute.status} />
      </div>
      <p className="text-sm font-semibold text-gray-900 mb-1">{dispute.student.name} vs {dispute.tutor.name}</p>
      <p className="text-xs text-gray-500 line-clamp-2">{dispute.studentClaim}</p>
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-gray-400">{fmtDateTime(dispute.createdAt)}</span>
        <span className="text-xs font-bold text-red-600">{fmtMoney(dispute.amount)}</span>
      </div>
    </div>
  )
}

export default function DisputeManagement({ disputes, onUpdateDispute }) {
  const [selected, setSelected] = useState(null)
  const data = disputes || []
  const [adminNote, setAdminNote] = useState('')
  const [resolveType, setResolveType] = useState(null)

  const handleResolve = (decision) => {
    if (!adminNote.trim()) {
      alert('Vui lòng nhập ghi chú của admin trước khi quyết định.')
      return
    }
    const newStatus = decision === 'REFUND' ? 'RESOLVED_REFUND' : 'RESOLVED_RELEASE'
    const updated = { ...selected, status: newStatus, adminNote }
    if (onUpdateDispute) onUpdateDispute(updated)
    setSelected(updated)
    setAdminNote('')
    setResolveType(null)
  }

  const openDisputes = data.filter(d => d.status === 'OPEN')
  const resolvedDisputes = data.filter(d => d.status !== 'OPEN')

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <PageHeader title="Quản Lý Tranh Chấp" subtitle="Giải quyết tranh chấp giữa học sinh và gia sư — Ticket System" />

      <div className="grid grid-cols-3 gap-6 min-h-[600px]">
        {/* Left: List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-700">Danh Sách Khiếu Nại</h3>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">{openDisputes.length} đang mở</span>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-semibold">{resolvedDisputes.length} đã giải quyết</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {data.length === 0
              ? <EmptyState icon="gavel" title="Không có khiếu nại" description="Hiện tại không có tranh chấp nào cần xử lý." />
              : data.map(d => (
                <DisputeListItem
                  key={d.id}
                  dispute={d}
                  active={selected?.id === d.id}
                  onClick={() => setSelected(d)}
                />
              ))
            }
          </div>
        </div>

        {/* Right: Detail */}
        {selected ? (
          <div className="col-span-2 space-y-4">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Tranh Chấp #{selected.id}</h3>
                  <p className="text-sm text-gray-500">Ngày tạo: {fmtDateTime(selected.createdAt)}</p>
                </div>
                <StatusBadge status={selected.status} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-2">Học Sinh</p>
                  <div className="flex items-center gap-2">
                    <img src={selected.student.avatar} className="w-8 h-8 rounded-full" alt="" />
                    <div>
                      <p className="text-sm font-semibold">{selected.student.name}</p>
                      <p className="text-xs text-gray-400">{selected.student.email}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-2">Gia Sư</p>
                  <div className="flex items-center gap-2">
                    <img src={selected.tutor.avatar} className="w-8 h-8 rounded-full" alt="" />
                    <div>
                      <p className="text-sm font-semibold">{selected.tutor.name}</p>
                      <p className="text-xs text-gray-400">{selected.tutor.email}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Claims */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[14px] text-red-600">person</span>
                  </div>
                  <p className="text-xs font-bold text-red-600 uppercase">Học Sinh Khiếu Nại</p>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{selected.studentClaim}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[14px] text-blue-600">school</span>
                  </div>
                  <p className="text-xs font-bold text-blue-600 uppercase">Phản Hồi Gia Sư</p>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{selected.tutorResponse}</p>
              </div>
            </div>

            {/* Evidence + Transaction */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <p className="text-xs font-bold text-gray-400 uppercase mb-3">Bằng Chứng</p>
                <div className="space-y-2">
                  {selected.evidence.map((e, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <span className="material-symbols-outlined text-[16px] text-blue-500">attach_file</span>
                      <span className="text-sm text-gray-700">{e}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <p className="text-xs font-bold text-gray-400 uppercase mb-3">Thông Tin Giao Dịch</p>
                {[
                  ['Mã GD', selected.transactionId],
                  ['Số Tiền', fmtMoney(selected.amount)],
                  ['Ngày Học', fmtDateTime(selected.lessonDate)],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between py-1.5 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-500">{k}</span>
                    <span className="text-sm font-semibold text-gray-900">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Resolution */}
            {selected.status === 'OPEN' ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-5">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-3">Ghi Chú Admin & Quyết Định</p>
                  <textarea
                    className="w-full h-28 p-3 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 mb-4"
                    placeholder="Nhập ghi chú, lý do quyết định... (bắt buộc)"
                    value={adminNote}
                    onChange={e => setAdminNote(e.target.value)}
                  />
                </div>
                <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
                  <div className="flex gap-3">
                    <button
                      disabled={!adminNote.trim()}
                      onClick={() => handleResolve('REFUND')}
                      className={`flex-1 py-2 font-semibold text-sm rounded-lg transition-colors border ${adminNote.trim() ? 'bg-red-50 text-red-700 hover:bg-red-100 border-red-200' : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'}`}
                    >
                      Hoàn tiền học sinh
                    </button>
                    <button
                      disabled={!adminNote.trim()}
                      onClick={() => handleResolve('RELEASE')}
                      className={`flex-1 py-2 font-semibold text-sm rounded-lg transition-colors border ${adminNote.trim() ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200' : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'}`}
                    >
                      Giải ngân gia sư
                    </button>
                  </div>
                  {!adminNote.trim() && <p className="text-xs text-red-500 mt-2 text-center">Vui lòng nhập ghi chú để mở khóa quyết định</p>}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <p className="text-xs font-bold text-gray-400 uppercase mb-3">Kết Quả Xử Lý</p>
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                  <span className="material-symbols-outlined text-[20px] text-gray-500">sticky_note_2</span>
                  <p className="text-sm text-gray-700">{selected.adminNote || 'Không có ghi chú'}</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="col-span-2 flex items-center justify-center bg-white rounded-xl border border-gray-100">
            <EmptyState icon="gavel" title="Chọn một khiếu nại" description="Click vào danh sách bên trái để xem chi tiết." />
          </div>
        )}
      </div>
    </div>
  )
}
