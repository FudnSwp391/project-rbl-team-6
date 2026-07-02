/**
 * api.js
 * API client for EduX.
 * Uses native fetch to connect to the backend, with a complete Mock + LocalStorage fallback
 * to ensure functionality if the API server is unavailable or routes are unimplemented.
 */

import { tutors as mockTutors } from '../tutorsData';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// Helper for requests
async function request(url, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers
  };

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API request failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch tutor details.
 * Fallback: Search in mockTutors array.
 */
export async function getTutorDetail(tutorId) {
  try {
    return await request(`/api/tutors/${tutorId}`);
  } catch (error) {
    console.warn(`[API] getTutorDetail failed: ${error.message}. Falling back to tutor list/mock data.`);
    try {
      const tutors = await getTutors();
      const tutor = findTutorByAnyId(tutors, tutorId);
      if (tutor) {
        return normalizeTutorDetail(tutor);
      }
    } catch (listError) {
      console.warn(`[API] getTutorDetail list fallback failed: ${listError.message}`);
    }
    const idNum = parseInt(tutorId, 10);
    const tutor = findTutorByAnyId(mockTutors, tutorId) || mockTutors.find(t => t.id === idNum);
    if (!tutor) {
      throw new Error(`Tutor with ID ${tutorId} not found.`);
    }
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 600));
    return normalizeTutorDetail(tutor);
  }
}

function findTutorByAnyId(tutors = [], tutorId) {
  const target = String(tutorId || '');
  return tutors.find((tutor) => {
    const ids = [
      tutor.id,
      tutor.user_id,
      tutor.userId,
      tutor.tutor_id,
      tutor.tutorId,
      tutor.profile_id,
      tutor.profileId,
    ].filter((value) => value !== undefined && value !== null);
    return ids.some((value) => String(value) === target);
  });
}

function normalizeTutorDetail(tutor) {
  const subjects = Array.isArray(tutor.subjects)
    ? tutor.subjects
    : tutor.subject
      ? [tutor.subject]
      : [];
  return {
    ...tutor,
    id: tutor.user_id || tutor.userId || tutor.tutor_id || tutor.tutorId || tutor.id,
    user_id: tutor.user_id || tutor.userId || tutor.tutor_id || tutor.tutorId || tutor.id,
    profile_id: tutor.profile_id || tutor.profileId || tutor.id,
    name: tutor.name || tutor.full_name || tutor.tutorName || 'Tutor',
    avatar: tutor.avatar || tutor.picture || tutor.tutorAvatar || '',
    subjects,
    rate: tutor.rate || tutor.hourly_rate || 0,
    availability: tutor.availability || {},
    description: tutor.description || tutor.bio || tutor.headline || 'EduX tutor.',
  };
}

export async function getTutors() {
  try {
    return await request('/api/tutors');
  } catch (error) {
    console.warn(`[API] getTutors failed: ${error.message}. Falling back to mock data.`);
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockTutors;
  }
}

/**
 * Fetch tutor availability.
 * Fallback: Read availability map from mockTutors.
 */
export async function getTutorAvailability(tutorId, params = {}) {
  try {
    const query = new URLSearchParams(params).toString();
    return await request(`/api/tutors/${tutorId}/availability${query ? `?${query}` : ''}`);
  } catch (error) {
    console.warn(`[API] getTutorAvailability failed: ${error.message}. Falling back to mock data.`);
    const idNum = parseInt(tutorId, 10);
    const tutor = findTutorByAnyId(mockTutors, tutorId) || mockTutors.find(t => t.id === idNum);
    if (!tutor) {
      throw new Error(`Tutor with ID ${tutorId} not found.`);
    }
    await new Promise(resolve => setTimeout(resolve, 500));
    return tutor.availability;
  }
}

/**
 * Get all bookings.
 * Fallback: Read from LocalStorage.
 */
export async function getBookings() {
  return await request('/api/bookings');
}

/**
 * Create a new booking request.
 * Transforms camelCase frontend fields to snake_case fields expected by backend.
 * Supports multiple sessions by sending one request per session.
 *
 * Backend expects: { tutor_id, lesson_date, time_slot, tutor_name, subject, note }
 * Frontend sends:  { tutorId, sessions: [{date, timeSlot}], subject, notes, ... }
 */
