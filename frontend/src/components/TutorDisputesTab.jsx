import React, { useState, useEffect } from 'react';
import { getTutorDisputes, submitTutorDisputeAppeal } from '../services/api';

export default function TutorDisputesTab() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [appealModal, setAppealModal] = useState(null);
  const [appealReason, setAppealReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchDisputes = async () => {
    setLoading(true);
    try {
      const data = await getTutorDisputes();
      setDisputes(data);
    } catch (e) {
      console.error('Error fetching disputes', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputes();
  }, []);

  const handleAppealSubmit = async () => {
    if (!appealReason.trim()) {
      alert('Vui lòng nhập lý do kháng cáo.');
      return;
    }
    setSubmitting(true);
    try {
      await submitTutorDisputeAppeal(appealModal.id, { reason: appealReason });
      alert('Đã gửi kháng cáo thành công.');
      setAppealModal(null);
      fetchDisputes();
    } catch (e) {
      alert(e.message || 'Lỗi gửi kháng cáo.');
    } finally {
      setSubmitting(false);
    }
  };

  const isEligibleForAppeal = (d) => {
    if (!d.status.startsWith('RESOLVED_')) return false;
    if (d.tutor_appeal_status) return false;
    const resolvedAt = new Date(d.resolved_at);
    const now = new Date();
    const diffDays = (now - resolvedAt) / (1000 * 60 * 60 * 24);
    return diffDays <= 7;
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Đang tải...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Khiếu Nại & Tranh Chấp</h2>
      
      {disputes.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-2xl shadow-sm border border-gray-100 text-gray-500">
          <span className="material-symbols-outlined text-4xl mb-2 text-gray-300">gavel</span>
          <p>Chưa có khiếu nại nào liên quan đến bạn.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {disputes.map(d => {
            const canAppeal = isEligibleForAppeal(d);
            const isAppealed = !!d.tutor_appeal_status;
            return (
              <div key={d.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-xs font-bold px-2 py-1 bg-red-100 text-red-700 rounded mb-2 inline-block">
                      {d.target_type === 'booking' ? 'Lớp học' : 'Khóa học'}
                    </span>
                    <h3 className="font-bold text-gray-800 text-lg">
                      {d.course_title || 'Khóa học không rõ'}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      <span className="font-medium text-gray-700">Học viên:</span> {d.student_name}
                    </p>
                    <p className="text-sm text-gray-500">
                      <span className="font-medium text-gray-700">Lý do khiếu nại:</span> {d.reason}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400 mb-1">Trạng thái: {d.status}</p>
                    {d.reputation_points_deducted > 0 && (
                      <p className="text-sm font-bold text-red-600">
                        Bị trừ {d.reputation_points_deducted} uy tín
                      </p>
                    )}
                  </div>
                </div>

                {d.status.startsWith('RESOLVED_') && (
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mt-4">
                    <p className="text-sm"><span className="font-bold text-gray-700">Quyết định Admin:</span> {d.admin_note}</p>
                    <p className="text-xs text-gray-500 mt-1">Xử lý lúc: {new Date(d.resolved_at).toLocaleString('vi-VN')}</p>
                  </div>
                )}

                {isAppealed && (
                  <div className={`mt-4 p-4 rounded-xl border ${d.tutor_appeal_status === 'APPROVED' ? 'bg-green-50 border-green-200' : d.tutor_appeal_status === 'REJECTED' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
                    <p className="text-sm font-bold mb-1">
                      Trạng thái kháng cáo: {d.tutor_appeal_status}
                    </p>
                    <p className="text-sm"><span className="font-medium text-gray-700">Lý do của bạn:</span> {d.tutor_appeal_reason}</p>
                    {d.tutor_appeal_response && (
                      <p className="text-sm mt-2"><span className="font-bold text-gray-700">Admin phản hồi:</span> {d.tutor_appeal_response}</p>
                    )}
                    {d.tutor_appeal_status === 'APPROVED' && d.reputation_points_deducted > 0 && (
                      <p className="text-sm font-bold text-green-700 mt-2">
                        Đã hoàn lại +{d.reputation_points_deducted} uy tín.
                      </p>
                    )}
                  </div>
                )}

                {canAppeal && (
                  <div className="mt-4 text-right">
                    <button 
                      onClick={() => { setAppealModal(d); setAppealReason(''); }}
                      className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90"
                    >
                      Kháng Cáo
                    </button>
                    <p className="text-xs text-orange-500 mt-2">
                      Bạn có 7 ngày để gửi kháng cáo kể từ ngày Admin xử lý.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {appealModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-gray-50">
              <div>
                <h3 className="font-bold text-xl text-gray-800">Gửi Kháng Cáo</h3>
                <p className="text-sm text-gray-500 mt-1">Yêu cầu xem xét lại quyết định xử lý khiếu nại</p>
              </div>
              <button onClick={() => setAppealModal(null)} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {/* Thông tin khiếu nại */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-[18px] text-gray-400">tag</span>
                    <div><span className="text-gray-500">Khiếu nại:</span> <span className="font-semibold text-gray-800">#{appealModal.id.substring(0,8)}</span></div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-[18px] text-gray-400">person</span>
                    <div><span className="text-gray-500">Học sinh:</span> <span className="font-semibold text-gray-800">{appealModal.student_name}</span></div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-[18px] text-gray-400">school</span>
                    <div><span className="text-gray-500">Khóa học:</span> <span className="font-semibold text-gray-800">{appealModal.course_title}</span></div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-[18px] text-gray-400">gavel</span>
                    <div><span className="text-gray-500">Quyết định:</span> <span className="font-semibold text-gray-800">{appealModal.admin_note}</span></div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-[18px] text-red-400">trending_down</span>
                    <div><span className="text-gray-500">Điểm uy tín:</span> <span className="font-bold text-red-600">-{appealModal.reputation_points_deducted || 0} điểm</span></div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-[18px] text-orange-400">timer</span>
                    <div><span className="text-gray-500">Thời hạn:</span> <span className="font-semibold text-orange-600">Còn {Math.max(0, 7 - Math.floor((new Date() - new Date(appealModal.resolved_at)) / (1000 * 60 * 60 * 24)))} ngày</span></div>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">Lý do kháng cáo *</label>
                <textarea
                  className="w-full border border-gray-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-h-[140px] text-sm leading-relaxed"
                  placeholder="Vui lòng trình bày rõ lý do bạn không đồng ý với quyết định xử lý khiếu nại. Bạn có thể cung cấp các tình tiết, thông tin hoặc bằng chứng liên quan để Admin xem xét lại..."
                  value={appealReason}
                  onChange={e => setAppealReason(e.target.value)}
                ></textarea>
                <p className="text-xs text-gray-500 mt-2 flex items-start gap-1">
                  <span>💡</span>
                  <span>Hãy cung cấp thông tin cụ thể và bằng chứng liên quan để tăng tính thuyết phục cho kháng cáo.</span>
                </p>
              </div>

              <div className="bg-orange-50/50 border border-orange-100 text-orange-800 px-4 py-3 rounded-xl text-xs flex items-start gap-2 mt-6">
                <span className="material-symbols-outlined text-[16px] mt-0.5 text-orange-500">info</span>
                <p><strong>Lưu ý:</strong> Bạn chỉ có thể gửi kháng cáo một lần cho mỗi khiếu nại. Vui lòng kiểm tra kỹ nội dung trước khi gửi.</p>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end space-x-3">
              <button 
                onClick={() => setAppealModal(null)}
                className="px-6 py-2.5 rounded-xl text-gray-600 font-bold hover:bg-gray-200 transition-colors"
                disabled={submitting}
              >
                Hủy
              </button>
              <button 
                onClick={handleAppealSubmit}
                disabled={submitting || !appealReason.trim()}
                className="px-6 py-2.5 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {submitting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>}
                {submitting ? 'Đang gửi...' : 'Gửi Kháng Cáo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
