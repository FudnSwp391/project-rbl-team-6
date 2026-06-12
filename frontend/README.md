# Frontend — project-rbl-team-6

Ứng dụng web kết nối học sinh với gia sư, hỗ trợ quản lý khoá học và gợi ý gia sư bằng AI.

---

## Tech Stack

| Tầng | Công nghệ |
|------|-----------|
| Framework | React 19 + Hooks |
| Build Tool | Vite 8 |
| Routing | Custom hash-based (không dùng React Router) |
| State | Context API + useState |
| HTTP | Fetch API thuần |
| Auth | JWT (localStorage) + Google OAuth |
| Styling | Tailwind CSS (CDN) + Custom CSS |
| Icons | Material Symbols Outlined (Google) |
| AI | Gemini (qua backend proxy) |

---

## Cài đặt & Chạy

```bash
npm install
npm run dev
```

Tạo file `.env` tại thư mục gốc:

```env
VITE_API_BASE_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

---

## Cấu trúc thư mục

```
frontend/
├── index.html              # HTML entry, nhúng Tailwind CSS & Material Icons CDN
├── vite.config.js
├── .env
└── src/
    ├── main.jsx            # Entry point — bọc GoogleOAuthProvider + AuthProvider
    ├── App.jsx             # Router thủ công + HomePage (539 dòng)
    ├── AuthContext.jsx     # Global auth state (user, token, login, logout)
    ├── geminiClient.js     # Fetch wrapper gọi /api/ask-ai
    │
    ├── SignIn.jsx
    ├── SignUp.jsx
    ├── AdminDashboard.jsx
    ├── StudentDashboard.jsx
    ├── TutorDashboard.jsx
    ├── ParentDashboard.jsx
    ├── TutorsPage.jsx
    ├── TutorDetailPage.jsx
    ├── CoursesPage.jsx
    ├── CourseDetailPage.jsx
    ├── AISuggestPage.jsx
    │
    ├── App.css             # Style trang home & auth (~751 dòng)
    ├── pages.css           # Style tất cả dashboard & listing (~2490 dòng)
    ├── index.css           # Global CSS, font imports, CSS variables
    └── assets/             # Ảnh & SVG
```

> **Pattern:** Flat/monolithic — mỗi trang là một file `.jsx` độc lập, không có thư mục `/components`, `/services`, hay `/hooks`.

---

## Kiến trúc hệ thống

### Tổng quan

```
┌─────────────────────────────────────────────────────┐
│                     main.jsx                        │
│  GoogleOAuthProvider                                │
│    └── AuthProvider (AuthContext)                   │
│           └── App (Router + Pages)                  │
└─────────────────────────────────────────────────────┘
```

### Routing

Không dùng React Router. Routing được xử lý thủ công bằng `window.location.hash` và sự kiện `hashchange` trong `App.jsx`.

| Route | Component | Bảo vệ |
|-------|-----------|--------|
| `#/` | HomePage | Công khai |
| `#/signin` | SignIn | Công khai |
| `#/signup` | SignUp | Công khai |
| `#/dashboard` | StudentDashboard | Đăng nhập |
| `#/admin` | AdminDashboard | Role: admin |
| `#/tutor` | TutorDashboard | Đăng nhập |
| `#/parent` | ParentDashboard | Đăng nhập |
| `#/tutors` | TutorsPage | Công khai |
| `#/tutors/:id` | TutorDetailPage | Công khai |
| `#/courses` | CoursesPage | Công khai |
| `#/courses/:id` | CourseDetailPage | Công khai |
| `#/ai-suggest` | AISuggestPage | Đăng nhập |

**Route guard:**
```jsx
if (route === 'admin') {
  if (!user) return <AccessDenied isLoggedIn={false} />
  if (user.role !== 'admin') return <AccessDenied isLoggedIn={true} />
  return <AdminDashboard />
}
```

---

### State Management

Chỉ dùng **Context API + useState**, không có Redux hay Zustand.

