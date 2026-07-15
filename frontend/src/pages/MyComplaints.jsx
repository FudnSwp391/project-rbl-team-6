import { useState, useEffect } from 'react';
import ComplaintModal from '../components/ComplaintModal';
import { API_BASE_URL } from '../config';

const API_BASE = API_BASE_URL;

const STATUS_CONFIG = {
  pending:         { label: 'Đang chờ xử lý',       color: '#b45309', bg: '#fef3c7', icon: 'pending' },
  processing:      { label: 'Đang xử lý',            color: '#1d4ed8', bg: '#dbeafe', icon: 'autorenew' },
  waiting_student: { label: 'Chờ phản hồi của bạn', color: '#7c3aed', bg: '#ede9fe', icon: 'mark_chat_unread' },
  waiting_tutor:   { label: 'Chờ phản hồi gia sư',  color: '#ea580c', bg: '#ffedd5', icon: 'person_search' },
  resolved:        { label: 'Đã giải quyết',         color: '#15803d', bg: '#dcfce7', icon: 'check_circle' },
  rejected:        { label: 'Đã từ chối',            color: '#dc2626', bg: '#fee2e2', icon: 'cancel' },
  closed:          { label: 'Đã đóng',               color: '#6b7280', bg: '#f3f4f6', icon: 'lock' },
};

const CATEGORY_LABELS = {
  tutor_behavior:  'Gia sư',
  content_quality: 'Nội dung khóa học',
  technical:       'Kỹ thuật',
  payment:         'Thanh toán',
  other:           'Vấn đề khác',
};

const RESOLUTION_LABELS = {
  report_only:   'Chỉ phản ánh',
  admin_contact: 'Yêu cầu Admin liên hệ',
  course_swap:   'Đổi khóa học',
  refund:        'Hoàn tiền',
  REFUND:        'Hoàn tiền',
};

const CATEGORIES = [
  { value: 'tutor_behavior',  label: 'Gia sư',              icon: 'person',      reasons: ['Gia sư không liên hệ sau khi đăng ký','Gia sư thường xuyên đến muộn','Gia sư bỏ lớp / hủy lớp nhiều lần','Thái độ không phù hợp với học viên','Chuyên môn không đúng như mô tả','Yêu cầu thanh toán ngoài hệ thống'] },
  { value: 'content_quality', label: 'Nội dung khóa học',   icon: 'menu_book',   reasons: ['Nội dung không đúng mô tả khóa học','Bài giảng chất lượng thấp','Thiếu tài liệu học tập','Video bài giảng bị lỗi / không xem được','Nội dung lỗi thời, không còn phù hợp','Bài học chưa hoàn thiện'] },
  { value: 'technical',       label: 'Kỹ thuật',            icon: 'build',       reasons: ['Không vào được khóa học sau khi đăng ký','Video không chạy / bị đứng','Không tải được tài liệu đính kèm','Hệ thống báo lỗi khi học','Bài tập / bài kiểm tra không nộp được'] },
  { value: 'payment',         label: 'Thanh toán',          icon: 'payments',    reasons: ['Đã thanh toán nhưng khóa học chưa được mở','Bị trừ tiền nhiều lần cho cùng một giao dịch','Số tiền bị trừ không đúng','Không nhận được xác nhận thanh toán','Muốn yêu cầu hoàn tiền'] },
  { value: 'other',           label: 'Khác',                icon: 'more_horiz',  reasons: [] },
];

const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map(c => [c.value, c]));

