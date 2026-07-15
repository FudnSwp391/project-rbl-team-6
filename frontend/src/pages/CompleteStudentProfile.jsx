import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { VIETNAM_PROVINCES } from '../constants/vietnamProvinces';
import { API_BASE_URL } from '../config';

export default function CompleteStudentProfile({ onGoHome }) {
    const { loginAfterRegister } = useAuth();
    const apiBaseUrl = API_BASE_URL;
    
    const [pendingReg, setPendingReg] = useState(null);
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        city: '',
        customCity: '',
    });
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSkipModal, setShowSkipModal] = useState(false);
    const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
    const [citySearchTerm, setCitySearchTerm] = useState('');
    const cityDropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target)) {
                setIsCityDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredProvinces = VIETNAM_PROVINCES.filter(p => 
        p.toLowerCase().includes(citySearchTerm.toLowerCase())
    );

    useEffect(() => {
        const stored = sessionStorage.getItem('pendingStudentReg');
        if (!stored) {
            window.location.hash = '/signup';
            return;
        }
        try {
            const data = JSON.parse(stored);
            setPendingReg(data);
            setFormData(prev => ({
                ...prev,
                fullName: data.fullName || '',
                email: data.email || '',
            }));
        } catch (e) {
            window.location.hash = '/signup';
        }
    }, []);

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
        setErrors(prev => ({ ...prev, [id]: '' }));
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.fullName.trim()) newErrors.fullName = 'Full Name is required.';
        if (!formData.phone.trim()) newErrors.phone = 'Phone Number is required.';
        if (!formData.city) {
            newErrors.city = 'City / Province is required.';
        } else if (formData.city === 'Other' && !formData.customCity.trim()) {
            newErrors.customCity = 'Please enter your location.';
        }
        return newErrors;
    };

    const handleSubmit = async () => {
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch(`${apiBaseUrl}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fullName: formData.fullName,
                    email: pendingReg.email,
                    password: pendingReg.password,
                    role: 'student',
                    phone: formData.phone,
                    city: formData.city === 'Other' ? formData.customCity.trim() : formData.city,
                    avatarUrl: null // Avatar upload not implemented yet
                }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || data.error || 'Registration failed.');
            }

            sessionStorage.removeItem('pendingStudentReg');
            loginAfterRegister(data.token, data.user);
        } catch (err) {
            setErrors({ submit: err.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSkip = () => {
        setShowSkipModal(true);
    };

    const confirmSkip = () => {
        sessionStorage.removeItem('pendingStudentReg');
        window.location.hash = '/signup';
    };

    if (!pendingReg) return null;

    return (
        <div className="bg-background text-on-background font-body-md min-h-screen flex items-center justify-center p-md lg:p-0">
            <div className="max-w-[1440px] w-full flex flex-col lg:flex-row min-h-screen lg:min-h-[900px] overflow-hidden">
                {/* Left Side: Branding / Visual Hub */}
                <div className="w-full lg:w-[45%] bg-gradient-to-br from-white via-primary-fixed/20 to-primary-fixed/50 flex flex-col p-xl relative overflow-hidden">
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[100px]"></div>
                        <div className="absolute bottom-[-5%] right-[-5%] w-[50%] h-[50%] bg-tertiary/5 rounded-full blur-[120px]"></div>
                        <div className="absolute top-1/4 right-0 w-32 h-32 bg-primary-fixed/30 rounded-full blur-3xl opacity-50"></div>
                    </div>

                    <div className="relative z-10 flex flex-col h-full">
                        <div className="flex items-center gap-sm mb-auto cursor-pointer" onClick={() => window.location.hash = '/'}>
                            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-on-primary shadow-sm">
                                <span className="material-symbols-outlined icon-fill">school</span>
                            </div>
                            <span className="font-headline-md text-headline-md text-primary tracking-tight">EduX</span>
                        </div>

                        <div className="mt-xl mb-lg">
                            <h1 className="font-headline-xl text-headline-xl text-on-surface mb-sm">Welcome to EduX</h1>
                            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-md">Your learning journey starts here. Complete your basic profile now, and find the right tutor when you are ready.</p>
                        </div>

                        <div className="mt-auto flex-grow flex items-center justify-center relative">
                            <img alt="Illustration" className="w-full max-w-[450px] h-auto object-contain relative z-10 drop-shadow-2xl" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAL02Gwe1yZ8SrUKBN5oBWxunTQwKoUcH9mKmkzF-iPzE_fwPqd9a_dkZvCRicAgD18lrjLSIa63nvt5DiKOgNoA6oGrdu3vynwO_uCBaQqOYVJqvUFOX_aFflGJP4bw2-OYptI_l8p7EhY0VDQZyQgycPuAO1dLzZNlVMD0K_ojMYHyr2gxtig7ZUQpt6lxoPYfNbql0fjHVBmuZAGVZRIpi-JYJMqptTgF6DEpj15y0dpSaZBg2omofbA30Tnc1zNJ463JyZ2Mqb8"/>
                            
                            <div className="absolute top-12 left-0 lg:-left-4 backdrop-blur-md bg-white/70 border border-white/80 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.1)] rounded-2xl px-4 py-3 flex items-center gap-3 z-20 animate-[float_6s_ease-in-out_infinite]">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                    <span className="material-symbols-outlined text-[18px]">lock</span>
                                </div>
                                <span className="font-label-md text-on-surface">Secure profile</span>
                            </div>

                            <div className="absolute top-1/2 right-0 lg:-right-8 backdrop-blur-md bg-white/70 border border-white/80 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.1)] rounded-2xl px-4 py-3 flex items-center gap-3 z-20 animate-[float_5s_ease-in-out_infinite_0.5s]">
                                <div className="w-8 h-8 rounded-full bg-tertiary/10 flex items-center justify-center text-tertiary">
                                    <span className="material-symbols-outlined text-[18px]">psychology</span>
                                </div>
                                <span className="font-label-md text-on-surface">Personalized learning</span>
                            </div>

                            <div className="absolute bottom-12 left-10 backdrop-blur-md bg-white/70 border border-white/80 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.1)] rounded-2xl px-4 py-3 flex items-center gap-3 z-20 animate-[float_7s_ease-in-out_infinite_1s]">
                                <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
                                    <span className="material-symbols-outlined text-[18px]">search</span>
                                </div>
                                <span className="font-label-md text-on-surface">Find tutors later</span>
                            </div>

                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-white/40 rounded-full blur-3xl -z-0"></div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Form */}
                <div className="w-full lg:w-[55%] flex items-center justify-center p-md lg:p-xl bg-surface-bright">
                    <div className="w-full max-w-[640px] bg-white p-lg border border-outline-variant/20 rounded-3xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)]">
                        <div className="mb-lg">
                            <div className="inline-flex items-center px-sm py-xs bg-primary-fixed/40 text-primary-container font-label-md text-label-md rounded-full mb-md">
                                Step 1: Basic Information
                            </div>
                            <h2 className="font-headline-lg text-headline-lg text-on-surface mb-xs tracking-tight">Almost there! Let's set up your student profile</h2>
                            <p className="font-body-md text-body-md text-on-surface-variant">Add a few basic details so EduX can personalize your student experience.</p>
                            <p className="font-label-sm text-primary mt-2 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[16px]">schedule</span> This takes less than 1 minute.
                            </p>
                        </div>

                        <form className="space-y-lg" noValidate>
                            {/* Avatar Upload */}
                            <div className="flex items-center gap-md">
                                <div className="relative group">
                                    <div className="w-24 h-24 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant border-2 border-white shadow-sm overflow-hidden">
                                        <span className="material-symbols-outlined text-[40px]">person</span>
                                    </div>
                                    <div className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-on-primary rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                                        <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <button className="h-10 px-md bg-white border border-outline text-on-surface font-label-md text-label-md rounded-xl hover:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200" type="button" onClick={() => alert("Avatar upload not fully supported yet.")}>Upload photo</button>
                                    <span className="font-label-sm text-on-surface-variant opacity-70">Optional · JPG or PNG</span>
                                </div>
                            </div>

                            {/* Input Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-md gap-y-md">
                                {/* Full Name */}
                                <div className="flex flex-col gap-xs col-span-1 md:col-span-2">
                                    <label className="font-label-md text-label-md text-on-surface" htmlFor="fullName">Full Name</label>
                                    <input 
                                        className={`w-full h-12 px-sm bg-white border ${errors.fullName ? 'border-error' : 'border-outline-variant'} rounded-xl text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:ring-[3px] focus:ring-primary-fixed-dim/30 transition-all duration-200`}
                                        id="fullName" 
                                        placeholder="e.g. Jane Doe" 
                                        type="text" 
                                        value={formData.fullName}
                                        onChange={handleInputChange}
                                    />
                                    {errors.fullName && <p className="text-error text-sm mt-1">{errors.fullName}</p>}
                                </div>

                                {/* Email Address */}
                                <div className="flex flex-col gap-xs col-span-1 md:col-span-2">
                                    <label className="font-label-md text-label-md text-on-surface" htmlFor="email">Email Address</label>
                                    <input 
                                        className="w-full h-12 px-sm bg-surface-container-low border border-outline-variant/50 rounded-xl text-on-surface-variant cursor-not-allowed opacity-80" 
                                        disabled 
                                        id="email" 
                                        type="email" 
                                        value={formData.email}
                                    />
                                    <p className="font-label-sm text-label-sm text-outline mt-1">Password can be changed later in Settings.</p>
                                </div>

                                {/* Phone Number */}
                                <div className="flex flex-col gap-xs col-span-1">
                                    <label className="font-label-md text-label-md text-on-surface" htmlFor="phone">Phone Number</label>
                                    <input 
                                        className={`w-full h-12 px-sm bg-white border ${errors.phone ? 'border-error' : 'border-outline-variant'} rounded-xl text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:ring-[3px] focus:ring-primary-fixed-dim/30 transition-all duration-200`}
                                        id="phone" 
                                        placeholder="+1 (555) 000-0000" 
                                        type="tel"
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                    />
                                    {errors.phone && <p className="text-error text-sm mt-1">{errors.phone}</p>}
                                </div>

                                {/* City / Province */}
                                <div className="flex flex-col gap-xs col-span-1">
                                    <label className="font-label-md text-label-md text-on-surface" htmlFor="city">City / Province</label>
                                    <div className="relative" ref={cityDropdownRef}>
                                        <div 
                                            className={`w-full min-h-[48px] px-sm bg-white border ${errors.city ? 'border-error' : 'border-outline-variant'} rounded-xl text-on-surface cursor-pointer flex items-center justify-between focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary-fixed-dim/30 transition-all duration-200`}
                                            onClick={() => setIsCityDropdownOpen(!isCityDropdownOpen)}
                                        >
                                            <span className={formData.city ? 'text-on-surface' : 'text-on-surface-variant/50'}>
                                                {formData.city === 'Other' ? 'Khác' : (formData.city || 'Chọn tỉnh / thành phố')}
                                            </span>
                                            <span className="material-symbols-outlined text-on-surface-variant transition-transform duration-200" style={{ transform: isCityDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>expand_more</span>
                                        </div>
                                        
                                        {isCityDropdownOpen && (
                                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-outline-variant/30 rounded-xl shadow-lg z-50 overflow-hidden flex flex-col max-h-[280px]">
                                                <div className="p-2 border-b border-outline-variant/20">
                                                    <input 
                                                        type="text" 
                                                        className="w-full h-10 px-3 bg-surface-container-lowest border border-outline-variant/50 rounded-lg text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
                                                        placeholder="Tìm tỉnh / thành phố..."
                                                        value={citySearchTerm}
                                                        onChange={(e) => setCitySearchTerm(e.target.value)}
                                                        autoFocus
                                                    />
                                                </div>
                                                <div className="overflow-y-auto p-1 flex-grow custom-scrollbar">
                                                    {filteredProvinces.length > 0 ? (
                                                        filteredProvinces.map(province => (
                                                            <div 
                                                                key={province}
                                                                className={`px-3 py-2 text-sm rounded-lg cursor-pointer hover:bg-primary/5 ${formData.city === province ? 'bg-primary/10 text-primary font-medium' : 'text-on-surface'}`}
                                                                onClick={() => {
                                                                    setFormData(prev => ({ ...prev, city: province }));
                                                                    setErrors(prev => ({ ...prev, city: '' }));
                                                                    setIsCityDropdownOpen(false);
                                                                    setCitySearchTerm('');
                                                                }}
                                                            >
                                                                {province}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="px-3 py-4 text-center text-sm text-on-surface-variant">
                                                            No results found
                                                        </div>
                                                    )}
                                                    <div 
                                                        className={`px-3 py-2 mt-1 text-sm rounded-lg cursor-pointer hover:bg-primary/5 border-t border-outline-variant/20 ${formData.city === 'Other' ? 'bg-primary/10 text-primary font-medium' : 'text-on-surface'}`}
                                                        onClick={() => {
                                                            setFormData(prev => ({ ...prev, city: 'Other' }));
                                                            setErrors(prev => ({ ...prev, city: '' }));
                                                            setIsCityDropdownOpen(false);
                                                            setCitySearchTerm('');
                                                        }}
                                                    >
                                                        Khác
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {formData.city === 'Other' && (
                                        <div className="mt-2 animate-in fade-in slide-in-from-top-1">
                                            <input 
                                                className={`w-full h-12 px-sm bg-white border ${errors.customCity ? 'border-error' : 'border-outline-variant'} rounded-xl text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:ring-[3px] focus:ring-primary-fixed-dim/30 transition-all duration-200`}
                                                id="customCity" 
                                                placeholder="Nhập tỉnh/thành hoặc khu vực của bạn" 
                                                type="text"
                                                value={formData.customCity}
                                                onChange={handleInputChange}
                                            />
                                            {errors.customCity && <p className="text-error text-sm mt-1">{errors.customCity}</p>}
                                        </div>
                                    )}
                                    {errors.city && <p className="text-error text-sm mt-1">{errors.city}</p>}
                                </div>
                            </div>

                            {errors.submit && (
                                <div className="p-3 bg-error-container text-on-error-container rounded-lg text-sm mt-4">
                                    {errors.submit}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex flex-col gap-sm pt-md">
                                <button 
                                    className="w-full h-14 bg-primary text-on-primary font-label-md text-[16px] rounded-xl hover:bg-surface-tint focus:outline-none focus:ring-[4px] focus:ring-primary-fixed-dim/40 transition-all duration-200 shadow-sm flex items-center justify-center gap-xs shadow-lg shadow-primary/20 disabled:opacity-70" 
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                                    ) : 'Save Profile'}
                                </button>
                                <button 
                                    className="w-full h-14 bg-transparent text-on-surface-variant font-label-md text-[16px] rounded-xl hover:bg-surface-container-low focus:outline-none transition-all duration-200 flex items-center justify-center" 
                                    type="button"
                                    onClick={handleSkip}
                                >
                                    Skip for now
                                </button>
                            </div>
                        </form>

                        {/* Footnotes */}
                        <div className="pt-md flex flex-col gap-xs text-center mt-md">
                            <p className="font-label-sm text-label-sm text-outline flex items-center justify-center gap-1">
                                <span className="material-symbols-outlined text-[16px]">lock</span>
                                Your personal information is only used to manage your student account.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Skip Modal */}
            {showSkipModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="w-12 h-12 bg-error-container rounded-full flex items-center justify-center text-error mb-4">
                            <span className="material-symbols-outlined text-[24px]">warning</span>
                        </div>
                        <h3 className="font-headline-md text-xl mb-2 text-on-surface">Are you sure?</h3>
                        <p className="text-on-surface-variant font-body-md mb-6">
                            Your student account has not been created yet. Complete your profile to continue.
                        </p>
                        <div className="flex flex-col gap-3">
                            <button 
                                className="w-full py-3 bg-primary text-white rounded-xl font-label-md hover:bg-primary/90 transition-colors"
                                onClick={() => setShowSkipModal(false)}
                            >
                                Continue editing
                            </button>
                            <button 
                                className="w-full py-3 bg-surface-container text-on-surface rounded-xl font-label-md hover:bg-surface-container-high transition-colors"
                                onClick={confirmSkip}
                            >
                                Back to register
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
