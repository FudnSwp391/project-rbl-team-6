import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../../config';

const API_BASE = API_BASE_URL;

const TYPE_CONFIG = {
  change_tutor:    { label: 'Đổi gia sư',       icon: 'swap_horiz',        color: '#7c3aed', bg: '#ede9fe' },
  tutor_complaint: { label: 'Khiếu nại gia sư', icon: 'person_alert',      color: '#dc2626', bg: '#fee2e2' },
  refund:          { label: 'Hoàn tiền',         icon: 'currency_exchange', color: '#0891b2', bg: '#cffafe' },
  technical:       { label: 'Kỹ thuật',          icon: 'build_circle',      color: '#ea580c', bg: '#ffedd5' },
  other:           { label: 'Khác',              icon: 'help',              color: '#4b5563', bg: '#f3f4f6' },
};

const STATUS_CONFIG = {
  pending:    { label: 'Chờ xử lý',     color: '#b45309', bg: '#fef3c7' },
  processing: { label: 'Đang xử lý',    color: '#1d4ed8', bg: '#dbeafe' },
  approved:   { label: 'Đã duyệt',      color: '#15803d', bg: '#dcfce7' },
  resolved:   { label: 'Đã giải quyết', color: '#15803d', bg: '#dcfce7' },
  rejected:   { label: 'Đã từ chối',    color: '#dc2626', bg: '#fee2e2' },
  cancelled:  { label: 'HS đã hủy',     color: '#6b7280', bg: '#f3f4f6' },
};

const STATUS_TABS = [
  { value: 'all',        label: 'Tất cả' },
  { value: 'pending',    label: 'Chờ xử lý' },
  { value: 'processing', label: 'Đang xử lý' },
  { value: 'resolved',   label: 'Đã xong' },
  { value: 'rejected',   label: 'Từ chối' },
];

