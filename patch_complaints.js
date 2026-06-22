const fs = require('fs');
const content = fs.readFileSync('frontend/src/AdminDashboard.jsx', 'utf8');
const lines = content.split('\n');

const startLine = 1844; // 0-indexed: line 1845 (MOCK_COMPLAINTS start, but we keep the comment above)
const endLine = 1933;   // 0-indexed: line 1934 (Reviews View - keep this)

const newComplaintsView = `function ComplaintsView({ token }) {
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
  const [disputes, setDisputes] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [statusFilter, setStatusFilter] = React.useState('all')
  const [resolveModal, setResolveModal] = React.useState(null)
  const [adminNote, setAdminNote] = React.useState('')
  const [resolving, setResolving] = React.useState(false)

  const fetchDisputes = async () => {
    setLoading(true)
    try {
      const res = await fetch(API_BASE + '/api/admin/disputes', {
        headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
      })
      const data = await res.json()
      setDisputes(data.disputes || [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  React.useEffect(() => { fetchDisputes() }, [])

  const handleResolve = async (decision) => {
    if (!resolveModal) return
    setResolving(true)
    try {
      const res = await fetch(API_BASE + '/api/escrow/resolve-dispute-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + localStorage.getItem('token') },
        body: JSON.stringify({ disputeId: resolveModal.id, decision, adminNote })
      })
      const data = await res.json()
      if (data.success) {
        alert('Đã xử lý: ' + (decision === 'REFUND_TO_STUDENT' ? 'Hoàn tiền cho học sinh' : 'Giải ngân cho gia sư'))
        setResolveModal(null); setAdminNote(''); fetchDisputes()
      } else { alert(data.message || 'Có lỗi xảy ra.') }
    } catch { alert('Lỗi kết nối.') }
    setResolving(false)
  }

  const fmtMoney = (n) => Number(n || 0).toLocaleString('vi-VN') + 'đ'
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—'
  const statusLabel = { 'OPEN': 'Đang mở', 'RESOLVED_REFUND': 'Hoàn tiền', 'RESOLVED_RELEASE': 'Giải ngân' }
  const statusColor = {
    'OPEN': 'bg-red-50 text-red-700 border border-red-200',
    'RESOLVED_REFUND': 'bg-green-50 text-green-700 border border-green-200',
    'RESOLVED_RELEASE': 'bg-blue-50 text-blue-700 border border-blue-200'
  }
  const filtered = statusFilter === 'all' ? disputes
    : statusFilter === 'open' ? disputes.filter(d => d.status === 'OPEN')
    : disputes.filter(d => d.status !== 'OPEN')
  const openCount = disputes.filter(d => d.status === 'OPEN').length
  const resolvedCount = disputes.filter(d => d.status !== 'OPEN').length

  return (
    <div className="p-10 max-w-[1280px] mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-bold text-on-background">Khiếu nại & Tranh chấp</h2>
          <p className="text-sm text-on-surface-variant mt-1">Xem xét và phán quyết các khiếu nại liên quan đến học phí.</p>
        </div>
        <button onClick={fetchDisputes} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-outline-variant text-sm hover:bg-gray-50 transition-colors">
          <span className="material-symbols-outlined text-[18px]">refresh</span>Làm mới
        </button>
      </div>
      <div className="grid grid-cols-3 gap-6 mb-8">
        {[
          { label: 'Đang mở', count: openCount, color: 'border-red-400', icon: 'gavel', iconColor: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Đã xử lý', count: resolvedCount, color: 'border-green-400', icon: 'check_circle', iconColor: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Tổng cộng', count: disputes.length, color: 'border-blue-400', icon: 'report', iconColor: 'text-blue-600', bg: 'bg-blue-50' },
        ].map(c => (
          <div key={c.label} className={\`bg-white rounded-xl p-5 shadow-sm border-l-4 \${c.color}\`}>
            <div className="flex items-center gap-3">
              <div className={\`w-10 h-10 rounded-lg \${c.bg} flex items-center justify-center \${c.iconColor}\`}>
                <span className="material-symbols-outlined">{c.icon}</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-on-surface-variant uppercase">{c.label}</p>
                <p className="text-2xl font-bold text-on-background">{c.count}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-outline-variant overflow-hidden">
        <div className="flex gap-3 px-6 py-4 border-b border-outline-variant">
          {[{key:'all',label:'Tất cả'},{key:'open',label:\`Đang mở (\${openCount})\`},{key:'closed',label:'Đã xử lý'}].map(f => (
            <button key={f.key} onClick={() => setStatusFilter(f.key)}
              className={\`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors \${statusFilter===f.key?'bg-primary text-white':'bg-gray-100 text-on-surface-variant hover:bg-gray-200'}\`}>
              {f.label}
            </button>
          ))}
        </div>
        {loading ? (
          <div className="p-12 text-center"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-on-surface-variant">
            <span className="material-symbols-outlined text-[48px] block mb-2">check_circle</span>
            Không có khiếu nại nào
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-outline-variant">
              <tr>
                {['Người báo cáo','Gia sư','Môn / Ngày','Học phí','Lý do','Ngày gửi','Trạng thái','Thao tác'].map(h => (
                  <th key={h} className="py-3 px-4 text-xs font-semibold text-on-surface-variant uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {filtered.map(d => (
                <tr key={d.id} className={\`hover:bg-gray-50 transition-colors \${d.status==='OPEN'?'bg-red-50/30':''}\`}>
                  <td className="py-3 px-4 text-sm font-medium text-on-surface">{d.reporter_name}</td>
                  <td className="py-3 px-4 text-sm text-on-surface">{d.tutor_full_name || d.tutor_name}</td>
                  <td className="py-3 px-4 text-sm"><p>{d.subject}</p><p className="text-xs text-on-surface-variant">{fmtDate(d.lesson_date)}</p></td>
                  <td className="py-3 px-4 text-sm font-semibold text-primary">{fmtMoney(d.lesson_fee)}</td>
                  <td className="py-3 px-4 text-sm text-on-surface-variant max-w-[180px]"><p className="truncate" title={d.reason}>{d.reason}</p></td>
                  <td className="py-3 px-4 text-sm text-on-surface-variant">{fmtDate(d.created_at)}</td>
                  <td className="py-3 px-4">
                    <span className={\`px-2 py-0.5 rounded-lg text-xs font-semibold \${statusColor[d.status]||'bg-gray-100 text-gray-600'}\`}>{statusLabel[d.status]||d.status}</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {d.status === 'OPEN' ? (
                      <button onClick={() => { setResolveModal(d); setAdminNote('') }}
                        className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold hover:opacity-90 flex items-center gap-1 ml-auto">
                        <span className="material-symbols-outlined text-[14px]">gavel</span>Phán quyết
                      </button>
                    ) : <span className="text-xs text-on-surface-variant italic">Đã xử lý</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {resolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">gavel</span>Phán quyết khiếu nại
              </h3>
              <button onClick={() => setResolveModal(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-2">
                <div className="flex justify-between"><span className="text-on-surface-variant">Người báo cáo:</span><span className="font-medium">{resolveModal.reporter_name}</span></div>
                <div className="flex justify-between"><span className="text-on-surface-variant">Gia sư:</span><span className="font-medium">{resolveModal.tutor_full_name}</span></div>
                <div className="flex justify-between"><span className="text-on-surface-variant">Môn học:</span><span className="font-medium">{resolveModal.subject} — {fmtDate(resolveModal.lesson_date)}</span></div>
                <div className="flex justify-between"><span className="text-on-surface-variant">Số tiền:</span><span className="font-bold text-primary text-base">{fmtMoney(resolveModal.lesson_fee)}</span></div>
                <div className="pt-2 border-t border-gray-200">
                  <span className="text-on-surface-variant">Lý do:</span>
                  <p className="text-on-surface mt-1 italic">"{resolveModal.reason}"</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-on-surface-variant mb-1">Ghi chú phán quyết</label>
                <textarea value={adminNote} onChange={e => setAdminNote(e.target.value)} rows={3}
                  placeholder="Lý do phán quyết..."
                  className="w-full p-3 rounded-xl border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary resize-none text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button onClick={() => handleResolve('REFUND_TO_STUDENT')} disabled={resolving}
                  className="p-4 rounded-xl bg-red-50 border-2 border-red-300 hover:border-red-500 hover:bg-red-100 transition-all disabled:opacity-50 text-left">
                  <span className="material-symbols-outlined text-red-600 text-[22px] block mb-2">undo</span>
                  <p className="font-bold text-red-800 text-sm">Hoàn tiền → Học sinh</p>
                  <p className="text-xs text-red-600 mt-1">Gia sư vi phạm. Trừ -10đ uy tín.</p>
                  <p className="text-xs font-bold text-red-700 mt-2">→ {fmtMoney(resolveModal.lesson_fee)}</p>
                </button>
                <button onClick={() => handleResolve('RELEASE_TO_TUTOR')} disabled={resolving}
                  className="p-4 rounded-xl bg-blue-50 border-2 border-blue-300 hover:border-blue-500 hover:bg-blue-100 transition-all disabled:opacity-50 text-left">
                  <span className="material-symbols-outlined text-blue-600 text-[22px] block mb-2">payments</span>
                  <p className="font-bold text-blue-800 text-sm">Giải ngân → Gia sư</p>
                  <p className="text-xs text-blue-600 mt-1">Khiếu nại không có cơ sở.</p>
                  <p className="text-xs font-bold text-blue-700 mt-2">→ {fmtMoney(Math.floor(Number(resolveModal.lesson_fee||0)*0.9))}</p>
                </button>
              </div>
              {resolving && <div className="text-center text-sm text-on-surface-variant flex items-center justify-center gap-2"><div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"/>Đang xử lý...</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

`;

const newLines = [
  ...lines.slice(0, 1844),                    // before MOCK_COMPLAINTS (keep comment header)
  ...newComplaintsView.split('\n'),            // new real ComplaintsView
  ...lines.slice(1933)                         // Reviews View onwards
];

fs.writeFileSync('frontend/src/AdminDashboard.jsx', newLines.join('\n'), 'utf8');
console.log('Done. Total lines:', newLines.length);
