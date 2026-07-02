const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, 'backend', 'server.js');
let content = fs.readFileSync(serverFile, 'utf8');

const translations = {
  '"No token provided. Please log in."': '"Không có token. Vui lòng đăng nhập."',
  '"Invalid or expired token. Please log in again."': '"Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại."',
  '"Forbidden: admin access only."': '"Từ chối truy cập: chỉ dành cho quản trị viên."',
  '"Forbidden: tutor access only."': '"Từ chối truy cập: chỉ dành cho gia sư."',
  '"Email is required."': '"Email là bắt buộc."',
  '"Server error."': '"Lỗi máy chủ."',
  '"Full name, email and password are required."': '"Họ tên, email và mật khẩu là bắt buộc."',
  '"Password must be at least 8 characters."': '"Mật khẩu phải có ít nhất 8 ký tự."',
  '"Email already registered. Please sign in."': '"Email đã được đăng ký. Vui lòng đăng nhập."',
  '"Server error. Please try again."': '"Lỗi máy chủ. Vui lòng thử lại."',
  '"Email and password are required."': '"Email và mật khẩu là bắt buộc."',
  '"Invalid email or password."': '"Email hoặc mật khẩu không hợp lệ."',
  '"This account uses Google sign-in. Please use Google to log in."': '"Tài khoản này sử dụng đăng nhập Google. Vui lòng sử dụng Google để đăng nhập."',
  '"GOOGLE_CLIENT_ID is not configured on the server."': '"GOOGLE_CLIENT_ID chưa được cấu hình trên máy chủ."',
  '"Missing Google credential."': '"Thiếu thông tin xác thực Google."',
  '"Invalid Google token payload."': '"Dữ liệu token Google không hợp lệ."',
  '"Google authentication failed."': '"Xác thực Google thất bại."',
  '"Availability updated successfully."': '"Cập nhật lịch trống thành công."',
  '"filename is required."': '"Tên file là bắt buộc."',
  '"Profile not found."': '"Không tìm thấy hồ sơ."',
  '"Path is required."': '"Đường dẫn là bắt buộc."',
  '"Failed to generate URL. Check Supabase config."': '"Không thể tạo URL. Kiểm tra cấu hình Supabase."',
  
  // single quotes versions just in case
  "'No token provided. Please log in.'": "'Không có token. Vui lòng đăng nhập.'",
  "'Invalid or expired token. Please log in again.'": "'Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.'",
  "'Forbidden: admin access only.'": "'Từ chối truy cập: chỉ dành cho quản trị viên.'",
  "'Forbidden: tutor access only.'": "'Từ chối truy cập: chỉ dành cho gia sư.'",
  "'Email is required.'": "'Email là bắt buộc.'",
  "'Server error.'": "'Lỗi máy chủ.'",
  "'Full name, email and password are required.'": "'Họ tên, email và mật khẩu là bắt buộc.'",
  "'Password must be at least 8 characters.'": "'Mật khẩu phải có ít nhất 8 ký tự.'",
  "'Email already registered. Please sign in.'": "'Email đã được đăng ký. Vui lòng đăng nhập.'",
  "'Server error. Please try again.'": "'Lỗi máy chủ. Vui lòng thử lại.'",
  "'Email and password are required.'": "'Email và mật khẩu là bắt buộc.'",
  "'Invalid email or password.'": "'Email hoặc mật khẩu không hợp lệ.'",
  "'This account uses Google sign-in. Please use Google to log in.'": "'Tài khoản này sử dụng đăng nhập Google. Vui lòng sử dụng Google để đăng nhập.'",
  "'GOOGLE_CLIENT_ID is not configured on the server.'": "'GOOGLE_CLIENT_ID chưa được cấu hình trên máy chủ.'",
  "'Missing Google credential.'": "'Thiếu thông tin xác thực Google.'",
  "'Invalid Google token payload.'": "'Dữ liệu token Google không hợp lệ.'",
  "'Google authentication failed.'": "'Xác thực Google thất bại.'",
  "'Availability updated successfully.'": "'Cập nhật lịch trống thành công.'",
  "'filename is required.'": "'Tên file là bắt buộc.'",
  "'Profile not found.'": "'Không tìm thấy hồ sơ.'",
  "'Path is required.'": "'Đường dẫn là bắt buộc.'",
  "'Failed to generate URL. Check Supabase config.'": "'Không thể tạo URL. Kiểm tra cấu hình Supabase.'"
};

for (const [eng, vie] of Object.entries(translations)) {
  content = content.split(eng).join(vie);
}

// Fixing any existing encoding issues (mojibake)
const encodingFixes = {
  "Nß║┐u email tß╗ôn tß║íi, OTP ─æ├ú ─æ╞░ß╗úc gß╗¡i.": "Nếu email tồn tại, OTP đã được gửi.",
  "OTP ─æ├ú ─æ╞░ß╗úc gß╗¡i ─æß║┐n email cß╗ºa bß║ín.": "OTP đã được gửi đến email của bạn.",
  "Thiß║┐u th├┤ng tin y├¬u cß║ºu.": "Thiếu thông tin yêu cầu.",
  "Mß║¡t khß║⌐u phß║úi d├ái ├¡t nhß║Ñt 8 k├╜ tß╗▒.": "Mật khẩu phải dài ít nhất 8 ký tự.",
  "OTP kh├┤ng hß╗úp lß╗ç hoß║╖c ─æ├ú hß║┐t hß║ín.": "OTP không hợp lệ hoặc đã hết hạn.",
  "M├ú OTP kh├┤ng ch├¡nh x├íc.": "Mã OTP không chính xác.",
  "M├ú OTP ─æ├ú hß║┐t hß║ín. Vui l├▓ng y├¬u cß║ºu lß║íi.": "Mã OTP đã hết hạn. Vui lòng yêu cầu lại.",
  "─Éß║╖t lß║íi mß║¡t khß║⌐u th├ánh c├┤ng!": "Đặt lại mật khẩu thành công!"
};

for (const [bad, good] of Object.entries(encodingFixes)) {
  content = content.split(bad).join(good);
}

fs.writeFileSync(serverFile, content, 'utf8');
console.log('Backend translation and encoding fix applied.');
