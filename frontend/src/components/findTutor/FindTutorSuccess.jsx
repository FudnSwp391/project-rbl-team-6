import React from 'react';

export default function FindTutorSuccess() {
  return (
    <div className="w-full max-w-4xl bg-white rounded-xl shadow-sm p-12 text-center animate-[fadeIn_0.5s_ease-in-out]">
      <div className="w-24 h-24 bg-[#dde1ff] rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_0_8px_#f8f9fb]">
        <span className="material-symbols-outlined text-[48px] text-[#00288e]" style={{fontVariationSettings: "'FILL' 1"}}>task_alt</span>
      </div>
      
      <h1 className="text-[32px] font-bold text-[#191c1e] mb-4">Gửi yêu cầu thành công!</h1>
      <p className="text-[18px] text-[#5d5f5f] max-w-xl mx-auto mb-10">
        EduX đã tiếp nhận yêu cầu tìm gia sư của bạn. Đội ngũ chuyên môn sẽ phân tích và gợi ý cho bạn những gia sư phù hợp nhất trong vòng 24h tới.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="p-6 bg-[#f3f4f6] rounded-xl text-center">
          <span className="material-symbols-outlined text-[#00288e] text-[32px] mb-2">auto_awesome</span>
          <h3 className="font-semibold text-[#191c1e] mb-1">Gợi ý thông minh</h3>
          <p className="text-[14px] text-[#5d5f5f]">Hệ thống AI đang lọc danh sách gia sư dựa trên yêu cầu của bạn</p>
        </div>
        <div className="p-6 bg-[#f3f4f6] rounded-xl text-center">
          <span className="material-symbols-outlined text-[#00288e] text-[32px] mb-2">notifications_active</span>
          <h3 className="font-semibold text-[#191c1e] mb-1">Nhận thông báo</h3>
          <p className="text-[14px] text-[#5d5f5f]">Chúng tôi sẽ thông báo ngay khi tìm được hồ sơ phù hợp</p>
        </div>
        <div className="p-6 bg-[#f3f4f6] rounded-xl text-center">
          <span className="material-symbols-outlined text-[#00288e] text-[32px] mb-2">handshake</span>
          <h3 className="font-semibold text-[#191c1e] mb-1">Kết nối miễn phí</h3>
          <p className="text-[14px] text-[#5d5f5f]">Trao đổi trực tiếp và học thử hoàn toàn miễn phí</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-center gap-4">
        <button
          onClick={() => window.location.hash = '/'}
          className="px-8 py-3 rounded-lg border border-[#c4c5d5] text-[#444653] font-semibold hover:border-[#00288e] hover:text-[#00288e] transition-all"
        >
          Về trang chủ
        </button>
        <button
          onClick={() => window.location.hash = '/dashboard'}
          className="bg-[#00288e] text-white px-8 py-3 rounded-lg font-bold hover:bg-[#1e40af] transition-all shadow-md"
        >
          Đến Bảng Điều Khiển
        </button>
      </div>
    </div>
  );
}
