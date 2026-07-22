/**
 * Unit tests cho utils/businessRules.js — các quy tắc nghiệp vụ tiền & booking.
 * Chạy: npm test (từ thư mục backend/) — chạy qua Jest như các test khác;
 * describe/test là global do Jest cấp, chỉ assertion dùng node:assert/strict.
 */
const assert = require('node:assert/strict');

const {
  PLATFORM_COMMISSION_RATE,
  calculateCommissionSplit,
  getCourseRefundDecision,
  getLessonRefundDecision,
  ATTENDANCE_ABSENT_GRACE_MINUTES,
  getAttendanceSettlement,
  MIN_WITHDRAWAL_AMOUNT,
  normalizeWithdrawalAmount,
  sanitizeBankText,
  lessonDateStr,
  lessonStartFrom,
  lessonEndFrom,
  parseMethodSupport,
  parseBookingStartDateTime,
} = require('../utils/businessRules');

// ─── calculateCommissionSplit ────────────────────────────────────────────────
describe('calculateCommissionSplit', () => {
  test('chia 10% hoa hồng cho số tiền tròn', () => {
    const r = calculateCommissionSplit(100000);
    assert.equal(r.grossAmount, 100000);
    assert.equal(r.tutorAmount, 90000);
    assert.equal(r.commissionAmount, 10000);
    assert.equal(r.commissionRate, PLATFORM_COMMISSION_RATE);
  });

  test('tutor + commission LUÔN bằng đúng gross (không mất/thừa 1 đồng do làm tròn)', () => {
    for (const gross of [1, 99, 99999, 123457, 150000, 199999, 1000001]) {
      const r = calculateCommissionSplit(gross);
      assert.equal(
        r.tutorAmount + r.commissionAmount, r.grossAmount,
        `lệch tiền với gross=${gross}`
      );
    }
  });

  test('số tiền lẻ: gia sư nhận floor(90%), phần dư về hoa hồng', () => {
    const r = calculateCommissionSplit(99999);
    assert.equal(r.tutorAmount, 89999); // floor(99999 * 0.9)
    assert.equal(r.commissionAmount, 10000);
  });

  test('input rác (null / âm / NaN) → tất cả về 0, không ném lỗi', () => {
    for (const bad of [null, undefined, -5000, 'abc', NaN]) {
      const r = calculateCommissionSplit(bad);
      assert.equal(r.grossAmount, 0);
      assert.equal(r.tutorAmount, 0);
      assert.equal(r.commissionAmount, 0);
    }
  });

  test('hỗ trợ rate tuỳ chỉnh', () => {
    const r = calculateCommissionSplit(100000, 0.2);
    assert.equal(r.tutorAmount, 80000);
    assert.equal(r.commissionAmount, 20000);
  });
});

// ─── getCourseRefundDecision ─────────────────────────────────────────────────
describe('getCourseRefundDecision', () => {
  test('quá 48h → chuyển admin duyệt, không tự hoàn', () => {
    const r = getCourseRefundDecision(49, 0);
    assert.equal(r.eligible, false);
    assert.equal(r.mode, 'ADMIN_REVIEW');
  });

  test('trong 48h, tiến độ ≤20% → hoàn 100%', () => {
    const r = getCourseRefundDecision(10, 20);
    assert.equal(r.eligible, true);
    assert.equal(r.refundRate, 1.0);
  });

  test('bậc thang theo tiến độ: 21-40→70%, 41-60→40%, 61-80→20%', () => {
    assert.equal(getCourseRefundDecision(1, 30).refundRate, 0.7);
    assert.equal(getCourseRefundDecision(1, 55).refundRate, 0.4);
    assert.equal(getCourseRefundDecision(1, 80).refundRate, 0.2);
  });

  test('học quá 80% → không tự hoàn, admin duyệt', () => {
    const r = getCourseRefundDecision(1, 81);
    assert.equal(r.eligible, false);
    assert.equal(r.mode, 'ADMIN_REVIEW');
  });
});

