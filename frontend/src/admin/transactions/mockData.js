// ─── Mock Data: EduX Transaction Management System ───────────────────────────
// Dữ liệu giả lập đầy đủ cho toàn bộ module quản lý tài chính

export const TUTORS = [
  { id: 't1', name: 'Nguyễn Văn An', email: 'an.nguyen@edu.vn', avatar: 'https://ui-avatars.com/api/?name=Nguyen+Van+An&background=00288e&color=fff&size=64', subject: 'Toán học', rating: 4.9, bank: 'Vietcombank', bankAccount: '1234567890' },
  { id: 't2', name: 'Trần Thị Bình', email: 'binh.tran@edu.vn', avatar: 'https://ui-avatars.com/api/?name=Tran+Thi+Binh&background=7c3aed&color=fff&size=64', subject: 'Vật lý', rating: 4.7, bank: 'Techcombank', bankAccount: '0987654321' },
  { id: 't3', name: 'Lê Minh Châu', email: 'chau.le@edu.vn', avatar: 'https://ui-avatars.com/api/?name=Le+Minh+Chau&background=059669&color=fff&size=64', subject: 'Hóa học', rating: 4.8, bank: 'BIDV', bankAccount: '1122334455' },
  { id: 't4', name: 'Phạm Thị Dung', email: 'dung.pham@edu.vn', avatar: 'https://ui-avatars.com/api/?name=Pham+Thi+Dung&background=dc2626&color=fff&size=64', subject: 'Tiếng Anh', rating: 4.6, bank: 'MB Bank', bankAccount: '5544332211' },
  { id: 't5', name: 'Hoàng Văn Em', email: 'em.hoang@edu.vn', avatar: 'https://ui-avatars.com/api/?name=Hoang+Van+Em&background=d97706&color=fff&size=64', subject: 'Lịch sử', rating: 4.5, bank: 'ACB', bankAccount: '9988776655' },
]

export const STUDENTS = [
  { id: 's1', name: 'Võ Thị Hoa', email: 'hoa.vo@student.vn', avatar: 'https://ui-avatars.com/api/?name=Vo+Thi+Hoa&background=0ea5e9&color=fff&size=64', grade: 'Lớp 12' },
  { id: 's2', name: 'Đặng Văn Hùng', email: 'hung.dang@student.vn', avatar: 'https://ui-avatars.com/api/?name=Dang+Van+Hung&background=8b5cf6&color=fff&size=64', grade: 'Lớp 10' },
  { id: 's3', name: 'Bùi Thị Lan', email: 'lan.bui@student.vn', avatar: 'https://ui-avatars.com/api/?name=Bui+Thi+Lan&background=ec4899&color=fff&size=64', grade: 'Lớp 11' },
  { id: 's4', name: 'Ngô Văn Minh', email: 'minh.ngo@student.vn', avatar: 'https://ui-avatars.com/api/?name=Ngo+Van+Minh&background=14b8a6&color=fff&size=64', grade: 'Lớp 9' },
  { id: 's5', name: 'Lý Thị Nam', email: 'nam.ly@student.vn', avatar: 'https://ui-avatars.com/api/?name=Ly+Thi+Nam&background=f59e0b&color=fff&size=64', grade: 'Lớp 8' },
]

