/**
 * AuthContext.jsx
 * ──────────────────────────────────────────────────────────────
 * Provides global auth state: user, token, login, logout, updateUser.
 * Token + user are persisted in localStorage so refresh keeps the session.
 */
import { createContext, useContext, useState } from 'react'

// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext(null)

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  // Initialise from localStorage (runs once on mount)
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  const [token, setToken] = useState(() => localStorage.getItem('token') || null)

  /**
   * Call this after a successful LOGIN (returning user).
   * Redirects based on role:
   *   admin  → #/admin
   *   tutor  → #/tutor  (dashboard, already has profile)
   *   parent → #/parent
   *   others → #/dashboard
   */
  function login(newToken, newUser) {
    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(newUser))
    setToken(newToken)
    setUser(newUser)

    if (newUser?.role === 'admin') {
      window.location.hash = '/admin'
    } else if (newUser?.role === 'tutor') {
      window.location.hash = '/tutor'
    } else if (newUser?.role === 'parent') {
      window.location.hash = '/parent'
    } else {
      window.location.hash = '/dashboard'
    }
  }

  /**
   * Call this after a successful REGISTER (new user).
   * Same as login() EXCEPT tutors are sent to onboarding (#/tutor-profile)
   * so they fill in their profile information before accessing the dashboard.
   */
  function loginAfterRegister(newToken, newUser) {
    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(newUser))
    setToken(newToken)
    setUser(newUser)

    if (newUser?.role === 'admin') {
      window.location.hash = '/admin'
    } else if (newUser?.role === 'tutor') {
      window.location.hash = '/tutor-profile'  // ← Onboarding wizard
    } else if (newUser?.role === 'parent') {
      window.location.hash = '/parent'
    } else {
      window.location.hash = '/dashboard'
    }
  }

  /** Clears all auth state and redirects to home. */
  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
    // Navigate back to home page
    window.location.hash = '/'
  }

  /**
   * Lưu token + user vào state/localStorage KHÔNG redirect.
   * Dùng trong TutorProfileForm sau khi register thành công,
   * để giữ nguyên trang hiện tại (show success message) trước khi redirect thủ công.
   */
  function loginSilent(newToken, newUser) {
    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(newUser))
    setToken(newToken)
    setUser(newUser)
  }

  /**
   * Merge partial updates into the stored user object.
   * Useful if a profile edit changes the user's name/picture.
   */
  function updateUser(partial) {
    setUser((prev) => {
      const next = { ...prev, ...partial }
      localStorage.setItem('user', JSON.stringify(next))
      return next
    })
  }

  return (
    <AuthContext.Provider value={{ user, token, login, loginAfterRegister, loginSilent, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
/** Usage: const { user, token, login, logout } = useAuth() */
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
