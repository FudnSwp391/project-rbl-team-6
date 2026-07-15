import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { API_BASE_URL } from '../config';

const API_BASE = API_BASE_URL;

// ─── Status helpers ──────────────────────────────────────────────────────────
const STATUS_MAP = {
  pending: { label: 'Chờ xử lý', color: '#6B7280', bg: '#F3F4F6', icon: 'hourglass_top' },
  matching: { label: 'Đang tìm gia sư', color: '#3B82F6', bg: '#EFF6FF', icon: 'search' },
  waiting_tutor_response: { label: 'Chờ gia sư phản hồi', color: '#F59E0B', bg: '#FFFBEB', icon: 'schedule_send' },
  matched: { label: 'Đã tìm được gia sư', color: '#10B981', bg: '#ECFDF5', icon: 'check_circle' },
  closed: { label: 'Đã đóng', color: '#EF4444', bg: '#FEF2F2', icon: 'cancel' },
};

const MATCH_STATUS_MAP = {
  pending: { label: 'Chờ phản hồi', color: '#F59E0B', icon: 'hourglass_top' },
  tutor_accepted: { label: 'Đã chấp nhận', color: '#10B981', icon: 'check_circle' },
  tutor_rejected: { label: 'Đã từ chối', color: '#EF4444', icon: 'cancel' },
  cancelled: { label: 'Đã hủy', color: '#6B7280', icon: 'block' },
};

const SUBJECT_LABELS = {
  toan: 'Toán', ly: 'Vật Lý', hoa: 'Hóa Học', sinh: 'Sinh Học',
  van: 'Ngữ Văn', anh: 'Tiếng Anh', su: 'Lịch Sử', dia: 'Địa Lý',
  tin: 'Tin Học', gdcd: 'GDCD', math: 'Toán', english: 'Tiếng Anh',
  physics: 'Vật Lý', chemistry: 'Hóa Học',
};

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP.pending;
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: s.bg, color: s.color }}>
      <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
      {s.label}
    </span>
  );
}

function MatchStatusBadge({ status }) {
  const s = MATCH_STATUS_MAP[status] || MATCH_STATUS_MAP.pending;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ background: `${s.color}15`, color: s.color }}>
      <span className="material-symbols-outlined" style={{ fontSize: 13, fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
      {s.label}
    </span>
  );
}

