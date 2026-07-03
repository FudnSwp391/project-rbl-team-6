import { useState, useEffect, useCallback, useRef } from 'react'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

const RISK_CFG = {
  LOW:      { label: 'Thấp',        cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  MEDIUM:   { label: 'Trung bình',  cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  HIGH:     { label: 'Cao',         cls: 'bg-orange-100 text-orange-700 border-orange-200' },
  CRITICAL: { label: 'Nghiêm trọng',cls: 'bg-red-100 text-red-700 border-red-200' },
}

const ENTITY_TYPES = [
  { value: 'PAGE',        label: 'Trang hiện tại' },
  { value: 'TUTOR',       label: 'Gia sư' },
  { value: 'STUDENT',     label: 'Học sinh' },
  { value: 'DISPUTE',     label: 'Khiếu nại' },
  { value: 'BOOKING',     label: 'Buổi học' },
  { value: 'TRANSACTION', label: 'Giao dịch' },
]

const ACTION_ICON = {
  WATCHLIST: 'visibility', MANUAL_REVIEW: 'gavel', SEND_WARNING_DRAFT: 'edit_note',
  REQUEST_MORE_EVIDENCE: 'attach_file', REVIEW_TUTOR_QUALITY: 'workspace_premium',
  REVIEW_REFUND_PATTERN: 'account_balance_wallet', NO_ACTION: 'check_circle',
}

const asArray = v => Array.isArray(v) ? v : (v ? [v] : [])
const fmtDate = iso => iso ? new Date(iso).toLocaleString('vi-VN') : '—'

export default function AdminCopilot({ token, pageKey }) {
  const [open, setOpen]         = useState(false)
  const [tab, setTab]           = useState('analyze') // 'analyze' | 'history'
  const [entityType, setEntityType] = useState('PAGE')
  const [entityId, setEntityId] = useState('')
  const [loading, setLoading]   = useState(false)
  const [report, setReport]     = useState(null)
  const [error, setError]       = useState(null)
  const [history, setHistory]   = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [copied, setCopied]     = useState('')
  const analyzeRef = useRef(null)

  const analyze = useCallback(async (type, id) => {
    if (!token) return
    setLoading(true); setError(null); setReport(null)
    try {
      const r = await fetch(`${API}/api/admin/copilot/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ entityType: type, entityId: id || null, pageKey, pageContext: {} }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { setError(j.message || `Phân tích thất bại (${r.status})`); return }
      setReport(j)
    } catch {
      setError('Lỗi kết nối máy chủ')
    } finally {
      setLoading(false)
    }
  }, [token, pageKey])
  analyzeRef.current = analyze

  // Allow other admin views to trigger a scoped analysis via a window event.
  useEffect(() => {
    const handler = (e) => {
      const { entityType: t, entityId: id } = e.detail || {}
      if (!t) return
      setOpen(true); setTab('analyze')
      setEntityType(t); setEntityId(id ? String(id) : '')
      analyzeRef.current?.(t, id)
    }
    window.addEventListener('admin-copilot:analyze', handler)
    return () => window.removeEventListener('admin-copilot:analyze', handler)
  }, [])

  const loadHistory = useCallback(() => {
    if (!token) return
    setHistoryLoading(true)
    fetch(`${API}/api/admin/copilot/history?limit=30`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => setHistory(d.items || []))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false))
  }, [token])

  useEffect(() => { if (open && tab === 'history') loadHistory() }, [open, tab, loadHistory])

  const openDetail = async (id) => {
    setLoading(true); setError(null)
    try {
      const r = await fetch(`${API}/api/admin/copilot/history/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { setError(j.message || 'Không tải được chi tiết'); return }
      setReport(j); setTab('analyze')
    } catch {
      setError('Lỗi kết nối')
    } finally {
      setLoading(false)
    }
  }

  const copy = async (kind) => {
    if (!report) return
    const findings = asArray(report.key_findings).map(f => `- ${f}`).join('\n')
    let text
    if (kind === 'warning') {
      text = `[NHÁP CẢNH BÁO — ADMIN DUYỆT TRƯỚC KHI GỬI]\n\nQua rà soát hệ thống, chúng tôi ghi nhận:\n${findings}\n\nĐề nghị bạn cải thiện và tuân thủ quy định của EduX. Đây là cảnh báo mang tính nhắc nhở.\n\n(Trân trọng, Đội ngũ EduX)`
    } else {
      text = `GHI CHÚ ADMIN\nMức rủi ro: ${report.risk_level} · Độ tin cậy: ${report.confidence}%\nTóm tắt: ${report.summary}\nPhát hiện:\n${findings}`
    }
    try { await navigator.clipboard.writeText(text); setCopied(kind); setTimeout(() => setCopied(''), 2000) }
    catch { alert('Không thể sao chép vào clipboard.') }
  }

  const risk = report ? (RISK_CFG[report.risk_level] || RISK_CFG.LOW) : null

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-[900] flex items-center gap-2 px-4 py-3 rounded-full bg-primary text-white shadow-lg hover:bg-primary/90 transition-all"
          title="AI Copilot"
        >
          <span className="material-symbols-outlined text-[20px]">smart_toy</span>
          <span className="text-sm font-semibold">AI Copilot</span>
        </button>
      )}

      {/* Drawer */}
      {open && (
        <div className="fixed inset-0 z-[900] flex justify-end">
          <div className="flex-1 bg-black/30" onClick={() => setOpen(false)} />
          <aside className="w-full max-w-md h-full bg-white shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">smart_toy</span>
                <h3 className="text-base font-bold text-gray-900">AI Copilot</h3>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">Tư vấn</span>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <span className="material-symbols-outlined text-[20px] text-gray-500">close</span>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100">
              {[['analyze', 'Phân tích'], ['history', 'Lịch sử phân tích']].map(([v, l]) => (
                <button key={v} onClick={() => setTab(v)}
                  className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${tab === v ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'}`}>
                  {l}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {tab === 'analyze' ? (
                <>
                  {/* Context selector */}
                  <div className="bg-gray-50 rounded-xl p-4 mb-4">
                    <p className="text-xs text-gray-400 uppercase font-semibold mb-2">Ngữ cảnh</p>
                    <p className="text-xs text-gray-500 mb-3">Trang hiện tại: <b className="text-gray-700">{pageKey || 'dashboard'}</b></p>
                    <div className="flex flex-col gap-2">
                      <select value={entityType} onChange={e => setEntityType(e.target.value)}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
                        {ENTITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                      {entityType !== 'PAGE' && (
                        <input value={entityId} onChange={e => setEntityId(e.target.value)}
                          placeholder="Nhập ID đối tượng..."
                          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                      )}
                      <button
                        onClick={() => analyze(entityType, entityId)}
                        disabled={loading || (entityType !== 'PAGE' && !entityId.trim())}
                        className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50">
                        <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>{loading ? 'progress_activity' : 'auto_awesome'}</span>
                        {loading ? 'Đang phân tích...' : 'Phân tích ngữ cảnh'}
                      </button>
                    </div>
                  </div>

                  {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm mb-4">{error}</div>}

                  {report && (
                    <div className="space-y-4">
                      {/* Summary + risk */}
                      <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-400 uppercase font-semibold">Tóm tắt</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${risk.cls}`}>Rủi ro: {risk.label}</span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-800 leading-relaxed">{report.summary}</p>
                        <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                          <span>Độ tin cậy: <b className="text-gray-600">{report.confidence}%</b></span>
                          <span>Nguồn: <b className="text-gray-600">{report.model_used}</b></span>
                        </div>
                      </div>

                      <Section title="Phát hiện chính" icon="lightbulb" items={asArray(report.key_findings)} />

                      {asArray(report.evidence).length > 0 && (
                        <div>
                          <SectionTitle icon="fact_check" title="Bằng chứng" />
                          <div className="space-y-1.5">
                            {asArray(report.evidence).map((e, i) => (
                              <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-xs">
                                <span className="text-gray-500">{e.label}</span>
                                <span className="font-semibold text-gray-800">{String(e.value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {asArray(report.recommendations).length > 0 && (
                        <Section title="Đề xuất" icon="tips_and_updates" items={asArray(report.recommendations)} />
                      )}

                      {asArray(report.suggested_admin_actions).length > 0 && (
                        <div>
                          <SectionTitle icon="checklist" title="Hành động gợi ý" />
                          <div className="space-y-1.5">
                            {asArray(report.suggested_admin_actions).map((a, i) => (
                              <div key={i} className="flex items-start gap-2 bg-blue-50/60 rounded-lg px-3 py-2">
                                <span className="material-symbols-outlined text-[18px] text-blue-600 mt-0.5">{ACTION_ICON[a.type] || 'bolt'}</span>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-gray-800">{a.label}</p>
                                  {a.reason && <p className="text-xs text-gray-500">{a.reason}</p>}
                                  <span className="text-[10px] font-mono text-blue-400">{a.type}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                          <p className="text-[11px] text-gray-400 mt-2 italic">Các hành động chỉ mang tính tư vấn — hệ thống không tự thực hiện.</p>
                        </div>
                      )}

                      {asArray(report.limitations).length > 0 && (
                        <Section title="Giới hạn phân tích" icon="info" items={asArray(report.limitations)} muted />
                      )}

                      {/* Non-destructive copy actions */}
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                        <button onClick={() => copy('warning')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50">
                          <span className="material-symbols-outlined text-[15px]">content_copy</span>
                          {copied === 'warning' ? 'Đã copy!' : 'Copy cảnh báo'}
                        </button>
                        <button onClick={() => copy('note')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50">
                          <span className="material-symbols-outlined text-[15px]">content_copy</span>
                          {copied === 'note' ? 'Đã copy!' : 'Copy ghi chú admin'}
                        </button>
                      </div>
                    </div>
                  )}

                  {!report && !error && !loading && (
                    <div className="text-center py-12 text-gray-400">
                      <span className="material-symbols-outlined text-[36px]">smart_toy</span>
                      <p className="text-sm mt-2">Chọn ngữ cảnh và nhấn “Phân tích ngữ cảnh”.</p>
                    </div>
                  )}
                </>
              ) : (
                /* History tab */
                <div>
                  {historyLoading ? (
                    <div className="flex items-center justify-center py-12 text-gray-400">
                      <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>Đang tải...
                    </div>
                  ) : history.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <span className="material-symbols-outlined text-[36px]">history</span>
                      <p className="text-sm mt-2">Chưa có lịch sử phân tích.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {history.map(h => {
                        const hr = RISK_CFG[h.risk_level] || RISK_CFG.LOW
                        return (
                          <button key={h.id} onClick={() => openDetail(h.id)}
                            className="w-full text-left bg-white border border-gray-100 rounded-lg p-3 hover:border-primary/40 hover:shadow-sm transition-all">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-semibold text-gray-700">{h.entity_type}{h.entity_id ? ` · ${String(h.entity_id).slice(0, 8)}` : ''}</span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${hr.cls}`}>{hr.label}</span>
                            </div>
                            <p className="text-xs text-gray-500 line-clamp-2">{h.summary}</p>
                            <p className="text-[10px] text-gray-400 mt-1">{fmtDate(h.created_at)} · {h.model_used}</p>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  )
}

function SectionTitle({ icon, title }) {
  return (
    <p className="text-xs text-gray-400 uppercase font-semibold mb-1.5 flex items-center gap-1">
      <span className="material-symbols-outlined text-[15px]">{icon}</span>{title}
    </p>
  )
}

function Section({ title, icon, items, muted }) {
  if (!items || items.length === 0) return null
  return (
    <div>
      <SectionTitle icon={icon} title={title} />
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={i} className={`text-sm flex items-start gap-1.5 ${muted ? 'text-gray-400' : 'text-gray-700'}`}>
            <span className="text-gray-300 mt-1">•</span>
            <span>{typeof it === 'string' ? it : JSON.stringify(it)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
