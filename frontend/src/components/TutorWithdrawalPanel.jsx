import { useState, useEffect, useCallback } from 'react'
import { getMyWithdrawals, createWithdrawal, cancelWithdrawal } from '../services/api'

const fmtMoney = n => Number(n || 0).toLocaleString('vi-VN') + 'đ'

const STATUS_CFG = {
  PENDING:   { label: 'Chờ duyệt',   cls: 'bg-amber-100 text-amber-700' },
  APPROVED:  { label: 'Đã duyệt',    cls: 'bg-blue-100 text-blue-700' },
  PAID:      { label: 'Đã chi',      cls: 'bg-emerald-100 text-emerald-700' },
  REJECTED:  { label: 'Từ chối',     cls: 'bg-red-100 text-red-700' },
  CANCELLED: { label: 'Đã hủy',      cls: 'bg-gray-100 text-gray-600' },
}

export default function TutorWithdrawalPanel() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [busyId, setBusyId]   = useState(null)
  const [form, setForm] = useState({ amount: '', bankName: '', bankAccountNo: '', bankAccountName: '', payoutNote: '' })

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const result = await getMyWithdrawals()
      setData(result)
    } catch (e) {
      setError(e.message || 'Không thể tải dữ liệu rút tiền.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const balance = Number(data?.wallet?.balance || 0)
  const held    = Number(data?.wallet?.held_balance || 0)
  const minAmount = Number(data?.min_amount || 50000)
  const items = data?.items || []

  const submit = async (e) => {
    e.preventDefault()
    const amt = Math.floor(Number(form.amount))
    if (!Number.isFinite(amt) || amt < minAmount) return alert(`Số tiền rút tối thiểu là ${fmtMoney(minAmount)}.`)
    if (amt > balance) return alert('Số dư khả dụng không đủ.')
    if (!form.bankName.trim() || !form.bankAccountNo.trim() || !form.bankAccountName.trim()) return alert('Vui lòng nhập đầy đủ thông tin ngân hàng.')
    setSubmitting(true)
    try {
      await createWithdrawal({
        amount: amt,
        bankName: form.bankName.trim(),
        bankAccountNo: form.bankAccountNo.trim(),
        bankAccountName: form.bankAccountName.trim(),
        payoutNote: form.payoutNote.trim() || undefined,
      })
      setShowForm(false)
      setForm({ amount: '', bankName: '', bankAccountNo: '', bankAccountName: '', payoutNote: '' })
      load()
    } catch (e2) {
      alert(e2.message || 'Không thể tạo yêu cầu rút tiền.')
    } finally {
      setSubmitting(false)
    }
  }

  const cancel = async (id) => {
    if (!window.confirm('Hủy yêu cầu rút tiền này? Số dư sẽ được hoàn lại.')) return
    setBusyId(id)
    try {
      await cancelWithdrawal(id)
      load()
    } catch (e) {
      alert(e.message || 'Không thể hủy yêu cầu.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="bg-white/80 border border-outline-variant/20 rounded-2xl shadow-sm overflow-hidden">
      <div className="p-5 border-b border-outline-variant/20 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-headline-md text-headline-md text-on-surface">Rút Tiền</h3>
          <p className="text-[13px] text-on-surface-variant">Rút số dư khả dụng về tài khoản ngân hàng. Admin duyệt & chuyển khoản thủ công.</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          disabled={balance < minAmount}
          className="inline-flex items-center gap-2 rounded-xl bg-primary text-white px-4 py-2 text-sm font-semibold hover:bg-primary/90 disabled:opacity-40"
        >
          <span className="material-symbols-outlined text-[18px]">account_balance</span>
          Yêu cầu rút tiền
        </button>
      </div>

      {/* Balance summary */}
      <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 border-b border-outline-variant/20">
        <div className="text-center">
          <p className="text-xs text-gray-500">Số dư khả dụng</p>
          <p className="font-bold text-green-600">{fmtMoney(balance)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">Đang tạm giữ (gồm chờ rút)</p>
          <p className="font-bold text-amber-600">{fmtMoney(held)}</p>
        </div>
      </div>

      {/* Request form */}
      {showForm && (
        <form onSubmit={submit} className="p-5 border-b border-outline-variant/20 space-y-3 bg-primary/5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Số tiền (tối thiểu {fmtMoney(minAmount)})</label>
              <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="VD: 100000" className="w-full h-11 px-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Ngân hàng</label>
              <input value={form.bankName} onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))}
                placeholder="VD: Vietcombank" className="w-full h-11 px-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Số tài khoản</label>
              <input value={form.bankAccountNo} onChange={e => setForm(f => ({ ...f, bankAccountNo: e.target.value }))}
                placeholder="VD: 0123456789" className="w-full h-11 px-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Tên chủ tài khoản</label>
              <input value={form.bankAccountName} onChange={e => setForm(f => ({ ...f, bankAccountName: e.target.value }))}
                placeholder="VD: NGUYEN VAN A" className="w-full h-11 px-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Ghi chú (tuỳ chọn)</label>
            <input value={form.payoutNote} onChange={e => setForm(f => ({ ...f, payoutNote: e.target.value }))}
              className="w-full h-11 px-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50">Hủy</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50">
              {submitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
            </button>
          </div>
        </form>
      )}

      {/* History */}
      {loading ? (
        <div className="p-8 text-center text-on-surface-variant text-sm">Đang tải...</div>
      ) : error ? (
        <div className="p-6 text-red-700 bg-red-50 text-sm">{error}</div>
      ) : items.length === 0 ? (
        <div className="p-8 text-center text-on-surface-variant text-sm">Chưa có yêu cầu rút tiền nào.</div>
      ) : (
        <div className="divide-y divide-outline-variant/20">
          {items.map(it => {
            const st = STATUS_CFG[it.status] || { label: it.status, cls: 'bg-gray-100 text-gray-600' }
            return (
              <div key={it.id} className="flex items-center gap-3 p-4 hover:bg-gray-50">
                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[18px] text-gray-500">account_balance</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{fmtMoney(it.amount)}</p>
                  <p className="text-xs text-gray-400 truncate">{it.bank_name} • {it.bank_account_no}</p>
                  <p className="text-xs text-gray-400">{new Date(it.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div className="text-right shrink-0 flex flex-col items-end gap-1">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${st.cls}`}>{st.label}</span>
                  {it.status === 'PENDING' && (
                    <button onClick={() => cancel(it.id)} disabled={busyId === it.id}
                      className="text-xs text-red-600 hover:underline disabled:opacity-50">Hủy</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
