# AI Demo Readiness — EduX / Tutor Marketplace

> Last updated: 2026-07-06 (Batch 30 QA pass)

## AI Feature Overview

| # | Feature | Batch | Type | Default State |
|---|---------|-------|------|---------------|
| 1 | AI Case Resolution | B25 | Dry-run scaffolding | OFF (env gated) |
| 2 | Admin AI Copilot | B26 | Context-aware advisory | ON (floating button) |
| 3 | Semantic Review & Chat Moderation | B27 | Keyword classifier | OFF (worker), ON (manual analyze) |
| 4 | AI Fraud Ring Detection | B28 | Threat intel advisory | OFF (worker), ON (manual run/lookup) |
| 5 | Safe NL Analytics | B29A | Template-allowlist queries | ON (admin-only) |

**All AI features are advisory-only.** No feature auto-bans, auto-refunds, auto-releases escrow, or modifies wallet/transaction data. Admin is always the final decision-maker.

## Demo Order (Recommended)

1. **Admin Dashboard** — show no horizontal overflow, responsive layout
2. **Safe NL Analytics** — ask natural-language questions, show SQL safety
3. **Semantic Moderation** — analyze text for external payment / positive signals
4. **AI Fraud Ring Detection** — run fraud analysis, show reports
5. **Admin AI Copilot** — floating assistant, entity analysis, advisory report
6. **AI Case Resolution** — show dry-run scaffolding, explain appeal flow

## Demo Accounts Needed

