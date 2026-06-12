/**
 * eduxApi.js — Client wrapper cho REST API của EduX
 * Tất cả endpoint trỏ vào backend (port 5000 mặc định).
 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  // Tự đính kèm Bearer token nếu có (key 'token' — khớp với AuthContext)
  const token = localStorage.getItem('token')
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(url, { ...options, headers })
  const text = await res.text()
  let body = null
  try { body = text ? JSON.parse(text) : null } catch { body = text }
  if (!res.ok) {
    const msg = (body && body.message) || `HTTP ${res.status}`
    throw new Error(msg)
  }
  return body
}

export const api = {
  // ── Subjects ──
  getSubjects:    () => request('/api/subjects'),

  // ── Tutors ──
  // filters: { subject, level, min_price, max_price, method, q, sort }
  getTutors:      (filters = {}) => {
    const qs = new URLSearchParams(
      Object.entries(filters).filter(([, v]) => v !== '' && v != null && v !== 'Tất cả')
    ).toString()
    return request(`/api/tutors${qs ? `?${qs}` : ''}`)
  },
  getTutor:       (id) => request(`/api/tutors/${id}`),

  // ── Courses ──
  getCourses:     (filters = {}) => {
    const qs = new URLSearchParams(
      Object.entries(filters).filter(([, v]) => v !== '' && v != null && v !== 'Tất cả')
    ).toString()
    return request(`/api/courses${qs ? `?${qs}` : ''}`)
  },
  getCourse:      (id) => request(`/api/courses/${id}`),

  // ── Reviews ──
  getReviews:     (params) => {
    const qs = new URLSearchParams(params).toString()
    return request(`/api/reviews?${qs}`)
  },
  createReview:   (data) => request('/api/reviews', { method: 'POST', body: JSON.stringify(data) }),
  updateReview:   (id, data) => request(`/api/reviews/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteReview:   (id) => request(`/api/reviews/${id}`, { method: 'DELETE' }),

  // ── Tutor: quản lý khóa học của chính mình ──
  getMyCourses:       () => request('/api/tutor/courses'),
  createMyCourse:     (data) => request('/api/tutor/courses', { method: 'POST', body: JSON.stringify(data) }),
  updateMyCourse:     (id, data) => request(`/api/tutor/courses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  setMyCourseStatus:  (id, status) => request(`/api/tutor/courses/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteMyCourse:     (id) => request(`/api/tutor/courses/${id}`, { method: 'DELETE' }),
  getTutorStats:      () => request('/api/tutor/stats'),

  // ── Tutor: hồ sơ + môn dạy ──
  getTutorProfile:    () => request('/api/tutor/profile'),
  updateTutorProfile: (data) => request('/api/tutor/profile', { method: 'PUT', body: JSON.stringify(data) }),
  getTutorSubjects:   () => request('/api/tutor/subjects'),
  addTutorSubject:    (data) => request('/api/tutor/subjects', { method: 'POST', body: JSON.stringify(data) }),
  removeTutorSubject: (id) => request(`/api/tutor/subjects/${id}`, { method: 'DELETE' }),

  // ── Bookings ──
  createBooking:      (data) => request('/api/bookings', { method: 'POST', body: JSON.stringify(data) }),
  setBookingStatus:   (id, status) => request(`/api/tutor/bookings/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // ── Enrollments (học sinh đăng ký khóa học) ──
  getMyEnrollments:   () => request('/api/my/enrollments'),
  enrollCourse:       (id) => request(`/api/courses/${id}/enroll`, { method: 'POST' }),
  unenrollCourse:     (id) => request(`/api/courses/${id}/enroll`, { method: 'DELETE' }),
  updateProgress:     (courseId, progress_percent) => request(`/api/my/enrollments/${courseId}/progress`, { method: 'PATCH', body: JSON.stringify({ progress_percent }) }),
}