// ─── Detail Modal ────────────────────────────────────────────────────────────
function RequestDetailModal({ requestId, onClose }) {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!requestId) return;
    setLoading(true);
    fetch(`${API_BASE}/api/my-tutor-requests/${requestId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(json => {
        if (json.success) setData(json.data);
        else setError(json.message);
      })
      .catch(() => setError('Lỗi kết nối'))
      .finally(() => setLoading(false));
  }, [requestId, token]);

  if (!requestId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <h2 className="text-lg font-bold text-[#191c1e] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00288e]" style={{ fontSize: 22 }}>assignment</span>
            Chi tiết yêu cầu
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
            <span className="material-symbols-outlined text-gray-500">close</span>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-3 border-[#00288e] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-500">{error}</div>
        ) : data ? (
          <div className="p-6 space-y-6">
            {/* Request info */}
            <div className="bg-[#f8f9fb] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[#191c1e]">
                  {SUBJECT_LABELS[data.request.subject] || data.request.subject || 'Chưa xác định'}
                  {data.request.grade_level ? ` - Lớp ${data.request.grade_level}` : ''}
                </span>
                <StatusBadge status={data.request.match_status} />
              </div>
              <p className="text-xs text-gray-500">
                Ngày tạo: {new Date(data.request.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
              {data.request.description && (
                <p className="text-sm text-gray-600 italic">"{data.request.description}"</p>
              )}
            </div>

            {/* Accepted Tutor Banner */}
            {data.acceptedTutor && (
              <div className="bg-gradient-to-r from-[#ecfdf5] to-[#d1fae5] border border-[#10B981]/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-[#10B981]" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>verified</span>
                  <span className="text-sm font-bold text-[#065f46]">Đã tìm được gia sư phù hợp!</span>
                </div>
                <div className="flex items-center gap-3">
                  {data.acceptedTutor.tutor_avatar ? (
                    <img src={data.acceptedTutor.tutor_avatar} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-white shadow" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[#00288e] flex items-center justify-center text-white font-bold text-lg shadow">
                      {(data.acceptedTutor.tutor_name || '?')[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-[#191c1e] text-sm">{data.acceptedTutor.tutor_name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {parseFloat(data.acceptedTutor.tutor_rating) > 0 && (
                        <span className="text-xs text-gray-500 flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[#F59E0B]" style={{ fontSize: 13, fontVariationSettings: "'FILL' 1" }}>star</span>
                          {parseFloat(data.acceptedTutor.tutor_rating).toFixed(1)}
                        </span>
                      )}
                      {data.acceptedTutor.experience_years > 0 && (
                        <span className="text-xs text-gray-500">{data.acceptedTutor.experience_years} năm KN</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => window.location.hash = `/tutor-detail/${data.acceptedTutor.tutor_id}`}
                    className="ml-auto px-3 py-1.5 bg-[#00288e] text-white rounded-lg text-xs font-semibold hover:bg-[#1e40af] transition-colors"
                  >
                    Xem hồ sơ
                  </button>
                </div>
              </div>
            )}

            {/* Waiting Banner */}
            {!data.acceptedTutor && data.request.match_status === 'waiting_tutor_response' && (
              <div className="bg-gradient-to-r from-[#fffbeb] to-[#fef3c7] border border-[#F59E0B]/20 rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#F59E0B]/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#F59E0B] animate-pulse" style={{ fontSize: 22 }}>schedule_send</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#92400e]">Đang chờ phản hồi từ gia sư</p>
                  <p className="text-xs text-[#a16207] mt-0.5">Bạn đã gửi yêu cầu, gia sư sẽ phản hồi sớm nhất có thể.</p>
                </div>
              </div>
            )}

            {/* Match List */}
            <div>
              <h3 className="text-sm font-bold text-[#191c1e] mb-3 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#00288e]" style={{ fontSize: 18 }}>people</span>
                Danh sách gia sư được gợi ý ({data.matches.length})
              </h3>
              {data.matches.length === 0 ? (
                <p className="text-sm text-gray-400 italic">Chưa có kết quả match.</p>
              ) : (
                <div className="space-y-2">
                  {data.matches.map(m => (
                    <div key={m.match_id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      m.status === 'tutor_accepted' 
                        ? 'bg-[#ecfdf5] border-[#10B981]/30' 
                        : 'bg-white border-gray-100 hover:border-gray-200'
                    }`}>
                      {/* Avatar */}
                      {m.tutor_avatar ? (
                        <img src={m.tutor_avatar} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#dde1ff] text-[#00288e] flex items-center justify-center font-bold text-sm shrink-0">
                          {(m.tutor_name || '?')[0].toUpperCase()}
                        </div>
                      )}
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-[#191c1e] truncate">{m.tutor_name}</span>
                          <MatchStatusBadge status={m.status} />
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                          <span>{m.match_score}% • {m.match_tier}</span>
                          {m.is_selected && <span className="text-[#00288e] font-medium">✓ Đã chọn</span>}
                        </div>
                      </div>
                      {/* Action */}
                      <button
                        onClick={() => window.location.hash = `/tutor-detail/${m.tutor_id}`}
                        className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors shrink-0"
                      >
                        Xem
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function MyTutorRequests() {
  const { token, user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  const fetchRequests = () => {
    if (!token) return;
    setLoading(true);
    fetch(`${API_BASE}/api/my-tutor-requests`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(json => {
        if (json.success) setRequests(json.data);
        else setError(json.message);
      })
      .catch(() => setError('Không thể kết nối đến máy chủ.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchRequests(); }, [token]);

  const handleCancel = async (requestId) => {
    if (!confirm('Bạn có chắc chắn muốn hủy yêu cầu này?')) return;
    setCancellingId(requestId);
    try {
      const res = await fetch(`${API_BASE}/api/tutor-requests/${requestId}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      const json = await res.json();
      if (json.success) {
        fetchRequests();
      } else {
        alert(json.message || 'Có lỗi xảy ra');
      }
    } catch {
      alert('Lỗi kết nối');
    } finally {
      setCancellingId(null);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fb]">
        <div className="text-center">
          <span className="material-symbols-outlined text-gray-300 mb-3 block" style={{ fontSize: 48 }}>lock</span>
          <p className="text-gray-500">Vui lòng đăng nhập để xem lịch sử tìm gia sư.</p>
          <button onClick={() => window.location.hash = '/signin'}
            className="mt-4 px-6 py-2 bg-[#00288e] text-white rounded-lg text-sm font-semibold hover:bg-[#1e40af] transition-colors">
            Đăng nhập
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#00288e] to-[#1e40af] text-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <button onClick={() => window.location.hash = '/dashboard'}
            className="flex items-center gap-1 text-white/70 hover:text-white text-sm mb-4 transition-colors">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
            Quay lại Dashboard
          </button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span className="material-symbols-outlined" style={{ fontSize: 28 }}>history</span>
            Lịch sử tìm gia sư
          </h1>
          <p className="text-white/70 text-sm mt-1">Theo dõi trạng thái các yêu cầu tìm gia sư của bạn</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-3 border-[#00288e] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-red-300 mb-3 block" style={{ fontSize: 48 }}>error</span>
            <p className="text-red-500">{error}</p>
            <button onClick={fetchRequests} className="mt-4 px-4 py-2 bg-[#00288e] text-white rounded-lg text-sm">Thử lại</button>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-20">
            <span className="material-symbols-outlined text-gray-200 mb-4 block" style={{ fontSize: 64 }}>school</span>
            <h3 className="text-lg font-semibold text-gray-500 mb-2">Chưa có yêu cầu tìm gia sư nào</h3>
            <p className="text-sm text-gray-400 mb-6">Hãy tạo yêu cầu đầu tiên để tìm gia sư phù hợp!</p>
            <button onClick={() => window.location.hash = '/tutor-request'}
              className="px-6 py-2.5 bg-[#00288e] text-white rounded-xl text-sm font-semibold hover:bg-[#1e40af] transition-colors shadow-md">
              <span className="material-symbols-outlined align-middle mr-1" style={{ fontSize: 18 }}>add</span>
              Tìm gia sư ngay
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map(req => (
              <div key={req.id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-4 cursor-pointer"
                onClick={() => setSelectedId(req.id)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-bold text-[#191c1e]">
                        {SUBJECT_LABELS[req.subject] || req.subject || 'Chưa xác định'}
                      </span>
                      {req.grade_level && (
                        <span className="px-2 py-0.5 bg-[#dde1ff] text-[#00288e] rounded text-[11px] font-semibold">
                          Lớp {req.grade_level}
                        </span>
                      )}
                      <StatusBadge status={req.match_status} />
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>calendar_today</span>
                        {new Date(req.created_at).toLocaleDateString('vi-VN')}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>people</span>
                        {req.matched_tutor_count || 0} gia sư gợi ý
                      </span>
                      {parseInt(req.selected_count) > 0 && (
                        <span className="flex items-center gap-1 text-[#00288e] font-medium">
                          <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>how_to_reg</span>
                          Đã chọn {req.selected_count}
                        </span>
                      )}
                      {parseInt(req.accepted_count) > 0 && (
                        <span className="flex items-center gap-1 text-[#10B981] font-medium">
                          <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                          {req.accepted_count} đã nhận
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {(req.match_status === 'pending' || req.match_status === 'matching' || req.match_status === 'waiting_tutor_response') && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCancel(req.id); }}
                        disabled={cancellingId === req.id}
                        className="px-3 py-1.5 text-xs font-medium text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        {cancellingId === req.id ? 'Đang hủy...' : 'Hủy'}
                      </button>
                    )}
                    <span className="material-symbols-outlined text-gray-300" style={{ fontSize: 20 }}>chevron_right</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        {requests.length > 0 && (
          <div className="mt-6 text-center">
            <button onClick={() => window.location.hash = '/tutor-request'}
              className="px-6 py-2.5 bg-[#00288e] text-white rounded-xl text-sm font-semibold hover:bg-[#1e40af] transition-colors shadow-md inline-flex items-center gap-1.5">
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
              Tạo yêu cầu mới
            </button>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <RequestDetailModal requestId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}
