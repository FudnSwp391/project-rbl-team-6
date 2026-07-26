import { useState, useEffect, useMemo } from 'react';
import { API_BASE_URL } from '../config';

const API_BASE = API_BASE_URL;

// ── Loại yêu cầu hỗ trợ ──────────────────────────────────────────────────────
const REQUEST_TYPES = [
  {
    value: 'change_tutor',
    label: 'Đổi gia sư',
    icon: 'swap_horiz',
    color: '#7c3aed', bg: '#ede9fe',
    desc: 'Học thử rồi thấy chưa hợp? Yêu cầu đổi sang gia sư khác phù hợp hơn.',
    needsTutor: true,
    reasons: [
      'Phương pháp dạy không phù hợp với mình',
      'Buổi học nhàm chán, thiếu tương tác',
      'Gia sư dạy quá nhanh / quá chậm',
      'Không cải thiện sau nhiều buổi học',
      'Giờ giấc không khớp với lịch của mình',
      'Muốn học với gia sư có chuyên môn khác',
    ],
  },
  {
    value: 'tutor_complaint',
    label: 'Khiếu nại gia sư',
    icon: 'person_alert',
    color: '#dc2626', bg: '#fee2e2',
    desc: 'Gia sư đến muộn, bỏ buổi, thái độ không đúng mực? Báo cho chúng tôi.',
    needsTutor: true,
    reasons: [
      'Gia sư thường xuyên đến muộn',
      'Gia sư hủy buổi học nhiều lần',
      'Thái độ không phù hợp',
      'Chuyên môn không đúng như hồ sơ',
      'Yêu cầu thanh toán ngoài hệ thống',
    ],
  },
  {
    value: 'refund',
    label: 'Hoàn tiền',
    icon: 'currency_exchange',
    color: '#0891b2', bg: '#cffafe',
    desc: 'Yêu cầu hoàn lại học phí cho buổi học có vấn đề.',
    needsTutor: false,
    reasons: [
      'Buổi học không diễn ra nhưng bị trừ tiền',
      'Bị trừ tiền nhiều lần cho một buổi',
      'Số tiền bị trừ không đúng',
      'Gia sư không dạy đủ thời lượng',
    ],
  },
  {
    value: 'technical',
    label: 'Kỹ thuật',
    icon: 'build_circle',
    color: '#ea580c', bg: '#ffedd5',
    desc: 'Lỗi hệ thống, không vào được lớp online, sự cố thanh toán...',
    needsTutor: false,
    reasons: [
      'Không vào được link lớp học online',
      'Hệ thống báo lỗi khi đặt lịch',
      'Không nhận được thông báo / email',
      'Lỗi hiển thị trên trang web',
    ],
  },
  {
    value: 'other',
    label: 'Vấn đề khác',
    icon: 'help',
    color: '#4b5563', bg: '#f3f4f6',
    desc: 'Câu hỏi hoặc vấn đề khác cần EduX hỗ trợ.',
    needsTutor: false,
    reasons: [],
  },
];
const TYPE_MAP = Object.fromEntries(REQUEST_TYPES.map(t => [t.value, t]));

const STATUS_CONFIG = {
  pending:    { label: 'Đang chờ xử lý',   color: '#b45309', bg: '#fef3c7', icon: 'pending' },
  processing: { label: 'Đang xử lý',        color: '#1d4ed8', bg: '#dbeafe', icon: 'autorenew' },
  approved:   { label: 'Đã duyệt',          color: '#15803d', bg: '#dcfce7', icon: 'check_circle' },
  resolved:   { label: 'Đã giải quyết',     color: '#15803d', bg: '#dcfce7', icon: 'task_alt' },
  rejected:   { label: 'Đã từ chối',        color: '#dc2626', bg: '#fee2e2', icon: 'cancel' },
  cancelled:  { label: 'Đã hủy',            color: '#6b7280', bg: '#f3f4f6', icon: 'block' },
};

