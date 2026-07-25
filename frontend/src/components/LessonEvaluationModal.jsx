import { useState, useEffect } from 'react';

const POS_TAGS = [
  "🎯 Giảng bài dễ hiểu, trực quan",
  "💡 Kiến thức chuyên sâu, chuẩn xác",
  "⚡ Phương pháp dạy sáng tạo",
  "😊 Nhiệt tình & kiên nhẫn",
  "⏰ Đúng giờ, tác phong chuyên nghiệp",
  "🗣️ Tương tác & truyền cảm hứng",
  "📚 Tài liệu học tập chất lượng"
];

const IMP_TAGS = [
  "⏳ Cần quản lý thời gian tốt hơn",
  "📢 Tín hiệu âm thanh / Kết nối chưa ổn",
  "🐢 Tốc độ giảng chưa phù hợp",
  "💬 Thiếu tương tác trong buổi học",
  "📝 Cần chuẩn bị bài tập vừa sức hơn"
];

const COMPREHENSION_OPTIONS = [
  { val: 100, label: '100% - Hiểu bài sâu', desc: 'Tự tin làm bài ngay' },
  { val: 75, label: '75% - Nắm phần lớn', desc: 'Nắm chắc phần cốt lõi' },
  { val: 50, label: '50% - Mức căn bản', desc: 'Cần tự xem lại bài' },
  { val: 25, label: '25% - Còn khó hiểu', desc: 'Cần gia sư hỗ trợ lại' }
];

