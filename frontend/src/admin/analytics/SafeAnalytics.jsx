import { useState, useEffect, useCallback } from 'react'
import { PageHeader, EmptyState } from '../transactions/components'

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

function AskPanel({ token }) {
  const [question, setQuestion] = useState('')
  const [days, setDays] = useState('')
  const [limit, setLimit] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const ask = async (q) => {
    const question0 = (q ?? question).trim()
    if (!question0) { alert('Nhập câu hỏi.'); return }
    if (q) setQuestion(q)
    setLoading(true); setResult(null)
    try {
      const params = {}
      if (days !== '') params.days = Number(days)
      if (limit !== '') params.limit = Number(limit)
      const r = await fetch(`${API}/api/admin/analytics/ask`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ question: question0, params }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { alert(j.message || `Thất bại (${r.status})`); return }
      setResult(j)
    } catch { alert('Lỗi kết nối') } finally { setLoading(false) }
  }

  const st = result ? (STATUS_CFG[result.status] || STATUS_CFG.FAILED) : null
  const chart = result?.chart
  const maxVal = chart?.values?.length ? Math.max(...chart.values, 1) : 1

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <textarea value={question} onChange={e => setQuestion(e.target.value)} rows={2} placeholder="Nhập câu hỏi về dữ liệu (VD: gia sư nào kiếm nhiều tiền nhất tháng trước?)..." className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:border-primary" />
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
      </div>

      {result && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${st.cls}`}>{st.label}</span>
              {result.intent_code && <span className="text-xs text-gray-400">Ý định: <b className="text-gray-600 font-mono">{result.intent_code}</b></span>}
              <ConfidenceBadge confidence={result.confidence} />
              {result.template_key && <span className="text-xs text-gray-400">Mẫu: <b className="text-gray-600">{result.template_key}</b></span>}
              {result.model_used && <span className="text-xs text-gray-400">· {result.model_used}</span>}
              {asArray(result.safety_flags).map((f, i) => <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-semibold">{f}</span>)}
            </div>
            <p className="text-sm text-gray-800">{result.summary}</p>
            {result.param_sources && (
              <p className="mt-2 text-xs text-gray-400">
                Khoảng thời gian: <b className="text-gray-600">{result.days_label || `${result.params?.days ?? '—'} ngày`}</b> ({SOURCE_LABEL[result.param_sources.days] || result.param_sources.days})
                {' · '}Giới hạn: <b className="text-gray-600">{result.params?.limit ?? '—'}</b> ({SOURCE_LABEL[result.param_sources.limit] || result.param_sources.limit})
              </p>
            )}
            {asArray(result.limitations).length > 0 && <div className="mt-2 text-xs text-amber-600">{asArray(result.limitations).map((l, i) => <div key={i}>• {l}</div>)}</div>}
          </div>

          {(result.status === 'NO_MATCH' || result.status === 'BLOCKED') && asArray(result.suggestions).length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <p className="text-sm font-semibold text-amber-800 mb-2">Câu hỏi được hỗ trợ:</p>
              <div className="flex flex-wrap gap-2">{asArray(result.suggestions).map((s, i) => <button key={i} onClick={() => ask(s)} className="text-xs px-3 py-1.5 rounded-full bg-white border border-amber-200 text-amber-700 hover:bg-amber-100">{s}</button>)}</div>
            </div>
          )}

          {chart && chart.values && chart.values.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs text-gray-400 uppercase font-semibold mb-3">Biểu đồ ({chart.value_label})</p>
              <div className="space-y-1.5">
                {chart.labels.map((lb, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-0.5"><span className="text-gray-600 truncate max-w-[70%]">{lb || '—'}</span><span className="font-semibold text-gray-800">{fmtCell(chart.values[i])}</span></div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${(chart.values[i] / maxVal) * 100}%` }} /></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {asArray(result.rows).length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50"><tr>{(result.columns || Object.keys(result.rows[0])).map(c => <th key={c} className="py-2.5 px-4 text-left text-xs font-bold text-gray-500 uppercase whitespace-nowrap">{c}</th>)}</tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {result.rows.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">{(result.columns || Object.keys(row)).map(c => <td key={c} className="py-2.5 px-4 text-gray-700 whitespace-nowrap max-w-[300px] truncate" title={String(row[c] ?? '')}>{fmtCell(row[c])}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
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
