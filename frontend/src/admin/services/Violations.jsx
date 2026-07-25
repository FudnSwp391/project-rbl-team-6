import { useState, useEffect, useCallback } from 'react'
import { PageHeader, DataTable, StatusBadge, EmptyState, ModalOverlay } from '../transactions/components'

import { API_BASE_URL as API } from '../../config'

const SEV_COLOR = {
  high:   'bg-red-100 text-red-700 border border-red-200',
  medium: 'bg-amber-100 text-amber-700 border border-amber-200',
  low:    'bg-green-100 text-green-700 border border-green-200',
}

const INV_STATUS_CFG = {
  AUTO_DISMISSED: { label: 'Đã tự đóng',   cls: 'bg-slate-100 text-slate-600' },
  NEEDS_ADMIN:    { label: 'Cần xem xét',  cls: 'bg-orange-100 text-orange-700' },
}
const CASE_TYPE_LABEL = {
  TUTOR_LATE:    'Gia sư vào trễ',
  TUTOR_NO_SHOW: 'Gia sư vắng mặt',
  WRONG_FEE:     'Sai học phí',
}

function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

function InvestigationBadge({ v }) {
  const cfg = INV_STATUS_CFG[v.investigation_status]
  if (!cfg) return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-400">Chưa điều tra</span>
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.cls}`}>{cfg.label}</span>
}

export default function Violations({ token }) {
  const [violations, setViolations] = useState([])
  const [summary, setSummary]       = useState(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [investigatingAll, setInvestigatingAll] = useState(false)
  const [toast, setToast]           = useState(null)
  const [viewingId, setViewingId]   = useState(null)

  const load = useCallback(() => {
    if (!token) return
    setLoading(true)
    setError(null)
    fetch(`${API}/api/admin/violations`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => {
        setViolations(data.violations || [])
        setSummary({ total: data.total, by_status: data.by_status, by_severity: data.by_severity })
      })
      .catch(e => setError(`Không thể tải dữ liệu vi phạm (${e})`))
      .finally(() => setLoading(false))
  }, [token])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  const investigateAll = async () => {
    setInvestigatingAll(true)
    try {
      const r = await fetch(`${API}/api/admin/violations/investigate-pending`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(j.message || `HTTP ${r.status}`)
      setToast({ msg: `Đã điều tra ${j.total} báo cáo — ${j.autoDismissed} tự đóng, ${j.needsAdmin} cần bạn xem xét.`, type: 'success' })
      load()
    } catch (e) {
      setToast({ msg: `Điều tra hàng loạt thất bại: ${e.message}`, type: 'error' })
    } finally {
      setInvestigatingAll(false)
    }
  }

  const headers = ['ID', 'Người báo cáo', 'Người bị báo cáo', 'Lý do', 'Mức độ', 'Trạng thái', 'Điều tra sơ bộ', 'Ngày']

  return (
    <div className="p-6">
      <div className="flex items-start justify-between gap-4 mb-1">
        <PageHeader title="Báo cáo vi phạm" subtitle="Hệ thống tự đối chiếu bằng chứng thật (giờ check-in...) trước khi bạn xem — chỉ tự đóng báo cáo rõ ràng không có căn cứ, mọi xử phạt thật đều cần bạn xác nhận." />
        <button
          onClick={investigateAll}
          disabled={investigatingAll}
          className="shrink-0 mt-1 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-white hover:brightness-110 disabled:opacity-50 transition-all"
        >
          {investigatingAll
            ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <span className="material-symbols-outlined text-[18px]">manage_search</span>}
          Điều tra tất cả
        </button>
      </div>

      {toast && (
        <div className={`fixed top-4 right-4 z-[999] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          <span className="material-symbols-outlined text-[18px]">{toast.type === 'success' ? 'check_circle' : 'error'}</span>
          {toast.msg}
        </div>
      )}

      {summary && (
        <div className="flex flex-wrap gap-3 mb-6 mt-4">
          <span className="px-3 py-1.5 bg-gray-100 rounded-full text-sm font-medium text-gray-700">
            Tổng: {summary.total}
          </span>
          {Object.entries(summary.by_status || {}).map(([s, n]) => (
            <span key={s} className="px-3 py-1.5 bg-blue-50 rounded-full text-sm font-medium text-blue-700">
              {s}: {n}
            </span>
          ))}
          {Object.entries(summary.by_severity || {}).map(([s, n]) => (
            <span key={s} className={`px-3 py-1.5 rounded-full text-xs font-semibold ${SEV_COLOR[s] || 'bg-gray-100 text-gray-600'}`}>
              {s === 'high' ? 'Cao' : s === 'medium' ? 'TB' : 'Thấp'}: {n}
            </span>
          ))}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
          Đang tải...
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
      )}

      {!loading && !error && (
        <DataTable
          headers={headers}
          empty={violations.length === 0
            ? <EmptyState title="Không có vi phạm" description="Hiện tại không có báo cáo vi phạm nào." />
            : null}
        >
          {violations.map(v => (
            <tr key={v.id} onClick={() => setViewingId(v.id)} className="hover:bg-gray-50 transition-colors cursor-pointer">
              <td className="py-3 px-5 text-xs font-mono text-gray-500">{v.id.slice(0, 8)}…</td>
              <td className="py-3 px-5">
                <div className="text-sm font-medium text-gray-900">{v.reporter_name || '—'}</div>
                <div className="text-xs text-gray-400">{v.reporter_email || ''}</div>
              </td>
              <td className="py-3 px-5">
                <div className="text-sm font-medium text-gray-900">{v.accused_name || '—'}</div>
                <div className="text-xs text-gray-400">{v.accused_email || ''}</div>
              </td>
              <td className="py-3 px-5 text-sm text-gray-600 max-w-xs truncate" title={v.reason}>{v.reason || '—'}</td>
              <td className="py-3 px-5">
                {v.severity
                  ? <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${SEV_COLOR[v.severity] || 'bg-gray-100 text-gray-600'}`}>
                      {v.severity === 'high' ? 'Cao' : v.severity === 'medium' ? 'Trung bình' : 'Thấp'}
                    </span>
                  : '—'}
              </td>
              <td className="py-3 px-5"><StatusBadge status={v.status} /></td>
              <td className="py-3 px-5"><InvestigationBadge v={v} /></td>
              <td className="py-3 px-5 text-sm text-gray-500 whitespace-nowrap">{fmtDate(v.created_at)}</td>
            </tr>
          ))}
        </DataTable>
      )}

      {viewingId && (
        <ViolationDetailModal
          id={viewingId}
          token={token}
          onClose={() => setViewingId(null)}
          onChanged={load}
          notify={msg => setToast({ msg, type: 'success' })}
          notifyError={msg => setToast({ msg, type: 'error' })}
        />
      )}
    </div>
  )
}

function ViolationDetailModal({ id, token, onClose, onChanged, notify, notifyError }) {
  const [detail, setDetail]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy]       = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    fetch(`${API}/api/admin/violations/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(setDetail)
      .catch(() => notifyError('Không thể tải chi tiết báo cáo.'))
      .finally(() => setLoading(false))
  }, [id, token]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  const investigateNow = async () => {
    setBusy(true)
    try {
      const r = await fetch(`${API}/api/admin/violations/${id}/investigate`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(j.message || `HTTP ${r.status}`)
      notify(j.investigationStatus === 'AUTO_DISMISSED' ? 'Bằng chứng rõ ràng — báo cáo đã tự đóng và đã báo cho người báo cáo.' : 'Đã điều tra xong — cần bạn xem xét bằng chứng bên dưới.')
      load()
      onChanged()
    } catch (e) {
      notifyError(`Điều tra thất bại: ${e.message}`)
    } finally {
      setBusy(false)
    }
  }

  const applyRecommendation = async () => {
    const delta = detail?.investigation?.evidence?.suggested_reputation_delta
    if (!delta || !detail?.tutor_id) return
    if (!window.confirm(`Áp dụng trừ ${Math.abs(delta)} điểm uy tín cho gia sư "${detail.accused_name}"?`)) return
    setBusy(true)
    try {
      const r = await fetch(`${API}/api/admin/tutors/${detail.tutor_id}/reputation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ delta, reason: `Báo cáo vi phạm #${id.slice(0, 8)}: ${detail.investigation.summary}` }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(j.message || `HTTP ${r.status}`)
      notify(`Đã trừ điểm uy tín — điểm mới: ${j.reputation_score}/100${j.auto_banned ? ' (tài khoản đã bị tự động khóa do điểm quá thấp)' : ''}.`)
      onClose()
      onChanged()
    } catch (e) {
      notifyError(`Áp dụng khuyến nghị thất bại: ${e.message}`)
    } finally {
      setBusy(false)
    }
  }

  const inv = detail?.investigation
  const canApply = inv?.verdict === 'SUBSTANTIATED' && inv?.evidence?.suggested_reputation_delta && detail?.tutor_id

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-[600px] max-w-[90vw] max-h-[85vh] flex flex-col">
        <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-100">
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900">Chi tiết báo cáo #{id.slice(0, 8)}…</p>
            {detail && <p className="text-xs text-gray-400 mt-0.5">{detail.reporter_name || '—'} báo cáo {detail.accused_name || '—'} · {fmtDate(detail.created_at)}</p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 shrink-0 rounded-lg text-gray-400 hover:bg-gray-100 flex items-center justify-center">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-gray-400">
              <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>Đang tải...
            </div>
          ) : !detail ? null : (
            <>
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase mb-1">Nội dung báo cáo</p>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{detail.reason || '—'}</p>
              </div>

              {!inv ? (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <span className="material-symbols-outlined text-3xl text-gray-300">manage_search</span>
                  <p className="text-sm text-gray-500">Báo cáo này chưa được điều tra sơ bộ.</p>
                  <button onClick={investigateNow} disabled={busy}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-white hover:brightness-110 disabled:opacity-50">
                    {busy && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    Điều tra ngay
                  </button>
                </div>
              ) : (
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-500">{CASE_TYPE_LABEL[inv.case_type] || 'Không xác định loại'}</span>
                      <InvestigationBadge v={{ investigation_status: inv.investigation_status }} />
                    </div>
                    {inv.confidence != null && <span className="text-xs text-gray-400">Độ tin cậy: {inv.confidence}%</span>}
                  </div>
                  <div className="p-4 space-y-3">
                    <p className="text-sm text-gray-800">{inv.summary}</p>
                    {inv.recommendation && (
                      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <span className="material-symbols-outlined text-amber-600 text-[18px] shrink-0">lightbulb</span>
                        <p className="text-sm text-amber-900">{inv.recommendation}</p>
                      </div>
                    )}
                    {canApply && (
                      <button onClick={applyRecommendation} disabled={busy}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
                        {busy && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                        Áp dụng khuyến nghị (trừ {Math.abs(inv.evidence.suggested_reputation_delta)} điểm uy tín)
                      </button>
                    )}
                    <button onClick={investigateNow} disabled={busy} className="text-xs font-semibold text-gray-400 hover:text-gray-600">
                      Điều tra lại
                    </button>
                  </div>
                </div>
              )}

              {detail.booking && (
                <div>
                  <p className="text-[11px] font-semibold text-gray-400 uppercase mb-1">Buổi học liên quan</p>
                  <div className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3 space-y-1">
                    <p>Môn: {detail.booking.subject || '—'} · Lịch: {detail.booking.lesson_date ? new Date(detail.booking.lesson_date).toLocaleDateString('vi-VN') : '—'} {detail.booking.time_slot || ''}</p>
                    <p>Check-in gia sư: {detail.booking.tutor_check_in_at ? fmtDate(detail.booking.tutor_check_in_at) : 'Chưa check-in'}</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </ModalOverlay>
  )
}
