import { useState, useEffect, useCallback } from 'react'
import { PageHeader, EmptyState } from '../transactions/components'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

const fmtDate = iso => iso
  ? new Date(iso).toLocaleDateString('vi-VN') + ' ' + new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  : '—'

const SEVERITY_CFG = {
  LOW:      { label: 'Thấp',        cls: 'bg-emerald-100 text-emerald-700' },
  MEDIUM:   { label: 'Trung bình',  cls: 'bg-amber-100 text-amber-700' },
  HIGH:     { label: 'Cao',         cls: 'bg-orange-100 text-orange-700' },
  CRITICAL: { label: 'Nghiêm trọng',cls: 'bg-red-100 text-red-700' },
}
const STATUS_CFG = {
  OPEN:            { label: 'Đang mở',    cls: 'bg-blue-100 text-blue-700' },
  REVIEWED:        { label: 'Đã xem',     cls: 'bg-slate-100 text-slate-600' },
  DISMISSED:       { label: 'Bỏ qua',     cls: 'bg-gray-100 text-gray-500' },
  ACTION_REQUIRED: { label: 'Cần xử lý',  cls: 'bg-red-100 text-red-700' },
}
const CATEGORY_VI = {
  EXTERNAL_PAYMENT_ATTEMPT: 'Giao dịch ngoài',
  TOXIC_LANGUAGE: 'Ngôn từ tiêu cực',
  SPAM_OR_SCAM: 'Spam/Lừa đảo',
  LOW_TEACHING_QUALITY: 'Chất lượng thấp',
  POSITIVE_TEACHING_SIGNAL: 'Tích cực',
  PRIVACY_RISK: 'Lộ thông tin',
}
const asArray = v => Array.isArray(v) ? v : (v ? [v] : [])

export default function SemanticModeration({ token }) {
  const [tab, setTab] = useState('reports') // reports | analyze | reputation
  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <PageHeader title="AI Kiểm Duyệt Nội Dung" subtitle="Phân tích ngữ nghĩa đánh giá & tin nhắn — phát hiện giao dịch ngoài nền tảng, ngôn từ tiêu cực, spam. Chỉ tư vấn, admin quyết định." />
      <div className="flex gap-2 mb-6 border-b border-gray-100">
        {[['reports', 'Báo cáo'], ['analyze', 'Phân tích thử'], ['reputation', 'Điểm uy tín AI']].map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)}
            className={`px-4 py-2.5 text-sm font-semibold transition-colors ${tab === v ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'}`}>
            {l}
          </button>
        ))}
      </div>
      {tab === 'reports'    && <ReportsTab token={token} />}
      {tab === 'analyze'    && <ManualAnalyzer token={token} />}
      {tab === 'reputation' && <ReputationPanel token={token} />}
    </div>
  )
}

