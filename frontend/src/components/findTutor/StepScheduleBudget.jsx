import React from 'react';

const cities = ["Đà Nẵng", "Hà Nội", "TP. Hồ Chí Minh"];
const districts = ["Hải Châu", "Sơn Trà", "Thanh Khê"];
const wards = ["Tất cả Phường/Xã", "Thạch Thang", "Hải Châu 1"];

const locationPreferences = ["Tại nhà học sinh", "Tại nhà gia sư", "Quán Cafe / Thư viện"];

const days = [
  { id: 'T2', label: 'T2' },
  { id: 'T3', label: 'T3' },
  { id: 'T4', label: 'T4' },
  { id: 'T5', label: 'T5' },
  { id: 'T6', label: 'T6' },
  { id: 'T7', label: 'T7', color: 'text-secondary' },
  { id: 'CN', label: 'CN', color: 'text-error' }
];

const shifts = [
  { id: 'Sang', label: 'Sáng', time: '08:00 - 12:00' },
  { id: 'Chieu', label: 'Chiều', time: '13:30 - 17:30' },
  { id: 'Toi', label: 'Tối', time: '18:00 - 21:30' }
];

export function StepScheduleBudget({ formData, setFormData }) {
  const handleChange = (e) => {
    const { id, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [id]: type === 'checkbox' ? checked : value 
    }));
  };

  const toggleTime = (dayId, shiftId) => {
    const timeSlot = `${dayId}-${shiftId}`;
    setFormData(prev => {
      const current = prev.availableTimes || [];
      if (current.includes(timeSlot)) {
        return { ...prev, availableTimes: current.filter(t => t !== timeSlot) };
      } else {
        return { ...prev, availableTimes: [...current, timeSlot] };
      }
    });
  };

  const formatOptions = [
    { value: "online", label: "Trực tuyến", icon: "laptop_mac" },
    { value: "offline", label: "Trực tiếp", icon: "group" },
    { value: "both", label: "Cả hai", icon: "sync_alt" }
  ];

  return (
    <>
      <header className="mb-xl text-center md:text-left">
        <h2 className="font-headline-lg text-headline-lg text-primary tracking-tight">Khi nào và ở đâu bạn muốn học?</h2>
        <p className="font-body-lg text-body-lg text-on-surface-variant mt-sm max-w-2xl">Hệ thống chỉ đề xuất các gia sư đáp ứng lịch và hình thức học phù hợp.</p>
      </header>

      <div className="flex flex-col gap-2xl">
        {/* Hình thức học */}
        <section>
          <h3 className="font-headline-sm text-headline-sm text-on-surface mb-md">Hình thức học</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
            {formatOptions.map(opt => {
              const isActive = formData.learningFormat === opt.value;
              return (
                <label key={opt.value} className={`relative flex flex-col items-center justify-center p-xl rounded-xl border transition-all cursor-pointer group ${
                  isActive 
                    ? 'border-2 border-primary bg-primary-fixed-dim/20 shadow-[0_4px_20px_rgba(30,64,175,0.08)]' 
                    : 'border-outline-variant bg-surface-container-lowest hover:border-primary'
                }`}>
                  <input 
                    type="radio" 
                    name="learningFormat" 
                    className="peer sr-only" 
                    checked={isActive}
                    onChange={() => setFormData(prev => ({ ...prev, learningFormat: opt.value }))}
                  />
                  <span className={`material-symbols-outlined text-[32px] mb-sm transition-colors ${isActive ? 'text-primary' : 'text-outline group-hover:text-primary'}`} style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>
                    {opt.icon}
                  </span>
                  <span className={`font-label-md text-label-md ${isActive ? 'text-primary font-bold' : 'text-on-surface'}`}>{opt.label}</span>
                  {isActive && (
                    <div className="absolute top-sm right-sm w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-on-primary text-[12px] font-bold">check</span>
                    </div>
                  )}
                </label>
              );
            })}
          </div>
        </section>

        {/* Địa điểm */}
        {(formData.learningFormat === 'offline' || formData.learningFormat === 'both') && (
          <section className="bg-surface-container-lowest p-xl rounded-xl border border-outline-variant/50 shadow-sm">
            <h3 className="font-headline-sm text-headline-sm text-on-surface mb-lg flex items-center gap-sm">
              <span className="material-symbols-outlined text-secondary">location_on</span>
              Khu vực học tập
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg mb-lg">
              <div className="flex flex-col gap-xs">
                <label className="font-label-sm text-label-sm text-on-surface-variant" htmlFor="city">Tỉnh/Thành phố</label>
                <select id="city" value={formData.city} onChange={handleChange} className="w-full rounded-lg border-outline-variant bg-surface py-3 px-4 text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none">
                  {cities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-xs">
                <label className="font-label-sm text-label-sm text-on-surface-variant" htmlFor="district">Quận/Huyện</label>
                <select id="district" value={formData.district} onChange={handleChange} className="w-full rounded-lg border-outline-variant bg-surface py-3 px-4 text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none">
                  {districts.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-xs">
                <label className="font-label-sm text-label-sm text-on-surface-variant" htmlFor="ward">Phường/Xã</label>
                <select id="ward" value={formData.ward} onChange={handleChange} className="w-full rounded-lg border-outline-variant bg-surface py-3 px-4 text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none">
                  {wards.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            
            <div className="flex flex-col gap-xs mb-lg">
              <label className="font-label-sm text-label-sm text-on-surface-variant" htmlFor="searchRadius">Bán kính tìm kiếm (km)</label>
              <div className="flex items-center gap-md">
                <input 
                  id="searchRadius"
                  type="range" min="1" max="20" 
                  value={formData.searchRadius || "5"}
                  onChange={handleChange}
                  className="w-full accent-primary" 
                />
                <span className="font-label-md text-label-md text-on-surface whitespace-nowrap w-12 text-right">{formData.searchRadius || "5"} km</span>
              </div>
            </div>

            <div className="pt-md border-t border-outline-variant/30">
              <p className="font-label-sm text-label-sm text-on-surface-variant mb-md">Ưu tiên địa điểm</p>
              <div className="flex flex-wrap gap-lg">
                {locationPreferences.map(pref => (
                  <label key={pref} className="flex items-center gap-sm cursor-pointer">
                    <input 
                      type="radio" 
                      name="locationPreference" 
                      checked={formData.locationPreference === pref}
                      onChange={() => setFormData(prev => ({ ...prev, locationPreference: pref }))}
                      className="w-5 h-5 text-primary focus:ring-primary border-outline-variant" 
                    />
                    <span className="font-body-md text-body-md text-on-surface">{pref}</span>
                  </label>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Lịch học */}
        <section className="bg-surface-container-lowest p-xl rounded-xl border border-outline-variant/50 shadow-sm">
          <div className="flex justify-between items-center mb-lg">
            <h3 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-sm">
              <span className="material-symbols-outlined text-secondary">calendar_month</span>
              Khung giờ có thể học
            </h3>
            <span className="font-label-sm text-label-sm bg-secondary-fixed text-on-secondary-fixed px-md py-xs rounded-full">Nhấp để chọn nhiều khung giờ</span>
          </div>
          
          <div className="overflow-x-auto mb-lg">
            <table className="w-full text-center border-collapse">
              <thead>
                <tr className="font-label-sm text-label-sm text-on-surface-variant border-b border-outline-variant/30">
                  <th className="py-sm px-xs font-normal text-left">Ca học</th>
                  {days.map(d => (
                    <th key={d.id} className={`py-sm px-xs font-medium ${d.color || ''}`}>{d.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="font-body-md text-body-md">
                {shifts.map(shift => (
                  <tr key={shift.id}>
                    <td className="py-md px-xs text-left text-on-surface-variant font-label-md text-label-md">
                      {shift.label}<br/><span className="text-[11px] opacity-70">{shift.time}</span>
                    </td>
                    {days.map(day => {
                      const timeSlot = `${day.id}-${shift.id}`;
                      const isSelected = formData.availableTimes?.includes(timeSlot);
                      return (
                        <td key={timeSlot} className="p-xs">
                          <div 
                            onClick={() => toggleTime(day.id, shift.id)}
                            className={`h-12 rounded-lg cursor-pointer transition-colors flex flex-col items-center justify-center relative ${
                              isSelected 
                                ? 'bg-primary text-on-primary shadow-sm' 
                                : 'border border-outline-variant/50 hover:border-primary/50 bg-surface-container-low'
                            }`}
                          >
                            {isSelected && <span className="material-symbols-outlined text-[18px]">check</span>}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md pt-md border-t border-outline-variant/30">
            <div className="flex flex-col gap-xs">
              <label className="font-label-sm text-label-sm text-on-surface-variant" htmlFor="sessionsPerWeek">Số buổi / tuần</label>
              <select id="sessionsPerWeek" value={formData.sessionsPerWeek || "2 buổi"} onChange={handleChange} className="w-full rounded-lg border-outline-variant bg-surface py-2 px-3 text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none">
                <option value="1 buổi">1 buổi</option>
                <option value="2 buổi">2 buổi</option>
                <option value="3 buổi">3 buổi</option>
                <option value="4+ buổi">4+ buổi</option>
              </select>
            </div>
            <div className="flex flex-col gap-xs">
              <label className="font-label-sm text-label-sm text-on-surface-variant" htmlFor="durationPerSession">Thời gian / buổi</label>
              <select id="durationPerSession" value={formData.durationPerSession || "90 phút"} onChange={handleChange} className="w-full rounded-lg border-outline-variant bg-surface py-2 px-3 text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none">
                <option value="60 phút">60 phút</option>
                <option value="90 phút">90 phút</option>
                <option value="120 phút">120 phút</option>
              </select>
            </div>
            <div className="flex flex-col gap-xs">
              <label className="font-label-sm text-label-sm text-on-surface-variant" htmlFor="startTimePreference">Thời gian bắt đầu</label>
              <select id="startTimePreference" value={formData.startTimePreference || "Bắt đầu từ tuần tới"} onChange={handleChange} className="w-full rounded-lg border-outline-variant bg-surface py-2 px-3 text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none">
                <option value="Càng sớm càng tốt">Càng sớm càng tốt</option>
                <option value="Bắt đầu từ tuần tới">Bắt đầu từ tuần tới</option>
                <option value="Tháng sau">Tháng sau</option>
              </select>
            </div>
            <div className="flex flex-col gap-xs">
              <label className="font-label-sm text-label-sm text-on-surface-variant" htmlFor="scheduleFlexibility">Chính sách linh hoạt</label>
              <select id="scheduleFlexibility" value={formData.scheduleFlexibility || "Đổi lịch trước 24h"} onChange={handleChange} className="w-full rounded-lg border-outline-variant bg-surface py-2 px-3 text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none">
                <option value="Cố định">Cố định</option>
                <option value="Đổi lịch trước 24h">Đổi lịch trước 24h</option>
                <option value="Linh hoạt hoàn toàn">Linh hoạt hoàn toàn</option>
              </select>
            </div>
          </div>
        </section>

        {/* Ngân sách */}
        <section className="bg-surface-container-lowest p-xl rounded-xl border border-outline-variant/50 shadow-sm">
          <h3 className="font-headline-sm text-headline-sm text-on-surface mb-lg flex items-center gap-sm">
            <span className="material-symbols-outlined text-secondary">payments</span>
            Ngân sách dự kiến
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-xl">
            <div>
              <div className="flex items-center gap-md mb-sm">
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-body-md text-on-surface-variant">₫</span>
                  <input 
                    id="budgetMin"
                    type="number" 
                    value={formData.budgetMin || "200000"}
                    onChange={handleChange}
                    className="w-full pl-8 pr-3 py-3 rounded-lg border-outline-variant bg-surface text-body-md text-center focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-label-sm text-label-sm text-on-surface-variant">Tối thiểu</span>
                </div>
                <span className="text-outline-variant material-symbols-outlined">remove</span>
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-body-md text-on-surface-variant">₫</span>
                  <input 
                    id="budgetMax"
                    type="number" 
                    value={formData.budgetMax || "300000"}
                    onChange={handleChange}
                    className="w-full pl-8 pr-3 py-3 rounded-lg border-outline-variant bg-surface text-body-md text-center focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-label-sm text-label-sm text-on-surface-variant">Tối đa</span>
                </div>
              </div>
              <p className="font-label-sm text-label-sm text-on-surface-variant text-center">Đơn vị: VNĐ / buổi học</p>
            </div>
            
            <div className="flex flex-col gap-sm justify-center">
              <label className="flex items-center gap-sm cursor-pointer group">
                <input 
                  id="canIncreaseBudget"
                  type="checkbox" 
                  checked={formData.canIncreaseBudget}
                  onChange={handleChange}
                  className="w-5 h-5 rounded text-primary focus:ring-primary border-outline-variant" 
                />
                <span className="font-body-md text-body-md text-on-surface group-hover:text-primary transition-colors">Có thể tăng tối đa 10% nếu gặp gia sư xuất sắc</span>
              </label>
              <label className="flex items-center gap-sm cursor-pointer group">
                <input 
                  id="trialLessonWanted"
                  type="checkbox" 
                  checked={formData.trialLessonWanted}
                  onChange={handleChange}
                  className="w-5 h-5 rounded text-primary focus:ring-primary border-outline-variant" 
                />
                <span className="font-body-md text-body-md text-on-surface group-hover:text-primary transition-colors">Muốn học thử 1 buổi (tối đa 200.000đ)</span>
              </label>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
