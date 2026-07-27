import React from 'react';

export default function StepStudyFormat({ formData, updateFormData, onNext, onBack }) {
  const formats = [
    { id: 'online', label: 'Học Trực Tuyến (Online)', icon: 'laptop_mac' },
    { id: 'offline', label: 'Học Trực Tiếp (Offline)', icon: 'location_on' },
    { id: 'both', label: 'Linh Hoạt Cả Hai', icon: 'sync' }
  ];

  const classSizes = [
    { id: '1on1', label: '1 kèm 1', desc: 'Hiệu quả cao nhất' },
    { id: 'group_small', label: 'Nhóm 2-3 người', desc: 'Tiết kiệm chi phí' },
    { id: 'group_large', label: 'Nhóm 4+ người', desc: 'Học cùng bạn bè' }
  ];

  const genders = ['Không yêu cầu', 'Nam', 'Nữ'];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.studyFormat) {
      alert('Vui lòng chọn hình thức học!');
      return;
    }
    onNext();
  };

  return (
    <div className="w-full max-w-4xl bg-white rounded-xl shadow-sm p-8 animate-[fadeIn_0.5s_ease-in-out]">
      <div className="mb-8 border-b border-[#e1e2e4] pb-6">
        <h1 className="text-[32px] leading-10 font-bold text-[#191c1e] mb-2">Hình thức học</h1>
        <p className="text-[18px] text-[#5d5f5f]">Chọn cách học và yêu cầu về gia sư phù hợp với bạn.</p>
      </div>

      <form className="space-y-10" onSubmit={handleSubmit}>
        {/* Hình thức học */}
        <div className="space-y-4">
          <label className="text-[14px] font-semibold text-[#191c1e] flex items-center gap-1">
            <span className="material-symbols-outlined text-[#00288e] scale-75">category</span>
            Hình thức học
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {formats.map((fmt) => {
              const isSelected = formData.studyFormat === fmt.id;
              return (
                <label key={fmt.id} className="cursor-pointer format-card relative">
                  <input
                    type="radio"
                    name="studyFormat"
                    value={fmt.id}
                    className="sr-only"
                    checked={isSelected}
                    onChange={(e) => updateFormData({ studyFormat: e.target.value })}
                  />
                  <div className={`p-6 border rounded-xl flex flex-col items-center text-center transition-all ${
                    isSelected 
                      ? 'border-[#00288e] bg-[#f3f4f6] shadow-[0_10px_15px_-3px_rgba(0,0,0,0.08)]' 
                      : 'border-[#e1e2e4] bg-white hover:border-[#00288e]'
                  }`}>
                    <div className={`w-12 h-12 rounded-full mb-4 flex items-center justify-center transition-colors ${
                      isSelected ? 'bg-[#00288e] text-white' : 'bg-[#f3f4f6] text-[#5d5f5f]'
                    }`}>
                      <span className="material-symbols-outlined">{fmt.icon}</span>
                    </div>
                    <span className="text-[16px] font-semibold text-[#191c1e]">{fmt.label}</span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Số lượng học viên */}
        <div className="space-y-4">
          <label className="text-[14px] font-semibold text-[#191c1e] flex items-center gap-1">
            <span className="material-symbols-outlined text-[#00288e] scale-75">group</span>
            Số lượng học viên
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {classSizes.map((size) => {
              const isSelected = formData.classSize === size.id;
              return (
                <label key={size.id} className="cursor-pointer format-card relative">
                  <input
                    type="radio"
                    name="classSize"
                    value={size.id}
                    className="sr-only"
                    checked={isSelected}
                    onChange={(e) => updateFormData({ classSize: e.target.value })}
                  />
                  <div className={`p-4 border rounded-xl transition-all ${
                    isSelected 
                      ? 'border-[#00288e] bg-[#f3f4f6]' 
                      : 'border-[#e1e2e4] bg-white hover:border-[#00288e]'
                  }`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[16px] font-semibold text-[#191c1e]">{size.label}</span>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? 'border-[#00288e] bg-[#00288e]' : 'border-[#c4c5d5]'
                      }`}>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-white"></div>}
                      </div>
                    </div>
                    <p className="text-[14px] text-[#5d5f5f]">{size.desc}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Giới tính gia sư */}
        <div className="space-y-4">
          <label className="text-[14px] font-semibold text-[#191c1e] flex items-center gap-1">
            <span className="material-symbols-outlined text-[#00288e] scale-75">wc</span>
            Giới tính gia sư
          </label>
          <div className="flex flex-wrap gap-4">
            {genders.map((gender) => {
              const isSelected = formData.tutorGender === gender;
              return (
                <button
                  key={gender}
                  type="button"
                  onClick={() => updateFormData({ tutorGender: gender })}
                  className={`px-8 py-3 rounded-full border transition-all text-[16px] font-medium ${
                    isSelected
                      ? 'bg-[#1e40af] text-white border-[#00288e]'
                      : 'border-[#c4c5d5] bg-white text-[#191c1e] hover:bg-[#f3f4f6]'
                  }`}
                >
                  {gender}
                </button>
              );
            })}
          </div>
        </div>

        {/* Ghi chú */}
        <div className="space-y-4">
          <label className="text-[14px] font-semibold text-[#191c1e] flex items-center gap-1">
            <span className="material-symbols-outlined text-[#00288e] scale-75">edit_note</span>
            Ghi chú thêm (Không bắt buộc)
          </label>
          <textarea
            rows="4"
            value={formData.note || ''}
            onChange={(e) => updateFormData({ note: e.target.value })}
            className="w-full p-4 bg-white border border-[#c4c5d5] rounded-lg focus:ring-4 focus:ring-[#dde1ff] focus:border-[#00288e] transition-all text-[16px]"
            placeholder="Bạn có yêu cầu đặc biệt gì về gia sư không? (Ví dụ: Gia sư đang học trường nào, điểm môn toán trên 9...)"
          ></textarea>
        </div>

        {/* Action Button */}
        <div className="pt-10 flex justify-between items-center border-t border-[#e1e2e4]">
          <button
            type="button"
            onClick={onBack}
            className="px-8 py-3 rounded-lg text-[#00288e] font-semibold hover:bg-[#00288e]/5 transition-all flex items-center gap-2 active:scale-95"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            Quay lại
          </button>
          <button
            type="submit"
            className="bg-[#00288e] text-white px-10 py-3 rounded-lg font-bold text-[18px] hover:bg-[#1e40af] active:scale-95 transition-all shadow-md"
          >
            Tiếp tục
          </button>
        </div>
      </form>
    </div>
  );
}
