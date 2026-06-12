import { useState } from 'react'
import { useAuth } from './AuthContext'
import { GoogleLogin } from '@react-oauth/google'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export default function SignIn({ onSwitchToSignUp, onGoHome }) {
  const { login } = useAuth()
  
  // 'login' | 'forgot_email' | 'forgot_otp' | 'forgot_new_pwd'
  const [viewMode, setViewMode] = useState('login')

  const [formData, setFormData] = useState({
    email: '',
    password: '',
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
  
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
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
      nextErrors.email = 'Email is required.'
    } else if (!EMAIL_REGEX.test(formData.email)) {
      nextErrors.email = 'Please enter a valid email address.'
    }
    if (!formData.password) {
      nextErrors.password = 'Password is required.'
    } else if (formData.password.length < 8) {
      nextErrors.password = 'Password must be at least 8 characters.'
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
      if (!response.ok) throw new Error(data?.message || 'Sign in failed.')
      login(data.token, data.user)
    } catch (error) {
      setErrors({ submit: error.message || 'Sign in failed. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogleSuccess = async (credentialResponse) => {
    const credential = credentialResponse?.credential
    if (!credential) {
      setGoogleError('Google did not return a valid credential.')
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
      if (!response.ok) throw new Error(data?.message || 'Google sign in failed.')
      login(data.token, data.user)
    } catch (error) {
      setGoogleError(error.message || 'Google sign in failed.')
    } finally {
      setIsGoogleSubmitting(false)
    }
  }

  // ─── FORGOT PASSWORD LOGIC ───────────────────────────────────────────────────
  const handleRequestOtp = async (e) => {
    e.preventDefault()
    if (!EMAIL_REGEX.test(forgotData.email)) {
      setErrors({ email: 'Please enter a valid email address.' })
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
      if (!response.ok) throw new Error(data?.message || 'Failed to request OTP.')
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
      setErrors({ otp: 'Please enter the 6-digit OTP.' })
      return
    }
    setViewMode('forgot_new_pwd')
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    if (forgotData.newPassword.length < 8) {
      setErrors({ newPassword: 'Password must be at least 8 characters.' })
      return
    }
    if (forgotData.newPassword !== forgotData.confirmPassword) {
      setErrors({ confirmPassword: 'Passwords do not match.' })
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
      if (!response.ok) throw new Error(data?.message || 'Failed to reset password.')
      
      setErrors({ success: 'Password reset successfully! You can now log in.' })
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
    <form className="space-y-md transition-opacity duration-300 animate-in fade-in" onSubmit={handleLoginSubmit} noValidate>
      <div className="space-y-4">
        <div className="relative group">
          <div className="flex items-center bg-[#f3f4f6]/80 border border-transparent rounded-xl min-h-[56px] px-4 transition-all duration-200 focus-within:border-primary focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(0,40,142,0.1)]">
            <span className="material-symbols-outlined text-outline mr-sm group-focus-within:text-primary">mail</span>
            <input
              className="w-full bg-transparent border-none focus:ring-0 font-body-md text-body-md text-on-surface placeholder:text-outline-variant outline-none"
              placeholder="Email address" required type="email" name="email"
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
              placeholder="Password" required type="password" name="password"
              value={formData.password} onChange={handleChange}
            />
          </div>
          {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
        </div>
      </div>

      <div className="flex justify-between items-center">
        {errors.success ? (
          <p className="text-sm text-green-600 font-medium">{errors.success}</p>
        ) : <div/>}
        <button
          type="button"
          onClick={() => { setViewMode('forgot_email'); setErrors({}); }}
          className="font-label-sm text-label-sm text-primary hover:text-primary-container transition-colors focus:outline-none focus:underline"
        >
          Forgot password?
        </button>
      </div>

      {errors.submit && <p className="text-sm text-red-600">{errors.submit}</p>}

      <button
        className="w-full bg-[#00288e] hover:bg-primary-container text-white font-label-md text-label-md min-h-[56px] rounded-xl transition-all duration-200 shadow-md hover:shadow-lg focus:outline-none disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
        type="submit" disabled={isSubmitting}
      >
        {isSubmitting ? 'Signing In...' : 'Sign In'}
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
            onError={() => setGoogleError('Google sign in popup failed.')}
            shape="pill" text="continue_with" size="large" width="360" useOneTap={false}
          />
        ) : (
          <p className="font-label-sm text-label-sm text-error px-2 text-center">Missing VITE_GOOGLE_CLIENT_ID</p>
        )}
      </div>
      {isGoogleSubmitting && <p className="text-sm text-on-surface-variant">Verifying Google account...</p>}
      {googleError && <p className="text-sm text-red-600">{googleError}</p>}
    </form>
  )

  const renderForgotEmail = () => (
    <form className="space-y-md transition-opacity duration-300 animate-in slide-in-from-right-4" onSubmit={handleRequestOtp} noValidate>
      <div className="text-center mb-6">
        <h2 className="text-title-lg font-bold text-on-surface mb-2">Reset Password</h2>
        <p className="text-body-md text-on-surface-variant">Enter your email address and we'll send you a 6-digit OTP to reset your password.</p>
      </div>
      
      <div className="relative group">
        <div className="flex items-center bg-[#f3f4f6]/80 border border-transparent rounded-xl min-h-[56px] px-4 transition-all duration-200 focus-within:border-primary focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(0,40,142,0.1)]">
          <span className="material-symbols-outlined text-outline mr-sm group-focus-within:text-primary">mail</span>
          <input
            className="w-full bg-transparent border-none focus:ring-0 font-body-md text-body-md text-on-surface placeholder:text-outline-variant outline-none"
            placeholder="Enter your email" required type="email" name="email"
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
        {isSubmitting ? 'Sending OTP...' : 'Send OTP'}
      </button>

      <button
        type="button" onClick={() => { setViewMode('login'); setErrors({}); }}
        className="w-full mt-4 text-center text-primary font-label-md hover:underline"
      >
        Back to Login
      </button>
    </form>
  )

  const renderForgotOtp = () => (
    <form className="space-y-md transition-opacity duration-300 animate-in slide-in-from-right-4" onSubmit={handleVerifyOtpToReset} noValidate>
      <div className="text-center mb-6">
        <h2 className="text-title-lg font-bold text-on-surface mb-2">Enter OTP</h2>
        <p className="text-body-md text-on-surface-variant">We've sent a 6-digit code to <strong>{forgotData.email}</strong></p>
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
        Verify OTP
      </button>

      <div className="flex justify-between mt-4">
        <button
          type="button" onClick={() => { setViewMode('login'); setErrors({}); }}
          className="text-primary font-label-md hover:underline text-sm"
        >
          Cancel
        </button>
        <button
          type="button" onClick={handleRequestOtp} disabled={isSubmitting}
          className="text-primary font-label-md hover:underline text-sm"
        >
          Resend OTP
        </button>
      </div>
    </form>
  )

  const renderForgotNewPwd = () => (
    <form className="space-y-md transition-opacity duration-300 animate-in slide-in-from-right-4" onSubmit={handleResetPassword} noValidate>
      <div className="text-center mb-6">
        <h2 className="text-title-lg font-bold text-on-surface mb-2">New Password</h2>
        <p className="text-body-md text-on-surface-variant">Create a new secure password for your account.</p>
      </div>
      
      <div className="space-y-4">
        <div className="relative group">
          <div className="flex items-center bg-[#f3f4f6]/80 border border-transparent rounded-xl min-h-[56px] px-4 transition-all duration-200 focus-within:border-primary focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(0,40,142,0.1)]">
            <span className="material-symbols-outlined text-outline mr-sm group-focus-within:text-primary">lock_reset</span>
            <input
              className="w-full bg-transparent border-none focus:ring-0 font-body-md text-body-md text-on-surface placeholder:text-outline-variant outline-none"
              placeholder="New password (min 8 chars)" required type="password" name="newPassword"
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
              placeholder="Confirm new password" required type="password" name="confirmPassword"
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
        {isSubmitting ? 'Resetting...' : 'Reset Password'}
      </button>

      <button
        type="button" onClick={() => { setViewMode('login'); setErrors({}); }}
        className="w-full mt-4 text-center text-primary font-label-md hover:underline"
      >
        Cancel
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
                Login
              </button>
              <button
                className="flex-1 py-3 text-center font-label-md text-label-md rounded-lg text-on-surface-variant hover:text-on-surface transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50"
                id="tab-signup" type="button" onClick={onSwitchToSignUp}
              >
                Sign Up
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
              Copyright 2024 EduX. Empowering minds globally.
            </p>
          </div>
          <div className="md:col-span-3 flex flex-wrap gap-md justify-start md:justify-end">
            <a className="font-body-md text-body-md text-on-secondary-container dark:text-surface-variant hover:underline hover:text-primary dark:hover:text-primary-fixed transition-all" href="#">Find Tutors</a>
            <a className="font-body-md text-body-md text-on-secondary-container dark:text-surface-variant hover:underline hover:text-primary dark:hover:text-primary-fixed transition-all" href="#">Become a Tutor</a>
            <a className="font-body-md text-body-md text-on-secondary-container dark:text-surface-variant hover:underline hover:text-primary dark:hover:text-primary-fixed transition-all" href="#">Subjects</a>
            <a className="font-body-md text-body-md text-on-secondary-container dark:text-surface-variant hover:underline hover:text-primary dark:hover:text-primary-fixed transition-all" href="#">About Us</a>
            <a className="font-body-md text-body-md text-on-secondary-container dark:text-surface-variant hover:underline hover:text-primary dark:hover:text-primary-fixed transition-all" href="#">Support</a>
            <a className="font-body-md text-body-md text-on-secondary-container dark:text-surface-variant hover:underline hover:text-primary dark:hover:text-primary-fixed transition-all" href="#">Privacy Policy</a>
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
