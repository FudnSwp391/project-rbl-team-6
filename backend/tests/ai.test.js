/**
 * TC43–TC48: AI Features (Batches 25–29A)
 * Covers: semantic moderation analyze, analytics ask + SQL-injection guard,
 *         AI case list, fraud-intel report list, copilot history
 */
jest.mock('../db');
const pool = require('../db');
const request = require('supertest');
const { adminToken, studentToken } = require('./helpers');

const waitReady = () => new Promise(r => setImmediate(() => setImmediate(r)));

let app;
beforeAll(async () => { app = require('../server'); await waitReady(); });
beforeEach(() => jest.clearAllMocks());

// ─── TC43 ─────────────────────────────────────────────────────────────────────
test('TC43 POST /api/admin/semantic-moderation/analyze — EXTERNAL_PAYMENT_ATTEMPT phrase', async () => {
  pool.query.mockResolvedValue({ rows: [{ id: 'sr1' }], rowCount: 1 });
  const res = await request(app)
    .post('/api/admin/semantic-moderation/analyze')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ text: 'Em chuyển khoản Momo cho thầy nhe, khỏi đặt trên web để đỡ mất phí.', context: 'review' });
  expect(res.status).toBe(200);
  // Response uses categories array, not category string
  expect(res.body).toHaveProperty('categories');
  expect(res.body.categories).toContain('EXTERNAL_PAYMENT_ATTEMPT');
});

// ─── TC44 ─────────────────────────────────────────────────────────────────────
test('TC44 POST /api/admin/semantic-moderation/analyze — 403 with non-admin token', async () => {
  const res = await request(app)
    .post('/api/admin/semantic-moderation/analyze')
    .set('Authorization', `Bearer ${studentToken}`)
    .send({ text: 'test', context: 'review' });
  expect(res.status).toBe(403);
});

// ─── TC45 ─────────────────────────────────────────────────────────────────────
test('TC45 POST /api/admin/analytics/ask — status BLOCKED for SQL keyword', async () => {
  pool.query.mockResolvedValue({ rows: [{ id: 'aq1' }], rowCount: 1 });
  const res = await request(app)
    .post('/api/admin/analytics/ask')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ question: 'DROP TABLE users' });
  expect(res.status).toBe(200);
  expect(res.body.status).toBe('BLOCKED');
  expect(res.body.safety_flags).toContain('BLOCKED_SQL_KEYWORD');
});

// ─── TC46 ─────────────────────────────────────────────────────────────────────
test('TC46 POST /api/admin/analytics/ask — 200 and not BLOCKED for safe question', async () => {
  pool.query
    .mockResolvedValueOnce({ rows: [{ id: 'aq1' }], rowCount: 1 })
    .mockResolvedValueOnce({ rows: [{ tutor_id: 't1', full_name: 'Le Demo', refund_count: '3' }], rowCount: 1 })
    .mockResolvedValueOnce({ rows: [], rowCount: 0 });
  const res = await request(app)
    .post('/api/admin/analytics/ask')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ question: 'Top gia su co refund nhieu nhat 30 ngay' });
  expect(res.status).toBe(200);
  expect(res.body.status).not.toBe('BLOCKED');
});

// ─── TC47 ─────────────────────────────────────────────────────────────────────
test('TC47 GET /api/admin/ai-cases — 200 + AI case list', async () => {
  // Route makes 4 queries: COUNT total, SELECT rows, GROUP BY status, COUNT appeals
  const caseRows = [
    { id: 'ac1', status: 'NEED_HUMAN_REVIEW', dry_run: true,  created_at: new Date() },
    { id: 'ac2', status: 'NEED_HUMAN_REVIEW', dry_run: false, created_at: new Date() },
  ];
  pool.query
    .mockResolvedValueOnce({ rows: [{ n: 2 }], rowCount: 1 })                              // COUNT total
    .mockResolvedValueOnce({ rows: caseRows, rowCount: 2 })                                 // SELECT cases
    .mockResolvedValueOnce({ rows: [{ status: 'NEED_HUMAN_REVIEW', n: 2 }], rowCount: 1 }) // GROUP BY summary
    .mockResolvedValueOnce({ rows: [{ n: 0 }], rowCount: 1 });                             // COUNT appeals
  const res = await request(app)
    .get('/api/admin/ai-cases')
    .set('Authorization', `Bearer ${adminToken}`);
  expect(res.status).toBe(200);
  // Response: { items: [...], pagination: {...}, summary: {...}, config: {...} }
  expect(Array.isArray(res.body.items)).toBe(true);
});

// ─── TC48 ─────────────────────────────────────────────────────────────────────
test('TC48 GET /api/admin/fraud-intel/reports — 200 + fraud report list', async () => {
  pool.query.mockResolvedValue({
    rows: [
      { id: 'fr1', category: 'EXTERNAL_PAYMENT_COLLUSION', severity: 'CRITICAL', status: 'PENDING_REVIEW' },
      { id: 'fr2', category: 'WITHDRAWAL_RISK',             severity: 'HIGH',     status: 'PENDING_REVIEW' },
    ],
    rowCount: 2,
  });
  const res = await request(app)
    .get('/api/admin/fraud-intel/reports')
    .set('Authorization', `Bearer ${adminToken}`);
  expect(res.status).toBe(200);
});
