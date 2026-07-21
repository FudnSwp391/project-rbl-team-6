// Module-local admin fetch helper.
//
// AdminDashboard.jsx defines an identical `authFetch` privately (it is not
// exported), and declares its own API constant that duplicates config.js.
// Rather than reach into that 3.8k-line file, this module reuses the canonical
// API_BASE_URL and mirrors the same 401 handling.

import { API_BASE_URL } from '../../config'

export const API = API_BASE_URL

export async function authFetch(url, token, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.hash = '/signin'
      window.location.reload()
    }
    throw new Error(data?.message || `HTTP ${res.status}`)
  }
  return data
}