// ─── getLessonRefundDecision ─────────────────────────────────────────────────
describe('getLessonRefundDecision', () => {
  test('lỗi từ phía gia sư (hủy / no-show) → hoàn 100% bất kể thời gian', () => {
    for (const code of ['TUTOR_CANCELLED', 'TUTOR_NO_SHOW', 'TUTOR_FAULT']) {
      const r = getLessonRefundDecision(0, code);
      assert.equal(r.refundRate, 1.0, code);
      assert.equal(r.eligible, true, code);
    }
  });

  test('học sinh hủy: ≥6h→100%, 3-6h→50%, 1-3h→25%, <1h→0%', () => {
    assert.equal(getLessonRefundDecision(6, 'STUDENT_CANCELLED').refundRate, 1.0);
    assert.equal(getLessonRefundDecision(3, 'STUDENT_CANCELLED').refundRate, 0.5);
    assert.equal(getLessonRefundDecision(1, 'STUDENT_CANCELLED').refundRate, 0.25);
    assert.equal(getLessonRefundDecision(0.5, 'STUDENT_CANCELLED').refundRate, 0);
    assert.equal(getLessonRefundDecision(0.5, 'STUDENT_CANCELLED').eligible, false);
  });

  test('học sinh vắng không phép → không hoàn', () => {
    const r = getLessonRefundDecision(0, 'STUDENT_NO_SHOW');
    assert.equal(r.eligible, false);
    assert.equal(r.mode, 'NO_REFUND');
  });

  test('lý do lạ → đẩy sang admin, không tự quyết', () => {
    const r = getLessonRefundDecision(10, 'SOMETHING_ELSE');
    assert.equal(r.mode, 'ADMIN_REVIEW');
    assert.equal(r.refundRate, 0);
  });
});

// ─── getAttendanceSettlement ─────────────────────────────────────────────────
describe('getAttendanceSettlement', () => {
  test('present → giải ngân cho gia sư, không hoàn', () => {
    const r = getAttendanceSettlement('present', { minutesSinceStart: 30, tutorCheckedIn: true });
    assert.equal(r.action, 'RELEASE_TO_TUTOR');
    assert.equal(r.refundRate, 0);
  });

  test('excused → hoàn 100% cho học sinh, KHÔNG cần guard (gia sư tự nguyện bỏ quyền lợi)', () => {
    // Không check-in, thậm chí trước giờ học — excused vẫn hợp lệ vì nó CÓ HẠI cho gia sư
    const r = getAttendanceSettlement('excused', { minutesSinceStart: -60, tutorCheckedIn: false });
    assert.equal(r.action, 'REFUND_STUDENT');
    assert.equal(r.refundRate, 1.0);
    assert.equal(r.reasonCode, 'ATTENDANCE_EXCUSED');
  });

  test('absent trước giờ học → từ chối (không thể kết luận vắng khi buổi học chưa diễn ra)', () => {
    const r = getAttendanceSettlement('absent', { minutesSinceStart: -10, tutorCheckedIn: true });
    assert.equal(r.action, 'REJECT_TOO_EARLY');
  });

  test('absent trong thời gian chờ (grace 15 phút) → vẫn từ chối', () => {
    const r = getAttendanceSettlement('absent', {
      minutesSinceStart: ATTENDANCE_ABSENT_GRACE_MINUTES - 1, tutorCheckedIn: true,
    });
    assert.equal(r.action, 'REJECT_TOO_EARLY');
  });

  test('absent đúng mốc grace → được phép xử lý', () => {
    const r = getAttendanceSettlement('absent', {
      minutesSinceStart: ATTENDANCE_ABSENT_GRACE_MINUTES, tutorCheckedIn: true,
    });
    assert.equal(r.action, 'COMPENSATE_TUTOR');
  });

  test('absent KHÔNG check-in → không có bằng chứng → tiền hoàn về học sinh', () => {
    const r = getAttendanceSettlement('absent', { minutesSinceStart: 30, tutorCheckedIn: false });
    assert.equal(r.action, 'REFUND_STUDENT');
    assert.equal(r.refundRate, 1.0);
    assert.equal(r.reasonCode, 'ATTENDANCE_ABSENT_NO_CHECKIN');
  });

  test('absent + đã check-in + sau grace → gia sư được bồi hoàn (học sinh no-show mất phí)', () => {
    const r = getAttendanceSettlement('absent', { minutesSinceStart: 30, tutorCheckedIn: true });
    assert.equal(r.action, 'COMPENSATE_TUTOR');
    assert.equal(r.refundRate, 0);
    assert.equal(r.reasonCode, 'STUDENT_NO_SHOW_COMPENSATION');
  });

  test('dữ liệu cũ không xác định được giờ học (null) → bỏ guard giờ nhưng VẪN đòi check-in', () => {
    const noCheckin = getAttendanceSettlement('absent', { minutesSinceStart: null, tutorCheckedIn: false });
    assert.equal(noCheckin.action, 'REFUND_STUDENT');
    const checkedIn = getAttendanceSettlement('absent', { minutesSinceStart: null, tutorCheckedIn: true });
    assert.equal(checkedIn.action, 'COMPENSATE_TUTOR');
  });

  test('không truyền context → mặc định an toàn nhất (hoàn học sinh, không bồi hoàn)', () => {
    const r = getAttendanceSettlement('absent');
    assert.equal(r.action, 'REFUND_STUDENT');
  });
});

