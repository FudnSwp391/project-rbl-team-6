import { useState, useEffect, useCallback } from 'react'
import { PageHeader, EmptyState } from './components'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

const fmtDate = iso => iso
  ? new Date(iso).toLocaleDateString('vi-VN') + ' ' + new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  : '—'

const STATUS_CFG = {
  AI_SUGGESTED:      { label: 'Đề xuất AI',   cls: 'bg-blue-100 text-blue-700' },
  AUTO_RESOLVED:     { label: 'Tự động xử lý', cls: 'bg-emerald-100 text-emerald-700' },
  NEED_HUMAN_REVIEW: { label: 'Cần admin',    cls: 'bg-amber-100 text-amber-700' },
  SKIPPED:           { label: 'Bỏ qua',        cls: 'bg-slate-100 text-slate-600' },
  FAILED:            { label: 'Thất bại',      cls: 'bg-red-100 text-red-700' },
}

const APPEAL_CFG = {
  NONE:                 { label: '—',              cls: 'text-gray-300' },
  APPEALED_NEED_REVIEW: { label: 'Đang kháng cáo', cls: 'bg-orange-100 text-orange-700' },
  REVIEWED:             { label: 'Đã xem xét',     cls: 'bg-slate-100 text-slate-600' },
  REJECTED:             { label: 'Từ chối',        cls: 'bg-red-100 text-red-700' },
  ACCEPTED:             { label: 'Chấp nhận',      cls: 'bg-emerald-100 text-emerald-700' },
}

const MONEY_LABEL = {
  REFUND_TO_STUDENT: 'Hoàn tiền học sinh',
  RELEASE_TO_TUTOR:  'Giải ngân gia sư',
  NONE:              'Không',
}

const asArray = v => Array.isArray(v) ? v : (v ? [v] : [])