export default function SupportRequests({ token }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter]     = useState('all');
  const [search, setSearch]     = useState('');

  // action modal
  const [actionReq, setActionReq]   = useState(null);   // request đang xử lý
  const [actionStatus, setActionStatus] = useState('');
  const [response, setResponse]     = useState('');
  const [saving, setSaving]         = useState(false);
  const [actionError, setActionError] = useState('');
  const [toast, setToast]           = useState('');

  const headers = { Authorization: `Bearer ${token}` };

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: 15 });
      if (statusFilter === 'resolved') {
        // gộp approved + resolved vào 1 tab "Đã xong" cho gọn — query 2 lần không đáng, lọc client
        params.set('status', 'all');
      } else if (statusFilter !== 'all') params.set('status', statusFilter);
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (search.trim()) params.set('search', search.trim());
      const res = await fetch(`${API_BASE}/api/admin/support-requests?${params}`, { headers });
      if (res.ok) {
        const data = await res.json();
        let rows = data.requests || [];
        if (statusFilter === 'resolved') rows = rows.filter(r => ['approved', 'resolved'].includes(r.status));
        setRequests(rows);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
        setPage(p);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [statusFilter, typeFilter, search]);

  useEffect(() => { load(1); }, [load]);

  const openAction = (req, status) => {
    setActionReq(req);
    setActionStatus(status);
    setResponse('');
    setActionError('');
  };

  const handleAction = async () => {
    if (!actionReq) return;
    if (actionStatus === 'rejected' && !response.trim()) {
      setActionError('Vui lòng nhập lý do từ chối để học sinh hiểu.');
      return;
    }
    setSaving(true);
    setActionError('');
    try {
      const res = await fetch(`${API_BASE}/api/admin/support-requests/${actionReq.id}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: actionStatus, admin_response: response.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setActionError(data.message || 'Không xử lý được yêu cầu.'); setSaving(false); return; }
      setActionReq(null);
      const extra = data.cancelled_bookings > 0 ? ` (đã hủy ${data.cancelled_bookings} buổi học với gia sư cũ)` : '';
      setToast(`Đã cập nhật ${actionReq.ticket_number}${extra}.`);
      setTimeout(() => setToast(''), 4000);
      await load(page);
    } catch {
      setActionError('Lỗi kết nối.');
    }
    setSaving(false);
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-[28px] text-[#00288e]">support_agent</span>
            Yêu cầu Hỗ trợ Học sinh
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Đổi gia sư, khiếu nại, hoàn tiền, kỹ thuật — duyệt đổi gia sư sẽ tự hủy các buổi học sắp tới với gia sư cũ.
          </p>
        </div>
        {pendingCount > 0 && (
          <span className="px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 text-sm font-bold">
            {pendingCount} chờ xử lý
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex bg-gray-100 rounded-xl p-1">
          {STATUS_TABS.map(t => (
            <button key={t.value}
              onClick={() => setStatusFilter(t.value)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                statusFilter === t.value ? 'bg-white text-[#00288e] shadow-sm' : 'text-gray-500 hover:text-gray-800'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#00288e]/20">
          <option value="all">Tất cả loại</option>
          {Object.entries(TYPE_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
        </select>
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm học sinh, gia sư, lý do..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#00288e]/20"
          />
        </div>
      </div>

      {toast && (
        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <span className="material-symbols-outlined text-green-600" style={{fontVariationSettings:"'FILL' 1"}}>check_circle</span>
          {toast}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-[#00288e] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-gray-50 rounded-2xl p-12 text-center border border-gray-100">
          <span className="material-symbols-outlined text-[56px] text-gray-300 block mb-3">inbox</span>
          <p className="text-gray-500">Không có yêu cầu hỗ trợ nào.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {requests.map(r => {
            const tc = TYPE_CONFIG[r.request_type] || TYPE_CONFIG.other;
            const sc = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
            const actionable = ['pending', 'processing'].includes(r.status);
            return (
              <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: tc.bg, color: tc.color }}>
                    <span className="material-symbols-outlined text-[22px]" style={{fontVariationSettings:"'FILL' 1"}}>{tc.icon}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className="font-mono font-bold text-sm text-gray-900">{r.ticket_number}</span>
                      <span className="text-xs font-bold" style={{ color: tc.color }}>{tc.label}</span>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold" style={{ color: sc.color, background: sc.bg }}>
                        {sc.label}
                      </span>
                      <span className="text-xs text-gray-400 ml-auto">
                        {new Date(r.created_at).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-gray-900 mb-1">{r.reason}</p>
                    {r.description && <p className="text-xs text-gray-500 mb-2 line-clamp-2">{r.description}</p>}
                    {r.related_dispute_id && (
                      <p className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 mb-2"
                        title="Buổi học này đã có tranh chấp escrow — tiền chỉ thực sự di chuyển khi tranh chấp đó được xử lý ở Quản Lý Tranh Chấp">
                        <span className="material-symbols-outlined text-[13px]">gavel</span>
                        Có tranh chấp escrow liên quan ({r.related_dispute_status})
                      </p>
                    )}

                    <div className="flex items-center gap-4 flex-wrap text-xs text-gray-500">
                      <span className="flex items-center gap-1.5">
                        {r.student_picture
                          ? <img src={r.student_picture} alt="" className="w-5 h-5 rounded-full object-cover" />
                          : <span className="material-symbols-outlined text-[14px]">face</span>}
                        <b className="text-gray-700">{r.student_name}</b>
                        <span className="text-gray-400">({r.student_email})</span>
                      </span>
                      {r.tutor_name && (
                        <span className="flex items-center gap-1.5">
                          {r.tutor_picture
                            ? <img src={r.tutor_picture} alt="" className="w-5 h-5 rounded-full object-cover" />
                            : <span className="material-symbols-outlined text-[14px]">school</span>}
                          Gia sư: <b className="text-gray-700">{r.tutor_name}</b>
                          {r.subject && <span>· {r.subject}</span>}
                        </span>
                      )}
                    </div>

                    {r.admin_response && (
                      <div className="mt-2 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-xs text-gray-600">
                        <b>Phản hồi{r.admin_name ? ` (${r.admin_name})` : ''}:</b> {r.admin_response}
                      </div>
                    )}
                  </div>

                  {actionable && (
                    <div className="flex flex-col gap-2 shrink-0">
                      {r.status === 'pending' && (
                        <button onClick={() => openAction(r, 'processing')}
                          className="px-4 py-2 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100 transition-colors">
                          Tiếp nhận
                        </button>
                      )}
                      <button onClick={() => openAction(r, r.request_type === 'change_tutor' ? 'approved' : 'resolved')}
                        className="px-4 py-2 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-700 transition-colors">
                        {r.request_type === 'change_tutor' ? 'Duyệt đổi' : 'Giải quyết'}
                      </button>
                      <button onClick={() => openAction(r, 'rejected')}
                        className="px-4 py-2 rounded-lg border border-red-200 text-red-600 text-xs font-bold hover:bg-red-50 transition-colors">
                        Từ chối
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => load(page - 1)} disabled={page <= 1}
            className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-gray-50 text-sm font-semibold">
            Trước
          </button>
          <span className="text-sm text-gray-500">Trang {page} / {totalPages}</span>
          <button onClick={() => load(page + 1)} disabled={page >= totalPages}
            className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-gray-50 text-sm font-semibold">
            Tiếp
          </button>
        </div>
      )}

      {/* ── Action modal ── */}
      {actionReq && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4" onClick={() => !saving && setActionReq(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-gray-900">
                {actionStatus === 'processing' && 'Tiếp nhận yêu cầu'}
                {actionStatus === 'approved' && 'Duyệt đổi gia sư'}
                {actionStatus === 'resolved' && 'Đánh dấu đã giải quyết'}
                {actionStatus === 'rejected' && 'Từ chối yêu cầu'}
                {' '}<span className="font-mono text-sm text-gray-500">{actionReq.ticket_number}</span>
              </h3>
              <button onClick={() => !saving && setActionReq(null)} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-gray-500">close</span>
              </button>
            </div>

            {actionStatus === 'approved' && actionReq.request_type === 'change_tutor' && (
              <div className="mb-4 flex items-start gap-2 bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 text-xs text-violet-800 leading-relaxed">
                <span className="material-symbols-outlined text-violet-500 shrink-0" style={{ fontSize: 16 }}>info</span>
                <span>
                  Duyệt sẽ <b>tự động hủy mọi buổi học sắp tới</b> giữa học sinh <b>{actionReq.student_name}</b> và
                  gia sư <b>{actionReq.tutor_name}</b> (trạng thái Pending/Approved), đồng thời thông báo cho cả hai bên.
                </span>
              </div>
            )}

            {['refund', 'tutor_complaint'].includes(actionReq.request_type) && actionStatus !== 'rejected' && (
              <div className="mb-4 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 leading-relaxed">
                <span className="material-symbols-outlined text-amber-600 shrink-0" style={{ fontSize: 16 }}>warning</span>
                <span>
                  Xác nhận ở đây <b>chỉ cập nhật trạng thái yêu cầu</b> — hệ thống <b>không tự động hoàn tiền hay trừ điểm gia sư</b>.
                  {actionReq.related_dispute_id
                    ? <> Buổi học này đã có tranh chấp escrow ({actionReq.related_dispute_status}) — kiểm tra tranh chấp đó ở <b>Quản Lý Tranh Chấp</b> để biết tiền đã được xử lý chưa.</>
                    : <> Nếu cần hoàn tiền thật hoặc xử phạt gia sư, hãy tạo/xử lý ở <b>Quản Lý Tranh Chấp</b> trước khi xác nhận ở đây.</>}
                </span>
              </div>
            )}

            {actionError && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{actionError}</div>
            )}

            <label className="block text-xs font-bold text-gray-700 mb-2">
              Phản hồi cho học sinh {actionStatus === 'rejected' ? <span className="text-red-500">*</span> : '(không bắt buộc)'}
            </label>
            <textarea
              value={response}
              onChange={e => setResponse(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder={actionStatus === 'rejected'
                ? 'Giải thích lý do từ chối để học sinh hiểu...'
                : actionStatus === 'approved'
                  ? 'VD: Đã duyệt. Bạn có thể vào Tìm Gia Sư để chọn người phù hợp hơn...'
                  : 'Ghi chú thêm cho học sinh (nếu có)...'}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00288e]/20 resize-none mb-4"
            />

            <div className="flex gap-2 justify-end">
              <button onClick={() => setActionReq(null)} disabled={saving}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50">
                Hủy
              </button>
              <button onClick={handleAction} disabled={saving}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-50 transition-colors ${
                  actionStatus === 'rejected' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#00288e] hover:bg-[#1e40af]'
                }`}>
                {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
