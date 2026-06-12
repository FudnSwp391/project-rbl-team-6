/**
 * TutorProfileForm.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * 4-step Tutor Onboarding Wizard:
 *   Step 1 – About You       (text fields only, no profile photo)
 *   Step 2 – Experience      (subjects, education, rate, style)
 *   Step 3 – Documents       (image upload: profile photo, certificate, CCCD)
 *   Step 4 – Review & Submit (summary + thumbnails + ToS)
 *
 * Rules:
 *  - CCCD / Certificate / Profile Photo: image only (JPG, JPEG, PNG, WEBP), max 5 MB
 *  - No PDF allowed
 *  - Bio minimum 100 characters
 *  - experience_years and hourly_rate must be numbers
 *  - On submit: POST FormData → backend stores URLs, sets status = "pending"
 */

import { useState, useRef, useCallback } from 'react'
import { useAuth } from './AuthContext'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'))
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 80 }, (_, i) => String(CURRENT_YEAR - 18 - i))

const COUNTRIES = [
  'Vietnam', 'United States', 'United Kingdom', 'Canada', 'Australia',
  'Singapore', 'Japan', 'South Korea', 'Germany', 'France', 'Other',
]

const EDUCATION_LEVELS = [
  "Bachelor's Degree",
  "Master's Degree",
  'PhD / Doctorate',
  'Professional Certification',
  'Other',
]

const LANGUAGES = [
  'Vietnamese (Native)',
  'English (Native)',
  'English (Fluent)',
  'English (Intermediate)',
  'Chinese (Mandarin)',
  'Japanese',
  'Korean',
  'French',
  'German',
  'Spanish',
]

const SUGGESTED_SUBJECTS = [
  'Toán',
  'Tiếng Anh',
  'Ngữ văn',
  'Vật lý',
  'Hóa học',
  'Sinh học',
  'Tin học',
  'IELTS',
  'Ôn thi vào lớp 10',
  'Ôn thi tốt nghiệp THPT',
  'Ôn thi đánh giá năng lực',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function validateImageFile(file) {
  if (!file) return null
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return 'Only image files (JPG, JPEG, PNG, WEBP) are allowed.'
  }
  if (file.size > MAX_SIZE_BYTES) {
    return 'File size must be under 5 MB.'
  }
  return null
}

function createObjectURL(file) {
  if (!file) return null
  try { return URL.createObjectURL(file) } catch { return null }
}

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEPS = ['About You', 'Experience', 'Documents', 'Review & Submit']

