import React, { useState } from 'react';
import { Star, X, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';

const TutorFeedbackModal = ({ isOpen, onClose, lessonData, onSubmit }) => {
  const [focusRating, setFocusRating] = useState(0);
  const [understandingLevel, setUnderstandingLevel] = useState('');
  const [homeworkStatus, setHomeworkStatus] = useState('');
  const [tutorNote, setTutorNote] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    onSubmit({
      focusRating,
      understandingLevel,
      homeworkStatus,
      tutorNote,
    });
  };

  const isSubmitDisabled = !focusRating || !understandingLevel || !homeworkStatus;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Đánh giá buổi học</h2>
            <p className="text-sm text-gray-500 mt-1">
              Học sinh: <span className="font-semibold text-gray-700">{lessonData?.studentName || 'Học sinh'}</span> • {lessonData?.datetime || 'Hôm nay'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6 flex-1 overflow-y-auto">
          {/* Mức độ tập trung */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mức độ tập trung <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setFocusRating(star)}
                  className={`p-1 transition-all ${
                    star <= focusRating ? 'text-yellow-400 scale-110' : 'text-gray-200 hover:text-yellow-200'
                  }`}
                >
                  <Star size={32} fill={star <= focusRating ? 'currentColor' : 'none'} strokeWidth={1.5} />
                </button>
              ))}
              <span className="ml-2 text-sm text-gray-500">
                {focusRating === 0 ? 'Chưa đánh giá' : `${focusRating}/5 sao`}
              </span>
            </div>
          </div>

          {/* Mức độ hiểu bài */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mức độ hiểu bài <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setUnderstandingLevel('Tốt')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                  understandingLevel === 'Tốt'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-100 bg-white text-gray-500 hover:border-green-200 hover:bg-green-50/50'
                }`}
              >
                <CheckCircle2 size={24} className="mb-1" />
                <span className="text-sm font-medium">Tốt</span>
              </button>
              <button
                type="button"
                onClick={() => setUnderstandingLevel('Tạm')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                  understandingLevel === 'Tạm'
                    ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                    : 'border-gray-100 bg-white text-gray-500 hover:border-yellow-200 hover:bg-yellow-50/50'
                }`}
              >
                <AlertCircle size={24} className="mb-1" />
                <span className="text-sm font-medium">Tạm</span>
              </button>
              <button
                type="button"
                onClick={() => setUnderstandingLevel('Kém')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                  understandingLevel === 'Kém'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-100 bg-white text-gray-500 hover:border-red-200 hover:bg-red-50/50'
                }`}
              >
                <XCircle size={24} className="mb-1" />
                <span className="text-sm font-medium">Kém</span>
              </button>
            </div>
          </div>

          {/* Bài tập về nhà */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bài tập về nhà <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {['Có', 'Làm một nửa', 'Không', 'Không có bài tập'].map((status) => (
                <label
                  key={status}
                  className={`flex items-center p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    homeworkStatus === status
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-100 bg-white hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="homeworkStatus"
                    value={status}
                    checked={homeworkStatus === status}
                    onChange={(e) => setHomeworkStatus(e.target.value)}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className={`ml-3 text-sm font-medium ${
                    homeworkStatus === status ? 'text-blue-700' : 'text-gray-700'
                  }`}>
                    {status}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Ghi chú */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Ghi chú (Tùy chọn)
              </label>
              <span className={`text-xs ${tutorNote.length > 150 ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                {tutorNote.length}/150
              </span>
            </div>
            <textarea
              value={tutorNote}
              onChange={(e) => {
                if (e.target.value.length <= 150) {
                  setTutorNote(e.target.value);
                }
              }}
              placeholder="Nhận xét thêm về thái độ, nội dung cần ôn tập..."
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none min-h-[100px]"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 bg-gray-50 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitDisabled}
            className={`px-5 py-2.5 text-sm font-medium rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              isSubmitDisabled
                ? 'bg-blue-300 text-white cursor-not-allowed opacity-70'
                : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md'
            }`}
          >
            Gửi đánh giá
          </button>
        </div>
      </div>
    </div>
  );
};

export default TutorFeedbackModal;