// ─── 1. LESSON PAYMENTS ──────────────────────────────────────────────────────
export const LESSON_PAYMENTS = [
  { id: 'LP-001', bookingId: 'BK-2024-001', student: STUDENTS[0], tutor: TUTORS[0], subject: 'Toán Đại Số', amount: 250000, platformFee: 37500, tutorEarnings: 212500, paymentMethod: 'MoMo', status: 'COMPLETED', createdAt: '2024-06-10T08:30:00Z' },
  { id: 'LP-002', bookingId: 'BK-2024-002', student: STUDENTS[1], tutor: TUTORS[1], subject: 'Vật Lý Lượng Tử', amount: 300000, platformFee: 45000, tutorEarnings: 255000, paymentMethod: 'VNPay', status: 'PENDING_ESCROW', createdAt: '2024-06-11T10:00:00Z' },
  { id: 'LP-003', bookingId: 'BK-2024-003', student: STUDENTS[2], tutor: TUTORS[2], subject: 'Hóa Hữu Cơ', amount: 280000, platformFee: 42000, tutorEarnings: 238000, paymentMethod: 'Internal Wallet', status: 'RELEASED', createdAt: '2024-06-12T14:15:00Z' },
  { id: 'LP-004', bookingId: 'BK-2024-004', student: STUDENTS[3], tutor: TUTORS[3], subject: 'Tiếng Anh IELTS', amount: 400000, platformFee: 60000, tutorEarnings: 340000, paymentMethod: 'MoMo', status: 'REFUNDED', createdAt: '2024-06-13T09:00:00Z' },
  { id: 'LP-005', bookingId: 'BK-2024-005', student: STUDENTS[4], tutor: TUTORS[4], subject: 'Lịch Sử Việt Nam', amount: 200000, platformFee: 30000, tutorEarnings: 170000, paymentMethod: 'VNPay', status: 'DISPUTED', createdAt: '2024-06-14T11:30:00Z' },
  { id: 'LP-006', bookingId: 'BK-2024-006', student: STUDENTS[0], tutor: TUTORS[2], subject: 'Hóa Vô Cơ', amount: 260000, platformFee: 39000, tutorEarnings: 221000, paymentMethod: 'Bank Transfer', status: 'COMPLETED', createdAt: '2024-06-15T13:00:00Z' },
  { id: 'LP-007', bookingId: 'BK-2024-007', student: STUDENTS[1], tutor: TUTORS[0], subject: 'Toán Giải Tích', amount: 275000, platformFee: 41250, tutorEarnings: 233750, paymentMethod: 'MoMo', status: 'CANCELLED', createdAt: '2024-06-16T07:45:00Z' },
  { id: 'LP-008', bookingId: 'BK-2024-008', student: STUDENTS[3], tutor: TUTORS[1], subject: 'Điện - Điện Từ', amount: 320000, platformFee: 48000, tutorEarnings: 272000, paymentMethod: 'Internal Wallet', status: 'COMPLETED', createdAt: '2024-06-17T15:00:00Z' },
  { id: 'LP-009', bookingId: 'BK-2024-009', student: STUDENTS[2], tutor: TUTORS[3], subject: 'Ngữ Pháp Tiếng Anh', amount: 350000, platformFee: 52500, tutorEarnings: 297500, paymentMethod: 'VNPay', status: 'PENDING_ESCROW', createdAt: '2024-06-18T10:30:00Z' },
  { id: 'LP-010', bookingId: 'BK-2024-010', student: STUDENTS[4], tutor: TUTORS[2], subject: 'Hóa Phân Tích', amount: 290000, platformFee: 43500, tutorEarnings: 246500, paymentMethod: 'MoMo', status: 'RELEASED', createdAt: '2024-06-19T12:00:00Z' },
  { id: 'LP-011', bookingId: 'BK-2024-011', student: STUDENTS[0], tutor: TUTORS[4], subject: 'Địa Lý', amount: 180000, platformFee: 27000, tutorEarnings: 153000, paymentMethod: 'Bank Transfer', status: 'COMPLETED', createdAt: '2024-06-20T08:00:00Z' },
  { id: 'LP-012', bookingId: 'BK-2024-012', student: STUDENTS[1], tutor: TUTORS[3], subject: 'Đọc Hiểu IELTS', amount: 420000, platformFee: 63000, tutorEarnings: 357000, paymentMethod: 'VNPay', status: 'DISPUTED', createdAt: '2024-06-21T09:30:00Z' },
]

