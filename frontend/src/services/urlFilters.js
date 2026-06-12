/**
 * urlFilters.js — Đồng bộ bộ lọc/sort/trang vào hash query string.
 * Ví dụ: #/tutors?subject=Toán&sort=rating&page=2
 * Dùng history.replaceState để KHÔNG kích hoạt re-route khi đổi filter.
 */
export function readHashQuery() {
  const q = window.location.hash.split('?')[1] || ''
  return Object.fromEntries(new URLSearchParams(q))
}

export function writeHashQuery(path, obj) {
  const params = new URLSearchParams()
  Object.entries(obj).forEach(([k, v]) => {
    if (v === '' || v == null || v === 'Tất cả') return
    if (k === 'page' && Number(v) <= 1) return
    params.set(k, v)
  })
  const qs = params.toString()
  history.replaceState(null, '', `#${path}${qs ? '?' + qs : ''}`)
}