export default function AICaseResolutions({ token }) {
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [page, setPage]         = useState(1)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterAppeal, setFilterAppeal] = useState('')
  const [running, setRunning]   = useState(false)
  const [detail, setDetail]     = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const limit = 50

  const load = useCallback(() => {
    if (!token) return
    setLoading(true); setError(null)
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (filterStatus) qs.set('status', filterStatus)
    if (filterAppeal) qs.set('appealStatus', filterAppeal)
    fetch(`${API}/api/admin/ai-cases?${qs.toString()}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => setData(d))
      .catch(e => setError(`Không thể tải danh sách xử lý AI (${e})`))
      .finally(() => setLoading(false))
  }, [token, page, filterStatus, filterAppeal])

  useEffect(() => { load() }, [load])

  const runPending = async () => {
    setRunning(true)
    try {
      const r = await fetch(`${API}/api/admin/ai-cases/run-pending`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { alert(j.message || `Thao tác thất bại (${r.status})`); return }
      alert(`Đã quét ${j.scanned} khiếu nại — ${j.suggested} đề xuất, ${j.needsReview} cần admin, ${j.autoResolved} tự động, ${j.failed} lỗi.${j.dry_run ? ' (Chế độ DRY-RUN — không di chuyển tiền.)' : ''}`)
      load()
    } catch (e) {
      alert('Lỗi kết nối máy chủ')
    } finally {
      setRunning(false)
    }
  }

  const openDetail = async (id) => {
    setDetailLoading(true); setDetail({ id })
    try {
      const r = await fetch(`${API}/api/admin/ai-cases/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { alert(j.message || 'Không tải được chi tiết'); setDetail(null); return }
      setDetail(j)
    } catch {
      alert('Lỗi kết nối'); setDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }

  if (loading && !data) return (
    <div className="flex items-center justify-center py-24 text-gray-400">
      <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
      Đang tải danh sách xử lý AI...
    </div>
  )

  if (error) return (
    <div className="p-8">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
    </div>
  )

  if (!data) return null

  const { items, pagination, summary, config } = data
  const totalPages = Math.max(1, Math.ceil((pagination?.total || 0) / limit))

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <PageHeader title="Xử Lý Khiếu Nại Bằng AI" subtitle="AI đánh giá khiếu nại và đề xuất hướng xử lý — có cổng chống lạm dụng và cơ chế kháng cáo.">
        <button
          onClick={runPending}
          disabled={running}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          <span className={`material-symbols-outlined text-[18px] ${running ? 'animate-spin' : ''}`}>{running ? 'progress_activity' : 'smart_toy'}</span>
          {running ? 'Đang chạy...' : 'Chạy xử lý AI'}
        </button>
      </PageHeader>

      {/* Config / safety banner */}
      {config && (
        <div className={`rounded-xl p-4 mb-6 flex items-start gap-3 border ${config.dry_run ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'}`}>
          <span className={`material-symbols-outlined text-[22px] ${config.dry_run ? 'text-blue-600' : 'text-amber-600'}`}>
            {config.dry_run ? 'shield' : 'warning'}
          </span>
          <div className="text-sm">
            <p className="font-semibold text-gray-800">
              {config.dry_run
                ? 'Chế độ DRY-RUN — AI chỉ tạo đề xuất, KHÔNG di chuyển tiền.'
                : 'Chế độ tự động xử lý đang BẬT.'}
            </p>
            <p className="text-gray-500 mt-0.5">
              Tự động xử lý: <b>{config.resolution_enabled ? 'BẬT' : 'TẮT'}</b> · Cron: <b>{config.cron_enabled ? 'BẬT' : 'TẮT'}</b> · Ngưỡng tuổi khiếu nại: <b>{config.min_case_age_hours}h</b>
            </p>
          </div>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Đề xuất AI',   value: summary?.ai_suggested,      icon: 'lightbulb',    color: 'bg-blue-50 text-blue-600' },
          { label: 'Tự động xử lý', value: summary?.auto_resolved,    icon: 'auto_awesome', color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Cần admin',    value: summary?.need_human_review, icon: 'gavel',        color: 'bg-amber-50 text-amber-600' },
          { label: 'Đang kháng cáo', value: summary?.appealed,        icon: 'campaign',     color: 'bg-orange-50 text-orange-600' },
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

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
          value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }}>
          <option value="">Tất cả trạng thái</option>
          <option value="AI_SUGGESTED">Đề xuất AI</option>
          <option value="AUTO_RESOLVED">Tự động xử lý</option>
          <option value="NEED_HUMAN_REVIEW">Cần admin</option>
        </select>
        <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
          value={filterAppeal} onChange={e => { setFilterAppeal(e.target.value); setPage(1) }}>
          <option value="">Tất cả kháng cáo</option>
          <option value="APPEALED_NEED_REVIEW">Đang kháng cáo</option>
          <option value="REVIEWED">Đã xem xét</option>
          <option value="REJECTED">Từ chối</option>
          <option value="ACCEPTED">Chấp nhận</option>
        </select>
        <span className="ml-auto self-center text-xs text-gray-400">{pagination?.total ?? 0} bản ghi</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {items.length === 0 ? (
          <div className="p-10"><EmptyState icon="smart_toy" title="Chưa có bản ghi" description="Chưa có khiếu nại nào được AI xử lý. Nhấn “Chạy xử lý AI” để quét." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['Thời gian', 'Học sinh', 'Gia sư', 'Lý do', 'Trạng thái', 'Hành động tiền', 'Cờ rủi ro', 'Kháng cáo', ''].map((h, i) => (
                    <th key={i} className="py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map(it => {
                  const st = STATUS_CFG[it.status] || { label: it.status, cls: 'bg-gray-100 text-gray-600' }
                  const ap = APPEAL_CFG[it.appeal_status] || APPEAL_CFG.NONE
                  const flags = asArray(it.risk_flags)
                  return (
                    <tr key={it.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 text-xs text-gray-400 whitespace-nowrap">{fmtDate(it.created_at)}</td>
                      <td className="py-3 px-4">
                        <div className="text-sm font-medium text-gray-900">{it.student_name || '—'}</div>
                        <div className="text-xs text-gray-400">{it.student_email || ''}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm font-medium text-gray-900">{it.tutor_name || '—'}</div>
                        <div className="text-xs text-gray-400">{it.tutor_email || ''}</div>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-600 max-w-[220px] truncate" title={it.dispute_reason || ''}>{it.dispute_reason || '—'}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${st.cls}`}>{st.label}</span>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-600 whitespace-nowrap">{MONEY_LABEL[it.money_action] || it.money_action || '—'}</td>
                      <td className="py-3 px-4">
                        {flags.length === 0 ? <span className="text-xs text-gray-300">—</span> : (
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {flags.map((f, i) => (
                              <span key={i} className="inline-flex px-1.5 py-0.5 rounded bg-red-50 text-red-600 text-[10px] font-semibold">{f}</span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {it.appeal_status === 'NONE'
                          ? <span className="text-xs text-gray-300">—</span>
                          : <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${ap.cls}`}>{ap.label}</span>}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <button
                          onClick={() => openDetail(it.id)}
                          className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
                        >Chi tiết</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
          >← Trước</button>
          <span className="text-xs text-gray-400">Trang {page} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
          >Sau →</button>
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-4 italic">
        * Ở chế độ DRY-RUN, AI chỉ tạo báo cáo đề xuất và không thực hiện hoàn tiền/giải ngân. Mọi quyết định tài chính vẫn do admin thực hiện thủ công.
      </p>

      {/* Detail modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <h3 className="text-lg font-bold text-gray-900">Chi tiết xử lý AI</h3>
              <button onClick={() => setDetail(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <span className="material-symbols-outlined text-[20px] text-gray-500">close</span>
              </button>
            </div>
            {detailLoading ? (
              <div className="p-10 flex justify-center text-gray-400">
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
              </div>
            ) : (
              <div className="p-6 space-y-4 text-sm">
                <DetailRow label="Trạng thái" value={(STATUS_CFG[detail.status] || {}).label || detail.status} />
                <DetailRow label="Mức độ / độ tin cậy" value={`${detail.severity || '—'} · ${detail.confidence ?? '—'}%`} />
                <DetailRow label="Hành động tiền (đề xuất)" value={MONEY_LABEL[detail.money_action] || detail.money_action || '—'} />
                <DetailRow label="Đã thực thi tiền?" value={detail.executed ? 'CÓ' : 'KHÔNG (dry-run)'} />
                <DetailRow label="Học sinh" value={`${detail.student_name || '—'} ${detail.student_email ? '· ' + detail.student_email : ''}`} />
                <DetailRow label="Gia sư" value={`${detail.tutor_name || '—'} ${detail.tutor_email ? '· ' + detail.tutor_email : ''}`} />
                <DetailRow label="Lý do khiếu nại" value={detail.dispute_reason || '—'} />
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Diễn giải AI</p>
                  <p className="text-gray-700 bg-gray-50 rounded-lg p-3">{detail.reason_summary || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Đề xuất</p>
                  <p className="text-gray-700 bg-gray-50 rounded-lg p-3">{detail.recommendation || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Cờ rủi ro</p>
                  {asArray(detail.risk_flags).length === 0
                    ? <p className="text-gray-400">Không có</p>
                    : <div className="flex flex-wrap gap-1.5">{asArray(detail.risk_flags).map((f, i) => (
                        <span key={i} className="inline-flex px-2 py-0.5 rounded bg-red-50 text-red-600 text-xs font-semibold">{f}</span>
                      ))}</div>}
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Bằng chứng AI (evidence)</p>
                  <pre className="text-[11px] text-gray-600 bg-gray-50 rounded-lg p-3 overflow-x-auto">{JSON.stringify(detail.ai_evidence || {}, null, 2)}</pre>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Dấu vết tài chính (financial_trace)</p>
                  <pre className="text-[11px] text-gray-600 bg-gray-50 rounded-lg p-3 overflow-x-auto">{JSON.stringify(detail.financial_trace || {}, null, 2)}</pre>
                  <p className="text-[11px] text-gray-400 mt-1">Giao dịch liên quan: {detail.resolved_transaction_id || '— (chưa có, dry-run)'}</p>
                </div>

                {/* Appeal section */}
                {detail.appeal_status && detail.appeal_status !== 'NONE' && (
                  <div className="border-t border-gray-100 pt-4">
                    <p className="text-xs font-semibold text-orange-500 uppercase mb-2">Kháng cáo</p>
                    <DetailRow label="Trạng thái kháng cáo" value={(APPEAL_CFG[detail.appeal_status] || {}).label || detail.appeal_status} />
                    <DetailRow label="Người kháng cáo" value={detail.appeal_by_name || detail.appeal_by || '—'} />
                    <DetailRow label="Thời gian kháng cáo" value={fmtDate(detail.appealed_at)} />
                    <div className="mt-2">
                      <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Lý do kháng cáo</p>
                      <p className="text-gray-700 bg-orange-50 rounded-lg p-3">{detail.appeal_reason || '—'}</p>
                    </div>
                  </div>
                )}

                <div className="text-[11px] text-gray-400 border-t border-gray-100 pt-3">
                  Policy: {detail.policy_version || '—'} · Tạo lúc {fmtDate(detail.created_at)} · Xử lý lúc {fmtDate(detail.resolved_at)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-xs font-semibold text-gray-400 uppercase w-40 shrink-0 pt-0.5">{label}</span>
      <span className="text-gray-800 flex-1">{value}</span>
    </div>
  )
}
