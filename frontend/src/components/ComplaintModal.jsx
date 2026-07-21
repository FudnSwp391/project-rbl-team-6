import { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../config';

const API_BASE = API_BASE_URL;

// ── Danh mục & lý do ─────────────────────────────────────────────────────────
const CATEGORIES = [
  {
    value: 'tutor_behavior',
    label: 'Gia sư',
    icon: 'person',
    reasons: [
      'Gia sư không liên hệ sau khi đăng ký',
      'Gia sư thường xuyên đến muộn',
      'Gia sư bỏ lớp / hủy lớp nhiều lần',
      'Thái độ không phù hợp với học viên',
      'Chuyên môn không đúng như mô tả',
      'Yêu cầu thanh toán ngoài hệ thống',
    ],
    placeholder: 'Mô tả cụ thể buổi học, hành vi của gia sư, ngày giờ xảy ra...',
  },
  {
    value: 'content_quality',
    label: 'Nội dung khóa học',
    icon: 'menu_book',
    reasons: [
      'Nội dung không đúng mô tả khóa học',
      'Bài giảng chất lượng thấp',
      'Thiếu tài liệu học tập',
      'Video bài giảng bị lỗi / không xem được',
      'Nội dung lỗi thời, không còn phù hợp',
      'Bài học chưa hoàn thiện',
    ],
    placeholder: 'Mô tả phần nội dung chưa đúng, bài học nào bị lỗi, thiếu tài liệu nào...',
  },
  {
    value: 'technical',
    label: 'Kỹ thuật',
    icon: 'build',
    reasons: [
      'Không vào được khóa học sau khi đăng ký',
      'Video không chạy / bị đứng',
      'Không tải được tài liệu đính kèm',
      'Hệ thống báo lỗi khi học',
      'Bài tập / bài kiểm tra không nộp được',
    ],
    placeholder: 'Mô tả lỗi gặp phải, thiết bị sử dụng, trình duyệt, các bước tái hiện lỗi...',
  },
  {
    value: 'payment',
    label: 'Thanh toán',
    icon: 'payments',
    reasons: [
      'Đã thanh toán nhưng khóa học chưa được mở',
      'Bị trừ tiền nhiều lần cho cùng một giao dịch',
      'Số tiền bị trừ không đúng',
      'Không nhận được xác nhận thanh toán',
      'Muốn yêu cầu hoàn tiền',
    ],
    placeholder: 'Mô tả thời điểm thanh toán, số tiền, mã giao dịch nếu có...',
  },
  {
    value: 'other',
    label: 'Khác',
    icon: 'more_horiz',
    reasons: [],
    placeholder: 'Mô tả chi tiết vấn đề bạn gặp phải...',
  },
];

const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map(c => [c.value, c]));

// course_swap/CHANGE_COURSE/CHANGE_TUTOR/OTHER kept only to label pre-existing complaints; no longer selectable
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

// ── Status ────────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending:         { label: 'Đang chờ xử lý',       color: '#b45309', bg: '#fef3c7', icon: 'pending' },
  processing:      { label: 'Đang xử lý',            color: '#1d4ed8', bg: '#dbeafe', icon: 'autorenew' },
  waiting_student: { label: 'Chờ phản hồi của bạn', color: '#7c3aed', bg: '#ede9fe', icon: 'mark_chat_unread' },
  waiting_tutor:   { label: 'Chờ phản hồi gia sư',  color: '#ea580c', bg: '#ffedd5', icon: 'person_search' },
  resolved:        { label: 'Đã giải quyết',         color: '#15803d', bg: '#dcfce7', icon: 'check_circle' },
  rejected:        { label: 'Đã từ chối',            color: '#dc2626', bg: '#fee2e2', icon: 'cancel' },
  closed:          { label: 'Đã đóng',               color: '#6b7280', bg: '#f3f4f6', icon: 'lock' },
};

const TERMINAL = ['resolved', 'rejected', 'closed'];

