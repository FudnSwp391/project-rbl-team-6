// Hình thức dạy (online/offline) — chuẩn hóa từ tutor_profiles.teaching_methods
// (JSONB mảng text tự do, có thể là 'online', 'Trực tuyến', 'Tại nhà'...)

export function methodSupport(methods) {
  const txt = (Array.isArray(methods) ? methods : []).join(' ').toLowerCase();
  const online  = /online|trực tuyến|truc tuyen/.test(txt);
  const offline = /offline|trực tiếp|truc tiep|tại nhà|tai nha|tại địa điểm/.test(txt);
  // Gia sư chưa khai báo → coi như dạy cả 2 (không chặn đặt lịch)
  if (!online && !offline) return { online: true, offline: true, declared: false };
  return { online, offline, declared: true };
}

export function methodLabel(method) {
  if (method === 'online') return 'Online';
  if (method === 'offline') return 'Offline (trực tiếp)';
  return '';
}

export const METHOD_OPTIONS = [
  { value: 'online',  icon: 'videocam',    label: 'Online',  hint: 'Gia sư sẽ gửi link Meet/Zoom trước giờ học' },
  { value: 'offline', icon: 'location_on', label: 'Offline', hint: 'Địa điểm học trao đổi qua ghi chú hoặc tin nhắn' },
];