// ─── 2. COURSE TRANSACTIONS ───────────────────────────────────────────────────
export const COURSE_TRANSACTIONS = [
  { id: 'CT-001', student: STUDENTS[0], course: 'Toán 12 - Luyện thi Đại Học', tutor: TUTORS[0], price: 1500000, discount: 150000, platformRevenue: 270000, tutorRevenue: 1080000, status: 'COMPLETED', purchaseDate: '2024-06-01T10:00:00Z' },
  { id: 'CT-002', student: STUDENTS[1], course: 'Vật Lý Nâng Cao THPT', tutor: TUTORS[1], price: 1200000, discount: 0, platformRevenue: 180000, tutorRevenue: 1020000, status: 'COMPLETED', purchaseDate: '2024-06-02T11:30:00Z' },
  { id: 'CT-003', student: STUDENTS[2], course: 'Hóa Học Lớp 11 Toàn Diện', tutor: TUTORS[2], price: 900000, discount: 100000, platformRevenue: 120000, tutorRevenue: 680000, status: 'REFUNDED', purchaseDate: '2024-06-03T14:00:00Z' },
  { id: 'CT-004', student: STUDENTS[3], course: 'IELTS 7.0 trong 3 tháng', tutor: TUTORS[3], price: 2500000, discount: 250000, platformRevenue: 337500, tutorRevenue: 1912500, status: 'COMPLETED', purchaseDate: '2024-06-04T09:00:00Z' },
  { id: 'CT-005', student: STUDENTS[4], course: 'Lịch Sử Việt Nam - Ôn Thi', tutor: TUTORS[4], price: 800000, discount: 0, platformRevenue: 120000, tutorRevenue: 680000, status: 'PENDING', purchaseDate: '2024-06-05T16:00:00Z' },
  { id: 'CT-006', student: STUDENTS[0], course: 'Lập Trình Python Cơ Bản', tutor: TUTORS[2], price: 1800000, discount: 300000, platformRevenue: 225000, tutorRevenue: 1275000, status: 'COMPLETED', purchaseDate: '2024-06-06T13:00:00Z' },
  { id: 'CT-007', student: STUDENTS[2], course: 'Toán 10 - Nền Tảng Vững Chắc', tutor: TUTORS[0], price: 1100000, discount: 110000, platformRevenue: 148500, tutorRevenue: 841500, status: 'COMPLETED', purchaseDate: '2024-06-07T10:30:00Z' },
  { id: 'CT-008', student: STUDENTS[1], course: 'Tiếng Anh Giao Tiếp', tutor: TUTORS[3], price: 1600000, discount: 0, platformRevenue: 240000, tutorRevenue: 1360000, status: 'COMPLETED', purchaseDate: '2024-06-08T11:00:00Z' },
]

// ─── 3. TUTOR WITHDRAWALS ─────────────────────────────────────────────────────
export const TUTOR_WITHDRAWALS = [
  { id: 'WD-001', tutor: TUTORS[0], amount: 5000000, bank: 'Vietcombank - 1234567890', requestDate: '2024-06-20T08:00:00Z', riskLevel: 'LOW', status: 'PENDING', note: '' },
  { id: 'WD-002', tutor: TUTORS[1], amount: 8500000, bank: 'Techcombank - 0987654321', requestDate: '2024-06-20T09:30:00Z', riskLevel: 'LOW', status: 'PENDING', note: '' },
  { id: 'WD-003', tutor: TUTORS[2], amount: 12000000, bank: 'BIDV - 1122334455', requestDate: '2024-06-19T14:00:00Z', riskLevel: 'MEDIUM', status: 'PENDING', note: 'Rút lần 3 trong tuần' },
  { id: 'WD-004', tutor: TUTORS[3], amount: 3200000, bank: 'MB Bank - 5544332211', requestDate: '2024-06-18T11:00:00Z', riskLevel: 'LOW', status: 'APPROVED', note: '' },
  { id: 'WD-005', tutor: TUTORS[4], amount: 25000000, bank: 'ACB - 9988776655', requestDate: '2024-06-17T10:30:00Z', riskLevel: 'HIGH', status: 'REJECTED', note: 'Tài khoản mới, giao dịch lớn bất thường' },
  { id: 'WD-006', tutor: TUTORS[0], amount: 7800000, bank: 'Vietcombank - 1234567890', requestDate: '2024-06-16T15:00:00Z', riskLevel: 'LOW', status: 'APPROVED', note: '' },
  { id: 'WD-007', tutor: TUTORS[1], amount: 4500000, bank: 'Techcombank - 0987654321', requestDate: '2024-06-15T08:45:00Z', riskLevel: 'LOW', status: 'APPROVED', note: '' },
]

