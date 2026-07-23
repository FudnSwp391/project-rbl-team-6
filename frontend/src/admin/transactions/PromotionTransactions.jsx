import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  KpiCard, SkeletonCard, EmptyState, PageHeader, SearchFilterBar, FilterTabs,
  Pagination, usePagination, ModalOverlay, Drawer, SectionCard,
} from './components'
import AnalyticsChart from '../analytics/charts'

import { API_BASE_URL as API } from '../../config'

const fmtMoney = n => 'đ' + Number(n || 0).toLocaleString('vi-VN')
const fmtDate  = iso => iso ? new Date(iso).toLocaleDateString('vi-VN') : '—'
const fmtInt   = n => Number(n || 0).toLocaleString('vi-VN')

const daysUntil = iso => iso ? Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000) : null

// Derives a single display status from active/expires_at — kept local (not the
// shared StatusBadge vocabulary) since this page needs 4 distinct states,
// including "expiring soon" which is a warning on top of "active", not its own DB value.
function computeStatus(c) {
  if (!c.active) return 'inactive'
  const d = daysUntil(c.expires_at)
  if (d !== null && d < 0) return 'expired'
  if (d !== null && d <= 7) return 'expiring'
  return 'active'
}

const STATUS_CFG = {
  active:   { label: 'Đang hoạt động', cls: 'bg-emerald-100 text-emerald-700 border border-emerald-200' },
  inactive: { label: 'Ngừng hoạt động', cls: 'bg-gray-100 text-gray-600 border border-gray-200' },
  expired:  { label: 'Hết hạn',         cls: 'bg-red-100 text-red-700 border border-red-200' },
  expiring: { label: 'Sắp hết hạn',     cls: 'bg-amber-100 text-amber-700 border border-amber-200' },
}

function PromoStatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.inactive
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${cfg.cls}`}>{cfg.label}</span>
}

function TypeBadge({ type }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${type === 'percent' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>
      {type === 'percent' ? 'Phần trăm' : 'Cố định'}
    </span>
  )
}

const HIGH_USAGE_THRESHOLD = 10
const SORT_COLS = {
  code: c => c.code, value: c => Number(c.value), times_used: c => c.times_used,
  revenue_generated: c => Number(c.revenue_generated), created_at: c => new Date(c.created_at).getTime(),
  expires_at: c => c.expires_at ? new Date(c.expires_at).getTime() : Infinity,
}

// ─── Create / Edit form (shared shape) ─────────────────────────────────────────
function CouponForm({ initial, onCancel, onSubmit, saving, isEdit }) {
  const [form, setForm] = useState(initial)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div className="space-y-4">
      {!isEdit && (
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Mã code <span className="text-red-500">*</span></label>
          <input value={form.code} onChange={e => set('code', e.target.value.toUpperCase())}
            placeholder="TET2026" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:border-blue-500" />
        </div>
      )}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Mô tả</label>
        <input value={form.description || ''} onChange={e => set('description', e.target.value)}
          placeholder="Giảm 10% toàn đơn" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Loại</label>
          <select value={form.discount_type} disabled={isEdit} onChange={e => set('discount_type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white disabled:bg-gray-50 disabled:text-gray-400 focus:outline-none focus:border-blue-500">
            <option value="percent">Phần trăm (%)</option>
            <option value="fixed">Cố định (đ)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Giá trị <span className="text-red-500">*</span></label>
          <input type="number" min="1" value={form.discount_value} onChange={e => set('discount_value', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Giảm tối đa (đ)</label>
          <input type="number" min="0" value={form.max_discount || ''} onChange={e => set('max_discount', e.target.value)}
            placeholder="Không giới hạn" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Đơn tối thiểu (đ)</label>
          <input type="number" min="0" value={form.min_order || ''} onChange={e => set('min_order', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Ngày hết hạn</label>
        <input type="date" value={form.expires_at ? String(form.expires_at).slice(0, 10) : ''} onChange={e => set('expires_at', e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button onClick={onCancel} disabled={saving} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors">Hủy</button>
        <button onClick={() => onSubmit(form)} disabled={saving || !String(form.discount_value).trim()}
          className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-colors flex items-center gap-2">
          {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          {isEdit ? 'Lưu thay đổi' : 'Tạo mã'}
        </button>
      </div>
    </div>
  )
}

// ─── Detail Drawer ──────────────────────────────────────────────────────────────
function CouponDrawer({ id, token, onClose, onChanged }) {
  const [detail, setDetail]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [err, setErr]         = useState('')
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/admin/coupons/${id}`, { headers })
      if (res.ok) setDetail(await res.json())
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  const toggleActive = async () => {
    setSaving(true)
    try {
      await fetch(`${API}/api/admin/coupons/${id}`, { method: 'PATCH', headers, body: JSON.stringify({ active: !detail.active }) })
      await load(); onChanged?.()
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  const handleSave = async (form) => {
    setSaving(true); setErr('')
    try {
      const res = await fetch(`${API}/api/admin/coupons/${id}`, {
        method: 'PATCH', headers,
        body: JSON.stringify({
          description: form.description, discount_value: Number(form.discount_value),
          max_discount: form.max_discount === '' ? null : Number(form.max_discount),
          min_order: Number(form.min_order) || 0, expires_at: form.expires_at || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setErr(data.message || 'Lỗi cập nhật.'); setSaving(false); return }
      setEditing(false); await load(); onChanged?.()
    } catch { setErr('Lỗi kết nối.') }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!confirm(`Xóa mã "${detail.code}"? Hành động này không thể hoàn tác.`)) return
    setSaving(true)
    try {
      const res = await fetch(`${API}/api/admin/coupons/${id}`, { method: 'DELETE', headers })
      const data = await res.json()
      if (!res.ok) { alert(data.message || 'Không thể xóa.'); setSaving(false); return }
      onChanged?.(); onClose()
    } catch { alert('Lỗi kết nối.'); setSaving(false) }
  }

  return (
    <Drawer open onClose={onClose} title={detail ? `Mã ${detail.code}` : 'Đang tải...'}>
      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : !detail ? (
        <EmptyState title="Không tìm thấy" description="Mã giảm giá này có thể đã bị xóa." />
      ) : (
        <div className="space-y-5">
          <SectionCard title="Thông tin chung" icon="info"
            action={!editing && (
              <div className="flex items-center gap-2">
                <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500" title="Sửa"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                <button onClick={handleDelete} disabled={saving} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="Xóa"><span className="material-symbols-outlined text-[18px]">delete</span></button>
              </div>
            )}>
            <div className="p-4">
              {editing ? (
                <CouponForm isEdit initial={{ ...detail, discount_value: detail.value }} saving={saving} onCancel={() => setEditing(false)} onSubmit={handleSave} />
              ) : (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-xs text-gray-400 mb-0.5">Mã code</p><code className="font-mono font-bold text-blue-700">{detail.code}</code></div>
                  <div><p className="text-xs text-gray-400 mb-0.5">Trạng thái</p><PromoStatusBadge status={computeStatus(detail)} /></div>
                  <div className="col-span-2"><p className="text-xs text-gray-400 mb-0.5">Mô tả</p><p className="text-gray-800">{detail.description || '—'}</p></div>
                  <div><p className="text-xs text-gray-400 mb-0.5">Loại</p><TypeBadge type={detail.type} /></div>
                  <div><p className="text-xs text-gray-400 mb-0.5">Giá trị</p><p className="font-bold text-red-600">{detail.type === 'percent' ? `${detail.value}%` : fmtMoney(detail.value)}</p></div>
                  <div><p className="text-xs text-gray-400 mb-0.5">Giảm tối đa</p><p>{detail.max_discount ? fmtMoney(detail.max_discount) : '—'}</p></div>
                  <div><p className="text-xs text-gray-400 mb-0.5">Đơn tối thiểu</p><p>{detail.min_order ? fmtMoney(detail.min_order) : '—'}</p></div>
                  <div><p className="text-xs text-gray-400 mb-0.5">Ngày tạo</p><p>{fmtDate(detail.created_at)}</p></div>
                  <div><p className="text-xs text-gray-400 mb-0.5">Hết hạn</p><p>{fmtDate(detail.expires_at) || 'Không giới hạn'}</p></div>
                  <div className="col-span-2 pt-2 border-t border-gray-100">
                    <button onClick={toggleActive} disabled={saving}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${detail.active ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}>
                      {detail.active ? 'Ngừng hoạt động' : 'Kích hoạt lại'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Thống kê sử dụng" icon="query_stats">
            <div className="grid grid-cols-2 gap-3 p-4">
              {[
                { label: 'Lượt dùng', value: fmtInt(detail.stats.times_used) },
                { label: 'Tổng giảm giá', value: fmtMoney(detail.stats.total_discount_given) },
                { label: 'Doanh thu tạo ra', value: fmtMoney(detail.stats.revenue_generated) },
                { label: 'Giảm TB / đơn', value: fmtMoney(detail.stats.avg_discount_per_order) },
              ].map(s => (
                <div key={s.label} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">{s.label}</p>
                  <p className="text-base font-bold text-gray-900">{s.value}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Giao dịch gần đây" icon="receipt_long">
            {detail.recent_usages.length === 0 ? (
              <EmptyState icon="receipt_long" title="Chưa có lượt dùng" description="Mã này chưa được áp dụng trong đơn hàng nào." />
            ) : (
              <div className="divide-y divide-gray-50">
                {detail.recent_usages.map(u => (
                  <div key={u.id} className="flex items-center justify-between px-4 py-3 text-sm">
                    <div>
                      <p className="font-medium text-gray-800">{u.user_name || 'Ẩn danh'}</p>
                      <p className="text-xs text-gray-400">{u.user_email} · {u.items_count} khóa học</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-600">-{fmtMoney(u.discount_amount)}</p>
                      <p className="text-xs text-gray-400">{fmtDate(u.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {err && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">{err}</div>}
        </div>
      )}
    </Drawer>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────────
export default function PromotionTransactions({ token }) {
  const [coupons, setCoupons]           = useState([])
  const [courseScopedCount, setCsc]     = useState(0)
  const [legacyTx, setLegacyTx]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)

  const [search, setSearch]             = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter]     = useState('all')
  const [sortKey, setSortKey]           = useState('created_at')
  const [sortDir, setSortDir]           = useState('desc')

  const [selectedId, setSelectedId]     = useState(null)
  const [showCreate, setShowCreate]     = useState(false)
  const [creating, setCreating]         = useState(false)
  const [createErr, setCreateErr]       = useState('')

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true); setError(null)
    try {
      const [couRes, legRes] = await Promise.all([
        fetch(`${API}/api/admin/coupons`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/admin/promotion-transactions`, { headers: { Authorization: `Bearer ${token}` } }),
      ])
      if (!couRes.ok) throw new Error(`HTTP ${couRes.status}`)
      const cou = await couRes.json()
      setCoupons(cou.coupons || []); setCsc(cou.course_scoped_count || 0)
      if (legRes.ok) { const leg = await legRes.json(); setLegacyTx(leg.transactions || []) }
    } catch (e) { setError(`Không thể tải dữ liệu khuyến mãi (${e.message})`) }
    setLoading(false)
  }, [token])

  useEffect(() => { load() }, [load])

  // ── KPIs (client-side, memoized — one pass over the already-fetched list) ──
  const kpis = useMemo(() => {
    const total_redemptions = coupons.reduce((s, c) => s + c.times_used, 0)
    const total_discount_given = coupons.reduce((s, c) => s + Number(c.total_discount_given), 0)
    const revenue_generated = coupons.reduce((s, c) => s + Number(c.revenue_generated), 0)
    return {
      total_promotions: coupons.length,
      active_promotions: coupons.filter(c => c.active).length,
      total_redemptions,
      total_discount_given,
      revenue_generated,
      average_discount: total_redemptions > 0 ? total_discount_given / total_redemptions : 0,
      expiring_soon: coupons.filter(c => computeStatus(c) === 'expiring').length,
    }
  }, [coupons])

  const health = useMemo(() => ({
    expiring_soon: coupons.filter(c => computeStatus(c) === 'expiring').length,
    expired:       coupons.filter(c => computeStatus(c) === 'expired').length,
    never_used:    coupons.filter(c => c.times_used === 0).length,
    high_usage:    coupons.filter(c => c.times_used >= HIGH_USAGE_THRESHOLD).length,
    inactive:      coupons.filter(c => !c.active).length,
  }), [coupons])

  // ── Filter → sort pipeline (client-side; data set is small, avoids refetch) ──
  const filtered = useMemo(() => {
    let list = coupons
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(c => c.code.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q))
    }
    if (statusFilter !== 'all') list = list.filter(c => computeStatus(c) === statusFilter)
    if (typeFilter !== 'all') list = list.filter(c => c.type === typeFilter)
    const getVal = SORT_COLS[sortKey] || SORT_COLS.created_at
    const sorted = [...list].sort((a, b) => {
      const va = getVal(a), vb = getVal(b)
      const cmp = typeof va === 'string' ? va.localeCompare(vb) : va - vb
      return sortDir === 'asc' ? cmp : -cmp
    })
    return sorted
  }, [coupons, search, statusFilter, typeFilter, sortKey, sortDir])

  const { page, setPage, totalPages, paginated } = usePagination(filtered, 10)

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const handleCreate = async (form) => {
    setCreating(true); setCreateErr('')
    try {
      const res = await fetch(`${API}/api/admin/coupons`, {
        method: 'POST', headers,
        body: JSON.stringify({
          code: form.code, description: form.description, discount_type: form.discount_type,
          discount_value: Number(form.discount_value),
          max_discount: form.max_discount === '' || form.max_discount == null ? null : Number(form.max_discount),
          min_order: Number(form.min_order) || 0, expires_at: form.expires_at || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setCreateErr(data.message || 'Lỗi tạo mã.'); setCreating(false); return }
      setShowCreate(false); await load()
    } catch { setCreateErr('Lỗi kết nối.') }
    setCreating(false)
  }

  // ── Analytics charts (reuse the repo's existing hand-rolled chart primitives) ──
  const charts = useMemo(() => {
    const withUsage = coupons.filter(c => c.times_used > 0)
    const topUsage = [...withUsage].sort((a, b) => b.times_used - a.times_used).slice(0, 5)
    const topRevenue = [...withUsage].sort((a, b) => Number(b.revenue_generated) - Number(a.revenue_generated)).slice(0, 5)
    const percentCount = coupons.filter(c => c.type === 'percent').length
    const fixedCount = coupons.filter(c => c.type === 'fixed').length
    return {
      topUsage: { type: 'leaderboard', labels: topUsage.map(c => c.code), values: topUsage.map(c => c.times_used) },
      topRevenue: { type: 'bar', labels: topRevenue.map(c => c.code), values: topRevenue.map(c => Number(c.revenue_generated)) },
      typeDist: { type: 'pie', labels: ['Phần trăm', 'Cố định'], values: [percentCount, fixedCount] },
    }
  }, [coupons])

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <PageHeader title="Khuyến Mãi" subtitle="Quản lý mã giảm giá toàn nền tảng và theo dõi hiệu quả sử dụng.">
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
          <span className="material-symbols-outlined text-[18px]">refresh</span>Làm mới
        </button>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 transition-colors">
          <span className="material-symbols-outlined text-[18px]">add</span>Tạo mã mới
        </button>
      </PageHeader>

      {courseScopedCount > 0 && (
        <div className="mb-6 flex items-center gap-2 text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
          <span className="material-symbols-outlined text-[16px]">info</span>
          Ngoài {coupons.length} mã toàn nền tảng ở đây, còn {courseScopedCount} mã riêng theo từng khóa học — quản lý tại trang Khóa học (tab "Mã giảm giá" của từng khóa).
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {loading ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />) : (
          <>
            <KpiCard icon="local_offer" label="Tổng mã khuyến mãi" value={fmtInt(kpis.total_promotions)} color="blue" />
            <KpiCard icon="check_circle" label="Đang hoạt động" value={fmtInt(kpis.active_promotions)} color="green" />
            <KpiCard icon="people" label="Tổng lượt dùng" value={fmtInt(kpis.total_redemptions)} color="purple" />
            <KpiCard icon="schedule" label="Sắp hết hạn (7 ngày)" value={fmtInt(kpis.expiring_soon)} color="amber" />
            <KpiCard icon="discount" label="Tổng giảm giá" value={fmtMoney(kpis.total_discount_given)} color="red" />
            <KpiCard icon="payments" label="Doanh thu tạo ra" value={fmtMoney(kpis.revenue_generated)} color="sky" />
            <KpiCard icon="calculate" label="Giảm giá TB / đơn" value={fmtMoney(kpis.average_discount)} color="indigo" />
            <KpiCard icon="toggle_off" label="Ngừng hoạt động" value={fmtInt(health.inactive)} color="orange" />
          </>
        )}
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm mb-4">{error}</div>}

      {!loading && !error && (
        <>
          {/* Promotion health */}
          <SectionCard title="Tình trạng mã giảm giá" icon="monitor_heart">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4">
              {[
                { label: 'Sắp hết hạn', value: health.expiring_soon, color: 'text-amber-600', bg: 'bg-amber-50' },
                { label: 'Đã hết hạn', value: health.expired, color: 'text-red-600', bg: 'bg-red-50' },
                { label: 'Chưa từng dùng', value: health.never_used, color: 'text-gray-500', bg: 'bg-gray-50' },
                { label: 'Dùng nhiều', value: health.high_usage, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'Ngừng hoạt động', value: health.inactive, color: 'text-gray-500', bg: 'bg-gray-50' },
              ].map(h => (
                <div key={h.label} className={`rounded-xl p-3 ${h.bg}`}>
                  <p className={`text-xl font-bold ${h.color}`}>{h.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{h.label}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Toolbar */}
          <div className="mt-6">
            <SearchFilterBar search={search} onSearch={setSearch} placeholder="Tìm theo mã hoặc mô tả...">
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:border-blue-500">
                <option value="all">Tất cả loại</option>
                <option value="percent">Phần trăm</option>
                <option value="fixed">Cố định</option>
              </select>
            </SearchFilterBar>
            <FilterTabs
              tabs={[
                { value: 'all', label: 'Tất cả', count: coupons.length },
                { value: 'active', label: 'Hoạt động', count: coupons.filter(c => computeStatus(c) === 'active').length },
                { value: 'expiring', label: 'Sắp hết hạn', count: health.expiring_soon },
                { value: 'expired', label: 'Hết hạn', count: health.expired },
                { value: 'inactive', label: 'Ngừng', count: health.inactive },
              ]}
              active={statusFilter} onChange={setStatusFilter}
            />
          </div>

          {/* Table */}
          {filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <EmptyState icon="local_offer" title="Không có mã khuyến mãi" description="Không tìm thấy mã nào khớp bộ lọc hiện tại." />
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-auto max-h-[560px]">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                    <tr>
                      {[
                        ['code', 'Mã'], ['', 'Mô Tả'], ['', 'Loại'], ['value', 'Giá Trị'],
                        ['', 'Đơn Tối Thiểu'], ['', 'Giảm Tối Đa'], ['', 'Trạng Thái'],
                        ['times_used', 'Lượt Dùng'], ['revenue_generated', 'Doanh Thu'],
                        ['created_at', 'Ngày Tạo'], ['expires_at', 'Hết Hạn'],
                      ].map(([key, label]) => (
                        <th key={label} onClick={() => key && toggleSort(key)}
                          className={`py-3 px-4 text-xs font-bold text-gray-500 uppercase whitespace-nowrap ${key ? 'cursor-pointer hover:text-gray-700 select-none' : ''}`}>
                          {label}{sortKey === key && <span className="material-symbols-outlined text-[14px] align-middle ml-0.5">{sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'}</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {paginated.map(c => (
                      <tr key={c.id} onClick={() => setSelectedId(c.id)} className="hover:bg-gray-50 cursor-pointer transition-colors">
                        <td className="py-3 px-4"><code className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded font-mono font-bold">{c.code}</code></td>
                        <td className="py-3 px-4 text-sm text-gray-700 max-w-xs truncate" title={c.description}>{c.description || '—'}</td>
                        <td className="py-3 px-4"><TypeBadge type={c.type} /></td>
                        <td className="py-3 px-4 font-bold text-red-600">{c.type === 'percent' ? `${c.value}%` : fmtMoney(c.value)}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{c.min_order ? fmtMoney(c.min_order) : '—'}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{c.max_discount ? fmtMoney(c.max_discount) : '—'}</td>
                        <td className="py-3 px-4"><PromoStatusBadge status={computeStatus(c)} /></td>
                        <td className="py-3 px-4 text-sm font-semibold text-gray-700">{fmtInt(c.times_used)}</td>
                        <td className="py-3 px-4 text-sm font-semibold text-emerald-700">{fmtMoney(c.revenue_generated)}</td>
                        <td className="py-3 px-4 text-sm text-gray-500 whitespace-nowrap">{fmtDate(c.created_at)}</td>
                        <td className="py-3 px-4 text-sm text-gray-500 whitespace-nowrap">{c.expires_at ? fmtDate(c.expires_at) : 'Không giới hạn'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} totalPages={totalPages} onPage={setPage} />
            </div>
          )}

          {/* Visual analytics — reuses this repo's existing hand-rolled chart primitives (no new chart lib) */}
          {coupons.some(c => c.times_used > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <SectionCard title="Top Mã Được Dùng Nhiều Nhất" icon="leaderboard">
                <div className="p-4">{charts.topUsage.values.length ? <AnalyticsChart chart={charts.topUsage} /> : <p className="text-sm text-gray-400 text-center py-6">Chưa đủ dữ liệu.</p>}</div>
              </SectionCard>
              <SectionCard title="Doanh Thu Theo Mã" icon="payments">
                <div className="p-4">{charts.topRevenue.values.length ? <AnalyticsChart chart={charts.topRevenue} /> : <p className="text-sm text-gray-400 text-center py-6">Chưa đủ dữ liệu.</p>}</div>
              </SectionCard>
              <SectionCard title="Phân Bổ Loại Giảm Giá" icon="pie_chart">
                <div className="p-4">{(charts.typeDist.values[0] + charts.typeDist.values[1]) > 0 ? <AnalyticsChart chart={charts.typeDist} /> : <p className="text-sm text-gray-400 text-center py-6">Chưa đủ dữ liệu.</p>}</div>
              </SectionCard>
            </div>
          )}

          {/* Legacy detected transactions — kept from the previous read-only page for
              continuity; pre-dates coupon_usages so it's still text-heuristic based. */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-6">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-700 uppercase">
                Lịch Sử Trước Đây ({legacyTx.length})
                <span className="ml-2 text-xs font-normal text-gray-400 normal-case">— dữ liệu cũ, ước tính từ mô tả giao dịch (trước khi có theo dõi chính xác ở trên)</span>
              </h3>
            </div>
            {legacyTx.length === 0 ? (
              <div className="p-8"><EmptyState title="Không có dữ liệu cũ" description="Không có giao dịch giảm giá nào từ trước." /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>{['Người Dùng', 'Mô Tả', 'Gốc (Ước Tính)', 'Giảm Giá', 'Thanh Toán', 'Ngày'].map(h => (
                      <th key={h} className="py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {legacyTx.slice(0, 20).map(t => (
                      <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4"><div className="text-sm font-medium text-gray-900">{t.user_name || '—'}</div><div className="text-xs text-gray-400">{t.user_email || ''}</div></td>
                        <td className="py-3 px-4 text-sm text-gray-600 max-w-xs truncate" title={t.promotion_name}>{t.promotion_name}</td>
                        <td className="py-3 px-4 text-sm text-gray-500 line-through">{fmtMoney(t.original_amount)}</td>
                        <td className="py-3 px-4 font-bold text-red-600">-{fmtMoney(t.discount_amount)}</td>
                        <td className="py-3 px-4 font-bold text-gray-900">{fmtMoney(t.final_amount)}</td>
                        <td className="py-3 px-4 text-sm text-gray-500 whitespace-nowrap">{fmtDate(t.used_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {selectedId && <CouponDrawer id={selectedId} token={token} onClose={() => setSelectedId(null)} onChanged={load} />}

      {showCreate && (
        <ModalOverlay onClose={() => !creating && setShowCreate(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 pt-5 pb-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 text-base">Tạo mã khuyến mãi mới</h3>
              <p className="text-xs text-gray-400 mt-0.5">Áp dụng cho toàn bộ giỏ hàng (không gắn riêng khóa học nào)</p>
            </div>
            <div className="px-6 py-5">
              {createErr && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700 mb-4">{createErr}</div>}
              <CouponForm
                initial={{ code: '', description: '', discount_type: 'percent', discount_value: '', max_discount: '', min_order: '', expires_at: '' }}
                saving={creating} onCancel={() => setShowCreate(false)} onSubmit={handleCreate}
              />
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  )
}
