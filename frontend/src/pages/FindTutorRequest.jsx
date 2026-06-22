import React, { useState, useEffect } from 'react';
import { FindTutorStepper } from '../components/findTutor/FindTutorStepper';
import { StepLearningNeeds } from '../components/findTutor/StepLearningNeeds';
import { StepCurrentLevel } from '../components/findTutor/StepCurrentLevel';
import { StepLearningGoal } from '../components/findTutor/StepLearningGoal';
import { StepLearningStyle } from '../components/findTutor/StepLearningStyle';
import { StepScheduleBudget } from '../components/findTutor/StepScheduleBudget';
import { StepPriorityReview } from '../components/findTutor/StepPriorityReview';
import { StepReviewConfirm } from '../components/findTutor/StepReviewConfirm';
import { MatchingLoading } from '../components/findTutor/MatchingLoading';

export default function FindTutorRequest({ user, onGoSignIn, onGoSignUp }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    subject: "",
    educationLevel: "",
    grade: "",
    curriculum: "",
    textbook: "",
    topics: [],
    subjectDescription: "",
    
    // Contact info
    contact_name: "",
    contact_phone: "",
    contact_email: "",

    currentLevel: "",
    recentAverageScore: "",
    recentTestScore: "",
    difficulties: [],
    selfStudyAbility: "",
    learningSpeed: "",

    learningGoals: [],
    targetScore: "",
    examType: "",
    goalNote: "",

    teachingStyle: "",
    tutorPersonality: "",
    homeworkPreference: "",
    communicationPreference: "",

    learningFormat: "",
    city: "",
    district: "",
    ward: "",
    searchRadius: "",
    locationPreference: "",
    availableTimes: [],
    sessionsPerWeek: "",
    durationPerSession: "",
    startTimePreference: "",
    scheduleFlexibility: "",
    budgetMin: "",
    budgetMax: "",
    canIncreaseBudget: false,
    trialLessonWanted: false,

    tutorGenderPreference: "",
    tutorExperiencePreference: "",
    tutorPriority: [],
    finalNote: ""
  });

  const nextStep = () => {
    if (currentStep < 7) {
      setCurrentStep(currentStep + 1);
    } else if (currentStep === 7) {
      handleMatch();
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleMatch = async () => {
    console.log("Matching Data: ", formData);
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/tutor-requests', {
        method: 'POST',
        headers,
        body: JSON.stringify(formData)
      });
      
      const resData = await response.json();
      if (resData.success) {
        // Lưu lại requestId để các bước sau (matching) có thể cập nhật
        const finalData = { ...formData, tutorRequestId: resData.data.id, status: resData.data.match_status };
        sessionStorage.setItem('tutorRequestData', JSON.stringify(finalData));
      } else {
        sessionStorage.setItem('tutorRequestData', JSON.stringify(formData));
        console.error("Lỗi lưu request:", resData.message);
      }
    } catch (e) {
      console.error("Lỗi kết nối:", e);
      sessionStorage.setItem('tutorRequestData', JSON.stringify(formData));
    }
    
    setCurrentStep("matching");
    setTimeout(() => {
      window.location.hash = '/tutor-matches';
    }, 2500);
  };

  const handleSaveDraft = () => {
    console.log("Draft saved: ", formData);
    localStorage.setItem('tutorRequestDraft', JSON.stringify(formData));
    alert("Đã lưu bản nháp thành công!");
  };

  if (currentStep === "matching") {
    return <MatchingLoading />;
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <StepLearningNeeds formData={formData} setFormData={setFormData} />;
      case 2:
        return <StepCurrentLevel formData={formData} setFormData={setFormData} />;
      case 3:
        return <StepLearningGoal formData={formData} setFormData={setFormData} />;
      case 4:
        return <StepLearningStyle formData={formData} setFormData={setFormData} />;
      case 5:
        return <StepScheduleBudget formData={formData} setFormData={setFormData} />;
      case 6:
        return <StepPriorityReview formData={formData} setFormData={setFormData} />;
      case 7:
        return <StepReviewConfirm formData={formData} setFormData={setFormData} setCurrentStep={setCurrentStep} user={user} />;
      default:
        return <StepLearningNeeds formData={formData} setFormData={setFormData} />;
    }
  };

  return (
    <div className="bg-surface text-on-background font-body-md min-h-screen flex flex-col pt-16 pb-20 overflow-x-hidden">
      {/* TopNavBar */}
      <nav className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-lg h-16 bg-surface border-b border-surface-variant">
        <div className="flex items-center gap-sm">
          <span className="font-headline-md text-headline-md font-bold text-primary">EduX</span>
        </div>
        <div className="flex items-center gap-md">
          <button 
            onClick={() => window.location.hash = '/'} 
            className="font-label-md text-label-md text-primary hover:bg-surface-container-high px-md py-sm rounded-lg transition-colors hidden md:block"
          >
            Lưu & Thoát
          </button>
          <div className="w-10 h-10 rounded-full bg-surface-variant overflow-hidden border border-outline-variant cursor-pointer">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant mt-1 ml-1">account_circle</span>
          </div>
        </div>
      </nav>

      {/* Main Layout */}
      <div className="flex flex-1 max-w-container-max mx-auto w-full">
        {/* SideNavBar (Desktop) */}
        <FindTutorStepper currentStep={currentStep} />

        {/* Main Content Area */}
        <main className="flex-1 md:ml-64 p-md md:p-3xl w-full">
          <div className="max-w-3xl mx-auto">
            {renderStep()}
          </div>
        </main>
      </div>

      {/* Footer / Bottom Nav */}
      <footer className="fixed bottom-0 left-0 w-full md:left-64 md:w-[calc(100%-256px)] z-50 flex justify-between items-center px-md lg:px-2xl py-md bg-surface border-t border-surface-variant">
        <button 
          onClick={prevStep}
          disabled={currentStep === 1}
          className={`font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors flex items-center gap-xs ${currentStep === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          <span className="hidden sm:inline">Quay lại</span>
        </button>

        <div className="flex items-center gap-md">
          <button 
            onClick={handleSaveDraft}
            className="font-label-md text-label-md text-primary hidden sm:block hover:bg-surface-variant px-md py-sm rounded-lg transition-colors"
          >
            Lưu bản nháp
          </button>
          <button 
            onClick={nextStep}
            disabled={currentStep === 7 && !formData.isConfirmed}
            className={`font-label-md text-label-md px-lg py-sm rounded-xl transition-all shadow-[0_4px_20px_rgba(30,64,175,0.2)] flex items-center gap-sm hover:-translate-y-px ${
              (currentStep === 7 && !formData.isConfirmed) 
                ? 'bg-outline-variant text-on-surface-variant cursor-not-allowed opacity-50'
                : 'bg-primary-container text-on-primary hover:bg-primary-container/90'
            }`}
          >
            {currentStep === 7 ? 'Tìm gia sư phù hợp nhất' : 'Tiếp tục'}
            <span className="material-symbols-outlined text-[20px]">{currentStep === 7 ? 'search' : 'arrow_forward'}</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
