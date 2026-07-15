/**
 * utils/businessRules.js — các hàm nghiệp vụ THUẦN (pure function, không chạm DB)
 * được tách từ server.js để có thể unit-test độc lập (xem backend/tests/).
 *
 * Quy tắc: file này KHÔNG được require db/express/supabase — chỉ nhận input,
 * trả output. Mọi hàm đọc/ghi DB vẫn nằm ở server.js.
 */

// ═══════════════════════════════════════════════════════════════════════════
// COMMISSION POLICY V1 — chia hoa hồng nền tảng / tiền gia sư
// ═══════════════════════════════════════════════════════════════════════════
const PLATFORM_COMMISSION_RATE = 0.10;
const COMMISSION_POLICY_VERSION = "COMMISSION_POLICY_V1";

function calculateCommissionSplit(grossAmount, rate = PLATFORM_COMMISSION_RATE) {
  // Number.isFinite chặn NaN lan vào số tiền (vd. input là chuỗi không phải số)
  const n = Number(grossAmount || 0);
  const gross = Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
  const commissionAmount = gross - Math.floor(gross * (1 - rate));
  const tutorAmount = gross - commissionAmount;
  return { grossAmount: gross, commissionRate: rate, commissionAmount, tutorAmount };
}

// ═══════════════════════════════════════════════════════════════════════════
// REFUND POLICY V2.1 — quyết định hoàn tiền (pure decision helpers)
// ═══════════════════════════════════════════════════════════════════════════
const REFUND_POLICY_VERSION = "REFUND_POLICY_V2_1";

// Course purchase: 48h window, progress-tiered refund rate.
function getCourseRefundDecision(hoursSincePurchase, progressPercent) {
  if (hoursSincePurchase > 48)
    return { eligible: false, mode: "ADMIN_REVIEW", refundRate: 0, reasonCode: "COURSE_AFTER_48H_ADMIN_REVIEW" };
  if (progressPercent <= 20)
    return { eligible: true, mode: "AUTO_FULL", refundRate: 1.0, reasonCode: "COURSE_WITHIN_48H_PROGRESS_LE_20" };
  if (progressPercent <= 40)
    return { eligible: true, mode: "AUTO_PARTIAL", refundRate: 0.7, reasonCode: "COURSE_WITHIN_48H_PROGRESS_21_40" };
  if (progressPercent <= 60)
    return { eligible: true, mode: "AUTO_PARTIAL", refundRate: 0.4, reasonCode: "COURSE_WITHIN_48H_PROGRESS_41_60" };
  if (progressPercent <= 80)
    return { eligible: true, mode: "AUTO_PARTIAL", refundRate: 0.2, reasonCode: "COURSE_WITHIN_48H_PROGRESS_61_80" };
  return { eligible: false, mode: "ADMIN_REVIEW", refundRate: 0, reasonCode: "COURSE_PROGRESS_GT_80_ADMIN_REVIEW" };
}

// Lesson/booking: tutor fault = full; student cancel = hours-before-lesson tiered.
function getLessonRefundDecision(hoursBeforeLesson, reasonCode) {
  if (["TUTOR_CANCELLED", "TUTOR_NO_SHOW", "TUTOR_FAULT"].includes(reasonCode))
    return { eligible: true, mode: "AUTO_FULL", refundRate: 1.0, reasonCode };
  if (reasonCode === "STUDENT_CANCELLED") {
    if (hoursBeforeLesson >= 6) return { eligible: true, mode: "AUTO_FULL",    refundRate: 1.0,  reasonCode: "STUDENT_CANCEL_GE_6H" };
    if (hoursBeforeLesson >= 3) return { eligible: true, mode: "AUTO_PARTIAL", refundRate: 0.5,  reasonCode: "STUDENT_CANCEL_3_TO_6H" };
    if (hoursBeforeLesson >= 1) return { eligible: true, mode: "AUTO_PARTIAL", refundRate: 0.25, reasonCode: "STUDENT_CANCEL_1_TO_3H" };
    return { eligible: false, mode: "NO_REFUND", refundRate: 0, reasonCode: "STUDENT_CANCEL_LT_1H_NO_REFUND" };
  }
  if (reasonCode === "STUDENT_NO_SHOW")
    return { eligible: false, mode: "NO_REFUND", refundRate: 0, reasonCode: "STUDENT_NO_SHOW_NO_REFUND" };
  return { eligible: false, mode: "ADMIN_REVIEW", refundRate: 0, reasonCode: "UNKNOWN_REASON_ADMIN_REVIEW" };
}