export default function LessonEvaluationModal({ isOpen, onClose, booking, onSuccess, token, API_BASE }) {
  const [ratingScore, setRatingScore] = useState(5);
  const [selectedPosTags, setSelectedPosTags] = useState([]);
  const [selectedImpTags, setSelectedImpTags] = useState([]);
  const [comprehensionRate, setComprehensionRate] = useState(100);
  const [privateFeedback, setPrivateFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setRatingScore(5);
      setSelectedPosTags([]);
      setSelectedImpTags([]);
      setComprehensionRate(100);
      setPrivateFeedback('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen || !booking) return null;

  const togglePosTag = (tag) => {
    setSelectedPosTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const toggleImpTag = (tag) => {
    setSelectedImpTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/bookings/${booking.id}/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          rating_score: ratingScore,
          comprehension_rate: comprehensionRate,
          positive_tags: selectedPosTags,
          improvement_tags: selectedImpTags,
          private_feedback: privateFeedback
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Lỗi khi gửi đánh giá chất lượng.');
      }
      if (onSuccess) onSuccess(booking.id, data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div 
        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative border border-gray-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50/50 via-indigo-50/30 to-white">
          <div>
            <div className="flex items-center gap-2 text-[#00288e] text-xs font-bold uppercase tracking-wider mb-0.5">
              <span className="material-symbols-outlined text-[18px]">verified</span>
              Đánh giá chất lượng ngầm buổi học
            </div>
            <h3 className="text-lg font-bold text-gray-900 leading-tight">
              {booking.subject || 'Buổi học'} với Gia sư {booking.tutor_name || 'Gia sư'}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Ngày học: {booking.lesson_date ? new Date(booking.lesson_date).toLocaleDateString('vi-VN') : 'Gần đây'} ({booking.time_slot})
            </p>
          </div>
          <button 
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Note Chú thích ngầm */}
          <div className="bg-blue-50/80 rounded-2xl p-3.5 border border-blue-100 flex items-start gap-3 text-xs text-blue-900">
            <span className="material-symbols-outlined text-blue-600 text-[20px] shrink-0 mt-0.5">lock</span>
            <p className="leading-relaxed">
              Ý kiến của bạn là <strong>đánh giá chất lượng ngầm cho Hệ thống</strong>. Dữ liệu này giúp tự động kiểm soát chất lượng giảng dạy và điều chỉnh điểm uy tín gia sư mà không hiển thị công khai tên bạn.
            </p>
          </div>

          {/* 1. Đánh giá sao */}
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-2">
              1. Bạn đánh giá tổng quan chất lượng buổi học thế nào?
            </label>
            <div className="flex items-center justify-center gap-2 bg-gray-50 p-4 rounded-2xl border border-gray-100">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRatingScore(star)}
                  className="p-1 transition-transform hover:scale-110 focus:outline-none"
                >
                  <span 
                    className="material-symbols-outlined text-[36px] transition-colors"
                    style={{
                      color: star <= ratingScore ? '#FFB800' : '#D1D5DB',
                      fontVariationSettings: star <= ratingScore ? "'FILL' 1" : "'FILL' 0"
                    }}
                  >
                    star
                  </span>
                </button>
              ))}
            </div>
            <p className="text-center text-xs font-semibold text-gray-600 mt-2">
              {ratingScore === 5 && '🌟 Rất hài lòng - Xuất sắc!'}
              {ratingScore === 4 && '👍 Hài lòng - Đạt yêu cầu!'}
              {ratingScore === 3 && '😐 Tạm ổn - Cần cải thiện'}
              {ratingScore === 2 && '👎 Chưa hài lòng'}
              {ratingScore === 1 && '🚨 Rất kém - Không hài lòng'}
            </p>
          </div>

          {/* 2. Thẻ tiêu chí tích cực */}
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-2">
              2. Điểm mạnh nổi bật của Gia sư trong buổi học (Chọn thẻ):
            </label>
            <div className="flex flex-wrap gap-2">
              {POS_TAGS.map((tag, idx) => {
                const selected = selectedPosTags.includes(tag);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => togglePosTag(tag)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                      selected 
                        ? 'bg-[#00288e] text-white border-[#00288e] shadow-md shadow-blue-900/10' 
                        : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Thẻ góp ý cải thiện (hiện khi rating <= 3) */}
          {ratingScore <= 3 && (
            <div className="animate-fade-in">
              <label className="block text-sm font-bold text-rose-800 mb-2">
                3. Điểm Gia sư cần cải thiện ngầm cho các buổi sau:
              </label>
              <div className="flex flex-wrap gap-2">
                {IMP_TAGS.map((tag, idx) => {
                  const selected = selectedImpTags.includes(tag);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleImpTag(tag)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                        selected 
                          ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-900/10' 
                          : 'bg-rose-50/50 text-rose-700 border-rose-200 hover:bg-rose-100'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. Mức độ tiếp thu bài */}
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-2">
              4. Mức độ bạn tự tin tiếp thu bài sau buổi học:
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {COMPREHENSION_OPTIONS.map(opt => {
                const active = comprehensionRate === opt.val;
                return (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setComprehensionRate(opt.val)}
                    className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                      active
                        ? 'border-[#00288e] bg-[#eef4ff] shadow-sm'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-bold ${active ? 'text-[#00288e]' : 'text-gray-800'}`}>
                        {opt.label}
                      </span>
                      <input 
                        type="radio" 
                        name="comprehension" 
                        checked={active} 
                        onChange={() => setComprehensionRate(opt.val)} 
                        className="accent-[#00288e] w-3.5 h-3.5"
                      />
                    </div>
                    <span className="text-[11px] text-gray-500">{opt.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. Góp ý riêng */}
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1.5">
              5. Nhận xét chi tiết ngầm cho Ban Quản Lý EduX (Không bắt buộc):
            </label>
            <textarea
              rows={3}
              value={privateFeedback}
              onChange={e => setPrivateFeedback(e.target.value)}
              placeholder="Nhập ý kiến riêng của bạn về phương pháp dạy, bài tập hoặc điều bạn muốn EduX hỗ trợ..."
              className="w-full p-3 rounded-2xl border border-gray-200 text-xs focus:ring-2 focus:ring-[#00288e] outline-none resize-none"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
              {error}
            </div>
          )}

          {/* Submit Action */}
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors text-sm"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 rounded-xl font-bold bg-[#00288e] text-white hover:bg-[#001d6e] disabled:opacity-50 transition-colors text-sm shadow-md shadow-blue-900/20 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang gửi...
                </>
              ) : (
                'Gửi Đánh Giá Ngầm'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