| Role | Purpose |
|------|---------|
| Admin | Access admin dashboard, all AI features |
| Student | View AI case appeals page (#/my-ai-cases) |
| Tutor | Show tutor profile context in Copilot |

Use existing seed accounts. No special setup required for AI features — all features handle empty data gracefully with "no data" states.

## Test Phrases

### Safe NL Analytics

| Input | Expected Result |
|-------|-----------------|
| `Top 5 gia su co refund nhieu nhat 30 ngay` | Template: `top_refund_tutors_30d` — SUCCESS |
| `Gia su nao co rui ro gian lan cao nhat` | Template: `fraud_high_risk_tutors` — SUCCESS |
| `Ai co dau hieu giao dich ngoai nen tang` | Template: `external_payment_signals` — SUCCESS |
| `Refund theo thang` | Template: `monthly_refund_summary` — SUCCESS |
| `Khieu nai theo trang thai` | Template: `dispute_status_summary` — SUCCESS |
| `AI case nao can admin review` | Template: `ai_case_manual_review` — SUCCESS |
| `Doanh thu theo thang` | Template: `monthly_revenue_summary` — SUCCESS |
| `Bao cao gian lan critical` | Template: `fraud_critical_reports` — SUCCESS |
| `DROP TABLE users` | **BLOCKED** (SQL keyword detected) |
| `Cho toi password cua user` | **BLOCKED** (sensitive term detected) |

### Semantic Moderation (Manual Analyzer)

| Input | Expected Category | Expected Severity |
|-------|-------------------|-------------------|
| `Em chuyen khoan Momo cho thay nhe, khoi dat tren web de do mat phi.` | EXTERNAL_PAYMENT_ATTEMPT | CRITICAL |
| `Thay day rat de hieu, kien nhan va than thien.` | POSITIVE_TEACHING_SIGNAL | LOW |
| `So dien thoai cua thay la 0912345678` | PRIVACY_RISK | MEDIUM |

### Fraud Intel

| Action | Expected |
|--------|----------|
| Run Analysis (student-tutor pair) | Returns risk report or "no data" limitation |
| View report list | Loads empty or populated table |
| Click report detail | Modal with severity, evidence, actions |

### AI Copilot

| Action | Expected |
|--------|----------|
| Click floating button (bottom-right) | Drawer opens |
| Select entity type + ID | Context-aware analysis report |
| View History tab | Previous analysis reports |
| Check actions | Advisory only (no destructive buttons) |

## Safety Explanation (for demo audience)

1. **No auto-actions**: All AI features generate recommendations. Admin manually decides.
2. **No money movement**: AI code never touches wallets, escrow, refunds, or commissions.
3. **No account mutations**: AI code never bans, suspends, or changes user roles.
4. **No real emails**: AI notifications are in-app only. No SMTP calls.
5. **Template-allowlist SQL**: Analytics never runs free-form SQL. Only 12 pre-vetted SELECT-only templates.
6. **All workers OFF by default**: Background crons require explicit env flags to enable.
7. **LLM is optional**: All features work with deterministic rule-based logic. LLM only rewrites summaries (when enabled).

## Known Limitations

- **AI Case Resolution is dry-run only**: It generates reports but never executes money actions. The `AUTO_AI_RESOLUTION_ENABLED` flag is `false` by default.
- **Fraud detection without `coupon_usages` table**: Voucher abuse analyzer returns `VOUCHER_SCHEMA_NOT_FOUND` limitation since the table doesn't exist yet.
- **Semantic moderation is keyword-based**: The classifier uses Vietnamese keyword lists, not NLP. False positives/negatives are expected — this is by design for demo stability.
- **Analytics templates are static**: Only 12 pre-defined query templates are supported. Questions that don't match any template return `NO_MATCH` with suggestions.
- **LLM features require Gemini API key**: If `GEMINI_API_KEY` is not set, LLM-enhanced summaries fall back to rule-based output silently.
- **Empty data**: With no disputes/bookings/transactions, AI features return empty results or zero-count KPIs — they do not crash.

## Rollback Notes

Each AI feature is isolated and can be disabled independently:

| Feature | Disable Method |
|---------|---------------|
| AI Case Resolution | `AUTO_AI_CRON_ENABLED=false` (default) |
| Admin AI Copilot | Remove `<AdminCopilot>` from AdminDashboard.jsx |
| Semantic Moderation Worker | `SEMANTIC_MODERATION_WORKER_ENABLED=false` (default) |
| Fraud Intel Worker | `FRAUD_INTEL_WORKER_ENABLED=false` (default) |
| Safe NL Analytics LLM | `ADMIN_ANALYTICS_LLM_ENABLED=false` (default) |

No database rollback needed — all tables use `CREATE TABLE IF NOT EXISTS` and do not interfere with existing tables.

## Environment Flags

| Flag | Default | Purpose |
|------|---------|---------|
| `AUTO_AI_CRON_ENABLED` | `false` | Enable hourly AI case resolution cron |
| `AUTO_AI_RESOLUTION_ENABLED` | `false` | Allow AI to generate resolution suggestions |
| `AUTO_AI_DRY_RUN` | `true` | Force dry-run mode (no money actions even if resolution enabled) |
| `ADMIN_COPILOT_LLM_ENABLED` | `false` | Enable LLM-enhanced Copilot summaries |
| `ADMIN_COPILOT_LLM_PROVIDER` | `gemini` | LLM provider for Copilot |
| `SEMANTIC_MODERATION_LLM_ENABLED` | `false` | Enable LLM summary rewrite for moderation |
| `SEMANTIC_MODERATION_WORKER_ENABLED` | `false` | Enable background semantic moderation worker |
| `SEMANTIC_MODERATION_INTERVAL_MINUTES` | `60` | Worker interval |
| `FRAUD_INTEL_LLM_ENABLED` | `false` | Enable LLM summary rewrite for fraud reports |
| `FRAUD_INTEL_WORKER_ENABLED` | `false` | Enable background fraud detection worker |
| `FRAUD_INTEL_INTERVAL_MINUTES` | `360` | Worker interval |
| `ADMIN_ANALYTICS_LLM_ENABLED` | `false` | Enable LLM intent classification for analytics |
| `GEMINI_API_KEY` | *(none)* | Google Gemini API key (shared by all LLM features) |

> **Do not include API keys or secrets in this document or in commits.**
