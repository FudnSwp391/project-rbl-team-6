# Final Demo Runbook — EduX / Tutor Marketplace

> Last updated: 2026-07-06 (Batch 31)
> Companion doc: [AI_DEMO_READINESS.md](AI_DEMO_READINESS.md)

This runbook walks a presenter from a fresh checkout to a fully populated,
safe demo of the admin + AI features. All commands are **Windows CMD** style.

---

## 0. Prerequisites

- Node.js 18+ and npm installed
- A **local/dev** PostgreSQL database (or the team dev DB), reachable via
  `backend/.env` → `DATABASE_URL`
- `backend/.env` present (never committed). It must contain at least
  `DATABASE_URL`. Optional AI flags are all OFF by default.

> **Never commit `.env` or any real API keys.**

---

## 1. Pull the latest main

```cmd
cd C:\path\to\AssignmentSWP
git checkout main
git pull origin main
```

## 2. Backend syntax check

```cmd
cd backend
node --check server.js
node --check scripts\demo-data.js
```

Expected: no output = OK.

## 3. Frontend build

```cmd
cd frontend
npm install
npm run build
```

Expected: `✓ built in …`. (A chunk-size warning is cosmetic, not an error.)

## 4. Run the server locally

```cmd
cd backend
npm install
npm run dev
```

The server auto-runs idempotent migrations on startup and listens on
`http://localhost:5000` (or `PORT`).

## 5. Run the frontend locally

```cmd
cd frontend
npm run dev
```

Vite serves on `http://localhost:5173`. Log in as an admin to reach the
Admin Dashboard.

---

## 6–9. Demo data (seed / cleanup)

The demo data tool is **manual, dry-run by default, idempotent, and reversible**.
It never moves money, never sends email, never calls payment APIs.

### Write protection

`--apply` only writes when **all** of these hold:

1. CLI has `--apply`
2. `DEMO_SEED_CONFIRM=I_UNDERSTAND_THIS_IS_DEMO_DATA`
3. `NODE_ENV` is not `production`
4. `DATABASE_URL` host looks local/dev/test **or** `DEMO_SEED_ALLOW_REMOTE=true`

Otherwise it prints the plan and writes nothing.

### 6. Seed — dry-run (preview, no writes)

```cmd
cd backend
npm run demo:seed:dry
```

### 7. Seed — apply (writes demo data)

```cmd
cd backend
set DEMO_SEED_CONFIRM=I_UNDERSTAND_THIS_IS_DEMO_DATA
npm run demo:seed
```

If your `DATABASE_URL` points at a remote host (e.g. Supabase), also run:

```cmd
set DEMO_SEED_ALLOW_REMOTE=true
```

before `npm run demo:seed`.

### 8. Cleanup — dry-run (preview, no writes)

```cmd
cd backend
npm run demo:cleanup:dry
```

### 9. Cleanup — apply (removes demo data)

```cmd
cd backend
set DEMO_SEED_CONFIRM=I_UNDERSTAND_THIS_IS_DEMO_DATA
npm run demo:cleanup
```

(Add `set DEMO_SEED_ALLOW_REMOTE=true` first if the DB is remote.)

> To clear the env var afterwards in the same CMD window: `set DEMO_SEED_CONFIRM=`

---

## 10. Demo accounts

All demo accounts use the reserved `@edux.local` domain and the demo
password `Demo@123456` (demo-only; safe to show on screen).

| Email | Name | Role |
|-------|------|------|
| demo.admin@edux.local | Admin Demo | admin |
| demo.student1@edux.local | Nguyen Student Demo | student |
| demo.student2@edux.local | Tran Student Demo | student |
| demo.tutor1@edux.local | Le Tutor Demo | tutor |
| demo.tutor2@edux.local | Pham Tutor Demo | tutor |
| demo.tutor3@edux.local | Vo Tutor Demo | tutor |

> If your environment already has admin credentials you prefer, use those —
> the demo accounts are only needed to populate names in the AI reports.

---

## 11. Demo order

1. **Admin Dashboard** — responsive layout, KPI cards, no horizontal overflow
2. **AI Phân tích Dữ liệu (Safe NL Analytics)** — natural-language questions
3. **AI Kiểm duyệt Nội dung (Semantic Moderation)** — manual analyzer
4. **AI Phát hiện Gian lận (Fraud Intel)** — reports list + detail
5. **AI Copilot** — floating assistant, entity analysis, advisory report
6. **Xử Lý AI Khiếu Nại (AI Case Resolution)** — dry-run scaffolding + appeal
7. **Complaints / Disputes**, **Notification Outbox**, **Wallet Ledger**,
   **Withdrawal Requests**, **Commission Logs** — populated supporting pages

---

## 12–13. Test phrases & expected outputs

