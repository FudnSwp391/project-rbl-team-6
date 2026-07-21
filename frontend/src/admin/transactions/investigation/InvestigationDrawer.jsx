import { useState, useEffect, useCallback } from 'react'
import { Drawer, SectionCard, Timeline, StatusBadge, EmptyState } from '../components'
import SeverityBadge from './SeverityBadge'
import AISummaryCard from './AISummaryCard'
import DifferenceAnalysisCard from './DifferenceAnalysisCard'
import EvidencePanel from './EvidencePanel'
import TransactionTraceTable from './TransactionTraceTable'
import SystemLogs from './SystemLogs'
import RecommendationCard from './RecommendationCard'

import { API_BASE_URL as API } from '../../../config'

const fmtMoney = n => 'đ' + Number(n || 0).toLocaleString('vi-VN')

export default function InvestigationDrawer({ token, findingKey, open, onClose }) {
  const [findingData, setFindingData] = useState(null)
  const [evidence, setEvidence]       = useState(null)
  const [analysis, setAnalysis]       = useState(null)
  const [transactions, setTransactions] = useState(null)
  const [timeline, setTimeline]       = useState(null)
  const [logs, setLogs]               = useState(null)
  const [loading, setLoading]         = useState(true)
  const [statusBusy, setStatusBusy]   = useState(false)

  const encodedKey = findingKey ? encodeURIComponent(findingKey) : null

  const load = useCallback(() => {
    if (!token || !encodedKey) return
    setLoading(true)
    const headers = { Authorization: `Bearer ${token}` }
    const base = `${API}/api/admin/financial/reconciliation/findings/${encodedKey}`
    Promise.all([
      fetch(base, { headers }).then(r => r.ok ? r.json() : Promise.reject(r.status)),
      fetch(`${base}/evidence`, { headers }).then(r => r.ok ? r.json() : Promise.reject(r.status)),
      fetch(`${base}/analysis`, { headers }).then(r => r.ok ? r.json() : Promise.reject(r.status)),
      fetch(`${base}/transactions`, { headers }).then(r => r.ok ? r.json() : Promise.reject(r.status)),
      fetch(`${base}/timeline`, { headers }).then(r => r.ok ? r.json() : Promise.reject(r.status)),
      fetch(`${base}/logs`, { headers }).then(r => r.ok ? r.json() : Promise.reject(r.status)),
    ])
      .then(([f, e, a, t, tl, l]) => {
        setFindingData(f); setEvidence(e); setAnalysis(a)
        setTransactions(t.transactions); setTimeline(tl.events); setLogs(l)
      })
      .catch(() => {
        setFindingData(null); setEvidence(null); setAnalysis(null)
        setTransactions(null); setTimeline(null); setLogs(null)
      })
      .finally(() => setLoading(false))
  }, [token, encodedKey])

  useEffect(() => {
    if (open && encodedKey) load()
    if (!open) {
      setFindingData(null); setEvidence(null); setAnalysis(null)
      setTransactions(null); setTimeline(null); setLogs(null)
    }
  }, [open, encodedKey, load])

  const changeStatus = async (newStatus) => {
    setStatusBusy(true)
    try {
      const r = await fetch(`${API}/api/admin/financial/reconciliation/findings/${encodedKey}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { window.alert(j.message || 'Không thể cập nhật trạng thái.'); return }
      load()
    } catch {
      window.alert('Lỗi kết nối.')
    } finally {
      setStatusBusy(false)
    }
  }

  const status = findingData?.investigation?.status || 'OPEN'

  return (
    <Drawer open={open} onClose={onClose} title="Điều Tra Chênh Lệch Đối Soát" width="w-[680px]">
      {loading ? (
        <div className="flex items-center justify-center py-24 text-gray-400">
          <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>Đang tải...
        </div>
      ) : !findingData ? (
        <EmptyState icon="error" title="Không tải được chi tiết" description="Vui lòng đóng và thử lại." />
      ) : (
        <div className="space-y-4">
          {/* 1. Summary */}
          <SectionCard title="Tổng Quan" icon="summarize"
            action={
              <div className="flex items-center gap-2">
                <SeverityBadge severity={findingData.severity} />
                <StatusBadge status={status} />
              </div>
            }>
            <div className="p-5 space-y-3">
              <div>
                <p className="text-xs text-gray-400 uppercase font-semibold mb-1">
                  {findingData.finding_type === 'check' ? 'Kiểm tra đối soát' : 'Mục cần xem xét'}
                </p>
                <p className="font-semibold text-gray-900">{findingData.finding.name || findingData.finding.title}</p>
                {findingData.finding.description && (
                  <p className="text-sm text-gray-500 mt-1">{findingData.finding.description}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Chênh lệch</p>
                <p className="text-lg font-bold text-gray-900">{fmtMoney(findingData.difference)}</p>
              </div>
              <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                {status !== 'INVESTIGATING' && (
                  <button disabled={statusBusy} onClick={() => changeStatus('INVESTIGATING')}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-50">
                    Đánh dấu đang điều tra
                  </button>
                )}
                {status !== 'RESOLVED' && (
                  <button disabled={statusBusy} onClick={() => changeStatus('RESOLVED')}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50">
                    Đánh dấu đã xem xét
                  </button>
                )}
                {['RESOLVED', 'CLOSED'].includes(status) && (
                  <button disabled={statusBusy} onClick={() => changeStatus('OPEN')}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50 disabled:opacity-50">
                    Mở lại điều tra
                  </button>
                )}
              </div>
            </div>
          </SectionCard>

          {/* 2. AI Summary */}
          <AISummaryCard analysis={analysis} />

          {/* 3. Difference Analysis */}
          <DifferenceAnalysisCard analysis={analysis} />

          {/* 4. Evidence */}
          <EvidencePanel evidence={evidence} />

          {/* 6. Transaction Trace */}
          <SectionCard title="Dấu Vết Giao Dịch" icon="receipt_long">
            <TransactionTraceTable transactions={transactions} />
          </SectionCard>

          {/* 7. Timeline (reuses the shared Timeline component — not duplicated) */}
          <SectionCard title="Dòng Thời Gian" icon="timeline">
            <div className="p-5">
              {(timeline || []).length === 0
                ? <EmptyState icon="timeline" title="Chưa có sự kiện" description="Chưa ghi nhận hoạt động nào." />
                : <Timeline steps={timeline.map(e => ({ done: true, label: e.label, time: new Date(e.time).toLocaleString('vi-VN') }))} />}
            </div>
          </SectionCard>

          {/* 12. System Logs */}
          <SectionCard title="Nhật Ký Hệ Thống" icon="terminal">
            <SystemLogs logs={logs} />
          </SectionCard>

          {/* 9. Recommended Actions */}
          <RecommendationCard recommendation={analysis?.analysis?.recommendation} />
        </div>
      )}
    </Drawer>
  )
}