export default function SupportCenter({ token }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // form state
  const [formOpen, setFormOpen]     = useState(false);
  const [formType, setFormType]     = useState('');
  const [tutorKey, setTutorKey]       = useState('');
  const [reason, setReason]         = useState('');
  const [customReason, setCustomReason] = useState('');
  const [description, setDescription]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError]   = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // gia sư mình từng học (lấy từ bookings)
  const [myTutors, setMyTutors] = useState([]);

  const [cancellingId, setCancellingId] = useState(null);

  const headers = { Authorization: `Bearer ${token}` };

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/support-requests?page=${p}&limit=8`, { headers });
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
        setPage(p);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => {
    load(1);
    fetch(`${API_BASE}/api/student/bookings`, { headers })
      .then(r => r.ok ? r.json() : { bookings: [] })
      .then(d => {
        const seen = {};
        (d.bookings || []).forEach(b => {
          const key = `${b.tutor_id}_${b.subject || 'unknown'}`;
          if (b.tutor_id && !seen[key]) {
            seen[key] = {
              id: b.tutor_id,
              key: key,
              name: b.tutor_full_name || b.tutor_name || 'Gia sư',
              picture: b.tutor_picture,
              subject: b.subject,
            };
          }
        });
        setMyTutors(Object.values(seen));
      })
      .catch(() => {});
  }, []);

  const typeInfo = TYPE_MAP[formType] || null;

  const resetForm = () => {
    setFormType(''); setTutorKey(''); setReason(''); setCustomReason('');
    setDescription(''); setFormError('');
  };

  const openForm = (type) => {
    resetForm();
    setFormType(type);
    setFormOpen(true);
    setSuccessMsg('');
  };

  const handleSubmit = async () => {
    const info = TYPE_MAP[formType];
    if (!info) { setFormError('Vui lòng chọn loại yêu cầu.'); return; }
    const finalReason = info.reasons.length ? reason : customReason.trim();
    if (!finalReason) { setFormError('Vui lòng chọn hoặc nhập lý do.'); return; }
    if (info.needsTutor && !tutorKey) { setFormError('Vui lòng chọn gia sư liên quan.'); return; }
    setSubmitting(true);
    setFormError('');
    try {
      const selTutor = myTutors.find(t => t.key === tutorKey);
      const res = await fetch(`${API_BASE}/api/support-requests`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_type: formType,
          tutor_id: info.needsTutor && selTutor ? selTutor.id : undefined,
          subject: selTutor?.subject || undefined,
          reason: finalReason,
          description: description.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.message || 'Không gửi được yêu cầu.'); setSubmitting(false); return; }
      setFormOpen(false);
      resetForm();
      setSuccessMsg(`Đã gửi yêu cầu ${data.ticket_number}. Đội ngũ EduX sẽ phản hồi trong vòng 24 giờ.`);
      await load(1);
    } catch {
      setFormError('Lỗi kết nối. Vui lòng thử lại.');
    }
    setSubmitting(false);
  };

  const handleCancel = async (id) => {
    setCancellingId(id);
    try {
      const res = await fetch(`${API_BASE}/api/support-requests/${id}`, { method: 'DELETE', headers });
      if (res.ok) await load(page);
    } catch (e) { console.error(e); }
    setCancellingId(null);
  };

  const openCount = useMemo(() => requests.filter(r => ['pending', 'processing'].includes(r.status)).length, [requests]);

  return (
    <div className="flex flex-col gap-xl">

      {/* ── Header hero ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#00288e] via-[#2747c4] to-[#3a6fe0] p-lg lg:p-8 text-white">
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl translate-x-1/3 -translate-y-1/2 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6 justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-[28px]">support_agent</span>
              <h2 className="text-2xl font-extrabold">Trung Tâm Hỗ Trợ</h2>
            </div>
            <p className="text-white/80 text-sm max-w-lg leading-relaxed">
              Học chưa hợp gia sư? Gặp sự cố buổi học? Gửi yêu cầu — đội ngũ EduX phản hồi trong vòng <b className="text-white">24 giờ</b>.
              Nếu duyệt đổi gia sư, các buổi sắp tới với gia sư cũ sẽ tự hủy để bạn đặt gia sư mới ngay.
            </p>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div className="text-center bg-white/10 backdrop-blur rounded-xl px-5 py-3">
              <div className="text-2xl font-extrabold">{openCount}</div>
              <div className="text-[11px] text-white/70">Đang xử lý</div>
            </div>
            <div className="text-center bg-white/10 backdrop-blur rounded-xl px-5 py-3">
              <div className="text-2xl font-extrabold">{total}</div>
              <div className="text-[11px] text-white/70">Tổng yêu cầu</div>
            </div>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="flex items-start gap-3 rounded-xl border-2 border-green-200 bg-green-50 px-4 py-3 text-green-900">
          <span className="material-symbols-outlined text-green-600 mt-0.5" style={{fontVariationSettings:"'FILL' 1"}}>check_circle</span>
          <p className="text-sm leading-relaxed flex-1">{successMsg}</p>
          <button onClick={() => setSuccessMsg('')} className="text-green-700 hover:bg-green-100 rounded-full p-1">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {/* ── Quick action cards: chọn loại yêu cầu ── */}
      <div>
        <h3 className="font-headline-md text-headline-md text-on-surface mb-md">Bạn cần hỗ trợ gì?</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {REQUEST_TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => openForm(t.value)}
              className="group bg-surface rounded-2xl border border-outline-variant/30 p-4 text-left hover:shadow-lg hover:-translate-y-1 hover:border-primary/30 transition-all"
            >
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
                style={{ background: t.bg, color: t.color }}>
                <span className="material-symbols-outlined text-[24px]" style={{fontVariationSettings:"'FILL' 1"}}>{t.icon}</span>
              </div>
              <div className="font-bold text-sm text-on-surface mb-1">{t.label}</div>
              <div className="text-[11px] text-on-surface-variant leading-snug line-clamp-3">{t.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Form tạo yêu cầu ── */}
      {formOpen && typeInfo && (
        <div className="bg-surface rounded-2xl border-2 p-lg" style={{ borderColor: `${typeInfo.color}40` }}>
          <div className="flex items-center justify-between mb-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: typeInfo.bg, color: typeInfo.color }}>
                <span className="material-symbols-outlined text-[22px]" style={{fontVariationSettings:"'FILL' 1"}}>{typeInfo.icon}</span>
              </div>
              <div>
                <h3 className="font-bold text-base text-on-surface">{typeInfo.label}</h3>
                <p className="text-xs text-on-surface-variant">{typeInfo.desc}</p>
              </div>
            </div>
            <button onClick={() => { setFormOpen(false); resetForm(); }}
              className="w-9 h-9 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {formError && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-start gap-2">
              <span className="material-symbols-outlined text-red-500 shrink-0 mt-px" style={{ fontSize: 16 }}>error</span>
              <span>{formError}</span>
            </div>
          )}

          <div className="space-y-5">
            {/* Chọn gia sư (khi cần) */}
            {typeInfo.needsTutor && (
              <div>
                <label className="block text-xs font-bold text-on-surface mb-2">
                  Gia sư liên quan <span className="text-red-500">*</span>
                </label>
                {myTutors.length === 0 ? (
                  <div className="bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm text-on-surface-variant">
                    Bạn chưa có buổi học nào với gia sư. Chỉ có thể {typeInfo.label.toLowerCase()} khi đã từng đặt lịch học.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {myTutors.map(t => (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setTutorKey(t.key)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 text-left transition-all ${
                          tutorKey === t.key ? 'border-primary bg-primary/5' : 'border-outline-variant/40 hover:border-primary/40'
                        }`}
                      >
                        {t.picture ? (
                          <img src={t.picture} alt={t.name} className="w-9 h-9 rounded-full object-cover" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                            {t.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-on-surface truncate">{t.name}</div>
                          {t.subject && <div className="text-[11px] text-on-surface-variant truncate">{t.subject}</div>}
                        </div>
                        {tutorKey === t.key && (
                          <span className="material-symbols-outlined text-primary ml-auto shrink-0" style={{fontVariationSettings:"'FILL' 1", fontSize: 18}}>check_circle</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Lý do */}
            <div>
              <label className="block text-xs font-bold text-on-surface mb-2">
                Lý do <span className="text-red-500">*</span>
              </label>
              {typeInfo.reasons.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {typeInfo.reasons.map(r => (
                    <label key={r} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all text-sm ${
                      reason === r ? 'border-primary bg-primary/5' : 'border-outline-variant/40 hover:border-primary/40'
                    }`}>
                      <input type="radio" name="support-reason" value={r} checked={reason === r}
                        onChange={() => setReason(r)} className="accent-primary shrink-0" />
                      <span className="text-on-surface leading-snug">{r}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <input
                  value={customReason}
                  onChange={e => setCustomReason(e.target.value)}
                  placeholder="Nhập lý do cụ thể..."
                  maxLength={300}
                  className="w-full px-3 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-surface"
                />
              )}
            </div>

            {/* Mô tả chi tiết */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-on-surface">
                  Mô tả chi tiết <span className="text-on-surface-variant font-normal">(không bắt buộc)</span>
                </label>
                <span className="text-xs text-on-surface-variant">{description.length}/2000</span>
              </div>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={formType === 'change_tutor'
                  ? 'VD: Mình đã học 2 buổi nhưng cách giảng chưa phù hợp, mình muốn đổi sang gia sư có kinh nghiệm luyện thi hơn...'
                  : 'Mô tả cụ thể vấn đề để đội ngũ hỗ trợ xử lý nhanh hơn...'}
                rows={3}
                maxLength={2000}
                className="w-full px-3 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none transition-all bg-surface"
              />
            </div>

            {/* Ghi chú cho đổi gia sư */}
            {formType === 'change_tutor' && (
              <div className="flex items-start gap-2 bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 text-xs text-violet-800 leading-relaxed">
                <span className="material-symbols-outlined text-violet-500 shrink-0" style={{ fontSize: 16 }}>info</span>
                <span>
                  Khi admin duyệt yêu cầu, <b>các buổi học sắp tới với gia sư này sẽ tự động hủy</b> và bạn có thể đặt lịch với gia sư mới ngay.
                  Học phí các buổi chưa diễn ra được hoàn về ví theo chính sách.
                </span>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {submitting
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Đang gửi...</>
                  : <><span className="material-symbols-outlined text-[18px]">send</span>Gửi Yêu Cầu</>}
              </button>
              <button
                onClick={() => { setFormOpen(false); resetForm(); }}
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl border border-outline-variant text-on-surface text-sm font-semibold hover:bg-surface-container transition-colors disabled:opacity-50"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Danh sách yêu cầu của tôi ── */}
      <div>
        <div className="flex items-center justify-between mb-md">
          <h3 className="font-headline-md text-headline-md text-on-surface">Yêu cầu của tôi</h3>
          {total > 0 && (
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-label-md text-label-md">{total} yêu cầu</span>
          )}
        </div>

        {loading && requests.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-surface-container-low rounded-xl p-10 text-center border border-outline-variant/20">
            <span className="material-symbols-outlined text-[56px] text-on-surface-variant/30 block mb-3">forum</span>
            <p className="font-body-lg text-body-lg text-on-surface-variant">Bạn chưa gửi yêu cầu hỗ trợ nào.</p>
            <p className="font-body-md text-body-md text-on-surface-variant/70 mt-1">Chọn một mục phía trên khi cần EduX giúp đỡ.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {requests.map(r => {
              const st = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
              const ti = TYPE_MAP[r.request_type] || TYPE_MAP.other;
              const canCancel = r.status === 'pending';
              return (
                <div key={r.id} className="bg-surface rounded-xl border border-outline-variant/20 p-md hover:shadow-sm transition-shadow">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: ti.bg, color: ti.color }}>
                      <span className="material-symbols-outlined text-[20px]" style={{fontVariationSettings:"'FILL' 1"}}>{ti.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono font-bold text-xs text-on-surface">{r.ticket_number}</span>
                        <span className="text-xs font-bold" style={{ color: ti.color }}>{ti.label}</span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold" style={{ color: st.color, background: st.bg }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 11, fontVariationSettings: "'FILL' 1" }}>{st.icon}</span>
                          {st.label}
                        </span>
                        <span className="text-[11px] text-on-surface-variant ml-auto shrink-0">
                          {new Date(r.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-on-surface">{r.reason}</p>
                      {r.tutor_name && (
                        <p className="text-xs text-on-surface-variant mt-0.5 flex items-center gap-1">
                          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>person</span>
                          Gia sư: {r.tutor_name}{r.subject ? ` · ${r.subject}` : ''}
                        </p>
                      )}
                      {r.description && (
                        <p className="text-xs text-on-surface-variant mt-1 line-clamp-2">{r.description}</p>
                      )}
                      {r.admin_response && (
                        <div className="mt-2 bg-surface-container-low border border-outline-variant/20 rounded-lg px-3 py-2">
                          <p className="text-[11px] font-semibold text-on-surface-variant mb-0.5 flex items-center gap-1">
                            <span className="material-symbols-outlined" style={{ fontSize: 12 }}>support_agent</span>
                            Phản hồi từ EduX {r.admin_name ? `(${r.admin_name})` : ''}
                          </p>
                          <p className="text-sm text-on-surface">{r.admin_response}</p>
                        </div>
                      )}
                      {r.status === 'approved' && r.request_type === 'change_tutor' && (
                        <button
                          onClick={() => { window.location.hash = '/find-tutors'; }}
                          className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-on-primary text-xs font-bold hover:opacity-90 transition-opacity w-fit shadow-sm"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>person_search</span>
                          Tìm gia sư mới ngay
                        </button>
                      )}
                    </div>
                    {canCancel && (
                      <button
                        onClick={() => handleCancel(r.id)}
                        disabled={cancellingId === r.id}
                        className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        {cancellingId === r.id
                          ? <div className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                          : <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>}
                        Hủy
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-4">
            <button onClick={() => load(page - 1)} disabled={page <= 1}
              className="px-4 py-2 rounded-lg border border-outline-variant text-on-surface disabled:opacity-40 hover:bg-surface-container transition-colors text-sm font-semibold">
              Trước
            </button>
            <span className="text-sm text-on-surface-variant">Trang {page} / {totalPages}</span>
            <button onClick={() => load(page + 1)} disabled={page >= totalPages}
              className="px-4 py-2 rounded-lg border border-outline-variant text-on-surface disabled:opacity-40 hover:bg-surface-container transition-colors text-sm font-semibold">
              Tiếp
            </button>
          </div>
        )}
      </div>

      {/* ── FAQ nhanh ── */}
      <div className="bg-surface-container-low rounded-2xl border border-outline-variant/20 p-lg">
        <h3 className="font-bold text-base text-on-surface mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">quiz</span>
          Câu hỏi thường gặp
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { q: 'Đổi gia sư mất bao lâu?', a: 'Admin duyệt trong vòng 24 giờ. Sau khi duyệt, các buổi với gia sư cũ tự hủy và bạn đặt gia sư mới được ngay.' },
            { q: 'Học phí các buổi chưa học có mất không?', a: 'Không. Các buổi chưa diễn ra khi đổi gia sư sẽ được hoàn về ví EduX theo chính sách hoàn tiền.' },
            { q: 'Tôi có thể đổi gia sư bao nhiêu lần?', a: 'Không giới hạn — mục tiêu của EduX là bạn tìm được người dạy phù hợp nhất. Tuy nhiên mỗi yêu cầu đều được admin xem xét.' },
            { q: 'Khiếu nại có ảnh hưởng đến gia sư không?', a: 'Khiếu nại được xử lý kín đáo và công bằng: gia sư được phản hồi trước khi admin ra quyết định.' },
          ].map(f => (
            <div key={f.q} className="bg-surface rounded-xl border border-outline-variant/20 p-4">
              <p className="text-sm font-bold text-on-surface mb-1">{f.q}</p>
              <p className="text-xs text-on-surface-variant leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