export async function createBooking(bookingData) {
  const {
    tutorId,
    tutor_id,
    sessions,
    date,
    timeSlot,
    time_slot,
    subject,
    notes,
    note,
    tutorName,
    tutor_name,
    studentId,
    childName,
  } = bookingData || {};

  // Resolve tutorId — accept both camelCase and snake_case
  const resolvedTutorId = tutorId || tutor_id;
  const resolvedTutorName = tutorName || tutor_name || null;
  const resolvedNote = notes || note || null;

  // Build sessions list: either from the sessions array, or a single date+timeSlot
  const sessionList = Array.isArray(sessions) && sessions.length > 0
    ? sessions
    : (date && (timeSlot || time_slot))
      ? [{ date, timeSlot: timeSlot || time_slot }]
      : [];

  if (!resolvedTutorId || sessionList.length === 0) {
    throw new Error('Cần chọn gia sư, ngày học và khung giờ.');
  }

  // Send a single batch POST request to the new endpoint
  const payload = {
    tutorId: String(resolvedTutorId),
    tutorName: resolvedTutorName,
    subject: subject || null,
    sessions: sessionList.map(s => ({ date: s.date, timeSlot: s.timeSlot || s.time_slot })),
    notes: resolvedNote,
    childName: childName || null,
  };
  console.log('[createBooking] Sending payload to /api/bookings:', payload);
  const result = await request('/api/bookings', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return result;
}

export async function createTrialBooking(bookingData) {
  return createBooking({
    ...bookingData,
    bookingType: 'trial',
  });
}

export async function getReviewEligibility(tutorId) {
  return request(`/api/tutors/${tutorId}/review-eligibility`);
}

export async function submitTutorReview(tutorId, reviewData) {
  return request(`/api/tutors/${tutorId}/reviews`, {
    method: 'POST',
    body: JSON.stringify(reviewData),
  });
}

/**
 * Update booking status (for Tutor dashboard).
 * Fallback: Update status in LocalStorage.
 */
export async function updateBookingStatus(bookingId, status) {
  return await request(`/api/bookings/${bookingId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
}


export async function getTutorStudents() {
  return request('/api/tutor/students');
}

export async function markBookingAttendance(bookingId, status, note = '') {
  return request(`/api/bookings/${bookingId}/attendance`, {
    method: 'PATCH',
    body: JSON.stringify({ status, note }),
  });
}

export async function getTutorEarnings() {
  return request('/api/tutor/earnings');
}

// ── Student Booking & Escrow APIs ──────────────────────────────────────────
export async function getStudentBookings() {
  return request('/api/student/bookings');
}

export async function confirmLessonComplete(bookingId) {
  return request(`/api/escrow/manual-release/${bookingId}`, { method: 'POST' });
}

export async function reportTutor(bookingId, reason) {
  return request(`/api/bookings/${bookingId}/report`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function getWalletFull() {
  return request('/api/payment/wallet/full');
}

export async function getTransactionHistory() {
  return request('/api/payment/transactions');
}

// ── Admin Dispute APIs ─────────────────────────────────────────────────────
export async function getAdminDisputes() {
  return request('/api/admin/disputes');
}

export async function resolveDispute(disputeId, decision, adminNote = '') {
  return request('/api/escrow/resolve-dispute-v2', {
    method: 'POST',
    body: JSON.stringify({ disputeId, decision, adminNote }),
  });
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// â”€â”€ TUTOR PROFILE APIs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

/**
 * Láº¥y profile Ä‘áº§y Ä‘á»§ cá»§a gia sÆ° (credentials + availability).
 * Fallback: tráº£ vá» mock profile náº¿u backend chÆ°a cĂ³.
 */
export async function getTutorProfile() {
  try {
    return await request('/api/tutor/profile');
  } catch (error) {
    console.warn(`[API] getTutorProfile failed: ${error.message}. Using mock.`);
    // Tráº£ vá» mock Ä‘á»ƒ UI váº«n hoáº¡t Ä‘á»™ng khi backend chÆ°a sáºµn sĂ ng
    return {
      bio: '',
      bio_pending: null,
      bio_status: 'approved',
      status: 'approved',
      hourly_rate: 0,
      credentials: [],
      availability: {},
    };
  }
}

/**
 * Cáº­p nháº­t bio (gá»­i chá» admin duyá»‡t).
 */
export async function updateTutorBio(bio) {
  try {
    return await request('/api/tutor/profile/bio', {
      method: 'PATCH',
      body: JSON.stringify({ bio }),
    });
  } catch (error) {
    console.warn(`[API] updateTutorBio failed: ${error.message}. Saving locally.`);
    // Fallback: lÆ°u tháº³ng vĂ o localStorage
    localStorage.setItem('tutor_bio_local', bio);
    return { bio, bio_status: 'approved' };
  }
}

export async function updateTutorCv(profileData) {
  return request('/api/tutor/profile/cv', {
    method: 'PATCH',
    body: JSON.stringify(profileData),
  });
}

export async function submitTutorProfile() {
  return request('/api/tutor/profile/submit', {
    method: 'PATCH',
  });
}

/**
 * Cáº­p nháº­t avatar URL (khĂ´ng cáº§n duyá»‡t).
 */
export async function updateTutorAvatar(pictureUrl) {
  try {
    return await request('/api/tutor/profile/avatar', {
      method: 'PATCH',
      body: JSON.stringify({ picture: pictureUrl }),
    });
  } catch (error) {
    console.warn(`[API] updateTutorAvatar failed: ${error.message}.`);
    throw error;
  }
}

/**
 * ThĂªm 1 credential má»›i (education/certificate/experience).
 * Fallback: lÆ°u vĂ o localStorage vá»›i status pending.
 */
export async function addTutorCredential(credential) {
  try {
    return await request('/api/tutor/credentials', {
      method: 'POST',
      body: JSON.stringify(credential),
    });
  } catch (error) {
    console.warn(`[API] addTutorCredential failed: ${error.message}. Saving locally.`);
    const stored = localStorage.getItem('tutor_credentials_local');
    const list = stored ? JSON.parse(stored) : [];
    const newItem = {
      id: `local_${Date.now()}`,
      ...credential,
      status: 'approved',
      created_at: new Date().toISOString(),
    };
    list.push(newItem);
    localStorage.setItem('tutor_credentials_local', JSON.stringify(list));
    return newItem;
  }
}

/**
 * XoĂ¡ 1 credential.
 */
export async function deleteTutorCredential(id) {
  try {
    return await request(`/api/tutor/credentials/${id}`, { method: 'DELETE' });
  } catch (error) {
    console.warn(`[API] deleteTutorCredential failed: ${error.message}. Removing locally.`);
    const stored = localStorage.getItem('tutor_credentials_local');
    const list = stored ? JSON.parse(stored) : [];
    localStorage.setItem('tutor_credentials_local',
      JSON.stringify(list.filter(c => c.id !== id)));
    return { message: 'Deleted locally.' };
  }
}

/**
 * Cáº­p nháº­t lá»‹ch dáº¡y (replace toĂ n bá»™).
 * Fallback: lÆ°u vĂ o localStorage.
 */
export async function updateTutorAvailability(availability) {
  try {
    return await request('/api/tutor/availability', {
      method: 'PUT',
      body: JSON.stringify({ availability }),
    });
  } catch (error) {
    console.warn(`[API] updateTutorAvailability failed: ${error.message}. Saving locally.`);
    localStorage.setItem('tutor_availability_local', JSON.stringify(availability));
    return { message: 'Saved locally.', slots: Object.values(availability).flat().length };
  }
}

/**
 * Admin: láº¥y credentials Ä‘ang chá» duyá»‡t.
 */
export async function getAdminPendingCredentials() {
  return request('/api/admin/credentials/pending');
}

/**
 * Admin: approve 1 credential.
 */
export async function approveCredential(id) {
  return request(`/api/admin/credentials/${id}/approve`, { method: 'PATCH' });
}

/**
 * Admin: reject 1 credential.
 */
export async function rejectCredential(id, reason) {
  return request(`/api/admin/credentials/${id}/reject`, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  });
}

/**
 * Admin: láº¥y bio Ä‘ang chá» duyá»‡t.
 */
export async function getAdminPendingBios() {
  return request('/api/admin/bio/pending');
}

/**
 * Admin: approve bio.
 */
export async function approveBio(id) {
  return request(`/api/admin/bio/${id}/approve`, { method: 'PATCH' });
}

/**
 * Admin: reject bio.
 */
export async function rejectBio(id) {
  return request(`/api/admin/bio/${id}/reject`, { method: 'PATCH' });
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// â”€â”€ CHAT APIs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export async function getConversations() {
  return request('/api/conversations')
}

export async function getOrCreateConversation(tutorId) {
  return request('/api/conversations', {
    method: 'POST',
    body: JSON.stringify({ tutor_id: tutorId }),
  })
}

export async function getMessages(conversationId) {
  return request(`/api/conversations/${conversationId}/messages`)
}

export async function sendMessage(conversationId, content) {
  return request(`/api/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  })
}

