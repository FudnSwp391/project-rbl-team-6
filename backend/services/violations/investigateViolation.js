const { lessonStartFrom, lessonEndFrom } = require('../../utils/businessRules');

const LATE_GRACE_MINUTES = 5;

// Chuẩn hoá bỏ dấu tiếng Việt — người dùng thực tế hay gõ báo cáo KHÔNG dấu
// (đặc biệt trên điện thoại), nên so khớp từ khoá phải bỏ qua dấu để không bị
// bỏ sót. Dùng cụm 2+ từ thay vì từ đơn để tránh đụng từ khác cũng mất dấu
// giống nhau (vd "trễ"/"trẻ" đều thành "tre", "muộn"/"muốn" đều thành "muon").
const DIACRITIC_MARKS_RE = new RegExp('[̀-ͯ]', 'g');
function normalizeVi(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD').replace(DIACRITIC_MARKS_RE, '')
    .replace(/đ/g, 'd')
    .trim();
}

// Chỉ dùng để CHỌN loại kiểm tra nào sẽ chạy — kết luận thật luôn đến từ đối
// chiếu dữ liệu thật bên dưới, không bao giờ suy ra trực tiếp từ từ khoá.
function classifyCase(reason) {
  const text = normalizeVi(reason);
  const has = (...kws) => kws.some(k => text.includes(k));
  if (has('khong den', 'vang mat', 'khong xuat hien', 'bo buoi', 'khong vao lop', 'no-show', 'noshow', 'no show')) return 'TUTOR_NO_SHOW';
  if (has('den muon', 'den tre', 'vao tre', 'tre gio', 'muon gio', 'cham gio', 'khong dung gio')) return 'TUTOR_LATE';
  if (has('sai hoc phi', 'sai gia', 'tinh sai tien', 'thu sai tien', 'gia sai', 'hoc phi sai', 'tinh tien sai')) return 'WRONG_FEE';
  return null;
}

function inconclusive(summary) {
  return { verdict: 'INCONCLUSIVE', confidence: 0, summary, recommendation: null, evidence: {}, autoDismiss: false };
}
function fmtTime(d) {
  return d.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
}
function fmtVnd(n) {
  return n != null ? `${Number(n).toLocaleString('vi-VN')}đ` : '—';
}

async function investigateTutorLate(pool, dispute) {
  if (!dispute.booking_id) {
    return inconclusive('Báo cáo không gắn với buổi học cụ thể (thiếu booking_id), không thể đối chiếu giờ check-in.');
  }
  const { rows } = await pool.query(
    `SELECT lesson_date, time_slot, tutor_check_in_at FROM bookings WHERE id = $1`,
    [dispute.booking_id]
  );
  if (!rows.length) return inconclusive('Không tìm thấy buổi học liên quan tới báo cáo này.');
  const b = rows[0];
  const start = lessonStartFrom(b.lesson_date, b.time_slot);
  if (!start) return inconclusive('Không xác định được giờ bắt đầu buổi học từ dữ liệu lịch.');

  if (!b.tutor_check_in_at) {
    return {
      verdict: 'SUBSTANTIATED',
      confidence: 60,
      summary: `Gia sư chưa từng check-in cho buổi học lúc ${fmtTime(start)}. Có thể đây là trường hợp vắng mặt hoàn toàn chứ không chỉ đến trễ.`,
      recommendation: 'Không đủ rõ ràng để tự đóng — cần admin xem trực tiếp (có thể là vắng mặt, không chỉ trễ).',
      evidence: { scheduled_start: start.toISOString(), tutor_check_in_at: null },
      autoDismiss: false,
    };
  }

  const checkIn = new Date(b.tutor_check_in_at);
  const lateMinutes = Math.round((checkIn - start) / 60000);

  if (lateMinutes <= LATE_GRACE_MINUTES) {
    return {
      verdict: 'UNSUBSTANTIATED',
      confidence: 90,
      summary: `Gia sư check-in lúc ${fmtTime(checkIn)}, giờ học bắt đầu ${fmtTime(start)} — ${lateMinutes <= 0 ? 'đúng giờ hoặc sớm hơn lịch' : `chỉ trễ ${lateMinutes} phút (trong ngưỡng cho phép ${LATE_GRACE_MINUTES} phút)`}.`,
      recommendation: null,
      evidence: { scheduled_start: start.toISOString(), tutor_check_in_at: checkIn.toISOString(), late_minutes: lateMinutes },
      autoDismiss: true,
    };
  }

  const suggestedDelta = lateMinutes > 30 ? -15 : lateMinutes > 15 ? -10 : -5;
  return {
    verdict: 'SUBSTANTIATED',
    confidence: Math.min(95, 60 + lateMinutes),
    summary: `Gia sư check-in lúc ${fmtTime(checkIn)}, giờ học bắt đầu ${fmtTime(start)} — trễ ${lateMinutes} phút.`,
    recommendation: `Đề xuất trừ ${Math.abs(suggestedDelta)} điểm uy tín và cảnh báo gia sư.`,
    evidence: { scheduled_start: start.toISOString(), tutor_check_in_at: checkIn.toISOString(), late_minutes: lateMinutes, suggested_reputation_delta: suggestedDelta },
    autoDismiss: false,
  };
}