// ═══════════════════════════════════════════════════════════════════════════
// ATTENDANCE SETTLEMENT POLICY V1 — xử lý tiền khi gia sư điểm danh
//
// Nguyên tắc thiết kế (chống động cơ ngược):
// - Người bấm điểm danh là GIA SƯ — cũng là người hưởng lợi từ kết quả, nên
//   mọi kết quả CÓ LỢI cho gia sư đều phải kèm bằng chứng:
//     • 'absent' (tố học sinh no-show → gia sư được bồi hoàn 90%) chỉ hợp lệ khi
//       (1) buổi học đã bắt đầu được ít nhất GRACE phút, và
//       (2) gia sư đã check-in buổi học (tutor_check_in_at) — không có bằng
//           chứng mình có mặt thì không có quyền đòi bồi hoàn → tiền hoàn về
//           học sinh (burden of proof thuộc về bên nhận tiền).
// - 'excused' (nghỉ có phép) hoàn 100% cho học sinh và gia sư nhận 0đ — đây là
//   gia sư TỰ NGUYỆN bỏ quyền lợi nên không cần guard (lạm dụng = tự thiệt).
// - Học sinh luôn còn cửa sổ khiếu nại 48h (dispute) sau buổi học để lật lại
//   quyết định no-show sai; admin xử qua resolve-dispute-v2 (hỗ trợ hoàn 1 phần).
// - Hủy TRƯỚC buổi học không đi qua đây — đã có getLessonRefundDecision
//   (bậc thang theo số giờ báo trước) ở luồng hủy booking.
// ═══════════════════════════════════════════════════════════════════════════
const ATTENDANCE_POLICY_VERSION = "ATTENDANCE_SETTLEMENT_V1";
const ATTENDANCE_ABSENT_GRACE_MINUTES = 15;

/**
 * Quyết định dòng tiền khi điểm danh.
 * @param {'present'|'absent'|'excused'} status
 * @param {object} ctx
 * @param {number|null} ctx.minutesSinceStart  phút kể từ giờ bắt đầu buổi học
 *        (âm = chưa tới giờ; null = không xác định được giờ học — dữ liệu cũ)
 * @param {boolean} ctx.tutorCheckedIn         gia sư đã check-in buổi học chưa
 * @returns {{ action: 'RELEASE_TO_TUTOR'|'REFUND_STUDENT'|'COMPENSATE_TUTOR'|'REJECT_TOO_EARLY',
 *            refundRate: number, reasonCode: string }}
 */
function getAttendanceSettlement(status, { minutesSinceStart = null, tutorCheckedIn = false } = {}) {
  if (status === 'present') {
    return { action: 'RELEASE_TO_TUTOR', refundRate: 0, reasonCode: 'INSTANT_RELEASE_ON_PRESENT' };
  }

  if (status === 'excused') {
    // Gia sư châm chước — hoàn toàn bộ, gia sư nhận 0đ (tự nguyện, không cần guard)
    return { action: 'REFUND_STUDENT', refundRate: 1.0, reasonCode: 'ATTENDANCE_EXCUSED' };
  }

  // status === 'absent' — tố no-show, kết quả có lợi cho gia sư → cần bằng chứng
  if (minutesSinceStart != null && minutesSinceStart < ATTENDANCE_ABSENT_GRACE_MINUTES) {
    // Chưa đủ thời gian chờ học sinh — không thể kết luận vắng mặt
    return { action: 'REJECT_TOO_EARLY', refundRate: 0, reasonCode: 'ATTENDANCE_ABSENT_TOO_EARLY' };
  }
  if (!tutorCheckedIn) {
    // Không có bằng chứng gia sư có mặt → không bồi hoàn, tiền về học sinh
    return { action: 'REFUND_STUDENT', refundRate: 1.0, reasonCode: 'ATTENDANCE_ABSENT_NO_CHECKIN' };
  }
  // Đủ điều kiện: học sinh no-show → gia sư nhận 90% (slot đã giữ = buổi đã bán),
  // nền tảng giữ 10% hoa hồng như một buổi dạy bình thường
  return { action: 'COMPENSATE_TUTOR', refundRate: 0, reasonCode: 'STUDENT_NO_SHOW_COMPENSATION' };
}

// ═══════════════════════════════════════════════════════════════════════════
// WITHDRAWAL POLICY V1 — chuẩn hoá lệnh rút tiền
// ═══════════════════════════════════════════════════════════════════════════
const WITHDRAWAL_POLICY_VERSION = "WITHDRAWAL_POLICY_V1";
const MIN_WITHDRAWAL_AMOUNT = 50000;

