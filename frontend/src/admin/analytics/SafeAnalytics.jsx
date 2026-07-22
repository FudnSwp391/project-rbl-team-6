import { useState, useEffect, useCallback, useRef } from 'react'
import { PageHeader, EmptyState } from '../transactions/components'
import AnalyticsChart from './charts'
import InsightCards from './InsightCards'
import PinnedWidgets from './PinnedWidgets'
import { exportAnalyticsCSV, exportAnalyticsExcel, exportAnalyticsPDF, copySummaryToClipboard, copyTableToClipboard, copyChartAsImage } from './exportUtils'

import { API_BASE_URL as API } from '../../config'

const fmtDate = iso => iso ? new Date(iso).toLocaleDateString('vi-VN') + ' ' + new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—'

const STATUS_CFG = {
  SUCCESS: { label: 'Thành công', cls: 'bg-emerald-100 text-emerald-700' },
  NO_MATCH: { label: 'Không khớp mẫu', cls: 'bg-amber-100 text-amber-700' },
  BLOCKED: { label: 'Bị chặn', cls: 'bg-red-100 text-red-700' },
  FAILED: { label: 'Thất bại', cls: 'bg-red-100 text-red-700' },
}
const EXAMPLES = [
  'Top gia sư có refund nhiều nhất 30 ngày',
  'Gia sư nào có rủi ro gian lận cao nhất',
  'Ai có dấu hiệu giao dịch ngoài nền tảng',
  'Refund theo tháng',
  'Khiếu nại theo trạng thái',
  'AI case nào cần admin review',
]
const asArray = v => Array.isArray(v) ? v : (v ? [v] : [])
const fmtCell = v => (v == null ? '—' : (typeof v === 'number' ? v.toLocaleString('vi-VN') : String(v)))

export default function SafeAnalytics({ token }) {
  const [tab, setTab] = useState('ask')
  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <PageHeader title="AI Phân tích Dữ liệu" subtitle="Hỏi dữ liệu bằng tiếng Việt/English. Hệ thống chỉ chạy các mẫu truy vấn SELECT an toàn đã kiểm duyệt — không chạy SQL tự do." />
      <div className="flex gap-2 mb-6 border-b border-gray-100">
        {[['ask', 'Hỏi dữ liệu'], ['templates', 'Mẫu hỗ trợ'], ['history', 'Lịch sử']].map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)} className={`px-4 py-2.5 text-sm font-semibold transition-colors ${tab === v ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'}`}>{l}</button>
        ))}
      </div>
      {tab === 'ask' && <AskPanel token={token} />}
      {tab === 'templates' && <TemplatesPanel token={token} />}
      {tab === 'history' && <HistoryPanel token={token} />}
    </div>
  )
}

function ConfidenceBadge({ confidence }) {
  if (confidence == null) return null
  const cls = confidence >= 75 ? 'bg-emerald-100 text-emerald-700' : confidence >= 45 ? 'bg-amber-100 text-amber-700' : 'bg-orange-100 text-orange-700'
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>Độ tin cậy {confidence}%</span>
}
const SOURCE_LABEL = { manual: 'nhập tay', nlp: 'tự phát hiện từ câu hỏi', default: 'mặc định' }
const CHART_TYPE_LABEL = { bar: 'Cột', leaderboard: 'Bảng xếp hạng', line: 'Đường xu hướng', pie: 'Tròn', heatmap: 'Bản đồ nhiệt' }