// ─── 4. REFUND MANAGEMENT ────────────────────────────────────────────────────
export const REFUNDS = [
  { id: 'RF-001', student: STUDENTS[0], tutor: TUTORS[1], reason: 'Gia sư không đến buổi học đã đặt', amount: 300000, requestDate: '2024-06-14T10:00:00Z', processedBy: 'Admin EduX', status: 'APPROVED', evidenceUrl: '#' },
  { id: 'RF-002', student: STUDENTS[2], tutor: TUTORS[3], reason: 'Chất lượng giảng dạy không đúng cam kết', amount: 400000, requestDate: '2024-06-15T11:30:00Z', processedBy: null, status: 'PENDING', evidenceUrl: '#' },
  { id: 'RF-003', student: STUDENTS[1], tutor: TUTORS[0], reason: 'Học sinh hủy trước 24 giờ', amount: 250000, requestDate: '2024-06-13T09:00:00Z', processedBy: 'Admin EduX', status: 'REJECTED', evidenceUrl: null },
  { id: 'RF-004', student: STUDENTS[4], tutor: TUTORS[2], reason: 'Gia sư dạy sai chương trình yêu cầu', amount: 280000, requestDate: '2024-06-16T14:00:00Z', processedBy: null, status: 'PENDING', evidenceUrl: '#' },
  { id: 'RF-005', student: STUDENTS[3], tutor: TUTORS[4], reason: 'Kết nối mạng bị lỗi, buổi học không thể tiến hành', amount: 200000, requestDate: '2024-06-17T16:00:00Z', processedBy: 'Admin EduX', status: 'APPROVED', evidenceUrl: '#' },
  { id: 'RF-006', student: STUDENTS[0], tutor: TUTORS[3], reason: 'Khóa học không phù hợp với trình độ', amount: 1500000, requestDate: '2024-06-18T10:30:00Z', processedBy: null, status: 'PENDING', evidenceUrl: '#' },
]

// ─── 5. DISPUTES ─────────────────────────────────────────────────────────────
export const DISPUTES = [
  {
    id: 'DS-001', studentClaim: 'Gia sư không đến buổi học lúc 9h sáng, đã đợi 30 phút không thấy. Yêu cầu hoàn tiền đầy đủ.',
    tutorResponse: 'Tôi đã gửi tin nhắn báo hủy vào 8h30, nhưng học sinh không kiểm tra. Lỗi không hoàn toàn do tôi.',
    student: STUDENTS[0], tutor: TUTORS[1], amount: 300000, lessonDate: '2024-06-14T09:00:00Z',
    transactionId: 'LP-002', status: 'OPEN', adminNote: '', createdAt: '2024-06-14T10:30:00Z',
    evidence: ['Screenshot tin nhắn chat', 'Lịch sử đặt lịch']
  },
  {
    id: 'DS-002', studentClaim: 'Gia sư dạy không đúng chương trình IELTS, nội dung không liên quan đến bài thi.',
    tutorResponse: 'Tôi dạy theo giáo trình Cambridge chuẩn. Học sinh không đọc kỹ mô tả khóa học trước khi đặt.',
    student: STUDENTS[1], tutor: TUTORS[3], amount: 420000, lessonDate: '2024-06-21T09:00:00Z',
    transactionId: 'LP-012', status: 'OPEN', adminNote: '', createdAt: '2024-06-21T11:00:00Z',
    evidence: ['Video buổi học', 'Giáo trình đã thỏa thuận']
  },
  {
    id: 'DS-003', studentClaim: 'Kết nối internet của gia sư liên tục bị ngắt, buổi học kém hiệu quả.',
    tutorResponse: 'Internet bị sự cố do nhà mạng, tôi đã cố gắng kết nối lại nhiều lần.',
    student: STUDENTS[2], tutor: TUTORS[2], amount: 280000, lessonDate: '2024-06-12T14:00:00Z',
    transactionId: 'LP-003', status: 'RESOLVED_REFUND', adminNote: 'Đã xem xét bằng chứng, hoàn tiền 50% cho học sinh', createdAt: '2024-06-12T16:00:00Z',
    evidence: ['Log kết nối', 'Phản hồi học sinh']
  },
]

