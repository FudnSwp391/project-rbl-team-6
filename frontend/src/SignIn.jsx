import { useState } from 'react'
import { GoogleLogin } from '@react-oauth/google'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export default function SignIn({ onSwitchToSignUp, onGoHome }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
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

  const validate = () => {
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

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = validate()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.message || 'Sign in failed.')
      }

      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      if (onGoHome) onGoHome()
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        submit: error.message || 'Sign in failed. Please try again.',
      }))
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
      if (!response.ok) {
        throw new Error(data?.message || 'Google sign in failed.')
      }

      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      if (onGoHome) onGoHome()
    } catch (error) {
      setGoogleError(error.message || 'Google sign in failed.')
    } finally {
      setIsGoogleSubmitting(false)
    }
  }

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
            <span className="material-symbols-outlined text-primary text-4xl mr-base">
              school
            </span>
            <h1 className="font-headline-lg text-headline-lg text-primary tracking-tight">
              EduX
            </h1>
          </div>

          <div className="flex bg-surface-container-low p-1 rounded-xl mb-xl">
            <button
              className="flex-1 py-3 text-center font-label-md text-label-md rounded-lg bg-white shadow-sm text-on-surface transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50"
              id="tab-login"
              type="button"
            >
              Login
            </button>
            <button
              className="flex-1 py-3 text-center font-label-md text-label-md rounded-lg text-on-surface-variant hover:text-on-surface transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50"
              id="tab-signup"
              type="button"
              onClick={onSwitchToSignUp}
            >
              Sign Up
            </button>
          </div>

          <form className="space-y-md transition-opacity duration-300" onSubmit={handleSubmit} noValidate>
            <div className="space-y-4">
              <div className="relative group">
                <div className="flex items-center bg-[#f3f4f6]/80 border border-transparent rounded-xl min-h-[56px] px-4 transition-all duration-200 focus-within:border-primary focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(0,40,142,0.1)]">
                  <span className="material-symbols-outlined text-outline mr-sm group-focus-within:text-primary">
                    mail
                  </span>
                  <input
                    className="w-full bg-transparent border-none focus:ring-0 font-body-md text-body-md text-on-surface placeholder:text-outline-variant outline-none"
                    placeholder="Email address"
                    required
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>
                {errors.email ? (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                ) : null}
              </div>

              <div className="relative group">
                <div className="flex items-center bg-[#f3f4f6]/80 border border-transparent rounded-xl min-h-[56px] px-4 transition-all duration-200 focus-within:border-primary focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(0,40,142,0.1)]">
                  <span className="material-symbols-outlined text-outline mr-sm group-focus-within:text-primary">
                    lock
                  </span>
                  <input
                    className="w-full bg-transparent border-none focus:ring-0 font-body-md text-body-md text-on-surface placeholder:text-outline-variant outline-none"
                    placeholder="Password"
                    required
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                  />
                  <button
                    className="text-outline hover:text-on-surface focus:outline-none focus:text-primary ml-sm"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      visibility_off
                    </span>
                  </button>
                </div>
                {errors.password ? (
                  <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                ) : null}
              </div>
            </div>

            <div className="flex justify-end">
              <a
                className="font-label-sm text-label-sm text-primary hover:text-primary-container transition-colors focus:outline-none focus:underline"
                href="#"
              >
                Forgot password?
              </a>
            </div>

            {errors.submit ? (
              <p className="text-sm text-red-600">{errors.submit}</p>
            ) : null}

            <button
              className="w-full bg-[#00288e] hover:bg-primary-container text-white font-label-md text-label-md min-h-[56px] rounded-xl transition-all duration-200 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </button>

            <div className="flex items-center justify-between my-lg relative">
              <div className="h-px bg-surface-variant flex-1"></div>
              <span className="px-4 bg-transparent font-label-sm text-label-sm text-outline z-10 relative">
                OR
              </span>
              <div className="h-px bg-surface-variant flex-1"></div>
            </div>

            <div className="w-full bg-white border border-surface-variant rounded-xl min-h-[56px] transition-all duration-200 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 flex items-center justify-center p-1">
              {googleClientId ? (
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setGoogleError('Google sign in popup failed.')}
                  shape="pill"
                  text="continue_with"
                  size="large"
                  width="360"
                  useOneTap={false}
                />
              ) : (
                <p className="font-label-sm text-label-sm text-error px-2 text-center">
                  Missing VITE_GOOGLE_CLIENT_ID in frontend .env
                </p>
              )}
            </div>
            {isGoogleSubmitting ? (
              <p className="text-sm text-on-surface-variant">
                Verifying Google account...
              </p>
            ) : null}
            {googleError ? (
              <p className="text-sm text-red-600">{googleError}</p>
            ) : null}
          </form>
        </div>
      </main>

      <footer className="bg-surface-container-low dark:bg-inverse-surface w-full mt-xl">
        <div className="max-w-container-max mx-auto px-gutter py-lg grid grid-cols-1 md:grid-cols-4 gap-md">
          <div className="md:col-span-1 flex flex-col gap-sm">
            <a
              className="font-headline-md text-headline-md font-bold text-primary dark:text-primary-fixed-dim flex items-center gap-xs focus:outline-none focus:ring-2 focus:ring-primary rounded"
              href="#/"
            >
              <span className="material-symbols-outlined">school</span>{' '}
              EduX
            </a>
            <p className="font-body-md text-body-md text-on-surface dark:text-inverse-on-surface mt-xs opacity-80">
              Copyright 2024 EduX. Empowering minds globally.
            </p>
          </div>
          <div className="md:col-span-3 flex flex-wrap gap-md justify-start md:justify-end">
            <a
              className="font-body-md text-body-md text-on-secondary-container dark:text-surface-variant hover:underline hover:text-primary dark:hover:text-primary-fixed transition-all focus:outline-none focus:ring-2 focus:ring-primary rounded"
              href="#"
            >
              Find Tutors
            </a>
            <a
              className="font-body-md text-body-md text-on-secondary-container dark:text-surface-variant hover:underline hover:text-primary dark:hover:text-primary-fixed transition-all focus:outline-none focus:ring-2 focus:ring-primary rounded"
              href="#"
            >
              Become a Tutor
            </a>
            <a
              className="font-body-md text-body-md text-on-secondary-container dark:text-surface-variant hover:underline hover:text-primary dark:hover:text-primary-fixed transition-all focus:outline-none focus:ring-2 focus:ring-primary rounded"
              href="#"
            >
              Subjects
            </a>
            <a
              className="font-body-md text-body-md text-on-secondary-container dark:text-surface-variant hover:underline hover:text-primary dark:hover:text-primary-fixed transition-all focus:outline-none focus:ring-2 focus:ring-primary rounded"
              href="#"
            >
              About Us
            </a>
            <a
              className="font-body-md text-body-md text-on-secondary-container dark:text-surface-variant hover:underline hover:text-primary dark:hover:text-primary-fixed transition-all focus:outline-none focus:ring-2 focus:ring-primary rounded"
              href="#"
            >
              Support
            </a>
            <a
              className="font-body-md text-body-md text-on-secondary-container dark:text-surface-variant hover:underline hover:text-primary dark:hover:text-primary-fixed transition-all focus:outline-none focus:ring-2 focus:ring-primary rounded"
              href="#"
            >
              Privacy Policy
            </a>
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
