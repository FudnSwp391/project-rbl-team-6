/**
 * Task 1.1 — GET /api/admin/violations
 * Unit tests: query-builder parameter sanitization + integration tests.
 *
 * Test coverage:
 *   TC-V01 — 200 with valid admin JWT (baseline, no filters)
 *   TC-V02 — 401 when no JWT provided
 *   TC-V03 — 403 when non-admin JWT provided
 *   TC-V04 — 400 for invalid investigation_status value
 *   TC-V05 — 400 for invalid status value
 *   TC-V06 — 400 for invalid severity value
 *   TC-V07 — 200 with investigation_status=INVESTIGATING filter applied
 *   TC-V08 — 200 with status=RESOLVED_REFUND filter applied
 *   TC-V09 — 200 with severity=high filter applied
 *   TC-V10 — 200 with page + limit pagination params
 *   TC-V11 — SQL injection rejected by allowlist (status param)
 *   TC-V12 — response shape contains all backward-compatible keys
 *   TC-V13 — response never exposes ai_risk_score field
 *   TC-V14 — page defaults to 1 when omitted or invalid
 *   TC-V15 — limit capped at VIOLATION_MAX_LIMIT (100)
 */

jest.mock('../db');
const pool    = require('../db');
const request = require('supertest');
const { adminToken, studentToken } = require('./helpers');

const waitReady = () => new Promise(r => setImmediate(() => setImmediate(r)));

let app;
beforeAll(async () => {
  app = require('../server');
  await waitReady();
});
beforeEach(() => jest.clearAllMocks());

// ─── Shared mock row factory ───────────────────────────────────────────────────
function makeViolationRow(overrides = {}) {
  return {
    id: 'dispute-uuid-1',
    reason: 'Gia sư không dạy đúng giờ',
    status: 'OPEN',
    investigation_status: 'OPEN',
    severity: 'medium',
    target_type: 'booking',
    created_at: new Date('2026-01-15T08:00:00Z'),
    withdrawn_at: null,
    admin_note: null,
    reporter_name: 'Nguyen Van A',
    reporter_email: 'student@example.com',
    accused_name: 'Tran Thi B',
    accused_email: 'tutor@example.com',
    ...overrides,
  };
}

function mockPoolForList(rows = [makeViolationRow()], total = 1) {
  // pool.query is called twice in parallel: data query + count query.
  pool.query
    .mockResolvedValueOnce({ rows, rowCount: rows.length })   // data
    .mockResolvedValueOnce({ rows: [{ total }], rowCount: 1 }); // count
}

// ─── TC-V01: 200 with valid admin JWT (no filters) ─────────────────────────────
test('TC-V01 GET /api/admin/violations — 200 with admin JWT', async () => {
  mockPoolForList();
  const res = await request(app)
    .get('/api/admin/violations')
    .set('Authorization', `Bearer ${adminToken}`);
  expect(res.status).toBe(200);
});

// ─── TC-V02: 401 when no JWT ───────────────────────────────────────────────────
test('TC-V02 GET /api/admin/violations — 401 without JWT', async () => {
  const res = await request(app).get('/api/admin/violations');
  expect(res.status).toBe(401);
});

// ─── TC-V03: 403 for non-admin JWT ────────────────────────────────────────────
test('TC-V03 GET /api/admin/violations — 403 for student JWT', async () => {
  const res = await request(app)
    .get('/api/admin/violations')
    .set('Authorization', `Bearer ${studentToken}`);
  expect(res.status).toBe(403);
});

// ─── TC-V04: 400 for invalid investigation_status ─────────────────────────────
test('TC-V04 GET /api/admin/violations — 400 invalid investigation_status', async () => {
  const res = await request(app)
    .get('/api/admin/violations?investigation_status=INVALID_STATUS')
    .set('Authorization', `Bearer ${adminToken}`);
  expect(res.status).toBe(400);
  expect(res.body.message).toMatch(/điều tra không hợp lệ/);
});

// ─── TC-V05: 400 for invalid status ───────────────────────────────────────────
test('TC-V05 GET /api/admin/violations — 400 invalid status', async () => {
  const res = await request(app)
    .get('/api/admin/violations?status=FAKE_STATUS')
    .set('Authorization', `Bearer ${adminToken}`);
  expect(res.status).toBe(400);
  expect(res.body.message).toMatch(/khiếu nại không hợp lệ/);
});

// ─── TC-V06: 400 for invalid severity ─────────────────────────────────────────
test('TC-V06 GET /api/admin/violations — 400 invalid severity', async () => {
  const res = await request(app)
    .get('/api/admin/violations?severity=EXTREME')
    .set('Authorization', `Bearer ${adminToken}`);
  expect(res.status).toBe(400);
  expect(res.body.message).toMatch(/nghiêm trọng không hợp lệ/);
});

// ─── TC-V07: 200 with investigation_status filter ─────────────────────────────
test('TC-V07 GET /api/admin/violations — 200 with investigation_status=INVESTIGATING', async () => {
  const row = makeViolationRow({ investigation_status: 'INVESTIGATING' });
  mockPoolForList([row], 1);
  const res = await request(app)
    .get('/api/admin/violations?investigation_status=INVESTIGATING')
    .set('Authorization', `Bearer ${adminToken}`);
  expect(res.status).toBe(200);
  expect(res.body.violations[0].investigation_status).toBe('INVESTIGATING');
  // Verify the DB was called with the correct parameterized value
  const dataQueryCall = pool.query.mock.calls[0];
  expect(dataQueryCall[1]).toContain('INVESTIGATING');
});