function AskPanel({ token }) {
  const [question, setQuestion] = useState('')
  const [days, setDays] = useState('')
  const [limit, setLimit] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [favorites, setFavorites] = useState([])
  const [recent, setRecent] = useState([])
  const [isFavorited, setIsFavorited] = useState(false)
  const [pinRefreshKey, setPinRefreshKey] = useState(0)
  const [context, setContext] = useState(null)
  const [suggestionPool, setSuggestionPool] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const chartRef = useRef(null)

  const loadFavorites = useCallback(() => {
    fetch(`${API}/api/admin/analytics/favorites`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => (r.ok ? r.json() : Promise.reject(r.status))).then(d => setFavorites(d.items || [])).catch(() => {})
  }, [token])
  const loadRecent = useCallback(() => {
    fetch(`${API}/api/admin/analytics/history?mine=true&limit=6`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => (r.ok ? r.json() : Promise.reject(r.status))).then(d => setRecent(d.items || [])).catch(() => {})
  }, [token])
  useEffect(() => { loadFavorites(); loadRecent() }, [loadFavorites, loadRecent])
  useEffect(() => {
    fetch(`${API}/api/admin/analytics/templates`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(d => setSuggestionPool([...new Set((d.items || []).flatMap(t => t.exampleQuestions || []))]))
      .catch(() => {})
  }, [token])

  const suggestions = question.trim().length >= 2
    ? suggestionPool.filter(s => s.toLowerCase().includes(question.trim().toLowerCase()) && s.toLowerCase() !== question.trim().toLowerCase()).slice(0, 6)
    : []

  // overrideParams: used by favorites/recent so re-asking a saved question
  // reproduces the exact same report (days/limit) instead of whatever is
  // currently sitting in the form fields.
  const ask = async (q, overrideParams) => {
    const question0 = (q ?? question).trim()
    if (!question0) { alert('Nhập câu hỏi.'); return }
    if (q) setQuestion(q)
    if (overrideParams) {
      setDays(overrideParams.days != null ? String(overrideParams.days) : '')
      setLimit(overrideParams.limit != null ? String(overrideParams.limit) : '')
    }
    setLoading(true); setResult(null); setIsFavorited(false)
    try {
      const params = {}
      if (overrideParams) {
        if (overrideParams.days != null) params.days = Number(overrideParams.days)
        if (overrideParams.limit != null) params.limit = Number(overrideParams.limit)
      } else {
        if (days !== '') params.days = Number(days)
        if (limit !== '') params.limit = Number(limit)
      }
      const r = await fetch(`${API}/api/admin/analytics/ask`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ question: question0, params, context }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { alert(j.message || `Thất bại (${r.status})`); return }
      setResult(j)
      // Only overwrite context when the response actually carries one — a
      // NO_MATCH/BLOCKED/FAILED reply omits next_context entirely (it isn't
      // "no entities", it's "we don't know"), so a failed attempt shouldn't
      // erase the still-valid context from the prior successful turn.
      if ('next_context' in j) setContext(j.next_context)
      loadRecent()
    } catch { alert('Lỗi kết nối') } finally { setLoading(false) }
  }

  const toggleFavorite = async () => {
    if (!result) return
    await fetch(`${API}/api/admin/analytics/favorites`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ question, params: result.params, label: result.intent_code || question }),
    })
    setIsFavorited(true)
    loadFavorites()
  }
  const removeFavorite = async (id) => {
    await fetch(`${API}/api/admin/analytics/favorites/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    loadFavorites()
  }
  const pinResult = async () => {
    if (!result?.template_key) return
    const r = await fetch(`${API}/api/admin/analytics/pins`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ templateKey: result.template_key, params: result.params, label: result.intent_code || result.template_key }),
    })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) { alert(j.message || 'Không thể ghim.'); return }
    setPinRefreshKey(k => k + 1)
  }

  const st = result ? (STATUS_CFG[result.status] || STATUS_CFG.FAILED) : null
  const chart = result?.chart

  return (
    <div className="space-y-6">
      <PinnedWidgets token={token} refreshKey={pinRefreshKey} />
      <InsightCards token={token} />
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="relative">
          <textarea
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            rows={2} placeholder="Nhập câu hỏi về dữ liệu (VD: gia sư nào kiếm nhiều tiền nhất tháng trước?)..."
            className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:border-primary"
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
              {suggestions.map((s, i) => (
                <button key={i} onMouseDown={() => { setQuestion(s); setShowSuggestions(false) }} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 flex items-center gap-2 border-b border-gray-50 last:border-0">
                  <span className="material-symbols-outlined text-[15px] text-gray-300">search</span>{s}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-3">
          <label className="text-sm text-gray-600">Số ngày <input type="number" value={days} onChange={e => setDays(e.target.value)} placeholder="Tự động" className="w-24 ml-1 border border-gray-200 rounded-lg px-2 py-1.5 placeholder:text-gray-300" /></label>
          <label className="text-sm text-gray-600">Giới hạn <input type="number" value={limit} onChange={e => setLimit(e.target.value)} placeholder="Tự động" className="w-24 ml-1 border border-gray-200 rounded-lg px-2 py-1.5 placeholder:text-gray-300" /></label>
          <span className="text-xs text-gray-400">Để trống để AI tự suy ra từ câu hỏi (VD: "tháng trước", "top 5")</span>
          <button onClick={() => ask()} disabled={loading} className="ml-auto flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50">
            <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>{loading ? 'progress_activity' : 'query_stats'}</span>{loading ? 'Đang hỏi...' : 'Hỏi dữ liệu'}
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {EXAMPLES.map(ex => <button key={ex} onClick={() => ask(ex)} className="text-xs px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors">{ex}</button>)}
        </div>
        {recent.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-50">
            <span className="text-[11px] text-gray-400 font-semibold uppercase flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">history</span>Gần đây</span>
            {recent.map(r => <button key={r.id} onClick={() => ask(r.question, r.parameters)} className="text-xs px-3 py-1.5 rounded-full bg-gray-50 text-gray-500 hover:bg-blue-50 hover:text-blue-700 transition-colors truncate max-w-[220px]" title={r.question}>{r.question}</button>)}
          </div>
        )}
        {favorites.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-50">
            <span className="text-[11px] text-gray-400 font-semibold uppercase flex items-center gap-1"><span className="material-symbols-outlined text-[14px] text-amber-400">star</span>Yêu thích</span>
            {favorites.map(f => (
              <span key={f.id} className="flex items-center gap-1 text-xs pl-3 pr-1.5 py-1 rounded-full bg-amber-50 text-amber-700">
                <button onClick={() => ask(f.question, f.params)} className="truncate max-w-[200px]" title={f.question}>{f.label || f.question}</button>
                <button onClick={() => removeFavorite(f.id)} className="text-amber-400 hover:text-red-500"><span className="material-symbols-outlined text-[14px]">close</span></button>
              </span>
            ))}
          </div>
        )}
      </div>

      {result && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${st.cls}`}>{st.label}</span>
              {result.intent_code && <span className="text-xs text-gray-400">Ý định: <b className="text-gray-600 font-mono">{result.intent_code}</b></span>}
              <ConfidenceBadge confidence={result.confidence} />
              <RiskBadge level={result.risk_level} reason={result.risk_reason} />
              {result.template_key && <span className="text-xs text-gray-400">Mẫu: <b className="text-gray-600">{result.template_key}</b></span>}
              {result.model_used && <span className="text-xs text-gray-400">· {result.model_used}</span>}
              {asArray(result.safety_flags).map((f, i) => <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-semibold">{f}</span>)}
              {result.cached && <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-50 text-sky-600 font-semibold flex items-center gap-0.5"><span className="material-symbols-outlined text-[12px]">bolt</span>cached</span>}
              {result.status === 'SUCCESS' && (
                <div className="ml-auto flex items-center gap-1">
                  <button onClick={toggleFavorite} title="Lưu yêu thích" className={isFavorited ? 'text-amber-400' : 'text-gray-300 hover:text-amber-400'}>
                    <span className="material-symbols-outlined text-[19px]">{isFavorited ? 'star' : 'star_outline'}</span>
                  </button>
                  <button onClick={pinResult} title="Ghim vào dashboard" className="text-gray-300 hover:text-primary">
                    <span className="material-symbols-outlined text-[19px]">push_pin</span>
                  </button>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-800">{result.summary}</p>
            {asArray(result.insights).length > 0 && (
              <ul className="mt-2 space-y-1">
                {asArray(result.insights).map((ins, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-primary mt-0.5">insights</span>{ins}
                  </li>
                ))}
              </ul>
            )}
            {result.param_sources && (
              <p className="mt-2 text-xs text-gray-400">
                Khoảng thời gian: <b className="text-gray-600">{result.days_label || `${result.params?.days ?? '—'} ngày`}</b> ({SOURCE_LABEL[result.param_sources.days] || result.param_sources.days})
                {' · '}Giới hạn: <b className="text-gray-600">{result.params?.limit ?? '—'}</b> ({SOURCE_LABEL[result.param_sources.limit] || result.param_sources.limit})
                {result.subject_filter && <>{' · '}Môn học: <b className="text-gray-600">{result.subject_filter}</b> (tự phát hiện)</>}
              </p>
            )}
            {result.context_applied && (
              <p className="mt-1.5 text-xs text-primary flex items-center gap-1"><span className="material-symbols-outlined text-[13px]">link</span>Đã áp dụng ngữ cảnh từ câu hỏi trước</p>
            )}
            {asArray(result.limitations).length > 0 && <div className="mt-2 text-xs text-amber-600">{asArray(result.limitations).map((l, i) => <div key={i}>• {l}</div>)}</div>}
          </div>

          {(result.status === 'NO_MATCH' || result.status === 'BLOCKED') && asArray(result.suggestions).length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <p className="text-sm font-semibold text-amber-800 mb-2">Câu hỏi được hỗ trợ:</p>
              <div className="flex flex-wrap gap-2">{asArray(result.suggestions).map((s, i) => <button key={i} onClick={() => ask(s)} className="text-xs px-3 py-1.5 rounded-full bg-white border border-amber-200 text-amber-700 hover:bg-amber-100">{s}</button>)}</div>
            </div>
          )}

          {chart && chart.type && (chart.values?.length > 0 || chart.matrix?.length > 0) && (
            <div ref={chartRef} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs text-gray-400 uppercase font-semibold mb-3">Biểu đồ ({chart.value_label}) · {CHART_TYPE_LABEL[chart.type] || chart.type}</p>
              <AnalyticsChart chart={chart} />
            </div>
          )}

          {asArray(result.rows).length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50"><tr>
                    {result.rows[0]?._row_risk && <th className="py-2.5 px-4 text-left text-xs font-bold text-gray-500 uppercase w-10">Rủi ro</th>}
                    {(result.columns || Object.keys(result.rows[0])).map(c => <th key={c} className="py-2.5 px-4 text-left text-xs font-bold text-gray-500 uppercase whitespace-nowrap">{c}</th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {result.rows.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        {row._row_risk && <td className="py-2.5 px-4"><RowRiskDot level={row._row_risk} /></td>}
                        {(result.columns || Object.keys(row)).map(c => <td key={c} className="py-2.5 px-4 text-gray-700 whitespace-nowrap max-w-[300px] truncate" title={String(row[c] ?? '')}>{fmtCell(row[c])}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {result.status === 'SUCCESS' && asArray(result.rows).length > 0 && (
            <ExportToolbar result={result} question={question} chartRef={chartRef} hasChart={!!(chart && chart.type && (chart.values?.length > 0 || chart.matrix?.length > 0))} />
          )}

          {asArray(result.follow_up_questions).length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs text-gray-400 uppercase font-semibold mb-3 flex items-center gap-1"><span className="material-symbols-outlined text-[15px] text-primary">arrow_forward</span>Câu hỏi gợi ý tiếp theo</p>
              <div className="flex flex-wrap gap-2">
                {asArray(result.follow_up_questions).map((q, i) => <button key={i} onClick={() => ask(q)} className="text-xs px-3 py-1.5 rounded-full bg-primary/5 border border-primary/20 text-primary hover:bg-primary/10">{q}</button>)}
              </div>
            </div>
          )}

          {result.status === 'SUCCESS' && (
            <ExplainPanel result={result} />
          )}

          {result.sql_preview && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs text-gray-400 uppercase font-semibold mb-2 flex items-center gap-1"><span className="material-symbols-outlined text-[15px] text-emerald-500">verified</span>SQL an toàn đã kiểm duyệt (chỉ đọc)</p>
              <pre className="text-[11px] text-gray-600 bg-gray-50 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">{result.sql_preview}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ExportToolbar({ result, question, chartRef, hasChart }) {
  const [busy, setBusy] = useState(null)
  const columns = result.columns || (result.rows[0] ? Object.keys(result.rows[0]) : [])
  const payload = { question, summary: result.summary, insights: result.insights, columns, rows: result.rows }

  const run = async (key, fn) => {
    setBusy(key)
    try { await fn() } catch (e) { alert(e?.message || 'Không thể xuất.') } finally { setBusy(null) }
  }
  const btn = (key, icon, label, onClick) => (
    <button onClick={() => run(key, onClick)} disabled={busy !== null} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50">
      <span className={`material-symbols-outlined text-[15px] ${busy === key ? 'animate-spin' : ''}`}>{busy === key ? 'progress_activity' : icon}</span>{label}
    </button>
  )

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-2">
      {btn('csv', 'download', 'CSV', () => exportAnalyticsCSV(payload))}
      {btn('excel', 'download', 'Excel', () => exportAnalyticsExcel(payload))}
      {btn('pdf', 'picture_as_pdf', 'PDF', () => exportAnalyticsPDF(payload))}
      {btn('copy-summary', 'content_copy', 'Sao chép tóm tắt', () => copySummaryToClipboard(result.summary, result.insights))}
      {btn('copy-table', 'content_copy', 'Sao chép bảng', () => copyTableToClipboard({ columns, rows: result.rows }))}
      {hasChart && btn('copy-chart', 'image', 'Sao chép biểu đồ', () => {
        if (!chartRef.current) throw new Error('Biểu đồ chưa sẵn sàng.')
        return copyChartAsImage(chartRef.current)
      })}
    </div>
  )
}

function ExplainPanel({ result }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-5 py-3 text-xs font-semibold text-gray-500 uppercase hover:bg-gray-50">
        <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[15px] text-primary">fact_check</span>Giải thích kết quả</span>
        <span className="material-symbols-outlined text-[18px]">{open ? 'expand_less' : 'expand_more'}</span>
      </button>
      {open && (
        <div className="px-5 pb-4 grid sm:grid-cols-2 gap-x-6 gap-y-2 text-xs text-gray-600">
          <p>Nguồn dữ liệu: <b className="text-gray-800">{asArray(result.data_sources).join(', ') || '—'}</b></p>
          <p>Khoảng thời gian: <b className="text-gray-800">{result.days_label || `${result.params?.days ?? '—'} ngày`}</b></p>
          <p>Giới hạn kết quả: <b className="text-gray-800">{result.params?.limit ?? '—'}</b></p>
          <p>Số dòng đã phân tích: <b className="text-gray-800">{result.rows_analyzed ?? asArray(result.rows).length}</b></p>
          <p className="sm:col-span-2">Thời điểm tạo: <b className="text-gray-800">{fmtDate(result.generated_at)}</b></p>
        </div>
      )}
    </div>
  )
}

const RISK_CFG = {
  LOW: { label: 'Rủi ro thấp', cls: 'bg-emerald-100 text-emerald-700' },
  MEDIUM: { label: 'Rủi ro trung bình', cls: 'bg-amber-100 text-amber-700' },
  HIGH: { label: 'Rủi ro cao', cls: 'bg-red-100 text-red-700' },
}
function RiskBadge({ level, reason }) {
  const cfg = level ? RISK_CFG[level] : null
  if (!cfg) return null
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.cls}`} title={reason || ''}>{cfg.label}</span>
}
const ROW_RISK_DOT_CLS = { LOW: 'bg-emerald-400', MEDIUM: 'bg-amber-400', HIGH: 'bg-red-500' }
function RowRiskDot({ level }) {
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${ROW_RISK_DOT_CLS[level] || 'bg-gray-300'}`} title={RISK_CFG[level]?.label || level} />
}

function TemplatesPanel({ token }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetch(`${API}/api/admin/analytics/templates`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject(r.status)).then(d => setItems(d.items || [])).catch(() => setItems([])).finally(() => setLoading(false))
  }, [token])
  if (loading) return <Loading label="Đang tải mẫu..." />
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {items.map(t => (
        <div key={t.key} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm font-bold text-gray-900">{t.label}</p>
          <p className="text-xs font-mono text-gray-400 mb-2">{t.key}{t.intentCode ? ` · ${t.intentCode}` : ''}</p>
          <p className="text-sm text-gray-600 mb-3">{t.description}</p>
          <div className="flex flex-wrap gap-1.5">{asArray(t.exampleQuestions).map((q, i) => <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{q}</span>)}</div>
        </div>
      ))}
    </div>
  )
}

function HistoryPanel({ token }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const load = useCallback(() => {
    setLoading(true)
    fetch(`${API}/api/admin/analytics/history?limit=30`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject(r.status)).then(setData).catch(() => setData({ items: [] })).finally(() => setLoading(false))
  }, [token])
  useEffect(() => { load() }, [load])
  if (loading) return <Loading label="Đang tải lịch sử..." />
  const items = data?.items || []
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {items.length === 0 ? <div className="p-10"><EmptyState icon="history" title="Chưa có lịch sử" description="Các câu hỏi phân tích sẽ được ghi lại ở đây." /></div>
        : <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead className="bg-gray-50"><tr>{['Thời gian', 'Câu hỏi', 'Mẫu', 'Trạng thái', 'Số kết quả'].map(h => <th key={h} className="py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase whitespace-nowrap">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-gray-50">
            {items.map(it => {
              const st = STATUS_CFG[it.status] || STATUS_CFG.FAILED
              return (
                <tr key={it.id} className="hover:bg-gray-50">
                  <td className="py-2.5 px-4 text-xs text-gray-400 whitespace-nowrap">{fmtDate(it.created_at)}</td>
                  <td className="py-2.5 px-4 text-gray-700 max-w-[360px] truncate" title={it.question}>{it.question}</td>
                  <td className="py-2.5 px-4 text-xs font-mono text-gray-500">{it.template_key || '—'}</td>
                  <td className="py-2.5 px-4"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${st.cls}`}>{st.label}</span></td>
                  <td className="py-2.5 px-4 text-gray-600">{it.result_count ?? 0}</td>
                </tr>
              )
            })}
          </tbody>
        </table></div>}
    </div>
  )
}

function Loading({ label }) {
  return <div className="flex items-center justify-center py-24 text-gray-400"><span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>{label}</div>
}
