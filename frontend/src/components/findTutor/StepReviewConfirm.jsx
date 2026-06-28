import React from 'react';

export function StepReviewConfirm({ formData, setFormData, setCurrentStep, user }) {
  const handleChange = (e) => {
    const { checked } = e.target;
    setFormData(prev => ({ ...prev, isConfirmed: checked }));
  };

  const getSubjectLabel = (val) => {
    const map = { toan: 'Toán học', ly: 'Vật lý', hoa: 'Hóa học', anh: 'Tiếng Anh', van: 'Ngữ Văn' };
    return map[val] || val || 'Chưa chọn';
  };

  const getLevelLabel = (val) => {
    const map = { cap1: 'Cấp 1', cap2: 'Cấp 2', cap3: 'Cấp 3' };
    return map[val] || val || 'Chưa chọn';
  };

  const renderAvailableTimes = (times) => {
    if (!times || !times.length) return 'Chưa chọn';
    const dayLabels = {
      'monday': 'Thứ 2', 'tuesday': 'Thứ 3', 'wednesday': 'Thứ 4',
      'thursday': 'Thứ 5', 'friday': 'Thứ 6', 'saturday': 'Thứ 7', 'sunday': 'Chủ nhật'
    };
    if (typeof times[0] === 'string') return times.join(', ');
    return times.map(t => `${dayLabels[t.day] || t.day} (${t.start} - ${t.end})`).join(', ');
  };

  return (
    <>
      <div className="mb-xl flex flex-col md:flex-row md:items-end justify-between gap-md">
        <div>
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary">Kiểm tra lại nhu cầu của bạn</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-sm max-w-2xl">
            Vui lòng xem lại các thông tin bên dưới. Một hồ sơ chính xác sẽ giúp EduX tìm được gia sư phù hợp nhất với mục tiêu của bạn.
          </p>
        </div>
        <div className="bg-surface-container-low px-md py-sm rounded-lg flex items-center gap-sm self-start md:self-auto border border-outline-variant/30">
          <span className="material-symbols-outlined text-primary text-[20px]">person_outline</span>
          <span className="font-label-md text-label-md text-on-surface-variant">Hồ sơ: Lớp {formData.grade || '10'}</span>
        </div>
      </div>

      <div className="bg-secondary-fixed text-on-secondary-fixed p-md rounded-xl mb-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-md border border-outline-variant/20">
        <div className="flex items-center gap-md">
          <div className="relative w-12 h-12 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path className="text-surface-container-high" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3"></path>
              <path className="text-primary" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray="100, 100" strokeWidth="3"></path>
            </svg>
            <span className="absolute text-label-sm font-bold">100%</span>
          </div>
          <div>
            <h3 className="font-headline-sm text-headline-sm">Hồ sơ nhu cầu đã hoàn thành 100%</h3>
            <p className="font-body-md text-body-md mt-xs opacity-80">Thông tin càng đầy đủ, hệ thống càng có nhiều dữ liệu để xếp hạng gia sư sát với nhu cầu của bạn.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-lg mb-xl">
        {/* Card 1: Môn học */}
        <div className="bg-surface-container-lowest rounded-[16px] p-lg shadow-sm transition-shadow relative overflow-hidden border border-outline-variant/30 hover:border-primary/30">
          <div className="flex justify-between items-start mb-md">
            <div className="flex items-center gap-sm">
              <div className="w-10 h-10 rounded-full bg-primary-fixed/50 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[20px]">menu_book</span>
              </div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Môn học</h3>
            </div>
            <button onClick={() => setCurrentStep(1)} className="text-secondary hover:text-primary px-sm py-xs rounded-full hover:bg-surface-container-low transition-colors flex items-center gap-xs font-label-sm text-label-sm">
              <span className="material-symbols-outlined text-[18px]">edit</span>
              <span className="hidden md:inline">Chỉnh sửa</span>
            </button>
          </div>
          <div className="flex flex-wrap gap-sm mt-sm">
            <span className="bg-secondary-fixed text-on-secondary-fixed font-label-md text-label-md px-md py-xs rounded-full">{getSubjectLabel(formData.subject)} - Lớp {formData.grade}</span>
            <span className="bg-surface-container-high text-on-surface-variant font-label-md text-label-md px-md py-xs rounded-full">{formData.curriculum || 'Chưa chọn'}</span>
          </div>
        </div>

        {/* Card 2: Trình độ */}
        <div className="bg-surface-container-lowest rounded-[16px] p-lg shadow-sm transition-shadow relative overflow-hidden border border-outline-variant/30 hover:border-primary/30">
          <div className="flex justify-between items-start mb-md">
            <div className="flex items-center gap-sm">
              <div className="w-10 h-10 rounded-full bg-primary-fixed/50 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[20px]">trending_down</span>
              </div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Trình độ</h3>
            </div>
            <button onClick={() => setCurrentStep(2)} className="text-secondary hover:text-primary px-sm py-xs rounded-full hover:bg-surface-container-low transition-colors flex items-center gap-xs font-label-sm text-label-sm">
              <span className="material-symbols-outlined text-[18px]">edit</span>
              <span className="hidden md:inline">Chỉnh sửa</span>
            </button>
          </div>
          <div className="flex flex-col mt-sm gap-sm">
            <div>
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-xs block">Trạng thái</span>
              <span className="font-body-md text-body-md text-error flex items-center gap-xs font-semibold">
                <span className="material-symbols-outlined text-[16px]">warning</span>
                Điểm hiện tại: {formData.recentAverageScore}/10
              </span>
            </div>
            <div className="flex flex-wrap gap-xs">
              {(formData.weaknesses || []).map(w => (
                <span key={w} className="bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm px-sm py-xs rounded-md">{w}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Card 3: Mục tiêu */}
        <div className="bg-surface-container-lowest rounded-[16px] p-lg shadow-sm transition-shadow relative overflow-hidden border border-outline-variant/30 hover:border-primary/30">
          <div className="flex justify-between items-start mb-md">
            <div className="flex items-center gap-sm">
              <div className="w-10 h-10 rounded-full bg-primary-fixed/50 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[20px]">flag</span>
              </div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Mục tiêu</h3>
            </div>
            <button onClick={() => setCurrentStep(3)} className="text-secondary hover:text-primary px-sm py-xs rounded-full hover:bg-surface-container-low transition-colors flex items-center gap-xs font-label-sm text-label-sm">
              <span className="material-symbols-outlined text-[18px]">edit</span>
              <span className="hidden md:inline">Chỉnh sửa</span>
            </button>
          </div>
          <div className="flex flex-col mt-sm gap-sm">
            <div>
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-xs block">Mục tiêu đầu ra</span>
              <span className="font-headline-md text-headline-md text-primary font-bold">{formData.targetScore}/10 <span className="font-body-md text-body-md font-normal text-on-surface-variant">trong {formData.examType || '?'} tháng</span></span>
            </div>
            <ul className="list-disc list-inside font-body-md text-body-md text-on-surface">
              {(formData.learningGoals || []).map((goal, i) => <li key={i}>{goal}</li>)}
            </ul>
          </div>
        </div>

        {/* Card 4: Phong cách (Wide) */}
        <div className="bg-surface-container-lowest rounded-[16px] p-lg shadow-sm transition-shadow relative overflow-hidden border border-outline-variant/30 hover:border-primary/30 lg:col-span-2">
          <div className="flex justify-between items-start mb-md">
            <div className="flex items-center gap-sm">
              <div className="w-10 h-10 rounded-full bg-primary-fixed/50 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[20px]">psychology_alt</span>
              </div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Phong cách</h3>
            </div>
            <button onClick={() => setCurrentStep(4)} className="text-secondary hover:text-primary px-sm py-xs rounded-full hover:bg-surface-container-low transition-colors flex items-center gap-xs font-label-sm text-label-sm">
              <span className="material-symbols-outlined text-[18px]">edit</span>
              <span className="hidden md:inline">Chỉnh sửa</span>
            </button>
          </div>
          <div className="flex flex-wrap gap-sm mt-sm">
            {(formData.teachingStyle || []).map((style, i) => (
              <span key={i} className="flex items-center gap-xs border border-outline-variant/50 text-on-surface-variant font-label-md text-label-md px-md py-xs rounded-full bg-surface-bright">
                {style}
              </span>
            ))}
            {(formData.tutorPersonality || []).map((trait, i) => (
              <span key={i} className="flex items-center gap-xs border border-outline-variant/50 text-on-surface-variant font-label-md text-label-md px-md py-xs rounded-full bg-surface-bright">
                {trait}
              </span>
            ))}
          </div>
        </div>

        {/* Card 5: Địa điểm */}
        <div className="bg-surface-container-lowest rounded-[16px] p-lg shadow-sm transition-shadow relative overflow-hidden border border-outline-variant/30 hover:border-primary/30">
          <div className="flex justify-between items-start mb-md">
            <div className="flex items-center gap-sm">
              <div className="w-10 h-10 rounded-full bg-primary-fixed/50 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[20px]">location_on</span>
              </div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Địa điểm</h3>
            </div>
            <button onClick={() => setCurrentStep(5)} className="text-secondary hover:text-primary px-sm py-xs rounded-full hover:bg-surface-container-low transition-colors flex items-center gap-xs font-label-sm text-label-sm">
              <span className="material-symbols-outlined text-[18px]">edit</span>
              <span className="hidden md:inline">Chỉnh sửa</span>
            </button>
          </div>
          <div className="flex flex-col mt-sm gap-xs font-body-md text-body-md text-on-surface">
            <p>Hình thức: <strong>{formData.learningFormat === 'online' ? 'Trực tuyến' : formData.learningFormat === 'offline' ? 'Trực tiếp' : 'Cả hai'}</strong></p>
            {formData.learningFormat !== 'online' && (
              <>
                <p>Khu vực: <strong>{formData.district}, {formData.city}</strong></p>
                <p>Khoảng cách: <strong>Dưới {formData.searchRadius}km</strong></p>
                <p>Địa điểm học: <strong>{formData.locationPreference}</strong></p>
              </>
            )}
          </div>
        </div>

        {/* Card 6: Lịch học */}
        <div className="bg-surface-container-lowest rounded-[16px] p-lg shadow-sm transition-shadow relative overflow-hidden border border-outline-variant/30 hover:border-primary/30">
          <div className="flex justify-between items-start mb-md">
            <div className="flex items-center gap-sm">
              <div className="w-10 h-10 rounded-full bg-primary-fixed/50 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[20px]">schedule</span>
              </div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Lịch học</h3>
            </div>
            <button onClick={() => setCurrentStep(5)} className="text-secondary hover:text-primary px-sm py-xs rounded-full hover:bg-surface-container-low transition-colors flex items-center gap-xs font-label-sm text-label-sm">
              <span className="material-symbols-outlined text-[18px]">edit</span>
              <span className="hidden md:inline">Chỉnh sửa</span>
            </button>
          </div>
          <div className="flex flex-col mt-sm gap-xs font-body-md text-body-md text-on-surface">
            <p>Khung giờ: <strong>{renderAvailableTimes(formData.availableTimes)}</strong></p>
            <p>Tần suất: <strong>{formData.sessionsPerWeek}</strong> ({formData.durationPerSession})</p>
            <p>Bắt đầu: <strong>{formData.startTimePreference}</strong></p>
          </div>
        </div>

        {/* Card 7: Ngân sách */}
        <div className="bg-surface-container-lowest rounded-[16px] p-lg shadow-sm transition-shadow relative overflow-hidden border border-outline-variant/30 hover:border-primary/30">
          <div className="flex justify-between items-start mb-md">
            <div className="flex items-center gap-sm">
              <div className="w-10 h-10 rounded-full bg-primary-fixed/50 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[20px]">payments</span>
              </div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Ngân sách</h3>
            </div>
            <button onClick={() => setCurrentStep(5)} className="text-secondary hover:text-primary px-sm py-xs rounded-full hover:bg-surface-container-low transition-colors flex items-center gap-xs font-label-sm text-label-sm">
              <span className="material-symbols-outlined text-[18px]">edit</span>
              <span className="hidden md:inline">Chỉnh sửa</span>
            </button>
          </div>
          <div className="flex flex-col mt-sm gap-xs font-body-md text-body-md text-on-surface">
            <p>Học phí: <strong>{formData.budgetMin}–{formData.budgetMax}đ/buổi</strong></p>
            {formData.canIncreaseBudget && <p>Điều chỉnh: <strong>Tăng 10%</strong></p>}
            {formData.trialLessonWanted && <p>Học thử: <strong>Có</strong></p>}
          </div>
        </div>
      </div>

      {/* Contact Info (for Guests) */}
      {!user && (
        <div className="bg-surface-container-lowest p-lg rounded-[16px] mb-xl border border-outline-variant/30 shadow-sm">
          <h3 className="font-headline-sm text-headline-sm text-on-surface mb-md flex items-center gap-sm">
            <span className="material-symbols-outlined text-primary">contact_mail</span>
            Thông tin liên hệ (Tùy chọn)
          </h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant mb-md">
            Bạn đang là khách (chưa đăng nhập). Bạn có thể để lại thông tin liên hệ để EduX hỗ trợ bạn dễ dàng hơn, hoặc Đăng nhập để lưu vào tài khoản.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
            <div>
              <label className="font-label-sm text-label-sm text-on-surface block mb-xs">Họ và Tên</label>
              <input type="text" className="w-full bg-surface border border-outline-variant rounded-lg px-md py-sm font-body-md text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                     placeholder="Nguyễn Văn A" 
                     value={formData.contact_name || ''} 
                     onChange={e => setFormData({...formData, contact_name: e.target.value})} />
            </div>
            <div>
              <label className="font-label-sm text-label-sm text-on-surface block mb-xs">Số điện thoại</label>
              <input type="tel" className="w-full bg-surface border border-outline-variant rounded-lg px-md py-sm font-body-md text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                     placeholder="09..." 
                     value={formData.contact_phone || ''} 
                     onChange={e => setFormData({...formData, contact_phone: e.target.value})} />
            </div>
            <div>
              <label className="font-label-sm text-label-sm text-on-surface block mb-xs">Email</label>
              <input type="email" className="w-full bg-surface border border-outline-variant rounded-lg px-md py-sm font-body-md text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                     placeholder="email@example.com" 
                     value={formData.contact_email || ''} 
                     onChange={e => setFormData({...formData, contact_email: e.target.value})} />
            </div>
          </div>
        </div>
      )}

      {/* Checkbox Confirmation */}
      <div className="bg-surface-container-low p-md rounded-xl flex items-start gap-md mb-xl border border-outline-variant/30">
        <div className="flex items-center h-6">
          <input 
            type="checkbox" 
            checked={formData.isConfirmed || false}
            onChange={handleChange}
            className="w-5 h-5 text-primary border-outline-variant rounded focus:ring-primary focus:ring-2 cursor-pointer" 
            id="confirm-checkbox"
          />
        </div>
        <label className="font-body-md text-body-md text-on-surface cursor-pointer" htmlFor="confirm-checkbox">
          Tôi xác nhận các thông tin trên là chính xác và đồng ý để EduX sử dụng nhằm đề xuất gia sư phù hợp.
        </label>
      </div>
    </>
  );
}
