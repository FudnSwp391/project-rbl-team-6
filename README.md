[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/xkISN4OG)

# EduX — Nền tảng kết nối Gia sư & Học sinh

**EduX** là marketplace gia sư dành cho học sinh Việt Nam (Tiểu học → THPT): tìm và đặt lịch gia sư, học theo khóa, luyện đề với AI, thanh toán qua ví điện tử với cơ chế **escrow** bảo vệ cả hai phía.

> Đồ án môn SWP391 — Team 6.

## Tính năng theo vai trò

| Vai trò | Nghiệp vụ chính |
|---|---|
| 🎓 **Học sinh** | Tìm/đặt lịch gia sư (buổi lẻ & gói), Học Ngay (instant booking), nạp ví qua VNPay, mua khóa học, quiz/luyện đề/đề thi thử có AI sinh đề & chấm tự luận, khiếu nại kèm minh chứng, chat, thông báo |
| 👨‍🏫 **Gia sư** | Hồ sơ chờ duyệt (KYC), quản lý lịch dạy, điểm danh (tự động giải ngân học phí), giao & chấm bài tập, quản lý khóa học, thống kê thu nhập, rút tiền (state machine PENDING → APPROVED → PAID) |
| 👪 **Phụ huynh** | Liên kết con qua mã 8 ký tự hoặc tạo tài khoản con, theo dõi tiến độ học/lịch học, xin nghỉ hộ, xem hóa đơn, đánh giá gia sư, báo cáo sự cố |
| 🛡️ **Admin** | Duyệt gia sư, quản lý user, xử lý khiếu nại/hoàn tiền (một phần hoặc toàn bộ), duyệt lệnh rút tiền, đối soát hoa hồng, audit log, và bộ công cụ AI: Copilot, Semantic Moderation, Fraud Intel, Analytics |

## Điểm nhấn nghiệp vụ tiền

- **Escrow**: tiền học phí bị giữ khi đặt lịch, chỉ giải ngân khi gia sư điểm danh `present` (hoặc cron auto-release).
- **Chính sách điểm danh** (ATTENDANCE_SETTLEMENT_V1 — chống động cơ ngược, tiền chỉ đi khi có bằng chứng):
  - Nghỉ **có phép** (`excused`) → hoàn 100% cho học sinh (gia sư tự nguyện bỏ thù lao nên không cần guard).
  - Học sinh **vắng không phép** (`absent`) → gia sư nhận 90% bồi hoàn (như iTalki/Wyzant), **nhưng chỉ khi**: đã qua giờ bắt đầu ≥15 phút **và** gia sư đã check-in buổi học (bằng chứng có mặt, cửa sổ check-in được kiểm tra server-side). Thiếu check-in → hoàn học sinh.
  - Học sinh/phụ huynh được thông báo và có **48h khiếu nại** (dispute) để lật lại quyết định sai; hủy TRƯỚC buổi học đi theo bậc thang giờ báo trước (REFUND_POLICY_V2_1).
- **Cọc ảo**: 2 buổi dạy đầu của gia sư mới, tiền vào `held_balance` (chưa rút được) — chống lừa đảo.
- **Sổ cái (wallet ledger)** + **commission log** append-only: mọi biến động ví đều có `reason_code` truy vết được.
- **Hoàn tiền theo chính sách** (REFUND_POLICY_V2_1): khóa học theo % tiến độ trong 48h; buổi học theo số giờ báo trước. Logic thuần nằm ở `backend/utils/businessRules.js` và có unit test.
- **VNPay** (sandbox): xác nhận nạp tiền qua **IPN** có verify chữ ký HMAC-SHA512, idempotent.

## Tech stack

- **Frontend**: React 19 + Vite, hash-based routing, Tailwind (CDN), `@react-oauth/google`
- **Backend**: Node.js + Express 5, PostgreSQL (Supabase), JWT, Nodemailer, Multer
- **AI**: Google Gemini (chính) + Groq (fallback) — sinh đề, chấm tự luận, gợi ý gia sư, moderation/copilot cho admin
- **Test**: `node:test` built-in (backend unit tests cho business rules)

