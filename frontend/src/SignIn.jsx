import { useState } from 'react'
import { useAuth } from './AuthContext'
import { GoogleLogin } from '@react-oauth/google'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export default function SignIn({ onSwitchToSignUp, onGoHome }) {
  const { login } = useAuth()
  
  // 'login' | 'forgot_email' | 'forgot_otp' | 'forgot_new_pwd'
  const [viewMode, setViewMode] = useState('login')

  const savedAccountsStr = localStorage.getItem('rememberedAccounts')
  const savedAccounts = savedAccountsStr ? JSON.parse(savedAccountsStr) : {}
  const lastEmail = localStorage.getItem('lastEmail') || localStorage.getItem('rememberedEmail') || ''
  const lastPassword = savedAccounts[lastEmail] || localStorage.getItem('rememberedPassword') || ''

  const [rememberMe, setRememberMe] = useState(!!lastEmail)
  const [formData, setFormData] = useState({
    email: lastEmail,
    password: lastPassword,
  })
  
  const [forgotData, setForgotData] = useState({
    email: '',
    otp: '',
    newPassword: '',
    confirmPassword: ''
  })

  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [googleError, setGoogleError] = useState('')
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false)
  const [suspiciousAlert, setSuspiciousAlert] = useState(null)
  
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

  const handleChange = (event) => {
    const { name, value } = event.target
    if (name === 'email' && savedAccounts[value] && rememberMe) {
      setFormData((prev) => ({ ...prev, email: value, password: savedAccounts[value] }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
    setErrors((prev) => ({ ...prev, [name]: '', submit: '' }))
  }

  const handleForgotChange = (event) => {
    const { name, value } = event.target
    setForgotData((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: '', submit: '', success: '' }))
  }

  // ─── LOGIN LOGIC ─────────────────────────────────────────────────────────────
  const validateLogin = () => {
    const nextErrors = {}
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
    return nextErrors
  }

  const handleLoginSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = validateLogin()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password: formData.password }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.message || 'Đăng nhập thất bại.')
      
      // Save credentials for quick testing
      if (rememberMe) {
        const updatedAccounts = { ...savedAccounts, [formData.email]: formData.password }
        localStorage.setItem('rememberedAccounts', JSON.stringify(updatedAccounts))
        localStorage.setItem('lastEmail', formData.email)
        localStorage.setItem('rememberedPassword', formData.password) // backward comp
      } else {
        const updatedAccounts = { ...savedAccounts }
        delete updatedAccounts[formData.email]
        localStorage.setItem('rememberedAccounts', JSON.stringify(updatedAccounts))
        localStorage.removeItem('lastEmail')
        localStorage.removeItem('rememberedPassword')
      }
      if (data.suspiciousLogin) {
        setSuspiciousAlert(data.loginIP)
        setTimeout(() => { login(data.token, data.user) }, 3500)
      } else {
        login(data.token, data.user)
      }
    } catch (error) {
      setErrors({ submit: error.message || 'Đăng nhập thất bại. Vui lòng thử lại.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogleSuccess = async (credentialResponse) => {
    const credential = credentialResponse?.credential
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
        body: JSON.stringify({ credential }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.message || 'Đăng nhập bằng Google thất bại.')
      if (data.suspiciousLogin) {
        setSuspiciousAlert(data.loginIP)
        setTimeout(() => { login(data.token, data.user) }, 3500)
      } else {
        login(data.token, data.user)
      }
    } catch (error) {
      setGoogleError(error.message || 'Đăng nhập bằng Google thất bại.')
    } finally {
      setIsGoogleSubmitting(false)
    }
  }

  // ─── FORGOT PASSWORD LOGIC ───────────────────────────────────────────────────
  const handleRequestOtp = async (e) => {
    e.preventDefault()
    if (!EMAIL_REGEX.test(forgotData.email)) {
      setErrors({ email: 'Vui lòng nhập địa chỉ email hợp lệ.' })
      return
    }
    setIsSubmitting(true)
    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/forgot-password/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotData.email }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.message || 'Không thể gửi OTP.')
      setErrors({ success: data.message })
      setViewMode('forgot_otp')
    } catch (error) {
      setErrors({ submit: error.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerifyOtpToReset = async (e) => {
    e.preventDefault()
    if (forgotData.otp.length < 6) {
      setErrors({ otp: 'Vui lòng nhập mã OTP gồm 6 chữ số.' })
      return
    }
    setViewMode('forgot_new_pwd')
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    if (forgotData.newPassword.length < 8) {
      setErrors({ newPassword: 'Mật khẩu phải có ít nhất 8 ký tự.' })
      return
    }
    if (forgotData.newPassword !== forgotData.confirmPassword) {
      setErrors({ confirmPassword: 'Mật khẩu không khớp.' })
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/forgot-password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: forgotData.email, 
          otp: forgotData.otp, 
          newPassword: forgotData.newPassword 
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.message || 'Không thể đặt lại mật khẩu.')
      
      setErrors({ success: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay bây giờ.' })
      setViewMode('login')
      setForgotData({ email: '', otp: '', newPassword: '', confirmPassword: '' })
    } catch (error) {
      setErrors({ submit: error.message })
      if (error.message.includes('OTP')) setViewMode('forgot_otp')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─── RENDERS ─────────────────────────────────────────────────────────────────
  const renderLoginForm = () => (
    <div>
      {suspiciousAlert && (
        <div className="mb-4 rounded-xl bg-orange-50 border border-orange-300 p-4 flex gap-3 items-start animate-in fade-in slide-in-from-top-2">
          <span className="material-symbols-outlined text-orange-500 text-[22px] mt-0.5 shrink-0">gpp_maybe</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-orange-800">Đăng nhập từ địa chỉ IP mới</p>
            <p className="text-xs text-orange-700 mt-1">
              Chúng tôi phát hiện đăng nhập từ IP <strong>{suspiciousAlert}</strong> — khác với các lần trước.
              Nếu không phải bạn, hãy đổi mật khẩu ngay.
            </p>
          </div>
          <button type="button" onClick={() => setSuspiciousAlert(null)} className="text-orange-400 hover:text-orange-600 text-lg leading-none">✕</button>
        </div>
      )}
    <form className="space-y-md transition-opacity duration-300 animate-in fade-in" onSubmit={handleLoginSubmit} noValidate>
      <div className="space-y-4">
        <div className="relative group">
          <div className="flex items-center bg-[#f3f4f6]/80 border border-transparent rounded-xl min-h-[56px] px-4 transition-all duration-200 focus-within:border-primary focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(0,40,142,0.1)]">
            <span className="material-symbols-outlined text-outline mr-sm group-focus-within:text-primary">mail</span>
            <input
              className="w-full bg-transparent border-none focus:ring-0 font-body-md text-body-md text-on-surface placeholder:text-outline-variant outline-none"
              placeholder="Địa chỉ Email" required type="email" name="email"
              value={formData.email} onChange={handleChange}
            />
          </div>
          {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
        </div>

        <div className="relative group">
          <div className="flex items-center bg-[#f3f4f6]/80 border border-transparent rounded-xl min-h-[56px] px-4 transition-all duration-200 focus-within:border-primary focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(0,40,142,0.1)]">
            <span className="material-symbols-outlined text-outline mr-sm group-focus-within:text-primary">lock</span>
            <input
              className="w-full bg-transparent border-none focus:ring-0 font-body-md text-body-md text-on-surface placeholder:text-outline-variant outline-none"
              placeholder="Mật Khẩu" required type="password" name="password"
              value={formData.password} onChange={handleChange}
            />
          </div>
          {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
        </div>
      </div>

      <div className="flex justify-between items-center">
        <label className="flex items-center gap-2 cursor-pointer select-none group">
          <div className="relative">
            <input
              type="checkbox"
              className="sr-only"
              checked={rememberMe}
              onChange={e => setRememberMe(e.target.checked)}
            />
            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-150 ${rememberMe ? 'bg-[#00288e] border-[#00288e]' : 'bg-white border-outline-variant group-hover:border-primary'}`}>
              {rememberMe && (
                <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
          </div>
          <span className="font-label-sm text-label-sm text-on-surface-variant">Nhớ mật khẩu</span>
        </label>

        {errors.success ? (
          <p className="text-sm text-green-600 font-medium">{errors.success}</p>
        ) : null}
        <button
          type="button"
          onClick={() => { setViewMode('forgot_email'); setErrors({}); }}
          className="font-label-sm text-label-sm text-primary hover:text-primary-container transition-colors focus:outline-none focus:underline"
        >
          Quên mật khẩu?
        </button>
      </div>

      {errors.submit && <p className="text-sm text-red-600">{errors.submit}</p>}

      <button
        className="w-full bg-[#00288e] hover:bg-primary-container text-white font-label-md text-label-md min-h-[56px] rounded-xl transition-all duration-200 shadow-md hover:shadow-lg focus:outline-none disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
        type="submit" disabled={isSubmitting}
      >
        {isSubmitting ? 'Đang Đăng Nhập...' : 'Đăng Nhập'}
      </button>

      <div className="flex items-center justify-between my-lg relative">
        <div className="h-px bg-surface-variant flex-1"></div>
        <span className="px-4 bg-transparent font-label-sm text-label-sm text-outline z-10 relative">OR</span>
        <div className="h-px bg-surface-variant flex-1"></div>
      </div>

      <div className="w-full bg-white border border-surface-variant rounded-xl min-h-[56px] transition-all duration-200 flex items-center justify-center p-1">
        {googleClientId ? (
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setGoogleError('Cửa sổ đăng nhập Google thất bại.')}
            shape="pill" text="continue_with" size="large" width="360" useOneTap={false}
          />
        ) : (
          <p className="font-label-sm text-label-sm text-error px-2 text-center">Missing VITE_GOOGLE_CLIENT_ID</p>
        )}
      </div>
      {isGoogleSubmitting && <p className="text-sm text-on-surface-variant">Đang xác minh tài khoản Google...</p>}
      {googleError && <p className="text-sm text-red-600">{googleError}</p>}
    </form>
    </div>
  )

  const renderForgotEmail = () => (
    <form className="space-y-md transition-opacity duration-300 animate-in slide-in-from-right-4" onSubmit={handleRequestOtp} noValidate>
      <div className="text-center mb-6">
        <h2 className="text-title-lg font-bold text-on-surface mb-2">Đặt Lại Mật Khẩu</h2>
        <p className="text-body-md text-on-surface-variant">Nhập địa chỉ email của bạn và chúng tôi sẽ gửi mã OTP gồm 6 chữ số để đặt lại mật khẩu.</p>
      </div>
      
      <div className="relative group">
        <div className="flex items-center bg-[#f3f4f6]/80 border border-transparent rounded-xl min-h-[56px] px-4 transition-all duration-200 focus-within:border-primary focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(0,40,142,0.1)]">
          <span className="material-symbols-outlined text-outline mr-sm group-focus-within:text-primary">mail</span>
          <input
            className="w-full bg-transparent border-none focus:ring-0 font-body-md text-body-md text-on-surface placeholder:text-outline-variant outline-none"
            placeholder="Nhập email của bạn" required type="email" name="email"
            value={forgotData.email} onChange={handleForgotChange}
          />
        </div>
        {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
      </div>

      {errors.submit && <p className="text-sm text-red-600">{errors.submit}</p>}

      <button
        className="w-full bg-[#00288e] hover:bg-primary-container text-white font-label-md text-label-md min-h-[56px] rounded-xl transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
        type="submit" disabled={isSubmitting}
      >
        {isSubmitting ? 'Đang Gửi OTP...' : 'Gửi OTP'}
      </button>

      <button
        type="button" onClick={() => { setViewMode('login'); setErrors({}); }}
        className="w-full mt-4 text-center text-primary font-label-md hover:underline"
      >
        Quay Lại Đăng Nhập
      </button>
    </form>
  )

  const renderForgotOtp = () => (
    <form className="space-y-md transition-opacity duration-300 animate-in slide-in-from-right-4" onSubmit={handleVerifyOtpToReset} noValidate>
      <div className="text-center mb-6">
        <h2 className="text-title-lg font-bold text-on-surface mb-2">Nhập Mã OTP</h2>
        <p className="text-body-md text-on-surface-variant">Chúng tôi đã gửi mã gồm 6 chữ số đến <strong>{forgotData.email}</strong></p>
      </div>
      
      <div className="relative group">
        <div className="flex items-center bg-[#f3f4f6]/80 border border-transparent rounded-xl min-h-[56px] px-4 transition-all duration-200 focus-within:border-primary focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(0,40,142,0.1)]">
          <span className="material-symbols-outlined text-outline mr-sm group-focus-within:text-primary">password</span>
          <input
            className="w-full bg-transparent border-none focus:ring-0 font-body-md text-body-md text-on-surface placeholder:text-outline-variant outline-none tracking-widest text-center text-xl"
            placeholder="• • • • • •" required type="text" maxLength={6} name="otp"
            value={forgotData.otp} onChange={handleForgotChange}
          />
        </div>
        {errors.otp && <p className="mt-1 text-sm text-red-600 text-center">{errors.otp}</p>}
        {errors.success && <p className="mt-1 text-sm text-green-600 text-center">{errors.success}</p>}
      </div>

      <button
        className="w-full bg-[#00288e] hover:bg-primary-container text-white font-label-md text-label-md min-h-[56px] rounded-xl transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
        type="submit"
      >
        Xác Minh OTP
      </button>

      <div className="flex justify-between mt-4">
        <button
          type="button" onClick={() => { setViewMode('login'); setErrors({}); }}
          className="text-primary font-label-md hover:underline text-sm"
        >
          Hủy
        </button>
        <button
          type="button" onClick={handleRequestOtp} disabled={isSubmitting}
          className="text-primary font-label-md hover:underline text-sm"
        >
          Gửi Lại OTP
        </button>
      </div>
    </form>
  )

  const renderForgotNewPwd = () => (
    <form className="space-y-md transition-opacity duration-300 animate-in slide-in-from-right-4" onSubmit={handleResetPassword} noValidate>
      <div className="text-center mb-6">
        <h2 className="text-title-lg font-bold text-on-surface mb-2">Mật Khẩu Mới</h2>
        <p className="text-body-md text-on-surface-variant">Tạo mật khẩu mới bảo mật cho tài khoản của bạn.</p>
      </div>
      
      <div className="space-y-4">
        <div className="relative group">
          <div className="flex items-center bg-[#f3f4f6]/80 border border-transparent rounded-xl min-h-[56px] px-4 transition-all duration-200 focus-within:border-primary focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(0,40,142,0.1)]">
            <span className="material-symbols-outlined text-outline mr-sm group-focus-within:text-primary">lock_reset</span>
            <input
              className="w-full bg-transparent border-none focus:ring-0 font-body-md text-body-md text-on-surface placeholder:text-outline-variant outline-none"
              placeholder="Mật khẩu mới (tối thiểu 8 ký tự)" required type="password" name="newPassword"
              value={forgotData.newPassword} onChange={handleForgotChange}
            />
          </div>
          {errors.newPassword && <p className="mt-1 text-sm text-red-600">{errors.newPassword}</p>}
        </div>

        <div className="relative group">
          <div className="flex items-center bg-[#f3f4f6]/80 border border-transparent rounded-xl min-h-[56px] px-4 transition-all duration-200 focus-within:border-primary focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(0,40,142,0.1)]">
            <span className="material-symbols-outlined text-outline mr-sm group-focus-within:text-primary">lock_reset</span>
            <input
              className="w-full bg-transparent border-none focus:ring-0 font-body-md text-body-md text-on-surface placeholder:text-outline-variant outline-none"
              placeholder="Xác nhận mật khẩu mới" required type="password" name="confirmPassword"
              value={forgotData.confirmPassword} onChange={handleForgotChange}
            />
          </div>
          {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>}
        </div>
      </div>

      {errors.submit && <p className="text-sm text-red-600">{errors.submit}</p>}

      <button
        className="w-full bg-[#00288e] hover:bg-primary-container text-white font-label-md text-label-md min-h-[56px] rounded-xl transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
        type="submit" disabled={isSubmitting}
      >
        {isSubmitting ? 'Đang Đặt Lại...' : 'Đặt Lại Mật Khẩu'}
      </button>

      <button
        type="button" onClick={() => { setViewMode('login'); setErrors({}); }}
        className="w-full mt-4 text-center text-primary font-label-md hover:underline"
      >
        Hủy
      </button>
    </form>
  )

  return (
    <>
      <main className="flex-grow flex items-center justify-center p-md relative overflow-hidden bg-gradient-to-br from-[#e0e7ff] via-[#f8f9fb] to-[#fce7f3] dark:from-[#111827] dark:to-[#1f2937] min-h-screen font-headline-md text-on-surface antialiased selection:bg-primary-fixed selection:text-on-primary-fixed">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary-fixed-dim rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
          <div className="absolute top-0 -right-20 w-80 h-80 bg-[#fce7f3] rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-40 left-20 w-96 h-96 bg-[#e0e7ff] rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
        </div>

        <div className="bg-white/70 dark:bg-[#2e3132]/70 backdrop-blur-md border border-white/30 shadow-[0_10px_30px_rgba(0,0,0,0.1)] rounded-[2rem] p-12 max-w-lg w-full relative z-10 transition-all duration-300">
          <div className="flex items-center justify-center mb-xl">
            <span className="material-symbols-outlined text-primary text-4xl mr-base">school</span>
            <h1 className="font-headline-lg text-headline-lg text-primary tracking-tight">EduX</h1>
          </div>

          {viewMode === 'login' && (
            <div className="flex bg-surface-container-low p-1 rounded-xl mb-xl">
              <button
                className="flex-1 py-3 text-center font-label-md text-label-md rounded-lg bg-white shadow-sm text-on-surface transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50"
                id="tab-login" type="button"
              >
                Đăng Nhập
              </button>
              <button
                className="flex-1 py-3 text-center font-label-md text-label-md rounded-lg text-on-surface-variant hover:text-on-surface transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50"
                id="tab-signup" type="button" onClick={onSwitchToSignUp}
              >
                Đăng Ký
              </button>
            </div>
          )}

          {viewMode === 'login' && renderLoginForm()}
          {viewMode === 'forgot_email' && renderForgotEmail()}
          {viewMode === 'forgot_otp' && renderForgotOtp()}
          {viewMode === 'forgot_new_pwd' && renderForgotNewPwd()}
        </div>
      </main>

      <footer className="bg-surface-container-low dark:bg-inverse-surface w-full mt-xl">
        <div className="max-w-container-max mx-auto px-gutter py-lg grid grid-cols-1 md:grid-cols-4 gap-md">
          <div className="md:col-span-1 flex flex-col gap-sm">
            <a className="font-headline-md text-headline-md font-bold text-primary dark:text-primary-fixed-dim flex items-center gap-xs focus:outline-none focus:ring-2 focus:ring-primary rounded" href="#/">
              <span className="material-symbols-outlined">school</span> EduX
            </a>
            <p className="font-body-md text-body-md text-on-surface dark:text-inverse-on-surface mt-xs opacity-80">
              Bản quyền 2024 EduX. Trao quyền tri thức toàn cầu.
            </p>
          </div>
          <div className="md:col-span-3 flex flex-wrap gap-md justify-start md:justify-end">
            <a className="font-body-md text-body-md text-on-secondary-container dark:text-surface-variant hover:underline hover:text-primary dark:hover:text-primary-fixed transition-all" href="#" onClick={(e) => e.preventDefault()}>Tìm Gia Sư</a>
            <a className="font-body-md text-body-md text-on-secondary-container dark:text-surface-variant hover:underline hover:text-primary dark:hover:text-primary-fixed transition-all" href="#" onClick={(e) => e.preventDefault()}>Trở Thành Gia Sư</a>
            <a className="font-body-md text-body-md text-on-secondary-container dark:text-surface-variant hover:underline hover:text-primary dark:hover:text-primary-fixed transition-all" href="#" onClick={(e) => e.preventDefault()}>Môn Học</a>
            <a className="font-body-md text-body-md text-on-secondary-container dark:text-surface-variant hover:underline hover:text-primary dark:hover:text-primary-fixed transition-all" href="#" onClick={(e) => e.preventDefault()}>Về Chúng Tôi</a>
            <a className="font-body-md text-body-md text-on-secondary-container dark:text-surface-variant hover:underline hover:text-primary dark:hover:text-primary-fixed transition-all" href="#" onClick={(e) => e.preventDefault()}>Hỗ Trợ</a>
            <a className="font-body-md text-body-md text-on-secondary-container dark:text-surface-variant hover:underline hover:text-primary dark:hover:text-primary-fixed transition-all" href="#" onClick={(e) => e.preventDefault()}>Chính Sách Bảo Mật</a>
          </div>
        </div>
      </footer>

      <style>{`
        .material-symbols-outlined {
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
      `}</style>
    </>
  )
}
