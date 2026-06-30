const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'frontend/src/TutorDashboard.jsx');
let content = fs.readFileSync(file, 'utf8');

const replacements = {
  "'Overview'": "'Tổng quan'",
  "'My Schedule'": "'Lịch trình'",
  "'Students'": "'Học viên'",
  "'Courses'": "'Khóa học'",
  "'Assessments'": "'Bài kiểm tra'",
  "'Review & Grade'": "'Chấm điểm & Nhận xét'",
  "'Earnings'": "'Thu nhập'",
  "'Messages'": "'Tin nhắn'",
  "'My Profile'": "'Hồ sơ'",
  "Tutor Portal": "Cổng Gia Sư",
  "Settings": "Cài đặt",
  "Logout": "Đăng xuất"
};

for (const [eng, vie] of Object.entries(replacements)) {
  content = content.split(eng).join(vie);
}

fs.writeFileSync(file, content, 'utf8');
console.log('TutorDashboard translation applied.');