## Cấu trúc thư mục

```
├── backend/
│   ├── server.js            # Express app + toàn bộ route chính
│   ├── db.js                # pg Pool (Supabase, SSL)
│   ├── gemini.js            # tích hợp AI (Gemini → Groq fallback)
│   ├── middleware/auth.js   # requireAuth, requireClassMember
│   ├── routes/              # các route module (classes, wallet, schedule…)
│   ├── services/            # learningPath, storage
│   ├── utils/businessRules.js  # hàm nghiệp vụ thuần (có unit test)
│   ├── tests/               # unit tests (npm test)
│   ├── migrations/          # toàn bộ SQL schema/migration (xem README trong đó)
│   ├── scripts/             # run-sql.js, demo-data.js, script setup
│   ├── schemas/ seeds/      # schema chi tiết + seed mẫu cho course detail
│   └── .env.example         # mẫu biến môi trường backend
├── frontend/
│   ├── src/
│   │   ├── config.js        # API_BASE_URL — nơi duy nhất khai báo base URL
│   │   ├── App.jsx          # shell + hash routing
│   │   ├── pages/ components/ services/ constants/
│   │   └── admin/           # màn hình admin (AI tools, transactions…)
│   └── .env.example         # mẫu biến môi trường frontend
└── docs/                    # runbook demo, AI readiness
```

## Chạy dự án

### Yêu cầu

- Node.js 18+ (khuyến nghị 20+), npm
- PostgreSQL (team đang dùng Supabase)

### 1. Cài đặt

```bash
git clone https://github.com/FudnSwp391/project-rbl-team-6.git
cd project-rbl-team-6
npm run install:all        # cài dependencies cho cả backend lẫn frontend
```

### 2. Biến môi trường

```bash
# Backend (bắt buộc): copy và điền DATABASE_URL, JWT_SECRET…
cp backend/.env.example backend/.env

# Frontend (tùy chọn — mặc định trỏ localhost:5000):
cp frontend/.env.example frontend/.env
```

### 3. Database (chỉ khi dựng DB mới)

```bash
cd backend
node scripts/run-sql.js migrations/schema.sql
# ... chạy tiếp các migration theo thứ tự trong backend/migrations/README.md
```

> DB team đã có sẵn schema thì bỏ qua bước này. `server.js` khi khởi động cũng
> tự đảm bảo (idempotent) một phần schema như lưới an toàn.

### 4. Chạy dev

```bash
# Từ thư mục gốc — chạy cả backend (5000) + frontend (5173) cùng lúc:
npm run dev

# Hoặc chạy riêng:
cd backend  && npm run dev     # http://localhost:5000
cd frontend && npm run dev     # http://localhost:5173
```

### 5. Test & build

```bash
cd backend  && npm test        # unit tests business rules (node:test)
cd frontend && npm run build   # build production
```

### Demo data (tùy chọn)

```bash
cd backend
npm run demo:seed:dry     # xem trước dữ liệu demo sẽ tạo
npm run demo:seed         # tạo dữ liệu demo
npm run demo:cleanup      # dọn dữ liệu demo
```

Chi tiết quy trình demo: [docs/FINAL_DEMO_RUNBOOK.md](docs/FINAL_DEMO_RUNBOOK.md).

## Quy ước làm việc

- Mỗi thành viên làm trên branch riêng → mở Pull Request vào `main`.
- **Không commit** `.env`, `node_modules/`, file backup — đã có trong `.gitignore`.
- CI (GitHub Actions) chạy trên mọi PR: syntax check + unit test backend, build frontend.

## Thành viên — Team 6

| Git handle | Họ tên | Vai trò / phần phụ trách |
|---|---|---|
| Linhle | _(điền)_ | _(điền)_ |
| Khanh Trinh | Trịnh Nhật Khánh | _(điền)_ |
| vantan123abc-wq | _(điền)_ | _(điền)_ |
| Phan Thanh Trieu | _(điền)_ | _(điền)_ |
| nvankien2k5 | _(điền)_ | _(điền)_ |

> ⚠️ Điền họ tên + phần phụ trách của từng thành viên trước khi nộp bài.
