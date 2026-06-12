/**
 * toast.js — Hệ thống thông báo nổi (toast) đơn giản, không cần context.
 * Dùng: import { toastSuccess, toastError } from '../services/toast'
 */
const listeners = new Set()
let counter = 0

export function toast(message, type = 'info', duration = 3200) {
  const id = ++counter
  const item = { id, message, type, duration }
  listeners.forEach((fn) => fn(item))
  return id
}

export const toastSuccess = (m, d) => toast(m, 'success', d)
export const toastError   = (m, d) => toast(m, 'error', d)
export const toastInfo    = (m, d) => toast(m, 'info', d)

export function subscribeToast(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