// ─── 6. FAILED TRANSACTIONS ───────────────────────────────────────────────────
export const FAILED_TRANSACTIONS = [
  { id: 'FT-001', user: STUDENTS[0], amount: 300000, gateway: 'MoMo', errorCode: 'ERR_INSUFFICIENT_FUNDS', errorMessage: 'Số dư ví không đủ để thực hiện giao dịch', createdAt: '2024-06-20T08:15:00Z' },
  { id: 'FT-002', user: STUDENTS[2], amount: 500000, gateway: 'VNPay', errorCode: 'ERR_TIMEOUT', errorMessage: 'Giao dịch hết thời gian chờ (timeout 30s)', createdAt: '2024-06-19T14:30:00Z' },
  { id: 'FT-003', user: TUTORS[0], amount: 5000000, gateway: 'Bank Transfer', errorCode: 'ERR_INVALID_ACCOUNT', errorMessage: 'Số tài khoản ngân hàng không tồn tại', createdAt: '2024-06-18T11:00:00Z' },
  { id: 'FT-004', user: STUDENTS[1], amount: 250000, gateway: 'MoMo', errorCode: 'ERR_CARD_DECLINED', errorMessage: 'Thẻ liên kết bị từ chối bởi ngân hàng phát hành', createdAt: '2024-06-17T09:45:00Z' },
  { id: 'FT-005', user: STUDENTS[3], amount: 400000, gateway: 'VNPay', errorCode: 'ERR_DUPLICATE', errorMessage: 'Giao dịch trùng lặp đã bị chặn (Idempotency check)', createdAt: '2024-06-16T16:00:00Z' },
  { id: 'FT-006', user: TUTORS[2], amount: 12000000, gateway: 'Bank Transfer', errorCode: 'ERR_LIMIT_EXCEEDED', errorMessage: 'Vượt quá hạn mức giao dịch ngày', createdAt: '2024-06-15T10:30:00Z' },
  { id: 'FT-007', user: STUDENTS[4], amount: 180000, gateway: 'Internal Wallet', errorCode: 'ERR_WALLET_FROZEN', errorMessage: 'Ví bị tạm khóa do hoạt động bất thường', createdAt: '2024-06-14T13:00:00Z' },
]

// ─── 7. PAYMENT GATEWAYS ──────────────────────────────────────────────────────
export const PAYMENT_GATEWAYS = [
  { id: 'gw1', name: 'VNPay', icon: 'credit_card', totalTx: 1842, successRate: 97.3, failedRate: 2.7, revenue: 285000000, status: 'ACTIVE', avgProcessTime: '1.2s', lastChecked: '2024-06-21T10:00:00Z' },
  { id: 'gw2', name: 'MoMo', icon: 'account_balance_wallet', totalTx: 2156, successRate: 98.1, failedRate: 1.9, revenue: 342000000, status: 'ACTIVE', avgProcessTime: '0.8s', lastChecked: '2024-06-21T10:00:00Z' },
  { id: 'gw3', name: 'Bank Transfer', icon: 'account_balance', totalTx: 486, successRate: 94.7, failedRate: 5.3, revenue: 128000000, status: 'ACTIVE', avgProcessTime: '24h', lastChecked: '2024-06-21T09:00:00Z' },
  { id: 'gw4', name: 'Internal Wallet', icon: 'savings', totalTx: 3421, successRate: 99.8, failedRate: 0.2, revenue: 512000000, status: 'ACTIVE', avgProcessTime: '0.1s', lastChecked: '2024-06-21T10:00:00Z' },
]

// ─── 8. COMMISSION MANAGEMENT ─────────────────────────────────────────────────
export const COMMISSIONS = [
  { id: 'CM-001', tutor: TUTORS[0], commissionRate: 15, effectiveDate: '2024-01-01T00:00:00Z', lastUpdated: '2024-03-15T10:00:00Z', updatedBy: 'Admin EduX', history: [
    { rate: 20, changedAt: '2023-06-01', changedBy: 'Admin EduX', reason: 'Mặc định' },
    { rate: 15, changedAt: '2024-01-01', changedBy: 'Admin EduX', reason: 'Gia sư đạt 4.9 sao' },
  ]},
  { id: 'CM-002', tutor: TUTORS[1], commissionRate: 15, effectiveDate: '2024-01-01T00:00:00Z', lastUpdated: '2024-01-01T00:00:00Z', updatedBy: 'Admin EduX', history: [
    { rate: 20, changedAt: '2023-06-01', changedBy: 'Admin EduX', reason: 'Mặc định' },
    { rate: 15, changedAt: '2024-01-01', changedBy: 'Admin EduX', reason: 'Gia sư Premium' },
  ]},
  { id: 'CM-003', tutor: TUTORS[2], commissionRate: 18, effectiveDate: '2024-03-01T00:00:00Z', lastUpdated: '2024-03-01T00:00:00Z', updatedBy: 'Admin EduX', history: [
    { rate: 20, changedAt: '2023-06-01', changedBy: 'Admin EduX', reason: 'Mặc định' },
    { rate: 18, changedAt: '2024-03-01', changedBy: 'Admin EduX', reason: 'Đã hoàn thiện hồ sơ' },
  ]},
  { id: 'CM-004', tutor: TUTORS[3], commissionRate: 20, effectiveDate: '2023-06-01T00:00:00Z', lastUpdated: '2023-06-01T00:00:00Z', updatedBy: 'System', history: [
    { rate: 20, changedAt: '2023-06-01', changedBy: 'System', reason: 'Mặc định' },
  ]},
  { id: 'CM-005', tutor: TUTORS[4], commissionRate: 12, effectiveDate: '2024-06-01T00:00:00Z', lastUpdated: '2024-06-01T00:00:00Z', updatedBy: 'Admin EduX', history: [
    { rate: 20, changedAt: '2023-06-01', changedBy: 'System', reason: 'Mặc định' },
    { rate: 12, changedAt: '2024-06-01', changedBy: 'Admin EduX', reason: 'Gia sư VIP - ký hợp đồng riêng' },
  ]},
]

