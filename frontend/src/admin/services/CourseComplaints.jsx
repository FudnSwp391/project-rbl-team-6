import { useState, useEffect } from 'react';

import { API_BASE_URL as API_BASE } from '../../config';

const STATUS_CONFIG = {
  pending:         { label: 'Đang chờ',           color: '#b45309', bg: '#fef3c7', icon: 'pending' },
  processing:      { label: 'Đang xử lý',          color: '#1d4ed8', bg: '#dbeafe', icon: 'autorenew' },
  waiting_student: { label: 'Chờ phản hồi HS',    color: '#7c3aed', bg: '#ede9fe', icon: 'mark_chat_unread' },
  waiting_tutor:   { label: 'Chờ phản hồi GS',    color: '#ea580c', bg: '#ffedd5', icon: 'person_search' },
  resolved:        { label: 'Đã giải quyết',       color: '#15803d', bg: '#dcfce7', icon: 'check_circle' },
  rejected:        { label: 'Đã từ chối',          color: '#dc2626', bg: '#fee2e2', icon: 'cancel' },
  closed:          { label: 'Đã đóng',             color: '#6b7280', bg: '#f3f4f6', icon: 'lock' },
};

const CATEGORY_LABELS = {
  tutor_behavior:  'Gia sư',
  content_quality: 'Nội dung khóa học',
  technical:       'Kỹ thuật',
  payment:         'Thanh toán',
  other:           'Vấn đề khác',
};

// course_swap/CHANGE_COURSE/CHANGE_TUTOR/OTHER kept only to label pre-existing complaints; feature removed
const RESOLUTION_LABELS = {
  report_only:   'Chỉ phản ánh',
  admin_contact: 'Yêu cầu Admin liên hệ',
  course_swap:   'Đổi khóa học',
  refund:        'Hoàn tiền',
  REFUND:        'Hoàn tiền',
  CHANGE_COURSE: 'Đổi khóa học',
  CHANGE_TUTOR:  'Đổi gia sư',
  OTHER:         'Khác',
};

const RESOLUTION_TYPE_CONFIG = {
  accepted: { label: 'Chấp nhận khiếu nại', color: '#15803d', bg: '#f0fdf4', icon: 'check_circle' },
  rejected: { label: 'Từ chối khiếu nại',   color: '#dc2626', bg: '#fef2f2', icon: 'cancel' },
  partial:  { label: 'Chấp nhận một phần',  color: '#d97706', bg: '#fffbeb', icon: 'check_circle' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: '#6b7280', bg: '#f3f4f6', icon: 'info' };
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ color: cfg.color, background: cfg.bg }}>
      <span className="material-symbols-outlined" style={{ fontSize: 12, fontVariationSettings: "'FILL' 1" }}>{cfg.icon}</span>
      {cfg.label}
    </span>
  );
}

