/**
 * RelatedDataTab.jsx — Task 2B.2
 * Displays aggregated relational context for a violation (Task 2B.1 payload).
 * Renders cards for Booking/Course context and Tutor/Student snapshots.
 * Read-only view. No mutation logic.
 */
import React from 'react';

// Formatter for currency
const formatVND = (value) => {
  if (value == null) return '—';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

// Formatter for date/time
const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(dateStr));
};

// Formatter for simple date
const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  }).format(new Date(dateStr));
};

// Reusable card container
function InfoCard({ title, icon, children }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
      overflow: 'hidden', marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
    }}>
      <div style={{
        background: '#f8fafc', padding: '12px 16px', borderBottom: '1px solid #e2e8f0',
        display: 'flex', alignItems: 'center', gap: 8
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#64748b' }}>{icon}</span>
        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{title}</h4>
      </div>
      <div style={{ padding: '16px' }}>
        {children}
      </div>
    </div>
  );
}

// Reusable row for key-value data
function DataRow({ label, value, highlight = false }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed #f1f5f9' }}>
      <span style={{ fontSize: 13, color: '#64748b' }}>{label}</span>
      <span style={{ fontSize: 13, color: highlight ? '#0f172a' : '#334155', fontWeight: highlight ? 600 : 400, textAlign: 'right' }}>
        {value || '—'}
      </span>
    </div>
  );
}

export default function RelatedDataTab({ violation }) {
  const { booking_snapshot, course_snapshot, tutor_snapshot, student_snapshot } = violation;

  return (
    <div style={{ padding: '20px 24px' }}>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
        Dữ liệu liên quan được chụp tại thời điểm hiện tại để hỗ trợ điều tra. 
        Nếu người dùng thay đổi hồ sơ hoặc trạng thái đặt lịch, dữ liệu dưới đây sẽ phản ánh trạng thái mới nhất.
      </p>

      {/* Target Context: Booking or Course */}
      {violation.target_type === 'booking' && booking_snapshot && (
        <InfoCard title="Chi Tiết Lịch Học (Booking)" icon="event_available">
          <DataRow label="Mã đặt lịch" value={<code style={{ fontSize: 12 }}>{booking_snapshot.id.substring(0, 8)}...</code>} />
          <DataRow label="Môn học" value={booking_snapshot.subject} highlight />
          <DataRow label="Ngày học" value={formatDate(booking_snapshot.lesson_date)} />
          <DataRow label="Khung giờ" value={booking_snapshot.time_slot} />
          <DataRow label="Trạng thái" value={booking_snapshot.status} highlight />
          <DataRow label="Học phí" value={formatVND(booking_snapshot.lesson_fee)} />
          <DataRow label="Ngày tạo" value={formatDateTime(booking_snapshot.created_at)} />
        </InfoCard>
      )}

      {violation.target_type === 'course' && course_snapshot && (
        <InfoCard title="Chi Tiết Khóa Học" icon="menu_book">
          <DataRow label="Mã khóa học" value={<code style={{ fontSize: 12 }}>{course_snapshot.id.substring(0, 8)}...</code>} />
          <DataRow label="Tên khóa học" value={course_snapshot.title} highlight />
          <DataRow label="Giá tiền" value={formatVND(course_snapshot.price)} />
          <DataRow label="Ngày tạo" value={formatDateTime(course_snapshot.created_at)} />
        </InfoCard>
      )}

      {/* Accused Profile (Tutor) */}
      {tutor_snapshot && (
        <InfoCard title="Hồ Sơ Gia Sư (Bị Tố Cáo)" icon="person">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <DataRow label="Châm ngôn (Headline)" value={tutor_snapshot.headline} />
            </div>
            <DataRow label="Đánh giá trung bình" value={`${Number(tutor_snapshot.avg_rating).toFixed(1)} ⭐`} highlight />
            <DataRow label="Số lượt đánh giá" value={tutor_snapshot.review_count} />
            <DataRow label="Điểm uy tín" value={`${tutor_snapshot.reputation_score} / 100`} highlight />
            <DataRow label="Số buổi hoàn thành" value={tutor_snapshot.completed_lessons_count} />
            <DataRow label="Học phí / giờ" value={formatVND(tutor_snapshot.hourly_rate)} />
          </div>
        </InfoCard>
      )}

      {/* Reporter Profile (Student) */}
      {student_snapshot && (
        <InfoCard title="Hồ Sơ Học Sinh (Người Tố Cáo)" icon="school">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <DataRow label="Tổng số lịch đặt" value={student_snapshot.total_bookings} highlight />
            <DataRow label="Số điện thoại" value={student_snapshot.phone} />
            <DataRow label="Thành phố" value={student_snapshot.city} />
            <DataRow label="Trạng thái cấm" value={student_snapshot.is_banned ? 'Đã bị cấm' : 'Hoạt động'} highlight={student_snapshot.is_banned} />
          </div>
        </InfoCard>
      )}

      {/* Empty States */}
      {!booking_snapshot && !course_snapshot && !tutor_snapshot && !student_snapshot && (
        <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: 10, border: '1px dashed #cbd5e1' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 32, marginBottom: 8 }}>link_off</span>
          <p style={{ margin: 0, fontSize: 13 }}>Không có dữ liệu liên quan được đính kèm.</p>
        </div>
      )}
    </div>
  );
}
