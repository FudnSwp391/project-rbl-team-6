import { useState, useEffect } from 'react'
import { PageHeader, EmptyState, ExportButton, SearchFilterBar, FilterTabs } from './components'
import InvestigationDrawer from './investigation/InvestigationDrawer'
import { exportReconciliationExcel, exportReconciliationCSV, exportReconciliationPDF } from './exportUtils'

import { API_BASE_URL as API } from '../../config'

const fmtMoney = n => 'đ' + Number(n || 0).toLocaleString('vi-VN')
const fmtDate  = iso => iso ? new Date(iso).toLocaleDateString('vi-VN') + ' ' + new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—'

const CHECK_STATUS = {
  matched:     { label: 'Khớp',           cls: 'bg-emerald-100 text-emerald-700 border border-emerald-200', icon: 'check_circle' },
  warning:     { label: 'Cảnh báo',        cls: 'bg-amber-100 text-amber-700 border border-amber-200',       icon: 'warning' },
  issue:       { label: 'Có vấn đề',       cls: 'bg-red-100 text-red-700 border border-red-200',             icon: 'error' },
  review_only: { label: 'Chỉ để xem',     cls: 'bg-sky-100 text-sky-700 border border-sky-200',             icon: 'visibility' },
}

const SEV_COLOR = {
  high:   'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low:    'bg-gray-100 text-gray-600',
}

