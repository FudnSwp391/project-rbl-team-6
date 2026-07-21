import { useState, useEffect, useCallback } from 'react'
import { SectionCard, ModalOverlay, StatusBadge, EmptyState } from '../components'
import SeverityBadge from './SeverityBadge'

import { API_BASE_URL as API } from '../../../config'

const fmtMoney = n => (n == null ? '—' : 'đ' + Number(n).toLocaleString('vi-VN'))
const fmtDateTime = iso => (iso ? new Date(iso).toLocaleString('vi-VN') : '—')

function CreateIncidentModal({
  token, findingKey, defaultTitle, defaultDescription, defaultDifference, defaultRootCause, defaultSeverity,
  onClose, onCreated,
}) {
  const [title, setTitle] = useState(defaultTitle || '')
  const [description, setDescription] = useState(defaultDescription || '')
  const [assignedDeveloper, setAssignedDeveloper] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const submit = async () => {
    if (!title.trim()) { setError('Tiêu đề là bắt buộc.'); return }
    setBusy(true); setError(null)
    try {
      const r = await fetch(`${API}/api/admin/incidents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          finding_key: findingKey, title: title.trim(), description,
          difference_amount: defaultDifference, root_cause: defaultRootCause,
          severity: defaultSeverity, assigned_developer: assignedDeveloper || null,
        }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { setError(j.message || 'Không thể tạo sự cố.'); return }
      onCreated(j.incident)
      onClose()
    } catch {
      setError('Lỗi kết nối.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-[480px] max-w-[90vw] p-6 space-y-4">
        <h3 className="text-lg font-bold text-gray-900">Tạo Sự Cố</h3>
        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>}
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Tiêu đề *</label>
          <input value={title} onChange={e => setTitle(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Mô tả</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-primary" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Nhà phát triển phụ trách</label>
          <input value={assignedDeveloper} onChange={e => setAssignedDeveloper(e.target.value)} placeholder="email hoặc tên"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50">
            Huỷ
          </button>
          <button onClick={submit} disabled={busy}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50">
            {busy ? 'Đang tạo...' : 'Tạo sự cố'}
          </button>
        </div>
      </div>
    </ModalOverlay>
  )
}

// Module 10: incident tracking scoped to this finding — advisory record only,
// never touches wallets/transactions.
export default function IncidentPanel({ token, findingKey, findingTitle, findingDescription, difference, rootCause, severity }) {
  const [incidents, setIncidents] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  const load = useCallback(() => {
    if (!token || !findingKey) return
    setLoading(true)
    fetch(`${API}/api/admin/incidents?findingKey=${encodeURIComponent(findingKey)}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(j => setIncidents(j.incidents))
      .catch(() => setIncidents([]))
      .finally(() => setLoading(false))
  }, [token, findingKey])

  useEffect(() => { load() }, [load])

  return (
    <SectionCard title="Sự Cố" icon="report"
      action={
        <button onClick={() => setShowCreate(true)}
          className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90">
          + Tạo sự cố
        </button>
      }>
      <div className="p-5">
        {loading ? (
          <p className="text-sm text-gray-400">Đang tải...</p>
        ) : !incidents || incidents.length === 0 ? (
          <EmptyState icon="report" title="Chưa có sự cố nào" description="Chưa có sự cố nào được tạo cho mục này." />
        ) : (
          <div className="space-y-3">
            {incidents.map(inc => (
              <div key={inc.id} className="border border-gray-100 rounded-lg p-3">
                <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                  <span className="font-semibold text-gray-900 text-sm">{inc.title}</span>
                  <div className="flex items-center gap-1.5">
                    <SeverityBadge severity={inc.severity} />
                    <StatusBadge status={inc.status.toUpperCase()} />
                  </div>
                </div>
                {inc.description && <p className="text-xs text-gray-500 mb-1">{inc.description}</p>}
                <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                  <span>Chênh lệch: {fmtMoney(inc.difference_amount)}</span>
                  {inc.assigned_developer && <span>Phụ trách: {inc.assigned_developer}</span>}
                  <span>{fmtDateTime(inc.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {showCreate && (
        <CreateIncidentModal
          token={token} findingKey={findingKey}
          defaultTitle={findingTitle} defaultDescription={findingDescription}
          defaultDifference={difference} defaultRootCause={rootCause} defaultSeverity={severity}
          onClose={() => setShowCreate(false)}
          onCreated={() => load()}
        />
      )}
    </SectionCard>
  )
}