function TimelineItem({ item }) {
  const isStatusChange = item.message_type === 'status_change';
  const meta = item.metadata || {};

  if (isStatusChange) {
    return (
      <div className="flex items-center gap-3 py-2">
        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-gray-500" style={{ fontSize: 14 }}>swap_horiz</span>
        </div>
        <div className="flex-1 bg-gray-50 rounded-xl px-4 py-2.5">
          <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500">
            <span className="font-semibold">{item.sender_name || 'Admin'}</span>
            <span>đã chuyển:</span>
            <StatusBadge status={meta.from} />
            <span>→</span>
            <StatusBadge status={meta.to} />
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{new Date(item.created_at).toLocaleString('vi-VN')}</p>
        </div>
      </div>
    );
  }

  if (item.message_type === 'resolution') {
    const cfg = RESOLUTION_TYPE_CONFIG[meta.resolution_type] || { label: 'Kết quả', color: '#6b7280', bg: '#f3f4f6', icon: 'info' };
    const borderColor = meta.resolution_type === 'accepted' ? '#bbf7d0' : meta.resolution_type === 'rejected' ? '#fecaca' : '#fde68a';
    const rd = meta.resolution_details;
    return (
      <div className="flex items-start gap-3 py-2">
        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: cfg.bg }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1", color: cfg.color }}>{cfg.icon}</span>
        </div>
        <div className="flex-1 rounded-xl px-4 py-3 border" style={{ background: cfg.bg, borderColor }}>
          <p className="text-xs font-bold" style={{ color: cfg.color }}>{cfg.label}</p>
          {item.message && <p className="text-sm text-gray-700 mt-1.5 leading-relaxed">{item.message}</p>}
          {meta.refund_amount && (
            <div className="mt-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#15803d' }}>payments</span>
              <p className="text-xs font-semibold text-green-700">Hoàn tiền: {parseInt(meta.refund_amount).toLocaleString('vi-VN')} VNĐ</p>
            </div>
          )}
          {rd?.note && (
            <div className="mt-2">
              <p className="text-xs text-gray-600">Phương án: {rd.note}</p>
            </div>
          )}
          <p className="text-xs text-gray-400 mt-2">{new Date(item.created_at).toLocaleString('vi-VN')}</p>
        </div>
      </div>
    );
  }

  const isAdmin = item.sender_role === 'admin';
  return (
    <div className={`flex gap-3 py-2 ${isAdmin ? '' : 'flex-row-reverse'}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs ${isAdmin ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'}`}>
        <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>
          {isAdmin ? 'support_agent' : 'person'}
        </span>
      </div>
      <div className={`flex-1 max-w-[80%] ${!isAdmin ? 'items-end flex flex-col' : ''}`}>
        <div className={`rounded-2xl px-3 py-2.5 text-sm ${isAdmin ? 'bg-blue-50 text-gray-800' : 'bg-blue-600 text-white'}`}>
          <p className="leading-relaxed">{item.message}</p>
        </div>
        <p className="text-xs text-gray-400 mt-1 px-1">
          {item.sender_name || (isAdmin ? 'Admin' : 'Học viên')} · {new Date(item.created_at).toLocaleString('vi-VN')}
        </p>
      </div>
    </div>
  );
}

