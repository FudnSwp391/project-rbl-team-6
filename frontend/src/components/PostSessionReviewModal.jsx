import React, { useState } from 'react';
import { API_BASE_URL } from '../config';

const CRITERIA = [
  { key: 'score_attendance',    label: 'Chuyên cần & Đúng giờ',   icon: '⏱️' },
  { key: 'score_attitude',      label: 'Thái độ học tập',         icon: '😊' },
  { key: 'score_comprehension', label: 'Khả năng tiếp thu',       icon: '🧠' },
  { key: 'score_focus',         label: 'Mức độ tập trung',        icon: '🎯' },
  { key: 'score_homework',      label: 'Hoàn thành bài tập',      icon: '📝' },
];

const PostSessionReviewModal = ({ booking, role, onClose }) => {
  const isStudent = role === 'student';
  const bookingId = booking?.id || booking?.booking_id;

  // Student states
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(5);

  // Resolution state: Student defaults to 'Satisfied', Tutor defaults to 'Evaluate'
  const [resolution, setResolution] = useState(isStudent ? 'Satisfied' : 'Evaluate');
  
  // Tutor evaluation scores (1 - 5)
  const [scores, setScores] = useState({
    score_attendance: 5,
    score_attitude: 5,
    score_comprehension: 5,
    score_focus: 5,
    score_homework: 5,
  });
  const [hoverScores, setHoverScores] = useState({});

  const [feedback, setFeedback] = useState('');
  const [comments, setComments] = useState('');
  const [parentRecommendation, setParentRecommendation] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

  const handleScoreChange = (key, val) => {
    setScores(prev => ({ ...prev, [key]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = getToken();

      if (resolution === 'Disputed') {
        const reasonText = isStudent ? feedback : (comments || feedback);
        if (!reasonText || !reasonText.trim()) {
          throw new Error('Vui lòng nhập chi tiết lý do khiếu nại / báo cáo.');
        }

        const res = await fetch(`${API_BASE_URL}/api/instant-booking/review-dispute`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            booking_id: bookingId,
            reason: reasonText.trim(),
            evidence_url: evidenceUrl ? evidenceUrl.trim() : null
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Không gửi được khiếu nại.');
      } 
      else if (!isStudent && resolution === 'Evaluate') {
        // Tutor evaluation submission
        if (!comments || !comments.trim()) {
          throw new Error('Vui lòng nhập nhận xét cho học sinh.');
        }

        const res = await fetch(`${API_BASE_URL}/api/tutor/session-evaluations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            booking_id: bookingId,
            score_attendance: Number(scores.score_attendance),
            score_attitude: Number(scores.score_attitude),
            score_comprehension: Number(scores.score_comprehension),
            score_focus: Number(scores.score_focus),
            score_homework: Number(scores.score_homework),
            comments: comments.trim(),
            parent_recommendation: parentRecommendation.trim() || null
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Không lưu được đánh giá buổi học.');
      } 
      else if (isStudent && booking?.tutor_id) {
        // Student evaluation submission
        try {
          await fetch(`${API_BASE_URL}/api/entity-reviews`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              target_type: 'tutor',
              target_id: booking.tutor_id,
              rating,
              comment: feedback ? feedback.trim() : null
            })
          });
        } catch (reviewErr) {
          console.warn('Could not submit tutor review:', reviewErr.message);
        }
      }

      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Đã Gửi Thành Công!</h2>
          <p className="text-gray-600 mb-6">
            {resolution === 'Disputed'
              ? 'Khiếu nại của bạn đã được gửi cho Admin xem xét.'
              : !isStudent
                ? 'Đánh giá & nhận xét của bạn đã được lưu và gửi tới Học sinh & Phụ huynh!'
                : 'Cảm ơn bạn đã đánh giá gia sư.'}
          </p>
          <button
            onClick={onClose}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition shadow-md"
          >
            Đóng
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden my-8">
        {/* Header */}
        <div className="bg-indigo-600 p-6 text-center text-white relative">
          <h2 className="text-2xl font-bold mb-1">Buổi Học Đã Kết Thúc!</h2>
          <p className="text-indigo-100 text-sm">
            {isStudent
              ? `Bạn đánh giá thế nào về Gia sư ${booking?.tutor_name || ''}?`
              : `Đánh giá & Nhận xét kết quả buổi học của ${booking?.student_name || 'Học sinh'}`}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* STUDENT RATING SECTION */}
          {isStudent && (
            <div className="flex justify-center space-x-2 py-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(rating)}
                  onClick={() => setRating(star)}
                  className="focus:outline-none transition-transform hover:scale-110"
                >
                  <svg
                    className={`w-10 h-10 ${star <= hoverRating ? 'text-yellow-400' : 'text-gray-300'}`}
                    fill="currentColor" viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </button>
              ))}
            </div>
          )}

          {/* RESOLUTION SELECTOR */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-700">
              {isStudent ? 'Xác Nhận & Khiếu Nại (nếu có):' : 'Lựa Chọn Thao Tác:'}
            </p>

            {isStudent ? (
              <>
                <label className={`flex p-3 border rounded-xl cursor-pointer transition ${resolution === 'Satisfied' ? 'bg-green-50 border-green-500 ring-1 ring-green-500' : 'hover:bg-gray-50'}`}>
                  <input type="radio" name="resolution" value="Satisfied" checked={resolution === 'Satisfied'} onChange={() => setResolution('Satisfied')} className="sr-only" />
                  <div className="flex items-center">
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center mr-3 ${resolution === 'Satisfied' ? 'border-green-500 bg-green-500' : 'border-gray-300'}`}>
                      {resolution === 'Satisfied' && <div className="w-2 h-2 bg-white rounded-full"></div>}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">Hài lòng / Hoàn thành tốt</p>
                      <p className="text-xs text-gray-500">Gửi đánh giá {rating} sao cho gia sư.</p>
                    </div>
                  </div>
                </label>

                <label className={`flex p-3 border rounded-xl cursor-pointer transition ${resolution === 'Feedback' ? 'bg-yellow-50 border-yellow-500 ring-1 ring-yellow-500' : 'hover:bg-gray-50'}`}>
                  <input type="radio" name="resolution" value="Feedback" checked={resolution === 'Feedback'} onChange={() => setResolution('Feedback')} className="sr-only" />
                  <div className="flex items-center">
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center mr-3 ${resolution === 'Feedback' ? 'border-yellow-500 bg-yellow-500' : 'border-gray-300'}`}>
                      {resolution === 'Feedback' && <div className="w-2 h-2 bg-white rounded-full"></div>}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">Hoàn thành nhưng có góp ý</p>
                      <p className="text-xs text-gray-500">Gửi đánh giá kèm nhận xét riêng cho gia sư.</p>
                    </div>
                  </div>
                </label>
              </>
            ) : (
              <>
                <label className={`flex p-3 border rounded-xl cursor-pointer transition ${resolution === 'Evaluate' ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500' : 'hover:bg-gray-50'}`}>
                  <input type="radio" name="resolution" value="Evaluate" checked={resolution === 'Evaluate'} onChange={() => setResolution('Evaluate')} className="sr-only" />
                  <div className="flex items-center">
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center mr-3 ${resolution === 'Evaluate' ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300'}`}>
                      {resolution === 'Evaluate' && <div className="w-2 h-2 bg-white rounded-full"></div>}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">Đánh giá & Gửi báo cáo Học sinh</p>
                      <p className="text-xs text-gray-500">Chấm 5 tiêu chí học tập & gửi lời khuyên trực tiếp tới Phụ huynh.</p>
                    </div>
                  </div>
                </label>
              </>
            )}

            <label className={`flex p-3 border rounded-xl cursor-pointer transition ${resolution === 'Disputed' ? 'bg-red-50 border-red-500 ring-1 ring-red-500' : 'hover:bg-gray-50'}`}>
              <input type="radio" name="resolution" value="Disputed" checked={resolution === 'Disputed'} onChange={() => setResolution('Disputed')} className="sr-only" />
              <div className="flex items-center">
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center mr-3 ${resolution === 'Disputed' ? 'border-red-500 bg-red-500' : 'border-gray-300'}`}>
                  {resolution === 'Disputed' && <div className="w-2 h-2 bg-white rounded-full"></div>}
                </div>
                <div>
                  <p className="font-bold text-gray-800">{isStudent ? 'Khiếu nại / Báo lỗi buổi học' : 'Báo cáo sự cố / Khiếu nại'}</p>
                  <p className="text-xs text-gray-500">Gửi bằng chứng khiếu nại tới Admin xem xét.</p>
                </div>
              </div>
            </label>
          </div>

          {/* TUTOR EVALUATION FORM (When resolution === 'Evaluate') */}
          {!isStudent && resolution === 'Evaluate' && (
            <div className="space-y-5 border-t pt-4 animate-fade-in">
              <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <span>📊</span> Chấm điểm tiêu chí buổi học:
              </p>

              <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                {CRITERIA.map(c => {
                  const currentScore = scores[c.key] || 5;
                  const activeHover = hoverScores[c.key] || 0;
                  return (
                    <div key={c.key} className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                        <span>{c.icon}</span> {c.label}
                      </span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(star => (
                          <button
                            key={star}
                            type="button"
                            onMouseEnter={() => setHoverScores(prev => ({ ...prev, [c.key]: star }))}
                            onMouseLeave={() => setHoverScores(prev => ({ ...prev, [c.key]: 0 }))}
                            onClick={() => handleScoreChange(c.key, star)}
                            className="p-0.5 focus:outline-none transition-transform hover:scale-110"
                          >
                            <svg
                              className={`w-6 h-6 ${star <= (activeHover || currentScore) ? 'text-yellow-400' : 'text-gray-300'}`}
                              fill="currentColor" viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          </button>
                        ))}
                        <span className="text-xs font-bold text-gray-600 w-7 text-right">
                          {currentScore}/5
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Nhận xét về học sinh trong buổi học <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={comments}
                  onChange={e => setComments(e.target.value)}
                  placeholder="Nhận xét chi tiết về mức độ hiểu bài, tinh thần học tập..."
                  className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none h-20"
                  required
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                  <span>👨‍👩‍👧</span> Lời khuyên &amp; Dặn dò gửi Phụ huynh (nếu có):
                </label>
                <textarea
                  value={parentRecommendation}
                  onChange={e => setParentRecommendation(e.target.value)}
                  placeholder="Gợi ý phương pháp hỗ trợ con ở nhà, nhắc nhở con làm bài tập..."
                  className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none h-20"
                ></textarea>
              </div>
            </div>
          )}

          {/* STUDENT FEEDBACK / DISPUTE TEXTAREA */}
          {(resolution === 'Feedback' || resolution === 'Disputed') && (
            <div className="space-y-3 animate-fade-in">
              <textarea
                value={isStudent ? feedback : comments}
                onChange={e => isStudent ? setFeedback(e.target.value) : setComments(e.target.value)}
                placeholder={resolution === 'Disputed' ? "Mô tả chi tiết lý do khiếu nại..." : "Góp ý nhẹ nhàng cho Gia sư..."}
                className="w-full border rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none h-24"
                required={resolution === 'Disputed'}
              ></textarea>

              {resolution === 'Disputed' && (
                <input
                  type="url"
                  value={evidenceUrl}
                  onChange={e => setEvidenceUrl(e.target.value)}
                  placeholder="Link hình ảnh bằng chứng (nếu có)"
                  className="w-full border rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl p-3 font-medium">
              {error}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition shadow-lg disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {loading ? 'Đang xử lý...' : 'Xác Nhận & Gửi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PostSessionReviewModal;
