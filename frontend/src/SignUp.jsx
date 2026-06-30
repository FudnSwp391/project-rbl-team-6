import { useState } from 'react'
import { useAuth } from './AuthContext'   // ← Global auth state
import { GoogleLogin } from '@react-oauth/google'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const ROLE_OPTIONS = [
  { value: 'student', label: 'Học Sinh', icon: 'school' },
  { value: 'parent', label: 'Phụ Huynh', icon: 'family_home' },
  { value: 'tutor', label: 'Gia Sư', icon: 'history_edu' },
]

export default function SignUp({ onSwitchToSignIn, onGoHome }) {
  const { loginAfterRegister } = useAuth()
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
  const initialRole = window.location.hash.includes('role=tutor') ? 'tutor' : 'student'
  const [role, setRole] = useState(initialRole)
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGoogleError, setIsGoogleError] = useState(false)
  const [googleError, setGoogleError] = useState('')
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false)
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

  const handleGoogleSuccess = async (credentialResponse) => {
    const { credential } = credentialResponse
    if (!credential) {
      setGoogleError('Google không trả về thông tin xác thực hợp lệ.')
      return
    }
    setGoogleError('')
    setIsGoogleSubmitting(true)
    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential, role }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.message || 'Đăng ký bằng Google thất bại.')
      loginAfterRegister(data.token, data.user)
    } catch (error) {
      setGoogleError(error.message || 'Đăng ký bằng Google thất bại.')
    } finally {
      setIsGoogleSubmitting(false)
    }
  }

  const handleInputChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: '' }))
    if (name === 'email') setIsGoogleError(false)
  }

  const validate = () => {
    const nextErrors = {}

    if (!formData.fullName.trim()) {
      nextErrors.fullName = 'Họ và tên là bắt buộc.'
    }

    if (!formData.email.trim()) {
      nextErrors.email = 'Email là bắt buộc.'
    } else if (!EMAIL_REGEX.test(formData.email)) {
      nextErrors.email = 'Vui lòng nhập địa chỉ email hợp lệ.'
    }

    if (!formData.password) {
      nextErrors.password = 'Mật khẩu là bắt buộc.'
    } else if (formData.password.length < 8) {
      nextErrors.password = 'Mật khẩu phải có ít nhất 8 ký tự.'
    }

    if (!formData.confirmPassword) {
      nextErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu của bạn.'
    } else if (formData.password !== formData.confirmPassword) {
      nextErrors.confirmPassword = 'Mật khẩu không khớp.'
    }

    return nextErrors
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const nextErrors = validate()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setIsSubmitting(true)
    try {
      // ── Tutor: kiểm tra email trước, rồi mới lưu sessionStorage ────────────
      if (role === 'tutor') {
        const checkResp = await fetch(`${apiBaseUrl}/api/auth/check-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email.trim() }),
        })
        if (!checkResp.ok) {
          const checkData = await checkResp.json()
          if (checkData?.isGoogleAccount) setIsGoogleError(true)
          throw new Error(checkData?.message || 'Email này đã được đăng ký.')
        }
        sessionStorage.setItem('pendingTutorReg', JSON.stringify({
          fullName: formData.fullName.trim(),
          email: formData.email.trim(),
          password: formData.password,
          role: 'tutor',
        }))
        window.location.hash = '/tutor-profile'
        return
      }

      // ── Student: kiểm tra email trước, lưu sessionStorage, chuyển sang Complete Profile ────────────
      if (role === 'student') {
        const checkResp = await fetch(`${apiBaseUrl}/api/auth/check-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email.trim() }),
        })
        if (!checkResp.ok) {
          const checkData = await checkResp.json()
          if (checkData?.isGoogleAccount) setIsGoogleError(true)
          throw new Error(checkData?.message || 'Email này đã được đăng ký.')
        }
        sessionStorage.setItem('pendingStudentReg', JSON.stringify({
          fullName: formData.fullName.trim(),
          email: formData.email.trim(),
          password: formData.password,
          role: 'student',
        }))
        window.location.hash = '/complete-student-profile'
        return
      }

      // ── Parent: đăng ký API ngay ────────────────
      const response = await fetch(`${apiBaseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          password: formData.password,
          role,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        if (data?.isGoogleAccount) {
          setIsGoogleError(true)
        }
        throw new Error(data?.message || 'Đăng ký thất bại.')
      }

      loginAfterRegister(data.token, data.user)
    } catch (submitError) {
      setErrors((prev) => ({
        ...prev,
        submit: submitError.message || 'Đã xảy ra lỗi. Vui lòng thử lại.',
      }))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <main className="flex-grow flex items-center justify-center py-xl px-gutter max-w-container-max mx-auto w-full bg-gradient-to-br from-[#e0e7ff] via-[#f8f9fb] to-[#fce7f3] dark:from-[#111827] dark:to-[#1f2937] min-h-screen font-sans text-on-surface">
        <div className="bg-white/70 dark:bg-[#2e3132]/70 backdrop-blur-md border border-white/30 shadow-2xl rounded-[2rem] p-10 w-full max-w-lg">
          <div className="text-center mb-lg">
            <h1 className="font-headline-lg text-headline-lg text-primary mb-sm">
              Tạo Tài Khoản
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Tham gia EduX và bắt đầu hành trình của bạn.
            </p>
          </div>

          <div className="mb-md">
            <label className="block font-label-md text-label-md text-on-surface mb-sm">
              Tôi là...
            </label>
            <div className="grid grid-cols-3 gap-sm">
              {ROLE_OPTIONS.map((option) => {
                const isSelected = role === option.value
                return (
                  <div
                    key={option.value}
                    className={`role-card border border-outline-variant rounded-xl p-md flex flex-col items-center justify-center cursor-pointer hover:border-primary ${
                      isSelected
                        ? 'selected border-primary bg-[#f8f9fb]'
                        : 'bg-white'
                    }`}
                    onClick={() => setRole(option.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        setRole(option.value)
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                  >
                    <span
                      className={`material-symbols-outlined text-[32px] mb-xs ${
                        isSelected ? 'text-primary' : 'text-on-surface-variant'
                      }`}
                    >
                      {option.icon}
                    </span>
                    <span className="font-label-md text-label-md text-on-surface">
                      {option.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <form className="space-y-md" onSubmit={handleSubmit} noValidate>
            <div>
              <label
                className="block font-label-md text-label-md text-on-surface mb-xs"
                htmlFor="fullName"
              >
                Họ và Tên
              </label>
              <input
                className="input-field w-full bg-white border border-outline-variant rounded-lg px-md py-sm font-body-md text-body-md text-on-surface placeholder:text-outline h-12"
                id="fullName"
                name="fullName"
                placeholder="Jane Doe"
                type="text"
                value={formData.fullName}
                onChange={handleInputChange}
              />
              {errors.fullName ? (
                <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>
              ) : null}
            </div>

            <div>
              <label
                className="block font-label-md text-label-md text-on-surface mb-xs"
                htmlFor="email"
              >
                Email
              </label>
              <input
                className="input-field w-full bg-white border border-outline-variant rounded-lg px-md py-sm font-body-md text-body-md text-on-surface placeholder:text-outline h-12"
                id="email"
                name="email"
                placeholder="jane@example.com"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
              />
              {errors.email ? (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              ) : null}
            </div>

            <div>
              <label
                className="block font-label-md text-label-md text-on-surface mb-xs"
                htmlFor="password"
              >
                Mật Khẩu
              </label>
              <input
                className="input-field w-full bg-white border border-outline-variant rounded-lg px-md py-sm font-body-md text-body-md text-on-surface placeholder:text-outline h-12"
                id="password"
                name="password"
                placeholder="********"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
              />
              {errors.password ? (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              ) : null}
            </div>

            <div>
              <label
                className="block font-label-md text-label-md text-on-surface mb-xs"
                htmlFor="confirmPassword"
              >
                Xác Nhận Mật Khẩu
              </label>
              <input
                className="input-field w-full bg-white border border-outline-variant rounded-lg px-md py-sm font-body-md text-body-md text-on-surface placeholder:text-outline h-12"
                id="confirmPassword"
                name="confirmPassword"
                placeholder="********"
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
              />
              {errors.confirmPassword ? (
                <p className="mt-1 text-sm text-red-600">
                  {errors.confirmPassword}
                </p>
              ) : null}
            </div>

            {isGoogleError && (
              <div className="rounded-xl bg-amber-50 border border-amber-300 p-4 flex gap-3 items-start">
                <svg className="w-5 h-5 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-800">Email đã đăng ký qua Google</p>
                  <p className="text-xs text-amber-700 mt-1">
                    Email <strong>{formData.email}</strong> đã được liên kết với tài khoản Google.
                    Vui lòng nhấn <strong>"Tiếp tục với Google"</strong> bên dưới để đăng nhập.
                  </p>
                </div>
              </div>
            )}

            {!isGoogleError && errors.submit ? (
              <p className="text-sm text-red-600">{errors.submit}</p>
            ) : null}

            <button
              className="w-full bg-primary text-on-primary font-label-md text-label-md rounded-lg h-12 flex items-center justify-center hover:bg-on-primary-fixed-variant transition-colors duration-200 mt-lg disabled:opacity-70 disabled:cursor-not-allowed"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-on-primary"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                  Đang tạo tài khoản...
                </>
              ) : (
                'Đăng Ký'
              )}
            </button>
          </form>

          <div className="flex items-center my-md">
            <div className="flex-grow border-t border-outline-variant"></div>
            <span className="mx-sm font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
              Hoặc
            </span>
            <div className="flex-grow border-t border-outline-variant"></div>
          </div>

          <div className="w-full bg-white border border-surface-variant rounded-xl min-h-[56px] transition-all duration-200 flex items-center justify-center p-1">
            {googleClientId ? (
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setGoogleError('Cửa sổ đăng ký Google thất bại.')}
                shape="pill" text="signup_with" size="large" width="360" useOneTap={false}
              />
            ) : (
              <p className="font-label-sm text-label-sm text-error px-2 text-center">Missing VITE_GOOGLE_CLIENT_ID</p>
            )}
          </div>
          {isGoogleSubmitting && <p className="mt-2 text-sm text-on-surface-variant text-center">Đang xử lý đăng ký Google...</p>}
          {googleError && <p className="mt-2 text-sm text-red-600 text-center">{googleError}</p>}

          <div className="mt-md text-center">
            <p className="font-body-md text-body-md text-on-surface-variant">
              Đã có tài khoản?{' '}
              <a
                className="text-primary hover:underline font-medium"
                href="#/signin"
                onClick={(event) => {
                  if (onSwitchToSignIn) {
                    event.preventDefault()
                    onSwitchToSignIn()
                  }
                }}
              >
                Đăng Nhập
              </a>
            </p>
          </div>
        </div>
      </main>

      <footer className="bg-surface-container-low dark:bg-inverse-surface w-full mt-xl text-on-surface dark:text-inverse-on-surface font-body-md text-body-md">
        <div className="max-w-container-max mx-auto px-gutter py-lg grid grid-cols-1 md:grid-cols-4 gap-md">
          <div className="md:col-span-1">
            <a
              className="font-headline-md text-headline-md font-bold text-primary dark:text-primary-fixed-dim block mb-sm hover:underline"
              href="#/"
              onClick={(event) => {
                if (onGoHome) {
                  event.preventDefault()
                  onGoHome()
                }
              }}
            >
              EduX
            </a>
            <p className="text-on-secondary-container dark:text-surface-variant">
              Bản quyền 2024 EduX. Trao quyền tri thức toàn cầu.
            </p>
          </div>
          <div className="md:col-span-3 flex flex-wrap gap-md justify-start md:justify-end">
            <a
              className="text-on-secondary-container dark:text-surface-variant hover:underline hover:text-primary dark:hover:text-primary-fixed transition-all"
              href="#" onClick={(e) => e.preventDefault()}
            >
              Tìm Gia Sư
            </a>
            <a
              className="text-on-secondary-container dark:text-surface-variant hover:underline hover:text-primary dark:hover:text-primary-fixed transition-all"
              href="#" onClick={(e) => e.preventDefault()}
            >
              Trở Thành Gia Sư
            </a>
            <a
              className="text-on-secondary-container dark:text-surface-variant hover:underline hover:text-primary dark:hover:text-primary-fixed transition-all"
              href="#" onClick={(e) => e.preventDefault()}
            >
              Môn Học
            </a>
            <a
              className="text-on-secondary-container dark:text-surface-variant hover:underline hover:text-primary dark:hover:text-primary-fixed transition-all"
              href="#" onClick={(e) => e.preventDefault()}
            >
              Về Chúng Tôi
            </a>
            <a
              className="text-on-secondary-container dark:text-surface-variant hover:underline hover:text-primary dark:hover:text-primary-fixed transition-all"
              href="#" onClick={(e) => e.preventDefault()}
            >
              Hỗ Trợ
            </a>
            <a
              className="text-on-secondary-container dark:text-surface-variant hover:underline hover:text-primary dark:hover:text-primary-fixed transition-all"
              href="#" onClick={(e) => e.preventDefault()}
            >
              Chính Sách Bảo Mật
            </a>
          </div>
        </div>
      </footer>

      <style>{`
        .role-card {
          transition: all 0.2s ease-in-out;
        }
        .role-card.selected {
          border-color: #00288e;
          background-color: #f8f9fb;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
        }
        .role-card.selected .material-symbols-outlined {
          color: #00288e;
        }
        .input-field {
          transition: all 0.2s ease-in-out;
        }
        .input-field:focus {
          border-color: #00288e;
          box-shadow: 0 0 0 3px rgba(164, 201, 255, 0.2);
          outline: none;
        }
      `}</style>
    </>
  )
}
