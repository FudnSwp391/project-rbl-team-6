import { useState, useEffect } from 'react';

const METRICS = [
  { key: 'score_attendance', label: 'Chuyên cần', icon: 'how_to_reg' },
  { key: 'score_attitude', label: 'Thái độ học tập', icon: 'sentiment_satisfied' },
  { key: 'score_comprehension', label: 'Mức tiếp thu bài', icon: 'psychology' },
  { key: 'score_focus', label: 'Độ tập trung', icon: 'center_focus_strong' },
  { key: 'score_homework', label: 'Bài tập về nhà', icon: 'assignment_turned_in' }
];

export default function StudentEvaluationReportModal({ isOpen, onClose, booking, token, API_BASE }) {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState('');

  const fetchReport = async () => {
    if (!booking || !booking.id) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/bookings/${booking.id}/tutor-evaluation`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gia sư chưa tạo báo cáo cho buổi học này.');
      setReportData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && booking) {
      fetchReport();
    }
  }, [isOpen, booking]);

  if (!isOpen || !booking) return null;

  const evaluation = reportData?.evaluation;
  const tutorName = reportData?.booking?.tutor_name || booking.tutor_name || 'Gia sư';
  const studentName = reportData?.booking?.student_name || booking.student_name || 'Học sinh';

  // Calculate average rating score
  let totalScore = 0;
  let scoreCount = 0;
  if (evaluation) {
    METRICS.forEach(m => {
      if (evaluation[m.key]) {
        totalScore += Number(evaluation[m.key]);
        scoreCount++;
      }
    });
  }
  const avgScore = scoreCount > 0 ? (totalScore / scoreCount).toFixed(1) : 0;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div 
        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative border border-gray-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/60 via-blue-50/40 to-white">
          <div>
            <div className="flex items-center gap-2 text-[#00288e] text-xs font-bold uppercase tracking-wider mb-0.5">
              <span className="material-symbols-outlined text-[18px]">analytics</span>
              Báo Cáo Đánh Giá Buổi Học Của Gia Sư
            </div>
            <h3 className="text-base font-bold text-gray-900 leading-tight">
              {booking.subject || 'Buổi học'} với Gia sư {tutorName}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Học sinh: <strong>{studentName}</strong> | Ngày: {booking.lesson_date ? new Date(booking.lesson_date).toLocaleDateString('vi-VN') : 'Vừa qua'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-3 border-[#00288e]/30 border-t-[#00288e] rounded-full animate-spin" />
              <p className="text-xs font-semibold text-gray-500">Đang tải báo cáo nhận xét của gia sư...</p>
            </div>
          ) : error ? (
            <div className="py-10 text-center space-y-3">
              <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-[32px]">info</span>
              </div>
              <p className="text-sm font-semibold text-gray-700">{error}</p>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-[#00288e] text-white text-xs font-bold hover:bg-[#001d6e] transition-colors"
              >
                Đóng
              </button>
            </div>
          ) : evaluation ? (
            <>
              {/* Overall Score Badge */}
              <div className="bg-gradient-to-br from-[#00288e] to-indigo-900 rounded-2xl p-4 text-white flex items-center justify-between shadow-md">
                <div>
                  <p className="text-xs font-medium text-blue-200 uppercase tracking-wider mb-1">
                    Đánh giá trung bình buổi học
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black">{avgScore}</span>
                    <span className="text-sm font-semibold text-blue-200">/ 5.0</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <span
                      key={star}
                      className="material-symbols-outlined text-[24px]"
                      style={{
                        color: star <= Math.round(Number(avgScore)) ? '#FFB800' : '#4B5563',
                        fontVariationSettings: star <= Math.round(Number(avgScore)) ? "'FILL' 1" : "'FILL' 0"
                      }}
                    >
                      star
                    </span>
                  ))}
                </div>
              </div>

              {/* 5 Core Metrics Bars */}
              <div className="space-y-3 bg-gray-50/80 p-4 rounded-2xl border border-gray-100">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Bảng điểm 5 tiêu chí giảng dạy:
                </h4>
                {METRICS.map(m => {
                  const score = Number(evaluation[m.key] || 0);
                  const pct = (score / 5) * 100;
                  return (
                    <div key={m.key} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-gray-800 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px] text-[#00288e]">{m.icon}</span>
                          {m.label}
                        </span>
                        <span className="font-bold text-gray-900">{score > 0 ? `${score}/5 ★` : 'Chưa chấm'}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div 
                          className="h-2 rounded-full transition-all duration-500 bg-[#00288e]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Detailed Comments */}
              {evaluation.comments && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
                    📝 Nhận xét chi tiết của Gia sư:
                  </label>
                  <div className="bg-white p-3.5 rounded-2xl border border-gray-200 text-xs text-gray-800 leading-relaxed shadow-sm">
                    {evaluation.comments}
                  </div>
                </div>
              )}

              {/* Parent Recommendation */}
              {evaluation.parent_recommendation && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-emerald-600">lightbulb</span>
                    Lời khuyên dành riêng cho Phụ huynh:
                  </label>
                  <div className="bg-emerald-50/80 p-3.5 rounded-2xl border border-emerald-200 text-xs text-emerald-900 leading-relaxed font-medium shadow-sm">
                    {evaluation.parent_recommendation}
                  </div>
                </div>
              )}
            </>
          ) : null}

          {/* Actions */}
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-[#00288e] text-white text-xs font-bold hover:bg-[#001d6e] transition-colors shadow-sm"
            >
              Đóng Báo Cáo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