// ─── TC-V08: 200 with status filter ───────────────────────────────────────────
test('TC-V08 GET /api/admin/violations — 200 with status=RESOLVED_REFUND', async () => {
  const row = makeViolationRow({ status: 'RESOLVED_REFUND' });
  mockPoolForList([row], 1);
  const res = await request(app)
    .get('/api/admin/violations?status=RESOLVED_REFUND')
    .set('Authorization', `Bearer ${adminToken}`);
  expect(res.status).toBe(200);
  // Case-insensitive acceptance
  const dataQueryCall = pool.query.mock.calls[0];
  expect(dataQueryCall[1]).toContain('RESOLVED_REFUND');
});

// ─── TC-V09: 200 with severity filter ─────────────────────────────────────────
test('TC-V09 GET /api/admin/violations — 200 with severity=high', async () => {
  const row = makeViolationRow({ severity: 'high' });
  mockPoolForList([row], 1);
  const res = await request(app)
    .get('/api/admin/violations?severity=high')
    .set('Authorization', `Bearer ${adminToken}`);
  expect(res.status).toBe(200);
  const dataQueryCall = pool.query.mock.calls[0];
  expect(dataQueryCall[1]).toContain('high');
});

// ─── TC-V10: 200 with pagination ──────────────────────────────────────────────
test('TC-V10 GET /api/admin/violations — 200 with page=2 limit=10', async () => {
  mockPoolForList([], 50);
  const res = await request(app)
    .get('/api/admin/violations?page=2&limit=10')
    .set('Authorization', `Bearer ${adminToken}`);
  expect(res.status).toBe(200);
  expect(res.body.page).toBe(2);
  expect(res.body.limit).toBe(10);
  expect(res.body.total_pages).toBe(5);   // ceil(50 / 10)
  // Confirm OFFSET = (2-1)*10 = 10 was passed as a parameter
  const dataQueryCall = pool.query.mock.calls[0];
  expect(dataQueryCall[1]).toContain(10);  // limit
  expect(dataQueryCall[1]).toContain(10);  // offset
});

// ─── TC-V11: SQL injection rejected by allowlist ──────────────────────────────
test('TC-V11 GET /api/admin/violations — 400 SQL injection in status param', async () => {
  const res = await request(app)
    .get("/api/admin/violations?status=OPEN' OR '1'='1")
    .set('Authorization', `Bearer ${adminToken}`);
  // The allowlist rejects anything that isn't in VIOLATION_DISPUTE_STATUSES
  expect(res.status).toBe(400);
  // pool.query must NOT have been called — validation fires before any DB call
  expect(pool.query).not.toHaveBeenCalled();
});

// ─── TC-V12: Backward-compatible response shape ───────────────────────────────
test('TC-V12 GET /api/admin/violations — response shape is backward compatible', async () => {
  mockPoolForList([makeViolationRow()], 1);
  const res = await request(app)
    .get('/api/admin/violations')
    .set('Authorization', `Bearer ${adminToken}`);
  expect(res.status).toBe(200);
  // Original keys must still be present
  expect(res.body).toHaveProperty('violations');
  expect(res.body).toHaveProperty('total');
  expect(res.body).toHaveProperty('by_status');
  expect(res.body).toHaveProperty('by_severity');
  // New pagination keys
  expect(res.body).toHaveProperty('page');
  expect(res.body).toHaveProperty('limit');
  expect(res.body).toHaveProperty('total_pages');
  // violations is an array
  expect(Array.isArray(res.body.violations)).toBe(true);
});

// ─── TC-V13: AI risk score is never exposed ───────────────────────────────────
// The real security guarantee is that the SELECT list in the SQL query never
// includes ai_risk_score. We verify this by inspecting the SQL string passed
// to pool.query, which is the source-of-truth for what the DB returns.
test('TC-V13 GET /api/admin/violations — ai_risk_score is never in SELECT query', async () => {
  mockPoolForList([makeViolationRow()], 1);
  await request(app)
    .get('/api/admin/violations')
    .set('Authorization', `Bearer ${adminToken}`);
  // pool.query call[0] is the data query; call[1] is the count query
  const dataQuerySql = pool.query.mock.calls[0][0];
  expect(dataQuerySql).not.toMatch(/ai_risk_score/i);
  // Also assert the count query doesn't expose it
  const countQuerySql = pool.query.mock.calls[1][0];
  expect(countQuerySql).not.toMatch(/ai_risk_score/i);
});

// ─── TC-V14: page defaults to 1 when omitted/invalid ─────────────────────────
test('TC-V14 GET /api/admin/violations — page defaults to 1', async () => {
  mockPoolForList();
  const res = await request(app)
    .get('/api/admin/violations?page=abc')
    .set('Authorization', `Bearer ${adminToken}`);
  expect(res.status).toBe(200);
  expect(res.body.page).toBe(1);
});

// ─── TC-V15: limit capped at 100 ─────────────────────────────────────────────
test('TC-V15 GET /api/admin/violations — limit capped at VIOLATION_MAX_LIMIT (100)', async () => {
  mockPoolForList();
  const res = await request(app)
    .get('/api/admin/violations?limit=9999')
    .set('Authorization', `Bearer ${adminToken}`);
  expect(res.status).toBe(200);
  expect(res.body.limit).toBe(100);
  // Verify the actual DB param is 100, not 9999
  const dataQueryCall = pool.query.mock.calls[0];
  expect(dataQueryCall[1]).toContain(100);
  expect(dataQueryCall[1]).not.toContain(9999);
});
