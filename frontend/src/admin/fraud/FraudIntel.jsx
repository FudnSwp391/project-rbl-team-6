import { useState, useEffect, useCallback } from 'react'
import { PageHeader, EmptyState } from '../transactions/components'

import { API_BASE_URL as API } from '../../config'

const fmtDate = iso => iso ? new Date(iso).toLocaleDateString('vi-VN') + ' ' + new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—'

const SEVERITY_CFG = {
  LOW: { label: 'Thấp', cls: 'bg-emerald-100 text-emerald-700' },
  MEDIUM: { label: 'Trung bình', cls: 'bg-amber-100 text-amber-700' },
  HIGH: { label: 'Cao', cls: 'bg-orange-100 text-orange-700' },
  CRITICAL: { label: 'Nghiêm trọng', cls: 'bg-red-100 text-red-700' },
}
const STATUS_CFG = {
  OPEN: { label: 'Đang mở', cls: 'bg-blue-100 text-blue-700' },
  REVIEWED: { label: 'Đã xem', cls: 'bg-slate-100 text-slate-600' },
  DISMISSED: { label: 'Bỏ qua', cls: 'bg-gray-100 text-gray-500' },
  ACTION_REQUIRED: { label: 'Cần xử lý', cls: 'bg-red-100 text-red-700' },
  ESCALATED: { label: 'Đã leo thang', cls: 'bg-purple-100 text-purple-700' },
}
const TYPE_VI = {
  USER_PAIR: 'Cặp nghi vấn', TUTOR_CLUSTER: 'Cụm gia sư', STUDENT_CLUSTER: 'Cụm học sinh',
  TRANSACTION_RING: 'Vòng giao dịch', VOUCHER_ABUSE: 'Lạm dụng voucher', REFUND_ABUSE: 'Lạm dụng hoàn tiền',
  WITHDRAWAL_RISK: 'Rủi ro rút tiền', EXTERNAL_PAYMENT_COLLUSION: 'Giao dịch ngoài', MIXED: 'Hỗn hợp',
}
const ANALYZERS = [
  { key: 'PAIR', label: 'Cặp học sinh–gia sư' },
  { key: 'REFUND', label: 'Lạm dụng hoàn tiền' },
  { key: 'WITHDRAWAL', label: 'Rủi ro rút tiền' },
  { key: 'EXTERNAL_PAYMENT', label: 'Giao dịch ngoài' },
  { key: 'TRANSACTION_RING', label: 'Vòng giao dịch' },
  { key: 'VOUCHER', label: 'Voucher (best-effort)' },
]
const asArray = v => Array.isArray(v) ? v : (v ? [v] : [])

export default function FraudIntel({ token }) {
  const [tab, setTab] = useState('reports')
  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <PageHeader title="AI Phát hiện Gian lận — Threat Intel" subtitle="Phát hiện cụm hành vi nghi vấn: cặp thông đồng, lạm dụng hoàn tiền, rủi ro rút tiền, giao dịch ngoài nền tảng. Chỉ tư vấn — admin quyết định." />
      <div className="flex gap-2 mb-6 border-b border-gray-100">
        {[['reports', 'Báo cáo'], ['run', 'Chạy phân tích'], ['entity', 'Tra cứu người dùng']].map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)}
            className={`px-4 py-2.5 text-sm font-semibold transition-colors ${tab === v ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'}`}>{l}</button>
        ))}
      </div>
      {tab === 'reports' && <ReportsTab token={token} />}
      {tab === 'run' && <RunPanel token={token} />}
      {tab === 'entity' && <EntityPanel token={token} />}
    </div>
  )
}

