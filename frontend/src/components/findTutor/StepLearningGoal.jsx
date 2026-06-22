import React from 'react';

const availableGoals = [
  { value: "knowledge", label: "Lấy lại kiến thức nền", icon: "menu_book" },
  { value: "score", label: "Cải thiện điểm số trên lớp", icon: "trending_up" },
  { value: "exam", label: "Luyện thi Đại học / Chuyển cấp", icon: "school" },
  { value: "advance", label: "Ôn thi Học sinh giỏi", icon: "workspace_premium" },
];

const timelines = [
  { value: "1", label: "1 tháng" },
  { value: "2", label: "2 tháng" },
  { value: "3", label: "3 tháng" },
  { value: "4", label: "4 tháng" },
  { value: "6", label: "6 tháng" },
  { value: "12", label: "1 năm" },
  { value: "flexible", label: "Linh hoạt" },
];

const urgencies = [
  { value: "low", label: "Không gấp", desc: "Có thể đợi tìm gia sư chuẩn", icon: "coffee" },
  { value: "medium", label: "Muốn cải thiện sớm", desc: "Trong vòng 1-2 tuần tới", icon: "schedule" },
  { value: "high", label: "Cần bắt đầu ngay", desc: "Càng sớm càng tốt", icon: "local_fire_department" },
];