// ─── 9. PLATFORM REVENUE DATA ─────────────────────────────────────────────────
export const REVENUE_BY_MONTH = [
  { month: 'T1/2024', revenue: 42500000, refunds: 1200000, net: 41300000 },
  { month: 'T2/2024', revenue: 38200000, refunds: 900000, net: 37300000 },
  { month: 'T3/2024', revenue: 55800000, refunds: 2100000, net: 53700000 },
  { month: 'T4/2024', revenue: 61200000, refunds: 1800000, net: 59400000 },
  { month: 'T5/2024', revenue: 78500000, refunds: 2400000, net: 76100000 },
  { month: 'T6/2024', revenue: 92300000, refunds: 3200000, net: 89100000 },
]

export const REVENUE_BY_SUBJECT = [
  { subject: 'Toán học', revenue: 125000000, txCount: 420 },
  { subject: 'Tiếng Anh', revenue: 98000000, txCount: 380 },
  { subject: 'Vật lý', revenue: 67000000, txCount: 210 },
  { subject: 'Hóa học', revenue: 54000000, txCount: 190 },
  { subject: 'Lịch sử', revenue: 32000000, txCount: 120 },
  { subject: 'Địa lý', revenue: 28000000, txCount: 95 },
]

// ─── 10. PROMOTION TRANSACTIONS ───────────────────────────────────────────────
export const PROMOTION_TRANSACTIONS = [
  { id: 'PR-001', promotionName: 'Back to School 2024', voucherCode: 'BACK2SCHOOL', discountAmount: 15000000, usageCount: 245, revenueImpact: -15000000, status: 'ACTIVE' },
  { id: 'PR-002', promotionName: 'Summer Learning', voucherCode: 'SUMMER30', discountAmount: 8500000, usageCount: 142, revenueImpact: -8500000, status: 'EXPIRED' },
  { id: 'PR-003', promotionName: 'New User Bonus', voucherCode: 'NEWUSER50K', discountAmount: 32500000, usageCount: 650, revenueImpact: -32500000, status: 'ACTIVE' },
  { id: 'PR-004', promotionName: 'VIP Tutor Week', voucherCode: 'VIPWEEK20', discountAmount: 5200000, usageCount: 86, revenueImpact: -5200000, status: 'SCHEDULED' },
  { id: 'PR-005', promotionName: 'Giới thiệu bạn bè', voucherCode: 'REFER20', discountAmount: 4800000, usageCount: 96, revenueImpact: -4800000, status: 'ACTIVE' },
]

// ─── 11. FRAUD ALERTS ─────────────────────────────────────────────────────────
export const FRAUD_ALERTS = [
  { id: 'FA-001', user: TUTORS[2], alertType: 'RAPID_WITHDRAWAL', riskLevel: 'HIGH', reason: 'Rút tiền 3 lần trong 24 giờ, tổng 28.000.000đ', createdAt: '2024-06-20T09:00:00Z', status: 'OPEN' },
  { id: 'FA-002', user: STUDENTS[1], alertType: 'REFUND_ABUSE', riskLevel: 'MEDIUM', reason: 'Đã yêu cầu hoàn tiền 4 lần trong 30 ngày qua', createdAt: '2024-06-19T14:00:00Z', status: 'INVESTIGATING' },
  { id: 'FA-003', user: TUTORS[4], alertType: 'LARGE_WITHDRAWAL_NEW_ACCOUNT', riskLevel: 'HIGH', reason: 'Tài khoản 15 ngày tuổi, rút 25.000.000đ', createdAt: '2024-06-17T10:30:00Z', status: 'RESOLVED' },
  { id: 'FA-004', user: STUDENTS[3], alertType: 'PAYMENT_FAILURE_PATTERN', riskLevel: 'LOW', reason: 'Thanh toán thất bại 5 lần liên tiếp trong 1 giờ', createdAt: '2024-06-16T16:00:00Z', status: 'RESOLVED' },
  { id: 'FA-005', user: STUDENTS[0], alertType: 'UNUSUAL_ACTIVITY', riskLevel: 'MEDIUM', reason: 'Đăng nhập từ 3 IP khác nhau trong 1 giờ', createdAt: '2024-06-15T11:00:00Z', status: 'OPEN' },
]

