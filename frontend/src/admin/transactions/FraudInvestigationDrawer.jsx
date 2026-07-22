import { useState, useEffect, useCallback } from 'react'
import { Drawer, SectionCard, Timeline, StatusBadge, AvatarCell, EmptyState } from './components'
import { fmtDateTime } from './mockData'

import { API_BASE_URL as API } from '../../config'

function decodeJwtUserId(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]))?.userId || null
  } catch {
    return null
  }
}

const HISTORY_TABS = [
  ['transactions', 'Giao dịch'],
  ['complaints',   'Khiếu nại'],
  ['bookings',     'Đặt lịch'],
  ['withdrawals',  'Yêu cầu rút tiền'],
  ['refunds',      'Yêu cầu hoàn tiền'],
]

const STATUS_OPTIONS = [
  ['OPEN',                'Đang mở'],
  ['INVESTIGATING',       'Đang điều tra'],
  ['NEED_MORE_EVIDENCE',  'Cần thêm bằng chứng'],
  ['RESOLVED',            'Đã giải quyết'],
  ['CONFIRMED_FRAUD',     'Xác nhận gian lận'],
  ['FALSE_POSITIVE',      'Báo động giả'],
]

// Buttons map 1:1 to POST /api/admin/fraud-alerts/:id/actions. Freeze/hold/
// release are advisory (logged only) — see server.js Batch 38 comment: moving
// money or blocking transactions there would touch financial transaction
// logic / the wallet_ledger trigger, which is out of scope for this batch.
const ACTION_BUTTONS = [
  { type: 'ASSIGN_INVESTIGATOR', label: 'Nhận xử lý',              icon: 'assignment_ind', reason: false },
  { type: 'REQUEST_VERIFICATION', label: 'Yêu cầu xác minh',        icon: 'verified_user',  reason: true },
  { type: 'FREEZE_WALLET',        label: 'Tạm giữ ví',              icon: 'account_balance_wallet', reason: true, advisory: true },
  { type: 'SUSPEND_USER',         label: 'Khoá tài khoản',          icon: 'block',           reason: true, danger: true },
  { type: 'HOLD_PAYMENT',         label: 'Giữ thanh toán',          icon: 'pause_circle',    reason: true, advisory: true },
  { type: 'RELEASE_PAYMENT',      label: 'Giải ngân thanh toán',    icon: 'play_circle',     reason: true, advisory: true },
  { type: 'MARK_FALSE_POSITIVE',  label: 'Đánh dấu báo động giả',   icon: 'thumb_down',      reason: true },
  { type: 'RESOLVE',              label: 'Kết thúc điều tra',       icon: 'task_alt',        reason: true },
]

const fmtVnd = n => Number(n || 0).toLocaleString('vi-VN') + 'đ'

const openCopilot = (entityType, entityId) =>
  window.dispatchEvent(new CustomEvent('admin-copilot:analyze', { detail: { entityType, entityId } }))