function CheckBadge({ status }) {
  const cfg = CHECK_STATUS[status] || CHECK_STATUS.review_only
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.cls}`}>
      <span className="material-symbols-outlined text-[14px]">{cfg.icon}</span>
      {cfg.label}
    </span>
  )
}

export default function Reconciliation({ token }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [investigateKey, setInvestigateKey] = useState(null)
  const [dashSummary, setDashSummary] = useState(null)
  const [runs, setRuns]         = useState(null)
  const [showHistory, setShowHistory] = useState(false)
  const [running, setRunning]   = useState(false)
  const [itemSearch, setItemSearch]     = useState('')
  const [itemTypeFilter, setItemTypeFilter]         = useState('ALL')
  const [itemSeverityFilter, setItemSeverityFilter] = useState('ALL')

  const loadDashSummary = () => {
    if (!token) return
    fetch(`${API}/api/admin/financial/reconciliation/dashboard-summary`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(setDashSummary)
      .catch(() => setDashSummary(null))
  }

  const loadRuns = () => {
    if (!token) return
    fetch(`${API}/api/admin/financial/reconciliation/runs`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(j => setRuns(j.runs))
      .catch(() => setRuns([]))
  }

  useEffect(() => {
    if (!token) return
    setLoading(true)
    setError(null)
    fetch(`${API}/api/admin/financial/reconciliation`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => setData(d))
      .catch(e => setError(`Không thể tải dữ liệu đối soát (${e})`))
      .finally(() => setLoading(false))
    loadDashSummary()
    loadRuns()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const runAgain = async () => {
    setRunning(true)
    try {
      const r = await fetch(`${API}/api/admin/financial/reconciliation/run`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      })
      if (!r.ok) { window.alert('Không thể chạy đối soát.'); return }
      const j = await r.json()
      setData({ summary: j.summary, checks: j.checks, items: j.items })
      loadDashSummary(); loadRuns()
    } catch {
      window.alert('Lỗi kết nối.')
    } finally {
      setRunning(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24 text-gray-400">
      <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
      Đang thực hiện đối soát...
    </div>
  )

  if (error) return (
    <div className="p-8">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
    </div>
  )

  if (!data) return null

  const { summary, checks, items } = data

  const filteredItems = items.filter(it => {
    if (itemTypeFilter !== 'ALL' && it.type !== itemTypeFilter) return false
    if (itemSeverityFilter !== 'ALL' && it.severity !== itemSeverityFilter) return false
    if (itemSearch.trim()) {
      const q = itemSearch.trim().toLowerCase()
      const haystack = `${it.title} ${it.description} ${it.tutor_name || ''}`.toLowerCase()
      if (!haystack.includes(q)) return false
    }
    return true
  })

  const handleExport = async (format) => {
    try {
      if (format.startsWith('Excel')) await exportReconciliationExcel({ summary, checks, items: filteredItems })
      else if (format.startsWith('CSV')) exportReconciliationCSV({ items: filteredItems })
      else if (format.startsWith('PDF')) await exportReconciliationPDF({ checks, items: filteredItems })
    } catch {
      window.alert('Không thể xuất báo cáo.')
    }
  }

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <PageHeader title="Đối Soát" subtitle="Kiểm tra đối soát tài chính — chỉ đọc, không điều chỉnh dữ liệu">
        <ExportButton onExport={handleExport} label="Xuất Báo Cáo" />
        <button
          onClick={runAgain}
          disabled={running}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          <span className={`material-symbols-outlined text-[18px] ${running ? 'animate-spin' : ''}`}>refresh</span>
          {running ? 'Đang chạy...' : 'Chạy Đối Soát Lại'}
        </button>
      </PageHeader>

      {/* Module 16: extra dashboard cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Vấn đề nghiêm trọng', value: dashSummary ? dashSummary.critical_issues_count : '—', icon: 'error', color: 'bg-red-50 text-red-600' },
          { label: 'Sự cố đang mở',       value: dashSummary ? dashSummary.open_incidents_count : '—',   icon: 'report', color: 'bg-orange-50 text-orange-600' },
          { label: 'Lần đối soát gần nhất', value: dashSummary?.last_run ? fmtDate(dashSummary.last_run.created_at) : 'Chưa có', icon: 'history', color: 'bg-sky-50 text-sky-600' },
          { label: 'Lần kế tiếp theo lịch', value: 'Chưa cấu hình', icon: 'schedule', color: 'bg-gray-100 text-gray-500' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className={`w-9 h-9 rounded-lg ${c.color} flex items-center justify-center mb-3`}>
              <span className="material-symbols-outlined text-[18px]">{c.icon}</span>
            </div>
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">{c.label}</p>
            <p className="text-lg font-bold text-gray-900">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Read-only notice */}
      <div className="bg-sky-50 border border-sky-100 rounded-xl p-4 mb-6 flex items-start gap-3">
        <span className="material-symbols-outlined text-sky-500 text-[20px] mt-0.5">info</span>
        <div>
          <p className="text-sm font-semibold text-sky-800 mb-1">Chế độ chỉ xem</p>
          <p className="text-sm text-sky-700">
            Các kiểm tra dưới đây chỉ đọc dữ liệu để đối chiếu — hệ thống <strong>không</strong> tự sửa số dư, giải ngân escrow,
            duyệt rút tiền hay xử lý hoàn tiền. Chênh lệch cần xử lý thủ công.
          </p>
        </div>
      </div>

      {/* Summary KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Tổng số dư ví',       value: fmtMoney(summary.wallet_total_balance),      icon: 'account_balance_wallet', color: 'bg-blue-50 text-blue-600' },
          { label: 'Số dư tạm giữ',        value: fmtMoney(summary.wallet_total_held_balance), icon: 'lock',        color: 'bg-purple-50 text-purple-600' },
          { label: 'Escrow (giao dịch)',   value: fmtMoney(summary.escrow_amount),             icon: 'savings',     color: 'bg-sky-50 text-sky-600' },
          { label: 'Rút tiền chờ duyệt',   value: fmtMoney(summary.withdraw_pending_amount),   icon: 'schedule',    color: 'bg-amber-50 text-amber-600' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className={`w-9 h-9 rounded-lg ${c.color} flex items-center justify-center mb-3`}>
              <span className="material-symbols-outlined text-[18px]">{c.icon}</span>
            </div>
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">{c.label}</p>
            <p className="text-lg font-bold text-gray-900">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Issue/warning summary chips */}
      <div className="flex flex-wrap gap-3 mb-6">
        <span className="px-3 py-1.5 bg-gray-100 rounded-full text-sm font-medium text-gray-700">
          Nạp thành công: {fmtMoney(summary.successful_deposits)}
        </span>
        <span className="px-3 py-1.5 bg-gray-100 rounded-full text-sm font-medium text-gray-700">
          Thanh toán thành công: {fmtMoney(summary.successful_payments)}
        </span>
        <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${summary.issue_count > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
          Vấn đề: {summary.issue_count}
        </span>
        <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${summary.unmatched_count > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
          Cần xem xét: {summary.unmatched_count}
        </span>
      </div>

      {/* Checks cards */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-700 uppercase">Kiểm Tra Đối Soát ({checks.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {['Kiểm Tra', 'Dự Kiến', 'Thực Tế', 'Chênh Lệch', 'Trạng Thái', ''].map(h => (
                  <th key={h} className="py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {checks.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="text-sm font-semibold text-gray-900">{c.name}</div>
                    <div className="text-xs text-gray-400 max-w-md">{c.description}</div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">{fmtMoney(c.expected_amount)}</td>
                  <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">{fmtMoney(c.actual_amount)}</td>
                  <td className={`py-3 px-4 text-sm font-bold whitespace-nowrap ${c.difference !== 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {fmtMoney(c.difference)}
                  </td>
                  <td className="py-3 px-4"><CheckBadge status={c.status} /></td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {c.difference !== 0 && (
                      <button
                        onClick={() => setInvestigateKey(`check:${c.id}`)}
                        className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[14px]">search</span>
                        Điều tra
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review items */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-700 uppercase mb-3">
            Mục Cần Xem Xét ({filteredItems.length}/{items.length})
            <span className="ml-2 text-xs font-normal text-gray-400 normal-case">— giao dịch giá trị lớn, chỉ để xem</span>
          </h3>
          {/* Module 14: filters (client-side — data volume is small) */}
          <SearchFilterBar search={itemSearch} onSearch={setItemSearch} placeholder="Tìm theo tiêu đề, mô tả, gia sư...">
            <FilterTabs
              tabs={[{ value: 'ALL', label: 'Tất cả loại' }, { value: 'transaction', label: 'Giao dịch' }, { value: 'withdrawal', label: 'Rút tiền' }]}
              active={itemTypeFilter}
              onChange={setItemTypeFilter}
            />
            <FilterTabs
              tabs={[{ value: 'ALL', label: 'Mọi mức độ' }, { value: 'low', label: 'Thấp' }, { value: 'medium', label: 'Trung bình' }, { value: 'high', label: 'Cao' }]}
              active={itemSeverityFilter}
              onChange={setItemSeverityFilter}
            />
          </SearchFilterBar>
        </div>
        {filteredItems.length === 0 ? (
          <div className="p-8"><EmptyState title="Không có mục cần xem xét" description="Không có mục nào khớp với bộ lọc hiện tại." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['Tiêu Đề', 'Loại', 'Mô Tả', 'Số Tiền', 'Mức Độ', 'Trạng Thái', 'Ngày', ''].map(h => (
                    <th key={h} className="py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredItems.map(it => (
                  <tr key={it.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">{it.title}</td>
                    <td className="py-3 px-4 text-sm text-gray-500">{it.type}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 max-w-xs truncate" title={it.description}>{it.description}</td>
                    <td className="py-3 px-4 text-sm font-bold text-gray-900 whitespace-nowrap">{fmtMoney(it.amount)}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${SEV_COLOR[it.severity] || 'bg-gray-100 text-gray-600'}`}>
                        {it.severity === 'high' ? 'Cao' : it.severity === 'medium' ? 'Trung bình' : 'Thấp'}
                      </span>
                    </td>
                    <td className="py-3 px-4"><CheckBadge status={it.status} /></td>
                    <td className="py-3 px-4 text-sm text-gray-500 whitespace-nowrap">{fmtDate(it.created_at)}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <button
                        onClick={() => setInvestigateKey(`item:${it.id}`)}
                        className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[14px]">search</span>
                        Điều tra
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Module 13: Reconciliation History */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-6">
        <button
          onClick={() => setShowHistory(s => !s)}
          className="w-full flex items-center justify-between px-6 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
        >
          <h3 className="text-sm font-bold text-gray-700 uppercase">Lịch Sử Đối Soát ({runs ? runs.length : 0})</h3>
          <span className="material-symbols-outlined text-[20px] text-gray-500">{showHistory ? 'expand_less' : 'expand_more'}</span>
        </button>
        {showHistory && (
          !runs || runs.length === 0 ? (
            <div className="p-8"><EmptyState icon="history" title="Chưa có lịch sử" description="Chưa có lần đối soát nào được chạy thủ công." /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {['Thời Gian', 'Trạng Thái', 'Số Chênh Lệch', 'Thời Lượng', 'Người Thực Hiện'].map(h => (
                      <th key={h} className="py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {runs.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 text-sm text-gray-700 whitespace-nowrap">{fmtDate(r.created_at)}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${r.status === 'OK' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {r.status === 'OK' ? 'Không có vấn đề' : 'Phát hiện chênh lệch'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700">{r.difference_count}</td>
                      <td className="py-3 px-4 text-sm text-gray-500 whitespace-nowrap">{r.duration_ms != null ? `${r.duration_ms} ms` : '—'}</td>
                      <td className="py-3 px-4 text-sm text-gray-700">{r.performed_by_name || r.performed_by_email || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      <InvestigationDrawer
        token={token}
        findingKey={investigateKey}
        open={!!investigateKey}
        onClose={() => setInvestigateKey(null)}
      />
    </div>
  )
}