// ─── Reports tab ──────────────────────────────────────────────────────────────
function ReportsTab({ token }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [page, setPage]       = useState(1)
  const [fSeverity, setFSeverity] = useState('')
  const [fStatus, setFStatus]     = useState('')
  const [fCategory, setFCategory] = useState('')
  const [fSource, setFSource]     = useState('')
  const [running, setRunning] = useState(false)
  const [detailId, setDetailId] = useState(null)
  const limit = 30

  const load = useCallback(() => {
    if (!token) return
    setLoading(true); setError(null)
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (fSeverity) qs.set('severity', fSeverity)
    if (fStatus)   qs.set('status', fStatus)
    if (fCategory) qs.set('category', fCategory)
    if (fSource)   qs.set('sourceType', fSource)
    fetch(`${API}/api/admin/semantic-moderation/reports?${qs}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(setData)
      .catch(e => setError(`Không thể tải báo cáo (${e})`))
      .finally(() => setLoading(false))
  }, [token, page, fSeverity, fStatus, fCategory, fSource])

  useEffect(() => { load() }, [load])

  const runPending = async () => {
    setRunning(true)
    try {
      const r = await fetch(`${API}/api/admin/semantic-moderation/run-pending`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { alert(j.message || `Thất bại (${r.status})`); return }
      alert(`Đã quét ${j.reviews_scanned} đánh giá, ${j.chat_scanned} tin nhắn — tạo ${j.created} báo cáo, ${j.tutors_scored} gia sư được chấm điểm.${(j.limitations || []).length ? '\n' + j.limitations.join('\n') : ''}`)
      load()
    } catch { alert('Lỗi kết nối máy chủ') } finally { setRunning(false) }
  }

  if (loading && !data) return <Loading label="Đang tải báo cáo..." />
  if (error) return <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
  if (!data) return null

  const { items, pagination, summary } = data
  const totalPages = Math.max(1, Math.ceil((pagination?.total || 0) / limit))

  return (
    <>
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Báo cáo mở',    value: summary?.open,             icon: 'inbox',        color: 'bg-blue-50 text-blue-600' },
          { label: 'Rủi ro cao',    value: summary?.high_risk,        icon: 'priority_high',color: 'bg-red-50 text-red-600' },
          { label: 'Giao dịch ngoài', value: summary?.external_payment, icon: 'currency_exchange', color: 'bg-orange-50 text-orange-600' },
          { label: 'Toxic/Spam',    value: summary?.toxic_spam,       icon: 'report',       color: 'bg-amber-50 text-amber-600' },
          { label: 'Đã xử lý',      value: summary?.handled,          icon: 'task_alt',     color: 'bg-emerald-50 text-emerald-600' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className={`w-9 h-9 rounded-lg ${c.color} flex items-center justify-center mb-3`}>
              <span className="material-symbols-outlined text-[18px]">{c.icon}</span>
            </div>
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">{c.label}</p>
            <p className="text-lg font-bold text-gray-900">{c.value ?? 0}</p>
          </div>
        ))}
      </div>

      {/* Filters + run */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm" value={fSeverity} onChange={e => { setFSeverity(e.target.value); setPage(1) }}>
          <option value="">Tất cả mức độ</option>
          {Object.entries(SEVERITY_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm" value={fStatus} onChange={e => { setFStatus(e.target.value); setPage(1) }}>
          <option value="">Tất cả trạng thái</option>
          {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm" value={fCategory} onChange={e => { setFCategory(e.target.value); setPage(1) }}>
          <option value="">Tất cả danh mục</option>
          {Object.entries(CATEGORY_VI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm" value={fSource} onChange={e => { setFSource(e.target.value); setPage(1) }}>
          <option value="">Tất cả nguồn</option>
          <option value="REVIEW">Đánh giá</option>
          <option value="CHAT_MESSAGE">Tin nhắn</option>
          <option value="TEXT">Nhập tay</option>
          <option value="TUTOR_PROFILE">Hồ sơ gia sư</option>
        </select>
        <button onClick={runPending} disabled={running}
          className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50">
          <span className={`material-symbols-outlined text-[18px] ${running ? 'animate-spin' : ''}`}>{running ? 'progress_activity' : 'radar'}</span>
          {running ? 'Đang quét...' : 'Chạy quét'}
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {items.length === 0 ? (
          <div className="p-10"><EmptyState icon="fact_check" title="Chưa có báo cáo" description="Nhấn “Chạy quét” để phân tích đánh giá/tin nhắn, hoặc dùng tab “Phân tích thử”." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>{['Thời gian', 'Nguồn', 'Gia sư/Người dùng', 'Mức độ', 'Danh mục', 'Tóm tắt', 'Trạng thái', ''].map((h, i) =>
                  <th key={i} className="py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase whitespace-nowrap">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map(it => {
                  const sv = SEVERITY_CFG[it.severity] || SEVERITY_CFG.LOW
                  const st = STATUS_CFG[it.status] || STATUS_CFG.OPEN
                  return (
                    <tr key={it.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 text-xs text-gray-400 whitespace-nowrap">{fmtDate(it.created_at)}</td>
                      <td className="py-3 px-4 text-xs text-gray-600">{it.source_type}</td>
                      <td className="py-3 px-4 text-sm text-gray-800">{it.tutor_name || it.target_name || '—'}</td>
                      <td className="py-3 px-4"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${sv.cls}`}>{sv.label}</span></td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {asArray(it.categories).slice(0, 3).map((c, i) => <span key={i} className="inline-flex px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] font-semibold">{CATEGORY_VI[c] || c}</span>)}
                        </div>
                      </td>
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

// ─── Detail modal ─────────────────────────────────────────────────────────────
function DetailModal({ token, id, onClose, onChanged }) {
  const [d, setD] = useState(null)
  const [loading, setLoading] = useState(true)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetch(`${API}/api/admin/semantic-moderation/reports/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(j => { setD(j); setNote(j.admin_note || '') })
      .catch(() => setD(null))
      .finally(() => setLoading(false))
  }, [id, token])

  const setStatus = async (status) => {
    setBusy(true)
    try {
      const r = await fetch(`${API}/api/admin/semantic-moderation/reports/${id}/status`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, adminNote: note }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { alert(j.message || 'Thất bại'); return }
      onChanged?.(); onClose()
    } catch { alert('Lỗi kết nối') } finally { setBusy(false) }
  }

  const copyWarning = async () => {
    if (!d) return
    const text = `[NHÁP CẢNH BÁO — ADMIN DUYỆT TRƯỚC KHI GỬI]\n\nHệ thống ghi nhận nội dung có dấu hiệu: ${asArray(d.categories).map(c => CATEGORY_VI[c] || c).join(', ')}.\nTóm tắt: ${d.summary}\n\nĐề nghị bạn tuân thủ quy định của EduX. Mọi giao dịch cần thực hiện qua nền tảng.\n\n(Đội ngũ EduX)`
    try { await navigator.clipboard.writeText(text); alert('Đã copy nháp cảnh báo.') } catch { alert('Không thể copy.') }
  }

  const scores = d?.scores || {}
  const scoreRows = [
    ['Kiên nhẫn', scores.patience], ['Thân thiện', scores.friendliness], ['Sư phạm', scores.teaching_quality],
    ['Chuyên nghiệp', scores.professionalism], ['Rủi ro giao dịch ngoài', scores.external_payment_risk],
    ['Rủi ro toxic', scores.toxicity_risk], ['Rủi ro spam', scores.spam_risk],
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h3 className="text-lg font-bold text-gray-900">Chi tiết kiểm duyệt</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><span className="material-symbols-outlined text-[20px] text-gray-500">close</span></button>
        </div>
        {loading ? <div className="p-10 flex justify-center text-gray-400"><span className="material-symbols-outlined animate-spin">progress_activity</span></div>
          : !d ? <div className="p-8 text-center text-gray-400">Không tải được chi tiết.</div>
          : (
            <div className="p-6 space-y-4 text-sm">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${(SEVERITY_CFG[d.severity] || SEVERITY_CFG.LOW).cls}`}>Rủi ro: {(SEVERITY_CFG[d.severity] || {}).label}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${(STATUS_CFG[d.status] || STATUS_CFG.OPEN).cls}`}>{(STATUS_CFG[d.status] || {}).label}</span>
                <span className="text-xs text-gray-400">{d.source_type} · {d.model_used}</span>
              </div>
              <div><p className="text-xs text-gray-400 uppercase font-semibold mb-1">Tóm tắt</p><p className="text-gray-800 bg-gray-50 rounded-lg p-3">{d.summary}</p></div>
              <div>
                <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Danh mục</p>
                <div className="flex flex-wrap gap-1.5">{asArray(d.categories).map((c, i) => <span key={i} className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs font-semibold">{CATEGORY_VI[c] || c}</span>)}</div>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Điểm số</p>
                <div className="space-y-1.5">{scoreRows.map(([label, val]) => <ScoreBar key={label} label={label} value={Number(val || 0)} risk={label.startsWith('Rủi ro')} />)}</div>
              </div>
              {asArray(d.highlighted_text).length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Đoạn được đánh dấu (đã che thông tin nhạy cảm)</p>
                  <div className="flex flex-wrap gap-1.5">{asArray(d.highlighted_text).map((h, i) => <span key={i} className="px-2 py-0.5 rounded bg-yellow-50 text-yellow-800 text-xs border border-yellow-200">{typeof h === 'string' ? h : h.text}</span>)}</div>
                </div>
              )}
              {asArray(d.evidence).length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Bằng chứng</p>
                  <div className="space-y-1">{asArray(d.evidence).map((e, i) => <div key={i} className="flex justify-between bg-gray-50 rounded px-3 py-1.5 text-xs"><span className="text-gray-500">{e.label}</span><span className="font-semibold text-gray-800">{String(e.value)}</span></div>)}</div>
                </div>
              )}
              {asArray(d.suggested_actions).length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Hành động gợi ý (tư vấn)</p>
                  <div className="space-y-1">{asArray(d.suggested_actions).map((a, i) => <div key={i} className="bg-blue-50/60 rounded px-3 py-1.5"><span className="text-sm font-semibold text-gray-800">{a.label}</span> <span className="text-[10px] font-mono text-blue-400">{a.type}</span>{a.reason && <p className="text-xs text-gray-500">{a.reason}</p>}</div>)}</div>
                </div>
              )}
              {asArray(d.limitations).length > 0 && (
                <div><p className="text-xs text-gray-400 uppercase font-semibold mb-1">Giới hạn phân tích</p><ul className="text-xs text-gray-400 space-y-0.5">{asArray(d.limitations).map((l, i) => <li key={i}>• {l}</li>)}</ul></div>
              )}
              <div>
                <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Ghi chú admin</p>
                <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Ghi chú xử lý..." className="w-full border border-gray-200 rounded-lg p-2 text-sm resize-none focus:outline-none focus:border-primary" />
              </div>
              <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                <button onClick={() => setStatus('REVIEWED')} disabled={busy} className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 disabled:opacity-50">Đánh dấu đã xem</button>
                <button onClick={() => setStatus('DISMISSED')} disabled={busy} className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-semibold hover:bg-gray-200 disabled:opacity-50">Bỏ qua</button>
                <button onClick={() => setStatus('ACTION_REQUIRED')} disabled={busy} className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-xs font-semibold hover:bg-red-200 disabled:opacity-50">Cần xử lý</button>
                <button onClick={copyWarning} className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">content_copy</span>Copy cảnh báo</button>
              </div>
            </div>
          )}
      </div>
    </div>
  )
}

// ─── Manual analyzer ──────────────────────────────────────────────────────────
function ManualAnalyzer({ token }) {
  const [text, setText] = useState('')
  const [tutorId, setTutorId] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const analyze = async () => {
    if (!text.trim()) { alert('Nhập nội dung cần phân tích.'); return }
    setLoading(true); setResult(null)
    try {
      const r = await fetch(`${API}/api/admin/semantic-moderation/analyze`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sourceType: 'TEXT', text, tutorId: tutorId.trim() || undefined }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { alert(j.message || `Thất bại (${r.status})`); return }
      setResult(j)
    } catch { alert('Lỗi kết nối') } finally { setLoading(false) }
  }

  const sv = result ? (SEVERITY_CFG[result.severity] || SEVERITY_CFG.LOW) : null

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <p className="text-sm font-semibold text-gray-700 mb-3">Nhập nội dung để phân tích thử</p>
        <textarea value={text} onChange={e => setText(e.target.value)} rows={6} placeholder="Dán nội dung đánh giá / tin nhắn..." className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:border-primary" />
        <input value={tutorId} onChange={e => setTutorId(e.target.value)} placeholder="Tutor ID (tuỳ chọn)" className="w-full mt-3 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
        <button onClick={analyze} disabled={loading} className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50">
          <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>{loading ? 'progress_activity' : 'science'}</span>
          {loading ? 'Đang phân tích...' : 'Phân tích thử'}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        {!result ? (
          <div className="text-center py-12 text-gray-400"><span className="material-symbols-outlined text-[36px]">psychology</span><p className="text-sm mt-2">Kết quả phân tích sẽ hiện ở đây.</p></div>
        ) : (
          <div className="space-y-3 text-sm">
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${sv.cls}`}>Rủi ro: {sv.label}</span>
            <p className="text-gray-800">{result.summary}</p>
            <div className="flex flex-wrap gap-1.5">{asArray(result.categories).map((c, i) => <span key={i} className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs font-semibold">{CATEGORY_VI[c] || c}</span>)}</div>
            <div className="space-y-1.5 pt-2">
              {[['Kiên nhẫn', result.scores?.patience], ['Sư phạm', result.scores?.teaching_quality], ['Rủi ro giao dịch ngoài', result.scores?.external_payment_risk], ['Rủi ro toxic', result.scores?.toxicity_risk]].map(([l, v]) =>
                <ScoreBar key={l} label={l} value={Number(v || 0)} risk={l.startsWith('Rủi ro')} />)}
            </div>
            {asArray(result.suggested_actions).length > 0 && (
              <div className="pt-2"><p className="text-xs text-gray-400 uppercase font-semibold mb-1">Hành động gợi ý</p>
                {asArray(result.suggested_actions).map((a, i) => <div key={i} className="text-xs text-gray-700">• {a.label} <span className="font-mono text-blue-400">{a.type}</span></div>)}</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Reputation panel ─────────────────────────────────────────────────────────
function ReputationPanel({ token }) {
  const [tutorId, setTutorId] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    if (!tutorId.trim()) { alert('Nhập Tutor ID.'); return }
    setLoading(true); setData(null)
    try {
      const r = await fetch(`${API}/api/admin/tutors/${tutorId.trim()}/semantic-reputation`, { headers: { Authorization: `Bearer ${token}` } })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { alert(j.message || `Thất bại (${r.status})`); return }
      setData(j)
    } catch { alert('Lỗi kết nối') } finally { setLoading(false) }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex gap-2 mb-6">
        <input value={tutorId} onChange={e => setTutorId(e.target.value)} placeholder="Nhập Tutor ID (UUID)..." className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
        <button onClick={load} disabled={loading} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 whitespace-nowrap">
          {loading ? 'Đang tải...' : 'Xem điểm uy tín AI'}
        </button>
      </div>
      {data && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <p className="text-sm text-gray-500 mb-1">{data.latest_score?.summary || '—'}</p>
          <p className="text-xs text-gray-400 mb-4">{data.latest_score?.report_count ?? 0} đánh giá · {data.latest_score?.computed_on_the_fly ? 'tính trực tiếp' : 'điểm đã lưu'}</p>
          <div className="space-y-2.5">
            {asArray(data.radar).map((r, i) => <ScoreBar key={i} label={r.label} value={Number(r.value || 0)} risk={r.label.startsWith('Rủi ro')} big />)}
          </div>
        </div>
      )}
      {!data && <p className="text-sm text-gray-400">Nhập ID gia sư và nhấn nút để xem điểm uy tín theo phân tích ngữ nghĩa (dạng thanh điểm).</p>}
    </div>
  )
}

// ─── Shared: horizontal score bar (no chart dependency) ───────────────────────
function ScoreBar({ label, value, risk, big }) {
  const pct = Math.max(0, Math.min(100, value))
  const color = risk
    ? (pct >= 60 ? 'bg-red-500' : pct >= 30 ? 'bg-amber-500' : 'bg-emerald-500')
    : (pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500')
  return (
    <div>
      <div className="flex justify-between text-xs mb-0.5">
        <span className="text-gray-600">{label}</span>
        <span className="font-semibold text-gray-800">{pct}</span>
      </div>
      <div className={`w-full bg-gray-100 rounded-full overflow-hidden ${big ? 'h-2.5' : 'h-2'}`}>
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function Loading({ label }) {
  return <div className="flex items-center justify-center py-24 text-gray-400"><span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>{label}</div>
}