function Stepper({ current }) {
  return (
    <div className="p-8 border-b border-outline-variant/20 bg-surface-container-low/30">
      <div className="flex items-center justify-between relative">
        <div className="absolute top-5 left-0 w-full h-[2px] bg-outline-variant -z-10" />
        {STEPS.map((label, idx) => {
          const step = idx + 1
          const active = step === current
          const done = step < current
          return (
            <div key={label} className="flex flex-col items-center gap-3 bg-transparent px-2 sm:px-4">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-sm transition-all duration-300 ${
                  active
                    ? 'bg-primary text-white shadow-md'
                    : done
                    ? 'bg-primary/70 text-white'
                    : 'bg-surface-container-highest text-on-surface-variant'
                }`}
              >
                {done ? (
                  <span className="material-symbols-outlined text-[20px]">check</span>
                ) : (
                  step
                )}
              </div>
              <span
                className={`font-label-md text-label-md text-center hidden sm:block ${
                  active ? 'text-primary' : 'text-on-secondary-container'
                }`}
              >
                {label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Image Upload Card ────────────────────────────────────────────────────────

function ImageUploadCard({ id, label, description, file, onFileChange, onRemove, error, required }) {
  const inputRef = useRef(null)
  const previewUrl = file ? createObjectURL(file) : null

  return (
    <div
      className={`p-md border rounded-xl bg-surface-container-low transition-all duration-200 ${
        error ? 'border-error' : 'border-outline-variant hover:border-primary/50'
      }`}
    >
      <p className="font-label-md text-label-md text-on-surface mb-1">
        {label}
        {required && <span className="text-error ml-1">*</span>}
      </p>
      <p className="font-label-sm text-label-sm text-on-surface-variant mb-3">{description}</p>

      {previewUrl ? (
        /* ── Preview State ── */
        <div className="flex flex-col items-center gap-3">
          <div className="w-full max-w-[200px] aspect-video rounded-lg overflow-hidden border border-outline-variant bg-surface-container mx-auto">
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full h-full object-cover"
              onLoad={() => URL.revokeObjectURL(previewUrl)}
            />
          </div>
          <p className="font-label-sm text-label-sm text-on-surface-variant text-center truncate max-w-full px-2">
            {file.name}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="px-3 py-1.5 text-sm font-semibold text-primary border border-primary rounded-lg hover:bg-primary/5 transition-colors"
            >
              Change
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="px-3 py-1.5 text-sm font-semibold text-error border border-error rounded-lg hover:bg-error/5 transition-colors"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        /* ── Empty State ── */
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full border-2 border-dashed border-outline-variant rounded-lg p-6 flex flex-col items-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[36px] text-on-surface-variant">upload_file</span>
          <span className="font-label-md text-label-md text-primary">Click to upload image</span>
          <span className="font-label-sm text-label-sm text-on-surface-variant">JPG, JPEG, PNG, WEBP · Max 5 MB</span>
        </button>
      )}

      {error && (
        <p className="mt-2 font-label-sm text-label-sm text-error flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">error</span>
          {error}
        </p>
      )}

      {/* Hidden file input — image only, no PDF */}
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={onFileChange}
      />
    </div>
  )
}

// ─── Field helpers ────────────────────────────────────────────────────────────

function FieldError({ msg }) {
  if (!msg) return null
  return (
    <p className="mt-1 font-label-sm text-label-sm text-error flex items-center gap-1">
      <span className="material-symbols-outlined text-[14px]">error</span>
      {msg}
    </p>
  )
}

function inputCls(hasError) {
  return `h-12 px-4 rounded-lg border ${
    hasError ? 'border-error' : 'border-outline'
  } focus:border-primary focus:ring-0 outline-none transition-all bg-white font-body-md w-full focus:shadow-[0_0_0_3px_rgba(30,64,175,0.15)]`
}

function selectCls(hasError) {
  return `h-12 px-4 rounded-lg border ${
    hasError ? 'border-error' : 'border-outline'
  } focus:border-primary focus:ring-0 outline-none transition-all bg-white font-body-md w-full appearance-none focus:shadow-[0_0_0_3px_rgba(30,64,175,0.15)]`
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TutorProfileForm() {
  const { token, loginSilent } = useAuth()

  // Detect new-registration mode (tutor chưa có tài khoản)
  const pendingRegRaw = sessionStorage.getItem('pendingTutorReg')
  const pendingReg = pendingRegRaw ? (() => { try { return JSON.parse(pendingRegRaw) } catch { return null } })() : null
  const isNewRegistration = !!pendingReg

  // ── Step state ──────────────────────────────────────────────────────────────
  const [step, setStep] = useState(1)

  // ── Step 1 fields ───────────────────────────────────────────────────────────
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [birthDay, setBirthDay] = useState('')
  const [birthMonth, setBirthMonth] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [gender, setGender] = useState('')
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')
  const [phone, setPhone] = useState('')
  const [bio, setBio] = useState('')

  // ── Step 2 fields ───────────────────────────────────────────────────────────
  const [subjectInput, setSubjectInput] = useState('')
  const [subjects, setSubjects] = useState([])
  const [education, setEducation] = useState('')
  const [experienceYears, setExperienceYears] = useState('')
  const [language, setLanguage] = useState('')
  const [hourlyRate, setHourlyRate] = useState('')
  const [teachingStyle, setTeachingStyle] = useState('')
  const [qualifications, setQualifications] = useState('')

  // ── Step 3 files ────────────────────────────────────────────────────────────
  const [profilePhotoFile, setProfilePhotoFile] = useState(null)
  const [certificateFile, setCertificateFile] = useState(null)
  const [cccdFile, setCccdFile] = useState(null)

  // ── Errors ──────────────────────────────────────────────────────────────────
  const [errors, setErrors] = useState({})

  // ── Submit state ────────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState({ text: '', type: '' })
  const [tosAccepted, setTosAccepted] = useState(false)

  // ── Subject chip helpers ─────────────────────────────────────────────────────
  const addSubject = () => {
    const s = subjectInput.trim()
    if (s && !subjects.includes(s)) {
      setSubjects(prev => [...prev, s])
    }
    setSubjectInput('')
  }
  const removeSubject = (s) => setSubjects(prev => prev.filter(x => x !== s))

  // ── Image change handler ─────────────────────────────────────────────────────
  const handleImageChange = useCallback((e, setFileFn, errorKey) => {
    const file = e.target.files[0]
    e.target.value = '' // reset so re-selecting same file works
    if (!file) return
    const err = validateImageFile(file)
    if (err) {
      setErrors(prev => ({ ...prev, [errorKey]: err }))
      return
    }
    setErrors(prev => ({ ...prev, [errorKey]: '' }))
    setFileFn(file)
  }, [])

  // ── Validation per step ───────────────────────────────────────────────────────
  const validateStep1 = () => {
    const e = {}
    if (!firstName.trim()) e.firstName = 'First name is required.'
    if (!lastName.trim()) e.lastName = 'Last name is required.'
    if (!displayName.trim()) e.displayName = 'Display name is required.'
    if (!birthDay) e.birthDay = 'Please select a day.'
    if (!birthMonth) e.birthMonth = 'Please select a month.'
    if (!birthYear) e.birthYear = 'Please select a year.'
    if (!gender) e.gender = 'Please select a gender.'
    if (!country) e.country = 'Please select a country.'
    if (!city.trim()) e.city = 'City is required.'
    if (!phone.trim()) e.phone = 'Phone number is required.'
    if (!bio.trim()) e.bio = 'Bio is required.'
    else if (bio.trim().length < 100) e.bio = `Bio must be at least 100 characters (currently ${bio.trim().length}).`
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const validateStep2 = () => {
    const e = {}
    if (subjects.length === 0) e.subjects = 'Add at least one subject.'
    if (!education) e.education = 'Please select your education level.'
    if (!experienceYears && experienceYears !== 0) e.experienceYears = 'Years of experience is required.'
    else if (isNaN(Number(experienceYears)) || Number(experienceYears) < 0) e.experienceYears = 'Must be a valid number.'
    if (!language) e.language = 'Please select a teaching language.'
    if (hourlyRate !== '' && (isNaN(Number(hourlyRate)) || Number(hourlyRate) < 0)) e.hourlyRate = 'Must be a valid number.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const validateStep3 = () => {
    const e = {}
    if (!profilePhotoFile) e.profilePhoto = 'Profile photo is required.'
    if (!certificateFile) e.certificate = 'Certificate image is required.'
    if (!cccdFile) e.cccd = 'CCCD / ID Card image is required.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleContinue = () => {
    let valid = false
    if (step === 1) valid = validateStep1()
    else if (step === 2) valid = validateStep2()
    else if (step === 3) valid = validateStep3()
    if (valid) {
      setStep(s => s + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleBack = () => {
    setErrors({})
    setStep(s => s - 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── Submit ────────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!tosAccepted) {
      setErrors({ tos: 'You must accept the Terms of Service.' })
      return
    }
    setSubmitting(true)
    setSubmitMessage({ text: '', type: '' })

    const formData = new FormData()
    // Step 1
    formData.append('first_name', firstName.trim())
    formData.append('last_name', lastName.trim())
    formData.append('display_name', displayName.trim())
    formData.append('birthday', `${birthYear}-${String(MONTHS.indexOf(birthMonth) + 1).padStart(2, '0')}-${birthDay}`)
    formData.append('gender', gender)
    formData.append('country', country)
    formData.append('city', city.trim())
    formData.append('phone', phone.trim())
    formData.append('bio', bio.trim())
    // Step 2
    formData.append('subjects', subjects.join(', '))
    formData.append('education', education)
    formData.append('experience_years', experienceYears)
    formData.append('language', language)
    if (hourlyRate !== '') formData.append('hourly_rate', hourlyRate)
    formData.append('teaching_style', teachingStyle.trim())
    formData.append('qualifications', qualifications.trim())
    // Step 3 images
    if (profilePhotoFile) formData.append('profile_photo', profilePhotoFile)
    if (certificateFile) formData.append('certificate', certificateFile)
    if (cccdFile) formData.append('cccd', cccdFile)

    try {
      let activeToken = token

      // ── Luồng đăng ký mới: tạo tài khoản trước, rồi mới tạo profile ────────
      if (isNewRegistration) {
        const regRes = await fetch(`${API}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: `${firstName.trim()} ${lastName.trim()}`,
            email: pendingReg.email,
            password: pendingReg.password,
            role: 'tutor',
          }),
        })
        const regData = await regRes.json()
        if (!regRes.ok) throw new Error(regData.message || 'Registration failed.')
        activeToken = regData.token
        // Lưu user vào auth context (không redirect)
        loginSilent(regData.token, regData.user)
        // Xoá pending data khỏi sessionStorage
        sessionStorage.removeItem('pendingTutorReg')
      }

      // ── Gọi API tạo/cập nhật tutor profile ──────────────────────────────────
      const res = await fetch(`${API}/api/tutor/profile`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${activeToken}` },
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Submission failed.')

      setSubmitMessage({
        text: 'Application submitted successfully! Your status is now Pending review.',
        type: 'success',
      })

      // Sau 2 giây redirect về tutor dashboard
      setTimeout(() => {
        window.location.hash = '/tutor'
      }, 2000)

    } catch (err) {
      setSubmitMessage({ text: err.message, type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="bg-background text-on-surface min-h-screen flex flex-col items-center justify-start pt-12 pb-16 px-4">
      <div className="w-full max-w-4xl">
        <div className="bg-surface-container-lowest rounded-xl shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),0_2px_4px_-2px_rgba(0,0,0,0.05)] overflow-hidden border border-outline-variant/30">

          {/* Progress Stepper */}
          <Stepper current={step} />

          {/* ── Step 1: About You ─────────────────────────────────────────────── */}
          {step === 1 && (
            <>
              <div className="p-lg md:p-xl">
                <div className="mb-lg">
                  <h1 className="font-headline-md text-headline-md text-on-surface mb-2">Create your tutor profile</h1>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    Tell us a bit about yourself. This information helps students find the perfect match.
                  </p>
                </div>

                <div className="flex gap-4 p-md bg-secondary-container/50 border border-secondary-container rounded-lg mb-lg">
                  <span className="material-symbols-outlined text-primary">info</span>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    Please make sure your information is identical to your government-issued ID.
                  </p>
                </div>

                <form className="space-y-8" onSubmit={e => e.preventDefault()}>
                  {/* Name Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                    <div className="flex flex-col gap-2">
                      <label className="font-label-md text-label-md text-on-surface-variant">
                        First Name <span className="text-error">*</span>
                      </label>
                      <input
                        className={inputCls(errors.firstName)}
                        placeholder="e.g. John"
                        type="text"
                        value={firstName}
                        onChange={e => setFirstName(e.target.value)}
                      />
                      <FieldError msg={errors.firstName} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="font-label-md text-label-md text-on-surface-variant">
                        Last Name <span className="text-error">*</span>
                      </label>
                      <input
                        className={inputCls(errors.lastName)}
                        placeholder="e.g. Doe"
                        type="text"
                        value={lastName}
                        onChange={e => setLastName(e.target.value)}
                      />
                      <FieldError msg={errors.lastName} />
                    </div>
                  </div>

                  {/* Display Name */}
                  <div className="flex flex-col gap-2">
                    <label className="font-label-md text-label-md text-on-surface-variant">
                      Profile Display Name <span className="text-error">*</span>
                    </label>
                    <input
                      className={inputCls(errors.displayName)}
                      placeholder="How students will see your name"
                      type="text"
                      value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                    />
                    <FieldError msg={errors.displayName} />
                  </div>

                  {/* Birthday + Gender */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
                    <div className="md:col-span-2 flex flex-col gap-2">
                      <label className="font-label-md text-label-md text-on-surface-variant">
                        Birthday <span className="text-error">*</span>
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <select
                          className={selectCls(errors.birthDay)}
                          value={birthDay}
                          onChange={e => setBirthDay(e.target.value)}
                        >
                          <option value="">Day</option>
                          {DAYS.map(d => <option key={d}>{d}</option>)}
                        </select>
                        <select
                          className={selectCls(errors.birthMonth)}
                          value={birthMonth}
                          onChange={e => setBirthMonth(e.target.value)}
                        >
                          <option value="">Month</option>
                          {MONTHS.map(m => <option key={m}>{m}</option>)}
                        </select>
                        <select
                          className={selectCls(errors.birthYear)}
                          value={birthYear}
                          onChange={e => setBirthYear(e.target.value)}
                        >
                          <option value="">Year</option>
                          {YEARS.map(y => <option key={y}>{y}</option>)}
                        </select>
                      </div>
                      {(errors.birthDay || errors.birthMonth || errors.birthYear) && (
                        <FieldError msg="Please select a complete birthday." />
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="font-label-md text-label-md text-on-surface-variant">
                        Gender <span className="text-error">*</span>
                      </label>
                      <select
                        className={selectCls(errors.gender)}
                        value={gender}
                        onChange={e => setGender(e.target.value)}
                      >
                        <option value="">Select</option>
                        <option>Male</option>
                        <option>Female</option>
                        <option>Non-binary</option>
                        <option>Prefer not to say</option>
                      </select>
                      <FieldError msg={errors.gender} />
                    </div>
                  </div>

                  {/* Location + Phone */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
                    <div className="flex flex-col gap-2">
                      <label className="font-label-md text-label-md text-on-surface-variant">
                        Country <span className="text-error">*</span>
                      </label>
                      <select
                        className={selectCls(errors.country)}
                        value={country}
                        onChange={e => setCountry(e.target.value)}
                      >
                        <option value="">Select</option>
                        {COUNTRIES.map(c => <option key={c}>{c}</option>)}
                      </select>
                      <FieldError msg={errors.country} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="font-label-md text-label-md text-on-surface-variant">
                        City <span className="text-error">*</span>
                      </label>
                      <input
                        className={inputCls(errors.city)}
                        placeholder="e.g. Hanoi"
                        type="text"
                        value={city}
                        onChange={e => setCity(e.target.value)}
                      />
                      <FieldError msg={errors.city} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="font-label-md text-label-md text-on-surface-variant">
                        Phone Number <span className="text-error">*</span>
                      </label>
                      <input
                        className={inputCls(errors.phone)}
                        placeholder="+84 90 000 0000"
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                      />
                      <FieldError msg={errors.phone} />
                    </div>
                  </div>

                  {/* Bio */}
                  <div className="flex flex-col gap-2">
                    <label className="font-label-md text-label-md text-on-surface-variant">
                      Bio <span className="text-error">*</span>
                    </label>
                    <textarea
                      className={`p-4 rounded-lg border ${
                        errors.bio ? 'border-error' : 'border-outline'
                      } focus:border-primary focus:ring-0 outline-none transition-all bg-white font-body-md resize-none focus:shadow-[0_0_0_3px_rgba(30,64,175,0.15)]`}
                      placeholder="Share your academic background and teaching philosophy..."
                      rows="5"
                      value={bio}
                      onChange={e => setBio(e.target.value)}
                    />
                    <div className="flex justify-between items-center">
                      <FieldError msg={errors.bio} />
                      <p className={`font-label-sm text-label-sm ml-auto ${bio.length >= 100 ? 'text-green-600' : 'text-on-surface-variant'}`}>
                        {bio.length} / 100 min characters
                      </p>
                    </div>
                  </div>
                </form>
              </div>

              {/* Footer */}
              <div className="p-md md:px-xl md:py-8 border-t border-outline-variant/20 bg-surface-container-lowest flex justify-end items-center gap-4">
                <button
                  className="px-10 h-12 bg-primary text-white font-label-md text-label-md rounded-lg shadow-md hover:brightness-110 active:scale-95 transition-all duration-200"
                  onClick={handleContinue}
                >
                  Continue
                </button>
              </div>
            </>
          )}

          {/* ── Step 2: Experience ────────────────────────────────────────────── */}
          {step === 2 && (
            <>
              <div className="p-lg md:p-xl">
                <div className="mb-lg">
                  <h1 className="font-headline-md text-headline-md text-on-surface mb-2">Professional Experience</h1>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    Tell us about your academic expertise and teaching background.
                  </p>
                </div>

                <form className="space-y-8" onSubmit={e => e.preventDefault()}>
                  {/* Subjects */}
                  <div className="flex flex-col gap-2">
                    <label className="font-label-md text-label-md text-on-surface-variant">
                      Subjects you can teach <span className="text-error">*</span>
                    </label>
                    <div
                      className={`flex flex-wrap gap-2 p-3 border rounded-lg bg-white transition-all ${
                        errors.subjects ? 'border-error' : 'border-outline'
                      }`}
                    >
                      {subjects.map(s => (
                        <span
                          key={s}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full font-label-sm text-label-sm"
                        >
                          {s}
                          <button
                            type="button"
                            onClick={() => removeSubject(s)}
                            className="ml-1 hover:text-error transition-colors"
                          >
                            <span className="material-symbols-outlined text-[14px]">close</span>
                          </button>
                        </span>
                      ))}
                      <input
                        className="flex-1 bg-transparent border-none focus:ring-0 outline-none font-body-md text-body-md min-w-[120px]"
                        placeholder="Type a subject and press Enter…"
                        value={subjectInput}
                        onChange={e => setSubjectInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubject() } }}
                      />
                    </div>
                    {/* Suggested subject chips */}
                    <div className="flex flex-wrap gap-2 mt-1">
                      {SUGGESTED_SUBJECTS.filter(s => !subjects.includes(s)).map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => {
                            if (!subjects.includes(s)) {
                              setSubjects(prev => [...prev, s])
                              setErrors(prev => ({ ...prev, subjects: '' }))
                            }
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1 border border-outline-variant text-on-surface-variant rounded-full font-label-sm text-label-sm hover:border-primary hover:text-primary hover:bg-primary/5 transition-all duration-150 active:scale-95"
                        >
                          <span className="material-symbols-outlined text-[13px]">add</span>
                          {s}
                        </button>
                      ))}
                      {SUGGESTED_SUBJECTS.every(s => subjects.includes(s)) && (
                        <span className="font-label-sm text-label-sm text-green-600 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">check_circle</span>
                          All suggested subjects added
                        </span>
                      )}
                    </div>
                    <FieldError msg={errors.subjects} />
                  </div>

                  {/* Education + Experience */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                    <div className="flex flex-col gap-2">
                      <label className="font-label-md text-label-md text-on-surface-variant">
                        Highest Education Level <span className="text-error">*</span>
                      </label>
                      <select
                        className={selectCls(errors.education)}
                        value={education}
                        onChange={e => setEducation(e.target.value)}
                      >
                        <option value="">Select</option>
                        {EDUCATION_LEVELS.map(l => <option key={l}>{l}</option>)}
                      </select>
                      <FieldError msg={errors.education} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="font-label-md text-label-md text-on-surface-variant">
                        Years of Teaching Experience <span className="text-error">*</span>
                      </label>
                      <input
                        className={inputCls(errors.experienceYears)}
                        placeholder="e.g. 5"
                        type="number"
                        min="0"
                        value={experienceYears}
                        onChange={e => setExperienceYears(e.target.value)}
                      />
                      <FieldError msg={errors.experienceYears} />
                    </div>
                  </div>

                  {/* Language + Rate */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                    <div className="flex flex-col gap-2">
                      <label className="font-label-md text-label-md text-on-surface-variant">
                        Teaching Language <span className="text-error">*</span>
                      </label>
                      <select
                        className={selectCls(errors.language)}
                        value={language}
                        onChange={e => setLanguage(e.target.value)}
                      >
                        <option value="">Select</option>
                        {LANGUAGES.map(l => <option key={l}>{l}</option>)}
                      </select>
                      <FieldError msg={errors.language} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="font-label-md text-label-md text-on-surface-variant">Hourly Rate ($)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-body-md">$</span>
                        <input
                          className={`${inputCls(errors.hourlyRate)} pl-8`}
                          placeholder="45"
                          type="number"
                          min="0"
                          value={hourlyRate}
                          onChange={e => setHourlyRate(e.target.value)}
                        />
                      </div>
                      <FieldError msg={errors.hourlyRate} />
                    </div>
                  </div>

                  {/* Teaching Style */}
                  <div className="flex flex-col gap-2">
                    <label className="font-label-md text-label-md text-on-surface-variant">Teaching Style Description</label>
                    <textarea
                      className="p-4 rounded-lg border border-outline focus:border-primary focus:ring-0 outline-none transition-all bg-white font-body-md resize-none focus:shadow-[0_0_0_3px_rgba(30,64,175,0.15)]"
                      placeholder="Describe your methodology, how you engage with students, and what they can expect from a lesson…"
                      rows="4"
                      value={teachingStyle}
                      onChange={e => setTeachingStyle(e.target.value)}
                    />
                  </div>

                  {/* Qualifications */}
                  <div className="flex flex-col gap-2">
                    <label className="font-label-md text-label-md text-on-surface-variant">Certificates / Qualifications Description</label>
                    <textarea
                      className="p-4 rounded-lg border border-outline focus:border-primary focus:ring-0 outline-none transition-all bg-white font-body-md resize-none focus:shadow-[0_0_0_3px_rgba(30,64,175,0.15)]"
                      placeholder="List your key certifications, academic honors, or specialized training…"
                      rows="3"
                      value={qualifications}
                      onChange={e => setQualifications(e.target.value)}
                    />
                  </div>

                  {/* Pro Tip */}
                  <div className="p-md bg-tertiary-fixed rounded-xl flex gap-md items-start">
                    <span className="material-symbols-outlined text-tertiary flex-shrink-0">info</span>
                    <p className="font-body-md text-body-md text-on-surface">
                      <strong>Pro Tip:</strong> Tutors with detailed teaching style descriptions receive 40% more booking requests. Be as specific as possible!
                    </p>
                  </div>
                </form>
              </div>

              <div className="p-md md:px-xl md:py-8 border-t border-outline-variant/20 bg-surface-container-lowest flex justify-between items-center gap-4">
                <button
                  className="px-8 h-12 bg-transparent text-primary font-label-md text-label-md rounded-lg border border-primary hover:bg-surface-container transition-all duration-200"
                  onClick={handleBack}
                >
                  Back
                </button>
                <button
                  className="px-10 h-12 bg-primary text-white font-label-md text-label-md rounded-lg shadow-md hover:brightness-110 active:scale-95 transition-all duration-200"
                  onClick={handleContinue}
                >
                  Continue
                </button>
              </div>
            </>
          )}

          {/* ── Step 3: Documents ─────────────────────────────────────────────── */}
          {step === 3 && (
            <>
              <div className="p-lg md:p-xl">
                <div className="mb-lg">
                  <h1 className="font-headline-md text-headline-md text-on-surface mb-2">Upload Your Documents</h1>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    Please upload clear image files. These will be securely reviewed by our administrators.
                  </p>
                </div>

                <div className="flex gap-4 p-md bg-secondary-container/50 border border-secondary-container rounded-lg mb-lg">
                  <span className="material-symbols-outlined text-primary flex-shrink-0">shield</span>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    Documents are stored securely and only visible to administrators for verification purposes.
                  </p>
                </div>

                <div className="space-y-md">
                  {/* Profile Photo */}
                  <ImageUploadCard
                    id="upload-profile-photo"
                    label="Profile Photo"
                    description="A professional headshot. Accepted formats: JPG, JPEG, PNG, WEBP. Max 5MB."
                    file={profilePhotoFile}
                    onFileChange={e => handleImageChange(e, setProfilePhotoFile, 'profilePhoto')}
                    onRemove={() => { setProfilePhotoFile(null); setErrors(prev => ({ ...prev, profilePhoto: '' })) }}
                    error={errors.profilePhoto}
                    required
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                    {/* Certificate */}
                    <ImageUploadCard
                      id="upload-certificate"
                      label="Certificate Image"
                      description="Certificate image. Accepted formats: JPG, JPEG, PNG, WEBP. Max 5MB."
                      file={certificateFile}
                      onFileChange={e => handleImageChange(e, setCertificateFile, 'certificate')}
                      onRemove={() => { setCertificateFile(null); setErrors(prev => ({ ...prev, certificate: '' })) }}
                      error={errors.certificate}
                      required
                    />

                    {/* CCCD */}
                    <ImageUploadCard
                      id="upload-cccd"
                      label="CCCD / ID Card Image"
                      description="CCCD / ID Card image. Accepted formats: JPG, JPEG, PNG, WEBP. Max 5MB."
                      file={cccdFile}
                      onFileChange={e => handleImageChange(e, setCccdFile, 'cccd')}
                      onRemove={() => { setCccdFile(null); setErrors(prev => ({ ...prev, cccd: '' })) }}
                      error={errors.cccd}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="p-md md:px-xl md:py-8 border-t border-outline-variant/20 bg-surface-container-lowest flex justify-between items-center gap-4">
                <button
                  className="px-8 h-12 bg-transparent text-primary font-label-md text-label-md rounded-lg border border-primary hover:bg-surface-container transition-all duration-200"
                  onClick={handleBack}
                >
                  Back
                </button>
                <button
                  className="px-10 h-12 bg-primary text-white font-label-md text-label-md rounded-lg shadow-md hover:brightness-110 active:scale-95 transition-all duration-200"
                  onClick={handleContinue}
                >
                  Continue
                </button>
              </div>
            </>
          )}

          {/* ── Step 4: Review & Submit ───────────────────────────────────────── */}
          {step === 4 && (
            <>
              <div className="p-lg md:p-xl space-y-lg">
                <div className="mb-lg">
                  <h1 className="font-headline-md text-headline-md text-on-surface mb-2">Review & Submit</h1>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    Please review your information before submitting your application.
                  </p>
                </div>

                {/* Personal Info */}
                <section className="bg-surface-container-low rounded-xl border border-outline-variant/40 overflow-hidden">
                  <div className="px-md py-sm bg-surface-container border-b border-outline-variant/30 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">person</span>
                    <h2 className="font-label-md text-label-md text-on-surface">Personal Information</h2>
                  </div>
                  <div className="p-md grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6">
                    {[
                      ['First Name', firstName],
                      ['Last Name', lastName],
                      ['Display Name', displayName],
                      ['Birthday', birthDay && birthMonth && birthYear ? `${birthDay} ${birthMonth} ${birthYear}` : '—'],
                      ['Gender', gender],
                      ['Country', country],
                      ['City', city],
                      ['Phone', phone],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <p className="font-label-sm text-label-sm text-on-surface-variant">{label}</p>
                        <p className="font-body-md text-body-md text-on-surface">{value || '—'}</p>
                      </div>
                    ))}
                    <div className="sm:col-span-2">
                      <p className="font-label-sm text-label-sm text-on-surface-variant">Bio</p>
                      <p className="font-body-md text-body-md text-on-surface line-clamp-3">{bio}</p>
                    </div>
                  </div>
                </section>

                {/* Experience */}
                <section className="bg-surface-container-low rounded-xl border border-outline-variant/40 overflow-hidden">
                  <div className="px-md py-sm bg-surface-container border-b border-outline-variant/30 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">work</span>
                    <h2 className="font-label-md text-label-md text-on-surface">Professional Experience</h2>
                  </div>
                  <div className="p-md grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6">
                    {[
                      ['Subjects', subjects.join(', ') || '—'],
                      ['Education Level', education || '—'],
                      ['Years of Experience', experienceYears || '—'],
                      ['Teaching Language', language || '—'],
                      ['Hourly Rate', hourlyRate ? `$${hourlyRate}` : '—'],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <p className="font-label-sm text-label-sm text-on-surface-variant">{label}</p>
                        <p className="font-body-md text-body-md text-on-surface">{value}</p>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Documents Uploaded — image thumbnails only, no PDF */}
                <section className="bg-surface-container-low rounded-xl border border-outline-variant/40 overflow-hidden">
                  <div className="px-md py-sm bg-surface-container border-b border-outline-variant/30 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">description</span>
                    <h2 className="font-label-md text-label-md text-on-surface">Documents Uploaded</h2>
                  </div>
                  <div className="p-md grid grid-cols-1 sm:grid-cols-3 gap-md">
                    {[
                      { label: 'Profile Photo', file: profilePhotoFile },
                      { label: 'Certificate Image', file: certificateFile },
                      { label: 'CCCD / ID Card Image', file: cccdFile },
                    ].map(({ label, file }) => {
                      const url = file ? createObjectURL(file) : null
                      return (
                        <div key={label} className="flex flex-col items-center gap-2">
                          {url ? (
                            <div className="w-full aspect-video rounded-lg overflow-hidden border border-outline-variant bg-surface-container shadow-sm">
                              <img
                                src={url}
                                alt={label}
                                className="w-full h-full object-cover"
                                onLoad={() => URL.revokeObjectURL(url)}
                              />
                            </div>
                          ) : (
                            <div className="w-full aspect-video rounded-lg bg-surface-container border border-outline-variant flex items-center justify-center">
                              <span className="material-symbols-outlined text-[36px] text-on-surface-variant">image</span>
                            </div>
                          )}
                          <div className="text-center">
                            <p className="font-label-md text-label-md text-on-surface">{label}</p>
                            {file ? (
                              <p className="font-label-sm text-label-sm text-green-600 flex items-center justify-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                {file.name}
                              </p>
                            ) : (
                              <p className="font-label-sm text-label-sm text-error">Not uploaded</p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>

                {/* Terms of Service */}
                <section className="bg-surface-container-low rounded-xl border border-outline-variant/40 p-md">
                  <h2 className="font-label-md text-label-md text-on-surface mb-sm">Terms of Service</h2>
                  <div className="h-36 overflow-y-auto text-on-surface-variant font-body-md text-sm p-sm border border-outline-variant rounded-lg bg-white mb-md leading-relaxed">
                    <p className="mb-2"><strong>1. Accuracy of Information</strong></p>
                    <p className="mb-3">By submitting this application, you confirm that all information provided is accurate and matches your government-issued identification documents.</p>
                    <p className="mb-2"><strong>2. Document Verification</strong></p>
                    <p className="mb-3">Your uploaded documents (CCCD/ID Card and Certificate) will be reviewed by our admin team for verification. False documents may result in account suspension.</p>
                    <p className="mb-2"><strong>3. Application Review</strong></p>
                    <p className="mb-3">Your application will be set to "Pending" status and reviewed within 3–5 business days. You will be notified of the outcome via email.</p>
                    <p className="mb-2"><strong>4. Privacy</strong></p>
                    <p>Your personal information and documents are stored securely and will not be shared with third parties without your consent.</p>
                  </div>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      id="tos-checkbox"
                      checked={tosAccepted}
                      onChange={e => {
                        setTosAccepted(e.target.checked)
                        if (e.target.checked) setErrors(prev => ({ ...prev, tos: '' }))
                      }}
                      className="mt-1 w-4 h-4 accent-primary flex-shrink-0"
                    />
                    <span className="font-body-md text-body-md text-on-surface">
                      I have read and agree to the Terms of Service. I confirm all uploaded information and documents are genuine.
                    </span>
                  </label>
                  <FieldError msg={errors.tos} />
                </section>

                {/* Submit message */}
                {submitMessage.text && (
                  <div
                    className={`p-md rounded-xl border font-body-md text-body-md flex items-start gap-3 ${
                      submitMessage.type === 'success'
                        ? 'bg-green-50 border-green-200 text-green-800'
                        : 'bg-error-container border-error text-on-error-container'
                    }`}
                  >
                    <span className="material-symbols-outlined flex-shrink-0">
                      {submitMessage.type === 'success' ? 'check_circle' : 'error'}
                    </span>
                    {submitMessage.text}
                  </div>
                )}
              </div>

              <div className="p-md md:px-xl md:py-8 border-t border-outline-variant/20 bg-surface-container-lowest flex justify-between items-center gap-4">
                <button
                  className="px-8 h-12 bg-transparent text-primary font-label-md text-label-md rounded-lg border border-primary hover:bg-surface-container transition-all duration-200"
                  onClick={handleBack}
                  disabled={submitting}
                >
                  Back
                </button>
                <button
                  className="px-10 h-12 bg-primary text-white font-label-md text-label-md rounded-lg shadow-md hover:brightness-110 active:scale-95 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting && (
                    <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                  )}
                  {submitting ? 'Submitting…' : 'Submit Application'}
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
