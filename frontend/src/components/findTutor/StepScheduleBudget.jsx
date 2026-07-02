import { useState, useEffect } from 'react';

const WEEK_DAYS = [
  { id: 'monday', label: 'Thứ 2' },
  { id: 'tuesday', label: 'Thứ 3' },
  { id: 'wednesday', label: 'Thứ 4' },
  { id: 'thursday', label: 'Thứ 5' },
  { id: 'friday', label: 'Thứ 6' },
  { id: 'saturday', label: 'Thứ 7' },
  { id: 'sunday', label: 'Chủ nhật' }
];

const locationPreferences = [
  'Tại nhà học sinh',
  'Tại nhà gia sư',
  'Tại quán cà phê / thư viện',
  'Linh hoạt'
];

export function StepScheduleBudget({ formData, setFormData, errors = {} }) {
  const [cities, setCities] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);

  useEffect(() => {
    fetch('https://provinces.open-api.vn/api/?depth=1')
      .then(res => res.json())
      .then(data => setCities(data))
      .catch(err => console.error('Error fetching cities:', err));
  }, []);

  useEffect(() => {
    const selectedCity = cities.find(c => c.name === formData.city);
    if (selectedCity) {
      fetch(`https://provinces.open-api.vn/api/p/${selectedCity.code}?depth=2`)
        .then(res => res.json())
        .then(data => setDistricts(data.districts || []))
        .catch(err => console.error('Error fetching districts:', err));
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDistricts([]);
    }
  }, [formData.city, cities]);

  useEffect(() => {
    const selectedDistrict = districts.find(d => d.name === formData.district);
    if (selectedDistrict) {
      fetch(`https://provinces.open-api.vn/api/d/${selectedDistrict.code}?depth=2`)
        .then(res => res.json())
        .then(data => setWards(data.wards || []))
        .catch(err => console.error('Error fetching wards:', err));
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWards([]);
    }
  }, [formData.district, districts]);

  const handleCityChange = (e) => {
    setFormData(prev => ({ ...prev, city: e.target.value, district: "", ward: "" }));
  };

  const handleDistrictChange = (e) => {
    setFormData(prev => ({ ...prev, district: e.target.value, ward: "" }));
  };
  const handleChange = (e) => {
    const { id, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [id]: type === 'checkbox' ? checked : value 
    }));
  };

  const handleAddSlot = (dayId) => {
    setFormData(prev => ({
      ...prev,
      availableTimes: [...(prev.availableTimes || []), { day: dayId, start: '18:00', end: '20:00' }]
    }));
  };

  const handleRemoveSlot = (index) => {
    setFormData(prev => ({
      ...prev,
      availableTimes: (prev.availableTimes || []).filter((_, i) => i !== index)
    }));
  };

  const handleUpdateSlot = (index, field, value) => {
    setFormData(prev => {
      const newTimes = [...(prev.availableTimes || [])];
      newTimes[index] = { ...newTimes[index], [field]: value };
      return { ...prev, availableTimes: newTimes };
    });
  };

  const isDaySelected = (dayId) => {
    return (formData.availableTimes || []).some(t => t.day === dayId);
  };

  const toggleDay = (dayId) => {
    if (isDaySelected(dayId)) {
      // Bỏ check -> Xóa tất cả các slot của ngày này
      setFormData(prev => ({
        ...prev,
        availableTimes: (prev.availableTimes || []).filter(t => t.day !== dayId)
      }));
    } else {
      handleAddSlot(dayId);
    }
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
          <div className="flex items-center gap-xs mb-md">
            <h3 className="font-headline-sm text-headline-sm text-on-surface">Hình thức học</h3>
            <span className="text-error">*</span>
          </div>
          {errors.learningFormat && <p className="text-error text-sm mb-3 animate-fade-in">{errors.learningFormat}</p>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
            {formatOptions.map(opt => {
              const isActive = formData.learningFormat === opt.value;
              return (
                <label key={opt.value} className={`relative flex flex-col items-center justify-center p-xl rounded-xl border transition-all cursor-pointer group ${
                  isActive 
                    ? 'border-2 border-primary bg-primary-fixed-dim/20 shadow-[0_4px_20px_rgba(30,64,175,0.08)]' 
                    : errors.learningFormat 
                      ? 'border-error bg-error/5 hover:border-error text-error'
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
                <label className="font-label-sm text-label-sm text-on-surface-variant" htmlFor="city">Tỉnh/Thành phố <span className="text-error">*</span></label>
                <select id="city" value={formData.city || ""} onChange={handleCityChange} className={`w-full rounded-lg border bg-surface py-3 px-4 text-body-md outline-none transition-colors ${errors.city ? 'border-error focus:border-error focus:ring-1 focus:ring-error' : 'border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary'}`}>
                  <option value="">Chọn Tỉnh/Thành phố</option>
                  {cities.map(c => <option key={c.code} value={c.name}>{c.name}</option>)}
                </select>
                {errors.city && <span className="text-error text-sm mt-1 animate-fade-in">{errors.city}</span>}
              </div>
              <div className="flex flex-col gap-xs">
                <label className="font-label-sm text-label-sm text-on-surface-variant" htmlFor="district">Quận/Huyện <span className="text-error">*</span></label>
                <select id="district" value={formData.district || ""} onChange={handleDistrictChange} disabled={!districts.length} className={`w-full rounded-lg border bg-surface py-3 px-4 text-body-md outline-none disabled:opacity-50 transition-colors ${errors.district ? 'border-error focus:border-error focus:ring-1 focus:ring-error' : 'border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary'}`}>
                  <option value="">Chọn Quận/Huyện</option>
                  {districts.map(c => <option key={c.code} value={c.name}>{c.name}</option>)}
                </select>
                {errors.district && <span className="text-error text-sm mt-1 animate-fade-in">{errors.district}</span>}
              </div>
              <div className="flex flex-col gap-xs">
                <label className="font-label-sm text-label-sm text-on-surface-variant" htmlFor="ward">Phường/Xã</label>
                <select id="ward" value={formData.ward || ""} onChange={handleChange} disabled={!wards.length} className="w-full rounded-lg border-outline-variant bg-surface py-3 px-4 text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none disabled:opacity-50">
                  <option value="">Chọn Phường/Xã</option>
                  {wards.map(c => <option key={c.code} value={c.name}>{c.name}</option>)}
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
        <section className={`bg-surface-container-lowest p-xl rounded-xl border ${errors.availableTimes ? 'border-error' : 'border-outline-variant/50'} shadow-sm`}>
          <div className="flex flex-col mb-lg">
            <h3 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-sm">
              <span className="material-symbols-outlined text-secondary">calendar_month</span>
              Khung giờ có thể học <span className="text-error">*</span>
            </h3>
            {errors.availableTimes && <p className="text-error text-sm mt-2 animate-fade-in">{errors.availableTimes}</p>}
          </div>
          
          <div className="flex flex-col gap-md">
            {WEEK_DAYS.map(day => {
              const selected = isDaySelected(day.id);
              const daySlots = (formData.availableTimes || []).map((t, index) => ({ ...t, originalIndex: index })).filter(t => t.day === day.id);
              
              return (
                <div key={day.id} className={`p-4 rounded-xl border transition-colors ${selected ? 'border-primary bg-primary-fixed-dim/10' : 'border-outline-variant bg-surface'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center gap-sm cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={selected}
                        onChange={() => toggleDay(day.id)}
                        className="w-5 h-5 rounded text-primary focus:ring-primary border-outline"
                      />
                      <span className="font-label-md text-label-md font-bold text-on-surface">{day.label}</span>
                    </label>
                    {selected && (
                      <button 
                        type="button"
                        onClick={() => handleAddSlot(day.id)}
                        className="text-label-sm font-label-sm text-primary hover:text-primary-hover flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[18px]">add</span>
                        Thêm khung giờ
                      </button>
                    )}
                  </div>
                  
                  {selected && daySlots.length > 0 && (
                    <div className="flex flex-col gap-sm mt-3 ml-8">
                      {daySlots.map(slot => (
                        <div key={slot.originalIndex} className="flex flex-wrap items-center gap-sm">
                          <div className="flex items-center gap-2 bg-surface border border-outline-variant rounded-lg px-3 py-1.5">
                            <span className="text-body-sm text-on-surface-variant">Từ:</span>
                            <input 
                              type="time" 
                              value={slot.start || ''}
                              onChange={(e) => handleUpdateSlot(slot.originalIndex, 'start', e.target.value)}
                              className="bg-transparent border-none outline-none text-body-md text-on-surface w-[130px]"
                            />
                          </div>
                          <span className="text-on-surface-variant">-</span>
                          <div className="flex items-center gap-2 bg-surface border border-outline-variant rounded-lg px-3 py-1.5">
                            <span className="text-body-sm text-on-surface-variant">Đến:</span>
                            <input 
                              type="time" 
                              value={slot.end || ''}
                              onChange={(e) => handleUpdateSlot(slot.originalIndex, 'end', e.target.value)}
                              className="bg-transparent border-none outline-none text-body-md text-on-surface w-[130px]"
                            />
                          </div>
                          
                          <button 
                            type="button"
                            onClick={() => handleRemoveSlot(slot.originalIndex)}
                            className="p-1 text-on-surface-variant hover:text-error hover:bg-error-container rounded-full transition-colors ml-auto"
                            title="Xóa khung giờ này"
                          >
                            <span className="material-symbols-outlined text-[18px]">close</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-lg pt-md border-t border-outline-variant/30">
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
              {/* Grid: [input] [—] [input] */}
              <div className="grid grid-cols-[1fr_auto_1fr] gap-md items-end mb-sm">
                {/* Cột trái: Tối thiểu */}
                <div className="relative">
                  <label htmlFor="budgetMin" className="block font-label-sm text-label-sm text-on-surface-variant mb-1.5 whitespace-nowrap">Tối thiểu (VNĐ/buổi) <span className="text-error">*</span></label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-body-md text-on-surface-variant pointer-events-none">₫</span>
                    <input 
                      id="budgetMin"
                      type="text" 
                      inputMode="numeric"
                      value={formData.budgetMin ? Number(formData.budgetMin).toLocaleString('vi-VN') : ''}
                      placeholder="200.000"
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, '');
                        setFormData(prev => ({ ...prev, budgetMin: raw }));
                      }}
                      className={`w-full pl-8 pr-3 py-3 rounded-lg border bg-surface text-body-md text-left outline-none transition-colors ${errors.budgetMin ? 'border-error focus:border-error focus:ring-1 focus:ring-error text-error bg-error/10' : 'border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary'}`} 
                    />
                  </div>
                  {errors.budgetMin && <span className="absolute -bottom-5 left-0 text-error text-[11px] animate-fade-in">{errors.budgetMin}</span>}
                </div>

                {/* Dấu gạch ngang ở giữa — căn theo input (không theo label) */}
                <span className="material-symbols-outlined text-outline-variant pb-3">remove</span>

                {/* Cột phải: Tối đa */}
                <div className="relative">
                  <label htmlFor="budgetMax" className="block font-label-sm text-label-sm text-on-surface-variant mb-1.5 whitespace-nowrap">Tối đa (VNĐ/buổi) <span className="text-error">*</span></label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-body-md text-on-surface-variant pointer-events-none">₫</span>
                    <input 
                      id="budgetMax"
                      type="text" 
                      inputMode="numeric"
                      value={formData.budgetMax ? Number(formData.budgetMax).toLocaleString('vi-VN') : ''}
                      placeholder="500.000"
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, '');
                        setFormData(prev => ({ ...prev, budgetMax: raw }));
                      }}
                      className={`w-full pl-8 pr-3 py-3 rounded-lg border bg-surface text-body-md text-left outline-none transition-colors ${errors.budgetMax ? 'border-error focus:border-error focus:ring-1 focus:ring-error text-error bg-error/10' : 'border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary'}`} 
                    />
                  </div>
                  {errors.budgetMax && <span className="absolute -bottom-5 left-0 text-error text-[11px] animate-fade-in">{errors.budgetMax}</span>}
                </div>
              </div>

              {formData.budgetMin && formData.budgetMax && Number(formData.budgetMin) > 0 && Number(formData.budgetMax) > 0 && (
                <p className="font-label-sm text-label-sm text-secondary text-center mt-sm">
                  Ngân sách: {Number(formData.budgetMin).toLocaleString('vi-VN')}đ — {Number(formData.budgetMax).toLocaleString('vi-VN')}đ / buổi
                </p>
              )}
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
