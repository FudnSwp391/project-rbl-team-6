import React from 'react';

const mandatoryConditions = [
  { id: 'subject', label: 'Đúng môn học' },
  { id: 'schedule', label: 'Lịch học phù hợp' },
  { id: 'budget', label: 'Ngân sách' },
  { id: 'location', label: 'Khu vực' },
  { id: 'verify', label: 'Xác minh danh tính/bằng cấp' },
  { id: 'expertise', label: 'Chuyên môn phù hợp' }
];

const availablePriorities = [
  { id: 'style', title: 'Phong cách giảng dạy dễ hiểu', desc: 'Kiên nhẫn, giải thích cặn kẽ từng bước' },
  { id: 'experience', title: 'Kinh nghiệm dạy học sinh phù hợp', desc: 'Có phương pháp truyền đạt tốt' },
  { id: 'flexibility', title: 'Sự linh hoạt trong lịch học', desc: 'Có thể sắp xếp bù buổi nếu bận đột xuất' },
  { id: 'budget', title: 'Học phí ưu đãi / Giá rẻ', desc: 'Ưu tiên các gia sư có mức học phí tốt nhất' },
  { id: 'start_soon', title: 'Có thể bắt đầu học ngay', desc: 'Không cần chờ đợi xếp lịch quá lâu' },
  { id: 'achievement', title: 'Thành tích học tập xuất sắc', desc: 'Gia sư từng đạt giải thưởng, học sinh giỏi quốc gia' },
  { id: 'distance', title: 'Gần khu vực sống', desc: 'Tiện lợi cho việc di chuyển (áp dụng học trực tiếp)' }
];

export function StepPriorityReview({ formData, setFormData }) {
  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const togglePriority = (priorityId) => {
    setFormData(prev => {
      const current = prev.tutorPriority || [];
      if (current.includes(priorityId)) {
        return { ...prev, tutorPriority: current.filter(id => id !== priorityId) };
      } else {
        if (current.length >= 3) return prev; // Max 3
        return { ...prev, tutorPriority: [...current, priorityId] };
      }
    });
  };

  return (
    <>
      <div className="mb-xl">
        <span className="font-label-sm text-label-sm text-secondary uppercase tracking-widest mb-xs block">Bước 6 / 6</span>
        <h1 className="font-headline-lg text-headline-lg md:font-display-lg md:text-display-lg text-on-surface mb-sm">Điều gì quan trọng nhất với bạn?</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">EduX sẽ đối chiếu các yêu cầu của bạn với những gia sư đang hoạt động để xếp hạng các lựa chọn phù hợp nhất.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
        {/* Mandatory Conditions Panel (Left) */}
        <div className="lg:col-span-5 bg-surface rounded-2xl p-lg shadow-sm border border-surface-variant flex flex-col h-full">
          <div className="flex items-center gap-sm mb-md pb-sm border-b border-surface-variant">
            <span className="material-symbols-outlined text-primary">rule</span>
            <h3 className="font-headline-sm text-headline-sm text-on-surface">Điều kiện bắt buộc</h3>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant mb-md">Những yếu tố bạn không thể thỏa hiệp.</p>
          <div className="flex flex-col gap-sm flex-1">
            {mandatoryConditions.map(cond => (
              <div key={cond.id} className="flex items-start gap-3 p-3 rounded-xl border border-outline-variant bg-surface-bright">
                <input type="checkbox" checked readOnly className="mt-1 w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary focus:ring-offset-surface-bright" />
                <div>
                  <span className="font-label-md text-label-md text-on-surface block">{cond.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Priority Ranking & Notes Panel (Right) */}
        <div className="lg:col-span-7 flex flex-col gap-lg h-full">
          {/* Priority Ranking */}
          <div className="bg-surface rounded-2xl p-lg shadow-sm border border-surface-variant flex-1">
            <div className="flex items-center gap-sm mb-md pb-sm border-b border-surface-variant">
              <span className="material-symbols-outlined text-secondary">sort</span>
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Tiêu chí ưu tiên hàng đầu</h3>
              <span className="ml-auto bg-surface-variant text-on-surface-variant px-2 py-1 rounded-full font-label-sm text-label-sm">Chọn tối đa 3</span>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant mb-md">Chọn và sắp xếp theo mức độ quan trọng.</p>
            <div className="flex flex-col gap-sm">
              {availablePriorities.map((pri) => {
                const isSelected = formData.tutorPriority?.includes(pri.id);
                const rank = formData.tutorPriority?.indexOf(pri.id) + 1;
                return (
                  <div 
                    key={pri.id}
                    onClick={() => togglePriority(pri.id)}
                    className={`flex items-center gap-4 p-4 rounded-xl transition-colors cursor-pointer ${
                      isSelected 
                        ? 'border-l-4 border-primary bg-primary-fixed/20 shadow-sm border border-outline-variant' 
                        : 'border border-outline-variant bg-surface-bright hover:border-primary'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      isSelected ? 'bg-primary text-on-primary' : 'bg-surface-variant text-on-surface-variant'
                    }`}>
                      {isSelected ? rank : ''}
                    </div>
                    <div className="flex-1">
                      <span className="font-label-md text-label-md text-on-surface block">{pri.title}</span>
                      <span className="font-body-md text-body-md text-on-surface-variant text-sm">{pri.desc}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Additional Notes */}
          <div className="bg-surface rounded-2xl p-lg shadow-sm border border-surface-variant">
            <div className="flex items-center gap-sm mb-md">
              <span className="material-symbols-outlined text-outline">edit_note</span>
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Ghi chú thêm cho gia sư (Tùy chọn)</h3>
            </div>
            <textarea 
              id="finalNote"
              value={formData.finalNote}
              onChange={handleChange}
              className="w-full rounded-xl border-outline-variant focus:border-primary focus:ring focus:ring-primary-fixed focus:ring-opacity-50 p-4 font-body-md text-body-md placeholder-outline transition-all" 
              placeholder="Em học chậm và dễ mất tập trung, mong gia sư kiên nhẫn và thường xuyên kiểm tra lại kiến thức cũ." 
              rows="3"
            ></textarea>
          </div>
        </div>
      </div>

      <div className="mt-lg bg-surface-container-low rounded-2xl p-lg border border-primary-fixed flex items-center gap-md">
        <div className="w-12 h-12 rounded-full bg-primary-fixed text-primary flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>magic_button</span>
        </div>
        <div>
          <h4 className="font-headline-sm text-headline-sm text-on-surface mb-1">Bạn đã gần hoàn tất hồ sơ!</h4>
          <p className="font-body-md text-body-md text-on-surface-variant">Bấm tiếp tục để xem lại tổng thể yêu cầu của bạn trước khi gửi hệ thống.</p>
        </div>
      </div>
    </>
  );
}