function ReportsTab({ token }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [fSeverity, setFSeverity] = useState('')
  const [fStatus, setFStatus] = useState('')
  const [fType, setFType] = useState('')
  const [fTutor, setFTutor] = useState('')
  const [detailId, setDetailId] = useState(null)
  const limit = 30

  const load = useCallback(() => {
    if (!token) return
    setLoading(true); setError(null)
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (fSeverity) qs.set('severity', fSeverity)
    if (fStatus) qs.set('status', fStatus)
    if (fType) qs.set('reportType', fType)
    if (fTutor.trim()) qs.set('tutorId', fTutor.trim())
    fetch(`${API}/api/admin/fraud-intel/reports?${qs}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(setData)
      .catch(e => setError(`Không thể tải báo cáo (${e})`))
      .finally(() => setLoading(false))
  }, [token, page, fSeverity, fStatus, fType, fTutor])

  useEffect(() => { load() }, [load])

  if (loading && !data) return <Loading label="Đang tải báo cáo gian lận..." />
  if (error) return <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
  if (!data) return null
  const { items, pagination, summary } = data
  const totalPages = Math.max(1, Math.ceil((pagination?.total || 0) / limit))

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Báo cáo mở', value: summary?.open, icon: 'inbox', color: 'bg-blue-50 text-blue-600' },
          { label: 'Critical/High', value: (summary?.critical || 0) + (summary?.high || 0), icon: 'gpp_maybe', color: 'bg-red-50 text-red-600' },
          { label: 'Giao dịch ngoài', value: summary?.external_payment, icon: 'currency_exchange', color: 'bg-orange-50 text-orange-600' },
          { label: 'Rủi ro rút tiền', value: summary?.withdrawal_risk, icon: 'account_balance', color: 'bg-amber-50 text-amber-600' },
          { label: 'Đã xử lý', value: summary?.reviewed, icon: 'task_alt', color: 'bg-emerald-50 text-emerald-600' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className={`w-9 h-9 rounded-lg ${c.color} flex items-center justify-center mb-3`}><span className="material-symbols-outlined text-[18px]">{c.icon}</span></div>
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">{c.label}</p>
            <p className="text-lg font-bold text-gray-900">{c.value ?? 0}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm" value={fSeverity} onChange={e => { setFSeverity(e.target.value); setPage(1) }}>
          <option value="">Tất cả mức độ</option>{Object.entries(SEVERITY_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm" value={fStatus} onChange={e => { setFStatus(e.target.value); setPage(1) }}>
          <option value="">Tất cả trạng thái</option>{Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm" value={fType} onChange={e => { setFType(e.target.value); setPage(1) }}>
          <option value="">Tất cả loại</option>{Object.entries(TYPE_VI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input value={fTutor} onChange={e => { setFTutor(e.target.value); setPage(1) }} placeholder="Tutor ID..." className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-48" />
        <span className="ml-auto self-center text-xs text-gray-400">{pagination?.total ?? 0} bản ghi</span>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {items.length === 0 ? (
          <div className="p-10"><EmptyState icon="shield" title="Chưa có báo cáo gian lận" description="Dùng tab “Chạy phân tích” để quét các cụm hành vi nghi vấn." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50"><tr>{['Thời gian', 'Loại', 'Mức độ', 'Điểm', 'Tin cậy', 'Đối tượng', 'Tóm tắt', 'Trạng thái', ''].map((h, i) => <th key={i} className="py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-50">
                {items.map(it => {
                  const sv = SEVERITY_CFG[it.severity] || SEVERITY_CFG.LOW
                  const st = STATUS_CFG[it.status] || STATUS_CFG.OPEN
                  return (
                    <tr key={it.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 text-xs text-gray-400 whitespace-nowrap">{fmtDate(it.created_at)}</td>
                      <td className="py-3 px-4 text-xs text-gray-600">{TYPE_VI[it.report_type] || it.report_type}</td>
                      <td className="py-3 px-4"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${sv.cls}`}>{sv.label}</span></td>
                      <td className="py-3 px-4 text-sm font-bold text-gray-800">{Math.round(Number(it.risk_score || 0))}</td>
                      <td className="py-3 px-4 text-xs text-gray-500">{Math.round(Number(it.confidence || 0))}%</td>
                      <td className="py-3 px-4 text-sm text-gray-800">{it.tutor_name || it.primary_name || '—'}</td>
                      <td className="py-3 px-4 text-xs text-gray-600 max-w-[260px] truncate" title={it.summary || ''}>{it.summary || '—'}</td>
                      <td className="py-3 px-4"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${st.cls}`}>{st.label}</span></td>
                      <td className="py-3 px-4"><button onClick={() => setDetailId(it.id)} className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100">Chi tiết</button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">← Trước</button>
          <span className="text-xs text-gray-400">Trang {page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">Sau →</button>
        </div>
      </div>

      {detailId && <DetailModal token={token} id={detailId} onClose={() => setDetailId(null)} onChanged={load} />}
    </>
  )
}

function DetailModal({ token, id, onClose, onChanged }) {
  const [d, setD] = useState(null)
  const [loading, setLoading] = useState(true)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetch(`${API}/api/admin/fraud-intel/reports/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(j => { setD(j); setNote(j.admin_note || '') })
      .catch(() => setD(null)).finally(() => setLoading(false))
  }, [id, token])

  const setStatus = async (status) => {
    setBusy(true)
    try {
      const r = await fetch(`${API}/api/admin/fraud-intel/reports/${id}/status`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, adminNote: note }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { alert(j.message || 'Thất bại'); return }
      onChanged?.(); onClose()
    } catch { alert('Lỗi kết nối') } finally { setBusy(false) }
  }

  const copyReport = async () => {
    if (!d) return
    const text = `BÁO CÁO GIAN LẬN (AI — THAM KHẢO)\nLoại: ${TYPE_VI[d.report_type] || d.report_type}\nMức độ: ${d.severity} · Điểm: ${Math.round(Number(d.risk_score || 0))} · Tin cậy: ${Math.round(Number(d.confidence || 0))}%\n${d.title || ''}\n${d.summary || ''}\nLý do: ${d.reason_summary || ''}\nCờ: ${asArray(d.risk_flags).join(', ')}`
    try { await navigator.clipboard.writeText(text); alert('Đã copy báo cáo.') } catch { alert('Không thể copy.') }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h3 className="text-lg font-bold text-gray-900">Chi tiết báo cáo gian lận</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><span className="material-symbols-outlined text-[20px] text-gray-500">close</span></button>
        </div>
        {loading ? <div className="p-10 flex justify-center text-gray-400"><span className="material-symbols-outlined animate-spin">progress_activity</span></div>
          : !d ? <div className="p-8 text-center text-gray-400">Không tải được chi tiết.</div>
            : (
              <div className="p-6 space-y-4 text-sm">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${(SEVERITY_CFG[d.severity] || SEVERITY_CFG.LOW).cls}`}>Rủi ro: {(SEVERITY_CFG[d.severity] || {}).label}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${(STATUS_CFG[d.status] || STATUS_CFG.OPEN).cls}`}>{(STATUS_CFG[d.status] || {}).label}</span>
                  <span className="text-xs text-gray-400">{TYPE_VI[d.report_type] || d.report_type} · Điểm {Math.round(Number(d.risk_score || 0))} · Tin cậy {Math.round(Number(d.confidence || 0))}% · {d.model_used}</span>
                </div>
                {d.title && <p className="text-base font-bold text-gray-900">{d.title}</p>}
                <div><p className="text-xs text-gray-400 uppercase font-semibold mb-1">Tóm tắt</p><p className="text-gray-800 bg-gray-50 rounded-lg p-3">{d.summary}</p></div>
                {d.reason_summary && <div><p className="text-xs text-gray-400 uppercase font-semibold mb-1">Lý do</p><p className="text-gray-700 bg-gray-50 rounded-lg p-3">{d.reason_summary}</p></div>}
                <div><p className="text-xs text-gray-400 uppercase font-semibold mb-1">Cờ rủi ro</p><div className="flex flex-wrap gap-1.5">{asArray(d.risk_flags).map((f, i) => <span key={i} className="px-2 py-0.5 rounded bg-red-50 text-red-600 text-xs font-semibold">{f}</span>)}</div></div>
                {asArray(d.evidence).length > 0 && <div><p className="text-xs text-gray-400 uppercase font-semibold mb-1">Bằng chứng</p><div className="space-y-1">{asArray(d.evidence).map((e, i) => <div key={i} className="flex justify-between bg-gray-50 rounded px-3 py-1.5 text-xs"><span className="text-gray-500">{e.label}</span><span className="font-semibold text-gray-800">{String(e.value)}</span></div>)}</div></div>}
                {asArray(d.related_entities).length > 0 && <div><p className="text-xs text-gray-400 uppercase font-semibold mb-1">Đối tượng liên quan</p><div className="flex flex-wrap gap-1.5">{asArray(d.related_entities).map((r, i) => <span key={i} className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs">{r.type}: {r.name || r.id}</span>)}</div></div>}
                {d.financial_trace && Object.keys(d.financial_trace).length > 0 && <div><p className="text-xs text-gray-400 uppercase font-semibold mb-1">Dấu vết tài chính</p><pre className="text-[11px] text-gray-600 bg-gray-50 rounded-lg p-3 overflow-x-auto">{JSON.stringify(d.financial_trace, null, 2)}</pre></div>}
                {asArray(d.suggested_actions).length > 0 && <div><p className="text-xs text-gray-400 uppercase font-semibold mb-1">Hành động gợi ý (tư vấn)</p>{asArray(d.suggested_actions).map((a, i) => <div key={i} className="text-xs text-gray-700">• {a.label} <span className="font-mono text-blue-400">{a.type}</span></div>)}</div>}
                {asArray(d.limitations).length > 0 && <div><p className="text-xs text-gray-400 uppercase font-semibold mb-1">Giới hạn</p><ul className="text-xs text-gray-400 space-y-0.5">{asArray(d.limitations).map((l, i) => <li key={i}>• {l}</li>)}</ul></div>}
                <div><p className="text-xs text-gray-400 uppercase font-semibold mb-1">Ghi chú admin</p><textarea value={note} onChange={e => setNote(e.target.value)} rows={2} className="w-full border border-gray-200 rounded-lg p-2 text-sm resize-none focus:outline-none focus:border-primary" /></div>
                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                  <button onClick={() => setStatus('REVIEWED')} disabled={busy} className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 disabled:opacity-50">Đánh dấu đã xem</button>
                  <button onClick={() => setStatus('DISMISSED')} disabled={busy} className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-semibold hover:bg-gray-200 disabled:opacity-50">Bỏ qua</button>
                  <button onClick={() => setStatus('ACTION_REQUIRED')} disabled={busy} className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-xs font-semibold hover:bg-red-200 disabled:opacity-50">Cần xử lý</button>
                  <button onClick={() => setStatus('ESCALATED')} disabled={busy} className="px-3 py-1.5 rounded-lg bg-purple-100 text-purple-700 text-xs font-semibold hover:bg-purple-200 disabled:opacity-50">Escalate</button>
                  <button onClick={copyReport} className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">content_copy</span>Copy báo cáo</button>
                </div>
              </div>
            )}
      </div>
    </div>
  )
}

function RunPanel({ token }) {
  const [periodDays, setPeriodDays] = useState(30)
  const [limit, setLimit] = useState(50)
  const [dryRun, setDryRun] = useState(false)
  const [selected, setSelected] = useState(ANALYZERS.map(a => a.key))
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const toggle = (k) => setSelected(s => s.includes(k) ? s.filter(x => x !== k) : [...s, k])

  const run = async () => {
    setLoading(true); setResult(null)
    try {
      const r = await fetch(`${API}/api/admin/fraud-intel/run`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ periodDays: Number(periodDays), limit: Number(limit), dryRun, analyzers: selected }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { alert(j.message || `Thất bại (${r.status})`); return }
      setResult(j)
    } catch { alert('Lỗi kết nối') } finally { setLoading(false) }
  }

  return (
    <div className="max-w-2xl bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <div className="grid grid-cols-2 gap-4 mb-4">
        <label className="text-sm">Số ngày phân tích<input type="number" value={periodDays} onChange={e => setPeriodDays(e.target.value)} className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2" /></label>
        <label className="text-sm">Giới hạn quét<input type="number" value={limit} onChange={e => setLimit(e.target.value)} className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2" /></label>
      </div>
      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Bộ phân tích</p>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {ANALYZERS.map(a => (
          <label key={a.key} className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={selected.includes(a.key)} onChange={() => toggle(a.key)} />{a.label}
          </label>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-700 mb-4"><input type="checkbox" checked={dryRun} onChange={e => setDryRun(e.target.checked)} />Chạy thử (dry-run — không lưu báo cáo)</label>
      <button onClick={run} disabled={loading || selected.length === 0} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50">
        <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>{loading ? 'progress_activity' : 'radar'}</span>
        {loading ? 'Đang phân tích...' : 'Chạy phân tích gian lận'}
      </button>
      {result && (
        <div className="mt-5 bg-gray-50 rounded-lg p-4 text-sm">
          <p className="font-semibold text-gray-800 mb-2">Kết quả {result.dry_run ? '(dry-run)' : ''}</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-600">
            <span>Cặp đã quét: <b>{result.scanned_pairs}</b></span>
            <span>Người dùng đã quét: <b>{result.scanned_users}</b></span>
            <span>Giao dịch đã quét: <b>{result.scanned_transactions}</b></span>
            <span>Báo cáo tạo mới: <b>{result.reports_created}</b></span>
            <span>Báo cáo cập nhật: <b>{result.reports_updated}</b></span>
            <span>Bỏ qua / lỗi: <b>{result.skipped} / {result.failed}</b></span>
          </div>
          {asArray(result.limitations).length > 0 && <div className="mt-2 text-xs text-amber-600">{asArray(result.limitations).map((l, i) => <div key={i}>• {l}</div>)}</div>}
        </div>
      )}
    </div>
  )
}

function EntityPanel({ token }) {
  const [entityType, setEntityType] = useState('tutor')
  const [entityId, setEntityId] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    if (!entityId.trim()) { alert('Nhập entity ID.'); return }
    setLoading(true); setData(null)
    try {
      const r = await fetch(`${API}/api/admin/fraud-intel/entity/${entityType}/${entityId.trim()}`, { headers: { Authorization: `Bearer ${token}` } })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { alert(j.message || `Thất bại (${r.status})`); return }
      setData(j)
    } catch { alert('Lỗi kết nối') } finally { setLoading(false) }
  }

  const rs = data?.risk_summary
  return (
    <div className="max-w-2xl">
      <div className="flex gap-2 mb-6">
        <select value={entityType} onChange={e => setEntityType(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <option value="tutor">Gia sư</option><option value="student">Học sinh</option><option value="user">Người dùng</option>
        </select>
        <input value={entityId} onChange={e => setEntityId(e.target.value)} placeholder="Entity ID (UUID)..." className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <button onClick={load} disabled={loading} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 whitespace-nowrap">{loading ? 'Đang tải...' : 'Xem rủi ro người dùng'}</button>
      </div>
      {data && (
        <div className="space-y-4">
          {rs && typeof rs.risk_score === 'number' && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <p className="text-sm font-semibold text-gray-700">Điểm rủi ro hiện tại: <span className="text-lg font-bold">{Math.round(rs.risk_score)}</span> · <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${(SEVERITY_CFG[rs.severity] || SEVERITY_CFG.LOW).cls}`}>{(SEVERITY_CFG[rs.severity] || {}).label}</span></p>
              {asArray(rs.risk_flags).length > 0 && <div className="flex flex-wrap gap-1.5 mt-2">{asArray(rs.risk_flags).map((f, i) => <span key={i} className="px-2 py-0.5 rounded bg-red-50 text-red-600 text-xs font-semibold">{f}</span>)}</div>}
            </div>
          )}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 text-sm font-semibold text-gray-700">Báo cáo liên quan ({asArray(data.reports).length})</div>
            {asArray(data.reports).length === 0 ? <div className="p-6 text-sm text-gray-400 text-center">Không có báo cáo liên quan.</div>
              : <div className="divide-y divide-gray-50">{asArray(data.reports).map(r => (
                <div key={r.id} className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${(SEVERITY_CFG[r.severity] || SEVERITY_CFG.LOW).cls}`}>{(SEVERITY_CFG[r.severity] || {}).label}</span>
                    <span className="text-xs text-gray-500">{TYPE_VI[r.report_type] || r.report_type} · điểm {Math.round(Number(r.risk_score || 0))}</span>
                    <span className="text-xs text-gray-300 ml-auto">{fmtDate(r.created_at)}</span>
                  </div>
                  <p className="text-sm text-gray-700">{r.summary}</p>
                </div>
              ))}</div>}
          </div>
        </div>
      )}
    </div>
  )
}

function Loading({ label }) {
  return <div className="flex items-center justify-center py-24 text-gray-400"><span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>{label}</div>
}