// ─── 12. NOTIFICATIONS ────────────────────────────────────────────────────────
export const NOTIFICATIONS = [
  { id: 'NT-001', recipient: STUDENTS[0], type: 'PAYMENT_SUCCESS', channel: 'Email + Push', status: 'DELIVERED', sentTime: '2024-06-20T08:30:00Z' },
  { id: 'NT-002', recipient: TUTORS[0], type: 'WITHDRAWAL_APPROVED', channel: 'Email + SMS', status: 'DELIVERED', sentTime: '2024-06-20T09:00:00Z' },
  { id: 'NT-003', recipient: STUDENTS[2], type: 'REFUND_PROCESSED', channel: 'Email', status: 'DELIVERED', sentTime: '2024-06-19T15:00:00Z' },
  { id: 'NT-004', recipient: TUTORS[2], type: 'FRAUD_ALERT', channel: 'Email + SMS + Push', status: 'FAILED', sentTime: '2024-06-20T09:01:00Z' },
  { id: 'NT-005', recipient: STUDENTS[1], type: 'DISPUTE_OPENED', channel: 'Email', status: 'PENDING', sentTime: '2024-06-21T11:00:00Z' },
  { id: 'NT-006', recipient: TUTORS[1], type: 'WITHDRAWAL_PENDING', channel: 'Push', status: 'DELIVERED', sentTime: '2024-06-20T09:30:00Z' },
  { id: 'NT-007', recipient: STUDENTS[3], type: 'PAYMENT_FAILED', channel: 'Email', status: 'DELIVERED', sentTime: '2024-06-16T16:05:00Z' },
  { id: 'NT-008', recipient: TUTORS[3], type: 'COMMISSION_UPDATED', channel: 'Email', status: 'DELIVERED', sentTime: '2024-06-15T10:00:00Z' },
]

// ─── 13. AUDIT LOGS ───────────────────────────────────────────────────────────
export const AUDIT_LOGS = [
  { id: 'AL-001', timestamp: '2024-06-21T10:30:00Z', actor: 'Admin EduX', action: 'APPROVE_WITHDRAWAL', target: 'WD-004 (Phạm Thị Dung)', ipAddress: '192.168.1.100', result: 'SUCCESS' },
  { id: 'AL-002', timestamp: '2024-06-21T10:15:00Z', actor: 'Admin EduX', action: 'REJECT_WITHDRAWAL', target: 'WD-005 (Hoàng Văn Em)', ipAddress: '192.168.1.100', result: 'SUCCESS' },
  { id: 'AL-003', timestamp: '2024-06-21T09:45:00Z', actor: 'Admin EduX', action: 'RESOLVE_DISPUTE', target: 'DS-003 (RESOLVED_REFUND)', ipAddress: '192.168.1.100', result: 'SUCCESS' },
  { id: 'AL-004', timestamp: '2024-06-20T16:00:00Z', actor: 'System', action: 'RELEASE_ESCROW', target: 'LP-003 (Lê Minh Châu)', ipAddress: '127.0.0.1', result: 'SUCCESS' },
  { id: 'AL-005', timestamp: '2024-06-20T14:30:00Z', actor: 'Admin EduX', action: 'UPDATE_COMMISSION', target: 'CM-005 (Hoàng Văn Em) 20% → 12%', ipAddress: '192.168.1.100', result: 'SUCCESS' },
  { id: 'AL-006', timestamp: '2024-06-20T12:00:00Z', actor: 'System', action: 'FRAUD_DETECTION', target: 'FA-001 (Lê Minh Châu)', ipAddress: '127.0.0.1', result: 'ALERT_CREATED' },
  { id: 'AL-007', timestamp: '2024-06-20T11:00:00Z', actor: 'Admin EduX', action: 'APPROVE_REFUND', target: 'RF-001 (Võ Thị Hoa)', ipAddress: '192.168.1.100', result: 'SUCCESS' },
  { id: 'AL-008', timestamp: '2024-06-19T15:00:00Z', actor: 'Admin EduX', action: 'REJECT_REFUND', target: 'RF-003 (Đặng Văn Hùng)', ipAddress: '192.168.1.100', result: 'SUCCESS' },
  { id: 'AL-009', timestamp: '2024-06-19T10:00:00Z', actor: 'System', action: 'PAYMENT_FAILED', target: 'FT-002 (Bùi Thị Lan) VNPay', ipAddress: '127.0.0.1', result: 'FAILED' },
  { id: 'AL-010', timestamp: '2024-06-18T09:00:00Z', actor: 'Admin EduX', action: 'VIEW_WITHDRAWAL', target: 'WD-003 (Lê Minh Châu)', ipAddress: '192.168.1.100', result: 'SUCCESS' },
]