function formatBytes(b) {
  if (!b) return '';
  if (b < 1024) return b + ' B';
  if (b < 1024 * 1024) return (b / 1024).toFixed(0) + ' KB';
  return (b / (1024 * 1024)).toFixed(1) + ' MB';
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: '#6b7280', bg: '#f3f4f6', icon: 'info' };
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
      style={{ color: cfg.color, background: cfg.bg }}>
      <span className="material-symbols-outlined" style={{ fontSize: 13, fontVariationSettings: "'FILL' 1" }}>{cfg.icon}</span>
      {cfg.label}
    </span>
  );
}

function TimelineItem({ item }) {
  const isStatusChange = item.message_type === 'status_change';
  const isResolution = item.message_type === 'resolution';
  const meta = item.metadata || {};

  if (isStatusChange) {
    return (
      <div className="flex items-center gap-3 py-1.5">
        <div className="w-7 h-7 rounded-full bg-[#f0f1f3] flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-[#9aa3b8]" style={{ fontSize: 14 }}>swap_horiz</span>
        </div>
        <div className="flex-1 bg-[#f8f9fb] rounded-xl px-3 py-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-[#757684]">Trạng thái thay đổi:</span>
            {meta.from && <StatusBadge status={meta.from} />}
            <span className="text-xs text-[#9aa3b8]">→</span>
            {meta.to && <StatusBadge status={meta.to} />}
          </div>
          <p className="text-xs text-[#9aa3b8] mt-0.5">{new Date(item.created_at).toLocaleString('vi-VN')}</p>
        </div>
      </div>
    );
  }

  if (isResolution) {
    const rd = meta.resolution_details;
    const resColors = { accepted: { color: '#15803d', bg: '#dcfce7', border: '#bbf7d0' }, rejected: { color: '#dc2626', bg: '#fee2e2', border: '#fecaca' } };
    const rc = resColors[meta.resolution_type] || { color: '#6b7280', bg: '#f3f4f6', border: '#e5e7eb' };
    return (
      <div className="flex items-start gap-3 py-1.5">
        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: rc.bg }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1", color: rc.color }}>
            {meta.resolution_type === 'accepted' ? 'check_circle' : 'cancel'}
          </span>
        </div>
        <div className="flex-1 rounded-xl px-3.5 py-3 border" style={{ background: rc.bg, borderColor: rc.border }}>
          <p className="text-xs font-bold" style={{ color: rc.color }}>
            {meta.resolution_type === 'accepted' ? 'Admin đã chấp nhận khiếu nại' : 'Admin đã từ chối khiếu nại'}
          </p>
          {item.message && <p className="text-sm mt-1.5 leading-relaxed" style={{ color: '#374151' }}>{item.message}</p>}
          {meta.refund_amount && (
            <div className="mt-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined" style={{ fontSize: 13, color: '#15803d' }}>payments</span>
              <p className="text-xs font-semibold text-green-700">Hoàn tiền: {parseInt(meta.refund_amount).toLocaleString('vi-VN')} VNĐ</p>
            </div>
          )}
          {rd?.note && <p className="text-xs text-gray-600 mt-1.5">Phương án: {rd.note}</p>}
          <p className="text-xs mt-2" style={{ color: '#9aa3b8' }}>{new Date(item.created_at).toLocaleString('vi-VN')}</p>
        </div>
      </div>
    );
  }

  const isAdmin = item.sender_role === 'admin';
  return (
    <div className={`flex gap-2.5 py-1.5 ${isAdmin ? '' : 'flex-row-reverse'}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isAdmin ? 'bg-[#00288e] text-white' : 'bg-[#e0e8ff] text-[#00288e]'}`}>
        <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>
          {isAdmin ? 'support_agent' : 'person'}
        </span>
      </div>
      <div className={`flex-1 max-w-[78%] ${isAdmin ? '' : 'items-end flex flex-col'}`}>
        <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${isAdmin ? 'bg-[#f0f4ff] text-[#191c1e] rounded-tl-sm' : 'bg-[#00288e] text-white rounded-tr-sm'}`}>
          {item.message}
        </div>
        <p className="text-xs text-[#9aa3b8] mt-0.5 px-1">
          {item.sender_name || (isAdmin ? 'Admin' : 'Bạn')} · {new Date(item.created_at).toLocaleString('vi-VN')}
        </p>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ComplaintModal({ isOpen, onClose, onSuccess, courseId, courseTitle, token, complaintId = null }) {
  const [mode, setMode]           = useState('loading'); // loading | form | tracker
  const [complaint, setComplaint] = useState(null);
  const [conflictNote, setConflictNote] = useState('');

  // form
  const [title, setTitle]               = useState('');
  const [category, setCategory]         = useState('');
  const [reason, setReason]             = useState('');
  const [customReason, setCustomReason] = useState('');
  const [description, setDescription]   = useState('');
  const [files, setFiles]               = useState([]);
  const [uploading, setUploading]       = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [formError, setFormError]       = useState('');

  // tracker
  const [replyText, setReplyText] = useState('');
  const [sending, setSending]     = useState(false);
  const timelineRef = useRef(null);
  const formErrorRef = useRef(null);

  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const catInfo = CATEGORY_MAP[category] || null;
  const descRequired = category === 'other';

  const resetForm = () => {
    setTitle(''); setCategory(''); setReason(''); setCustomReason('');
    setDescription('');
    setFiles([]); setFormError('');
  };

  const scrollBottom = () => {
    if (timelineRef.current) timelineRef.current.scrollTop = timelineRef.current.scrollHeight;
  };

  const loadComplaint = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/complaints/${id}`, { headers: authHeaders });
      if (!res.ok) return;
      setComplaint(await res.json());
      setMode('tracker');
    } catch (e) { console.error(e); }
  };

  const checkActive = async () => {
    if (!courseId) { setMode('form'); return false; }
    try {
      const res = await fetch(`${API_BASE}/api/complaints/active?course_id=${courseId}`, { headers: authHeaders });
      if (!res.ok) { setMode('form'); return false; }
      const data = await res.json();
      if (data.active) { setComplaint(data.active); setMode('tracker'); return true; }
    } catch { }
    setMode('form');
    return false;
  };

  useEffect(() => {
    if (!isOpen) return;
    setMode('loading');
    setFormError('');
    setConflictNote('');
    resetForm();
    if (complaintId) loadComplaint(complaintId);
    else checkActive();
  }, [isOpen, courseId, complaintId]);

  useEffect(() => {
    if (mode === 'tracker') setTimeout(scrollBottom, 80);
  }, [mode, complaint?.messages?.length]);

  useEffect(() => {
    if (formError) {
      setTimeout(() => formErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 30);
    }
  }, [formError]);

  const handleFileAdd = async (e) => {
    const picked = Array.from(e.target.files || []);
    if (!picked.length) return;
    setUploading(true);
    setFormError('');
    const uploaded = [];
    for (const f of picked) {
      const fd = new FormData();
      fd.append('file', f);
      try {
        const res = await fetch(`${API_BASE}/api/complaints/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
        if (!res.ok) { const d = await res.json(); setFormError(d.message || 'Upload lỗi'); continue; }
        uploaded.push(await res.json());
      } catch { setFormError('Lỗi kết nối khi upload file'); }
    }
    setFiles(prev => [...prev, ...uploaded]);
    setUploading(false);
    e.target.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimTitle  = title.trim();
    const trimDesc   = description.trim();
    const finalReason = category === 'other' ? customReason.trim() : reason;

    if (!trimTitle)                                       { setFormError('Vui lòng nhập tiêu đề khiếu nại.'); return; }
    if (trimTitle.length < 5)                             { setFormError('Tiêu đề phải có ít nhất 5 ký tự.'); return; }
    if (!category)                                        { setFormError('Vui lòng chọn danh mục khiếu nại.'); return; }
    if (category === 'other' && !customReason.trim())     { setFormError('Vui lòng nhập lý do cụ thể.'); return; }
    if (category !== 'other' && !reason)                  { setFormError('Vui lòng chọn lý do cụ thể.'); return; }
    if (descRequired && !trimDesc)                        { setFormError('Vui lòng mô tả chi tiết vấn đề.'); return; }

    setSubmitting(true);
    setFormError('');

    try {
      const body = {
        course_id: courseId,
        title: trimTitle,
        category,
        reason: finalReason,
        description: trimDesc || undefined,
        attachments: files,
        resolution_request: 'REFUND',
      };

      const res = await fetch(`${API_BASE}/api/complaints`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(body),
      });

      let data;
      try {
        data = await res.json();
      } catch (parseErr) {
        console.error('[Complaint] res.json() failed:', parseErr);
        setFormError('Máy chủ trả về dữ liệu không hợp lệ. Vui lòng thử lại.');
        setSubmitting(false);
        return;
      }

      if (res.status === 409) {
        const found = await checkActive();
        if (!found) {
          // checkActive failed to enter tracker; show error visibly in form
          setFormError(data.message || 'Bạn đã có một khiếu nại đang xử lý cho khóa học này.');
        }
        setSubmitting(false);
        return;
      }

      if (!res.ok) {
        const msg = data?.message || `Lỗi ${res.status}: Không thể gửi khiếu nại.`;
        console.error('[Complaint] API error:', msg);
        setFormError(msg);
        setSubmitting(false);
        return;
      }

      // SUCCESS
      setSubmitting(false);
      if (onSuccess) onSuccess(data);
      else onClose();
    } catch (err) {
      console.error('[Complaint] Unexpected error in handleSubmit:', err);
      setFormError('Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối và thử lại.');
      setSubmitting(false);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/api/complaints/${complaint.id}/messages`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ message: replyText.trim() }),
      });
      if (res.ok) { setReplyText(''); await loadComplaint(complaint.id); }
    } catch { }
    setSending(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e7eb] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#fee2e2] flex items-center justify-center">
              <span className="material-symbols-outlined text-[#dc2626]" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>report_problem</span>
            </div>
            <div>
              <h2 className="font-bold text-[#191c1e] text-base leading-tight">
                {mode === 'tracker' && complaint ? 'Chi tiết khiếu nại' : 'Gửi khiếu nại'}
              </h2>
              {mode === 'tracker' && complaint && (
                <p className="text-xs text-[#757684] font-mono">CPL-{complaint.ticket_number}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-[#f0f1f3] flex items-center justify-center text-[#757684] transition-colors">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto min-h-0">

          {mode === 'loading' && (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-2 border-[#00288e] border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* ── FORM ── */}
          {mode === 'form' && (
            <form onSubmit={handleSubmit} className="p-6 space-y-5">

              {/* Error banner — TOP of form, always visible */}
              {formError && (
                <div ref={formErrorRef} className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-start gap-2">
                  <span className="material-symbols-outlined text-red-500 shrink-0 mt-px" style={{ fontSize: 17 }}>error</span>
                  <span>{formError}</span>
                </div>
              )}

              {/* Khóa học + chính sách hoàn tiền — compact info card */}
              <div className="bg-[#f8f9fb] border border-[#e5e7eb] rounded-xl px-4 py-3 text-xs text-[#444653]">
                {courseTitle && (
                  <p className="text-sm font-semibold text-[#191c1e] mb-2">Khóa học: <span className="font-normal">{courseTitle}</span></p>
                )}
                <p className="font-bold text-[#191c1e] mb-1">Chính sách hoàn tiền (trong 48 giờ đầu, theo tiến độ học)</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>Tiến độ ≤ 20% → hoàn 100%</li>
                  <li>21–40% → hoàn 70%</li>
                  <li>41–60% → hoàn 40%</li>
                  <li>61–80% → hoàn 20%</li>
                  <li>Trên 80% hoặc sau 48 giờ → Admin xem xét</li>
                </ul>
              </div>

              {/* Tiêu đề */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-semibold text-[#191c1e]">Tiêu đề <span className="text-red-500">*</span></label>
                  <span className="text-xs text-[#9aa3b8]">{title.length}/200</span>
                </div>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Mô tả ngắn gọn vấn đề của bạn..."
                  maxLength={200}
                  className="w-full px-4 py-2.5 border border-[#d1d5db] rounded-xl text-sm focus:outline-none focus:border-[#00288e] focus:ring-2 focus:ring-[#00288e]/20 transition-all"
                />
              </div>

              {/* Danh mục */}
              <div>
                <label className="block text-sm font-semibold text-[#191c1e] mb-2">Danh mục <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => { setCategory(cat.value); setReason(''); setCustomReason(''); }}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-left transition-all text-sm ${
                        category === cat.value
                          ? 'border-[#00288e] bg-[#e8eeff] text-[#00288e] font-semibold'
                          : 'border-[#e5e7eb] text-[#444653] hover:border-[#00288e]/40'
                      }`}
                    >
                      <span className="material-symbols-outlined shrink-0" style={{ fontSize: 17, fontVariationSettings: category === cat.value ? "'FILL' 1" : "'FILL' 0" }}>
                        {cat.icon}
                      </span>
                      <span className="leading-tight">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Lý do cụ thể */}
              {category && (
                <div>
                  <label className="block text-sm font-semibold text-[#191c1e] mb-1.5">Lý do cụ thể <span className="text-red-500">*</span></label>
                  {category === 'other' ? (
                    <input
                      value={customReason}
                      onChange={e => setCustomReason(e.target.value)}
                      placeholder="Nhập lý do cụ thể..."
                      maxLength={300}
                      className="w-full px-4 py-2.5 border border-[#d1d5db] rounded-xl text-sm focus:outline-none focus:border-[#00288e] focus:ring-2 focus:ring-[#00288e]/20 transition-all"
                    />
                  ) : (
                    <div className="space-y-1.5">
                      {catInfo.reasons.map(r => (
                        <label key={r} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${
                          reason === r ? 'border-[#00288e] bg-[#f0f4ff]' : 'border-[#e5e7eb] hover:border-[#00288e]/40'
                        }`}>
                          <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="accent-[#00288e] shrink-0" />
                          <span className="text-sm text-[#191c1e]">{r}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Mong muốn của học viên — giá trị cố định, không phải lựa chọn */}
              <div>
                <label className="block text-sm font-semibold text-[#191c1e] mb-2">Mong muốn của học viên</label>
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 border-[#00288e] bg-[#e8eeff] text-[#00288e] font-semibold text-sm w-fit">
                  <span className="material-symbols-outlined shrink-0 text-green-500" style={{ fontSize: 10, fontVariationSettings: "'FILL' 1" }}>circle</span>
                  Yêu cầu hoàn tiền
                </div>
                <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined shrink-0" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>warning</span>
                    Hoàn tiền không được đảm bảo
                  </p>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    Mức hoàn tiền do hệ thống và Admin quyết định dựa trên chính sách, tiến độ học, thời gian và minh chứng bạn cung cấp. Bạn không cần tự chọn mức hoàn tiền.
                  </p>
                </div>
              </div>

              {/* Mô tả chi tiết */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-semibold text-[#191c1e]">
                    Mô tả chi tiết
                    {descRequired
                      ? <span className="text-red-500"> *</span>
                      : <span className="text-[#9aa3b8] font-normal text-xs ml-1">(không bắt buộc)</span>}
                  </label>
                  <span className="text-xs text-[#9aa3b8]">{description.length}/2000</span>
                </div>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder={catInfo?.placeholder || 'Mô tả chi tiết vấn đề của bạn...'}
                  rows={4}
                  maxLength={2000}
                  className="w-full px-4 py-2.5 border border-[#d1d5db] rounded-xl text-sm focus:outline-none focus:border-[#00288e] focus:ring-2 focus:ring-[#00288e]/20 resize-none transition-all"
                />
              </div>

              {/* Upload */}
              <div>
                <label className="block text-sm font-semibold text-[#191c1e] mb-1.5">
                  Minh chứng đính kèm <span className="text-[#9aa3b8] font-normal text-xs">(JPG, PNG, PDF · tối đa 5MB/file)</span>
                </label>
                <div className="border-2 border-dashed border-[#d1d5db] rounded-xl p-4 text-center hover:border-[#00288e]/50 transition-colors">
                  <input type="file" id="complaint-file" accept=".jpg,.jpeg,.png,.pdf" multiple onChange={handleFileAdd} className="hidden" disabled={uploading} />
                  <label htmlFor="complaint-file" className="cursor-pointer block">
                    {uploading ? (
                      <div className="flex items-center justify-center gap-2 text-sm text-[#757684]">
                        <div className="w-4 h-4 border-2 border-[#00288e] border-t-transparent rounded-full animate-spin" />
                        Đang upload...
                      </div>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[#9aa3b8] block mb-1" style={{ fontSize: 30 }}>upload_file</span>
                        <span className="text-sm text-[#757684]">Nhấn để chọn file</span>
                      </>
                    )}
                  </label>
                </div>

                {files.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {files.map((f, i) => {
                      const isImg = f.file_type?.startsWith('image/');
                      return isImg ? (
                        <div key={i} className="relative group rounded-xl overflow-hidden border border-[#e5e7eb] bg-[#f8f9fb]">
                          <img src={f.file_url} alt={f.file_name} className="w-full h-28 object-cover" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-2">
                            <p className="text-white text-xs truncate">{f.file_name}</p>
                            <p className="text-white/70 text-xs">{formatBytes(f.file_size)}</p>
                          </div>
                          <button type="button" onClick={() => setFiles(p => p.filter((_, j) => j !== i))}
                            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 hover:bg-red-600 text-white flex items-center justify-center transition-colors">
                            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>close</span>
                          </button>
                        </div>
                      ) : (
                        <div key={i} className="flex items-center gap-2.5 bg-[#f8f9fb] border border-[#e5e7eb] rounded-xl px-3 py-3">
                          <span className="material-symbols-outlined text-red-500 shrink-0" style={{ fontSize: 26 }}>picture_as_pdf</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-[#444653] truncate font-medium">{f.file_name}</p>
                            <p className="text-xs text-[#9aa3b8]">{formatBytes(f.file_size)}</p>
                          </div>
                          <button type="button" onClick={() => setFiles(p => p.filter((_, j) => j !== i))}
                            className="text-[#9aa3b8] hover:text-red-600 shrink-0 transition-colors">
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <button type="submit" disabled={submitting || uploading}
                className="w-full py-3 rounded-xl bg-[#dc2626] text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {submitting
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Đang gửi...</>
                  : <><span className="material-symbols-outlined" style={{ fontSize: 18 }}>send</span>Gửi khiếu nại</>
                }
              </button>
            </form>
          )}

          {/* ── TRACKER ── */}
          {mode === 'tracker' && complaint && (
            <div className="flex flex-col" style={{ minHeight: 400 }}>

              {conflictNote && (
                <div className="mx-6 mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-500 shrink-0" style={{ fontSize: 17, fontVariationSettings: "'FILL' 1" }}>info</span>
                  {conflictNote}
                </div>
              )}

              {/* Ticket info */}
              <div className="px-6 pt-5 pb-4 shrink-0">
                <div className="bg-[#f8f9fb] rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="text-xs text-[#9aa3b8] mb-0.5">Mã khiếu nại</p>
                      <p className="font-mono font-bold text-xl text-[#191c1e] tracking-wide">CPL-{complaint.ticket_number}</p>
                    </div>
                    <StatusBadge status={complaint.status} />
                  </div>

                  <p className="font-semibold text-sm text-[#191c1e] mb-3">{complaint.title}</p>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <div>
                      <span className="text-[#9aa3b8]">Danh mục</span>
                      <p className="text-[#444653] font-medium">{CATEGORY_MAP[complaint.category]?.label || complaint.category}</p>
                    </div>
                    <div>
                      <span className="text-[#9aa3b8]">Ngày gửi</span>
                      <p className="text-[#444653] font-medium">{new Date(complaint.created_at).toLocaleDateString('vi-VN')}</p>
                    </div>
                    {complaint.course_title && (
                      <div className="col-span-2">
                        <span className="text-[#9aa3b8]">Khóa học</span>
                        <p className="text-[#444653] font-medium truncate">{complaint.course_title}</p>
                      </div>
                    )}
                    {complaint.resolution_request && (
                      <div className="col-span-2">
                        <span className="text-[#9aa3b8]">Mong muốn</span>
                        <p className="text-[#00288e] font-semibold">{RESOLUTION_LABELS[complaint.resolution_request] || complaint.resolution_request}</p>
                      </div>
                    )}
                    {complaint.refund_reason && (
                      <div className="col-span-2">
                        <span className="text-[#9aa3b8]">Lý do hoàn tiền</span>
                        <p className="text-[#444653] font-medium">{complaint.refund_reason}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-[#9aa3b8]">Admin phụ trách</span>
                      {complaint.admin_name
                        ? <p className="text-[#444653] font-medium">{complaint.admin_name}</p>
                        : <p className="text-[#9aa3b8] italic">Chưa phân công</p>}
                    </div>
                  </div>

                  {TERMINAL.includes(complaint.status) && (
                    <button
                      onClick={() => { setComplaint(null); setConflictNote(''); resetForm(); setMode('form'); }}
                      className="mt-3 w-full py-2 rounded-xl border-2 border-[#dc2626] text-[#dc2626] text-xs font-semibold hover:bg-red-50 transition-colors flex items-center justify-center gap-1.5">
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add</span>
                      Tạo khiếu nại mới
                    </button>
                  )}
                </div>
              </div>

              {/* Attachments */}
              {complaint.attachments?.length > 0 && (
                <div className="px-6 pb-3 shrink-0">
                  <p className="text-xs font-semibold text-[#757684] mb-2">Minh chứng ({complaint.attachments.length})</p>
                  <div className="flex gap-2 flex-wrap">
                    {complaint.attachments.map((att, i) => (
                      <a key={i} href={att.file_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 bg-[#f0f4ff] text-[#00288e] text-xs px-3 py-1.5 rounded-lg hover:bg-[#e0e8ff] transition-colors max-w-[200px]">
                        <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
                          {att.file_type === 'application/pdf' ? 'picture_as_pdf' : 'image'}
                        </span>
                        <span className="truncate">{att.file_name}</span>
                        {att.file_size && <span className="shrink-0 text-[#9aa3b8] ml-1">{formatBytes(att.file_size)}</span>}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div ref={timelineRef} className="flex-1 overflow-y-auto px-6 pb-2">
                {!complaint.messages?.length ? (
                  <div className="flex flex-col items-center justify-center py-8 text-[#9aa3b8] text-sm">
                    <span className="material-symbols-outlined mb-2" style={{ fontSize: 36 }}>forum</span>
                    Chưa có tin nhắn
                  </div>
                ) : complaint.messages.map(m => <TimelineItem key={m.id} item={m} />)}
              </div>

              {/* Reply */}
              {['processing', 'waiting_student'].includes(complaint.status) && (
                <div className="px-6 py-4 border-t border-[#e5e7eb] shrink-0">
                  <div className="flex gap-2.5">
                    <textarea
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(); } }}
                      placeholder="Nhập phản hồi... (Enter để gửi)"
                      rows={2}
                      className="flex-1 px-3.5 py-2.5 border border-[#d1d5db] rounded-xl text-sm focus:outline-none focus:border-[#00288e] resize-none transition-all"
                    />
                    <button onClick={handleReply} disabled={!replyText.trim() || sending}
                      className="w-10 h-10 self-end rounded-xl bg-[#00288e] text-white flex items-center justify-center hover:bg-[#001d6e] disabled:opacity-40 transition-colors shrink-0">
                      {sending
                        ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>send</span>
                      }
                    </button>
                  </div>
                </div>
              )}

              {complaint.status === 'pending' && (
                <div className="px-6 py-4 border-t border-[#e5e7eb] shrink-0">
                  <p className="text-xs text-center text-[#9aa3b8]">Khiếu nại đang chờ Admin xử lý. Chúng tôi sẽ liên hệ trong vòng 1–3 ngày làm việc.</p>
                </div>
              )}
              {complaint.status === 'waiting_tutor' && (
                <div className="px-6 py-4 border-t border-[#e5e7eb] shrink-0">
                  <p className="text-xs text-center text-[#9aa3b8]">Đang chờ phản hồi từ gia sư. Admin sẽ thông báo khi có cập nhật.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