export default function FraudInvestigationDrawer({ token, alertRow, open, onClose, onNavigate }) {
  const [detail,     setDetail]     = useState(null)
  const [history,    setHistory]    = useState(null)
  const [timeline,   setTimeline]   = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [historyTab, setHistoryTab] = useState('transactions')
  const [noteText,   setNoteText]   = useState('')
  const [noteBusy,   setNoteBusy]   = useState(false)
  const [editingId,  setEditingId]  = useState(null)
  const [editText,   setEditText]   = useState('')
  const [auditLog,   setAuditLog]   = useState(null)
  const [statusDraft, setStatusDraft] = useState('OPEN')
  const [statusBusy, setStatusBusy] = useState(false)
  const [actionBusy, setActionBusy] = useState(null)

  const myAdminId = token ? decodeJwtUserId(token) : null
  const alertId = alertRow?.id

  const load = useCallback(() => {
    if (!token || !alertId) return
    setLoading(true)
    const headers = { Authorization: `Bearer ${token}` }
    Promise.all([
      fetch(`${API}/api/admin/fraud-alerts/${alertId}`, { headers }).then(r => r.ok ? r.json() : Promise.reject(r.status)),
      fetch(`${API}/api/admin/fraud-alerts/${alertId}/history`, { headers }).then(r => r.ok ? r.json() : Promise.reject(r.status)),
      fetch(`${API}/api/admin/fraud-alerts/${alertId}/timeline`, { headers }).then(r => r.ok ? r.json() : Promise.reject(r.status)),
      fetch(`${API}/api/admin/fraud-alerts/${alertId}/audit-log`, { headers }).then(r => r.ok ? r.json() : Promise.reject(r.status)),
    ])
      .then(([d, h, t, a]) => { setDetail(d); setHistory(h); setTimeline(t); setAuditLog(a); setStatusDraft(d.investigation?.status || 'OPEN') })
      .catch(() => { setDetail(null); setHistory(null); setTimeline(null); setAuditLog(null) })
      .finally(() => setLoading(false))
  }, [token, alertId])

  useEffect(() => {
    if (open && alertId) load()
    if (!open) {
      setDetail(null); setHistory(null); setTimeline(null); setAuditLog(null)
      setHistoryTab('transactions'); setNoteText(''); setEditingId(null)
    }
  }, [open, alertId, load])

  const updateStatus = async () => {
    const reason = window.prompt('Lý do thay đổi trạng thái (không bắt buộc):') || ''
    setStatusBusy(true)
    try {
      const r = await fetch(`${API}/api/admin/fraud-alerts/${alertId}/status`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: statusDraft, reason }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { window.alert(j.message || 'Không thể cập nhật trạng thái.'); return }
      load()
    } catch { window.alert('Lỗi kết nối.') } finally { setStatusBusy(false) }
  }

  const runAction = async (btn) => {
    let reason = ''
    if (btn.reason) {
      reason = window.prompt(`Lý do cho hành động "${btn.label}":`) || ''
      if (btn.reason && !reason.trim()) return
    }
    if (btn.danger && !window.confirm(`Xác nhận: ${btn.label}?`)) return
    setActionBusy(btn.type)
    try {
      const r = await fetch(`${API}/api/admin/fraud-alerts/${alertId}/actions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: btn.type, reason }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { window.alert(j.message || 'Không thể thực hiện hành động.'); return }
      load()
    } catch { window.alert('Lỗi kết nối.') } finally { setActionBusy(null) }
  }

  const submitNote = async () => {
    const content = noteText.trim()
    if (!content) return
    setNoteBusy(true)
    try {
      const r = await fetch(`${API}/api/admin/fraud-alerts/${alertId}/note`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { window.alert(j.message || 'Không thể thêm ghi chú.'); return }
      setNoteText('')
      load()
    } catch { window.alert('Lỗi kết nối.') } finally { setNoteBusy(false) }
  }

  const submitEdit = async (noteId) => {
    const content = editText.trim()
    if (!content) return
    setNoteBusy(true)
    try {
      const r = await fetch(`${API}/api/admin/fraud-alerts/${alertId}/note/${noteId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { window.alert(j.message || 'Không thể cập nhật ghi chú.'); return }
      setEditingId(null)
      load()
    } catch { window.alert('Lỗi kết nối.') } finally { setNoteBusy(false) }
  }

  return (
    <Drawer open={open} onClose={onClose} title="Điều tra cảnh báo gian lận" width="w-[640px]">
      {loading ? (
        <div className="flex items-center justify-center py-24 text-gray-400">
          <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>Đang tải...
        </div>
      ) : !detail ? (
        <EmptyState icon="error" title="Không tải được chi tiết" description="Vui lòng đóng và thử lại." />
      ) : (
        <div className="space-y-4">
          {/* 1. Alert Information */}
          <SectionCard title="Thông tin cảnh báo" icon="warning"
            action={
              <button onClick={() => openCopilot('FRAUD_ALERT', alertId)}
                className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border border-primary/30 text-primary hover:bg-primary/5">
                <span className="material-symbols-outlined text-[15px]">auto_awesome</span>
                Phân tích bằng AI
              </button>
            }>
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold text-orange-600">{detail.alert.id}</span>
                <StatusBadge status={detail.alert.severity} />
                <StatusBadge status={detail.investigation?.status || 'OPEN'} />
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Điểm rủi ro</p>
                  <p className="font-bold text-gray-900">{detail.alert.risk_score}/100</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Thời gian phát hiện</p>
                  <p className="text-gray-700">{fmtDateTime(detail.alert.created_at)}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Mô tả</p>
                <p className="text-gray-700">{detail.alert.description}</p>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                <p className="text-xs text-blue-600 uppercase font-semibold mb-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">auto_awesome</span>Lý do AI phát hiện
                </p>
                <p className="text-sm text-blue-900">{detail.ai_reason}</p>
              </div>
            </div>
          </SectionCard>

          {/* 2. User Information */}
          <SectionCard title="Thông tin người dùng" icon="person"
            action={
              <button onClick={() => onNavigate?.('user-management')}
                className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100">
                Xem hồ sơ người dùng
              </button>
            }>
            <div className="p-5 space-y-3">
              <AvatarCell name={detail.user.full_name || detail.user.email} email={detail.user.email} avatar={detail.user.picture} />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-gray-400 uppercase font-semibold mb-1">Vai trò</p><p className="text-gray-700 capitalize">{detail.user.role}</p></div>
                <div><p className="text-xs text-gray-400 uppercase font-semibold mb-1">Trạng thái tài khoản</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${detail.user.is_banned ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {detail.user.is_banned ? 'Đã khoá' : 'Hoạt động'}
                  </span>
                </div>
                <div className="col-span-2"><p className="text-xs text-gray-400 uppercase font-semibold mb-1">Ngày tham gia</p><p className="text-gray-700">{fmtDateTime(detail.user.created_at)}</p></div>
              </div>
            </div>
          </SectionCard>

          {/* 3. Risk Analysis */}
          <SectionCard title="Phân tích rủi ro" icon="analytics">
            <div className="p-5 space-y-3">
              {detail.signals.map((s, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-700">{s.label}</span>
                    <span className="font-semibold text-gray-900">+{s.points}</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-red-400 rounded-full" style={{ width: `${Math.min(100, s.points)}%` }} />
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-sm font-bold text-gray-900">
                <span>Tổng điểm rủi ro</span><span>{detail.total_signal_score}/100</span>
              </div>
            </div>
          </SectionCard>

          {/* 4. Related History */}
          <SectionCard title="Lịch sử liên quan" icon="history">
            <div className="flex gap-1 px-5 pt-3 border-b border-gray-100 overflow-x-auto">
              {HISTORY_TABS.map(([v, l]) => (
                <button key={v} onClick={() => setHistoryTab(v)}
                  className={`px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${historyTab === v ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'}`}>
                  {l} ({history?.[v]?.length ?? 0})
                </button>
              ))}
            </div>
            <div className="p-5">
              <HistoryRows tab={historyTab} rows={history?.[historyTab] || []} />
            </div>
          </SectionCard>

          {/* 5. Timeline */}
          <SectionCard title="Dòng thời gian" icon="timeline">
            <div className="p-5">
              {(timeline?.events || []).length === 0
                ? <EmptyState icon="timeline" title="Chưa có sự kiện" description="Chưa ghi nhận hoạt động điều tra nào." />
                : <Timeline steps={timeline.events.map(e => ({ done: true, label: e.label, time: fmtDateTime(e.time) }))} />}
            </div>
          </SectionCard>

          {/* 6. Investigation Notes */}
          <SectionCard title="Ghi chú điều tra" icon="edit_note">
            <div className="p-5 space-y-3">
              <div className="flex gap-2">
                <textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={2}
                  placeholder="Thêm ghi chú điều tra..."
                  className="flex-1 border border-gray-200 rounded-lg p-2 text-sm resize-none focus:outline-none focus:border-primary" />
                <button onClick={submitNote} disabled={noteBusy || !noteText.trim()}
                  className="px-3 py-2 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 self-start">
                  Thêm
                </button>
              </div>
              {detail.notes.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">Chưa có ghi chú nào.</p>
              ) : (
                <div className="space-y-2">
                  {detail.notes.map(n => (
                    <div key={n.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-gray-700">{n.admin_name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">{fmtDateTime(n.created_at)}</span>
                          {n.admin_id === myAdminId && editingId !== n.id && (
                            <button onClick={() => { setEditingId(n.id); setEditText(n.content) }} className="text-gray-400 hover:text-gray-600">
                              <span className="material-symbols-outlined text-[14px]">edit</span>
                            </button>
                          )}
                        </div>
                      </div>
                      {editingId === n.id ? (
                        <div className="space-y-2">
                          <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={2}
                            className="w-full border border-gray-200 rounded-lg p-2 text-sm resize-none focus:outline-none focus:border-primary" />
                          <div className="flex gap-2">
                            <button onClick={() => submitEdit(n.id)} disabled={noteBusy} className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50">Lưu</button>
                            <button onClick={() => setEditingId(null)} className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100">Huỷ</button>
                          </div>
                        </div>
                      ) : <p className="text-sm text-gray-700 whitespace-pre-wrap">{n.content}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </SectionCard>

          {/* 7. Status Management */}
          <SectionCard title="Trạng thái điều tra" icon="flag">
            <div className="p-5 flex items-center gap-2 flex-wrap">
              <select value={statusDraft} onChange={e => setStatusDraft(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none flex-1 min-w-[180px]">
                {STATUS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <button onClick={updateStatus} disabled={statusBusy || statusDraft === (detail.investigation?.status || 'OPEN')}
                className="px-3 py-2 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 disabled:opacity-50">
                {statusBusy ? 'Đang lưu...' : 'Cập nhật trạng thái'}
              </button>
            </div>
          </SectionCard>

          {/* 8. Investigation Actions */}
          <SectionCard title="Hành động điều tra" icon="bolt">
            <div className="p-5 grid grid-cols-2 gap-2">
              {ACTION_BUTTONS.map(btn => (
                <button key={btn.type} onClick={() => runAction(btn)} disabled={actionBusy === btn.type}
                  title={btn.advisory ? 'Ghi nhận vào nhật ký kiểm toán — không tự động di chuyển tiền.' : undefined}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border transition disabled:opacity-50
                    ${btn.danger ? 'border-red-200 text-red-700 hover:bg-red-50' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                  <span className="material-symbols-outlined text-[16px]">{btn.icon}</span>
                  {actionBusy === btn.type ? 'Đang xử lý...' : btn.label}
                  {btn.advisory && <span className="material-symbols-outlined text-[13px] text-gray-400 ml-auto">info</span>}
                </button>
              ))}
            </div>
            <p className="px-5 pb-4 text-[11px] text-gray-400">
              Các hành động có biểu tượng <span className="material-symbols-outlined text-[11px] align-middle">info</span> chỉ ghi nhận vào nhật ký kiểm toán, chưa tự động thực thi trên ví/giao dịch thật.
            </p>
          </SectionCard>

          {/* Audit Log */}
          <SectionCard title="Nhật ký kiểm toán" icon="history_edu">
            <div className="p-5">
              {(auditLog?.logs || []).length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">Chưa có hành động nào được ghi nhận.</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {auditLog.logs.map(l => (
                    <div key={l.id} className="py-2.5 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-gray-800">{l.action}</span>
                        <span className="text-xs text-gray-400 whitespace-nowrap">{fmtDateTime(l.created_at)}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {l.admin_name || 'Admin'}
                        {l.previous_status && l.new_status ? ` · ${l.previous_status} → ${l.new_status}` : ''}
                        {l.reason ? ` · ${l.reason}` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </SectionCard>
        </div>
      )}
    </Drawer>
  )
}

function HistoryRows({ tab, rows }) {
  if (rows.length === 0) return <EmptyState icon="inbox" title="Không có dữ liệu" description="Chưa có bản ghi liên quan trong mục này." />
  return (
    <div className="divide-y divide-gray-50">
      {rows.map(r => (
        <div key={r.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
          <div className="min-w-0">
            <p className="text-gray-800 truncate">
              {tab === 'transactions' && `${r.type} · ${fmtVnd(r.amount)}`}
              {tab === 'complaints'   && (r.reason || 'Khiếu nại')}
              {tab === 'bookings'     && `${r.subject || 'Buổi học'} · ${fmtVnd(r.lesson_fee)}`}
              {tab === 'withdrawals'  && `${r.method || 'Rút tiền'} · ${fmtVnd(r.amount)}`}
              {tab === 'refunds'      && `Hoàn tiền · ${fmtVnd(r.amount)}`}
            </p>
            <p className="text-xs text-gray-400">{fmtDateTime(r.created_at)}{r.status ? ` · ${r.status}` : ''}</p>
          </div>
          {(tab === 'transactions' || tab === 'complaints' || tab === 'bookings' || tab === 'refunds') && (
            <button
              onClick={() => openCopilot(tab === 'transactions' ? 'TRANSACTION' : tab === 'bookings' ? 'BOOKING' : 'DISPUTE', r.id)}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 whitespace-nowrap flex-shrink-0">
              Xem chi tiết
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