export default function MyComplaints({ token }) {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const limit = 10;

  // delete state
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deleting, setDeleting]               = useState(false);
  const [deleteError, setDeleteError]         = useState('');

  // edit state
  const [editingId, setEditingId]   = useState(null);
  const [editForm, setEditForm]     = useState({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError]   = useState('');

  const headers = { Authorization: `Bearer ${token}` };

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/complaints?page=${p}&limit=${limit}`, { headers });
      if (!res.ok) return;
      const data = await res.json();
      setComplaints(data.complaints || []);
      setTotal(data.total || 0);
      setPage(p);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(1); }, []);

  const totalPages = Math.ceil(total / limit);

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    setDeleting(true);
    setDeleteError('');
    try {
      const res = await fetch(`${API_BASE}/api/complaints/${confirmDeleteId}`, {
        method: 'DELETE',
        headers,
      });
      const data = await res.json();
      if (!res.ok) { setDeleteError(data.message || 'Không thể xoá khiếu nại.'); setDeleting(false); return; }
      setConfirmDeleteId(null);
      await load(page);
    } catch { setDeleteError('Lỗi kết nối. Vui lòng thử lại.'); }
    setDeleting(false);
  };

  const openEdit = (c) => {
    setEditingId(c.id);
    setEditError('');
    setEditForm({
      title:              c.title || '',
      category:           c.category || '',
      reason:             c.reason || '',
      customReason:       c.category === 'other' ? (c.reason || '') : '',
      description:        c.description || '',
    });
  };

  const handleEditSave = async () => {
    const trimTitle = editForm.title.trim();
    const finalReason = editForm.category === 'other' ? editForm.customReason.trim() : editForm.reason;
    if (!trimTitle || trimTitle.length < 5) { setEditError('Tiêu đề phải có ít nhất 5 ký tự.'); return; }
    if (!editForm.category)                 { setEditError('Vui lòng chọn danh mục.'); return; }
    if (!finalReason)                       { setEditError('Vui lòng chọn hoặc nhập lý do.'); return; }
    if (editForm.category === 'other' && !editForm.customReason.trim()) { setEditError('Vui lòng nhập lý do cụ thể.'); return; }

    setSavingEdit(true);
    setEditError('');
    try {
      const res = await fetch(`${API_BASE}/api/complaints/${editingId}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:              trimTitle,
          category:           editForm.category,
          reason:             finalReason,
          description:        editForm.description.trim() || undefined,
          resolution_request: 'REFUND',
        }),
      });
      const data = await res.json();
      if (!res.ok) { setEditError(data.message || 'Không thể lưu thay đổi.'); setSavingEdit(false); return; }
      setEditingId(null);
      await load(page);
    } catch { setEditError('Lỗi kết nối. Vui lòng thử lại.'); }
    setSavingEdit(false);
  };

  if (loading && complaints.length === 0) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const catInfo = CATEGORY_MAP[editForm.category] || null;

  return (
    <>
      <div className="flex flex-col gap-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-headline-md text-headline-md text-on-surface">Khiếu nại của tôi</h2>
            <p className="font-body-md text-body-md text-on-surface-variant mt-xs">
              Theo dõi trạng thái các khiếu nại bạn đã gửi.
            </p>
          </div>
          {total > 0 && (
            <span className="px-3 py-1 rounded-full bg-error-container text-on-error-container font-label-md text-label-md">
              {total} khiếu nại
            </span>
          )}
        </div>

        {complaints.length === 0 ? (
          <div className="bg-surface-container-low rounded-xl p-12 text-center border border-outline-variant/20">
            <span className="material-symbols-outlined text-[64px] text-on-surface-variant/30 block mb-4">assignment_late</span>
            <p className="font-body-lg text-body-lg text-on-surface-variant">Bạn chưa có khiếu nại nào.</p>
            <p className="font-body-md text-body-md text-on-surface-variant/70 mt-xs">
              Khi có vấn đề với khóa học, nhấn nút "Khiếu nại" tại trang chi tiết khóa học.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-sm">
            {complaints.map(c => {
              const st = STATUS_CONFIG[c.status] || { label: c.status, color: '#6b7280', bg: '#f3f4f6', icon: 'info' };
              const needsReply = c.status === 'waiting_student';
              const isPending  = c.status === 'pending';
              const isEditing  = editingId === c.id;
              const isConfirmingDelete = confirmDeleteId === c.id;

              return (
                <div key={c.id} className={`bg-surface rounded-xl border transition-all duration-200 ${needsReply ? 'border-primary/40 bg-primary/5 shadow-sm' : 'border-outline-variant/20'}`}>

                  {/* Card header */}
                  <div className="p-md">
                    {/* Top row: ticket # + status */}
                    <div className="flex items-center justify-between gap-sm mb-sm flex-wrap">
                      <div className="flex items-center gap-sm">
                        <span className="font-mono font-bold text-sm text-on-surface">CPL-{c.ticket_number}</span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold" style={{ color: st.color, background: st.bg }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 12, fontVariationSettings: "'FILL' 1" }}>{st.icon}</span>
                          {st.label}
                        </span>
                        {needsReply && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-primary text-on-primary animate-pulse">Cần phản hồi</span>
                        )}
                      </div>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        {new Date(c.created_at).toLocaleDateString('vi-VN')}
                      </span>
                    </div>

                    {/* Title */}
                    <p className="font-semibold text-sm text-on-surface mb-sm">{c.title}</p>

                    {/* Meta row */}
                    <div className="flex items-center gap-md mb-sm flex-wrap text-xs text-on-surface-variant">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>school</span>
                        <span className="truncate max-w-[160px]">{c.course_title}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>label</span>
                        {CATEGORY_LABELS[c.category] || c.category}
                      </span>
                      {c.resolution_request && (
                        <span className="flex items-center gap-1 font-semibold text-primary">
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>flag</span>
                          {RESOLUTION_LABELS[c.resolution_request] || c.resolution_request}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>manage_accounts</span>
                        {c.admin_name ? c.admin_name : <span className="italic text-on-surface-variant/60">Chưa phân công</span>}
                      </span>
                    </div>

                    {/* Admin response preview */}
                    {c.admin_response && (
                      <div className="bg-surface-container-low border border-outline-variant/20 rounded-lg px-3 py-2 mb-sm">
                        <p className="text-xs font-semibold text-on-surface-variant mb-0.5 flex items-center gap-1">
                          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>support_agent</span>
                          Phản hồi từ Admin
                        </p>
                        <p className="text-sm text-on-surface line-clamp-2">{c.admin_response}</p>
                      </div>
                    )}

                    {/* Actions row */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        {isPending && !isEditing && !isConfirmingDelete && (
                          <>
                            <button
                              onClick={() => { openEdit(c); setConfirmDeleteId(null); }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-outline-variant text-on-surface text-xs font-semibold hover:bg-surface-container transition-colors"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>edit</span>
                              Chỉnh sửa
                            </button>
                            <button
                              onClick={() => { setConfirmDeleteId(c.id); setDeleteError(''); setEditingId(null); }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 transition-colors"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>delete</span>
                              Xoá
                            </button>
                          </>
                        )}
                      </div>
                      {!isEditing && !isConfirmingDelete && (
                        <button
                          onClick={() => setSelectedId(c.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:opacity-90 transition-opacity"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>open_in_full</span>
                          Xem chi tiết
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ── Confirm Delete ── */}
                  {isConfirmingDelete && (
                    <div className="border-t border-red-100 bg-red-50 px-md py-4 rounded-b-xl">
                      <p className="text-sm font-semibold text-red-700 mb-1 flex items-center gap-1.5">
                        <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>warning</span>
                        Xác nhận xoá khiếu nại CPL-{c.ticket_number}?
                      </p>
                      <p className="text-xs text-red-600 mb-3">Hành động này không thể hoàn tác. Khiếu nại và toàn bộ tệp đính kèm sẽ bị xoá vĩnh viễn.</p>
                      {deleteError && (
                        <p className="text-xs text-red-700 bg-red-100 border border-red-200 rounded-lg px-3 py-2 mb-3">{deleteError}</p>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={handleDelete}
                          disabled={deleting}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 disabled:opacity-50 transition-colors"
                        >
                          {deleting
                            ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />Đang xoá...</>
                            : <><span className="material-symbols-outlined" style={{ fontSize: 14 }}>delete_forever</span>Xoá ngay</>
                          }
                        </button>
                        <button
                          onClick={() => { setConfirmDeleteId(null); setDeleteError(''); }}
                          disabled={deleting}
                          className="px-4 py-2 rounded-lg border border-outline-variant text-on-surface text-xs font-semibold hover:bg-surface-container transition-colors disabled:opacity-50"
                        >
                          Huỷ
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── Inline Edit Form ── */}
                  {isEditing && (
                    <div className="border-t border-outline-variant/30 bg-surface-container-low px-md py-5 rounded-b-xl space-y-4">
                      <p className="text-sm font-bold text-on-surface flex items-center gap-1.5">
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit_note</span>
                        Chỉnh sửa khiếu nại
                      </p>

                      {editError && (
                        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-start gap-2">
                          <span className="material-symbols-outlined text-red-500 shrink-0 mt-px" style={{ fontSize: 16 }}>error</span>
                          <span>{editError}</span>
                        </div>
                      )}

                      {/* Tiêu đề */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold text-on-surface">Tiêu đề <span className="text-red-500">*</span></label>
                          <span className="text-xs text-on-surface-variant">{editForm.title.length}/200</span>
                        </div>
                        <input
                          value={editForm.title}
                          onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                          maxLength={200}
                          className="w-full px-3 py-2 border border-outline-variant rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-surface"
                        />
                      </div>

                      {/* Danh mục */}
                      <div>
                        <label className="block text-xs font-semibold text-on-surface mb-1.5">Danh mục <span className="text-red-500">*</span></label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {CATEGORIES.map(cat => (
                            <button
                              key={cat.value}
                              type="button"
                              onClick={() => setEditForm(f => ({ ...f, category: cat.value, reason: '', customReason: '' }))}
                              className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-left transition-all text-xs ${
                                editForm.category === cat.value
                                  ? 'border-primary bg-primary/10 text-primary font-semibold'
                                  : 'border-outline-variant text-on-surface-variant hover:border-primary/40'
                              }`}
                            >
                              <span className="material-symbols-outlined shrink-0" style={{ fontSize: 15, fontVariationSettings: editForm.category === cat.value ? "'FILL' 1" : "'FILL' 0" }}>{cat.icon}</span>
                              <span className="leading-tight">{cat.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Lý do */}
                      {editForm.category && (
                        <div>
                          <label className="block text-xs font-semibold text-on-surface mb-1.5">Lý do cụ thể <span className="text-red-500">*</span></label>
                          {editForm.category === 'other' ? (
                            <input
                              value={editForm.customReason}
                              onChange={e => setEditForm(f => ({ ...f, customReason: e.target.value }))}
                              placeholder="Nhập lý do cụ thể..."
                              maxLength={300}
                              className="w-full px-3 py-2 border border-outline-variant rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-surface"
                            />
                          ) : (
                            <div className="space-y-1.5">
                              {(CATEGORY_MAP[editForm.category]?.reasons || []).map(r => (
                                <label key={r} className={`flex items-center gap-3 px-3 py-2 rounded-xl border cursor-pointer transition-all text-sm ${
                                  editForm.reason === r ? 'border-primary bg-primary/5' : 'border-outline-variant hover:border-primary/40'
                                }`}>
                                  <input type="radio" name="edit-reason" value={r} checked={editForm.reason === r} onChange={() => setEditForm(f => ({ ...f, reason: r }))} className="accent-primary shrink-0" />
                                  <span className="text-on-surface">{r}</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Mong muốn của học viên — giá trị cố định, không phải lựa chọn */}
                      <div>
                        <label className="block text-xs font-semibold text-on-surface mb-1.5">Mong muốn của học viên</label>
                        <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-primary bg-primary/10 text-primary font-semibold text-xs">
                          <span className="material-symbols-outlined shrink-0 text-green-500" style={{ fontSize: 10, fontVariationSettings: "'FILL' 1" }}>circle</span>
                          Yêu cầu hoàn tiền
                        </div>
                      </div>

                      {/* Mô tả */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold text-on-surface">
                            Mô tả chi tiết
                            {editForm.category === 'other'
                              ? <span className="text-red-500"> *</span>
                              : <span className="text-on-surface-variant font-normal ml-1">(không bắt buộc)</span>}
                          </label>
                          <span className="text-xs text-on-surface-variant">{editForm.description.length}/2000</span>
                        </div>
                        <textarea
                          value={editForm.description}
                          onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                          placeholder={catInfo?.placeholder || 'Mô tả chi tiết vấn đề của bạn...'}
                          rows={3}
                          maxLength={2000}
                          className="w-full px-3 py-2 border border-outline-variant rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none transition-all bg-surface"
                        />
                      </div>

                      {/* Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={handleEditSave}
                          disabled={savingEdit}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
                        >
                          {savingEdit
                            ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />Đang lưu...</>
                            : <><span className="material-symbols-outlined" style={{ fontSize: 14 }}>save</span>Lưu thay đổi</>
                          }
                        </button>
                        <button
                          onClick={() => { setEditingId(null); setEditError(''); }}
                          disabled={savingEdit}
                          className="px-4 py-2 rounded-xl border border-outline-variant text-on-surface text-xs font-semibold hover:bg-surface-container transition-colors disabled:opacity-50"
                        >
                          Huỷ
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-sm">
            <button onClick={() => load(page - 1)} disabled={page <= 1}
              className="px-md py-sm rounded-lg border border-outline-variant text-on-surface disabled:opacity-40 hover:bg-surface-container transition-colors font-label-md text-label-md">
              Trước
            </button>
            <span className="font-body-md text-body-md text-on-surface-variant">Trang {page} / {totalPages}</span>
            <button onClick={() => load(page + 1)} disabled={page >= totalPages}
              className="px-md py-sm rounded-lg border border-outline-variant text-on-surface disabled:opacity-40 hover:bg-surface-container transition-colors font-label-md text-label-md">
              Tiếp
            </button>
          </div>
        )}
      </div>

      <ComplaintModal
        isOpen={!!selectedId}
        onClose={() => { setSelectedId(null); load(page); }}
        complaintId={selectedId}
        token={token}
      />
    </>
  );
}