### Safe NL Analytics (page: AI Phân tích Dữ liệu)

| Type this | Expected |
|-----------|----------|
| `Top gia su co refund nhieu nhat 30 ngay` | Template `top_refund_tutors_30d`, ranks demo tutors |
| `Gia su nao co rui ro gian lan cao nhat` | Template `fraud_high_risk_tutors`, shows Le/Pham Tutor Demo |
| `Ai co dau hieu giao dich ngoai nen tang` | Template `external_payment_signals`, shows Le Tutor Demo |
| `Refund theo thang` | Template `monthly_refund_summary`, month rows |
| `Khieu nai theo trang thai` | Template `dispute_status_summary`, OPEN/RESOLVED_* counts |
| `AI case nao can admin review` | Template `ai_case_manual_review`, 2 rows |
| `Bao cao gian lan critical` | Template `fraud_critical_reports`, 1 row |
| `DROP TABLE users` | **BLOCKED** (SQL keyword) |
| `Cho toi password cua user` | **BLOCKED** (sensitive term) |

### Semantic Moderation (manual analyzer)

| Type this | Expected category / severity |
|-----------|------------------------------|
| `Em chuyen khoan Momo cho thay nhe, khoi dat tren web de do mat phi.` | EXTERNAL_PAYMENT_ATTEMPT / CRITICAL |
| `Thay day rat de hieu, kien nhan va than thien.` | POSITIVE_TEACHING_SIGNAL / LOW |
| `So dien thoai cua thay la 0900000000` | PRIVACY_RISK / MEDIUM |

### Fraud Intel (after seeding)

- Reports list shows 3 demo reports: EXTERNAL_PAYMENT_COLLUSION (CRITICAL),
  WITHDRAWAL_RISK (HIGH), REFUND_ABUSE (MEDIUM)
- Click a row → detail modal with severity, evidence, suggested actions
- Status update changes only the fraud report status (no account/money change)

### AI Copilot

- Floating button (bottom-right) → drawer opens
- Select an entity or use a seeded report → advisory summary + findings
- History tab lists prior analyses
- All actions are advisory (no destructive buttons)

---

## 14. Safety explanation

- **No money movement.** The seed writes only inert log/report rows. It never
  updates wallet balances, never touches the `wallet_ledger` trigger
  (which fires only on `UPDATE OF balance/held_balance`), and never runs
  refund/commission/escrow logic.
- **No emails / SMTP.** `notification_outbox` demo rows are inserted with
  status `SKIPPED`; nothing is ever sent.
- **No payment APIs.** No gateway calls; demo transactions are `SYSTEM` log
  rows with a `demo-b31:` gateway id.
- **Advisory-only AI.** Every AI feature recommends; the admin decides.
- **Dry-run by default + explicit confirmation** required to write.
- **Reversible.** Cleanup removes only demo-tagged rows and `@edux.local`
  accounts.

---

## 15. Known limitations

- **Demo dispute statuses** use the DB enum `OPEN` / `RESOLVED_REFUND` /
  `RESOLVED_RELEASE` (the schema does not have a `NEED_REVIEW` dispute status).
- **AI case status** uses `NEED_HUMAN_REVIEW` (the schema's enum value).
- **Remote DB writes** require an explicit `DEMO_SEED_ALLOW_REMOTE=true`.
- **Analytics with LLM** is off by default; templates are deterministic.
- The seed inserts synthetic data only; it does not simulate real bookings,
  real payments, or real wallet balances.

---

## 16. Troubleshooting

| Symptom | Fix |
|---------|-----|
| `WRITE REFUSED` on apply | Ensure all 4 write-protection conditions are met (see §6). |
| `DATABASE_URL is not set` | Create `backend/.env` with a valid `DATABASE_URL`. |
| Remote host warning | Set `DEMO_SEED_ALLOW_REMOTE=true` (only for a dev/team DB). |
| Analytics page empty | Run the seed apply step; confirm counts in `demo:seed:dry`. |
| Duplicate rows worry | The seed is idempotent — re-running skips existing rows. |
| Pages still empty after seed | Check the server logs connected to the **same** DB the seed wrote to. |

---

## 17. Rollback steps

1. Remove demo data:
   ```cmd
   cd backend
   set DEMO_SEED_CONFIRM=I_UNDERSTAND_THIS_IS_DEMO_DATA
   npm run demo:cleanup
   ```
2. The AI features themselves need no rollback — they are additive and gated
   OFF by default. To disable any optional worker/LLM, leave its env flag unset
   (see [AI_DEMO_READINESS.md](AI_DEMO_READINESS.md) → Environment Flags).
3. No schema rollback is required; all migrations use `CREATE TABLE IF NOT EXISTS`.
