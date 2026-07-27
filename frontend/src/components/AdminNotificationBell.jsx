import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'

import { API_BASE_URL as API } from '../config'

const POLL_MS = 60_000 // 1 phút

function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'Vừa xong'
  if (m < 60) return `${m} phút trước`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} giờ trước`
  return `${Math.floor(h / 24)} ngày trước`
}

const SEV = {
  high:   { dot: 'bg-red-500',   badge: 'bg-red-50 text-red-700 border-red-100',   icon: 'warning',           iconCls: 'text-red-500'  },
  medium: { dot: 'bg-amber-400', badge: 'bg-amber-50 text-amber-700 border-amber-100', icon: 'priority_high', iconCls: 'text-amber-500' },
  low:    { dot: 'bg-blue-400',  badge: 'bg-blue-50 text-blue-700 border-blue-100',  icon: 'info',             iconCls: 'text-blue-500'  },
}

export default function AdminNotificationBell({ token, onNavigate }) {
  const [open, setOpen]       = useState(false)
  const [alerts, setAlerts]   = useState([])
  const [loading, setLoading] = useState(true)
  const [dropPos, setDropPos] = useState({ top: 0, right: 0 })
  const [seen, setSeen]       = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('admin_notif_seen') || '[]')) }
    catch { return new Set() }
  })
  const ref     = useRef(null)
  const btnRef  = useRef(null)
  const dropRef = useRef(null)

  const fetchAlerts = useCallback(async () => {
    if (!token) return
    try {
      const headers = { Authorization: `Bearer ${token}` }
      const [statsRes, wdRes, fraudRes, bankRes] = await Promise.allSettled([
        fetch(`${API}/api/admin/analytics/dashboard/stats`, { headers }),
        fetch(`${API}/api/admin/transactions/withdrawals?status=pending&limit=50`, { headers }),
        fetch(`${API}/api/admin/fraud-alerts`, { headers }),
        fetch(`${API}/api/admin/wallet/bank-accounts`, { headers }),
      ])

      const list = []

      // ── Stats ──────────────────────────────────────────────────────────────
      if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
        const s = await statsRes.value.json()
        if (s.pending_tutors > 0) {
          list.push({
            id: 'stat-pending-tutors',
            sev: s.pending_tutors >= 5 ? 'high' : 'medium',
            icon: 'how_to_reg',
            iconCls: s.pending_tutors >= 5 ? 'text-red-500' : 'text-amber-500',
            title: 'Hồ sơ gia sư chờ duyệt',
            body: `${s.pending_tutors} hồ sơ đang chờ xem xét`,
            view: 'tutor-approval',
            at: null,
          })
        }
        if (s.open_disputes > 0) {
          list.push({
            id: 'stat-open-disputes',
            sev: s.open_disputes >= 3 ? 'high' : 'medium',
            icon: 'gavel',
            iconCls: s.open_disputes >= 3 ? 'text-red-500' : 'text-amber-500',
            title: 'Tranh chấp đang mở',
            body: `${s.open_disputes} khiếu nại chưa được giải quyết`,
            view: 'tx-disputes',
            at: null,
          })
        }
      }

      // ── Pending withdrawals ─────────────────────────────────────────────────
      if (wdRes.status === 'fulfilled' && wdRes.value.ok) {
        const wd = await wdRes.value.json()
        const rows = wd.withdrawals || wd.requests || wd.data || []
        const pending = rows.filter(r =>
          (r.status || '').toLowerCase() === 'pending'
        )
        if (pending.length > 0) {
          const totalAmt = pending.reduce((s, r) => s + Number(r.amount || 0), 0)
          list.push({
            id: 'wd-pending',
            sev: 'medium',
            icon: 'account_balance',
            iconCls: 'text-amber-500',
            title: 'Yêu cầu rút tiền chờ duyệt',
            body: `${pending.length} yêu cầu · ${totalAmt > 0 ? totalAmt.toLocaleString('vi-VN') + 'đ' : ''}`,
            view: 'tx-withdrawals',
            at: pending[0]?.created_at || null,
          })
        }
      }

      // ── Pending bank accounts ───────────────────────────────────────────────
      if (bankRes.status === 'fulfilled' && bankRes.value.ok) {
        const bd = await bankRes.value.json()
        const rows = bd.bankAccounts || []
        const pending = rows.filter(r => (r.status || '').toLowerCase() === 'pending')
        if (pending.length > 0) {
          list.push({
            id: 'bank-pending',
            sev: 'medium',
            icon: 'credit_card',
            iconCls: 'text-blue-500',
            title: 'Tài khoản ngân hàng chờ duyệt',
            body: `${pending.length} yêu cầu xác minh ngân hàng mới`,
            view: 'tx-withdrawals',
            onClick: () => {
              sessionStorage.setItem('admin_wallet_tab', 'bank-accounts')
              window.dispatchEvent(new Event('admin_wallet_tab_changed'))
            },
            at: pending[0]?.created_at || null,
          })
        }
      }

      // ── Fraud alerts ───────────────────────────────────────────────────────
      if (fraudRes.status === 'fulfilled' && fraudRes.value.ok) {
        const fd = await fraudRes.value.json()
        const highAlerts = (fd.alerts || []).filter(a => a.severity === 'HIGH')
        if (highAlerts.length > 0) {
          list.push({
            id: 'fraud-high',
            sev: 'high',
            icon: 'security',
            iconCls: 'text-red-500',
            title: 'Cảnh báo gian lận nghiêm trọng',
            body: `${highAlerts.length} cảnh báo mức HIGH cần xem xét ngay`,
            view: 'tx-fraud',
            at: highAlerts[0]?.created_at || null,
          })
        }
        const medAlerts = (fd.alerts || []).filter(a => a.severity === 'MEDIUM')
        if (medAlerts.length > 0) {
          list.push({
            id: 'fraud-medium',
            sev: 'low',
            icon: 'shield',
            iconCls: 'text-blue-500',
            title: 'Hoạt động bất thường',
            body: `${medAlerts.length} cảnh báo mức trung cần kiểm tra`,
            view: 'tx-fraud',
            at: medAlerts[0]?.created_at || null,
          })
        }
      }

      // Sắp xếp: high → medium → low
      const order = { high: 0, medium: 1, low: 2 }
      list.sort((a, b) => (order[a.sev] ?? 3) - (order[b.sev] ?? 3))
      setAlerts(list)
    } catch (e) {
      console.error('[AdminNotificationBell] fetch error:', e)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchAlerts()
    const id = setInterval(fetchAlerts, POLL_MS)
    return () => clearInterval(id)
  }, [fetchAlerts])

  // Đóng khi click ra ngoài — dropdown nằm trong portal (document.body) nên phải
  // kiểm tra cả nút chuông (ref) LẪN nội dung dropdown (dropRef), nếu không
  // mousedown sẽ đóng dropdown trước khi onClick của nút "Xem" kịp chạy.
  useEffect(() => {
    if (!open) return
    const handler = e => {
      const inBtn  = ref.current && ref.current.contains(e.target)
      const inDrop = dropRef.current && dropRef.current.contains(e.target)
      if (!inBtn && !inDrop) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const unseenCount = alerts.filter(a => !seen.has(a.id)).length

  function handleOpen() {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setDropPos({ top: r.bottom + 8, right: window.innerWidth - r.right })
    }
    setOpen(v => !v)
  }

  function markAllSeen() {
    const next = new Set(alerts.map(a => a.id))
    setSeen(next)
    localStorage.setItem('admin_notif_seen', JSON.stringify([...next]))
  }

  function handleClick(alert) {
    // đánh dấu đã xem
    const next = new Set([...seen, alert.id])
    setSeen(next)
    localStorage.setItem('admin_notif_seen', JSON.stringify([...next]))
    if (alert.onClick) alert.onClick()
    if (alert.view && onNavigate) onNavigate(alert.view)
    setOpen(false)
  }

  return (
    <div ref={ref}>
      {/* Bell button */}
      <button
        ref={btnRef}
        onClick={handleOpen}
        className="relative w-10 h-10 rounded-xl flex items-center justify-center text-on-surface-variant hover:bg-gray-100 hover:text-primary transition-colors"
        title="Thông báo admin"
      >
        <span className="material-symbols-outlined text-[22px]">
          {unseenCount > 0 ? 'notifications_active' : 'notifications'}
        </span>
        {unseenCount > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {unseenCount > 9 ? '9+' : unseenCount}
          </span>
        )}
      </button>

      {/* Dropdown — rendered via portal to escape header overflow:hidden */}
      {open && createPortal(
        <div
          ref={dropRef}
          className="w-[360px] bg-white rounded-2xl shadow-xl border border-black/[0.08] z-[9999] overflow-hidden"
          style={{ position: 'fixed', top: dropPos.top, right: dropPos.right }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">admin_panel_settings</span>
              <span className="font-semibold text-sm text-on-surface">Thông báo Admin</span>
              {alerts.length > 0 && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {alerts.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unseenCount > 0 && (
                <button
                  onClick={markAllSeen}
                  className="text-[11px] text-primary font-semibold hover:underline px-2 py-1"
                >
                  Đánh dấu đã đọc
                </button>
              )}
              <button
                onClick={() => { fetchAlerts(); }}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-gray-100 transition-colors"
                title="Làm mới"
              >
                <span className="material-symbols-outlined text-[16px]">refresh</span>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="max-h-[420px] overflow-y-auto">
            {loading ? (
              <div className="p-6 flex flex-col gap-3">
                {[1,2,3].map(i => (
                  <div key={i} className="flex gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gray-100 animate-pulse shrink-0" />
                    <div className="flex-1 space-y-2 pt-1">
                      <div className="h-3.5 bg-gray-100 rounded animate-pulse w-3/4" />
                      <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <span className="material-symbols-outlined text-4xl text-emerald-400 mb-2">check_circle</span>
                <p className="text-sm font-semibold text-on-surface">Không có cảnh báo</p>
                <p className="text-xs text-on-surface-variant mt-1">Hệ thống đang hoạt động bình thường</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {alerts.map(alert => {
                  const s = SEV[alert.sev] || SEV.low
                  const isUnseen = !seen.has(alert.id)
                  return (
                    <li key={alert.id}>
                      <button
                        onClick={() => handleClick(alert)}
                        className={`w-full text-left flex gap-3 px-4 py-3.5 hover:bg-gray-50/80 transition-colors ${isUnseen ? 'bg-blue-50/30' : ''}`}
                      >
                        {/* Icon */}
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          alert.sev === 'high'   ? 'bg-red-50' :
                          alert.sev === 'medium' ? 'bg-amber-50' : 'bg-blue-50'
                        }`}>
                          <span className={`material-symbols-outlined text-[18px] ${alert.iconCls}`}>
                            {alert.icon}
                          </span>
                        </div>
                        {/* Text */}
                        <div className="flex-1 min-w-0 pt-0.5">
                          <div className="flex items-start gap-2 justify-between">
                            <p className="text-[13px] font-semibold text-on-surface leading-snug">{alert.title}</p>
                            {isUnseen && (
                              <span className={`w-2 h-2 rounded-full mt-1 shrink-0 ${s.dot}`} />
                            )}
                          </div>
                          <p className="text-[12px] text-on-surface-variant mt-0.5 leading-relaxed">{alert.body}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${s.badge}`}>
                              {alert.sev === 'high' ? 'Khẩn' : alert.sev === 'medium' ? 'Chú ý' : 'Thông tin'}
                            </span>
                            {alert.at && (
                              <span className="text-[11px] text-on-surface-variant">{timeAgo(alert.at)}</span>
                            )}
                            {alert.view && (
                              <span className="ml-auto text-[11px] text-primary font-semibold flex items-center gap-0.5">
                                Xem <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* Footer */}
          {alerts.length > 0 && (
            <div className="border-t border-gray-100 px-4 py-2.5">
              <p className="text-[11px] text-on-surface-variant">
                Tự động cập nhật mỗi 1 phút
              </p>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}
