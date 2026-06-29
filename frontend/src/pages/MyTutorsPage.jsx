import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const SUBJECT_LABELS = {
  toan: 'Toán', ly: 'Vật Lý', hoa: 'Hóa Học', sinh: 'Sinh Học',
  van: 'Ngữ Văn', anh: 'Tiếng Anh', su: 'Lịch Sử', dia: 'Địa Lý',
  tin: 'Tin Học', gdcd: 'GDCD', math: 'Toán', english: 'Tiếng Anh',
  physics: 'Vật Lý', chemistry: 'Hóa Học',
};

export default function MyTutorsPage() {
  const { token, user } = useAuth();
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch(`${API_BASE}/api/student/my-tutors`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(json => {
        if (json.success) setTutors(json.data);
        else setError(json.message);
      })
      .catch(() => setError('Không thể kết nối đến máy chủ.'))
      .finally(() => setLoading(false));
  }, [token]);

  // Thống kê đầu trang
  const stats = useMemo(() => {
    const total = tutors.length;
    const bySubject = {};
    tutors.forEach(t => {
      const subj = SUBJECT_LABELS[t.connected_subject] || t.connected_subject || 'Khác';
      bySubject[subj] = (bySubject[subj] || 0) + 1;
    });
    return { total, bySubject };
  }, [tutors]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fb]">
        <div className="text-center">
          <span className="material-symbols-outlined text-gray-300 mb-3 block" style={{ fontSize: 48 }}>lock</span>
          <p className="text-gray-500">Vui lòng đăng nhập để xem danh sách gia sư.</p>
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
        <div className="max-w-5xl mx-auto px-4 py-8">
          <button onClick={() => window.location.hash = '/dashboard'}
            className="flex items-center gap-1 text-white/70 hover:text-white text-sm mb-4 transition-colors">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
            Quay lại Dashboard
          </button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span className="material-symbols-outlined" style={{ fontSize: 28 }}>supervisor_account</span>
            Gia sư của tôi
          </h1>
          <p className="text-white/70 text-sm mt-1">Danh sách các gia sư bạn đã kết nối thành công</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-3 border-[#00288e] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-red-300 mb-3 block" style={{ fontSize: 48 }}>error</span>
            <p className="text-red-500">{error}</p>
            <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-[#00288e] text-white rounded-lg text-sm">Thử lại</button>
          </div>
        ) : tutors.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-gray-100">
            <span className="material-symbols-outlined text-gray-200 mb-4 block" style={{ fontSize: 64 }}>group_off</span>
            <h3 className="text-lg font-semibold text-gray-500 mb-2">Chưa có gia sư nào</h3>
            <p className="text-sm text-gray-400 mb-6">Bạn chưa kết nối thành công với gia sư nào qua hệ thống tìm kiếm.</p>
            <button onClick={() => window.location.hash = '/tutor-request'}
              className="px-6 py-2.5 bg-[#00288e] text-white rounded-xl text-sm font-semibold hover:bg-[#1e40af] transition-colors shadow-md">
              <span className="material-symbols-outlined align-middle mr-1" style={{ fontSize: 18 }}>search</span>
              Tìm gia sư ngay
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-wrap gap-6 items-center">
              <div className="flex items-center gap-3 pr-6 border-r border-gray-100">
                <div className="w-12 h-12 rounded-full bg-[#ecfdf5] flex items-center justify-center text-[#10b981]">
                  <span className="material-symbols-outlined" style={{ fontSize: 24 }}>group</span>
                </div>
                <div>
                  <div className="text-sm text-gray-500 font-medium">Tổng gia sư</div>
                  <div className="text-2xl font-bold text-[#191c1e]">{stats.total}</div>
                </div>
              </div>
              <div className="flex-1 flex flex-wrap gap-3">
                {Object.entries(stats.bySubject).map(([subj, count]) => (
                  <div key={subj} className="bg-[#f8f9fb] px-3 py-1.5 rounded-lg border border-gray-100 flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#191c1e]">{subj}</span>
                    <span className="text-xs bg-white px-2 py-0.5 rounded-full font-bold text-[#00288e] shadow-sm">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tutors.map(t => (
                <div key={t.match_id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4 mb-4">
                    {t.tutor_avatar ? (
                      <img src={t.tutor_avatar} alt="" className="w-14 h-14 rounded-full object-cover shrink-0 border border-gray-100" />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-[#dde1ff] text-[#00288e] flex items-center justify-center font-bold text-xl shrink-0">
                        {(t.tutor_name || '?')[0].toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-[#191c1e] text-base truncate">{t.tutor_name}</h3>
                      <div className="flex flex-wrap gap-2 mt-1.5 text-xs text-gray-500">
                        {parseFloat(t.tutor_rating) > 0 && (
                          <span className="flex items-center gap-0.5 bg-yellow-50 px-1.5 py-0.5 rounded text-yellow-700 font-medium border border-yellow-100">
                            <span className="material-symbols-outlined text-yellow-500" style={{ fontSize: 13, fontVariationSettings: "'FILL' 1" }}>star</span>
                            {parseFloat(t.tutor_rating).toFixed(1)}
                          </span>
                        )}
                        {t.experience_years > 0 && (
                          <span className="bg-blue-50 px-1.5 py-0.5 rounded text-blue-700 font-medium border border-blue-100">
                            {t.experience_years} năm KN
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#f8f9fb] rounded-lg p-3 space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Môn học:</span>
                      <span className="font-semibold text-[#191c1e]">
                        {SUBJECT_LABELS[t.connected_subject] || t.connected_subject}
                        {t.grade_level ? ` - Lớp ${t.grade_level}` : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Ngày kết nối:</span>
                      <span className="font-medium text-[#191c1e]">
                        {t.connected_at ? new Date(t.connected_at).toLocaleDateString('vi-VN') : '---'}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => window.location.hash = `/tutor-interaction/${t.tutor_id}`}
                      className="flex-1 py-2 bg-[#f0fdf4] border border-[#10b981] text-[#059669] rounded-lg text-sm font-semibold hover:bg-[#d1fae5] transition-colors flex items-center justify-center gap-1.5"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>manage_accounts</span>
                      Tương tác
                    </button>
                    <button
                      onClick={() => window.location.hash = `/tutor-detail/${t.tutor_id}`}
                      className="flex-1 py-2 bg-white border border-[#00288e] text-[#00288e] rounded-lg text-sm font-semibold hover:bg-[#00288e] hover:text-white transition-colors"
                    >
                      Hồ sơ
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