async function investigateTutorNoShow(pool, dispute) {
  if (!dispute.booking_id) {
    return inconclusive('Báo cáo không gắn với buổi học cụ thể (thiếu booking_id), không thể đối chiếu.');
  }
  const { rows } = await pool.query(
    `SELECT lesson_date, time_slot, tutor_check_in_at FROM bookings WHERE id = $1`,
    [dispute.booking_id]
  );
  if (!rows.length) return inconclusive('Không tìm thấy buổi học liên quan tới báo cáo này.');
  const b = rows[0];
  const end = lessonEndFrom(b.lesson_date, b.time_slot);
  if (!end) return inconclusive('Không xác định được giờ kết thúc buổi học từ dữ liệu lịch.');

  if (b.tutor_check_in_at) {
    const checkIn = new Date(b.tutor_check_in_at);
    return {
      verdict: 'UNSUBSTANTIATED',
      confidence: 90,
      summary: `Gia sư đã check-in lúc ${fmtTime(checkIn)} cho buổi học này — không phải trường hợp vắng mặt.`,
      recommendation: null,
      evidence: { tutor_check_in_at: checkIn.toISOString() },
      autoDismiss: true,
    };
  }

  if (new Date() < end) {
    return inconclusive('Buổi học chưa kết thúc, chưa đủ dữ liệu để kết luận vắng mặt hay không.');
  }

  return {
    verdict: 'SUBSTANTIATED',
    confidence: 85,
    summary: `Gia sư không check-in cho buổi học đã kết thúc lúc ${fmtTime(end)}.`,
    recommendation: 'Đề xuất trừ 25 điểm uy tín (mức vắng mặt) và cảnh báo nghiêm khắc gia sư.',
    evidence: { scheduled_end: end.toISOString(), tutor_check_in_at: null, suggested_reputation_delta: -25 },
    autoDismiss: false,
  };
}

// Luôn route sang admin, không bao giờ tự đóng: giá niêm yết hiện tại của gia
// sư có thể đã đổi kể từ lúc đặt lịch (không có snapshot giá tại thời điểm đặt),
// nên bằng chứng loại này kém tin cậy hơn 2 case dựa trên mốc thời gian ở trên.
async function investigateWrongFee(pool, dispute) {
  if (!dispute.booking_id) {
    return inconclusive('Báo cáo không gắn với buổi học cụ thể (thiếu booking_id), không thể đối chiếu học phí.');
  }
  const { rows } = await pool.query(
    `SELECT b.lesson_fee, b.duration_mins, tp.hourly_rate, tp.slot_duration_mins
     FROM bookings b LEFT JOIN tutor_profiles tp ON tp.user_id = b.tutor_id
     WHERE b.id = $1`,
    [dispute.booking_id]
  );
  if (!rows.length) return inconclusive('Không tìm thấy buổi học liên quan tới báo cáo này.');
  const b = rows[0];
  const durationMins = b.duration_mins || b.slot_duration_mins || 60;
  const expectedFee = b.hourly_rate != null ? Math.round(Number(b.hourly_rate) * (durationMins / 60)) : null;

  return {
    verdict: 'INCONCLUSIVE',
    confidence: 40,
    summary: expectedFee != null
      ? `Học phí đã thu: ${fmtVnd(b.lesson_fee)}. Giá niêm yết hiện tại của gia sư: ${fmtVnd(b.hourly_rate)}/giờ × ${durationMins} phút ≈ ${fmtVnd(expectedFee)}. Lưu ý: giá niêm yết có thể đã đổi kể từ lúc đặt lịch, không dùng để tự kết luận.`
      : `Học phí đã thu: ${fmtVnd(b.lesson_fee)}. Không tìm thấy giá niêm yết hiện tại của gia sư để đối chiếu.`,
    recommendation: 'Cần admin đối chiếu thủ công — không tự động kết luận vì thiếu snapshot giá tại thời điểm đặt lịch.',
    evidence: { lesson_fee: b.lesson_fee, current_hourly_rate: b.hourly_rate, duration_mins: durationMins, expected_fee_at_current_rate: expectedFee },
    autoDismiss: false,
  };
}

// Điều tra 1 dispute theo id, upsert kết quả vào violation_investigations,
// trả về bản ghi đầy đủ (kể cả dispute gốc) cho route gọi tiếp (vd gửi thông báo).
async function investigateViolation(pool, disputeId) {
  const dRes = await pool.query(
    `SELECT id, reason, target_type, booking_id, course_id, tutor_id, raised_by, severity, status, created_at
     FROM disputes WHERE id = $1`,
    [disputeId]
  );
  if (!dRes.rows.length) return null;
  const dispute = dRes.rows[0];

  const caseType = classifyCase(dispute.reason);
  let result;
  if (caseType === 'TUTOR_LATE') result = await investigateTutorLate(pool, dispute);
  else if (caseType === 'TUTOR_NO_SHOW') result = await investigateTutorNoShow(pool, dispute);
  else if (caseType === 'WRONG_FEE') result = await investigateWrongFee(pool, dispute);
  else result = inconclusive('Không nhận diện được loại báo cáo để tự động kiểm tra — cần admin xem thủ công.');

  const investigationStatus = result.autoDismiss ? 'AUTO_DISMISSED' : 'NEEDS_ADMIN';

  await pool.query(
    `INSERT INTO violation_investigations
       (dispute_id, case_type, investigation_status, verdict, confidence, evidence, summary, recommendation, investigated_at)
     VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,NOW())
     ON CONFLICT (dispute_id) DO UPDATE SET
       case_type = EXCLUDED.case_type, investigation_status = EXCLUDED.investigation_status,
       verdict = EXCLUDED.verdict, confidence = EXCLUDED.confidence, evidence = EXCLUDED.evidence,
       summary = EXCLUDED.summary, recommendation = EXCLUDED.recommendation,
       investigated_at = NOW(), updated_at = NOW()`,
    [disputeId, caseType, investigationStatus, result.verdict, result.confidence,
     JSON.stringify(result.evidence || {}), result.summary, result.recommendation]
  );

  return { dispute, caseType, investigationStatus, ...result };
}

module.exports = { investigateViolation, classifyCase };
