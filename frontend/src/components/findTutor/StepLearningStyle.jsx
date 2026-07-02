import React from 'react';

const teachingStylesOptions = [
  "Giảng chậm và chi tiết",
  "Ví dụ thực tế",
  "Tập trung giải đề",
  "Lý thuyết ngắn gọn",
  "Sơ đồ tư duy"
];

const personalities = [
  "Kiên nhẫn",
  "Thân thiện",
  "Nghiêm khắc",
  "Hài hước",
  "Truyền cảm hứng"
];

const tutorTypes = [
  { value: "", label: "Không yêu cầu (Mặc định)" },
  { value: "Sinh viên", label: "Sinh viên" },
  { value: "Giáo viên", label: "Giáo viên" },
  { value: "Giảng viên", label: "Giảng viên" }
];

const genders = [
  { value: "", label: "Không yêu cầu" },
  { value: "Nam", label: "Nam" },
  { value: "Nữ", label: "Nữ" }
];

export function StepLearningStyle({ formData, setFormData }) {
  // Use array for multiple selection
  const selectedTeachingStyles = Array.isArray(formData.teachingStyle) ? formData.teachingStyle : [];
  const selectedPersonalities = Array.isArray(formData.tutorPersonality) ? formData.tutorPersonality : [];

  const toggleTeachingStyle = (style) => {
    setFormData(prev => {
      const current = Array.isArray(prev.teachingStyle) ? prev.teachingStyle : [];
      if (current.includes(style)) {
        return { ...prev, teachingStyle: current.filter(s => s !== style) };
      } else {
        if (current.length >= 4) return prev; // Max 4
        return { ...prev, teachingStyle: [...current, style] };
      }
    });
  };

  const togglePersonality = (trait) => {
    setFormData(prev => {
      const current = Array.isArray(prev.tutorPersonality) ? prev.tutorPersonality : [];
      if (current.includes(trait)) {
        return { ...prev, tutorPersonality: current.filter(t => t !== trait) };
      } else {
        if (current.length >= 4) return prev; // Max 4
        return { ...prev, tutorPersonality: [...current, trait] };
      }
    });
  };

  return (
    <>
      <header className="mb-xl text-center md:text-left">
        <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-background mb-sm">Bạn học tốt nhất theo cách nào?</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">Phong cách học và tính cách gia sư ảnh hưởng lớn đến hiệu quả học lâu dài.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl">
        <div className="lg:col-span-8 space-y-xl">
          {/* Section 1: Cách giảng phù hợp */}
          <section className="bg-surface/70 backdrop-blur-md rounded-xl p-lg shadow-[0_4px_20px_rgba(30,64,175,0.05)] border border-surface-container-high relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-secondary-fixed rounded-bl-full opacity-20 -z-10"></div>
            <div className="flex justify-between items-end mb-md">
              <div>
                <h3 className="font-headline-sm text-headline-sm text-on-background flex items-center gap-sm">
                  <span className="material-symbols-outlined text-primary">menu_book</span>
                  Cách giảng phù hợp
                </h3>
                <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Chọn tối đa 4 phương pháp giúp bạn tiếp thu tốt nhất.</p>
              </div>
              <span className="font-label-sm text-label-sm text-outline bg-surface-container px-sm py-xs rounded-full">{selectedTeachingStyles.length}/4</span>
            </div>
            
            <div className="flex flex-wrap gap-sm">
              {teachingStylesOptions.map(style => {
                const isSelected = selectedTeachingStyles.includes(style);
                return (
                  <label key={style} className="relative cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="peer sr-only" 
                      checked={isSelected}
                      onChange={() => toggleTeachingStyle(style)}
                    />
                    <div className={`inline-flex items-center px-md py-sm rounded-full border font-label-md text-label-md transition-colors ${
                      isSelected 
                        ? 'bg-secondary-fixed text-on-secondary-fixed border-primary-container' 
                        : 'border-outline-variant text-on-surface-variant hover:bg-surface-variant bg-surface'
                    }`}>
                      {style}
                    </div>
                  </label>
                );
              })}
            </div>
          </section>

          {/* Section 2: Phong cách gia sư */}
          <section className="bg-surface/70 backdrop-blur-md rounded-xl p-lg shadow-[0_4px_20px_rgba(30,64,175,0.05)] border border-surface-container-high">
            <div className="flex justify-between items-end mb-md">
              <div>
                <h3 className="font-headline-sm text-headline-sm text-on-background flex items-center gap-sm">
                  <span className="material-symbols-outlined text-primary">person_raised_hand</span>
                  Phong cách gia sư
                </h3>
                <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Chọn tối đa 4 tính cách bạn mong muốn.</p>
              </div>
              <span className="font-label-sm text-label-sm text-outline bg-surface-container px-sm py-xs rounded-full">{selectedPersonalities.length}/4</span>
            </div>
            
            <div className="flex flex-wrap gap-sm">
              {personalities.map(trait => {
                const isSelected = selectedPersonalities.includes(trait);
                return (
                  <label key={trait} className="relative cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="peer sr-only" 
                      checked={isSelected}
                      onChange={() => togglePersonality(trait)}
                    />
                    <div className={`inline-flex items-center px-md py-sm rounded-full border font-label-md text-label-md transition-colors ${
                      isSelected 
                        ? 'bg-secondary-fixed text-on-secondary-fixed border-primary-container' 
                        : 'border-outline-variant text-on-surface-variant hover:bg-surface-variant bg-surface'
                    }`}>
                      {trait}
                    </div>
                  </label>
                );
              })}
            </div>
          </section>

          {/* Section 3: Mức độ theo sát */}
          <section className="bg-surface rounded-xl p-lg shadow-[0_4px_20px_rgba(30,64,175,0.05)] border border-surface-container-high">
            <h3 className="font-headline-sm text-headline-sm text-on-background flex items-center gap-sm mb-md">
              <span className="material-symbols-outlined text-primary">track_changes</span>
              Mức độ theo sát
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
              <label className="flex items-start gap-sm cursor-pointer p-sm rounded-lg hover:bg-surface-container-low transition-colors">
                <div className="pt-xs">
                  <input 
                    type="checkbox" 
                    className="rounded border-outline-variant text-primary focus:ring-primary w-5 h-5"
                    checked={formData.communicationPreference === 'Theo dõi tiến độ hằng tuần'}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      communicationPreference: e.target.checked ? 'Theo dõi tiến độ hằng tuần' : '' 
                    }))}
                  />
                </div>
                <div>
                  <span className="font-label-md text-label-md text-on-background block">Theo dõi tiến độ hằng tuần</span>
                  <span className="font-body-md text-[13px] text-on-surface-variant block mt-1">Báo cáo tiến độ cho học sinh/phụ huynh.</span>
                </div>
              </label>
            </div>
          </section>

          {/* Section 4 & 5: Prefs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
            <section className="bg-surface rounded-xl p-lg shadow-[0_4px_20px_rgba(30,64,175,0.05)] border border-surface-container-high">
              <h3 className="font-headline-sm text-headline-sm text-on-background mb-md">Loại gia sư</h3>
              <div className="space-y-sm">
                {tutorTypes.map(type => (
                  <label key={type.value} className="flex items-center gap-sm cursor-pointer">
                    <input 
                      type="radio" 
                      name="tutor_type" 
                      className="border-outline-variant text-primary focus:ring-primary w-5 h-5"
                      checked={formData.tutorExperiencePreference === type.value}
                      onChange={() => setFormData(prev => ({ ...prev, tutorExperiencePreference: type.value }))}
                    />
                    <span className="font-label-md text-label-md text-on-background">{type.label}</span>
                  </label>
                ))}
              </div>
            </section>
            
            <section className="bg-surface rounded-xl p-lg shadow-[0_4px_20px_rgba(30,64,175,0.05)] border border-surface-container-high">
              <h3 className="font-headline-sm text-headline-sm text-on-background mb-md">Giới tính</h3>
              <div className="space-y-sm">
                {genders.map(gender => (
                  <label key={gender.value} className="flex items-center gap-sm cursor-pointer">
                    <input 
                      type="radio" 
                      name="gender" 
                      className="border-outline-variant text-primary focus:ring-primary w-5 h-5"
                      checked={formData.tutorGenderPreference === gender.value}
                      onChange={() => setFormData(prev => ({ ...prev, tutorGenderPreference: gender.value }))}
                    />
                    <span className="font-label-md text-label-md text-on-background">{gender.label}</span>
                  </label>
                ))}
              </div>
            </section>
          </div>
        </div>

        {/* Side Info Widget */}
        <div className="hidden lg:block lg:col-span-4">
          <div className="sticky top-24 bg-primary-fixed-dim/20 rounded-xl p-lg border border-primary-fixed">
            <h4 className="font-label-sm text-label-sm tracking-wider text-primary uppercase mb-md">Hồ sơ của bạn</h4>
            <div className="flex items-center gap-sm mb-sm">
              <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center text-primary shadow-sm">
                <span className="material-symbols-outlined">face</span>
              </div>
              <div>
                <p className="font-label-md text-label-md text-on-background">Học sinh Lớp {formData.grade || '10'}</p>
                <p className="font-body-md text-body-md text-on-surface-variant">Môn {formData.subject === 'toan' ? 'Toán' : formData.subject === 'ly' ? 'Vật lý' : formData.subject === 'hoa' ? 'Hóa học' : formData.subject === 'anh' ? 'Tiếng Anh' : 'Toán'}</p>
              </div>
            </div>
            <div className="mt-md pt-md border-t border-primary-fixed-dim/50">
              <p className="font-body-md text-[14px] text-on-surface-variant">
                <span className="material-symbols-outlined text-[16px] inline-block align-text-bottom mr-1">lightbulb</span>
                Hệ thống sẽ dùng các thông tin này để lọc ra các gia sư có phương pháp sư phạm phù hợp nhất với bạn.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
