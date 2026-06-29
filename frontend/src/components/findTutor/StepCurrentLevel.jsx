import React from 'react';

const levels = [
  { value: "mat_can_ban", label: "Mất căn bản", icon: "warning" },
  { value: "co_ban", label: "Cơ bản", icon: "book" },
  { value: "kha", label: "Khá", icon: "trending_up" },
  { value: "nang_cao", label: "Nâng cao", icon: "star" },
];

const availableDifficulties = [
  "Không biết bắt đầu giải bài", "Khó nhớ công thức", "Làm bài chậm", "Sợ môn học này", "Không tập trung"
];

const selfStudyOptions = [
  { value: "can_huong_dan_sat", label: "Cần được hướng dẫn sát" },
  { value: "tu_lam_bai_de", label: "Có thể tự làm bài tập dễ" },
  { value: "chi_can_dinh_huong", label: "Chỉ cần định hướng" },
];

const learningSpeeds = [
  { value: "cham_ma_chac", label: "Chậm mà chắc" },
  { value: "binh_thuong", label: "Tốc độ bình thường" },
  { value: "nhanh", label: "Nhanh, tập trung giải đề" },
];

export function StepCurrentLevel({ formData, setFormData, errors = {} }) {
  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const toggleDifficulty = (diff) => {
    setFormData(prev => {
      const isSelected = prev.difficulties.includes(diff);
      if (isSelected) {
        return { ...prev, difficulties: prev.difficulties.filter(d => d !== diff) };
      } else {
        return { ...prev, difficulties: [...prev.difficulties, diff] };
      }
    });
  };

  return (
    <>
      <header className="mb-xl text-center md:text-left">
        <h1 className="font-headline-lg text-headline-lg text-on-background mb-sm">Bạn đang ở mức độ nào?</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">Thông tin này giúp hệ thống tìm gia sư có kinh nghiệm phù hợp với tình trạng hiện tại của bạn.</p>
      </header>

      <div className="space-y-xl">
        {/* Section: Mức độ hiện tại */}
        <section className="bg-surface rounded-xl p-lg shadow-sm">
          <h3 className="font-headline-sm text-headline-sm mb-md">Mức độ hiện tại của môn học</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
            {levels.map(lvl => {
              const isActive = formData.currentLevel === lvl.value;
              return (
                <button 
                  key={lvl.value}
                  onClick={() => setFormData(prev => ({ ...prev, currentLevel: lvl.value }))}
                  className={`flex flex-col items-center justify-center p-md rounded-xl transition-colors ${
                    isActive 
                      ? 'border-2 border-primary bg-primary-fixed-dim text-on-primary-fixed' 
                      : 'border border-outline-variant bg-surface text-on-surface hover:bg-surface-variant'
                  }`}
                >
                  <span className={`material-symbols-outlined mb-sm ${isActive ? 'text-primary' : 'text-on-surface-variant'}`} style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>
                    {lvl.icon}
                  </span>
                  <span className={`font-label-md text-label-md ${isActive ? 'font-bold' : ''}`}>
                    {lvl.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Section: Điểm số */}
        <section className="bg-surface rounded-xl p-lg shadow-sm">
          <h3 className="font-headline-sm text-headline-sm mb-md">Điểm số tham khảo</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
            <div>
              <label className="block font-label-md text-label-md text-on-surface-variant mb-xs" htmlFor="recentAverageScore">Điểm trung bình học kỳ gần nhất <span className="text-error">*</span></label>
              <input 
                id="recentAverageScore"
                type="number" min="0" max="10" step="0.1" 
                value={formData.recentAverageScore}
                onChange={handleChange}
                placeholder="VD: 5.5"
                className={`w-full bg-surface border rounded-lg p-md focus:ring-1 focus:outline-none transition-all font-body-md text-on-surface ${errors.recentAverageScore ? 'border-error focus:border-error focus:ring-error' : 'border-outline-variant focus:border-primary focus:ring-primary'}`} 
              />
              {errors.recentAverageScore && <span className="text-error text-sm mt-1 block animate-fade-in">{errors.recentAverageScore}</span>}
            </div>
            <div>
              <label className="block font-label-md text-label-md text-on-surface-variant mb-xs" htmlFor="recentTestScore">Điểm bài kiểm tra mới nhất (tùy chọn)</label>
              <input 
                id="recentTestScore"
                type="number" min="0" max="10" step="0.1" 
                value={formData.recentTestScore}
                onChange={handleChange}
                placeholder="VD: 6.0" 
                className="w-full bg-surface border border-outline-variant rounded-lg p-md focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all font-body-md text-on-surface" 
              />
            </div>
          </div>
        </section>

        {/* Section: Khó khăn */}
        <section className="bg-surface rounded-xl p-lg shadow-sm">
          <h3 className="font-headline-sm text-headline-sm mb-md">Khó khăn đang gặp phải</h3>
          <div className="flex flex-wrap gap-sm">
            {availableDifficulties.map(diff => {
              const isSelected = formData.difficulties?.includes(diff);
              return (
                <button 
                  key={diff}
                  onClick={() => toggleDifficulty(diff)}
                  className={`px-md py-sm rounded-full font-label-md text-label-md transition-colors flex items-center gap-xs ${
                    isSelected 
                      ? 'bg-primary-fixed text-on-primary-fixed-variant border border-primary' 
                      : 'bg-surface border border-outline-variant text-on-surface-variant hover:bg-surface-variant'
                  }`}
                >
                  {isSelected && <span className="material-symbols-outlined text-[18px]">check</span>}
                  {diff}
                </button>
              );
            })}
          </div>
        </section>

        {/* Section: Tốc độ và Tự học */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-lg">
          <div className="bg-surface rounded-xl p-lg shadow-sm">
            <h3 className="font-headline-sm text-headline-sm mb-md">Khả năng tự học</h3>
            <div className="space-y-sm">
              {selfStudyOptions.map(opt => (
                <label key={opt.value} className={`flex items-center gap-md p-md rounded-lg cursor-pointer transition-colors ${formData.selfStudyAbility === opt.value ? 'border border-primary bg-primary-fixed-dim' : 'border border-outline-variant hover:bg-surface-variant'}`}>
                  <input 
                    type="radio" 
                    name="tu-hoc" 
                    className="w-5 h-5 text-primary border-outline-variant focus:ring-primary"
                    checked={formData.selfStudyAbility === opt.value}
                    onChange={() => setFormData(prev => ({ ...prev, selfStudyAbility: opt.value }))}
                  />
                  <span className="font-body-md text-on-surface">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-surface rounded-xl p-lg shadow-sm">
            <h3 className="font-headline-sm text-headline-sm mb-md">Tốc độ tiếp thu mong muốn</h3>
            <div className="space-y-sm">
              {learningSpeeds.map(opt => (
                <label key={opt.value} className={`flex items-center gap-md p-md rounded-lg cursor-pointer transition-colors ${formData.learningSpeed === opt.value ? 'border border-primary bg-primary-fixed-dim' : 'border border-outline-variant hover:bg-surface-variant'}`}>
                  <input 
                    type="radio" 
                    name="toc-do" 
                    className="w-5 h-5 text-primary border-outline-variant focus:ring-primary"
                    checked={formData.learningSpeed === opt.value}
                    onChange={() => setFormData(prev => ({ ...prev, learningSpeed: opt.value }))}
                  />
                  <span className="font-body-md text-on-surface">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