**Global state (`AuthContext.jsx`):**
```js
{
  user: { id, name, email, role, picture? },
  token: string,             // JWT
  login(token, user),        // lưu vào localStorage + redirect
  logout(),                  // xoá localStorage + redirect về #/
  updateUser(partial)        // merge thay đổi vào user
}
```

**Local state:** Mỗi page component tự quản lý bằng `useState` (loading, error, form data, modal, v.v.)

**Persistence:**
- `localStorage.setItem('token', ...)` và `localStorage.setItem('user', ...)`
- AuthContext tự khôi phục từ localStorage khi app khởi động

---

### Auth Flow

```
Email/Password Login          Google OAuth
       ↓                            ↓
POST /api/auth/login        POST /api/auth/google
       ↓                            ↓
    { token, user }             { token, user }
       └──────────────┬───────────────┘
                      ↓
              login(token, user)
                      ↓
              localStorage ← JWT + user JSON
                      ↓
        Redirect theo role:
          admin  → #/admin
          tutor  → #/tutor
          parent → #/parent
          khác   → #/dashboard
```

**User object:**
```js
{
  id: string,
  name: string,
  email: string,
  role: 'admin' | 'student' | 'tutor' | 'parent',
  picture?: string  // Google avatar URL
}
```

---

### API Layer

Không có HTTP client tập trung. Mỗi component tự gọi `fetch()` trực tiếp.

**Base URL:** `import.meta.env.VITE_API_BASE_URL` (mặc định `http://localhost:5000`)

**Auth header:** `Authorization: Bearer ${token}`

**Các endpoint đang dùng:**

| Endpoint | Method | Mô tả | File |
|----------|--------|-------|------|
| `/api/auth/login` | POST | Đăng nhập email/password | SignIn.jsx |
| `/api/auth/register` | POST | Đăng ký tài khoản | SignUp.jsx |
| `/api/auth/google` | POST | Đăng nhập Google OAuth | SignIn.jsx |
| `/api/admin/tutors/stats` | GET | Thống kê gia sư | AdminDashboard.jsx |
| `/api/admin/tutors/pending` | GET | Danh sách chờ duyệt | AdminDashboard.jsx |
| `/api/admin/tutors/:id/approve` | PATCH | Duyệt gia sư | AdminDashboard.jsx |
| `/api/admin/tutors/:id/reject` | PATCH | Từ chối gia sư | AdminDashboard.jsx |
| `/api/ask-ai` | POST | Gợi ý gia sư bằng Gemini AI | geminiClient.js |

**Helper function dùng chung trong AdminDashboard:**
```js
async function authFetch(url, token, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`)
  return data
}
```

---

### AI Integration

- **Không** gọi Gemini API trực tiếp từ frontend
- Frontend gửi message + danh sách gia sư → `POST /api/ask-ai` (backend proxy)
- Backend xử lý API key và gọi Gemini
- Chat history được persist trong `localStorage`

---

### Styling

**Hybrid approach:**
- **Tailwind CSS** (CDN) — utility classes (`className="flex gap-4 rounded-lg"`)
- **Custom CSS** — block styles lớn hơn trong `App.css` và `pages.css`
- **CSS variables** — theming (`--primary: #00288e`, v.v.) trong `index.css`

---

## Điểm cần cải thiện khi scale

| Vấn đề | Gợi ý |
|--------|-------|
| Không có `/components` | Tách UI tái sử dụng (Button, Modal, Table, ...) |
| API calls rải rác | Tạo `/services/api.js` tập trung |
| Mock data cứng | Kết nối TutorsPage, StudentDashboard với real API |
| `pages.css` quá lớn (2490 dòng) | Tách CSS theo từng page hoặc dùng CSS Modules |
| Không có TypeScript | Thêm TS để giảm runtime error |
| Không có React Router | Chuyển sang React Router v6 để hỗ trợ SSR/SEO |