export async function markConversationRead(conversationId) {
  return request(`/api/conversations/${conversationId}/read`, { method: 'PATCH' })
}

export async function getUnreadCount() {
  try {
    const data = await request('/api/messages/unread-count')
    return data.count || 0
  } catch {
    return 0
  }
}

export async function getTutorCourses() {
  return request('/api/tutor/courses')
}

export async function getPublishedCourses(params = {}) {
  try {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
    ).toString()
    return await request(`/api/courses${query ? `?${query}` : ''}`)
  } catch (error) {
    console.warn(`[API] getPublishedCourses failed: ${error.message}. Returning empty marketplace.`)
    return []
  }
}

export async function saveTutorCourse(course) {
  const hasId = Boolean(course?.id)
  return request(hasId ? `/api/tutor/courses/${course.id}` : '/api/tutor/courses', {
    method: hasId ? 'PATCH' : 'POST',
    body: JSON.stringify(course),
  })
}

export async function deleteTutorCourse(courseId) {
  return request(`/api/tutor/courses/${courseId}`, { method: 'DELETE' })
}

export async function getCourseDetail(courseId) {
  return request(`/api/courses/${courseId}`)
}

export async function enrollCourse(courseId, payload = {}) {
  return request(`/api/courses/${courseId}/enroll`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function getMyCourses() {
  return request('/api/my/courses')
}

export async function updateCourseProgress(courseId, lessonId, payload = {}) {
  return request(`/api/courses/${courseId}/lessons/${lessonId}/progress`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}
// ── Tutor Assessments APIs ───────────────────────────────────────────────────

export async function getTutorExams() {
  return request('/api/tutor/assessments/exams');
}

export async function createTutorExam(examData) {
  return request('/api/tutor/assessments/exams', {
    method: 'POST',
    body: JSON.stringify(examData),
  });
}

export async function getTutorExamDetail(examId) {
  return request(`/api/tutor/assessments/exams/${examId}`);
}

export async function updateTutorExam(examId, examData) {
  return request(`/api/tutor/assessments/exams/${examId}`, {
    method: 'PUT',
    body: JSON.stringify(examData),
  });
}

export async function updateTutorExamStatus(examId, status) {
  return request(`/api/tutor/assessments/exams/${examId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function duplicateTutorExam(examId) {
  return request(`/api/tutor/assessments/exams/${examId}/duplicate`, {
    method: 'POST',
  });
}

export async function deleteTutorExam(examId) {
  return request(`/api/tutor/assessments/exams/${examId}`, {
    method: 'DELETE',
  });
}

export async function getTutorHomework() {
  return request('/api/tutor/assessments/homework');
}

export async function createTutorHomework(hwData) {
  return request('/api/tutor/assessments/homework', {
    method: 'POST',
    body: JSON.stringify(hwData),
  });
}

export async function getTutorHomeworkDetail(hwId) {
  return request(`/api/tutor/assessments/homework/${hwId}`);
}

export async function updateTutorHomework(hwId, hwData) {
  return request(`/api/tutor/assessments/homework/${hwId}`, {
    method: 'PUT',
    body: JSON.stringify(hwData),
  });
}

export async function updateTutorHomeworkStatus(hwId, status) {
  return request(`/api/tutor/assessments/homework/${hwId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function deleteTutorHomework(hwId) {
  return request(`/api/tutor/assessments/homework/${hwId}`, {
    method: 'DELETE',
  });
}

export async function getHomeworkSubmissions(hwId) {
  return request(`/api/tutor/assessments/homework/${hwId}/submissions`);
}

export const apiRequest = request;

// ── Student Assessments APIs ───────────────────────────────────────────────────

export async function getStudentExams() {
  return request('/api/student/assessments/exams');
}

export async function getStudentExamDetail(examId) {
  return request(`/api/student/assessments/exams/${examId}`);
}

export async function submitStudentExam(examId, answers) {
  return request(`/api/student/assessments/exams/${examId}/submit`, {
    method: 'POST',
    body: JSON.stringify({ answers }),
  });
}

export async function getStudentHomework() {
  return request('/api/student/assessments/homework');
}

export async function submitStudentHomework(hwId, fileUrl) {
  return request(`/api/student/assessments/homework/${hwId}/submit`, {
    method: 'POST',
    body: JSON.stringify({ file_url: fileUrl }),
  });
}

// ── Wallet APIs ───────────────────────────────────────────────────────────────

export const getWalletOverview = async () => {
  return request('/api/wallet');
};

export const getWalletTransactions = async () => {
  return request('/api/wallet/transactions');
};

export const depositRequest = async (data) => {
  return request('/api/wallet/deposit-request', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const withdrawRequest = async (data) => {
  return request('/api/wallet/withdraw-request', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

// Admin Wallet API
export const getAdminDepositRequests = async () => {
  return request('/api/admin/wallet/deposit-requests');
};

export const getAdminWithdrawRequests = async () => {
  return request('/api/admin/wallet/withdraw-requests');
};

export const approveDepositRequest = async (id, note) => {
  return request(`/api/admin/wallet/deposit-requests/${id}/approve`, {
    method: 'PATCH',
    body: JSON.stringify({ note }),
  });
};

export const rejectDepositRequest = async (id, note) => {
  return request(`/api/admin/wallet/deposit-requests/${id}/reject`, {
    method: 'PATCH',
    body: JSON.stringify({ note }),
  });
};

export const approveWithdrawRequest = async (id, note) => {
  return request(`/api/admin/wallet/withdraw-requests/${id}/approve`, {
    method: 'PATCH',
    body: JSON.stringify({ note }),
  });
};

export const rejectWithdrawRequest = async (id, note) => {
  return request(`/api/admin/wallet/withdraw-requests/${id}/reject`, {
    method: 'PATCH',
    body: JSON.stringify({ note }),
  });
};