// ─── normalizeWithdrawalAmount ───────────────────────────────────────────────
describe('normalizeWithdrawalAmount', () => {
  test('làm tròn xuống số nguyên VND', () => {
    assert.equal(normalizeWithdrawalAmount('50000.99'), 50000);
    assert.equal(normalizeWithdrawalAmount(123456.7), 123456);
  });

  test('input không hợp lệ (âm / NaN / Infinity / rỗng) → 0', () => {
    for (const bad of [-1, 0, NaN, Infinity, 'abc', '', null, undefined]) {
      assert.equal(normalizeWithdrawalAmount(bad), 0, String(bad));
    }
  });

  test('MIN_WITHDRAWAL_AMOUNT là 50.000đ', () => {
    assert.equal(MIN_WITHDRAWAL_AMOUNT, 50000);
  });
});

// ─── sanitizeBankText ────────────────────────────────────────────────────────
describe('sanitizeBankText', () => {
  test('cắt control char, gộp khoảng trắng, trim', () => {
    assert.equal(sanitizeBankText('  Ngan\x00hang   ACB \n '), 'Nganhang ACB');
  });

  test('giới hạn độ dài', () => {
    assert.equal(sanitizeBankText('a'.repeat(300)).length, 120);
    assert.equal(sanitizeBankText('abcdef', 3), 'abc');
  });

  test('null / chuỗi rỗng → null', () => {
    assert.equal(sanitizeBankText(null), null);
    assert.equal(sanitizeBankText('   '), null);
  });
});

// ─── parseMethodSupport ──────────────────────────────────────────────────────
describe('parseMethodSupport', () => {
  test('chưa khai báo → hỗ trợ cả online lẫn offline (không chặn đặt lịch)', () => {
    assert.deepEqual(parseMethodSupport([]), { online: true, offline: true });
    assert.deepEqual(parseMethodSupport(null), { online: true, offline: true });
  });

  test('chỉ online', () => {
    assert.deepEqual(parseMethodSupport(['Dạy Online']), { online: true, offline: false });
    assert.deepEqual(parseMethodSupport(['trực tuyến']), { online: true, offline: false });
  });

  test('chỉ offline (nhiều cách viết tiếng Việt)', () => {
    assert.deepEqual(parseMethodSupport(['Dạy trực tiếp']), { online: false, offline: true });
    assert.deepEqual(parseMethodSupport(['tại nhà học sinh']), { online: false, offline: true });
  });

  test('cả hai', () => {
    assert.deepEqual(parseMethodSupport(['Online', 'Tại nhà']), { online: true, offline: true });
  });
});

// ─── lesson time helpers ─────────────────────────────────────────────────────
describe('lesson time helpers', () => {
  test('lessonDateStr: cắt chuỗi ISO và format Date object', () => {
    assert.equal(lessonDateStr('2026-07-16T00:00:00.000Z'), '2026-07-16');
    assert.equal(lessonDateStr(''), '');
  });

  test('lessonStartFrom: "8:00 AM - 9:00 AM" bắt đầu 8h sáng giờ VN (+07:00)', () => {
    const d = lessonStartFrom('2026-07-16', '8:00 AM - 9:00 AM');
    assert.equal(d.toISOString(), '2026-07-16T01:00:00.000Z'); // 8h VN = 1h UTC
  });

  test('lessonEndFrom: lấy giờ SAU dấu "-", đổi PM đúng', () => {
    const d = lessonEndFrom('2026-07-16', '1:00 PM - 2:30 PM');
    assert.equal(d.toISOString(), '2026-07-16T07:30:00.000Z'); // 14:30 VN
  });

  test('12 AM / 12 PM không bị cộng nhầm 12 giờ', () => {
    const noon = lessonStartFrom('2026-07-16', '12:00 PM');
    assert.equal(noon.toISOString(), '2026-07-16T05:00:00.000Z'); // 12h trưa VN
    const midnight = lessonStartFrom('2026-07-16', '12:00 AM');
    assert.equal(midnight.toISOString(), '2026-07-15T17:00:00.000Z'); // 0h VN
  });

  test('parseBookingStartDateTime ghép lesson_date + time_slot HH:MM', () => {
    const d = parseBookingStartDateTime({ lesson_date: '2026-07-16', time_slot: '09:30' });
    assert.equal(d.getHours(), 9);
    assert.equal(d.getMinutes(), 30);
  });

  test('input thiếu → null, không crash', () => {
    assert.equal(lessonStartFrom(null, '8:00 AM'), null);
    assert.equal(lessonEndFrom('', ''), null);
  });
});
