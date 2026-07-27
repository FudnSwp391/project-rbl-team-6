import React from 'react';

const steps = [
  { id: 1, title: "Nhu cầu học tập", icon: "school" },
  { id: 2, title: "Trình độ hiện tại", icon: "psychology" },
  { id: 3, title: "Mục tiêu học tập", icon: "target" },
  { id: 4, title: "Phong cách học", icon: "palette" },
  { id: 5, title: "Lịch học và ngân sách", icon: "calendar_today" },
  { id: 6, title: "Ưu tiên và xác nhận", icon: "verified" },
];

export function FindTutorStepper({ currentStep }) {
  const displayStep = Math.min(currentStep, 6);
  const progressPercentage = Math.round((displayStep / 6) * 100);

  return (
    <aside className="hidden md:flex fixed left-0 top-16 w-64 h-[calc(100vh-64px)] p-md flex-col bg-surface-container-low border-r border-outline-variant z-40">
      <div className="mb-xl">
        <h2 className="font-headline-sm text-headline-sm font-semibold text-primary">Tiến trình tìm gia sư</h2>
        <p className="font-label-sm text-label-sm text-on-surface-variant mt-xs">6 bước để hoàn thành</p>
      </div>

      {/* Progress Bar */}
      <div className="mb-md">
        <div className="flex justify-between items-center mb-xs">
          <span className="font-label-sm text-label-sm text-on-surface-variant">Tiến trình</span>
          <span className="font-label-sm text-label-sm text-primary font-bold">{progressPercentage}%</span>
        </div>
        <div className="w-full bg-surface-variant rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
        <p className="font-label-sm text-label-sm text-on-surface-variant mt-xs text-right">Bước {displayStep}/6</p>
      </div>

      <ul className="flex flex-col gap-sm flex-grow overflow-y-auto">
        {steps.map((step) => {
          const isCompleted = step.id < currentStep;
          const isActive = step.id === currentStep;

          if (isActive) {
            return (
              <li key={step.id}>
                <a className="flex items-center gap-md px-md py-sm bg-primary-fixed text-on-primary-fixed font-bold rounded-r-lg border-l-4 border-primary transition-colors cursor-default">
                  <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>{step.icon}</span>
                  <span className="font-label-md text-label-md">{step.id}. {step.title}</span>
                </a>
              </li>
            );
          }

          if (isCompleted) {
            return (
              <li key={step.id}>
                <a className="flex items-center gap-md px-md py-sm text-on-surface-variant hover:bg-surface-variant transition-colors rounded-lg cursor-pointer">
                  <span className="material-symbols-outlined text-primary">{step.icon}</span>
                  <span className="font-label-md text-label-md">{step.id}. {step.title}</span>
                  <span className="material-symbols-outlined ml-auto text-[16px] text-primary">check_circle</span>
                </a>
              </li>
            );
          }

          return (
            <li key={step.id}>
              <a className="flex items-center gap-md px-md py-sm text-on-surface-variant hover:bg-surface-variant transition-colors rounded-lg opacity-50 cursor-not-allowed">
                <span className="material-symbols-outlined">{step.icon}</span>
                <span className="font-label-md text-label-md">{step.id}. {step.title}</span>
              </a>
            </li>
          );
        })}

        {/* Step 7: Review – shown only when active */}
        <li>
          <a className={`flex items-center gap-md px-md py-sm transition-colors rounded-lg ${
            currentStep === 7
              ? 'bg-primary-fixed text-on-primary-fixed font-bold rounded-r-lg border-l-4 border-primary cursor-default'
              : currentStep > 7
                ? 'text-on-surface-variant hover:bg-surface-variant cursor-pointer'
                : 'text-on-surface-variant opacity-50 cursor-not-allowed'
          }`}>
            <span className={`material-symbols-outlined ${currentStep >= 7 ? 'text-primary' : ''}`} style={currentStep === 7 ? { fontVariationSettings: "'FILL' 1" } : {}}>
              done_all
            </span>
            <span className="font-label-md text-label-md">Xem lại &amp; Xác nhận</span>
            {currentStep > 7 && (
              <span className="material-symbols-outlined ml-auto text-[16px] text-primary">check_circle</span>
            )}
          </a>
        </li>
      </ul>

      <div className="mt-auto pt-md border-t border-outline-variant">
        <button className="flex items-center gap-sm text-primary font-label-md text-label-md hover:bg-surface-variant transition-colors px-md py-sm rounded-lg w-full">
          <span className="material-symbols-outlined text-[20px]">help</span>
          Cần trợ giúp?
        </button>
      </div>
    </aside>
  );
}