// Return a rounded non-negative integer VND amount, or 0 if invalid.
function normalizeWithdrawalAmount(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.floor(n);
}

// Trim, strip control chars, collapse whitespace, cap length. Null-safe.
function sanitizeBankText(value, maxLength = 120) {
  if (value == null) return null;
  let s = String(value).replace(/[\x00-\x1F\x7F]/g, '').replace(/\s+/g, ' ').trim();
  if (!s) return null;
  return s.slice(0, maxLength);
}

// ═══════════════════════════════════════════════════════════════════════════
// LESSON TIME & TEACHING METHOD — helpers cho booking
// ═══════════════════════════════════════════════════════════════════════════

function lessonDateStr(lessonDate) {
  if (!lessonDate) return '';
  if (typeof lessonDate === 'string') return lessonDate.slice(0, 10);
  const d = new Date(lessonDate);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Tính thời điểm bắt đầu buổi học từ lesson_date + time_slot (múi giờ VN +07:00)
function lessonStartFrom(lessonDate, timeSlot) {
  if (!lessonDate) return null;
  const dateStr = lessonDateStr(lessonDate);
  if (!dateStr) return null;
  const m = String(timeSlot || '').match(/(\d+):(\d+)\s*(AM|PM)?/i);
  let h = 0, min = 0;
  if (m) {
    h = parseInt(m[1], 10);
    min = parseInt(m[2], 10);
    if (m[3] && m[3].toUpperCase() === 'PM' && h !== 12) h += 12;
    if (m[3] && m[3].toUpperCase() === 'AM' && h === 12) h = 0;
  }
  const d = new Date(`${dateStr}T${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:00+07:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Tính thời điểm kết thúc buổi học từ lesson_date + time_slot (múi giờ VN +07:00)
// time_slot dạng "8:00 AM - 9:00 AM" → lấy phần sau dấu "-"
function lessonEndFrom(lessonDate, timeSlot) {
  if (!lessonDate) return null;
  const dateStr = lessonDateStr(lessonDate);
  if (!dateStr) return null;
  const parts = String(timeSlot || '').split('-');
  const endPart = parts[1] || parts[0] || '';
  const m = endPart.match(/(\d+):(\d+)\s*(AM|PM)?/i);
  let h = 1, min = 0;
  if (m) {
    h = parseInt(m[1], 10);
    min = parseInt(m[2], 10);
    if (m[3] && m[3].toUpperCase() === 'PM' && h !== 12) h += 12;
    if (m[3] && m[3].toUpperCase() === 'AM' && h === 12) h = 0;
  }
  const d = new Date(`${dateStr}T${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:00+07:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Chuẩn hóa hình thức dạy từ tutor_profiles.teaching_methods (mảng text tự do).
// Chưa khai báo gì → coi như dạy cả 2 (không chặn đặt lịch).
function parseMethodSupport(teachingMethods) {
  const arr = Array.isArray(teachingMethods) ? teachingMethods : [];
  const txt = arr.join(' ').toLowerCase();
  const online  = /online|trực tuyến|truc tuyen/.test(txt);
  const offline = /offline|trực tiếp|truc tiep|tại nhà|tai nha|tại địa điểm/.test(txt);
  if (!online && !offline) return { online: true, offline: true };
  return { online, offline };
}

// Combine booking.lesson_date (date) + booking.time_slot ('HH:MM') into a Date.
function parseBookingStartDateTime(booking) {
  const d = String(booking.lesson_date).slice(0, 10);
  const t = (booking.time_slot || '00:00').slice(0, 5);
  return new Date(`${d}T${t}:00`);
}

module.exports = {
  PLATFORM_COMMISSION_RATE,
  COMMISSION_POLICY_VERSION,
  calculateCommissionSplit,
  REFUND_POLICY_VERSION,
  getCourseRefundDecision,
  getLessonRefundDecision,
  ATTENDANCE_POLICY_VERSION,
  ATTENDANCE_ABSENT_GRACE_MINUTES,
  getAttendanceSettlement,
  WITHDRAWAL_POLICY_VERSION,
  MIN_WITHDRAWAL_AMOUNT,
  normalizeWithdrawalAmount,
  sanitizeBankText,
  lessonDateStr,
  lessonStartFrom,
  lessonEndFrom,
  parseMethodSupport,
  parseBookingStartDateTime,
};
