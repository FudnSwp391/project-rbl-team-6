export const COMPLAINTS = [
  {
    id: 'CP-001',
    caseId: 'CASE-2026-001',
    sender: { name: 'Nguyễn Văn A', avatar: 'https://i.pravatar.cc/150?u=1', role: 'STUDENT' },
    target: { name: 'Trần Thị B', avatar: 'https://i.pravatar.cc/150?u=2', role: 'TUTOR' },
    title: 'Gia sư thường xuyên đi trễ',
    content: 'Gia sư Trần Thị B đã đi trễ 30 phút trong 2 buổi học gần nhất mà không báo trước, làm ảnh hưởng đến tiến độ học tập của tôi.',
    status: 'OPEN',
    createdAt: '2026-06-20T08:30:00Z',
    attachments: [
      { name: 'screenshot.png', url: 'https://example.com/screenshot.png' }
    ],
    linkedDisputeId: null
  },
  {
    id: 'CP-002',
    caseId: 'CASE-2026-002',
    sender: { name: 'Lê Văn C', avatar: 'https://i.pravatar.cc/150?u=3', role: 'TUTOR' },
    target: { name: 'Phạm Thị D', avatar: 'https://i.pravatar.cc/150?u=4', role: 'STUDENT' },
    title: 'Học viên có thái độ không đúng mực',
    content: 'Học viên thường xuyên có lời lẽ thô tục và không tôn trọng giáo viên trong giờ học. Tôi yêu cầu hủy khóa học này.',
    status: 'AWAITING_ADMIN',
    createdAt: '2026-06-22T14:15:00Z',
    attachments: [],
    linkedDisputeId: 'DISP-001'
  },
  {
    id: 'CP-003',
    caseId: 'CASE-2026-003',
    sender: { name: 'Hoàng Văn E', avatar: 'https://i.pravatar.cc/150?u=5', role: 'STUDENT' },
    target: { name: 'Hệ thống', avatar: '', role: 'SYSTEM' },
    title: 'Lỗi hệ thống khi thanh toán',
    content: 'Tôi đã thanh toán thành công khóa học Toán lớp 10 nhưng hệ thống vẫn chưa cập nhật trạng thái đã thanh toán. Tiền đã bị trừ khỏi tài khoản.',
    status: 'RESOLVED',
    createdAt: '2026-06-24T10:00:00Z',
    attachments: [
      { name: 'bill.pdf', url: 'https://example.com/bill.pdf' }
    ],
    linkedDisputeId: null
  }
];

export const REPORTED_REVIEWS = [
  {
    id: 'RV-101',
    reviewer: { name: 'Vũ Thị F', avatar: 'https://i.pravatar.cc/150?u=6' },
    reviewee: { name: 'Ngô Văn G', avatar: 'https://i.pravatar.cc/150?u=7' },
    content: 'Dạy quá tệ, không hiểu sao lại làm giáo viên được!!! Đồ ngu ngốc.',
    rating: 1,
    reportReason: 'Ngôn từ xúc phạm',
    status: 'Mới tạo',
    createdAt: '2026-06-21T09:20:00Z'
  },
  {
    id: 'RV-102',
    reviewer: { name: 'Bùi Văn H', avatar: 'https://i.pravatar.cc/150?u=8' },
    reviewee: { name: 'Đặng Thị I', avatar: 'https://i.pravatar.cc/150?u=9' },
    content: 'Bạn bè đăng ký học các môn khác liên hệ số 09xx123456 nhé, giảm giá 50%.',
    rating: 5,
    reportReason: 'Spam, quảng cáo trái phép',
    status: 'Đang xử lý',
    createdAt: '2026-06-23T16:45:00Z'
  }
];

export const VIOLATIONS = [
  {
    id: 'VL-001',
    reporter: { name: 'Lý Tiểu L', avatar: 'https://i.pravatar.cc/150?u=10' },
    reportedUser: { name: 'Trần Đại M', avatar: 'https://i.pravatar.cc/150?u=11' },
    userType: 'TUTOR',
    reason: 'Quấy rối qua tin nhắn',
    evidence: 'Gia sư liên tục nhắn tin với những lời lẽ gạ gẫm ngoài giờ học.',
    status: 'Mới tạo',
    createdAt: '2026-06-24T20:00:00Z'
  },
  {
    id: 'VL-002',
    reporter: { name: 'Đào Duy N', avatar: 'https://i.pravatar.cc/150?u=12' },
    reportedUser: { name: 'Châu Tinh T', avatar: 'https://i.pravatar.cc/150?u=13' },
    userType: 'STUDENT',
    reason: 'Gian lận thanh toán',
    evidence: 'Học viên cố tình sử dụng biên lai chuyển khoản giả mạo để xác nhận thanh toán khóa học.',
    status: 'Đang xử lý',
    createdAt: '2026-06-25T08:15:00Z'
  }
];
