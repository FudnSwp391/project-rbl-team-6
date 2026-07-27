import React, { useState } from 'react';

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_NAMES_VI = {
  Monday: 'Thứ 2', Tuesday: 'Thứ 3', Wednesday: 'Thứ 4', Thursday: 'Thứ 5',
  Friday: 'Thứ 6', Saturday: 'Thứ 7', Sunday: 'Chủ nhật'
};

export default function TutorScheduleEditor({
  availRanges,
  setAvailRanges,
  monthlyAvailRanges,
  setMonthlyAvailRanges,
  slotDuration,
  setSlotDuration,
  onCancel,
  onSave,
  availSaving
}) {
  const [activeTab, setActiveTab] = useState('single'); // 'single' | 'monthly'

  const rangesToEdit = activeTab === 'single' ? availRanges : monthlyAvailRanges;
  const setRangesToEdit = activeTab === 'single' ? setAvailRanges : setMonthlyAvailRanges;

  const computeEndTime = (start, durationMins) => {
    if (!start) return '';
    const [h, m] = start.split(':').map(Number);
    let totalMins = h * 60 + m + durationMins;
    const endH = Math.floor(totalMins / 60) % 24;
    const endM = totalMins % 60;
    return `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
  };

  const handleDurationChange = (newDuration) => {
    setSlotDuration(newDuration);
    
    const updateRangesObj = (obj) => {
      const newObj = { ...obj };
      for (const day in newObj) {
        newObj[day] = newObj[day].map(r => ({
          ...r,
          end: computeEndTime(r.start, newDuration)
        }));
      }
      return newObj;
    };
    
    setAvailRanges(updateRangesObj(availRanges));
    setMonthlyAvailRanges(updateRangesObj(monthlyAvailRanges));
  };

  const handleAddRange = (day) => {
    setRangesToEdit(prev => {
      const currentRanges = prev[day] || [];
      return {
        ...prev,
        [day]: [...currentRanges, { start: '07:00', end: computeEndTime('07:00', slotDuration) }]
      };
    });
  };

  const handleRemoveRange = (day, index) => {
    setRangesToEdit(prev => {
      const currentRanges = prev[day] || [];
      return {
        ...prev,
        [day]: currentRanges.filter((_, i) => i !== index)
      };
    });
  };

  const handleUpdateRange = (day, index, value) => {
    setRangesToEdit(prev => {
      const currentRanges = [...(prev[day] || [])];
      currentRanges[index] = { 
        ...currentRanges[index], 
        start: value, 
        end: computeEndTime(value, slotDuration)
      };
      return {
        ...prev,
        [day]: currentRanges
      };
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-outline-variant/30 flex items-center justify-between bg-surface-container-low/30">
          <h2 className="font-headline-md text-[18px] text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">edit_calendar</span>
            Cấu Hình Lịch Giảng Dạy
          </h2>
          <button onClick={onCancel} className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Thời lượng */}
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5">
            <p className="font-label-md text-[13px] font-bold text-on-surface mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">schedule</span>
              Thời lượng mỗi buổi dạy
            </p>
            <div className="flex gap-3">
              {[{ value: 60, label: '1 tiếng', sub: '60 phút' }, { value: 120, label: '2 tiếng', sub: '120 phút' }, { value: 180, label: '3 tiếng', sub: '180 phút' }].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleDurationChange(opt.value)}
                  className={`flex-1 py-2.5 px-3 rounded-xl border-2 transition-all text-center ${
                    slotDuration === opt.value
                      ? 'border-primary bg-primary text-on-primary shadow-md'
                      : 'border-outline-variant/50 text-on-surface-variant hover:border-primary/40 hover:bg-primary/5'
                  }`}
                >
                  <p className="font-bold text-[14px]">{opt.label}</p>
                  <p className={`text-[11px] mt-0.5 ${slotDuration === opt.value ? 'text-on-primary/80' : 'text-outline'}`}>{opt.sub}</p>
                </button>
              ))}
            </div>
            <p className="text-[12px] text-on-surface-variant mt-3 bg-white/50 inline-block px-3 py-1.5 rounded-lg border border-outline-variant/20">
              ⚠️ Học phí sẽ tính theo: <span className="font-bold text-primary">{slotDuration === 60 ? '1×' : slotDuration === 120 ? '2×' : '3×'} giá mỗi giờ</span>. <br/>
              Hệ thống sẽ tự động tính toán giờ kết thúc dựa trên thời lượng bạn chọn.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex bg-surface-container-low p-1.5 rounded-xl border border-outline-variant/30">
            <button 
              onClick={() => setActiveTab('single')}
              className={`flex-1 py-2 text-[13px] font-bold rounded-lg transition-all ${activeTab === 'single' ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:text-primary'}`}
            >
              1. Lịch Rảnh Dạy Lẻ
            </button>
            <button 
              onClick={() => setActiveTab('monthly')}
              className={`flex-1 py-2 text-[13px] font-bold rounded-lg transition-all ${activeTab === 'monthly' ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:text-primary'}`}
            >
              2. Lịch Cố Định Tháng
            </button>
          </div>

          <p className="text-[12px] text-on-surface-variant px-1">
            {activeTab === 'single' 
              ? 'Thêm các khoảng thời gian bạn rảnh trong tuần để học sinh đặt lịch lẻ.' 
              : 'Thêm các khoảng thời gian bạn nhận dạy cố định hàng tuần theo tháng.'}
          </p>

          {/* Day List */}
          <div className="space-y-4">
            {DAY_ORDER.map(day => {
              const ranges = rangesToEdit[day] || [];
              return (
                <div key={day} className="border border-outline-variant/40 rounded-xl p-4 transition-colors hover:border-outline-variant bg-white">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-label-md font-bold text-[14px] text-on-surface flex items-center gap-2">
                      <div className="w-1.5 h-4 bg-primary rounded-full"></div>
                      {DAY_NAMES_VI[day]}
                    </span>
                    <button 
                      onClick={() => handleAddRange(day)}
                      className="text-[12px] font-semibold text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">add</span>
                      Thêm khoảng giờ
                    </button>
                  </div>

                  {ranges.length === 0 ? (
                    <p className="text-[12px] text-outline italic px-3 py-2 bg-surface-container-low/50 rounded-lg border border-dashed border-outline-variant/50">Trống</p>
                  ) : (
                    <div className="space-y-2.5">
                      {ranges.map((range, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-2 rounded-lg border transition-all bg-surface-container-low/40 border-outline-variant/30">
                          <input 
                            type="time" 
                            value={range.start}
                            onChange={(e) => handleUpdateRange(day, idx, e.target.value)}
                            className="bg-white border border-outline-variant/50 rounded-md px-2 py-1.5 text-[13px] focus:ring-2 focus:ring-primary focus:border-primary outline-none font-medium"
                          />
                          <span className="text-on-surface-variant font-medium text-[12px]">đến</span>
                          <div className="bg-surface-container border border-outline-variant/30 rounded-md px-3 py-1.5 text-[13px] text-on-surface-variant font-medium cursor-not-allowed">
                            {range.end}
                          </div>
                          
                          <button 
                            onClick={() => handleRemoveRange(day, idx)}
                            className="ml-auto w-8 h-8 flex items-center justify-center text-outline hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-outline-variant/30 bg-surface-container-low flex justify-end gap-3">
          <button onClick={onCancel} className="px-5 py-2 font-bold text-[13px] text-on-surface-variant hover:bg-surface-container-high rounded-xl transition-colors">
            Hủy
          </button>
          <button onClick={onSave} disabled={availSaving} className="px-6 py-2 font-bold text-[13px] text-on-primary bg-primary hover:bg-primary/90 rounded-xl shadow-md transition-all disabled:opacity-50">
            {availSaving ? 'Đang lưu...' : 'Lưu Lịch Dạy'}
          </button>
        </div>
      </div>
    </div>
  );
}