export function StepLearningGoal({ formData, setFormData }) {
  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const toggleGoal = (goalValue) => {
    setFormData(prev => {
      const isSelected = prev.learningGoals.includes(goalValue);
      if (isSelected) {
        return { ...prev, learningGoals: prev.learningGoals.filter(g => g !== goalValue) };
      } else {
        return { ...prev, learningGoals: [...prev.learningGoals, goalValue] };
      }
    });
  };

  return (
    <>
      {/* Context Header */}
      <div className="mb-xl max-w-3xl">
        <div className="flex items-center gap-sm mb-sm text-primary">
          <span className="material-symbols-outlined text-[32px]">target</span>
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg">Bạn muốn đạt được điều gì?</h1>
        </div>
        <p className="font-body-lg text-body-lg text-on-surface-variant">Mục tiêu càng cụ thể, kết quả matching càng chính xác. Điều này giúp chúng tôi tìm kiếm gia sư có thế mạnh phù hợp nhất với bạn.</p>
      </div>

      <div className="max-w-3xl space-y-2xl">
        {/* Section 1: Mục tiêu chính */}
        <section className="bg-surface-container-lowest rounded-xl p-lg md:p-xl shadow-sm border border-outline-variant/30">
          <div className="mb-md">
            <h2 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-xs">
              Mục tiêu chính <span className="text-error">*</span>
            </h2>
            <p className="font-label-md text-label-md text-on-surface-variant mt-xs">Chọn những mục tiêu quan trọng nhất đối với bạn.</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
            {availableGoals.map(goal => {
              const isSelected = formData.learningGoals?.includes(goal.value);
              return (
                <label key={goal.value} className="relative cursor-pointer group">
                  <input 
                    type="checkbox" 
                    className="peer sr-only" 
                    checked={isSelected}
                    onChange={() => toggleGoal(goal.value)}
                  />
                  <div className={`h-full border-2 rounded-lg p-md transition-all flex flex-col gap-sm ${
                    isSelected 
                      ? 'border-primary bg-surface-container-low text-primary' 
                      : 'border-outline-variant bg-surface hover:border-primary-fixed'
                  }`}>
                    <div className="flex justify-between items-start">
                      <span className={`material-symbols-outlined transition-colors ${isSelected ? 'text-primary' : 'text-outline-variant group-hover:text-primary'}`}>{goal.icon}</span>
                      <span className={`material-symbols-outlined text-primary transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0'}`}>check_circle</span>
                    </div>
                    <span className={`font-label-md text-label-md transition-colors ${isSelected ? 'text-primary' : 'text-on-surface group-hover:text-primary'}`}>{goal.label}</span>
                  </div>
                </label>
              );
            })}
          </div>
        </section>

        {/* Section 2: Điểm số & Thời hạn */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-xl">
          {/* Điểm số */}
          <section className="bg-surface-container-lowest rounded-xl p-lg shadow-sm border border-outline-variant/30 flex flex-col">
            <div className="mb-md">
              <h2 className="font-headline-sm text-headline-sm text-on-surface">Kỳ vọng điểm số</h2>
              <p className="font-label-md text-label-md text-on-surface-variant mt-xs">Hệ số 10</p>
            </div>
            <div className="flex items-center gap-md mt-auto">
              <div className="flex-1">
                <label className="block font-label-sm text-label-sm text-on-surface-variant mb-xs" htmlFor="current_score">Hiện tại</label>
                <input 
                  id="recentAverageScore"
                  type="number" min="0" max="10" step="0.5" 
                  value={formData.recentAverageScore}
                  readOnly
                  className="w-full bg-surface border border-outline-variant rounded-lg px-md py-sm font-body-md text-body-md text-on-surface opacity-70 cursor-not-allowed" 
                />
              </div>
              <div className="flex items-center justify-center pt-lg text-outline-variant">
                <span className="material-symbols-outlined">arrow_forward</span>
              </div>
              <div className="flex-1">
                <label className="block font-label-sm text-label-sm text-primary mb-xs font-semibold" htmlFor="targetScore">Mục tiêu</label>
                <input 
                  id="targetScore"
                  type="number" min="0" max="10" step="0.5" 
                  value={formData.targetScore}
                  onChange={handleChange}
                  className="w-full bg-primary-fixed/20 border border-primary text-primary rounded-lg px-md py-sm font-body-md text-body-md font-semibold focus:border-primary focus:ring-1 focus:ring-primary transition-colors" 
                />
              </div>
            </div>
          </section>

          {/* Thời hạn */}
          <section className="bg-surface-container-lowest rounded-xl p-lg shadow-sm border border-outline-variant/30 flex flex-col">
            <div className="mb-md">
              <h2 className="font-headline-sm text-headline-sm text-on-surface">Thời hạn mong muốn</h2>
              <p className="font-label-md text-label-md text-on-surface-variant mt-xs">Dự kiến đạt mục tiêu</p>
            </div>
            <div className="mt-auto relative">
              <select 
                id="examType"
                value={formData.examType || "4"}
                onChange={handleChange}
                className="w-full appearance-none bg-surface border border-outline-variant rounded-lg px-md py-sm font-body-md text-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary transition-colors cursor-pointer"
              >
                {timelines.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-md pointer-events-none text-outline-variant">
                <span className="material-symbols-outlined">expand_more</span>
              </div>
            </div>
          </section>
        </div>

        {/* Section 3: Mức độ cấp thiết */}
        <section className="bg-surface-container-lowest rounded-xl p-lg md:p-xl shadow-sm border border-outline-variant/30">
          <div className="mb-md">
            <h2 className="font-headline-sm text-headline-sm text-on-surface">Mức độ cấp thiết</h2>
            <p className="font-label-md text-label-md text-on-surface-variant mt-xs">Bạn muốn bắt đầu học khi nào?</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-md">
            {urgencies.map(urg => {
              const isSelected = formData.urgency === urg.value;
              return (
                <label key={urg.value} className="flex-1 relative cursor-pointer group">
                  <input 
                    type="radio" 
                    name="urgency" 
                    className="peer sr-only" 
                    checked={isSelected}
                    onChange={() => setFormData(prev => ({ ...prev, urgency: urg.value }))}
                  />
                  <div className={`h-full border rounded-lg p-md text-center transition-all ${
                    isSelected 
                      ? 'border-primary bg-surface-container-low' 
                      : 'border-outline-variant bg-surface hover:bg-surface-variant'
                  }`}>
                    <span className={`material-symbols-outlined block text-[28px] mb-xs transition-colors ${isSelected ? 'text-primary' : 'text-outline-variant'}`}>{urg.icon}</span>
                    <span className="font-label-md text-label-md text-on-surface block">{urg.label}</span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant mt-xs block opacity-70">{urg.desc}</span>
                  </div>
                </label>
              );
            })}
          </div>
        </section>

        {/* Section 4: Kết quả mong muốn */}
        <section className="bg-surface-container-lowest rounded-xl p-lg md:p-xl shadow-sm border border-outline-variant/30">
          <div className="mb-md">
            <h2 className="font-headline-sm text-headline-sm text-on-surface">Mô tả thêm về kết quả mong muốn (Tùy chọn)</h2>
            <p className="font-label-md text-label-md text-on-surface-variant mt-xs">Chia sẻ thêm về những thay đổi bạn muốn thấy ở bản thân sau khóa học.</p>
          </div>
          <textarea 
            id="goalNote"
            value={formData.goalNote}
            onChange={handleChange}
            className="w-full bg-surface border border-outline-variant rounded-lg p-md font-body-md text-body-md text-on-surface placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary transition-colors resize-y min-h-[120px]" 
            placeholder="Ví dụ: Em muốn tự tin hơn khi giải các bài toán hình học không gian, không còn bị tâm lý khi làm bài kiểm tra..."
          ></textarea>
        </section>
      </div>
    </>
  );
}
