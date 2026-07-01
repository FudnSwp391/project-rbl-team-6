// src/admin/ai/aggregator/buildCaseContext.js

// Giả lập truy vấn dữ liệu từ DB cho các entity liên quan
const fetchUserHistory = (userId) => {
  // Mock data: giả sử user này là spammer (USR-001) hoặc user bình thường
  if (userId === 'USR-001') {
    return {
      complaintsLast30Days: 5,
      appealsLast30Days: 2,
      autoResolvedCount: 4, // Exceeds threshold!
      riskFlag: true
    }
  }
  return {
    complaintsLast30Days: 1,
    appealsLast30Days: 0,
    autoResolvedCount: 0,
    riskFlag: false
  }
}

const fetchTutorMetrics = (tutorId) => {
  return {
    averageRating: 4.8,
    totalLessons: 150,
    violationsCount: 2,
    previousWarnings: 1,
    disputeCount: 0
  }
}

const fetchTransactionStatus = (bookingId) => {
  return {
    escrowStatus: 'HELD',
    paymentStatus: 'PAID',
    withdrawStatus: 'NOT_WITHDRAWN',
    disputedAmount: 500000
  }
}

const fetchLessonContext = (bookingId) => {
  return {
    bookingId: bookingId || 'BK-UNKNOWN',
    lessonDate: new Date().toISOString(),
    joinLogs: {
      tutorJoined: true,
      studentJoined: false
    }
  }
}

/**
 * Xây dựng toàn bộ ngữ cảnh của vụ việc từ nhiều nguồn dữ liệu trước khi AI đánh giá
 */
export const buildCaseContext = (complaint) => {
  return {
    complaintId: complaint.id,
    description: complaint.content,
    complaintType: complaint.title,
    userHistory: fetchUserHistory(complaint.sender.id || 'USR-NORMAL'),
    tutorMetrics: fetchTutorMetrics(complaint.target.id || 'TUTOR-01'),
    transactionStatus: fetchTransactionStatus(complaint.bookingId),
    lessonContext: fetchLessonContext(complaint.bookingId)
  }
}