// ─── 14. RECONCILIATION ───────────────────────────────────────────────────────
export const RECONCILIATION_DATA = [
  { id: 'RC-001', txId: 'LP-001', gateway: 'MoMo', gatewayAmount: 250000, dbAmount: 250000, walletAmount: 250000, status: 'MATCHED', date: '2024-06-10T08:30:00Z' },
  { id: 'RC-002', txId: 'LP-002', gateway: 'VNPay', gatewayAmount: 300000, dbAmount: 300000, walletAmount: 0, status: 'UNMATCHED', date: '2024-06-11T10:00:00Z', note: 'Wallet chưa được cập nhật' },
  { id: 'RC-003', txId: 'FT-002', gateway: 'VNPay', gatewayAmount: 500000, dbAmount: 0, walletAmount: 0, status: 'MISSING', date: '2024-06-19T14:30:00Z', note: 'Giao dịch có trên gateway nhưng không có trong DB' },
  { id: 'RC-004', txId: 'LP-003', gateway: 'Internal', gatewayAmount: 280000, dbAmount: 280000, walletAmount: 280000, status: 'MATCHED', date: '2024-06-12T14:15:00Z' },
  { id: 'RC-005', txId: 'LP-006', gateway: 'Bank Transfer', gatewayAmount: 260000, dbAmount: 260000, walletAmount: 260000, status: 'MATCHED', date: '2024-06-15T13:00:00Z' },
  { id: 'RC-006', txId: 'FT-001', gateway: 'MoMo', gatewayAmount: 300000, dbAmount: 300000, walletAmount: 0, status: 'UNMATCHED', date: '2024-06-20T08:15:00Z', note: 'Failed tx nhưng wallet bị trừ' },
]

// ─── SYSTEM WALLET SUMMARY ────────────────────────────────────────────────────
export const SYSTEM_WALLET = {
  escrowBalance: 48250000,
  pendingReleases: 12800000,
  refundReserve: 8500000,
  platformRevenueBalance: 92300000,
  totalFlow: {
    studentPayments: 368500000,
    escrowHeld: 48250000,
    tutorReleases: 227950000,
    platformFees: 57800000,
    refundsIssued: 12400000,
  }
}

// ─── KPI SUMMARY ─────────────────────────────────────────────────────────────
export const KPI_SUMMARY = {
  monthlyRevenue: 92300000,
  monthlyRevenueChange: +18.2,
  escrowBalance: 48250000,
  escrowChange: +5.1,
  pendingPayouts: 8,
  pendingPayoutsChange: -2,
  refundAmount: 3200000,
  refundChange: +0.8,
  platformFees: 13845000,
  platformFeesChange: +22.4,
  openDisputes: 2,
  openDisputesChange: -1,
  pendingWithdrawals: 3,
  pendingWithdrawalsChange: 0,
  fraudAlerts: 2,
  fraudAlertsChange: +1,
}

// ─── Helper Functions ─────────────────────────────────────────────────────────
export const fmtMoney = (n) => 'đ' + Number(n || 0).toLocaleString('vi-VN')
export const fmtDate = (iso) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
export const fmtDateTime = (iso) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
