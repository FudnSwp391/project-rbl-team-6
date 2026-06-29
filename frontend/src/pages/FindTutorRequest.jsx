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

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';


const STORAGE_KEY = 'findTutorProgress';

const defaultFormData = {
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
  };

function loadSavedProgress() {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        step: parsed.step || 1,
        formData: { ...defaultFormData, ...parsed.formData }
      };
    }
  } catch (e) {
    console.warn('Failed to restore tutor request progress:', e);
  }
  return { step: 1, formData: defaultFormData };
}

export default function FindTutorRequest({ user, onGoSignIn, onGoSignUp }) {
  const saved = loadSavedProgress();
  const [currentStep, setCurrentStep] = useState(saved.step);
  const [formData, setFormData] = useState(saved.formData);

  const [errors, setErrors] = useState({});

  // Auto-save step + formData to sessionStorage on every change
  useEffect(() => {
    // Clear errors when a value becomes truthy/valid
    setErrors(prev => {
      if (Object.keys(prev).length === 0) return prev;
      const newErrors = { ...prev };
      let changed = false;
      if (newErrors.educationLevel && formData.educationLevel) { delete newErrors.educationLevel; changed = true; }
      if (newErrors.subject && formData.subject) { delete newErrors.subject; changed = true; }
      if (newErrors.grade && formData.grade) { delete newErrors.grade; changed = true; }
      if (newErrors.recentAverageScore && formData.recentAverageScore) { delete newErrors.recentAverageScore; changed = true; }
      if (newErrors.targetScore && formData.targetScore && Number(formData.targetScore) > Number(formData.recentAverageScore)) { delete newErrors.targetScore; changed = true; }
      if (newErrors.learningFormat && formData.learningFormat) { delete newErrors.learningFormat; changed = true; }
      if (newErrors.city && formData.city) { delete newErrors.city; changed = true; }
      if (newErrors.district && formData.district) { delete newErrors.district; changed = true; }
      if (newErrors.availableTimes && formData.availableTimes?.length > 0) { delete newErrors.availableTimes; changed = true; }
      if (newErrors.budgetMin && formData.budgetMin) { delete newErrors.budgetMin; changed = true; }
      if (newErrors.budgetMax && formData.budgetMax && Number(formData.budgetMin) <= Number(formData.budgetMax)) { delete newErrors.budgetMax; delete newErrors.budgetMin; changed = true; }
      return changed ? newErrors : prev;
    });

    if (currentStep === "matching") return; // Don't save matching state
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        step: currentStep,
        formData
      }));
    } catch (e) {
      console.warn('Failed to save tutor request progress:', e);
    }
  }, [currentStep, formData]);

  const validateStep = (step) => {
    const newErrors = {};
    switch(step) {
      case 1:
        if (!formData.educationLevel) newErrors.educationLevel = "Vui lòng chọn cấp học.";
        if (!formData.subject) newErrors.subject = "Vui lòng chọn môn học.";
        if (!formData.grade) newErrors.grade = "Vui lòng chọn cấp học/khối lớp.";
        break;
      case 2:
        if (!formData.recentAverageScore) newErrors.recentAverageScore = "Vui lòng nhập điểm trung bình hiện tại.";
        break;
      case 3:
        if (!formData.targetScore) newErrors.targetScore = "Vui lòng nhập mục tiêu điểm số.";
        else if (Number(formData.targetScore) <= Number(formData.recentAverageScore)) {
          newErrors.targetScore = "Mục tiêu điểm số phải lớn hơn điểm hiện tại."; 
        }
        break;
      case 4:
        break;
      case 5:
        if (!formData.learningFormat) newErrors.learningFormat = "Vui lòng chọn hình thức học tập.";
        if (formData.learningFormat !== 'online') {
          if (!formData.city) newErrors.city = "Với hình thức học trực tiếp, vui lòng chọn Tỉnh/Thành phố.";
          if (!formData.district) newErrors.district = "Với hình thức học trực tiếp, vui lòng chọn Quận/Huyện.";
        }
        if (!formData.availableTimes || formData.availableTimes.length === 0) {
          newErrors.availableTimes = "Vui lòng chọn ít nhất một khung giờ có thể học.";
        }
        if (!formData.budgetMin) newErrors.budgetMin = "Vui lòng nhập ngân sách tối thiểu.";
        if (!formData.budgetMax) newErrors.budgetMax = "Vui lòng nhập ngân sách tối đa.";
        if (formData.budgetMin && formData.budgetMax && Number(formData.budgetMin) > Number(formData.budgetMax)) {
          newErrors.budgetMin = "Ngân sách tối thiểu không được lớn hơn tối đa.";
        }
        break;
      default:
        break;
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      setTimeout(() => {
        const errorElements = document.querySelectorAll('.border-red-500, .border-error');
        if (errorElements.length > 0) {
          errorElements[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
      return false;
    }
    return true;
  };

  const nextStep = () => {
    if (!validateStep(currentStep)) return;
    setErrors({});
    if (currentStep < 7) {
      setCurrentStep(currentStep + 1);
    } else if (currentStep === 7) {
      handleMatch();
    }
  };

  const prevStep = () => {
    setErrors({});
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
      
      const response = await fetch(`${API_BASE}/api/tutor-requests`, {
        method: 'POST',
        headers,
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const resData = await response.json();
      if (resData.success) {
        // Lưu lại requestId để các bước sau (matching) có thể cập nhật
        const finalData = { ...formData, tutorRequestId: resData.data.id, status: resData.data.match_status };
        // Ghi sessionStorage trước, ĐẢM BẢO ghi xong mới navigate
        sessionStorage.setItem('tutorRequestData', JSON.stringify(finalData));
        sessionStorage.removeItem(STORAGE_KEY);
        console.log('✅ Saved tutorRequestData:', sessionStorage.getItem('tutorRequestData'));
        
        setCurrentStep('matching');
        // Delay 2.5s để MatchingLoading animation chạy, sau đó navigate
        setTimeout(() => {
          window.location.hash = '/tutor-matches';
        }, 2500);
      } else {
        alert('Không thể tạo yêu cầu tìm gia sư. ' + (resData.message || 'Vui lòng kiểm tra backend.'));
        console.error('Lỗi lưu request:', resData.message);
      }
    } catch (e) {
      console.error("Lỗi kết nối:", e);
      alert("Không thể tạo yêu cầu tìm gia sư. Vui lòng kiểm tra backend.");
    }
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
        return <StepLearningNeeds formData={formData} setFormData={setFormData} errors={errors} />;
      case 2:
        return <StepCurrentLevel formData={formData} setFormData={setFormData} errors={errors} />;
      case 3:
        return <StepLearningGoal formData={formData} setFormData={setFormData} errors={errors} />;
      case 4:
        return <StepLearningStyle formData={formData} setFormData={setFormData} errors={errors} />;
      case 5:
        return <StepScheduleBudget formData={formData} setFormData={setFormData} errors={errors} />;
      case 6:
        return <StepPriorityReview formData={formData} setFormData={setFormData} errors={errors} />;
      case 7:
        return <StepReviewConfirm formData={formData} setFormData={setFormData} setCurrentStep={setCurrentStep} user={user} />;
      default:
        return <StepLearningNeeds formData={formData} setFormData={setFormData} errors={errors} />;
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
