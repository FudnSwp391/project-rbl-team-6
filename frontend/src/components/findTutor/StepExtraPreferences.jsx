import React from 'react';

export default function StepExtraPreferences({ formData, updateFormData, onNext, onBack }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    onNext();
  };

  return (
    <div className="w-full max-w-4xl bg-white rounded-xl shadow-sm p-8 animate-[fadeIn_0.5s_ease-in-out]">
      <div className="mb-8 border-b border-[#e1e2e4] pb-6">
        <h1 className="text-[32px] leading-10 font-bold text-[#191c1e] mb-2">Yêu cầu thêm</h1>
        <p className="text-[18px] text-[#5d5f5f]">Chia sẻ thêm một số thông tin (không bắt buộc) để chúng tôi tìm được người phù hợp nhất.</p>
      </div>

      <form className="space-y-10" onSubmit={handleSubmit}>
        <div className="space-y-4">
          <label className="text-[14px] font-semibold text-[#191c1e] flex items-center gap-1">
            <span className="material-symbols-outlined text-[#00288e] scale-75">school</span>
            Trường học / Môi trường mong muốn
          </label>
          <input
            type="text"
            value={formData.preferredUniversity || ''}
            onChange={(e) => updateFormData({ preferredUniversity: e.target.value })}
            className="block w-full px-6 py-4 bg-white border border-[#c4c5d5] rounded-lg focus:ring-4 focus:ring-[#dde1ff] focus:border-[#00288e] transition-all text-[16px]"
            placeholder="VD: Sinh viên Bách Khoa, Sư Phạm..."
          />
        </div>

        <div className="space-y-4">
          <label className="text-[14px] font-semibold text-[#191c1e] flex items-center gap-1">
            <span className="material-symbols-outlined text-[#00288e] scale-75">psychology</span>
            Đặc điểm tính cách mong muốn
          </label>
          <textarea
            rows="3"
            value={formData.tutorPersonality || ''}
            onChange={(e) => updateFormData({ tutorPersonality: e.target.value })}
            className="block w-full px-6 py-4 bg-white border border-[#c4c5d5] rounded-lg focus:ring-4 focus:ring-[#dde1ff] focus:border-[#00288e] transition-all text-[16px]"
            placeholder="VD: Nghiêm khắc, vui vẻ, thân thiện..."
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
