import React from 'react';

export default function StepTimeBudget({ formData, updateFormData, onNext, onBack }) {
  const sessions = formData.sessionsPerWeek || 3;
  const duration = formData.durationPerSession || '90';
  const availability = formData.availability || {};
  const budget = formData.budget || 500;

  const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const times = [
    { id: 'morning', label: 'Sáng' },
    { id: 'afternoon', label: 'Chiều' },
    { id: 'evening', label: 'Tối' }
  ];

  const handleIncrement = () => {
    if (sessions < 10) updateFormData({ sessionsPerWeek: sessions + 1 });
  };

  const handleDecrement = () => {
    if (sessions > 1) updateFormData({ sessionsPerWeek: sessions - 1 });
  };

  const toggleAvailability = (day, timeId) => {
    const current = { ...availability };
    if (!current[timeId]) current[timeId] = [];
    
    if (current[timeId].includes(day)) {
      current[timeId] = current[timeId].filter(d => d !== day);
    } else {
      current[timeId] = [...current[timeId], day];
    }
    updateFormData({ availability: current });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onNext();
  };

  return (
    <div className="w-full max-w-4xl bg-white rounded-xl shadow-sm p-8 animate-[fadeIn_0.5s_ease-in-out]">
      <div className="mb-8 border-b border-[#e1e2e4] pb-6">
        <h1 className="text-[32px] leading-10 font-bold text-[#191c1e] mb-2">Thời gian & ngân sách</h1>
        <p className="text-[18px] text-[#5d5f5f]">Thông tin này giúp EduX tìm gia sư phù hợp với lịch học và mức phí mong muốn của bạn.</p>
      </div>

      <form className="space-y-10" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Số buổi mỗi tuần */}
          <div className="space-y-2">
            <label className="text-[14px] font-semibold text-[#444653]">Số buổi mỗi tuần</label>
            <div className="flex items-center h-14 bg-[#f3f4f6] rounded-lg border border-[#c4c5d5] p-1">
              <button type="button" onClick={handleDecrement} className="w-12 h-full flex items-center justify-center hover:bg-[#e7e8ea] rounded-md transition-all active:scale-90">
                <span className="material-symbols-outlined">remove</span>
              </button>
              <input type="text" readOnly value={sessions} className="flex-1 bg-transparent border-none text-center font-bold text-[24px] focus:ring-0 text-[#191c1e]" />
              <button type="button" onClick={handleIncrement} className="w-12 h-full flex items-center justify-center hover:bg-[#e7e8ea] rounded-md transition-all active:scale-90">
                <span className="material-symbols-outlined">add</span>
              </button>
            </div>
          </div>

          {/* Thời lượng mỗi buổi */}
          <div className="space-y-2">
            <label className="text-[14px] font-semibold text-[#444653]">Thời lượng mỗi buổi</label>
            <div className="relative group">
              <select
                value={duration}
                onChange={(e) => updateFormData({ durationPerSession: e.target.value })}
                className="w-full h-14 px-4 bg-[#f3f4f6] rounded-lg border border-[#c4c5d5] appearance-none focus:border-[#00288e] focus:ring-4 focus:ring-[#dde1ff] transition-all font-semibold outline-none cursor-pointer"
              >
                <option value="60">60 phút</option>
                <option value="90">90 phút</option>
                <option value="120">120 phút</option>
                <option value="150">150 phút</option>
              </select>
              <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#5d5f5f]">expand_more</span>
            </div>
          </div>
        </div>

        {/* Thời gian rảnh trong tuần */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-[14px] font-semibold text-[#444653]">Thời gian rảnh trong tuần</label>
          </div>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
            <div className="hidden md:block"></div>
            {days.map(day => (
              <div key={day} className="hidden md:block text-center text-[12px] text-[#5d5f5f] font-bold pb-2">{day}</div>
            ))}

            {times.map((time) => (
              <React.Fragment key={time.id}>
                <div className="col-span-4 md:col-span-1 flex items-center md:justify-end text-[12px] font-bold text-[#c6c6c7] uppercase tracking-wider pr-2">
                  {time.label}
                </div>
                {days.map(day => {
                  const isSelected = (availability[time.id] || []).includes(day);
                  return (
                    <button
                      key={`${time.id}-${day}`}
                      type="button"
                      onClick={() => toggleAvailability(day, time.id)}
                      className={`h-10 rounded-lg flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-[#1e40af] text-white font-semibold'
                          : 'bg-[#e7e8ea] text-[#444653] hover:bg-[#dfe0e0]'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Ngân sách */}
        <div className="space-y-8 bg-[#f3f4f6] p-8 rounded-xl">
          <div className="flex items-center justify-between">
            <label className="text-[14px] font-semibold text-[#444653]">Ngân sách dự kiến (vnđ/buổi)</label>
            <div className="flex items-center gap-1 text-[#00288e] font-bold text-[18px]">
              <span>{Math.max(100, budget - 150) >= 1000 ? (Math.max(100, budget - 150)/1000).toFixed(1) + 'M' : Math.max(100, budget - 150) + 'k'}</span>
              <span>-</span>
              <span>{budget >= 1000 ? (budget/1000).toFixed(1) + 'M' : budget + 'k'}</span>
            </div>
          </div>
          <div className="relative pt-2 pb-2">
            <input
              type="range"
              min="100" max="2000" step="50"
              value={budget}
              onChange={(e) => updateFormData({ budget: Number(e.target.value) })}
              className="w-full h-1.5 bg-[#dfe0e0] rounded-lg appearance-none cursor-pointer accent-[#00288e]"
            />
            <div className="flex justify-between mt-4 text-[12px] text-[#5d5f5f] font-medium">
              <span>100k</span>
              <span>500k</span>
              <span>1.0M</span>
              <span>1.5M</span>
              <span>2.0M</span>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-[#dde1ff]/30 border border-[#dde1ff] p-4 rounded-lg flex gap-4 items-start">
          <span className="material-symbols-outlined text-[#00288e]">info</span>
          <p className="text-[14px] font-semibold text-[#173bab] leading-relaxed">
            EduX sẽ dùng thời gian rảnh và ngân sách của bạn để ưu tiên những gia sư phù hợp nhất.
          </p>
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
