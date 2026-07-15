/**
 * config.js — cấu hình dùng chung cho frontend.
 *
 * Nơi DUY NHẤT khai báo API base URL. Trước đây fallback
 * `import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'` bị lặp lại
 * trong ~80 file; đổi backend port/domain phải sửa từng file một.
 *
 * Muốn trỏ frontend sang backend khác: tạo frontend/.env với
 *   VITE_API_BASE_URL=https://your-backend.example.com
 */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
