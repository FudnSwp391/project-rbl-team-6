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
   * Call this after a successful login / register / google-auth response.
   * Saves token + user to state AND localStorage.
   * Then redirects to the correct page based on user role:
   *   admin   → #/admin
   *   others  → #/dashboard
   */
  function login(newToken, newUser) {
    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(newUser))
    setToken(newToken)
    setUser(newUser)

    // Role-based redirect after login
    if (newUser?.role === 'admin') {
      window.location.hash = '/admin'
    } else {
      window.location.hash = '/'             // Redirect to home page
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
    <AuthContext.Provider value={{ user, token, login, logout, updateUser }}>
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