function DecisionModal({ type, requestedResolution, saving, onClose, onConfirm }) {
  const [replyMsg, setReplyMsg] = useState('');
  const [adminResp, setAdminResp] = useState('');
  const [refundEnabled, setRefundEnabled] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');

  const isAccept = type === 'accept';
  const isRefund = ['REFUND', 'refund'].includes(requestedResolution);

  const adminRespPlaceholder = isAccept
    ? 'Khiếu nại hợp lệ, học viên được giải quyết theo yêu cầu.'
    : 'Sau khi xem xét kỹ, chúng tôi nhận thấy khiếu nại chưa đủ bằng chứng để xử lý.';

  return (
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
      <div className={`px-6 pt-5 pb-4 border-b ${isAccept ? 'border-green-100' : 'border-red-100'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isAccept ? 'bg-green-100' : 'bg-red-100'}`}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1", color: isAccept ? '#15803d' : '#dc2626' }}>
              {isAccept ? 'check_circle' : 'cancel'}
            </span>
          </div>
          <h3 className="font-bold text-gray-800 text-base">{isAccept ? 'Chấp nhận khiếu nại' : 'Từ chối khiếu nại'}</h3>
        </div>
      </div>
      <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
        {isAccept && isRefund && (
          <div className="space-y-3">
            <label className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer select-none">
              <input type="checkbox" checked={refundEnabled} onChange={e => setRefundEnabled(e.target.checked)} className="w-4 h-4 rounded border-gray-300" />
              Hoàn tiền cho học viên
            </label>
            {refundEnabled && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Số tiền hoàn (VNĐ)</label>
                <div className="relative">
                  <input type="number" min="1" value={refundAmount} onChange={e => setRefundAmount(e.target.value)}
                    placeholder="500000"
                    className="w-full px-3 py-2 pr-14 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-green-500" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-semibold pointer-events-none">VNĐ</span>
                </div>
              </div>
            )}
          </div>
        )}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
            {isAccept ? 'Lý do xử lý' : 'Lý do từ chối'} <span className="text-red-500">*</span>
          </label>
          <textarea value={adminResp} onChange={e => setAdminResp(e.target.value)}
            placeholder={adminRespPlaceholder}
            rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 resize-none" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
            Phản hồi gửi học viên <span className="text-red-500">*</span>
          </label>
          <textarea value={replyMsg} onChange={e => setReplyMsg(e.target.value)}
            placeholder={isAccept ? 'Kính gửi học viên, khiếu nại của bạn đã được chấp nhận...' : 'Kính gửi học viên, sau khi xem xét kỹ, chúng tôi...'}
            rows={4} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 resize-none" />
        </div>
      </div>
      <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
        <button onClick={onClose} disabled={saving}
          className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-white disabled:opacity-40 transition-colors">
          Hủy
        </button>
        <button onClick={() => onConfirm({ replyMsg, adminResp, refundEnabled, refundAmount })}
          disabled={saving || !replyMsg.trim() || !adminResp.trim() || (refundEnabled && parseInt(refundAmount) <= 0)}
          className={`px-5 py-2.5 rounded-xl text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${isAccept ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
          {saving ? (
            <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Đang xử lý...</>
          ) : 'Xác nhận'}
        </button>
      </div>
    </div>
  );
}

function DetailDrawer({ id, token, onClose, onUpdated }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [replyMsg, setReplyMsg] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [adminResp, setAdminResp] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [actionMode, setActionMode] = useState(null);
  const [toast, setToast] = useState(null);

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/course-complaints/${id}`, { headers });
      if (!res.ok) { setLoading(false); return; }
      const data = await res.json();
      setDetail(data);
      setNewStatus(data.status);
      setAdminResp(data.admin_response || '');
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { if (id) load(); }, [id]);

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    try {
      const res = await fetch(`${API_BASE}/api/admin/course-complaints/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          status: newStatus !== detail.status ? newStatus : undefined,
          message: replyMsg.trim() || undefined,
          admin_response: adminResp.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setSaveError(data.message || 'Lỗi cập nhật.'); setSaving(false); return; }
      setReplyMsg('');
      await load();
      onUpdated?.();
    } catch { setSaveError('Lỗi kết nối.'); }
    setSaving(false);
  };

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const handleDecision = async ({ replyMsg: msg, adminResp: resp, refundEnabled, refundAmount }) => {
    setSaving(true);
    try {
      const resType = actionMode === 'accept' ? 'accepted' : 'rejected';
      const finalStatus = actionMode === 'accept' ? 'resolved' : 'rejected';
      const body = { status: finalStatus, resolution_type: resType, message: msg.trim(), admin_response: resp.trim() || undefined };
      if (actionMode === 'accept' && refundEnabled && refundAmount) body.refund_amount = parseInt(refundAmount) || undefined;
      const res = await fetch(`${API_BASE}/api/admin/course-complaints/${id}`, { method: 'PUT', headers, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { showToast('error', data.message || 'Không thể xử lý khiếu nại.'); setSaving(false); return; }
      showToast('success', actionMode === 'accept' ? 'Khiếu nại đã được chấp nhận.' : 'Khiếu nại đã bị từ chối.');
      setActionMode(null);
      await load(); onUpdated?.();
    } catch { showToast('error', 'Lỗi kết nối.'); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[70] flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-xl bg-white h-full flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Chi tiết khiếu nại</p>
            {detail && <p className="font-bold font-mono text-gray-800">CPL-{detail.ticket_number}</p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !detail ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">Không tìm thấy.</div>
        ) : (
          <div className="flex-1 overflow-y-auto flex flex-col">
            {/* Info section */}
            <div className="px-6 py-4 space-y-3 border-b border-gray-100 shrink-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-gray-800">{detail.title}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <StatusBadge status={detail.status} />
                    <span className="text-xs text-gray-400">{CATEGORY_LABELS[detail.category] || detail.category}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">Học viên</p>
                  <div className="flex items-center gap-2">
                    {detail.student_picture ? (
                      <img src={detail.student_picture} alt="" className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="material-symbols-outlined text-blue-600" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>person</span>
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-800 text-xs leading-tight">{detail.student_name}</p>
                      <p className="text-gray-400 text-xs">{detail.student_email}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">Khóa học</p>
                  <p className="font-medium text-gray-800 text-xs leading-tight">{detail.course_title}</p>
                  {detail.tutor_name && <p className="text-gray-400 text-xs">GS: {detail.tutor_name}</p>}
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-1">Lý do</p>
                <p className="text-sm text-gray-700">{detail.reason}</p>
              </div>

              {detail.resolution_request && (
                <div className={`rounded-xl p-3 ${detail.resolution_request === 'refund' ? 'bg-amber-50 border border-amber-200' : 'bg-blue-50'}`}>
                  <p className="text-xs text-gray-400 mb-1">Học viên mong muốn</p>
                  <p className="text-sm font-semibold text-gray-800">{RESOLUTION_LABELS[detail.resolution_request] || detail.resolution_request}</p>
                  {detail.refund_reason && (
                    <p className="text-xs text-amber-700 mt-1">Lý do hoàn tiền: {detail.refund_reason}</p>
                  )}
                </div>
              )}

              {detail.description && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">Mô tả chi tiết</p>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{detail.description}</p>
                </div>
              )}

              {detail.attachments?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 mb-1.5">Minh chứng ({detail.attachments.length})</p>
                  <div className="flex gap-2 flex-wrap">
                    {detail.attachments.map((att, i) => (
                      <a key={i} href={att.file_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">
                        <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
                          {att.file_type === 'application/pdf' ? 'picture_as_pdf' : 'image'}
                        </span>
                        {att.file_name}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-400">Tạo lúc: {new Date(detail.created_at).toLocaleString('vi-VN')}</p>
            </div>

            {/* Timeline */}
            <div className="flex-1 px-6 py-4 space-y-1 overflow-y-auto min-h-[200px]">
              <p className="text-xs font-semibold text-gray-400 mb-3">TIMELINE ({detail.messages?.length || 0})</p>
              {detail.messages?.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Chưa có tin nhắn</p>
              ) : (
                detail.messages.map(m => <TimelineItem key={m.id} item={m} />)
              )}
            </div>

            {/* Admin action area */}
            <div className="px-6 py-4 border-t border-gray-200 shrink-0 bg-white space-y-4">

              {/* Resolution result banner */}
              {detail.resolution_type && (
                <div className="rounded-xl p-4 border" style={{
                  background: RESOLUTION_TYPE_CONFIG[detail.resolution_type]?.bg || '#f3f4f6',
                  borderColor: detail.resolution_type === 'accepted' ? '#bbf7d0' : detail.resolution_type === 'rejected' ? '#fecaca' : '#fde68a'
                }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1", color: RESOLUTION_TYPE_CONFIG[detail.resolution_type]?.color }}>
                      {RESOLUTION_TYPE_CONFIG[detail.resolution_type]?.icon}
                    </span>
                    <p className="font-bold text-sm" style={{ color: RESOLUTION_TYPE_CONFIG[detail.resolution_type]?.color }}>
                      {RESOLUTION_TYPE_CONFIG[detail.resolution_type]?.label}
                    </p>
                  </div>
                  {detail.refund_amount && (
                    <p className="text-xs text-green-700 font-semibold flex items-center gap-1 mt-1">
                      <span className="material-symbols-outlined" style={{ fontSize: 12 }}>payments</span>
                      Hoàn tiền: {parseInt(detail.refund_amount).toLocaleString('vi-VN')} VNĐ
                    </p>
                  )}
                  {detail.admin_response && <p className="text-xs text-gray-500 mt-1">{detail.admin_response}</p>}
                </div>
              )}

              {/* Ongoing comms: send message + change status */}
              {!['closed','resolved','rejected'].includes(detail.status) && (
                <>
                  <div className="flex gap-2 items-start">
                    <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
                      className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 bg-white shrink-0">
                      {Object.entries(STATUS_CONFIG).filter(([k]) => !['resolved','rejected','closed'].includes(k)).map(([key, cfg]) => (
                        <option key={key} value={key}>{cfg.label}</option>
                      ))}
                    </select>
                    <textarea value={replyMsg} onChange={e => setReplyMsg(e.target.value)}
                      placeholder="Gửi tin nhắn cho học viên..." rows={1}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 resize-none" />
                    <button onClick={handleSave} disabled={saving || (!replyMsg.trim() && newStatus === detail.status)}
                      className="px-3 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0 flex items-center justify-center">
                      {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <span className="material-symbols-outlined" style={{ fontSize: 18 }}>send</span>}
                    </button>
                  </div>
                  {saveError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-700">{saveError}</div>
                  )}
                </>
              )}

              {/* Final decision buttons */}
              {!['closed','resolved','rejected'].includes(detail.status) && (
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Quyết định cuối cùng</p>
                  <div className="flex gap-3">
                    <button onClick={() => setActionMode('accept')}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 border-green-200 text-green-700 bg-green-50 hover:bg-green-100 transition-colors flex items-center justify-center gap-1.5">
                      <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      Chấp nhận
                    </button>
                    <button onClick={() => setActionMode('reject')}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 border-red-200 text-red-700 bg-red-50 hover:bg-red-100 transition-colors flex items-center justify-center gap-1.5">
                      <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>cancel</span>
                      Từ chối
                    </button>
                  </div>
                </div>
              )}

              {['closed','resolved','rejected'].includes(detail.status) && !detail.resolution_type && (
                <p className="text-xs text-gray-400 text-center py-2">Khiếu nại đã đóng</p>
              )}
            </div>
          </div>
        )}
      </div>

      {actionMode && (
        <div className="absolute inset-0 z-[80] flex items-center justify-center p-4 bg-black/60">
          <DecisionModal
            type={actionMode}
            requestedResolution={detail?.resolution_request}
            saving={saving}
            onClose={() => !saving && setActionMode(null)}
            onConfirm={handleDecision}
          />
        </div>
      )}

      {toast && (
        <div className={`absolute bottom-6 right-6 z-[90] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>
            {toast.type === 'success' ? 'check_circle' : 'error'}
          </span>
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default function CourseComplaintsAdminView({ token }) {
  const [complaints, setComplaints] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const limit = 20;

  const headers = { Authorization: `Bearer ${token}` };

  const load = async (p = 1, sf = statusFilter, q = search) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit, status: sf });
      if (q) params.set('search', q);
      const res = await fetch(`${API_BASE}/api/admin/course-complaints?${params}`, { headers });
      if (!res.ok) return;
      const data = await res.json();
      setComplaints(data.complaints || []);
      setTotal(data.total || 0);
      setStats(data.stats || {});
      setPage(p);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(1); }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    load(1, statusFilter, search);
  };

  const handleFilterChange = (sf) => {
    setStatusFilter(sf);
    load(1, sf, search);
  };

  const totalPages = Math.ceil(total / limit);
  const totalAll = Object.values(stats).reduce((a, b) => a + b, 0);
  const pendingCount = (stats.pending || 0) + (stats.processing || 0) + (stats.waiting_student || 0) + (stats.waiting_tutor || 0);

  return (
    <>
      <div className="p-8 max-w-[1280px] mx-auto">
        {/* Header */}
        <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold text-on-background">Khiếu nại khóa học</h2>
            <p className="text-sm text-on-surface-variant mt-1">Quản lý và xử lý khiếu nại từ học viên về chất lượng khóa học.</p>
          </div>
          <button onClick={() => load(page)} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-outline-variant text-sm hover:bg-surface-container transition-colors">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>refresh</span> Làm mới
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Tổng khiếu nại', value: totalAll, color: '#6b7280', icon: 'list_alt' },
            { label: 'Đang xử lý', value: pendingCount, color: '#1d4ed8', icon: 'pending' },
            { label: 'Đã giải quyết', value: stats.resolved || 0, color: '#15803d', icon: 'check_circle' },
            { label: 'Đã từ chối', value: (stats.rejected || 0) + (stats.closed || 0), color: '#dc2626', icon: 'cancel' },
          ].map(s => (
            <div key={s.label} className="bg-surface-container-low rounded-xl border border-outline-variant/20 p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: s.color + '20' }}>
                <span className="material-symbols-outlined" style={{ color: s.color, fontSize: 22, fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-on-surface">{s.value}</p>
                <p className="text-xs text-on-surface-variant">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm học viên, khóa học, tiêu đề..."
              className="h-9 px-4 border border-outline-variant rounded-xl text-sm focus:outline-none focus:border-primary w-64 bg-surface"
            />
            <button type="submit" className="h-9 px-4 bg-primary text-on-primary rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">Tìm</button>
          </form>
          <div className="flex gap-2 flex-wrap">
            {[['all','Tất cả'],['pending','Chờ xử lý'],['processing','Đang xử lý'],['waiting_student','Chờ HS'],['resolved','Đã xong'],['rejected','Từ chối'],['closed','Đã đóng']].map(([val, lbl]) => (
              <button
                key={val}
                onClick={() => handleFilterChange(val)}
                className={`h-8 px-3 rounded-xl text-xs font-semibold transition-colors ${statusFilter === val ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}
              >
                {lbl}
                {val !== 'all' && stats[val] ? ` (${stats[val]})` : ''}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-surface rounded-2xl border border-outline-variant/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant/20 bg-surface-container-low">
                  <th className="text-left py-3 px-4 font-semibold text-on-surface-variant text-xs uppercase">Mã</th>
                  <th className="text-left py-3 px-4 font-semibold text-on-surface-variant text-xs uppercase">Tiêu đề</th>
                  <th className="text-left py-3 px-4 font-semibold text-on-surface-variant text-xs uppercase">Học viên</th>
                  <th className="text-left py-3 px-4 font-semibold text-on-surface-variant text-xs uppercase">Danh mục</th>
                  <th className="text-left py-3 px-4 font-semibold text-on-surface-variant text-xs uppercase">Trạng thái</th>
                  <th className="text-left py-3 px-4 font-semibold text-on-surface-variant text-xs uppercase">Ngày tạo</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="py-12 text-center text-on-surface-variant">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  </td></tr>
                ) : complaints.length === 0 ? (
                  <tr><td colSpan="6" className="py-12 text-center text-on-surface-variant">Không có khiếu nại nào</td></tr>
                ) : complaints.map(c => (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className="border-b border-outline-variant/10 hover:bg-surface-container-low cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-xs font-bold text-on-surface">CPL-{c.ticket_number}</span>
                    </td>
                    <td className="py-3.5 px-4 max-w-[200px]">
                      <p className="font-medium text-on-surface truncate">{c.title}</p>
                      <p className="text-xs text-on-surface-variant truncate">{c.course_title}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-medium text-on-surface text-xs">{c.student_name}</p>
                      <p className="text-xs text-on-surface-variant">{c.student_email}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-xs text-on-surface-variant">{CATEGORY_LABELS[c.category] || c.category}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <StatusBadge status={c.status} />
                        {c.resolution_request === 'refund' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700">
                            <span className="material-symbols-outlined" style={{ fontSize: 11, fontVariationSettings: "'FILL' 1" }}>currency_exchange</span>
                            Refund
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-on-surface-variant">{new Date(c.created_at).toLocaleDateString('vi-VN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-6">
            <button onClick={() => load(page - 1)} disabled={page <= 1} className="px-4 py-2 rounded-xl border border-outline-variant text-sm disabled:opacity-40 hover:bg-surface-container transition-colors">← Trước</button>
            <span className="text-sm text-on-surface-variant">Trang {page} / {totalPages} ({total} khiếu nại)</span>
            <button onClick={() => load(page + 1)} disabled={page >= totalPages} className="px-4 py-2 rounded-xl border border-outline-variant text-sm disabled:opacity-40 hover:bg-surface-container transition-colors">Tiếp →</button>
          </div>
        )}
      </div>

      {selectedId && (
        <DetailDrawer
          id={selectedId}
          token={token}
          onClose={() => setSelectedId(null)}
          onUpdated={() => load(page)}
        />
      )}
    </>
  );
}
