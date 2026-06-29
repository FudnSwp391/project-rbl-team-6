import React, { useState, useEffect } from 'react';

const steps = [
  "Đang kiểm tra môn học và chuyên môn.",
  "Đang đối chiếu trình độ và mục tiêu.",
  "Đang so sánh phong cách giảng dạy.",
  "Đang kiểm tra lịch học.",
  "Đang đối chiếu khu vực và ngân sách.",
  "Đang xếp hạng các gia sư phù hợp."
];

export function MatchingLoading() {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // We update steps to simulate loading sequence
    const interval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev < steps.length) return prev + 1;
        return prev;
      });
    }, 400); // Fast enough to complete before 2500ms redirect in parent

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-background min-h-screen flex flex-col items-center justify-center relative overflow-hidden font-sans fixed inset-0 z-50">
      <style>{`
        @keyframes pulse-ring {
            0% { transform: scale(0.8); opacity: 0.5; }
            100% { transform: scale(2); opacity: 0; }
        }
        .pulse-circle { position: relative; }
        .pulse-circle::before, .pulse-circle::after {
            content: '';
            position: absolute;
            inset: -20px;
            border-radius: 50%;
            background: rgba(33, 112, 228, 0.1);
            animation: pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
        }
        .pulse-circle::after { animation-delay: 1s; }
      `}</style>
      
      <main className="relative z-10 w-full max-w-2xl px-lg py-3xl flex flex-col items-center text-center">
        <div className="mb-2xl">
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-secondary-container/10 flex items-center justify-center pulse-circle">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container">
              <span className="material-symbols-outlined text-[48px] md:text-[64px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                search
              </span>
            </div>
          </div>
        </div>
        
        <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-2xl">
          Đang tìm gia sư phù hợp nhất với bạn...
        </h1>
        
        <div className="w-full max-w-md bg-surface-container-lowest rounded-xl p-lg shadow-sm border border-outline-variant/30 mb-2xl flex flex-col gap-md text-left">
          {steps.map((step, idx) => {
            const isCompleted = currentStep > idx;
            const isActive = currentStep === idx;
            
            return (
              <div key={idx} className={`flex items-center gap-md transition-opacity duration-500 ${isActive ? 'opacity-100' : isCompleted ? 'opacity-70' : 'opacity-30'}`}>
                <span className={`material-symbols-outlined ${isCompleted ? 'text-primary' : isActive ? 'text-secondary-container' : 'text-outline'}`} style={isCompleted ? { fontVariationSettings: "'FILL' 1" } : {}}>
                  {isCompleted ? 'check_circle' : isActive ? 'radio_button_checked' : 'radio_button_unchecked'}
                </span>
                <span className={`font-body-md text-body-md ${isActive || isCompleted ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                  {step}
                </span>
              </div>
            );
          })}
        </div>
        
        <p className="font-label-md text-label-md text-on-surface-variant max-w-md mx-auto">
          Mức độ phù hợp được tính dựa trên thông tin bạn cung cấp.
        </p>
      </main>
    </div>
  );
}
