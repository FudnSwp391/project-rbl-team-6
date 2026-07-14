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
import { uploadAvatarFile, uploadProofFile } from './services/upload'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'))
const MONTHS = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
]
const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 80 }, (_, i) => String(CURRENT_YEAR - 18 - i))

const COUNTRIES = [
  'Vietnam', 'United States', 'United Kingdom', 'Canada', 'Australia',
  'Singapore', 'Japan', 'South Korea', 'Germany', 'France', 'Other',
]

const EDUCATION_LEVELS = [
  'Cử Nhân',
  'Thạc Sĩ',
  'Tiến Sĩ / Nghiên Cứu Sinh',
  'Chứng Chỉ Nghề Nghiệp',
  'Khác',
]

const LANGUAGES = [
  'Tiếng Việt (Bản ngữ)',
  'Tiếng Anh (Bản ngữ)',
  'Tiếng Anh (Thành thạo)',
  'Tiếng Anh (Trung cấp)',
  'Tiếng Trung (Phổ thông)',
  'Tiếng Nhật',
  'Tiếng Hàn',
  'Tiếng Pháp',
  'Tiếng Đức',
  'Tiếng Tây Ban Nha',
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

const SUITABLE_STUDENTS_OPTIONS = [
  'Học sinh Tiểu học (lớp 1–5)',
  'Học sinh THCS (lớp 6–9)',
  'Học sinh THPT (lớp 10–12)',
  'Sinh viên Đại học / Cao đẳng',
  'Người đi làm / Học viên tự do',
  'Trẻ mầm non (dưới 6 tuổi)',
  'Học sinh luyện thi chuyên đề',
  'Học sinh mất gốc / cần bổ trợ',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function validateImageFile(file) {
  if (!file) return null
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return 'Chỉ chấp nhận file ảnh (JPG, JPEG, PNG, WEBP).'
  }
  if (file.size > MAX_SIZE_BYTES) {
    return 'Kích thước file phải dưới 5 MB.'
  }
  return null
}

function createObjectURL(file) {
  if (!file) return null
  try { return URL.createObjectURL(file) } catch { return null }
}

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEPS = ['Về Bạn', 'Kinh Nghiệm', 'Tài Liệu', 'Xem Lại & Nộp']

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
              Thay Đổi
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="px-3 py-1.5 text-sm font-semibold text-error border border-error rounded-lg hover:bg-error/5 transition-colors"
            >
              Xóa
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
          <span className="font-label-md text-label-md text-primary">Nhấp để tải ảnh lên</span>
          <span className="font-label-sm text-label-sm text-on-surface-variant">JPG, JPEG, PNG, WEBP · Tối đa 5 MB</span>
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
  const { token, updateUser } = useAuth()

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

  // ── Step 2 structured fields ──────────────────────────────────────────────────
  const [teachingMethods, setTeachingMethods] = useState([''])
  const [suitableStudents, setSuitableStudents] = useState([])

  // ── Step 3 files ────────────────────────────────────────────────────────────
  const [profilePhotoFile, setProfilePhotoFile] = useState(null)
  const [certificateFiles, setCertificateFiles] = useState([])
  const [certMetadata, setCertMetadata] = useState([])
  const [cccdFrontFile, setCccdFrontFile] = useState(null)
  const [cccdBackFile, setCccdBackFile] = useState(null)

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

  // ── Teaching methods handlers ────────────────────────────────────────────────
  const addTeachingMethod = () => {
    if (teachingMethods.length < 8) setTeachingMethods(prev => [...prev, ''])
  }
  const removeTeachingMethod = (idx) => {
    if (teachingMethods.length > 1) setTeachingMethods(prev => prev.filter((_, i) => i !== idx))
  }
  const updateTeachingMethod = (idx, val) => {
    setTeachingMethods(prev => prev.map((m, i) => i === idx ? val : m))
  }

  // ── Suitable students handlers ────────────────────────────────────────────────
  const toggleSuitableStudent = (option) => {
    setSuitableStudents(prev =>
      prev.includes(option) ? prev.filter(x => x !== option) : [...prev, option])
  }

  // ── Cert metadata helper ──────────────────────────────────────────────────────
  const updateCertMeta = (idx, field, val) => {
    setCertMetadata(prev => prev.map((m, i) => i === idx ? { ...m, [field]: val } : m))
  }

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
    if (!firstName.trim()) e.firstName = 'Tên là bắt buộc.'
    if (!lastName.trim()) e.lastName = 'Họ là bắt buộc.'
    if (!displayName.trim()) e.displayName = 'Tên hiển thị là bắt buộc.'
    if (!birthDay) e.birthDay = 'Vui lòng chọn ngày.'
    if (!birthMonth) e.birthMonth = 'Vui lòng chọn tháng.'
    if (!birthYear) e.birthYear = 'Vui lòng chọn năm.'
    if (!gender) e.gender = 'Vui lòng chọn giới tính.'
    if (!country) e.country = 'Vui lòng chọn quốc gia.'
    if (!city.trim()) e.city = 'Thành phố là bắt buộc.'
    if (!phone.trim()) e.phone = 'Số điện thoại là bắt buộc.'
    if (!bio.trim()) e.bio = 'Giới thiệu bản thân là bắt buộc.'
    else if (bio.trim().length < 100) e.bio = `Giới thiệu phải có ít nhất 100 ký tự (hiện tại: ${bio.trim().length}).`
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const validateStep2 = () => {
    const e = {}
    if (subjects.length === 0) e.subjects = 'Vui lòng thêm ít nhất một môn học.'
    if (!education) e.education = 'Vui lòng chọn trình độ học vấn.'
    if (!experienceYears && experienceYears !== 0) e.experienceYears = 'Số năm kinh nghiệm là bắt buộc.'
    else if (isNaN(Number(experienceYears)) || Number(experienceYears) < 0) e.experienceYears = 'Phải là một số hợp lệ.'
    if (!language) e.language = 'Vui lòng chọn ngôn ngữ giảng dạy.'
    if (hourlyRate !== '' && (isNaN(Number(hourlyRate)) || Number(hourlyRate) < 0)) e.hourlyRate = 'Phải là một số hợp lệ.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleCertificatesChange = useCallback((e) => {
    const newFiles = Array.from(e.target.files || [])
    e.target.value = ''
    const valid = []
    const errs = []
    newFiles.forEach(f => {
      const err = validateImageFile(f)
      if (err) errs.push(`${f.name}: ${err}`)
      else valid.push(f)
    })
    if (errs.length) setErrors(prev => ({ ...prev, certificate: errs.join('; ') }))
    else setErrors(prev => ({ ...prev, certificate: '' }))
    setCertificateFiles(prev => [...prev, ...valid])
    setCertMetadata(prev => [...prev, ...valid.map(() => ({ name: '', cert_type: 'Chứng chỉ', issuer: '', year: '' }))])
  }, [])

  const removeCertificate = useCallback((idx) => {
    setCertificateFiles(prev => prev.filter((_, i) => i !== idx))
    setCertMetadata(prev => prev.filter((_, i) => i !== idx))
  }, [])

  const validateStep3 = () => {
    const e = {}
    if (!profilePhotoFile) e.profilePhoto = 'Ảnh đại diện là bắt buộc.'
    if (certificateFiles.length === 0) e.certificate = 'Bắt buộc tải lên ít nhất 1 chứng chỉ.'
    if (!cccdFrontFile) e.cccdFront = 'Ảnh mặt trước CCCD / CMND là bắt buộc.'
    if (!cccdBackFile) e.cccdBack = 'Ảnh mặt sau CCCD / CMND là bắt buộc.'
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
      setErrors({ tos: 'Bạn phải đồng ý với Điều Khoản Dịch Vụ.' })
      return
    }
    setSubmitting(true)
    setSubmitMessage({ text: '', type: '' })

    try {
      // ── Upload file lên Supabase trước khi gọi lưu profile ────────────────
      let profile_photo_url = null
      let cccd_front_url = null
      let cccd_back_url = null
      let certificate_urls = []

      if (profilePhotoFile) {
        profile_photo_url = await uploadAvatarFile(profilePhotoFile)
      }
      if (cccdFrontFile) {
        cccd_front_url = await uploadProofFile(cccdFrontFile, 'cccd-front')
      }
      if (cccdBackFile) {
        cccd_back_url = await uploadProofFile(cccdBackFile, 'cccd-back')
      }
      // Upload từng chứng chỉ
      if (certificateFiles.length > 0) {
        const uploadPromises = certificateFiles.map(f => uploadProofFile(f, 'certificates'))
        certificate_urls = await Promise.all(uploadPromises)
      }

      const finalCertMetadata = [...certMetadata]
      for (let i = 0; i < certificateFiles.length; i++) {
        const file = certificateFiles[i]
        if (file && !finalCertMetadata[i]?.url) {
          const uploadedUrl = await uploadProofFile(file, 'certificates')
          finalCertMetadata[i].url = uploadedUrl
        }
      }

      // ── Chuẩn bị JSON Payload ──────────────────────────────────────────────
      const payload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        display_name: displayName.trim(),
        gender,
        country,
        city: city.trim(),
        phone: phone.trim(),
        bio: bio.trim(),
        subjects: subjects.join(', '),
        education,
        experience_years: experienceYears,
        language,
        hourly_rate: hourlyRate !== '' ? hourlyRate : null,
        teaching_style: teachingStyle.trim(),
        qualifications: qualifications.trim(),
        teaching_methods: JSON.stringify(teachingMethods.filter(m => m.trim())),
        suitable_students: JSON.stringify(suitableStudents),
        cert_metadata: JSON.stringify(finalCertMetadata),
        certificate_urls: JSON.stringify(certificate_urls),
        profile_photo_url,
        cccd_url: cccd_front_url,         // backward compat: gửi mặt trước làm cccd_url chính
        cccd_front_url,
        cccd_back_url,
      }

      if (birthDay && birthMonth && birthYear) {
        const padM = String(MONTHS.indexOf(birthMonth) + 1).padStart(2, '0')
        payload.birthday = `${birthYear}-${padM}-${birthDay}`
      }

      // ── Gọi API tạo/cập nhật tutor profile ──────────────────────────────────
      const res = await fetch(`${API}/api/tutor/profile`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Submission failed.')

      setSubmitMessage({
        text: 'Hồ sơ đã được nộp thành công! Trạng thái của bạn hiện đang chờ xét duyệt.',
        type: 'success',
      })

      // Cập nhật state AuthContext để App.jsx biết tutor này đang pending
      updateUser({ role: 'tutor', tutor_status: 'pending' })

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
                  <h1 className="font-headline-md text-headline-md text-on-surface mb-2">Tạo hồ sơ gia sư của bạn</h1>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    Hãy cho chúng tôi biết đôi điều về bạn. Thông tin này giúp học sinh tìm được gia sư phù hợp nhất.
                  </p>
                </div>

                <div className="flex gap-4 p-md bg-secondary-container/50 border border-secondary-container rounded-lg mb-lg">
                  <span className="material-symbols-outlined text-primary">info</span>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    Vui lòng đảm bảo thông tin của bạn khớp với giấy tờ tùy thân do cơ quan nhà nước cấp.
                  </p>
                </div>

                <form className="space-y-8" onSubmit={e => e.preventDefault()}>
                  {/* Name Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                    <div className="flex flex-col gap-2">
                      <label className="font-label-md text-label-md text-on-surface-variant">
                        Tên <span className="text-error">*</span>
                      </label>
                      <input
                        className={inputCls(errors.firstName)}
                        placeholder="Ví dụ: Văn A"
                        type="text"
                        value={firstName}
                        onChange={e => setFirstName(e.target.value)}
                      />
                      <FieldError msg={errors.firstName} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="font-label-md text-label-md text-on-surface-variant">
                        Họ <span className="text-error">*</span>
                      </label>
                      <input
                        className={inputCls(errors.lastName)}
                        placeholder="Ví dụ: Nguyễn"
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
                      Tên Hiển Thị Hồ Sơ <span className="text-error">*</span>
                    </label>
                    <input
                      className={inputCls(errors.displayName)}
                      placeholder="Tên mà học sinh sẽ nhìn thấy"
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
                        Ngày Sinh <span className="text-error">*</span>
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <select
                          className={selectCls(errors.birthDay)}
                          value={birthDay}
                          onChange={e => setBirthDay(e.target.value)}
                        >
                          <option value="">Ngày</option>
                          {DAYS.map(d => <option key={d}>{d}</option>)}
                        </select>
                        <select
                          className={selectCls(errors.birthMonth)}
                          value={birthMonth}
                          onChange={e => setBirthMonth(e.target.value)}
                        >
                          <option value="">Tháng</option>
                          {MONTHS.map(m => <option key={m}>{m}</option>)}
                        </select>
                        <select
                          className={selectCls(errors.birthYear)}
                          value={birthYear}
                          onChange={e => setBirthYear(e.target.value)}
                        >
                          <option value="">Năm</option>
                          {YEARS.map(y => <option key={y}>{y}</option>)}
                        </select>
                      </div>
                      {(errors.birthDay || errors.birthMonth || errors.birthYear) && (
                        <FieldError msg="Vui lòng chọn đầy đủ ngày sinh." />
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="font-label-md text-label-md text-on-surface-variant">
                        Giới Tính <span className="text-error">*</span>
                      </label>
                      <select
                        className={selectCls(errors.gender)}
                        value={gender}
                        onChange={e => setGender(e.target.value)}
                      >
                        <option value="">Chọn</option>
                        <option>Nam</option>
                        <option>Nữ</option>
                        <option>Phi nhị giới</option>
                        <option>Không muốn tiết lộ</option>
                      </select>
                      <FieldError msg={errors.gender} />
                    </div>
                  </div>

                  {/* Location + Phone */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
                    <div className="flex flex-col gap-2">
                      <label className="font-label-md text-label-md text-on-surface-variant">
                        Quốc Gia <span className="text-error">*</span>
                      </label>
                      <select
                        className={selectCls(errors.country)}
                        value={country}
                        onChange={e => setCountry(e.target.value)}
                      >
                        <option value="">Chọn</option>
                        {COUNTRIES.map(c => <option key={c}>{c}</option>)}
                      </select>
                      <FieldError msg={errors.country} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="font-label-md text-label-md text-on-surface-variant">
                        Thành Phố <span className="text-error">*</span>
                      </label>
                      <input
                        className={inputCls(errors.city)}
                        placeholder="Ví dụ: Hà Nội"
                        type="text"
                        value={city}
                        onChange={e => setCity(e.target.value)}
                      />
                      <FieldError msg={errors.city} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="font-label-md text-label-md text-on-surface-variant">
                        Số Điện Thoại <span className="text-error">*</span>
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
                      Giới Thiệu Bản Thân <span className="text-error">*</span>
                    </label>
                    <textarea
                      className={`p-4 rounded-lg border ${
                        errors.bio ? 'border-error' : 'border-outline'
                      } focus:border-primary focus:ring-0 outline-none transition-all bg-white font-body-md resize-none focus:shadow-[0_0_0_3px_rgba(30,64,175,0.15)]`}
                      placeholder="Chia sẻ về nền tảng học thuật và triết lý giảng dạy của bạn..."
                      rows="5"
                      value={bio}
                      onChange={e => setBio(e.target.value)}
                    />
                    <div className="flex justify-between items-center">
                      <FieldError msg={errors.bio} />
                      <p className={`font-label-sm text-label-sm ml-auto ${bio.length >= 100 ? 'text-green-600' : 'text-on-surface-variant'}`}>
                        {bio.length} / 100 ký tự tối thiểu
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
                  <h1 className="font-headline-md text-headline-md text-on-surface mb-2">Kinh Nghiệm Chuyên Môn</h1>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    Hãy cho chúng tôi biết về chuyên môn học thuật và kinh nghiệm giảng dạy của bạn.
                  </p>
                </div>

                <form className="space-y-8" onSubmit={e => e.preventDefault()}>
                  {/* Subjects */}
                  <div className="flex flex-col gap-2">
                    <label className="font-label-md text-label-md text-on-surface-variant">
                      Môn học bạn có thể dạy <span className="text-error">*</span>
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
                        placeholder="Nhập môn học và nhấn Enter…"
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
                          Đã thêm tất cả môn học gợi ý
                        </span>
                      )}
                    </div>
                    <FieldError msg={errors.subjects} />
                  </div>

                  {/* Education + Experience */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                    <div className="flex flex-col gap-2">
                      <label className="font-label-md text-label-md text-on-surface-variant">
                        Trình Độ Học Vấn Cao Nhất <span className="text-error">*</span>
                      </label>
                      <select
                        className={selectCls(errors.education)}
                        value={education}
                        onChange={e => setEducation(e.target.value)}
                      >
                        <option value="">Chọn</option>
                        {EDUCATION_LEVELS.map(l => <option key={l}>{l}</option>)}
                      </select>
                      <FieldError msg={errors.education} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="font-label-md text-label-md text-on-surface-variant">
                        Số Năm Kinh Nghiệm Giảng Dạy <span className="text-error">*</span>
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
                        Ngôn Ngữ Giảng Dạy <span className="text-error">*</span>
                      </label>
                      <select
                        className={selectCls(errors.language)}
                        value={language}
                        onChange={e => setLanguage(e.target.value)}
                      >
                        <option value="">Chọn</option>
                        {LANGUAGES.map(l => <option key={l}>{l}</option>)}
                      </select>
                      <FieldError msg={errors.language} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="font-label-md text-label-md text-on-surface-variant">Giá Theo Giờ ($)</label>
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
                    <label className="font-label-md text-label-md text-on-surface-variant">Mô Tả Phương Pháp Giảng Dạy</label>
                    <textarea
                      className="p-4 rounded-lg border border-outline focus:border-primary focus:ring-0 outline-none transition-all bg-white font-body-md resize-none focus:shadow-[0_0_0_3px_rgba(30,64,175,0.15)]"
                      placeholder="Mô tả phương pháp của bạn, cách bạn tương tác với học sinh và những gì học sinh có thể mong đợi từ mỗi buổi học…"
                      rows="4"
                      value={teachingStyle}
                      onChange={e => setTeachingStyle(e.target.value)}
                    />
                  </div>

                  {/* Qualifications */}
                  <div className="flex flex-col gap-2">
                    <label className="font-label-md text-label-md text-on-surface-variant">Mô Tả Chứng Chỉ / Bằng Cấp</label>
                    <textarea
                      className="p-4 rounded-lg border border-outline focus:border-primary focus:ring-0 outline-none transition-all bg-white font-body-md resize-none focus:shadow-[0_0_0_3px_rgba(30,64,175,0.15)]"
                      placeholder="Liệt kê các chứng chỉ quan trọng, danh hiệu học thuật hoặc khóa đào tạo chuyên biệt của bạn…"
                      rows="3"
                      value={qualifications}
                      onChange={e => setQualifications(e.target.value)}
                    />
                  </div>

                  {/* Teaching Methods */}
                  <div className="flex flex-col gap-2">
                    <label className="font-label-md text-label-md text-on-surface-variant">
                      Phương Pháp Giảng Dạy
                    </label>
                    <p className="font-label-sm text-label-sm text-on-surface-variant -mt-1">
                      Mô tả từng bước hoặc phương pháp bạn áp dụng khi dạy (ví dụ: kiểm tra đầu vào, lộ trình học, v.v.)
                    </p>
                    <div className="flex flex-col gap-2">
                      {teachingMethods.map((method, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <span className="flex items-center justify-center w-6 h-6 mt-3 rounded-full bg-primary text-white text-xs font-bold shrink-0">
                            {idx + 1}
                          </span>
                          <textarea
                            className="flex-1 p-3 rounded-lg border border-outline focus:border-primary focus:ring-0 outline-none transition-all bg-white font-body-md resize-none focus:shadow-[0_0_0_3px_rgba(30,64,175,0.15)]"
                            rows={2}
                            placeholder={`Phương pháp ${idx + 1}…`}
                            value={method}
                            onChange={e => updateTeachingMethod(idx, e.target.value)}
                          />
                          {teachingMethods.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeTeachingMethod(idx)}
                              className="mt-2 p-1.5 text-error hover:bg-error/10 rounded-lg transition-colors"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    {teachingMethods.length < 8 && (
                      <button
                        type="button"
                        onClick={addTeachingMethod}
                        className="self-start flex items-center gap-1 px-3 py-1.5 border border-primary text-primary rounded-lg text-label-sm font-label-sm hover:bg-primary/5 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">add</span>
                        Thêm phương pháp
                      </button>
                    )}
                  </div>

                  {/* Suitable Students */}
                  <div className="flex flex-col gap-2">
                    <label className="font-label-md text-label-md text-on-surface-variant">
                      Đối Tượng Học Sinh Phù Hợp
                    </label>
                    <div className="flex flex-wrap gap-2 p-3 border rounded-lg border-outline bg-white">
                      {SUITABLE_STUDENTS_OPTIONS.map(option => {
                        const selected = suitableStudents.includes(option)
                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() => toggleSuitableStudent(option)}
                            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-label-sm font-label-sm border transition-all duration-150 active:scale-95 ${
                              selected
                                ? 'bg-primary text-white border-primary'
                                : 'border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary hover:bg-primary/5'
                            }`}
                          >
                            {selected && <span className="material-symbols-outlined text-[13px]">check</span>}
                            {option}
                          </button>
                        )
                      })}
                    </div>
                    {suitableStudents.length > 0 && (
                      <p className="font-label-sm text-label-sm text-primary">
                        Đã chọn {suitableStudents.length} đối tượng
                      </p>
                    )}
                  </div>

                  {/* Pro Tip */}
                  <div className="p-md bg-tertiary-fixed rounded-xl flex gap-md items-start">
                    <span className="material-symbols-outlined text-tertiary flex-shrink-0">info</span>
                    <p className="font-body-md text-body-md text-on-surface">
                      <strong>Mẹo Hay:</strong> Gia sư có mô tả phương pháp giảng dạy chi tiết nhận được nhiều hơn 40% yêu cầu đặt lịch. Hãy mô tả càng cụ thể càng tốt!
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
                  <h1 className="font-headline-md text-headline-md text-on-surface mb-2">Tải Lên Tài Liệu Của Bạn</h1>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    Vui lòng tải lên file ảnh rõ ràng. Các tài liệu này sẽ được quản trị viên xem xét một cách bảo mật.
                  </p>
                </div>

                <div className="flex gap-4 p-md bg-secondary-container/50 border border-secondary-container rounded-lg mb-lg">
                  <span className="material-symbols-outlined text-primary flex-shrink-0">shield</span>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    Tài liệu được lưu trữ bảo mật và chỉ hiển thị cho quản trị viên để xác minh.
                  </p>
                </div>

                <div className="space-y-md">
                  {/* Profile Photo */}
                  <ImageUploadCard
                    id="upload-profile-photo"
                    label="Ảnh Đại Diện"
                    description="Ảnh chân dung chuyên nghiệp. Định dạng chấp nhận: JPG, JPEG, PNG, WEBP. Tối đa 5MB."
                    file={profilePhotoFile}
                    onFileChange={e => handleImageChange(e, setProfilePhotoFile, 'profilePhoto')}
                    onRemove={() => { setProfilePhotoFile(null); setErrors(prev => ({ ...prev, profilePhoto: '' })) }}
                    error={errors.profilePhoto}
                    required
                  />

                  {/* Certificates — multiple */}
                  <div className="rounded-xl border border-outline-variant bg-surface-container-low p-md">
                    <div className="flex justify-between items-start mb-sm">
                      <div>
                        <p className="font-label-md text-label-md text-on-surface">Chứng chỉ / Bằng cấp <span className="text-error">*</span></p>
                        <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">Có thể tải lên nhiều chứng chỉ (tối đa 10)</p>
                      </div>
                      <label
                        htmlFor="upload-certificates"
                        className="cursor-pointer flex items-center gap-1 px-sm py-xs bg-primary text-on-primary rounded-lg text-label-sm font-label-sm hover:opacity-90 transition-opacity shrink-0"
                      >
                        <span className="material-symbols-outlined text-[16px]">add</span>Thêm
                        <input
                          id="upload-certificates"
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          multiple
                          className="hidden"
                          onChange={handleCertificatesChange}
                          disabled={certificateFiles.length >= 10}
                        />
                      </label>
                    </div>
                    {errors.certificate && <p className="text-error text-label-sm mb-sm">{errors.certificate}</p>}
                    {certificateFiles.length === 0 ? (
                      <div className="border-2 border-dashed border-outline-variant rounded-lg p-lg flex flex-col items-center gap-2 text-on-surface-variant">
                        <span className="material-symbols-outlined text-4xl">workspace_premium</span>
                        <p className="text-body-sm font-body-sm">Chưa có chứng chỉ nào. Nhấn "Thêm" để tải lên.</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-sm mt-xs">
                        {certificateFiles.map((f, i) => {
                          const url = createObjectURL(f)
                          const meta = certMetadata[i] || { name: '', cert_type: 'Chứng chỉ', issuer: '', year: '' }
                          return (
                            <div key={i} className="flex gap-sm p-sm border border-outline-variant rounded-xl bg-surface">
                              {/* Thumbnail */}
                              <div className="relative w-24 h-20 rounded-lg overflow-hidden border border-outline-variant bg-surface-container shrink-0">
                                {url && <img src={url} alt={f.name} className="w-full h-full object-cover" onLoad={() => URL.revokeObjectURL(url)} />}
                                <button
                                  type="button"
                                  onClick={() => removeCertificate(i)}
                                  className="absolute top-0.5 right-0.5 w-5 h-5 bg-error text-on-error rounded-full flex items-center justify-center hover:opacity-90"
                                >
                                  <span className="material-symbols-outlined text-[11px]">close</span>
                                </button>
                              </div>
                              {/* Metadata fields */}
                              <div className="flex-1 flex flex-col gap-xs min-w-0">
                                <input
                                  className="h-8 px-2 text-sm rounded-lg border border-outline focus:border-primary outline-none transition-all bg-white"
                                  placeholder="Tên chứng chỉ / bằng cấp…"
                                  value={meta.name}
                                  onChange={e => updateCertMeta(i, 'name', e.target.value)}
                                />
                                <div className="grid grid-cols-2 gap-xs">
                                  <input
                                    className="h-8 px-2 text-sm rounded-lg border border-outline focus:border-primary outline-none transition-all bg-white"
                                    placeholder="Đơn vị cấp…"
                                    value={meta.issuer}
                                    onChange={e => updateCertMeta(i, 'issuer', e.target.value)}
                                  />
                                  <input
                                    type="number"
                                    className="h-8 px-2 text-sm rounded-lg border border-outline focus:border-primary outline-none transition-all bg-white"
                                    placeholder="Năm cấp"
                                    min="1990"
                                    max={new Date().getFullYear()}
                                    value={meta.year}
                                    onChange={e => updateCertMeta(i, 'year', e.target.value)}
                                  />
                                </div>
                                <p className="text-[11px] text-on-surface-variant truncate">{f.name}</p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* CCCD — 2 mặt */}
                  <div className="rounded-xl border border-outline-variant bg-surface-container-low p-md">
                    <div className="mb-sm">
                      <p className="font-label-md text-label-md text-on-surface">
                        Ảnh CCCD / CMND <span className="text-error">*</span>
                      </p>
                      <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">
                        Yêu cầu tải lên cả 2 mặt của CCCD / CMND. Định dạng: JPG, JPEG, PNG, WEBP. Tối đa 5MB mỗi ảnh.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                      <ImageUploadCard
                        id="upload-cccd-front"
                        label="Mặt Trước"
                        description="Mặt có ảnh chân dung và thông tin cá nhân"
                        file={cccdFrontFile}
                        onFileChange={e => handleImageChange(e, setCccdFrontFile, 'cccdFront')}
                        onRemove={() => { setCccdFrontFile(null); setErrors(prev => ({ ...prev, cccdFront: '' })) }}
                        error={errors.cccdFront}
                        required
                      />
                      <ImageUploadCard
                        id="upload-cccd-back"
                        label="Mặt Sau"
                        description="Mặt có mã QR và thông tin bổ sung"
                        file={cccdBackFile}
                        onFileChange={e => handleImageChange(e, setCccdBackFile, 'cccdBack')}
                        onRemove={() => { setCccdBackFile(null); setErrors(prev => ({ ...prev, cccdBack: '' })) }}
                        error={errors.cccdBack}
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-md md:px-xl md:py-8 border-t border-outline-variant/20 bg-surface-container-lowest flex justify-between items-center gap-4">
                <button
                  className="px-8 h-12 bg-transparent text-primary font-label-md text-label-md rounded-lg border border-primary hover:bg-surface-container transition-all duration-200"
                  onClick={handleBack}
                >
                  Quay Lại
                </button>
                <button
                  className="px-10 h-12 bg-primary text-white font-label-md text-label-md rounded-lg shadow-md hover:brightness-110 active:scale-95 transition-all duration-200"
                  onClick={handleContinue}
                >
                  Tiếp Tục
                </button>
              </div>
            </>
          )}

          {/* ── Step 4: Review & Submit ───────────────────────────────────────── */}
          {step === 4 && (
            <>
              <div className="p-lg md:p-xl space-y-lg">
                <div className="mb-lg">
                  <h1 className="font-headline-md text-headline-md text-on-surface mb-2">Xem Lại & Nộp Hồ Sơ</h1>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    Vui lòng kiểm tra lại thông tin của bạn trước khi nộp hồ sơ.
                  </p>
                </div>

                {/* Personal Info */}
                <section className="bg-surface-container-low rounded-xl border border-outline-variant/40 overflow-hidden">
                  <div className="px-md py-sm bg-surface-container border-b border-outline-variant/30 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">person</span>
                    <h2 className="font-label-md text-label-md text-on-surface">Thông Tin Cá Nhân</h2>
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
                      <p className="font-label-sm text-label-sm text-on-surface-variant">Giới Thiệu Bản Thân</p>
                      <p className="font-body-md text-body-md text-on-surface line-clamp-3">{bio}</p>
                    </div>
                  </div>
                </section>

                {/* Experience */}
                <section className="bg-surface-container-low rounded-xl border border-outline-variant/40 overflow-hidden">
                  <div className="px-md py-sm bg-surface-container border-b border-outline-variant/30 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">work</span>
                    <h2 className="font-label-md text-label-md text-on-surface">Kinh Nghiệm Chuyên Môn</h2>
                  </div>
                  <div className="p-md grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6">
                    {[
                      ['Môn Học', subjects.join(', ') || '—'],
                      ['Trình Độ Học Vấn', education || '—'],
                      ['Số Năm Kinh Nghiệm', experienceYears || '—'],
                      ['Ngôn Ngữ Giảng Dạy', language || '—'],
                      ['Giá Theo Giờ', hourlyRate ? `$${hourlyRate}` : '—'],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <p className="font-label-sm text-label-sm text-on-surface-variant">{label}</p>
                        <p className="font-body-md text-body-md text-on-surface">{value}</p>
                      </div>
                    ))}
                    {teachingMethods.filter(m => m.trim()).length > 0 && (
                      <div className="sm:col-span-2">
                        <p className="font-label-sm text-label-sm text-on-surface-variant mb-1">Phương Pháp Giảng Dạy</p>
                        <ol className="list-decimal list-inside space-y-1">
                          {teachingMethods.filter(m => m.trim()).map((m, i) => (
                            <li key={i} className="font-body-md text-body-md text-on-surface">{m}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                    {suitableStudents.length > 0 && (
                      <div className="sm:col-span-2">
                        <p className="font-label-sm text-label-sm text-on-surface-variant mb-1">Đối Tượng Phù Hợp</p>
                        <div className="flex flex-wrap gap-1">
                          {suitableStudents.map(s => (
                            <span key={s} className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-label-sm font-label-sm">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                {/* Documents Uploaded — image thumbnails only, no PDF */}
                <section className="bg-surface-container-low rounded-xl border border-outline-variant/40 overflow-hidden">
                  <div className="px-md py-sm bg-surface-container border-b border-outline-variant/30 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">description</span>
                    <h2 className="font-label-md text-label-md text-on-surface">Tài Liệu Đã Tải Lên</h2>
                  </div>
                  <div className="p-md grid grid-cols-1 sm:grid-cols-3 gap-md">
                    {[
                      { label: 'Ảnh Đại Diện', file: profilePhotoFile },
                      { label: 'CCCD Mặt Trước', file: cccdFrontFile },
                      { label: 'CCCD Mặt Sau', file: cccdBackFile },
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
                              <p className="font-label-sm text-label-sm text-error">Chưa tải lên</p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                    {/* Certificates preview */}
                    {certificateFiles.map((f, i) => {
                      const url = createObjectURL(f)
                      return (
                        <div key={i} className="flex flex-col items-center gap-2">
                          {url ? (
                            <div className="w-full aspect-video rounded-lg overflow-hidden border border-outline-variant bg-surface-container shadow-sm">
                              <img src={url} alt={f.name} className="w-full h-full object-cover" onLoad={() => URL.revokeObjectURL(url)} />
                            </div>
                          ) : (
                            <div className="w-full aspect-video rounded-lg bg-surface-container border border-outline-variant flex items-center justify-center">
                              <span className="material-symbols-outlined text-[36px] text-on-surface-variant">workspace_premium</span>
                            </div>
                          )}
                          <div className="text-center">
                            <p className="font-label-md text-label-md text-on-surface">Chứng chỉ {i + 1}</p>
                            <p className="font-label-sm text-label-sm text-green-600 flex items-center justify-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">check_circle</span>{f.name}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                    {certificateFiles.length === 0 && (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-full aspect-video rounded-lg bg-surface-container border border-outline-variant flex items-center justify-center">
                          <span className="material-symbols-outlined text-[36px] text-on-surface-variant">workspace_premium</span>
                        </div>
                        <div className="text-center">
                          <p className="font-label-md text-label-md text-on-surface">Chứng chỉ</p>
                          <p className="font-label-sm text-label-sm text-error">Chưa tải lên</p>
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                {/* Terms of Service */}
                <section className="bg-surface-container-low rounded-xl border border-outline-variant/40 p-md">
                  <h2 className="font-label-md text-label-md text-on-surface mb-sm">Điều Khoản Dịch Vụ</h2>
                  <div className="h-36 overflow-y-auto text-on-surface-variant font-body-md text-sm p-sm border border-outline-variant rounded-lg bg-white mb-md leading-relaxed">
                    <p className="mb-2"><strong>1. Tính Chính Xác Của Thông Tin</strong></p>
                    <p className="mb-3">Bằng cách nộp hồ sơ này, bạn xác nhận rằng tất cả thông tin cung cấp là chính xác và khớp với giấy tờ tùy thân do cơ quan nhà nước cấp.</p>
                    <p className="mb-2"><strong>2. Xác Minh Tài Liệu</strong></p>
                    <p className="mb-3">Các tài liệu bạn tải lên (CCCD/CMND và Chứng chỉ) sẽ được đội ngũ quản trị viên xem xét để xác minh. Tài liệu giả mạo có thể dẫn đến việc khóa tài khoản.</p>
                    <p className="mb-2"><strong>3. Xem Xét Hồ Sơ</strong></p>
                    <p className="mb-3">Hồ sơ của bạn sẽ được đặt ở trạng thái "Chờ Xét Duyệt" và được xem xét trong vòng 3–5 ngày làm việc. Bạn sẽ được thông báo kết quả qua email.</p>
                    <p className="mb-2"><strong>4. Quyền Riêng Tư</strong></p>
                    <p>Thông tin cá nhân và tài liệu của bạn được lưu trữ bảo mật và sẽ không được chia sẻ với bên thứ ba khi chưa có sự đồng ý của bạn.</p>
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
                      Tôi đã đọc và đồng ý với Điều Khoản Dịch Vụ. Tôi xác nhận tất cả thông tin và tài liệu đã tải lên là xác thực.
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
                  Quay Lại
                </button>
                <button
                  className="px-10 h-12 bg-primary text-white font-label-md text-label-md rounded-lg shadow-md hover:brightness-110 active:scale-95 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting && (
                    <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                  )}
                  {submitting ? 'Đang nộp…' : 'Nộp Hồ Sơ'}
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
