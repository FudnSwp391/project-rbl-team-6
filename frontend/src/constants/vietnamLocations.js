// Danh sách Tỉnh/Thành phố và Quận/Huyện Việt Nam — dùng cho chọn địa điểm học Offline.
// Chỉ liệt kê các tỉnh/thành có nhu cầu gia sư cao; các nơi khác dùng mục "Tỉnh/Thành khác"
// để học sinh tự nhập, tránh danh sách quá dài mà vẫn không bỏ sót ai.

export const VN_LOCATIONS = {
  'TP. Hồ Chí Minh': [
    'Quận 1', 'Quận 3', 'Quận 4', 'Quận 5', 'Quận 6', 'Quận 7', 'Quận 8',
    'Quận 10', 'Quận 11', 'Quận 12', 'Quận Bình Thạnh', 'Quận Gò Vấp',
    'Quận Phú Nhuận', 'Quận Tân Bình', 'Quận Tân Phú', 'Quận Bình Tân',
    'TP. Thủ Đức', 'Huyện Bình Chánh', 'Huyện Hóc Môn', 'Huyện Củ Chi',
    'Huyện Nhà Bè', 'Huyện Cần Giờ',
  ],
  'Hà Nội': [
    'Quận Ba Đình', 'Quận Hoàn Kiếm', 'Quận Hai Bà Trưng', 'Quận Đống Đa',
    'Quận Tây Hồ', 'Quận Cầu Giấy', 'Quận Thanh Xuân', 'Quận Hoàng Mai',
    'Quận Long Biên', 'Quận Nam Từ Liêm', 'Quận Bắc Từ Liêm', 'Quận Hà Đông',
    'Thị xã Sơn Tây', 'Huyện Gia Lâm', 'Huyện Đông Anh', 'Huyện Thanh Trì',
    'Huyện Hoài Đức', 'Huyện Chương Mỹ', 'Huyện Thạch Thất',
  ],
  'Đà Nẵng': [
    'Quận Hải Châu', 'Quận Thanh Khê', 'Quận Sơn Trà', 'Quận Ngũ Hành Sơn',
    'Quận Liên Chiểu', 'Quận Cẩm Lệ', 'Huyện Hòa Vang',
  ],
  'Hải Phòng': [
    'Quận Hồng Bàng', 'Quận Ngô Quyền', 'Quận Lê Chân', 'Quận Hải An',
    'Quận Kiến An', 'Quận Đồ Sơn', 'Quận Dương Kinh', 'Huyện Thủy Nguyên',
    'Huyện An Dương', 'Huyện An Lão',
  ],
  'Cần Thơ': [
    'Quận Ninh Kiều', 'Quận Bình Thủy', 'Quận Cái Răng', 'Quận Ô Môn',
    'Quận Thốt Nốt', 'Huyện Phong Điền', 'Huyện Cờ Đỏ',
  ],
  'Bình Dương': [
    'TP. Thủ Dầu Một', 'TP. Dĩ An', 'TP. Thuận An', 'TX. Bến Cát',
    'TX. Tân Uyên', 'Huyện Bàu Bàng', 'Huyện Phú Giáo', 'Huyện Dầu Tiếng',
  ],
  'Đồng Nai': [
    'TP. Biên Hòa', 'TP. Long Khánh', 'Huyện Trảng Bom', 'Huyện Long Thành',
    'Huyện Nhơn Trạch', 'Huyện Vĩnh Cửu', 'Huyện Thống Nhất',
  ],
  'Khánh Hòa': [
    'TP. Nha Trang', 'TP. Cam Ranh', 'TX. Ninh Hòa', 'Huyện Diên Khánh',
    'Huyện Vạn Ninh', 'Huyện Cam Lâm',
  ],
  'Huế': [
    'TP. Huế', 'TX. Hương Thủy', 'TX. Hương Trà', 'Huyện Phú Vang',
    'Huyện Phong Điền', 'Huyện Quảng Điền',
  ],
  'Nghệ An': [
    'TP. Vinh', 'TX. Cửa Lò', 'TX. Thái Hòa', 'Huyện Nghi Lộc',
    'Huyện Hưng Nguyên', 'Huyện Diễn Châu',
  ],
  'Tỉnh/Thành khác': [],   // để trống → học sinh tự nhập khu vực
};

export const VN_PROVINCES = Object.keys(VN_LOCATIONS);

// Tìm tỉnh/thành khớp với chuỗi tự do (dữ liệu city của gia sư ghi nhiều kiểu:
// "TP.HCM", "Hồ Chí Minh", "HCM"...) để gợi ý sẵn khu vực gia sư đang dạy.
export function matchProvince(raw) {
  const s = String(raw || '').toLowerCase().trim();
  if (!s) return '';
  if (/h(ồ|o) ch(í|i) minh|hcm|sài gòn|saigon|tphcm/.test(s)) return 'TP. Hồ Chí Minh';
  if (/hà n(ộ|o)i|ha noi|hanoi/.test(s)) return 'Hà Nội';
  if (/đà n(ẵ|a)ng|da nang|danang/.test(s)) return 'Đà Nẵng';
  if (/h(ả|a)i ph(ò|o)ng/.test(s)) return 'Hải Phòng';
  if (/c(ầ|a)n th(ơ|o)/.test(s)) return 'Cần Thơ';
  if (/b(ì|i)nh d(ươ|uo)ng/.test(s)) return 'Bình Dương';
  if (/đ(ồ|o)ng nai/.test(s)) return 'Đồng Nai';
  if (/kh(á|a)nh h(ò|o)a|nha trang/.test(s)) return 'Khánh Hòa';
  if (/hu(ế|e)|th(ừ|u)a thi(ê|e)n/.test(s)) return 'Huế';
  if (/ngh(ệ|e) an|vinh/.test(s)) return 'Nghệ An';
  return VN_PROVINCES.find(p => p.toLowerCase() === s) || '';
}
