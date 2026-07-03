import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../AuthContext'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

const fmtDate = iso => iso
  ? new Date(iso).toLocaleDateString('vi-VN') + ' ' + new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  : '—'

const STATUS_CFG = {
  AI_SUGGESTED:      { label: 'AI đề xuất',    cls: 'bg-blue-100 text-blue-700' },
  AUTO_RESOLVED:     { label: 'Tự động xử lý', cls: 'bg-emerald-100 text-emerald-700' },
  NEED_HUMAN_REVIEW: { label: 'Chờ admin',     cls: 'bg-amber-100 text-amber-700' },
}

const APPEAL_CFG = {
  APPEALED_NEED_REVIEW: { label: 'Đang kháng cáo', cls: 'bg-orange-100 text-orange-700' },
  REVIEWED:             { label: 'Đã xem xét',     cls: 'bg-slate-100 text-slate-600' },
  REJECTED:             { label: 'Kháng cáo bị từ chối', cls: 'bg-red-100 text-red-700' },
  ACCEPTED:             { label: 'Kháng cáo được chấp nhận', cls: 'bg-emerald-100 text-emerald-700' },
}

const asArray = v => Array.isArray(v) ? v : (v ? [v] : [])

// Affected user can appeal only an AUTO_RESOLVED case, within 24h, once.
function canAppeal(item) {
  if (item.status !== 'AUTO_RESOLVED') return false
  if (item.appeal_status && item.appeal_status !== 'NONE') return false
  const base = item.resolved_at || item.created_at
  if (!base) return true
  return (Date.now() - new Date(base).getTime()) <= 24 * 60 * 60 * 1000
}

export default function MyAiCases({ onGoHome }) {
  const { token } = useAuth()
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [appealFor, setAppealFor] = useState(null) // case id
  const [reason, setReason]   = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice]   = useState(null)

  const load = useCallback(() => {
    if (!token) return
    setLoading(true); setError(null)
    fetch(`${API}/api/my/ai-cases`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => setItems(d.items || []))
      .catch(e => setError(`Không thể tải danh sách (${e})`))
      .finally(() => setLoading(false))
  }, [token])

  useEffect(() => { load() }, [load])

  const submitAppeal = async (id) => {
    if (!reason.trim()) { alert('Vui lòng nhập lý do kháng cáo.'); return }
    setSubmitting(true)
    try {
      const r = await fetch(`${API}/api/my/ai-case-feedback/${id}/appeal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ appealReason: reason.trim() }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { alert(j.message || `Thao tác thất bại (${r.status})`); return }
      setNotice('Kháng cáo đã được gửi. Admin sẽ xem xét lại quyết định.')
      setAppealFor(null); setReason('')
      load()
    } catch {
      alert('Lỗi kết nối máy chủ')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-[900px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="font-bold text-xl text-primary">EduX</div>
          <button onClick={onGoHome} className="text-sm text-gray-600 hover:text-primary font-semibold">← Về trang chủ</button>
        </div>
      </header>

      <main className="max-w-[900px] mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900">Quyết Định AI Về Khiếu Nại Của Bạn</h1>
        <p className="text-sm text-gray-500 mt-1 mb-6">
          Xem cách AI đánh giá các khiếu nại liên quan đến bạn. Bạn có thể kháng cáo một quyết định đã tự động xử lý trong vòng 24 giờ.
        </p>

        {notice && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg p-4 text-sm mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
            {notice}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24 text-gray-400">
            <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
            Đang tải...
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <span className="material-symbols-outlined text-[40px] text-gray-300">smart_toy</span>
            <p className="text-sm font-semibold text-gray-600 mt-2">Chưa có quyết định AI nào</p>
            <p className="text-xs text-gray-400 mt-1">Khi có khiếu nại liên quan đến bạn được AI xử lý, nó sẽ hiển thị ở đây.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map(it => {
              const st = STATUS_CFG[it.status] || { label: it.status, cls: 'bg-gray-100 text-gray-600' }
              const ap = it.appeal_status && it.appeal_status !== 'NONE' ? APPEAL_CFG[it.appeal_status] : null
              const flags = asArray(it.risk_flags)
              return (
                <div key={it.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${st.cls}`}>{st.label}</span>
                        {ap && <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${ap.cls}`}>{ap.label}</span>}
                        <span className="text-xs text-gray-400">{fmtDate(it.created_at)}</span>
                      </div>
                      <p className="text-sm text-gray-800 mt-2"><b>Khiếu nại:</b> {it.dispute_reason || '—'}</p>
                      <p className="text-sm text-gray-600 mt-1">{it.reason_summary || it.recommendation}</p>
                      {flags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {flags.map((f, i) => <span key={i} className="inline-flex px-1.5 py-0.5 rounded bg-red-50 text-red-600 text-[10px] font-semibold">{f}</span>)}
                        </div>
                      )}
                    </div>
                  </div>

                  {canAppeal(it) && (
                    <div className="mt-4 border-t border-gray-100 pt-4">
                      {appealFor === it.id ? (
                        <div>
                          <textarea
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            rows={3}
                            placeholder="Nhập lý do kháng cáo quyết định của AI..."
                            className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:border-primary resize-none"
                          />
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={() => submitAppeal(it.id)}
                              disabled={submitting}
                              className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
                            >{submitting ? 'Đang gửi...' : 'Gửi kháng cáo'}</button>
                            <button
                              onClick={() => { setAppealFor(null); setReason('') }}
                              disabled={submitting}
                              className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50"
                            >Hủy</button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setAppealFor(it.id); setReason(''); setNotice(null) }}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-orange-50 text-orange-700 text-sm font-semibold hover:bg-orange-100 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">campaign</span>
                          Kháng cáo quyết định AI
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
