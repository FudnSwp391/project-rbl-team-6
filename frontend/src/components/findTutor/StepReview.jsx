import React from 'react';

export default function StepReview({ formData, onBack, onSubmit }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit();
  };

  const formatCurrency = (val) => {
    if (!val) return '0đ';
    if (val >= 1000) return (val/1000).toFixed(1) + 'M';
    return val + 'k';
  };

  const availabilityText = Object.entries(formData.availability || {})
    .filter(([time, days]) => days && days.length > 0)
    .map(([time, days]) => {
      const label = time === 'morning' ? 'Sáng' : time === 'afternoon' ? 'Chiều' : 'Tối';
      return `${label}: ${days.join(', ')}`;
    })
    .join(' | ');

  return (
    <div className="w-full max-w-4xl bg-white rounded-xl shadow-sm p-8 animate-[fadeIn_0.5s_ease-in-out]">
      <div className="mb-8 border-b border-[#e1e2e4] pb-6">
        <h1 className="text-[32px] leading-10 font-bold text-[#191c1e] mb-2">Xác nhận yêu cầu</h1>
        <p className="text-[18px] text-[#5d5f5f]">Kiểm tra lại toàn bộ thông tin trước khi gửi yêu cầu.</p>
      </div>

      <div className="space-y-6">
        <div className="bg-[#f3f4f6] rounded-xl p-6 space-y-4">
          <h2 className="text-[18px] font-bold text-[#00288e] flex items-center gap-2 border-b border-[#c4c5d5] pb-2">
            <span className="material-symbols-outlined">menu_book</span> Nhu cầu học tập
          </h2>
          <div className="grid grid-cols-2 gap-4 text-[14px]">
            <div><span className="text-[#5d5f5f]">Môn học:</span> <span className="font-semibold">{formData.subject || 'Chưa nhập'}</span></div>
            <div><span className="text-[#5d5f5f]">Trình độ:</span> <span className="font-semibold">{formData.level || 'Chưa chọn'} - {formData.skillLevel || 'Chưa chọn'}</span></div>
            <div className="col-span-2"><span className="text-[#5d5f5f]">Mục tiêu:</span> <span className="font-semibold">{(formData.goals || []).join(', ') || 'Chưa chọn'}</span></div>
          </div>
        </div>

        <div className="bg-[#f3f4f6] rounded-xl p-6 space-y-4">
          <h2 className="text-[18px] font-bold text-[#00288e] flex items-center gap-2 border-b border-[#c4c5d5] pb-2">
            <span className="material-symbols-outlined">category</span> Hình thức học
          </h2>
          <div className="grid grid-cols-2 gap-4 text-[14px]">
            <div><span className="text-[#5d5f5f]">Hình thức:</span> <span className="font-semibold">{formData.studyFormat === 'online' ? 'Online' : formData.studyFormat === 'offline' ? 'Offline' : formData.studyFormat === 'both' ? 'Cả hai' : 'Chưa chọn'}</span></div>
            <div><span className="text-[#5d5f5f]">Số lượng:</span> <span className="font-semibold">{formData.classSize === '1on1' ? '1 kèm 1' : formData.classSize === 'group_small' ? 'Nhóm 2-3 người' : formData.classSize === 'group_large' ? 'Nhóm 4+ người' : 'Chưa chọn'}</span></div>
            <div><span className="text-[#5d5f5f]">Giới tính gia sư:</span> <span className="font-semibold">{formData.tutorGender || 'Không yêu cầu'}</span></div>
          </div>
          {formData.note && (
            <div className="text-[14px] mt-2">
              <span className="text-[#5d5f5f]">Ghi chú:</span>
              <p className="font-semibold mt-1 bg-white p-3 rounded-lg">{formData.note}</p>
            </div>
          )}
        </div>

        <div className="bg-[#f3f4f6] rounded-xl p-6 space-y-4">
          <h2 className="text-[18px] font-bold text-[#00288e] flex items-center gap-2 border-b border-[#c4c5d5] pb-2">
            <span className="material-symbols-outlined">schedule</span> Thời gian & Ngân sách
          </h2>
          <div className="grid grid-cols-2 gap-4 text-[14px]">
            <div><span className="text-[#5d5f5f]">Lịch học:</span> <span className="font-semibold">{formData.sessionsPerWeek || 3} buổi/tuần, {formData.durationPerSession || 90} phút/buổi</span></div>
            <div><span className="text-[#5d5f5f]">Ngân sách:</span> <span className="font-semibold">{formatCurrency(Math.max(100, formData.budget - 150))} - {formatCurrency(formData.budget)} / buổi</span></div>
            <div className="col-span-2">
              <span className="text-[#5d5f5f]">Thời gian rảnh:</span> 
              <p className="font-semibold mt-1">{availabilityText || 'Chưa thiết lập lịch rảnh'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-10 flex justify-between items-center border-t border-[#e1e2e4] mt-8">
        <button
          type="button"
          onClick={onBack}
          className="px-8 py-3 rounded-lg text-[#00288e] font-semibold hover:bg-[#00288e]/5 transition-all flex items-center gap-2 active:scale-95"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          Quay lại
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="bg-[#00288e] text-white px-10 py-3 rounded-lg font-bold text-[18px] hover:bg-[#1e40af] active:scale-95 transition-all shadow-md flex items-center gap-2"
        >
          Gửi yêu cầu tìm gia sư
          <span className="material-symbols-outlined">send</span>
        </button>
      </div>
    </div>
  );
}
