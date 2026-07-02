import { useState, useEffect } from 'react'
import {
  StatusBadge, PageHeader, DataTable, SearchFilterBar, FilterTabs,
  Pagination, AvatarCell, EmptyState,
  usePagination, useSearch
} from './components'
import { fmtMoney, fmtDateTime } from './mockData'

const API = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000'

const STATUS_TABS = [
  { value: 'ALL',       label: 'Tất cả' },
  { value: 'COMPLETED', label: 'Hoàn thành' },
  { value: 'PENDING',   label: 'Chờ xử lý' },
  { value: 'CANCELLED', label: 'Đã hủy' },
]

function mapEnrollmentStatus(s) {
  if (!s) return 'PENDING'
  const lower = s.toLowerCase()
  if (lower === 'active')    return 'COMPLETED'
  if (lower === 'cancelled') return 'CANCELLED'
  if (lower === 'pending')   return 'PENDING'
  return s.toUpperCase()
}

function mapRow(r) {
  return {
    id:             r.id,
    student:        { name: r.buyer_name || 'Học sinh', email: r.buyer_email || '', avatar: null, grade: '' },
    course:         r.course_title || '—',
    subject:        r.subject || '',
    tutor:          { name: r.tutor_name || 'Gia sư', email: r.tutor_email || '', avatar: null, subject: r.subject || '' },
    price:          parseFloat(r.amount) || 0,
    discount:       0,
    platformRevenue: 0,
    tutorRevenue:   0,
    status:         mapEnrollmentStatus(r.enrollment_status),
    purchaseDate:   r.created_at,
  }
}

export default function CourseTransactions({ token }) {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading]           = useState(true)
  const [error,   setError]             = useState(null)
  const [statusFilter, setStatusFilter] = useState('ALL')

  useEffect(() => {
    if (!token) return
    setLoading(true)
    setError(null)
    fetch(`${API}/api/admin/transactions/course-transactions`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(data => {
        setTransactions((data.transactions || []).map(mapRow))
        setLoading(false)
      })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [token])

  const { search, setSearch, filtered: searched } = useSearch(transactions, ['id', 'student.name', 'course', 'tutor.name'])
  const filtered = statusFilter === 'ALL' ? searched : searched.filter(t => t.status === statusFilter)
  const { page, setPage, totalPages, paginated } = usePagination(filtered, 8)

  const totalRevenue  = transactions.reduce((s, t) => s + t.price, 0)

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <PageHeader title="Giao Dịch Khóa Học" subtitle="Quản lý tất cả giao dịch mua khóa học">      </PageHeader>

      {error && (
        <div className="mb-6 flex items-center gap-3 px-5 py-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
          <span className="material-symbols-outlined text-[20px]">error</span>
          {error}
        </div>
      )}

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Tổng giao dịch',    value: loading ? '—' : transactions.length,      icon: 'school',       color: 'bg-blue-50 text-blue-600' },
          { label: 'Doanh thu nền tảng', value: '—',                                      icon: 'percent',      color: 'bg-purple-50 text-purple-600' },
          { label: 'Tổng giá trị KH',   value: loading ? '—' : fmtMoney(totalRevenue),   icon: 'person_check', color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Tổng giảm giá',     value: '—',                                       icon: 'discount',     color: 'bg-amber-50 text-amber-600' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className={`w-9 h-9 rounded-lg ${c.color} flex items-center justify-center mb-3`}>
              <span className="material-symbols-outlined text-[18px]">{c.icon}</span>
            </div>
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">{c.label}</p>
            <p className="text-xl font-bold text-gray-900">{c.value}</p>
          </div>
        ))}
      </div>

      <FilterTabs
        tabs={STATUS_TABS.map(t => ({
          ...t,
          count: t.value === 'ALL' ? transactions.length : transactions.filter(ct => ct.status === t.value).length,
        }))}
        active={statusFilter}
        onChange={v => { setStatusFilter(v); setPage(1) }}
      />
      <SearchFilterBar
        search={search}
        onSearch={v => { setSearch(v); setPage(1) }}
        placeholder="Tìm mã GD, học sinh, khóa học, gia sư..."
      />

      <DataTable
        headers={['Mã GD', 'Học Sinh', 'Khóa Học', 'Gia Sư', 'Giá Khóa Học', 'Môn Học', 'Trạng Thái', 'Ngày Mua']}
        loading={loading}
        empty={!loading && filtered.length === 0 && (
          <EmptyState icon="school" title="Không có giao dịch" description="Không tìm thấy giao dịch khóa học phù hợp." />
        )}
      >
        {paginated.map(tx => (
          <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
            <td className="py-3.5 px-5"><span className="text-xs font-mono font-bold text-blue-600">{tx.id}</span></td>
            <td className="py-3.5 px-5"><AvatarCell name={tx.student.name} avatar={tx.student.avatar} sub={tx.student.email} /></td>
            <td className="py-3.5 px-5">
              <p className="text-sm font-semibold text-gray-900 max-w-[200px] truncate">{tx.course}</p>
            </td>
            <td className="py-3.5 px-5"><AvatarCell name={tx.tutor.name} avatar={tx.tutor.avatar} sub={tx.tutor.subject} /></td>
            <td className="py-3.5 px-5"><span className="text-sm font-bold text-gray-900">{fmtMoney(tx.price)}</span></td>
            <td className="py-3.5 px-5"><span className="text-sm text-gray-600">{tx.subject || '—'}</span></td>
            <td className="py-3.5 px-5"><StatusBadge status={tx.status} /></td>
            <td className="py-3.5 px-5"><span className="text-xs text-gray-400">{fmtDateTime(tx.purchaseDate)}</span></td>
          </tr>
        ))}
      </DataTable>

      <div className="bg-white rounded-b-xl border border-t-0 border-gray-100">
        <Pagination page={page} totalPages={totalPages} onPage={setPage} />
      </div>
    </div>
  )
}
